Set-StrictMode -Version Latest

$script:CodexArtifactSanitizerTokenPriority = [ordered]@{
    '<REPO_ROOT>' = 10
    '<ANDROID_SDK_ROOT>' = 20
    '<JAVA_HOME>' = 30
    '<PNPM_VIRTUAL_STORE>' = 40
    '<MAESTRO_HOME>' = 50
    '<TEMP_ROOT>' = 60
    '<USER_HOME>' = 70
}

$script:CodexArtifactSanitizerExtensions = @('.md', '.json', '.jsonl', '.txt')
$script:CodexFindingContextMaximumLength = 160

$script:CodexArtifactResidualPatterns = @(
    [ordered]@{
        type = 'Windows file URI'
        regex = '(?i)(?<![A-Za-z0-9])file:///[A-Z]:[\\/](?:[^\\/\s"<>?#]+[\\/])*[^\\/\s"<>?#]+'
    }
    [ordered]@{
        type = 'WSL user path'
        regex = '(?i)/mnt/[a-z]/Users/[^/\s"<>]+'
    }
    [ordered]@{
        type = 'Windows user path'
        regex = '(?i)\b[A-Z]:[\/](?:Users|Documents and Settings)[\/][^\/\s"<>]+'
    }
    [ordered]@{
        type = 'Windows absolute path'
        regex = '(?i)(?<![A-Za-z0-9])[A-Z]:[\\/](?:[^\\/\s"<>?#]+[\\/])*[^\\/\s"<>?#]+'
    }
    [ordered]@{
        type = 'Windows UNC path'
        regex = '(?i)(?<![A-Za-z0-9])\\\\[^\\/\s"<>?#]+(?:[\\/][^\\/\s"<>?#]+)+'
    }
    [ordered]@{
        type = 'macOS user path'
        regex = '/Users/[^/\s"<>]+'
    }
    [ordered]@{
        type = 'Linux user path'
        regex = '/home/[^/\s"<>]+'
    }
)

function Test-CodexWindowsPath {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return $Value -match '^(?:[A-Za-z]:[\\/]|\\\\)'
}

function Get-CodexPathComparison {
    param([Parameter(Mandatory = $true)][string]$Source)

    if (Test-CodexWindowsPath -Value $Source) {
        return [System.StringComparison]::OrdinalIgnoreCase
    }

    return [System.StringComparison]::Ordinal
}

function ConvertTo-CodexRegistrationPath {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $candidate = $Value.Trim()
    if ($candidate -match '^(?i)file://') {
        $candidate = $candidate -replace '^(?i)file://', ''
        if ($candidate -match '^/[A-Za-z]:/') {
            $candidate = $candidate.Substring(1)
        }
        $candidate = $candidate -replace '%20', ' '
    }

    if (Test-CodexWindowsPath -Value $candidate) {
        if ([System.IO.Path]::DirectorySeparatorChar -eq '\') {
            try {
                return [System.IO.Path]::GetFullPath($candidate)
            }
            catch {
                return $candidate
            }
        }

        return $candidate
    }

    if ($candidate.StartsWith('/', [System.StringComparison]::Ordinal)) {
        try {
            return [System.IO.Path]::GetFullPath($candidate)
        }
        catch {
            return $candidate
        }
    }

    try {
        return [System.IO.Path]::GetFullPath($candidate)
    }
    catch {
        return $candidate
    }
}

function Remove-CodexTrailingSeparators {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -eq '/' -or $Value -eq '\') {
        return $Value
    }

    if ($Value -match '^[A-Za-z]:[\\/]$') {
        return $Value
    }

    return $Value.TrimEnd([char[]]@('\', '/'))
}

function Add-CodexPathVariant {
    param(
        [Parameter(Mandatory = $true)]$Target,
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Replacement,
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][int]$Priority,
        [Parameter(Mandatory = $true)][bool]$CaseInsensitive
    )

    if ([string]::IsNullOrEmpty($Source)) {
        return
    }

    $key = $Source + "`0" + $Token + "`0" + $Replacement
    if ($Target.Contains($key)) {
        return
    }

    $Target[$key] = [pscustomobject]@{
        Source = $Source
        Replacement = $Replacement
        Token = $Token
        Priority = $Priority
        CaseInsensitive = $CaseInsensitive
    }
}

