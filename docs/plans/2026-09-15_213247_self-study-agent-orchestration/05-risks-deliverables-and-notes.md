# 詳細5：リスク・成果物・W0記録

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> ウェーブの順序と厳密な変更対象は詳細2、レッスン／ワークブック／引き渡しは詳細1、記録／CIデータフローは詳細3、検証は詳細4を正本とする。このファイルでは同じ契約を再定義せず、リスクと引き継ぎ事項を整理する。

## 7. リスクと実装時確認事項

### リスク

- 教材を説明文の追加だけで膨らませると、受講者が次の行動を判断できないままになる。各レッスンの目的、入力、実施内容、観測、出力、自己確認、完了条件、復旧方法、引き渡しを実演可能な契約として書き、講師向け資料なしの受講者一巡確認を最重要ゲートにする。
- TC-CART-101を唯一の答えとして配布すると、リスクから複数のケースとレイヤーを選ぶ学習が失われる。TC-CART-101は受講者が選ぶ代表縦断ケースであり、別ケースの非UI E2Eレイヤーと理由も残す。
- 正本ワークブックへ学習者答案を入れると、提供サンプルと学習者作成成果物が混ざる。正本はテンプレート／サンプルに限定し、学習者行は作業用コピー／引き渡しだけに置く。
- 編集場所を自由にすると、評価時にコードや証跡を見つけられない可能性がある。作業場所は自由にし、引き渡し一式と教材用コピー（Training Copy）の実行パスを評価境界として固定する。
- 引き渡しパスを文字列のドット有無で判定すると、spec.tsやcsvを誤拒否したり、親参照を見逃したりする。絶対パス、正規化後のルート外、要素完全一致の親参照、ルート外シンボリックリンク、存在性、ファイル種別、スキーマを別々に検証する。
- 自動確認を強くしすぎると自由なPlaywright実装を拒否し、弱くしすぎると開始用コード／基準実装を成果と誤認する。ケースID、Reset契約、Assertion存在、既知の無意味パターン、実行記録、証跡、追跡を機械確認し、Assertionの意味やケースの期待結果との対応、理解は自己確認／一巡確認へ分ける。
- 実行記録と修了確認記録を同じ記録として扱うと、実行事実を自動確認が後付けする循環になる。実行記録は実行ランナー（runner）／ラッパー（wrapper）／レポーター（Reporter）、判定記録はtraining:completion:checkと責務を分ける。
- GitHub Actionsの実行（Run）／確認（Check）／成果物（Artifact）を同じワークフロー内の事前条件にすると循環依存になる。ワークフロー前・中・完了後のデータフローを分け、最終の修了確認記録は実行（Run）完了後に生成する。
- 第2部（Part 2）のGitHubアカウント、権限、実行環境（Runner）、成果物（Artifact）の保存期間に依存すると、Commonまで進められなくなる。Commonはローカルで完了し、第2部の環境による停止を別の状態にする。
- C1で製品統合テストを増やしすぎると、自己学習化の目的から外れ、仕様や製品の変更判断を巻き込む。まず読み取り専用の不足調査に限定し、必要性が具体化したテスト追加は別タスクにする。
- エージェントを常に最大数起動すると親エージェントの判断負荷、重複、待ち時間が増える。独立した不確実性、責務不明、失敗切り分け、重複しない並列化を起動条件にし、軽微なタスクは委譲なしとする。
- AG3の不正系テストを現在の作業ツリーで行うと、読み取り専用検証自体がソースを汚す。一時ディレクトリ、使い捨て作業ツリー、フィクスチャ、模擬Runだけで再現する。既存HookのGit安全ポリシーG3とは別の判定軸として記録する。
- エージェントのjoinのタイムアウトを子のコマンドタイムアウトと混同すると、自然終了すべき調査を途中で破棄する。親の非ブロッキングjoin、子自身のコマンドタイムアウト、自然終了、終了（close）を分離して記録する。
- 現在のmainが変わると古い基準に依存する。W0でPR base／headとorigin/mainを再取得し、Codex Hook／Harness／文章品質ゲート等の変更を再監査する。既存baseで解決済みの変更をAG2へ重複追加しない。
- Part 1のZIP、Training Copyの正式SHA、学習者提出SHA、CI評価SHAを混同すると、どのソースを検証したか追跡できない。各段階のSHAと、prepare／materialize／commit／CI後のworking tree状態を分けて記録する。
- CIの自動RetryをC09の受講者修正後再実行と誤認すると、Failure分析を省略してもPASSできる。`retry_count`と各試行をExecution Receiptへ記録し、別`run_context`の修正後実行と区別する。
- `training:copy:validate`はHEAD／既存の`training-copy-source.json`／workflow契約の確認であり、学習者成果のworking treeをcleanにする検査ではない。prepare既知差分、materialize学習者差分、予期しないsource差分を三分類し、commit後の`submission_sha`確認とは別に扱う。
- `handoff.json`、Execution Receipt、Completion ReceiptがADR-0023の独自Manifest／新しい実行基盤／受講者専用の自動採点に該当する場合、既存ガードレールを破る。搬送・実行事実・構造確認に限定できない場合はT1／T2を開始しない。
- goal.txt等にある管理画面、フォームのUX、状態表現、ナビゲーション、アクセシビリティ、画面文言の改善要求は、この自己学習計画の製品／仕様の変更範囲には含めない。必要になった場合は、UI専用の担当者、ウェーブ、回帰ゲートを持つ別計画として起票し、この計画のC1やT1／T2へ混ぜない。

