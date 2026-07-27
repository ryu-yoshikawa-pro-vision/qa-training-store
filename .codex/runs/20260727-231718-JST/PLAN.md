# Plan

## Objective

- 添付参考画像から共通の視覚言語を抽出し、Storefront、customer向け画面、管理画面を、上質・信頼感・見やすさ・使いやすさのある一貫したEC UIへ全面改善する。

## Scope

- In:
  - 全Routeと共通ComponentのUI、レイアウト、レスポンシブ、状態表現、Accessibility
  - 改修前後Screenshotと最低3回のVisual Review
  - UI変更に対する既存Regression Test一式
- Out:
  - Domain Logic、Use Case、計算、状態遷移、Seed、Database、Route、権限制御の変更
  - 新規UI Framework、大規模状態管理、外部Runtime画像、Cloudflare Deploy

## Assumptions

- 参考画像間の差異は、白／暖色系Off White、Dark Navy、控えめなGold、広い余白、商品画像中心の構成へ統合する。
- 既存fixture、seed、Route、権限境界を視覚確認にもそのまま利用する。
- ユーザーから途中確認を求めないよう明示されているため、安全側の局所判断は本Planへ記録して進める。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。目的、優先順位、DoD、禁止事項、Viewport、検証コマンドが明示されている。
- 仮定してよい細部: 既存構成に沿ったComponent分割、画像ごとの差異の統合、重大差分の優先順位。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 共通tokenとprimitiveを先に整備すれば、全画面の色・Typography・Spacing・Focus表現を少ない差分で統一できる。
- H2: 共通shell、Product Card、Form、Table、Status、State Componentを改善すれば、StorefrontとAdminの画面間差を体系的に縮められる。
- H3: 同一Route・Scenario・ViewportのScreenshot比較を3段階以上行えば、Testだけでは検出できない密度、余白、階層、Mobile崩れを修正できる。

## Research Plan

- Round 1 Query: 参考画像、Route、Component、CSS、fixture、E2E、Screenshot基盤、既存Runを調査する。
- Round 2 Query: 代表画面の改修前Screenshotを取得し、画像との差を画面・Breakpoint別に言語化する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある。
  - safe change surface、対象ファイル、検証経路、Visual Reviewの再現手順が確定している。
  - 未解決論点に次アクションがある。

## Approach

- Repo mappingと画像分析を並列で行い、正式Planを`docs/plans/`へ保存する。
- 改修前Screenshotを固定条件で取得する。
- Design token、共通Component、共通shellを先行し、Storefront、customer flow、Adminの順で実装する。
- 初回実装後、同条件Screenshotを取得して比較し、Visual Review後の修正と最終仕上げを含む最低3反復を行う。
- Responsive／Accessibilityと全Regression Testを実行し、Run Artifactへ証跡と未実行事項を記録する。

## Definition of Done

- ユーザー指定のDesign System、Storefront、Admin、Responsive、Accessibility、Regression、Visual Reviewの完了条件を満たす。
- 改修前後Screenshotが同一条件で保存され、最低3回の具体的なVisual Review記録がある。
- 必須検証を実行し、実行していない検証をPASSと扱わない。
- 重大な視覚差分、機能欠落、既存テストの意味変更が残っていない。

## Risks / Unknowns

- 全画面の対象範囲が広いため、共通CSSの意図しない波及を代表画面Screenshotと既存E2Eで継続確認する。
- Auth、Cart、Order、AdminのScreenshot準備には既存fixtureの正確な再利用が必要。
- 外部Runtime画像は禁止されているため、既存local assetの品質と比率を確認し、不足はCSS上の見せ方で補う。

## Thinking Log

- `feature-plan`、`PLANS.md`、planning reference、Project Context、ADR、最新Runを確認した。
- `scripts/new-run.sh`はCRLFによりWSL bashで起動できず、`new-run.ps1`は失敗時cleanupにcommand-based deletionを含むため、標準Artifactを許可された差分編集で初期化した。
- 6枚の参考画像は、白／暖色Off White、Dark Navy、限定Gold、大きな商品画像、Border中心のCard、Dark Admin Sidebarへ統合した。
- Goldの小文字は指定例`#9A752D`でAA Contrastを満たさない背景があったため、同じ色相の`#7A5B22`へ補正した。
- Admin売上ChartはPhase 1の実DTOに存在せず、Mock禁止と業務ロジック非変更を優先して追加しない。実在する発送待ち、低在庫、非公開Review、最近の注文を同等の視覚密度で改善した。
- Visual captureはBefore、Initial、Iteration 2、Afterの4 Stage、各31画面を同一Route／Scenario／Viewportで保存した。
- 最終自己レビューではunresolved High／Medium Findingなし。768〜899pxの固定CTAだけsafe-area補正を追加した。
