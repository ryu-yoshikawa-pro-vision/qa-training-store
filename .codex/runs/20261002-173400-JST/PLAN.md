# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Zen + Codex CLI の開発環境を実装・検証する。
- 同じ branch / PR で plain Codespace検証、`.devcontainer`、README、candidate SHA、Full Rebuild、Fresh Create、Repository検証、後処理、final CIまで完了する。

## 対象範囲

- In:
  - baseline main / PR head / current公式仕様の固定。
  - OpenCode / Codex latest non-prerelease stableの決定。
  - Personal Secret / dotfiles一時変更と復元。
  - dotfilesなしplain CodespaceでOpenCode / Codexの事前疎通。
  - OpenCode Personal Secretを使ったZen認証の証明。
  - Codex device auth、Hook contract / runtime、bounded subagent、`ci_wait`。
  - Phase B→C checkpoint。
  - `waitFor: "postCreateCommand"` を含むdevcontainer実装。
  - candidate SHA freeze。
  - 同candidate SHAでFull Rebuild + explicit devcontainer Fresh Create。
  - Full Rebuild / Fresh Create内の`pnpm run verify`とWeb smoke。
  - Codespace stop / delete候補記録。
  - final exact-head CI。
- Out:
  - OpenCodeのFree / paid制御、model固定、pricing / usage監査。
  - Native toolchainのCodespaces移行。
  - 新しいMCP / CI workflow /認証framework。
  - merge / Codespace自動delete。

## 確定前提

- OpenCode modelはユーザーがOpenCode Zen上で選択し、Free / paidはRepository側で制限しない。
- canonical smokeはOpenCode Zen providerを使用する。
- model capability failureは明示的な非対応、または環境/config/認証を変えずmodelだけ変えて同一smokeがPASSした場合に限る。
- Phase Bのplain Codespace user / path / PATHはbaseline evidenceでありtarget contractではない。
- target contractはE-2 Full Rebuildの`node` user環境で確定し、E-3 Fresh Createで一致を確認する。
- OpenCode Personal Secret利用はsmoke成功だけで判定せず、exact versionのcredential pathとSecret非露出evidenceで確認する。
- Phase B / E-2 / E-3で`wait_for_required_ci`は呼ばない。`ci_wait` server startup / tool discoveryをintegration evidenceにする。
- canonical Codespaces検証では`GH_TOKEN`を対象processから除外し、Codespaces標準`GITHUB_TOKEN`を使用する。
- Personal dotfiles設定は検証前に元状態を記録し、Fresh Create evidence取得後に復元する。
- candidate SHA確定後からFull Rebuild / Fresh Create完了までbranchへpushしない。
- candidate freeze後にmainが進んだだけでは再検証しない。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- Phase A → dotfilesなしplain Codespace → Phase B→C checkpoint → devcontainer / README → candidate freeze → Full Rebuild → Fresh Create → dotfiles復元 / Codespace stop → final記録 / push → exact-head CI の順で進める。
- Full Rebuild / Fresh Createは対象Codespace外のcontrol shellから操作し、検証は対象Codespace内で行う。
- Fresh Create後に環境影響変更があれば新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- Full Rebuild / Fresh Createの両方で`pnpm run verify`がPASSする。
- dotfiles設定が元状態へ復元される。
- validation-only Codespaceがstopされ、delete候補が記録される。
- final headとcandidate SHAの差分にFresh Createを無効化する環境影響変更がない。
- exact final HEADで`Web CI` / `Mobile App CI`がsuccessし、PR本文へ結果を記録する。
- merge / Codespace deleteは行わない。

## 判断記録

- OpenCode model制御は行わないが、canonical smokeはZen providerを使用する。
- Phase B install provenanceとtarget devcontainer provenanceを分離する。
- `waitFor: "postCreateCommand"` をReady条件にする。
- `ci_wait`はfinal CI wait専用toolであり、中間phaseでは呼ばない。
- アカウント全体へ影響するdotfiles設定は一時変更として元へ戻す。
- 検証専用Codespaceはstopし、deleteはユーザー判断とする。
- ファイル分割は行わない。candidate SHA / Full Rebuild / Fresh Create / cleanup / final CIが一続きの状態遷移であり、分割すると条件が重複する。
