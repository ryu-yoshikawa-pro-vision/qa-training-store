[CmdletBinding()]
param(
    [switch]$StrictHarness
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$passCount = 0
$failCount = 0
$skipCount = 0

function Add-Pass([string]$Name) {
    Write-Host "PASS: $Name"
    $script:passCount++
}

function Add-Fail([string]$Name, [string]$Message) {
    Write-Host "FAIL: $Name"
    if ($Message) {
        Write-Host $Message
    }
    $script:failCount++
}

function Add-Skip([string]$Name) {
    Write-Host "SKIP: $Name"
    $script:skipCount++
}

function Invoke-Check {
    param(
        [string]$Name,
        [scriptblock]$Script
    )

    try {
        & $Script
        Add-Pass $Name
    }
    catch {
        Add-Fail $Name $_.Exception.Message
    }
}

function Get-Decision([string]$Raw) {
    $json = $Raw | ConvertFrom-Json
    $decisionProperty = $json.PSObject.Properties['decision']
    if ($null -ne $decisionProperty -and -not [string]::IsNullOrWhiteSpace([string]$decisionProperty.Value)) {
        return [string]$decisionProperty.Value
    }

    $matchedRulesProperty = $json.PSObject.Properties['matchedRules']
    if ($null -ne $matchedRulesProperty -and $null -ne $matchedRulesProperty.Value) {
        $matchedRules = @($matchedRulesProperty.Value)
        if ($matchedRules.Count -eq 0) {
            return 'allow'
        }
    }

    throw "Execpolicy output is missing an explicit decision and does not prove matchedRules is empty"
}

function Test-TemplateContract {
    $required = @(
        "AGENTS.md",
        "PLANS.md",
        "CODE_REVIEW.md",
        "MIGRATION.md",
        "codex-project.toml",
        ".codex/config.toml",
        ".codex/requirements.toml",
        ".codex/agents/code_researcher.toml",
        ".codex/agents/implementation_researcher.toml",
        ".codex/agents/test_investigator.toml",
        ".codex/agents/implementation_worker.toml",
        ".codex/agents/quality_gate_runner.toml",
        ".codex/hooks/pre_tool_use_policy.mjs",
        ".codex/hooks/pre_tool_use_policy_windows.ps1",
        ".codex/hooks/log_event.mjs",
        ".codex/templates/PLAN.md",
        ".codex/templates/REPORT.md",
        ".codex/templates/RUN_MANIFEST.json",
        ".codex/templates/evaluation.schema.json",
        ".codex/rules/10-readonly-allow.rules",
        ".codex/rules-auto-net/10-auto-net-allow.rules",
        ".codex/rules-auto-net/20-auto-net-risky-forbidden.rules",
        ".codex/rules-auto-net/30-auto-net-forbidden.rules",
        "scripts/codex-task.ps1",
        "scripts/codex-task.sh",
        "scripts/codex-sandbox.ps1",
        "scripts/codex-sandbox.sh",
        "scripts/new-run.ps1",
        "scripts/new-run.sh",
        "scripts/cleanup-runs.ps1",
        "scripts/cleanup-runs.sh",
        "scripts/init-project.ps1",
        "scripts/init-project.sh",
        "scripts/validate-output-schema.py",
        ".agents/skills/feature-plan/references/planning-workflow.md",
        ".agents/skills/code-review/references/review-workflow.md",
        "docs/reference/codex-safety-harness.md",
        "docs/reference/codex-implementation-harness.md",
        "docs/guides/consumer-update.md"
    )
    foreach ($path in $required) {
        if (-not (Test-Path $path)) {
            throw "Missing required path: $path"
        }
    }

    $agents = Get-Content -Raw AGENTS.md
    $plans = Get-Content -Raw PLANS.md
    $review = Get-Content -Raw CODE_REVIEW.md
    if ($agents -notmatch [regex]::Escape(".agents/skills/feature-plan/SKILL.md")) { throw "AGENTS.md missing feature-plan skill reference" }
    if ($agents -notmatch [regex]::Escape(".agents/skills/code-review/SKILL.md")) { throw "AGENTS.md missing code-review skill reference" }
    if ($agents -notmatch [regex]::Escape("docs/reference/codex-safety-harness.md")) { throw "AGENTS.md missing safety harness reference" }
    if ($agents -notmatch [regex]::Escape("docs/reference/codex-implementation-harness.md")) { throw "AGENTS.md missing implementation harness reference" }
    if ($agents -notmatch [regex]::Escape("scripts/new-run.sh")) { throw "AGENTS.md missing bash new-run reference" }
    if ($agents -notmatch [regex]::Escape("scripts/new-run.ps1")) { throw "AGENTS.md missing PowerShell new-run reference" }
    if ($agents -notmatch [regex]::Escape("Report file")) { throw "AGENTS.md missing report policy" }
    if ($agents -notmatch [regex]::Escape("command-based deletion")) { throw "AGENTS.md missing deletion policy" }
    if ($agents -notmatch [regex]::Escape("quality_gate_runner")) { throw "AGENTS.md missing quality_gate_runner routing" }
    if ($agents -notmatch [regex]::Escape("Parent-defined validation")) { throw "AGENTS.md missing Parent-defined validation routing" }
    if ($agents -notmatch [regex]::Escape("Codex native delegation")) { throw "AGENTS.md missing native delegation policy" }
    if ($agents -notmatch [regex]::Escape("No child subagent delegation")) { throw "AGENTS.md missing recursive delegation prohibition" }
    foreach ($researcher in @("code_researcher", "implementation_researcher", "test_investigator")) {
        if ($agents -notmatch [regex]::Escape($researcher)) { throw "AGENTS.md missing $researcher routing" }
    }
    foreach ($agentPath in @(
        ".codex/agents/code_researcher.toml",
        ".codex/agents/implementation_researcher.toml",
        ".codex/agents/test_investigator.toml",
        ".codex/agents/implementation_worker.toml",
        ".codex/agents/quality_gate_runner.toml"
    )) {
        $agentText = Get-Content -Raw $agentPath
        if ($agentText -match '(?m)^\s*model\s*=') { throw "$agentPath must inherit project model" }
        if ($agentText -match '(?m)^\s*model_reasoning_effort\s*=') { throw "$agentPath must inherit project reasoning effort" }
    }
    $qualityGate = Get-Content -Raw -Encoding UTF8 .codex/agents/quality_gate_runner.toml
    if ($qualityGate -notmatch [regex]::Escape('name = "quality_gate_runner"')) { throw "quality_gate_runner name mismatch" }
    if ($qualityGate -notmatch [regex]::Escape('sandbox_mode = "workspace-write"')) { throw "quality_gate_runner sandbox mismatch" }
    if ($qualityGate -notmatch [regex]::Escape("Parent-defined validation")) { throw "quality_gate_runner validation responsibility missing" }
    if ($qualityGate -notmatch [regex]::Escape("validation-only")) { throw "quality_gate_runner validation-only contract missing" }
    if ($qualityGate -notmatch [regex]::Escape("without modifying source, test, or documentation files")) { throw "quality_gate_runner source/test/docs boundary missing" }
    if ($qualityGate -notmatch [regex]::Escape("Git mutation")) { throw "quality_gate_runner Git mutation boundary missing" }
    if ($qualityGate -notmatch '\u8FFD\u52A0\u306E subagent \u3092\u8D77\u52D5\u3057\u306A\u3044') { throw "quality_gate_runner child delegation prohibition missing" }
    $worker = Get-Content -Raw .codex/agents/implementation_worker.toml
    if ($worker -notmatch [regex]::Escape('sandbox_mode = "workspace-write"')) { throw "implementation_worker sandbox mismatch" }
    if ($worker -notmatch [regex]::Escape("small, scoped code changes")) { throw "implementation_worker bounded plan missing" }
    if ($worker -notmatch [regex]::Escape("Git mutation")) { throw "implementation_worker Git mutation boundary missing" }
    if ($plans -notmatch [regex]::Escape(".agents/skills/feature-plan/SKILL.md")) { throw "PLANS.md missing feature-plan skill reference" }
    if ($plans -notmatch [regex]::Escape(".agents/skills/feature-plan/references/planning-workflow.md")) { throw "PLANS.md missing planning reference" }
    if ($plans -notmatch [regex]::Escape("docs/plans/TEMPLATE.md")) { throw "PLANS.md missing plan template reference" }
    if ($plans -notmatch [regex]::Escape("Current understanding")) { throw "PLANS.md missing Current understanding heading" }
    if ($plans -notmatch [regex]::Escape("Non-goals")) { throw "PLANS.md missing Non-goals heading" }
    if ($plans -notmatch [regex]::Escape("Validation plan")) { throw "PLANS.md missing Validation plan heading" }
    if ($plans -notmatch [regex]::Escape("Open questions")) { throw "PLANS.md missing Open questions heading" }
    if ($plans -notmatch [regex]::Escape("Ambiguity handling")) { throw "PLANS.md missing ambiguity handling guidance" }
    if ($plans -notmatch [regex]::Escape("mandatory-question")) { throw "PLANS.md missing mandatory question guidance" }
    if ($plans -notmatch [regex]::Escape("Blocking questions")) { throw "PLANS.md missing Blocking questions guidance" }
    if ($plans -notmatch [regex]::Escape("Assumptions allowed")) { throw "PLANS.md missing Assumptions allowed guidance" }
    if ($plans -notmatch [regex]::Escape("Follow-up notes")) { throw "PLANS.md missing Follow-up notes guidance" }
    if ($review -notmatch [regex]::Escape(".agents/skills/code-review/SKILL.md")) { throw "CODE_REVIEW.md missing code-review skill reference" }
    if ($review -notmatch [regex]::Escape(".agents/skills/code-review/references/review-workflow.md")) { throw "CODE_REVIEW.md missing review reference" }
    if ($review -notmatch [regex]::Escape("findings-first")) { throw "CODE_REVIEW.md missing findings-first guidance" }
    if ($review -notmatch [regex]::Escape("Why it matters")) { throw "CODE_REVIEW.md missing Why it matters field" }
    if ($review -notmatch [regex]::Escape("Suggested fix")) { throw "CODE_REVIEW.md missing Suggested fix field" }
    if ($review -notmatch [regex]::Escape("Verdict")) { throw "CODE_REVIEW.md missing Verdict field" }
    if ($review -notmatch [regex]::Escape("confidence")) { throw "CODE_REVIEW.md missing confidence field" }
    if ($review -notmatch [regex]::Escape("review-only")) { throw "CODE_REVIEW.md missing report suppression policy" }
    $planningRef = Get-Content -Raw .agents/skills/feature-plan/references/planning-workflow.md
    $reviewRef = Get-Content -Raw .agents/skills/code-review/references/review-workflow.md
    if ($planningRef -notmatch [regex]::Escape("repo mapping")) { throw "planning workflow missing repo mapping phase" }
    if ($planningRef -notmatch [regex]::Escape("Do not use")) { throw "planning workflow missing Do not use section" }
    if ($planningRef -notmatch [regex]::Escape("Main flow")) { throw "planning workflow missing Main flow section" }
    if ($planningRef -notmatch [regex]::Escape("Key abstractions")) { throw "planning workflow missing Key abstractions section" }
    if ($planningRef -notmatch [regex]::Escape("Safe change surface")) { throw "planning workflow missing Safe change surface" }
    if ($planningRef -notmatch [regex]::Escape("Validation candidates")) { throw "planning workflow missing validation candidates" }
    if ($planningRef -notmatch [regex]::Escape("Failure modes")) { throw "planning workflow missing Failure modes" }
    if ($planningRef -notmatch [regex]::Escape("Ambiguity handling")) { throw "planning workflow missing ambiguity handling guidance" }
    if ($planningRef -notmatch [regex]::Escape("mandatory-question")) { throw "planning workflow missing mandatory question guidance" }
    if ($planningRef -notmatch [regex]::Escape("Report file generation policy")) { throw "planning workflow missing report file generation policy" }
    if ($reviewRef -notmatch [regex]::Escape("diff triage")) { throw "review workflow missing diff triage phase" }
    if ($reviewRef -notmatch [regex]::Escape("Diff classification")) { throw "review workflow missing Diff classification" }
    if ($reviewRef -notmatch [regex]::Escape("High-risk areas")) { throw "review workflow missing High-risk areas" }
    if ($reviewRef -notmatch [regex]::Escape("Potential missing tests")) { throw "review workflow missing Potential missing tests" }
    if ($reviewRef -notmatch [regex]::Escape("Open questions")) { throw "review workflow missing Open questions guidance" }
    if ($reviewRef -notmatch [regex]::Escape("Failure modes")) { throw "review workflow missing Failure modes" }
    if ($reviewRef -notmatch [regex]::Escape("Report file generation policy")) { throw "review workflow missing report file generation policy" }
    $implementationHarness = Get-Content -Raw docs/reference/codex-implementation-harness.md
    if ($implementationHarness -notmatch [regex]::Escape("scripts/new-run.sh")) { throw "implementation harness doc missing bash new-run guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("scripts/new-run.ps1")) { throw "implementation harness doc missing PowerShell new-run guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("--strict-harness")) { throw "implementation harness doc missing strict verify guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("-StrictHarness")) { throw "implementation harness doc missing PowerShell strict verify guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("--allowed-dirs")) { throw "implementation harness doc missing allowed-dirs guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("--allowed-globs")) { throw "implementation harness doc missing allowed-globs guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("--expected-missing")) { throw "implementation harness doc missing expected-missing guidance" }
    if ($implementationHarness -notmatch [regex]::Escape("collect-run-artifacts")) { throw "implementation harness doc missing artifact collector guidance" }
    $newRunBash = Get-Content -Raw scripts/new-run.sh
    $newRunPowerShell = Get-Content -Raw scripts/new-run.ps1
    if ($newRunBash -notmatch [regex]::Escape("Existing run directories are never overwritten")) { throw "new-run.sh missing non-overwrite contract" }
    if ($newRunPowerShell -notmatch [regex]::Escape("Run directory already exists and will not be overwritten")) { throw "new-run.ps1 missing non-overwrite contract" }
    if (-not (Test-Path scripts/collect-run-artifacts.sh)) { throw "missing scripts/collect-run-artifacts.sh" }
    if (-not (Test-Path scripts/collect-run-artifacts.ps1)) { throw "missing scripts/collect-run-artifacts.ps1" }
    if (-not (Test-Path scripts/collect-run-artifacts.py)) { throw "missing scripts/collect-run-artifacts.py" }
    $changeScope = Get-Content -Raw docs/reference/change-scope-policy.md
    if ($changeScope -notmatch [regex]::Escape("allowed_dirs")) { throw "change-scope doc missing allowed_dirs guidance" }
    if ($changeScope -notmatch [regex]::Escape("allowed_globs")) { throw "change-scope doc missing allowed_globs guidance" }
    if ($changeScope -notmatch [regex]::Escape("expected_missing")) { throw "change-scope doc missing expected_missing guidance" }
    if ($changeScope -notmatch [regex]::Escape("must_be_subset_of_allowed_scope")) { throw "change-scope doc missing allowed scope subset contract" }
    if ($changeScope -notmatch [regex]::Escape("--record-run-manifest")) { throw "change-scope doc missing record-run-manifest guidance" }
    $runArtifacts = Get-Content -Raw docs/reference/run-artifacts.md
    if ($runArtifacts -notmatch [regex]::Escape("run.json")) { throw "run-artifacts doc missing run.json guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("changed_files")) { throw "run-artifacts doc missing changed_files guidance" }
    if ($runArtifacts -notmatch [regex]::Escape(".codex/logs/hooks-")) { throw "run-artifacts doc missing Hook JSONL guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("checkpoint")) { throw "run-artifacts doc missing checkpoint guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("--max-iterations")) { throw "run-artifacts doc missing max-iterations guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("repair loop")) { throw "run-artifacts doc missing repair loop guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("collect-run-artifacts")) { throw "run-artifacts doc missing collector guidance" }
    if ($agents -notmatch [regex]::Escape('actual `.codex/runs/<run_id>/run.json`')) { throw "AGENTS.md missing machine-managed run.json contract" }
    if ($agents -notmatch [regex]::Escape("active Runに紐づくinteractive実行で")) { throw "AGENTS.md missing active RunId contract" }
    if ($runArtifacts -notmatch [regex]::Escape('### Interactive `codex-safe` manifest sync')) { throw "run-artifacts doc missing interactive sync guidance" }
    if ($runArtifacts -notmatch [regex]::Escape('process終了や `Stop` Hookだけを理由に')) { throw "run-artifacts doc missing Stop Hook boundary" }
    $safePowerShell = Get-Content -Raw scripts/codex-safe.ps1
    $safeBash = Get-Content -Raw scripts/codex-safe.sh
    $collectorPython = Get-Content -Raw scripts/collect-run-artifacts.py
    $collectorPowerShell = Get-Content -Raw scripts/collect-run-artifacts.ps1
    if ($safePowerShell -notmatch [regex]::Escape("Run directory not found")) { throw "PowerShell codex-safe missing Run Directory precondition" }
    if ($safePowerShell -notmatch [regex]::Escape("manifest_sync_start")) { throw "PowerShell codex-safe missing manifest sync route" }
    if ($safePowerShell -notmatch [regex]::Escape('Join-Path $repoRoot "scripts\collect-run-artifacts.ps1"')) { throw "PowerShell codex-safe missing absolute collector route" }
    if ($safeBash -notmatch [regex]::Escape("Run directory not found")) { throw "Bash codex-safe missing Run Directory precondition" }
    if ($safeBash -notmatch [regex]::Escape("manifest_sync_start")) { throw "Bash codex-safe missing manifest sync route" }
    if ($safeBash -notmatch [regex]::Escape('bash "$repo_root/scripts/collect-run-artifacts.sh"')) { throw "Bash codex-safe missing absolute collector route" }
    if ($collectorPython -notmatch [regex]::Escape("--refresh-git-changed-files")) { throw "Python collector missing refresh option" }
    if ($collectorPowerShell -notmatch [regex]::Escape("--refresh-git-changed-files")) { throw "PowerShell collector missing refresh pass-through" }
    if ($runArtifacts -notmatch [regex]::Escape("scripts/cleanup-runs.sh")) { throw "run-artifacts doc missing cleanup-runs.sh guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("scripts/cleanup-runs.ps1")) { throw "run-artifacts doc missing cleanup-runs.ps1 guidance" }
    if ($runArtifacts -notmatch [regex]::Escape("--confirm-delete-generated-runs")) { throw "run-artifacts doc missing cleanup confirm guidance" }
    $consumerUpdate = Get-Content -Raw docs/guides/consumer-update.md
    if ($consumerUpdate -notmatch [regex]::Escape("plan-consumer-update")) { throw "consumer-update doc missing planning guidance" }
    if ($consumerUpdate -notmatch [regex]::Escape("--exclude-protected")) { throw "consumer-update doc missing exclude-protected guidance" }
    $evaluationDoc = Get-Content -Raw docs/reference/evaluation.md
    if ($evaluationDoc -notmatch [regex]::Escape("evidence_refs")) { throw "evaluation doc missing evidence_refs guidance" }
    $evaluationTemplate = Get-Content -Raw .codex/templates/EVALUATION.md
    if ($evaluationTemplate -notmatch [regex]::Escape("evidence_refs")) { throw "evaluation template missing evidence_refs guidance" }
    if (Test-Path docs/reference/hook-observation.md) { throw "legacy hook observation doc remains" }
    if (Test-Path docs/reference/subagent-observation.md) { throw "legacy subagent observation doc remains" }

    $reportTemplate = Get-Content -Raw .codex/templates/REPORT.md
    if ($reportTemplate -notmatch [regex]::Escape("checkpoint")) { throw "REPORT template missing checkpoint contract" }
    if ($reportTemplate -match [regex]::Escape("Evidence Record")) { throw "REPORT template still contains legacy action log section" }

    $manifestTemplate = Get-Content -Raw .codex/templates/RUN_MANIFEST.json | ConvertFrom-Json
    if ([int]$manifestTemplate.schema_version -ne 2) { throw "RUN_MANIFEST template must use schema v2" }
    foreach ($property in @("agents_used", "hook_observations", "subagents")) {
        if ($manifestTemplate.PSObject.Properties.Name -contains $property) { throw "v2 manifest contains removed field: $property" }
    }
    foreach ($property in @("hook_event_count", "subagent_run_count", "delete_attempt_blocked", "git_mutation_attempt_blocked")) {
        if ($manifestTemplate.artifact_summary.PSObject.Properties.Name -contains $property -or
            $manifestTemplate.safety.PSObject.Properties.Name -contains $property) {
            throw "v2 manifest contains removed field: $property"
        }
    }

    $config = Get-Content -Raw .codex/config.toml
    foreach ($event in @("UserPromptSubmit", "PostToolUse", "SubagentStart", "SubagentStop", "Stop")) {
        $loggingMatch = [regex]::Match($config, "(?s)\[\[hooks\.$event\.hooks\]\](.*?)(?=\r?\n\[\[hooks\.|$)")
        if (-not $loggingMatch.Success) { throw "missing logging Hook config: $event" }
        $loggingBlock = $loggingMatch.Value
        if ($loggingBlock -match '(?m)^\s*matcher\s*=') { throw "logging Hook must not define matcher: $event" }
        if ($loggingBlock -notmatch '(?m)^\s*timeout\s*=\s*5\s*$') { throw "logging Hook timeout mismatch: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("log_event.mjs")) { throw "logging Hook logger missing: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("git rev-parse --show-toplevel")) { throw "logging Hook repo-root resolution missing: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("cmd.exe /D /Q /S /C")) { throw "logging Hook Windows shell wrapper missing: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("for /f")) { throw "logging Hook Windows root resolver missing: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("2^>NUL")) { throw "logging Hook Windows root-error suppression missing: $event" }
        if ($loggingBlock -notmatch [regex]::Escape("$event")) { throw "logging Hook expected event missing: $event" }
    }

    if ($config -notmatch [regex]::Escape('sandbox_mode = "workspace-write"')) { throw "config missing workspace-write sandbox" }
    if ($config -match '(?m)^\s*approval_policy\s*=') { throw "project config must not set approval_policy" }
    if ($config -notmatch [regex]::Escape('web_search = "cached"')) { throw "config missing cached web_search" }
    if ($config -notmatch [regex]::Escape('network_access = false')) { throw "config missing disabled workspace-write network" }
    if ($config -notmatch [regex]::Escape('[agents]')) { throw "config missing agents section" }
    if ($config -notmatch '(?m)^\s*default_subagent_model\s*=') { throw "config missing default subagent model key" }
    if ($config -notmatch '(?m)^\s*default_subagent_reasoning_effort\s*=') { throw "config missing default subagent reasoning effort key" }
    if ($config -match [regex]::Escape('[profiles.repo_auto_net]')) { throw "config contains unsupported repo_auto_net profile" }
    if ($config -notmatch [regex]::Escape('hooks = true')) { throw "config missing hook feature flag" }
    if ($config -notmatch [regex]::Escape('matcher = "^Bash$"')) { throw "config missing Bash-only matcher" }
    if ($config -notmatch [regex]::Escape('command_windows')) { throw "config missing Windows launcher command" }
    if ($config -notmatch [regex]::Escape('pre_tool_use_policy.mjs')) { throw "config missing Node pre-tool hook command" }
    $preToolWindowsMatch = [regex]::Match($config, '(?s)\[\[hooks\.PreToolUse\.hooks\]\].*?(?=\r?\n\[\[hooks\.|$)')
    if (-not $preToolWindowsMatch.Success) { throw "missing PreToolUse Hook config" }
    if ($preToolWindowsMatch.Value -notmatch [regex]::Escape("cmd.exe /D /Q /S /C")) { throw "PreToolUse Windows shell wrapper missing" }
    if ($preToolWindowsMatch.Value -notmatch [regex]::Escape("for /f")) { throw "PreToolUse Windows root resolver missing" }
    if ($preToolWindowsMatch.Value -notmatch [regex]::Escape("pre_tool_use_policy_windows.ps1")) { throw "PreToolUse Windows launcher missing" }
    if ($preToolWindowsMatch.Value -notmatch [regex]::Escape("2^>NUL")) { throw "PreToolUse Windows root-error suppression missing" }
    if ($config -match '(?m)^\s*command\s*=\s*"[^"]*pre_tool_use_policy\.ps1') { throw "config references legacy PowerShell policy" }
    if ($config -match [regex]::Escape('codex_hooks = true')) { throw "config references deprecated hook feature key" }
    if ((Test-Path ".codex/hooks/pre_tool_use_policy.py") -or (Test-Path ".codex/hooks/pre_tool_use_policy.ps1")) { throw "legacy policy Hook file remains" }
    if ((Test-Path ".codex/templates/hook-observation.schema.json") -or (Test-Path ".codex/templates/subagent-run.schema.json")) { throw "legacy artifact schema remains" }
    if ((Test-Path ".codex/hooks/observe.ps1") -or (Test-Path ".codex/hooks/observe.sh")) { throw "legacy observer Hook remains" }
    if ((Get-Content -Raw scripts/collect-run-artifacts.py) -match "collect_(hook_observations|subagents)") { throw "legacy collector aggregation remains" }
    if ((Get-Content -Raw scripts/collect-run-artifacts.ps1) -match "HookLog|--hook-log") { throw "legacy HookLog collector contract remains" }
    if ((Get-Content -Raw scripts/cleanup-runs.ps1) -match [regex]::Escape(".codex\observations\hooks.jsonl")) { throw "legacy observation cleanup branch remains" }
    if ((Get-Content -Raw scripts/cleanup-runs.sh) -match [regex]::Escape(".codex/observations/hooks.jsonl")) { throw "legacy observation cleanup branch remains" }
}

function Test-StrictHarnessContract {
    $sourceRepoRoot = (Resolve-Path (Join-Path $repoRoot "..")).Path
    foreach ($path in @(
        "README.md",
        "CHANGELOG.md",
        "MIGRATION.md",
        "tools/validate-spec.sh",
        "tools/validate-spec.ps1",
        "tools/plan-consumer-update.sh",
        "tools/plan-consumer-update.ps1",
        "tests/integration/test-cleanup-runs.sh",
        "tests/integration/Test-CleanupRuns.ps1",
        "tests/integration/test-plan-consumer-update.sh",
        "tests/integration/Test-PlanConsumerUpdate.ps1",
        ".github/workflows/validate-template.yml"
    )) {
        if (-not (Test-Path (Join-Path $sourceRepoRoot $path))) {
            throw "Missing strict harness source-repo path: $path"
        }
    }

    $readme = Get-Content -Raw (Join-Path $sourceRepoRoot "README.md")
    if ($readme -notmatch [regex]::Escape("verify --strict-harness")) { throw "README missing strict verify guidance" }
    if ($readme -notmatch [regex]::Escape("plan-consumer-update")) { throw "README missing consumer update planning guidance" }
    if ($readme -notmatch [regex]::Escape("cleanup-runs")) { throw "README missing cleanup guidance" }

    $workflow = Get-Content -Raw (Join-Path $sourceRepoRoot ".github/workflows/validate-template.yml")
    if ($workflow -notmatch [regex]::Escape("template/scripts/verify --strict-harness")) { throw "Workflow missing strict verify command" }
    if ($workflow -notmatch [regex]::Escape("tests/integration/test-cleanup-runs.sh")) { throw "Workflow missing cleanup-runs test" }
    if ($workflow -notmatch [regex]::Escape("tests/integration/test-plan-consumer-update.sh")) { throw "Workflow missing plan-consumer-update test" }

    & powershell.exe -ExecutionPolicy Bypass -File (Join-Path $sourceRepoRoot "tools/validate-spec.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "tools/validate-spec.ps1 failed"
    }
}

function Test-ExecpolicyBaseline {
    $codex = (Get-Command codex -ErrorAction Stop).Source
    $ruleArgs = @(
        '--rules', '.codex/rules/10-readonly-allow.rules',
        '--rules', '.codex/rules/20-risky-prompt.rules',
        '--rules', '.codex/rules/30-destructive-forbidden.rules'
    )

    $allow = & $codex execpolicy check @ruleArgs -- git status 2>&1
    if ((Get-Decision ($allow | Out-String)) -ne 'allow') { throw "git status should be allow" }

    $gitAdd = & $codex execpolicy check @ruleArgs -- git add . 2>&1
    if ((Get-Decision ($gitAdd | Out-String)) -ne 'allow') { throw "git add . should not be forbidden by common rules" }

    $pythonInline = & $codex execpolicy check @ruleArgs -- python -c "print(1)" 2>&1
    if ((Get-Decision ($pythonInline | Out-String)) -ne 'allow') { throw "python -c should not be forbidden by common rules" }

    $pythonStdin = & $codex execpolicy check @ruleArgs -- python - 2>&1
    if ((Get-Decision ($pythonStdin | Out-String)) -ne 'allow') { throw "python - should not be forbidden by common rules" }

    $terraformApply = & $codex execpolicy check @ruleArgs -- terraform apply -auto-approve 2>&1
    if ((Get-Decision ($terraformApply | Out-String)) -ne 'prompt') { throw "terraform apply should remain prompt-class, not forbidden" }

    $kubectlApply = & $codex execpolicy check @ruleArgs -- kubectl apply -f deploy.yaml 2>&1
    if ((Get-Decision ($kubectlApply | Out-String)) -ne 'prompt') { throw "kubectl apply should remain prompt-class, not forbidden" }

    $forbidden = & $codex execpolicy check @ruleArgs -- git reset --hard HEAD~1 2>&1
    if ((Get-Decision ($forbidden | Out-String)) -ne 'forbidden') { throw "git reset should be forbidden" }

    $rmForbidden = & $codex execpolicy check @ruleArgs -- rm file.txt 2>&1
    if ((Get-Decision ($rmForbidden | Out-String)) -ne 'forbidden') { throw "rm should be forbidden" }

    $gitRmForbidden = & $codex execpolicy check @ruleArgs -- git rm file.txt 2>&1
    if ((Get-Decision ($gitRmForbidden | Out-String)) -ne 'forbidden') { throw "git rm should be forbidden" }
}

function Test-WrapperPreflight {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly > $null
    $safeExitCode = $LASTEXITCODE
    if ($safeExitCode -ne 0) { throw "safe wrapper preflight failed (exit=$safeExitCode)" }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -Preset auto-net -PreflightOnly > $null
    $autoNetExitCode = $LASTEXITCODE
    if ($autoNetExitCode -ne 0) { throw "auto-net wrapper preflight failed (exit=$autoNetExitCode)" }
}

function Test-PowerShellHasCodex {
    $result = & powershell.exe -NoProfile -Command "if (Get-Command codex -ErrorAction SilentlyContinue) { 'yes' } else { 'no' }"
    return (($result | Out-String).Trim() -eq 'yes')
}

Invoke-Check "template contract files" { Test-TemplateContract }

if ($StrictHarness) {
    Invoke-Check "strict harness source-repo contract" { Test-StrictHarnessContract }
}

if (Get-Command codex -ErrorAction SilentlyContinue) {
    Invoke-Check "execpolicy baseline decisions" { Test-ExecpolicyBaseline }
}
else {
    Add-Skip "execpolicy baseline decisions"
}

if (Get-Command powershell.exe -ErrorAction SilentlyContinue) {
    if (Test-PowerShellHasCodex) {
        Invoke-Check "PowerShell wrapper preflight" { Test-WrapperPreflight }
    }
    else {
        Add-Skip "PowerShell wrapper preflight"
    }
}
else {
    Add-Skip "PowerShell wrapper preflight"
}

Write-Host "Summary: PASS=$passCount FAIL=$failCount SKIP=$skipCount"

if ($failCount -gt 0) {
    exit 1
}

exit 0
