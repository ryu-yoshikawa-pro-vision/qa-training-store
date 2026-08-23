# Tasks

## Now

- [x] 1. 開始状態（pnpm、branch、clean worktree）と必須文書・Planを確認する
- [x] 2. normalization前のlockfile snapshotを`.artifacts/issue-51/pnpm-lock.before.yaml`へ保存する
- [x] 3. `.prettierignore`へ`pnpm-lock.yaml`だけを追加する
- [x] 4. pnpm 9.10.0でlockfileを一度normalizationする
- [x] 5. normalization直後にfrozen installを実行する
- [x] 6. normalization前後のlockfile semantic equalityを確認する
- [x] 7. pnpm idempotencyをcanonical snapshotとのbyte equalityで確認する
- [x] 8. Prettier ownership（`ignored: true`）を確認する
- [x] 9. `pnpm run format:check`、`pnpm run verify`を順番に実行する
- [x] 10. 最終diff、scope、sanitizerを確認しRun Artifactを完了状態にする

## Discovered

- [ ] D1. ユーザー明示のcommitを作成する
- [ ] D2. 対象branchへforce pushなしでpushする
- [ ] D3. 既存PR #52への反映とWeb CI / Mobile App CI状態を確認する

## Blocked

- B1. Task 9の`pnpm run verify`がIssue #51のdiffと無関係な既存Plan文書のMarkdown lint failure（MD047）で停止。repair-loop iteration 2で末尾LFのみを補正し、解消済み。
- B2. Task 9の再実行がIssue #51のdiffと無関係な既存application sourceのTypeScript failure（`src/presentation/native/native-shell.tsx:155:21`, TS2322）で停止。repair-loop iteration 3でHref castを最小追加し、解消済み。
