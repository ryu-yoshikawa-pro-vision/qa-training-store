[CmdletBinding()]
param(
    [string[]]$Path = @(),
    [switch]$Write,
    [switch]$Check,
    [string[]]$RepositoryAlias = @(),
    [string]$VirtualStoreDir,
    [string]$AndroidSdkRoot,
    [string]$JavaHome,
    [string]$MaestroHome,
    [switch]$ChangedOnly,
    [switch]$Staged,
    [switch]$Committed,
    [string]$BaseRef
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    [Console]::Error.WriteLine('Node.js is required for Codex artifact sanitization.')
    exit 1
}
$cli = Join-Path $PSScriptRoot 'sanitize-codex-artifacts.mjs'
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) {
    [Console]::Error.WriteLine('Node sanitizer CLI was not found.')
    exit 1
}

$arguments = [System.Collections.Generic.List[string]]::new()
$arguments.Add($cli)
foreach ($item in $Path) { $arguments.Add('--path'); $arguments.Add($item) }
foreach ($item in $RepositoryAlias) { $arguments.Add('--repository-alias'); $arguments.Add($item) }
foreach ($entry in @(
        @{ Enabled = [bool]$Write; Name = '--write' },
        @{ Enabled = [bool]$Check; Name = '--check' },
        @{ Enabled = [bool]$ChangedOnly; Name = '--changed-only' },
        @{ Enabled = [bool]$Staged; Name = '--staged' },
        @{ Enabled = [bool]$Committed; Name = '--committed' }
    )) {
    if ($entry.Enabled) { $arguments.Add($entry.Name) }
}
foreach ($entry in @(
        @{ Value = $VirtualStoreDir; Name = '--virtual-store-dir' },
        @{ Value = $AndroidSdkRoot; Name = '--android-sdk-root' },
        @{ Value = $JavaHome; Name = '--java-home' },
        @{ Value = $MaestroHome; Name = '--maestro-home' },
        @{ Value = $BaseRef; Name = '--base-ref' }
    )) {
    if (-not [string]::IsNullOrWhiteSpace($entry.Value)) { $arguments.Add($entry.Name); $arguments.Add($entry.Value) }
}

& $node.Source @arguments
exit $LASTEXITCODE
