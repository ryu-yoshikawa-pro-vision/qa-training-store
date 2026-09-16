# 詳細4：テスト不足・失敗分析・一巡確認・最終検証

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、C1のテスト不足調査、受講者の失敗学習、講師向け資料なしの受講者一巡確認、AG3の安全検証、計画／実装後の検証方法を定義する。ウェーブの順序は詳細2、記録は詳細3を参照する。

## 5. C1：仕様ACと既存テストの読み取り専用の不足調査

C1の主目的は、既存の仕様（Spec）、既存テスト、Trainingケース、カリキュラムで利用するACの対応を棚卸しすることである。製品統合テスト（Product Integration Test）を追加するウェーブにはしない。

### 5.1 調査範囲

- 仕様（Spec）のBR／ACと、既存の単体（Unit）／統合（Integration）／リポジトリ契約（Repository Contract）／コンポーネント（Component）／E2Eの対応を読む。
- Trainingで使うケースの期待結果、ワークブックの追跡情報、既存テストの検証が対応するかを確認する。
- カート（Cart）の在庫・購入上限・購入不可明細、レビュー（Review）の所有者・配達・公開状態など、重要条件を「既存テストで確認済み」「別テストレイヤーで確認」「カリキュラム対象外の理由あり」へ分類する。
- カバレッジ（Coverage）の数字だけで十分性を判定しない。リスク、AC、テストレイヤー、期待結果、証跡の対応を基準にする。
- コメントは、初期データ、時刻制御（Clock）、リセット、明らかでない期待結果、仕様上の理由が必要な箇所だけを候補にする。通常操作の説明をコメントで水増ししない。

### 5.2 AC／テスト対象対応表

| AC | 最低限棚卸しする境界 | 主な既存テスト対象 | 記録する結果 |
| --- | --- | --- | --- |
| AC-CART-001 | 在庫、購入上限、境界、超過拒否、既存数量 | tests/integration/cart-use-cases.test.ts | ケース、検証、PASSまたは不足理由 |
| AC-CART-002 | ゲストカート（Guest Cart）と顧客カート（Customer Cart）の統合、再計算 | tests/integration/cart-use-cases.test.ts | 状態、ケース、既存テストまたは未検証理由 |
| AC-CART-003 | 価格・在庫・公開・順位不足（Rank不足）・無効SKUの再検証 | tests/integration/cart-use-cases.test.ts | 既存テスト、別レイヤー、対象外理由 |
| AC-REVIEW-001 | 配達済み（delivered）本人の一度だけの投稿、未配達・他人・既存・削除済みの拒否 | tests/integration/review-user-use-cases.test.ts | 適格性（eligibility）の分類と既存の検証 |
| AC-REVIEW-002 | 公開（published）／非表示（hidden）／削除済み（deleted）、編集、管理者（Admin）操作、集計 | tests/integration/review-user-use-cases.test.ts | 状態遷移と集計の対応 |

この表は全ケースを同じレイヤーへ置く指示ではない。既存テストが十分であれば重複追加せず、別レイヤーで確認している場合はその参照を残す。

### 5.3 C1の完了と分離条件

- 未検証条件ごとに、既存テスト、別レイヤー、カリキュラム対象外理由、または別タスク候補が記録される。
- 仕様の期待結果を保証するために製品統合テスト（Product Integration Test）が必要だと具体的に確認できた場合だけ、別計画・別承認・別の変更対象へ切り出す。
- C1の調査結果は、今回のカリキュラム／修了確認／エージェントの主要経路を妨げない。
- C1の既定の変更対象はなし。判断、最初の失敗、参照、コメント候補は進行中のRunのREPORTへ記録し、製品コード、仕様、正式な回帰テスト、Trainingソースを変更しない。

## 6. P1-6 失敗分析の検証

教材が用意した意図的な失敗、決定的な診断Failure、受講者自身のテストで自然に起きたFailureを別の学習対象にする。受講者の正しいテストを意図的に壊して初回FAILを作ることは要求しない。

### 6.1 二つの失敗系統

