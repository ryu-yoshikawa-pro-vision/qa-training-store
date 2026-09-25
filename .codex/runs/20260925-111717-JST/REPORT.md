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

## 2026-09-25 - 再レビュー4回目の修正

### 状態

- 実装は未開始。
- Workflow Levelはstrictを維持する。
- 次のgateはL3実装承認で変更しない。

### 今回反映した修正

- project networkをtrueへ変更した後もGitHub上の高影響操作を無承認で実行しないよう、generic `gh api`、PR merge / close、Issue close、Release create / delete、Repository deleteをcommon execpolicyのprompt対象へ追加する方針にした。
- direct `never`では上記operationを拒否し、ユーザーが明示的に依頼した場合だけ`codex-safe safe`の`on-request`経路を使う。通常作業の自動fallbackにはしない。
- `codex-project.toml`はnetwork metadataだけでなく、direct workspace-writeを含む`apply_patch_*`契約とstandard `run_manifest=optional`へ同期する。
- `git checkout / merge / rebase / tag`はpromptを維持する。merge / rebase recoveryもdirect `never`では迂回せず、必要時だけsafe wrapperのapproval経路を使う。
- strict Runの`run.json.safety.network`はmachine-managed execution pathの観測値とし、別途実施するfresh direct `codex`のexternal runtime validationまで集約した値とは扱わない。
- fresh direct network E2Eはgeneric `gh api`ではなくread-onlyな`git ls-remote`等で行う。
- 新しいHook parser、direct用manifest schema、writer、presetは追加しない。

### 次のgate

L3実装承認後、strict Run Artifactをmachine-managedに補完してからsource変更へ進む。

Progress: 14% (3/21)


## 2026-09-25 - 再レビュー5回目の修正

### 状態

- 実装は未開始。
- Workflow Levelはstrictを維持する。
- 次のgateはL3実装承認で変更しない。

### 今回反映した修正

- local branch削除の抜けを補い、`git branch -d / --delete`をcommon execpolicyのprompt対象へ追加する方針にした。`git branch -D / -f`とremote branch deleteの既存denyは維持する。
- 明示依頼された高影響network operationやGit recoveryで`codex-safe safe`を使う前に、on-request承認とnetwork sandbox昇格を組み合わせたread-only runtime検証を必須にした。成立しない場合はblockerとし、新presetやbypassを追加しない。
- GitHub CLIのprompt ruleは通常CLI経路のdefense-in-depthと位置づけ、networkとcredentialを持つ任意code pathからのGitHub writeを完全遮断するhard boundaryとは扱わないことを明示した。
- `codex-project.toml`の`standard.run_manifest`は`recommended`を維持する。direct standardだけ、現行manifestがdirect sessionを正確に表せないため`--no-run-manifest`を明示例外として使用する。
- direct用manifest schema、credential broker、新しい承認presetは今回追加しない。

### 次のgate

L3実装承認後、strict Run Artifactをmachine-managedに補完してからsource変更へ進む。

Progress: 13% (3/23)
