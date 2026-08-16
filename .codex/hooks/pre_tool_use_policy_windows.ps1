[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail-Launcher {
    param([Parameter(Mandatory = $true)][string]$Message)
    [Console]::Error.WriteLine("PreToolUse Windows launcher: $Message")
    exit 2
}

try {
    $cwd = (Get-Location).Path
    $rootOutput = @(& git -C $cwd rev-parse --show-toplevel 2>$null)
    $gitExit = $LASTEXITCODE
    if ($gitExit -ne 0 -or $rootOutput.Count -eq 0 -or [string]::IsNullOrWhiteSpace([string]$rootOutput[0])) {
        Fail-Launcher "unable to resolve repository root from cwd"
    }

    $repoRoot = [System.IO.Path]::GetFullPath(([string]$rootOutput[0]).Trim())
    $hookPath = Join-Path $repoRoot ".codex\hooks\pre_tool_use_policy.mjs"
    if (-not (Test-Path -LiteralPath $hookPath -PathType Leaf)) {
        Fail-Launcher "Node Hook file not found: $hookPath"
    }

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $nodeCommand -or [string]::IsNullOrWhiteSpace($nodeCommand.Source)) {
        Fail-Launcher "Node executable was not found on PATH"
    }

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $nodeCommand.Source
    $startInfo.Arguments = '"' + $hookPath + '"'
    $startInfo.WorkingDirectory = $cwd
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void]$process.Start()

    [Console]::OpenStandardInput().CopyTo($process.StandardInput.BaseStream)
    $process.StandardInput.Close()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if (-not [string]::IsNullOrEmpty($stdout)) {
        [Console]::Out.Write($stdout)
    }
    if (-not [string]::IsNullOrEmpty($stderr)) {
        [Console]::Error.Write($stderr)
    }

    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 2) {
        exit $process.ExitCode
    }

    Fail-Launcher "Node Hook exited unexpectedly with code $($process.ExitCode)"
}
catch {
    Fail-Launcher $_.Exception.Message
}

