# M08 実技：差分を選んでレビュー可能にする

## 入力

開始サンプルのファイル変更を個人学習用リポジトリで扱います。公開対象と個人情報・Secret・生成物の境界を守ります。

## 手順

1. `git status`でworking treeを読み、branchと現在位置を確認します。
2. `git diff`で変更理由、削除、無関係な差分を確認します。
3. 適切なファイルだけstageし、`git diff --staged`を再確認します。
4. commit messageに目的を表し、変更範囲を短く説明します。
5. PR案では仕様ID、コード、テスト、未確認事項を対応付けます。AIレビューは根拠とdiffで採否を決めます。

## 提出物

`workspace/M08/submission.md`にstatus/diff/staged diff、選択理由、レビュー指摘の採否を記録します。pushやPR作成は本人のリポジトリ・権限に従います。
