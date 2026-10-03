# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Zen + Codex CLI の開発環境を実装・検証する。
- 同じ branch / PR で plain Codespace検証、`.devcontainer`、README、candidate SHA、Full Rebuild、Fresh Create、Repository検証、後処理、final CIまで完了する。

## 対象範囲

- In:
  - baseline main / PR head / current公式仕様の固定。
  - installに使う正規distributionからOpenCode / Codexのlatest non-prerelease stableを確定。
  - Personal Secret / dotfiles一時変更と異常終了を含む復元。
  - dotfilesなしplain CodespaceでOpenCode / Codexの事前疎通。
  - OpenCode Personal Secretを使ったZen認証のcredential-specificな証明。
  - Codex device auth、effective `CODEX_HOME`、Hook contract / runtime、bounded subagent、`ci_wait`。
  - Phase B→C checkpointでtarget node userのinstall戦略を固定。
  - `waitFor: "postCreateCommand"` を含むdevcontainer実装。
  - candidate SHA freezeとPhase B Codespaceの`--ff-only`同期。
  - 同candidate SHAでFull Rebuild + explicit devcontainer Fresh Create。
  - Full Rebuild / Fresh Create内の認証zero-state、`pnpm run verify`、Web smoke。
  - canonical Fresh Codespaceからfinal exact-head CI。
  - dotfiles復元、Codespace stop、delete候補記録。
- Out:
  - OpenCodeのFree / paid制御、model固定、pricing / usage監査。
  - OpenCodeへCodex Safety Harness相当のpermission / sandbox / Hook制御を追加すること。
  - Native toolchainのCodespaces移行。
  - 新しいMCP / CI workflow /認証framework。
  - merge / Codespace自動delete。

## 確定前提

- OpenCode modelはユーザーがOpenCode Zen上で選択し、Free / paidはRepository側で制限しない。
- canonical smokeはOpenCode Zen providerを使用する。
- OpenCodeはupstream default permissionを利用し、Codex Safety Harness相当の制御は今回追加しない。
- model capability failureは明示的な非対応、または環境/config/認証を変えずmodelだけ変えて同一smokeがPASSした場合に限る。
- Phase Bのplain Codespace user / path / PATHはbaseline evidenceでありtarget contractではない。
- target `node` userで使うinstall command / sudo方針 / PATH反映 / postCreate順序はPhase B→Cまでに固定し、E-2では実測値だけを検証する。
- OpenCode Personal Secret利用はsmoke成功だけで判定せず、auth cache・別credential sourceを排除したcredential-specific evidenceで確認する。
- Secret非露出は値をprompt / completion / command output / terminal output / log / Artifact / REPORT / PR本文へ出さないことを意味し、OpenCode processへのcredential env提供は許容する。
- effective `CODEX_HOME`をlogin / trust / smoke / subagent / `ci_wait`で統一する。
- Fresh CreateのCodex zero-stateは`codex login status`を正本とする。
- Phase B / E-2 / E-3で`wait_for_required_ci`は呼ばない。`ci_wait` server startup / tool discoveryをintegration evidenceにする。
- canonical Codespaces検証では`GH_TOKEN`を対象processから除外し、Codespaces標準`GITHUB_TOKEN`を使用する。
- candidate SHA確定後からFull Rebuild / Fresh Create完了までbranchへpushしない。
- Phase B CodespaceはGit safety契約に従う`merge --ff-only`でcandidateへ同期する。
- candidate freeze後にmainが進んだだけでは再検証しない。
- success / failure / blocker / user stopを問わず、Run終了前にdotfilesを元状態へ戻しvalidation-only Codespaceをstopする。
- final CI正常経路ではcanonical Fresh Codespaceをwaiter / PR本文更新完了までrunningに保つ。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- Phase A → dotfilesなしplain Codespace → Phase B→C checkpoint → devcontainer / README → candidate freeze → Phase B Codespaceをcandidateへff-only同期 → Full Rebuild → Fresh Create → final記録 / push → canonical Fresh Codespaceをfinal HEADへff-only同期 → exact-head CI → cleanup の順で進める。
- Full Rebuild / Fresh Createは対象Codespace外のcontrol shellから操作し、検証は対象Codespace内で行う。
- Fresh Create後に環境影響変更があれば新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。
- 中断時も終了時cleanup契約を実行する。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- Full Rebuild / Fresh Createの両方で`pnpm run verify`がPASSする。
- Full Rebuild後のactive `devcontainerPath`が`.devcontainer/devcontainer.json`である。
- Fresh Createの`devcontainerPath`とHEADがcandidate契約に一致する。
- final headとcandidate SHAの差分にFresh Createを無効化する環境影響変更がない。
- canonical Fresh Codespaceからexact final HEADの`Web CI` / `Mobile App CI`をwaiter1回でsuccess確認し、PR本文へ結果を記録する。
- dotfiles設定が元状態へ復元される。
- validation-only / canonical Fresh Codespaceがstopされ、delete候補が記録される。
- cleanup失敗がある場合はBlockerとして報告する。
- merge / Codespace deleteは行わない。

## 判断記録

- OpenCode model制御は行わないが、canonical smokeはZen providerを使用する。
- OpenCode permissionはupstream defaultを明示的に採用し、追加のSafety Harnessは今回の対象外とする。
- Phase B install provenanceとtarget devcontainer provenanceを分離するが、target install戦略自体はPhase B→Cで事前確定する。
- `waitFor: "postCreateCommand"` をReady条件にする。
- `CODEX_HOME`をCodex trust / auth / runtimeの共通契約に含める。
- `ci_wait`はfinal CI wait専用toolであり、中間phaseでは呼ばない。
- アカウント全体へ影響するdotfiles設定はfinally相当で元へ戻す。
- 検証専用Codespaceはstopし、deleteはユーザー判断とする。
- stable versionはinstallに使う正規distribution metadataを正本とし、補助official sourceの公開タイミング差だけではRunを止めない。
- ファイル分割は行わない。candidate SHA / Full Rebuild / Fresh Create / final CI / cleanupが一続きの状態遷移であり、分割すると条件が重複する。
