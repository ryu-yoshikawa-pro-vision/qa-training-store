# 講師なし自己学習化とエージェント協働運用の統合計画

## 状態

- 状態: **計画のみ／実装未着手**
- この計画は、講師の判断や暗黙知に依存せず、Playwright初心者が仕様分析からテスト設計・実装・失敗分析・証跡・次レッスンへの引き渡しまで進められる教材へ改修するための計画である。
- エージェント協働運用はカリキュラムの学習要件ではなく、このリポジトリを変更・検証するときの親エージェント／子エージェント運用として分離する。
- 本計画の今回の作業範囲は計画修正と計画検証だけであり、教材本文、Trainingのコード、テスト、CI、エージェント設定、製品（Product）、仕様（Spec）、GitHubメタデータを変更しない。
- 本文は日本語で記述し、製品名、コマンド、パス、JSONキー、正式な成果物名、固有IDなどの技術識別子だけは原表記を残す。

## 0. 依頼概要

### 目的

- 受講者が次の流れを自分で説明・実践できるようにする。

  仕様確認 → リスク／条件整理 → テストケース設計 → テストレイヤー／自動化判断 → Playwright実装 → 初期データ／リセット → 操作／要素特定／検証 → 実行 → 失敗の観測 → 証跡調査 → 最小修正 → 再実行 → 追跡可能性の確認 → 引き渡し

- 「テストがPASSした」「既存コードをコピーした」だけを修了にせず、判断理由、期待結果、原因、修正、証跡を説明できる状態を目標にする。
- Common課程はローカルで完了可能にし、第2部（Part 2）は受講者がGitHub Actionsを準備・実行する課程にする。Native／iOSは選択課程としてCommonから分離する。

### 分割後の読み方

詳細契約の正本を重複させないため、次の役割で読む。

- [詳細1：前提・レッスン共通契約](2026-09-15_213247_self-study-agent-orchestration/01-context-and-lesson-contract.md): 学習者作成／提供／検証用フィクスチャ、P1-2〜P1-6の縦断引き渡し、17レッスンの入力／出力／完了条件、ワークブック、引き渡し一式、パス安全。
- [詳細2：影響範囲・ウェーブ](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md): ウェーブ依存関係の唯一の正本、厳密な変更対象、開始／終了条件、C1とエージェント系統の分離。
- [詳細3：修了確認・記録・GitHub Actions](2026-09-15_213247_self-study-agent-orchestration/03-completion-and-github-actions.md): 実行記録（Execution Receipt）、修了確認記録（Completion Receipt）、受講者向け修了確認、能力項目対応、第1部（Part 1）→第2部（Part 2）の引き渡し、CIデータフロー。
- [詳細4：テスト・一巡確認・最終検証](2026-09-15_213247_self-study-agent-orchestration/04-tests-and-validation.md): C1の読み取り専用の不足調査、自動確認用フィクスチャ、失敗分析、講師向け資料なしの受講者一巡確認、AG3安全検証、検証コマンド。
- [詳細5：リスク・成果物・W0記録](2026-09-15_213247_self-study-agent-orchestration/05-risks-deliverables-and-notes.md): リスク、具体的な停止条件、別タスクへ分離する条件、Owner回答済み事項のW0記録、ウェーブ別成果物。

詳細ファイルは独立Planではなく、このインデックスから到達する一つのPlan本文である。

## 1. ゴール / 完了条件

### ゴール

