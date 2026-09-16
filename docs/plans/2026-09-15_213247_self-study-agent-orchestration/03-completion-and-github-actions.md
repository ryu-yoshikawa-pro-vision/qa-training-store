# 詳細3：受講者向け修了確認・記録・Part 2の引き渡し

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> 実行記録（Execution Receipt）、修了確認記録（Completion Receipt）、Part 1からPart 2への引き渡し、GitHub Actionsのデータフローはこのファイルを正本とする。ウェーブの順序は詳細2だけを参照する。

## 5. 受講者向け修了確認の責務

「受講者向け修了確認」は、受講者がレッスン／Trainingの完了条件を満たしたかを、受講者成果物・実行結果・証跡から確認する仕組みである。GitHub Actionsはテストやこの確認を実行するCI基盤であり、確認そのものではない。

ADR-0023のGuardrailsを優先する。引き渡しは固定された`handoff-root/`配下の既存成果物で成立させ、成果物の位置・対応・versionを列挙する新しいJSON Manifest、sidecar metadata、独自Evidence URI、採点用Manifestは追加しない。既存の`training-copy-source.json`はTraining Copyのsource SHA確認用の既存metadataとして再利用し、新しい正本Manifestへ拡張しない。ケースと学習者コードと実行記録の対応は、既存のTest Case ID、Workbookの既存`implementation_path`、Playwrightのテストタイトル／注釈・メタデータ、Receiptの`case_id`等から解決する。Execution Receiptは既存Runner／Reporterまたは既存Playwright実行経路へ接続した薄いadapterが生成する実行事実、Completion Receiptは構造・実行条件・記録参照の確認結果として扱い、`required_competencies`／`checked_competencies`は既存評価基準への追跡情報であって成績・理解度・能力合格の自動採点ではない。受講者状態DB、新しい汎用Runner、署名／信頼基盤を追加しない。この解釈で実装できない場合は、ADR改訂または責任者の明示承認なしにT1／T2を開始しない。

正式なローカル入口は次で固定する。現在のリポジトリにはこのコマンドと実装ファイルはまだ存在しないため、T1で追加する。既定ではローカル専用の入口とし、`validate:curriculum`や既存Training workflowのallowlistへ自動的に追加しない。CIから呼ぶ必要がW0で判明した場合は、T2の変更対象へworkflow、allowlist、validator、関連Contract Testを明示的に追加し、L2の構造変更確認を経てから進める。

    corepack pnpm run training:completion:check -- --mode <common|part2> --root <handoff-root>

責務を次の3つに分ける。

| 仕組み | 確認するもの | 確認しないもの |
| --- | --- | --- |
| validate:curriculum | リポジトリ側のレッスン、ワークブック、Training資材、構造 | 受講者の理解、学習者作成の差分、実行時の証跡 |
| 受講者向け修了確認 | 固定Handoff root、既存成果物、ケース対応、コード、実行記録、ローカルに存在するEvidence参照、CI参照の形式・対応 | 文章の意味理解、答案の完全一致、GitHub上のRun／Check／Artifactの実在性・最終状態 |
| 自己確認／講師向け資料なしの受講者一巡確認 | 判断理由、期待結果と実際の結果、原因、修正理由、次レッスンへの説明 | 機械的なパス／スキーマ検査の代替 |

受講者向け修了確認はローカルで実行できる。第2部（Part 2）でGitHub Actionsを使う場合も、CIの実行結果を受講者がブラウザーで確認した環境証跡として取り込み、CI自身の未確定な最終結果を事前入力にはしない。ローカルの確認処理は、その記録の形式・固定Handoff root内の配置・Receiptとの対応・参照の存在を確認するが、GitHub APIを使わずにRunの実在、最終`success`、Checkの結論、Artifactの現在の存在や別Runでないことを独立証明しない。

## 6. 実行記録（Execution Receipt）の契約

### 6.1 責務と生成者

実行記録（Execution Receipt）は、テストを実際に実行した時点で、実行ランナー（runner）／ラッパー（wrapper）／Playwrightレポーター（Reporter）が生成する実行記録である。自動確認がテストを実行したことにして生成してはならない。

現在の `training:web:exercise` はPlaywrightを直接実行しており、`training/playwright/exercises`全体を対象にする。提供開始用コード（`training-exercise-starter.spec.ts`）にはAssertionがないため、明示的な記録生成は、開始用コードだけ、基準実装だけ、またはsuite全体のPASSを学習者テストの成功として記録するものにしてはならない。実装開始時のW0では、現行のPlaywrightレポーター（Reporter）、出力配置、既存の実行経路、CIのアップロード順、既存のケース対応情報を再確認し、既存のTest Case ID、Workbookの既存`implementation_path`、テストタイトル／注釈・メタデータ、Receiptの`case_id`等から学習者コードのテスト結果を個別に識別・追跡できることを確認する。Owner回答済みの方式を再選択するのではなく、既存Runner／Reporter／実行結果を正本として、実行後に機械的事実を自動生成できる最小の接続を確定する。既存経路だけでは不足する機械情報を結合する薄いadapterが必要な場合も、既存コマンドを置き換えず、独立した新しい実行Runner、状態DB、手書きReceiptを追加しない。既存経路と最小接続で成立しない場合は、具体的な不足と既存契約で解決できない理由を記録してT2を停止する。