| 系統 | 目的 | 完了根拠 |
| --- | --- | --- |
| 意図的失敗教材 | トレース、スクリーンショット、動画、レポートの見方を安全に練習する | 教材用の実行記録／証跡。学習者ケースの完了根拠に流用しない |
| 決定的な診断教材 | 受講者ケースがPASSした場合にも、意味のあるFailureを観測し、原因を切り分け、修正し、再実行する | 同じ診断対象の初回／修正後の記録、失敗分析、修正差分、別の証跡。C09の標準経路 |
| 学習者の自然なFailure | 自分のケースで実際に起きたFailureを観測し、原因を切り分け、修正し、再実行する | 同じ`case_id`の初回／修正後の記録、失敗分析、修正差分、別の証跡。診断教材と組み合わせてもよい |

学習者の診断では、次の対応を追跡可能にする。

    初回の実行記録
      → failure_category
      → cause
      → action
      → improvement
      → 修正後の実行記録

初回証跡と修正後証跡は別参照にし、同じケースIDでも`run_context`は別にする。意図的失敗教材が非0で終了すること自体を、受講者のテスト修了FAILと誤分類しない。Playwrightの自動Retryは修正後実行とはみなさず、初回／各試行の記録へ分ける。

### 6.2 失敗分析で必須とする説明

受講者は次を分けて記録する。

- Playwrightのエラー、検証失敗、要素特定失敗、タイミング／同期、トレース、スクリーンショット、動画、コンソール／ログ。
- 期待結果と実際の結果。
- 製品の不具合、テストコードの不具合、テストデータ／初期状態、要素特定、タイミング、環境、外部依存、不安定なテスト（Flaky）の発生源。
- 不具合（Bug）、UX、提案（Suggestion）、未確定の結果。不具合と断定する場合はBR／ACと再現条件を添える。
- なぜその原因と判断したか。
- なぜその修正が最小で妥当か。
- 修正後に同じケースを再実行した結果と、どの証跡が裏付けるか。

再試行（Retry）やタイムアウト（Timeout）の延長だけでPASSした場合は、根本原因が未確認なら完了にしない。

## 7. 受講者向け修了確認の契約テスト

契約テストは、詳細3の修了確認記録契約と、詳細1の引き渡し／パス契約をフィクスチャで検証する。

### 7.1 正常系フィクスチャ

詳細3の修了確認記録／Playwright契約を満たす正常系フィクスチャを1つ以上用意する。フィクスチャは、固定Handoff root内の既存4 CSV、複数ケースと代表ケースの対応、Repository相対`implementation_path`を維持した学習者コード、run全体のprocess `exit_code`、ケース単位の`status`、Retry単位のstatus／duration／error、既存情報から解決できるケース対応、実在する実行記録／証跡を持つ。sourceの`training_copy_source_sha`、学習者の`submission_sha`、実際に評価した`ci_sha`／`execution_sha`は別値として扱う。C09用には、diagnostic initialの期待Failureとdiagnostic repairedのPassを別`run_context`、別Evidence参照で持たせ、この組み合わせが正常完了になることを確認する。Common必須Lessonの`self-check/<既存Lesson ID>.md`一式（P1-07／Nativeを除く）と、Part 2のCI Execution Receipt／CI Evidenceも含める。提供開始用コードだけがPASSするケース、suite全体はPASSだが既存情報から対応する学習者テスト結果がないケースを不正系フィクスチャとして含め、誤った修了判定を検出する。正確な必須条件と不正系一覧は詳細3の正本を参照し、ここで再定義しない。

- フィクスチャは`tests/fixtures`または一時ディレクトリで生成し、正本ワークブックを変更しない。
- 意味のある操作／要素特定／検証は複数の書き方を含め、特定の要素特定名、検証構文、ファイル名への完全一致を要求しない。

### 7.2 不正系フィクスチャ

詳細3の不正系フィクスチャ一覧を、各欠陥が一つだけ現れる専用フィクスチャとして実行し、いずれも誤ってPASSにならないことを確認する。対象は、starterだけのPASS、baselineだけのPASS、suiteはPASSだが学習者case結果がない、学習者コードなし、別CaseのReceipt、Evidenceなし、NOT_RUN、必要caseの未修正Failure、絶対パス、`..`によるroot外参照、root外symlink、schema不正、Completion Receiptの自己参照、Part 2のCI Execution Receiptなし、`training_copy_source_sha`を実行SHAとして扱う誤り、C09 initial Failureを通常Failureへ集約する誤り、initial／repairedで同じEvidenceを上書きする誤り、ケース対応、実行記録、引き渡しの各契約である。無関係なDOM要素、固定URLだけ、期待結果と対応しない検証など意味の一般判定を要する条件は、契約テストではなく自己確認／V1で扱う。ASTに`expect`があるだけのフィクスチャを正常系にしない。