### 停止条件

- 製品の振る舞い、規範仕様、既存評価基準、Common／Native境界の意味変更が必要になった。
- 正本ワークブックへ学習者答案を事前投入しないと成立しない。
- 引き渡しの安全なルート内解決、ファイル種別、スキーマ、シンボリックリンク境界を検証できない。
- 既存Runner／Reporter／実行結果と既存のケース対応情報を実行後に結合しても、実行記録を自動生成できず、学習者の手書きReceipt、未実行Receipt、独立Runner、状態DB、独自Evidence URI、独立Manifest、または架空証跡が必要になる。該当ウェーブはT1／T2とし、既存契約で成立しない具体的な機械情報・追跡情報を記録して停止する。
- 自由なPlaywrightコードと自然言語の`expected_result`の意味的一致を受講者向け修了確認で完全判定しないと成立しない。意味のあるAssertionは自己確認／Workbook／V1へ残し、機械確認を構造・既知の禁止パターン・実行事実へ限定する。
- 自由なPlaywright実装を一つのAST構文へ強制しないと自動確認が成立しない。
- Part 2の既存Training Copy契約で、`training:copy:prepare`へ渡す正式な40文字の小文字完全SHA、`training-copy-source.json`、`training:copy:validate`によるHEAD確認を成立させられない。Part 1の`source_sha`不明、Part 1／Part 2のSHA不一致、同一revisionを保証できないことは、この停止条件に含めない。
- Part 1成果物をPart 2へmaterializeした後、Workbook、Test Case ID、`case_code_map`、Playwrightコード、必須Training command、Receipt／Evidence参照、型確認／契約テスト、提供サンプルと学習者成果の整合を、既存形式の最小修正でも成立させられない。revision差を理由に自動変換frameworkを新設しない。
- GitHub Actionsの既存`contents: read`、機密情報なし、既存の成果物順序を守れず、学習者へ通常の書き込み／閲覧を越える追加Permission／Token、Secrets／OIDC、workflow権限設定変更、workflow編集、管理者操作が必要になる。該当ウェーブはT2とし、Training Copy標準／Fork代替の共通経路を維持できない具体的理由を記録して停止する。GitHub環境が一時的に用意できない場合は、Commonを止めずPart 2をBLOCKED／NOT_RUNとする。
- 第2部（Part 2）の成果物をワークフロー完了後に確定できず、未確定の実行（Run）自身を事前入力にする必要が出た。
- エージェントの読み取り専用、対象範囲、再帰的な委譲、ソース完全性、終了（close）のライフサイクルを隔離環境で証明できない。
- AG3と既存HookのGit安全ポリシーG3の名称・責務を分離できず、Hook Contract TestをAgent lifecycleの証拠として流用する必要が出た。
- 既存の必須検証のFAILを原因未確認のままPASSへ変換する必要が出た。
- ADR-0023のGuardrails内でHandoff／Receipt／構造確認の責務を説明できず、ADR改訂または責任者の明示承認なしに新しいManifest／Runner／自動採点を追加する必要が出た。なお、Part 1とPart 2の同一SHA保証だけを理由に独立Manifestを追加することは今回の必要実装ではなく、T2の継続条件にも停止解除条件にもしない。

## 8. 成果物と引き継ぎ

### 8.1 今回の計画修正で作成するもの

