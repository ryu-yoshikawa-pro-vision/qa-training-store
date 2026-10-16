# Part 2-8: 導入設計演習

Part 2の最終共通課程は、対象範囲をWeb CIに絞った共通ルートで修了できます。Native CI、マルチプラットフォーム対応、Preview／Production環境へのデリバリーは、モバイルアプリ自動化の選択コース、または共通課程レベル2の対象外となる発展課題として扱います。

## 学習目標

Part 2で学んだ開発プロセス、Git、GitHub、CI、Playwright、Quality Gateを活用し、Scenario Shopに対して対象範囲を限定したWeb CIの導入設計を自力で組み立てます。Maestro／Native CIやPreview／Productionへのデリバリーは、コース選択時または発展課題・参考資料として適宜追加します。

本演習の目的は、単なる提案資料を作ることではありません。

対象プロジェクトに対し、「何を、いつ、どこで、どのように自動実行し、失敗した際に何を確認するのか」を技術設計として判断・決定できるようになることが目的です。

## 共通課程の必須範囲

共通ルートの最終設計は、Web CIのトリガー（Trigger）、Quality Gate、成果物（Artifact）、および失敗（Failure）時の調査ルートの対象範囲を絞り込んで決定することで完了します。Native CI／Maestro、マルチプラットフォーム対応、ならびにPreview／Production／デプロイ後スモークテストを含む一連のデリバリーパイプラインは、モバイルアプリ自動化の選択コースまたは発展課題・参考資料の位置づけとなります。

## 教材

**本総合演習では、このリポジトリ `qa-training-store` のみを使用します。**

リポジトリ内の `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` は比較検討用の教材として用意されていますが、最初から正解の構成として鵜呑みにはしません。

また、これら3つのワークフローは現在それぞれ異なる役割を担っています。

- Web `ci.yml`: PR、mainマージ、スケジュール実行、手動実行を含むWeb CI/CD。
- Android `native-ci.yml`: PRおよび手動実行で動作するNative CI。
- iOS `native-ios-ci.yml`: 単体では `workflow_dispatch` による手動実行のみを受け付ける、iOSビルド専用のベースライン。Nativeコード変更時には最上位の `native-ci.yml` からこの再利用可能ワークフロー（Reusable Workflow）が呼び出され、`native-ci / verify` ジョブにおいてiOSビルドの成功が必須条件となる。

単体での手動実行トリガー、Native変更時に必須となるビルド専用ルート、およびiOS Runtime／Simulator／Maestroの実行は保証対象外であることを明確に区別して設計します。

まずは「CIがまだ存在しないScenario Shop」という前提でゼロから自身の設計を組み立て、その後に既存の実装と比較・検証を行います。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-1〜P2-7のプロセス図、Git／PRの履歴、Training Copy上で実行されたWeb CIのRun／Check／Artifact、Part 1で作成したテストケース／コード／失敗分析、必要に応じてNative選択コースの記録 |
| Activity | Scenario Shopの対象範囲を定め、Trigger、Build、Playwright、Quality Gate、Artifact、および失敗時の切り戻し・調査ルートを設計したうえで、現在のワークフロー・仕様・Contract Testと比較する |
| Observation | どのリスクをどのレイヤーやトリガーで担保するか、受講者ケースとCIの対応関係、最小権限の原則、Artifactの追跡性、Common／Native／CDの境界線、設計と現行実装との差分 |
| Output | `handoff-root/self-check/P2-08.md` に対象範囲を限定したWeb CI導入設計、Test／Trigger／Gate／Artifact／Failureの対応表、Run／Check／Artifactの参照情報、最終セルフチェック結果を記録する。Mermaid等の図や補足エビデンスが必要な場合は既存の `handoff-root/evidence/` に配置し、P2-08.mdから参照する。Part 1およびPart 2の成果物を固定の `handoff-root/` 配下に集約する |
| Self-check | 「何を、いつ、どこで、どの条件で実行し、失敗時に何を確認するか」を、Case／Risk／Workflow／Evidenceを明示して説明できること。GitHub外部の状態をAPI検証なしで証明できたと記述していないこと |
| Completion | C01〜C07、C09〜C12における共通必須成果物を1つの対応関係としてまとめ、準備済みTraining CopyでのCI実行ルートと人間が可読なエビデンスを提示できること。C09は初期の失敗（initial Failure）から同一対象を修正した合格（repaired Pass）への推移、C10は実在または決定的な教材演習の改善から別Runでの実行、C11はBranch／Commit／Diff／Pull Request／Reviewの記録、C12はRun／Check／Artifactの確認をそれぞれ満たしていること。NativeおよびiOS Runtimeの検証は必須としない |
| Recovery | 整合性が取れなくなった最初の成果物まで戻って確認する。Run／Check／Artifactを取得できない場合は、Training Copy・権限・外部環境に起因する問題として切り分け、机上設計のみで安易にPASSと判定しない |
| Handoff | `handoff-root/self-check/P2-08.md` を最終設計およびセルフチェックの正本として引き渡し、固定ルート配下のWorkbook、リポジトリ相対パスのコード、Evidence、Execution Receipt、レッスンID別のセルフチェックと紐付ける。Part 2の正式な修了判定はTraining Copy上のCI実行結果と合わせて確認する |

