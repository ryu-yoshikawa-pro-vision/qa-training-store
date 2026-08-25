# G1 Native Production Bundle Guard 実装計画

## 0. 依頼概要

- 依頼内容: Repository Audit Remediation Plan の G1だけを、最新 `main` を基準に実装する。
- 背景: Hermes `.hbc` に対するUTF-8 raw marker scanは、現行Expo出力でfalse-negativeになり得る。Standalone validatorとAndroid Native CIに同じ問題がある。
- 期待成果: 実際のHermes bytecodeをHermes compilerで検証し、実Production APKから導出した `.hbc` を同じvalidatorでfail-close検査する。

## 1. ゴール / 完了条件

- ゴール: AutomationのTest Control／Contract Harness markerを検出し、Productionの不在を、raw substring scanや `--no-bytecode` projectionではなくHermes artifactのdisassemblyで判定する。
- 完了条件（DoD）:
  - `scripts/validate-native-production-bundle.ts` が実 `.hbc` を `hermesc -dump-bytecode` で検査する。
  - StandaloneのAutomation positive controlとProduction negative controlがPASSする。
  - Production markerを含むHermes artifactをProduction入力として与えた場合にFAILする。
  - Native CIはAndroid Automation／Production APK artifactをdownloadし、APK内のHermes artifactを同じvalidatorへ渡す。Workflowにmarker scanの重複実装を残さない。
  - Production-validation Maestro flowは実Production APKのguard後に実行され、Test Control／Harnessが利用不能であることをfail-closeに確認する。
  - 変更面のfocused contract、typecheck／lint／関連test、artifact sanitizerがPASSする。

## 2. 現状理解と前提

- Current understanding:
  - `HEAD` と `origin/main` は `a3a58ae4b4168c34307e6dd0f2d21c039a972fab` で一致し、対象Findingは未修正である。
  - Android Production artifactは `expo prebuild` → `:app:assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` → upload/downloadで渡される。
  - 現行Standalone validatorは `expo export --platform android` の `.hbc` をUTF-8として読み、現行Native CIは実APK内の`.bundle`／`.hbc` candidateを `grep` している。
  - 実際のExpo Hermes exportは、Hermes disassemblyではAutomation marker 3件を含み、Productionでは禁止markerを含まないことを確認できた。
  - `hermes-compiler` は現行React Native依存グラフに固定version `250829098.0.16`として存在するが、rootのCLI依存としては公開されていない。
  - ローカルProduction `assembleRelease`は `react-native-reanimated` の `build.ninja still dirty after 100 tries` で停止した。これはBuild環境の未解決事項であり、source変更の根拠にはしない。
- Assumptions:
  - Android Release APKには少なくとも1つの `assets/**/*.bundle` または `assets/**/*.hbc` candidateが含まれ、展開後に`hermesc`が実際のHermes bytecodeであることを判定する現行CI契約を維持する。
  - `hermes-compiler` の既存lock versionを直接devDependencyとして明示することは、検査CLIを再現可能にするための最小依存変更である。
  - APKのzip展開はWorkflowの既存CLI（`unzip`）に限定し、zip汎用ライブラリやBundle Inspection Frameworkは追加しない。
- Non-goals:
  - Product behavior、Native UI、G2〜G9、iOS Runtime、EAS Cloud、Generic Bundle Inspection Frameworkの追加。
  - `--no-bytecode` projectionをProduction保証にすること。
  - retry、timeout増加、assertion弱体化、failure masking。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。計画書のG1に「実装時にCurrent build outputを確認して選定」とあり、Hermes disassemblyの実証で解消した。
- 仮定してよい細部: validatorのbundle path引数名、guard jobのartifact download配置、flowの追加negative assertionは既存testID／文言に合わせる。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Hermes artifact inspectionとStandalone validator。
  - Android Native CIのProduction Bundle Guard job、APK artifact producer／consumer境界。
  - Native CI workflow contract、Production-validation Maestro contract。
  - 検査CLIを再現可能にするdevDependency。
