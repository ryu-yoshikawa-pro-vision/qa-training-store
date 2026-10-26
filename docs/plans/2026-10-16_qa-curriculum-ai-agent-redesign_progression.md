# 学習順序・モジュールごとの理解内容と習熟基準

## 到達能力を判定する必須演習（2026-10-26）

| 対象 | 演習・提出 | Level 2に不足する例 |
| --- | --- | --- |
| M02/M04 | 未知仕様から重要な質問・保留期待結果・根拠と影響、第三者引継ぎを作る | 未確認事項を推測で確定させる、質問だけで影響がない |
| M06 | 既存3 CaseのTODO補完に加え、別条件または別Web機能のCaseから短いspecを空の状態からAIと作り、Reset・Locator・Assertion、単独/再実行を確認 | TODO補完だけで自力構成の根拠がない |
| M07 | 重複した操作・変更要求の課題でPage ObjectとPlaywright fixtureの小規模実装・before/afterの別Run、適用不要な条件の判断 | 言葉だけの採否判断、実装しない、Assertionを弱める |
| M09/M10 | M09では`.disabled`のままレビュー。M10では費用・権限・対象specを確認し専用workflowを手動有効化、PR HEADと実Run/Artifactを確認し、trigger変更などの運用判断を示す | 実行せず成功扱い、合成ログや古いSHAを流用、権限と料金を無確認 |

既存の`workspace/Mxx/submission.md`・公開課題・`scoring-tests/Mxx.json`を使い、新しい管理DBは設けない。

## 確定した自習・Phase別判定（2026-10-25）

受講対象はテスト実施または設計経験者。IT・テスト完全未経験者は対象外だが、AI・TypeScript・Git等の初学者を想定して操作から説明する。各モジュールに学習目標別の例、条件変更への本人判断、短い質疑・操作の証拠、自己確認、復習方法を用意する。受講者は評価者の個別承認を待たず次モジュールへ進み、M04/M07/M10で当該Phase全件の証拠をまとめて正式評価する。

- Phase 1：未知仕様から質問・未決・RiskとTRを整理し、4技法から仕様根拠付きCaseまで追跡させ、第三者へ引き継げる成果物を要求する。
- Phase 2：既存3 Caseの実技を維持したうえで、別機能・別条件で短いE2Eを本人が構成する課題を追加する。実際の重複・保守問題に対してPage Objectとfixtureを適切に実装できることと、不要な抽象化を避ける判断を評価する。Reset、独立実行、仕様を検証するAssertion、失敗分析を確認する。
- 選択Phase 3：本人の非公開リポジトリでCIのtrigger・job・最小権限・Secret・Artifact・無料枠・障害時の運用を含む構成を自ら設計・変更し、対象SHAとRunを確認する。単なる手順実行で修了としない。

固定qa-workflow-skillsはQA成果物に責務がある全工程で使い、失敗時の追加指示・手動対応とSkill成功の区別を教える。全対象機能の分析・設計カバレッジと優先度に応じた自動化選定を演習へ接続する。

## 目的と判定方法

既存の[51学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)を、**前提→理解→演習→Level 2の根拠**で具体化する。テスト実施またはテスト設計の経験はあるが、VS Code・AIエージェント・プログラミング・Git未経験の受講者を想定する。新しい必須モジュール・一律の時間・問題数は増やさない。

**Level 2**は、手順やAIの出力をなぞるだけでなく、**条件を一部変えても受講者自身が判断・操作し、その理由を説明できる状態**。教材・公式資料・AIの参照は許可する。コードやコマンドの暗記、全コードの手書きは要求しない。

- Codespaces作成、Skill認識、モジュールロードなど**環境の準備完了を、本人の技能習得と混同しない**。
- 1つの実技で複数項目を判定してよいが、何を観測したかID別に残す。クイズだけで実装や設計を合格にしない。
- 学習者本人が個人Codespacesで`M00`〜`M10`を**1モジュールずつロード**する。後続ロードは過去の成果物を上書きしない。
- モジュール末尾の確認と**フェーズ修了**は別。正式な修了はM04・M07・M10の初見課題で[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)の必須観点すべてをLevel 2以上にする。

## 受講開始ガイド（独立したモジュールにしない）

**既存Planの飛躍**：ターミナルをM00で初めて習うのに、その前に`pnpm course:load M00`の操作を求めていた。

1. 学習用Templateから本人のGitHubリポジトリを作り、所有者・支払主体・無料枠を確認して**2コアCodespace**を起動する。
2. ブラウザ版VS Codeの**エクスプローラー・エディター・ターミナル・Ports**がどこにあるか図示する。PCへのVS Codeインストールは不要。
3. `pnpm course:load M00`を**提示されたままコピーして実行**し、`workspace/M00/`を開く。この段階で`pnpm`の仕組みを問わない。
4. ロード失敗時はコマンドとエラーを確認し、AIに任意の修復コマンドを無制限に実行させない。成功/失敗は環境判定であり修了ではない。

**開始条件**：M00の教材を開ける。安全な初期設定と支払条件を確認済み。

---

## Phase 1：AIエージェントとテスト分析・設計

### M00 学習環境とAIの安全な利用

