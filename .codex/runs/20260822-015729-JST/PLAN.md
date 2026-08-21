# Plan

## Objective

- `docs/plans/2026-08-21_223300_enable_github_security_automation.md` と、正本である `docs/plans/2026-08-16_162000_public-repository-hardening.md` に従い、GitHub標準Security機能を必要最小限で有効化・検証する。
- Dependabot Security Updatesだけを対象にし、通常のVersion Updates、自動approve、自動merge、独自Security機構を導入しない。

## Scope

- In:
  - 最新 `main`、PR #39、作業差分、CI、SECURITY.md、依存グラフ、Dependabot、Malware、Secret、CodeQL、PVR、Actions permissions、`main-protection` のPreflight。
  - Admin権限が利用可能な場合のみ、Plan記載のGitHub Repository SettingsとRulesetを最小変更する。
  - Security findings、CodeQL初回解析、PVR Reporter導線、validate Required gateの実動作確認。
  - 日本語のRun Artifact更新、完了前のArtifact Sanitizer実行。
- Out:
  - `.github/dependabot.yml`、Dependabot Version Updates、Renovate、独自Bot/scanner/CodeQL workflow、auto-approve/auto-merge、Actions write permission、`pull_request_target`。
  - Application code、package dependency、lockfile、既存CIのTarget一致部分、既存findingの無断remediation、実credentialを使うSecretテスト、Git history rewrite。
  - Planにない将来対策、監視、自動化、Ruleset強化。

## Assumptions

- Plan PR #39の変更が `main` に反映済みであること、または未反映ならSettings変更を完了扱いにしない。
- GitHub Settings / Ruleset変更はAdmin権限が必要であり、現認証主体で権限が不足する場合は推測や代替実装をせず `Blocked` と記録する。
- Security PRが存在しない場合、修正可能なAlertの有無とSecurity Updates状態を確認し、Alert数とPR数を同一視しない。
- 同一会話のRun IDは `20260822-015729-JST` を継続利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーが対象、Target State、非対象、完了条件を明示している。
- 仮定してよい細部: GitHub API/CLIで取得できる情報を優先し、UI確認が必要な導線のみブラウザで確認する。
- 未回答の重要質問: 現認証主体がSecurity Settings / Rulesetを変更できるか。これはPreflightで実測する。

## Hypotheses

- H1: 現行CIはSSOT P-04/P-06の契約と一致し、今回のRepository file変更は不要である。
- H2: 現認証主体はWrite権限に留まり、Security Settings / Ruleset変更が権限不足でBlockedになる可能性がある。
- H3: 既存のDependabot / CodeQL / Secret findingsは、既存main由来としてInventoryとP-13 triageが必要になる。

## Research Plan

- Round 1 Query: 最新main/PR/作業差分、ローカルCI/SECURITY、GitHub Security/Actions/Ruleset/PR/findingsの現状態を取得する。
- Round 2 Query: 設定変更権限、CodeQL初回解析、PVR Reporter導線、validate発行元、Required gate動作を確認する。
- Exit Criteria:
  - H1〜H3を支持または反証する証拠がRun Artifactにある。
  - 変更可能な項目は最小変更し、変更不能な項目は権限・影響・次の実行者を明示する。
  - 初回Critical/High、Malware、active/validity unknown Secretを未評価のままCompletedにしない。

## Approach

- Plan/SSOTと起動時ドキュメントを全文確認し、Runを初期化する。
- ローカルとGitHubのPreflightをread-onlyで完了し、Target一致部分を再実装しない。
- Admin権限がある場合のみ、依存グラフ/Dependabot Security/Secret Protection/CodeQL Default Setup/PVR/Rulesetを指定順に変更する。
- 各設定後にGitHub状態、CI/CodeQL、PVR導線、Ruleset gateを実測し、findingはP-13でtriageする。
- 完了時に `pnpm run lint:markdown`、`git diff --check`、必要なtargeted確認、Run Artifact Sanitizerを実行する。

## Definition of Done

- PlanのTarget Stateを確認済みで、`.github/dependabot.yml`なし、Version Updatesなし、Security Updates/Alerts/Malware/Secret scanning/Push protection/CodeQL Default Setup/PVR/Actions permissions/RulesetがTargetに一致する。
- CodeQLのJavaScript/TypeScriptとActions初回解析、PVR Reporter導線/notification、通常PRのvalidate merge gateを確認済みである。
- 初回Dependabot/Malware/Secret/CodeQL findingsをP-13に従って評価し、未評価のCritical/High・Malware・active/unknown Secretを残さない。
- Repository fileは差異が見つかった場合のみ最小変更し、変更理由を記録する。
- 権限不足・外部状態未完了・重大finding等でDoDが満たせない場合は `Blocked` または `Pending` とし、Completedにしない。

## Risks / Unknowns

- 現認証主体がAdminでない場合、Settings/Ruleset変更と一部finding詳細が実行できない。Owner/Adminの実行が必要。
- Security PRはpatched version不在、conflict、paused等によりAlertがあっても生成されない可能性がある。
- PVR通知の受信は実レポート送信なしで設定UI/通知経路まで確認する。
- RulesetのRequired check変更は、main上のvalidate成功とGitHub Actions発行元確認前に実施しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-08-22 02:01 JST: Plan/SSOT全文とrepo-local入口を確認し、Strict workflowでRunを初期化した。
- 2026-08-22 02:01 JST: PR #39はDraftで、base `main` は `314a8f...`、headは `16bc147...`。現認証主体はWrite権限で、Settings画面はrepository optionsへのアクセス不可を表示した。Settings/Ruleset変更は権限確認後に判断する。
- 2026-08-22 03:12 JST: Owner/Admin設定はユーザーのブラウザ完了報告を受領した。PVRはAPI `enabled=true`、Security OverviewのEnabled表示、通常Reporterの`Report a vulnerability`導線でも再確認した。Admin専用APIの再取得不可は、設定未実施ではなく現認証主体の権限境界として記録した。
- 2026-08-22 03:12 JST: PR #38のPhase 1 CIを1回再実行し、`validate`未完了中の`mergeStateStatus=BLOCKED`、`validate` success後の`CLEAN`を観測した。通常same-repo PRの過去failure runでも`validate` failureを確認し、P-14 gateの実動作証拠を揃えた。
- 2026-08-22 03:12 JST: CodeQLとRulesetはTarget一致のため変更しない。Dependabot `security_update_not_possible`はPlanどおり別Security fix PR / follow-upへ分離し、PlanのFinal Statusを`Completed`と判断した。
