# Specification / Agentic QA基盤のRepair追補

## 2026-08-10

- Agentic QAの最終DoD突合で、Evaluator CLIがCanonical ManifestのBenchmark Revision、Runtime Variant、Runner Profileを期待値として渡していない欠落を確認した。
- Benchmark ManifestへRunner Profileを混在させず、Evaluatorが`scored-v1.json`のbytes digest、Challenge budget、明示modelから同Profileを再構成する方式へ修正した。ManifestとEvaluationはJSON + Zodで検証し、Frozen FindingsとのIdentity不一致をfail-closeする。
- Candidate Findingは`review_needed`としてhuman adjudicationへ送り、Non-defectのTNはItem-specific observation Evidenceがある場合だけ成立するようにした。Positive Tool Allowlistの必須CapabilityとEvaluator別Session証跡も固定した。
- 最新Basic ChallengeでSPA URL遷移待ち不足を修正し、Baseline clean／Patched defect、Patch check/apply、Fresh Runner、Separate Evaluator、Evaluation identity一致を再確認した。
- Product sourceは変更していない。Full verifyの既存84 tracked file formatter baselineと、未公開変更に対するRemote CI未取得はRequired blockerとして継続する。
