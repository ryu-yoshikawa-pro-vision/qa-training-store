# PR #215 Phase 2（M05〜M07）技術対応タスクリスト

> 対象：[PR #215](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/215)、統合先[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業時は`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、最新HEAD/CI、該当教材・仕様・テストを確認する。
>
> **今回の分離方針**：PR #215では、教材・学習用spec・専用契約テストの実装、参照実装/固定配布の技術的検証、他PRへの不整合の引継ぎまで進める。**受講者本人の独立操作・実Run・正式AI評価・Codespaces保全を伴う実受入は、PR #199の最後にまとめて実施する**。PR #215の技術チェックを本人の習熟・Phase修了の認定に用いない。
>
> **完了条件**：以下のチェックは、それぞれの対象ファイル、修正箇所、テスト・CI結果または検証不能な理由を固定HEADで記録できた場合だけ`[x]`へ変更する。契約テスト追加だけで実Playwright成功とはしない。実行可能な検証を環境依存という理由だけで省略しない。必要な実行環境・権限がないときは再現手順と阻害条件を記録する。CI完了待ち・無断mergeはしない。

## 作業範囲と進捗の数え方

- **PR #215で変更可能**：`docs/curriculum/ai-assisted-qa/modules/M05..M07/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・`docs/curriculum/ai-assisted-qa/quizzes/M05.json`〜`M07.json`、学習専用Playwright資産、固有の契約テスト、タスクリスト・報告書。
- **変更しない**：製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow・`assessment/**`・共通`scripts/training/**`・配布manifest・知識グラフ・他PR所有ファイル。問題の証拠と修正案はそれぞれ#199/#217/#218へ渡す。
- **進捗は次の33項目だけで集計**する。過去の25項目は技術対応と本人の実受入が混在していたため、今回の構成では分母を変更した。以前の`8/25（32%）`から数値だけを比較しない。
- **Progress: 91% (30/33)**。未完了3件。チェック済みはPR #215の技術的な照合・教材/テストの修正・報告であり、本人の実Runと#199の最終実受入は含まない。各チェックの根拠と旧25項目からの変更経緯は[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)と下記の作業履歴を参照。

## M05：TypeScript・Playwright基礎

- [x] `M05-03`：Cartの見た目・クリック成功・業務Assertion・DB保存の保証範囲を正式仕様/実装に照合して教材と提出欄へ反映。
- [x] `M05-04`：Playwrightのauto wait・Web-first assertion・不要な固定待機と構文/型/Locator/Assertionエラーの負例を教材へ反映。
- [x] P03の短いTypeScriptコードを隔離環境で型検査し、誤型で`TS2345`/非0、修正後に0を確認。教材のオプションに合わせた`tests/contracts/ai-assisted-qa-phase2-typecheck.test.mjs`を追加。本人実行とは区別する。
- [x] P05の直接Playwright実行手順に、実行前後spec SHA・出力先・JSON reporterの`rootDir`相対パス、0件/別spec/skip/期待FAILの拒否を反映。`ai-assisted-qa-phase2-direct-run.test.mjs`に隔離stub負例を追加。
- [x] `M05-01`：`await`・関数・型・Node/pnpmの実行例、元specの安全な1箇所変更→再実行の演習/提出欄/理解事項をコードと照合。不十分な場合は本PRの教材・専用テストを修正し、技術検証結果を記録する。
  - 教本の関数・await実コード3例を隔離Node.jsで実行。TypeScript短コードも分岐の変更前後を隔離transpileで確認。未完成Mugリンクの1箇所と参考href Assertion、before/after・提出欄を照合。専用契約テストを追加（実Shop Runは#199最終受入）。
- [x] `M05-02`：Role/Name/Label/test IDの一意性、Cartの複数商品行と数量select/削除ボタンのscopeを、正式仕様・実画面コード・学習用参考specに照合。名前だけでなく2行の誤選択を検出する回帰条件を追加し、画面操作が必要な部分は#199最終受入へ渡す。
  - 製品Cart画面を読み取り、記事・SKU・数量select・削除buttonと参照specの全体各2件/商品行各1件・数量1の照合を契約テストへ固定。削除は非実行（実画面Runは#199最終受入）。
- [x] `M05-05`：`playwright.ai-assisted-qa.config.ts`、8081/8082/6080、`PLAYWRIGHT_TEST_ROOT`、対象spec、`AI_QA_OUTPUT_ROOT`、Trace/JSON report・`course:run` receiptを読み取りで追跡。M05 P05直接実行と`course:run`の異なる証拠契約を教材/専用テストで確認し、共通実行器の不足は#217に引き継ぐ。
  - 専用Configの8082/testDir/report/Trace、8081/6080転送、配布検証とP05直接実行・`course:run` receiptの差をソースで照合。固有の契約テストを追加。JSON reporter相対パスの共有実行器不具合は#217へ引継ぎ済み。
- [x] 公開M05参照specの2明細Locatorを、実行可能な既存の学習用環境/CIで技術検証する。実行できない場合は必要なサーバー・Config・コマンド・期待/未取得証拠を記録し、受講者が実行したとは報告しない。
  - 現作業環境にcheckout/pnpm/専用8082がないため実ChromiumはBLOCKED。参考specのBlob SHA、専用Config/port、正確な実行コマンド、取得すべきreport/Trace/終了コードと再開条件を受入レポートへ記録した。**実行成功のチェックではない**。

## M06：別条件からのWeb E2E実装

- [x] `M06-04`の証拠記録を具体化。CASE-CART-004/005のtest名、`run-evidence.json`、spec snapshot・JSON report・対象SHA・終了状態の照合手順を演習/提出欄へ追加。
- [x] `M06-01`固定3 Case：公開未完成specと参考specを正式BR/AC・Role/State/Data・Locator・業務Assertionへ対応付け、TODO消去だけでPASSしない回帰条件を確認する。
  - BR-CART-001/AC-CART-001と公開未完成3test（default/default/low-stock）、参考specの追加/拒否/数量維持を照合。TODOだけ消した弱いspecが業務Assertionを持たない契約テストと教材注意書きを追加。実Runと正式採点は別項目。
- [x] `M06-01`新規Case：削除`CASE-CART-004`と数量1→2・再読込保持`CASE-CART-005`が**別test**であり、Webの数量selectに0を仮定しないことを、参考spec・教材・専用契約テストで確認する。
  - 004削除前数量1→削除後空と、005数量1→2→再読み込み保持を異なる参考testとして照合。Cart UIの数量selectは1以上・削除は別ボタン。未完成学習者入力はTODO004のみ、005追加は本人実技で行う。
- [x] `M06-02`：test単位のReset、Browser Context、IndexedDBとSeedの境界、実行順序依存と再試行の誤判定を確認。隔離fixture/契約テストで再現できる不備は修正し、実Shopでの順序変更検証は#199最終受入へ渡す。
  - 既存Reset helper・TestControlServiceの契約テストを照合。新規隔離Page契約テストでResetの実行順序、metadata不一致、参考5testのtest別Reset、retry無効を確認。教材P04にもContextとSeedの責務の違いを明記。実Shop逆順Runは#199最終受入。
- [x] `M06-03`：無関係でもPASSする弱いAssertionの負例を特定し、正式BR/ACの業務結果を検証する期待へ修正。意図した失敗と修正後成功を、実行可能な技術テストまたは明示した再現条件で確認する。
  - BR-CART-001/AC-CART-001と参考3 Caseの拒否後数量維持を照合。通知が成功しても数量Assertionを削除した参考specは契約不適合、元のspecは適合となる変異負例を追加（実ブラウザbefore/afterは#199最終受入）。
- [x] `M06-05`：終了コード、`outcome`、JSON report・ログからPASS/FAIL/BLOCKED/未実行を判定する教材と、旧Run・別spec・実行数の誤判定を拒否する契約テストを整合する。共有実行器の修正は#217へ渡す。
  - 4種の`course:run outcome`とreceipt未生成の未実行、Playwright test状態・Run ID/配布/spec/report SHAの照合を教材/提出欄に追加。既存評価テストの同一Run・旧source SHA・初回/repeat逆転拒否と照合。共有実行器の相対パス不具合は#217へ引継ぎ済み。
- [ ] 公開参考specの固定3件と004/005を専用Config・実行可能な環境で技術的に検証し、Run/対象HEAD/初回・再実行の結果を記録。**本人の独立実装・初回/repeat達成の判定は行わない**。

## M07：失敗解析・保守設計

- [x] `M07-01`：Test/Product/Environment/Flakyの原因候補と、正式仕様・初期状態・ログでの反証手順を教材・提出欄に整理。
- [x] `M07-03`：Retry/Timeout延長を原因修正の代用にせず、診断後に判断する基準を教材へ反映。
- [x] `M07-05`の教材側：3件目は再読み込みではなく**別ページへ移動後にCartを再入場**する条件を明確化。Page Object/fixtureのコードとsnapshot/依存ファイルの同一性も記録する。参考specの相違は#217へ引継ぎ済み。
- [x] Git/PR不要の保全手順：パストラバーサル・symlink・自己取り込みに加え、一覧・アーカイブ・チェックサムの上書きを禁止。`ai-assisted-qa-phase2-export-guard.test.mjs`に隔離環境の負例を追加。
- [x] `M07-02`：診断素材Aの実失敗と合成B/Cを取り違えないよう、期待する失敗操作・Assertion、Trace/Screenshot/標準出力/reportの対応を参考spec・教材・専用テストで確認。実Trace未取得は未取得として報告する。
  - Aは誤った商品見出しAssertion、Bは合成metadata差、Cは合成Retry変動と照合。Aの別main Run/Trace条件、B/Cを実Runと誤記しない提出欄を専用契約テストに追加。実Trace未取得をレポートに明記。
- [x] `M07-04`：`failure-assertion.spec.ts`と`repaired-assertion.spec.ts`の役割、TODO由来のbefore失敗、業務Assertionを維持したafter修正を照合。参考コードで検証可能なbefore/after実行を区別する。
  - 診断Aの誤Assertionと修正対象beforeのTODO例外を分離。参考afterはMug見出し+数量1を検証し、元の業務Assertionを削除しないこと、main/before/after別Runを専用契約テストに固定。
- [ ] `M07-05`：公開参考の保守前2件・保守後3件、test単位Reset、Page Object/fixture、各test内Assertion、別ページを経由する3件目の実装契約をテストする。参考実装の相違は#217で修正されるまで未解決として扱う。
- [x] 通常OpenCodeの段階ヒント・失敗後の復習、AI案の採否を本人の判断から奪わない教材上の制約を確認。チューター共通実装・実モデルの動作検証は#217/#199へ渡す。
  - 本人の初期診断→追加証拠に限定したAIヒント→本人の再実行→復習、完成答案の自動編集禁止、秘密情報除去、通常Tutorと正式Assessの分離をM07教材・契約テストへ追加。実モデル結果は未確認。

## 横断：教材・テスト・引継ぎ

- [x] 全15学習目標と教本、P01〜P06、提出欄、start/end、公開評価基準、復習先を個別照合。正式AI採点と本人達成は未認定。
- [x] M05〜M07クイズの正答・誤答理由・復習先を目標/理解事項と照合。
- [x] 理解事項30件の意味・前提・`can_do`・教材/実技/評価の対応を確認。知識グラフ正本の改訂候補は#199へ引継ぎ済み。
- [x] M04→M05→M06→M07→M08の状態JSONで入力/出力のID・path・revision・contractを照合。`ai-assisted-qa-phase2-handoff.test.mjs`を追加。公開fallbackを本人の先行修了証拠にしない。
- [x] 固定HEADで教材変更・テスト/CI・未実行範囲・残リスクを[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)へ記録。
- [ ] 今回の専用契約テスト（M05直接実行・型検査、M07保全、Phase間引継ぎ）と既存M05〜M07の検証を最新HEADのCIで確認。失敗を修正し、`training-web-baseline`と**新課程専用ConfigのChromium実行を同じ結果として扱わない**。
- [x] M05〜M07の対象教材・公開参考spec・専用Config・学習用Resetと既存契約の整合を最後に差分レビュー。不要な抽象化やSUT変更を行わず、未解決の仕様差を受入レポートへ残す。
  - #215差分25ファイルを確認し、変更がM05〜M07教材・専用契約テスト・報告/Planに限定されることを確認。既存Config/Reset・参考spec・正式BR/ACを読み取りで照合し、#217共有実行器/M07参照と#218最終配布の未解決条件を受入レポートへ記録。
- [x] #217の共通実行器/正式評価が所有する問題（JSON reporterの`rootDir`相対パス、M05 P05の`course:run`許可、M07保守後参考spec）について、引継ぎ済みコメントと最終的な修正/未修正を照合する。**#215で共有実装を書き換えない**。
  - #217 HEAD/Blobと引継ぎコメント4件を再照合。rootDir相対パス、P05 direct-only、M07の`page.reload()`3件目、M06 TODO削除の偽PASSリスクはいずれも正式実装修正待ちと明記。共有実装は#215で変更しない。
- [x] #218の固定配布manifest・Shop・`course:load/check`・出力先・Secret分離について、#215の教材と必要な技術条件を突き合わせる。配布実装の欠陥は再現条件を#218に渡し、**#215でmanifestを変更しない**。
  - #218 HEADのmanifestでM05/06/07の29件とload先、固定source SHA/Shop生成、採点資産の配布除外を照合。`loadModule`の異内容上書き禁止、`checkState`の実行未検証、8082と証拠出力先を確認し、受入レポートへ固定HEADで記録。#218自体の21件は未完了。
- [x] #199最終受入へ、未実行の項目、学習者本人に必要な操作、Config/Reset/Run/Trace/SHA、担当PR、再開手順を固定HEAD付きで一度だけ引き継ぐ。チェックは技術資料の引継ぎ完了時点に限る。
  - #199へ最終技術引継ぎコメント1件でM05 P03/P05、M06 5 Case、M07 A/合成B/C・before/after・保守3件目、証拠のRun/SHAと配布/評価の未解決条件を固定HEADで送付。実受入の完了ではない。

## PR #199の最後に実施する実受入（本リストの33件に含めない）

実受入は[#199の統合・横断受入タスクリスト](./2026-11-04_143600_pr199-integration-acceptance-tasks.md)で管理する。以下は**実施漏れを防ぐための引継ぎ条件**であり、PR #215ではPASSを付けない。個別PRの契約テストや公開参考specがPASSしても本人の実技修了は認定しない。

| 対象 | #199最終段階の確認内容 |
| --- | --- |
| M05-01・P03 | 本人が短いTypeScriptの誤型を検出・修正し、specを安全に変更して再実行したログ、終了コードと本人の判断 |
| M05-02・P05 | 8082の実画面で複数Cart明細のLocator/scopeを本人が実装し、専用ConfigのChromiumで実行。直接実行のspec SHA・JSON report・ログを照合 |
| M05-05 | 8081/8082/6080、固定配布・専用Config、Trace/JSON/report/receiptの保存先と実行spec・source SHAの実測照合 |
| M06-01〜05 | 本人の固定3 Caseと独立004/005、Reset/Context、初回・再実行各2件以上、業務Assertion、PASS/FAIL/BLOCKED/未実行の実ログ判定 |
| M07-02・04 | 診断素材Aの実失敗とTrace、修正対象のbefore/after別Run、AIパッチの採否、正式期待結果の維持。合成B/Cは実行済みにしない |
| M07-05 | 保守前2件・保守後3件以上を別Runで確認。test単位Reset、Page Object/fixture、Cart外へ移動して再入場する3件目、spec/依存ソースのSHA |
| Phase間・配布 | 本人のM04→M05およびM07→M08成果物/ID/revision、固定Shop/Reset、実Trace/report・新旧Run混入防止を実ファイルで確認 |
| OpenCode・保全 | 実モデルのヒント/復習が本人の実装を奪わないこと、Git/PR不要のアーカイブ作成・非公開保管・SHA照合・復元を実環境で確認 |
| 正式評価・最終統合 | #217の正式`course:assess M07`と誤PASS拒否、#218の固定配布、安全性、#199の同一最終HEADによる統合受入を相互確認 |

**時期の注意**：#199本体の現在の方針ではPublic Template公開と本人Private 2コアCodespaces実受入はマージ後の本人作業とされている。この工程の実施時期をPR #215の文書変更で前倒ししない。#199の「最後」における技術的な実受入と、既定のマージ後本人作業を#199本体で区別する。

## 過去の作業記録（当時のHEADと進捗）

以下の`7/25`・`8/25`等は**変更前の25項目で集計した当時の記録**であり、上の33件の現在進捗を表さない。既存のコミット、テスト/CI、発見した不整合、担当PRへの引継ぎ履歴は保持する。

## 2026-11-04 静的確認の証拠・未完了理由

- [PR #215 Phase 2受入記録](../reports/2026-11-04_pr215-phase2-acceptance.md)に、固定HEAD `268d06236e5b068b924f1d71e296a6ad6b0bb4f1`で照合した内容、各ファイルのBlob SHA、未実行の条件、共有領域への引継ぎを記録した。
- 上記でチェックしたのはM07-03の**判断基準**とM05〜M07の**クイズ内容照合**だけであり、実RunやPhase 2の学習到達・正式AI評価をPASSとしたものではない。
- 8082 Chromium、M05型検査、M06 004/005 initial/repeat、M07 before/after、配布ShopやGit不要の成果物保全は未実施。実際のRun IDとreport等が揃うまで該当チェックを保持する。

## 2026-11-04 追加レビュー（PR #215継続）

- 知識ノード30件の教材参照、`can_do`、採点基準、クイズ・実技、前提関係を[Phase 2受入記録](../reports/2026-11-04_pr215-phase2-acceptance.md)へ記録。Graph本体の変更要否は#199の[引継ぎコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6629751490)へ記載。`draft_requires_content_review`は変更していない。
- M05 P03の型エラー/修正の`tsc`結果は隔離コンテナによる補助検証であり、本人Codespaces・専用Config・Chromiumの実Runを示さないため関連する学習目標・横断実行項目は保留。
- **Progress: 12% (3/25)**。実行環境に依存する項目と全15目標の完全受入は未完了。

## 2026-11-04 15目標の個別照合

- [Phase 2受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に15目標ごとの教材、P01〜P06、提出、start/end、公開評価基準、クイズ復習先を固定HEAD `d260c1a29f98b4684780dbe9340e18f6ed058f7e`で照合した結果を記録。
- 人間の正式なPhase修了、実Chromium・TypeScript受講者実行、配布後の本人証拠は未確認。共有参照とM07正式AI評価は#199/#217の境界内で調停。
- **Progress: 16% (4/25)**。

## 2026-11-04 継続作業：実行入口・診断手順の検証

- [Phase 2受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に`M07-01`の分類手順整備の根拠（固定HEAD `897e1c83186a22c082c6cad8ca5c8a245fc9ca40`、教材・正式BR/AC・Reset実装のBlob SHA、分類・観測・反証表）を記録。教材と提出欄の静的照合を完了。M07の実失敗/Trace・修正前後は未実行のため`M07-02/04/05`を未チェックとする。
- M06-Q03復習先を共有契約テストの期待する章へ戻して§6に説明を補い、前HEADの契約テスト失敗を修正。最新HEADのCI結果は未確認。M05 P05の新規specは`course:run`許可リスト外なので、専用Configでの直接実行経路と明確に異なる証拠欄を追記。実Chromium/Run receipt未取得。
- 保全対象リストの`../`パストラバーサル、symlink、成果物自身の再取り込みを拒否するよう修正。隔離Linuxダミーファイルで拒否と復元を検証したが、本人Codespacesでの復元は未実施。
- **Progress: 20% (5/25)**。残り20項目の実Run・正式評価・Phase引継ぎ等は未完了のまま保持。

## 2026-11-04 M05-04の補助実行と反映

- 対象HEAD `17145e12fea7098cfe4ba327882d446f8c8ac377`のM05教本・演習・提出欄に、Actionability自動待機・Web-first assertion、固定待機が無効な負例、構文/型/実行時・Locator不存在/重複・Actionability・Assertionの違いを反映。
- [受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に隔離Linux（Node.js 22、TypeScript 5.8.3、Python Playwright 1.57、Chromium 144）での成功・意図的失敗と終了コードを記録。これは配布Shop/受講者の`course:run`ではなく、`M05-01/02/03/05`および横断実Chromium受入を代替しない。
- 前HEAD `e6b41570f90e20214210547917873234faae1bda` の[Web CI #41827772448](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41827772448)は成功。今回の変更のCI結果ではない。
- **Progress: 24% (6/25)**。残り19件は未完了。

## 2026-11-04 M05-03の保証範囲

- 固定HEAD `94fda6d52c49cd8e4c1bf111b060be6d8a5f113f`で製品Web Cart画面・Cart Use Case・Dexie（`carts`/`cart_items`）と教材の判断表を照合。[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に対象Blob SHA、保証できること/できないことを記録。
- 隔離Chromiumではクリック成功でも数量0のままなら業務AssertionがFAILすることを確認。**Scenario Shopの実Runではない**ので、専用ConfigのChromium受入やCart DBの保存実証には流用せず、M05-02/05および横断項目は未チェック。
- **Progress: 28% (7/25)**。残り18件。

## 2026-11-04 続き：M05 P05と保全の引継ぎ漏れ

- 前HEAD `9d13270637a49005cd121230f5fc7f9da4d9ab04`の[Web CI #41831786673](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41831786673)は成功。既存の`Vitest (contracts)`・`Style Quality`・Training runtime契約は成功したが、学習者のM05〜M07専用実Runは含まない。
- M05 P05で本人が新規作成する`p05-cart-locator.spec.ts`、直接Playwright実行の`console.log`・`playwright-result.json`とP03型検査ファイルが、M07のGit/PR不要の保全例から漏れていたため、教材・引継ぎテンプレート・Linux専用の保全回帰テストへ追記。M05 P05にTODOで確実に失敗する最小spec入口を追加し、既存`product-link.spec.ts`と編集対象を分離した。[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に根拠を記録。
- **未完了**：本人の8082実Chromium、正式`course:run`、通常OpenCodeでの段階ヒント、Codespacesでの保全・復元、追加後のCI成功は確認していない。複合チェックは実施証拠が揃うまで変更しない。
- **Progress: 28% (7/25)**。未完了18項目。

## 2026-11-04 継続：CI修正・M05 P05直接実行の証拠照合

- 前HEAD `bd9cb860793634c88e6eb4162932f109dafa0ea0`の[Web CI #41833867254](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41833867254)は`Style Quality`の`MD012`（M05演習・受入レポート各1件）で失敗。修正済み。後続の`verify`・`validate`は派生失敗であり、実Playwright不具合とは判定していない。
- M05 P05の直接Playwright実行を、実行前のspec snapshotと直前・直後SHA-256の一致、JSON report存在、非0終了の伝播に対応。M05提出欄、M07へのGit不要の保全例・handoff欄も同じ証拠を保存する形に修正。新規固有の契約テスト`tests/contracts/ai-assisted-qa-phase2-direct-run.test.mjs`を追加した。[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に隔離Bash/stub検証と制約を記録。
- **未完了**：CIでの新規契約テスト・Style Quality、本人の8082専用Configでの実Chromium、`course:run`による正式receipt、M06/M07の別Run、Codespaces保全。実行済みのstub検証を学習者の実Runと取り違えず、チェックを変更しない。
- **Progress: 28% (7/25)**。未完了18項目。

## 2026-11-04 継続確認：回帰修正と実Runの境界

- [Phase 2受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に、前HEAD `653a92deb041dfb5a9b71018ec92bb7aae77034d` のWeb CI失敗（保全契約テストの古い期待パス、Markdown末尾空行）と修正Blob SHAを記録。修正後の[Web CI #41841463720](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841463720)は確認時`in_progress`であり成功とは扱わない。
- M05専用Configの8082/出力先と既存のCI `training-web-baseline`のConfigを照合し、両者の実行対象が異なることを確認。M05公開参考specと正式採点の本人証拠要件を区別。M05-01/02/05および横断の実Chromium項目は引き続き未チェック。
- M04 end→M05 startの2入力はID/path/revision/contractが一致。M07 endは4出力、M08 startはうち3入力を参照しており、保守specはM07のhandoffテンプレートで別記録。M08側の必要出力全件を4件と断定せず、実ファイルがない状態で本人成果物の引継ぎ完了を主張しない。
- **進捗：28% (7/25)**。既存チェック7件は維持。今回のCI回帰修正は25件の独立した受入項目ではないため、見かけの進捗を増やさない。

## 2026-11-04 M05〜M07の進行と報告項目

- M05 P05直接Playwright実行のJSON確認を強化。対象specのtest 0件、skip、期待失敗、別specを成功と認めない。隔離stub用の回帰テストに負例を追加した。本人のP05実行は未実施。
- M06 004/005のinitial/repeatは、同一Run receipt・JSON・spec snapshot内の両Caseのtest名と業務Assertionで照合するよう教材・提出欄を修正。実Runは未取得。
- M07 3件目は数量2の再読み込みではなく別ページ遷移とCartへの再入場が必須。Page Object/fixtureのsource revisionも記録するよう修正。正式参考specとの差は[PR #217へ引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6632850727)済み。
- **チェック追加は固定HEADでのテスト・CI・未実行/残リスクの報告項目1件のみ**。[Phase 2受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に対象、Blob SHA、CIの確認結果、実Run未取得、再開条件を明記。前HEAD `a538b5d75a756f7b2ae2c2d431facf3df63ae424` の[Web CI #41842768500](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41842768500)は成功。今回の変更後HEADのCIは未確認／成功と断定しない。
- **Progress: 32% (8/25)**。残り17件。実Run必須項目は未チェックのまま。

## 2026-11-04 継続：Playwright JSON reporterの相対パス修正

- Playwright v1.62.0のJSON reporterが`spec.file`を`config.rootDir`相対で出力することを公式ソースで確認。M05 P05直接実行教材と隔離stub契約テストを修正し、Playwright形式のrootDir相対パスでPASS/拒否を検証できるようにした。
- `course:run`共通実行器でも同じ相対パスをリポジトリルート基準で扱っている問題を発見し、[PR #217へ引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6633137546)。共有scriptは本PRで変更しない。
- 作業済みの内部変更は各親項目の下へチェックを追加した。**親のM05-05/M06-04/M07-05は実Runが未実施のため未完了**。25件の受入チェック計算に内部変更のチェックを加算しない。
- **Progress: 32% (8/25)**。残り17件。[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に対象Blob、テストとCIの状況、実Run制約を記録。

## 2026-11-04 継続：P03型検査・M07保全の非上書き・Phase 2引継ぎ

- 前HEAD `4f0da6d1b21ffb26da54e34bb5156ee16edc70dc`の[Web CI #41847988398](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41847988398)は`success`。
- M05 P03：`--noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext`で隔離した誤型短コードは`TS2345`/非0、修正後は終了コード0。新規専用テストはGitHub CIでの検証待ち。本人受入ではない。
- M07：手順3の再実行で既存の`phase2-files.txt`が消失し、手順5で既存`phase2.tgz`が上書きされる問題に対して、Bashの`set -C`で既存ファイルを保護。専用契約テストに新規作成、既存一覧保持、アーカイブ/チェックサム非上書きを追加。
- Phase間：M04→M05（2入力）、M05→M06（1入力）、M06→M07（2入力）、M07→M08（3入力）の参照関係を実際の状態JSONで照合し、専用契約テストを追加。公開fallbackや参照されない出力を、本人の修了証拠とは扱わない。
- 親の受入項目は学習者実Run、実Codespacesでの保全、OpenCode協働等の条件が未達のため**未チェック**。内部完了チェックのみ追加。**Progress: 32% (8/25)**、未完了17件。詳細は[受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)を参照。
