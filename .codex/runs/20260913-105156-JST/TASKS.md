# Tasks

## Now

- [x] 1. branch、working tree、merge state、merge base、PR状態を確認する
- [x] 2. ours／origin/main／merge結果のconflict内容とmain側変更を調査する
- [x] 3. `docs/PROJECT_CONTEXT.md`を両側の意味を保持して解消し、conflict markerを除去する
- [x] 4. ADRを0024／0025へ移動し、現行文書のTrigger Eval参照を限定更新する
- [x] 5. package script、ADR重複、禁止対象、baseline／dataset不変条件を検証する
- [x] 6. focused tests、dataset validation、markdown／skills／repository／verifyを実行する
- [x] 7. Run Artifactを日本語で更新し、sanitizer Write／Checkを実行する
- [ ] 8. branch safetyを再確認してmerge commit／修正をcommitする
- [ ] 9. 明示refspecで通常pushし、PR本文を現在の状態へ更新する
- [ ] 10. push後の最新headでWeb CI／Mobile App CIを終端確認し、最終readbackする

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
- D1. 現在のPR head `e23cd7d`は`origin/main`とのmerge中で、GitHub上のPR状態は`CONFLICTING`だった。解消後のpushで再確認する。
- D2. 実際のunmerged pathは`docs/PROJECT_CONTEXT.md`のみ。`package.json`はmainの`training:web:diagnostic`を含んで自動統合されていた。

## Blocked

- B1. （ブロック時のみ記載）
