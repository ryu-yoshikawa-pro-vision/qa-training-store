# Plan

## Objective

- 指定された実装計画 `docs/plans/2026-08-23_113600_dependabot_security_vulnerability_remediation.md` を正本として、Open Dependabot Alerts と `pnpm-lock.yaml` を突合し、対象脆弱性だけを必要最小限の差分で解消する。

## Scope

- In:
  - `fix/dependabot-security-vulnerability-remediation` 上での baseline、Open Dependabot Alerts inventory、`pnpm audit`、lockfile resolution、installed tree の確認。
  - `js-yaml` の affected 4.x resolution が存在する場合の targeted lockfile-only remediation。
  - Standard Run Artifact の記録、最終 validation、Sanitizer、Markdown lint。
- Out:
  - Dependabot Alert の dismiss、unrelated Alert の修正、dependency 全体の更新、ancestor の不要更新、direct dependency 化、global override。
  - application / architecture / workflow policy の変更、commit、push、PR更新、merge、rebase。

## Assumptions

- 指定Planの実装時点確認を優先し、Planにない独自の dependency 更新方針を追加しない。
- `behind == 0` かつ `package.json` / `pnpm-lock.yaml` がbaselineでcleanの場合だけ dependency mutation を許可する。
- `pnpm-lock.yaml` が affected resolution の存在判定の正本であり、`pnpm why` / `pnpm list` は installed tree の補助情報である。
- network-required execution はRunに記録した `auto-net` 前提で行う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定Planが remediation、停止条件、DoD を確定している。
- 仮定してよい細部: `gh api` が利用できる場合は認証済みGitHub APIをAlert inventoryの正本として使用する。利用不能時は推測せず execution blocker とする。
- 未回答の重要質問: 実行時のAlert件数、各Alertの公式scope、`js-yaml@4.3.0` の全経路、targeted re-resolutionの実結果。

## Hypotheses

- H1: canonical remote `main` に対して対象branchは `behind == 0` であり、dependency files に事前差分はない。
- H2: `pnpm-lock.yaml` に `js-yaml@4.3.0` が残り、確認済みparent rangeが `4.3.1` を許容するため、ancestorを更新せず targeted lockfile-only re-resolutionで解消できる。
- H3: `js-yaml@3.15.1` と `js-yaml@5.2.2` はadvisoryのaffected range外であり、今回更新しない。

## Research Plan

- Round 1 Query: branch / canonical main / working tree / Node・pnpm / latest main CI baseline を読み取り確認する。
- Round 2 Query: 認証済みOpen Dependabot Alerts全件、`pnpm audit`、lockfile全経路、installed tree同期、pnpm 9.10.0のsupported update syntaxを確認する。
- Exit Criteria:
  - 全Alertについて公式 `dependency.scope`、scope、disposition、remediation/follow-up の根拠がある。
  - affected resolutionだけを除去する採用候補のdiffがあり、unrelated churnがない。
  - frozen install、audit、why/list、verify、Sanitizer、markdown lint、final diff確認を完了するか、Planの分類で停止理由を記録する。

## Approach

- 指定PlanのTask 0〜6を順番に実行する。
- baseline確認後、Alert inventoryをdependency変更前に取得する。
- lockfileを直接確認し、必要時だけinstalled treeをmaterializeする。
- `pnpm --version` / `pnpm help update` でsupported syntaxを確認後、より狭いselector限定のlockfile-only mutationを一度ずつ評価する。採用条件を満たさない候補は通常のfile editでattempt前状態へ戻し、diff一致を確認する。
- validation結果をRun Artifactへ記録してから最終化し、Sanitizer後はRun Artifactを変更しない。

## Definition of Done

- 指定Planの完了条件を満たす。特に `behind == 0`、initial Alert snapshot、全Alert分類、lockfile正本によるaffected判定、FIX対象だけの最小差分、frozen install、audit、final installed tree、final `pnpm run verify` の分類、Run Artifact、Sanitizer Write/Check、`pnpm run lint:markdown`、final git status/diffを確認する。
- `js-yaml` のsafeな3.x / 5.x と unrelated dependencyを不要更新しない。
- 今回変更に起因するvalidation failureを残さない。外部・環境上の未検証は成功扱いせず、execution blockerまたは指定分類で記録する。

## Risks / Unknowns

- GitHub認証、GitHub API、npm registryが利用できない場合は、inventoryまたは再解決を推測で代替せず停止する。
- lockfile-only mutationがresolutionを変えない、またはunrelated churnを生む場合は不採用とし、bounded retryを守って原因調査へ戻る。
- parent range不許容、互換性根拠不足、major updateのみの場合はBLOCKEDとし、scopeを広げない。
- 既存working tree変更がvalidationへ影響する可能性があるため、baselineを記録し、依存ファイル以外も勝手に変更しない。

## Thinking Log

- 2026-08-23 15:00 JST: 指定Plan、AGENTS.md、PLANS.md、PROJECT_CONTEXT、最新ADR、直近Runを確認した。対象タスクのactive Runはなく、Standard / auto-netで新規Runを作成した。
- 2026-08-23 15:02 JST: branchは対象名、canonical mainとの差分は `behind_by=0` / `ahead_by=18`、dependency filesの既存diffは0、Nodeは24.12.0、pnpmは9.10.0だった。canonical main `f909ea4...` のPhase 1 CI run `32612412557` とCodeQL run `32612412379` はsuccessだったためbaseline条件を満たす。
- 2026-08-23 15:25 JST: selector付きrange update、exact-version update、親限定overrideの3候補を評価した。いずれもjs-yamlの対象置換以外のlockfile churnまたは対象外metadata変更を含んだため不採用とし、候補前hashへ復元した。親rangeはpatched versionを許容するが、安全な最小再解決と狭いoverrideの両方が成立しなかったため、Alert #5をBLOCKEDとし、bounded retryを終了する。
