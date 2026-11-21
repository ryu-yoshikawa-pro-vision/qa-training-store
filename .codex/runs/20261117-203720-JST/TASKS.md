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
- [x] 7. PR #226のWeb CI失敗原因（Prettier）を特定し、契約テストを整形する。
- [x] 8. 親の短時間ポーリング禁止、v1/v2の長時間待機、待機タイムアウトの扱いを規定する。
- [x] 9. childで実行できない削除・rename・移動操作の停止・承認経路を明示する。
- [x] 10. 追加変更を契約テスト、Plan、Runへ反映し、PRのCIを再実行可能にする。
- [x] 11. childの既定モデルをGPT-6 Lunaへ変更し、v2の設定・ロールの実効境界を現行Codex仕様と照合する。
- [x] 12. 契約テスト、実装ハーネス、Plan、PR記録を更新して最新HEADのCIを確認可能にする。

## Blocked（ブロック中）

- Codex CLIの実ランタイム検証とローカルの`pnpm` / `scripts/verify`は、このGitHub接続では実行できない。