**順序**：VS Codeでファイルを読む・保存→ターミナルとパス→OpenCode CLI→Skill→AIへの指示→結果・安全の検証。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M00-01 | エクスプローラー・保存・現在位置・相対パス、`pwd`/`ls`/`cd`、終了結果、作業フォルダを確認する | **指定された別ファイル**を開き小変更・保存ができ、実行場所とコマンド結果を説明できる |
| M00-02 | AgentとChat、読取り/編集/コマンド実行の権限、OpenCodeの許可・拒否、SkillとPython helper、無料モデル・Secretを理解する | 指定Skillの実体・依存を確認し、**許可/拒否を根拠付きで判断**できる。AI自己申告を成功証拠にしない |
| M00-03 | 手本の指示の後、目的・参照資料・変更範囲・成果物・完了条件を指定してAIへ依頼する | **条件を変えた小課題**で自分の指示を作り、期待外の結果を指摘・修正依頼できる |
| M00-04 | 変更前後の比較、未実行・失敗、Secret、Privateポート、費用、停止、再ロードの保護を確認する | AIの成功報告を実ファイル/ログで照合し、危険な操作を拒否し、成果物を保全できる |

**次への条件**：本人がAIに読み取らせ、安全に小変更させ、結果を照合できる。Git・TypeScript・Playwrightは不要。

### M01 QAと自動化の基礎

**順序**：テスト目的と期待結果→手動・自動の役割→工程とAI/人間の判断→E2Eの適用範囲。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M01-01 | QA・テスト、確認対象、入力、期待結果、実際の観測をカートの例で区別 | 新しい事例で期待と観測を**混同せず**説明できる |
| M01-02 | 探索、繰返し確認、自動化、リグレッションの役割と制約 | 2つの候補について**目的と再現性**から採否を判断できる |
| M01-03 | 分析→設計→実行→評価→改善、AIの補助と人間の確定責任 | AIの仕様推測や成功報告だけで合格にできない理由を説明できる |
| M01-04 | Unit/Integration/Component/E2Eの概略、E2Eの実行費用・保守負荷 | すべての条件をE2Eにしない理由を**事例に沿って**説明できる |

**次への条件**：何を何の根拠で確認するか示せる。技法によるケース設計はまだ要求しない。

**M02/M04の初見仕様課題**：既知Cartのレビューだけでは修了できない。正式な別機能の不完全な仕様断片から、重要な質問・仕様根拠・未決の影響・確定できない期待結果・次の確認先・第三者への引継ぎを提出する。実装者は題材を正式BR/AC・Role/State・Seed/Resetから選び、評価者は条件を変えた短い質疑で本人判断を確認する。

### M02 仕様とリスク分析

**順序**：BR/ACと観測→Role/State/Data/Journey→Seed/Resetの意味→Impact/Likelihood→AI分析案の点検。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M02-01 | `docs/spec/`のBR/AC、画面の観測、既存テスト、AI推測を区別 | 矛盾例で**期待結果の正本**を示し、不一致を報告できる |
| M02-02 | ロール・状態・データ・操作順を整理して前提条件を記述 | 対象へ影響するRole/State/Data/Journeyと操作後の状態を抜き出せる |
| M02-03 | SeedとReset、初期在庫・カート・ログイン状態の意味（Phase 1では資料で扱う） | 必要なSeedを選び**保証される状態と未保証の状態**を区別できる |
| M02-04 | 影響・発生可能性・優先度の関係を具体例で整理 | **根拠付きで**優先度を比較し、未確認の発生率を事実としない |
| M02-05 | AI分析案の誤読・条件漏れ・未根拠の期待結果を検出 | 誤りを正本に照合し、修正すべき点と未決事項を分けられる |

**次への条件**：仕様ID、対象範囲、Role/State/Data、初期状態、リスク・優先度、未決事項に加え、**何を検証すべきかを表す検証責務（テスト要求相当）**を明記した分析結果を保存する。検証責務には識別子（例：`TR-001`）、対応するBR/AC、関連リスク、期待する成立条件・不変条件と観測対象を紐付ける。成立条件が未確定なら推測せずBLOCKED/未決とする。**同値分割・境界値や実行手順はM03で設計**し、M02の完了に要求しない。

### M02→M03：検証責務からCaseまでの入力・実行契約

M02は**何を検証すべきか**を仕様とリスクから整理し、M03は**どの条件・技法・データ・ケースで検証するか**を設計する。独立モジュールや学習項目IDは増やさない。Skillの機械入力を手作業で暗記・編集できることを習熟目標にしない。

#### M02で確定する意味上の成果物

- 検証責務ID（`TR-001`等）、具体的な検証目的、BR/AC・正式仕様への参照とそのrevision、Role/State/Data/Journey、適用Scopeと根拠、Product Riskと優先度・判断理由、成立条件・不変条件、観測方法、未決事項を**Markdown等で読める形**で保存する。
- 例：数量上限を超える変更が拒否され、変更前のカート数量が維持されること。仕様上の数量上限、拒否時の不変条件、必要なSeed・在庫・ロールを区別する。仕様から確認できない期待結果は推測で埋めない。
- 未確定で条件設計へ進めない責務はM02の未決・BLOCKEDとして残す。**current TR Entityがないまま`requirement_dispositions[]`で対象外・ブロック中などとして処理しない**。Dispositionを実行する場合は`test-requirement-design`由来のcurrent TR Entityが必要である。
- M02の終了時には同値分割・境界値の適用、TCN、CI、Case、手順を要求しない。M03へ渡せる確定責務と、未決・対象外の理由を区別する。

#### M03で作るruntime入力