## 修了確認とCI成果物の取り込み

P2-8では、P2-5で確認したCI成果物を固定の `<handoff-root>` へ反映したうえで、受講者向けの修了確認を実施します。Training Copy上でCIが実際に検証した受講者コードと、固定Handoff配下の `code/` を一致させることが前提となります。正式な処理手順は以下のとおりです。

1. Training Copyで `git status --short --branch` および `git rev-parse HEAD` を実行し、今回確認したPR／Runの `submission_sha` に対応する提出コミットであることを確認します。
2. 以下の既存コマンドを実行し、Training Copyの受講者コードを固定Handoffへ同期します。

   ```bash
   pnpm run training:copy:sync-handoff -- --root <handoff-root> --source <training-copy>
   ```

3. Run Summary画面で対象のRun／Attemptを確認し、`training-web-<run_id>-<run_attempt>` をダウンロードして展開します。
4. CI Execution Receiptを `<handoff-root>/receipts/` へ配置し、Receiptが参照している同一Runのエビデンス群を固定Handoffへ反映します。
5. GitHub画面上で確認したRun、Check、Artifact、対象ケース、結果の情報を、人間が可読なエビデンスとして追加します。
6. Workbook、受講者コード、セルフチェックの内容を点検します。
7. 固定Handoffを指定して `training:completion:check --mode part2` を実行します。

ここで `--root` はPart 1から継続して使用している固定Handoffのルートディレクトリ、`--source` はPart 2で実際に編集・コミットを行ったTraining Copyのローカルディレクトリを指します。同期の対象となるのは受講者管理下の `training/playwright/` 配下のコードのみです。Workbook、Receipt、Evidence、セルフチェック、Workflow、プロダクトコード、Formal Regression、配布コード、Canonicalな `reset-scenario.ts` は同期の対象外となります。Training Copy側で削除された受講者ファイルはHandoff側でも削除され、ファイル名変更は「旧パスの削除＋新パスの追加」として反映されます。CI実行後に未コミットの変更が残っている状態で同期を行わず、Receiptが評価対象としたコミットと `git rev-parse HEAD` が出力する `submission_sha` が一致していることを必ず確認してください。

CI Artifactはローカル環境へ自動的には反映されないため、展開した成果物内の `receipts/` から対象のCI Execution Receiptを選択し、同じ相対パスである `<handoff-root>/receipts/` へコピーします。ローカルで生成したReceiptをCI Receiptで上書きしたり、Receiptを手作業で捏造・作成したりしてはいけません。

CI Receipt内の `run` に記録されている `ci.github_run_id`、`ci.github_run_attempt`、`ci.artifact_name`、`ci.workflow`、`ci.job`、`ci_sha`、`submission_sha`、`training_copy_source_sha`、`execution_sha` が、自身が確認したRun、提出コミット、Training Copy、実行結果と合致していることを検証します。Receiptの `cases[].evidence` が参照しているArtifact内の `evidence/`（`report.json`、`run.log`、Playwright Report／Trace／Screenshot／Videoなど）は、Receiptと同一Runのものを同じ相対パスで `<handoff-root>/evidence/` へ配置します。GitHub画面で確認したRun、Check、Artifact、対象ケース、実行結果は、個別の可読エビデンスとしてそこへ追加します。`04_execution-improvement.csv` では既存の `ci-exercise` などの認識済みCIコンテキストを用い、Receiptに記載されたケース結果、エビデンス、失敗分類を紐付けます。

