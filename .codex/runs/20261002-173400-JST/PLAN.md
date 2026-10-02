# Plan（計画）

## Objective（目的）

- GitHub Codespaces + OpenCode Free model 導入の実装前Planを、Repositoryの現状と公式仕様に基づいて作成する。
- 今回はPlan作成だけを行い、`.devcontainer`、README、application code、workflowは変更しない。

## Scope（対象範囲）

- In:
  - `main` の現状確認。
  - Codespaces / Dev Containers / OpenCode / Zen Free model の公式仕様確認。
  - `plan/codespaces-opencode-devcontainer` branch 作成。
  - canonical Plan 保存。
- Out:
  - `.devcontainer` 実装。
  - README実装。
  - OpenCode実疎通。
  - Codespace作成・Rebuild。
  - PR作成。
  - merge。

## Assumptions（仮定）

- 後続実装は同じ `plan/codespaces-opencode-devcontainer` branch で行う。
- Free model一覧とOpenCode stable versionは変動するため、後続実装開始時に再確認する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 現時点ではなし。
- 仮定してよい細部: official TypeScript Node 24 / Bookworm imageを第一候補とする。
- 未回答の重要質問: なし。外部availability / policyは後続実装の実測gateとする。

## Hypotheses（仮説）

- H1: Codespaces内で公式OpenCode CLIを直接実行すれば、Zen Free modelを通常開発に利用できる。
- H2: このRepositoryでは独自Dockerfileなしの最小devcontainerでNode / pnpm / OpenCode環境を再現できる。
- H3: Native開発経路をCodespacesへ持ち込まず、Web / Repository validationへ限定した方が既存責務と整合する。

## Research Plan（調査計画）

- Round 1 Query:
  - RepositoryのNode / pnpm / install / Web / Native / OpenCode既存設定 / Plan規約を確認する。
- Round 2 Query:
  - GitHub Codespacesのdevcontainer / secrets、Dev Containers Node image、OpenCode install / CLI / rules / Zenを公式資料で確認する。
- Exit Criteria:
  - canonical Planに検証順、停止条件、最小変更範囲、DoDが明記されている。
  - 後続実装者が追加設計せず、外部変動値だけを実測して進められる。

## Approach（進め方）

- devcontainerを先に実装せず、plain CodespaceでOpenCode + Free modelを先に検証する。
- 疎通成功後だけ、Node 24 / pnpm 10.34.5 / exact OpenCode version / Codespaces secretを最小devcontainerへ固定する。
- root `opencode.json`、Dockerfile、Native toolchain、CI追加は初期導入から外す。
- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。

## Definition of Done（完了条件）

- branchが作成済み。
- canonical Planが保存済み。
- Planに現状、対象外、Phase A-F、停止条件、検証、リスク、成果物、公式資料が含まれる。
- 実装ファイルは変更していない。

## Risks / Unknowns（リスク・未知点）

- Free model availability / data policyは変動する。
- OpenCode stable versionは実装時に変わる可能性がある。
- CodespacesのOpenCode実疎通は今回未実行であり、後続実装のPhase Bで確認する。

## Thinking Log（判断記録）

- `.github/opencode/security-fallback.json` はSecurity fallback専用のdeny-first設定であり、通常開発へ流用しない。
- GitHubはproject固有devcontainerをNode projectの再現性向上手段として推奨しているため、疎通成功後の最小devcontainer導入をPlanへ採用した。
- OpenCodeはroot `AGENTS.md` をproject instructionとして扱えるため、新しいinstruction設定を初期導入では追加しない。
- Native正式経路はWindows / macOS localであるため、CodespacesへAndroid / iOS環境を持ち込まない。
