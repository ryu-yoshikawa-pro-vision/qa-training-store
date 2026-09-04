# Plan

## Objective

- Issue #96の対象である既存BreadcrumbのPresentationを、既存の共通 `Breadcrumbs` componentと1つの共通CSS定義へ集約する。

## Scope

- In: Catalog、商品詳細、Cart、注文詳細の手書きBreadcrumb置換、既存共通Componentの再利用、重複Breadcrumb CSSの整理、必要最小限のsemantic／a11y／responsive test。
- Out: Breadcrumb階層・表示有無・Route情報・Route生成・Category階層・Guideへの新設・長文全般のoverflow・Header/Footer・Navigation Architecture。

## Assumptions

- `src/presentation/patterns/admin-patterns.tsx` の `Breadcrumbs` が既存の共通Presentationの正本であり、ファイル移動や新規Navigation APIは不要。
- 基準Presentationは既存の最終表示に合わせる（14px、line-height 22px、8px grid spacing、muted link/current、8px bottom spacing）。
- Global `:focus-visible` は共通Keyboard Focus契約として維持し、重複する専用outlineは追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Issue本文と既存repo contractで目的・範囲・DoDが確定している。
- 仮定してよい細部: 既存Componentのpropsへ各consumerの現在のhref／labelを1対1で渡す。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 画面間のmarkup差は、手書き4画面と既存共通Componentの二系統実装が並存していることから生じている。支持根拠はconsumer inventoryと既存Componentの構造比較。
- H2: spacing／link色の不整合は、`global.css` の同一selectorに対する基礎定義・後段margin上書き・link色上書きが分散していることから生じている。支持根拠は `.breadcrumbs ol` 3箇所と `.breadcrumbs a` 1箇所の現行定義。
- H3: Keyboard Focusはglobal `:focus-visible`で担保されているため、markup置換とCSS整理でこの規則を削除しなければ回帰しない。focused a11y testで確認する。

## Research Plan

- Round 1 Query: Issue本文、branch／main差分、全Breadcrumb consumer、既存shared component、CSS cascade、component／E2E／a11y testを確認する。
- Round 2 Query: consumerのhref／順序／current表現を既存Component propsへ対応付け、最小diffと検証assertionを確定する。
- Exit Criteria:
  - すべてのBreadcrumb consumerと二系統化の原因を特定できている。
  - 変更対象がPresentation consumer、共通CSS、必要なtestに限定されている。
  - Navigation／a11y／responsiveの保存契約とvalidation commandが明文化されている。

## Approach

- repo mappingと計画を保存済み。次に、手書きconsumerを既存 `Breadcrumbs` へ置換し、CSSの重複上書きを共通定義へ統合する。
- semantic component testと既存のAccessibility／responsive E2Eを使い、desktop・compact、focus、label、href、current itemを確認する。
- 最後に標準quality gate、`verify`、scope review、artifact sanitizer、branch安全確認後のcommit／push／OPEN PR作成まで行う。
- 標準フロー: `PLAN -> Issue／repo調査 -> TASKS -> 実装 -> focused validation -> quality gate -> REPORT`

## Definition of Done

- 既存11画面（管理／レビュー系を含む）のBreadcrumbが共通 `Breadcrumbs` markupを利用する。
- Typography、spacing、separator、link/current表示が共通CSSで定義される。
- `aria-label="パンくず"`、semantic list、link href、current `aria-current="page"`、global focus-visibleを維持する。
- Breadcrumb階層・表示有無・Route生成・既存遷移先に変更がない。
- focused／標準validationがPASS（または原因分類と停止条件を記録）し、`git diff --check`もPASSする。
- self-review、commit、push、OPEN／non-Draft PR、PR本文の`Closes #96`確認が完了する。

## Risks / Unknowns

- `Breadcrumbs` 置換でhref・item順・currentを取り違えるリスクは、既存markupを配列へ1対1移行し、component／page／E2E assertionで抑える。
- CSS削除で意図しない変更を出すリスクは、`.breadcrumbs` selector以外を変更しないことで抑える。
- E2Eの認証／server依存は、最初の異常・baseline・環境制約を分離してREPORTへ記録する。
- 追加の未解決論点はない。

## Thinking Log

- 2026-09-04 JST: branch確認は `fix/breadcrumb-presentation` で成功し、切り替えは行わない。
- 2026-09-04 JST: Current `main` とbranchは同一HEADで、Issue #96の実装差分は未着手。
- 2026-09-04 JST: 既存の `Breadcrumbs` を新規componentへ移動せず再利用する方が、IssueのPresentation scopeと既存architectureを保ち、unrelated refactorを避けられると判断した。