- インデックス1ファイル。
- 詳細1〜5。
- 進行中の実行（Run）のREPORTへの調査・修正・検証結果の追記。run.jsonはcollectorの機械管理経路だけで更新する。
- 今回は教材本文、Trainingのコード、テスト、ワークフロー、エージェント設定、製品、仕様、GitHubメタデータを変更しない。

### 8.2 実装タスクへ引き継ぐ成果物

| 系統 | 引き継ぐ成果 | 正本 |
| --- | --- | --- |
| カリキュラム | 17レッスンの共通契約、P1-2〜P1-6のケース引き渡し、P1-4〜P1-6の学習段階 | 詳細1 |
| ワークブック／引き渡し | 提供サンプルと学習者作成成果物の分離、4つのCSV、一式、パス安全 | 詳細1 |
| 修了確認 | 実行記録、修了確認記録、状態、能力項目の分担 | 詳細3 |
| 第2部（Part 2） | 正式なsource SHAをHEADにしたTraining Copy（標準）またはFork（代替）、prepare／materialize／commit／CI各段階のデータフロー | 詳細3 |
| テスト／検証 | C1不足調査、正常系／決定的な不正系フィクスチャ、失敗分析、一巡確認、AG3、V1 | 詳細4 |
| エージェント | 起動判断、親エージェント管理、子のタイムアウト、助言、追加派遣、終了（close）、実行（Run）への接続 | 詳細2 |

詳細2のウェーブ表が、各系統の正式な変更対象、開始／終了条件、ロールバック、停止条件を保持する。ここではその順序を再掲しない。

### 8.3 C1を別タスクへ分離する条件

次の全てを具体的に確認できた場合だけ、製品統合テストの追加を別タスクとして起票する。

- 既存仕様（Spec）のBR／ACがカリキュラムの期待結果に直接必要である。
- 既存テスト／別テストレイヤーではその条件を保証できない。
- 追加テストが製品の振る舞いや仕様の意味を変更せず、対象ACとケースを明確にする。
- 追加テストの変更対象、担当者、検証、ロールバック、実行時間、CI影響が別計画で合意される。
- その別タスクを入れても、今回の自己学習／修了確認／引き渡しの主要経路を不必要に妨げない。

## 9. Owner回答済みのW0記録事項

### 9.1 W0の調査と記録のルール

以下の3論点はOwner回答済みの決定事項であり、実装開始時に再質問しない。W0では、最新main、現在の実装、教材、既存契約、ADR-0023、GitHub Actions設定を読み取り専用で確認し、決定と矛盾しないこと、既存実装で既に満たされているものを再実装しないことをRunへ記録する。

1. Execution Receiptは、テストを実際に実行した後、可能な限り既存Runner／Reporter／実行結果から機械的事実を自動生成する。学習者の手書きReceipt、未実行Receipt、意味理解の自動採点、独立Manifest、独自Evidence URI、状態DB、新しい独立Runnerは追加しない。
2. Part 1／Commonの`source_sha`は任意とし、取得できる場合だけ実際の40文字SHAを記録する。Part 2の正式な40文字の小文字完全SHAは既存の`training:copy:prepare` → `training-copy-source.json` → `training:copy:validate`で独立して確定する。Part 1とPart 2のrevision完全一致は要求しない。
3. Part 2はTraining Copyを標準経路とし、利用できない場合は学習者自身のForkを代替経路とする。両経路でbranch作成、commit、push、PR、GitHub ActionsのRun／Check／Artifact確認という同じ学習成果を求め、不要な管理者権限や設定変更を要求しない。

W0の終了条件は、上記の決定を再確認する質問を行うことではなく、各決定の根拠、確認したファイル／command、影響するウェーブ、継続条件、具体的な停止条件、再開に必要な確認がRunへ記録されていることである。最新実装との具体的な衝突が見つかった場合だけ、確定したOwner回答、既存実装上の制約、衝突理由、必要な最小修正範囲、推奨案、影響ウェーブを提示して再確認する。

### 9.2 Execution Receiptの生成主体・タイミング

W0で、Playwright等の学習者テストを実行した際のExecution Receiptについて、Owner回答済みの次の契約と最新実装との整合を確認してRunへ記録する。

- 生成主体。
- 生成タイミング。
- 正本として参照する実行結果。
- 学習者が手動で記入する部分の有無。

先に次の既存実装・契約を調査する。

- `training:web:*`系command、既存Playwright Runner／Reporter、実行結果JSON。
- HTML Report、Trace、Screenshot、Video、Console／Log。
- GitHub Actions上の実行結果とArtifact保存順。
- Run Artifact collectorと、既存Receipt／Artifact情報の生成処理。
- ADR-0023のGuardrails。

