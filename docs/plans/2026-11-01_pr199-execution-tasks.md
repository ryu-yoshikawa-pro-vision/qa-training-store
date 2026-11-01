# PR #199：残タスク・優先順位・定期実行の作業手順

## 2026-11-01 承認事項の更新（定期タスクとスケジュール外の分担）

Q01〜Q17と訂正後のQ08は[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)を正本として扱う。既存4枠のQ-ID・分析・教材・実証の割当てを変えない。スケジュール外の判断は次のとおり。

- **Template・Q-34**：作成候補 `ryu-yoshikawa-pro-vision/ai-assisted-qa-learner`、書込は所有者のみ。生成・公開前監査は許可済み。公開作成は監査後の個別承認待ち。本人Private repo/2コアCodespaces・Private Actionsは無料枠内のみ。利用時の残量と料金条件を確認する。
- **AI評価・Q-14**：公開素材と受講者の演習回答・コード・必要なRun要約を正式AI評価で外部無料モデルに送信してよい。Token/Secret/個人情報・無関係な資料は禁止。モデル校正・実Run・誤PASS拒否が未達の限り正式修了を認定しない。
- **製品19ファイル**：目的ごとの監査・方針提案は継続。実際の移設/revert/別PR作成・製品改修は保留。Highが実証されたらマージ判断を停止し、製品修正の方針を優先して別途承認を得る。新規Issueは重複確認済みHighのみ、公開前に内容確認する。未修正セキュリティ問題は公開報告を概要に限る。
- **未決仕様・マージ**：意味変更はユーザー承認。Web/Nativeは画面・入力・エラー文言も基本同等とし、例外は調査。処理中の二重決済は禁止、同一キーの冪等応答は許容。マージは全条件達成・独立レビュー・ユーザー明示指示後のみ。

既存の進捗数値・キューの未完欄は最新台帳・実Runを確認するまで変更しない。この追記は定期作業の完了判定ではない。

このファイルを**残タスク・作業優先順位・引継ぎ状態の正本**とする。目的・変更許可・完了基準は[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)に従う。分析の個別根拠は[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)と[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)、製品問題と既存差分の根拠は[製品改善レポート](../reports/pr199-product-improvements.md)に記録する。PR本文は要約に限り、このファイルと同じ残タスク一覧を重複して保守しない。

## 作業判断の原則

- **目的を優先**：PR #199の教材・評価・学習環境と全サポート動作の分析・技術受入のために必要な作業だけを行う。タスクリストの記述を無条件に正しいものとせず、正式仕様、実装、既存テスト、CIと照合する。矛盾は根拠と影響を記録する。
- **証拠を優先**：仕様・コード・固定Seed・実行結果に基づく事実、推論、未確認事項を区別する。静的分析、契約テスト、実Web/Native Run、製品仕様適合と教材受入を別々に判定し、未実行・証拠不足はPASSにしない。
- **原因から調べる**：CI失敗や仕様差は実ログ、呼出し元・先、共通処理、既存ガードとテストを確認する。根拠のない不具合認定や表面的な修正を避け、必要な影響範囲を検証する。
- **既存の仕組みを活用**：既存コード・Skill・validator・fixture・テストの再利用を先に検討する。現在の要求から必要性を説明できない抽象化・依存・改修を増やさない。一方、必要な例外処理・安全性・検証は省略しない。
- **実質的な完了を重視**：IDや文書を埋めるだけで完了にしない。各受入条件に対応する根拠を残し、未決は不足証拠・次の対応・再開条件を明示する。製品の問題を発見しても製品本体の修正権限にはならず、末尾の変更境界を守る。

## 定期実行の作業選択と引継ぎ

毎時0・15・30・45分は**別々の作業担当枠**とし、同じ操作IDを同時に分析しない。共通の手順は次のとおり。

