# Plan

## Objective
- 添付のUIレビュー修正指示を、既存のDesign System・業務ロジック・テスト契約を維持したまま実装し、指定された回帰検証を完了する。

## Scope
- In:
  - `ResourceTable`の行見出し指定と列Alignment共通化、および全利用箇所の必要最小限の指定。
  - 商品一覧Filterの900px Media Query同期。
  - 管理テーブル操作ボタンの44px Touch Target。
  - Inter／Noto Sans JPのローカルBundle。
  - Visual ReviewのStage必須・Viewport単位上書き防止・CI Artifact保存。
  - Component／E2E／Accessibilityの追加検証。
  - Run Artifact、指定された必須Regression Test。
- Out:
  - Domain、Application、Database、Seed、Route、権限制御、価格・Cart・Payment・Inventory・Order状態・Review集計の変更。
  - 既存Design Conceptの再設計、外部Font CDN、Git／GitHub操作、過去Before画像の再生成、無関係なLint Warning修正。
  - ユーザーが変更対象外と指定した`docs/**`、および履歴済みRun Artifact。

## Assumptions
- `output/ui-review/before`は過去の証跡として扱い、現コードで再生成・上書きしない。
- CIの3 Projectは同一Stageを使うため、Stage全体ではなくViewport Folder単位でPNG衝突を検査する。
- `ResourceTable`の既存文字列Columnは`start`、既存の行見出し既定値は`0`として後方互換性を保つ。
- 既存のPlaywright Scenario／fixture／Routeと現在のCSS境界を正本とする。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。修正指示に対象・仕様・DoD・検証コマンドが明示されている。
- 仮定してよい細部: Fontsource CSSの共通Entry Point、既存ResourceTable利用箇所の列名に基づくAlignment指定、既存E2Eの最小追加位置。
- 未回答の重要質問: なし。

## Hypotheses
- H1: `ResourceTable`のColumn定義とRow Header IndexをComponent内で正規化すれば、管理画面全体の意味構造とAlignmentを局所変更で統一できる。
- H2: `matchMedia`の初期値と`change` listenerを共存させれば、同一Breakpoint内の手動開閉を維持しつつ境界遷移だけ同期できる。
- H3: UI Reviewの衝突検査をViewport単位へ限定すれば、Stage上書きを防ぎながらCIでDesktop／Tablet／Mobileを順次保存できる。

## Research Plan
- Round 1: ResourceTable、管理画面利用箇所、Catalog Filter、global CSS、Font entry、UI Review、CI、関連Testをread-only調査する。
- Round 2: 調査結果をもとに変更順・safe change surface・検証コマンドを確定し、最小差分で実装する。
- Exit Criteria:
  - 全ResourceTable利用箇所と数値／Action列の影響範囲が確認できている。
  - UI Reviewの現Stage／出力構造とCI実行順の衝突条件が確認できている。
  - 指示された必須Testを実行し、未実行または失敗を明示できる。

## Approach
1. 既存コード・テスト・CI・Runを調査し、開始状態を記録する。
2. `ResourceTable`と管理画面の意味構造／Alignmentを更新する。
3. Filter同期、Touch Target、Font Bundleを実装する。
4. Component／E2E／Accessibility／UI Review Harness／CI Artifactを更新する。
5. Format、Lint、Typecheck、各Test、Build、順次UI Reviewを実行し、失敗はboundedに修正して再検証する。
6. 差分が制約内であることを確認し、Run Artifactへ根拠を残す。

## Definition of Done
- 添付指示の完了条件を満たし、既存Domain／Application／Database／Seed／Route／権限制御に差分がない。
- `ResourceTable`、Filter、Touch Target、Font、Visual Review、CI Artifactに対応するTestまたは検証証跡がある。
- 実行していない検証をPASSと報告しない。
- Git／GitHub操作を行わず、過去Before画像を再生成しない。

## Risks / Unknowns
- 既存コードに直前のUI改善差分があるため、共通CSSの最終有効Ruleを直接修正し、不要な大規模整理を避ける。
- FontsourceのExpo Web処理や依存解決が環境依存の場合は、まず既存Build構成に沿うローカルBundleを確認する。
- `output/ui-review`に既存PNGがあるため、検証用Stageは一意名を使い、衝突時に削除せず失敗させる。

## Thinking Log
- 2026-07-28 08:16 JST: `AGENTS.md`、Project Context、ADR README、直近Run、修正指示を確認した。`new-run.sh`はCRLFで失敗するため、今回Runは手動初期化する。
- 2026-07-28 08:16 JST: ユーザーの`docs/**`変更禁止と、Run Artifact保存必須を両立するため、計画・進捗は`.codex/runs/`へ保存する。
