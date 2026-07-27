# Plan

## Objective
- 貼り付け仕様の順序と制約に従い、既存 Phase 1 を最小差分で正常に検証・利用できる状態へ仕上げる。

## Scope
- In:
  - Typecheck、共通 Test Clock、Reset 後 reload、環境別 build/Test API、Logout、package scripts、a11y、商品画像/Seed、Home Hero、CSS/文言、関連テスト、CI。
- Out:
  - 貼り付け仕様の「対象外」すべて、Git/GitHub 操作、Cloudflare Deploy、既存 Route/レイヤーの全面変更。

## Assumptions
- 依頼文に列挙された完了条件を仕様の source of truth とする。
- 既存の設計・テスト規約に沿う局所的な詳細は、安全側の既定として決定する。
- repo mapping 完了後に安全な変更面と詳細な実行順を確定する。

## Questions / Ambiguity
- 必ず質問する不透明点: 現時点ではなし。
- 仮定してよい細部: テストの配置、共通 component の props、SVG の描画詳細。
- 未回答の重要質問: なし。

## Hypotheses
- H1: Typecheck の初期失敗は CSS side-effect import の型宣言追加で解消できる。
- H2: browser bootstrap で単一 RuntimeClock を生成し、既存 service/use case へ注入すれば時刻源を統一できる。
- H3: Reset UI の reload と build-kind allowlist により、DB 参照と production Test API の問題を局所修正できる。

## Research Plan
- Round 1 Query: entry points、application/bootstrap/test-control、CI/package、presentation、seed/image、既存 tests を repo 内で mapping する。
- Round 2 Query: read-only custom agents のコード・実装・テスト観点を統合し、未知点を追加確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある。
  - Entry points、Main flow、Key abstractions、Existing tests、Safe change surface、Unknowns が整理されている。
  - 実装対象、順序、検証コマンドを追加判断なしで実行できる。

## Approach
- feature-plan の repo mapping と change planning を完了し、`docs/plans/` に保存する。
- 依頼順に実装し、各段階で狭い検証を行う。
- 最後に指定コマンドを順番に実行し、Strict evaluation と run report を完成させる。

## Definition of Done
- 依頼文「18. 完了条件」をすべて満たし、指定検証を実測値で報告する。
- Git/GitHub 操作、削除、rename、Cloudflare Deploy を行わない。

## Risks / Unknowns
- 既存未保存差分の有無を Git なしで完全には判別できないため、対象ファイルの内容を都度読み、最小差分のみ適用する。
- Playwright/browser install と全 E2E は時間・環境依存の可能性がある。失敗時は bounded repair loop で原因を修正し、未実行/失敗を偽らない。
- 依存追加と lockfile 更新は network 状況に依存する。

## Thinking Log
- 2026-07-27 13:44 JST: CI/Test API/production build を含むため Strict と判断した。
- 2026-07-27 13:44 JST: `new-run.ps1` は catch 内に削除処理を含むため、今回の削除禁止に合わせてテンプレート相当を追加のみで初期化した。
- 2026-07-27 13:52 JST: repo mapping と read-only subagent 3件を完了。Clock/Reset、build/UI/image、test gap の事実を統合した。
- 2026-07-27 13:52 JST: Test API allowlist、automation-admin guard、「テスト環境」文言は既に要件を満たすため維持し、production badge 非表示、CI job 分離、install boundary test を補う。
- 2026-07-27 13:52 JST: blocking question はなく、`docs/plans/2026-07-27_135212_phase1-repair.md` を実装計画として保存した。

## Repo Mapping

### Entry points
- `app/_layout.tsx` → `AppRuntimeProvider` → browser bootstrap
- `createApplicationServices`、TestControlService/Test API、app config/CI/package scripts
- presentation shells/pages、image config/scripts/manifest、Seed dataset/metadata

### Main flow
- TestControlService の DB を service factory へ渡すが、Clock は factory 内で別生成され、一部 Use Case は DB 設定を直接読む。
- Reset は DB instance を差し替えるため、UI は成功後 reload が必要。Test API fixture は reset 後 reload を自分で制御する。
- Image config から2つのmanifestを生成し、Seed/product repository/contract testsが利用する。

### Key abstractions
- `Clock`、`TestClock`、TestControlService、ApplicationServices factory
- Dexie DB/repository/transaction runner、AppRuntimeProvider/RouteGuard
- build-kind allowlist、ProductImage manifest/Seed validation

### Existing tests
- Unit/Integration/Repository/Component/Contract/12 required E2E と追加 browser projects が存在。
- RuntimeClock、shell Logout、Reset reload、a11y、追加4画像/Home Hero、production install boundary が不足。

### Safe change surface
- Clock dependency/wiring、TestControl同期、UI reload、app config/CI、共通Logout、scripts/a11y、既存image pipeline、局所UI/CSS/test。

### Unknowns
- node_modules 未導入。frozen install 後に本来の CSS import Typecheck failure を確認する。
- a11y の実違反と optional browser availability は検証時に確定する。
