# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. レビュー指摘、現行branch/PR/Issue/#135/main、Plan、CLI、既存実装を確認する
- [x] 2. bounded repair scope、仮説、検証計画をPLANへ確定する
- [x] 3. clean確認後にorigin/mainを通常mergeし、差分・ADR番号・共存内容を確認する
- [x] 4. TOML構造contract、baseline lifecycle、clean tracked lazy baseline、Stop identityを修正・追加する
- [x] 5. large-input process contractとWindows実Codex runtime canary確認を追加・実行する
- [x] 6. focused／lint／typecheck／verify／差分検証を実行し、FAILを修正する
- [x] 7. PR本文の#135／production rule／レビュー対応記載を更新する
- [x] 8. Run Artifactをfinal commit前状態へ更新・検証し、commit対象を確定する

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
- [x] D1. `pnpm-lock.yaml`に `smol-toml@1.7.0` が存在するため、package manifest上の直接利用可否を確認する。
- [x] D2. `origin/main`はbranchより2 commit先行しているため、merge後にpackage／PROJECT_CONTEXT／ADRの共存を再確認する。

## Blocked

- なし
