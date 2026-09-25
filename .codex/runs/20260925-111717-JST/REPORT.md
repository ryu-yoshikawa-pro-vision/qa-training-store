# REPORT

## 2026-09-25 - 再レビュー3回目の修正

### 状態

- branch: plan/codex-autonomous-workspace
- 実装は未開始。
- Workflow Levelはstrictを維持する。
- strict必須のrun.json / evaluation.jsonは未作成。L3承認後・source変更前に既存machine-managed writerで同じRun IDへ補完する。

### 今回反映した修正

- direct `codex`と現行run.jsonのpreset / safety.network不整合を解消するため、通常lightweight / standardとstrictを分離した。
- 通常lightweight / standard interactiveはdirect `codex`とし、Run初期化では`--no-run-manifest`を使ってPLAN / TASKS / REPORTだけを管理する。
- strict / machine-managed evidenceが必要なRunは既存`codex-safe -RunId` / `codex-task --record-run-manifest`経路を維持する。
- direct session用の新しいmanifest schema、writer、presetは追加しない。
- `git checkout`はworking tree復元にも使えるためpromptを維持し、branch操作専用の`git switch`だけをbroad promptから外す方針へ変更した。
- `.codex/requirements.toml`をruntime-criticalなproject instructionとして扱う前提を撤回した。actual consumer / managed distributionで実効性が確認できた場合だけ変更する。
- `codex-project.toml`のnetwork metadataはproject configと同期する。
- PR #182は今回の通常interactive契約確定後に最新mainへ同期し、interactive MCP E2Eをdirect `codex`基準へ修正する順序を明示した。
- auto-net、rm deny、AGENTS.md、compact Hook、既存Run manifest schemaは維持する。

### 次のgate

L3実装承認後、最初にstrict Run Artifactをmachine-managedに補完する。補完前にsource変更へ進まない。

Progress: 15% (3/20)
