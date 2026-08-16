# Plan

## Objective

- PR #23再レビューで残ったOfficial Black-box Scored E2Eのtrust-chain欠落を、既存Architectureを維持した最小修正で解消する。

## Scope

- In: `scripts/agentic-qa/{canonical-artifact-manifest,contracts,runner-input,prepare-challenge,official-verification,isolation,host-capability-gate,evaluate}.ts`、必要なtrusted evidence helper、関連contract tests、Agentic QA reference docs、今回のRun artifact。
- Out: Product UI、Native/Android、Visual Catalog、Curriculum、Static serverのsecurity再設計、Custom Runner/Proxy/Gateway、無関係なformat修正、Git mutation。

## Assumptions

- 前回修正済みのCanonical Layout、Runner Profile、Runtime Handoff、Resource Matrix、Frozen Runner、Official intrinsic verificationをSSOTとして再利用する。
- Host Capability Receiptの追加fieldはOfficial requiredとし、Repository側fixtureだけがsynthetic receiptを生成する。現HostのHost executionは引き続きBLOCKEDとする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定されたidentity/evidence contractの変更範囲は明確。
- 仮定してよい細部: Artifact Manifestの`artifact_sha256`は既存`createArtifactManifest`のcanonical digestを正本とする。Benchmark manifestのhex file hashはtargetの`sha256:`表現へ既存helperでbindする。
- 未回答の重要質問: 実Hostが追加fieldを発行する時期はHost integration側のfollow-upであり、Repository fixture修正のblocking要因ではない。

## Hypotheses

- H1: 現在の最大gapはinput/isolated-rootを生成時に検査するだけで、trusted manifestによる再検証とHost receiptへのartifact hash bindが無いこと。
- H2: Official positive evaluationが通らない残因は、trusted evidenceの実体欠落とevaluator session artifact未作成であり、resolverを共通化してfixtureを実ファイル化すれば解消できる。
- H3: Prepared TargetのBenchmark/source/patch/origin比較をverifierへ追加すれば、target identity mutationを一括fail-closeできる。

## Research Plan

- Round 1 Query: 現行manifest、input package、isolated root、Host receipt、Official verifier、golden fixture、evaluateBlackBoxのidentity/evidence経路を照合する。
- Round 2 Query: shared resolver／manifest再検証／Prepared Target bindを実装し、positive evaluatorとrequired mutation matrixを実行する。
- Exit Criteria:
  - valid chainが`validateOfficialArtifacts().valid === true`かつ`evaluateBlackBox().valid_for_scoring === true`になる。
  - input、isolated root、target、trusted evidenceのmutationがinvalidになる。
  - Host capability不足はOfficial execution BLOCKEDとして記録され、偽receipt/scoreを作らない。

## Approach

- iteration 1: 現行gapをmust_fix/should_fix/defer/rejectへ分類し、manifest/resolver/identityの最小実装を行う。
- iteration 2: golden fixtureとpositive evaluator、input/target/evidence mutation testsを追加し、targeted contractを通す。
- iteration 3: full contract・quality gate・self-review・sanitizerを実行し、残差を分類して停止する。
- 標準フロー: `PLAN -> TASKS -> bounded repair -> targeted validation -> full validation -> REPORT`

## Definition of Done

- Frozen learner-safe input artifactとisolated-root artifact manifestがTrusted側へ保存され、Official verifierが実FS完全一致を再検証する。
- Host receiptがinput artifact hashへbindされ、Prepared TargetがBenchmark/source/patch/originへbindされる。
- required trusted evidenceがcurrent runのregular fileへ解決され、cross-run/traversal/symlink/missingを拒否する。
- golden Official evaluationがvalid_for_scoring=true、invalid_reasons=[]、metrics非nullになる。
- required mutation tests、targeted/full validation、diff check、sanitizerを実測し、Host execution statusを偽らない。

## Risks / Unknowns

- Host integrationは追加required fieldをまだ発行できない可能性がある。Repository verifierを緩めず、実Host executionはBLOCKEDのままにする。
- 既存fixtureは多数のevidence refを文字列だけで生成している。fixtureの実ファイル化を先に行い、positive pathを確認してからmutationを追加する。
- 既存Runのignored生成artifactは削除せず、今回Runの監査記録では検証件数と残差を事実として記録する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新する）。
- 2026-08-13 17:42 JST: 開始時statusはclean、HEADは前回修正後の`d58c09f...`。今回の入力は前回完了Runとは別の再レビュー修正として新Runを開始した。
- 2026-08-13 17:45 JST: 現行verifierはinput artifact manifest、isolated-root manifest、Host evidence existence、targetとBenchmark source/patch bind、positive evaluate pathが不足していることを確認した。
- 2026-08-13 19:09 JST: learner-safe input／isolated rootの実FS manifest、Host input hash、trusted evidence resolver、Prepared Target identity bind、Official positive evaluationを実装し、mutation matrixを追加した。required artifactのsymlinkとcanonical Run Root外custom pathもOfficial invalidへ閉じた。
- 2026-08-13 19:09 JST: 最終実測はfocused contract 61/61、全contract 263/263、Preparation 1/1、Chromium 27/27、lint/typecheck/spec/security/build系PASS。repository-wide `format:check`と`verify`は既存379ファイルのformat差分でFAILし、無関係なformat修正は行わない。