function Get-CodexArtifactPathVariants {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][int]$Priority
    )

    $base = Remove-CodexTrailingSeparators -Value $Path
    if ([string]::IsNullOrEmpty($base)) {
        return @()
    }

    $windowsPath = Test-CodexWindowsPath -Value $base
    $native = if ($windowsPath) { $base.Replace('/', '\') } else { $base.Replace('\', '/') }
    $slash = $native.Replace('\', '/')
    $caseInsensitive = $windowsPath
    $variants = [ordered]@{}

    Add-CodexPathVariant -Target $variants -Source $native -Replacement $Token -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive
    Add-CodexPathVariant -Target $variants -Source ($native + '\') -Replacement ($Token + '/') -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive
    Add-CodexPathVariant -Target $variants -Source $slash -Replacement $Token -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive
    Add-CodexPathVariant -Target $variants -Source ($slash + '/') -Replacement ($Token + '/') -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive

    $jsonEscapedNative = $native.Replace('\', '\\')
    Add-CodexPathVariant -Target $variants -Source $jsonEscapedNative -Replacement $Token -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive
    Add-CodexPathVariant -Target $variants -Source ($jsonEscapedNative + '\\') -Replacement ($Token + '/') -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive

    $fileUri = if ($windowsPath) { 'file:///' + $slash } else { 'file://' + $slash }
    Add-CodexPathVariant -Target $variants -Source $fileUri -Replacement $Token -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive
    Add-CodexPathVariant -Target $variants -Source ($fileUri + '/') -Replacement ($Token + '/') -Token $Token -Priority $Priority -CaseInsensitive $caseInsensitive

    return @($variants.Values)
}

function Get-CodexGitRepositoryRoot {
    param([string]$WorkingDirectory)

    $git = Get-Command git -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandType -eq 'Application' } |
        Select-Object -First 1
    if (-not $git) {
        return $null
    }

    $gitArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $gitArgs += @('-C', $WorkingDirectory)
    }
    $gitArgs += @('rev-parse', '--show-toplevel')

    try {
        $output = & $git.Source @gitArgs 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        return ([string]($output | Select-Object -First 1)).Trim()
    }
    catch {
        return $null
    }
}

function Test-CodexGitRootWorkingDirectory {
    param([Parameter(Mandatory = $true)][string]$WorkingDirectory)

    $git = Get-Command git -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandType -eq 'Application' } |
        Select-Object -First 1
    if (-not $git) {
        return $false
    }

    try {
        $prefix = & $git.Source -C $WorkingDirectory rev-parse --show-prefix 2>$null
        return $LASTEXITCODE -eq 0 -and [string]::IsNullOrEmpty(([string]($prefix | Select-Object -First 1)).Trim())
    }
    catch {
        return $false
    }
}

function Add-CodexSanitizerPath {
    param(
        [Parameter(Mandatory = $true)]$Context,
        [AllowNull()][string]$Value,
        [Parameter(Mandatory = $true)][string]$Token
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    $resolved = ConvertTo-CodexRegistrationPath -Value $Value
    if ([string]::IsNullOrWhiteSpace($resolved)) {
        return
    }

    $priority = [int]$script:CodexArtifactSanitizerTokenPriority[$Token]
    $comparison = Get-CodexPathComparison -Source $resolved
    $existing = @($Context.resolved_paths[$Token])
    foreach ($item in $existing) {
        if ([System.String]::Equals([string]$item, $resolved, $comparison)) {
            return
        }
    }

    $Context.resolved_paths[$Token] = @($existing + $resolved)
    foreach ($variant in @(Get-CodexArtifactPathVariants -Path $resolved -Token $Token -Priority $priority)) {
        $Context.replacements[$variant.Source + "`0" + $variant.Token + "`0" + $variant.Replacement] = $variant
    }
}

function Get-CodexPnpmVirtualStoreDir {
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandType -eq 'Application' } |
        Select-Object -First 1
    if (-not $pnpm) {
        return $null
    }

    try {
        $value = & $pnpm.Source config get virtual-store-dir 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        $text = ([string]($value | Select-Object -First 1)).Trim()
        if ([string]::IsNullOrWhiteSpace($text) -or $text -in @('undefined', 'null')) {
            return $null
        }
        return $text
    }
    catch {
        return $null
    }
}

function Get-CodexMaestroHomeFromExecutable {
    param([AllowNull()][string]$ExecutablePath)

    if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
        return $null
    }

    $normalized = $ExecutablePath.Trim().Replace('\', '/')
    $binMarker = '/bin/'
    $binIndex = $normalized.LastIndexOf($binMarker, [System.StringComparison]::OrdinalIgnoreCase)
    if ($binIndex -lt 0) {
        return $null
    }

    $suffix = $normalized.Substring($binIndex + $binMarker.Length)
    if ([string]::IsNullOrWhiteSpace($suffix) -or $suffix.Contains('/')) {
        return $null
    }

    $maestroHomePath = $normalized.Substring(0, $binIndex).TrimEnd('/')
    if ([string]::IsNullOrWhiteSpace($maestroHomePath)) {
        return $null
    }

    return $maestroHomePath
}

function New-CodexArtifactSanitizerContext {
    param(
        [string]$RepositoryRoot,
        [string[]]$RepositoryAlias,
        [string]$VirtualStoreDir,
        [string]$AndroidSdkRoot,
        [string]$JavaHome,
        [string]$MaestroHome
    )

    $currentDirectory = (Get-Location).Path
    $gitRoot = Get-CodexGitRepositoryRoot -WorkingDirectory $currentDirectory
    $root = if (-not [string]::IsNullOrWhiteSpace($RepositoryRoot)) { $RepositoryRoot } else { $gitRoot }
    if ([string]::IsNullOrWhiteSpace($root)) {
        throw 'Repository root could not be resolved from Git or -RepositoryRoot.'
    }

    $context = [ordered]@{
        repository_root = ConvertTo-CodexRegistrationPath -Value $root
        resolved_paths = [ordered]@{}
        replacements = [ordered]@{}
        tokens = [ordered]@{}
    }
    foreach ($token in $script:CodexArtifactSanitizerTokenPriority.Keys) {
        $context.tokens[$token] = $token
        $context.resolved_paths[$token] = @()
    }

    foreach ($candidate in @($gitRoot, $root)) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<REPO_ROOT>'
    }

    if (Test-CodexGitRootWorkingDirectory -WorkingDirectory $currentDirectory) {
        Add-CodexSanitizerPath -Context $context -Value $currentDirectory -Token '<REPO_ROOT>'
    }
    foreach ($alias in @($RepositoryAlias)) {
        Add-CodexSanitizerPath -Context $context -Value $alias -Token '<REPO_ROOT>'
    }

    foreach ($candidate in @($env:USERPROFILE, $env:HOME)) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<USER_HOME>'
    }

    foreach ($candidate in @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, $AndroidSdkRoot)) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<ANDROID_SDK_ROOT>'
    }
    foreach ($candidate in @($env:JAVA_HOME, $JavaHome)) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<JAVA_HOME>'
    }

    foreach ($candidate in @($VirtualStoreDir, $env:npm_config_virtual_store_dir, (Get-CodexPnpmVirtualStoreDir))) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<PNPM_VIRTUAL_STORE>'
    }

    foreach ($candidate in @($MaestroHome, $env:MAESTRO_HOME)) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<MAESTRO_HOME>'
    }
    $maestroCommand = Get-Command maestro -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandType -eq 'Application' } |
        Select-Object -First 1
    if ($maestroCommand) {
        $maestroCommandHome = Get-CodexMaestroHomeFromExecutable -ExecutablePath $maestroCommand.Source
        Add-CodexSanitizerPath -Context $context -Value $maestroCommandHome -Token '<MAESTRO_HOME>'
    }

    foreach ($candidate in @($env:TEMP, $env:TMP, $env:TMPDIR, [System.IO.Path]::GetTempPath())) {
        Add-CodexSanitizerPath -Context $context -Value $candidate -Token '<TEMP_ROOT>'
    }
    return $context
}