- 初回の条件設計には固定Skill commit `7cc6cba7772de549841a39d71694cbafbc783324`の`test-condition-design/scripts/condition_structure.py`を**`input_mode="direct"`**で使う。current TR Entityの生成を初心者の必修としない。`artifact` modeであれば別途current TR Entityが必須であり、directの成功をその証拠へ流用しない。
- M02の検証責務の**文章は別成果物**に置き、`input.test_requirements[]`の各行には`tr_id`、`priority`、`authority_refs`、`risk_refs`、`scope_refs`の**5フィールドのみ**を渡す。未定義の`description`、`br_refs`、`expected_behavior`等を追加しない。配列が構造上受理されたことと、根拠の意味・current性が正しいことは区別する。
- `input`全体にはさらに`technique_selections`、`test_conditions`、`requirement_dispositions`、`models`、`previous_tcn_ids`、`previous_model_keys`、`update_scope_tcn_ids`、`update_scope_model_keys`、`inactive_tcn_ids`、`inactive_model_keys`、`inactive_tcn_history`、`inactive_model_history`、`inactive_materialize_history`、`zero_scope_terminal`を**実スクリプトの必須契約どおり**に渡す。初回に必要ない履歴・更新範囲・Dispositionはスキーマに合う空配列などを使い、意味なく過去成果物を作らない。`test_conditions[]`と`models[]`の意味上の設計はM03で行う。
- runtimeリクエストは`metadata`と`input`で構成する。`metadata`は固定版`runtime_contract.py`の**17キー**に厳密一致させ、`input_mode="direct"`、`runtime_unit_key="artifact:condition_structure:all"`を使用する。この`artifact:`はruntime単位の名前でありmode指定ではない。上流Entityは`skill`・`entity_type`・`entity_ref`・`content`の実在する4フィールドで渡し、fingerprintはruntimeの出力から取得する。
- 検証責務のBR/ACと**Authority EntityのIDを同一と推測しない**。M02の根拠→現在の正式仕様→実際のAuthority/製品リスク/Scope参照を確認する。`test_requirements[]`と`test_conditions[]`のTR・Authority・Risk・Scope参照集合を照合し、ScopeはID形式だけでなく実在する対象定義と版を確認する。優先度はM02の判断理由と下流Caseの`高`・`中`・`低`の契約に揃える。
- **`direct`の参照不備はruntimeが必ず拒否するとは限らない**。`condition_structure.py`はTCNの依存解決で`require_all=False`となる場合があり、根拠Entityが欠けたまま`ready`になる可能性がある。入力前に実在性・current性を確認し、出力のTCN/ModelとM02の期待参照集合の差分を照合する。**存在すべき参照を欠く場合は成功にしない**。current TR Entityを用意しないdirectでは、TRのMachine Entity依存そのものは要求せず、TR IDと意味上の根拠をTCN/Caseまで追跡する。

#### Case完成までの正しい工程と判定

1. M02で確定した検証責務・根拠を使い、`condition_structure.py`を`direct`で実行してTCN/Modelを生成する。TCN候補とモデルの内容はM03で設計し、runtime出力のID・Entity・fingerprintを捏造しない。
2. **選んだ技法だけ**の既存runtimeを実行し、実際に生成されたmodel Entityと技法結果・テストデータ要求を確認する。
3. `materialize_coverage.py`は**`input_mode="artifact"`が必須**。実在するcurrent TCN/Model/技法結果を渡してCIを生成し、親TCN・カバレッジ・Scope・モデル依存とfingerprintの整合を確認する。`condition_structure`のdirectから続けてすべてをdirectで実行しない。
4. `test-case-design/scripts/case_structure.py`は**その実行のcurrent TR Entityの有無など、実際のmode契約に従って選択**する。TR Entityのない初回教材ではdirectを候補とするが、**固定commitによる通し検証で可否を確定**する。最低1件のCI、CIの親TCNとCaseのTCN集合、TCN由来のTR集合、期待結果のAuthority、前提/操作/結果・必要データを照合する。後続がartifactだからといってcurrent TR EntityのないCaseを無条件にartifactで呼ばない。
5. `verify_runtime_evidence`で実際の正規化入力、runtime Input/Result、Machine Entity、freshnessと必要なruntime単位を照合する。通常の全件生成では`partial_rerun=false`、`previous_artifact_markdown=null`とする。結果は**`valid=true`**が必要で、さらに仕様とテスト技法の**意味的な妥当性を人が確認**する。

**成功判定は終了コード0や`runtime_status=ok`、`result_status=ready`だけに依存しない。** SkillのCLIは`invalid_input`でも終了コード0を返す場合がある。正常系では結果envelope、`support_status`、`deterministic_generated`、未解決violations、必要なcurrent Entityと最終evidence gateを確認する。誤mode・Authority/Risk/Scope欠落・TR参照欠落・未確定責務・未実行/不一致は成功と報告しない。

**受入検証**：正式なCartのBR/ACを用い、確認済みRisk/Scope/Authorityに対応した**検証責務1件**から、TCN→選択技法→CI→Case→最終evidence gateを**固定Skill commitで実行**する。正常系と、根拠欠落、TCNとの参照不一致、誤mode、current TRなしのDisposition、未解決・未実行の異常系を確認する。既存CI成功はこの実行結果に代用できない。固定commitの処理が契約どおり接続できない場合は原因を記録し、必要な最小限の別経路またはSkill側の不整合として報告する。

### M03 テスト設計

**前提**：M02で根拠のある仕様・初期状態・リスクと、**仕様根拠付きの検証責務（テスト要求相当）**を整理できる。公開の独立開始サンプルを使う場合も同じ入力契約を満たす。

