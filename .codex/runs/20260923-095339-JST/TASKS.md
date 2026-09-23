# Tasks（タスク）

## Now（現在）

- [x] 1. PR #176、Issue #130、Plan、実装開始時の最新`main`を確認し、Native CI関連driftを調査する。
- [x] 2. Plan §4〜8の既存workflow、scripts、validator、contract tests、documentationの責務境界を確認する。
- [x] 3. Plan §9の順序・§10の検証・§11の完了条件をRunへ記録する。
- [x] 4. 既存job ID、Artifact、build非対称contract、Runtime条件、no-change skip、final verifyを先にcontract testで固定する。
- [x] 5. `.github/workflows/native-android-build.yml`を追加し、`build_kind`だけをinputとしてbuild/evidence責務を移す。
- [x] 6. 親workflowのAutomation / Production caller jobをReusable Workflow呼び出しへ変更する。
- [x] 7. Production Bundle Guard APK adapter helperを追加し、既存validator policyを維持する。
- [x] 8. Emulator start helperを追加し、state / diagnostic file契約を維持する。
- [x] 9. adb root capabilityはworkflowに残し、visual profile normalization本文のみをhelperへ移す。
- [x] 10. visual capture helperを追加し、manual case inputとcapture artifactsを維持する。
- [x] 11. runtime evidence helperを追加し、optional inputの欠落時も処理を継続する。
- [x] 12. step ID / if、launcher stabilization、APK install / launch、Maestro粒度、Artifact Actionをworkflowに残す。
- [x] 13. 通常PR change detectionへ指定5 pathだけ追加し、visual専用pathを追加しない。
- [x] 14. contract assertionをownerへ移し、Action設定とhelper I/O契約を検証する。
- [x] 15. `docs/PROJECT_CONTEXT.md`とhistoryを実装結果へ同期する。
- [x] 16. 新規shell 5本の`bash -n`とLFを確認する。
- [x] 17. focused contract testsと既存Production Bundle Guard validator contractを実行する。
- [x] 18. `pnpm run test:contracts`、`pnpm run verify`、`git diff --check`を実行する。
- [x] 19. Plan §11とIssue #130成功状態に照らして局所責務・scopeを確認する。検証FAILはRun `REPORT.md`へ分類して記録する。
- [x] 20. Review findingに対応し、Android build caller条件と`native_changed=false`時の各job skip / verify success contractを静的testで直接固定する。
- [x] 21. tracked taskとpost-push lifecycleを分離し、過去Progressを履歴として保持したままRun Artifactとevaluationを更新する。
- [x] 22. focused / repository validation、evaluation schema、collector、sanitization、commit前scope確認を完了する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

Progress: 100% (22/22)

## Commit後の完了処理

- 対象branchへ通常commit / pushする。
- local HEAD、remote branch HEAD、PR #176 headの一致を確認する。
- 最新PR headのWeb CIとMobile App CIを確認する。
- 必要なCI結果と今回の修正内容をPR本文へ反映する。
- Runtime workflow / helper / Maestro Flowに変更がないため、manual visualはhead `f2aa9cc9595309b0cce60323702bc6cac960f360`での`SCREEN-STOREFRONT-HOME/default/android`既存Evidenceを維持し、今回の修正だけを理由に再実行しない。
- ここに記載するpost-push lifecycleはtracked checkboxとTASKS.mdの基本Progress分母に含めない。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- 2026-09-23レビュー修正前の19/23はtracked checkbox Progress、19/24はpost-push CI checkpointを含めたユーザー向けlifecycle Progressとして記録された過去checkpointである。post-push処理をcheckboxから分離した現在のtracked Progressとは異なるため、過去REPORTの数値は書き換えない。

## Blocked（ブロック中）

- 現在のWindows worktreeで`format:check`は未変更`app/**` 78 filesのCRLF差によりFAILする。clean `origin/main`では同checkがPASSし、78 filesにGit content diffはない。対象file、formatter / hook設定を変更していない。ユーザーは今回のfollow-up commitだけ`--no-verify`を明示許可し、手動の`lint`・`security:check`・source-only focused contractは今回再実行してPASSした。最終scope / artifact gateの後に1回だけ使用する。
- Repository `test:contracts`は44 files中43 passed / 1 failed、760 tests中753 passed / 3 failed / 4 skipped。失敗3件は既存Windows launcher testの各30秒timeoutで、PASSへ読み替えない。
- 指定focused commandは生成済み`output/**` copies内の旧assertion 18件でFAIL。今回のsource-only Native contractは27/27 PASS。
- `corepack pnpm run verify`はnested `pnpm`を解決できずFAILした。package / Corepack / PATH / dependencyは今回変更せず、FAILのまま記録する。
- 以前のRunに記録された未使用remote branchは既存のまま維持し、変更・削除しない。

- ブロック時のみ記載する。