### 6.2 必須項目

| 項目 | 内容 |
| --- | --- |
| `case_id` | 実行したテストケースID。ケースを特定できないsuite実行は、対象ケースを別途列挙する |
| `run_context` | ローカル／Training Web／診断教材の初回実行など、同じケースの実行を区別する値 |
| `command` | 実際に実行したコマンド。予定コマンドを後から書き換えない |
| `exit_code` | 実行プロセスの数値終了コード（exit code） |
| `started_at` / `finished_at` または `executed_at` | 実行時刻。タイムゾーンを明記する |
| `retry_count` / `attempts` | Playwrightの自動Retryを受講者の修正後再実行と混同しないための回数と各試行の終了コード（exit code）／result／Artifact参照 |
| `source_sha` | Part 1／Commonでは、実際のGit metadataから取得できる場合だけ記録する任意項目。ZIP等で取得できない場合は省略し、架空値を作らない。Part 2のTraining Copy実行では、`training:copy:prepare`と`training-copy-source.json`が確定した40文字の完全SHAを必須とする。Receiptの項目表に含める場合も、Part 1／Commonでは条件付きであり必須ではない |
| `code_digest` | 実行対象の学習者コードの内容Hashまたは、既存Runner／Reporterが提供できる生成元情報。提出後に内容を差し替えたことを見逃さないための参照値 |
| `artifact_refs` / `evidence_refs` | レポート（Report）、トレース（Trace）、スクリーンショット（Screenshot）、動画（Video）、ログ（Log）、成果物（Artifact）等の追跡可能な参照。未生成のパスは書かない |
| `environment` | OS、実行環境（Runtime）、ブラウザー（Browser）、CI／ローカルなど、再現に必要な環境情報。機密情報（Secret）、トークン（Token）、パスワード（Password）、認証情報（credential）は含めない |

必要に応じて`project`、`browser`、`viewport`、`seed`、`attempt`を追加する。`result`はPASS／FAIL／NOT_RUNのいずれかで記録できるが、`exit_code`と実行事実を置き換えない。

- 同じ`case_id`でも`run_context`が違えば複数の実行記録を持てる。
- CIの自動Retryは同じ実行の`attempts`として記録し、受講者が修正してから別コマンドで再実行したC09の「修正後」とは区別する。RetryだけでPASSになった場合、原因分析・修正・再実行の学習成果を満たしたとは扱わない。
- C09の診断対象に初回（initial）と修正後（repaired）の記録を作る場合は、必ず異なる`run_context`にし、同じ記録を上書きしない。受講者ケースが最初からPASSした場合は、正しいテストを意図的に壊してinitialを作らず、診断教材の初回／修正後記録をC09の標準経路として使う。
- 意図的な失敗教材の記録は、学習者ケースの記録とは別のケース／コンテキストとして扱う。
- NOT_RUNの記録を作る場合も、実行されていないことを明示し、架空の成果物（Artifact）を添付しない。
- `case_id`を実行結果だけから推測できない場合は、既存のTest Case ID、Workbookの既存`implementation_path`、テストタイトル（title）、注釈／メタデータ（annotation／metadata）、Receiptの既存参照などを実装時W0で確認して結合する。新しい対応表や独立Manifestを追加せず、既存情報でも対応を成立させられない場合はT2の停止条件へ戻す。ファイル名や検証構文を識別規則にしない。

Execution Receiptが保証するのは、既存Runner／Reporterまたはそれを呼び出す薄いadapterが生成した実行事実と、記録内の構造・追跡整合性である。Receiptにはproducer／生成元情報、対象コードの`code_digest`、各試行、実際の終了コード、Artifact参照を可能な範囲で記録するが、署名のない提出JSONだけで受講者が実行したことや外部環境を含む完全な実行真正性を保証しない。`training:completion:check`は提出されたReceipt／Evidenceの構造を確認し、確認できない真正性をPASSへ補正しない。既存Runner／Reporterで実行事実を出せず、後付けの手書きReceiptを信頼する必要がある場合はT2を停止する。

## 7. 修了確認記録（Completion Receipt）の契約

### 7.1 責務と生成者

修了確認記録（Completion Receipt）は、正式な `training:completion:check` を実行した結果として生成する出力である。自動確認の入力に修了確認記録自身を必須にして、自己参照を作らない。

最低限、次を持つ。

| 項目 | 内容 |
| --- | --- |
| `mode` | common／part2。Native／iOSの選択課程は既存Native契約で扱い、この受講者向け修了確認の対象に混ぜない |
| `status` | PASS／INCOMPLETE／FAIL／BLOCKED／NOT_RUN |
| `checked_case_ids` | 確認したケースIDの一覧 |
| `checked_outputs` | 各必須成果物・条件の確認結果 |
| `execution_receipt_refs` | 参照した実行記録 |
| `evidence_refs` | 参照した証跡 |
| `missing_requirements` | 欠けている条件 |
| `blocked_reason` | 環境によるBLOCKの場合の理由。その他は空欄可 |
| `source_sha` | Part 1／Commonでは任意。取得できる実値だけを記録し、取得できない場合は項目自体を省略する。Part 2ではTraining Copyの正式な40文字の小文字完全SHAを必須とし、`training-copy-source.json`および`training:copy:validate`と一致させる |
| `required_competencies` | `mode`に応じた既存評価基準上の必須能力項目。`common`はC01〜C07／C09〜C10、`part2`はC01〜C07／C09〜C12。Native／iOSの選択課程（C08）は既存Native契約で別に扱う |
| `checked_competencies` | このReceiptで機械的な構造・実行条件を確認した能力項目。意味理解をPASSと記録する欄ではない |
| `semantic_understanding` | 常に`NOT_EVALUATED`。自己確認・Workbook・V1で扱う意味理解を機械確認へ混ぜない |
| `checked_at` | 判定時刻とタイムゾーン |

