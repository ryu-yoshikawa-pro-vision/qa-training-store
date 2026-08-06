# Plan

## Objective
- Run名: `pr8-native-local-maestro-ci-repair`
- PR #8 の Native 品質ゲート、Windows 実機 Maestro、最新 Native CI failure を原因根拠つきで修正・検証する。

## Scope
- In: `scripts/native/windows/android-local.ps1`、指定された Expo package／lockfile、Native Status／Bridge／Flow／関連テスト、必要性が証明された CI、Native検証の保存規約、Run artifact。
- Out: Branch／Commit／Push／Rebase／Merge／Workflow 手動再実行、Web Presentation、Application／Domain／Repository／SQLite 契約、Production Test Control 混入。

## Assumptions
- C:\q Junction と指定 branch を維持する。
- Expo patch 更新は `expo`、`expo-constants`、`expo-linking`、`expo-router` に限定する。
- Status 修正は baseline の実画面・Hierarchy証跡で根拠を得た後だけ行う。

## Questions / Ambiguity
- 必ず質問する不透明点: MCP 未接続、`gh` CLI 未導入、署名不一致、同一 failure の再発、対象外の大規模変更が発生した場合は `stop_needs_human`。
- 仮定してよい細部: Run artifact の時刻・ログ命名は既存スクリプトに従う。
- 未回答の重要質問: Maestro MCP／Mobile MCPを本セッションで利用可能にできるか。

## Hypotheses
- H1（支持）: `android-local.ps1` の `$Args` パラメーター衝突により Doctor／formal CLI 引数が失われている。
- H2（支持）: Expo 4 package と `expo-constants` override の patch mismatch が Native Static を失敗させている。
- H3（支持）: Native Status の absolute／`top: 4`／Root Layout直下／親 accessible＋子 Text 構成が Android Accessibility Tree で listening を `visible: false` と判定させている。
- H4（反証）: Screenshot には `Native test runtime listening` が表示され、Hierarchy logcatにも同一 label、Bounds、Test ID がある。Runtime初期化／build kind／services受け渡しが listening 不表示の主因とは考えにくい。

## Research Plan
- Round 1 Query: toolchain／ADB／MCP、既存 artifact、最新 PR head／CI log、wrapper／Status／Flow／契約を確認する。
- Round 2 Query: formal baseline の hierarchy／UIAutomator／Screenshot／logcat を分類し、最小修正後に focused validation を行う。
- Exit Criteria:
  - H1/H2 は再現と validation で確定する。
  - H3/H4 は実画面証拠または、MCP不能なら未確認として明記する。
  - 同じ failure を2回繰り返さず、各 repair iteration の根拠・残差・decision を記録する。

## Approach
- `PLAN -> TASKS -> 初期化／調査 -> baseline -> bounded repair -> focused validation -> native gates -> full regression -> REPORT`
- `repair-loop` の `allowed_files` を先に固定し、原因不明の blind retry は行わない。
- `android-native-local-validation` の PowerShell script を実行入口にする。

## Definition of Done
- Expo quality gate、focused／full regression、Web／Production Bundle が PASS。
- formal PowerShell 経路で APK／Install／Smoke／単体／Runtime 5本／Boundary 5本の実行結果と証跡が揃う。
- Remote CI は Push／再実行なしのため、最新 failure の根拠と Push 後の確認事項を分離して報告する。
- MCP 未接続が解消しない場合は、実機 MCP の completion を `stop_needs_human` として明記する。

## Risks / Unknowns
- MCP Tool 不在、Mobile MCP backend 不稼働、gh CLI 不在。
- Status の視覚表示と Accessibility visibility の差。
- 依存更新による native／Web bundle 回帰。

## Thinking Log
- 2026-08-06 09:43 JST: 新規 Strict Run を作成。C:\q は正しい Junction、branch は指定どおり、開始時 source git status は clean。
- 2026-08-06 09:45 JST: Doctor は `Validate toolchain` で失敗。Node／pnpm／Java／ADB／Maestro／SDK component／実機は個別確認で存在。
- 2026-08-06 09:46 JST: MCP 列挙で Maestro Tool 不在、Mobile MCP は mobilecli 不稼働。停止条件として記録し、CLI／CIの安全な調査を継続。
- 2026-08-06 09:48 JST: 最新 head `13cf19b` の Native CI run `31059212122` Phase 1 success、`31059212026` Native CI failure。Native Static は expo-doctor 4 mismatch、Android は 5 flow 全て listening assertion failure。
- 2026-08-06 09:49 JST: `android-local.ps1` の `Out` が `$Args` を使い、PowerShell inline reproduction で `pnpm --version` が引数なしになり exit 1。H1 を支持する。
- 2026-08-06 09:55 JST: `$Arguments` への改修と Windows PowerShell 5.1 の native stderr 保持を反映後、formal Doctor は PASS。単体 baseline は JUnit／Maestro output／Screenshot／Hierarchy／device logcat を生成したが、listening assertion で FAIL。
- 2026-08-06 09:56 JST: Screenshot では Status が画面上部に表示。logcat では `native-test-runtime-status`、Bounds `[12,12][415,59]`、contentDescription は取得できたが `visible: false` として Maestro が除外。Status Bar／Safe Area領域への配置と Accessibility 統合を原因カテゴリ B と分類し、Flow selector の変更は保留する。
- 2026-08-06 14:35 JST: Nativeの共有・確認用スクリーンショットは`output/mobile-native/`へ集約し、`.artifacts/native-local/<timestamp>/`は実行機械証跡として残す運用を採用する。既存のルート直下`native-storefront-cart-added.png`は同ディレクトリへ移し、Runbook／Project Contextへ記録する。