- 初学者が、講師向け資料や個別判断に頼らず、Common経路をP1-1からP1-9まで進められる。
- P1-2で整理したリスクから複数のテストケースとテストレイヤーを考え、P1-3で選んだ代表ケースをP1-5のPlaywright実装、P1-6の失敗分析へ引き渡せる。P1-5では正常系、境界／異常系、明示的なSeed Scenario／Reset、状態変更、Desktop Web、受講者作成ExerciseのMobile Web実行、Workbookと実行結果の対応を維持し、代表ケース1件へ縮小しない。
- 機械的な修了確認、実行時の証跡、自己確認、講師向け資料なしの受講者一巡確認を組み合わせ、理解と単なる実行成功を分離する。
- 第2部（Part 2）では、第1部（Part 1）の成果物を正式なsource SHAをHEADに固定した教材用コピー（Training Copy）へ移し、prepareの既知の差分とmaterialize後の学習者差分を区別しながら、ブランチ作成 → コミット → プッシュ → PR → GitHub Actions → 成果物確認まで進められる。Training Copyを標準経路とし、利用できない場合は学習者自身のForkを代替経路として、同じ学習成果を求める。

### 計画／実装完了時の完了条件

- 17レッスンの入力／実施内容／出力／自己確認／完了条件／フィードバック／復旧方法／引き渡しが各本文で読める。
- TC-CART-101は複数ケースのうち、P1-2 → P1-3 → P1-5 → P1-6を追跡する代表ケースとして扱われる。P1-3のケース数を1件に固定しない。
- P1-5の練習範囲は代表縦断ケースだけでなく、正常系、境界／異常系、明示的なSeed Scenario／Reset、状態変更、Desktop Web、受講者作成ExerciseのMobile Web実行、Workbookと実行結果の対応を含む。C07の最低Evidenceに代表ケースを使っても、P1-5全体の学習経験を削除しない。
- 正本ワークブックは提供サンプルとテンプレートだけを保持し、TARGET-CART-101、RISK-CART-101、TC-CART-101などの完成行は受講者の作業用コピーまたは引き渡し一式だけに作られる。
- Playwrightの修了条件に、学習者が作成したコード、ケース対応、明示的な初期データ／リセット、意味のある操作／要素特定／検証、実行成功、証跡、ワークブックとの追跡情報を含める。
- 失敗について、意図的な失敗教材、決定的な診断教材、受講者自身の自然なFailureを分離する。受講者ケースが最初からPASSした場合に正しいテストを壊すことは要求せず、診断教材をC09の標準経路として、Failureの観測 → Evidence確認 → 原因分類／特定 → 修正 → 同じ対象の再実行 → 理由と結果の説明を追跡できる。
- 実行記録と修了確認記録の生成者・入力・出力・状態が分離される。Completion ReceiptのPASSは機械確認可能な成果物・実行・Evidence・追跡条件のPASSだけを示し、受講者の理解やCommon全体の修了を単独で証明しない。
- 第1部（Part 1）の成果物を、正式なsource SHAをHEADに固定した第2部（Part 2）の教材用コピー（Training Copy）へ取り込む入力／出力／移行対象／移行しないもの／検証／復旧方法が定義される。Part 1の`source_sha`は任意で、Part 1とPart 2のrevision完全一致は要求しない。materialize後にWorkbook、Test Case、コード、Receipt／Evidence、必須commandの整合を確認し、prepareが作る既知の差分と学習者差分を予期しないソース差分と区別する。
- GitHub Actionsは自分自身の未確定の最終実行結果を事前条件にせず、ワークフロー前・実行中・完了後のデータフローが分離される。
- ウェーブ依存関係、厳密な変更対象、C1／エージェントの独立性、AG3の安全な不正系テスト、講師向け資料なしの受講者一巡確認が詳細2・4の正本どおりに検証される。V1はL3／T2の結果だけでカリキュラム／Trainingを判定し、AG3の結果は独立したAgent運用の判定として別に報告される。既存HookのGit安全ポリシーG3とは名称・責務を混同しない。
- 既存評価基準のCommon／Native境界、製品コード、仕様、正式な回帰テスト、エージェントの権限／サンドボックス／ラッパーを今回の計画修正で変更しない。

### 計画修正自体の完了条件

- 本インデックスと5詳細ファイルの相互リンクが解決する。
- 計画検証、Markdownのlint、カリキュラム検証、Trainingの型確認、関連する契約テスト、`git diff --check`、実行（Run）の収集／サニタイズが実行され、結果が進行中のRunへ記録される。
- 今回はコミット、プッシュ、PR本文更新、マージ、実装を行わない。

