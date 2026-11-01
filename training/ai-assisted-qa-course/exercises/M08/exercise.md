# M08 実技：差分を選んでレビュー可能にする

## 入力

`workspace/M08/review-candidate.md`と`workspace/M08/local-only-run.log`を使います。前者は提出候補、後者は実行証拠ではない練習用のローカルメモです。公開対象と個人情報・Secret・生成物の境界を守ります。

## 手順

1. `git status --short`と`git diff --cached --name-only`を実行します。作業前から別差分やstage済みファイルがあれば、stash・reset・削除で片付けず、練習を止めて提出物に理由を書きます。
2. **M08配布済みの未追跡ファイルは存在してよい**ものの、開始前からの別差分・stage済みファイルがなく、対象ファイルを確認できた場合に限り`git switch -c practice/m08-review`で練習branchを作り、`git branch --show-current`で確認します。同名branchがある場合は内容を確認して別名にします。現在のbranchを不用意に変更・削除しません。
3. `review-candidate.md`のTODOを自分の言葉で補います。`git check-ignore -v workspace/M08/local-only-run.log`で規則を特定し、`git status --ignored --short workspace/M08/local-only-run.log`で練習用ログが無視されていることを確かめます。`.gitignore`だけでは既に追跡されたファイルを外せないことも説明します。
4. `git status --short`と`git diff -- workspace/M08/review-candidate.md`で変更、削除、無関係な差分を読みます。**配布直後の`review-candidate.md`が`??`（未追跡）の場合、通常の`git diff`は内容を表示しません。** この場合はファイルを直接開いて全内容を確認し、stage後に`git diff --cached`で実際の追加内容を検査します。`local-only-run.log`は合成メモで、実行証拠・stage・commit対象ではありません。
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
5. **P05 AIからのPRレビューを採否（M08-04）**：架空提案A「Run未実行でもCI成功と書く」、B「仕様IDと実際のRun IDをPR説明に対応付ける」、C「1箇所の小さな変更だけでも将来に備えて共通Factoryと3ファイルへの分割を追加する」を比較します。Cについては、**現状は重複がない1箇所**と、**同じ処理が複数箇所で重複し変更負荷が実証された場合**を別条件として、抽象化の必要性・保守効果・複雑性を判断します。どの事実を根拠に採用・拒否・保留するかを、実`diff`、仕様、本人のRun（未実行なら未実行）に照らして記録します。**証拠**：3提案の採否、Cの2条件の比較理由と修正文。
6. **P06 第三者への引継ぎをやり直す（M08-03）**：2回目のcommit**単独**の差分を使ってレビュー用PR説明草稿を作り、仕様/Case、変更ファイル、対象spec、テスト実行状態、commit SHA、未確認事項を1行ずつ対応付けます。**実際のPR差分はbase→headの比較範囲で決まり、最初のcommitも含み得る**ため、単独commitの草稿を実GitHub PRの全差分と同一視しません。M09へ渡す本人の成果物・依存・Run/未実行・再確認事項を区別します。**証拠**：新旧草稿、比較範囲、対応表、M09引継ぎ。

### P06の比較範囲と証拠（M08-03）

- 2回目のcommit後に`git rev-parse HEAD`、`git rev-parse HEAD^`、`git diff HEAD^ HEAD -- workspace/M08/review-candidate.md`、`git show --format= --name-only HEAD`を**本人の練習branchで読み取り実行**し、2回目のcommitに入った変更だけを確認します。親commitが違う場合や対象ファイル以外が含まれる場合は、そのままPR草稿を確定しません。
- **commit単独の比較**（`HEAD^→HEAD`）と、実PRで使う**base/headの比較**は別物です。実PRを作成していない本演習ではbase/headの実際の差分を確認済みと書かず、仮定と未確認事項を記載します。1回目のcommitがbaseにない場合、実PRにはその変更も含まれ得ます。
- `workspace/M08/submission.md`の対応表には、仕様/Case ID（教材内の架空例ならその旨）、2回目の変更path/diff、関連するテストspec（存在しなければ「なし」）、本人が**実行した**コマンド・結果・Run ID（なければ「未実行」）、ローカルcommit SHA、未決を記入します。学習用サンプルのRunや合成ログを本人のGitHub Actions実Runと混同しません。
- M09へは既存の`workspace/M08/submission.md`（`M08-result-01`）と`workspace/M08/review-candidate.md`（`M08-result-02`）を`M08-to-M09-handoff-v1`の本人成果物として引き継ぎます。branch・commit SHA・変更範囲・参照spec/依存・実Runの有無・未確認事項を記録し、M09では本人の実成果物か`M09-public-handoff-01`の合成サンプルかを明示して選びます。新たな外部PR・push・CI実行は要求しません。

**完了条件**：2回目の小さな変更を本人が選択stageしてcommitしたことを確認します。ローカルcommit、実際のpush、PR、CIを別状態として記録してください。
