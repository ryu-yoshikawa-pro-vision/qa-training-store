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
    TMPDIR = [Environment]::GetEnvironmentVariable('TMPDIR', 'Process')
}
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('codex-artifact-sanitizer-' + [guid]::NewGuid().ToString('N'))
$changedGitRoot = $null

try {
    New-Item -ItemType Directory -Path $fixtureRoot -Force | Out-Null
    $env:USERPROFILE = 'C:\Users\test-user'
    $env:HOME = '/home/test-user'
    $env:TEMP = 'C:\Users\test-user\AppData\Local\Temp'
    $env:TMP = 'C:\Users\test-user\AppData\Local\Temp'
    $env:TMPDIR = '/home/test-user/tmp'

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
    Assert-CodexTest -Condition (@($context.resolved_paths['<USER_HOME>']).Count -ge 2) -Message 'Both USERPROFILE and HOME were not registered.'
    Assert-CodexTest -Condition (@($context.resolved_paths['<TEMP_ROOT>']).Count -ge 2) -Message 'All temporary-directory candidates were not registered.'
    foreach ($resolvedUserHome in @($context.resolved_paths['<USER_HOME>'])) {
        $userVariant = @(Get-CodexArtifactPathVariants -Path ([string]$resolvedUserHome) -Token '<USER_HOME>' -Priority 70) | Select-Object -First 1
        $userChild = ([string]$userVariant.Source) + ($(if (Test-CodexWindowsPath -Value ([string]$userVariant.Source)) { '\child' } else { '/child' }))
        Assert-CodexContains -Text (ConvertTo-CodexSanitizedText -Text $userChild -Context $context) -Expected '<USER_HOME>' -Message 'A registered user-home environment variant was not replaced.'
    }
    foreach ($resolvedTemp in @($context.resolved_paths['<TEMP_ROOT>'])) {
        $tempVariant = @(Get-CodexArtifactPathVariants -Path ([string]$resolvedTemp) -Token '<TEMP_ROOT>' -Priority 60) | Select-Object -First 1
        $tempChild = ([string]$tempVariant.Source) + ($(if (Test-CodexWindowsPath -Value ([string]$tempVariant.Source)) { '\child' } else { '/child' }))
        Assert-CodexContains -Text (ConvertTo-CodexSanitizedText -Text $tempChild -Context $context) -Expected '<TEMP_ROOT>' -Message 'A registered temporary-directory variant was not replaced.'
    }

    $boundaryContext = [ordered]@{ replacements = [ordered]@{} }
    foreach ($boundaryPath in @('C:\q', 'C:/q', '/repo')) {
        foreach ($variant in @(Get-CodexArtifactPathVariants -Path $boundaryPath -Token '<REPO_ROOT>' -Priority 10)) {
            $boundaryContext.replacements[$variant.Source + "`0" + $variant.Token + "`0" + $variant.Replacement] = $variant
        }
    }
    foreach ($boundaryCase in @(
            @{ Text = 'C:\q'; Expected = '<REPO_ROOT>' },
            @{ Text = 'C:\q\src'; Expected = '<REPO_ROOT>' },
            @{ Text = 'C:/q'; Expected = '<REPO_ROOT>' },
            @{ Text = 'C:/q/src'; Expected = '<REPO_ROOT>' },
            @{ Text = 'C:\\q\\src'; Expected = '<REPO_ROOT>' },
            @{ Text = '/repo'; Expected = '<REPO_ROOT>' },
            @{ Text = '/repo/src'; Expected = '<REPO_ROOT>' }
        )) {
        Assert-CodexContains -Text (ConvertTo-CodexSanitizedText -Text $boundaryCase.Text -Context $boundaryContext) -Expected $boundaryCase.Expected -Message ('Path boundary fixture did not replace ' + $boundaryCase.Text + '.')
    }
    foreach ($nonBoundary in @('C:\qa', 'C:\quick', 'C:/query', '/repository')) {
        $unchanged = ConvertTo-CodexSanitizedText -Text $nonBoundary -Context $boundaryContext
        Assert-CodexTest -Condition ($unchanged -eq $nonBoundary) -Message ('Path alias prefix false-positive for ' + $nonBoundary + '.')
    }
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
{"path":"C:\\Users\\test-user\\Documents\\repo\\one.txt"}
{"path":"C:/Users/test-user/Documents/repo/two.txt"}
{"path":"file:///C:/Users/test-user/Documents/repo/three.txt"}
{"path":"C:\\\\Users\\\\test-user\\\\Documents\\\\repo\\\\four.txt"}
'@
    $null = $json | ConvertFrom-Json
    foreach ($line in ($jsonl -split '\r?\n' | Where-Object { $_ })) {
        $null = $line | ConvertFrom-Json
    }
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
    Write-CodexFixtureText -Path (Join-Path $fixtureRoot 'residual.md') -Text '/home/unknown-user/repo D:\work\proj\secret'
    $invalidUtf8Path = Join-Path $fixtureRoot 'invalid-utf8.txt'
    [System.IO.File]::WriteAllBytes($invalidUtf8Path, [byte[]](0x7B, 0x22, 0x70, 0x22, 0x3A, 0xFF, 0x7D))
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
    Assert-CodexTest -Condition ($binaryRun.exit_code -ne 0) -Message 'CLI did not report the invalid UTF-8 file while scanning a directory with a binary file.'
    Assert-CodexContains -Text $binaryRun.output -Expected 'invalid UTF-8' -Message 'Directory scan stopped before reporting invalid UTF-8.'
    Assert-CodexContains -Text ([string]((Read-CodexArtifactText -Path (Join-Path $fixtureRoot 'write.md')).text)) -Expected '<REPO_ROOT>' -Message 'A valid file after invalid UTF-8 was not inspected.'
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
    Assert-CodexContains -Text $residualCheck.output -Expected '<local-path-redacted>' -Message 'Finding content did not mask an unrecognized local path.'
    Assert-CodexTest -Condition ($residualCheck.output -notmatch 'test-user|unknown-user|C:\\Users\\') -Message 'Residual report exposed a full user path.'

    $invalidCheck = Invoke-CodexSanitizerCli -Paths @($invalidUtf8Path) -Check
    Assert-CodexTest -Condition ($invalidCheck.exit_code -ne 0) -Message 'Invalid UTF-8 did not fail closed.'
    Assert-CodexContains -Text $invalidCheck.output -Expected 'invalid UTF-8' -Message 'Invalid UTF-8 finding was not reported.'
    Assert-CodexContains -Text $invalidCheck.output -Expected 'files_scanned: 1' -Message 'Invalid UTF-8 file was not counted as scanned.'
    Assert-CodexTest -Condition ($invalidCheck.output -notmatch 'invalid-utf8|C:\\Users\\|test-user') -Message 'Invalid UTF-8 output exposed a local path or content.'

    $checkCandidatePath = Join-Path $fixtureRoot 'check-candidate.md'
    Write-CodexFixtureText -Path $checkCandidatePath -Text 'C:\Users\test-user\Documents\repo\check.md'
    $checkCandidateHash = (Get-FileHash -LiteralPath $checkCandidatePath -Algorithm SHA256).Hash
    $checkCandidate = Invoke-CodexSanitizerCli -Paths @($checkCandidatePath) -Check
    Assert-CodexTest -Condition ($checkCandidate.exit_code -ne 0) -Message 'Check-only did not detect a registered path.'
    Assert-CodexTest -Condition ($checkCandidate.output -match 'replacements_total: [1-9]') -Message 'Check-only replacement statistics were always zero.'
    Assert-CodexTest -Condition ($checkCandidateHash -eq (Get-FileHash -LiteralPath $checkCandidatePath -Algorithm SHA256).Hash) -Message 'Check-only changed a file while reporting candidates.'

    $atomicPath = Join-Path $fixtureRoot 'atomic.txt'
    Write-CodexFixtureText -Path $atomicPath -Text 'original'
    Write-CodexArtifactTextAtomic -Path $atomicPath -Text 'replacement'
    Assert-CodexTest -Condition ((Read-CodexArtifactText -Path $atomicPath).text -eq 'replacement') -Message 'Atomic success did not write the replacement.'
    Assert-CodexTest -Condition (@(Get-ChildItem -LiteralPath $fixtureRoot -Force | Where-Object { $_.Name -like '.codex-artifact-sanitizer-*' }).Count -eq 0) -Message 'Atomic success left a temporary or backup file.'

    $atomicFailurePath = Join-Path $fixtureRoot 'atomic-failure.txt'
    $atomicFailureSource = Join-Path $fixtureRoot 'atomic-failure-source.txt'
    Write-CodexFixtureText -Path $atomicFailurePath -Text 'must survive'
    Write-CodexFixtureText -Path $atomicFailureSource -Text 'new content'
    $failureOperation = {
        param($source, $destination)
        throw 'simulated move failure'
    }
    $atomicFailureThrown = $false
    try {
        Move-CodexArtifactWithBackup -SourcePath $atomicFailureSource -DestinationPath $atomicFailurePath -MoveOperation $failureOperation
    }
    catch {
        $atomicFailureThrown = $true
    }
    Assert-CodexTest -Condition $atomicFailureThrown -Message 'Atomic failure fixture did not raise an error.'
    Assert-CodexTest -Condition ((Read-CodexArtifactText -Path $atomicFailurePath).text -eq 'must survive') -Message 'Atomic failure did not preserve the original artifact.'
    $failureBackups = @(Get-ChildItem -LiteralPath $fixtureRoot -Force | Where-Object { $_.Name -like '.codex-artifact-sanitizer-backup-*' })
    Assert-CodexTest -Condition ($failureBackups.Count -eq 1) -Message 'Atomic failure did not retain a recoverable backup.'
    [System.IO.File]::Delete($failureBackups[0].FullName)

    $changedGitRoot = Join-Path (Split-Path -Parent $fixtureRoot) ('codex-artifact-changed-only-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $changedGitRoot -Force | Out-Null
    $trackedPath = Join-Path $changedGitRoot 'tracked.md'
    $stagedPath = Join-Path $changedGitRoot 'staged.md'
    $unchangedPath = Join-Path $changedGitRoot 'unchanged.md'
    $untrackedPath = Join-Path $changedGitRoot 'untracked.md'
    Write-CodexFixtureText -Path $trackedPath -Text 'base'
    Write-CodexFixtureText -Path $stagedPath -Text 'base'
    Write-CodexFixtureText -Path $unchangedPath -Text 'base'
    & git -C $changedGitRoot init --quiet | Out-Null
    & git -C $changedGitRoot config user.email fixture@example.invalid | Out-Null
    & git -C $changedGitRoot config user.name CodexFixture | Out-Null
    & git -C $changedGitRoot add . | Out-Null
    & git -C $changedGitRoot commit --quiet -m fixture | Out-Null
    Assert-CodexTest -Condition ($LASTEXITCODE -eq 0) -Message 'Temporary Git fixture could not create its baseline commit.'
    Write-CodexFixtureText -Path $trackedPath -Text 'unstaged change'
    Write-CodexFixtureText -Path $stagedPath -Text 'staged change'
    & git -C $changedGitRoot add staged.md | Out-Null
    Assert-CodexTest -Condition ($LASTEXITCODE -eq 0) -Message 'Temporary Git fixture could not stage a change.'
    Write-CodexFixtureText -Path $untrackedPath -Text 'untracked change'
    $outsideChangedPath = Join-Path $fixtureRoot 'outside-changed.md'
    Write-CodexFixtureText -Path $outsideChangedPath -Text 'outside'

    $changedFiles = @(Get-CodexArtifactTextFiles -Path @($changedGitRoot, $outsideChangedPath) -ChangedOnly -RepositoryRoot $changedGitRoot)
    $changedFullPaths = @($changedFiles | ForEach-Object { [System.IO.Path]::GetFullPath($_) })
    foreach ($expectedChangedPath in @($trackedPath, $stagedPath, $untrackedPath)) {
        Assert-CodexTest -Condition ($changedFullPaths -contains ([System.IO.Path]::GetFullPath($expectedChangedPath))) -Message ('ChangedOnly omitted ' + [System.IO.Path]::GetFileName($expectedChangedPath) + '.')
    }
    Assert-CodexTest -Condition ($changedFullPaths -notcontains ([System.IO.Path]::GetFullPath($unchangedPath))) -Message 'ChangedOnly included an unchanged tracked file.'
    Assert-CodexTest -Condition ($changedFullPaths -notcontains ([System.IO.Path]::GetFullPath($outsideChangedPath))) -Message 'ChangedOnly included an explicit path outside the repository.'
    $noTarget = @(Get-CodexArtifactTextFiles -Path @($unchangedPath) -ChangedOnly -RepositoryRoot $changedGitRoot)
    Assert-CodexTest -Condition ($noTarget.Count -eq 0) -Message 'ChangedOnly did not succeed with no matching target.'
    $gitAbsentThrown = $false
    try {
        $null = @(Get-CodexArtifactTextFiles -Path @($outsideChangedPath) -ChangedOnly -RepositoryRoot (Join-Path $changedGitRoot 'missing-repository'))
    }
    catch {
        $gitAbsentThrown = $true
    }
    Assert-CodexTest -Condition $gitAbsentThrown -Message 'ChangedOnly did not fail closed when Git repository resolution was unavailable.'

    Write-Output 'Codex artifact sanitizer fixture tests: PASS (39 contracts)'
    exit 0
}
finally {
    [Environment]::SetEnvironmentVariable('USERPROFILE', $originalEnvironment.USERPROFILE, 'Process')
    [Environment]::SetEnvironmentVariable('HOME', $originalEnvironment.HOME, 'Process')
    [Environment]::SetEnvironmentVariable('TEMP', $originalEnvironment.TEMP, 'Process')
    [Environment]::SetEnvironmentVariable('TMP', $originalEnvironment.TMP, 'Process')
    [Environment]::SetEnvironmentVariable('TMPDIR', $originalEnvironment.TMPDIR, 'Process')
    if ($changedGitRoot -and (Test-Path -LiteralPath $changedGitRoot)) {
        Remove-Item -LiteralPath $changedGitRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $fixtureRoot) {
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
}