Completion Receiptのスキーマ版は`schema_version: 1`とする。出力先は`<handoff-root>/receipts/completion-receipt.json`とし、入力の`receipts/`には実行済みのExecution Receiptだけを置いてこのCompletion Receipt自身を含めない。Completion Receiptは実行記録やEvidenceを集約する独立の採点Manifestではなく、受講者向け修了確認処理が固定Handoff root内の既存入力を構造的に確認した結果である。`required_competencies`は`mode`に対応する既存評価基準の参照、`checked_competencies`は構造確認を行った項目の一覧に限定し、個別の合否点数、理解度、受講者状態を保存しない。

状態の意味を固定する。

- PASS: その`mode`で自動確認対象として定義した構造・成果物・実行記録・ローカルに存在するEvidence参照・記録されたCI参照の形式と対応が揃い、検出可能な契約違反がない。GitHub上のRun／Check／Artifactの実在性・最終状態を独立再検証したこと、受講者が全ての判断理由を理解したこと、Level 2の理解が完全に証明されたこと、カリキュラム全体の受講者修了を意味しない。
- INCOMPLETE: ワークブック／コード／ケース対応／自己確認の存在確認／証跡参照など学習成果の一部が不足している。
- FAIL: 実行が失敗した、契約違反がある、証跡とケースが対応しないなど、成果物または実行が要求に反する。
- BLOCKED: アカウント、権限、実行環境（Runner）、基底URL（Base URL）、ブラウザー（Browser）など環境要因で評価を完了できない。未確認の学習成果をPASSへ変換しない。
- NOT_RUN: 必要な実行がまだ行われていない。予定コマンドや基準実装の成功だけではPASSにしない。

終了コード（exit code）はPASSだけ0とし、INCOMPLETE／FAIL／BLOCKED／NOT_RUNは0以外とする。状態と終了コードを入れ替えず、`blocked_reason`と`missing_requirements`を出力する。

複数ケースの全体`status`は、次の順序で決定する。①契約違反、ケース不一致、実行失敗などが1件でもあれば`FAIL`、②①がなく環境要因で必要な確認を完了できなければ`BLOCKED`、③必要な実行が未実施なら`NOT_RUN`、④必要ファイル・自己確認・追跡情報などが不足すれば`INCOMPLETE`、⑤それ以外を`PASS`とする。`FAIL`／`BLOCKED`／`NOT_RUN`を、別のケースのPASSや後付けEvidenceで上書きしない。

`Completion Receipt`のPASSは「そのmodeで自動確認対象として定義した構造・成果物・実行記録・Evidence参照・CI参照の形式と追跡条件を満たし、検出可能な契約違反がない」という意味だけである。ローカル確認はGitHub API等を使わない限り、Run IDがGitHub上に実在すること、そのRunが最終的に`success`であること、Checkの結論が`success`であること、Artifactが現在も存在すること、Artifact URLが別Runのものでないことを証明したとは扱わない。`source_sha`をCompletion Receiptへ持たせる場合も、Part 1／Commonでは任意・省略可能、Part 2ではTraining Copyの正式な40文字SHAとの一致が必須という条件付きスキーマにする。受講者のCommon修了は、`Completion Receipt`の機械確認PASS、各Lessonの自己確認、公開された最低回答基準に基づく受講者自身の確認を組み合わせて成立する。Part 2／C12最終修了は、Training Copy上の受講者作成Testに対するGitHubブラウザー確認のEvidenceを別途満たす。講師の個別採点は必須に戻さない。講師向け資料なしの受講者一巡確認（V1）は、教材実装側の開発時受入検証であり、各受講者が毎回実行する修了処理ではない。

`mode`ごとの必須能力範囲は既存評価基準に合わせる。`common`はPart 1のC01〜C07／C09〜C10でGitHub Actionsを必須にせず、`part2`はCommonの成果を引き継いだC01〜C07／C09〜C12として、Training Copy上のGitHub ActionsのRun／Check／Artifactに関する受講者確認と記録を必須にする。ローカルの受講者向け修了確認は、これらのCI参照が必要な形式で記録されていることと他成果物との対応を確認するが、GitHub外部状態の実在性・最終結論を独立再検証しない。Native／iOSの選択課程は既存Native契約とC08の成果物で扱い、この受講者向け修了確認の新しいPlaywright中心の`mode`へ混ぜない。これらはReceiptの機械確認範囲を定めるものであり、意味理解の自動採点ではない。

### 7.2 Playwrightの必須成果

CommonのWeb課程における最低成果は次の全てである。これはC07で機械確認する最低限の境界であり、P1-5全体の練習範囲そのものではない。P1-5では、代表縦断ケースに加えて正常系、境界／異常系、明示的なSeed Scenario／Reset、状態変更、Desktop Web、受講者作成ExerciseのMobile Web実行、WorkbookのTest Caseと実行結果の対応を維持する。件数は固定しない。

