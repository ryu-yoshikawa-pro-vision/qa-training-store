# M08：Git・GitHubとレビュー

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

## AIレビューの採否

AIの指摘は対象diff、正式仕様、実行証拠に照らします。正しい指摘は採用し、誤った指摘は根拠とともに退けます。意図しない全面整形や必要性のない抽象化は採用しません。指摘数は品質の尺度ではありません。

## 演習と提出

`workspace/M08/review-candidate.md`のTODOを補い、`workspace/M08/local-only-run.log`が合成メモで実行証拠ではないことを確認します。前者だけをstageし、`status`と`diff --staged`で後者が含まれていないことを確認します。次にCase ID・仕様根拠・対象spec・実行状態を含むPR説明を作成し、AI指摘を根拠で評価します。実際の共有操作は個人用学習リポジトリの権限が確定した実地工程で行います。

Phase 3を選ばない場合は、上記のM07 spec追加やGit操作を行わずにPhase 2を終了できます。

提出は `workspace/M08/submission.md` に状態遷移・差分・レビュー根拠を記録します。GitHubアカウント権限やRunner利用可否を教材内で成功済みと扱いません。

開始時にM07の本人handoffを使えない場合は、M08専用の`inputs/M08/public-sample-*`一式を参照します。このサンプルには動作確認済みspec、Config・依存・Resetの出典とrevision、実行条件と結果を含みます。`course:load M08`はそれらを`workspace/M08/public-sample/`へ配置し、M07をロードしたり、その成果物を修復・上書きしたりしません。M08用Configはこのmodule-local sampleだけを対象にします。

## 確認と復習

[M08クイズ](../../quizzes/M08.json)でWorking tree、stage、commit、branchの違いを復習します。誤答した概念は変更ファイルが2つある別例でstage対象を選び直します。

## 参考

- [M08の学習項目](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 3評価基準](../../../../../training/ai-assisted-qa-course/assessment/phase-3-rubric.md)
- [開始・終了状態契約](../../../../../training/ai-assisted-qa-course/states/M08/start.json)
