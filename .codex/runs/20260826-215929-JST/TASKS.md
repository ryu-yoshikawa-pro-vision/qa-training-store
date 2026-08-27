# Tasks

## Now

- [x] 1. 指定ブランチ、working tree、PR #70、PROJECT_CONTEXT、最近のADR / Run、指定プランを確認し、Strict Runを初期化する。
- [x] 2. 現行Training workflow、workflow contract、curriculum contract test、Training Copy経路、参照Native CIを確認する。
- [x] 3. `training/github-actions/training-native-ci.yml`を指定v5.7.0完全SHAへ更新する。
- [x] 4. `scripts/training/workflow-contract.ts`のallowlistを指定v5.7.0完全SHAへ更新する。
- [x] 5. `tests/contracts/training-curriculum.test.ts`へv5固定 / 旧v4拒否の最小回帰テストを追加する。
- [x] 6. `code-review` skillでdiff triage / deep self-reviewを行い、security boundaryとscopeを確認する。
- [x] 7. プラン記載のLocal / contract validationを全て実行する。
- [x] 8. commit前にbranch safetyを再確認してcommitし、最終HEADで`git diff --check main...HEAD`を実行する。
- [ ] 9. 最終HEADでDisposable Training Copyをprepare / validateし、生成先を整理する。
- [ ] 10. 対象ブランチをpushし、同じSHAのNative CI dispatch / job runtime validation、PR #70 head SHA一致確認、PR本文反映を完了する。

## Discovered

- なし。

## Blocked

- B1. `training:copy:validate`が、今回差分と無関係な既存`.github/workflows/cross-browser-smoke.yml`をactive workflowとして検出してallowlist違反でFAILした。`prepare-training-copy.ts` / `validate-training-copy.ts`はプランの参照のみであり、scope外修正や一時Copyの手動回避は行わない。Training Copy validationがPASSするまでpush / workflow_dispatchは実行しない。
