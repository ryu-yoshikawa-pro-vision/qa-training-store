# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. branch、working tree、PR head、直近Runを確認しRun artifactを初期化する
- [x] 2. 最新 `main` をfetchし、`feat/web-docs-publishing`へ安全に取り込む
- [x] 3. main取り込み後にプラン、正本Markdown／画像、renderer、build、server、smokeを再確認する
- [x] 4. プラン指定の対象ファイルだけを最小差分で実装する
- [x] 5. resolver全経路、scope、禁止対象、実装差分を自己レビューする
- [x] 6. validator、build、standalone Specification build、artifact確認、既存／Docs smokeを実行する
- [x] 7. mainの並行変更を確認し、必要なら再取り込みして最終検証する
- [x] 8. Run artifactをsanitizeし、commit前のbranch／diff安全確認を行う
- [x] 9. implementation commitを作成し、確認済みrefspecでPR branchへpushする
- [ ] 10. Runをfinalizeし、PR #77をレビュー可能な状態として報告する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] 11. Cloudflare Pagesの`.html`からextensionless URLへのcanonicalizationをdeployed smokeへ反映し、生成リンク契約を維持したままPreview経路を再確認する

## Blocked

- B1. （ブロック時のみ記載）
