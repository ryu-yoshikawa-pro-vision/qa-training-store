# PR #219 Web Case証拠台帳のRun/job・保存Artifact照合

## 確認方法と範囲

[既存Web Case証拠CSV](./2026-11-04_pr219-web-case-run-evidence.csv)の50履歴行／27暫定証拠キー／34列を読み、GitHub Actionsの対象8 Runを固定SHAで確認した。Runの`head_sha`とCSVの`test_commit_sha`、Run配下に存在する`Chromium E2E (cross-role)` job ID、job・workflowの結果区分を**各50行について全件比較し、不一致0件**。すべてRun attemptは1である（現時点のAPI確認値）。SUT列は全履歴でPR #199の旧固定HEAD `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。これは新しい#199/#210の製品HEADでの再実行を意味しない。

| Run | CSV行 | cross-role job | job結果 | workflow結果 | 確認したArtifact |
| --- | ---: | --- | --- | --- | --- |
| [41798882293](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41798882293) | 17 | `126470034417` | failure | failure | `playwright-cross-role-41798882293-1`（ID `13306602054`）あり。ただし失敗を含む旧Run |
| [41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480) | 22 | `126512596197` | success | success | UI Reviewの4幅画像あり。成功時cross-role専用Artifactなし |
| [41821726873](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41821726873) | 2 | `126547309356` | success | failure | UI Review画像あり。cross-role成功時Artifactなし |
| [41824802868](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41824802868) | 1 | `126557496126` | success | failure | UI Review画像あり。cross-role成功時Artifactなし |
| [41826786410](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41826786410) | 3 | `126564385617` | success | success | UI Review画像あり。cross-role成功時Artifactなし |
| [41832718832](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41832718832) | 3 | `126584626212` | success | cancelled | UI Review画像あり。cross-role成功時Artifactなし |
| [41841987928](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928) | 1 | `126617054710` | success | success | Small Mobile UI Review `13329861639`、Desktop UI Review `13329807665`あり。cross-role成功時Artifactなし |
| [41848289866](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41848289866) | 1 | `126638216102` | success | success | UI Review 4幅画像あり。cross-role成功時Artifactなし |

8 Runの中には`web-dist`や`spec-site-automation`もあるが、これらは該当CaseのTrace・動画・Network・DB前後の保存証拠として扱わない。UI Reviewの画像も、別jobで撮影した画面であり、同じRunのcross-role Error/Conflict/Loading成功時の画像と同一視しない。

## 各Caseの観測範囲

- CSVの`expected`・`observed_from_assertion`・`case_result`は当時のassertionを記録する。個別PASSは、正式なBehavior・要件の全条件や製品合格ではない。既知の管理商品選択、ページ残留、Checkout誤復帰、停止staff循環の再現成功は**製品FAILの観測**として区別する。
- 50履歴の`run_id`、`job_id`、テストHEADに食い違いなし。Reset Clockは一部の固定Runで`PR219_RUNTIME_METADATA`の実測、その他はSeedの期待値であり、古い履歴を実測済みに書き換えない。
- CSVの`report_artifact`に記載があっても、ジョブログのURLや説明文字列は**GitHub Artifactそのものではない**。成功時のcross-role Trace・動画・画像・axe JSONは前掲のArtifact一覧から存在を確認できなかった。Console/NetworkはCase終了時の件数ログと詳細データを区別する。
- 50行の`db_before_snapshot`は実物の保存先を示しておらず、`db_after_snapshot`も全Caseの状態実物を保存したものではない。IndexedDB23表不変は専用Caseの前後digest比較assertionで観測できた範囲に限る。個人情報やSession ID、digest実値は記録しない。
- Web専用キー`PR219-WEB-001`〜`027`は固定履歴を追うための**暫定キー**。正式Case IDは#213の採否確定を待つ。208動作中11動作との直接関係を全条件PASSに変換しない。

## #199最終実受入での再開条件

1. #213の正式Case ID/採否と79要件・208動作の対応が確定したら、採用Caseごとに既存50履歴を「旧SUTの部分証拠」として参照し、必須条件と不足分を区別する。
2. #199で共有Playwright workflow・`playwright.config.ts`の成功時Trace/画像/動画/axe JSON、Network、必要な匿名化済みDB前後の**保存とArtifact取得手段**を調停する。#219から共有workflowは変更しない。保存前のログのみではTrace/画像取得済みと扱わない。
3. 必要な#210製品修正・全PR統合後の同一最終HEADで正式Caseを再実行し、Role/Session、Seed/Reset/実測Clock、実際の結果、DB前後、Run/job/attemptとArtifact IDを記録する。失敗・flaky・BLOCKED・未実行は保持し、最終の独立レビューへ渡す。
4. Android端末、SQLite・Navigation・Maestro、実機/エミュレータ画面の実証は#199の最後に行う。既存Native Component/Contractの成功を端末PASSとしない。

**判定**：#219の既存50履歴の参照整合性の確認は完了。証拠不足や最終製品受入の完了を主張するものではない。
