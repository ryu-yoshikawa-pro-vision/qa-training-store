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
6. WindowsのDisposable buildはroot `node_modules`をjunction参照せず、Disposable copy内でoffline hoisted dependency installを行う。これによりbundle discoveryを再現可能にし、source cleanup後のPrepared Target／Learner rootは依存Sourceを公開しない。

## Consequences

- 一般CIや現行Hostでtrusted Receiptを生成できない場合、deterministic Preparation／Contract validationまでは実行できるが、Official scoreは生成しない。
- Host integrationは別のExplicit WorkflowまたはHost-native executionで行い、成功時はこのArtifact chainへReceiptと実行結果を保存する。
- Windows Preparationは依存installのため初回実行が長くなるが、root junction依存による不完全なWeb bundleを受け入れない。
