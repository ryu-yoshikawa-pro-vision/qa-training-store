# PR #199：確認クイズと教材の独立レビュー（2026-11-03）

## 確認対象と結論

対象HEAD：`5099c924bae869755c6a9659ea1d102688aa2170`（修正前）。教材は`docs/curriculum/ai-assisted-qa/`、学習目標の正本は`knowledge-graph.json`、Web四択クイズの正本は`quizzes/Mxx.json`とする。

11モジュールの四択クイズJSONを全件集計し、51件の学習目標が少なくとも1問に結び付いていることを確認した。問題数は78件。**学習目標IDとの対応があることは、設問の正答・評価能力を保証しない**。

M09の四択7問は教材本文、M09の演習、公開の模範解答、採点例と照らし、静的な正答・誤答説明を点検した。対象条件から2つの正答が成立する問題や、正答と教材が明確に矛盾する問題は見つからなかった。ただし、実受講者の理解度、実CI、実モデルによる校正の受入ではない。

## 問題数と学習目標の対応

| モジュール | 学習目標 | 四択クイズ |
| --- | ---: | ---: |
| M00 | 4 | 6 |
| M01 | 4 | 5 |
| M02 | 5 | 8 |
| M03 | 5 | 9 |
| M04 | 4 | 4 |
| M05 | 5 | 12 |
| M06 | 5 | 8 |
| M07 | 5 | 7 |
| M08 | 4 | 5 |
| M09 | 5 | 7 |
| M10 | 5 | 7 |
| **合計** | **51** | **78** |

各`questions[].objective_ids`をグラフの`type=learning_objective`ノードと照合した範囲では、**未対応の目標IDは0件、不明な目標IDも0件**。同一目標への複数問の有無と、実技による別条件の評価は別に判断する。

## 修正した教材の導線

| 対象 | 確認した差異 | 対応 |
| --- | --- | --- |
| M05本文 | 解答を直後に公開する11問が「理解度確認クイズ」と表記され、四択JSONの12問との区別が曖昧 | 本文を「解説付きの自己確認問題（11問）」と表記して別ページの正本へ誘導 |
| M09本文 | 解答を直後に公開する記述式10問を「理解度確認クイズ（全10問）」と表記しており、四択JSONの7問と混同する | 本文を「記述式自己確認問題（10問）」と表記して別ページの正本へ誘導 |
| start-here | 本文中の自己確認とWeb四択クイズの位置付けが明示されていない | 正本、問題数の違い、正式修了判定との分離を明記 |

本文中の解説付き練習は残す。既存の問い・解答を削除せず、クイズJSONと二重の正本を作らない。

## M09四択7問の静的レビュー

| 設問 | 目標 | 判定の根拠と確認結果 |
| --- | --- | --- |
| M09-Q01 | M09-01 | Runnerはjobのstepを実行する環境。Trigger・Artifact・Checkとは異なる |
| M09-Q02 | M09-02 | Artifactのtarget SHAが現在のPR HEADと異なるため、現在のHEADのPASSには流用できない |
| M09-Q03 | M09-03 | Build失敗でTestが開始されていなければ、Test failureやPASSではなく未実行として分ける |
| M09-Q04 | M09-04 | private repositoryのlarger runner費用は組織条件と公式料金の確認なしに断定できない |
| M09-Q05 | M09-05 | 本教材のread-only workflowでは`contents: read`を基本とし、不要なwrite権限・Secretを拒否する |
| M09-Q06 | M09-01 | `steps`は`jobs`内のjobに記述する |
| M09-Q07 | M09-04 | trigger頻度・実行対象・費用・未検証期間を比較し、全停止や無根拠なPASSを拒否する |

判定対象は教材に示された条件下の正答・全選択肢の説明であり、GitHub Actionsの実行料金や権限状態の最新確認ではない。

## 未完了の受入と検証