1. PR #199の現HEAD、最新CI/レビュー、分析台帳、本ファイルを取得する。古いSHA・件数・CI結果を流用しない。
2. 自分の実行時刻の「直近の作業キュー」で**未完了かつ着手可能な最上位1件**を選ぶ。P0のCI失敗は0分枠が担当する。他の枠はそのCI原因を重複修正せず、独立した作業を選ぶ。担当外の作業は原則編集しない。
3. 記載した対象・根拠・完了条件に従って、関連ファイル、正式仕様、Seed/Use Case/Repository/UI、既存テストを確認する。分析成立時のみ台帳を `analyzed` に変更する。製品適合、実Web/Native Run、学習受入は別の検証とする。
4. 書込み前に現HEADと変更対象ファイルの最新内容を取得し直す。同一ファイルを他の実行が更新中なら先に書込みしない。コミット/更新のSHA不一致・競合を検知したら旧内容を上書きせず差分を再確認する。**GitHubファイルのSHA確認は作業開始の排他ロックではない**。複数ファイル変更は旧HEADへの上書きを避けて通常pushし、途中で競合したら状態を整合させてから再開する。force push禁止。
5. 関連のformatter・lint・テストと実CIを確認する。CIが走っている場合は、重複の軽微なコミットでキャンセルを繰り返さない。1件の作業成果と検証をまとめる。成果・障害・未解決点・次のIDは該当行と既存レポートに記録し、**実質的な状態変化があるときだけ**PR本文を現時点の要約へ更新する。無変更の回は無意味な同期コミットを作らず報告する。

**各行の状態**：`未着手`→`進行中`→`完了`、または`BLOCKED`（理由と再開条件必須）。`レビュー待ち`は証拠・正式仕様の未決として保持する。表は作業管理用であり、分析台帳の `analysis_status` と同じ意味ではない。今の担当枠は時刻で固定し、別の担当者IDや予約コミットは作らない。「進行中」だけでは排他制御にならず、古い状態や他の作業Runの存在を確認してから再開する。作業が15分を超えるときは次の枠と同じ共有ファイルを同時更新せず、後から始めた側は独立調査・結果確認に切り替える。

### 直近の作業キュー

表の操作ID・状態は2026-11-01時点の分析台帳 `supported-behaviors.json` を照合済み。**この行の順序は担当枠内での着手順**。最新台帳で既に `analyzed` ならその分析行を飛ばして次へ進む。仕様差・証拠不足は無理に完了にせず、理由を記録して同一行の再調査を無限に繰り返さない。