このファイルで確認するのは、フィクスチャの隔離、期待状態、実在する成果物（Artifact）、既存情報によるケース追跡、正本ワークブック非変更である。GitHub外部状態については、Run ID／Check／Artifact参照の形式とローカルに保存された記録の対応だけを確認し、GitHub上の実在性・最終結論・Artifactの現在の存在を確認したとは扱わない。契約項目の追加・削除は詳細3だけを修正する。

正常系／不正系フィクスチャのWorkbookは`<handoff-root>/workbook/`、コードは`<handoff-root>/code/`として生成する。`validate:curriculum`が読むリポジトリ側の`training/workbook/`をHandoff rootへコピーして座標を合わせることはしない。Automate行の空`implementation_path`や対応するコード欠落は、提供サンプルだけが残る未完了状態としてPASSにしない。

### 7.3 17レッスン共通契約の構造確認

既存の`tests/contracts/training-curriculum.test.ts`またはその必要最小限の拡張で、17レッスン本文について、§1.3の9項目（目的、入力（準備済みのもの／受講者が作るもの）、実施内容、期待する観測、出力、自己確認、完了条件、フィードバック／復旧方法、次への引き渡し）が、各レッスンIDから参照可能な構造になっていることを確認する。17件×9項目のいずれかの参照先、明示ラベル、開始／完了条件が欠けた場合はFAILとする。`validate:curriculum`の文書存在・リンク確認だけを、17レッスンの共通契約確認の代わりにしない。

この構造確認は見出し・識別子・必須参照の欠落を検出するものであり、受講者の自由記述の意味、判断理由の妥当性、理解度を自動採点しない。後者は各Lessonの最低回答基準、自己確認、講師向け資料なしのV1で確認する。教材本文の共通契約を変更する場合は、構造確認とV1を同じ変更の検証対象へ含める。

P1-5／P1-6の実行記録との対応は、詳細3のReceipt契約へ次のように接続する。P1-5のDesktop Webと受講者作成ExerciseのMobile Webは、正式な`training:web:exercise:with-receipt`で学習者コードを実行したExecution Receiptへ、それぞれのrun全体のprocess `exit_code`、ケース単位のstatus、Retry単位のstatus／duration／error、対象と環境を追跡可能に記録する。P1-6の意図的失敗教材、診断教材、受講者ケースの自然なFailureは、教材の失敗記録、診断対象のinitial／repaired記録、または同じ`case_id`の自然Failureのinitial／repaired記録として分ける。C09のdiagnostic initial Failureは期待結果、repaired Passは期待結果として組み合わせて評価する。意図的失敗教材の非0終了を受講者ケースの修了FAILに流用せず、Playwrightの自動Retryも修正後実行のReceiptに数えない。

## 8. AG3：エージェントのライフサイクルの安全な実行（Run）検証

AG3のソース変更対象はなしである。実際の作業ツリー、製品、仕様、正本ワークブック、既存Runへ意図的な変更を行って不正系ケースを再現しない。既存HookのGit安全ポリシーG3とは名称・責務が異なり、Hook Contract TestをAG3の証拠として流用しない。

### 8.1 安全な実行環境

- 一時ディレクトリ、使い捨て作業ツリー、フィクスチャ、模擬Runのいずれかを使う。
- 読み取り専用違反、対象範囲外の書き込み、子エージェントの再帰的な委譲は、隔離した対象と模擬コマンド（mock）／契約テストで再現する。
- 実際の作業ツリーでは、通常の読み取り専用エージェント実行前後にソース完全性を確認するだけにする。
- AG3で生成した一時的な失敗ログや成果物（Artifact）はリポジトリ成果物にしない。必要な要約とリポジトリ相対参照だけをRunへ残す。

### 8.2 ライフサイクル検証

