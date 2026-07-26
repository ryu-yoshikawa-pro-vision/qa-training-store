# Decision Log

本書は後戻りコストの高い技術・Scope判断だけを記録します。業務ルール、入力制約、状態遷移は各正本文書を参照し、本書へ再掲しません。

| ID | 決定 |
|---|---|
| D-001 | テスト自動化学習用の模擬単一店舗ECとし、実取引を行わない |
| D-002 | Phase 1はWeb ECとPlaywrightを対象とし、Native/SQLite/MaestroはPhase 2とする |
| D-003 | Expo Router + TypeScriptを採用する |
| D-004 | Phase 1の永続化はIndexedDB/Dexieを使用する |
| D-005 | UIはApplication Use Caseを経由し、DBを直接操作しない |
| D-006 | Presentation Requestと内部Commandを分離し、Actor/Viewer/Clock/IDをUse Caseで解決する |
| D-007 | 複数Store更新はApplicationTransactionRunnerで原子的に実行する |
| D-008 | customerだけが購入し、operator/adminは管理専用とする |
| D-009 | Paymentは決定的なLocal Mockとし、Phase 1では成功または明確失敗だけを扱う |
| D-010 | Cart変更時はCart Versionだけを更新し、Checkout Route Guard・確認・注文確定で不一致を検出する |
| D-011 | Order Itemへ商品・価格・画像をSnapshot保存する |
| D-012 | Review Summaryを永続集計し、Review変更と同一Transactionで更新する。平均は未丸めで保存し表示時だけ丸める |
| D-013 | Seed、Reset、Clock、固定Read-only InspectionをTestabilityの中核とする |
| D-014 | Resetは1 Browser Context・1 Pageだけを保証範囲とし、複数Tab原子性を実装しない |
| D-015 | 商品画像はGitHub静的Assetを正本とし、Release済みPathはappend-onlyとする |
| D-016 | 画像ManifestはBuild生成TypeScript ModuleをRuntime正本とし、Runtime Fetchしない |
| D-017 | CategoryはPhase 1で1階層とし、手動表示順を持つ |
| D-018 | Brandは名称順固定とし、手動並べ替えを持たない |
| D-019 | StorefrontとAdminは別Page Shellを使用する |
| D-020 | FormはReact Hook Form、ValidationはZodを使用する |
| D-021 | Shared UIはReact Native StyleSheet、Web専用Admin/Layoutは`.web.tsx`とCSS Modulesを使用する |
| D-022 | WebのDialog/Combobox等はReact Aria Componentsへ限定する |
| D-023 | Phase 1必須E2Eは12本とし、Cross-role Lifecycleはmain/週次で実行する |
| D-024 | Cloudflare Pages 1 ProjectをAutomation用途で使用する |
| D-025 | 高度Payment照合、Cancel/Return/Refund、Import/Export、Migration Recoveryは将来Phaseへ分離する |
| D-026 | 実装開始後はTypeScript型・Enum・Dexie Schemaのコードを正本とし、Markdownは意味と理由を正本とする |
| D-027 | GitHub TokenをFrontendへ置かず、管理UIからGitHubへ画像を書き込まない |
| D-028 | IndexedDBでは住所SnapshotをTyped Objectで保存し、SQLite Adapterだけが必要に応じてSerializeする |
| D-029 | UI向けRead DTOからGateway Key、Repository Version、内部Actor IDを除外する |
| D-030 | 新機能追加より、EC基本フローと自動テストの決定性を優先する |
| D-031 | 会員割引はSKU単価単位で切り捨て、Payment処理日時はApplication Clockを唯一の正本とする |

## 実装補足

- 商品AggregateのCreate/UpdateでもUse CaseがClockを1回だけ取得し、Aggregate内の全時刻へ同一値を伝播する。