| 担当枠 | 作業ID・優先 | 対象・状態 | 次の具体的な作業 | 完了/引継ぎの判定 |
| --- | --- | --- | --- | --- |
| 毎時0分 | Q-00 / P0 | 最新HEADのWeb CI（条件付き）・結果確認待ち | 最新HEADの必須job結果を確認し、失敗時だけ実ログの原因箇所と再現コマンドを特定。学習用範囲の原因なら修正 | 全必須job成功のRun URL・HEADを記録。実行中なら他枠の作業を止めず、不要なpushを控える |
| 毎時0分 | Q-01 / P1 | `SCREEN-ADMIN-USER-DETAIL-A02-03`・`review_required` | 最終管理者保護について認可後の操作者権限変更・別session・version/Session不変の実証可能性を確認。制御interleaving契約2件と実並行を区別 | 静的/実行証拠と不足を分析レポート・製品改善レポートへ記録。未実証なら未完を維持 |
| 毎時0分 | Q-02 / P1 | `SCREEN-ADMIN-USER-DETAIL-A02-01`・`review_required` | 本人によるrole/状態破壊の拒否を、正式admin-users仕様・Web UI・Use Case・Repository・default Seedの自己操作条件で追跡 | Role/State/Data・拒否結果・変更前後の不変性・Case採否が揃ったら基本分析へ |
| 毎時0分 | Q-03 / P2（マージ前） | Checkout正式仕様差分は静的監査済み、承認/実回帰待ち | 製品改善レポートにmain差分・導入commit・未決のWeb/Native住所契約を記録済み。新証拠がない限り再調査しない | 正式仕様の承認/Platform期待値と実回帰の証拠取得時に処理方針を確定。revert/分離は明示承認待ち |
| 毎時0分 | Q-04 / P1 | `SCREEN-ADMIN-DASHBOARD-A01-01`は`review_required`維持、`A01-02`の管理メニュー導線は静的基本分析済み | A01-02は7基本リンク、admin-onlyユーザー、test-build専用制御、RouteGuard、1023/1024px、default staff Seed、既存E2Eを証拠付きで照合し`analyzed`。実Web/負例/DB不変は未受入。A01-01は集計母集団と独立実証待ち | A01-01の再開条件が変わるまで再調査しない。A01-02の実Runは別受入。次はQ-05 / `SCREEN-ADMIN-DASHBOARD-A02-01` |
| 毎時0分 | Q-05 / P1 | `SCREEN-ADMIN-DASHBOARD-A02-01`・`review_required` | 1023/1024pxの管理操作遮断と警告を正式admin-catalog、AdminShell/CSS、RouteGuard、default operator/admin、既存E2E/視覚正本で照合。guest/customer・停止staffの負例と警告時のデータ非露出、操作不可を分離 | Risk/TR/Condition/Case採否と必要な静的根拠が揃えば基本分析へ。実Web/視覚・拒否の独立実証は別判定。次は同枠の未処理ID |
| 毎時15分 | Q-10 / P1 | `SCREEN-AUTH-LOGIN-A02-01`・レビュー待ち（静的監査済み、`review_required`維持） | Webは拒否理由を日本語化、Nativeは`ApplicationError.messageKey`をそのまま表示する静的差を確認。停止/退会/誤資格/Storage失敗の実Android表示と拒否後Session/Cart不変、正式期待値は未受入。分析レポート「2026-11-01 Q-10」を参照 | 製品適合・実Runを未判定として維持。実端末/失敗注入・既存Issue確認を再開条件とし、次の独立作業Q-11へ進む |
| 毎時15分 | Q-11 / P1 | `SCREEN-AUTH-SIGNUP-A02-02`・静的監査済み、`review_required`維持 | 正規化後の既存メールはtransaction前に`EMAIL_ALREADY_EXISTS`で拒否。Webは日本語化、Nativeは`auth.email.exists`キー表示経路。競合時の二重事前確認、Session pointer/guest Cart不変と実Web/Androidは未実証。分析レポート「2026-11-01 Q-11」を参照 | 同一/正規化メールの拒否、guest Cart/Session/DB不変、同時登録競合、Web/Native表示を独立検証するまで完了にしない。再開条件を記録し、次の独立作業Q-12へ進む |
| 毎時15分 | Q-12 / P1 | `SCREEN-AUTH-SIGNUP-A02-01`・静的監査済み、`review_required`維持 | WebはZodでメール形式/上限、表示名、パスワード8〜72、確認一致、注意事項同意を送信前検証。Nativeは3入力のみ、password初期値`testpass1`、確認/同意UIなし、Use Caseの共通検証へ直接委譲。Web Zodと共通正規化/簡易メール正規表現の境界差、Nativeエラー文言、実Web/Androidは未実証。分析レポート「2026-11-01 Q-12」参照 | 正式仕様のPlatform別確認/同意要否、境界値・不正入力時の非書込み・利用者向け表示を独立検証するまで未完。再開条件待ちとして次の独立作業Q-13へ進む |
| 毎時15分 | Q-13 / P1 | M00〜M04教材・Skill・Phase 1評価・受入未完（M00-01の静的経路照合済み） | M00-01の教材・P01/P02/P05・提出・採点・開始/終了状態を照合し、配布後の入力パスと初回ロード順序の不一致を教材側で是正。M00-02は固定Skill実体・P03/P06・採点契約を静的照合し、単なる手順書説明とSkill実起動を混同する教材導線を修正。実OpenCode Skill起動/本人Level 2は未受入。M00-03では自作読取り専用依頼P04の権限・根拠見出し・AI応答の独立照合・前後無変更確認を演習/提出/採点へ整合。実OpenCode/本人Level 2は未受入。M00-04では`submission.md`の編集後に再ロードが競合拒否となる既存契約と、自作`practice.md`保全だけでは拒否証拠にならない点を照合。教材・P05/P06・提出・M00-CR-04を修正し、架空の危険判断と実Ports/支払者/利用枠確認を分離。**静的整合のみ**で実Codespace・本人Level 2は未受入。M01-01では教材の独立バックエンドAPI/サーバーDBという誤説明を、WebのCartUseCases→Dexie/IndexedDBとREADME制約に合わせて是正。架空の欠陥報告は実観測でないと明示し、P01〜P03・M01-CR-01の要件は維持。**静的整合のみ**で本人の実画面・保存値・Level 2は未受入。次は**M01-02**の探索/回帰/自動化例と正式仕様・課題の整合。M00-04実Runは新証拠が出た場合のみ再開する。詳細は目的別監査レポート「Q-13 M00-01」を参照 | M00-01は教材パスの静的整合を確認しただけで、実Codespace/Skill/再ロード/本人Level 2は未受入。M00-02以降も目標ID別に実証し、M00〜M04一括PASSにしない |
| 毎時15分 | Q-14 / P1 | M04/M07/M10のOpenCode正式AI評価・校正未受入 | 評価Planの必要な独立セッション・入力Snapshot・決定論的gate・正/負例・再評価を実テストで確認。実モデルの接続/無料条件/権限がなければ停止理由を整理 | 校正済みモデルID・実Run・誤PASS拒否の証拠が得られた部分だけ完了。無断課金しない |
| 毎時30分 | Q-20 / P1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`・静的監査済み、`review_required`維持 | Web/Native UI→CartUseCases→Dexie/SQLite、P-0001/0005/0006、共有Repository契約の拒否後Cart DTO不変を監査。新規Cart失敗時のtransaction rollback、inactive SKU/99境界・実Web/Android/視覚は未実証。分析レポート「Q-20」参照 | 未実証の負例・Cart version不変を再開条件とし、次の独立作業Q-21へ進む。未実行をPASSにしない |
| 毎時30分 | Q-21 / P1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02`・静的監査済み、`review_required`維持 | guest/customer・会員rank・sale価格・同一SKU合算をWeb/Native→CartUseCases→Dexie/SQLiteで照合。Webは1〜min(stock,limit)点指定、Native詳細は1点固定。上限超過の既存Cart version不変、rank別価格、実Web/Androidは未実証。分析レポート「Q-21」参照 | 追加時の数量超過・rank別価格/Cart DTO・新規Cart rollback・実画面/Androidを独立検証するまで未完。再開条件を維持し、次の独立作業Q-22へ進む |
| 毎時30分 | Q-22 / P1 | `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`・静的監査済み、`review_required`維持 | 正式emptyは復帰導線を要求。Web無条件0件は`StatePanel action=null`だがBreadcrumbsのホームリンクあり、条件付き0件は解除CTAあり。Nativeは0件メッセージのみ（Android視覚必須外）。`empty-catalog`は商品0件でもactiveカテゴリーを保持することをコードで確認。分析レポート「Q-22」参照 | Web実画面・視覚正本と「元の画面に戻る」解釈、Native実Run、既存Issue重複を再開条件として未完維持。次の独立作業Q-23へ進む |
| 毎時30分 | Q-23 / P1 | `SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`・`review_required` | 在庫0/1/5/6の分類、Web表示、既存Seed/通常の在庫操作、正式しきい値を照合 | `available>=1`と正式`available>=6`の差を確定。製品修正はしない |
| 毎時30分 | Q-24 / P1 | M05〜M07教材・Seed/Reset・Playwright技術受入未完。P03型検査対象漏れを是正、P05複数明細Locatorの学習用参照specを追加（実Run未受入） | P05：default guestでMug/タオル2明細を作り、全体の数量/削除が各2件、商品明細にscope後は各1件であることをread-only参照specで検証する設計。既存Cart JSX/Seed/既存M06 Playwrightと静的照合。参照specの実Chromium Runは新課程専用`playwright.ai-assisted-qa.config.ts`/`ai-assisted-qa-chromium`で実施し、HEAD・spec SHA・JSON report・終了コードを対応付ける（直接CLI実行は`course:run`のreceiptではない）。学習者本人のP05証拠、続いてM05 P06・M06→M07のCase/Reset/Trace | P03はローカルTypeScript 5.8.3で誤型非0/修正0。P05はTypeScript構文と静的根拠のみでブラウザ未実行。M06教材はWeb版のDexie/IndexedDBと数量selectの実装に合わせて説明を是正（静的照合のみ）。2コアCodespaces・before/after・実M05〜M07評価は未受入、PASSにしない |
| 毎時45分 | Q-30 / P1 | `SCREEN-CHECKOUT-PROCESSING-A02-02`・レビュー待ち（静的監査済み、`review_required`維持） | Web/Nativeの再試行UI不存在、`retryPayment`の処理中既存試行返却、`resumePayment`の同一キー再開を静的照合済み。禁止の意味（明示拒否か冪等返却か）・同時Gateway呼出し・実Web/Nativeは未決。根拠は分析レポート「2026-11-01 Q-30」 | 仕様判断と並列/実Run証拠が揃うまで完了にしない。再開条件を記録し、次の独立作業Q-31へ進む |
| 毎時45分 | Q-31 / P1 | `SCREEN-CHECKOUT-FAILED-A01-02`・静的監査済み、`review_required`維持 | Webは4種の再試行選択、Nativeは`TEST-SUCCESS`固定。失敗後のみ新attemptを作成し、Order version不一致は拒否するが、処理中はversion照合前に既存試行を返す。再試行時のCart/Checkout Session再検証は行わない（既存Orderの再試行としての仕様妥当性は未決）。根拠は分析レポート「2026-11-01 Q-31」 | 実Web/Native、stale version/別ユーザー、未確定結果・並列実行の証拠とプラットフォーム別の正式期待値が揃うまで未完。再開条件待ちとしてQ-32へ進む |
| 毎時45分 | Q-32 / P1 | `SCREEN-STOREFRONT-CART-A02-01`・静的監査済み、`review_required`維持 | `BR-CART-003/AC-CART-003`とWeb/Native Cart→Use Case→Dexie/SQLite→Checkoutを照合。公開/rank/在庫/価格の問題はDTOへ反映されるが、数量が後から下がった購入上限を超えてもDTOの`blockingIssues`へ追加されない静的経路を確認。Webは理由別表示、Nativeは一律「購入前に確認が必要」。既存契約・統合テストは購入上限縮小と実Web/Androidを未実証。分析レポート「2026-11-01 Q-32」参照 | 旧Cart/item version拒否、購入上限縮小後のCheckout遮断、価格同意・非価格問題の順序、DB不変・実Web/Android・正式判断を追加実証するまで未完。再開条件待ちとして次の独立作業Q-33へ進む |
| 毎時45分 | Q-33 / P1 | M08〜M10教材・Phase 3評価・専用CI受入未完（M08-01/02/04の静的整合を一部補強） | M08の未追跡ファイルと`git diff`の違い、既存差分と配布物の区別、M08-CR-04に必要な抽象化採否の別条件を演習・提出欄へ補強。根拠は目的別監査レポート「2026-11-01 Q-33」。M08-03では2回目commit単独とPR base/head全差分の混同を防ぎ、仕様/Case→変更diff→対象spec→実Run/未実行→commit SHAの対応表とM09引継ぎ契約を演習・提出欄へ補強。実Codespaces/本人の実commit・PR/CIは未受入。M09-01ではPR用完成見本を手動`workflow_dispatch`へ転用する際のPR payload欠落・選択ref/checkout SHA/PR HEADの混同を教材・P01・提出欄で是正。基準`.disabled`案と採点契約は維持し、本人の別条件YAML/実Run/Level 2は未受入。M09-02ではRunメタデータのmerge SHAとcheckout SHA、PR head、Run/attempt、Check、Artifact内target-sha.txt、対象specの照合手順をM09教本・P02・提出欄へ補強。実Runは未受入。M09-03では配布合成A/B/CとREADME旧Case1〜3解説、P03別条件の不一致を是正。`if-no-files-found`警告/失敗、`if: always()`、SHA不一致とstep failureを分離し、提出診断表を補強。M09-CR-03は維持、本人の実Run/Level 2は未受入。次はM09-04（費用・trigger・P04・M09-CR-04） | M08〜M10の各目標ID、固定HEADの実Run/Check/Artifact、本人判断・復習/再評価を個別受入。実Private Codespace、正式AI評価、専用CIの実Runが未確認ならPASSにしない |
| 毎時45分 | Q-34 / P1 | 公開Template→本人Private 2コアCodespaces・外部承認待ち | 承認不要のmanifest/Secret除外/`course:sync/load`/非破壊再ロードを検証。公開先・権限・費用の承認は一覧化 | 外部Template作成は明示承認までBLOCKED、内部検証は個別に進める |

