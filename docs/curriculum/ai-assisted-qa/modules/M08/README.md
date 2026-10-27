# M08：Git・GitHubとレビュー

> **AIチューター**：CodespacesでM08をロードした後に `pnpm course:tutor M08 --model provider/model-id` を実行できます。利用条件を確認して起動し、質問にはToken・API key・個人情報を含めないでください。チューターはM08の公開資料と本人の成果物を読み取り専用で使い、正式評価やファイル変更は行いません。

## このモジュールで学ぶこと

Phase 3の選択受講者向けに、学習用リポジトリ内で変更を安全に記録し、Pull Requestでレビューできるようにします。Phase 1・2の修了にはGit操作は不要です。実習には本人の学習用リポジトリを使い、製品の正式リポジトリや本番Secretを使いません。

## Working treeからPull Requestまで

Working treeは現在のファイル、stageは次のcommitへ含める選択、commitはローカル履歴、branchは変更系列、remoteはGitHub上の共有先です。`git status`で状態を見て、`git diff`で変更内容を確認します。変更ファイルを一括追加する前に、教材と無関係なログ・Trace・認証情報・生成物がないか確かめます。

`workspace/.gitignore`はGitの追跡対象から外すファイルやパターンを指定します。この教材では`/M08/local-only-run.log`だけを除外します。`git check-ignore -v workspace/M08/local-only-run.log`で一致した規則を確認し、`git status --ignored --short workspace/M08/local-only-run.log`でファイルが存在するが通常の変更一覧から除外されていることを確かめます。`.gitignore`は、すでに追跡中のファイルを自動で追跡解除する規則ではありません。対象範囲を確認してから必要なファイルだけstageします。

Phase 1・2の作業成果物は引き続きignoreされ、Git操作なしで提出できます。Phase 3を選び、M07で完成させた同じspecをPR/CIへ渡す場合だけ、対象を一つずつ確認して追加します。`workspace/.gitignore`の`/M07/`により、`workspace/M07/repaired-assertion.spec.ts`も通常はignoreされます。まず`git check-ignore -v workspace/M07/repaired-assertion.spec.ts`と`git status --ignored --short workspace/M07`で規則と対象を確認し、specの内容にログ、Trace、Secret、個人情報、不要な生成物がないことを読んで確かめてください。その後、次のように**このspecだけ**を追加します。

```bash
git add -f -- workspace/M07/repaired-assertion.spec.ts
git diff --cached --name-only
git diff --cached --check
git diff --cached -- workspace/M07/repaired-assertion.spec.ts
```

stage後の一覧がこの一ファイルだけであることを確認します。既にstage済みの別差分がある場合も混ぜないよう確認してください。spec内の相対importは変更せず、ローカル実行とPhase 3 CIの両方で`PLAYWRIGHT_TEST_ROOT: workspace/M07`を指定して同じファイルを対象にします。M07のファイルを一括して強制追加してはいけません。

練習の流れは「変更→status→diff→必要ファイルのみstage→差分再確認→commit→個人remoteへpush→PR作成」です。各段階の状態を確認します。PRには目的、仕様/Case ID、変更したspec、実行コマンドと結果、未確認事項を書き、同じSHAに対応する根拠を示します。

### 学習用リポジトリで一件ずつ記録する

次はPhase 3を選び、本人の学習用リポジトリと共有先の権限を確認した後の例です。リポジトリ直下のターミナルで`git status`を読み、既存の変更や現在のbranchを確認します。練習用branchがまだなければ`git switch -c practice/course-review`で作成できます。同名branchが既にある場合は内容を確認し、別名を選びます。

練習前に`git status --short`と`git diff --cached --name-only`を実行します。既存の差分やstage済みファイルが見つかったら、stash・reset・削除で片付けず、教材用の変更へ混ぜないよう作業を止めます。空であれば`git switch -c practice/m08-review`で学習用branchを作り、`git branch --show-current`で移動先を確認します。同名branchがある場合は、別名を使う前にそのbranchの履歴と状態を確認してください。

`workspace/M08/review-candidate.md`を編集したら、`git diff -- workspace/M08/review-candidate.md`で差分を読みます。このファイルだけを`git add -- workspace/M08/review-candidate.md`でstageし、`git diff --cached --name-only`と`git diff --cached`で対象と内容を再確認します。意図しないファイルがある場合はcommitを進めず、何がstageされたかを確認します。問題がなければ`git commit -m "学習用レビューを記録"`で記録し、`git status`と`git log -1 --oneline`で状態を確認します。

共有する際は`git remote -v`で本人の共有先を確認し、許可されたbranchをその共有先へpushします。GitHub上ではbaseとhead、変更ファイル、PR説明を確認してから作成します。認証エラーや権限不足はSecretを貼り付けて解決しようとせず、権限と認証方法を確認します。commitやPRを作っただけでは、対象のテストが実行されたことにはなりません。

## AIレビューの採否

AIの指摘は対象diff、正式仕様、実行証拠に照らします。正しい指摘は採用し、誤った指摘は根拠とともに退けます。意図しない全面整形や必要性のない抽象化は採用しません。指摘数は品質の尺度ではありません。

### 仕様・差分・テストと証拠を結び付ける

PRレビューでは仕様IDから変更したdiff、対象テスト、同じ変更を検証したRun/結果へたどれるようにします。実行していない項目は未実行とし、確認範囲と残る不明点も添えます。AIの要約だけでは、diffやテストが仕様を満たす根拠になりません。

## 演習と提出

`workspace/M08/review-candidate.md`のTODOを補い、`workspace/M08/local-only-run.log`が合成メモで実行証拠ではないことを確認します。練習用branchを作り、前者だけをstageしてcommitします。`status`、`diff --staged`、commit後の履歴を確認し、後者が変更・stage・commitに含まれていないことを示します。次にCase ID・仕様根拠・対象spec・実行状態を含むPR説明を作成し、AI指摘を根拠で評価します。pushやPR作成はこの練習では行いません。実際の共有操作は個人用学習リポジトリの権限が確定した実地工程で行います。

Phase 3を選ばない場合は、上記のM07 spec追加やGit操作を行わずにPhase 2を終了できます。

提出は `workspace/M08/submission.md` に状態遷移・差分・レビュー根拠を記録します。GitHubアカウント権限やRunner利用可否を教材内で成功済みと扱いません。

開始時にM07の本人handoffを使えない場合は、M08専用の`inputs/M08/public-sample-*`一式を参照します。このサンプルには動作確認済みspec、Config・依存・Resetの出典とrevision、実行条件と結果を含みます。`course:load M08`はそれらを`workspace/M08/public-sample/`へ配置し、M07をロードしたり、その成果物を修復・上書きしたりしません。M08用Configはこのmodule-local sampleだけを対象にします。

## 確認と復習

[M08クイズ](../../quizzes/M08.json)でWorking tree、stage、commit、branchの違いを復習します。誤答した概念は変更ファイルが2つある別例でstage対象を選び直します。

## 参考

- [M08の学習項目](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 3評価基準](../../../../../training/ai-assisted-qa-course/assessment/phase-3-rubric.md)
- [開始・終了状態契約](../../../../../training/ai-assisted-qa-course/states/M08/start.json)