- M00・M01・M04・M08・M10の**残り27問については、ID・対応関係の集計まで**。正答・誤答理由の独立意味レビューは未完了。
- クイズの復習先アンカー、ブラウザーの実表示・回答保存・旧版回答の拒否は、既存validator/契約テストの範囲と実Web確認を分けて受入する。今回は実Webを動かしていない。
- M09の記述式10問・教材本文の全記述・演習提出物・採点用Caseの全意味一致は未受入。今回のM09レビューは**四択7問の静的正答・説明確認**に限る。
- 51目標への四択の配置は確認できたが、学習目標のLevel 2・3を各問だけで評価できるとは結論しない。学習者本人の実技・採点・外部Skillの実Runは別に受入する。
- M09の実CI課金・外部PR権限・Run/Artifactの利用条件と正式AI校正106 Caseは未実施。
- この変更ではScenario Shop製品SUT・正式製品仕様・既存E2E・定期実行4件の分析台帳を変更しない。

## 再確認

```bash
pnpm format:check
pnpm test:contracts
pnpm lint:text:all
```

CIでは今回の最終HEADに紐づく結果を確認する。合格しないジョブを教材修正の根拠なく修正しない。

## 2026-11-03追記：M02・M03の四択17問を独立レビュー

開始時HEAD：`2e7bb0f9983d1044bffa7c46bea96a1120dc1a29`。M02の8問・M03の9問について、質問の条件、正答、誤答選択肢の理由、教材本文、正式Cart・Storefront・状態仕様、該当Seed、演習の範囲を静的に照合した。実受講者による理解確認、ブラウザー表示、Playwright実行、正式AI評価ではない。

| 設問 | 正答 | 独立確認した根拠 | 参照箇所 |
| --- | :---: | --- | --- |
| M02-Q01 | C | 正式BR/ACと観測・AI報告・既存テストの区別 | cart.md:9-11,70-74 |
| M02-Q02 | C | low-stockの在庫3とdefault購入上限5からmin=3 | scenarios.ts:44-46; default-dataset.ts:323 |
| M02-Q03 | A | 操作主体・事前状態・数量をRole/State/Dataへ分類 | M02 README:238-290 |
| M02-Q04 | B | 実測のないLikelihoodを影響と分離した仮説として記録 | M02 README:359-421 |
| M02-Q05 | B | 拒否後状態の未規定を質問・保留し、AIの推測を採用しない | M02 README:441-484 |
| M02-Q06 | B | 追加2→4は拒否し数量2を維持、更新3は許可（在庫5/購入上限3） | cart.md:9-11,70-74; M02 README:166-184 |
| M02-Q07 | C | 同一Seedの存在のみでは前Testの副作用が消えない | state-and-scenarios.md:19-23; M02 README:290-353 |
| M02-Q08 | D | TRの出典・AC・範囲・revisionの追跡が必要 | M02 exercise.md:5; M02 README:677-682 |
| M03-Q01 | C | 有効上限3に対する合計4の追加を拒否し数量2を維持 | cart.md:9-11,70-74 |
| M03-Q02 | B | 同一SKUで数量を合算する | cart.md:9-11 |
| M03-Q03 | A | カテゴリ内OR、ブランドとの間はAND | storefront.md:13-15 |
| M03-Q04 | B | abandonedは終端、activeへの逆遷移を禁じる | state-and-scenarios.md:15-17 |
| M03-Q05 | B | 検証条件に合う技法を選び、不採用理由も説明する | M03 README:466-484 |
| M03-Q06 | B | 複合条件の真偽表にはデシジョンテーブルが適する | M03 README:308-380 |
| M03-Q07 | C | Aかつ非Aは到達不能、Seed不足は別の未準備状態 | M03 README:369-379 |
| M03-Q08 | D | runtime検証のPASSは意味的妥当性の受入ではない | M03 README:512-565,828-832 |
| M03-Q09 | B | 架空の0以下拒否/1〜3有効/4以上拒否の3クラス | M03 README:71-89 |

### 修正した設問