### キューを消化した後の補充規則

上記の具体的な行が完了・BLOCKEDで作業できない場合は、分析台帳の `behaviors[]` から**`analysis_status=review_required`のうち担当枠に属する未処理ID**を、台帳内の掲載順に**次の1件**として選ぶ。対象の実在・状態を再確認したうえで、上表と同じ形式（作業ID、操作ID、状態、具体的な次の操作、完了条件、担当枠）で追加し、元の行を維持する。初期キューの行が少なくなった時点で補充し、毎回全109操作の優先度を比較し直さない。BLOCKED対象は理由と再開条件を記録して次のIDへ進む。

担当枠の割当ては**IDの接頭辞**で固定する（下記は優先順に判定し、1 IDを2枠へ割り当てない）。

- **0分**：`SCREEN-ADMIN-DASHBOARD-*`、`SCREEN-ADMIN-USERS-*`、`SCREEN-ADMIN-USER-DETAIL-*`、`SCREEN-BOUNDARY-*`、`SCREEN-TEST-CONTROL-*`、以下で未指定のID。
- **15分**：`SCREEN-AUTH-*`、`SCREEN-ACCOUNT-*`、`SCREEN-ORDERS-*`、`SCREEN-ADMIN-PRODUCTS-*`、`SCREEN-ADMIN-PRODUCT-NEW-*`、`SCREEN-ADMIN-PRODUCT-DETAIL-*`、`UC-AUTH-*`、`UC-ACCOUNT-*`、`UC-USER-*`。
- **30分**：`SCREEN-STOREFRONT-*`（ただし`SCREEN-STOREFRONT-CART-*`を除く）、`SCREEN-ADMIN-INVENTORIES-*`、`SCREEN-ADMIN-CATEGORIES-*`、`SCREEN-ADMIN-BRANDS-*`、`UC-CATALOG-*`、`UC-INVENTORY-*`。
- **45分**：`SCREEN-STOREFRONT-CART-*`、`SCREEN-CHECKOUT-*`、`SCREEN-REVIEWS-*`、`SCREEN-ADMIN-REVIEWS-*`、`SCREEN-ADMIN-ORDERS-*`、`SCREEN-ADMIN-ORDER-DETAIL-*`、`SCREEN-SUPPORTING-*`、`UC-CART-*`、`UC-CHECKOUT-*`、`UC-ORDER-*`、`UC-REVIEW-*`。

