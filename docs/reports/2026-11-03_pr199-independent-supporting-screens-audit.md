# PR #199 非干渉の基本分析：Supporting画面10操作

調査基点: `b671561a834998a58ef59c3047b7d47e76569c9c`（PR #199）  
対象台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json`  
定期実行の現在対象: `SCREEN-ADMIN-USER-DETAIL-A01-02`（本作業では変更なし）

## 対象と判定

`SCREEN-SUPPORTING-GUIDE` 4件、`SCREEN-SUPPORTING-TERMS` 2件、`SCREEN-SUPPORTING-PRIVACY` 2件、`SCREEN-SUPPORTING-COMMERCE` 2件、計10件について、現行main由来の正式仕様、Web/Androidのルート・実装、Role/State、default Seed、RiskとC1以降の採用Caseを照合した。いずれも業務Use Case/Repositoryを呼び出して更新する操作ではなく、表示・公開導線が主責務である。基本**静的**分析のみ`analyzed`、製品適合や実Run、視覚/a11yのPASSではない。

| 項目 | ID末尾 | Webの実装 | Androidの実装・差分 |
| --- | --- | --- | --- |
| Guide：固定アカウント | GUIDE-A01-01 | 6件のテスト用アカウントを表示 | `NativeGuideScreen`に固定アカウント一覧なし。default Seedは7ユーザーでwithdrawnはWeb一覧にも非掲載 |
| Guide：Role/Rank特典 | GUIDE-A01-02 | Role一覧、通常送料閾値5000円、gold 5%、platinum 10% | Role/Rank特典の説明なし |
| Guide：仕様の確認方法 | GUIDE-A02-01 | 確認FlowとScenario metadataを表示、許可済みrouteのみLink | 簡易Flowのみ。仕様正本への確認方法はWeb側も明確でない |
| Guide：Resetへの導線 | GUIDE-A02-02 | local/automation buildかつadminのみTest Control Link。その他は案内文とホーム復帰 | 直接のReset Linkなし。Nativeの管理/Test Controlは対象外 |
| Terms：利用規約 | TERMS-A01-01 | 学習目的・禁止事項・データの3章 | 見出し＋模擬サービスの共通短文だけ |
| Terms：ホーム復帰 | TERMS-A02-01 | `LegalPage`のホームLink | `NativeShell`のブランド/下部ナビからホームへ復帰可能（ページ内専用Linkなし） |
| Privacy：プライバシーポリシー | PRIVACY-A01-01 | IndexedDB、架空情報、Resetを表示 | 「データの取扱い」見出しと共通短文だけ。Native SQLiteの説明なし |
| Privacy：ホーム復帰 | PRIVACY-A02-01 | `LegalPage`のホームLink | `NativeShell`のブランド/下部ナビにホームLink |
| Commerce：模擬取引 | COMMERCE-A01-01 | 架空事業者・価格・Local Mock Payment・配送なし | 注文・決済・配送を行わない旨の共通短文だけ |
| Commerce：ホーム復帰 | COMMERCE-A02-01 | `LegalPage`のホームLink | `NativeShell`のブランド/下部ナビにホームLink |

## 証拠

- 正式仕様: `docs/spec/product-scope.md:38-143`、`docs/spec/screen-catalog.md:38-44`、`docs/spec/roles-and-permissions.md:1-29`、`docs/03_domain/legal_and_policy.md:1-46`。
- Web: `src/presentation/pages/guide-page.tsx:97-281`、`src/presentation/pages/legal-page.tsx:5-18`、`app/legal/{terms,privacy,commerce}.tsx`、`src/presentation/routing/guide-routes.ts`、`src/presentation/content/dictionary.ts`、`src/domain/services/pricing.ts`。
- Android: `src/presentation/native/native-screens.tsx:972-993`、`src/presentation/native/native-shell.tsx:82-204`、`app/guide.native.tsx`、`app/legal/*.native.tsx`。
- Seed: `src/seeds/default-dataset.ts:730-779`（7ユーザー、初期Session空）、`src/seeds/metadata.ts:72-101`、`src/seeds/scenarios.ts:20-37`。Supporting画面自体にDB書込はない。閲覧による実DB/Session不変の証拠は未取得。
- 各IDの台帳に `audit_branch_refs`、正式期待、Web/Android差、Risk、`test_condition` のC1以降、選定理由と未受入条件を明記。

## #210で確認する製品側の候補（修正確定ではない）

1. `NativeGuideScreen`は固定アカウント、Role/Rank特典、仕様の確認方法を表示していない。正式仕様はGuideをWeb/Androidの必要画面とし、共通の案内を要求する。Androidで表示すべき項目の正式範囲と、Native Customer対象外であるstaff/Test Controlとの整合を判断する。
2. `NativeLegalScreen`は規約・プライバシー・模擬取引で共通短文を使っている。Webとは情報量が異なるため、個々の法的情報本文・Native SQLite/端末保存先の案内を必要とするか正式仕様と照合する。
3. Web Guideの固定アカウント一覧は6件だがdefault Seedにはwithdrawn customerを含む7ユーザーがある。全件列挙の義務があるか確認する。学習専用資格情報の記載自体を一般サイトの安全な運用例と混同しない。
4. 法的情報3画面のホーム復帰はNativeShellの既存リンクで実現できるため、ページ内専用リンクの欠如だけを不具合とは判断しない。

不具合再現・製品仕様の意味変更承認・正式製品テスト変更・Web/Android実Runはこの独立調査では行わない。製品コード・正式仕様・Seed/Resetは読み取り専用。

## テストと取り込み

- 今回の直接確認はGitHubの固定HEADのソース照合と、更新後台帳10件に対する`completeAnalysis`必須欄・3種`reviewed_against`・Case記載の静的条件検査。10件すべて条件を満たした。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは**未実行**。静的条件検査だけでこれらの成功を主張しない。
- このブランチ上の操作基本分析は **121→131/188**、非default状態は**17/20のまま**。PR #199本体には未取り込みのため、本体の集計は変わらない。
- PR #199の定期実行が`supported-behaviors.json`を更新するため、取り込み時は**ID単位で差分と最新HEADを再照合してから**移す。JSON全体を上書きしない。実行対象A01-02のPlan・契約テスト・CI/workflowには触れない。
