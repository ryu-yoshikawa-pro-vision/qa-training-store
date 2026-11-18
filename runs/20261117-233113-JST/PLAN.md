# Plan（計画）

## Objective（目的）

- 新規Codex Run Artifactを `runs/<run_id>/` に保存し、`.codex/runs/**` の過去履歴、安全性、既存スキーマ、Bash／PowerShellの同等性を保つ。

## Scope（対象範囲）

- In: Run生成・初期化、wrapper、collector、評価、QA、scope/changed_files、sanitizer、cleanup、CI/品質検査、現行規約と契約テスト。
- Out: `.codex/runs/**` の移動・編集・削除・再生成、`.codex/config.toml` の安全設定変更、sandbox/approval緩和、`.artifacts/agentic-qa/` の変更、merge/force操作。

## Assumptions（仮定）

- 新規Run rootは常に `runs/`。旧 `.codex/runs/` は履歴として保持し、明示的に参照する処理も読み取り専用とする。
- 新旧いずれかに同一Run IDがあれば新規作成を拒否する。
- ParentがRun Artifactを管理し、childはRun ArtifactとGitを変更しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。保存先、保持、衝突、sandboxを緩めないことは依頼で明示済み。
- 仮定してよい細部: 既存APIと文体を維持し、安全を確認できないパスはfail-closeする。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: `.codex/runs` の個別固定参照を全現行経路で同期して変更しないと、新Run参照が分岐する。
- H2: `runs/**` を新旧sanitizerとsource-scope除外の両方へ追加すれば、履歴保持と新Run追跡を両立できる。

## Research Plan（調査計画）

- Round 1: 3つのread-only Roleで参照箇所、実装境界、テスト／CIを並列調査。
- Round 2: ParentがRole結果とローカル状態を統合し、変更対象・対象外・rollback・検証を [`docs/plans/2026-11-17_231158_run-artifact-root-migration.md`](../../docs/plans/2026-11-17_231158_run-artifact-root-migration.md) に確定。
- Exit Criteria: 新旧Runの書込範囲・テスト方法・失敗時の扱いが具体化されている。

## Approach（進め方）

- 1) 初期状態・PR HEADを確認し、標準Run旧root失敗を記録する。
- 2) workerが新root生成とinitのみを更新し、Parentが標準入口でRunを作成する。
- 3) workerが直列でwrapper/collector、sanitizer/cleanup/QA/eval、現行文書・テストを更新する。
- 4) quality_gate_runnerが指定した検証のみ実行する。Parentは各結果、差分、旧Run保持、Run記録を判断する。
- 5) sanitizeと差分を最終確認し、通常commit/push、PR本文、最新HEAD CIへ進む。

## Definition of Done（完了条件）

- 新規RunがBash／PowerShellで `runs/<run_id>/` に作成される。
- Parentが実セッションからRun Artifactを保存できる。
- `.codex/runs/**` は開始時treeと同一で、既存履歴を参照する旧パスは改変されない。
- wrapper/collector/evaluation/QA/cleanup/sanitizer/docs/CI/testsの新旧path契約が一致する。
- 要求された検証とWeb/Mobile App CIを最新PR HEADで確認する。実行不能はBLOCKEDとする。

## Risks / Unknowns（リスク・未知点）

- 残存する固定pathはRunの取り違えやCI漏れを起こす。
- symlink/reparse、同一ID衝突、Git indexとworktreeの不一致はfail-closeが必要。
- `.git` がread-onlyでGit操作が拒否される可能性がある。設定変更や回避はせず、許可済みの通常経路を確認する。
- rollback後は旧pathのsandbox保存問題が再発するため、Runを伴う処理を停止し、旧rootへfallbackしない。

## Thinking Log（判断記録）

- 2026-11-17: PR #226のGitHub最新HEADとlocal HEADは `3aaed9e7b1a8423b654aa97cd9991216cc18a72` で一致。PRはopen、branchは指定値、初期worktreeはclean。
- 2026-11-17: `git fetch origin` は `.git/FETCH_HEAD` read-onlyで失敗。GitHub PR APIと既存tracking refは一致するが、Git mutation直前にもremote/PRを確認する。
- 2026-11-17: 開始時の `.codex/runs` tree objectは `b00cde6e29909a54de8312e6b61d02bf50ce595f`。変更前の追跡状態として保持する。
- 2026-11-17: 旧 `scripts/new-run.sh --run-id 20261117-231158-JST` は `.codex/runs/` へのwriteで `Read-only file system`。作成なし。エラーメッセージは既存Runと誤表示していた。
- 2026-11-17: その後、新しい標準入口で `runs/20261117-233113-JST/` を作成し、`PLAN.md`／`TASKS.md`／`REPORT.md` とmachine-managed `run.json` が生成された。workerはRun作成・変更を行っていない。
- 2026-11-17: 調査3 Roleの報告をParentが採否し、実装はworkerへ限定ファイル単位で直列委任する。