上記の手順に従って成果物を確認・集約した後、準備の整った固定ルートを指定して以下のコマンドを実行します。

```bash
pnpm run training:completion:check -- --mode part2 --root <handoff-root>
```

実行後、`completion-receipt.json` の `status`、`missing_requirements`、`reasons`、`checked_outputs`、`semantic_understanding` を確認し、`PASS` という判定結果が「設計の意味や背景の理解度を自動採点したものではない」点に留意してください。Part 2の正式な完了は、ツールの `PASS` 判定、セルフチェックの妥当性、公開されている最低限の評価基準、および自身で確認したCI Run／Check／Artifactのエビデンスのすべてが揃っていることで総合的に判断します。正式な書き込み権限のあるTraining CopyまたはGitHub Actions実行環境が用意できない場合は、作成した設計成果物を保持したうえでPart 2 V1を `BLOCKED` として記録し、ローカルのReceiptやFork環境での検証結果をCI完了の証跡として読み替えてはなりません。

## 演習シナリオ

以下の前提状況をもとに演習を進めます。

> 共通シナリオ: Scenario ShopのWeb自動テストはローカル環境で実行できているものの、マージ前に継続的に実行される仕組みが整っていない。
>
> Unit／Integration／Component／Playwrightの各テストはローカルで動作確認が可能であり、開発チームはGitとPull Requestを用いてソースコードを管理している。
>
> この共通シナリオに基づき、対象範囲を限定したWeb CIについて「何を、いつ実行し、どのQuality Gateと成果物（Artifact）を用いて失敗を調査するか」を設計する。
>
> Native環境を扱う受講者は、選択コースとしてAndroid／iOS向けの品質保証を追加で検討できる。ただし、これは共通課程の必須条件には含まれない。

このシナリオを出発点として、まずは共通課程となるWeb CIの設計を作成します。

Phase 1〜4、Phase 6のWeb関連項目、およびPhase 7の共通Web項目が共通課程の必須範囲です。Phase 5のNative関連項目、Phase 6のNative／デプロイ項目、Phase 7のNative／Preview／Production関連項目は、見出しや表に「Native選択時」または「発展課題」と明記されている追加範囲となります。共通課程のみを進める受講者は、これらの追加範囲を設計せず「未選択」と記載して次のステップへ進んでください。

## Phase 1: 現状把握

リポジトリの内容を確認し、以下の要素を洗い出して整理します。

### テスト種別（共通課程の設計対象はWebの範囲を選択）

- Unit
- Integration
- Repository Contract
- Component
- Contract
- Playwright Functional E2E
- Accessibility
- Mobile Boundary
- Cross-role
- UI Review
- Maestro（モバイルアプリ自動化の選択コース・参考資料）

### ビルド種別

- Web Automation Build
- Web Production Build
- Android Build（Native選択時）
- iOS `iphonesimulator` Build Artifact（Native選択時）

### デプロイ（発展課題・参考資料）

- Preview環境
- Production環境

### 実行ログ・記録物

- Playwright Trace
- Screenshot
- Video
- HTML Report
- JUnitレポート
- Maestro Artifact（Native選択時）
- Native Log（Native選択時）

※この段階では、既存ワークフローのジョブ構成をそのまま転記してはいけません。

## Phase 2: リスクの整理

共通Webの範囲において、最低限以下の観点を検討します。

- PRのマージ前に必ず検知しなければならない失敗（Failure）は何か。
- mainブランチへの統合後に確認できれば十分なものは何か。
- Nightly（夜間定期実行）での検証で十分なものは何か。
- 不安定（Flaky）なテストを必須のゲートに含めてよいか。

Nativeを選択する場合に限り、「実行コストの高いNativeテストをどの頻度で実行するか」を追加で検討します。また、デプロイを発展課題として扱う場合に限り、「デプロイ失敗をどう検知するか」を追加します。これらを共通Webの回答に混在させないよう注意してください。

## Phase 3: テストスイートの分類

テストの実行タイミングを以下のカテゴリに分類・配置します。

### Pull Request

マージ前の迅速なフィードバックとして必須となるテスト群。

### main

ブランチ統合後に品質を維持・確認するために必要なテスト群。

### Nightly

実行コストが高く、広範な範囲を検証するリグレッションテスト群。

### Manual

