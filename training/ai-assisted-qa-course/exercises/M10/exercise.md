# M10 実技：対象SHAに結び付くCI証拠

## 入力

M07のテスト、M09の無効化workflow見本、PR上の練習差分を使います。workflowを有効化する前に対象、権限、変更範囲を確認します。

## 手順

1. workspace外の変更、Secret、不要ファイルを含まない差分を選びます。
2. 対象specだけを動かすworkflow案を作り、permissions: contents: read、Secretなし、deployなしを確かめます。
3. ローカルとCIで異なるNode、Browser、環境変数、並列性を記録します。
4. Artifact内のtarget-sha.txtが現在のPR HEADと完全一致すること、CheckとArtifactが同じRunに属することを確認します。
5. CI-only failureとspec failureをログで分け、再実行の理由と採否を報告します。
6. AI提案の変更と人が確認した範囲、未確認事項を記録します。

## 提出物

`workspace/M10/submission.md`にdiff、workflow、対象SHA、Run/Check/Artifact、失敗分析、判断と未確認事項をまとめます。