**順序**：M02の検証責務・BR/AC・リスクを確認し、`test-condition-design`の入力に接続→同値分割→境界値→条件の組合せ（デシジョンテーブル）→状態遷移→追跡可能なCase作成。各技法は適用する理由と、適用しない理由も学ぶ。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M03-01 | 同じ動作を期待できる入力の集まりと有効/無効クラスを整理する | 新しい条件で代表値を選び、**同値とみなす根拠・限界**を説明できる |
| M03-02 | 数量・在庫・上限の境界の直前・境界・直後と、拒否時の状態を設計 | 必要な値と**操作後も維持すべき数量などの期待結果**を仕様から導ける |
| M03-03 | 仕様から条件・動作・制約を抽出し、実行可能なルールを持つデシジョンテーブルと対応するCaseを作る | **完成表の点検だけでなく**、未演習の条件から本人がルール・期待動作・Caseを導ける。穴・矛盾・到達不能を見分け、**仕様にない動作を断定せず未決とする** |
| M03-04 | 事前状態→イベント→事後状態、許可・拒否の遷移を整理する | 必要な状態遷移ケースを作り、仕様にない遷移を勝手に追加しない |
| M03-05 | Risk→Condition→Case→BR/AC、前提データ、操作と観測可能な結果をまとめる | 初見条件で**ID・前提・操作・期待結果が対応したケース**を作り説明できる |

**次への条件**：M02の検証責務から必要な技法を選択し、`TR→TCN/CI→Case→BR/AC`の根拠と適用・対象外・未決の扱いを残す。**同値分割・境界値・デシジョンテーブル・状態遷移それぞれについて、完成例とは異なる条件で本人が必要な条件・期待結果を導出したこと**を通常演習の成果物と判断から確認する。全技法を全ケースに機械適用しない。

### M04 設計レビューと自動化対象選定

**前提**：M03で仕様に追跡できるCaseを作成できる。

**順序**：AI案のレビュー→テスト層選定→自動化の採否→未決事項整理→Phase 1総合演習。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M04-01 | AI案の欠落・重複・根拠のない期待結果をレビューする | **正しい提案は採用**し、誤りはBR/ACの根拠付きで直す。指摘を捏造しない |
| M04-02 | M01で学んだテスト層の違いを実際のCaseへ適用 | 検証する動作と費用に合わせてUnit/Integration/Component/Web E2Eを選べる |
| M04-03 | Automate/Later/Do not automateを頻度・リスク・再現性・保守費用から選ぶ | 候補ごとに**自動化する/しない両方の理由**を説明できる |
| M04-04 | 未確定仕様、製品不具合、環境問題、AIの推測を区別する | 不明点を正解にせず**確認事項と次の行動**を残せる |

**Phase 1修了**：未演習の仕様条件をOpenCode/Skillで分析し、根拠・Risk/Condition/Case・自動化候補・AI案の採否を提出する。本人の判断・説明をLevel 2で確認。**Playwright、TypeScript、Git、CIは不要**。

**Phase 2への引継ぎ**：承認済みCase ID、BR/AC、初期状態・データ・操作・期待結果・採否理由・未決事項をMarkdown等で保全する。完了していない実行をPASS扱いしない。

---

## Phase 2：Playwright構築・実装・実行・改善

### M05 Node.js・TypeScript・Playwrightの最小基礎

**前提**：Phase 1で承認したCaseがある。コードやNode.jsの知識は求めない。

**順序と説明対象**：

1. **Node.js**：ブラウザ内のJavaScriptとNode.jsの違い。Scenario Shopサーバー、Playwright runner、ブラウザの役割。
2. **pnpm**：`package.json`の`scripts`、`dependencies`と`devDependencies`、`pnpm-lock.yaml`。依存導入と実行の違い。M00でコピーした`pnpm course:load M00`の意味。
3. **TypeScript**：`const`/`let`、文字列・数値・真偽値、配列・オブジェクト・プロパティ、比較と`if`、関数・引数・戻り値、`import`/`export`、型と型エラー、`async`/`await`。題材は短いテスト関連コードに限定。
4. **Playwright**：`test`、`page`、`goto`、Locator、Action、`expect`、自動待機。最小specを読んで一箇所変更する。
5. **実行経路**：管理者は固定SHAからScenario ShopをBuild・検証・同期する。学習者のCodespacesでは配布済み`course/shop/`を8082でServeし、Seed/ResetとPlaywrightを実行する。受講者側で製品のフルBuildはしない。8081（通常Web）/8082（Training実行）/6080（Private noVNC）、Config、テスト結果・Traceの関係を学ぶ。
6. **失敗の読み方**：構文エラー、型エラー、実行時エラー、Assertion失敗をそれぞれ短い例で観察する。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M05-01 | Node.js/pnpm/TypeScriptの上記最小構文と`test`/`page`/`async`、最小specの実行 | 別の短いコードで変数・関数・`await`・型・実行コマンドを説明し、**一箇所を安全に変更して再実行**できる |
| M05-02 | Role/Name/Label/明示的test IDとLocator一意性、Actionの対象 | 同じ画面から**変化に強いLocator**を選び、対象を取り違えない理由を説明できる |
| M05-03 | 可視性、クリック成功、業務結果、DB保存の保証範囲を比較 | 弱いAssertionを見抜き、**Caseの期待結果を検証するために必要な追加確認**を選べる |
| M05-04 | 自動待機、Web-first assertion、固定待機の問題、エラー分類 | 失敗例のログを分類し、根拠のない`waitForTimeout`を解決策にしない |
| M05-05 | 新課程Config、`testDir`、8081/8082/6080、report/Trace、AIの差分 | **指定された新課程の1 spec**を実行し、対象サーバー・設定・ログ・結果先を示せる |