不具合調査、リリース前確認、特定条件下での検証など、必要に応じて手動起動するテスト群。

※各テストをそのタイミングに配置した明確な理由を言語化してください。

## Phase 4: Web CIの設計

最低限、以下の設計項目を決定します。

- トリガー（Trigger）
- 静的解析・コード品質チェック（Quality Check）
- Unit / Integration / Component テスト
- Webビルド（Web Build）
- Playwright E2Eテスト
- ブラウザ実行戦略（Browser Strategy）
- 成果物（Artifact）の保存方針
- 最終判定ゲート（Final Gate）

### 設計における検討事項

- PR段階でChromiumのみを必須とするか。
- FirefoxおよびWebKitはどのタイミングで実行するか。
- アクセシビリティテストはマージ必須条件に含めるか。
- Mobile Boundaryテストは必須とするか。
- UI Reviewのスクリーンショット取得は必須チェックとするか、エビデンス収集のみに留めるか。
- Automation用ビルドとProduction用ビルドを分離するか。
- E2Eジョブのたびにビルドし直すか、前段のビルド成果物（Artifact）を再利用するか。

## Phase 5: モバイルアプリ自動化のCI設計（選択コース受講時）

AndroidおよびiOSについて、既存リポジトリのトリガー設定をそのまま正解とみなさず、ゼロベースで以下の項目を検討します。

- ビルドトリガー（Build Trigger）
- Nativeコードの変更検知条件
- 静的解析チェック（Static Check）
- ビルド処理（Build）
- エミュレータ／シミュレータの起動戦略
- Maestroテストの実行
- 成果物（Artifact）の保存
- 実行ログ・記録物の収集
- 最終判定ゲート（Final Gate）

### 設計における検討事項

- Androidのビルドとテスト実行を同一ジョブで行うか、分離するか。
- 生成したAPKをArtifactとして保存・共有するか。
- MaestroのFlowごとにジョブを分割して並列化するか。
- AndroidとiOSでマージの必須条件を同一にするか。
- macOS Runnerの実行コストをどう評価・最適化するか。
- PRのたびに両プラットフォームのテストを毎回実行するか。
- iOSの検証を「PR必須」「PR任意」「main統合後」「Nightly」「手動実行」のどこに配置するか。
- AndroidとiOSで異なる実行トリガーを採用する場合、その根拠は何か。

Part 2-6でAndroidのTraining Native Workflowを実際に動作させた経験に基づき、ビルド、エミュレータ起動、Maestro実行にかかる具体的なコストを考慮して設計します。

※選択コースを受講しない場合は、本PhaseをスキップしてPhase 6へ進んでください。Nativeを選択した場合にのみAndroid／iOSの設計成果物とコスト判断を追加しますが、これらは共通課程の修了要件には影響しません。

## Phase 6: 失敗時の調査ルート設計

各ジョブが失敗（Failure）した際に、最初に確認すべき実行ログやエビデンスを定義します。

例:

| 失敗事象 | 最初に確認すべき情報 |
| --- | --- |
| Lintエラー | GitHub Actionsの実行ログ |
| Playwright Assertionエラー | Trace / Screenshot |
| ブラウザ起動エラー | セットアップログ（Setup Log） |
| Gradleビルド失敗（Native選択時） | Gradleビルドログ |
| APKインストール失敗（Native選択時） | adbログ／ランタイムログ |
| Maestro Assertionエラー（Native選択時） | JUnitレポート／Screenshot |
| iOSビルド失敗（Native選択時） | Xcodeビルドログ／ビルド成果物 |
| デプロイ失敗（発展課題） | デプロイログ／デプロイ先URL |
| デプロイ後スモークテスト失敗（発展課題） | Playwrightの実行記録・レポート |

「テストが失敗したら担当者が手作業でログを探す」という運用にせず、誰もが迷わず調査に着手できるエビデンス収集方針を設計に盛り込みます。

## Phase 7: Quality Gateの設計（共通Web・Native選択時）

プルリクエストのマージをブロックする必須条件を定義します。

以下の観点から検討します。

- 必須とするテストスイート
- 必須とするビルド処理
- Androidの必須検証範囲（Native選択時）
- iOSの必須検証範囲（Native選択時）
- Preview環境でのスモークテスト
- 最終検証ゲート（Final Verify）

