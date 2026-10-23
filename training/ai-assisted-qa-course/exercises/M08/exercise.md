# M08 実技：差分を選んでレビュー可能にする

## 入力

`workspace/M08/review-candidate.md`と`workspace/M08/local-only-run.log`を使います。前者は提出候補、後者は実行証拠ではない練習用のローカルメモです。公開対象と個人情報・Secret・生成物の境界を守ります。

## 手順

1. `review-candidate.md`のTODOを自分の言葉で補い、`git status`でworking tree、branch、現在位置を確認します。
2. `git check-ignore -v workspace/M08/local-only-run.log`で`workspace/.gitignore`の規則と対象パスを確認し、`git status --ignored --short workspace/M08/local-only-run.log`で練習用ログが存在するが無視されていることを確かめます。`.gitignore`だけではすでに追跡されているファイルを外せない点も説明します。
3. `git diff`で変更理由、削除、無関係な差分を確認します。`local-only-run.log`は実行結果ではなく提出・stage対象にしないことを確認します。
4. `review-candidate.md`だけstageし、`git diff --staged`にそのファイルだけがあることを再確認します。
5. commit messageに目的を表し、変更範囲を短く説明します。
6. PR案では仕様ID、コード、テスト、未確認事項を対応付けます。AIレビューは根拠とdiffで採否を決めます。

## 提出物

`workspace/M08/submission.md`にstatus/diff/staged diff、選択理由、レビュー指摘の採否を記録します。pushやPR作成は本人のリポジトリ・権限に従います。