## 2. 現状理解と前提

### 確認済みの事実

- PR #157の再監査時点で、baseは`main` / `b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`、headは`feat/self-study-curriculum-test-coverage` / `6f8f004c6409acc8423609ab252eeeab3cf8f506`である。これは観測値であり、実装開始時のW0ではbase／headとorigin/mainを必ず再取得する。
- 正本ワークブックには提供サンプル TC-CART-001/002があり、TC-CART-101等の学習者完成行はない。
- 現在のTraining Web演習は既存の `training:web:exercise` から `training/playwright/exercises` 全体を対象にPlaywrightを実行し、`training/playwright/support/reset-scenario.ts`を提供している。提供開始用コードにはAssertionがないため、開始用コードだけ、基準実装だけ、またはsuite全体のPASSを学習者テストの実行成功とみなさない。明示的な実行記録はOwner回答済みの自動生成契約に従い、W0で既存経路から学習者作成コードの実行結果を識別・追跡できるかだけを確認する。
- `validate:curriculum`、`typecheck:training`、Trainingワークフロー検証、既存の契約テストはリポジトリ側資材の整合性を確認する。受講者の理解や学習者差分を完全には確認しない。
- 最新baseには、`.codex/config.toml`の`max_threads = 4`／`max_depth = 1`、SessionStart時のcompact後指示再注入、Hookイベント記録、文章品質ゲート、`scripts/verify`／`scripts/verify.ps1`のHook契約入口、関連Contract Testが既に存在する。これらで解決済みのAgent／Harness／Hook変更をAG2の新規実装対象へ重複追加せず、AG2では整合確認だけを行う。
- リポジトリ固有の実行／安全／エージェント契約は、詳細ファイルから参照し、同じ契約を新しい別文書へ複製しない。

### 仮定

- CommonはWeb中心でローカル完了可能、Native／iOSは選択課程、第2部（Part 2）はGitHub Actions課程というユーザー合意を維持する。
- ワークブックの編集場所は縛らず、評価時だけ引き渡し一式へ書き出す。
- エージェントは既存5役と既存設定を引き継ぎ、必要な独立観点がある場合に親エージェントが2〜3体を並列化する。毎回最大数を起動することは要件にしない。

### 対象外

- 今回のターンでの教材本文、Trainingのコード、テスト、ワークフロー、エージェント設定、製品コード、仕様の実装・変更。
- コミット、プッシュ、PR本文更新、マージ。
- LMS、学習者状態データベース、AI採点、巨大な実行基盤。
- 正本ワークブックへの学習者完成答案の追加。
- C1を理由にした製品統合テストの無条件追加。
- エージェントの権限／サンドボックス／ラッパー／モデル／スレッドの変更。

## 3. 質問 / 曖昧性

この節は計画テンプレートとの構造互換性のために残している。Owner回答済みの3論点に未回答の質問はなく、以下では確定方針と実装開始時W0の確認事項だけを扱う。

### 今回確定した方針

- Commonはローカルで完了可能、第2部（Part 2）はGitHub Actions、Native／iOSは選択課程。
- 正式な日本語名称は「受講者向け修了確認」。GitHub Actionsは確認そのものではなく、テストや確認を実行するCI基盤である。
- ワークブックは編集場所自由、評価時の引き渡し一式を固定境界とする。
- TC-CART-101は代表縦断ケースであって唯一のケースではない。P1-3では複数ケースと複数レイヤーを設計し、少なくとも1つはUI E2E以外のレイヤーと理由を含める。
- TC-CART-101等は学習者作成成果物であり、正本ワークブックへ事前投入しない。
- エージェントはカリキュラム学習者に設定させず、リポジトリ開発時の既存エージェントを継承する。
- Owner回答済みのW0確定事項は、Part 1の`source_sha`を任意とすること、Part 1とPart 2のrevision完全一致を要求しないこと、Training Copyを標準経路としForkを代替経路として同じ学習成果を求めること、学習者へ通常の書き込み・branch／push／PR／Run／Check／Artifact確認以上の管理権限を要求しないことである。実装開始時のW0ではこれらを再質問せず、最新実装・教材・ADR-0023が決定と矛盾しないことだけを確認する。詳細な契約と具体的な衝突時の停止条件は[詳細5](2026-09-15_213247_self-study-agent-orchestration/05-risks-deliverables-and-notes.md)を正本とする。