共通ルートでは、Webの必須テスト、ビルド／Artifactの受け渡し、およびFinal Gateの範囲を絞り込んで定義します。Android／iOS、Previewスモークテスト、Production環境に関する必須範囲については、選択コースまたは発展課題・参考資料として切り離して判断します。

なお、以下のような品質ゲートの弱体化は厳禁とします。

- テストが不安定だからといって `continue-on-error` で失敗をもみ消す
- 実行速度を優先するあまり、重要なリグレッションテストをゲートから除外する
- テストを通過させるために、検証アサーションを緩める
- 根本原因を調査しないまま、リトライ（Retry）回数だけを増やす

問題がある場合は、テスト自体の安定性を改善するか、実行タイミングの配置を見直します。

またNativeに関しては、「両プラットフォームを必須にすれば品質が保てる」と単純化せず、実際のリスク、実行所要時間、Runnerコスト、Flakiness（フレーキーさ）、代替可能なカバレッジの有無を総合的に勘案して判断してください。

## Phase 8: CI/CDの設計（発展課題・参考資料）

Web領域を対象として、ビルド後のデリバリー／デプロイパイプラインまでを設計します。Preview環境、Production環境、デプロイ後のスモークテストは、共通課程修了の必須条件ではありません。

設計パイプラインの例:

```text
Pull Request
    ↓
CI (Lint / Test / Build)
    ↓
Preview Deploy
    ↓
Preview Smoke Test
    ↓
Merge to main
    ↓
Production Deploy
    ↓
Production Smoke Test
```

以下の項目を決定します。

- Preview環境へのデプロイをPRの必須条件とするか。
- Production環境へどのビルド成果物（Artifact）をデプロイするか。
- デプロイ失敗時にどのようなロールバック・通知対応を取るか。
- Production環境のスモークテストで何を確認するか。

## Phase 9: ワークフロー図の作成（共通課程の図・発展拡張）

完成した最終設計を、ジョブ間の依存関係を示すグラフ（Job Graph）として視覚化します。

以下の構成例を参考にしつつ、実際のジョブ構成は自身の設計に基づいて決定してください。

```text
PR Trigger
├ Quality Check
├ Tests (Unit / Integration)
├ Build
└ Native (選択時)
    ↓
Final Gate
    ↓
Preview Deploy (発展課題)
    ↓
Smoke Test (発展課題)
```

AndroidとiOSを同一のジョブツリーに配置する必要はありません。実行タイミングを分けた場合は、その違いも図中に反映します。

## Phase 10: 現行のScenario Shop CIとの比較（参考比較）