**次への条件**：提示された短いspecを**読める・一箇所変更できる・実行して結果を説明できる**。M06で初めてCaseからの新規E2E実装を求める。高度なTypeScriptやdevcontainerの全面再構築は要求しない。

### M06 E2E実装と実行

**前提**：M05でTypeScriptの最小コードを読んで小修正でき、1本のspecを実行できる。

**順序**：Phase 1本人Caseが有効ならその参照ID・BR/AC・revisionを記録し、M06固定演習Caseとの一致/相違を照合する。前工程の本人成果物がない/契約に合わない場合はM06の公開fallbackを選び、そのpath・配布元revisionを記録する。どちらの入力でも、Seed/Resetと事前条件→Locator/Action/Assertionへの変換→単独・再実行→コード・ログ・証拠とCaseの照合を行う。fallback利用はPhase 1本人の修了を示さない。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M06-01 | 固定3 CaseのTODO補完に加えて正式仕様・Seed/Resetのある別の未演習Web Caseから本人がAIと空のspecを構成し、操作・Locator・業務Assertionを選ぶ。本人Caseがない場合は別IDの公開fallbackを使いPhase 1修了と区別する | 固定3 Caseと新Caseの相違・出典を説明し、新specを単独実行/Reset後再実行、Case→spec→Assertion→Runを証明。TODOのみ・同等Case転記・未実行ではLevel 2未達 |
| M06-02 | Seed/ResetとBrowser Context、実行順依存・残存データを確認する | 単独実行・再実行で結果を確認し、**状態の共有による誤成功や失敗**を説明・防止できる |
| M06-03 | LocatorとAssertionが仕様上の期待結果を観測するかレビューする | 無関係でもPASSするAssertionを見抜き、**Caseの観測対象へ修正**できる |
| M06-04 | CLI、対象spec、実行結果、ログ、Trace/Report/Receiptを紐付ける | **同じ実行を指す**コマンド・結果・証拠を示し、別RunのPASSを流用しない |
| M06-05 | 未実行/環境BLOCKED/FAIL/PASSを区別する | エラーの発生場所と実行有無に基づき分類し、AIの自己申告だけでPASSにしない |

**実践範囲**：公開入力の固定3 Caseまたは有効な本人Caseをもとに、**正常な業務結果、拒否・異常時の不変条件、境界またはRole/State差**を含む、意味の異なる**3件以上のCase**をE2Eとして実装・レビュー・実行する。件数だけを満たすため、同じ条件の値を変えたCaseを重複させない。本人Caseがある場合は固定演習Caseとの一致・相違を記録し、公開fallbackから開始した場合はM06能力のみを評価する。fallbackをPhase 1本人の設計・修了証拠にしない。Caseとtest/specの対応で数え、specファイル数は条件にしない。少なくとも異なる初期条件を扱い、各Caseの正式仕様・Seed/Reset・操作・業務Assertionを本人が説明する。採用する実行可能な題材は[対象設計](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)に従って決める。すべてのCaseをE2E化する必要はない。

**次への条件**：固定3 CaseのTODOを実装し、別の未演習Web Caseから新規specを本人が構成する。双方の入力元・revision・BR/AC、Reset後の単独・再実行、業務Assertionと各Runを追跡する。TODO補完のみは完了不可。fallback利用はM06を独立して評価する入力経路であり、Phase 1の修了判定とは分ける。AI生成コードのPASSだけでは不足とする。

### M07 失敗分析と保守

**前提**：M06で本人のテストコード・実行結果・ログがある。

**順序**：失敗を再現→ログ/Trace/Screenshot→原因仮説→最小修正→別Runによる再確認→Phase 2総合演習。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M07-01 | Test/Product/Environment/Flakyの原因を仕様・初期状態・ログから考える | **確認済みの事実と可能性**を分け、区別する追加検証を提案できる |
| M07-02 | Trace/スクリーンショット/標準出力/reportを読んで失敗点へたどる | 別Runの証拠から**問題の操作・Assertion**を特定し、画像だけで断定できない点も示せる |
| M07-03 | RetryやTimeout延長と原因修正の違いを整理 | タイミング失敗に対して**原因の切分けを先に選び**、無根拠な固定待機を増やさない |
| M07-04 | AIパッチを仕様・差分・影響から評価し、修正前後の別Runを確認 | **原因に必要な最小修正**を行い、修正後の実行を新たな証拠として示せる |
| M07-05 | 重複・保守変更のある複数specでPage ObjectとPlaywright標準fixtureの必要性を判断し、小規模な実装・変更・再実行を行う。不要な場面では不採用理由も示す | Page Object/fixtureの実コードとimport依存、前後の差分・別Run、業務Assertionの維持・保守効果を説明。採否の説明のみ・未実装・未実行はLevel 2未達 |

**実践範囲**：本人が、少なくとも**3つの異なる原因構造**を持つ失敗素材を証拠から診断する。対象には、(1) Locator・Assertionなどのテストコード側、(2) Seed・初期状態または実行環境側、(3) タイミング・Flakyなどの再現性に関わる原因を含める。製品不具合も仕様と観測の不一致から区別するが、演習のために製品本体へ故意の不具合を作らない。実行可能な修正課題では**少なくとも1件**について、本人が失敗を再現し、原因を裏付ける証拠を得て、必要な最小修正と修正前後の**別Run**を示す。修正すべきでない製品・環境側の問題や再現困難な例では、提供されたログ・Trace等から追加検証・報告を判断してよい。原因名の暗記やRetry成功だけでは完了しない。

