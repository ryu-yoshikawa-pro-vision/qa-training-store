# Plan

## Objective

- `docs/plans/2026-08-21_002300_repository_audit_remediation.md` のActive remediationのうち、G7（Flow J Test Oracle）、G8（Agentic QA patch portability）、G9（Training Action SHA pinning）だけを実装する。
- PR #38が`main`へmerge済みであることを再確認し、最新`origin/main`から`fix/qa-repository-hardening`上の最小差分として完了させる。

## Scope

- In:
  - G7: Cross-role Flow JのTest Oracleと、そのFocused Playwright回帰確認。
  - G8: 既存`.gitattributes`（`* text=auto eol=lf`）を正本としたchallenge patch、strict apply preflight、必要最小限の既存Preparation経路。
  - G9: `training/github-actions/`で使用するActionの現行version／upstream full SHA確認、advisory確認、allowlist／workflow contractのexact SHA更新、mutable tag拒否回帰。
  - 必要なRun Artifact、Focused Validation、変更面に対応するRepository gate。
- Out:
  - G1〜G6、Product code、G7以外のTest Oracle、Dependency version upgrade、新しいQA framework／EOL abstraction、workflow permission変更、PR作成・merge、force push／rebase／amend／destructive reset-clean。

## Assumptions

- PR #38はmerge済みであり、作業開始時の`origin/main`が最新の基準である。
- 2026-08-22 19:32 JSTの再baselineで`origin/main`とHEADは`a3a58ae4b4168c34307e6dd0f2d21c039a972fab`に一致し、作業ツリーに既存変更はない。
- G8はLF patchと既存EOL contractだけでstrict applyできることを第一仮説とし、Evidenceなしに汎用normalizationを追加しない。
- G9はcurrent tag/versionを維持してfull commit SHAへpinする。Security advisoryがversion upgradeを要求する場合はこのRunでupgradeしない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象Group、Non-goals、検証条件、PR操作禁止が指定Planで確定している。
- 仮定してよい細部: 既存のcontract test／script／Playwright projectを再利用し、追加判断が不要な局所修正だけを行う。
- 未回答の重要質問: なし。G8のnormalization要否とG9のcurrent SHAはrepo mapping／upstream確認で確定する。

## Hypotheses

- H1（G7）: Flow Jは遷移前のstateを十分に検証せず、unexpected stateでも成功扱いになり得る。Oracleだけにvalid initial state・post-transition state・許可済みalready-transitioned stateの明示assertを追加すればfail-closeできる。
- H2（G8）: `.gitattributes`と対象patchのLF化でWindows checkout／Linux controlともstrict `git apply --check`が通り、Preparation scriptの汎用normalizationは不要である。
- H3（G9）: Training workflowのActionはcurrent versionを変えずにofficial upstreamのfull SHAへ固定でき、allowlist／contract testをexact SHAに合わせられる。

## Research Plan

- Round 1 Query:
  - G7のFlow J、state helper、Playwright config／既存focused testを特定し、false-greenの上流stateと安全な変更面を確定する。
  - G8のchallenge patch、Preparation script、`.gitattributes`、既存EOL／strict apply testを特定する。
  - G9のTraining workflow、Action allowlist／contract test、package／workflow versionを特定する。
- Round 2 Query:
  - G7は変更前のunexpected stateがFAILすることを再現し、修正後に同じFocused Playwrightでfail-closeを確認する。
  - G8は高コストPreparation前にstrict apply preflightを実行し、LF patchのWindows／Linux applyを確認する。
  - G9はofficial upstream release／commitとGitHub Advisory／Security情報を確認してからpinし、mutable tag negative testを実行する。
- Exit Criteria:
  - G7〜G9の各Hypothesisに実装前後の根拠がある。
  - 変更ファイルがG7/G8/G9のsafe change surface内に限定される。
  - 指定Focused Validationと必要なRepository gateがPASS、または失敗原因と次アクションがRun Artifactに記録される。

## Approach

1. 指定Plan、AGENTS、Project Context、ADR、直近Runを確認し、最新`origin/main`とPR #38 mergeをrebaselineする。
2. G7を調査し、Test Oracleだけを最小修正してFocused Playwrightでunexpected stateのfail-closeを確認する。
3. G8は対象patchのLF状態とstrict apply preflightを先に確認し、Evidenceがある場合だけPreparation scriptを最小修正する。
4. G9はofficial upstream／advisoryを確認後、current versionのfull SHA pinとexact contractを更新する。
5. 変更差分・focused tests・必要なlint/type/contract gate・Run Artifact Sanitizerを確認し、PRはmergeせず停止する。

## Definition of Done

- G7はProduct codeを変更せず、Flow Jのvalid initial state、必要な操作、操作後state、許可したalready-transitioned state、unexpected state failureを明示する。
- G8は対象challenge patchがLFで、Windows checkoutとLinux controlでstrict apply可能であり、高コストPreparation前のpreflightがfail-fast／fail-closeである。`--ignore-whitespace`通常経路やEvidenceなしのnormalizationはない。
- G9はTraining workflow Actionがcurrent versionのofficial full SHAにpinされ、allowlist／contract testもexact SHA、mutable tagがnegative testで拒否される。Security advisory起因のversion upgradeは混在しない。
- G7〜G9以外のファイル・挙動・依存versionを変更していない。PR merge、force push、rebase、amend、destructive reset-cleanを実行していない。
- 変更後に必要なFocused Validation、選定Repository gate、`scripts/sanitize-codex-artifacts.ps1 -Write -Check`を実行し、Run Artifactへ日本語で記録する。

## Risks / Unknowns

- Flow Jの許可済みstateを広げすぎるとfalse-greenが残る。state enum／既存seed／Product contractを読み、想定外stateは明示的にthrow／failさせる。
- G8でpatch／checkoutの実EOL条件がstrict applyを壊す可能性がある。まずpatch bytesと`git apply --check`相当を確認し、同じ失敗を2回無目的に再試行しない。
- G9のupstream current versionやadvisory情報は時間依存である。official release／commit／GitHub Advisoryを実取得し、version upgradeが必要なら別対応として記録する。
- 既存品質gateの失敗はbaseline・変更差分・共有依存・環境を切り分け、今回の変更が原因なら最小修正、独立問題ならRun Artifactへ保留理由を記録する。

## Thinking Log

- 2026-08-22 19:32 JST: 指定Plan全文、AGENTS、PROJECT_CONTEXT、最近のADR／Run、PLANS、feature-plan、planning workflowを確認した。今回は既存Planの追従実装であり、新しい`docs/plans/`は作成しない。
- 2026-08-22 19:32 JST: `git fetch origin main`後、`origin/main`、HEADとも`a3a58ae4...`。PR #38は`MERGED`、merge commitは`b833afb...`。作業ブランチは指定の`fix/qa-repository-hardening`。
- 2026-08-22 19:33 JST: 今回のStrict Run `20260822-193304-JST`を初期化した。child subagentは使用しない。