自身の設計が完成した後、リポジトリ内の以下のファイルを確認します。

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`

以下の観点で比較を行います。

1. 実行トリガー（Trigger）
2. ジョブ構成と並列性
3. マージ必須範囲の定義
4. テストスイートの配置タイミング
5. ブラウザ実行戦略（Browser Strategy）
6. ビルド成果物（Artifact）の再利用方法
7. Nativeコードの変更検知ロジック
8. Androidのビルドとテスト実行の分離境界
9. iOSのビルド専用（Build-only）ルート
10. iOSの単体手動実行トリガーと、Native変更時の必須ビルド専用ルート（Runtimeテストの合格とは別物である点）
11. Preview／Production環境のデリバリー構成
12. 失敗時のログ・記録物の収集設計

現行のiOSワークフローは、単体では `workflow_dispatch` による手動実行であり、Native変更時には最上位の `native-ci` から呼び出される必須のビルド専用ルートとして機能しています。この構造を「現行実装との差分」として捉えてください。自身の設計でiOSをPR必須やNightlyに配置していた場合は、どちらの設計がより妥当であるかを理由とともに評価します。

## Phase 11: 差分の評価

「リポジトリの既存構成が正解だから、自分の設計を既存コードに合わせる」という姿勢は取らないでください。

洗い出した差分ごとに、以下の観点で評価します。

- 既存のリポジトリ構成のほうが優れている理由
- 自身の設計のほうがシンプルで実務に適している可能性
- 現在のプロジェクト規模だからこそ求められる複雑さ
- 現状の実装が過渡期のベースラインであり、将来的に改修され得る箇所
- 別の案件・要件であれば不要になり得る構成
- 今後の改善点・発展の余地

## 記録する成果物

以下の成果物をリポジトリ内に作成・記録します。外部システムへのレポート提出は、共通課程修了の必須要件ではありません。

### 共通課程の必須成果物

- 現状の整理とリスク分析（Web CIの設計判断に必要な範囲）
- 対象範囲を限定したWeb CI導入設計
- Web向けQuality Gateの定義
- 成果物（Artifact）および失敗時ログ収集の設計
- Fail-closed（安全側に倒す制御）を含む失敗調査ルート
- 必要最小限の範囲に絞ったWeb CIワークフロー図（Diagram）
- 最終的な設計判断とその根拠
- P2-5で受講者が作成したPlaywrightテストをTraining CopyのPull Request上で成功させた実行結果／Artifact

### 最終成果物の照合

外部へのレポート提出は共通課程の修了条件ではありません。ただし、準備済みのTraining Copy上で作成したPRのCI実行証跡は、Part 2における正式な学習成果となります。完了判定を行う前に、以下の対応関係を1点ずつ照合・確認してください。

| 習熟度項目 | 最終確認を行う対応関係 |
| --- | --- |
| C09 | 同一ケース／コードパスにおける初期失敗（`diagnostic-initial` Failure）から修正後合格（`diagnostic-repaired` Pass）への推移、および別々のReceipt／Evidenceが存在すること |
| C10 | 同一ケース／コードパスにおける改善前合格（`c10-before` Pass）から改善後合格（`c10-improved` Pass）への推移、別々のEvidenceが存在し、ダイジェスト（Digest）が変更されていること |
| C11 | Branch、Commit、Diff、Training Copy上でのPull Request、Reviewの各記録が揃っていること |
| C12 | Training Copy上でのRun、Check、Artifact、および画面確認に基づいた人間が可読なエビデンスが提示できること |

ローカル環境の `handoff-root` のみでC12のRun／Check／Artifactを作成したとみなすことはできません。Training Copyまたは必要なGitHub実行権限が存在しない場合は、設計成果物を退避・保存したうえでPart 2 V1を `BLOCKED` として記録してください。

### 練習・参考資料

- PR / main / Nightly / Manual テストスイート配置表

### モバイルアプリ自動化の選択コース（選択時）

- Android CI導入設計
- iOS CI導入設計
- Nativeテスト失敗時のログ・エビデンス収集設計

### 発展課題・参考資料

- Preview / Production / デプロイ後スモークテストを含むフルデリバリー設計
- 現行のScenario Shop CIワークフローとの差分比較レポート

## 評価観点

### 開発プロセスの理解

- テストを単体の作業として孤立させず、変更管理やリリースフローへ適切に接続できているか。

### テスト配置の妥当性

- すべてのテストをPR時に実行するような非効率な設計になっていないか。
- 重大なリグレッションを防ぐテストを品質ゲートから誤って除外していないか。
- AndroidとiOSの実行頻度を、プラットフォームの特性を無視して機械的に同一にしていないか。

### コスト意識（共通Web、Native選択時に拡張）

- 各ブラウザやAndroid・iOS Runnerの実行コスト、および開発者へのフィードバック時間を考慮できているか。

### 信頼性（Reliability）

- 不安定なテスト（Flaky Test）を放置したまま、マージ必須のゲートに組み込んでいないか。

### 実行ログとトレーサビリティ

- テスト失敗時に原因を即座に調査・特定できる適切なArtifact（ログ、レポート、トレース等）が保存されているか。

### CI/CDパイプライン（発展課題・参考資料）

- テスト対象となった成果物（Artifact）と、実際にデプロイされる成果物の関係性を論理的に説明できるか。
- デプロイ後のスモークテストまで視野に入れて設計できているか。

### 設計判断の論理性

- 「既存のリポジトリがそうなっているから」という理由にとどまらず、技術的な根拠を自身の言葉で説明できるか。
- 現行ワークフローの制約・暫定措置と、自身が設計した理想状態を明確に区別して整理できているか。

## AIエージェント活用の最終確認

Scenario Shopの対象範囲を限定し、OpenCodeとqa-workflow-skillsを使って「仕様とリスクの確認 → テスト設計 → Playwrightの実装・実行 → 結果の分析 → PRレビュー → Web CI確認」を一巡します。対象とする既存Seedは[演習対象一覧](../../../../training/ai-assisted-qa/README.md)から選びます。

AIが提案した分析・コード・改善を、受講者が仕様と実行証拠に照らして評価した記録を残してください。AIの提案を不採用にした場合も理由を説明します。既存のC11・C12、Training Copy、CI成果物、最終修了条件は引き続き満たす必要があり、AIの報告で代用できません。

## 自己確認

自身の最終設計書、Job Graph、Gate条件、失敗時のログ収集方針と照らし合わせ、以下の項目を満たしていることを確認できれば、Part 2共通課程の修了を自己判定できます。

- 共通課程の必須範囲として、Web CIのTrigger、必須Gate、Artifact、および失敗時の調査ルートが1つの整合性ある設計として繋がっていること。
- P2-5で受講者自身が作成したPlaywrightテストについて、Training CopyのPull Request上で成功したRun／Artifactを、Trigger、Gate、判定条件の実行エビデンスとして活用できていること。
- 品質ゲートがどのような失敗を阻止し、どのArtifactを確認すべきか、またFail-closed（異常検知時に安全側に倒す動作）の条件を説明できること。
- テストの配置タイミングを、リスク、フィードバック速度、Flakiness、Runnerコスト、対処の容易性（Actionability）の観点から理由づけて判断できていること。
- モバイルアプリ自動化の選択コースを選択しない場合はP2-6相当の内容をスキップし、Nativeを選択した場合にのみ追加成果物を作成して共通課程へ合流できていること。
- Preview／Production環境へのデリバリー、デプロイ後スモークテスト、ベンダー固有の詳細設定、マルチプラットフォーム展開を発展課題・参考資料として正しく切り分け、共通課程修了の暗黙の前提にしていないこと。

### リカバリ手順

設計の対象範囲が広がりすぎて収拾がつかなくなった場合は、基本に立ち返り「WebのTrigger」「Gate」「Artifact」「失敗時の調査ルート」の4点に絞り込んで再構築します。失敗時の調査先が定まらない場合は、ジョブごとに「最初に確認すべきログやArtifact」を1つだけ特定して定義してください。NativeやCDパイプラインを選択しない場合は、スキップした旨を記録したうえで共通課程のWeb設計に集中し、環境実行上のトラブルは設計論とは切り離して対処します。

## Part 2完了条件

Part 2の最終共通課程の基準は、C01〜C07およびC09〜C12を対象範囲を絞って達成するレベル2です。各習熟項目に最低限求められる成果物の詳細については、[習熟度評価基準](../02_competency-rubric.md) を参照してください。なお、C12の共通課程における評価範囲は、対象範囲を限定したWeb CIのTrigger／Gate／Artifact／失敗時のログ記録に限定されます。

受講者が共通ルートにおいて、以下の項目を自力で設計・説明できるようになることをもってPart 2の完了と認定します。

- 一般的なソフトウェア開発プロセスとテストとの関係性
- GitおよびGitHubを用いた変更管理
- Pull Requestの運用とコードレビューの流れ
- CIにおける実行トリガーの設計
- Playwrightを用いたCIテストの運用
- テストスイートごとの適切な実行タイミングの分類
- マージを制御する必須のQuality Gate
- 失敗原因を追跡するためのログ・記録物
- ビルド成果物（Artifact）の生成と受け渡し
- 対象範囲を限定したWeb CIにおけるGate、Artifact、失敗調査ルートの全体設計

Native CI／Maestroの導入、AndroidとiOSで異なる実行戦略の策定、マルチプラットフォーム対応、およびPreview／Production環境やデプロイ後スモークテストを含む一連のデリバリー設計は、モバイルアプリ自動化の選択コース、または共通課程レベル2の対象外となる発展課題です。これらを共通課程修了の必須条件として求めることはありません。

本演習の最終到達点は、GitHub ActionsのYAML構文を暗記することではありません。

**プロジェクトのリスク、テストの性質、対象プラットフォーム、実行コスト、そして開発者へのフィードバック速度を総合的に見極め、自動テストを継続的に運用する仕組みを自ら設計できるようになること** を目指します。

## 次の行動

Part 2共通課程の設計が完了したら、習熟度評価基準に示された共通課程の実行記録と、自身で定義した失敗調査ルートを最終確認してください。モバイルアプリ自動化の選択コースや発展課題・参考資料に取り組んだ受講者は、それらの追加成果物を別枠として確認し、共通課程の必須成果物に混在させないよう整理して完了判定へ進みます。