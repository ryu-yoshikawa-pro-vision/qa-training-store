# Plan

## Objective

- 指定Plan `docs/plans/2026-08-16_102200_codex-git-safety-hook-remediation.md` をSSOTとして、Windows NativeのCodex CLI 0.147.0で動作するPreToolUse/BashのNode.js共通Policy Hookへ移行し、契約テスト・Full Access実Runtime Acceptance・品質ゲート・Run Artifact sanitizationまで完了する。

## Scope

- In:
  - `.codex/config.toml`、`.codex/hooks/`、`.codex/rules/`、`.codex/requirements.toml`
  - `scripts/codex-safe.ps1`、`scripts/codex-safe.sh`、`scripts/verify.ps1`、`scripts/verify`
  - Hook契約／Windows launcher／Full Access acceptanceの最小テスト・補助スクリプト
  - Planが列挙する関連文書、今回のRun Artifact
- Out:
  - Git CLI全体・shell grammar parser、arbitrary child process監視、新Safety Framework
  - `apply_patch` Hook、Product code、GitHub Ruleset、preset全体の再設計
  - 実Repository／実Remoteを使った破壊Acceptance、Git mutation、PR作成・merge

## Assumptions

- installed runtimeの実測結果を、Planと既存実装より優先する。
- Full Accessは `--sandbox danger-full-access --ask-for-approval never` のCodex exec routeで代表検証し、破壊操作はtemporary cloneとlocal bare remoteに限定する。
- legacy Hookファイルはruntime参照を外し、移行確認後に今回のPlanが明示する対象だけを`apply_patch`で削除する。shell／PowerShell／git commandによる削除は行わない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。目的、Matrix、Required Environment、DoDが指定Planで確定している。
- 仮定してよい細部: テスト／acceptanceのファイル名とNode標準APIの選択は、既存package scriptsとruntime制約に合わせて決める。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Codex 0.147.0は `[features].hooks = true`、inline `[[hooks.PreToolUse]]`、`command_windows`、structured denyを現行Contractとして認識する。
- H2: Windows launcherがcwd非依存でrepository rootとNode Hookを解決し、stdinをそのままNodeへ渡せばroot／nested／空白・Unicode pathで同一判定になる。
- H3: MatrixをNode Hookのdata-driven policy caseとして共有すれば、G1-G10/N1-N4とAllow代表例のfalse positiveを一つのContractから検証できる。
- H4: Full Access routeでもPreToolUseは実行前にdenyし、deny対象のlocal／remote sentinelは変化しない。

## Research Plan

- Round 1 Query: installed Codex version、hooks feature、project trust/discovery、実payload、Full Access／rulesの実挙動をWindows Nativeで確認する。
- Round 2 Query: Node Hook／launcher／config／rules／wrapper／verifyの変更面と既存test harnessを確定し、Policy Matrixを実装する。
- Round 3 Query: contract test、launcher test、temporary clone／bare remoteのreal acceptance、Required gatesを失敗原因付きで検証する。
- Exit Criteria:
  - H1-H4それぞれに実測またはテストの根拠がある。
  - DoDの全項目がPASS、または未達理由・影響・次アクションをRun Artifactへ記録する。

## Approach

- Phase 0: 実Runtime Gate（コード変更なし）
- Phase 1: Node HookをPolicy SSOTとして実装し、config／launcher／rules／wrapper／verifyを同期
- Phase 2: Matrix参照のContract Test、Windows launcher test、Full Access real acceptanceを追加・実行
- Phase 3: 関連文書を最小同期し、全Required gate、Independent Review、sanitizer/schema checkを実施
- 標準フロー: `PLAN -> Runtime/Docs確認 -> TASKS -> 実装 -> 検証 -> REPORT`

## Definition of Done

- PreToolUse/Bash only、Node Hook 1本がFull Access common policy SSOTである。
- Windows `command_windows`、root／nested cwd、malformed fail-close、structured deny、unexpected non-zero propagationがPASSする。
- G1-G10、N1-N4、Allow代表例、protected branch、Full Access representative acceptance、sentinel不変確認がPASSする。
- wrapper／verify／rules／requirements／docsが現行Contractと整合し、legacy policy runtime参照が残らない。
- Required repository quality gates、Independent Review、Run Artifact sanitization Write/Check、evaluation schemaがPASSする。
- Git parser／shell parser／新Safety Platformを導入していない。

## Risks / Unknowns

- Hook trustが未承認、またはFull Access routeが実行環境のhost policyで制限される可能性がある。回避せず、trust／runtime結果をBLOCKED/FAILとして記録する。
- Codex実Runtimeと公式docsが食い違う可能性がある。実測を優先し、必要な差異だけをPlan／REPORTへ記録する。
- Windows PowerShellのquote／CRLF／path解決差がlauncherに影響する可能性がある。raw stdinとsemantic outputを分けてテストする。
- 既存Rules／wrapperの広いdenyがNode HookのAllow契約と衝突する可能性がある。Full Access common policyとpreset-specific policyを分離して確認する。

## Thinking Log

- 2026-08-16 21:08 JST: Run `20260816-210818-JST`をStrict implementationとして初期化。開始時のbranchは`feat/implement-codex-git-safety-hook`、worktreeはclean。
- 2026-08-16 21:12 JST: installed Codexは`codex-cli 0.147.0`。公式Hooks docsは`features.hooks`、`command_windows`（`commandWindows` aliasも可）、`^Bash$`、structured deny、exit 2/stderrを現行仕様として示す。既存configの`codex_hooks`、legacy `decision=block`、relative `pwsh` launcherは修正対象と判断。
- 2026-08-16 21:13 JST: `codex doctor`は20秒超でtimeoutしたため、同一条件の無目的な再試行はせず、`codex features list`、`--strict-config --help`、公式docs、後続実Runtime acceptanceで補完する。
- 2026-08-16 21:54 JST: Node Hook、Windows launcher、Bash-only config、Rules／wrapper／verify同期、docs／ADRを反映。PowerShell／Python旧Hookはruntime参照を外し、Plan明示の移行cleanupとして`apply_patch`で削除した。
- 2026-08-16 21:54 JST: temporary clone／local bare remoteでFull Access acceptanceを実行。通常経路の初回trust review未persistを観測し、公式one-off hook-trust bypassでG1/G2/G7/G10/N1 deny、git add／feature commit／feature push／path unstage allow、sentinel不変、launcher実測約470msを確認した。
- 2026-08-16 22:00 JST: typecheck、lint、security、spec／curriculum／image manifest、PowerShell／Bash verify、Hook契約を検証。全体formatとfull contractは変更対象外の既存failureとして因果確認・保留理由をREPORTへ記録した。
