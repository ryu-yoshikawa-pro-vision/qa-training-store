# ADR-0011: iOS Native CIをBuild-only Gateへ変更する

- Status: Accepted
- Date: 2026-08-09
- Approved-by: user PR #14「iOS CI Build-only化」指示
- Supersedes: `docs/adr/0010-native-ci-ios-build-runtime-gate.md`

## Context

現行運用では、iOS Simulator Runtimeをローカルで継続的に再現・デバッグできる開発環境を保持しない。GitHub-hosted macOS Runnerだけをデバッグ環境として前提にしたRuntime CIは、失敗時の継続保守性が低い。一方、AndroidはWindows上でBuild／Install／Maestro／Runtimeを継続的に再現・デバッグできる。

## Decision

1. iOSの正式Native CIは、`ios-automation-build`、`ios-production-build`、`ios-verify`だけで構成する。両Buildは独立して、metadata、Expo prebuild、CocoaPods、unsigned Release `iphonesimulator` Build、`.app`生成、Production build-time guard、Artifact保存／Uploadを実行する。
2. iOSのSimulator boot、`simctl` install／launch、Maestro、実`expo-sqlite` Contract Harness、Production-validation Runtime、`simctl diagnose`、Runtime Evidenceは標準CIの責務に含めない。共通Maestro YAMLとiOS conditional handlerはAndroid回帰を避けるため削除しないが、iOS Runtime PASSを保証する契約にはしない。
3. iOS `ios-verify`は両Buildの成功だけをRequiredとし、Native変更なしの場合は既存の両Build skip契約を維持する。Top-level `native-ci / verify`はiOS reusable workflowの結果をBuild-only Gateとして要求する。
4. AndroidのEmulator Runtime／Maestro／Contract Harness／Production-validation Runtimeとfail-close契約は維持する。

## Consequences

- Phase 2の正式保証範囲は、AndroidがBuild + Runtime E2E、iOSがAutomation／Production-validation Simulator Build + Build-time契約となる。
- iOSのRuntime／Maestro／実`expo-sqlite` Harness／Production-validation Runtimeは正式Gate対象外であり、未実行をPASSへ繰り上げない。
- iOS Build Artifactは、生成された`Release-iphonesimulator`配下の`.app`を固定名へ保存し、Upload対象をContract Testで固定する。
- iOS Runtime Failureを解消するためのSearch／Review Flow、keyboard回避、retry、sleep、座標tap、アプリ側変更はこの方針変更の対象外とする。
