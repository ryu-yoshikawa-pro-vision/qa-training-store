# ADR-0026: Codex文章品質Hookと変更差分gate

- Status: Accepted
- Date: 2026-09-13
- Issue: #134
- Plan: `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`

## Context

Codexのsession中にMarkdownの文章品質を確認し、完了前とRepository品質ゲートの両方で新規違反を検出する必要がある。開始時ですでに存在する違反を新規違反として扱わず、worktreeだけの移動やGitが確定したrenameも同じfile identityとして比較する必要がある。

ADR作成時点の2026-09-13にはIssue #135が未完了だったため、compact後のroot `AGENTS.md`再注入はこの変更の責務に含めないと判断した。その後#135が完了してmainへ取り込まれ、Planの条件を満たしたため、`SessionStart(source=compact)`による再注入を追加した。現在の再注入内容の正本はroot `AGENTS.md`全文である。

## Decision

1. `scripts/lint-text-quality.mjs`はMarkdown本文だけをscanする決定論的scannerとし、Repository固有のliteral／regex ruleは`.codex/text-quality-rules.json`、一般日本語production ruleは`.textlintrc.json`の5個のtextlint個別ruleを正本とする。`no-unmatched-pair`は技術文書のinline code等を誤検知するため採用しない。Markdown構造は既存`markdownlint`へ任せ、preset、AI Judge、broad dictionary、独自の形態素解析・文法parserは追加しない。custom rule fileの`not-configured`はcustom rule未設定を意味する。
2. `UserPromptSubmit`では開始`HEAD`、repository root識別hash、開始時にHEADと異なるMarkdownのworktree manifestだけを保存する。cleanなtracked Markdownの本文は保存せず、必要時に開始HEADのblobから読み取る。本文、prompt、raw match、Hook payload、credentialは保存しない。
3. 違反identityは`rule_id`とrule定義に従った正規化済みmatchのSHA-256であり、件数をmultisetとして比較する。file identityはGit rename mapping、exact content SHA-256の一意一致、対応付け不能の順で解決し、similarityやfilename推測は行わない。
4. `PostToolUse`のquality failureはfail-openしてstderrへ診断し、`Stop`は`stop_hook_active=false`なら新規違反またはquality check不能をstructured blockとする。`true`なら診断付きallowとstate削除を行う。Repository-level gateの比較不能はfail-openせず非0終了とする。
5. commit比較では`git merge-base <base-ref> HEAD`で確定した同じcomparison treeを、変更path、baseline本文、current本文、rename mappingのすべてへ使う。localは`HEAD -> current worktree`、PRはbase branchとcheckout済みmerge `HEAD`、pushはevent before、schedule／dispatchは`HEAD^`を使う。
6. session baseline stateはschema v2の`ready`／`baseline_unavailable`を持つ。baseline作成後のstateには開始時に特別な状態を持つpathだけを保存し、作成不能時はprompt、payload、本文、長いエラーを含まない最小stateを一度だけ保存する。同一sessionの後続`UserPromptSubmit`では再作成せず、`PostToolUse`はfail-open、inactive `Stop`はblock、active `Stop`はallowしてstateを削除する。Stopを含むstate読込ではroot／session identityを照合する。

## Consequences

- 既存logging Hookと文章品質Hookは別commandとして共存し、`PreToolUse/Bash`のmatcherや`--strict-harness`の責務は変更しない。
- 一般日本語の明確な入力不正・誤記を検出する5個のtextlint ruleはproduction block対象であり、`no-unmatched-pair`は技術文書のinline code等の誤検知を理由に対象外とした。Repository固有custom literal／regex ruleは未設定である。主観的な自然さ、禁止語、表記辞書、AIによる意味評価はblock対象にしない。
- comparison不能を空baselineへ落とさないため、削除と追加を安全に区別できない変更はRepository gateでは失敗し、HookではPlanのfail-open／fail-close境界に従う。
