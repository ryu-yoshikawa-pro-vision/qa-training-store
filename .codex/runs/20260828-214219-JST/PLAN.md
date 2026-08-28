# Plan

## Objective

PR #77（`feat/web-docs-publishing`）へ、`docs/plans/2026-08-28_web-docs-publishing.md` の設計をそのまま実装し、既存の Expo Web `dist/` 配信から Specification と Test Automation Curriculum を閲覧可能にする。

## Scope

- In: 最新 `main` の安全な取り込み、Markdown renderer の最小共通化、Docs build、Curriculum のリンク／画像 resolver、`build:web` 接続、静的サーバーの directory index／MIME 対応、既存 smoke への Docs 検証追加、プラン指定の validation。
- Out: Markdown／画像正本の移動・複製、Docs framework、専用 CI／server／画像 pipeline、Expo Router 出力方式変更、Scenario Shop shell／navigation 変更、`.github/workflows/ci.yml` 変更、merge／auto-merge／close。

## Assumptions

- PR #77 の base は `main`、作業対象は `feat/web-docs-publishing` とする。
- プラン記載の変更対象以外は変更しない。main 取り込みで更新された既存依存関係・文書正本は保持する。
- Docs は `build:web` 後の `dist/` artifact として検証し、通常の `pnpm start:web` 対応は行わない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーが対象、契約、停止条件、検証、PR運用を明示している。
- 仮定してよい細部: 既存 renderer／static server の現在構造に沿った局所的な関数移動と resolver 注入。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `buildSpecSite({ outputDir })` を維持したまま、汎用 Markdown 描画だけを `scripts/spec/markdown.ts` へ移動すれば Specification と Curriculum を共通 renderer で生成できる。
- H2: `dist/docs` のみを生成前に更新し、既存静的サーバーへ directory index と `.jpg`／`.jpeg` を追加すれば、Docs と既存 SPA fallback を同居できる。

## Research Plan

- Round 1 Query: 最新 `main` 取り込み後にプラン、対象 scripts、package scripts、既存 validator、smoke、Markdown／画像参照を再確認する。
- Round 2 Query: 実装後に diff、resolver の全 `renderInline()` 経路、生成 artifact、serve 経路、validator／build／smoke を確認する。
- Exit Criteria:
  - H1／H2をコードと実行結果で支持できる。
  - プランの Stop 条件に該当せず、完了条件と指定 validation が満たされる。

## Approach

1. branch／working tree／PR headを確認し、`origin/main`をfetchして安全にmergeする。
2. 取り込み後に正本 Markdown／画像記法、renderer、build、server、smokeを再調査する。
3. プラン指定の対象ファイルだけを最小差分で実装する。
4. validator、build、standalone Specification build、既存／Docs smoke、artifact／リンク／画像／SPA routeを検証する。
5. 差分と禁止対象を確認し、必要なら commit／明示 refspec push して PR #77 をレビュー可能な状態にする。PRはmergeしない。

## Definition of Done

- プランの完了条件を満たし、`build:web`／`build:docs`／`build:spec`、既存 validator、既存 Storefront smoke、Docs smokeが成功する。
- Specification と Curriculum の directory index、HTML、画像、リンク、既存 SPA routeが指定どおり動作する。
- 既存 `buildSpecSite()`／`build:spec`／`output/spec-site`、`app.config.ts` の `web.output: "single"`、既存 shell／CIを壊さない。
- scope外差分、Stop 条件、未解決の validation failureがない。Run artifactをsanitizeして保存する。

## Risks / Unknowns

- main の Curriculum／Specification 更新が実装前または最終検証前に入る可能性があるため、最終検証前に最新 `main` を再確認し、必要なら再度取り込む。
- 共通化時に `renderInline()` 経路の resolver 漏れや Specification 固有処理の変更が起きるリスクがあるため、呼び出し箇所と既存 build の両方を確認する。
- Web smoke／Cloudflare Preview が環境要因で実行不能な場合は、原因と未実施範囲をRunと最終報告へ記録し、プランのStop条件と区別する。

## Thinking Log

- 2026-08-28 21:42 JST: 既存の同日Runは別branch（PR #75）で完了済みであり、本タスクのactive Runではないため、新規 Run `20260828-214219-JST` を作成した。
- 2026-08-28 21:42 JST: PR #77 はOPEN、headは `feat/web-docs-publishing` と一致し、開始時のworking treeはcleanだった。ユーザー指定の既存プランを実装SSOTとして扱う。
- 2026-08-28 22:26 JST: Cloudflare Pages Previewは`.html`要求をextensionless URLへ308 canonicalizeするが、生成HTMLのhref、`dist/docs`のindex／asset配信、ページ本文は成立している。生成リンクの`.html`契約を変更せず、deployed smokeのURL確認だけをCloudflare canonical URLとローカル静的サーバーの両方に許容する最小修正を採用した。プランのStop条件（index／assetsが配信不能）には該当しない。
