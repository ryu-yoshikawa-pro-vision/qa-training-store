# Tasks

## Now

- [x] 1. Repository Planning / Review Contractを再確認する
- [x] 2. Main PlanをTemplate必須項目へ再整理する
- [x] 3. MNT-003 / REP-002 / PR Slice / MCP / Oracle / SHA pinning指摘を反映する
- [x] 4. Planning Run Artifactを追加する
- [ ] 5. Branch差分を確認し、Plan + Run Artifact以外の変更がないことを確認する

## Discovered

- D1. Current Native Test Control scenario allowlistに`gold-member` / `platinum-member`がないため、Runtime検証だけを目的としたscenario追加を禁止する必要がある → Planへ反映済み。
- D2. Cross Browser CI splitは実装branchに存在するがmain未反映のため、R13を`BLOCKED_BY_DEPENDENCY`として明示する必要がある → Planへ反映済み。

## Blocked

- B1. GitHub connector経由の編集環境では`scripts/sanitize-codex-artifacts.ps1` / `.sh`を直接実行できない。Run Artifactにはローカル絶対Pathを記載しないことで入力自体をsanitize-safeにしている。
