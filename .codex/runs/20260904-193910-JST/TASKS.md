# Tasks

## Now

- [x] 1. Git状態、Issue #93、PR #112、規約、レビュー指摘を確認する
- [x] 2. Findingsを`must_fix`／`reject`／`defer`に分類し、allowed filesを確定する
- [x] 3. CSS cascade、E2E helper、関連文書の現行記載を確認し、PLANを確定する
- [x] 4. CSS、既存E2E、Project Context、計画・Run内PR本文を最小差分で更新する
- [x] 5. targeted E2Eとrequired validationを実行する
- [ ] 6. diff、scope、sanitizer、production fix維持を最終確認する
- [ ] 7. 変更をcommit／pushし、PR #112本文を更新する
- [ ] 8. PR #112のcurrent head、CI、review threadを確認してRunを完了する

## Discovered

- D1. `global.css`には同一`.storefront-header`の後段レスポンシブ定義がある。Header自体は今回の変更対象外とし、Review offsetだけをユーザー指定どおり限定する。

## Blocked

- なし
