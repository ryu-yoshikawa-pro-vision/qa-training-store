[CmdletBinding(PositionalBinding = $false)]
param(
    [ValidateSet("safe", "readonly", "auto-net")]
    [string]$Preset = "safe",

    [switch]$SkipPreflight,

    [switch]$PreflightOnly,

    [switch]$PrintCommand,

    [switch]$AllowSearch,

    [switch]$NoLog,

    [string]$LogPath,

    [string]$RunId,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PassthroughArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    param([string]$ScriptDir)
    return (Resolve-Path (Join-Path $ScriptDir "..")).Path
}

function Test-IsPathUnderRoot {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Root
    )

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullRoot = [System.IO.Path]::GetFullPath($Root)
    if (-not $fullRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fullRoot += [System.IO.Path]::DirectorySeparatorChar
    }
    return $fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        ($fullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) -eq $fullRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar))
}

function Assert-RunId {
    param([string]$RunId)

    if ([string]::IsNullOrWhiteSpace($RunId)) {
        return
    }
    if ($RunId -notmatch '^\d{8}-\d{6}-JST$') {
        throw "Invalid -RunId: expected YYYYMMDD-HHMMSS-JST"
    }
}

function Get-DefaultLogPath {
    param(
        [string]$RepoRoot,
        [string]$RunId
    )

    $logsDir = Join-Path $RepoRoot ".codex\\logs"
    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $logsDir = Join-Path $RepoRoot (Join-Path ".codex\\runs" (Join-Path $RunId "logs"))
    }
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    $datePart = (Get-Date).ToString("yyyyMMdd")
    return (Join-Path $logsDir ("codex-safe-" + $datePart + ".jsonl"))
}

function Get-LogPathResolved {
    param(
        [string]$RepoRoot,
        [bool]$DisableLogging,
        [string]$ExplicitPath,
        [string]$RunId
    )

    if ($DisableLogging) {
        return $null
    }

    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        $parent = Split-Path -Parent $ExplicitPath
        if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        return $ExplicitPath
    }

    return (Get-DefaultLogPath -RepoRoot $RepoRoot -RunId $RunId)
}

function Get-ArgsSummary {
    param([string[]]$Args)

    if (-not $Args) {
        return [pscustomobject]@{
            count = 0
            preview = @()
        }
    }

    $preview = @()
    for ($i = 0; $i -lt [Math]::Min($Args.Count, 6); $i++) {
        $token = $Args[$i]
        if ($i -eq 1 -and $Args[0] -eq 'exec' -and $token -notmatch '^-') {
            $preview += '<redacted-prompt>'
            continue
        }
        if ($token.Length -gt 160) {
            $preview += ($token.Substring(0, 160) + '...')
        }
        else {
            $preview += $token
        }
    }

    return [pscustomobject]@{
        count = $Args.Count
        preview = $preview
    }
}

