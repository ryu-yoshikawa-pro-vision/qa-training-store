# Agentic QA Feedback Loop Post-merge Rebaseline 履歴

## 変更日時

2026-08-19 JST

## Rebaseline Evidence

- Original assessment revision（Historical Baseline）: `fc9e497817e6c3cff8d89ebd7b37244e759e9484`
- Latest main / Current Rebaseline: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`
- `git log --oneline fc9e497817e6c3cff8d89ebd7b37244e759e9484..origin/main`でPR #31 Public Repository HardeningとPR #33 Codex Hook Contract Testのbranch-context fixを確認した。
- `git diff --name-status fc9e497817e6c3cff8d89ebd7b37244e759e9484..origin/main`で、workflow／repository policy／Dependency Review／Preview-validate contract／full SHA pin／Codex Hook contract／Run Artifactのdeltaを確認した。
- `app/`、`src/`、`docs/spec/`、`docs/curriculum/`、`training/`、`e2e/`、`maestro/`、Formal Regression本体にはdeltaがなく、Test TargetとCurriculumの結論は`unchanged`とした。

## 判断

- QA System baselineは#31/#33を含むlatest-mainへ更新した。Public Repository Hardening、Security／repository operation policy、Codex Hook branch-independence、protected branch commit G10 regression coverageを含む。
- GAP-02はlightweight Documentation／ADRで解消する判断を維持した。Experiment ReadinessとFormal Experimentの境界も維持した。
- Formal Experiment Target Revisionは設定しない。Formal Experimentは`NOT EXECUTED`、Knowledgeは`none`、Promotionは`none`。
- Official Scored GAP-01はHost-trusted Receipt／Actual Tool Scope Evidence不足による`BLOCKED / NOT EXECUTED`のままである。

## Evidence Contract

- `.artifacts/`は`.gitignore`対象のlocal／CI ephemeral Raw Evidence（screenshot、trace、MCP／ADB log、大容量一時成果物）に限定する。
- Committed Formal Evidenceはfresh cloneで解決できるtracked Run Artifact／Manifest／Summary等のrepo-relative referenceを標準とする。
- Raw `.artifacts/`が必要な場合は、tracked referenceへ要約、digest、取得条件を残す。新しいexternal storage／Registry／Artifact Serverは追加しない。
