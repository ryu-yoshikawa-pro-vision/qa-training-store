# Instructor Reference

この文書はPublic Repository内のInstructor Referenceです。秘密情報、Answer Key、Production Secret、隠しテストは置きません。受講者の標準Navigationからは外し、演習前に先読みさせない運用にします。

## Public Reference

講師も受講者も参照できる公開契約は、Normative Specification、Current ADR、Current Workflow、Training validatorです。Instructor Referenceは解答の秘匿場所ではなく、評価観点とRecoveryの共有場所です。

## Expected Contract

- Expected Product Behaviorの正本は [`docs/spec/README.md`](../../spec/README.md) とNormative Feature文書である。
- `docs/spec/features/*.md` は `Purpose / Scope`、`Business Rules`、`UI / Behavior Contract`、`Acceptance Criteria`、`Executable Canonical Sources` の順で読む。
- BR / ACのIDをWorkbookへ記録し、Sample rowを唯一の正解として扱わない。
- Training Webは `playwright.training.config.ts` の `training-chromium` / `training-mobile-chromium`、Training Nativeは `training/maestro/baseline/` を使う。
- Formal Web `e2e/web/`、Formal Native `maestro/`へLearner Testを追加しない。
- AndroidはBuild + Runtime E2E、iOSはBuild-only。iOS Simulator / Maestro / Runtimeを正式完了条件にしない。
- Training Copyではactive Workflowを `training-ci.yml` と `training-native-ci.yml` の2件だけにし、`permissions: contents: read`を守る。

## Alternative Design

完成Codeの形ではなく、次の判断がCurrent Contractを満たすかを確認します。

- 同じRiskをRepository ContractやComponentで十分に確認できるなら、UI E2Eへ置かない案を許容する。
- PlaywrightのHelper / POMは重複と読みやすさに効果がある範囲だけ許容し、最初から必須化しない。
- Native Flowは既存のStable Test ID、Deep Link、Test Controlを使う。新しい第二Emulatorや第二Formal Native基盤は作らない。
- Mobile ProjectはDesktop Testの単純複製ではなく、Responsive Riskを説明できる最小Caseでよい。
- iOSを比較対象として説明することは許容するが、実RuntimeをPASSへ昇格させない。

## Anti-pattern

- Existing UIや既存TestからExpected Behaviorを推測してBR / ACを作る。
- Test本数、Assertion数、Coverage数字だけで修了判定する。
- `e2e/web/` や `maestro/`へLearner Testを混ぜる。
- Intentional Failureを通常baselineに含める、またはFailureを隠すためにAssertionを削除する。
- `training/maestro/**`の変更でNative CIがskipされるFilterを残す。
- `typecheck:training`をPackage Scriptだけに置き、Repository Required CIから呼ばない。
- Training CopyへProduction Secret、OIDC、write token、Environment、Deployを持ち込む。
- iOS未実行を「iOS Runtime PASS」と記録する。

## Facilitation

### Part 1

1. 受講者へNormative SpecのFeatureを1つだけ指定し、画面探索を先に答え合わせしない。
2. `01_target-risk.csv`で対象とRiskを作り、BR / ACの不足を問い返す。
3. 既存Formal Testを見せる前に、LayerとAutomation Decisionを説明させる。
4. baselineは通過させ、exerciseは受講者の変更面として扱う。
5. Failureでは最初の異常、派生エラー、Evidenceの欠落を分離させる。

### Part 2

1. Part 1のArtifactをTraining Copyへ移す目的を説明する。
2. `prepare-training-copy`のfull SHAとallowlist結果を受講者自身に確認させる。
3. CI設計ではRequired / Optional / Manualを分け、Workflow YAMLの暗記を評価しない。
4. Delivery ReadinessではRun URL、Artifact、actual conclusion、SHA equalityを別々に確認する。

## Troubleshooting prompts

| 症状 | 最初に確認すること | 分類候補 |
| --- | --- | --- |
| Web baselineが起動しない | `PLAYWRIGHT_BASE_URL`、dist、Port、Browser install | Environment / Toolchain |
| Reset後に別データが残る | Scenario ID、Test API、localStorage / IndexedDBの初期化 | Test Data / Seed |
| Locatorが見つからない | Semantic role、Stable Test ID、待機対象 | Locator / Synchronization |
| Expected Failureが成功する | Failure Exerciseがbaselineへ混入していないか | Test Code |
| GitHub Native CIのAVDがbootしない | API 34 image、ABI、KVM、serial、finite timeout | Environment / Toolchain |
| Maestroが起動しない | APKのBuild kind、Test Control listening、Maestro version | Harness / Toolchain |
| Training CopyにWorkflowが多い | `prepare-training-copy`とactive allowlist | Trust Boundary |
| iOSを実行できない | Current保証がBuild-onlyであることを確認 | Not a Required Runtime gate |

## Fresh Learner observation

Fresh Learnerが止まったら、講師の暗黙手順を追加する前にREADME、Setup、Start Gate、Recovery、Validatorのどこが不足したかを記録します。完成Codeを渡すのではなく、Normative Spec、Evidence、Trade-offへ戻します。