function Write-HarnessLog {
    param(
        [string]$Path,
        [string]$Event,
        [hashtable]$Data
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $payload = [ordered]@{
        timestamp = (Get-Date).ToString("o")
        event = $Event
    }

    if ($Data) {
        foreach ($key in $Data.Keys) {
            $payload[$key] = $Data[$key]
        }
    }

    ($payload | ConvertTo-Json -Compress -Depth 8) | Add-Content -Path $Path
}

function Throw-UnsafeArgument {
    param([string]$Token, [string]$Reason)
    throw "Unsafe Codex argument blocked: '$Token' ($Reason)"
}

function Test-UserArguments {
    param(
        [string[]]$ArgsToCheck,
        [string]$RepoRoot,
        [bool]$SearchAllowed
    )

    if (-not $ArgsToCheck) {
        return
    }

    $i = 0
    while ($i -lt $ArgsToCheck.Count) {
        $token = $ArgsToCheck[$i]

        if ([string]::IsNullOrWhiteSpace($token)) {
            $i++
            continue
        }

        switch -Regex ($token) {
            '^--dangerously-bypass-approvals-and-sandbox$' { Throw-UnsafeArgument $token "dangerous bypass is prohibited" }
            '^--full-auto$' { Throw-UnsafeArgument $token "full-auto overrides approval policy; use wrapper preset instead" }
            '^--add-dir(=|$)' { Throw-UnsafeArgument $token "additional writable directories are not allowed" }
            '^--config(=|$)' { Throw-UnsafeArgument $token "user config overrides are blocked; wrapper injects fixed safety settings" }
            '^--sandbox(=|$)' { Throw-UnsafeArgument $token "sandbox mode is fixed by wrapper" }
            '^--ask-for-approval(=|$)' { Throw-UnsafeArgument $token "approval policy is fixed by wrapper" }
            '^--profile(=|$)' { Throw-UnsafeArgument $token "project profiles are not accepted by this wrapper" }
            '^--cd(=|$)' { Throw-UnsafeArgument $token "working root is fixed by wrapper" }
            '^--enable(=|$)' { Throw-UnsafeArgument $token "feature flags are blocked in safe wrapper" }
            '^--disable(=|$)' { Throw-UnsafeArgument $token "feature flags are blocked in safe wrapper" }
            '^--search$' {
                if (-not $SearchAllowed) {
                    Throw-UnsafeArgument $token "web search is disabled by default in safe wrapper"
                }
            }
            '^-c$' { Throw-UnsafeArgument $token "user config overrides are blocked; wrapper injects fixed safety settings" }
            '^-c.+' { Throw-UnsafeArgument $token "short -c config override is blocked" }
            '^-s$' { Throw-UnsafeArgument $token "sandbox mode is fixed by wrapper" }
            '^-s.+' { Throw-UnsafeArgument $token "sandbox mode is fixed by wrapper" }
            '^-a$' { Throw-UnsafeArgument $token "approval policy is fixed by wrapper" }
            '^-a.+' { Throw-UnsafeArgument $token "approval policy is fixed by wrapper" }
            '^-p$' { Throw-UnsafeArgument $token "project profiles are not accepted by this wrapper" }
            '^-p.+' { Throw-UnsafeArgument $token "project profiles are not accepted by this wrapper" }
            '^-C$' { Throw-UnsafeArgument $token "working root is fixed by wrapper" }
            '^-C.+' { Throw-UnsafeArgument $token "working root is fixed by wrapper" }
            default { }
        }

        if ($token -eq '--search' -and -not $SearchAllowed) {
            Throw-UnsafeArgument $token "web search is disabled by default in safe wrapper"
        }

        # Extra defense: block explicit danger values if passed as a separate token in unsupported ways.
        if ($token -eq 'danger-full-access' -or $token -eq 'never') {
            Throw-UnsafeArgument $token "unsafe sandbox/approval value is not allowed"
        }

        $i++
    }
}

function Get-RuleFiles {
    param(
        [string]$RepoRoot,
        [string]$PresetName
    )
    $rulesDir = Join-Path $RepoRoot ".codex\\rules"
    if (-not (Test-Path $rulesDir)) {
        throw "Rules directory not found: $rulesDir"
    }
    $files = Get-ChildItem -Path $rulesDir -Filter *.rules | Sort-Object Name
    if ($PresetName -eq 'auto-net') {
        $files = @($files | Where-Object { $_.Name -ne '20-risky-prompt.rules' })
    }
    if (-not $files) {
        throw "No .rules files found in $rulesDir"
    }
    if ($PresetName -eq 'auto-net') {
        $autoNetRulesDir = Join-Path $RepoRoot ".codex\\rules-auto-net"
        if (-not (Test-Path $autoNetRulesDir)) {
            throw "Rules directory not found: $autoNetRulesDir"
        }
        $autoNetFiles = Get-ChildItem -Path $autoNetRulesDir -Filter *.rules | Sort-Object Name
        if (-not $autoNetFiles) {
            throw "No .rules files found in $autoNetRulesDir"
        }
        $files = @($files) + @($autoNetFiles)
    }
    return $files
}

function Invoke-ExecpolicyCheck {
    param(
        [string]$CodexExe,
        [System.IO.FileInfo[]]$RuleFiles,
        [string[]]$CommandTokens
    )

    $args = @('execpolicy', 'check')
    foreach ($file in $RuleFiles) {
        $args += @('--rules', $file.FullName)
    }
    $args += @('--')
    $args += $CommandTokens

    $output = & $CodexExe @args 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "codex execpolicy check failed (exit=$exitCode) for '$($CommandTokens -join ' ')': $output"
    }

    $jsonText = ($output | Out-String)
    return ($jsonText | ConvertFrom-Json)
}

