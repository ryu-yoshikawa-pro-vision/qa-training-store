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

## 理解ノード別の確認

既存の演習と提出物を利用して、次の能力を別々に確認してください。本人が実行していない操作を完了と報告せず、未確認を明示します。

- **K-M08-05**：ローカルbranch・commit・push・PR・CIを区別して未実行の操作を完了扱いしない

## 反復実践：別の差分と安全なレビュー判断（P01〜P06）

基礎課題の1回目のcommitを終えた後、**別の変更を自分で作り、選択的stageをやり直す**演習です。本人の練習branchだけで操作し、他人の変更や既存の未コミット差分を勝手に破棄しません。push/PR作成はM10の実地課題です。

1. **P01 2回目の変更を作る（M08-01・02）**：`review-candidate.md`に「このレビューで未確認のCaseとRun」を1行追加します。別の練習用メモ`workspace/M08/private-note.md`には公開してはいけない**架空の無害なマーカー**を書きます（実Secretは禁止）。`git status --short`で2ファイルの違いを確認します。**証拠**：本人のdiffと、公開しないファイルの理由。
2. **P02 必要な変更だけをstage（M08-02）**：`git add -- workspace/M08/review-candidate.md`だけを実行し、`git diff --cached --name-only`と`git diff --cached --check`で差分を検証します。private-noteを追加したりcommitへ含めたりしません。**証拠**：stage前後のファイル一覧と除外理由。
3. **P03 誤ったstageを想定して停止（M08-02）**：**架空の例**として、stage済み一覧に`workspace/M08/private-note.md`が含まれていた場合を検討します。既存の追跡対象を消さずに何を確認するか、誰に確認するか、commitしない条件を書きます。実際のSecretや他者ファイルで危険操作を試しません。**証拠**：禁止条件と安全な復旧方針。
4. **P04 2つ目のcommitを検証（M08-01・03）**：stageが期待どおりのときだけ学習用の2回目のcommitを作成し、直前のcommitと内容・SHAを比較します。作業treeに公開しない練習メモが残る場合、cleanと誤記しません。**証拠**：`git log -2 --oneline`、`git show --stat HEAD`、残る未追跡ファイル。
5. **P05 AIからのPRレビューを採否（M08-04）**：架空提案A「Run未実行でもCI成功と書く」、B「仕様IDと実際のRun IDをPR説明に対応付ける」を比較します。どの事実を根拠に採用・拒否するかを、実`diff`と本人のRunに照らして記録します。**証拠**：2提案の採否と修正文。
6. **P06 第三者への引継ぎをやり直す（M08-03）**：2回目のcommitの差分だけに限定したPR説明草稿を作り、最初のcommitの変更や未実行CIと混同していないかレビューします。M09へ渡す対象ファイル、依存、Run、未確認事項を具体化します。**証拠**：新旧のPR草稿とM09への引継ぎ。

**完了条件**：2回目の小さな変更を本人が選択stageしてcommitしたことを確認します。ローカルcommit、実際のpush、PR、CIを別状態として記録してください。
