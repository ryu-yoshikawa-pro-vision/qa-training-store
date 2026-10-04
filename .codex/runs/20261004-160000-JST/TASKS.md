# Tasks（タスク）

## Now（現在）

- [x] 1. PR #188、既存Plan、RepositoryのPlaywright構成を確認する。
- [x] 2. Dev Containers / Playwright / Codespaces / VS Code extensionのcurrent公式仕様を確認する。
- [x] 3. 既存Planと重複しない追加Planの責務と変更方針を確定する。
- [x] 4. 新PlanとRun Artifactを作成する。
- [x] 5. 既存Planへ新Plan参照を最小追記する。

## Discovered（発見事項）

- Playwright公式Docker資料がCodespaces + `desktop-lite` + noVNCでrecord / selector pick / codegenを利用する構成を案内している。
- Repositoryは`@playwright/test@1.62.0`を既に持つため、新しいnpm dependencyは不要。
- `.devcontainer/devcontainer.json`は現時点のPR headには存在しない。
- [x] 6. 新Planの裸URLをMarkdown linkへ修正し、MD034 failureを解消する。
- [x] 7. Playwright Recorder検証前に8081を再起動し、検証後に停止する手順へ修正する。
- [x] 8. 親Planのdevcontainer / postCreate / port / browser境界を追加Planと同期する。
- [x] 9. 修正後のPlan間契約とMarkdown sourceを静的確認する。
- [x] 10. Codex CLI / IDE拡張のcached login共有と`CODEX_HOME`契約を公式仕様へ同期する。

## Blocked（ブロック中）

- なし。

Progress: 100% (10/10)
