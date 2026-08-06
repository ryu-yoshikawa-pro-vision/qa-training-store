[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sanitizerPath = Join-Path $repoRoot 'scripts/lib/codex-artifact-sanitizer.ps1'
$cliPath = Join-Path $repoRoot 'scripts/sanitize-codex-artifacts.ps1'
. $sanitizerPath

function Assert-CodexTest {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-CodexContains {
    param(
        [AllowNull()][string]$Text,
        [Parameter(Mandatory = $true)][string]$Expected,
        [Parameter(Mandatory = $true)][string]$Message
    )

    Assert-CodexTest -Condition ($Text.Contains($Expected)) -Message $Message
}

function Write-CodexFixtureText {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text,
        [switch]$Bom
    )

    $encoding = [System.Text.UTF8Encoding]::new($Bom)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Invoke-CodexSanitizerCli {
    param(
        [Parameter(Mandatory = $true)][string[]]$Paths,
        [switch]$Write,
        [switch]$Check
    )

    $aliases = @($script:fixtureRoot, 'C:\Users\test-user\Documents\repo', 'C:\q')
    if ($Write -and $Check) {
        $output = & $cliPath -Path $Paths -Write -Check -RepositoryAlias $aliases 2>&1
    }
    elseif ($Write) {
        $output = & $cliPath -Path $Paths -Write -RepositoryAlias $aliases 2>&1
    }
    elseif ($Check) {
        $output = & $cliPath -Path $Paths -Check -RepositoryAlias $aliases 2>&1
    }
    else {
        throw 'Fixture helper requires Write or Check.'
    }
    return [pscustomobject]@{
        exit_code = [int]$LASTEXITCODE
        output = ($output -join ([Environment]::NewLine))
    }
}

$originalEnvironment = @{
    USERPROFILE = [Environment]::GetEnvironmentVariable('USERPROFILE', 'Process')
    HOME = [Environment]::GetEnvironmentVariable('HOME', 'Process')
    TEMP = [Environment]::GetEnvironmentVariable('TEMP', 'Process')
    TMP = [Environment]::GetEnvironmentVariable('TMP', 'Process')
}
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('codex-artifact-sanitizer-' + [guid]::NewGuid().ToString('N'))

try {
    New-Item -ItemType Directory -Path $fixtureRoot -Force | Out-Null
    $env:USERPROFILE = 'C:\Users\test-user'
    $env:HOME = '/home/test-user'
    $env:TEMP = 'C:\Users\test-user\AppData\Local\Temp'
    $env:TMP = 'C:\Users\test-user\AppData\Local\Temp'

    $context = New-CodexArtifactSanitizerContext -RepositoryRoot $repoRoot -RepositoryAlias @('C:\Users\test-user\Documents\repo', 'C:\q')
    $repoText = ConvertTo-CodexSanitizedText -Text ($repoRoot + '\src\presentation\native') -Context $context
    Assert-CodexContains -Text $repoText -Expected '<REPO_ROOT>' -Message 'Repository physical path was not replaced.'
    $aliasText = ConvertTo-CodexSanitizedText -Text 'C:\q\src\index.ts' -Context $context
    Assert-CodexContains -Text $aliasText -Expected '<REPO_ROOT>' -Message 'Repository alias was not replaced.'
    $userText = ConvertTo-CodexSanitizedText -Text 'C:\USERS\TEST-USER\AppData\Local' -Context $context
    Assert-CodexContains -Text $userText -Expected '<USER_HOME>' -Message 'Windows User Home variant was not replaced.'
    $tempText = ConvertTo-CodexSanitizedText -Text 'C:\Users\test-user\AppData\Local\Temp\job.log' -Context $context
    Assert-CodexContains -Text $tempText -Expected '<TEMP_ROOT>' -Message 'Temp Root was not preferred over User Home.'
    Assert-CodexTest -Condition (-not $tempText.Contains('<USER_HOME>')) -Message 'Temp Root was replaced by User Home first.'
    $uriText = ConvertTo-CodexSanitizedText -Text 'file:///C:/Users/test-user/Documents/repo/output.txt' -Context $context
    Assert-CodexContains -Text $uriText -Expected '<REPO_ROOT>' -Message 'File URI variant was not replaced.'
    $escapedText = ConvertTo-CodexSanitizedText -Text 'C:\\Users\\test-user\\Documents\\repo\\script.js' -Context $context
    Assert-CodexContains -Text $escapedText -Expected '<REPO_ROOT>' -Message 'JSON escaped variant was not replaced.'
    $slashText = ConvertTo-CodexSanitizedText -Text 'C:/Users/test-user/Documents/repo/script.js' -Context $context
    Assert-CodexContains -Text $slashText -Expected '<REPO_ROOT>' -Message 'Slash Windows variant was not replaced.'

    $residualInput = '/Users/test-user/repo /home/test-user/repo /mnt/c/Users/test-user/repo'
    $residuals = @(Find-CodexArtifactResidualPath -Text $residualInput -FilePath 'fixture.md')
    Assert-CodexTest -Condition ($residuals.Count -eq 3) -Message 'macOS, Linux, and WSL residual paths were not all detected.'
    Assert-CodexTest -Condition (($residuals | ConvertTo-Json -Compress) -notmatch 'test-user') -Message 'Residual report exposed the user name.'

    $payload = [ordered]@{
        path = 'C:\q\payload.txt'
        count = 3
        enabled = $true
        missing = $null
        nested = @('C:/Users/test-user/Documents/repo/a', 7, $false)
    }
    $sanitizedPayload = ConvertTo-CodexSanitizedValue -Value $payload -Context $context
    Assert-CodexContains -Text ([string]$sanitizedPayload.path) -Expected '<REPO_ROOT>' -Message 'IDictionary values were not recursively sanitized.'
    Assert-CodexTest -Condition ($sanitizedPayload.count -eq 3 -and $sanitizedPayload.enabled -eq $true -and $null -eq $sanitizedPayload.missing) -Message 'Primitive values changed during recursive sanitization.'
    Assert-CodexContains -Text ([string]$sanitizedPayload.nested[0]) -Expected '<REPO_ROOT>' -Message 'Array values were not recursively sanitized.'

    $markdown = @'
Repository: C:\Users\test-user\Documents\repo
Alias: C:\q\src\index.ts
User: C:\Users\test-user\AppData\Local
Temp: C:\Users\test-user\AppData\Local\Temp\job.log
Linux: /home/test-user/repo
macOS: /Users/test-user/repo
'@
    $json = @'
{
  "repository": "C:\\Users\\test-user\\Documents\\repo",
  "command": "node C:/Users/test-user/Documents/repo/script.js",
  "evidence": [
    "file:///C:/Users/test-user/Documents/repo/output.txt"
  ]
}
'@
    $jsonl = @'
{"path":"C:\Users\test-user\Documents\repo\one.txt"}
{"path":"C:/Users/test-user/Documents/repo/two.txt"}
{"path":"file:///C:/Users/test-user/Documents/repo/three.txt"}
{"path":"C:\\Users\\test-user\\Documents\\repo\\four.txt"}
'@
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'mixed.md') -Text $markdown
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'write.md') -Text @'
Repository: C:\Users\test-user\Documents\repo
User: C:\Users\test-user\AppData\Local
Temp: C:\Users\test-user\AppData\Local\Temp\job.log
File: file:///C:/Users/test-user/Documents/repo/output.txt
'@
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'payload.json') -Text $json
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'events.jsonl') -Text $jsonl
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'bom.txt') -Text 'C:\Users\test-user\Documents\repo\bom.txt' -Bom
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'residual.md') -Text '/home/unknown-user/repo'
    [System.IO.File]::WriteAllBytes((Join-Path $fixtureRoot 'opaque.bin'), [byte[]](0, 1, 2, 3, 0xEF, 0xBB, 0xBF))

    $safePaths = @(
        (Join-Path $fixtureRoot 'write.md'),
        (Join-Path $fixtureRoot 'payload.json'),
        (Join-Path $fixtureRoot 'events.jsonl'),
        (Join-Path $fixtureRoot 'bom.txt')
    )
    $writeCheck = Invoke-CodexSanitizerCli -Paths $safePaths -Write -Check
    Assert-CodexTest -Condition ($writeCheck.exit_code -eq 0) -Message 'CLI Write+Check did not succeed.'
    Assert-CodexContains -Text $writeCheck.output -Expected 'residual_findings: 0' -Message 'CLI Write+Check reported residual findings.'

    $jsonResult = (Read-CodexArtifactText -Path (Join-Path $fixtureRoot 'payload.json')).text | ConvertFrom-Json
    Assert-CodexContains -Text ([string]$jsonResult.repository) -Expected '<REPO_ROOT>' -Message 'Sanitized JSON was not parseable or missing token.'
    $jsonlLines = ((Read-CodexArtifactText -Path (Join-Path $fixtureRoot 'events.jsonl')).text -split '\r?\n' | Where-Object { $_ })
    foreach ($line in $jsonlLines) {
        $null = $line | ConvertFrom-Json
    }
    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $fixtureRoot 'bom.txt'))
    Assert-CodexTest -Condition ($bytes.Length -lt 3 -or $bytes[0] -ne 0xEF -or $bytes[1] -ne 0xBB -or $bytes[2] -ne 0xBF) -Message 'Write added or retained a UTF-8 BOM.'

    $binaryBefore = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $fixtureRoot 'opaque.bin')))
    $binaryRun = Invoke-CodexSanitizerCli -Paths @($fixtureRoot) -Write
    Assert-CodexTest -Condition ($binaryRun.exit_code -eq 0) -Message 'CLI failed while scanning a directory with a binary file.'
    $binaryAfter = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $fixtureRoot 'opaque.bin')))
    Assert-CodexTest -Condition ($binaryBefore -eq $binaryAfter) -Message 'Binary file was modified.'

    $writeHashBefore = (Get-FileHash -LiteralPath (Join-Path $fixtureRoot 'write.md') -Algorithm SHA256).Hash
    $checkOnly = Invoke-CodexSanitizerCli -Paths $safePaths -Check
    $writeHashAfterCheck = (Get-FileHash -LiteralPath (Join-Path $fixtureRoot 'write.md') -Algorithm SHA256).Hash
    Assert-CodexTest -Condition ($checkOnly.exit_code -eq 0) -Message 'Check-only failed on sanitized fixtures.'
    Assert-CodexTest -Condition ($writeHashBefore -eq $writeHashAfterCheck) -Message 'Check-only changed a file.'

    $secondWrite = Invoke-CodexSanitizerCli -Paths $safePaths -Write
    $writeHashAfterSecond = (Get-FileHash -LiteralPath (Join-Path $fixtureRoot 'write.md') -Algorithm SHA256).Hash
    Assert-CodexContains -Text $secondWrite.output -Expected 'files_changed: 0' -Message 'Second Write was not idempotent.'
    Assert-CodexContains -Text $secondWrite.output -Expected 'replacements_total: 0' -Message 'Second Write performed replacements.'
    Assert-CodexTest -Condition ($writeHashBefore -eq $writeHashAfterSecond) -Message 'Second Write changed already sanitized content.'

    $residualCheck = Invoke-CodexSanitizerCli -Paths @((Join-Path $fixtureRoot 'mixed.md'), (Join-Path $fixtureRoot 'residual.md')) -Check
    Assert-CodexTest -Condition ($residualCheck.exit_code -ne 0) -Message 'Check did not fail closed for residual paths.'
    Assert-CodexContains -Text $residualCheck.output -Expected '<redacted>' -Message 'Residual report did not mask the user segment.'
    Assert-CodexTest -Condition ($residualCheck.output -notmatch 'test-user|unknown-user|C:\\Users\\') -Message 'Residual report exposed a full user path.'

    Write-Output 'Codex artifact sanitizer fixture tests: PASS (20 contracts)'
    exit 0
}
finally {
    [Environment]::SetEnvironmentVariable('USERPROFILE', $originalEnvironment.USERPROFILE, 'Process')
    [Environment]::SetEnvironmentVariable('HOME', $originalEnvironment.HOME, 'Process')
    [Environment]::SetEnvironmentVariable('TEMP', $originalEnvironment.TEMP, 'Process')
    [Environment]::SetEnvironmentVariable('TMP', $originalEnvironment.TMP, 'Process')
    if (Test-Path -LiteralPath $fixtureRoot) {
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
}
