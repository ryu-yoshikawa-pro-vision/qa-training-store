[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-ObservationError {
    param([string]$Message)
    [Console]::Error.WriteLine($Message)
    exit 0
}

function Normalize-EnumValue {
    param(
        [AllowNull()][string]$Value,
        [Parameter(Mandatory = $true)][string[]]$Allowed,
        [Parameter(Mandatory = $true)][string]$Default,
        [Parameter(Mandatory = $true)][string]$Fallback
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return [pscustomobject]@{
            Value = $Default
            Original = $null
        }
    }

    if ($Allowed -contains $Value) {
        return [pscustomobject]@{
            Value = $Value
            Original = $null
        }
    }

    return [pscustomobject]@{
        Value = $Fallback
        Original = $Value
    }
}

function Get-PayloadString {
    param(
        [AllowNull()][object]$Payload,
        [Parameter(Mandatory = $true)][string[]]$Names
    )

    if ($null -eq $Payload) {
        return $null
    }

    foreach ($name in $Names) {
        $property = $Payload.PSObject.Properties[$name]
        if ($null -ne $property -and $property.Value -is [string] -and -not [string]::IsNullOrWhiteSpace($property.Value)) {
            return $property.Value
        }
    }
    return $null
}

function Add-Utf8NoBomLine {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Line
    )

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::AppendAllText($Path, $Line + [Environment]::NewLine, $utf8NoBom)
}

