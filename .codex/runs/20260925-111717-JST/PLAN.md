# Run Plan

- Run ID: 20260925-111717-JST
- Task type: harness-improvement
- Workflow level: strict
- Branch: plan/codex-autonomous-workspace
- Base: main@c42082ba62cbca87f675b336d06885719d21b50e

## 目的

通常interactiveをdirect `codex`へ変更し、project defaultをworkspace-write / approval never / network trueへ揃える。

Run Artifactは新しいdirect用manifest modelを追加せず、通常のlightweight / standardとstrictを分離する。

正本Plan:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md

## 確定方針

- direct `codex`: workspace-write / approval never / network true
- 通常lightweight / standard interactiveはdirect `codex`を使い、Run初期化時は`--no-run-manifest`でPLAN / TASKS / REPORTだけを管理する。
- strict / machine-managed evidenceが必要なRunは既存`codex-safe -RunId` / `codex-task --record-run-manifest`経路を維持する。
- 今回のactive Runはstrict。L3承認後、source変更前に既存machine-managed writerで同じRun IDへrun.json / evaluation template / scopeを補完する。
- fresh direct `codex`はproject defaultのexternal runtime validationとして別途実行し、その結果をREPORT / evaluationへ記録する。direct session用run.jsonは作らない。
- `run.json.safety.network` はmachine-managed execution pathのnetwork利用を表し、external direct validationまで集約する値とは扱わない。consumer確認は`docs/reference/run-artifacts.md`、Bash / PowerShell両`codex-task`、collectorを対象にする。
- `codex-project.toml`はnetwork trueとdirect workspace-writeのapply_patch契約へ同期する。standard manifestはrecommendedを維持し、direct standardだけ`--no-run-manifest`を明示例外として使う。
- `.codex/requirements.toml`はactual consumer / managed distributionで実効性を確認できた場合だけ変更する。
- `git switch`だけをbroad prompt ruleから外す。
- `git checkout / merge / rebase / tag`はprompt維持する。
- `git branch -d / --delete`はpromptとし、複合short option / option順序違いも検証する。`git branch -D / -f`とremote branch deleteは既存denyを維持する。
- merge / rebase recoveryとlocal branch deleteはlocal例外操作として扱い、`codex-safe safe`のon-request approval成立だけを条件にする。network昇格は条件にしない。
- 明示依頼された高影響network operationで`codex-safe safe`を使うのは、safe wrapperのapproval + network昇格runtime検証が成功した場合だけとする。失敗時はnetwork例外操作だけをblockerとし、新presetを追加しない。
- generic `gh api` と高影響GitHub CLI operationをpromptに置き、direct neverでは拒否する。ただしこのruleはdefense-in-depthであり、credentialを持つ任意code pathのhard boundaryとは扱わない。通常のPR create / edit / checksはblanket blockしない。
- auto-netはcommon risky prompt ruleを読み込まないため、local branch deleteとgeneric `gh api` / 高影響GitHub CLI operationを`.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`でforbiddenへ同期する。read-only branch inspectionは維持する。
- `.codex/rules/README.md`をdirect never / prompt semanticsとauto-net専用forbiddenへ同期する。
- auto-net preset自体は削除しない。
- rm / git rm等の既存denyを変更しない。
- workspace-write subagentへnetwork falseを新設しない。既存role contractに禁止根拠がある場合だけ個別overrideする。
- AGENTS.mdとcompact再注入Hookを変更しない。
- PR #182はこのbranchの通常interactive契約確定後に最新mainへ同期し、interactive E2Eをdirect `codex`基準へ修正する。
- mergeは明示指示があるまで行わない。

## strict Artifactの現在状態

`run.json` / `evaluation.json` は未作成。

次のgateはL3実装承認。その直後、source変更前に既存machine-managed経路で補完する。
