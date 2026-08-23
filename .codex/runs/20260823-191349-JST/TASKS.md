# Tasks

## Now

- [x] 1. 必須文書・既存Runを確認し、今回のbounded実験のscopeと禁止事項を確定する
- [x] 2. branch、canonical remote mainのbehind、working tree、Node/pnpm、dependency before hashを確認する
- [x] 3. H1/H2、CASE P/N、no-op/check/writeの回数制限、復元方法をPLANへ記録する
- [x] 4. canonical lockfileをno-opで一時生成し、semantic comparisonを行う
- [x] 5. Prettier check/writeを各1回実行し、A/B/Cを比較してCASEを判定する
- [x] 6. baselineへ復元し、audit、Alert #5、final dependency diff、未実行validationを記録する
- [ ] 7. Run Artifactをfinalizeし、Sanitizer、Markdown lint、commit/push、PR CIを確認する

## Discovered

- 既存RunでCandidate 1〜4とno-op実験は完了済みであり、今回のRunでは再実行しない。
- 今回のmutation対象は一時的な`pnpm-lock.yaml`だけで、最終変更対象は新Run Artifactのみとする。

## Blocked

- なし（Alert #5自体は実験後も`IN_SCOPE / BLOCKED`として記録する）。