- 複数の重複しない対象範囲を持つ読み取り専用エージェントを並列起動する。
- 親エージェントはspawn後も重複しない作業を行う。
- 親のjoin呼び出しがタイムアウトしても、それを子エージェントのタイムアウトや終了（close）と解釈しない。調査エージェントは自然終了通知まで維持する。
- テスト／ビルド／lintを実行する子エージェントは、自分のコマンド単位のタイムアウトで終了し、コマンド、終了コード（exit code）、経過時間、タイムアウト理由を返す。
- 親エージェントは困っている子エージェントへ助言し、解消しない独立観点だけを追加派遣する。同じ問いを無制限に再投入しない。
- 遅れて届いた結果を二重集約せず、正常終了または明示中止したエージェントだけを一度終了（close）する。
- 子エージェントからの再帰的な委譲、親指定外のコマンド／書き込み、読み取り専用エージェントのソース書き込み、対象範囲の帰属不明を検出したら、該当RunをFAIL／BLOCKEDとしてPASSにしない。
- changed_filesは自己申告でなくcollector／Git diff／hookの証跡で確認する。
- 各不正系ケースは、実リポジトリとは別の分離ルートで、Windowsではscripts/codex-task.ps1、POSIXではscripts/codex-task.shと既存の対象範囲オプション（allowed_files／allowed_dirs／expected_changed_files／require-clean-git／run-id／record-run-manifest）を使って実行する。模擬コマンド（mock command）／フィクスチャ（fixture）が必要な場合も、フィクスチャは一時生成し、実装後に再現したコマンド、許可リスト、期待変更ファイル、実際の差分、codex-taskレポートJSON、終了（close）記録を同じRunへ紐付ける。
- `TIMEOUT`は子コマンドの観測値としてのみ扱い、実行成果物（Run Artifact）の正式な状態へ保存するときは既存enumのFAIL／BLOCKED等へ契約に従って対応付ける。新しい状態をこの計画で増やさない。

AG3の親子join、子コマンドのtimeout、自然終了、close、再帰的委譲は、現行Hookのlauncher timeoutやHook Contract Testだけでは証明できない。実装時は、これらのイベントを注入できる模擬Run／フィクスチャ、または利用可能なAgent Runtimeの隔離実行を選び、時系列、親子関係、コマンド終了、差分、close結果を記録する。Runtimeや実行経路を提供できない場合はAG3を「Runtime依存で未確認」としてBLOCKEDにし、実行経路は利用可能だが必要な試験をまだ行っていない場合だけNOT_RUNにする。V1のカリキュラム判定は停止させない。既存HookのG1〜G3の検証は`-HookContracts`／`--hook-contracts`の別結果として扱う。

### 8.3 AG3の不正系ケース

| ケース | 分離ルート／実行コマンド | 許可リスト／期待する変更ファイル | 期待する扱いと証跡 |
| --- | --- | --- | --- |
| 読み取り専用エージェントがソースを変更しようとする | 使い捨て作業ツリー。codex-task.ps1／.sh + 読み取り専用の模擬コマンド（mock command） | ソースの許可リスト外への書き込み、期待する変更ファイルは空。開始前後のソース差分も空であることを期待 | 書き込みを検出し、ソース完全性違反としてFAIL／BLOCKED。対象範囲レポート、差分、hook／終了（close）の証跡 |
| 子エージェントがエージェントを追加起動する | 模擬Run／契約フィクスチャ。再帰的な委譲イベントを発生させる | ソース変更ファイルは空。エージェント起動イベントは許可しない | 再帰的な委譲違反としてFAIL。イベントログ、codex-taskレポートJSON、親子関係の終了（close）記録 |
| 親エージェント指定外のパスへ書き込む | 一時ディレクトリ／対象範囲フィクスチャ。codex-taskの対象範囲オプションを指定 | allowed_files／allowed_dirsの外への書き込み、expected_changed_filesと一致しない差分を期待 | 対象範囲違反としてFAIL。許可リスト、実差分、レポートJSON |
| 親のjoinだけがタイムアウトする | 自然終了する調査フィクスチャ。親の非ブロッキングjoin | ソース変更ファイルは空。子は自然終了するため、最終差分は空 | 子を中断せず、後の結果を一度だけjoin。joinのタイムアウトと子のタイムアウトを分けた時系列／終了（close）の証跡 |
| 子のコマンドがタイムアウトする | コマンドタイムアウト用フィクスチャ。子自身が管理するコマンド単位のタイムアウト（bounded command timeout） | ソース変更ファイルは空。プロセスツリー停止の結果を記録 | 子の観測値TIMEOUTとして記録し、親のjoinのタイムアウトと混同しない。停止確認、経過時間、正式なRun状態への対応付けを記録 |
| エージェント枠が満杯で追加観点がある | 模擬スケジューラー。max_threadsを変更しない | ソース変更ファイルは空。既存エージェントを強制終了しない | 空き後に別範囲を派遣するか、優先順位と保留理由を記録。スケジューラーイベント／最終終了（close）の証跡 |