function Get-CodexArtifactReplacements {
    param([Parameter(Mandatory = $true)]$Context)

    return @(
        $Context.replacements.Values |
            Sort-Object -Property @(
                @{ Expression = { $_.Source.Length }; Descending = $true },
                @{ Expression = { $_.Priority }; Descending = $false },
                @{ Expression = { $_.Token }; Descending = $false }
            )
    )
}

function New-CodexArtifactSanitizerStats {
    $byToken = [ordered]@{}
    foreach ($token in $script:CodexArtifactSanitizerTokenPriority.Keys) {
        $byToken[$token] = 0
    }
    return [ordered]@{
        files_scanned = 0
        files_changed = 0
        replacements_total = 0
        replacements_by_token = $byToken
        residual_findings = 0
    }
}

function ConvertTo-CodexSanitizedText {
    param(
        [AllowNull()][string]$Text,
        [Parameter(Mandatory = $true)]$Context,
        [System.Collections.IDictionary]$Stats
    )

    if ($null -eq $Text) {
        return $null
    }

    $result = $Text
    foreach ($replacement in @(Get-CodexArtifactReplacements -Context $Context)) {
        $options = [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
        if ($replacement.CaseInsensitive) {
            $options = $options -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        }

        $escapedSource = [System.Text.RegularExpressions.Regex]::Escape([string]$replacement.Source)
        $hasTrailingSeparator = [string]$replacement.Source -match '[\\/]$'
        $boundary = if ($hasTrailingSeparator) { '' } else { '(?=$|[\\/\s"''<>`),;:?#|\]])' }
        $pattern = $escapedSource + $boundary
        $matchCount = [System.Text.RegularExpressions.Regex]::Matches($result, $pattern, $options).Count
        if ($matchCount -eq 0) {
            continue
        }

        $result = [System.Text.RegularExpressions.Regex]::Replace(
            $result,
            $pattern,
            [string]$replacement.Replacement,
            $options
        )

        if ($null -ne $Stats) {
            $Stats.replacements_total = [int]$Stats.replacements_total + $matchCount
            $Stats.replacements_by_token[$replacement.Token] = [int]$Stats.replacements_by_token[$replacement.Token] + $matchCount
        }
    }

    return $result
}

function ConvertTo-CodexSanitizedValue {
    param(
        [AllowNull()]$Value,
        [Parameter(Mandatory = $true)]$Context,
        [System.Collections.IDictionary]$Stats
    )

    if ($null -eq $Value) {
        return $null
    }
    if ($Value -is [string]) {
        return ConvertTo-CodexSanitizedText -Text ([string]$Value) -Context $Context -Stats $Stats
    }
    if ($Value -is [System.Collections.IDictionary]) {
        $result = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $result[$key] = ConvertTo-CodexSanitizedValue -Value $Value[$key] -Context $Context -Stats $Stats
        }
        return $result
    }
    if ($Value -is [System.Management.Automation.PSCustomObject]) {
        $result = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $result[$property.Name] = ConvertTo-CodexSanitizedValue -Value $property.Value -Context $Context -Stats $Stats
        }
        return $result
    }
    if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
        $items = New-Object System.Collections.Generic.List[object]
        foreach ($item in $Value) {
            $items.Add((ConvertTo-CodexSanitizedValue -Value $item -Context $Context -Stats $Stats))
        }
        return [object[]]$items.ToArray()
    }

    return $Value
}