- **M02-Q06**：購入上限3だけでは有効上限を決められない。在庫が2の場合は数量3への更新も拒否され、正答Bが成り立たない。そこで同一SKU・在庫5・購入上限3・全体上限99、各操作を独立した数量2の初期状態から行うと明記した。正答Bの説明を有効上限の計算に合わせた。
- **M03-Q09**：現行のCart正式仕様では数量0は削除操作として有効であるが、従来の設問は「0以下拒否」の架空仕様との区別が曖昧だった。Cartとは別の仮想フォームであると明記し、復習先を同値分割の一般説明節へ移した。正答Bは変更していない。

修正後は17問とも提示された条件から正答が一意に導け、ほかの選択肢の理由も条件と矛盾しないと静的に判断した。独立意味レビューの累計は**24/78問**（M02:8、M03:9、M09:7）、残りは**54問**（M00/M01/M04〜M08/M10）。51学習目標へのID対応が存在することと、実技・評価・授業での理解が成立することは別の受入条件とする。

直接確認はJSON構文・17問の問題数・正答値および差分の静的点検のみ。今回の3ファイル変更に対する`pnpm format:check`、`pnpm test:contracts`、`pnpm lint:text:all`と同一最終HEADのCI結果は**未検証**として残す。Scenario Shop製品SUT、正式仕様、既存E2E、定期実行4件の台帳は変更しない。

## 2026-11-03追記：M05四択12問の独立レビュー

開始時HEAD：`8a4ec4ef15a575240cc30aafe12a28ffdaf6dbe6`。教材、演習P01〜P06、模範成果物、専用Config、package.json、Playwright/TypeScript公式仕様を照合した。12問すべてで提示条件から正答が一意に導けることと全選択肢の理由を静的に点検した。実ブラウザー・実受講・正式評価の受入ではない。

| 設問 | 正答 | 確認した理由 | 根拠 |
| --- | :---: | --- | --- |
| M05-Q01 | A | Node.js・package.json・pnpmの役割を区別 | package.json / M05 §1 |
| M05-Q02 | B | page.gotoは既定のload完了条件まで待つ | Playwright Page.goto / M05 §6 |
| M05-Q03 | B | getByRoleはLocatorを作りクリックしない | Playwright Locators / M05 §6A |
| M05-Q04 | A | toBeVisibleは可視性のみを検証 | Playwright Assertions / M05 §7 |
| M05-Q05 | A | 固定待機の前に失敗原因と期待結果を確認 | M05 §6.3・§8 / 演習P06 |
| M05-Q06 | B | loopback 8082、専用testDirと結果先 | playwright.ai-assisted-qa.config.ts / settings.ts |
| M05-Q07 | B | 配列の添字1は5 | Node.js v22.16.0実行：5 |
| M05-Q08 | B | cart.quantityを4に変更 | Node.js v22.16.0実行：4 |
| M05-Q09 | C | 2>=3が偽なので範囲内 | Node.js v22.16.0実行：範囲内 |
| M05-Q10 | D | number引数2と3の加算は5 | Node.js v22.16.0実験的TS型除去：5 |
| M05-Q11 | B | aria-label購入がbuttonのアクセシブル名 | M05 §6A / Playwright Locators |
| M05-Q12 | C | stringをnumberへ代入するとTS2322 | tsc --noEmit --strict：終了コード2 |

### 修正した不整合

- **M05-Q02**：`await page.goto`の待機範囲を既定の`load`イベントまでと明確化。後続の通信・結果表示は別途確認する。無関係なTypeScript Everyday Typesの出典をPlaywright Page.goto公式へ置換。
- **M05教材 §7.1**：LocatorとAssertionのみの例にActionがない点を明記。コメント番号、テスト名、ナビゲーション待機の説明を修正。可視性からリンク先の正しさを推論しない。
- **M05模範成果物 P05**：演習・default Seed・参照specで同一の`product-mug`（セラミックマグ）/`product-low-stock`（コンパクトタオル）のIDと名称を明記。

### 直接検証と未受入

