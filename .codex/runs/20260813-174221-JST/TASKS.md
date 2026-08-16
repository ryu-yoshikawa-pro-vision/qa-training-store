# Tasks

## Now

- [x] 1. Worktree境界、branch、HEAD、開始時statusをread-only確認する
- [x] 2. AGENTS、PROJECT_CONTEXT、ADR、repair-loop workflow、直近Runを確認する
- [x] 3. 残存review findingsをmust_fix/should_fix/defer/rejectへ分類し、allowed scopeを確定する
- [x] 4. Learner-safe input artifact manifest、field binding、isolated-root manifestを実装する
- [x] 5. Trusted Evidence resolverとHost/Resource/Bootstrap/Runtime Control evidence existence検証を実装する
- [x] 6. Prepared TargetのBenchmark/source/patch/origin identity bindを実装する
- [x] 7. Golden fixtureを実Evidenceへ更新し、Official positive evaluator pathを追加する
- [x] 8. Input、isolated root、Host hash、Target identity、Evidence missing/cross-run/traversal/symlink mutation testsを追加する
- [x] 9. Targeted validationとrepair iterationを実行し、failureを分類する
- [x] 10. Full validation、self-review、Run artifact/evaluation、sanitizerを確定する

## Discovered

- [x] D1. Host Capability Receiptへlearner-safe input artifact hashを追加すると既存synthetic receipt全件の更新が必要になる
- [x] D2. Isolated rootは既存Artifact Kindに無いため、専用kindを追加してmanifestの意図を明確にする
- [x] D3. evaluateBlackBox positive pathにはevaluation/evaluator-session.jsonのfixture作成が必要

## Blocked

- B1. 現HostのTrusted Host Capability / Runtime Handoff不足はRepository実装をblockしないが、Official execution/scoringをBLOCKEDにする。