function Split-CodexArtifactLines {
    param([AllowNull()][string]$Text)

    if ($null -eq $Text) {
        return @()
    }

    return @([System.Text.RegularExpressions.Regex]::Split(
            $Text,
            "\r\n|\n|\r"
        ))
}

function ConvertTo-CodexRelativeArtifactPath {
    param(
        [AllowNull()][string]$FilePath,
        [AllowNull()][string]$RepositoryRoot
    )

    if ([string]::IsNullOrWhiteSpace($FilePath)) {
        return '<unknown-file>'
    }

    $fullPath = try { [System.IO.Path]::GetFullPath($FilePath) } catch { $null }
    $fullRoot = try { [System.IO.Path]::GetFullPath($RepositoryRoot) } catch { $null }
    if ([string]::IsNullOrWhiteSpace($fullPath) -or [string]::IsNullOrWhiteSpace($fullRoot)) {
        return '<outside-repository>'
    }

    $comparison = Get-CodexPathComparison -Source $fullRoot
    $normalizedPath = $fullPath.Replace('\', '/')
    $root = (Remove-CodexTrailingSeparators -Value $fullRoot).Replace('\', '/').TrimEnd('/')
    if ([string]::Equals($normalizedPath, $root, $comparison)) {
        return '.'
    }

    $prefix = $root + '/'
    if ($normalizedPath.StartsWith($prefix, $comparison)) {
        return $normalizedPath.Substring($prefix.Length)
    }

    return '<outside-repository>/' + [System.IO.Path]::GetFileName($fullPath)
}

function Get-CodexResidualMaskedMatch {
    param(
        [Parameter(Mandatory = $true)][string]$Match,
        [Parameter(Mandatory = $true)][string]$PatternType
    )

    switch ($PatternType) {
        'Windows file URI' {
            if ($Match -match '(?i)^(file:///[A-Z]:[\\/](?:Users|Documents%20and%20Settings)[\\/])[^\\/\s"<>?#]+') {
                return ($Match -replace '(?i)^(file:///[A-Z]:[\\/](?:Users|Documents%20and%20Settings)[\\/])[^\\/\s"<>?#]+', '$1<redacted>')
            }
            return '<local-path-redacted>'
        }
        'WSL user path' {
            return ($Match -replace '(?i)(/mnt/[a-z]/Users/)[^/\s"<>]+', '$1<redacted>')
        }
        'Windows user path' {
            return ($Match -replace '(?i)([A-Z]:[\\/](?:Users|Documents and Settings)[\\/])[^\\/\s"<>]+', '$1<redacted>')
        }
        'Windows absolute path' { return '<local-path-redacted>' }
        'Windows UNC path' { return '<local-path-redacted>' }
        'macOS user path' {
            return ($Match -replace '(/Users/)[^/\s"<>]+', '$1<redacted>')
        }
        'Linux user path' {
            return ($Match -replace '(/home/)[^/\s"<>]+', '$1<redacted>')
        }
        default {
            return '<redacted>'
        }
    }
}

function Get-CodexResidualMaskedLine {
    param([Parameter(Mandatory = $true)][string]$Line)

    $masked = $Line
    foreach ($pattern in $script:CodexArtifactResidualPatterns) {
        $patternMatches = @([System.Text.RegularExpressions.Regex]::Matches($masked, [string]$pattern.regex))
        for ($index = $patternMatches.Count - 1; $index -ge 0; $index--) {
            $match = $patternMatches[$index]
            $replacement = Get-CodexResidualMaskedMatch -Match $match.Value -PatternType ([string]$pattern.type)
            $masked = $masked.Substring(0, $match.Index) + $replacement + $masked.Substring($match.Index + $match.Length)
        }
    }
    return $masked
}

function Test-CodexResidualPathLine {
    param([Parameter(Mandatory = $true)][string]$Line)

    foreach ($pattern in $script:CodexArtifactResidualPatterns) {
        if ([System.Text.RegularExpressions.Regex]::IsMatch($Line, [string]$pattern.regex)) {
            return $true
        }
    }
    return $false
}

function ConvertTo-CodexBoundedFindingContext {
    param(
        [AllowNull()][string]$Line,
        [Parameter(Mandatory = $true)]$Context,
        [int]$MaximumLength = 160
    )

    if ([string]::IsNullOrWhiteSpace($Line)) {
        return '<empty-line>'
    }

    $sanitized = ConvertTo-CodexSanitizedText -Text $Line -Context $Context
    if (Test-CodexResidualPathLine -Line $sanitized) {
        return '<local-path-redacted>'
    }

    $masked = Get-CodexResidualMaskedLine -Line $sanitized
    $masked = [System.Text.RegularExpressions.Regex]::Replace($masked, '\s+', ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($masked)) {
        return '<empty-line>'
    }
    if ($masked.Length -gt $MaximumLength) {
        if ($MaximumLength -le 3) {
            return $masked.Substring(0, $MaximumLength)
        }
        return $masked.Substring(0, $MaximumLength - 3) + '...'
    }
    return $masked
}

function Find-CodexArtifactResidualPath {
    param(
        [AllowNull()][string]$Text,
        [Parameter(Mandatory = $true)][string]$FilePath,
        $Context
    )

    if ($null -eq $Text) {
        return @()
    }

    $findings = New-Object System.Collections.Generic.List[object]
    $lines = @(Split-CodexArtifactLines -Text $Text)
    for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex++) {
        $line = $lines[$lineIndex].TrimEnd("`r")
        $occupied = New-Object System.Collections.Generic.List[object]
        foreach ($pattern in $script:CodexArtifactResidualPatterns) {
            foreach ($match in [System.Text.RegularExpressions.Regex]::Matches($line, [string]$pattern.regex)) {
                $overlap = $false
                foreach ($existing in $occupied) {
                    if ($match.Index -lt $existing.End -and $existing.Index -lt ($match.Index + $match.Length)) {
                        $overlap = $true
                        break
                    }
                }
                if ($overlap) {
                    continue
                }

                $occupied.Add([pscustomobject]@{ Index = $match.Index; End = $match.Index + $match.Length })
                $findingContext = if ($null -ne $Context) {
                    ConvertTo-CodexBoundedFindingContext -Line $line -Context $Context -MaximumLength $script:CodexFindingContextMaximumLength
                }
                else {
                    '<local-path-redacted>'
                }
                $findings.Add([pscustomobject]@{
                        file_path = $FilePath
                        line_number = $lineIndex + 1
                        pattern_type = [string]$pattern.type
                        content = '<local-path-redacted>'
                        context = $findingContext
                    })
            }
        }
    }

    return [object[]]$findings.ToArray()
}

function ConvertTo-CodexFindingOutputText {
    param(
        [AllowNull()][string]$Text,
        [Parameter(Mandatory = $true)]$Context,
        [int]$MaximumLength = 300
    )

    if ($null -eq $Text) {
        return ''
    }

    $sanitized = ConvertTo-CodexSanitizedText -Text $Text -Context $Context
    $masked = ((@(Split-CodexArtifactLines -Text $sanitized) | ForEach-Object {
                $line = [string]$_
                ConvertTo-CodexBoundedFindingContext -Line $line -Context $Context -MaximumLength ([Math]::Min($MaximumLength, $script:CodexFindingContextMaximumLength))
            }) -join "`n")
    if ($masked.Length -gt $MaximumLength) {
        if ($MaximumLength -le 3) {
            return $masked.Substring(0, $MaximumLength)
        }
        return $masked.Substring(0, $MaximumLength - 3) + '...'
    }
    return $masked
}

function Get-CodexArtifactTextFiles {
    param(
        [Parameter(Mandatory = $true)][string[]]$Path,
        [switch]$ChangedOnly,
        [string]$RepositoryRoot
    )

    $files = [ordered]@{}
    foreach ($rawPath in @($Path)) {
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            continue
        }

        $fullPath = if ([System.IO.Path]::IsPathRooted($rawPath) -or $rawPath -match '^[A-Za-z]:[\\/]') {
            [System.IO.Path]::GetFullPath($rawPath)
        }
        else {
            [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $rawPath))
        }

        if (-not (Test-Path -LiteralPath $fullPath)) {
            continue
        }

        $item = Get-Item -LiteralPath $fullPath -Force
        $candidates = if ($item.PSIsContainer) {
            Get-ChildItem -LiteralPath $fullPath -Recurse -File -Force
        }
        else {
            @($item)
        }

        foreach ($candidate in @($candidates)) {
            $extension = [System.IO.Path]::GetExtension($candidate.Name).ToLowerInvariant()
            if ($script:CodexArtifactSanitizerExtensions -notcontains $extension) {
                continue
            }
            $key = [System.IO.Path]::GetFullPath($candidate.FullName)
            if (Test-CodexWindowsPath -Value $key) {
                $key = $key.ToLowerInvariant()
            }
            $files[$key] = [System.IO.Path]::GetFullPath($candidate.FullName)
        }
    }

    if ($ChangedOnly) {
        if ([string]::IsNullOrWhiteSpace($RepositoryRoot) -or -not (Test-CodexGitRootWorkingDirectory -WorkingDirectory $RepositoryRoot)) {
            throw 'ChangedOnly requires Git and a valid repository root.'
        }

        $git = Get-Command git -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandType -eq 'Application' } |
            Select-Object -First 1
        if (-not $git) {
            throw 'ChangedOnly requires Git and a valid repository root.'
        }

        $changed = New-Object System.Collections.Generic.List[string]
        $gitCommands = @(
            @('diff', '--name-only', 'HEAD'),
            @('ls-files', '--others', '--exclude-standard'),
            @('diff', '--name-only', '--cached')
        )
        $previousNativeErr = $null
        $hasNativeErrPref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        if ($hasNativeErrPref) {
            $previousNativeErr = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
        }
        try {
            foreach ($gitArgs in $gitCommands) {
                $gitOutput = @(& $git.Source -C $RepositoryRoot @gitArgs 2>&1)
                $gitExitCode = $LASTEXITCODE
                $gitOutput = @($gitOutput | Where-Object {
                        $_ -isnot [System.Management.Automation.ErrorRecord] -and
                        ([string]$_ -notmatch '^(?:git\.exe : )?warning:|LF will be replaced|next time Git touches it')
                    })
                if ($gitExitCode -ne 0) {
                    throw 'ChangedOnly could not resolve changed paths from Git.'
                }
                foreach ($changedPath in $gitOutput) {
                    $relativePath = ([string]$changedPath).Trim()
                    if (-not [string]::IsNullOrWhiteSpace($relativePath)) {
                        $changed.Add([System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot $relativePath)))
                    }
                }
            }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
            if ($hasNativeErrPref) {
                $PSNativeCommandUseErrorActionPreference = $previousNativeErr
            }
        }

        $changedKeys = @{}
        foreach ($changedPath in $changed) {
            $key = [System.IO.Path]::GetFullPath([string]$changedPath)
            if (Test-CodexWindowsPath -Value $key) {
                $key = $key.ToLowerInvariant()
            }
            $changedKeys[$key] = $true
        }
        foreach ($key in @($files.Keys)) {
            $comparisonKey = [string]$key
            if (-not $changedKeys.ContainsKey($comparisonKey)) {
                $files.Remove($key)
            }
        }
    }

    return @($files.Values | Sort-Object)
}

