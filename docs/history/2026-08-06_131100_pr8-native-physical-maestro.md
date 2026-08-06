# PR #8 Native実機・Maestro検証の更新履歴

## 変更概要

- Maestro MCPをCodex再起動後に確認し、ADBと同じSerial `354955112942476` のDevice／Hierarchy／Flowを取得した。
- SHV48の日本語IMEとformal Maestro CLIの入力差を確認した。LatinIME一時切替でASCII商品コードを入力し、終了時に日本語IMEへ戻す運用を確定した。
- Maestro Flowの固定text依存をstable testIDとoffscreen scrollへ置き換え、Runtime 5本／Boundary 5本を実機でPASSした。
- Native Catalogの非同期検索にrequest serial guardを追加し、古い検索結果が最新入力を上書きしないようにした。

## 根拠

- Run: `20260806-094328-JST`
- Runtime artifact: `.artifacts/native-local/20260806-124923/maestro/runtime-smoke.log`
- Boundary artifact: `.artifacts/native-local/20260806-130600/maestro/persistence-boundary.log`
- formal APK: `.artifacts/native-local/20260806-123500/build/apk-info.txt`
- Durable report: `.codex/runs/20260806-094328-JST/REPORT.md`

## 追補（13:30 JST）

- Web主要回帰27/27、Accessibility 4/4、mobile boundary 4/4をPASS。APK／Native Suiteの成功と併せて、今回変更に対するWeb回帰は確認済み。
- 全体Vitest／通常Jestは、`C:\v\qts`外部virtual store配下のESM package resolution差で実行前に停止。Native Jestは`NODE_PATH=C:\q\node_modules`のprocess-only workaroundで10 suites／26 tests PASSした。Repository設定や個人絶対Pathは変更していない。
- `expo-doctor@1.17.6`は15/17。Junction aliasのMetro projectRoot差と外部virtual-store package checkを未解消の環境固有事項として残す。Maestro MCPは`list_devices`で同一Serialを確認したが、長時間CLI後の`inspect_screen`はUNAVAILABLEだった。

## 全体Gate追補（13:49 JST）

- `node_modules/.pnpm-local`をCLI指定して依存解決した結果、`pnpm run test`（Unit 66／Integration 91／Repository 28／Web Component 76／Native 26／Contract 104）、`pnpm run typecheck`、lint、Web BuildがPASSした。
- `format:check`は生成Android outputと既存ファイルを含む294件で停止。`verify`もここで停止し、生成物を一括整形しない。physical rootのExpo Doctorは16/17でpackage checkだけがproject `.npmrc`のnpm config warningを残す。

## 未確認

- Mobile MCP backend、`gh` CLIによるActions正式確認、修正後Remote CI再実行は未実施。Commit／Push／PR更新も行わない。

## Format／MCP追補（14:07 JST）

- `.prettierignore`へ`.artifacts`、`android`、`.expo-local-export`を追加し、生成物を整形対象から除外した。今回変更範囲内の`app.config.ts`と`tests/contracts/native-windows-local-validation.test.ts`だけをPrettierで整形した。
- `pnpm run format:check`と`pnpm run verify`はPASS。生成Android outputを一括整形していない。
- physical rootのExpo Doctorは16/17、`pnpm exec expo install --check`はPASS。残るpackage checkは、個人`.npmrc`の`virtual-store-dir`／`virtual-store-dir-max-length`に対するnpm warningを伴う環境差であり、リポジトリ設定は変更していない。
- Maestro MCPは`list_devices`で実機`354955112942476`をconnectedとして返すが、現在の`inspect_screen`はDevice server `UNAVAILABLE`。再起動直後に取得済みのMCP Flow証跡とformal CLIのRuntime／Boundary PASS artifactを正式判定として保持する。
