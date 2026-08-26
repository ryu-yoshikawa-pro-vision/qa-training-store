# Tasks

## Now

- 実行順に並べる（上から順に処理）
- Template: PLANを確定する
- Template: 不足知識をrepo docs／Issue／Runから補い、証跡をREPORTへ残す
- Template: 実行タスクへ落とし込む
- Template: 実行・検証する
- Template: REPORTへ記録し完了判定する

## 今回の実行タスク

- [x] 6. 必須文書、Issue #60、直近ADR／Run、対象worktree、branchを確認する。
- [x] 7. `git fetch origin`を実行し、最新`origin/main`とbaseline SHAを確認する。
- [x] 8. Strict run artifactと`docs/plans/`の実装計画を保存する。
- [x] 9. Git invocationの共通解析と`-C` effective repository contextを実装する。
- [x] 10. `git -C` variant、matrix同値性、A/B fixture、quoted path、shell chainingのcontract testを追加する。
- [x] 11. focused contract、全contracts、format、lint、typecheck、verifyを実行する。
- [x] 12. diff triage／deep self-reviewを行い、必要な最小修正を反映する。
- [x] 13. Run Artifact sanitizer Write／Checkとevaluation更新を行う。
- [x] 14. commit前確認後、指定branchでcommitする。
- [x] 15. push前確認後、明示refspecでremoteへpushする。
- [x] 16. 日本語タイトル・本文でbase `main`のOPEN PRを作成する。mergeはしない。
- [x] 17. PR作成後にbranch、diff、SHA、PR metadata、CI開始状況を最終確認する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. Hookの実装契約変更を`docs/PROJECT_CONTEXT.md`と`docs/history/`へ同期する。

## Blocked

- B1. （ブロック時のみ記載）

## Review Repair iteration 1

- [x] R1. PR #65のレビュー指摘、既存plan、active Run、対象branchを確認する。
- [x] R2. Git invocation単位評価、multiple `-C`、repository-changing option、matrix個別検証の実装方針をplanへ反映する。
- [x] R3. `.codex/hooks/pre_tool_use_policy.mjs`をinvocation単位評価へ最小修正する。
- [x] R4. contract testへ複数invocation、後続dangerous operation、multiple `-C`、repository-changing option、duplicate ID回帰を追加・修正する。
- [x] R5. focused contractを実行し、最初のfailureを特定してbounded repairする。
- [x] R6. 全contracts、format、markdown lint、lint、typecheck、verify、diff checkを実行する。
- [x] R7. code-review skillでself-reviewし、差分・scope・既存semantics・Windows launcher非変更を確認する。
- [x] R8. Run Artifactをappend-onlyで更新し、sanitizer Write／Checkとevaluationを完了する。
- [x] R9. commit前確認、追加commit、明示refspec push、PR #65 metadata／CI／SHA最終確認を行う。PRはmergeしない。
