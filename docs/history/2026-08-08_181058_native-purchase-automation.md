# Native Customer購入自動化の実装記録

## 変更

- Native SQLite Schema Version 2へ、Customer購入経路に必要な住所、Checkout、Order、Payment、Shipment、Review関連のTableとFKを追加した。
- 共有Application Use Caseへ接続するNative SQLite repository、transaction runner、Auth／Account／Checkout／Order／ReviewのNative Routeと画面を追加した。
- 購入系Scenario、Payment Delay、Contract Harness、Repository／Component／Workflow Contract Test、Android／iOS Maestro Flowを追加した。
- iOS Native WorkflowをBuild／Runtime／Production validationへ分離し、Androidとともに `native-ci / verify` へ接続した。

## 根拠

- Repository／ApplicationのNode `node:sqlite`契約テストで、Guest Cart統合、Role拒否、Address、Payment成功、Order、Review投稿・編集・削除を確認した。
- Native Component Test、Native Test Control／Maestro Contract、CI Workflow Contract、型検査を実行した。
- Node契約テストは実`expo-sqlite` Android／iOS Runtimeの代替ではないため、実機／Simulator／Remote CIの判定は分離する。

## 未確認

- Windows上の今回変更を含むAndroid Release Build／Install／Maestro。
- WindowsではiOS Simulatorを実行できないため、iOS Build／Runtime。
- GitHub-hosted Remote CI、EAS Cloud、commit／push／PR更新。

## 追加検証（2026-08-08 19:15 JST）

- Android実機で今回変更を含むRelease APKをBuild／Installし、Smoke、Test Control、既存Runtime 5/5、Boundary 5/5、Purchase 1/1、Review 1/1を確認した。
- Review Flowの初回Failureは日本語IMEによる可視性問題だったため、FlowへScroll後の`hideKeyboard`を追加し、修正後1/1 PASSした。
- iOS Simulator、GitHub-hosted Remote CI、EAS Cloudは引き続き未実行である。