各行の「期待する変更ファイル」はフィクスチャのルート内のリポジトリ相対集合として明記し、実際の作業ツリーの変更を期待値にしない。不正系ケースでFAILを期待することと、実際の検証RunをFAILのまま放置することを混同せず、検出結果を記録した後にフィクスチャ／使い捨て作業ツリーを破棄し、親Runは結果を正式な状態へ対応付けて完了させる。

## 9. V1：講師向け資料なしの受講者一巡確認を最重要ゲートにする

検証器（validator）、契約テスト、自動確認がPASSしても、受講者が教材を読んで進められなければ目的未達である。V1は、教材実装側が自己学習可能性を確認する開発時の受入検証であり、各受講者が毎回実行する修了処理ではない。V1では、講師向け資料を開かないクリーンな学習者用コピーを使い、Common課程の経路を実際に一巡する。Part 2を提供範囲に含める場合は、P2-01〜P2-03のGit／GitHub基礎学習ではForkを利用できることを確認してよいが、C12を含むP2-04〜P2-08のTraining CI経路はTraining Copyで一巡する。Fork上のRun／Check／ArtifactをC12の成功証跡へ読み替えず、Training Copy／権限などの環境不足がある場合はPart 2側だけをBLOCKED、環境は利用可能だが必要な一巡をまだ行っていない場合はNOT_RUNとしてCommonの判定と分離する。

### 9.1 一巡確認の経路

    P1-1
      ↓
    P1-2
      ↓
    P1-3
      ↓
    P1-4
      ↓
    P1-5
      ↓
    P1-6
      ↓
    P1-8
      ↓
    P1-9

P1-7を選択しない場合のP1-6 → P1-8の復帰を確認する。Nativeを選択する場合は、別途P1-7 → P1-8の選択経路を確認する。

Part 2を提供範囲に含める場合は、Commonの一巡とは別に、P2-01 → P2-03のGit／GitHub基礎学習ではForkを利用でき、P2-04 → P2-08のC12／Training CI経路ではTraining Copyを使うことを、講師向け資料なしで確認する。Training Copyでブランチ／差分 → PR → GitHub ActionsのRun／Check／Artifact → 失敗時の確認 → 最終引き渡しを一巡し、Fork上のRun／Check／ArtifactはC12のTraining Copy成功証跡へ読み替えない。GitHubアカウント、権限、Runner、Training Copyなどの環境が利用できない場合は、Part 2の受入検証だけをBLOCKED、環境が利用可能だが必要な一巡をまだ行っていない場合はNOT_RUNとして記録し、Commonのローカル判定やPart 1の完了と混同しない。

### 9.2 実施すること

P1-2〜P1-6はリンク確認ではなく実演する。

- 入力の出所、準備済みのもの、受講者が作るものを本文だけで見つける。
- P1-2で複数のリスク／条件を整理し、P1-3で複数ケースを作り、TC-CART-101を代表ケースとして選ぶ。
- 単体（Unit）／統合（Integration）／コンポーネント（Component）などUI E2E以外のレイヤーを少なくとも1件選び、理由を説明する。
- P1-4でtest、page、要素特定、操作、検証、getByRole、実行コマンド、レポートの読み方を学ぶ。高度なPOM／フィクスチャ（Fixture）を先に要求しない。
- P1-5でP1-3の複数ケースをコードへ変換し、正常系、境界／異常系、明示的なSeed Scenario／Reset、状態変更、ケースID、仕様（Spec）／リスク、前提条件、役割／アカウント、操作、要素特定、検証、テスト分離、デスクトップWeb、受講者作成ExerciseのモバイルWeb、実行記録、証跡、Workbookとの対応を揃える。TC-CART-101は代表縦断ケースであり、これら全ての代替ではない。
- P1-6でPlaywrightのエラー、検証／要素特定／タイミングの失敗、トレース、スクリーンショット、動画、コンソール／ログ、期待結果／実際の結果、原因、最小修正、再実行を確認する。
- P1-8では、P1-4〜P1-6で実際に観察した重複、不安定なテスト（Flaky）、変更影響などから必要なPOM／ヘルパー（Helper）／フィクスチャ（Fixture）の改善を選ぶ。抽象化そのものを正解にしない。
- 次レッスンの引き渡しを作成し、受講者が次の開始条件を言葉で説明する。

### 9.3 一巡確認でPASSとなる条件

