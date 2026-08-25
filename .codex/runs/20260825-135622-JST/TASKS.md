# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. 最新`origin/main`、branch、PR template、AGENTS.mdの変更位置を確認する
- [x] 2. B用Runとplanを初期化する
- [x] 3. `AGENTS.md`へPR日本語運用ルールを追加し、既存templateを最小修正する
- [x] 4. JSON parse、Markdown lint、format、diff check、sanitizerを実行する
- [ ] 5. branch safetyを確認し、変更ファイルだけをcommit・explicit refspecでpushする
- [ ] 6. 日本語の別PRを作成し、metadataと未merge状態を確認する
- [ ] 7. Run Artifactをfinalizeし、完了判定を記録する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. 最新mainに`.github/pull_request_template.md`があり、英語の固定見出し・説明コメントを持つため、矛盾する部分だけを日本語化する。

## Blocked

- なし

## 完了時の責務

- BのPRは`AGENTS.md`と既存PR templateの運用文書変更だけを含める。
- PR作成後のremote CI結果は、Run Artifactへ書き戻すためだけの追加commitを作らず、PR metadataを正本として扱う。
