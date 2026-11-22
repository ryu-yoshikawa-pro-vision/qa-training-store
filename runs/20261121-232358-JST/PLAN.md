# Plan（計画）

## Objective（目的）

- PR #199の最新`origin/main`との差分を統合し、実際に競合したファイルを両ブランチの意図を保って解消する。

## Scope（対象範囲）

- In: PR作業ブランチ上の`origin/main`マージ、`AGENTS.md`と`package.json`の競合解消、関連検証、ローカルcommit。
- Out: 受入タスクや既存CI障害の追加修正、製品SUT／正式仕様／Seed・Reset／既存製品テスト変更、PR merge/close、remote push。

## Assumptions（仮定）

- PR Headは`6dbbb6516cb91a4ce987cfa299f68bd771a2f0c7`、fetch後のmainは`ddc451a7079bbc75cd1d6623f5ae1e4647caf635`。
- 共通祖先は`17de02cd1adfa3b167965d95a61265b4421393fd`。`merge-tree`で`AGENTS.md`と`package.json`のcontent conflictを確認した。
- ユーザーが競合時のマージとcommitを指示。pushは明示承認が別途必要。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 競合解消は手動で必要最小限に統合する。
- 未回答の重要質問: remote pushの明示承認。

## Hypotheses（仮説）

- H1: `AGENTS.md`はmainのRun Artifact移行・delegate・OpenCode安全契約と、PR側の製品境界／#199節9〜11を併存できる。
- H2: `package.json`はPR側course/E2E/validatorとmain側Hook・tsx・Expo・security更新を併存できる。

## Research Plan（調査計画）

- Round 1 Query: GitHub PR metadata、working tree/branch/upstream、fetch後ref、祖先・rev-list・merge-treeを確認。
- Round 2 Query: conflict base/ours/theirs、PR #223/#226/#227、統合受入Plan／継続手順、関連script/CI/test contractを確認。
- Exit Criteria:
  - [x] mainとPRで異なる変更が同時に存在する根拠を特定した。
  - [ ] 解消結果で双方の要件と変更境界を保持した。

## Approach（進め方）

- 作業開始時に既に存在したmerge stateの`MERGE_HEAD`が最新`origin/main`と一致し、index stagesもPR Head/main refsに一致することを確認する。mergeは再実行・中断せず継続する。
- Childの調査根拠と差分をParentが確認し、2ファイルだけ手動解消する。
- 必要なHook契約テストと`pnpm run verify`、Git差分・保護path・Run Artifactの確認後、merge commitを作る。pushは行わない。

## Definition of Done（完了条件）

- 競合マーカーとunmerged pathが0件、変更境界外の製品ファイル差分が0件。
- Hook contractと標準verifyの結果、Git状態、commit SHAを記録。
- PR branch上のローカルcommitが作成され、remote pushは未実施である。

## Risks / Unknowns（リスク・未知点）

- GitHub PR metadataはbase SHA `17de02cd`と`mergeable=false`を報告する一方、fetch後の`origin/main`は`ddc451a7`。GitHub/localのhead判定時点の差を記録し、ローカル競合を主たる再現根拠とする。
- verifyで既存環境障害が起きた場合は因果を切り分ける。今回は別タスクのfailuresを修正しない。

## Thinking Log（判断記録）

- 2026-11-21: current branch/upstream/HEADはPR指定と一致。status初回呼出しは30秒時点で継続中。後続取得で開始時からMERGE_HEADが最新`origin/main`を指し、mainの変更はindexへ載っていた。これを既存状態として保ち、再merge・abortしない。
- 2026-11-21: `merge-tree`はAGENTS.md、package.jsonのみcontent conflict。main #223/#226/#227とPR #199の意図を両方残す。

## 2026-11-22 follow-up: residual contract test validation

- User-authorized follow-up scope: investigate and resolve the six PowerShell contract-test failures and one Tutor 30-second timeout reported after merge commit `46f63fac467374bd29c18a4fa1623ce78458fc6a`, then run the requested hooks/contracts/verify/build checks.
- Keep the existing merge commit and its parents. Do not re-merge, rewrite history, push, or modify product SUT/spec/seed/reset files.
- Allowed repair scope is limited to the Tutor input validator, its related contract test, and (only if needed to ensure Windows-native coverage) the CI job for the PowerShell contract test. Preserve all rejection and privacy rules; do not skip tests without verified Windows-native execution.
- Use the existing Linux temporary validation worktree for Linux checks and a Windows-local copy of this exact merge commit for native PowerShell tests. If a toolchain or environment prevents a check, record the concrete failure and the remaining assurance gap.
- Completion requires the Tutor failure to pass at the standard 30-second timeout, all requested local checks/builds to have explicit results, Windows-native test status to be known or clearly blocked, the protected-file boundary to remain clean, and a local commit only if a repair was needed. Remote push remains unapproved.
