[CmdletBinding()]
param(
  [ValidateSet("Doctor", "Prepare", "Build", "Install", "Smoke", "Test", "RuntimeSuite", "BoundarySuite", "Evidence", "All")]
  [string]$Action = "Doctor",
  [string]$RepositoryAlias = "C:\q",
  [string]$VirtualStoreDir = "C:\v\qts",
  [string]$AndroidSdkRoot = "C:\Android\Sdk",
  [string]$DeviceSerial,
  [ValidateSet("Auto", "arm64-v8a", "armeabi-v7a", "x86_64")]
  [string]$Architecture = "Auto",
  [string]$Flow = "maestro/native-test-control.yaml",
  [int]$MaxWorkers = 1,
  [string]$RunId,
  [switch]$CleanNative
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PackageId = "com.ryuyoshikawa.scenarioshop"
$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
if (-not $RunId) { $RunId = Get-Date -Format "yyyyMMdd-HHmmss" }
$ArtifactRoot = Join-Path $SourceRoot ".artifacts\native-local\$RunId"

function Step([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Ensure-Directory([string]$Path) { New-Item -ItemType Directory -Force -Path $Path | Out-Null }
function Require([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command is not available on PATH: $Name"
  }
}

function Run {
  param([string]$File, [string[]]$Args = @(), [string]$Log, [switch]$AllowFailure)
  if ($Log) {
    Ensure-Directory (Split-Path -Parent $Log)
    & $File @Args 2>&1 | Tee-Object -FilePath $Log | ForEach-Object { Write-Host $_ }
  }
  else {
    & $File @Args 2>&1 | ForEach-Object { Write-Host $_ }
  }
  $code = $LASTEXITCODE
  if (-not $AllowFailure -and $code -ne 0) {
    throw "Command failed ($code): $File $($Args -join ' ')"
  }
  return $code
}

function Out {
  param([string]$File, [string[]]$Args = @(), [switch]$AllowFailure)
  $value = & $File @Args 2>&1
  if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $File $($Args -join ' ')"
  }
  return @($value)
}

function Set-LocalEnvironment {
  $env:NODE_ENV = "production"
  $env:ANDROID_HOME = $AndroidSdkRoot
  $env:ANDROID_SDK_ROOT = $AndroidSdkRoot
  $env:EXPO_PUBLIC_APP_ENV = "automation"
  $env:EXPO_PUBLIC_BUILD_KIND = "automation"
  $env:EXPO_PUBLIC_TEST_MODE = "true"
  $env:EXPO_PUBLIC_DEFAULT_SEED = "default"
  $env:EXPO_PUBLIC_BUILD_SHA = "local-physical-device"
  $env:npm_config_virtual_store_dir = ($VirtualStoreDir -replace "\\", "/")
  $env:npm_config_virtual_store_dir_max_length = "20"

  foreach ($entry in @(
    (Join-Path $AndroidSdkRoot "platform-tools"),
    (Join-Path $AndroidSdkRoot "cmdline-tools\latest\bin")
  )) {
    if ((Test-Path $entry) -and (($env:Path -split ";") -notcontains $entry)) {
      $env:Path = "$entry;$env:Path"
    }
  }
}

function PhysicalRoot {
  $item = Get-Item $SourceRoot -Force
  if ($item.LinkType -eq "Junction" -and $item.Target) {
    return [System.IO.Path]::GetFullPath([string]@($item.Target)[0]).TrimEnd("\")
  }
  return [System.IO.Path]::GetFullPath($item.FullName).TrimEnd("\")
}

function RepositoryRoot {
  $target = PhysicalRoot
  $alias = [System.IO.Path]::GetFullPath($RepositoryAlias).TrimEnd("\")
  if ($alias -eq $target) { return $alias }

  if (Test-Path $alias) {
    $item = Get-Item $alias -Force
    if ($item.LinkType -ne "Junction") { throw "Not a junction: $alias" }
    $actual = [System.IO.Path]::GetFullPath([string]@($item.Target)[0]).TrimEnd("\")
    if ($actual -ne $target) { throw "Junction points elsewhere: $actual" }
    return $alias
  }

  Ensure-Directory (Split-Path -Parent $alias)
  New-Item -ItemType Junction -Path $alias -Target $target | Out-Null
  Write-Host "Created junction: $alias -> $target"
  return $alias
}

function Serial {
  Require "adb"
  $devices = @(Out "adb" @("devices") | Where-Object { $_ -match "^(\S+)\s+device$" } | ForEach-Object { $Matches[1] })
  if ($DeviceSerial) {
    if ($devices -notcontains $DeviceSerial) { throw "Device is not authorized: $DeviceSerial" }
    return $DeviceSerial
  }
  if ($devices.Count -eq 0) { throw "No authorized device. Check 'adb devices -l'." }
  if ($devices.Count -gt 1) { throw "Multiple devices found. Pass -DeviceSerial." }
  return $devices[0]
}

function DeviceArchitecture([string]$Serial) {
  if ($Architecture -ne "Auto") { return $Architecture }
  $abis = ((Out "adb" @("-s", $Serial, "shell", "getprop", "ro.product.cpu.abilist")) -join "").Trim()
  foreach ($candidate in @("arm64-v8a", "armeabi-v7a", "x86_64")) {
    if (($abis -split ",") -contains $candidate) { return $candidate }
  }
  throw "Unsupported ABI: $abis"
}

function InitArtifacts {
  foreach ($name in @("build", "install", "maestro", "evidence")) {
    Ensure-Directory (Join-Path $ArtifactRoot $name)
  }
}

function Doctor {
  Step "Validate toolchain"
  Set-LocalEnvironment
  InitArtifacts
  foreach ($command in @("java", "javac", "node", "pnpm", "adb", "maestro")) { Require $command }

  $node = ((Out "node" @("--version")) -join "").Trim()
  $pnpm = ((Out "pnpm" @("--version")) -join "").Trim()
  $java = (Out "java" @("-version")) -join " "
  $maestro = ((Out "maestro" @("--version")) -join "").Trim()
  if ($node -notmatch '^v24\.') { throw "Node.js 24 required: $node" }
  if ($pnpm -ne "9.10.0") { throw "pnpm 9.10.0 required: $pnpm" }
  if ($java -notmatch 'version "17\.') { throw "Java 17 required: $java" }
  if ($maestro -notmatch '2\.8\.0') { throw "Maestro 2.8.0 required: $maestro" }

  foreach ($path in @(
    (Join-Path $AndroidSdkRoot "platform-tools\adb.exe"),
    (Join-Path $AndroidSdkRoot "platforms\android-36\android.jar"),
    (Join-Path $AndroidSdkRoot "build-tools\36.0.0\aapt.exe"),
    (Join-Path $AndroidSdkRoot "cmdline-tools\latest\bin\sdkmanager.bat")
  )) {
    if (-not (Test-Path $path)) { throw "Missing SDK component: $path" }
  }

  $serial = Serial
  $api = ((Out "adb" @("-s", $serial, "shell", "getprop", "ro.build.version.sdk")) -join "").Trim()
  $abi = ((Out "adb" @("-s", $serial, "shell", "getprop", "ro.product.cpu.abilist")) -join "").Trim()
  Write-Host "PASS: Node=$node pnpm=$pnpm Maestro=$maestro Device=$serial API=$api ABI=$abi" -ForegroundColor Green
}

function Prepare {
  Step "Prepare dependencies and generated Android project"
  Set-LocalEnvironment
  InitArtifacts
  $root = RepositoryRoot
  Ensure-Directory $VirtualStoreDir

  Push-Location $root
  try {
    $store = ((Out "pnpm" @("config", "get", "virtual-store-dir")) -join "").Trim()
    if (-not $store -or $store -eq "undefined") { throw "pnpm virtual store setting was not applied." }
    Run "pnpm" @("install", "--frozen-lockfile") (Join-Path $ArtifactRoot "build\pnpm-install.log")
    Run "pnpm" @("run", "generate:native-assets") (Join-Path $ArtifactRoot "build\native-assets.log")
    Run "pnpm" @("run", "validate:image-manifest") (Join-Path $ArtifactRoot "build\image-manifest.log")
    Run "pnpm" @("run", "check:native-route-dependencies") (Join-Path $ArtifactRoot "build\native-routes.log")
    Run "pnpm" @("exec", "expo", "prebuild", "--clean", "--platform", "android", "--no-install") (Join-Path $ArtifactRoot "build\prebuild.log")
    $sdk = ($AndroidSdkRoot -replace "\\", "/")
    [System.IO.File]::WriteAllText(
      (Join-Path $root "android\local.properties"),
      "sdk.dir=$sdk`r`n",
      (New-Object System.Text.UTF8Encoding($false))
    )
  }
  finally { Pop-Location }
}

function VerifyApk([string]$Apk, [string]$Abi) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Apk)
  try {
    $entries = @($zip.Entries | ForEach-Object { $_.FullName })
    if (-not ($entries | Where-Object { $_ -match '^assets/.*\.(bundle|hbc)$' })) { throw "APK has no JS bundle." }
    if (-not ($entries | Where-Object { $_ -match "^lib/$([regex]::Escape($Abi))/.+\.so$" })) { throw "APK has no $Abi libraries." }
  }
  finally { $zip.Dispose() }
}

function Build {
  Step "Build automation Release APK"
  Set-LocalEnvironment
  InitArtifacts
  $root = RepositoryRoot
  $serial = Serial
  $abi = DeviceArchitecture $serial
  if (-not (Test-Path (Join-Path $root "android\gradlew.bat"))) { Prepare }

  Push-Location (Join-Path $root "android")
  try {
    if ($CleanNative) { Run ".\gradlew.bat" @("clean", "--no-daemon", "--stacktrace") (Join-Path $ArtifactRoot "build\clean.log") }
    Run ".\gradlew.bat" @(
      ":app:assembleRelease", "-PreactNativeArchitectures=$abi", "--no-daemon",
      "--max-workers=$MaxWorkers", "--build-cache", "--stacktrace"
    ) (Join-Path $ArtifactRoot "build\assemble-release.log")
  }
  finally { Pop-Location }

  $apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $apk)) { throw "APK not generated: $apk" }
  VerifyApk $apk $abi
  $item = Get-Item $apk
  $hash = Get-FileHash $apk -Algorithm SHA256
  @("path=$apk", "size_bytes=$($item.Length)", "sha256=$($hash.Hash)", "abi=$abi") |
    Set-Content -Encoding UTF8 (Join-Path $ArtifactRoot "build\apk-info.txt")
}

function Apk {
  $path = Join-Path (RepositoryRoot) "android\app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $path)) { throw "Run Build first: $path" }
  return $path
}

function Install {
  Step "Install APK"
  Set-LocalEnvironment
  InitArtifacts
  $serial = Serial
  $log = Join-Path $ArtifactRoot "install\adb-install.log"
  $code = Run "adb" @("-s", $serial, "install", "-r", (Apk)) $log -AllowFailure
  if ($code -ne 0) { throw "Install failed. For signature mismatch, uninstall manually after accepting data loss. Log: $log" }
  $package = Out "adb" @("-s", $serial, "shell", "pm", "path", $PackageId)
  if (($package -join "") -notmatch "package:") { throw "Package not installed: $PackageId" }
}

function Smoke {
  Step "Launch and check startup"
  Set-LocalEnvironment
  InitArtifacts
  $serial = Serial
  Run "adb" @("-s", $serial, "logcat", "-c") -AllowFailure | Out-Null
  Run "adb" @("-s", $serial, "shell", "monkey", "-p", $PackageId, "-c", "android.intent.category.LAUNCHER", "1") (Join-Path $ArtifactRoot "install\launch.log")
  Start-Sleep -Seconds 10
  $pid = ((Out "adb" @("-s", $serial, "shell", "pidof", $PackageId) -AllowFailure) -join "").Trim()
  if (-not $pid) { Evidence; throw "App process is not running." }
  $logcat = Out "adb" @("-s", $serial, "logcat", "-d") -AllowFailure
  $logcat | Set-Content -Encoding UTF8 (Join-Path $ArtifactRoot "install\logcat.txt")
  if (($logcat -join "`n") -match "FATAL EXCEPTION|JavascriptException|Unable to load script|Could not connect to development server") {
    throw "Fatal startup log detected."
  }
}

function Evidence {
  Step "Collect evidence"
  Set-LocalEnvironment
  InitArtifacts
  $serial = Serial
  $dir = Join-Path $ArtifactRoot "evidence"
  $png = "/sdcard/scenario-shop-$RunId.png"
  $xml = "/sdcard/scenario-shop-$RunId.xml"
  Run "adb" @("-s", $serial, "shell", "screencap", "-p", $png) -AllowFailure | Out-Null
  Run "adb" @("-s", $serial, "pull", $png, (Join-Path $dir "screen.png")) -AllowFailure | Out-Null
  Run "adb" @("-s", $serial, "shell", "uiautomator", "dump", $xml) -AllowFailure | Out-Null
  Run "adb" @("-s", $serial, "pull", $xml, (Join-Path $dir "uiautomator.xml")) -AllowFailure | Out-Null
  (Out "adb" @("-s", $serial, "logcat", "-d") -AllowFailure) | Set-Content -Encoding UTF8 (Join-Path $dir "logcat.txt")
  (Out "adb" @("-s", $serial, "shell", "dumpsys", "activity", "activities") -AllowFailure) | Set-Content -Encoding UTF8 (Join-Path $dir "activities.txt")
  (Out "maestro" @("--device", $serial, "hierarchy") -AllowFailure) | Set-Content -Encoding UTF8 (Join-Path $dir "maestro-hierarchy.txt")
  Write-Host "Evidence: $dir"
}

function MaestroSuite([string]$Name, [string[]]$Flows) {
  Step "Run Maestro: $Name"
  Set-LocalEnvironment
  InitArtifacts
  Require "maestro"
  $version = ((Out "maestro" @("--version")) -join "").Trim()
  if ($version -notmatch '2\.8\.0') { throw "Maestro 2.8.0 required: $version" }

  $root = RepositoryRoot
  $serial = Serial
  $outputDir = Join-Path $ArtifactRoot "maestro\$Name"
  Ensure-Directory $outputDir
  $resolved = @($Flows | ForEach-Object { Join-Path $root $_ })
  foreach ($path in $resolved) { if (-not (Test-Path $path)) { throw "Flow not found: $path" } }
  $args = @("--device", $serial, "test", "--test-output-dir=$outputDir", "--format", "junit", "--output", (Join-Path $ArtifactRoot "maestro\$Name.xml")) + $resolved
  $code = Run "maestro" $args (Join-Path $ArtifactRoot "maestro\$Name.log") -AllowFailure
  if ($code -ne 0) { Evidence; throw "Maestro failed: $Name" }
}

function Test { MaestroSuite "native-test-control" @($Flow) }
function RuntimeSuite { MaestroSuite "runtime-smoke" @("maestro/native-test-control.yaml", "maestro/native-contract-harness.yaml", "maestro/native-not-found.yaml", "maestro/native-storefront.yaml", "maestro/native-cart.yaml") }
function BoundarySuite { MaestroSuite "persistence-boundary" @("maestro/native-restart-persistence.yaml", "maestro/native-reset-dirty-state.yaml", "maestro/native-out-of-stock.yaml", "maestro/native-low-stock.yaml", "maestro/native-purchase-limit.yaml") }

InitArtifacts
switch ($Action) {
  "Doctor" { Doctor }
  "Prepare" { Prepare }
  "Build" { Build }
  "Install" { Install }
  "Smoke" { Smoke }
  "Test" { Test }
  "RuntimeSuite" { RuntimeSuite }
  "BoundarySuite" { BoundarySuite }
  "Evidence" { Evidence }
  "All" { Doctor; Prepare; Build; Install; Smoke; Test }
}
