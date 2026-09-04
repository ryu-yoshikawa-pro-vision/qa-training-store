# Instructor Reference

この文書はRepository-requiredなInstructor support assetです。learner-facing learning、self-check、learning Recovery、completion、evaluationの正本ではありません。受講者の学習判断は[Curriculum README](./README.md)、[Learning Design](./00_learning-design.md)、各Lesson、[Competency Rubric](./02_competency-rubric.md)を参照します。

秘密情報、Answer Key、Production Secret、隠しテスト、個別の受講者記録は置きません。Instructor Referenceは環境・権限・端末・Training Copy・Infrastructure / Toolchainの準備と障害切り分けだけを支援します。

## Public Reference

講師も受講者も参照できる学習契約は、Normative Specification、Current ADR、Curriculum本文、Competency Rubric、Current Workflow、Training validatorです。Instructor Referenceから学習内容を再定義せず、必要な公開文書へ案内します。

## Expected Contract

Instructor supportのExpected Contractは、受講者が安全に学習環境へ到達できることである。

- 学習内容、Expected Behavior、BR / AC、Rubric、completionの判断はlearner-facing文書へ戻す。
- WebのTraining入口、NativeのStart Gate、Training Copy、必要なアカウント・権限・端末が利用できる状態を準備する。
- Environment / Toolchain障害では、現在のcommand、Path、Version、permission、接続状態を確認し、学習上の判断を代行しない。
- Formal Web / NativeやProduction経路へ受講者の変更を混ぜない境界を確認する。Training Workflowの詳細はCurrentのTraining assetを参照する。
- Android Build + Runtime、iOS Build-onlyなどの保証範囲を、Current contractに沿って案内する。未実行のRuntimeをPASSへ昇格させない。

## Alternative Design

学習経路を変えずにEnvironmentを準備するためのsupport上のAlternativeだけを扱います。

- GitHubのForkまたは組織が用意したTraining Copyを、権限とactive Workflowの条件に応じて選ぶ。
- Windows LocalのNative支援ではPhysical Android deviceの接続を確認し、CIのAndroid Emulator経路と混同しない。
- iOSはCurrentのBuild-only経路を案内し、Simulator Runtime / Maestroを必須の代替経路にしない。
- 受講者が学習判断に迷った場合は、Alternativeな答えを与えず、該当するlearner-facing Lessonへ戻す。

## Anti-pattern

Instructor supportが次の境界を越えないようにします。

- learner-facingのExpected Behavior、答え、評価、completionを口頭や非公開判断で補完する。
- 受講者の変更を`e2e/web/`、`maestro/`、Production Workflowへ移す。
- Training CopyへProduction Secret、OIDC、write token、Environment、Deployを持ち込む。
- Environment障害を学習内容のPASSへ置き換える、またはiOS未実行をRuntime PASSとして扱う。
- 個別の受講者Finding、Evidence、PASS履歴をこのReferenceへ蓄積する。

## Facilitation

講師が行うのは、公開教材へ到達できる環境を整え、受講者が自分で学習を継続できることを確認する支援です。

- Part 1ではTraining Web、Workbook、Native Start Gateなどの入口と権限・端末状態を確認する。
- Part 2ではTraining Copy、Remote、Workflow実行権限、Secret不要の境界を確認する。
- 受講者が学習上の判断や答えを求めた場合は、この文書で補完せず、該当するlearner-facing Lesson、Normative Specification、Rubricへ案内する。
- 個別のレビュー結果、Evidence、PASS履歴はこの文書へ保存しない。

## Troubleshooting prompts

| 症状 | 最初に確認すること | 支援境界 |
| --- | --- | --- |
| Web baselineが起動しない | `PLAYWRIGHT_BASE_URL`、dist、Port、Browser install | Environment / Toolchainを確認し、学習上のAssertionはLessonへ戻す |
| Reset後に別データが残る | Scenario ID、Test API、localStorage / IndexedDBの初期化 | Test Control / Seedの実行環境を確認し、期待値は公開Specへ戻す |
| Locatorが見つからない | Semantic role、Stable Test ID、待機対象 | 学習上のLocator判断を代行せず、P1-4 / P1-5へ案内する |
| Expected Failureが成功する | Failure Exerciseがbaselineへ混入していないか | Training asset / Test Codeの配置を確認する |
| GitHub Native CIのAVDがbootしない | API 34 image、ABI、KVM、serial、finite timeout | Environment / Toolchainを切り分ける |
| Maestroが起動しない | APKのBuild kind、Test Control listening、Maestro version | Harness / Toolchainを切り分ける |
| Training CopyにWorkflowが多い | `prepare-training-copy`とactive allowlist | Trust Boundaryを確認する |
| iOSを実行できない | Current保証がBuild-onlyであることを確認 | Required Runtime gateではないことを案内する |

## Fresh Learner observation

Fresh Learnerが止まったら、講師の暗黙手順を追加する前にREADME、Setup、Start Gate、Recovery、Validatorのどこを確認すべきかを見直します。完成Codeや非公開の答えを渡すのではなく、公開されたlearner-facing materialと既存SSOTへ案内します。
