# Plan

## Objective

- G1 Native Production Bundle Guardだけを、最新`origin/main`基準で実装し、Actual Production Hermes Artifact由来のEvidenceまで接続する。

## Scope

- In: Hermes `.hbc` disassembly inspection、Standalone validator、Android Native CI artifact guard、workflow／Production-validation Maestro contract、必要な検査CLI依存。
- Out: G2〜G9、Product behavior、Generic Bundle Inspection Framework、iOS Runtime、retry／timeout／assertion弱体化。

## Assumptions

- Android Release APKには`assets/**/*.bundle`または`assets/**/*.hbc` candidateが含まれ、展開後に`hermesc`が実際のHermes bytecodeであることを判定する現行CI契約を維持する。
- 現行lockにある`hermes-compiler` versionを明示devDependencyにして、platform binaryを再現可能に解決する。
- APKのzip展開はWorkflow内の既存`unzip`に限定し、汎用zip／inspection frameworkは追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: bundle pathのCLI形式とjob内の一時展開先は既存Workflow conventionへ合わせる。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Hermes compilerの`-dump-bytecode`出力は、raw byte scanで見えないmarkerを実artifactの文字列表／disassemblyとして可視化できる。
- H2: Android Build jobがuploadしたAPKからGuard jobが全`.hbc`を抽出し、同一validatorへ渡せば、StandaloneとWorkflowの判定ロジックを一つにできる。
- H3: Production-validation Maestro flowは既存のdisabled UI／runtime signal確認を維持し、Guard成功後の実APKを使う順序をcontractで固定すればG1のRuntime境界を満たす。

## Research Plan

- Round 1 Query: 実Expo Hermes export、実APK生成経路、既存raw scan、Hermes compilerの解決可能性を確認する。
- Round 2 Query: HBC disassemblyのpositive／negative／swapped-controlと、実Production APK由来pathを確認する。
- Exit Criteria:
  - H1〜H3それぞれに実行結果または明確な反証がある。
  - ローカルGradle環境異常が残る場合は、Actual Production Hermes exportと未実行のAPK検証を分離記録する。

## Approach

- 実artifact経路を先に確定し、validatorをHBC disassemblyに変更する。
- Workflowのraw marker scanを削除し、upload済みActual APKから抽出したHBCをvalidatorへ渡す。
- Contract／Maestro／focused repository gatesを順に実行し、最後にRun Artifactをsanitizeする。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> 実装 -> focused validation -> REPORT`

## Definition of Done

- Automation positive markerを全件検出し、Production negative markerを誤検知しない。
- Production期待にAutomation HBCを渡すnegative controlがFAILする。
- Native CIがActual APK artifactからのHBCを同一validatorで検査し、Workflow内にraw marker scanを複製しない。
- Production-validation Maestro flowがguard後に実行され、Test Control／Harnessの不在を確認する。
- 変更面のfocused test／typecheck／lint／formatとArtifact SanitizerがPASSする。
- 未実行のActual APK／Remote CIはPASS扱いにしない。

## Risks / Unknowns

- Hermes compilerとAPK bytecodeのversion mismatchは、固定versionと実artifact検査でfail-closeする。
- 複数HBCの検査漏れは、全抽出pathをvalidatorへ渡すことで防ぐ。
- Windows local Gradleの`build.ninja still dirty`は環境Failureとして分類し、無目的な再試行をしない。

## Thinking Log

- `HEAD == origin/main`を確認し、対象Findingが未修正であることをrebaselineした。
- 現行StandaloneはExpo export HBCをraw UTF-8で読み、Workflowは実APK HBCをgrepしているため、同一Root Causeと判断した。
- 実HBCに対する`hermesc -dump-bytecode`でAutomationの3 markerとProductionの0 markerを確認した。`--no-bytecode` projectionはProduction保証のEvidenceに採用しない。
- Actual Gradle Production APKはCMake/Ninjaの`build.ninja still dirty after 100 tries`で停止した。これは環境側の上流異常であり、実装方式の根拠とは分離する。
