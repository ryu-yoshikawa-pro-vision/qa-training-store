[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$RunId,

    [ValidateSet("plan", "review", "implementation", "investigation", "repair", "harness-improvement")]
    [string]$TaskType = "implementation",

    [ValidateSet("lightweight", "standard", "strict")]
    [string]$WorkflowLevel = "standard",

    [switch]$NoPlan,

    [switch]$NoRunManifest,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-JstRunId {
    try {
        $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById("Tokyo Standard Time")
    }
    catch {
        $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById("Asia/Tokyo")
    }

    $jstNow = [System.TimeZoneInfo]::ConvertTime((Get-Date), $tz)
    return $jstNow.ToString("yyyyMMdd-HHmmss") + "-JST"
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    $RunId = Get-JstRunId
}

if ($RunId -notmatch '^\d{8}-\d{6}-JST$') {
    throw "Invalid -RunId: expected YYYYMMDD-HHMMSS-JST"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runsRoot = Join-Path $repoRoot "runs"
$expectedRunsRoot = [System.IO.Path]::GetFullPath($runsRoot)
$legacyRunsRoot = Join-Path $repoRoot ".codex\runs"
$runRoot = Join-Path $runsRoot $RunId
$legacyRunRoot = Join-Path $legacyRunsRoot $RunId

function Get-PathEntry {
    param([Parameter(Mandatory = $true)][string]$Path)

    try {
        return (Get-Item -LiteralPath $Path -Force -ErrorAction Stop)
    }
    catch {
        if ($_.CategoryInfo.Category -eq [System.Management.Automation.ErrorCategory]::ObjectNotFound) {
            return $null
        }
        throw
    }
}

function Test-PathEntry {
    param([Parameter(Mandatory = $true)][string]$Path)

    return ($null -ne (Get-PathEntry -Path $Path))
}

function Assert-ValidRunsRoot {
    $runsRootItem = Get-PathEntry -Path $runsRoot
    if ($null -eq $runsRootItem) {
        return
    }

    if (($runsRootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Run root must not be a symlink, junction, or reparse point: runs"
    }
    if (-not $runsRootItem.PSIsContainer) {
        throw "Run root must be a directory: runs"
    }

    $resolvedRunsRoot = (Resolve-Path -LiteralPath $runsRoot -ErrorAction Stop).ProviderPath
    $resolvedRunsRoot = [System.IO.Path]::GetFullPath($resolvedRunsRoot)
    if (-not [System.StringComparer]::OrdinalIgnoreCase.Equals($resolvedRunsRoot, $expectedRunsRoot)) {
        throw "Run root must resolve directly to the repository's runs directory: runs"
    }
}

# -Force is retained for compatibility, but an existing ID is never overwritten.
Assert-ValidRunsRoot
if (Test-PathEntry -Path $runRoot) {
    throw "Run directory already exists and will not be overwritten: runs/$RunId"
}
if (Test-PathEntry -Path $legacyRunRoot) {
    throw "Run ID already exists in the legacy root and will not be overwritten: .codex/runs/$RunId"
}

$templatesRoot = Join-Path $repoRoot ".codex\templates"
$requiredTemplates = @(
    (Join-Path $templatesRoot "TASKS.md"),
    (Join-Path $templatesRoot "REPORT.md")
)
if (-not $NoPlan) {
    $requiredTemplates += Join-Path $templatesRoot "PLAN.md"
}
if (-not $NoRunManifest) {
    $requiredTemplates += Join-Path $templatesRoot "RUN_MANIFEST.json"
}
foreach ($template in $requiredTemplates) {
    if (-not (Test-Path -LiteralPath $template -PathType Leaf)) {
        throw "Required run template is missing: $template"
    }
}

if ($null -eq (Get-PathEntry -Path $runsRoot)) {
    New-Item -ItemType Directory -Path $runsRoot -ErrorAction Stop | Out-Null
}
Assert-ValidRunsRoot

if (Test-PathEntry -Path $runRoot) {
    throw "Run directory already exists and will not be overwritten: runs/$RunId"
}
if (Test-PathEntry -Path $legacyRunRoot) {
    throw "Run ID already exists in the legacy root and will not be overwritten: .codex/runs/$RunId"
}

$createdRunRoot = $false
try {
    New-Item -ItemType Directory -Path $runRoot -ErrorAction Stop | Out-Null
    $createdRunRoot = $true
    Copy-Item -LiteralPath (Join-Path $templatesRoot "TASKS.md") -Destination (Join-Path $runRoot "TASKS.md")
    Copy-Item -LiteralPath (Join-Path $templatesRoot "REPORT.md") -Destination (Join-Path $runRoot "REPORT.md")
    if (-not $NoPlan) {
        Copy-Item -LiteralPath (Join-Path $templatesRoot "PLAN.md") -Destination (Join-Path $runRoot "PLAN.md")
    }

    if (-not $NoRunManifest) {
        $manifestTemplate = Get-Content -Raw -LiteralPath (Join-Path $templatesRoot "RUN_MANIFEST.json") | ConvertFrom-Json
        $manifestTemplate.run_id = $RunId
        $manifestTemplate.task_type = $TaskType
        $manifestTemplate.workflow_level = $WorkflowLevel
        ($manifestTemplate | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath (Join-Path $runRoot "run.json")
    }
}
catch {
    if ($createdRunRoot -and (Test-PathEntry -Path $runRoot)) {
        Remove-Item -LiteralPath $runRoot -Recurse -Force
    }
    if ((-not $createdRunRoot) -and (Test-PathEntry -Path $runRoot)) {
        throw "Run directory already exists and will not be overwritten: runs/$RunId"
    }
    throw
}

Write-Host "Initialized run: runs/$RunId"
