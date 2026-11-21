[CmdletBinding()]
param(
    [string]$Name
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$runsRoot = Join-Path $repoRoot "runs"
$expectedRunsRoot = [System.IO.Path]::GetFullPath($runsRoot)
$runsRootItem = Get-Item -LiteralPath $runsRoot -Force -ErrorAction SilentlyContinue
if ($null -ne $runsRootItem) {
    if (($runsRootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Run root must not be a symlink, junction, or reparse point: runs"
    }
    if (-not $runsRootItem.PSIsContainer) {
        throw "Run root must be a directory: runs"
    }

    $resolvedRunsRoot = (Resolve-Path -LiteralPath $runsRoot -ErrorAction Stop).Path
    $resolvedRunsRoot = [System.IO.Path]::GetFullPath($resolvedRunsRoot)
    if (-not [System.StringComparer]::OrdinalIgnoreCase.Equals($resolvedRunsRoot, $expectedRunsRoot)) {
        throw "Run root must resolve directly to the repository's runs directory: runs"
    }
}
else {
    New-Item -ItemType Directory -Path $runsRoot -ErrorAction Stop | Out-Null
}

$directories = @(
    "runs",
    "docs\adr",
    "docs\history",
    "docs\plans",
    "docs\reports"
)

foreach ($dir in $directories) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

$keepFiles = @(
    "runs\.gitkeep",
    "docs\adr\.gitkeep",
    "docs\history\.gitkeep",
    "docs\plans\.gitkeep",
    "docs\reports\.gitkeep"
)

foreach ($keep in $keepFiles) {
    if (-not (Test-Path -LiteralPath $keep)) {
        New-Item -ItemType File -Path $keep | Out-Null
    }
}

if ($Name -and (Test-Path -LiteralPath "codex-project.toml")) {
    $escapedName = $Name -replace '\\', '\\\\'
    $escapedName = $escapedName -replace '"', '\"'
    $escapedName = $escapedName -replace "`r", '\r'
    $escapedName = $escapedName -replace "`n", '\n'
    $escapedName = $escapedName -replace "`t", '\t'

    $lines = Get-Content -LiteralPath "codex-project.toml"
    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if (-not $updated -and $lines[$i] -match '^name = ".*"$') {
            $lines[$i] = 'name = "' + $escapedName + '"'
            $updated = $true
        }
    }
    Set-Content -LiteralPath "codex-project.toml" -Value $lines
}

Write-Host "Initialized Codex project metadata."
Write-Host "Next: update docs/PROJECT_CONTEXT.md for this repository."