### 実装開始時のW0で確認する実装事項

- 現行Playwright出力、既存Runner／Reporter、既存のケース対応情報を組み合わせて、実行後にExecution Receiptの機械的事実を自動生成できること。既存経路で成立せず、独立Runner、手書きReceipt、独自Manifest／Evidence URI、状態DBが必要になる場合は、詳細5の具体的な停止条件に従う。
- 引き渡し一式の学習者コードを、既存Trainingワークフローが実行できるコピー内のパスへ安全に配置する最小方式。
- GitHub Actions完了後の実行（Run）／確認（Check）／成果物（Artifact）の参照を、追加Token・追加Permissionなしで受講者が記録へ取り込む方法。Training Copyを標準経路、Forkを代替経路とし、両経路で成果と操作を揃える。
- エージェントの自然終了、子コマンドのタイムアウト、読み取り専用／対象範囲／再帰的な委譲違反を、実際の作業ツリーを汚さず証明する方法。
- コマンドのタイムアウト、プロセスツリー停止、watchdogの実装主体と証跡保存先。

上記3点について、現時点で再質問はない。W0ではOwner回答を決定事項として記録し、最新実装との矛盾、または既存契約だけでは実現できない具体的な制約がないかを確認する。矛盾が見つかった場合だけ、確認事実、衝突理由、最小の修正範囲、推奨案、影響するウェーブを提示して再確認する。単に別案が考えられることだけを理由に、回答済み事項を質問へ戻さない。

## 4. 影響範囲

- レッスン共通契約、P1縦断、ワークブック／引き渡し、修了確認、教材用コピー（Training Copy）、第2部（Part 2）、AC不足調査、エージェントの経路指定を対象とする。
- 製品コード、仕様、正式な回帰テスト、既存の本番ワークフロー、既存エージェント設定は保護する。
- 変更候補、確認のみの対象、厳密な変更対象は[詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md)に集約する。
- 今回の作業で実際に変更するのは計画本文と、検証記録のための進行中の実行成果物（Run Artifact）だけである。

## 5. 変更方針

### 高レベルの実装順

正式なウェーブ依存関係の唯一の正本は[詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md)とする。ここでは探索入口だけを示す。

1. W0で最新main、SSOT、保護パス、既存コマンド、Trainingワークフロー、エージェント契約を再確認する。
2. カリキュラム系統でレッスン共通契約とP1-2〜P1-6の縦断を整える。
3. 修了確認系統で受講者向け修了確認、記録、第2部（Part 2）の引き渡しを整える。
4. エージェント系統で既存エージェントの経路指定／ライフサイクルを文書と実行（Run）へ接続する。これはカリキュラム／TrainingのV1とは独立した判定である。
5. C1は製品変更を伴わない読み取り専用の不足調査として扱い、不足が明確な場合だけ別タスクへ分離する。
6. L3／T2の後に、講師向け資料なしの受講者一巡確認と最終品質ゲートで教材を実際に一巡できることを確認する。AG3のFAIL／BLOCKEDはV1を停止させず、最終報告でAgent運用の判定として別に扱う。

### ウェーブ共通方針

- 各ウェーブの担当者、参照対象、厳密な変更対象、開始／終了条件、証跡、ロールバック、停止条件は詳細2〜5の担当箇所を正本とする。
- 詳細3は記録／引き渡し／CIデータ契約、詳細4は検証手順を定義するが、ウェーブ順序を再定義しない。
- 実装は今回開始せず、計画で定義した継続条件とW0の確認結果を受けて別の実装タスクとして開始する。

