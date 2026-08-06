[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string[]]$Path,
    [switch]$Write,
    [switch]$Check,
    [string[]]$RepositoryAlias,
    [string]$VirtualStoreDir,
    [string]$AndroidSdkRoot,
    [string]$JavaHome,
    [string]$MaestroHome,
    [switch]$ChangedOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $Write -and -not $Check) {
    throw 'Specify at least one of -Write or -Check.'
}

$sanitizer = Join-Path $PSScriptRoot 'lib/codex-artifact-sanitizer.ps1'
if (-not (Test-Path -LiteralPath $sanitizer)) {
    throw 'Shared Codex artifact sanitizer was not found.'
}
. $sanitizer

$repositoryRoot = Get-CodexGitRepositoryRoot -WorkingDirectory (Get-Location).Path
$context = New-CodexArtifactSanitizerContext -RepositoryRoot $repositoryRoot -RepositoryAlias $RepositoryAlias -VirtualStoreDir $VirtualStoreDir -AndroidSdkRoot $AndroidSdkRoot -JavaHome $JavaHome -MaestroHome $MaestroHome

# Standard caller target is .codex/runs/**. Explicit -Path also permits a
# narrow docs/history or docs/reports scan without changing the default scope.
$stats = New-CodexArtifactSanitizerStats
$files = @(Get-CodexArtifactTextFiles -Path $Path -ChangedOnly:$ChangedOnly -RepositoryRoot $repositoryRoot)
$findings = New-Object System.Collections.Generic.List[object]

function Add-CodexKnownPathFindings {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$CurrentText,
        [Parameter(Mandatory = $true)][string]$SanitizedText,
        [Parameter(Mandatory = $true)]$Target
    )

    if ($CurrentText -eq $SanitizedText) {
        return
    }

    $currentLines = $CurrentText -split '\r?\n', -1
    $sanitizedLines = $SanitizedText -split '\r?\n', -1
    $lineCount = [Math]::Max($currentLines.Count, $sanitizedLines.Count)
    for ($index = 0; $index -lt $lineCount; $index++) {
        $currentLine = if ($index -lt $currentLines.Count) { $currentLines[$index].TrimEnd([char]0x0D) } else { '' }
        $sanitizedLine = if ($index -lt $sanitizedLines.Count) { $sanitizedLines[$index].TrimEnd([char]0x0D) } else { '' }
        if ($currentLine -ne $sanitizedLine) {
            $Target.Add([pscustomobject]@{
                    file_path = $FilePath
                    line_number = $index + 1
                    pattern_type = 'known registered path'
                    content = $sanitizedLine
                })
        }
    }
}

foreach ($file in $files) {
    $stats.files_scanned = [int]$stats.files_scanned + 1
    $read = Read-CodexArtifactText -Path $file
    $currentText = [string]$read.text
    $scanText = $currentText

    if ($Write) {
        $sanitizedText = ConvertTo-CodexSanitizedText -Text $currentText -Context $context -Stats $stats
        $needsWrite = $read.has_bom -or $sanitizedText -ne $currentText
        if ($needsWrite) {
            Write-CodexArtifactTextAtomic -Path $file -Text $sanitizedText
            $stats.files_changed = [int]$stats.files_changed + 1
        }
        $scanText = $sanitizedText
    }

    if ($Check) {
        if ($read.has_bom -and -not $Write) {
            $findings.Add([pscustomobject]@{
                    file_path = $file
                    line_number = 1
                    pattern_type = 'UTF-8 BOM'
                    content = '<BOM><redacted>'
                })
        }

        $expectedText = ConvertTo-CodexSanitizedText -Text $scanText -Context $context
        Add-CodexKnownPathFindings -FilePath $file -CurrentText $scanText -SanitizedText $expectedText -Target $findings

        foreach ($finding in @(Find-CodexArtifactResidualPath -Text $scanText -FilePath $file)) {
            $findings.Add($finding)
        }
    }
}

$stats.residual_findings = $findings.Count
$mode = @()
if ($Write) { $mode += 'Write' }
if ($Check) { $mode += 'Check' }

Write-Output 'Codex artifact sanitization:'
Write-Output ('  mode: ' + ($mode -join ', '))
Write-Output ('  files_scanned: ' + $stats.files_scanned)
Write-Output ('  files_changed: ' + $stats.files_changed)
Write-Output ('  replacements_total: ' + $stats.replacements_total)
Write-Output '  replacements_by_token:'
foreach ($token in $stats.replacements_by_token.Keys) {
    Write-Output ('    ' + $token + ': ' + $stats.replacements_by_token[$token])
}
Write-Output ('  residual_findings: ' + $stats.residual_findings)

if ($findings.Count -gt 0) {
    foreach ($finding in $findings) {
        $displayPath = ConvertTo-CodexSanitizedText -Text ([string]$finding.file_path) -Context $context
        Write-Output ($displayPath + ':' + $finding.line_number + ' ' + $finding.pattern_type + ' remains: ' + [string]$finding.content)
    }
    exit 1
}

exit 0
