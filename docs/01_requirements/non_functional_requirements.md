# 非機能要件

`Gate`はPhase 1のRelease判定に使用し、`Goal`は計測・改善対象ですが未達だけでReleaseを止めません。

## 1. 性能

| ID | 区分 | 要件 |
|---|---|---|
| NFR-PE-001 | Goal | default Seed商品11件のHome・商品一覧を一般的な開発PCのChromiumで体感待ちがない状態にする |
| NFR-PE-002 | Goal | 商品1,000件の検索・Filter・Facet・PageをBenchmarkし、結果を記録する。固定500msをRelease Gateにしない |
| NFR-PE-003 | Gate | Cart数量変更と主要Form操作で重複処理や操作不能な待機を発生させない |
| NFR-PE-004 | Gate | Payment Delayを除くDB処理を不要に長時間保持しない |
| NFR-PE-005 | Gate | GitHub同梱画像は1枚50～150KBを目安、500KB以下、Product関連付けは最大3枚とする |
| NFR-PE-006 | Goal | Search Suggestionは2文字以上の入力から150ms Debounce後に表示し、入力操作をBlockせず、古いRequest結果で新しい入力結果を上書きしない |

Benchmarkでは端末、OS、Browser、Data件数、Cold/Warm、計測範囲を必ず記録します。

## 2. 信頼性・整合性

| ID | 区分 | 要件 |
|---|---|---|
| NFR-RL-001 | Gate | Money、在庫、数量を整数で扱う |
| NFR-RL-002 | Gate | Order確定、在庫減算、Payment確定、Review集計を必要なStoreの同一Txで更新する |
| NFR-RL-003 | Gate | 二重Submitと同じPayment Attemptの重複確定を防止する |
| NFR-RL-004 | Gate | versionによる楽観的競合を検出し、上書きしない |
| NFR-RL-005 | Gate | Browser再読込・再起動後にCart、Checkout、Orderを復元できる |
| NFR-RL-006 | Gate | DB書込み失敗時に入力を可能な範囲で保持し、再試行可能なErrorを表示する |
| NFR-RL-007 | Gate | 検索条件、Page、Scroll復元に失敗しても商品閲覧自体を妨げない |
| NFR-RL-008 | Gate | 複数Repositoryをまたぐ更新はApplicationTransactionRunnerで1つのDB Transactionへ束縛し、部分Commitを残さない |
| NFR-RL-009 | Gate | Cart Item変更時に親Cart versionを必ず更新し、CheckoutのCart変更検知を成立させる |
| NFR-RL-010 | Gate | Login/Register＋Cart統合、在庫調整＋履歴、User Access＋Session無効化、Default配送先変更を原子的に更新する |
| NFR-RL-011 | Gate | IndexedDB Indexへboolean/null/undefinedを保存せず、数値Keyと非null Scope Keyへ投影する |
| NFR-RL-012 | Gate | Payment再開は同一Attemptに対して冪等であり、複数Tab・再読込・Test Retryでも二重確定しない |

## 3. 互換性

| ID | 区分 | 要件 |
|---|---|---|
| NFR-CP-001 | Gate | Desktop Chromiumの現行安定版で主要Flowが動作する |
| NFR-CP-002 | Goal | Firefox、WebKitの現行安定版で主要Flowを定期確認する |
| NFR-CP-003 | Gate | 360px幅のStorefrontと1024px以上の管理画面で操作可能である |
| NFR-CP-004 | Goal | Domain/ApplicationをPlatform非依存に保ち、Phase 2のSQLite Adapterを追加可能にする |

## 4. 保守性

| ID | 区分 | 要件 |
|---|---|---|
| NFR-MA-001 | Gate | Presentation、Application、Domain、Infrastructureの依存方向を守る |
| NFR-MA-002 | Gate | UIからDB Adapterを直接呼ばない |
| NFR-MA-003 | Gate | 価格、権限、状態遷移を純粋なDomain Testで検証できる |
| NFR-MA-004 | Gate | IndexedDB Repositoryが共通InterfaceのContract Testを通過する |
| NFR-MA-005 | Gate | 将来機能の未使用Tableや抽象化をPhase 1へ追加しない |
| NFR-MA-006 | Goal | 正本を限定し、同一仕様の文章重複を減らす |
| NFR-MA-007 | Gate | Status表示名、Button文言、Error文言を辞書から参照し、画面内へ重複定義しない |
| NFR-MA-008 | Gate | 商品Aggregateの更新境界と在庫調整境界を分離し、既存在庫を商品編集から変更しない |
| NFR-MA-009 | Gate | Category/Brand/Variationの重複判定を共通Normalization関数へ集約し、Adapter差を作らない |
| NFR-MA-010 | Gate | Phase 1 Core Use CaseとRepositoryが`application_contracts.md`のDTO/Input/Result/Error型に従う |
| NFR-MA-011 | Gate | Admin各一覧とStorefront CatalogのSearch/Filter/Sort/PageをQuery Repositoryで一意に実装する |
| NFR-MA-012 | Gate | Email正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照する |
| NFR-MA-013 | Gate | Phase 2資料と変更履歴をPhase 1正本から分離し、未使用型・未使用抽象化を残さない |

## 5. テスト容易性

| ID | 区分 | 要件 |
|---|---|---|
| NFR-TS-001 | Gate | Seed、Reset、Clock、Payment Delayが決定的に動作する |
| NFR-TS-002 | Gate | 固定ID・固定時刻・固定価格をSeed Catalogへ定義する |
| NFR-TS-003 | Gate | AnimationをTest時に無効化または短縮できる |
| NFR-TS-004 | Gate | Role/Labelを優先した安定Locatorを使用できるUIとする |
| NFR-TS-005 | Gate | E2E失敗時にTrace、Screenshot、Console、Test Metadataを保存する |
| NFR-TS-006 | Goal | Firefox/WebKit、Accessibility、NativeをPhaseごとに段階追加する |
| NFR-TS-007 | Gate | 内部整合性はApplication Integration/Dexie Contractで検証し、E2EのInspectionは固定Read-only DTOへ限定する |