接頭辞で割当てを決めるのは**作業の担当**だけであり、製品の正式分類・分母・リスク・テスト深度を変更しない。2026-11-01時点の未分析111 entriesは上の規則で**0分25、15分25、30分25、45分36**に割当て可能（操作109・状態2）。追加・変更された動作は割当ても再計算する。IDごとに必要な根拠・リスク・テスト条件・Case採否は従来どおりすべて検証する。

**その他の受入**：分析以外の仕事は表のQ-03/13/14/24/33/34を細分化して補充する。作業が減っても承認待ちの外部操作や既存製品改修を推測で始めず、残る教材・実評価・配布・既存差分の既存Plan上の全条件を対象に保つ。Mobile App CI復元と最終HEADのフル実行は、他のマージ前条件が整った**マージ準備時に0分枠が担当**する。早期の復元や未実行のPASS扱いは禁止。

## 現在状態（2026-11-01の確認に基づく、毎回再集計）

- PR #199はOPEN。前回の確認HEADは `5601231df0bd3ac96a679d80cae15615396758fa`。これは固定の作業対象SHAではない。
- Scenario Shopの基本分析は**79/188操作**、残**109操作**、非default状態は**18/20**（残2）。188は漏れ・重複の最終監査前の暫定分母。分析済みは製品仕様適合や実Web/Native Run PASSではない。
- M00〜M10（11モジュール・51学習目標）の教材・演習・評価・知識グラフは配置済み。教材内容全量、独立AI評価、実行環境での受入は未完了。
- 既存製品差分19ファイルの全追加hunkは静的監査済み。処理方針・実回帰・必要な承認が一部未完。
- Web CIの現在HEAD結果は毎回取得する。最後に確認した進行中のRunは[41259747230](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41259747230)。前HEADの成功・失敗を最新HEADへ流用しない。
- Mobile App CIのPR自動トリガーは**一時停止中・未受入**。マージ前の復元と最終HEADでの必須job成功が必要。未解決レビューThreadは直近の確認で0件。