**Phase 2修了**：M06の固定3 Caseと別Caseからの新規E2E・独立実行、M07の異種原因の診断・修正、Page Objectと標準fixtureの小規模実装・保守変更・前後別Run、不採用が適切な場面での判断を確認する。総合演習では新しいCaseまたは故意に誤ったspecについて、AIと協働して実装・Reset・実行・原因調査・改善を行い、**Case→spec→Assertion→結果→根拠**を対応付ける。M05の読解やM06の独立性を欠いたまま、Traceを見ただけで合格にしない。Git/CIは不要。

**Phase 3への引継ぎ**：動くspec、Config、Page Object/fixtureを含むimport依存、Reset、コマンド、直近Run・未解決事項をGitなしで保全する。Phase 2はGit不要。Phase 3ではspec単体ではなく、実行に必要な依存ファイルも確認して個別stageする。

---

## Phase 3：GitHub・CIによる継続実行（選択）

### M08 Git・GitHubとレビュー

**前提**：Phase 2で動くspecと、その実行証拠を保全済み。

**順序**：ファイル変更と差分→stage/commit/branch→個人リポジトリへの共有→PR→AIレビューの採否。Phase 2成果物はignoreされたままなので、M07 specを使うときは`git check-ignore -v workspace/M07/repaired-assertion.spec.ts`で規則を確認し、内容からログ/Trace/Secretが混入しないことを読んでから、その一ファイルだけ`git add -f -- workspace/M07/repaired-assertion.spec.ts`でstageする。stage後の名前・差分・`git diff --cached --check`を確認し、`workspace/M07/`の一括追加はしない。Phase 3を選ばない受講者はGit操作を行わない。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M08-01 | Working tree/stage/commit/branch/remote、VS Code上の変更とGit履歴を区別 | 課題ファイルの変更→stage→commit→pushの**各時点の状態**を説明できる |
| M08-02 | `git status`/`git diff`/`git check-ignore`でignoreと差分を確認し、M07本人specと実行に必要なPage Object・fixture・helper等のimport先だけをパス指定でstageする | クリーンcheckoutでも同じspecを実行できる必要ファイルだけをcommitし、ログ・Trace・Secret・個人記録を除外できる |
| M08-03 | PRの目的、変更対象、関連仕様ID、テスト結果、レビュー方法を確認 | 自分の変更をPRとして示し、**何を検証した変更か**を説明できる |
| M08-04 | AIレビューの誤指摘・見落とし・不要な抽象化を評価 | 指摘を根拠から採否判断できる。指摘数の多さを習熟基準にしない |

**次への条件**：学習者個人の同じリポジトリでPhase 2成果物を安全に変更管理できる。CIはM09で学ぶ。

### M09 CIと品質ゲート

**前提**：M08でcommit・PRと対象の差分を理解できる。

**順序**：workflow/trigger/job/runner→依存導入とBrowser→同期済みShopのServe/Test→Run/SHA/Artifact→失敗ログ・権限・料金→品質ゲート。Buildは管理者が固定SHA同期時に行い、学習者workflowには`build:web`を置かない。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M09-01 | YAMLの最小構文、event/job/step/runner、事前Build/同期・配布済みShop Serve・Testの分担を学ぶ | 短いworkflowを読み**いつ・何を・どのRunnerで動かし、誰がBuildするか**説明できる |
| M09-02 | commit SHA、Run/Check/Artifactの関係を無効workflowと公開ログ例から判断する | M09は`.disabled`のままとし、合成証拠・未実行を実Run成功と報告しない。実Run取得はM10で行う |
| M09-03 | install/build/server/test/artifactの失敗段階をログから追う | 失敗Runで**最初に見るJob/stepと該当ログ**を特定できる |
| M09-04 | 本人の非公開リポジトリの無料Actions条件、品質ゲート、trigger・実行対象を比較し最小CIを設計する | リスク・所要時間・無料枠から**必要十分なtrigger・制限**を説明できる |
| M09-05 | 権限・Secret・外部公開・製品正式CIとの分離 | 危険なworkflowや過剰な権限を見抜き、**必要な範囲へ抑えられる** |

**次への条件**：新課程専用workflowの対象spec・起動条件・対象SHA・実行結果を説明できる。新規テストケースの設計を再要求しない。

### M10 Phase 3総合演習

**前提**：M08でGit/PR、M09でCIと対象SHAを理解済み。

**順序**：Phase 2の同じspec再利用→差分確認とcommit/PR→CIで同期済みShopを使った実行→SHA/Run/Artifactの照合→失敗調査→報告。M07 specがあれば`PLAYWRIGHT_TEST_ROOT: workspace/M07`、本人成果物がないときはM10専用fallbackに`workspace/M10/public-sample`を明示する。どちらも過去の本人ファイルを修正・上書きしない。

| ID | 必要な理解・演習 | Level 2の判定 |
| --- | --- | --- |
| M10-01 | Phase 2のspec・Config・Reset・依存を確認し、本人が選んだspec一つをGitへ追加する | 不要なログやSecretを除外し、**公開するコードと理由**を説明できる |
| M10-02 | 無効な専用workflowを本人が安全に手動有効化し、対象spec・HEAD SHAに紐付いた実Runを取得する | 差分/権限/無料枠の事前確認、`.github/workflows/`への有効化、実Run/Artifact・後片付けを示す |
| M10-03 | PR HEAD、SHA、Run/Check/Artifactを対応付ける | HEAD更新後に古いRunを使わず、**現在SHAに対応する証拠**を示せる |
| M10-04 | CI固有の失敗とテスト・製品の失敗を区別する | 失敗例で**原因を区別する最初の調査対象**を選び必要なら別Runで確かめる |
| M10-05 | AI提案の採否と、CIで保証できる範囲・未確認事項を報告する | 実行の保証範囲と残リスクを**過大に表現せず**説明できる |