現行監査では、`training:web:*`は直接Playwrightを実行し、Playwright設定のReporterは`list`と`html`が中心で、Training Web用のReceipt Writerは存在しない。`output/training/playwright/test-results/.last-run.json`もReceiptに必要な全実行事実を持つ正本ではない。W0では、これら既存の実行経路、Reporter出力、実行結果、既存のケース対応情報を確認し、既存経路から必要な機械的事実を自動生成できる最小の結合方法を確定する。これはOwner回答済みの方式を再選択する作業ではない。実行結果がPASSしたことと、Workbookの成果・理由を学習者が記入することも分ける。

既存Runner／Reporterと実行結果から必要な情報を取得できる場合は、それを正本として再利用する。確定した自動生成の流れは次のとおりとする。

    Playwright実行
    ↓
    既存Runner／Reporterから実行結果を取得
    ↓
    既存テストタイトル／注釈・メタデータ／handoff.json内のcase_code_map等の追跡情報と結合
    ↓
    Execution Receiptを自動生成

Execution Receipt内に、学習者が手書きで機械事実を埋める欄を設けない。`exit_code`、実行時刻、証跡パス、実行command等は実際の実行から自動生成する。一方、`04_execution-improvement.csv`の`evidence`、原因、改善内容、自己確認、必要な`case_code_map`は学習者の成果・説明として手動記入を許容する。ただし、それらはExecution Receiptではなく、手動記入だけでテストを実行した証明にはしない。実行していない状態でReceiptだけを作成できる経路も採用しない。ケース対応は、まず既存のテストタイトル、注釈／メタデータ、または`handoff.json`内の`case_code_map`を既存の実行結果へ結合する。独立Manifest、Receipt生成専用の新しい仕組み、独立Runner、状態DBが必要になる場合は、T1／T2を続行せず具体的な停止条件へ進む。

現行監査では、既存TestのタイトルにWorkbookのケースIDが必ず含まれる契約や、実装済みの`handoff.json`／`case_code_map`は確認できない。W0では、既存のテストタイトル、注釈／メタデータ、または引き渡しEnvelope内の`case_code_map`を使ってケース対応を成立させられるかを確認する。既存情報の結合でも対応できない場合は、ケース対応の不足、既存契約で解決できない理由、影響する保存形式／実装範囲をRunへ記録し、独立Manifestや新しいReceipt基盤を追加せずT1／T2を停止する。これは回答済みの方式をOwnerへ再質問する条件ではない。

ADR-0023の制約上、既存Runner／Reporter／実行結果と既存のケース対応情報を最小限に結合しても成立せず、独立Manifest、独自Evidence URI、新しい汎用Runner、状態DB、手書きReceipt、意味理解の自動採点のいずれかが必要になった場合は、該当ウェーブを停止して具体的な衝突内容を再確認する。

### 9.3 Part 2のTraining Copyに使う正式な`source_sha`

Part 1ではZIP利用を許可し、学習者のローカル環境にGit metadataがない場合がある。次の二つを混同しないことを確定事項とする。

- Part 1で使用した教材または配布元を識別する参照値。
- Part 2で作成するTraining Copyの正式な`training_copy_source_sha`。

先に次の既存契約を調査する。

- `training:copy:prepare`、`training-copy-source.json`、`training:copy:validate`。
- `source_sha`の形式、Training Copy作成時のHEAD、`sourceSha`／`resolvedSourceSha`。
- Part 1のHandoff、`handoff.json`、ZIP配布時に元revisionを取得できる既存情報。

現行のTraining Copy側では、`training:copy:prepare`が40文字の小文字full SHAを受け取り、指定SHAをHEADへcheckoutし、既存の`training-copy-source.json`へ`sourceSha`／`resolvedSourceSha`を記録する。`training:copy:validate`はこのSHAとHEAD、workflow契約を検証するため、Part 2開始時のTraining CopyのSHA形式と確定タイミングは一意である。Part 1の`handoff.json.source_sha`、ZIP内の元revision、Part 1とPart 2の同一revision保証は、Part 2の正式SHAとは別の任意追跡情報／非必須条件として扱う。Part 1のSHA不明やPart 1／Part 2のSHA不一致を、Part 1の完了、Part 2の開始、またはT2のFAIL条件にしない。

確定した実装契約は次のとおりとする。

