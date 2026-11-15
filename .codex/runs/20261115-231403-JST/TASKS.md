# Tasks（タスク）

## Now（現在）

- [x] 1. 認証、active repo、alert、default branch、既存PR/CI、repo規約、Preview条件を確認する。
- [x] 2. Repository planとRun PLANを保存する。
- [x] 3. `package.json`のpnpm overrideと`pnpm-lock.yaml`を更新する。
- [x] 4. pnpm 10.34.5のfrozen install、`pnpm why`、production audit、unit testsを実行する。
- [x] 5. Prettier、text lint、Markdown lint、diff範囲を確認する。
- [x] 6. Run Artifact sanitizerと`git diff --check`を実行する。
- [x] 7. commit `75f280de15833b4a98a9e9f8238eb2df3b34c1e6`を作成し、branch `security/critical-shell-quote-1.11.0-20261115`へpushする。
- [ ] 8. Preview副作用の明示承認後にPRを作成し、exact-headの必須CIを確認する。

## 完了処理の参照先

- Run lifecycle / Progress: `docs/reference/run-artifacts.md`
- Commit / push / PR / CI: `docs/reference/codex-implementation-harness.md`
- Branch safety: `docs/reference/git-branch-safety.md`
- Repo policy: `AGENTS.md`

checkbox taskの完了はローカル追跡タスクの進捗を示し、PR/CIの完了判定とは区別する。

## Discovered（発見事項）

- main runtime lock graphは`react-native@0.86.3 -> react-devtools-core@6.1.5 -> shell-quote@1.10.0`。
- Critical #70のpatched versionは`1.11.0`。
- PR作成後にCloudflare Preview deploymentとsmoke checkが実行される可能性がある。
- `wait_for_required_ci` toolは現在の実行環境にない。

## Blocked（ブロック中）

- PR作成はCloudflare Previewの外部副作用に対するユーザー承認待ち。
- Hosted CIの指定待機toolがない。repo規約上、直接pollingへ切り替えない。
