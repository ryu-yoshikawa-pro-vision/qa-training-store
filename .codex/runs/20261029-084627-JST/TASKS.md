# Tasks

## Now
- [x] 1. branch、HEAD、開始時status/stat/diff checkで指定17ファイルと初回findingを確認する。
- [x] 2. 保存計画とRun artifactを用意し、検証入口と関連Contractを特定する。
- [x] 3. 必須ゲート、型/lint/format、カリキュラム関連Contractを実行して記録する。
- [x] 4. 対応可能なfailureを指定範囲で修正し、該当検証と全必須ゲートを再実行する。
- [x] 5. 章・目標・quiz anchor・図解・workflow契約・最終差分を確認して報告する。

## Discovered
- 初回git diff --checkはM09のログ例1行とM10のMarkdown改行用末尾空白を検出。M10は行末空白をCommonMarkの明示的改行に置換し、表示を保持する。
- knowledge-graph.jsonのlesson_sections 51件がv08の見出しと不一致。各目標を現行の該当見出しへ更新し、validatorで全件を確認。
- 既存curriculum Contractは旧章見出し・説明文・目標形式を想定し、distribution ContractはArtifact pathを広く許していた。v08の見出し・全目標IDと評価器が要求する2 Artifactの厳密な契約を検査するよう更新。
- quiz review_path 12件は章内の広い見出しを指していたため、設問に直接関係する説明へ更新し、対象IDごとの見出し期待値をContractで固定。
- WindowsのContract fixtureでjunction作成がEPERM。fixtureをsymlink不要なNODE_PATH解決へ変更し、TEMP/TMPをnode_modules外に置いてNode 22のTypeScript loader誤解釈も解消。
- ブラウザ寸法検査で既存SVG 23件が幅0で描画されると判明。共通Markdown rendererの画像リンクと画像をblock/100%幅にし、全11章で正の描画寸法を確認。

## Blocked
- GitHub Actionsは依頼内で事前承認がないため起動せず。ローカル検証は完了。ActionsのPR head上の実行結果は未確認。