function Get-ExecpolicyDecision {
    param(
        [Parameter(Mandatory = $true)][object]$Result,
        [Parameter(Mandatory = $true)][string]$Command
    )

    $decisionProperty = $Result.PSObject.Properties['decision']
    if ($null -ne $decisionProperty -and -not [string]::IsNullOrWhiteSpace([string]$decisionProperty.Value)) {
        return [string]$decisionProperty.Value
    }

    $matchedRulesProperty = $Result.PSObject.Properties['matchedRules']
    if ($null -ne $matchedRulesProperty -and $null -ne $matchedRulesProperty.Value) {
        $matchedRules = @($matchedRulesProperty.Value)
        if ($matchedRules.Count -eq 0) {
            return 'allow'
        }
    }

    throw "Execpolicy output is missing an explicit decision for '$Command' and does not prove matchedRules is empty"
}

function Invoke-Preflight {
    param(
        [string]$CodexExe,
        [System.IO.FileInfo[]]$RuleFiles,
        [string]$PresetName
    )

    $tests = [System.Collections.Generic.List[object]]::new()
    @(
        @{ Tokens = @('git', 'status'); Decisions = @('allow') },
        @{ Tokens = @('rg', '--files', 'docs'); Decisions = @('allow') },
        @{ Tokens = @('git', 'add', '.'); Decisions = @('allow') },
        @{ Tokens = @('git', 'reset', '--hard', 'HEAD~1'); Decisions = @('forbidden') },
        @{ Tokens = @('terraform', 'destroy', '-auto-approve'); Decisions = @('forbidden') },
        @{ Tokens = @('python', '-c', 'print(1)'); Decisions = @('allow') },
        @{ Tokens = @('python', '-'); Decisions = @('allow') },
        @{ Tokens = @('rm', 'file.txt'); Decisions = @('forbidden') },
        @{ Tokens = @('Remove-Item', 'file.txt'); Decisions = @('forbidden') },
        @{ Tokens = @('git', 'rm', 'file.txt'); Decisions = @('forbidden') }
    ) | ForEach-Object { $tests.Add($_) }

    $presetSpecificForbidden = $PresetName -eq 'auto-net'
    $tests[2].Decisions = if ($presetSpecificForbidden) { @('forbidden') } else { @('allow') }
    $tests[5].Decisions = if ($presetSpecificForbidden) { @('forbidden') } else { @('allow') }
    $tests[6].Decisions = if ($presetSpecificForbidden) { @('forbidden') } else { @('allow') }

    if ($PresetName -eq 'auto-net') {
        @(
            @{ Tokens = @('docker', 'ps'); Decisions = @('allow') },
            @{ Tokens = @('npm', 'test'); Decisions = @('allow') },
            @{ Tokens = @('curl', 'https://example.com'); Decisions = @('allow') },
            @{ Tokens = @('bash', '-lc', 'npm test'); Decisions = @('forbidden') },
            @{ Tokens = @('chmod', '644', 'file.txt'); Decisions = @('forbidden') },
            @{ Tokens = @('systemctl', 'stop', 'nginx'); Decisions = @('forbidden') },
            @{ Tokens = @('crontab', '-e'); Decisions = @('forbidden') },
            @{ Tokens = @('netsh', 'advfirewall', 'show', 'allprofiles'); Decisions = @('forbidden') },
            @{ Tokens = @('git', 'checkout', 'feature'); Decisions = @('forbidden') },
            @{ Tokens = @('terraform', 'apply', '-auto-approve'); Decisions = @('forbidden') },
            @{ Tokens = @('kubectl', 'apply', '-f', 'deploy.yaml'); Decisions = @('forbidden') }
        ) | ForEach-Object { $tests.Add($_) }
    }
    else {
        $tests.Add(@{ Tokens = @('docker', 'ps'); Decisions = @('prompt') })
    }

    foreach ($test in $tests) {
        $result = Invoke-ExecpolicyCheck -CodexExe $CodexExe -RuleFiles $RuleFiles -CommandTokens $test.Tokens
        $decision = Get-ExecpolicyDecision -Result $result -Command ($test.Tokens -join ' ')
        if ($decision -notin $test.Decisions) {
            throw "Execpolicy preflight mismatch for '$($test.Tokens -join ' ')': expected [$($test.Decisions -join ', ')], got '$decision'"
        }
    }
}