- ワークブックの`test_case_id`と対応する学習者作成のPlaywrightコード。
- P1-3のケース引き渡しと同じリスク、仕様（Spec）、BR／AC、前提条件、役割／アカウント、初期データ、リセット、操作、期待結果の参照。
- 明示的な初期シナリオ／リセット。`resetScenario`など既存Harnessの正規入口を使うか、同等の再現可能なリセットを実行事実とともに示す。
- テストケースの期待結果または確認すべき状態変化に対応する意味のある操作。
- 対象状態を特定する意味のある要素特定。
- 期待結果または状態変化を判定する意味のある検証。
- デスクトップWeb（Desktop Web）の実行成功と、Commonで必要と定めた範囲のモバイルWeb（Mobile Web）実行。
- 実行記録、証跡、ワークブックとの追跡情報。
- 開始用コードをそのまま実行しただけではない学習者作成の差分。

`training:web:exercise`／`training:web:mobile:exercise`が提供開始用コードを含むディレクトリ全体を実行する場合も、既存情報から対応付けた学習者コードのテスト結果がExecution Receiptへ個別に現れなければ、開始用コード、基準実装、suite全体のPASSをC07の実行成功とみなさない。学習者テストが実行されていない場合は`NOT_RUN`、コードまたは対応が不足する場合は`INCOMPLETE`、実行が失敗した場合は`FAIL`という既存の状態契約へ従い、別テストのPASSで上書きしない。

C07の学習成果の最低条件として、初期データ／リセット、意味のある操作／要素特定／検証、実行記録、証跡を含める。受講者向け修了確認処理がこのうち機械的に確認するのは、明示的なReset契約、Assertionの存在と既知の無意味パターン、実行事実、Evidence、追跡など安定した条件だけであり、意味の妥当性は自己確認／Workbook／V1で確認する。BrowserContext分離だけ、基準実装だけ、開始用コードだけではリセットや学習者成果の代替にならない。

### 7.3 意味のある検証の定義

意味のある検証とは、テストケースの`expected_result`または、そのケースで確認すべき状態変化に対応している検証である。これはC07の学習目標としてWorkbook、自己確認、各Lessonの最低回答基準、V1で説明・確認する。自由なPlaywright実装を1つの構文へ強制しない。

許容される確認の例:

- 期待する表示テキストまたはエラー状態。
- 役割やアクセス状態の変化。
- Cart数量、合計、在庫、状態の変化。
- 期待するURL遷移。ただしケースの操作経路／期待結果に対応する場合だけ。
- 業務上の結果、成功・拒否・再計算などの状態変化。

受講者向け修了確認が機械的に拒否できる既知の条件は次に限る。意味の判定ではなく、構文または記録から明らかに確認できる欠陥として実装する。

- `expect(true)`等、既存契約で明らかに無意味と定義した既知のパターン。
- Assertionが存在しないこと。
- `expect`の存在だけをASTで確認したコード。
- ケースIDがワークブックと一致しないコード。
- 開始用コードをコピーして変更していないコード、基準実装だけのPASS、証跡がない実行。

自動確認はAST上の`expect`の存在だけで理解を採点せず、任意コードと自然言語の`expected_result`の意味的一致を完全判定しない。機械確認は、既存情報から解決したCase IDとコードとReceiptの追跡、コードの存在、既知の開始用コード境界、明示的なReset契約、Assertionの存在と既知の禁止パターン、実行記録、終了コード／result、Evidence、記録されたCI参照の形式・対応、NOT_RUNでないことを安定して確認する。GitHub API等を使わない限り、Run IDの実在、最終`success`、Checkの結論、Artifactの現在の存在や別Runでないことは機械確認の対象外とする。ケースと関係ないDOM要素、固定URLだけ、期待結果と対応しない検証、Locatorの適切さ、設計／Risk／Layerの理由、修正理由の技術的妥当性は、自己確認／Workbook／各Lessonの最低回答基準／V1で確認する。

### 7.4 必須の不正系フィクスチャ

契約テストには、機械的に安定して判定できる次の各ケースを専用フィクスチャで持つ。フィクスチャは`tests/fixtures`または一時引き渡し一式で生成し、正本ワークブックや受講者の作業領域へ書き込まない。

- 検証はあるがリセットがない。
- リセットはあるが検証がない。
- Assertionがない、または`expect(true)`等の既知の無意味パターンだけである。
- ケースIDがワークブックと一致しない。
- 開始用コードをそのまま実行しただけ。
- 基準実装がPASSしただけ。
- 証跡が存在しない。
- NOT_RUNのまま。
- 架空の証跡パス。
- 別ケースの証跡を流用している。
- 引き渡しの絶対パス、一式の外のパス、シンボリックリンク、欠損ファイル、誤ったスキーマ。

正常系フィクスチャは、複数の書き方を許容した意味のある操作／要素特定／検証、明示的なリセット、対応するケース、実在する実行記録／証跡を持つ。

無関係なDOM要素、固定URLだけ、期待結果と対応しない検証など、任意のケースの意味を一般的に機械判定できない条件は、契約テストの不正系フィクスチャにしない。これらは自己確認と講師向け資料なしの受講者一巡確認で拒否・再説明を求める条件として残す。