## 6. 検証方法

### 計画修正後に実行する検証

- Plan validator: `corepack pnpm exec tsx -e "import fs from 'node:fs'; import { validatePlanOutput } from './.agents/skills/feature-plan/scripts/validate-plan-output.ts'; const result = validatePlanOutput(fs.readFileSync('.agents/skills/feature-plan/assets/plan-template.md', 'utf8'), fs.readFileSync('docs/plans/2026-09-15_213247_self-study-agent-orchestration.md', 'utf8')); console.log(JSON.stringify(result)); if (!result.valid) process.exit(1);"`（`valid: true`）
- corepack pnpm run lint:markdown
- corepack pnpm run validate:curriculum
- corepack pnpm run typecheck:training
- W0の3論点（Execution Receipt、Part 2の正式な`source_sha`、GitHub Actionsの権限・操作）について、Owner回答済みの決定、最新実装との整合確認、影響ウェーブ、継続条件、具体的な停止条件をRunへ記録する。回答済み事項を未確定質問として再掲しない。
- 関連する契約テスト: `corepack pnpm exec vitest run tests/contracts/training-curriculum.test.ts tests/contracts/ci-workflow.test.ts tests/contracts/native-ci-workflow.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`
- `corepack pnpm run lint:text`
- Hook Contract: POSIXでは`bash scripts/verify --hook-contracts`、Windowsでは`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts`
- 標準verify: POSIXでは`bash scripts/verify`、Windowsでは`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
- git diff --check
- 進行中のRunの収集処理とサニタイズ処理
- 詳細4に定義する読み取り専用の再監査（禁止表現、リンク、ウェーブ正本、記録の分離、P1の引き渡し、不正系条件）。

main単体（A）と、最新mainを含むfeature branchへ現在のPlan差分を適用した統合状態（B）で同じ検証を実行し、各command、exit code、失敗対象、主要メッセージ、失敗件数を比較する。AとBで同じ失敗なら既存baselineまたは環境要因、Bだけの失敗ならPlan差分またはPR統合による回帰候補として分類し、FAILをPASSへ変換しない。

今回の検証では教材やTrainingを実行して修了判定するのではなく、Planがその実装・一巡確認・判定を要求できる状態かを確認する。

## 7. リスクと未解決論点

- 詳細を増やしても、学習者が次に何を入力し、何を作り、何を確認するかが曖昧なら目的を達成しない。講師向け資料なしの受講者一巡確認を厳格なゲートにする。
- 固定パスを強制しすぎると自由な学習を阻害し、自由にしすぎるとCI／自動確認が再現できない。作業場所自由、引き渡し／CI境界固定の二層に分ける。
- 静的な自動確認を強くしすぎると自由なPlaywright実装を拒否し、弱くしすぎると開始用コード／基準実装を成果と誤認する。構造条件・実行記録・証跡・自己確認を分担させる。
- 第2部（Part 2）のGitHub環境、Native実行環境、エージェントの実行（Run）は外部環境に依存する。環境BLOCKEDを学習未達やPASSへ変換しない。
- 現在のmainの将来変更により基準SHAが古くなる。W0で再取得し、関連影響なしの変更は記録だけ残す。

## 8. 成果物

- 計画インデックス（本ファイル）
- 詳細1〜5
- 進行中の実行（Run）の計画／タスク／レポート／機械管理マニフェスト
- 実装開始時に引き継ぐレッスン契約、引き渡し、記録、検証、ロールバック、停止条件

## 9. 備考

- これは計画修正のPRであり、このターンで実装を開始しない。
- 計画の承認後、別タスクで詳細2のウェーブ正本に従って実装する。
- 本計画のPASSは「計画が検証可能になった」ことを意味し、カリキュラムが既に自己学習可能になったことや、テスト実装が既に十分であることを意味しない。
