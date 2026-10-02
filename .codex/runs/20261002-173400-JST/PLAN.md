# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Free model + Codex CLI の開発環境を実装・検証する。
- 同じ branch / PR で `.devcontainer`、README、plain Codespace検証、Full Rebuild、Fresh Create、Repository検証、CI確認まで完了する。

## 対象範囲

- In:
  - latest main / Repository契約 / current公式仕様の再確認。
  - Personal Codespaces Secret / dotfiles境界の確認。
  - plain CodespaceでOpenCode / Codexの事前疎通。
  - OpenCode Free-onlyのfail-closed確認。
  - OpenCode Zen認証方式の確定。
  - Codex device-code authenticationとexisting Repository integration確認。
  - Phase B→C checkpointで実測値をcanonical Planへ固定。
  - `.devcontainer/devcontainer.json` 実装。
  - README更新。
  - Full Rebuild + dotfilesなしFresh Create。
  - `pnpm run verify` / latest head CI。
- Out:
  - Native toolchainのCodespaces移行。
  - OpenCode / Codex modelの性能比較。
  - 目的達成に不要なharness再設計。
  - merge。

## 確定前提

- `qa-training-store` はpublic Repositoryで、OpenCode Free modelによるRepository内容の学習利用を許容する。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に含めない。
- OpenCodeはstable channelだけを使い、selected Free model以外のLLM requestを許容しない。
- Free-only設定はREADMEの手動操作に依存させずdevcontainerの既定runtimeへ反映する。
- canonical Fresh CreateではPersonal dotfilesを無効化する。
- Codexはremote環境でdevice-code authenticationを通常経路とし、API key / access token / WIF / auth cache copyへfallbackしない。
- CodexはHooksだけでなく`ci_wait` MCPを含む既存`.codex/config.toml`の契約を検証する。
- 今回のゴール達成に必須と実測で判明した最小変更は、canonical Plan更新後に同じPRで対応する。
- forward対象は8081のみ。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- plain Codespace → Phase B→C確定 → devcontainer実装 → Full Rebuild → dotfilesなしFresh Create → Repository検証の順で進める。
- Phase Bで成功したexact command / version / model /認証 / install pathをPlanへ固定するまで実装へ進まない。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- PR #188 latest headの必須CIが成功する。
- mergeは行わない。

## リスク

- Free model availability、CLI stable version、Dev Container image tagは実装時に変動し得る。
- global / dotfiles / agent / command configがOpenCode Free-onlyを破る可能性があるため、resolved configとusage evidenceの両方を確認する。
- Codespace Rebuildだけではcache / home state依存を排除できないため、dotfilesなしFresh Createまで必須。
- Codexの認証環境変数やproject / Hook trust / MCP startupにより、CLI単体疎通とRepository実利用が異なる可能性がある。

## 判断記録

- 以前のPlan-only scopeは、ユーザー指示によりPR #188で実装まで行うscopeへ拡張した。
- OpenCode Free-onlyは`model` / `small_model`だけでなくprovider、agent / command override、usage evidenceまで確認する。
- Personal dotfilesをcanonical Fresh Createから除外する。
- CodespacesのCodex認証は`codex login --device-auth`を正規経路にする。
- ファイル分割は行わない。検証順と停止条件を単一のcanonical Planで追う方が重複が少ない。