## 8. 能力項目と修了確認の対応

既存評価基準の第1部（Part 1）CommonはC01〜C07とC09〜C10である。Playwrightテストが1件PASSしただけでは、これら全ての修了を意味しない。

| 能力項目 | 主な証跡 | 自動確認 | 人による自己確認 |
| --- | --- | --- | --- |
| C01 | 自動化する／しない判断と理由 | 参照・構造の存在を一部確認 | なぜ自動化するか必須 |
| C02 | Spec／BR／AC／テスト条件 | IDと追跡構造 | 条件を導いた理由必須 |
| C03 | リスクと影響判断 | `risk_id`／対応の構造 | なぜそのリスクを選んだか必須 |
| C04 | テストケースと期待結果 | ケース行・必須値 | 設計技法とケース選択理由必須 |
| C05 | テストレイヤー | 値とケース対応 | なぜUI E2E以外／なぜUI E2Eか必須 |
| C06 | 自動化判断 | 値と理由欄の存在 | 自動化の価値・コスト（Cost）の説明必須 |
| C07 | 学習者作成のPlaywrightコード／実行 | ケース対応、初期データ／リセット、操作／要素特定／検証、記録／証跡を強く確認 | 期待結果と実装・実行結果の説明必須 |
| C09 | 失敗 → 復旧 | 診断教材または自然な学習者Failureの初回／修正後の記録、失敗／証跡参照。学習者ケースがPASSした場合は診断教材を標準経路とする | 原因、切り分け、修正理由の説明必須。意図的失敗教材の非0終了だけでは代替しない |
| C10 | 改善 | 差分、再実行、追跡情報 | 何を改善しなぜ最小か必須 |

自動確認は機械的に検証可能な構造と実行証跡だけを扱う。自己確認、ワークブックの理由、講師向け資料なしの受講者一巡確認を組み合わせて初めて自己学習の修了とする。自動確認のPASSを「理解を完全に証明した」と表示しない。Native C08と第2部（Part 2）の既存能力項目は既存評価基準と選択課程の契約を参照し、CommonのWeb課程のPASSへ混ぜない。

## 9. 第1部（Part 1）→ 第2部（Part 2）の引き渡し／教材用コピー（Training Copy）への移行

### 9.1 引き渡しの入力

第1部（Part 1）完了後、受講者は次の固定ディレクトリ構造を一つの外部引き渡し一式として用意する。Part 1／CommonではGit repositoryや完全な`source_sha`を必須の入力にしない。

    handoff-root/
      workbook/
        01_target-risk.csv
        02_test-cases.csv
        03_automation-mapping.csv
        04_execution-improvement.csv
      code/
      evidence/
      receipts/
      self-check/

- `workbook/`には受講者が書き出した既存4つのワークブックCSVを置く。
- `code/`には学習者作成のPlaywrightコードを置く。
- `evidence/`には実際の証跡または人間可読な証跡参照を置く。
- `receipts/`には第1部（Part 1）の実行記録を置く。修了確認記録は入力に含めず、判定後に生成する。
- `self-check/`には受講者の自己確認本文を置く。
- ケースとコードと実行記録の対応は、新しい対応表を追加せず、既存のTest Case ID、Workbookの`implementation_path`、Playwrightのテストタイトル／注釈・メタデータ、Execution Receiptの`case_id`等から解決する。Part 1で元ソースSHAを確認できた場合は既存の実行記録等へ実値を記録し、ZIP等でGit metadataがない場合はSHA不明のまま引き渡してよく、架空値を補わない。Part 2の正式なsource SHAはTraining Copy作成時に別途確定する。

受講者の作業場所は自由でよい。ZIPを使う場合も、ZIPを直接Git履歴へ持ち込むのではなく、展開して引き渡し一式のパス／スキーマ検証を行う。

### 9.2 配置の出力と移行対象

`training:copy:prepare` は、Git repositoryから指定した40文字の完全SHAをcheckoutした新しい使い捨ての教材用コピー（Training Copy）を作るが、第1部（Part 1）の成果物を自動的には取り込まない。prepareは元のworkflowをarchiveし、activeなTraining workflowと`training-copy-source.json`を配置する既知のprovisioning差分を作る。そこで、既存の同等処理がない場合は、最小の引き渡し配置手順または薄いコマンドを用意する。Part 1の元ソースSHAが不明でも、Part 2側で正式SHAを確定してから進める。Training CopyをC12／Training CIとPart 2最終修了の正式経路とし、Git／GitHub基礎学習でForkを使った場合は、CIへ進む前にTraining Copyへ切り替える。Fork上のRun／Check／ArtifactをC12のTraining Copy成功証跡へ読み替えず、Fork専用のC12経路も作らない。

配置の出力は、指定ソースSHAをHEADに固定し、prepareの既知のprovisioning差分を持つ教材用コピー（Training Copy）と、そこへ受講者成果を配置した第2部（Part 2）用の引き渡し一式である。materialize後のworking treeには学習者成果の差分が生じるため、「履歴／HEADが指定SHAであること」と「working treeが無変更であること」を同一視しない。ForkはGit／GitHub基礎学習の作業環境としては利用できるが、C12／Training CIの評価境界やPart 2最終修了の正式経路にはしない。Training Copyのルートを第2部（Part 2）の評価境界として使う場合は、次のパスを生成する。

    <training-copy>/
      training/workbook/01_target-risk.csv
      training/workbook/02_test-cases.csv
      training/workbook/03_automation-mapping.csv
      training/workbook/04_execution-improvement.csv
      training/playwright/exercises/learner/
      learner-handoff/evidence/
      learner-handoff/receipts/
      learner-handoff/self-check/

