# M09公開handoffサンプル：変更履歴とPRレビュー

この資料は、M08からM09へ渡す前工程契約の**合成公開サンプル**です。実在のGit commit、GitHub PR、CI Run、受講者の修了記録ではありません。`TRAINING-*`識別子はこの教材内だけで使い、実SHAや実URLとして扱いません。

## handoff契約

- artifact ID: `M09-public-handoff-01`
- revision: `M09-public-handoff-v1`
- contract: `M08-to-M09-handoff-v1`
- public: `true`
- predecessor status: public practice data; M08 completion is not inferred

## 変更履歴

| 順序 | 教材内commit ID | branch | 変更 | 理由 |
| --- | --- | --- | --- | --- |
| 1 | `TRAINING-COMMIT-01` | `training/m08-ci-handoff` | `public-sample/review-candidate.md`へ、PRの変更範囲と確認したい点を記録 | レビュー対象と観点を小さく示す |
| 2 | `TRAINING-COMMIT-02` | `training/m08-ci-handoff` | レビュー指摘を受け、CI実行証拠と未確認事項を別欄に分けた | ローカル確認をGitHub ActionsのRunと誤認しないため |

この教材にはGit objectやcommit SHAを含めません。学習者は実習用リポジトリで実際のcommit historyを自分で確認します。

## 合成PR記録

- training PR ID: `TRAINING-PR-M08-01`（架空の教材内ID。GitHubの番号・URLではない）
- title: `CI学習用の実行証拠とレビュー範囲を整理する`
- base: `training/main`
- head: `training/m08-ci-handoff` / `TRAINING-COMMIT-02`
- status: `reviewable, not merged`
- changed files: `public-sample/review-candidate.md`, `public-sample/run-evidence.md`
- scope: 学習用の公開資料のみ。Secret、実行資格情報、正式workflow、学習者の非公開成果物は含めない

## レビューのやり取り

1. 指摘: 「テストが通った」とする記述が、どの環境での実行か分からない。
2. 対応: `run-evidence.md`に対象・実行経路・観測した終了状態を記載し、ホストCI Runが存在しないことを明記する。
3. 判断: 指摘の目的を満たすため採用。未観測のRun/SHA/Artifactを追加せず、PRの変更範囲は公開学習資料に限定した。

## M09で確認する境界

- このhandoffは、branch・変更履歴・レビュー可能なPR記録を読むための入力です。
- 上記のtraining PR記録は合成データです。実在するGitHubのPRやCI証拠として引用しません。
- `inputs/M09/workflow-starter.yml.disabled`は独立した必須演習入力で、このhandoffには含まれません。
- `course/templates/phase3/course-e2e.workflow.yml.disabled`は比較用の安全な完成見本です。starterを有効化したり`.github/workflows/`へ配置したりしません。
- CI Run、Check、Artifactの有無は、演習で別途観測した証拠だけから判断します。
