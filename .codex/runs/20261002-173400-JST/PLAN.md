# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode + Codex CLI の開発環境を実装・検証する。
- 同じ branch / PR で plain Codespace検証、`.devcontainer`、README、candidate SHA、Full Rebuild、Fresh Create、Repository検証、CI確認まで完了する。

## 対象範囲

- In:
  - latest main / Repository契約 / current公式仕様の再確認。
  - Personal Codespaces Secret / dotfiles境界の確認。
  - dotfilesなしplain CodespaceでOpenCode / Codexの事前疎通。
  - OpenCode stable exact install、Zen認証、read-only / development smoke。
  - Codex device-code authentication、Hook contract / trust / runtime、bounded subagent、`ci_wait`。
  - Phase B→C checkpointで実測値をcanonical Planへ固定。
  - workspace root・逐次・fail-fastの `.devcontainer/devcontainer.json` / README実装。
  - candidate commit / pushとbranch freeze。
  - 同じcandidate SHAでclean precondition付きFull Rebuild + dotfilesなしFresh Create。
  - final headとの差分確認、`pnpm run verify`、Repository既存契約による必須CI確認。
- Out:
  - OpenCodeのFree / paid制御、model固定、model価格判定、model usage監査。
  - Native toolchainのCodespaces移行。
  - OpenCode / Codex modelの性能比較。
  - 目的達成に不要なharness再設計。
  - merge。

## 確定前提

- `qa-training-store` はpublic Repositoryで、OpenCodeへRepository内容を送信することを許容する。
- OpenCodeのmodelはユーザーが選択する。Free / paid、model ID、provider内modelをRepository / devcontainer / harnessで制限しない。
- OpenCodeのsmokeでは必要なfile / shell / tool能力を持つmodelを使う。model自体の能力不足はCodespaces環境failureにしない。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に含めない。
- OpenCodeはstable exact versionとFresh Createで再現可能なZen認証だけを環境契約にする。
- Phase Bとcanonical Fresh Createの両方でPersonal dotfilesを無効化する。
- Codexはremote環境でdevice-code authenticationを通常経路とし、API key / access token / WIF / auth cache copyへfallbackしない。
- Codexは`test:hooks`、same-session Hook runtime、bounded subagent、`ci_wait`まで既存契約を検証する。
- candidate SHA確定後からFull Rebuild / Fresh Create完了までbranchへpushしない。
- Full Rebuild直前にcandidate SHA、clean worktree / index、環境影響差分0、対象Codespace名を確認する。
- Full Rebuild / Fresh Createは同じcandidate SHAを検証する。
- 必須CIは`docs/reference/codex-implementation-harness.md` / `ci_wait` contractを正本とする。current contractはexact HEADの `Web CI` / `Mobile App CI`。
- forward対象は8081のみ。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- dotfilesなしplain Codespace → Phase B→C確定 → devcontainer / README実装 → candidate前Repository検証 → candidate commit / push → branch freeze → candidate SHA Full Rebuild → 同SHA Fresh Create → 最終記録 / push → exact final HEAD CIの順で進める。
- Phase Bで成功したexact command / version /認証 / install pathをPlanへ固定するまで実装へ進まない。
- OpenCodeのmodel選択はcheckpointへ固定しない。
- Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。
- final push後は`wait_for_required_ci`を1回だけ使用し、Agent自身でCI pollingしない。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- final headとcandidate SHAの差分にFresh Createを無効化する環境影響ファイルがない。
- exact final HEADで`Web CI` / `Mobile App CI` がともにsuccessし、PR本文へ結果を記録する。
- CI結果記録だけを理由にRun Artifactを再commitしない。
- mergeは行わない。

## リスク

- CLI stable version、Dev Container image tagは実装時に変動し得る。
- OpenCodeの認証方法がinteractive stable CLIと既存Security fallbackで異なる可能性があるため、auth cacheなしで実測する。
- Full Rebuildは`/workspaces`を保持するため、container / lifecycle setup / CLI installの再現性を確認し、workspaceを含むclean-state再現性はFresh Createで確認する。
- CodexのHook trustと実Runtime発火は別証拠として確認する。

## 判断記録

- OpenCodeのmodel選択はユーザー責任。Free-only guard、negative control、pricing / usage evidence、model固定は今回の要件にしない。
- OpenCode smokeに必要なmodel能力だけをpreconditionとし、能力不足を環境failureにしない。
- Personal dotfilesをPhase B / Fresh Createから除外する。
- CodespacesのCodex認証は`codex login --device-auth`を正規経路にする。
- Fresh Create前にcandidate SHAを通常pushし、検証完了までbranchをfreezeする。
- Full Rebuildは対象Codespaceを明示し、candidate SHA / clean worktreeのprecondition後に`gh codespace rebuild --full -c <codespace-name>`で実行する。
- `postCreateCommand` はworkspace rootで逐次・fail-fastとする。
- 必須CIはbranch protectionから再構築せずRepository既存contractを正本にする。
- 「同等環境」はbit-for-bit一致ではなくPlan記載のRepository開発契約一致を意味する。
- ファイル分割は行わない。検証順と停止条件を単一のcanonical Planで追う方が重複が少ない。
