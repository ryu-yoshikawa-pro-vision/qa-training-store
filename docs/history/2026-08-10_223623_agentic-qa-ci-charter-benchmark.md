# Agentic QA CI／Charter／Benchmark契約追補

2026-08-10、PR #16のSkill-first + Harness-backed構成について、実行可能性とCI安定化の
残課題を反映した。

- Preparation用Disposable Sourceはroot `node_modules`全体をjunction／directory symlinkで
  参照し、`tsx`からtransitive dependencyの`esbuild`までpnpm topologyを保つ。Scored
  isolated rootとは分離し、`node_modules`を公開しない。
- Normal／Gray-boxはcurrent runの`qa-charter.json`を確認し、欠落時はCoding Agentが
  bounded Charterを作成する。Charterはshared `exploration_budget`を含み、Zod契約で検証する。
  過去RunのCharterは暗黙再利用しない。
- Charter検証後、最初のRuntime interaction前にBEFORE Snapshotを取得し、Runtime QA、
  candidate Findings、AFTER Snapshot、comparison、追加Source差分0確認、finalizationの
  順序を固定した。
- Benchmark Revision digestからRunner Profileを除外し、Runner Profileを実行条件metadataへ
  分離した。Profileだけの差分ではBenchmark Revision／Identityは変わらず、
  `sameRunnerCondition`だけがfalseになる。
- Official Black-box Scored E2EはHostのtrusted Fresh Session等と、Prepared patched Target
  RuntimeをFresh Sessionへ引き渡すlifecycleが不足するため、`BLOCKED / DEFERRED / NOT EXECUTED`
  とする。Repository独自Runner／LLM wrapperは追加しない。