## 6. Accessibility

| ID | 区分 | 要件 |
|---|---|---|
| NFR-AX-001 | Gate | FormにLabel、Error関連付け、Keyboard Focusを設ける |
| NFR-AX-002 | Gate | 状態やErrorを色だけで表現しない |
| NFR-AX-003 | Gate | Web主要購入FlowをKeyboardで完了できる |
| NFR-AX-004 | Gate | DialogのFocus TrapとClose後のFocus復帰を行う |
| NFR-AX-005 | Goal | WCAG 2.2 AA相当を目標とし、重大なaxe違反を残さない |
| NFR-AX-006 | Gate | Search SuggestionをComboboxとして上下Key、Enter、Escapeで操作できる |
| NFR-AX-007 | Gate | Error発生時はError SummaryへFocusし、Summary内Linkから該当項目へ移動できる |
| NFR-AX-008 | Gate | Dragによる並べ替えには上下移動Buttonによる代替操作を設ける |
| NFR-AX-009 | Gate | 星評価をRadio Groupとして実装し、選択状態を読み上げる |

## 7. UX・コンテンツ

| ID | 区分 | 要件 |
|---|---|---|
| NFR-UX-001 | Gate | StorefrontとAdminで異なるPage Shellを使用し、Navigation目的を混在させない |
| NFR-UX-002 | Gate | 主要画面はTitle、現在地、Primary Action、次の操作を一貫して示す |
| NFR-UX-003 | Gate | Search/Filter適用状態と結果件数を常に確認できる |
| NFR-UX-004 | Gate | Empty Stateは空である理由と次のActionを表示する |
| NFR-UX-005 | Gate | UIの利用者向け文言は日本語を基本とし、Domain内部名をそのまま露出しない |
| NFR-UX-006 | Gate | Storefrontは商品画像を主役とし、AdminはTable/Formの可読性を優先する |
| NFR-UX-007 | Gate | Toastだけで重要な結果を伝えず、画面内へ結果と次のActionを残す |
| NFR-UX-008 | Goal | Home・商品一覧・商品詳細の主要画像でLayout Shiftを抑える |

## 8. セキュリティ・Privacy

| ID | 区分 | 要件 |
|---|---|---|
| NFR-SC-001 | Gate | 実在個人情報・実Card情報の入力禁止を常時表示する |
| NFR-SC-002 | Gate | Passwordを平文保存・Log出力しない |
| NFR-SC-003 | Gate | Role、Status、OwnershipをUse Caseで検証する |
| NFR-SC-004 | Gate | HTML文字列を未Sanitizeで描画しない |
| NFR-SC-005 | Gate | Analytics、外部Error SaaS、外部Payment APIを使用しない |
| NFR-SC-006 | Gate | Test APIの書込みはReset、Scenario Seed、Clock、Payment Delayに限定し、読取りはMetadataと固定形式のRead-only Inspection DTOだけを許可する。任意Table、任意Query、任意条件、任意書換え、Script実行、外部Fetchを提供しない |
| NFR-SC-007 | Gate | GitHub TokenをBrowser Bundle、Local Storage、IndexedDBへ保存せず、ClientからGitHub Contents APIへ書き込まない |
| NFR-SC-008 | Gate | Password HashをPBKDF2-SHA-256、210,000回、16byte Salt、固定保存Formatで生成・照合し、Seedでも同じ契約を使用する |

## 9. 運用性

| ID | 区分 | 要件 |
|---|---|---|
| NFR-OP-001 | Gate | App/Schema/Seed/Build Versionを確認できる |
| NFR-OP-002 | Gate | Cloudflareの固定Automation URLへDeployし、Deployed Smokeを実施する |
| NFR-OP-003 | Gate | Schema変更を含まない場合は直前DeployへRollbackできる |
| NFR-OP-004 | Goal | Release Noteに機能、Seed、Schema、既知制約を記録する |
| NFR-OP-005 | Goal | Native・Public環境は必要になるまで運用対象へ追加しない |
| NFR-OP-006 | Gate | Release済み商品画像Assetはappend-onlyとし、廃止はManifestのisActive=falseで管理する |

## 12. 実装技術

| ID | 要件 |
|---|---|
| NFR-MA-020 | Domain状態・永続状態・業務判断に影響するValidation / NormalizationはPresentationのValidationだけに依存せずApplicationまたはDomain boundaryで成立させる。PresentationはUX目的の補助Validationを行ってよい。Form state / Runtime Validation libraryは画面特性に応じて選択し、React Hook Form / Zodを全入力へ一律必須としない |
| NFR-MA-021 | Native presentationはReact Native primitives / StyleSheet / shared design tokensを利用し、NativeからWeb CSS・React Aria Components・`.web` module・Web DOM / browser storage globalsへ依存しない。Web-only stylesheetはWeb composition rootから取り込み、`.web.tsx` / `.native.tsx`はplatform-specific implementationが必要な境界で使用する。CSS Modulesは一律必須としない。Formal enforcementは既存`check:native-route-dependencies`を正本とする |
| NFR-MA-022 | WebのDialog / Combobox / Listbox / MenuはReact Aria Componentsを使用し、独自のcomplex widget implementationを追加しない |
| NFR-MA-023 | 実装開始後のTypeScript型・Enum・Dexie Schemaはコードを正本とし、Markdownは意味と理由を正本とする |
