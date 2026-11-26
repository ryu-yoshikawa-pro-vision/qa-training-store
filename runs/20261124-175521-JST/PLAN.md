# Plan（計画）

## Objective（目的）

- G10拒否診断、Codex sandboxとの切り分け、Git CLI復旧手順、迂回防止とCodex/OpenCode回帰を整備する。既存Issue #192を再利用し、OPENの既存PR #230を同じbranchで継続する。新規の同目的PRは作成しない。

## Scope（対象範囲）

- In: 共通G10 Hook、既存hook診断、AGENTS.md、Git safety / Codex safety reference、OpenCode共通adapter契約、関連Plan/Run記録、Issue #192／PR #230本文、隔離Git CLI fixture、既存品質ゲート。
- Out: PR #199/#229、product、承認済み`on-request`以外のsandbox/approval設定変更、GitHub API経由のcommit/ref更新、merge/close/force push。

## Assumptions（仮定）

- G10の拒否IDと既存安全境界を維持し、必要なreason文と診断表示を改善する。shell scriptや任意のshell状態を完全解析するparserは作らず、直接識別できるGit invocationが既存のroot/branch/ref判定へ到達する具体的な誤許可だけを修正する。
- ユーザー承認に基づき`.codex/config.toml`の`approval_policy`だけを`never`から`on-request`へ変更した。`workspace-write`、network、`writable_roots`、Hooksは維持。Codex公式仕様上、workspace-writeでも`.git`等は保護されるため、通常のGit metadata書込みはruntimeで別途確認する。
- Codex 0.172.0。OpenCode v2.3.0は一時XDG data dirで起動し、server logでPlugin entrypointのロードを確認したが、tool invocationは未確認。契約テストと実runtime確認を区別する。
- 同目的のOPEN Issue #192を参照する。PR #227はmerge済みで今回の変更先ではない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 現在の承認範囲を越えるsandbox / approval変更が必要と判明した場合は、具体的な差分とrollbackを示して承認を得る。
- 仮定してよい細部: managed executorの承認付き単発実行は設定変更でなく、許可済みGit CLI経路の候補として検証する。
- 未回答の重要質問: 現時点ではなし。Linux/WSLのCodex Hook trustが「レビュー待ち」の間は実PreToolUse発火を確認済みとせず、信頼確認が終わらない場合は他の検証を続けて未確認として報告する。OpenCode provider/auth制約が継続する場合も、同じ試行を反復せず契約fixtureと未確認範囲を記録する。

## Hypotheses（仮説）

- H1: 事象はG10による正規root未確認の実行前拒否と、workspace-writeが保護する`.git`/`.codex` metadataへのsandbox拒否が異なる層で起きた。
- H2: managed executorの承認付きsandbox実行は、G10 anchorを維持した通常Git CLI操作に利用できる。通常commit/pushまで別途検証する。

## Research Plan（調査計画）

- Round 1 Query: local/mainとGitHub状態、Issue #192、G10/診断/テスト、OpenCode設定、Codex/OpenCode公式権限仕様を読む。
- Round 2 Query: baseline tests、実装後decision comparison、隔離Git CLIのadd/commit/bare push、CIと独立reviewを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- 決定論的なG10安全判定を維持し、reason表示のみ分類する。診断はread-onlyでruntime未知情報を`未確認`と表示する。
- Git safety referenceを復旧手順の正本にし、他文書は短い参照に留める。
- 確認後、明示ファイルstage、literal-root anchor、通常のGit CLI、single refspec pushを使う。API経由のcommit/ref更新は禁止。
- 標準フロー: `PLAN -> baseline -> TASKS -> 実装 -> REPORT -> review/validation -> commit/push/PR/CI`

## Definition of Done（完了条件）

- G10 decision ID/allow-deny結果維持、diagnostics/read-only、recovery docs一致、OpenCode契約維持、isolated CLI tests成功、CI成功、独立review完了。
- PR #230の既存headへ通常Git CLIでcommit/pushし、最終headの必須CIを確認する。PR #230とIssue #192はOPENのまま保ち、merge/closeしない。PR #199/#229に変更がない。

## Risks / Unknowns（リスク・未知点）

- root/errorの診断改善で判定を緩和しない。診断文字列にraw command/path/remote/credentialを出さない。
- `on-request`が`.git`書込みを許可するとは仮定しない。現在の実行経路で拒否された場合は拒否レイヤーを特定し、正規CLIの承認経路で成功が確認できるまでGit復旧を完了扱いにしない。
- 実Codex/OpenCodeはLinux/WSL2 runtimeを通常対象とする。Windows Nativeの対話runtime検証は対象外で、未実施を残件・BLOCKED・`missing_validation`にしない。Windows固有Hook/PowerShell経路と契約は既存Windows CIで確認する。Linux/WSLのHook trustやOpenCode live mutationなど、通常対象のruntimeで未確認の項目は個別に報告する。

## Thinking Log（判断記録）

- 2026-11-24: Issue #192がOPEN。GitHub main=`b8beb9f...`。branchは通常Git CLIでmainから作成。
- 2026-11-24: Codex official specではworkspace-write内の`.git`/`.codex`はprotected read-only。ユーザー承認を受け、project `approval_policy`を`on-request`へ変更。これは承認経路の有効化であり、protected `.git`書込み権限の証明ではない。
- 2026-11-24: managed executor経由のG10 root-anchored `git switch -c`が成功。これはcommit/pushの実行確認ではない。

