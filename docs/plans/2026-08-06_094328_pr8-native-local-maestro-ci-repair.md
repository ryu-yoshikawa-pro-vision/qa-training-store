# PR #8 Native ローカル／Maestro／CI 修正計画

## Goal

PR #8 の Native 品質ゲートを、原因を特定した最小差分で修正し、Windows 実機の正式 PowerShell 経路と GitHub Actions の同一 Maestro Flow が成立する状態まで検証する。

## Current understanding

- ブランチは `feature/01_phase2-first-half-native-foundation`、HEAD は `13cf19bc842832bb1882f62e210f0c87325dc2ae`、作業ツリーは開始時点で clean。
- `C:\q` は `C:\Users\sella\Documents\qa-training-store` を指す Junction である。
- Node 24.12.0、pnpm 9.10.0、Java 17.0.20、ADB、Maestro CLI 2.8.0、認証済み Android 実機は存在する。
- `pnpm run native:android:doctor` は `Validate toolchain` 中に `pnpm` の引数が渡らず失敗する。`android-local.ps1` の `Run`／`Out` が `$Args` をパラメーター名に使っているため、PowerShell の自動 `$Args` と衝突している可能性が高い。
- 最新 PR head に紐づく Native CI run `31059212026` は Native Static が `expo-doctor@1.17.6` の Expo 4 package mismatch で失敗し、Android は Build／Install／Launch 成功後に 5 Flow 全てが最初の `Native test runtime listening` 可視 assertion で失敗している。
- 現行 Status は Native Root Layout の直下で、`accessible` な absolute View と同一文言の子 Text を持つ。CI でも最初の listening 表示が認識されないため、Accessibility／Bounds／Runtime 初期化を実画面証跡で分類する必要がある。
- 再起動後、Maestro MCP は `list_devices` で実機Serial `354955112942476` を返し、同一FlowのMCP実行も成功した。Mobile MCP は引き続き `mobilecli is not available` で失敗するため、代替扱いにはしない。
- Formal CLI のStorefront失敗証跡では、`P-0001`入力後に古い検索結果が残り、`NativeCatalogScreen` のkeyword変更ごとの検索リクエスト競合が疑われる。最新リクエストのみ結果を反映する最小修正を追加して再検証する。

## Assumptions

- ユーザーの明示指示に従い、Branch、Commit、Push、Rebase、Merge、Workflow 手動再実行、PR 本文更新は行わない。
- Expo patch 更新は指定された 4 package に限定し、`expo-constants` override は実際の互換性を確認したうえで同じ `57.0.9` へ揃える。
- Status のアプリ側修正は baseline の Screenshot／UIAutomator／Maestro hierarchy／logcat で分類できた場合だけ行う。
- 実機署名不一致で Uninstall が必要になった場合は人間判断へ戻る。
- Maestro入力IMEを使う実機検証では、終了時に元の日本語IMEを復元する。

## Non-goals

- Timeout 延長、assertion 削除、Flow skip、CI allow-failure、Production Build への Test Control 混入。
- Web Presentation、Application／Domain／Repository／SQLite 契約、Seed 仕様、後半機能の変更。
- Maestro MCP／Mobile MCP のインストールや外部権限変更を本 Run で行うこと。

## Impacted areas / files to inspect

- Windows 実行入口: `scripts/native/windows/android-local.ps1`
- 依存品質ゲート: `package.json`, `pnpm-lock.yaml`
- Native composition／Status／Bridge: `src/presentation/root-layout.native.tsx`, `src/presentation/native/native-automation-bridge.enabled.tsx`, `native-test-control-bridge.tsx`, `native-runtime-provider.tsx`, `native-shell.tsx`, `src/test-controls/**`
- Flow／契約: `maestro/native-*.yaml`, `tests/component/native/**`, `tests/contracts/native-test-control-maestro.test.ts`, `tests/contracts/native-ci-workflow.test.ts`
- CI: `.github/workflows/native-ci.yml`
- Durable context: `docs/PROJECT_CONTEXT.md`, `docs/history/**`（実装結果が現在理解を変える場合のみ）

## Change strategy

1. 再起動後の toolchain、Junction、ADB、MCP、既存 artifact、最新 PR／CI を証跡化する。
2. `android-local.ps1` の引数渡しを最小修正し、Doctor と formal Test 経路で baseline を採取する。Status のアプリ／Flowはこの段階で変更しない。
3. baseline の hierarchy、UIAutomator bounds／visible、Screenshot、logcat、Activity を分類し、`A`〜`G` の failure category と根拠を確定する。
4. Expo 4 package と override を明示更新し、lockfile と doctor／install check を検証する。
5. 実画面証拠が示す範囲で Status／Bridge／Flow／テストを最小修正する。CI Workflow はローカルと CI の差が原因と証明できた場合に限る。
6. focused test → Prepare／Build／Install／Smoke →単体 Flow → Runtime Suite → Boundary Suite の順に進める。各段階の失敗はその証跡を分析して停止する。
7. Web、Production Bundle、既存 test、format／lint／typecheck、契約を実行し、未確認の MCP／Remote CI は PASS と記載しない。

## Validation plan

- `pnpm run native:android:doctor`
- `pnpm exec expo install --check`、`pnpm dlx expo-doctor@1.17.6`
- Native Bridge Component／Contract と依存更新に関係する test
- `pnpm run native:android:prepare`, `build:local`, `install:local`, `smoke:local`
- `pnpm run native:android:test:control`、成功後のみ runtime／boundary suite
- `pnpm run format:check`, `lint`, `typecheck`, unit／integration／repository／native component／contracts、production bundle guard、web build、`verify`
- GitHub connector で最新 head/run/jobs/logs を read-only 確認。CLI が利用可能にならない限り `gh pr checks` の再確認は未実施として扱う。

## Risks / Open questions

- Mobile MCP backend は未接続のままだが、Maestro MCP では同一SerialのDevice／Hierarchy／Flowを確認できる。Formal CLIとMCPで検索結果が異なるため、CLI parityを再検証する。
- Native商品検索はkeyword変更ごとの非同期検索で古いレスポンスが後勝ちする可能性があり、実機の入力速度・Maestro経路差で顕在化する。
- CI の Android failure は Status accessibility の可能性が高いが、現時点では CI log の assertion 以外の画面証跡がなく、アプリ修正を先に確定してはならない。
- `android/`、APK、`.artifacts/` は生成物として保持するが Git 変更対象にはしない。

## Definition of Done

- Doctor／Expo quality gate、focused／full regression、Web／Production Bundle が PASS。
- formal PowerShell 経路で APK／Install／Smoke／Test Control／Runtime 5本／Boundary 5本の結果と証跡が保存される。
- Remote CI は Push／再実行を行わず、最新失敗原因と Push 後に確認すべき Check を明記する。実際の Remote PASS は主張しない。
- MCP が未接続のままなら `stop_needs_human` として、未確認理由を Run Artifact と最終報告へ残す。
