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

    $currentLines = @(Split-CodexArtifactLines -Text $CurrentText)
    $sanitizedLines = @(Split-CodexArtifactLines -Text $SanitizedText)
    $lineCount = [Math]::Max($currentLines.Count, $sanitizedLines.Count)
    for ($index = 0; $index -lt $lineCount; $index++) {
        $currentLine = if ($index -lt $currentLines.Count) { $currentLines[$index].TrimEnd([char]0x0D) } else { '' }
        $sanitizedLine = if ($index -lt $sanitizedLines.Count) { $sanitizedLines[$index].TrimEnd([char]0x0D) } else { '' }
        if ($currentLine -ne $sanitizedLine) {
            $Target.Add([pscustomobject]@{
                    file_path = $FilePath
                    line_number = $index + 1
                    pattern_type = 'known registered path'
                    content = '<local-path-redacted>'
                    context = ConvertTo-CodexBoundedFindingContext -Line $sanitizedLine -Context $context -MaximumLength $script:CodexFindingContextMaximumLength
                })
        }
    }
}

foreach ($file in $files) {
    $stats.files_scanned = [int]$stats.files_scanned + 1
    try {
        $read = Read-CodexArtifactText -Path $file
    }
    catch [System.Text.DecoderFallbackException] {
        $findings.Add([pscustomobject]@{
                file_path = $file
                line_number = 1
                pattern_type = 'invalid UTF-8'
                content = '<invalid-utf8-redacted>'
            })
        continue
    }
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

        $expectedStats = if (-not $Write) { $stats } else { $null }
        $expectedText = ConvertTo-CodexSanitizedText -Text $scanText -Context $context -Stats $expectedStats
        Add-CodexKnownPathFindings -FilePath $file -CurrentText $scanText -SanitizedText $expectedText -Target $findings

        foreach ($finding in @(Find-CodexArtifactResidualPath -Text $scanText -FilePath $file -Context $context)) {
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
        $displayPath = ConvertTo-CodexRelativeArtifactPath -FilePath ([string]$finding.file_path) -RepositoryRoot $repositoryRoot
        $rawContext = if ($finding.PSObject.Properties.Name -contains 'context') {
            [string]$finding.context
        }
        else {
            [string]$finding.content
        }
        $displayContext = ConvertTo-CodexFindingOutputText -Text $rawContext -Context $context -MaximumLength $script:CodexFindingContextMaximumLength
        Write-Output ($displayPath + ':' + $finding.line_number)
        Write-Output ('pattern: ' + $finding.pattern_type)
        Write-Output ('context: ' + $displayContext)
    }
    exit 1
}

exit 0