## Historical follow-up proposal（2026-11-25、2026-11-26に一部撤回）

以下は当時の提案・観測を保持する履歴である。現在の受入対象は2026-11-26のユーザー決定に従い、相反するdigest／PATH固定案は撤回する。

- PR #230は既存branch/PRのまま継続する。開始HEADは`f40ad5ed48c8e590bd6b567001c1ce46da456ab0`; latest Web/Mobile CI at that HEAD succeeded. PR #199/#229、main、製品SUTは変更しない。
- 当時は標準POSIX entrypointにcanonical root/file/content/argument契約を付ける限定例外を提案したが、これは撤回済み。script名allowlist、digest登録、PATH固定、専用launcherは導入しない。標準script起動をopaqueという理由だけでG10拒否しない修正は、script内部までHookが検査・承認した証明ではない。
- AGENTS.mdは今回の対象に含める。Linux/WSLを通常AI-agent runtimeとし、Windows Native agent runtimeを通常受入・残件・`missing_validation`から除外する。Windows launcher、PowerShell code、Windows Hook CIは維持。Git mutationのAPI/MCP等による迂回禁止を短く記載し、詳細はGit safety referenceを正本とする。
- OpenCode v2.3.0の実runtimeで、独立した一時Git fixtureとlocal bare remoteを使い、Plugin/guarded toolsとadd/commit/pushを確認する。実製品branchやGitHub remoteは使わない。
- Issue #192をOPENのまま本文更新し、古い`payload.cwd`説明は起票時の歴史として明示したうえで、現行Hookがそれを信頼しないことと今回の結果を記す。
- 既存Runを継続し、`REPORT.md`はappend-only、`run.json`はcollectorのみで更新する。strict評価は実OpenCode結果と回帰検証後に再計算し、Windows Native未実施をfailure categoryにしない。
- Windows Nativeの実機確認は対象外。WSL2/LinuxのCodex/OpenCode、Windows Hook CI、関連するWSLからのWindows filesystem worktree契約は区別して記録する。

## Current decision（2026-11-26）

- G10は直接識別できるGit invocationのcheckout root、branch/ref、push先、Git option/environment、実行条件を判定する。任意shellやscript内部の完全解析は保証しない。
- main、PR HEAD、worktreeでprotected-ref pushが`for PATH ...; do git push ...:main; done`から漏れ、`.codex/rules/*.rules`を指定したexecpolicy checkも`matchedRules: []`だったため、この直接Git呼出しを既存G10へ接続した。追加reviewで見つかったcase armのdirect Git呼出しも通常判定へ接続し、push先remoteごとに`refs/remotes/<remote>/HEAD`のdefault branchを保護し、未解決remote contextはfail-closedとする。回帰test追加後のfocused suite・独立reviewは現在実行中。汎用shell parserやPATH値追跡は追加しない。
- OpenCodeは共通判定と固定checkout rootを維持し、Hookと実行で同じPATH-resolved `git`を使う。固定Git候補一覧、PATH全体固定は行わない。
- Windows Native実機検証は対象外。Windows互換コード・PowerShell経路・Windows Hook CIを維持する。
- OpenCode runtimeが既定log pathの`EROFS`またはprovider認証で起動不能なら、実OpenCode mutationだけを未確認として記録し、残りの検証とPR受入準備を続ける。

## 2026-11-26 最終レビュー指摘4件への限定修正

- 適用範囲: ChatGPTが指定したbranch list/mutation分類、remote context解決、worktree prune dry-run分類、契約テスト入力の4件だけを修正する。独立reviewで再現された`git branch --points-at <ref>`のoption-value誤分類も、同じbranch-list範囲で修正した。G10設計の再選定や追加parserは行わない。
- 修正: branchのread-only判定とcreation判定が同じ`getBranchMutation()`情報を使う。remote一覧取得失敗と成功0件を区別し、remoteなしのlocal mutationはfallback保護ref/current branchで評価する。pushは対象remoteのdefault branchを確認する。worktree prune dry-run判定を共用する。テストhelperは期待結果によって入力commandを変更せず、必要なanchorは各mutation testcaseに明示する。
- 独立review: `--points-at`をbranch名として誤読するP3を指摘され、option-value解析とanchorなしlist regressionを追加。reviewerは修正後を再確認し、追加must-fixなしとした。
- 最新ローカルHook suite: 173件中172件成功、1件は個別testの既定5秒timeout（worker起動失敗ではない）。同一suiteを再実行せず、関連契約をGitHub Actionsで確認する。`--points-at`を含むfocused testは1件PASS。以前の173/173は別実行時点の結果として履歴に保持し、今回の最新結果を置き換えない。
- OpenCode live mutationはprovider quota HTTP 402により未確認。再試行しない。Windows Native runtime検証は対象外とし、Windows CI/互換性は維持する。
- 次: Hook import/payload smoke、独立contract/diagnostics/manifest suites、Run collector/sanitizer/security scan、Issue/PR metadata更新、正規Git CLI commit/push、最終HEAD CI。PR/IssueはOPENのまま、merge/closeしない。