1. Part 1／Commonでは`source_sha`を任意項目とし、Git管理されたコピーで実際の完全SHAを取得できる場合だけHandoffへ記録する。
2. ZIP等でGit metadataがない場合はSHAを「不明」のまま完了できるようにし、架空値を生成・推測しない。
3. Part 2開始時に、`training:copy:prepare`へ渡す40文字の小文字の正式なfull SHAを確定する。
4. `training:copy:prepare`、既存の`training-copy-source.json`、`training:copy:validate`を正本として、Training CopyのHEADとsource SHAを以降の追跡へ接続する。

Part 1の元ソースSHAが確認できる場合は、存在する追跡情報としてHandoff等へ保持してよい。確認できない場合は未設定のまま完了でき、架空値・推測値・固定値を生成しない。Part 2では、Part 1のSHAとは独立して正式な40文字の小文字完全SHAを確定し、`training:copy:prepare` → `training-copy-source.json` → `training:copy:validate`を正本としてTraining CopyのHEADとsource SHAを確認する。Part 1のSHAとPart 2のSHAが異なること自体はFAIL、停止、または移行拒否にしない。

Part 1とPart 2のrevisionが異なる場合は、Part 2のTraining Copyへmaterializeした後に、Workbookの構造、Test Case ID、`case_code_map`の参照先、現在のTraining Copy上で解決できるPlaywrightコード、必須Training command、Receipt／Evidence参照、必要な型確認／契約テスト、提供サンプルと学習者成果の分離を確認する。互換性問題があれば、壊れた成果物、Part 1／Part 2のどの変更が原因か、既存形式で最小修正できるかを調査する。最小修正で対応できない場合だけ、影響するT2を停止してその事実を再確認し、自動変換frameworkは新設しない。

同一revision保証だけを目的に、ZIP配布物専用のsource manifest、revision専用manifest、新しいversion管理ファイルは追加しない。既存の`handoff.json`、`training-copy-source.json`、既存Receipt、Workbookで必要な追跡を行う。

### 9.4 Part 2で要求するGitHub Actionsの権限・操作

Part 2では、GitHubアカウント、Training Copy、branch、commit／push、PR、GitHub ActionsのRun、Check、Artifactが学習経路へ関係する。Training Copyを標準経路とし、利用できない場合は学習者自身のForkを代替経路とすることを確定事項として、W0では現在の実装・教材・workflowがこの経路と矛盾しないかだけを確認する。

先に次を調査する。

- Training Copyが標準経路として準備され、利用できない場合にForkを同じ学習経路へ接続できること。
- branch作成、push、PR作成に必要な権限。
- Actions実行、Check確認、Artifact閲覧に必要な権限。
- workflow編集、`workflow_dispatch`、GitHub Secrets、write権限が本当に必要か。
- 既存Training workflowのtrigger、`permissions`、成果物保存、関連Contract Test。

現行教材はForkまたは講師・組織が管理するTraining Copyを許容し、学習者が本体Repositoryへ直接pushすることを必須にしていない。今回の決定では、準備済みで学習者が書き込み可能なTraining Copyを標準経路とし、Training Copyを利用できない場合に学習者自身のForkを代替経路とする。Training workflowは`pull_request`／`workflow_dispatch`を入口とし、workflow tokenは`contents: read`を基本に、Secret、OIDC、Deploy、write権限を要求しない。両経路で、学習者はbranch作成、commit、writable remoteへのpush、PR作成、Run／Check／Artifact確認を行い、同じ学習成果を提出する。Fork固有の差分は、自分のForkへbranchを作ることと、Production／Deploy workflowを起動しないTraining workflowだけを使うことに限定する。

W0では、Training Copy／Forkのいずれでもこの共通経路と安全境界が成立することを確認する。Training Copyの準備・remote provisioningは運営側または既存の準備手順の責務であり、学習者へrepository管理操作を移さない。

- Organization管理者権限、repository管理者権限。
- Secrets管理、workflow権限設定変更、branch protection変更、GitHub App設定。
- 既存workflowの編集。ただし、既存Guardrails内で必要な最小差分をOwnerが承認した場合を除く。

学習者へ要求する権限・操作は、対象repositoryへの通常の書き込み、branch作成、commit、push、PR作成、Actions結果・Check・Artifactの閲覧に限定する。Organization管理者権限、repository管理者権限、Secrets管理、workflow権限設定変更、branch protection変更、GitHub App設定、管理者承認専用操作、workflow編集は必須にしない。必要権限がこの境界を越える、Secrets／OIDC／追加Tokenが必要になる、ForkでTraining workflowとProduction／Deploy workflowを分離できない、または既存workflow契約を満たせない場合は、具体的な制約と影響するT2を記録して停止する。GitHub環境が用意できない場合もCommonを止めず、Part 2をBLOCKED／NOT_RUNとして記録する。今回確定した標準／代替経路や権限範囲を、改めてOwnerへ質問しない。