- 各レッスンで、入力を見つけ、実施内容を行い、出力と証跡を作り、自己確認の最低回答要素を埋め、完了条件を自分の言葉で確認できる。
- P1-5開始時に、実装するケース、開始状態、操作、検証が本文と引き渡しだけで決まる。
- P1-5の学習者作成コードが明示的なリセットとケース対応を持ち、開始用コード／基準実装／別ケースの証跡に依存しない。
- P1-6で意図的失敗教材からEvidenceの読み方を確認し、診断教材または自然な学習者Failureについて、初回／修正後の実行を同じ対象へ追跡でき、原因・修正理由・別の証跡を説明できる。学習者ケースが最初からPASSした場合、正しいテストを壊さず診断教材を使う。
- V1は開発時受入検証の記録であり、Completion ReceiptのPASSや各受講者のCommon修了へ自動変換しない。
- P1-7をスキップした場合もP1-8、P1-9へ迷わず進める。
- P1-2〜P1-6で講師向け資料や暗黙の口頭説明を必要とした場合はFAILとし、本文へ不足する入力／説明／復旧方法を戻してから再実行する。Part 2を含める場合も、P2-01〜P2-08の入力、GitHub Actionsの観測方法、Artifactの確認方法、環境BLOCKED時の復旧を本文だけで判断できることを別記録で確認する。

## 10. P1-4〜P1-6のPlaywright学習監査

### P1-4：最小基礎

必須: test、page、要素特定、操作、検証、getByRole等、実行コマンド、レポートの見方。高度なフィクスチャ（Fixture）／POMは先送りする。提供サンプルで学ぶが、完了成果には学習者作成ケースを混ぜない。

### P1-5：ケースの自動化

P1-3で設計したケースを中心に、ケースID、仕様（Spec）／リスク、初期データ／リセット、前提条件、役割／アカウント、操作、要素特定、検証、テスト分離、実行、証跡、デスクトップWeb、必要範囲のモバイルWebを段階的に扱う。サンプルコードのコピーで終えない。

### P1-6：失敗分析

Playwrightのエラー、検証／要素特定／タイミング、トレース、スクリーンショット、動画、コンソール／ログ、期待結果／実際の結果、原因、最小修正、再実行を段階的に扱う。失敗が直った事実だけでなく、なぜ失敗し、なぜ修正が妥当かを説明させる。

この監査は教材実装後の一巡確認で行う。今回の計画修正では、監査内容が計画へ含まれていることだけを確認し、実習済みとは報告しない。

## 11. V1の検証コマンドと証跡

### 11.1 計画修正時に実行するコマンド

| 順 | コマンド | 期待結果 | 証跡 |
| --- | --- | --- | --- |
| 1 | corepack pnpm exec tsx -e "import fs from 'node:fs'; import { validatePlanOutput } from './.agents/skills/feature-plan/scripts/validate-plan-output.ts'; const result = validatePlanOutput(fs.readFileSync('.agents/skills/feature-plan/assets/plan-template.md', 'utf8'), fs.readFileSync('docs/plans/2026-09-15_213247_self-study-agent-orchestration.md', 'utf8')); console.log(JSON.stringify(result)); if (!result.valid) process.exit(1);" | valid: true | テンプレート／インデックスを読み込んだstdout |
| 2 | corepack pnpm run lint:markdown | exit 0、問題なし | lintの標準出力 |
| 3 | corepack pnpm run validate:curriculum | exit 0 | 必須文書、ワークブック、Training資材の検証結果 |
| 4 | corepack pnpm run typecheck:training | exit 0 | TypeScriptの標準出力 |
| 5 | corepack pnpm exec vitest run tests/contracts/training-curriculum.test.ts tests/contracts/ci-workflow.test.ts tests/contracts/native-ci-workflow.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000 | exit 0 | 現行Training／CI／Native契約テストの結果。実装後は追加されたTraining契約テストを対象範囲へ加える |
| 6 | corepack pnpm run lint:text | exit 0 | 最新baseで追加された文章品質ゲートの結果 |
| 7 | POSIX: `bash scripts/verify --hook-contracts` ／ Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts` | exit 0 | 最新baseのHook契約入口と標準verifyの結果。timeout／FAILはPASSへ変換しない。環境にない入口は未実行として記録 |
| 8 | git diff --check | exit 0 | 空白エラーなし |
| 9 | POSIX: `bash scripts/verify` ／ Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1` | 正常終了（exit 0）を要求。`PASS=...`の途中出力だけでは合格にしない | 最新baseの標準verify。BashでCodexが利用できない場合のSKIPは明示し、FAILやtimeoutをPASSへ変換しない。`exit 124`は「FAIL 0件でもプロセスが正常終了しなかったtimeout」と記録する |
| 10 | powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict | exit 0 | 機械管理Run Artifactの収集結果 |
| 11 | powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check | exit 0、残存検出0 | サニタイズ済みRun成果物 |