- Q07〜Q09はNode.js v22.16.0の実行結果を確認。Q10は同環境でTypeScript型除去（実験的機能）により5を確認。
- Q12は独立した一時ファイルを`tsc --noEmit --skipLibCheck --strict --target ES2022`で検査し、TS2322・終了コード2を確認した。リポジトリの`pnpm`による型検査・Playwright実行を行ったわけではない。
- TrainingのConfigで接続先loopback 8082と、許可されたworkspace/assessment領域・専用JSON reporterを静的確認した。M05 P05参照specの実Runは未受入。
- 本人のM05 before/after Run、P01〜P06の実行と提出・採点照合、標準のformat/lint/test、最終HEADの全必須CI成功は未確認のまま残す。

**累計36/78問の独立意味レビュー完了**（M02:8、M03:9、M05:12、M09:7）。**残り42問**（M00:6、M01:5、M04:4、M06:8、M07:7、M08:5、M10:7）。ID対応の集計78問/学習目標51件とは別判定。製品SUT、Seed/Reset、正式仕様、既存E2E、分析台帳、定期実行4件のPlanは変更しない。

## 2026-11-03追記：M06四択8問とCase・Reset・Assertionの整合レビュー

開始時HEAD：`fe61b5d3a310b95101a04eed1aef708b040f5405`。M06四択8問を教材本文、演習の固定3 Caseと新規CASE-CART-004/005、配布開始素材、完成参照spec 3ファイル、模範成果物、`scoring-tests/M06.json`、正式Cart仕様、Reset helperと照合。正答・各誤答の理由について、設問の条件下で明確な矛盾や二重正答を認めなかった。クイズJSON自体の変更は不要と判断した。

| 設問 | 正答 | 対応学習目標 | 正答と誤答を判別する根拠 | 参照先 |
| --- | :---: | --- | --- | --- |
| M06-Q01 | A | M06-02 | 各testの前提に合うReset/Seedで開始状態を作る。Retry・固定順序は独立性を保証しない | M06本文§2、reset-scenario.ts、Playwright Isolation |
| M06-Q02 | B | M06-03 | Cart見出しの可視性だけでは上限超過の拒否・数量維持を検証していない | M06本文§3、BR-CART-001/AC-CART-001 |
| M06-Q03 | A | M06-01/03 | Case前提・操作・期待・BR/ACをReset/Action/業務Assertionへ対応付ける | M06本文§1/§6、演習の提出条件 |
| M06-Q04 | B | M06-04 | 変更後specとRun/入力revision/実行コマンド/結果を一致させ、別specのsummaryを流用しない | M06本文§6、course:run実行契約 |
| M06-Q05 | C | M06-05 | 接続障害でCase本体を開始できなければ環境BLOCKED・未実行の原因を記録する | M06本文§5/§6 |
| M06-Q06 | A | M06-01/05 | テストコードが原因なら学習用specだけを修正し別Runで結果を確認。製品SUTとAssertionを変更しない | M06本文§4、演習手順と変更境界 |
| M06-Q07 | D | M06-01 | 新規Caseの開始条件・操作対象・Action・業務Assertion・期待結果を対応付ける | M06本文§4、K-M06-06、演習P01 |
| M06-Q08 | B | M06-03 | Locatorの一意性とActionの成功だけでは数量結果を保証せず、別の業務Assertionが必要 | M06本文§3、K-M06-07 |

### 教材本文の修正

- **独立性の説明（§2.2）**：従来の「`test.beforeAll`だけでResetすると2番目以降のtestが前のCart状態を引き継ぐ」は、Playwright Test既定のtestごとに分離されたBrowserContextと矛盾していた。Context分離によりブラウザ内状態は通常引き継がれないが、特定のSeedが適用されたことも保証されないと訂正。`page`はtest単位のfixtureで`beforeAll`に使えないこと、各test冒頭または`beforeEach`でResetと前提確認を行うことを明記。根拠：<https://playwright.dev/docs/browser-contexts>、<https://playwright.dev/docs/test-fixtures>、`training/playwright/support/reset-scenario.ts`。
- **Caseの要求範囲（§1・§4）**：章前半では削除`CASE-CART-004`だけの実装と読めたが、演習・scoring-tests・正式提出は削除004と数量更新005を独立した2 testとして要求している。未完成specのTODOを使う前提、両testの実装、再実行、SHA/Run証拠の案内へ統一。新しい課題や模範解答は追加しない。
- **識別子の誤表記（§1.2）**：商品IDの`product-mug`をSKUと誤記していたため、default Seedに一致する商品ID=`product-mug`とSKU=`P-0002-ONE`を区別した。根拠：`src/seeds/default-dataset.ts`の製品定義とvariantのSKU生成規則。

