# CI並列Workflow最適化（2026-08-08）

日時: 2026-08-08 11:47 (JST)
関連計画: [docs/plans/2026-08-08_114733_ci-parallel-workflow-topology.md](../plans/2026-08-08_114733_ci-parallel-workflow-topology.md)
変更ファイル:

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/native-test-control-maestro.test.ts`

## 変更内容

- `quality` を `style-quality` / `code-quality` へ分割し、`verify` の needs・result 判定を更新（Deployment 境界は不変）。
- `native-ci.yml` を `detect → {native-static, production-bundle-guard, android-build} → android-runtime → verify` へ再構成。
  - Guard を Static と並列化（`validate:native-production-bundle.ts` が自己完結することを根拠に検証済み）。
  - APK を Artifact（`native-android-apk-${{ github.run_id }}`、overwrite、retention 3日）で受け渡し。
  - Maestro Runtime/Smoke 5 Flow を独立 Step へ分割。
  - `native-ci / verify` 表示名を維持し、Native 未変更時は all skip を成功扱い（fail-closed は継続）。
- `native-test-control-maestro.test.ts` の `readFlow` を CRLF に耐えるよう LF 正規化。

## 検証結果

- Contract Test: focused 52、全体 132 を通過（既存の環境起因CRLF 1件も解消）。
- Prettier（変更4ファイル）/ ESLint / typecheck:native-tests / lint:markdown / YAML parse がパス。
- `pnpm run verify` フルはローカル CRLF 環境起因（未変更ファイルを含む format:check 30件が CRLF で落ちる）のため実行せず、実行可能な検証のみで判定。
- Remote CI 実行は未実施（Git操作禁止のため push / 再実行不可）。

## 残課題（別PRまたはユーザー承認後）

- Branch Protection の Required Check 表示名（quality → style-quality / code-quality）の確認・更新。
- ローカル CRLF checkout 環境（`* text=auto` + `core.autocrlf=true`）で全ファイルの `format:check` が失敗する既存問題の対処（本PRでは変更対象ファイルのみLFを維持）。