実装後のT1／T2契約テストは、既存の3ファイルに加えて、次のfocused commandで同じworker条件を使って実行する。新しい契約テストの正常系は複数の学習者ケース、Repository相対`implementation_path`、run全体の`exit_code`、case／Retryのstatus、C09のexpected Failure／repaired Pass、異なるEvidence、3種類のSHA、CommonのLesson ID別self-check、Part 2のCI Execution Receiptを含む。不正系は詳細3の一覧を一欠陥ずつ検証し、いずれも誤ってPASSにしない。各テストファイルの実行はexit 0を要求し、途中のテストPASS表示やプロセスtimeoutは合格としない。

    corepack pnpm exec vitest run tests/contracts/training-curriculum.test.ts tests/contracts/ci-workflow.test.ts tests/contracts/native-ci-workflow.test.ts tests/contracts/training-completion.test.ts tests/contracts/training-execution-receipt.test.ts tests/contracts/training-copy-handoff.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000

このターンでは、教材本文・Trainingテスト・受講者向け修了確認の実装を行わないため、実装後のtraining:web実行や修了確認コマンドのPASSを計画修正の証跡に数えない。既存の契約全体実行がタイムアウトした場合はPASSとせず、最初の失敗、実行時間、限定実行による代替証跡、次の再確認条件をRunへ記録する。

`lint:text` と `-HookContracts`／`--hook-contracts`は最新baseで追加された正式入口である。現在のチェックアウトに未導入の場合は、存在しないコマンドを別名で置き換えず「最新base未取り込みのため未実行」と記録する。実装開始時のW0で最新baseを再取得した後、Windowsは`-HookContracts`、POSIXは`--hook-contracts`を実行し、文章品質ゲートも`corepack pnpm run lint:text`で実行する。

正式なHook Contract入口で`#module-evaluator`の`ERR_PACKAGE_IMPORT_NOT_DEFINED`が発生した場合は、正式入口をFAIL、直接実行した下位契約テストを別結果として記録する。最新main単体でも再現し、Plan統合状態でも同じ場合はPR #157の回帰と扱わず、今回Hook／module resolver／Harnessを変更しない。

### 11.2 実装後V1で追加する検証

- 講師向け資料なしの受講者一巡確認の実記録（Common。Part 2を提供範囲に含める場合は、Git／GitHub基礎学習のFork利用と、C12／Training CIのTraining Copy経路を分けた一巡記録を追加）。
- 受講者向け修了確認の正常系／不正系契約テスト。
- Training Webの基準実装、学習者演習、診断、意図的失敗の分離実行。
- デスクトップWebと必要範囲のモバイルWebの実行。
- 教材用コピー（Training Copy）のprepare／validateと第2部（Part 2）の実GitHub Actions実行（Run）／確認（Check）／成果物（Artifact）。Training Copy／権限などの環境が利用できない場合は、ForkでGit／GitHub基礎学習までを確認し、C12／Training CIの受入検証をBLOCKEDとする。環境は利用可能だが必要な受入実行をまだ行っていない場合だけNOT_RUNとする。
- C1のAC／テスト不足調査結果と、別タスクへ分離した追加テストがある場合の専用検証。
- AG3の安全な不正系テスト、ソース完全性、対象範囲、ライフサイクル、終了（close）の証跡。既存HookのG3契約テストは別の検証結果として記録する。
- 最後に、POSIXでは`bash scripts/verify`、Windowsでは`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`を正式入口として実行し、必要時はそれぞれ`--hook-contracts`／`-HookContracts`を付ける。`git diff --check`、Runの収集／サニタイズも実施する。FAIL、BLOCKED、NOT_RUN、timeoutをPASSへ変換しない。

## 12. 計画修正後の読み取り専用再監査

計画を保存した後、次を目視と検索で再監査する。

