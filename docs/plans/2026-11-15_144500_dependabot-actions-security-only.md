# qa-training-store Actions security-only Dependabot 計画

## 0. 依頼概要

- 依頼内容: 57 repository全体でsecurity-onlyの依存更新を運用する。
- 背景: `qa-training-store`のRenovateはnpm security updatesのみを扱うが、GitHub Actions ecosystemは対象外。
- 期待成果: Actions参照のsecurity updatesだけを提案する設定。通常version-update PRは作らない。

## 1. ゴール / 完了条件

- ゴール: `github-actions` ecosystemのみをDependabotに設定し、security-only方針に沿わせる。
- 完了条件（DoD）: YAML構文と設定意味を検証し、RenovateとExpo workflowを維持した差分をPRで提示する。ローカル検証後にbranch/commit/push/PRを作る。PR最新headの必須CI確認まで終わるか、waiter不在を未完了として記録する。

## 2. 現状理解と前提

- 現状理解: `renovate.json`は`npm` managerのみでsecurity-only。`.github/dependabot.yml`はない。root package managerはpnpm。ユーザーは日次Expo互換workflowを明示的例外として維持するよう指示している。
- 前提: `open-pull-requests-limit: 0`で通常version-update PRを止める。security updatesは別枠。`target-branch`は指定しない。
- 対象外: Renovate、Expo workflow、repo Settings、alert/security-update toggle、merge/close。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。方針はユーザーが指定済み。
- 仮定してよい細部: GitHub Actions ecosystemのscheduleはweekly。
- 未回答の重要質問: Dependabot alerts/security updatesの有効状態。接続から読めないためUI確認が必要。

## 4. 影響範囲

- 影響範囲: DependabotがGitHub Actions参照を検査する設定ファイル1件と、Repository標準の計画・Run成果物。
- 確認対象ファイル: `renovate.json`、`package.json`、`.github/workflows/*`、`.github/dependabot.yml`、`scripts/verify`、関連Repository instructions。

## 5. 変更方針

- 変更方針: DependabotにActions ecosystemのみを追加する。`directory: /`、weekly、通常PR上限0、`target-branch`なし。npmは既存Renovateに任せる。
- 実行タスク:
  - [ ] 1. 現状とRepository要件を確認する。
  - [ ] 2. Plan/Run Artifactを作り、Actions-only configを追加する。
  - [ ] 3. YAML・設定意味・既存workflow不変更・標準verifyを検証する。
  - [ ] 4. 差分をcommitし、branchをpushしてPRを作成する。
  - [ ] 5. PR最新headの必須CIを確認する。waiter不在なら未確認として記録する。

## 6. 検証方法

- 検証計画: YAML parserで構文確認し、ecosystem/directory/schedule/limit/target-branchをassertする。`bash scripts/verify`を実行し、`git diff --check`とchanged-file listを確認する。GitHub PRの最新headで`Web CI`と`Mobile App CI`を照合する。
- 成功判定: 構文・意図・差分・ローカルverifyが成功し、PR head必須CI両方success。CI waiterがなければその部分は未達。

## 7. リスクと未解決論点

- リスク: 管理設定のtoggleがoffならconfigがあってもsecurity PRは作成されない可能性がある。
- 未解決の質問: Dependabot alerts/security updatesの現在値、owner側のUI確認。

## 8. 成果物

- 変更ファイル: `.github/dependabot.yml`、この計画書、`.codex/runs/20261115-144500-JST/{PLAN.md,TASKS.md,REPORT.md}`。
- 付随ドキュメント: Pull Request本文にsecurity-onlyの意味と確認済み検証を記載する。

## 9. 備考

- `qa-training-store`の日次Expo互換更新workflowはユーザー承認済み例外として維持する。
- 管理設定は変更しない。必要であれば独立した承認待ち事項として報告する。
