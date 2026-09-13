# ADR-0023: Codex文章品質Hookと変更差分gate

- Status: Accepted
- Date: 2026-09-13
- Issue: #134
- Plan: `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`

## Context

Codexのsession中にMarkdownの文章品質を確認し、完了前とRepository品質ゲートの両方で新規違反を検出する必要がある。開始時点ですでに存在する違反を新規違反として扱わず、worktreeだけの移動やGitが確定したrenameも同じfile identityとして比較する必要がある。

Issue #135は2026-09-13時点で未完了であるため、compact後のroot `AGENTS.md`再注入はこの変更の責務に含めない。

## Decision

1. `scripts/lint-text-quality.mjs`はMarkdown本文だけをscanする純粋な決定論的scannerとし、ruleの正本を`.codex/text-quality-rules.json`へ置く。Markdown構造は既存`markdownlint`へ任せる。具体的な根拠が確定していないため、production ruleは`not-configured`かつ空配列で開始する。
2. `UserPromptSubmit`では開始`HEAD`、repository root識別hash、開始時にHEADと異なるMarkdownのworktree manifestだけを保存する。cleanなtracked Markdownの本文は保存せず、必要時に開始HEADのblobから読み取る。本文、prompt、raw match、Hook payload、credentialは保存しない。
3. 違反identityは`rule_id`とrule定義に従った正規化済みmatchのSHA-256であり、件数をmultisetとして比較する。file identityはGit rename mapping、exact content SHA-256の一意一致、対応付け不能の順で解決し、similarityやfilename推測は行わない。
4. `PostToolUse`のquality failureはfail-openしてstderrへ診断し、`Stop`は`stop_hook_active=false`なら新規違反またはquality check不能をstructured blockとする。`true`なら診断付きallowとstate削除を行う。Repository-level gateの比較不能はfail-openせず非0終了とする。
5. commit比較では`git merge-base <base-ref> HEAD`で確定した同じcomparison treeを、変更path、baseline本文、current本文、rename mappingのすべてへ使う。localは`HEAD -> current worktree`、PRはbase branchとcheckout済みmerge `HEAD`、pushはevent before、schedule／dispatchは`HEAD^`を使う。

## Consequences

- 既存logging Hookと文章品質Hookは別commandとして共存し、`PreToolUse/Bash`のmatcherや`--strict-harness`の責務は変更しない。
- rule値が確定するまでは、scanner、Hook契約、baseline、Git比較、CI経路は成立するが、productionの意味的な文章違反をblockするruleは存在しない。この状態をPRとRun Artifactへ明示する。
- comparison不能を空baselineへ落とさないため、削除と追加を安全に区別できない変更はRepository gateでは失敗し、HookではPlanのfail-open／fail-close境界に従う。
