# Native Build・配布設計（Phase 2初期案・非正本）（Phase 2）

> 本書はPhase 1実装の正本ではありません。Phase 2開始時に再設計します。

本ファイルはPhase 2開始時の入力です。Phase 1の実装・Release Gateには含めません。

## 1. 目的

Phase 1で安定したDomain/Application/Repository Contractを基に、Android/iOSの購入者FlowとSQLite Adapterを追加します。

## 2. Target識別子

| 項目 | Target |
|---|---|
| Android package | `com.example.ecautomationtraining` |
| iOS bundleIdentifier | `com.example.ecautomationtraining` |
| Scheme | `ec-training` |
| Deep Link | `ec-training://` |

Phase 2開始時にOrganizationと配布方式を再確認します。

## 3. EAS Profile候補

| Profile | 用途 | Test Control | 出力 |
|---|---|---:|---|
| development | 開発Client | ○ | internal |
| preview | Maestro・社内配布 | ○ | Android APK、iOS Simulator/Internal |
| production | 将来公開 | × | Phase 2では原則未使用 |

## 4. Phase 2で決め直すこと

- Expo SDKと最低OS
- SQLite DDLの互換性
- Android Emulator/API Level
- iOS Simulator/実機配布
- EAS費用・CI実行頻度
- Credential管理
- Maestro Deep LinkとReset方式

## 5. 原則

- Native Adminは作らない。
- Webと同じDomain/Applicationを使用する。
- SQLite AdapterはDexieと同じRepository Contractを通す。
- NativeのためだけにPhase 1 Domainを複雑化しない。