## 全体の受入条件と残課題（作業選択は上記キューを優先）

### P0：現HEADのWeb CI・レビューで確認された失敗

- **状態**：実行結果を毎回再取得。直前HEADでは学習用契約テストのPrettier違反があり、次HEADで修正検証中。
- **次の作業**：最新HEADのCIログを確認し、学習用コード・文書の原因なら修正して必要なローカル/CI検証を行う。製品SUT/製品テストの変更が必要なら根拠と影響を報告し承認を待つ。
- **完了条件**：同一の最新HEADでStyle Quality、Code Quality、contracts、関連E2E、verify、validateなど全必須Web CI jobが成功。skipped/cancelledや旧HEADの成功を流用しない。
- **証拠**：[PR Checks](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199/checks)。

### P1：全サポート動作の基本分析と分母監査

- **状態**：79/188操作、残109。分類率100%は基本分析率100%を意味しない。分母188は暫定。
- **次の作業**：未分析の高リスク動作から、正式BR/AC、Role/State/Data、Web・Native UI→Use Case→Repository、Seed実値、Risk/TR/Condition/Case採否を個別確認。成立したものだけ`analysis_status=analyzed`へ変更し、個別証拠と契約テストを同期する。未決/不適合候補は製品改善レポートへ記録する。
- **完了条件**：全サポート動作の漏れ/重複を監査して分母確定、分類100%、**証拠付き基本分析100%**。未決・BLOCKEDを完了扱いしない。詳細Caseの採否・残リスクも追える。
- **正本**：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`、`scripts/training/validate-supported-behaviors.mjs`、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`、[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)。

