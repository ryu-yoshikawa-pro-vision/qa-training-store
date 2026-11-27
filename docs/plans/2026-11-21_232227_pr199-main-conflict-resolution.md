# PR #199 最新main競合解消計画

## 0. 依頼概要

- 依頼内容: PR #199のHeadへ最新`origin/main`を取り込む必要性と競合を確認し、実在する競合だけを解消する。
- 背景: PR Headは`6dbbb6516cb91a4ce987cfa299f68bd771a2f0c7`。fetch後の`origin/main`は`ddc451a7079bbc75cd1d6623f5ae1e4647caf635`で、PRに記録された前回のmain `17de02cd1adfa3b167965d95a61265b4421393fd`より進んでいる。
- 期待成果: PR作業ブランチ上に両側の変更意図を保持したマージ結果を作り、関連検証後にローカルコミットする。remote pushは行わない。

## 1. ゴール / 完了条件

- ゴール: 最新mainとPR #199の実際の競合を、競合ファイルごとに両側の意図を維持して解消する。
- 完了条件（DoD）:
  - `AGENTS.md`と`package.json`の競合を手動統合し、main側のCI・Hook・サニタイズ・依存更新とPR側のカリキュラム／受入・製品境界を保持する。
  - 指定の変更境界外に編集を加えず、競合マーカー・未解決パスを残さない。
  - `git diff --check`、関連Hook契約テスト、標準`pnpm run verify`を実行し、結果を記録する。
  - PR作業ブランチへローカルマージコミットを作成し、pushは明示承認まで保留する。

## 2. 現状理解と前提

- 現状理解: branchは`docs/plan-ai-agent-qa-curriculum-redesign`、upstreamは`origin/docs/plan-ai-agent-qa-curriculum-redesign`、ローカルHEADとPR Headは一致。作業開始時から`origin/main`を`MERGE_HEAD`とするmergeが進行中で、indexにはmain取り込み分が載り`AGENTS.md`と`package.json`が未解決。初回status取得は30秒時点で継続中だったため、cleanとは判断しない。
- 前提: 既存mergeの`MERGE_HEAD`がfetch後の`origin/main`と一致し、index stagesがPR Head/mainの内容と一致するため、そのmergeを継続する。mergeを再実行・中断しない。検証後にPR作業ブランチへcommitする。pushは行わない。
- 対象外: 未完了受入項目や既存CI障害の追加修正、製品SUT／正式仕様／Seed・Reset／既存製品テスト変更、PR全体のマージ可否・受入判定。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。競合解消とローカルcommitはユーザーが指示済み。
- 仮定してよい細部: 既存のローカル検証環境が利用可能なら`pnpm run verify`を実行する。
- 未回答の重要質問: remote pushの承認。承認までは実行しない。

## 4. 影響範囲

- 影響範囲: `origin/main`の#223、#226、#227をPRブランチへマージし、同時編集された2ファイルを手動統合する。
- 確認対象ファイル: `AGENTS.md`、`package.json`、自動統合されたCI・Hook・sanitizer関連差分、lockfile、保護対象の変更有無。

## 5. 変更方針

- 変更方針: `AGENTS.md`ではmainのCodex/OpenCode安全契約・Run Artifact root・親子委任・Codex startup behaviorを保ち、PR側の製品境界と#199専用並行作業／統合受入節を追加で保つ。`package.json`ではPR側のAI協働QA course/E2E/validator/verify入口をmain側のHookテスト、TypeScript起動方法、Expo Android autolinking、SDK依存・セキュリティoverrideと併存させる。
- 実行タスク:
- [x] 1. GitHubとローカルのPR/main SHA、branch、upstream、祖先関係、merge-tree結果を確認する。
- [x] 2. 既存mergeがPR Headと最新`origin/main`の取り込みであることを確認する。再mergeせず、2ファイルを手動統合する。
  - [ ] 3. 差分境界、競合マーカー、関連スクリプト／CI／テスト、lockfileとの整合を確認する。
  - [ ] 4. 指定検証を実行し結果を記録する。
  - [ ] 5. PRブランチ上にローカルマージコミットを作成する。pushは保留する。

## 6. 検証方法

- 検証計画: `pnpm run test:hooks`、`pnpm run verify`、`git status`、`git diff --check`、`git diff --name-only --diff-filter=U`、branch確認、保護パス変更確認。
- 成功判定: 競合なし、意図しない削除・保護対象変更なし、両ブランチの必須契約が維持される。既存失敗や実行環境による未検証は原因・限界とともに記録する。

## 7. リスクと未解決論点

- リスク: package scriptsと`pnpm-lock.yaml`が不整合になると検証／CI入口が壊れる。自動マージされたmainの安全性Hook・CI変更を失うと検証保証が弱まる。
- 未解決の質問: push承認待ちのため、GitHub上の新Head CIは未実施のまま残る。

## 8. 成果物

- 変更ファイル: 実在した競合の解消とmain取り込みに必要なファイル、およびRun Artifact。
- 付随ドキュメント: 本計画とRun Artifact。既存の統合受入条件・チェック状態は更新しない。

## 9. 備考

- GitHub PR #199の最新取得値はopen、`mergeable=false`、Head `6dbbb6516cb91a4ce987cfa299f68bd771a2f0c7`、Base SHA `17de02cd1adfa3b167965d95a61265b4421393fd`。ローカルfetch後の`origin/main`は`ddc451a7`で、共通祖先は`17de02cd`。
- 関連するmain変更は#223（fail-closed security fallback CI）、#226（Run Artifact移行とCodex親子委任）、#227（OpenCode V2の共通Hook）。PR側の差分と統合受入Plan／継続手順は変更境界の判断に使う。
