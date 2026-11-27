# 公開sampleの開発用Run記録

この記録は開発用にsample specを検証した結果です。CI Run、外部Templateからの実行、受講者の評価・修了記録ではありません。

## Historical baseline (M07 source path)

以下はM10専用ロード前に、配布元と同じM07公開sample pathで実行した履歴です。M10 module-localの現行証拠は末尾の2026-10-23記録です。

- M10の配布元: `workspace/M07/public-sample/handoff-smoke.spec.ts`。Manifestは同じsourceを`workspace/M10/public-sample/handoff-smoke.spec.ts`へ配布します。
- 配布元SHA-256: `596cc3ca65211badd08931e0ea00701440fc7b9cc814f688001699b619472ba7`
- Config / base URL / 出力先: `playwright.ai-assisted-qa.config.ts` / loopback HTTP `127.0.0.1:8082` / `output/training/ai-assisted-qa/`
- Reset: `default`。specはReset結果のscenarioを照合してから、商品追加後のカート表示を検証します。
- 実行元: PR開始HEAD `b8f8642c45c6622b227c5c08f8756129eb037d00`に未commit差分がある開発worktree。specの同一配布元SHA-256を照合。
- 開発実行コマンド: `PLAYWRIGHT_TEST_ROOT=workspace/M07/public-sample`、`PLAYWRIGHT_SKIP_WEB_SERVER=true`、`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe`を設定し、`pnpm.cmd run training:ai-assisted-qa:test -- --reporter=list`
- 結果・終了コード: 1 passed、10.8秒、exit 0。
- 結果artifact: `output/training/ai-assisted-qa/report/index.html`（開発worktree内、CI artifactではありません）。
- 検証範囲: M10へ配布するspecと同一内容のM07公開sampleを、開発用distへ接続して実行。M10専用ロード後の実行、disabled workflowによるGitHub Actions実行、外部Template、受講者による確認は未実施。
- 実行者: 開発用自動検証。人間受講者の評価ではない。

### 2026-10-23 M10 module-local development run

- 配布元と実行specのSHA-256: `596cc3ca65211badd08931e0ea00701440fc7b9cc814f688001699b619472ba7`。source `workspace/M07/public-sample/handoff-smoke.spec.ts`をM10のロード先と同じ`workspace/M10/public-sample/`へ一時コピーし、コピー後にもSHA-256一致を確認しました。
- dist: `pnpm.cmd run build:web`がexit 0で生成した`dist/`をloopback static server `127.0.0.1:8082`から配信しました。
- 実行: `PLAYWRIGHT_TEST_ROOT=workspace/M10/public-sample`、`PLAYWRIGHT_SKIP_WEB_SERVER=true`、`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`を設定し、`pnpm.cmd run training:ai-assisted-qa:test -- --reporter=list`を実行しました。
- 結果: M10 module-local pathの1/1 passed、Playwright終了コード0（test 10.6秒、suite 29.8秒）。同じ一時loopback serverとbuild済みdistを使用。CI、外部Template、受講者評価、無効workflowをGitHub Actionsで実行した結果ではありません。
- 実行者: 開発用自動検証。人間受講者の評価ではありません。
