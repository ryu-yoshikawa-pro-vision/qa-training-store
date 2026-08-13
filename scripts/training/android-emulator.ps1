[CmdletBinding()]
param(
    [ValidateSet("Doctor", "Prepare", "Start", "Stop")]
    [string]$Action = "Doctor",
    [string]$Serial
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$trainingAvdName = "scenario-shop-training-api34"
$runtimeApi = "34"
$systemImage = "system-images;android-34;google_apis;x86_64"
$androidSdkRoot = $env:ANDROID_SDK_ROOT
if ([string]::IsNullOrWhiteSpace($androidSdkRoot)) { $androidSdkRoot = $env:ANDROID_HOME }
if ([string]::IsNullOrWhiteSpace($androidSdkRoot)) {
    throw "ANDROID_SDK_ROOT or ANDROID_HOME is required."
}

$sdkManager = Join-Path $androidSdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path -LiteralPath $sdkManager)) {
    $cmdlineToolsRoot = Join-Path $androidSdkRoot "cmdline-tools"
    if (-not (Test-Path -LiteralPath $cmdlineToolsRoot)) {
        throw "Android cmdline-tools directory was not found: $cmdlineToolsRoot"
    }
    $foundSdkManagers = @(Get-ChildItem -LiteralPath $cmdlineToolsRoot -Filter sdkmanager.bat -Recurse -File | Sort-Object FullName)
    if ($foundSdkManagers.Count -eq 0) {
        throw "sdkmanager.bat was not found under Android cmdline-tools: $cmdlineToolsRoot"
    }
    $sdkManager = $foundSdkManagers[-1].FullName
}
$avdManager = Join-Path (Split-Path -Parent $sdkManager) "avdmanager.bat"
$adb = Join-Path $androidSdkRoot "platform-tools\adb.exe"
$emulator = Join-Path $androidSdkRoot "emulator\emulator.exe"
$avdHome = Join-Path $env:USERPROFILE ".android\avd"

function Require-Tool([string]$toolPath, [string]$name) {
    if (-not (Test-Path -LiteralPath $toolPath)) { throw "$name was not found: $toolPath" }
}

Require-Tool $sdkManager "sdkmanager"
Require-Tool $avdManager "avdmanager"
Require-Tool $adb "adb"
Require-Tool $emulator "emulator"

function Invoke-Adb([string[]]$arguments) {
    & $adb @arguments
    if ($LASTEXITCODE -ne 0) { throw "adb $($arguments -join ' ') failed with exit $LASTEXITCODE" }
}

function Get-ConnectedSerials {
    $lines = & $adb devices | Select-Object -Skip 1
    return @($lines | ForEach-Object {
        $parts = ($_ -split "\s+")
        if ($parts.Length -ge 2 -and $parts[1] -eq "device") { $parts[0] }
    } | Where-Object { $_ -like "emulator-*" })
}

function Get-AvdName([string]$TargetSerial) {
    $output = @(& $adb -s $TargetSerial emu avd name 2>$null)
    if ($LASTEXITCODE -ne 0) { throw "Unable to query AVD identity for $TargetSerial." }
    $name = @($output | ForEach-Object { $_.ToString().Trim() } | Where-Object {
        $_ -and $_ -ne "OK" -and $_ -notmatch "^ERROR"
    } | Select-Object -First 1)
    if ($name.Count -eq 0) { throw "ADB returned no AVD identity for $TargetSerial." }
    return [string]$name[0]
}