- TC-CART-101の初回FAILや受講者ケースの意図的な破壊を必須にしておらず、意図的失敗教材・診断教材・自然な学習者Failureを分けている。
- P1-5のケース数を固定せず、正常系、境界／異常系、Seed Scenario／Reset、状態変更、Desktop／Mobile、Workbookと実行結果の対応を代表ケース1件へ縮小していない。
- Part 1のZIP利用者にGit repositoryや`part1_distribution_sha`を隠れた必須条件として要求していない。Part 1の`part1_distribution_sha`は任意であり、Part 2だけがTraining Copy作成時の正式な40文字完全SHA（`training_copy_source_sha`）を要求している。Part 1／Part 2のrevision不一致をFAILにしていない。
- TC-CART-101、TARGET-CART-101、RISK-CART-101を正本ワークブックへ完成行として追加する記述がなく、提供サンプル、学習者作成成果物、検証用フィクスチャを分離している。
- P1-3の必須引き渡し項目とP1-5の同一値参照、初期データ／リセット、役割／アカウント、操作、期待結果が切れていない。
- 実行記録と修了確認記録の生成者、責務、入力、出力が混在していない。Retryと受講者修正後の再実行も区別している。
- 受講者向け修了確認はパス、必須ファイル、Workbookスキーマ、Case ID、既存情報によるコード追跡、コード存在、Reset契約、Assertion存在、既知の無意味パターン、実行事実、Evidence、追跡、NOT_RUNを確認し、Assertionや`expected_result`の意味を完全判定していない。
- C07の「意味のあるAssertion」は学習目標としてWorkbook、自己確認、Lesson基準、V1に残し、無関係DOM、固定URL、期待結果との意味的不一致は受講者向け修了確認の契約テストから外している。
- Completion ReceiptのPASSを機械確認可能なPASSに限定し、受講者の理解・Common修了・V1と同一視していない。Common修了はReceipt、各Lesson自己確認、公開最低回答基準による本人確認の組合せである。
- Part 1成果物をTraining Copyへ移す入力／出力／移行対象／移行しないもの／検証／復旧方法があり、prepare直後とmaterialize後に`training:copy:validate`を行う。Git／GitHub基礎学習のFork利用はこのTraining Copy移行・検証とは別経路として扱う。既知のprovisioning差分、学習者差分、予期しないsource差分を区別している。materialize後に固定Handoff root、Workbook、Test Case ID、既存情報によるケース対応、Playwrightコード、必須Training command、Receipt／Evidence、型／契約テスト、サンプルと学習者成果の整合を確認する。
- ワークフロー前・中・後のデータフローが分かれ、ワークフロー自身の未確定Run結果を事前条件にしていない。
- 固定Handoff rootと既存成果物だけで引き渡しを成立させ、新しいJSON Manifest、対応表、独自Evidence URIを追加する計画になっていない。Completion Receiptのスキーマ、出力先、自己参照禁止、状態集約、producer／真正性の限界、GitHub外部状態を独立再検証しない境界が明記されている。
- 17レッスンすべてについて、§1.3の9項目を本文の明示ラベルまたは参照先で確認し、自己確認・完了条件・フィードバック／復旧・引き渡しが表の要約だけに隠れていない。
- main単体とPlan統合状態の同一command比較、通常verifyとHook Contractの別結果、各FAILの分類（main単体再現／統合時のみ／Plan差分／範囲外既存問題）が最終報告へ残る。
- ウェーブ依存関係は詳細2だけにあり、L3／T2 → V1とAG1／AG2 → AG3が独立している。V1は開発時受入検証であり、各受講者の毎回の修了処理ではない。
- AG3の不正系テストは一時ディレクトリ、使い捨て作業ツリー、フィクスチャ、模擬Runで行い、既存HookのGit安全ポリシーG3と名称・責務を混同しない。
- 最新baseのbase／head、Codex Hook／Harness／文章品質ゲート／`scripts/verify`変更を再確認し、既に解決済みの内容をAG2の新規実装へ重複追加していない。P1-4、P1-5、P1-6、P1-8の学習目的も段階的である。
- Owner回答済みの3事項（Part 1の任意`part1_distribution_sha`、revision完全一致不要、Git／GitHub基礎学習のFork利用可／C12・Part 2最終CI修了はTraining Copy必須）が質問や未確定事項として残っておらず、W0は最新実装との具体的な矛盾確認だけを行う。Bash通常verifyの`exit 124`はPASS扱いせず、Hook正式入口FAILと直接下位テストPASSを別結果として記録している。
