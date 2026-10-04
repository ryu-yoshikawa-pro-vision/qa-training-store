# Plan（計画）

## Objective（目的）

- PR #188の同じbranchへ、CodespacesでCodex / OpenCode / PlaywrightのVS Code拡張とPlaywright GUI録画を利用するための追加Planを作成する。
- 既存のOpenCode / Codex CLI計画と重複せず、追加差分の責務と検証条件を明確にする。

## Scope（対象範囲）

- In:
  - PR #188 / branch /既存Plan / package / Playwright configの確認。
  - `desktop-lite`、Playwright VS Code extension、Codex / OpenCode extension、Codespaces port securityのcurrent公式仕様確認。
  - 新しいRepository Planの保存。
  - 既存Planへ新Plan参照を最小追記。
- Out:
  - `.devcontainer`実装。
  - Codespace作成 / rebuild。
  - application / test / workflow変更。
  - PR本文更新。

## Assumptions（仮定）

- ユーザーが「新しいプラン」と指定したため、既存Planを全面改稿せず追加Planとして分離する。
- GUI録画対象browserはChromiumに限定する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: `desktop-lite`のpasswordは既定値を使い、6080をprivateに維持する。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: `desktop-lite` + noVNCでCodespaces内のheaded Chromiumを表示できる。
- H2: Playwright VS Code extensionのRecorderがCodespaces WebのExtension Hostから`DISPLAY=:1`を利用できる。
- H3: 現行Node 24 devcontainer imageを維持し、Repository Playwright CLIからChromiumを追加する方がbase image切替より変更が小さい。

## Research Plan（調査計画）

- Round 1: RepositoryのPR #188、既存Plan、`package.json`、`playwright.config.ts`、AGENTS / Plan lifecycleを確認。
- Round 2: Dev Containers、Playwright、VS Code、GitHub Codespaces、Codex / OpenCodeのcurrent公式資料を確認。
- Exit Criteria:
  - 追加するFeature / extension / port / browser install経路を一意に説明できる。
  - Recorder互換性の未確認点をruntime validationへ落とせる。

## Approach（進め方）

- 既存PlanのCLI / lifecycle契約を再利用する。
- GUI基盤はDev Containers公式`desktop-lite`を使う。
- Playwright公式のCodespaces + noVNC経路へ合わせる。
- 新Planに実装順、失敗切り分け、DoDを保存し、既存Planには参照だけ追加する。

## Definition of Done（完了条件）

- 新Planが`docs/plans/`へJST filenameで保存されている。
- 既存Planから新Planを発見できる。
- current公式資料とRepository現状に矛盾しない。
- 実装は開始しない。

## Risks / Unknowns（リスク・未知点）

- Playwright RecorderのCodespaces Web統合は実機確認が必要。
- Chromium browser installはFresh Create時間とdisk使用量を増やす。

## Thinking Log（判断記録）

- Playwright公式Docker資料がGitHub Codespaces + `desktop-lite` + noVNCをrecord / selector / codegen用途として案内しているため、自前X11/VNC構築は採用しない。
- 既存PlanがNode 24とRepository runtimeを固定しているため、Playwright Docker imageへの切替は行わずChromiumだけ追加する。
