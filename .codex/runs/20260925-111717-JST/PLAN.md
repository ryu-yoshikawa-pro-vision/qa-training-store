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
- `run.json.safety.network` はmachine-managed execution pathのnetwork利用を表し、external direct validationまで集約する値とは扱わない。
- `codex-project.toml`はnetwork trueだけでなく、direct workspace-writeのapply_patch契約とstandard manifest optionalへ同期する。
- `.codex/requirements.toml`はactual consumer / managed distributionで実効性を確認できた場合だけ変更する。
- `git switch`だけをbroad prompt ruleから外す。
- `git checkout / merge / rebase / tag`はprompt維持する。merge / rebase recoveryが必要ならsafe wrapperのon-request経路を使う。
- generic `gh api` と高影響GitHub CLI operationをpromptに置き、direct neverでは拒否する。通常のPR create / edit / checksはblanket blockしない。
- auto-net presetは削除しない。
- rm / git rm等の既存denyを変更しない。
- workspace-write subagentへnetwork falseを新設しない。既存role contractに禁止根拠がある場合だけ個別overrideする。
- AGENTS.mdとcompact再注入Hookを変更しない。
- PR #182はこのbranchの通常interactive契約確定後に最新mainへ同期し、interactive E2Eをdirect `codex`基準へ修正する。
- mergeは明示指示があるまで行わない。

## strict Artifactの現在状態

`run.json` / `evaluation.json` は未作成。

次のgateはL3実装承認。その直後、source変更前に既存machine-managed経路で補完する。
