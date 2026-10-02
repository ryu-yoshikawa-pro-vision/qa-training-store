# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Free model + Codex CLI の開発環境を実装・検証する。
- Planだけで終了せず、同じbranch / PRで `.devcontainer`、README、実機検証、Repository検証、CI確認まで完了する。

## 対象範囲

- In:
  - latest main / Repository契約 / current公式仕様の再確認。
  - plain CodespaceでOpenCode / Codexの事前疎通。
  - Phase B→C checkpointで実測値をcanonical Planへ固定。
  - `.devcontainer/devcontainer.json` 実装。
  - README更新。
  - Full Rebuild + Fresh Codespace検証。
  - OpenCode Free-only / Codex ChatGPT sign-in / existing Codex harness検証。
  - `pnpm run verify` / CI。
- Out:
  - Native toolchainのCodespaces移行。
  - OpenCode / Codex modelの性能比較。
  - 目的達成に不要なharness再設計。
  - merge。

## 確定前提

- `qa-training-store` はpublic Repositoryで、OpenCode Free modelによるRepository内容の学習利用を許容する。
- Secret / token /認証情報はOpenCodeへ送信しない。
- OpenCodeはstable channelのみ、main model / `small_model` を同じFree modelへ固定し、auto updateを無効化する。
- Codexは `Sign in with ChatGPT` を使い、代替認証経路を監査する。
- 今回のゴール達成に必須と実測で判明した最小変更は、canonical Plan更新後に同じPRで対応する。
- forward対象は8081のみ。Training Runtime 8082の外部forwardは対象外。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- plain Codespace → Phase B→C確定 → devcontainer実装 → Full Rebuild → Fresh Create → Repository検証の順で進める。
- Phase Bで成功したexact command / version / model /認証確認をPlanへ固定するまで実装へ進まない。

## 完了条件

- canonical PlanのDoDをすべて満たす。
- PR #188 latest headの必須CIが成功する。
- mergeは行わない。

## リスク

- Free model availability、CLI stable version、Dev Container image tagは実装時に変動し得る。
- Codespace Rebuildだけではcache依存を排除できないためFresh Createまで必須。
- Codexの認証環境変数やproject / Hook trustにより、CLI単体疎通とRepository実利用が異なる可能性がある。

## 判断記録

- 以前のPlan-only scopeは、ユーザー指示によりPR #188で実装まで行うscopeへ拡張した。
- 既存Runを同一会話・同一taskとして継続し、実装工程をTASKSへ追加する。
- ファイル分割は行わない。検証順と共通停止条件を一つのcanonical Planで追う方が重複が少ない。
