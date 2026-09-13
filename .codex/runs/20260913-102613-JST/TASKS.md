# Tasks

## Now

- [x] 1. 保存済みPlanと実装前のbranch/PR/Issue/#135/CLI/source状態を照合する
- [x] 2. Run Artifactへ実装範囲、仮説、禁止事項、検証計画を保存する
- [x] 3. 既存Hook contractの不足分を確認し、scanner/rule schemaとfocused contractを実装する
- [x] 4. session baseline、fingerprint multiset、PostToolUse/Stop Hookを実装する
- [x] 5. local/commit Git比較CLIとrename/comparison failureを実装する
- [x] 6. `package.json`、verify入口、workflow、Harness文書へ最小接続する
- [x] 7. focused/文章品質/contract/lint/typecheck/verify/Windows検証を実行し、FAILを修正する
- [x] 8. 変更範囲、Plan差異、#135/production rule状態、Run Artifact scopeを確認する
- [x] 9. Run Artifactをfinal commit前状態へ更新し、schema/sanitizer/diff checkを通す
- [x] 10. branch safetyを再確認し、commit対象を確定してcommitする
- [ ] 11. 対象branchへpushし、local/remote/PR head一致を確認する
- [ ] 12. PR #146本文を日本語で現行実装へ更新し、最新headの必須CIを確認する

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

## Blocked

- なし。#135依存のcompact再注入は計画上の非実装範囲であり、独立作業は継続する。
