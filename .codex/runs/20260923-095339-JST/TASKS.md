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
- [ ] 20. Run Artifactをsanitizationし、必要ファイルだけcommitして実装PRを作成する。
- [ ] 21. 最新PR headでPR Mobile App CIの`native_changed=true`経路、Web CI、job / Artifact / final gateを確認する。
- [ ] 22. branch `workflow_dispatch`で指定されたvisual 1 caseを実行し、出力・upload・verifyを確認する。
- [ ] 23. 実際の検証結果をPR本文へ記録し、最新PR head / CI / working treeを最終確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- Plan §9は22件の実装taskで、18件完了、16番はstatic contractまで完了してmanual runtimeが未完了、20〜22番はRemote CI / manual runtime / PR本文確認が未完了。Run `Now`のtracked checkboxは23件で、19件完了。基本Progressは19/23（83%）。file-changing lifecycle用のユーザー向けProgressはRepository契約の追加CI確認1件を含め19/24（79%）で、Web CI / Mobile App CI successとPR本文記録後に加算する。過去の19/23と19/24は異なるProgress定義であり、task総数の差ではない。

## Blocked（ブロック中）

- 現時点で作業を停止するblockerはない。`format:check`全体はcurrent Windows worktreeの`app/**` 78 fileでFAILのまま。clean detached `origin/main`（SHA `01cd8ab15078d479e821d373445af1e16a469519`、Git status clean）は同command PASS、app warning 0。78 fileのGit content diffは0、current worktreeはCRLF、clean baselineはLF、`.prettierrc.json`は`endOfLine: lf`。Issue #130変更fileのPrettierはPASS。78 file、formatter設定、hook設定は変更しない。ユーザーの最新指示はlint / security PASSと最終diff確認を条件に今回のcommitのみ`--no-verify`を許可しており、両gateはPASS済み。
- `pnpm run test:contracts`のfull suiteは既存Windows launcher testが負荷下で30.7秒timeout。単独実行は27.5秒でPASSした。timeout tuningはPlan対象外。
- Planのfocused commandは`output/**`の生成済みtraining copies内に残る旧Native contract assertions 18件を収集してFAILする。source-only実行は78/78 PASS、Repository標準commandは`output/**`を除外する。
- 先行commit attemptは`format:check`で止まり、hook後続lint / securityは未到達だった。その後、今回のline-ending差をEvidenceとして記録するようユーザーが明示し、後続lint / securityを手動実行してPASSした。最終staged-diff確認後に限り今回1 commitの`--no-verify`が許可されている。

- ブロック時のみ記載する。
