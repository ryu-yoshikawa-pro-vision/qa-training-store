# PR #14 Native CI Build／Runtime分離の記録

- AndroidはAutomation／Production-validation Buildを独立Jobへ分離し、APKの保存名、Upload対象、Download後のverify／install pathを固定した。Runtimeは片方のBuild失敗で他方を止めず、最終Gateは必須結果をfail-closeで判定する。
- iOSもAutomation／Production Buildを独立Jobへ分離し、各Jobで生成した`.app`をArtifactとしてRuntimeへ渡す。Runtime内の再Buildは行わず、`ios-verify`でBuild／Runtimeの結果を集約する。
- `tests/contracts/native-ci-workflow.test.ts`へAndroid／iOS 4 Artifactのproducer／consumer／install path、独立Job、Runtime OR条件、最終fail-closeの契約を追加した。
- Android実機の現行APKはRuntimeSuite 5/5、BoundarySuite 5/5までPASSした。Review単体は標準日本語IMEによるASCII本文変換後に保存assertionが失敗したため、端末依存の未完了検証としてRun Artifactへ記録した。
- WindowsではiOS Simulator／実`expo-sqlite`／Production-validationと修正HeadのRemote Native CIを実行できないため、iOS／Remoteの成功は記録していない。
