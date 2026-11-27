# 作業記録

## 2026-11-08

- 対象PR #199の開始HEADは `7cc5ef3cdb5647ac359f1ad8d2a516f56cf3841a`。最初に個別20/39・上位0/8と継続手順6.3を確認。
- QA契約修正コミット `2172ff6755cb00993e38abfe05b9b993cd196120`、`6a34557293beb223344daf9c4ba31545160435f1`、`01d03ed08be65a7fdb635d39b828958c8869b6c7`。拒否時23表全件不変、正常停止・再開時はUser/Session/Checkout以外の20表不変を追加。
- 固定HEAD `01d03ed0`のWeb CI #42472622456、Vitest (contracts) job #128706863874はSUCCESS。変更対象2ファイル各2テストがPASS、全体1391 passed、1 expected fail、15 skipped。Style Quality / Code QualityもSUCCESS。**Web全体・Mobile全体は確認時点で未確定**。
- 固定HEAD `7cc5ef3c`の Web CI #42471513178 は全体SUCCESS。Vitest unit #128703136379 は66件PASS、integration #128703136446 は150件PASS。既存Web/Native部分証拠27件へ、Policy・Use Caseの実テストで新しい10 Caseを紐付けた（commit `608df67d9e8e2e1ed5de7d300f08feee6e1172fe`）。
- commit `bf792c69526b64e0ffdf89f893a8ec227e39720f`で、最終adminの競合模擬の23表比較を追加。実装上の競合テストであり、実並列アクセスの証明ではない。**このコミット自身のCI成功は未確認**。
- 横断51条件の残14件を既存の成功ジョブ・Assertionと照合し、部分根拠と残る実Run/Role/Seed/State/Platform/DB/独立判定を既存レポートへ記載。51件とも実行受入・独立レビュー未完了。959動作Caseの全数受入も未完了。
- 第三者権利、OpenCode実CLI・Provider、M10本人Private、実モデル、画像の独立比較・スクリーンリーダー、正式Case全数・独立レビューは未受入。Mobile CIの外部Gradle/OpenSSL 504は過去ログで確認済みだが、最新HEADの原因は別途判定が必要。
- コード変更はGitHub接続によるPRブランチのファイル更新。ローカルcheckoutがないため `scripts/new-run.sh` と `scripts/sanitize-codex-artifacts.mjs` は実行していない。`run.json`は作成・編集していない。本Runにはローカル絶対パス・秘密情報・個人情報の実データを保存していない。

## 継続作業：6.7在庫・Order/Shipment

- 開始HEAD `af646723e27568d018b0baf199a5d80e1687336e`、PR #199はOPEN／統合先main。統合受入Planの6.3/6.7と既存テストを確認した。製品SUT、正式仕様、既存製品テストは変更しない。
- `tests/integration/admin-operations-use-cases.test.ts` の在庫不足・Version競合、paid→preparing→shipped→deliveredの既存実Use Caseを再利用し、専用QA契約に23テーブル前後比較、正常更新の許容テーブル境界、customerからの管理操作拒否を追加した。
- 追加テストはWeb Dexie/IndexedDBを対象とする。Android SQLite・現場の同時実行・959 Case全数への適用を示すものではない。
- 本記録の追加時点では新テストのCI未実行・未確定。結果は後続のRunとPRコメントで実Run/jobに基づき補完する。

## 継続作業：6.7 Review

- `tests/integration/review-user-use-cases.test.ts` と CustomerReviewUseCases / AdminReviewUseCases の現行処理を確認し、専用QA契約でレビューの配送前拒否、他人の編集/削除拒否、Version競合、deleted終端を全23テーブル比較する。
- 正常な作成・更新・削除および公開/非公開の更新は `reviews`、`review_status_histories`、`product_review_summaries` のみを許容して他テーブルの非変更を検査する。
- 追加時点のCIは未確定。Web Dexie契約でありAndroid SQLiteや独立レビューへの受入拡張は行わない。