function Get-PresetConfig {
    param([string]$PresetName)
    switch ($PresetName) {
        'safe' {
            return @{
                Sandbox = 'workspace-write'
                Approval = 'on-request'
                NetworkAccessOverride = $false
            }
        }
        'readonly' {
            return @{
                Sandbox = 'read-only'
                Approval = 'on-request'
                NetworkAccessOverride = $false
            }
        }
        'auto-net' {
            return @{
                Sandbox = 'workspace-write'
                Approval = 'never'
                NetworkAccessOverride = $true
            }
        }
        default {
            throw "Unsupported preset: $PresetName"
        }
    }
}

$repoRoot = Get-RepoRoot -ScriptDir $PSScriptRoot
Assert-RunId -RunId $RunId
$runRoot = $null
$manifestPath = $null
$manifestExists = $false
if (-not [string]::IsNullOrWhiteSpace($RunId)) {
    $runRoot = Join-Path $repoRoot (Join-Path ".codex\runs" $RunId)
    if (-not (Test-Path -LiteralPath $runRoot -PathType Container)) {
        throw "Run directory not found: .codex/runs/$RunId"
    }
    $manifestPath = Join-Path $runRoot "run.json"
    $manifestExists = Test-Path -LiteralPath $manifestPath -PathType Leaf
}
$codexCmd = if (-not [string]::IsNullOrWhiteSpace($env:CODEX_BIN)) {
    $candidate = $env:CODEX_BIN
    if (Test-Path $candidate) {
        (Resolve-Path $candidate).Path
    }
    else {
        (Get-Command $candidate -ErrorAction Stop).Source
    }
}
else {
    (Get-Command codex -ErrorAction Stop).Source
}
$presetConfig = Get-PresetConfig -PresetName $Preset
$rules = Get-RuleFiles -RepoRoot $repoRoot -PresetName $Preset
$resolvedLogPath = Get-LogPathResolved -RepoRoot $repoRoot -DisableLogging:$NoLog.IsPresent -ExplicitPath $LogPath -RunId $RunId

Write-HarnessLog -Path $resolvedLogPath -Event 'wrapper_start' -Data @{
    preset = $Preset
    run_id = $RunId
    allow_search = $AllowSearch.IsPresent
    skip_preflight = $SkipPreflight.IsPresent
    preflight_only = $PreflightOnly.IsPresent
    print_command = $PrintCommand.IsPresent
    rules = @($rules | ForEach-Object { $_.Name })
    codex_args = (Get-ArgsSummary -Args $PassthroughArgs)
}

try {
    Test-UserArguments -ArgsToCheck $PassthroughArgs -RepoRoot $repoRoot -SearchAllowed:$AllowSearch.IsPresent
}
catch {
    Write-HarnessLog -Path $resolvedLogPath -Event 'wrapper_blocked_args' -Data @{
        message = $_.Exception.Message
        codex_args = (Get-ArgsSummary -Args $PassthroughArgs)
    }
    throw
}

