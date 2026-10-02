# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Free model + Codex CLI の開発環境を実装・検証する。
- 同じ branch / PR で plain Codespace検証、`.devcontainer`、README、candidate SHA、Full Rebuild、Fresh Create、Repository検証、CI確認まで完了する。

## 対象範囲

- In:
  - latest main / Repository契約 / current公式仕様の再確認。
  - Personal Codespaces Secret / dotfiles境界の確認。
  - dotfilesなしplain CodespaceでOpenCode / Codexの事前疎通。
  - OpenCode zero-cost model選定、Free-only positive / negative control、session-bound usage evidence。
  - OpenCode Zen認証方式の確定。
  - Codex device-code authentication、Hook contract / trust / runtime、bounded subagent、`ci_wait`。
  - Phase B→C checkpointで実測値をcanonical Planへ固定。
  - `.devcontainer/devcontainer.json` / README実装。
  - candidate commit / pushとSHA固定。
  - 同じcandidate SHAでFull Rebuild + dotfilesなしFresh Create。
  - final headとの差分確認、`pnpm run verify`、必須CI。
- Out:
  - Native toolchainのCodespaces移行。
  - OpenCode / Codex modelの性能比較。
  - 目的達成に不要なharness再設計。
  - merge。

## 確定前提

- `qa-training-store` はpublic Repositoryで、OpenCode Free modelによるRepository内容の学習利用を許容する。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に含めない。
- Free modelはmodel名ではなくcurrent Zen metadata / pricingのzero-costを根拠にする。
- OpenCode Free-onlyはRepositoryが提供する標準起動経路を対象にし、意図的なenv / config / binary改変は対象外とする。
- 標準CLIの `--model` / `-m` bypassはnegative controlで拒否を確認する。
- Free-only設定はREADMEの手動操作に依存させずdevcontainerの既定runtimeへ反映する。
- Phase Bとcanonical Fresh Createの両方でPersonal dotfilesを無効化する。
- Codexはremote環境でdevice-code authenticationを通常経路とし、API key / access token / WIF / auth cache copyへfallbackしない。
- Codexは`test:hooks`、same-session Hook runtime、bounded subagent、`ci_wait`まで既存契約を検証する。
- Full Rebuild / Fresh Create前に環境影響差分をcandidate commitへ含めて通常pushし、両方を同じcandidate SHAで検証する。
- forward対象は8081のみ。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- dotfilesなしplain Codespace → Phase B→C確定 → devcontainer / README実装 → candidate前Repository検証 → candidate commit / push → candidate SHA Full Rebuild → 同SHA Fresh Create → 最終記録 / CIの順で進める。
- Phase Bで成功したexact command / version / model / pricing根拠 /認証 / install path / usage evidenceをPlanへ固定するまで実装へ進まない。
- Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- final headとcandidate SHAの差分にFresh Createを無効化する環境影響ファイルがない。
- PR #188 latest headの必須CIが成功する。
- mergeは行わない。

## リスク

- Free model availability / pricing、CLI stable version、Dev Container image tagは実装時に変動し得る。
- OpenCodeのconfig merge、`--model` override、hidden agent等がFree-onlyを破る可能性があるためpositive / negative両方を確認する。
- usage evidenceが他sessionと混ざる可能性があるためsession IDと一意artifactを使う。
- Codespace Rebuildだけではcache / home state依存を排除できないため、同candidate SHAのFull Rebuild / Fresh Createを両方必須にする。
- CodexのHook trustと実Runtime発火は別証拠として確認する。

## 判断記録

- 以前のPlan-only scopeは、ユーザー指示によりPR #188で実装まで行うscopeへ拡張した。
- Free候補は `*-free` suffixではなくcurrent Zen metadata / pricingのzero-costを正本にする。
- Personal dotfilesをPhase B / Fresh Createから除外する。
- CodespacesのCodex認証は`codex login --device-auth`を正規経路にする。
- Fresh Create前にcandidate SHAを通常pushし、同じSHAでFull Rebuildも行う。
- ファイル分割は行わない。検証順と停止条件を単一のcanonical Planで追う方が重複が少ない。