### P1：非default状態の残2件

- **状態**：18/20。商品一覧emptyの戻るCTAと管理在庫0/1/5/6の境界に仕様・実装差があり`review_required`。
- **次の作業**：仕様、Web/Native表示、既存Seed/通常操作による境界と実行証拠を照合。製品の不具合認定、教材の期待結果、基本分析成立を混同しない。
- **完了条件**：個別の仕様根拠と分析・Case採否が成立し、20/20件を判定。証拠不足・未決は未完のまま明示。

### P1：教材11モジュール・51項目と実践/Skill

- **状態**：教材・演習・クイズ・完成資料・知識グラフは配置済み。内容の全量レビューと実地技術受入は未完。
- **次の作業**：各項目の学習目標、初心者向け説明、BR/AC、例題/演習、開始・終了状態、提出証拠、模範と評価基準、復習先を実体照合。M02→M03の`qa-workflow-skills`は実runtimeのcurrent evidenceと最終gateを検証。M05〜M07のSeed/Reset/Playwrightも実行証拠を確認する。
- **完了条件**：M00〜M10の全51目標に教材と評価可能な証拠が対応し、重大な内容誤り・欠落を修正。模範/完成specは学習者配布から除外し、既存の旧教材/正式テストを壊さない。
- **正本**：[学習目標・順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)。

### P1：正式AI評価・再評価・校正

- **状態**：`course:assess`等の実装は存在するが、実モデルによる正式評価と誤PASS拒否、全Phaseの通し受入は未完。
- **次の作業**：M04/M07/M10で全必須objective ID、提出/Runの実在とSHA、独立評価セッション、本人の別条件回答、Level 2判定、再提出・履歴の非破壊性を検証。OpenCodeの実モデルID、無料/費用、権限、認証、非対話JSON、未実行/異常/Prompt Injection/誤PASSを校正する。
- **完了条件**：正答/誤答/別解/証拠不足・改ざん・未実行/モデル失敗の負例が正しく判定され、**重大な誤PASS 0**、正式結果と履歴/復習/再評価が本人の非公開workspaceに保存される。校正不能なら正式修了を発行せずBLOCKEDを記録。
- **正本**：[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)、[配布Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)。

### P1：認可競合・実動作・教材阻害の検証

