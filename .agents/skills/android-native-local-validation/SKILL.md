---
name: android-native-local-validation
description: Use when setting up Windows Android tooling, building a local Release APK, installing it on a physical device, running Maestro flows, or investigating a Native physical-device failure.
---

1. `AGENTS.md`、`docs/native/README.md`、`docs/native/windows-android-local-validation.md` を読む。
2. Windows 固有の既知障害がある場合は `docs/native/windows-android-troubleshooting.md` を読む。
3. 手順を独自に再実装せず、`scripts/native/windows/android-local.ps1` を実行入口にする。
4. 最初に `-Action Doctor` を実行し、Node 24、pnpm 9.10.0、Java 17、Android SDK、ADB、実機、Maestro 2.8.0 を確認する。
5. 初回または Native Project 再生成が必要な場合だけ `-Action Prepare` を実行する。
6. APK が現在の変更を含まない場合だけ `-Action Build` を実行し、Build Cache を優先する。
7. `-Action Install`、`-Action Smoke` の順に実機起動を確認する。
8. Maestro は `-Action Test` で `maestro/native-test-control.yaml` を1本だけ実行する。
9. 単体 Flow が失敗したら後続 Suite を実行せず、`.artifacts/native-local/<run>/` の Screenshot、Hierarchy、logcat、JUnit、Maestro Output を確認する。
10. Timeout 延長、Assertion 削除、Flow Skip、CI Allow failure だけで成功扱いにしない。
11. アプリまたは Flow を最小修正し、同じ単体 Flow を再実行する。
12. 単体成功後だけ `-Action RuntimeSuite`、続いて `-Action BoundarySuite` を実行する。
13. Build、Install、Smoke、単体 Flow、各 Suite を分けて報告し、未実行を PASS と書かない。
14. `android/`、APK、`.artifacts/`、`local.properties`、個人 Path を含む `.npmrc`、Device 固有情報を Repository へ追加しない。
15. Git 操作はユーザーの明示依頼がない限り行わない。