固定Handoff rootの`workbook/`、`code/`、`evidence/`、`receipts/`、`self-check/`を、それぞれTraining Copyの`training/workbook`、`training/playwright/exercises/learner`、`learner-handoff/evidence`、`learner-handoff/receipts`、`learner-handoff/self-check`へ配置する。各ディレクトリ内の相対参照は配置後の既知のルートから解決し、元の作業場所の絶対パスや任意の外部参照を持ち込まない。ケース対応は既存のTest Case ID、Workbookの`implementation_path`、テストタイトル／注釈・メタデータ、Receiptの`case_id`等から解決し、新しい対応表やManifestを追加しない。

移行するもの:

- 4つの学習者ワークブックCSV（提供サンプルを含む受講者の作業用コピー）。
- 学習者作成のPlaywrightコード。既存Trainingコマンドが実行できるtraining/playwright/exercises/learner配下へ配置する。
- 第1部（Part 1）の実行記録と証跡参照。必要な証跡ファイルだけをlearner-handoff配下へ取り込む。
- 第1部（Part 1）の自己確認。受講者の説明を保持するが、機械確認は自己確認の存在・安全な参照・ファイル種別だけを検査する。
- ケースID、Part 1で確認できた場合の元ソースSHA、配置結果など、次レッスンが必要とする参照情報。Part 2の`training_copy_source_sha`は`training:copy:prepare`側で別に確定する。

移行しないもの:

- 外部引き渡し一式の.git、node_modules、build cache、OS依存絶対パス、未使用の個人ファイル。
- Password、Token、Secret、credential、個人情報。
- 修了確認記録。これは移行前の必須入力ではなく、第2部（Part 2）の評価後に生成する出力である。
- 正本リポジトリへ直接書き戻す完成答案、別人のケース、架空証跡。
- 無関係なソース、本番ワークフロー、正式な回帰テストの変更。

### 9.3 配置の検証と復旧方法

入力:

- 検証済みの引き渡し一式。
- Part 2のTraining Copy作成に使う40文字の小文字の正式なsource SHA。Part 1で記録した元ソースSHAがある場合も、同一revisionであると仮定せず、追跡情報として保持する。Part 1側が不明でもこの入力を補うための架空値は作らない。
- まだ存在しない対象ディレクトリ。
- 学習者がプッシュ可能なGitHubリポジトリ、アカウント、権限。

検証:

1. `training:copy:prepare` で指定SHAをHEADにした新規コピーを作る。対象が既に存在する場合は上書きせず停止する。
2. prepare直後に`training:copy:validate`を実行し、有効なworkflowの許可リスト、既存の`training-copy-source.json`の完全SHA、resolved SHA、HEAD、templateとのバイト単位の一致、最小権限を確認する。検証は既知のprovisioning差分（archive済み元workflow、activeなTraining workflow、既存のsource metadata）を前提にし、clean working treeを要求しない。
3. 検証済みTraining Copyへmaterializeし、固定Handoff rootの既知ディレクトリ、4つのCSVスキーマ、コード種別、記録スキーマ、既存情報によるケース追跡を確認する。Part 1とPart 2のrevisionが異なること自体はFAILにしない。materializeが作る4つのCSV、learner code、Evidence／Receipt／self-checkは学習者差分として記録する。
4. materialize後に`training:copy:validate`を再実行し、HEAD／既存の`training-copy-source.json`／workflow契約を再確認する。`git status`／`git diff`では、prepareの既知のprovisioning差分、materializeの学習者差分、その他の予期しないsource差分を三分類し、unexpected source差分があれば停止する。学習者差分があること自体は失敗理由にしない。
5. materialize後に、Workbookの構造、Test Case ID、既存情報によるケース対応、現在のTraining Copy上で解決できるPlaywrightコード、必須Training command、Receipt／Evidence参照、必要な型確認／契約テスト、提供サンプルと学習者成果の分離を確認する。互換性問題が出た場合は、壊れた成果物、Part 1／Part 2のどの変更が原因か、既存形式で最小修正できるかを確認し、自動変換frameworkを新設しない。
6. Common課程モードの受講者向け修了確認を実行し、第1部（Part 1）成果の引き継ぎが切れていないことを確認する。その後、Part 2のTraining Copyでブランチ、コミット、プッシュ、PRを行い、Training workflowへ進む。Forkを使っていた場合は、この時点までにTraining Copyへ切り替える。Training Copyが用意できない場合は、Git／GitHub基礎学習までを継続し、C12／Training CI以降をBLOCKEDまたはNOT_RUNとする。

materializeは、検証済みの新規Training Copyの評価境界へ成果を配置するだけで、元のPart 1作業場所、外部Handoff、正本Repository、既存の別Training Copyを自動削除・上書きしない。対象パスの衝突や途中失敗は停止し、部分的な配置を次工程の入力にしない。