## 2026-11-08 継続対応：6.7 Native SQLite SQL実行境界

- 開始HEAD `a57a11a8258d3fd2e0a3fbee9f0bbf8b8a100130`。Web CI #42475530179はSUCCESS（29 job SUCCESS・1 skipped）、Mobile CI #42475530188は確認時にin_progress。CIが終わるまでの待機は行っていない。
- ADR-0004/0009と`tests/contracts/native-sqlite-transactions.test.ts`、`tests/repository-contract/native-customer-shared.test.ts`、`src/infrastructure/database/sqlite/native-customer-repositories.ts`の実行経路を確認。Node環境では`node:sqlite`で実SQLを走らせるがAndroid `expo-sqlite`の代用として正式受入へ昇格しない。
- 新規の`tests/contracts/ai-assisted-qa-native-sqlite-rollback.test.ts`は、(1)新規Guest Cartの存在しないVariant拒否、(2)Cart Item挿入後の故障注入、(3)stale Cart/Itemと数量超過、(4)Seed途中の外部キー違反について、Native 23テーブルを全件前後比較。比較するレコード実値をログやArtifactへ書き出さない。
- 追加時点のCIは未確定。実行時に形式・Assertion・環境差異を確認し、失敗した場合はQA契約の不備か製品不具合かを切り分ける。

## 2026-11-08 B案移行（マージ判定へ集中）

- ユーザー指示により、旧受入個別検証20/39（残19）、旧8作業0/8を履歴として残したまま、マージ前7条件／後続12条件と7.2残範囲へ受入期限を改定。旧44条件、本人マージ後6条件、959＋51正式Caseの未受入判定は削除・PASS化しない。
- 更新対象：`docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md`、`docs/plans/2026-11-08_101200_pr199-continuation.md`。PR本文は同じHEADの事実・CI結果で別途更新する。
- 固定Skillの一次許諾、未知PII／完成評価資料の配布除外、公開JS/画像/フォント権利、外部AIの実送信停止/分離、独立レビュー、最終HEADの必須Mobile CIは未受入。マージ可能とは判定しない。
- コード・製品SUT・正式Case CSV・権利根拠は今回の文書変更で変更しない。追加QAテストの積み増しを止め、実ゲートの解消に作業を移す。

## 2026-11-08 B案：通常チューター料金確認の修正

- 対象HEAD `699a6b1e733dac2a7b59b9ea1dd8931d0aa3a705`。正式評価は無料料金を機械検証するが、通常チューターには存在せず、START/SEND後に有料・料金不明モデルを起動できた。
- 既存`verifyCurrentFreeModelPrice`を再利用し、毎回のSEND後、OpenCode起動前に料金を照合。失敗・モデル不一致で子プロセスを起動しない。拒否負例を専用契約に追加。
- 公開カタログの単価0は本人の実契約/保持/請求を保証しないので、開始ガイドと学習Templateに制約を追記。実Provider接続・本人認証は未受入。
- 同一HEADの必須CIは変更反映後に確認する。

## 2026-11-08 B案：同梱PNGのMIT表示追加

- `710dc127425e274549186a35826d864288d052d1` のWeb production ZIPで`assets/expo-router/**`のPNG12件を分類。Expo Router直下7件、React Navigation Elements由来5件。
- Expo Router使用版`57.0.30`を現行`package.json`／lockfileで確認。元のExpo MIT LICENSEにCopyright (c) 2015-present 650 Industries, Inc.、React Navigation ElementsのMIT LICENSEにCopyright (c) 2017 React Navigation Contributorsがあることを取得元で確認。
- 学習者向け`THIRD_PARTY_NOTICES.md`へ元著作権者・MIT・適用画像の範囲を追記。JS依存物の全件監査、商品画像・画面素材の一次権利は依然未確認。B案1.4をPASSに変更しない。
- このドキュメント変更後の新HEADのCIは実証待ち。画像や製品SUTのバイト列は変更していない。
