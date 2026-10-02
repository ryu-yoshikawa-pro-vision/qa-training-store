# Tasks（タスク）

## Now（現在）

- [x] 1. RepositoryのPlan規約、toolchain、OpenCode既存設定、Native境界を確認する。
- [x] 2. GitHub Codespaces / Dev Containers / OpenCode / Zenの公式仕様を確認する。
- [x] 3. `plan/codespaces-opencode-devcontainer` branchを`main@84ce165493649550832731a60cf436f8ae29c56b`から作成する。
- [x] 4. 検証→導入→Rebuild後検証→最終確認までをcanonical Planへ具体化する。
- [x] 5. 過剰な初期導入を避け、Dockerfile / Native toolchain / root `opencode.json` / CI追加を対象外として確定する。
- [x] 6. Plan-only taskとして実装へ進まず、変更対象をPlanとRun Artifactだけに限定する。
- [x] 7. Codex CLIのChatGPT sign-in、利用枠、認証情報境界を公式仕様で確認し、canonical Planへ統合する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- 計画保存規約: `PLANS.md`
- 詳細計画: `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`

## Discovered（発見事項）

- Free model一覧は外部側で変動するため、Repositoryへmodel IDを固定しない。
- `qa-training-store` は public Repository であり、OpenCode Free modelによるRepository内容の学習利用を許容する。学習利用可否はmodel選定条件にしない。
- Secretや認証情報などRepositoryに含まれない機密情報はOpenCodeへ送信しない。
- OpenCodeの既存Security fallback設定は通常開発向けではない。
- OpenCodeはroot `AGENTS.md` をproject instructionとして利用できる。
- Codex CLIはChatGPTアカウントでサインインしてChatGPTプランのCodex利用枠を使える。
- Codex認証はCodespaces Secretへコピーせず、`codex login status` で各Codespaceの状態を確認する。
- CodespacesはNative正式検証経路の置き換えにしない。

## Blocked（ブロック中）

- なし。