- **状態**：最終管理者保護の制御interleaving学習用契約2 Caseは旧HEADのCIで成功。実並行リクエストと再認可、Web/Native実動作は未受入。認証ログイン拒否理由、Signup、注文失敗・復旧にも未決がある。
- **次の作業**：別セッションによる権限剥奪後の操作、Session/DB/version不変、ログイン拒否理由・returnTo・Signup Web/Native差を必要な独立実行で確認する。実再現・仕様差・推測を区別し、教材が実行可能か判断する。
- **完了条件**：分析の根拠不足が解消し、再現した製品問題はリスクと教材代替/阻害判断を記録。製品修正は別途承認なしに行わない。
- **正本**：[製品改善レポート](../reports/pr199-product-improvements.md)。

### P1：学習用公開Template・本人Privateリポジトリ・2コアCodespaces

- **状態**：**BLOCKED（公開先、権限、費用・支払主体の明示承認待ち）**。
- **次の作業**：承認を要しない範囲で、`training/course-sync/manifest.json`、固定SHA、公開物/Secret除外、`course:sync`・`course:load`・非破壊再ロード、配布対象/依存を検証。承認後のみ公開Template作成、本人所有のPrivate repoと新規2コアCodespaceでShopの8082 Serve/Seed/Reset/Playwright実Runを確認。
- **完了条件**：公開範囲・本人の支払主体/無料枠・権限が承認済みで、**実Template由来**の2コア環境におけるload/Serve/Reset/Playwright/結果保全を実証。ローカルfixtureのPASSは代替不可。
- **正本**：[配布Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)。

### P2（マージ前必須）：既存製品差分19ファイルの処理方針

- **状態**：製品実装9、正式仕様1、既存製品テスト9の全追加hunkを静的監査済み。由来/回帰/処理方針は一部未完。低在庫UI等の一部は製品用別PR分離の**方針のみ**決定済み。
- **次の作業**：変更の意味単位で導入commit、呼出し元/先、認証・金額・データ整合と実回帰、教材目的との必要性を整理し、証拠が十分なら「PRに残す／別PRへ分離／取り消す」の方針を決定。承認が要る実際の移設/revert/別PR作成は行わず、判断待ちを明示。
- **完了条件**：全差分の扱いと必要な承認を明確化。承認待ちを残したままマージ準備完了にしない。
- **正本**：[製品改善レポート](../reports/pr199-product-improvements.md)。

### P0（マージ準備時）：Mobile App CIの復元と最終検証

- **状態**：`.github/workflows/native-ci.yml`のPR自動トリガーを一時停止中。未受入。
- **着手条件**：他のマージ前必須条件の完了が見込め、最終検証を開始する段階。
- **次の作業**：PR branchの`on.pull_request`を**元通り復元**して通常pushし、最終HEADのAndroid/Native Static/iOS/Maestro等の必須jobを実行。CI中の競合pushを避ける。
- **完了条件**：復元後の最終HEADでMobile・Webの必須CIが成功。一時停止workflowのままmainへ取り込まない。

## 変更境界と最終完了条件

- **変更可能**：教材、演習、評価、学習用fixture/専用Seed・Playwright/契約テスト、分析台帳、調査レポート、Plan、知識グラフ、学習用配布/検証ツールと必要な学習用CI。
- **無断変更禁止**：既存製品本体（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`等）、正式製品仕様、既存Seed/Reset、既存製品テスト・workflow、過去の製品差分のrevert/移設/別PR化。既存`docs/spec/**`の意味不変なMarkdown書式修正のみ、CI/lint等で必要性を確認した場合の限定例外。
- **明示承認待ち**：外部Public Template公開・作成先/権限/費用、本人の課金を伴う環境、製品差分の移設/revert/別PR作成、製品の機能・正式仕様変更、新規Issue。merge、force push、branch削除、PR/Issue close、release/tagは禁止。
- **全タスク完了の判定**：確定分母の全サポート動作が証拠付き基本分析100%、非default状態全件の判断、教材/51学習目標/Skill・正式AI評価の検証、実Template→Private 2コアCodespaces→Playwrightとモデル校正の技術受入、製品差分処理と必要な承認、最新HEADのWeb/Mobile CI・レビュー条件がすべて満たされた場合のみ。実受講者の学習効果検証はこのPR完了条件の外。
