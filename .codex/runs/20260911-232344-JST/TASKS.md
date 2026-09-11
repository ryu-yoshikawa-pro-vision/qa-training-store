# Tasks

## Now

- [x] 1. 開始時のGit / PR状態を確認し、`BEFORE_SHA`を固定する
- [x] 2. 必須docs、ADR、直近Run、repair-loop、run toolingを確認する
- [x] 3. 新Run `20260911-232344-JST`と今回の追補Planを作成する
- [x] 4. source変更前にEvidence危険Pathの現行通過を再現し、P1-2 / P1-3の問題箇所を記録する
- [x] 5. contract testへ危険な6入力の負例と正当なEvidenceの正例を追加する
- [x] 6. `assertEvidenceReference()`を最小修正する
- [x] 7. P1-2から`src/seeds/metadata.ts`直接読解を外す
- [x] 8. P1-3から`src/seeds/metadata.ts`直接照合を外す
- [ ] 9. focused / standard validationを実行する
- [x] 10. source diffが指定4ファイルだけであることを確認する
- [x] 11. source変更を先にcommitし、`SOURCE_SHA`を固定する
- [x] 12. 新`SOURCE_SHA`でTraining Copy prepare / validateを実行する
- [x] 13. 新Runでmachine-managed local validation Evidenceを取得する
- [x] 14. Evaluation、Sanitizer、living documentation、PR本文を同期する
- [ ] 15. branch safety、non-force push、同一HEAD checks、clean worktreeを確認する

## Discovered

- なし

## Blocked

- B1. `pnpm run test:contracts`のWindows Hook timeoutは今回の変更外の既存環境failure。同一failureを2回確認したため、Hook修正・再試行は停止する。
- B2. source SHA `7180db69ed196c69d04a39a37775d2f38cf7c374`とformat修正後の`d40b2e6183a7421d2d2a53d8de08f38abc2d9467`で、Mobile App CI `Native Static`が同じExpo Doctor patch mismatch（8 package）で失敗した。package / lockfile / Native fileは今回変更しておらず、Native dependency修正は別タスクへ分離する。
