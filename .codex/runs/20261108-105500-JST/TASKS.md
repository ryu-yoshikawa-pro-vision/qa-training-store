# Tasks（タスク）

## Now（現在）

- [x] PR #199の最新HEAD、Plan、既存のWeb/Mobile CI・Artifact・教材E2Eを確認する。
- [x] 配布ZIPとWeb ZIPを検査し、11教材・78問・22状態と版対応の実測結果を得る。
- [x] タブレット幅が未検査の箇所に既存E2Eの検証を追加し、desktop/mobileの既存検証を維持する。
- [x] 変更対象をPR #199の教材用E2Eと本Runに限定し、修正箇所の重複を確認する。

## Discovered（発見事項）

- `Chromium E2E (required)`は`e2e/web/ai-assisted-qa-course.spec.ts`を含み、元HEADで11モジュールの学習ページとクイズ・axe検証が成功。`training-web-baseline`は別の1件のストアフロント検証。
- 同一HEADのWeb ZIPとTemplate配布ZIPは別jobビルドであり、318件の共通byte digestは一致するが、`index.html`とエントリーJSのハッシュは一致しない。

## Blocked（ブロック中）

- 現実のスクリーンリーダー操作は本タスクの自動CIでは実施できない。独立した実操作の結果が必要。