try {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $rawHookInput = [Console]::In.ReadToEnd()
    $hookInput = $null
    if (-not [string]::IsNullOrWhiteSpace($rawHookInput)) {
        try { $hookInput = $rawHookInput | ConvertFrom-Json } catch { $hookInput = $null }
    }

    $payloadEvent = Get-PayloadString -Payload $hookInput -Names @("hook_event_name", "event")
    $payloadSource = Get-PayloadString -Payload $hookInput -Names @("source")
    $payloadCwd = Get-PayloadString -Payload $hookInput -Names @("cwd")
    $payloadRunId = Get-PayloadString -Payload $hookInput -Names @("run_id")
    $observedAgentType = Get-PayloadString -Payload $hookInput -Names @("agent_type", "agentType")
    $observedAgentId = Get-PayloadString -Payload $hookInput -Names @("agent_id", "agentId")
    $observedModel = Get-PayloadString -Payload $hookInput -Names @("model")
    $observedReasoningEffort = Get-PayloadString -Payload $hookInput -Names @("reasoning_effort", "model_reasoning_effort")
    $observedPermissionMode = Get-PayloadString -Payload $hookInput -Names @("permission_mode", "permissionMode")
    $observedSessionId = Get-PayloadString -Payload $hookInput -Names @("session_id", "sessionId")
    $observedTurnId = Get-PayloadString -Payload $hookInput -Names @("turn_id", "turnId")
    $payloadToolName = Get-PayloadString -Payload $hookInput -Names @("tool_name", "tool")
    $payloadToolOperation = Get-PayloadString -Payload $hookInput -Names @("tool_operation", "operation")
    $payloadToolTarget = Get-PayloadString -Payload $hookInput -Names @("tool_target", "target")
    $observationLog = if ([string]::IsNullOrWhiteSpace($env:CODEX_OBSERVATION_LOG)) {
        Join-Path $repoRoot ".codex\observations\hooks.jsonl"
    }
    else {
        $env:CODEX_OBSERVATION_LOG
    }

    $normalizedEvent = Normalize-EnumValue `
        -Value $(if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_EVENT)) { $payloadEvent } else { $env:CODEX_HOOK_EVENT }) `
        -Allowed @("PreToolUse", "PostToolUse", "SubagentStart", "SubagentStop", "Stop", "WrapperStart", "WrapperStop", "SafetyBlocked", "ObservationError") `
        -Default "ObservationError" `
        -Fallback "ObservationError"

    $normalizedSource = Normalize-EnumValue `
        -Value $(if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_SOURCE)) { $payloadSource } else { $env:CODEX_HOOK_SOURCE }) `
        -Allowed @("codex_hook", "codex_task", "codex_safe", "subagent", "manual", "unknown") `
        -Default "codex_hook" `
        -Fallback "unknown"

    $normalizedSeverity = Normalize-EnumValue `
        -Value $env:CODEX_HOOK_SEVERITY `
        -Allowed @("debug", "info", "warning", "error", "critical") `
        -Default "info" `
        -Fallback "warning"

    $inputSummary = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_INPUT_SUMMARY)) {
        $null
    }
    else {
        $env:CODEX_HOOK_INPUT_SUMMARY
    }

    $toolName = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_TOOL_NAME)) { $payloadToolName } else { $env:CODEX_HOOK_TOOL_NAME }
    $toolOperation = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_TOOL_OPERATION)) { $payloadToolOperation } else { $env:CODEX_HOOK_TOOL_OPERATION }
    $toolTarget = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_TOOL_TARGET)) { $payloadToolTarget } else { $env:CODEX_HOOK_TOOL_TARGET }
    $tool = $null
    if (-not [string]::IsNullOrWhiteSpace($toolName) -or
        -not [string]::IsNullOrWhiteSpace($toolOperation) -or
        -not [string]::IsNullOrWhiteSpace($toolTarget)) {
        $tool = [ordered]@{
            name = if ([string]::IsNullOrWhiteSpace($toolName)) { $null } else { $toolName }
            operation = if ([string]::IsNullOrWhiteSpace($toolOperation)) { $null } else { $toolOperation }
            target = if ([string]::IsNullOrWhiteSpace($toolTarget)) { $null } else { $toolTarget }
        }
    }

    $cwdValue = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_CWD)) {
        if ([string]::IsNullOrWhiteSpace($payloadCwd)) { try { (Get-Location).Path } catch { $null } } else { $payloadCwd }
    }
    else {
        $env:CODEX_HOOK_CWD
    }

    $metadata = [ordered]@{
        hook = "observe.ps1"
    }
    if (-not [string]::IsNullOrWhiteSpace($normalizedEvent.Original)) {
        $metadata.original_event = $normalizedEvent.Original
    }
    if (-not [string]::IsNullOrWhiteSpace($normalizedSource.Original)) {
        $metadata.original_source = $normalizedSource.Original
    }
    if (-not [string]::IsNullOrWhiteSpace($normalizedSeverity.Original)) {
        $metadata.original_severity = $normalizedSeverity.Original
    }

    $payload = [ordered]@{
        schema_version = 1
        event_id = [guid]::NewGuid().ToString("N")
        run_id = if ([string]::IsNullOrWhiteSpace($env:CODEX_RUN_ID)) { $payloadRunId } else { $env:CODEX_RUN_ID }
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        source = $normalizedSource.Value
        event = $normalizedEvent.Value
        severity = $normalizedSeverity.Value
        blocking = $false
        tool = $tool
        cwd = $cwdValue
        input_summary = $inputSummary
        decision = [ordered]@{
            action = "observe"
            reason = if ([string]::IsNullOrWhiteSpace($env:CODEX_HOOK_DECISION_REASON)) {
                "optional observation hook recorded the event"
            }
            else {
                $env:CODEX_HOOK_DECISION_REASON
            }
        }
        evidence = @()
        metadata = $metadata
    }

    if (-not [string]::IsNullOrWhiteSpace($observedAgentType)) { $payload.agent_type = $observedAgentType }
    if (-not [string]::IsNullOrWhiteSpace($observedAgentId)) { $payload.agent_id = $observedAgentId }
    if (-not [string]::IsNullOrWhiteSpace($observedModel)) { $payload.model = $observedModel }
    if (-not [string]::IsNullOrWhiteSpace($observedReasoningEffort)) { $payload.reasoning_effort = $observedReasoningEffort }
    if (-not [string]::IsNullOrWhiteSpace($observedPermissionMode)) { $payload.permission_mode = $observedPermissionMode }
    if (-not [string]::IsNullOrWhiteSpace($observedSessionId)) { $payload.session_id = $observedSessionId }
    if (-not [string]::IsNullOrWhiteSpace($observedTurnId)) { $payload.turn_id = $observedTurnId }

    $parent = Split-Path -Parent $observationLog
    if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $jsonLine = $payload | ConvertTo-Json -Compress -Depth 8
    Add-Utf8NoBomLine -Path $observationLog -Line $jsonLine
    exit 0
}
catch {
    Write-ObservationError "Observation hook: failed to append event"
}
