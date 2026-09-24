# Plan（計画）

## Objective（目的）

- PR #179のstaged Prettierが`.prettierrc.json` / `.editorconfig`から解決した`endOfLine: "lf"`を使い、stage 0 CRLFを拒否する契約を修正とbehavior regression testで固定する。

## Scope（対象範囲）

- In: `scripts/pre-commit-quality-check.mjs`、`tests/contracts/pre-commit-quality.test.ts`、このRunの`PLAN.md` / `TASKS.md` / `REPORT.md`。
- Out: Product code、他の品質設定や責務、別Issue、timeout変更、依存追加、mainとのmerge/rebase、PR merge、Issue close。

## Assumptions（仮定）

- 作業開始時のPR #179は`plan/issue-177-windows-crlf-prettier`上でOPEN、headは`38b0eabc94dccd81dbb7304a5ae8b15f6116673a`。
- 作業開始時の`origin/main`は`2f5353b63414ace7278155d525e0e2cf074d630b`でPR branchより1 commit先だが、main-only変更とPR差分に重複ファイルはない。
- ユーザーが指定した回帰テスト追加、標準検証、commit/push、最新headのCI確認は許可済み。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: CRLF stage 0 blobはGit標準の`hash-object`と`update-index --cacheinfo`でfixtureに設定する。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: `checkPrettier()`の明示`endOfLine: "auto"`がresolved LF設定を上書きし、stage 0 CRLFを誤って許可している。
- H2: `endOfLine` overrideを除けば、既存のworktree CRLF / stage 0 LF testは引き続きPASSする。

## Research Plan（調査計画）

- Round 1 Query: PR / Issue / branch / latest main、Plan、checker、tests、format / CI / Git EOL設定をrebaselineする。
- Round 2 Query: stage 0 CRLFかつworktree LFのテストを追加し、修正前FAIL・修正後PASSを確認する。
- Exit Criteria:
  - 新旧EOL matrixと指定Repository validationがPASSする。
  - commit / push後にPR head、Web CI、Mobile App CIが確認できる。

## Approach（進め方）

- 指定された2ファイルだけを変更し、他の既存contractを再利用する。
- stage 0 CRLF blobをbehavior testで実際に生成して修正前の検出力と修正後の結果を確認する。
- focused test後、`format:check`、`format:check:strict`、`test:contracts`、`verify`、`git diff --check`を実行する。
- 差分とscopeを再確認してPR branchへ通常commit / pushし、PR本文が古い場合だけ今回の結果を追記して最新CIを確認する。

## Definition of Done（完了条件）

- staged Prettierから`endOfLine: "auto"`上書きがなくなる。
- stage 0 CRLF / worktree LFの回帰testが、index bytesと`endOfLine: "lf"`契約をbehaviorで検証してFAILを得る。
- worktree CRLF / stage 0 LFは引き続きPASSする。
- 指定focused test、`format:check`、`format:check:strict`、`test:contracts`、`verify`、`git diff --check`がPASSする。
- 2対象fileとRun Artifact以外の無関係な変更がない。
- 通常push後、local / remote / PR headが一致し、Web CI / Mobile App CIがsuccess。PR未merge、Issue未close。

## Risks / Unknowns（リスク・未知点）

- Gitの`--cacheinfo`入力のWindows互換性はfixtureの実行で確認する。
- `verify`は長時間を要する可能性がある。成功/失敗まで実行結果を待って記録する。

## Thinking Log（判断記録）

- 2026-09-24: PR #179 head `38b0eabc...`、base `main`、Issue #177 OPENを確認。branchのworktreeはclean、upstreamは期待するPR branch。
- 最新`origin/main`はPRより1 commit先。main-only commitの変更pathとPR差分に重複なし。指示どおりmerge / rebaseはしない。
- `checkPrettier()`はstage 0 blobを読むが`endOfLine: "auto"`でresolved LFを上書きしている。既存testにはworktree CRLF / index LFがあるがindex CRLFケースがない。
- Finding triage: must_fix（staged LF contract違反の見逃し）。Repair plan: 対象testへstage 0 CRLF fixtureを追加し、checkerからoverrideだけを除く。許可範囲: 上記2ファイルおよび本Run Artifact。
- 2026-09-24: commit前の再fetchでPR branch / local HEADは`d38b262019af7de379ea4f4817c01102216313f2`へfast-forward済みと判明。既に`origin/main` `9cef8501c2b19e1764892b0c17ee50318fa90b97`を含むmerge commitで、PRはOPEN・未merge、Issue #177はOPEN。対象checker/testにmerge由来の変更はなく、現在のdiffと修復内容は維持された。