**Phase 3修了**：受講者個人のリポジトリでPhase 2のspecをCIへ統合し、PR・対象SHA・Run/Artifactと評価根拠を示す。**Phase 1・2の再受講、新規E2E一式の再実装は不要**。Phase 3未受講でもPhase 1・2の修了は維持する。

---

## 教材の制作順序とモジュール間で確認する学習の成立

各モジュールで、[教材の内容品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)に基づき**理解すべき前提→判断過程を説明した例→短い誘導演習→条件を変えた本人の演習→根拠付きの確認と復習**をつなぐ。単純な用語の学習に重い実技を強制せず、技能を伴う項目で説明文と四択だけに留めない。教材の文字数や演習件数を一律の合格基準にはしない。

**代表的に確認する連続工程**：

- **M02→M03**：M02で正式仕様からRole/State/Data/Journey・Risk・検証責務と未決事項を導き、M03で技法選定の根拠、同値クラス・境界・組合せ・遷移の必要範囲、Caseの期待結果へつなぐ。固定Skillの構造・証拠検証と、本人の意味的な判断を別々に確認する。**Cartだけを模写する演習ではなく、別機能または異なる判断構造の独立演習**も用意する。採用する仕様・Seed・観測方法は[対象設計](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)で確定する。
- **M05→M06**：M05で未経験者が既存の環境と短いTypeScript/Playwrightの意味を理解し、一部を自力で変更・実行した後、M06で承認済みCaseを実際のLocator/Action/Assertionへ変換する。PASSだけでなく、期待する業務結果・テスト独立性・実行証拠まで確認する。M05で先取りしてCase全体の実装を要求しない。

