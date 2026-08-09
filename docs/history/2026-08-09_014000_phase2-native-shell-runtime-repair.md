# Phase 2 NativeShell Runtime回帰修正記録

## 背景

Iteration 5のRole boundary実装後、Android RuntimeSuiteでContract Harness、Storefront、Cartの3/5フローが画面遷移後にHomeへ戻って失敗した。失敗時のMaestro Hierarchy／Screenshotは3フローともHomeを示し、Build／Install／Smoke／Test Controlは成功していた。

## 判断と修正

`NativeShell`がpathname変更ごとにSession取得中状態へ戻り、`Slot`を一度アンマウントしていたことを原因と判定した。初回Session解決中はCustomer childrenを表示しないRole boundaryを維持しつつ、pathname／foregroundのSession再取得中は既存routeを保持するよう、`currentUserLoaded=false`へのリセットをservices未準備時だけに限定した。pathname遷移中にCustomer routeを保持するNativeShell Component Testを追加した。

## 検証

- Focused NativeShell／Native purchase Component: 2 suites／9 tests PASS。
- Full Test: Unit 65、Integration 95、Repository 31、Web Component 76、Native Component 36、Contract 155 PASS。
- Typecheck、Prettier、Lint（0 errors／63 warnings）PASS。
- Android実機: `20260809-013000-android-iteration8-build`、Install、Smoke、Test Control 1/1、RuntimeSuite 5/5、BoundarySuite 5/5 PASS。
- iOS Simulator／実`expo-sqlite` Harness／Remote CIはWindows環境と未push制約により未実行。Phase 2 final DoDはpendingのままとする。
