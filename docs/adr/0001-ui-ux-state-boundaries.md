# ADR-0001: UI/UX状態表示とTest Controlの責務境界

- Status: Accepted
- Date: 2026-08-01

## Context

今回のUI/UX改善では、Login後のReturn先、Cart統合、Checkout再開・置換、Scenario Reset、Customer Review状態、Admin Previewなど、複数の画面をまたいで一度だけ表示する状態が増えた。Shell、Test API、Seed、Application DTOがそれぞれ同じ状態を扱うと、Reload時の再表示、Role切替時の情報欠落、未保存値とDB値の混同が起きる。

## Decision

1. WebのOne-time Noticeは `AppFrame` がStateと消費Pathを所有する。Storefront/Admin Shellは同じNotice Componentを表示し、`sessionStorage` の読出し・型検証・消費・削除をShellごとに複製しない。
2. `SCENARIO_METADATA` をScenario ID、表示名、初期Session、安全な戻り先、Guide/E2E情報の正本とする。Test Control UIのResetだけが表示用Reset Noticeと画面遷移を担当し、Test API ResetはUI NoticeやUI遷移を行わず、DB・Session・ClockのResetとMetadata返却だけを担当する。
3. Customer注文画面はCustomer専用のReview表示DTOを使い、Admin向けの操作・集計DTOを直接流用しない。購入時SnapshotとReview stateをApplication境界で確定して表示する。
4. Product Previewは既存SKUの現在庫（DB）と未保存Formの初期在庫を明示的に区別し、Preview処理から永続化を行わない。Dirty Navigation確認はPresentation側で共通化し、保存・複製・公開・削除の既存Application契約を変更しない。

## Consequences

- Flow A〜J、Role切替、Reload、Test APIの境界を独立して検証できる。
- NoticeやMetadataの変更は共有入口に集約される一方、表示文言の追加はUnion/Metadataの型と既存テストを更新する必要がある。
- Customer DTOとPreview DTOが増えるため、DTO変換とIntegration/Component/E2E検証を維持する必要がある。
- Test Controlは学習用の明示操作を保ち、通常のRuntimeやProduction向け画面へReset副作用を持ち込まない。

## Addendum: 2026-08-02 PR #4レビュー修正

5. Reset成功後のNotice処理はDatabase Resetの成功判定から分離し、Noticeの保存可否にかかわらずsafeResetPathへハード遷移する。Confirm中は同一Reset Promiseを二重起動しない。
6. Previewの公開可否は、削除予定を除いたForm由来のeffective Variantと既存DB現在庫を入力にする。Previewは永続化を行わず、公開不可理由はDictionary経由で利用者向けに変換する。
7. Shipment表示とCheckout Login fallbackは、Presentationで許可した状態mappingだけを表示／Fallback対象とし、Storage Errorや予期しないApplication Errorを汎用状態へ変換しない。