代表モジュールの完成例・独立演習・模範解答・クイズ・採点基準を先行制作し、正式仕様・学習順序との整合レビュー、コード/教材レビュー、必要な自動・契約テストを行って結果を反映した後に残りの教材制作へ展開する。**実際の受講者のつまずきや評価担当者の採点再現性を確かめる実地試行は、全11モジュールと関連機能の実装完了後に行い、残りの教材制作開始や実装完了の条件にしない。**実施順序は[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、実地検証の方法と期待結果も同Planに従う。

## 理解事項の分解・再利用と更新

M00〜M10の各IDに対応する細かい理解事項は[基準グラフ](../curriculum/ai-assisted-qa/README.md)に定義する。現在58件登録されている理解事項を、**教材・クイズ・実技・評価基準と接続し、独立して確認が必要な内容へ精査・確定する**。詳細なノード・関係・変更影響・受入条件は[知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に従う。同じ理解事項を複数モジュールで学ぶ場合は先行知識を再利用し、無意味な再説明を増やさない。

- `requires`はモジュール・知識の前提関係。`requires_knowledge`は学習目標を支える理解事項。**出題の前に教えるべき内容があるか**を学習順序と照合する。
- `applies_to`はScenario Shopの**演習候補**、`may_use_skill`は外部`qa-workflow-skills`の**使用候補**を表す。参照関係だけでは、実際に課題へ採用した証拠にもSkillの実行成功にもならない。
- テスト対象・Skillの更新時は、グラフから影響候補を調べ、既存のBR/AC・Skill入出力・実行経路・実技・評価基準を確認する。更新の必要がなければ教材を変更しない。

## モジュールの正しい開始・終了状態

[開始・終了基準状態のPlan](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)に、M00〜M10の**各モジュールで必要な正しい入力状態、終了成果物、正しさの確認条件**を定義する。この文書の「次への条件」は、**本人の学習・判断を含むLevel 2の習熟基準**であり、模範の完成ファイルと一致すれば満たせる条件ではない。

- M04の正しい終了成果（分析・Case・自動化採否）はM05の正しい開始入力へ、M07の動作確認済みspec・Config・結果はM08の開始入力へ、共通のID・revisionで引き継ぐ。
- 前モジュールの本人の成果物が存在しなくても、次モジュールが必要とする**正しい基準入力を特定可能**にする。ただし、自動復元・修了判定の代替はしない。
- M07の意図的に壊れたspecやM09の失敗ログは、開始状態として適切な教材である。開始状態の正しさを全テストPASSで測らない。
- 模範の完成成果物は公開リポジトリに置くため、本人が事前に参照できることを前提とする。Level 2の本人判断は、評価時に初めて提示する条件への適用・根拠説明で確認する。

## モジュール間の前提と先取りを防ぐ条件

| 進む先 | 直前までに本人ができること | まだ要求しないこと |
| --- | --- | --- |
| 開始→M00 | ガイドを使って1回だけM00をロードしREADMEを開く | `pnpm`の仕組み、Git、プログラミング |
| M00→M01 | AIに安全な読取り・小変更を依頼し、結果を実ファイルから確認 | テスト分析技法 |
| M01→M02 | テスト対象・期待結果・AI/人間の責任を説明 | BR/ACの分析とリスク評価 |
| M02→M03 | 仕様ID、初期状態、リスク、**検証責務ID・BR/AC根拠・対象範囲・期待する成立条件・未決事項**を整理 | `test-condition-design`の入力契約を確認して条件設計→Case作成 |
| M03→M04 | 仕様に追跡できるケースを作成 | 自動化対象の最終採否 |
| Phase 1→M05 | 本人が承認したCaseと期待結果を保全 | Node.js、TypeScript、Playwright |
| M05→M06 | 短いTypeScript specを読んで一部修正・実行 | ケースからE2E全体を実装すること |
| M06→M07 | Case→spec→Assertion→実行証拠を対応付ける | 原因切分け・保守改善の独立実施 |
| Phase 2→M08 | 実行済みspecとConfig・結果を保全 | Gitの状態やPR |
| M08→M09 | 差分を確認し安全にcommit/PR作成 | GitHub Actionsの実行 |
| M09→M10 | workflowと対象SHA・Run・Artifactを説明 | 独立したCI総合演習 |

## 飛躍・漏れ・目的逸脱の点検

| 観点 | 現行Planで不足・曖昧だった点 | 必要な対応と検証 |
| --- | --- | --- |
| 最初のモジュールの入口 | ターミナル学習前にロードコマンドを要求していた | **開始ガイドで操作だけ提示**、意味の学習をM00/M05へ分離 |
| VS Codeの基礎 | UI・フォルダ・保存・結果確認の詳細が不足 | M00でファイル操作、相対パス、コマンド結果を演習する。PCへの開発環境導入は不要 |
| Node.js/TypeScriptの前提 | `test`、`page`、`async`だけでは初心者がコードを読めない | M05に変数、配列、オブジェクト、関数、型、モジュール、非同期を**Playwright最小範囲で**追加 |
| 仕様からE2Eへの変換 | Caseと意味のあるAssertionの対応が粗かった | M03で期待結果確定→M05でAssertionの限界→M06でCaseとコードを照合 |
| Resetの学習段階 | Phase 1と2で「初期状態の理解」と「実行」が混在し得た | M02はSeed/Resetの意味、M06はResetの実行と独立性 |
| AI成果物の評価 | AIが動くコードを出しただけで習熟済みになり得た | 本人の採否理由、短い変更、別条件の演習、実行証拠をLevel 2判定に含める |
| Playwright失敗調査 | Trace閲覧だけで原因確定となり得た | M07は事実/仮説→証拠→最小修正→別Runまで確認 |
| CodespacesとGitの依存 | 環境としてGitHubを使うこととGit習得を混同し得た | Phase 1/2はGit・PR・CI不要、M08から段階的に学ぶ |
| 課題の答えの混入 | 公開クイズの解説と修了課題の模範解答が混同され得た | 模範解答・採点用テスト・完成状態はpublicな正本リポジトリで公開レビュー可能とし、学習用Template/同期/ロード/Web配布からは除外する。配布除外は秘密保持ではない |
| 別リポジトリの実行 | 教材だけ配布しても製品・Seed/Resetが動く保証がない | 管理者が固定SHAからBuild/同期し、学習者リポジトリでは配布済みShopをServe/Seed/Reset/Playwright実行する。受講者Buildは要求しない |
| 学習範囲の肥大化 | 初心者対応を理由に一般開発教育へ拡張し得た | TypeScriptの高度な型・Node.js内部・網羅的Git・Native/Maestroを共通の修了条件にしない。Page Object/fixtureはPhase 2の保守設計能力として、根拠ある課題で実装・採否判断を評価する |
| 無料枠と工数 | 2コア完走の起動時間・費用が未測定 | **根拠なく時間・問題数を固定せず**、実際の学習時間・ストレージ・課題で評価する |

## 教材実装時の受入条件

1. **既存51項目すべて**に教材節・初学者向けの説明・必要な例・クイズ/実技・Level 2の観測点・復習先がある。1実技で複数IDを確認する場合もIDごとの評価根拠がある。
2. 各モジュールで**例を確認→本人が短い課題を実行→条件を変えた確認**を行う。単なるコマンド実行やAIの報告で合格にしない。
3. 受講開始ガイドでは、先に教えていない知識を問わず、M00を自分でロードできる。M05まではTypeScriptやGitを理解していなくても進める。
4. **M05でコード読解と一部修正を実証**してからM06でCaseの実装へ進み、M06で実行証拠を得てからM07で原因分析する。
5. M04・M07・M10の独立修了は**それまでに教えた能力のみ**を評価する。後続フェーズのCIや再実装を先行フェーズの合格条件にしない。
6. 正式仕様・既存コード・Seed・Playwright Configを実装時に照合し、存在しない課題・コマンド・未実行結果を確定事項として教材に入れない。
7. 学習者は1モジュールずつ手動ロードする。過去成果物を上書きせず、公開評価資料を学習用Template/同期/ロードへ含めない。資料の本文はpublicな正本リポジトリで確認できる。
8. **OpenCode CLIの認証・無料モデル・必要Skillは受講者の初回起動で確認する**。Codespacesの2コア・保存容量・所要時間やSkill/Playwrightの実行は受講環境として検証し、BLOCKEDと習熟未達を区別する。

## 公式参考資料

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)：変数・基本型・配列・オブジェクト・関数等。
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)：ユーザーに見える振る舞い、Locator、Web-first assertion、テスト独立性。
- [GitHub Codespaces: Quickstart](https://docs.github.com/ja/codespaces/quickstart)：ブラウザ版VS Code、ターミナル、ポート・アプリ起動。
- 実際の演習の仕様・データ・実行コマンドは`qa-training-store`の最新の正式Spec・Playwright Config・Seed/Resetと照合して確定する。