- Files to inspect / change:
  - `scripts/validate-native-production-bundle.ts`
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `maestro/native-production-validation.yaml`
  - `tests/contracts/native-test-control-maestro.test.ts`
  - `package.json`、`pnpm-lock.yaml`

## 5. 変更方針

- Change strategy:
  1. `hermes-compiler`の固定versionとplatform binaryを解決する小さなCLI境界をvalidator内に置く。
  2. validatorを、指定された `.hbc` pathをHermes disassembleしてmarker presence／absenceを判定する関数へ変更する。引数がなければ現行のAutomation／Production Expo exportを行うが、検査対象は `.hbc` のみとする。
  3. Native CIのGuard jobを両Android Build job後へ移動し、upload済みAutomation／Production APKから `.hbc` を抽出してvalidatorへ渡す。Build jobとRuntime jobに残る同系統raw marker scanは削除し、bundle存在検査だけを残す。
  4. Production-validation Maestro flowは既存のTest Control／Harness非表示契約を維持し、実APK guard後の順序をcontract testで固定する。
  5. Positive／negative／swapped-controlを実Hermes artifactで実行し、最後にworkflow／Maestro／repository gatesを実行する。
- 実行タスク:
  - [ ] 1. Hermes inspectorとCLI input contractを実装する。
  - [ ] 2. Native CIの実APK artifact download／extract／validator再利用へ接続する。
  - [ ] 3. Workflow／Maestro contractを更新する。
  - [ ] 4. Focused validationとrepository gatesを実行する。
  - [ ] 5. Run artifactをsanitizeし、差分とScopeを確認する。

## 6. 検証方法

- Validation plan:
  - `pnpm run validate:native-production-bundle`（Automation positive + Production negative）。
  - 実 `.hbc` をcrossed inputにしたfail-close（AutomationをProduction入力、ProductionをAutomation入力）。
  - Actual Production Hermes export／可能ならActual Production APK内 `.hbc` のHermes disassemblyとmarker結果。
  - `pnpm run test:contracts -- tests/contracts/native-ci-workflow.test.ts tests/contracts/native-test-control-maestro.test.ts`相当のfocused contract。
  - `pnpm run typecheck`、`pnpm run lint`、`pnpm run format:check`、`pnpm run test:contracts`、必要な `git diff --check`。
  - Production APKを生成できない場合は、Buildの最初の環境異常とExpo Production Hermes artifact evidenceを分離して記録し、未実行をPASSにしない。
- 成功判定:
  - Inspectorが有効なHermes artifactを読め、positive markerを全件検出し、negative markerを0件として返す。
  - Workflow内にmarkerを直接scanする `grep` がなく、Guardが同じvalidatorをActual APK由来pathへ呼び出す。
  - Production-validation flowの前にguard／installが成功するfail-closed topologyがcontractで固定される。

## 7. リスクと未解決論点

- Risks:
  - `hermesc` versionとAPK bytecode versionがずれるとdisassemblyがFAILする。既存React Native lock versionを固定し、actual artifactで確認する。
  - APKに複数HBCがある場合、1つの検査漏れが起きる。抽出した全 `.hbc` をvalidatorへ渡す。
  - Build／Runtimeからraw scanを削除しすぎるとbundle存在保証が落ちる。extension列挙と非空チェックは残す。
  - Windows local Gradleの既知CMake failureはG1 source failureと混同しない。
- Open questions: なし。ローカル実APK Build failureは実装を止める設計質問ではなく、validation boundaryとして記録する。

## 8. 成果物

- 変更ファイル: 上記validator、Native CI、workflow／Maestro contract、package manifest／lock、および必要最小限のRun／living documentation。
- 付随ドキュメント: `.codex/runs/` のPLAN／TASKS／REPORT／run.json／evaluation.json。`docs/reports/` は今回作成しない。

## 9. 備考

- G3／G4 Native Product PRの変更は取り込まない。
- PRは作成してもmergeしない。force push、rebase、amend、destructive reset／cleanは行わない。
