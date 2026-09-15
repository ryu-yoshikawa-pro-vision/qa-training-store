# 計画

## 目的

- PR #151の同一branch・同一PRを使用し、前回の軽微な校正中心の差分を見直して、カリキュラム・仕様文書を自然な日本語へ再修正する。

## 対象範囲

- 対象: 前回PRのカリキュラム25、中核仕様37、`docs/spec`のtemplate除外21の計83文書、今回のplan・Run Artifact・PR本文。
- 非対象: Product Code、Test、Training実装、設定、依存関係、workflow、CSV列・ID、ADR・過去Run。

## 前提

- `Rubric`、`Native specialization`、`Common route`、`Minimum Evidence`などは、機械契約でない人間向け説明を文脈単位で日本語化する。
- `tests/contracts/training-curriculum.test.ts`が直接検査する2つのrubric固定文字列、ファイル名、formal heading、BR / AC、コード、path、URL、ID、設定値は保持する。
- 同じ意味の助詞・語順変更など、読みやすさへの寄与が乏しい前回差分は`origin/main`相当へ戻し、必要な改善だけを再適用する。

## 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザー指示に対象、保持条件、同一PR、完了条件が明記されている。
- 仮定してよい細部: 固定値の直接参照をコード・validator・テスト・ファイル形式で確認し、人間向け説明だけを日本語化する。
- 未回答の重要質問: なし。

## 仮説

- H1: 固定値をコード・validator・テストで先に分類し、人間向け文を文書単位で書き直せば、自然な日本語と機械契約を両立できる。
- H2: 前回差分を一度baseと比較して軽微変更を戻し、必要な文だけを再追加すれば、差分のノイズを減らしながら意味のある改善を示せる。

## 調査計画

- Round 1: PR #151、branch、Run/ADR、対象83文書、package/workflow/validator、固定文字列の参照を確認する。
- Round 2: 文脈ごとの一般語・技術用語・正式名称・固定値を分類し、前回diffを文書単位でレビューする。
- Exit criteria: 主要な英語混じり一般語を日本語化し、意味不変条件とvalidatorをPASSさせ、同一PRの最新headで必須CIを確認する。

## 進め方

- 1. 調査結果と計画を確定する。
- 2. 前回の軽微な文書差分を戻し、カリキュラムを優先して文脈単位で再修正する。
- 3. 中核仕様・`docs/spec`を修正し、固定契約を保持する。
- 4. diff、不変条件、Markdown、spec、curriculum、docs build、標準verifyを検証する。
- 5. Run Artifactをサニタイズし、同一branchへcommit・push、PR #151本文更新、最新CI確認を行う。Mergeは行わない。

## 完了条件

- 一般語の英語混じり表現が自然な日本語となり、Rubricは評価基準、Native specializationはモバイルアプリ自動化の選択課程として受講者に理解できる。
- 要件、条件、強さ、順序、数値、ID、参照、formal literal、固定文字列を保持する。
- 対象文書のformat/lint、spec/curriculum validator、docs build、diff check、不変条件、Run sanitizerがPASSする。標準verifyの既存問題は原因を分離して記録する。
- commit・push後のlocal/remote/PR headが一致し、PR #151がopen・未merge、`Web CI`と`Mobile App CI`が最新headでsuccessとなり、PR本文に結果を記録する。

## リスク / 未解決

- 一括置換でコードや固定値を壊さない。`Required`の強さを弱めない。CommonとNative選択課程の境界を変更しない。
- 不明点は固定値・正式名称・人間向け一般語の分類で解消し、意味を推測して仕様を改変しない。

## 判断ログ

- 2026-09-14 18:06 JST: PR #151の再修正指示を読み、同一branch・同一PR、自然な日本語化、軽微差分の整理、意味保存、検証、commit・push・CI確認を今回のDoDとした。
- 2026-09-14 18:06 JST: `tests/contracts/training-curriculum.test.ts`のrubric固定文字列と、validatorが確認するファイル・C/Level・Instructor固定項目を確認した。人間向け本文と機械契約を分離する。