### 独立に確認した実技と採点の対応

- 固定CASE-CART-001/002/003は、完成参照`cart-cases.spec.ts`に独立testとして存在。`resetScenario`によるdefault/low-stockの初期化と業務Assertionの配置を静的確認した。
- 削除CASE-CART-004は`remove-item.spec.ts`、数量更新CASE-CART-005は`quantity-update.spec.ts`に別testで実装されている。演習の受講者提出先はこの2完成specの参照先ではなく、未完成`workspace/M06/new-case.spec.ts`であり、評価時に答えの転記だけで実行済みと認めない。
- `scoring-tests/M06.json`の5つの評価基準（M06-CR-01〜05）と12件の校正Caseを確認。P01〜P06、004/005の再実行、Run/SHA、fallbackとPhase 1修了の分離、未実行の拒否が要求されていることを照合。各Caseの**実モデル判定は未実施**。

### 検証範囲と未受入

- 静的レビューは8/8問。M06クイズのJSON/正答値・各選択肢、関連Markdown、完成参照spec・Reset helperの読み取りを実施。実Playwright/Chromium・Codespaces・本人のP01〜P06・受入テストの直接実行ではない。
- 変更後HEADの`pnpm format:check`、`pnpm lint:text:all`、`pnpm test:contracts`と全必須CIは未受入。開始時HEADのWeb CI #41603123632は失敗済み。Style Quality（2契約テストの整形）、Contracts（assessment cacheの期待エラー・supported-behaviorsのstatus期待）、required Chromium E2E、validate、verifyの未完は今回の教材修正では解決しない。

累計の四択独立意味レビュー：**44/78問**（M02:8、M03:9、M05:12、M06:8、M09:7）。残り**34問**（M00:6、M01:5、M04:4、M07:7、M08:5、M10:7）。全51学習目標のID対応確認と、実技・採点・実ブラウザーでの達成判定は別に残す。製品SUT、正式仕様、既存Seed/Reset、既存製品テスト、分析台帳、定期実行Planは変更しない。

## 2026-11-03追記：M07四択7問と診断・保守演習の独立レビュー

開始時HEAD：`4fcb7f65f805e586405899c3165e742dd8f2a1d7`。M07の7問について、全選択肢の理由、教材本文、演習P01〜P06、診断素材A/B/C、配布開始素材、完成参照spec、正式Cart仕様、`playwright.ai-assisted-qa.config.ts`、5評価基準・10校正Caseを静的に照合した。正答値は7問とも変更しない。校正Caseは内容と期待判定のみの確認であり、実モデルによる判定結果ではない。

| 設問 | 正答 | 学習目標 | 正答と誤答を判別する根拠 | 照合した資料 |
| --- | :---: | --- | --- | --- |
| M07-Q01 | A | M07-01 | 一回の失敗Runだけで確定原因を決めず、Test/Product/Environment/Flakyの仮説と確認計画を残す | M07教材§1、演習P01〜P03 |
| M07-Q02 | C | M07-02 | 同一Run ID・対象spec版に証拠を対応付ける。スクリーンショット等の取得時刻は同一とは限らず、各証拠の限界を区別 | M07教材§2、新課程Playwright Config |
| M07-Q03 | D | M07-03 | Retry/Timeoutの増加やAssertion削除は原因解決の代替ではない | M07教材§3、演習P03 |
| M07-Q04 | B | M07-04 | 変更前後の別Run・spec SHA・差分・仕様上の期待結果を照合する | M07教材§4、演習のdiagnosis/Run契約 |
| M07-Q05 | A | M07-05 | 既存重複と保守負荷を確認して必要な範囲だけ共通化する | M07教材§5、完成maintenance-before/after |
| M07-Q06 | C | M07-05 | 共通の操作・LocatorはPage Objectに、Case固有の業務Assertionはtestに置く | M07教材§5、完成maintenance-after/cart.spec.ts |
| M07-Q07 | A | M07-05 | test単位のfixtureスコープと必要なSeed/Resetを確認する。Context分離だけでは指定Seedを保証しない | M07教材§5〜6、Playwright Isolation、Reset helper |