function Read-CodexArtifactText {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $offset = 0
    $hasBom = $bytes.Length -ge 3 -and
        $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    if ($hasBom) {
        $offset = 3
    }

    $utf8 = [System.Text.UTF8Encoding]::new($false, $true)
    $text = if ($bytes.Length -eq $offset) { '' } else { $utf8.GetString($bytes, $offset, $bytes.Length - $offset) }
    return [pscustomobject]@{
        text = $text
        has_bom = $hasBom
    }
}

function Move-CodexArtifactWithBackup {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [scriptblock]$MoveOperation
    )

    $directory = Split-Path -Parent $DestinationPath
    $backupPath = $null
    $moveSucceeded = $false
    if ($null -eq $MoveOperation) {
        $MoveOperation = {
            param($source, $destination)
            [System.IO.File]::Move($source, $destination)
        }
    }

    try {
        do {
            $backupPath = Join-Path $directory ('.codex-artifact-sanitizer-backup-' + [System.IO.Path]::GetRandomFileName())
        } while ([System.IO.File]::Exists($backupPath))

        [System.IO.File]::Copy($DestinationPath, $backupPath, $false)
        try {
            [System.IO.File]::Delete($DestinationPath)
            & $MoveOperation $SourcePath $DestinationPath
            $moveSucceeded = $true
        }
        catch {
            $moveError = $_.Exception
            try {
                if (-not [System.IO.File]::Exists($DestinationPath)) {
                    [System.IO.File]::Copy($backupPath, $DestinationPath, $false)
                }
            }
            catch {
                $backupName = [System.IO.Path]::GetFileName($backupPath)
                Write-Warning ('Could not restore the original artifact; backup retained as ' + $backupName + '.')
                throw [System.IO.IOException]::new('Atomic artifact replacement failed and original restoration failed.', $_.Exception)
            }
            throw $moveError
        }
    }
    finally {
        if ($moveSucceeded -and $backupPath -and [System.IO.File]::Exists($backupPath)) {
            try {
                [System.IO.File]::Delete($backupPath)
            }
            catch {
                $backupName = [System.IO.Path]::GetFileName($backupPath)
                Write-Warning ('Sanitized artifact was written, but backup cleanup failed: ' + $backupName + '.')
            }
        }
    }
}