段階ごとの識別子と作業ツリー状態を混同しない。

| 段階 | HEAD／識別子 | working tree | 主な確認 |
| --- | --- | --- | --- |
| `prepare`直後 | `training_copy_source_sha` | prepare由来の既知差分あり | `training:copy:validate`で`sourceSha`／`resolvedSourceSha`、HEAD、workflow契約を確認 |
| `materialize`後 | `training_copy_source_sha` | prepare差分＋学習者差分 | `training:copy:validate`を再実行し、三分類の差分を別途確認。clean treeは要求しない |
| 学習者commit後 | `submission_sha` | cleanを目標にする | source SHA、提出SHA、変更範囲、commit内容を別のGit確認で記録。既存の`training-copy-source.json`のHEAD検証と混同しない |
| GitHub Actions実行時 | `ci_sha` | CIがcheckoutした評価対象 | Run／Check／Artifactと`ci_sha`を記録し、Retryを各attemptとして残す |

`part1_distribution_sha`はPart 1の配布元を識別できる場合だけ記録する任意の参照値であり、`training_copy_source_sha`、`submission_sha`、`ci_sha`とは別の値である。`training-copy-source.json`の既存キー`sourceSha`／`resolvedSourceSha`はTraining Copyの正式値として扱い、Part 1のSHA不明を補うために改変しない。

復旧方法:

- 対象が存在する場合は別の安全な空の対象を使う。既存対象を自動削除・上書きしない。
- 元ソースSHAが解決しない、HEADと既存の`training-copy-source.json`が一致しない場合はコピーを進めず、SHAを再確認する。
- パス／スキーマ／ケース対応が不正な場合は元の編集場所へ戻って書き出しをやり直す。
- GitHubアカウント／権限／Runnerが用意できない場合はCommonの完了状態を失わせず、第2部（Part 2）をBLOCKEDまたはNOT_RUNとして記録する。
- 配置処理が途中で失敗した場合は、そのコピーを完了扱いにせず、部分的な移行を次工程の入力にしない。

## 10. GitHub Actionsとのデータフロー

循環依存を避けるため、ワークフロー前、ワークフロー中、ワークフロー完了後を分ける。

### ワークフロー実行前に存在するもの

- `training:copy:prepare`で確定した正式なsource SHAをHEADにした教材用コピー（Training Copy）、prepareの既知のprovisioning差分、ブランチ、PR。working treeの学習者成果差分があることと、履歴／HEADが指定SHAであることを混同しない。
- 学習者作成のワークブック、コード、ケース／引き渡し。
- 第1部（Part 1）の実行記録／証跡参照。
- 有効なTrainingワークフローとテンプレートの検証結果。
- ワークフローが読む権限は既存の`contents: read`を基本とし、機密情報（Secret）、デプロイ（Deploy）、OIDC、追加GitHub API Tokenを要求しない。

### ワークフロー中に生成されるもの

- validate:curriculum、ビルド（Build）、Training Webの基準実装／学習者演習の実行結果。
- 学習者作成テストのExecution Receipt。既存の`output/training/playwright`配下へ生成し、CI Artifactの同じ保存範囲へ含める。Receiptの保存場所を増やす場合は、workflowのpathとContract Testを同じ変更で更新する。
- トレース、スクリーンショット、動画、HTMLレポート、コンソール／ログ。
- upload-artifactが保存するワークフロー成果物（Artifact）。アップロードはテスト実行後に行い、記録／証跡の生成順を壊さない。

### ワークフロー完了後に確定するもの

- GitHubワークフローの実行ID（Run ID）、確認（Check）の結論、成果物（Artifact）のURL／識別子。受講者がブラウザーで確認した人間可読な参照として、ReceiptからArtifact内の相対パスまで追跡できるようにする。
- それらを受講者が環境証跡として`handoff-root/evidence/`または既存Workbookの`evidence`へ記録したもの。`04_execution-improvement.csv`の`evidence`は、ローカルでは固定Handoff root内の相対パス、CIではRun／Check／Artifactの人間可読な参照として記録し、独自Evidence URIを追加しない。
- 上記のローカル記録を参照して、受講者向け修了確認が生成する修了確認記録。記録の存在・形式・対応は機械確認するが、GitHub上の外部状態を独立再検証した結果ではない。

第2部（Part 2）の受講者向け修了確認は、ワークフロー内で自分自身の最終実行ID（Run ID）、確認（Check）、成果物（Artifact）が確定する前にそれらを必須入力にしない。既定経路では、ワークフロー完了後に受講者がTraining Copy上のRun／Check／ArtifactとArtifact内のReceiptをブラウザーから確認し、必要なArtifactを取得または参照して、Run ID／Check／Artifactの人間可読な参照を固定Handoff rootへ記録し、次の正式コマンドをローカルで再実行して修了確認記録を生成する。GitHub API呼び出しや追加Tokenは必須にしない。ローカル処理が確認できるのは記録の形式・存在・Receiptとの対応までであり、GitHub上のRun実在性、最終success、Check結論、Artifactの現在の存在や別Runでないことではない。

    corepack pnpm run training:completion:check -- --mode part2 --root <handoff-root>

