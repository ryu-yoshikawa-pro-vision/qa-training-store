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
  - `.devcontainer/devcontainer.json` / README実装。
  - candidate commit / pushとSHA固定。
  - 同じcandidate SHAでFull Rebuild + dotfilesなしFresh Create。
  - final headとの差分確認、`pnpm run verify`、必須CI。
- Out:
  - OpenCodeのFree / paid制御、model固定、model価格判定、model usage監査。
  - Native toolchainのCodespaces移行。
  - OpenCode / Codex modelの性能比較。
  - 目的達成に不要なharness再設計。
  - merge。

## 確定前提

- `qa-training-store` はpublic Repositoryで、OpenCodeへRepository内容を送信することを許容する。
- OpenCodeのmodelはユーザーが選択する。Free / paid、model ID、provider内modelをRepository / devcontainer / harnessで制限しない。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に含めない。
- OpenCodeはstable exact versionとFresh Createで再現可能なZen認証だけを環境契約にする。
- Phase Bとcanonical Fresh Createの両方でPersonal dotfilesを無効化する。
- Codexはremote環境でdevice-code authenticationを通常経路とし、API key / access token / WIF / auth cache copyへfallbackしない。
- Codexは`test:hooks`、same-session Hook runtime、bounded subagent、`ci_wait`まで既存契約を検証する。
- Full Rebuild / Fresh Create前に環境影響差分をcandidate commitへ含めて通常pushし、両方を同じcandidate SHAで検証する。
- forward対象は8081のみ。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- dotfilesなしplain Codespace → Phase B→C確定 → devcontainer / README実装 → candidate前Repository検証 → candidate commit / push → candidate SHA Full Rebuild → 同SHA Fresh Create → 最終記録 / CIの順で進める。
- Phase Bで成功したexact command / version /認証 / install pathをPlanへ固定するまで実装へ進まない。
- OpenCodeのmodel選択はcheckpointへ固定しない。
- Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- final headとcandidate SHAの差分にFresh Createを無効化する環境影響ファイルがない。
- PR #188 latest headの必須CIが成功する。
- mergeは行わない。

## リスク

- CLI stable version、Dev Container image tagは実装時に変動し得る。
- OpenCodeの認証方法がinteractive stable CLIと既存Security fallbackで異なる可能性があるため、auth cacheなしで実測する。
- Codespace Rebuildだけではcache / home state依存を排除できないため、同candidate SHAのFull Rebuild / Fresh Createを両方必須にする。
- CodexのHook trustと実Runtime発火は別証拠として確認する。

## 判断記録

- OpenCodeのmodel選択はユーザー責任へ変更した。Free-only guard、negative control、pricing / usage evidence、model固定は今回の要件から削除する。
- Personal dotfilesをPhase B / Fresh Createから除外する。
- CodespacesのCodex認証は`codex login --device-auth`を正規経路にする。
- Fresh Create前にcandidate SHAを通常pushし、同じSHAでFull Rebuildも行う。
- ファイル分割は行わない。検証順と停止条件を単一のcanonical Planで追う方が重複が少ない。