### 9.5 その他のW0確認事項

上記3点に加え、次もW0の実測結果と判断をRunへ記録する。

- 引き渡し一式の学習者コードをTraining Copy（標準）またはFork（代替）のtraining/playwright/exercises/learnerへ配置する方式と、既存Trainingワークフローの実行対象。両経路で同じ成果を確認する。
- Training workflowのテンプレートを記録出力・Artifactアップロードへ接続する最小差分。`contents: read`、機密情報なし、既存の成果物アップロード順を維持できない場合はT2を停止する。
- Native／iOS選択時の記録／Artifactを既存Native契約へ接続する範囲。CommonのWeb課程の完了条件へ混ぜない。
- C1の不足調査で発見した不足を別の製品テストタスクとして起票するか。起票しない場合は対象外理由または別レイヤー参照を残す。
- エージェント運用文書のL2変更が必要か。権限／サンドボックス／ラッパー（wrapper）／設定（config）の挙動変更が必要なら、この計画では開始しない。
- ADR-0023のGuardrails内で、`handoff.json`を搬送用Envelope、Execution Receiptを既存Runner／Reporterの実行事実、Completion Receiptを構造・実行条件の確認結果として扱えるか。独自Evidence URI／採点用Manifest／新しい汎用Runner／受講者専用の意味理解自動採点に当たる場合は、ADR改訂または責任者の明示承認が完了するまでT1／T2を停止する。
- `training_copy_source_sha`に使う正式なGit commitを、実装完了後のTraining資材を含む配布可能なcommitからどれにするか。監査時点のSHAを将来のsource SHAとして固定しない。
- Part 2を含むV1でGitHub ActionsのRun／Check／Artifactを実際に一巡できるアカウント／権限／Runnerがあるか。ない場合はCommonを止めず、Part 2受入検証だけをBLOCKED／NOT_RUNとして記録する。

## 10. 最終報告の必須項目

実装タスクを開始する前に、次を報告できる状態にする。

1. 確認した`main` SHA、feature branch SHA、PR remote head SHA、統合検証状態（main単体／Plan統合）と作成方法。
2. 一時worktreeの作成・統合時にconflictがあったか。あった場合は対象ファイル、main側、feature側、Planへの影響。
3. `lint:text`のA/B結果（command、exit code、変更Markdown件数、主要メッセージ）。
4. Hook ContractのBash／PowerShell結果と、依存・環境による未実行／FAILの切り分け。
5. 通常の`verify.ps1`（必要ならBash版）の結果と、Template Contract／SKIPを含む内訳。
6. main単体と統合状態のFAIL差分。各FAILを「最新main単体でも発生」「PR統合時のみ」「Plan差分が原因」「今回の範囲外の既存問題」のいずれかへ分類する。
7. G1／G2／G3を最新baseへ照合した結果。Agent側は`AG1`／`AG2`／`AG3`、既存HookのGit安全ポリシーは`G1`／`G2`／`G3`として分離する。
8. 最新mainで既に解決済みだったため、Planから削除・変更した事項と、再実装しない理由。
9. ADR-0023との境界、継続可能な条件、T1／T2を停止する条件、再利用する既存契約。
10. 修正したPlanファイルと修正内容。
11. 全検証command、exit code、テスト件数、主要結果、代替evidence。
12. 残っているFAILまたは未確定事項。なぜ今回確定できないか、どのウェーブを止めるか、何を確認すれば再開できるかを明記する。
13. `git status --short`、`git diff --stat`、`git diff --check`の結果と、Plan／許可されたRun Artifact以外の変更がないこと。commit、push、PR更新、merge、rebaseを行っていないこと。

## 11. 備考

- この計画のPASSは、実装可能な契約と検証方法が整ったことを意味する。教材が既に自己学習可能になったこと、テスト実装が既に十分であること、受講者の理解が既に証明されたことを意味しない。
- 今回は計画修正と計画検証だけを行う。コミット、プッシュ、PR本文更新、マージは行わない。
- 計画承認後は、詳細2のウェーブ正本を読み、必要な対象範囲ごとに別の実装タスク／実行（Run）を開始する。
