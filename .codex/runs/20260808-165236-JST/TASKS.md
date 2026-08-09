# Tasks

## Now

- [x] 1. 必須文書、ADR、直近Run、最新main相当、現行Native構造を再調査する。
- [x] 2. `docs/plans/`へPhase 2後半の保存用計画を作成する。
- [x] 3. Native購入SQLite拡張とiOS CI責務分離のADRを作成する。
- [x] 4. Native購入SQLite Schema／Seed／Mapper／Repository／Transactionを実装する。
- [x] 5. Native Composition RootへCustomer Application servicesを注入する。
- [x] 6. Gate A: Auth／Session／Role拒否／Guest Cart統合を実装・検証する。
- [x] 7. Gate B: Profile／Address／Default／未保存変更を実装・検証する。
- [x] 8. Gate C: Checkout／Payment／Orderを実装・検証する。
- [x] 9. Gate D: Reviewと購入系Scenarioを実装・検証する。
- [x] 10. Test Control／Payment Delay／購入系Contract Harnessを拡張する。
- [x] 11. Native Component／Repository／Contractテストを追加・検証する。
- [x] 12. Android／iOS主要MaestroとProduction-validation Flowを追加する。
- [x] 13. Android／iOS Build／Runtime分離、Artifact、Evidence、final verifyを実装する。
- [x] 14. CI Contract／Detect Path／EAS／Bundle Guardを更新・検証する。
- [ ] 15. Web回帰、Native回帰、Android実Runtime、iOS Build-only／Remote Gate可能性を確認する。
- [x] 16. README／PROJECT_CONTEXT／History／Native手順／Phase 2計画を更新する。
- [x] 17. 自己レビュー、Critical／High判定、Sanitizer Write／Checkを行う。
- [x] 18. REPORT／run.json／evaluation.jsonを実行事実へ更新し、Remote CI未実施を分離して完了判定する。

## Discovered

- 作業中に発見したタスクはここへ追記する。
- [x] 19. Iteration 5 のNativeShell pathname再取得でSlotが再マウントされるAndroid Runtime回帰を修正し、Runtime／Boundaryを再検証する。
- [x] 20. iOS Runtimeの選択SimulatorをMaestroへ明示渡しし、Workflow Contractを再検証する。
- [x] 21. Native CI DetectへCI Contract Test Pathを追加し、Detect／Contractを再検証する。
- [x] 22. iOS Runtimeの`simctl diagnose`出力先を明示し、Evidence Contractを再検証する。
- [x] 23. Native契約テスト全体をDetect対象へ追加し、Web-only変更を広く巻き込まない契約を再検証する。
- [x] 24. Native Order詳細へPayment／Shipment／商品／価格／配送先Snapshotを表示し、Component Testで固定する。
- [x] 25. Profile／Address／Checkout等の入力画面へKeyboardAvoidingViewを追加し、Native Componentで検証する。
- [x] 26. Native Loginの`destination as never`を型付き遷移へ修正し、型逃げscanで固定する。
- [x] 27. Native Purchase画面の残存型アサーションを除去し、型検査・Native Componentで再検証する。
- [x] 28. Native SQLite Row／Enum／集計値を境界Parserへ統一し、不正値回帰テストと全テストで再検証する。
- [x] 29. Native Transaction Runnerの残存型アサーションを除去し、Admin Scope fail-close契約を追加検証する。
- [x] 30. 独立BaselineのFormat残差を意味変更なしで整形し、`format:check`／`verify`を再検証する。
- [x] 31. PR #14のAndroid／iOS Artifact producer・consumer・install契約を修正し、Contract Testで再発防止する。
- [x] 32. PR #14追加DoDのMaestro継続実行、Cart ID、認可Harness、Checkout復帰、NativeShell競合を修正し、回帰ゲートを再検証する。
- [x] 33. PR #14追加修正のreviews-empty、Native fixture、checkout期限更新transaction、expo-router公開APIを最小差分で修正し、回帰ゲートを再検証する。
- [x] 34. PR #14最終修正指示のAndroid／iOS Build分離、Artifact Contract、Review／Storefront Flow、Profile logout回帰を反映し、可能な静的／Android実機ゲートと未実行境界を記録する。
- [x] 35. PR #14最終修正指示のiOS Deep Link confirmation、全custom scheme Contract、Android Production marker本文検査、iOS diagnose evidence、現行構成文書を反映し、ローカル品質ゲートとAndroid回帰を再検証する。
- [x] 36. PR #14追加修正指示のiOS Deep Link selector、openLink直後Contract、Android marker full-consumption、iOS diagnose非対話証跡を修正し、positive／negative guardと全品質ゲートを再検証する。
- [x] 37. PR #14 iOS CI Build-only化指示を反映し、iOS Runtime／simctl／Maestro責務をWorkflowとContractから削除し、iOS Build Gate、現行文書、全品質ゲートを再検証する。

## Blocked

- iOS Simulator Buildのローカル実行と、GitHub-hosted Remote Android／iOS CI／最新Headの`native-ci / verify`は、現行WindowsにXcode／`gh`がなく、Git mutation／pushも禁止のため未実行。iOS Simulator Runtime／Maestro／実`expo-sqlite` Harnessは現行正式Gateの対象外であり、未実行をBlockerやPASSへ扱い替えない。

Progress: 97% (36/37)
