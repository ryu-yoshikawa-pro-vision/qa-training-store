# M08 実技：差分を選んでレビュー可能にする

## 入力

`workspace/M08/review-candidate.md`と`workspace/M08/local-only-run.log`を使います。前者は提出候補、後者は実行証拠ではない練習用のローカルメモです。公開対象と個人情報・Secret・生成物の境界を守ります。

## 手順

1. `git status --short`と`git diff --cached --name-only`を実行します。作業前から別差分やstage済みファイルがあれば、stash・reset・削除で片付けず、練習を止めて提出物に理由を書きます。
2. 状態が空なら`git switch -c practice/m08-review`で練習branchを作り、`git branch --show-current`で確認します。同名branchがある場合は内容を確認して別名にします。現在のbranchを不用意に変更・削除しません。
3. `review-candidate.md`のTODOを自分の言葉で補います。`git check-ignore -v workspace/M08/local-only-run.log`で規則を特定し、`git status --ignored --short workspace/M08/local-only-run.log`で練習用ログが無視されていることを確かめます。`.gitignore`だけでは既に追跡されたファイルを外せないことも説明します。
4. `git status --short`と`git diff -- workspace/M08/review-candidate.md`で変更、削除、無関係な差分を読みます。`local-only-run.log`は合成メモで、実行証拠・stage・commit対象ではありません。
5. `git add -- workspace/M08/review-candidate.md`でこのファイルだけをstageします。`git diff --cached --name-only`がこの一件だけであること、`git diff --cached --check`と`git diff --cached`で内容が安全であることを確認します。違う場合はcommitせず、何がstageされたかを調べます。
6. 問題がなければ`git commit -m "学習用レビューを記録"`を実行し、`git status --short`、`git log -1 --oneline`、`git show --stat --oneline HEAD`でcommitとclean stateを確認します。`local-only-run.log`がcommitに含まれないことを確認します。
7. PR案では仕様ID、コード、テスト、Run、未確認事項を対応付けます。AIレビューは根拠とdiffで採否を決めます。pushやPR作成はこの実技では行わず、本人リポジトリの権限を確認する実地工程と区別します。

## 提出物

`workspace/M08/submission.md`に作業前のstatus、練習branch、diff/staged diff、commit SHA、commit後のstatus、選択理由、レビュー指摘の採否を記録します。Secret・生成物・`local-only-run.log`がstageまたはcommitに含まれないことを確かめます。pushやPR作成は本人のリポジトリ・権限に従います。
