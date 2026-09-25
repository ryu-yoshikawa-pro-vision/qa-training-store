# Run Plan

- Run ID: 20260925-111717-JST
- Task type: harness-improvement
- Workflow level: strict
- Branch: plan/codex-autonomous-workspace
- Base: main@c42082ba62cbca87f675b336d06885719d21b50e

## 目的

このbranchでdirect `codex`を通常interactive入口へ変更し、project defaultをworkspace-write / approval never / network trueへ揃える。

同時に、既存の安全境界、wrapper preset、Run Artifact、Repository metadata、subagent責務を矛盾なく維持する。

正本Plan:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md

## 確定方針

- direct `codex`: workspace-write / approval never / network true
- Workflow Levelはstrict。Artifact不足を理由にstandardへ降格しない。
- actual `run.json`は手書きしない。L3承認後、source変更前に既存machine-managed writerで同じRun IDへ補完する。
- active Runがあるinteractive taskでもdirect `codex`を正規入口として認めるようRun Artifact contractを更新する。
- `codex-safe -RunId`はactive Run紐付けの必須入口から、wrapper固有機能が必要な場合の補助経路へ変更する。
- `.codex/requirements.toml`と`codex-project.toml`をproject configと同期する。
- 通常の`git checkout / switch`をbroad prompt ruleから外す。`merge / rebase / tag`はprompt維持。
- auto-net presetは削除しない。
- rm / git rm等の既存denyを変更しない。
- workspace-write subagentへnetwork falseを新設しない。既存role contractに禁止根拠がある場合だけ個別overrideする。
- Issue #135 / PR #147で整理済みのAGENTS.mdを再設計しない。
- compact時のAGENTS.md再注入Hookを変更しない。
- PROJECT_CONTEXT更新時はhistory snapshotを追加する。
- mergeは明示指示があるまで行わない。

## strict Artifactの現在状態

`run.json` / `evaluation.json` は未作成。

これは既知のblockerであり、L3承認後の最初の工程で既存`codex-task`の`--record-run-manifest` / `--evaluation-template` / scope optionを使ってmachine-managedに補完する。

補完完了前にsource変更へ進まない。
