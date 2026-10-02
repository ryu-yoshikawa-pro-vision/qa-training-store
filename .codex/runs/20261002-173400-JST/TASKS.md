# Tasks（タスク）

## Now（現在）

- [x] 1. RepositoryのPlan規約、toolchain、OpenCode既存設定、Native境界を確認する。
- [x] 2. GitHub Codespaces / Dev Containers / OpenCode / Zenの公式仕様を確認する。
- [x] 3. `plan/codespaces-opencode-devcontainer` branchを`main@84ce165493649550832731a60cf436f8ae29c56b`から作成する。
- [x] 4. 検証→導入→Rebuild後検証→最終確認までをcanonical Planへ具体化する。
- [x] 5. 過剰な初期導入を避け、Dockerfile / Native toolchain / root `opencode.json` / CI追加を対象外として確定する。
- [x] 6. Plan-only taskとして実装へ進まず、変更対象をPlanとRun Artifactだけに限定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- 計画保存規約: `PLANS.md`
- 詳細計画: `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`

## Discovered（発見事項）

- Free model一覧とデータ利用条件は外部側で変動するため、Repositoryへmodel IDを固定しない。
- OpenCodeの既存Security fallback設定は通常開発向けではない。
- OpenCodeはroot `AGENTS.md` をproject instructionとして利用できる。
- CodespacesはNative正式検証経路の置き換えにしない。

## Blocked（ブロック中）

- なし。