### 修正した不整合

- **M07-Q02**：同じRunに属するログ・Trace・スクリーンショットが「同じ時刻」でなければならないかのような正答文を修正。同じRun IDと対象spec版で対応付け、各証拠の取得時刻・保証範囲を確認する。復習先も教材§2の4種類の証拠へ合わせた。
- **M07教材§2**：「別Runのログとスクリーンショットを見比べること自体を禁止」という説明を修正。異なるRunを一組の成功証拠として混同することは禁止するが、対象Run・spec SHAを分けて修正前後を比較することは本演習の必須作業。Runの識別子は配布元`source_sha`・実行した`spec_sha256`を使い、GitコミットSHAと混同しない。
- **M07教材§2・M07演習**：専用Configは`trace: "retain-on-failure"`、`screenshot: "only-on-failure"`を指定している。PASS時にこれらが残らない条件を説明し、receipt・JSON reportを確認せず「Traceなし＝未実行」と誤判定しないよう修正。
- **M07教材§4・診断素材**：素材Aは存在しない商品見出しを期待する実Assertion失敗、修正用`repaired-assertion.spec.ts`のbeforeはTODOエラーであり、異なる失敗原因・spec・Run。TODOを仕様に沿う業務Assertionへ置き換えてafterで検証する手順と、診断素材Aを変更しない条件を明記。TODOの置換を製品側の不具合修正とは呼ばない。
- **M07教材§6**：Playwright Testは既定で各testに独立BrowserContextを割り当てる。前testのブラウザ内Cartが後testへ必ず残るという誤った例を改め、test単位のContext分離と各testに必要なSeed/Resetの適用を区別。
- **M07模範成果物**：診断素材Aは実行可能な期待Assertion失敗、説明用ログB/Cは人工データという出所の違いを明記した。M07の完成参照spec・Scoring本体は変更しない。

### 実技・評価の静的照合結果

- 診断素材Aの参照specは意図的に存在しない商品見出しを期待する。修正版参照specは商品見出し「セラミックマグ」と数量1を業務Assertionで確認する。学習者が実行したRunとは別物として扱う。
- `maintenance-before/cart.spec.ts`は2件のReset・Cart操作を各test内に記述。`maintenance-after/cart.spec.ts`はPage Objectとtest単位fixtureで共通化し、数量1・2のAssertionと再読込後の数量2保持を検証する3件目を保持。**参照コードが存在することはbefore 2件/after 3件PASSの証拠にはならない**。
- M07の`scoring-tests/M07.json`は評価基準5件・校正Case10件。異なるRun・spec SHA、POM/fixtureとCase Assertion、3件目の再表示Case、公開fallbackと実証拠の区別を要求する。実OpenCode採点・106 Case校正は未実施。

### 検証範囲・未受入

- 7問と関連Markdown/参照specの意味レビューを実施。実ブラウザ、受講者によるbefore/after実Run、`course:assess`、全評価基準の実モデル採点、学習環境内の`pnpm format:check`/`pnpm test:contracts`は未実施。
- 開始時HEADのWeb CI #41604340562は確認時点で未完了、既に`Vitest (contracts)`と`Style Quality`がfailure。今回の教材修正はそれらの原因修正と扱わず、最終HEADのCIで別途判定する。

独立意味レビュー累計：**51/78問**（M02:8、M03:9、M05:12、M06:8、M07:7、M09:7）。**残27問**（M00:6、M01:5、M04:4、M08:5、M10:7）。学習目標IDの静的対応51件/51件とは別の進捗であり、全11モジュールの意味的総合受入、実技、配布、正式AI評価、CIの成功は未完了のまま残す。製品SUT・正式仕様・Seed/Reset・既存E2E・定期実行4件の分析台帳とPlanは変更しない。
