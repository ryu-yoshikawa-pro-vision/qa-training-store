# Tasks（タスク）

## Now（現在）

- [x] 1. `main`と既存契約を確認し、専用ブランチを作成する。
- [x] 2. 実装計画を`docs/plans/`へ保存する。
- [x] 3. Parentとchildの委任方針を更新する。
- [x] 4. 調査ロールと実装ハーネスを整合させる。
- [x] 5. 既存の契約テストを拡張する。
- [x] 6. 静的チェックと変更範囲を確認する。

## 完了処理の参照先

- Progress: `docs/reference/run-artifacts.md`
- file-changing taskとPR/CI: `docs/reference/codex-implementation-harness.md`
- Git安全規約: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- rootの`AGENTS.md`に個別agent名を戻さず、詳細ロール定義は実装ハーネスへ集約する。

## Blocked（ブロック中）

- Codex CLIの実ランタイム検証とローカルの`pnpm` / `scripts/verify`は、このGitHub接続では実行できない。
