# Tasks（タスク）

## Now（現在）

- [x] 1. 最新PR状態、head/base、branch/remote、working treeを確認する。
- [x] 2. PR本文・差分・既存test・レビュー/承認Evidenceを確認する。
- [x] 3. PR #223用PlanとRun Artifactを初期化する。
- [x] 4. workflow差分のL2承認を得る。
- [x] 5. 実workflow Node heredocの回帰テストを追加し、修正前[{}]を3経路すべてで再現する。
- [x] 6. 3箇所へ要素とページ長のfail-closed検証を実装する。
- [x] 7. focused/contract/standard gatesの未完了・失敗を分類し、Run/Plan、差分、scope、sanitizationを確定する。
- [ ] 8. existing PR branchへcommit/pushし、PR本文と最新head CIを確認する。

## 完了処理の参照先

- 基本Progress: docs/reference/run-artifacts.md
- file-changing lifecycle / exact-head CI: docs/reference/codex-implementation-harness.md
- repair loop: docs/reference/repair-loop.md と .agents/skills/repair-loop/**
- Git branch/refspec: docs/reference/git-branch-safety.md

## Discovered（発見事項）

- 現在のtool setに標準CI waiterが見つからない。push後に一度だけCI結果を取得し、未完了ならpollingへ切り替えず未確認として報告する。

## Blocked（ブロック中）

- `bash scripts/verify`の旧固定語句54件をユーザー承認に基づき現行canonical referenceの表現へ更新し、参照文書を変更せずPASSした。
- `pnpm run test:contracts`は一時的な子プロセス実行環境でも25分以上で停止したため中断。観測済みの独立失敗はHook並行追記、PowerShell/WSLパス互換、codex-text-qualityの30秒timeout。全suiteの最終集計は未取得。
- `.github/workflows/security-dependency-fallback.yml`変更と検証literal更新、一時検証環境はそれぞれユーザー承認済み。L3の永続設定変更は行わない。