ワークフロー内で受講者向け修了確認を実行する必要がある場合も、実行前に存在する成果と今回のテスト実行結果だけを確認する事前／暫定確認に限定し、最終PASSと修了確認記録の確定はワークフロー完了後に行う。既定のT1入口はworkflow／`validate:curriculum`の対象外である。既存Trainingワークフローの権限、成果物アップロード順、`training:web:exercise`のpull_request条件をW0で再確認し、CI接続が必要ならtraining-ci.yml、workflow allowlist、validator、関連Contract TestをT2の最小差分として同時に更新する。CI接続が既存Guardrails内で説明できない具体的な制約が見つかった場合は、その事実と影響範囲を記録してT2を停止し、今回の確定方針との衝突だけを再確認する。

## 11. 第2部（Part 2）の修了境界

- Commonは、機械確認可能なCompletion ReceiptのPASS、各Lessonの自己確認、公開された最低回答基準に基づく受講者自身の確認が揃えば、GitHub Actionsがなくても完了できる。Completion ReceiptのPASSだけではCommon修了とはしない。
- 第2部（Part 2）のGit／GitHub基礎学習では学習者自身のForkを利用できる。C12を含むTraining CIとPart 2最終修了は、GitHubアカウント、Training Copy、ブランチ／PR、ワークフローの実行（Run）、確認（Check）、成果物（Artifact）、CI実行記録を必要とする。Fork上のRun／Check／ArtifactをTraining CopyのC12成功証跡へ読み替えない。Training Copyが利用できない場合は、Forkで基礎学習まで継続し、C12／Part 2最終修了はBLOCKEDまたはNOT_RUNとする。本体Repositoryへの直接push、Organization／repository管理者権限、Secrets管理、branch protection変更、GitHub App設定、workflow権限設定変更は必須にしない。
- ローカルで同じテストがPASSしただけでは第2部（Part 2）完了へ変換しない。
- Native／iOSは選択課程であり、Nativeを選択しない場合はP2-6をスキップしてP2-7へ復帰する。iOSのビルドだけをCommonのWeb課程や第2部（Part 2）のWeb CIの代替にしない。
- CIがNOT_RUN、成果物（Artifact）が取得不能、確認（Check）が失敗、引き渡しが不完全な場合はPASSにしない。原因に応じてINCOMPLETE、FAIL、BLOCKED、NOT_RUNを出す。

## 12. Owner回答済みのW0確定事項

3つの主要論点に関するOwner回答は確定事項であり、実装開始時に同じ質問を再度行わない。W0では、最新main、既存実装、教材、既存契約、ADR-0023、GitHub Actions設定を読み取り専用で確認し、決定と矛盾しないこと、既存実装で既に満たされているものを再実装しないことをRunへ記録する。具体的な矛盾が見つかった場合だけ、詳細5の停止条件に従って事実・衝突理由・影響範囲・推奨する最小修正を再確認する。

- Execution Receiptは、Playwright等のテストを実際に実行した後、可能な限り既存Runner／Reporter／実行結果から、既存のTest Case ID、Workbookの`implementation_path`、テストタイトル、注釈／メタデータ、Receiptの`case_id`等の追跡情報と結合して自動生成する。`exit_code`、実行時刻、command、Evidence参照、実行環境等の機械的事実を学習者に手書きさせない。WorkbookにはFailureの原因、Evidenceの確認、修正理由、改善内容、再実行結果の解釈を記録するが、Receiptの代わりにしない。未実行Receipt、意味理解の自動採点、独立Manifest、Receipt状態DB、新しい独立Runnerは追加しない。既存経路と最小の結合で成立しない場合だけ、詳細5の具体的停止条件へ進む。
- Part 1／Commonの`source_sha`は任意とする。Git metadataから実際の40文字SHAを取得できる場合だけ記録し、ZIP等で取得できない場合は未設定のまま完了できる。Part 1のHandoff／Execution Receipt／Completion Receiptに`source_sha`を持たせる場合も任意・省略可能とする。Part 2開始時は正式な40文字の小文字完全SHAを独立して確定し、`training:copy:prepare` → `training-copy-source.json` → `training:copy:validate`を正本としてTraining CopyのHEADとsource SHAを確認する。Part 1とPart 2のrevision一致は要求せず、不一致自体をFAILにしない。
- Part 2のGitHub環境はTraining Copyを正式経路とする。Git／GitHub基礎学習に限りForkを利用できるが、Fork上の成果はC12／Part 2最終修了のTraining Copy成功証跡へ読み替えない。Training Copyでbranch作成、commit、push、PR作成、GitHub Actionsの実行、ブラウザーでのRun／Check／Artifact確認を行う。学習者へ要求するのは対象repositoryへの通常の書き込みと必要な閲覧操作までであり、Organization／repository管理者権限、Secrets管理、branch protection変更、GitHub App設定、workflow権限設定変更、workflow編集は必須にしない。
- Part 1成果物をPart 2へmaterializeした後は、固定Handoff rootの既知ディレクトリ、Workbook構造、Test Case ID、既存情報によるケース対応、現在のTraining Copyで解決できるPlaywrightコード、必須Training command、Receipt／Evidence参照、必要な型確認／契約テスト、提供サンプルと学習者成果の分離を確認する。revision差だけを理由に停止せず、互換性問題がある場合は壊れた成果物、原因となる変更、既存形式での最小修正可否を確認し、自動変換frameworkを新設しない。
