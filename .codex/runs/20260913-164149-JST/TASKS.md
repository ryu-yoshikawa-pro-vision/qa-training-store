# Tasks

## Now

- [x] 1. 入口資料、最近Run/ADR、Plan、branch/PR、最新`origin/main`との差分を確認する
- [x] 2. 対象source/testとmanifest fixture前提を調査し、Planどおりの変更境界を確定する
- [x] 3. `Invoke-NativeCommand()`の空配列許可と`Invoke-VerifyCommand()`全6経路のhelper委譲を実装する
- [x] 4. 既存contract testのhelper/fixtureをパラメータ化し、source/runtime contractを追加する
- [x] 5. command textのsuccess/failure full-wrapperをmanifest付きで追加し、verify経路を実際に通す
- [x] 6. Windows固有runtimeとmanifest付きfull-wrapper、`.sh`/defaultを対応条件で検証する
- [x] 7. targeted contract、`test:contracts`、`verify`、`git diff --check`を実行する
- [x] 8. 変更範囲、Plan差異、Run Artifact sanitizer、commit対象を確認する
- [x] 9. Run Artifactをfinal commit前状態へ更新・sanitizer確認し、commit対象を確定する
- [ ] 10. branch safety確認後にcommitし、明示refspecでpushしてlocal/remote/PR headとPR #148本文を確認・更新する

## 実装・変更タスクの完了処理

上記タスク完了後、`AGENTS.md`の実装タスク完了条件に従ってcommit・pushする。

- push後の最新PR headで、`AGENTS.md`で定義された必須CIを確認する。
- CI結果はPR本文とユーザー向け最終報告へ記録する。
- CI結果を記録するためだけにtracked Run Artifactを再commitしない。
- repository working treeのファイルを変更する実装・変更タスクでは、checkbox完了後に`AGENTS.md`の完了条件へ従ってcommit・push・最新PR headの必須CI確認を行う。push後の必須CI確認1件は、最新PR headの`Web CI`と`Mobile App CI`がともに`success`であることを確認し、CI結果をPR本文へ記録する必要がある場合はPR本文の更新まで完了した時点で、ユーザー向けProgressの分子へ加算する。これは新しいTASKS checkboxにはしない。
- 必須CIがfailureの場合は、`AGENTS.md` §8「必須検証」の品質ゲート失敗時の原因調査・修正・停止条件に従う。
- `TASKS.md`のcheckbox完了はfinal commit前のtracked task進捗であり、実装・変更タスク全体の完了を意味しない。
- review-only、plan-only、調査のみ、質問への回答、状態確認のみ、コード変更を伴わない分析ではcommit・push・PR・CI確認を実行しない。
- PR／Issue本文、label、review comment等のGitHub metadataのみを変更するタスクではcommit・push・PR・CI完了条件とProgressのCI加算を適用しない。repository file変更を同時に行う場合は通常の完了条件を適用する。
- ユーザーがcommit、push、PR作成、Git操作を明示的に禁止した場合は、その指示を優先し、禁止された工程を実行しない。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. push後に最新headの`Web CI`と`Mobile App CI`を確認し、必要なCI結果をPR本文へ記録する（TASKS checkboxには追加しない）
- D2. 指定Planに既存のMarkdown lint違反があり、意味を変えない形式修正と再検証が必要になった

## Blocked

- B1. （ブロック時のみ記載）