function Write-CodexArtifactTextAtomic {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text
    )

    $directory = Split-Path -Parent $Path
    $temporaryPath = Join-Path $directory ('.codex-artifact-sanitizer-' + [System.IO.Path]::GetRandomFileName())
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    try {
        [System.IO.File]::WriteAllText($temporaryPath, $Text, $utf8)
        if ([System.IO.File]::Exists($Path)) {
            try {
                [System.IO.File]::Replace($temporaryPath, $Path, $null)
            }
            catch {
                Move-CodexArtifactWithBackup -SourcePath $temporaryPath -DestinationPath $Path
            }
        }
        else {
            [System.IO.File]::Move($temporaryPath, $Path)
        }
    }
    finally {
        if ([System.IO.File]::Exists($temporaryPath)) {
            try {
                [System.IO.File]::Delete($temporaryPath)
            }
            catch {
                Write-Warning 'Could not clean up the temporary artifact; the original error is preserved.'
            }
        }
    }
}

function Add-CodexArtifactTextLine {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Line
    )

    $existing = ''
    $hasExisting = [System.IO.File]::Exists($Path)
    if ($hasExisting) {
        $existing = [string](Read-CodexArtifactText -Path $Path).text
    }

    $crlf = ([char]0x0D).ToString() + ([char]0x0A).ToString()
    $lf = ([char]0x0A).ToString()
    $lineEnding = if ($existing.Contains($crlf)) { $crlf } else { $lf }
    $separator = if (
        [string]::IsNullOrEmpty($existing) -or
        $existing.EndsWith($crlf) -or
        $existing.EndsWith($lf)
    ) { '' } else { $lineEnding }

    $parent = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Write-CodexArtifactTextAtomic -Path $Path -Text ($existing + $separator + $Line + $lineEnding)
}
