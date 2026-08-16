# ADR-0015: Official Black-box Scored E2EのArtifact BoundaryとHost証跡

- Status: Accepted
- Date: 2026-08-13

## Context

Official Black-box Scored E2Eでは、Learnerへ渡す情報、実行するRuntime、Hostが提供するAgent capability、Runner出力、Evaluator入力を同じRunの証跡として結び付ける必要がある。Repository側だけでCoding AgentのFresh Contextや実際のTool Scopeを推測すると、Contract FixtureをOfficial結果へ誤昇格できてしまう。また、WindowsのDisposable buildではroot依存ディレクトリへのjunctionがbundle discoveryを変える問題も確認された。

## Decision

1. Identityに使うJSONはShared Canonical JSON serializerで生成し、Prepared Target／Frozen RunnerはCanonical File ManifestとSHA-256で固定する。Runtime VariantはBenchmark Revision digestから除外し、Benchmark IdentityとRunner Inputの独立dimensionにする。
2. Learner-safe InputにはNormative Specification bundle、Challenge、Runbook、固定Scored Skill、Output Contract、Initial State、Runtime URL／Origin、Runtime Variant、Budget、Stop ConditionをCanonical `runner-input.json`として渡す。Instructor-only source、Answer Key、Patch、tests、repository skill fallbackをInputへ含めない。
3. Prepared Targetはpatched Disposable Sourceから生成したsource-free Web distだけをRuntimeへhandoffし、symlink、Source Map、Source／Instructor pathを拒否する。Protected Pathへ触れるPatch、resource boundaryが実行されていないProbe、hash不一致はfail-closeする。
4. Fresh Session、Context、no-inheritance、Actual Tool Scope、Tool Isolation、Origin／Resource Boundary、constrained output、exact Skill source／revision、Browser VariantはHost-trusted Receiptの責務とする。Receiptが無い、unproven、fallback、実測不能なOfficial RunはRepository側で代替せずinvalid／blockedとする。
5. RunnerはHostのCoding Agent + Scored SkillをPrimary Executorとし、Repository scriptsはPreparation、Contract、Import、Freeze、Evaluationだけを担当する。Runner出力はcurrent-run EvidenceのCanonical refとphysical output mappingを作成してからFrozen Artifactへ固定し、post-freeze mutationを拒否する。
6. WindowsのDisposable buildはDisposable copy内でoffline hoisted dependency installを唯一の方式とする。ローカルpnpm storeが`ERR_PNPM_NO_OFFLINE_TARBALL`を返した場合は観測事実をログへ残してPreparationをBLOCKEDにし、root依存 topologyへのjunction fallbackでExpo Routerの解決を変えない。Linux/macOSだけはroot `node_modules`の一時symlinkを使い、いずれもsource cleanup後のPrepared Target／Learner rootへ依存Sourceを公開しない。
7. Official v1のCanonical Run Rootは`.artifacts/agentic-qa/<run_id>/`一つだけとし、直下の`input/`、`trusted/`、`runner/`、`evaluation/`をArtifact LayoutのSSOTとする。`1 run_id = 1 challenge`をidentityへbindし、Challenge-specific hidden subrootや旧layoutへのfallbackは作らない。
8. Runner ProfileはBenchmark Revisionから分離したtrusted canonical artifactとしてfreezeする。Official Profileにはmodel、model configuration、Tool／Skill／Output／Host revision、budget、stop conditionを必須化し、Evaluatorは欠落時に再構築しない。
9. Prepared Runtimeのreadinessは同一URL・同一Prepared Artifact hashをbindするHost Runtime Handoff Receiptからだけ受理する。別Runtimeの観測値を流用せず、Receiptが無い場合はOfficial Runtime Handoffをunproven／blockedとする。
10. Scored Preparationの順序はMachine／Challenge／Spec validation、Protected Patch、learner-safe identity、disposable preparation、baseline／patch／patched sanity、initial-state reset、source-free copy/hash、Runner Input freeze、isolated root、repository preflight、source cleanup、Host handoffの一列へ固定する。
11. `trusted/learner-safe-input-artifact-manifest.json`はCanonical `input/**`全体のbytes／file setをfreezeし、Official verifierはRunner Inputのfield bindingとともに再検証する。Repository-side `trusted/preparation/isolated-run-root/`も専用Artifact Manifestでfreezeし、frozen inputからのspecification／Runbook／Challenge snapshotとのbyte identityを検証する。
12. Host Capability Receiptは`learner_safe_input_artifact_sha256`でexact learner-safe input snapshotへbindする。Host、Resource Probe、Bootstrap、Runtime Controlのproofとして使う`evidence_ref`は共通resolverでcurrent runの`trusted/**`にある非symlink regular fileへ解決できる場合だけ受理する。
13. Prepared TargetのBenchmark Revision、source HEAD、patch hash、Runner Input allowed originsはCanonical Benchmark Manifest／Runner Inputとexact equalityで検証する。subsetや後付けのRunner／Evaluator再構築ではOfficial identityを成立させない。
14. Learner-safe Inputとisolated Runner Rootは、Manifestのhash一致だけでなく、期待されたcanonical file／directory setとの完全一致を要求する。Official Artifact／Trusted Evidenceのpath chainはCanonical Run Rootからleafまでancestor symlinkを許可しない。
15. Official verifierはBenchmark ManifestのLearner Specification entries、Challenge bytes、Runbook bytesをRunner Inputの`spec_bundle_sha256`、`challenge_sha256`、`runbook_sha256`へ直接bindする。Runbook identityが欠落するBenchmarkはOfficial invalidとする。

## Consequences

- 一般CIや現行Hostでtrusted Receiptを生成できない場合、deterministic Preparation／Contract validationまでは実行できるが、Official scoreは生成しない。
- Host integrationは別のExplicit WorkflowまたはHost-native executionで行い、成功時はこのArtifact chainへReceiptと実行結果を保存する。
- Windows Preparationは依存installのため初回実行が長くなる。offline store欠損時はjunction fallbackを使わず、依存準備をBLOCKEDとして再実行可能な診断を残す。