$cwd = (Get-Location).Path
if (-not (Test-IsPathUnderRoot -Path $cwd -Root $repoRoot)) {
    Write-Warning "Current directory is outside repository root. Wrapper will run Codex in repo root: $repoRoot"
    $cwd = $repoRoot
}

if (-not $SkipPreflight) {
    Write-HarnessLog -Path $resolvedLogPath -Event 'preflight_start' -Data @{}
    try {
        Invoke-Preflight -CodexExe $codexCmd -RuleFiles $rules -PresetName $Preset
        Write-HarnessLog -Path $resolvedLogPath -Event 'preflight_ok' -Data @{}
    }
    catch {
        Write-HarnessLog -Path $resolvedLogPath -Event 'preflight_failed' -Data @{
            message = $_.Exception.Message
        }
        throw
    }
}

if ($PreflightOnly) {
    Write-HarnessLog -Path $resolvedLogPath -Event 'preflight_only_exit' -Data @{
        cwd = $cwd
    }
    Write-Host "Preflight OK. Rules validated against smoke tests."
    exit 0
}

$finalArgs = @(
    '-C', $cwd,
    '--sandbox', $presetConfig.Sandbox,
    '--ask-for-approval', $presetConfig.Approval
)

if ($presetConfig.NetworkAccessOverride) {
    $finalArgs += @('-c', 'sandbox_workspace_write.network_access=true')
}

if ($AllowSearch) {
    $finalArgs += '--search'
}

if ($PassthroughArgs) {
    $finalArgs += $PassthroughArgs
}

if ($PrintCommand) {
    Write-HarnessLog -Path $resolvedLogPath -Event 'print_command' -Data @{
        cwd = $cwd
        final_args = (Get-ArgsSummary -Args $finalArgs)
        network_access_override = $presetConfig.NetworkAccessOverride
    }
    [pscustomobject]@{
        codex = $codexCmd
        args = $finalArgs
        rules = ($rules | ForEach-Object { $_.Name })
        preflight = (-not $SkipPreflight.IsPresent)
        preset = $Preset
        network_access_override = $presetConfig.NetworkAccessOverride
        run_id = $RunId
        log_path = $resolvedLogPath
    } | ConvertTo-Json -Depth 4
    exit 0
}

Write-HarnessLog -Path $resolvedLogPath -Event 'codex_exec_start' -Data @{
    cwd = $cwd
    final_args = (Get-ArgsSummary -Args $finalArgs)
    network_access_override = $presetConfig.NetworkAccessOverride
}

& $codexCmd @finalArgs
$codexExit = $LASTEXITCODE

Write-HarnessLog -Path $resolvedLogPath -Event 'codex_exec_exit' -Data @{
    exit_code = $codexExit
}

$collectorExit = 0
if ($manifestExists) {
    Write-HarnessLog -Path $resolvedLogPath -Event 'manifest_sync_start' -Data @{
        run_id = $RunId
    }
    $collectorPath = Join-Path $repoRoot "scripts\collect-run-artifacts.ps1"
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collectorPath -RunId $RunId -RefreshGitChangedFiles
        $collectorExit = $LASTEXITCODE
    }
    catch {
        $collectorExit = 1
    }

    if ($collectorExit -eq 0) {
        Write-HarnessLog -Path $resolvedLogPath -Event 'manifest_sync_success' -Data @{
            run_id = $RunId
        }
    }
    else {
        Write-HarnessLog -Path $resolvedLogPath -Event 'manifest_sync_failed' -Data @{
            run_id = $RunId
            exit_code = $collectorExit
        }
        Write-Warning "Manifest sync failed (exit=$collectorExit)."
    }
}
else {
    $skipReason = if ([string]::IsNullOrWhiteSpace($RunId)) { 'run_id_not_provided' } else { 'manifest_not_found' }
    Write-HarnessLog -Path $resolvedLogPath -Event 'manifest_sync_skipped' -Data @{
        reason = $skipReason
    }
}

if ($codexExit -ne 0) {
    exit $codexExit
}
if ($collectorExit -ne 0) {
    exit $collectorExit
}
exit 0