function Wait-Until([scriptblock]$condition, [int]$timeoutSeconds, [string]$description) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    do {
        if (& $condition) { return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for $description after $timeoutSeconds seconds."
}

function Test-AvdExists {
    return @(& $avdManager list avd) -match "Name:\s+$([regex]::Escape($trainingAvdName))"
}

switch ($Action) {
    "Doctor" {
        Write-Output "sdkmanager=$sdkManager"
        Write-Output "avdmanager=$avdManager"
        Write-Output "adb=$adb"
        Write-Output "emulator=$emulator"
        Write-Output "runtime_api=$runtimeApi"
        Write-Output "system_image=$systemImage"
        Write-Output "avd=$trainingAvdName"
        & $adb version
        & $emulator -version
        & $avdManager list avd
    }
    "Prepare" {
        $imageDirectory = Join-Path $androidSdkRoot "system-images\android-$runtimeApi\google_apis\x86_64"
        if (-not (Test-Path -LiteralPath $imageDirectory)) {
            throw "Required system image is missing: $systemImage. Install it with sdkmanager before retrying."
        }
        if (-not (Test-AvdExists)) {
            "no" | & $avdManager create avd --name $trainingAvdName --package $systemImage --device pixel_2
            if ($LASTEXITCODE -ne 0) { throw "Unable to create AVD $trainingAvdName." }
            if (-not (Test-AvdExists)) { throw "AVD $trainingAvdName was not present after creation." }
        }
        Write-Output "Prepared AVD $trainingAvdName using $systemImage."
    }
    "Start" {
        if (-not (Test-AvdExists)) { & $PSCommandPath -Action Prepare }
        & $adb start-server
        $connected = @(Get-ConnectedSerials)
        if ($connected.Count -gt 1) { throw "More than one emulator is connected: $($connected -join ', ')" }
        if ($connected.Count -eq 1) {
            $Serial = $connected[0]
        } else {
            $process = Start-Process -FilePath $emulator -ArgumentList @("-avd", $trainingAvdName, "-no-snapshot", "-no-window", "-no-audio", "-no-boot-anim", "-gpu", "swiftshader_indirect") -WindowStyle Hidden -PassThru
            Write-Output "emulator_pid=$($process.Id)"
            Wait-Until { @(Get-ConnectedSerials).Count -eq 1 } 180 "one connected emulator"
            $Serial = @(Get-ConnectedSerials)[0]
        }
        if ([string]::IsNullOrWhiteSpace($Serial)) { throw "An emulator serial could not be selected." }
        $avdName = Get-AvdName $Serial
        if ($avdName -ne $trainingAvdName) {
            throw "Training emulator AVD must be $trainingAvdName, got $avdName."
        }
        $api = (& $adb -s $Serial shell getprop ro.build.version.sdk 2>$null).Trim()
        $abi = (& $adb -s $Serial shell getprop ro.product.cpu.abi 2>$null).Trim()
        if ($api -ne $runtimeApi) { throw "Training emulator API must be $runtimeApi, got $api." }
        if ($abi -ne "x86_64") { throw "Training emulator ABI must be x86_64, got $abi." }
        Wait-Until { (& $adb -s $Serial shell getprop sys.boot_completed 2>$null).Trim() -eq "1" } 180 "sys.boot_completed=1"
        Wait-Until {
            [bool]((& $adb -s $Serial shell service check package 2>$null) -match "found")
        } 60 "Android package service"
        Write-Output "QA_TRAINING_ANDROID_SERIAL=$Serial"
        Write-Output "Android Training emulator is ready."
    }
    "Stop" {
        $serials = @(Get-ConnectedSerials)
        if ([string]::IsNullOrWhiteSpace($Serial)) {
            if ($serials.Count -eq 1) { $Serial = $serials[0] }
        } elseif ($serials -notcontains $Serial) {
            Write-Output "No connected emulator for serial $Serial; cleanup is already complete."
            return
        }
        if (-not [string]::IsNullOrWhiteSpace($Serial)) {
            $avdName = Get-AvdName $Serial
            if ($avdName -ne $trainingAvdName) {
                Write-Output "Skipped non-Training emulator $Serial ($avdName)."
                return
            }
            & $adb -s $Serial emu kill
            if ($LASTEXITCODE -ne 0) { throw "Unable to stop Training emulator $Serial." }
            Write-Output "Stopped emulator $Serial."
        } else {
            Write-Output "No connected Training emulator to stop."
        }
    }
}
