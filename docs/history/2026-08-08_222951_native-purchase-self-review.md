# Native Customer購入自動化 自己レビュー追補

## 実施内容

- Native SQLite v1からv2への加算的migrationを追加し、既存Customer users／cart／catalog／sessionを保持したまま購入用テーブルを利用できるようにした。未知のschema versionは従来どおり停止する。
- SQLite lock errorをApplicationErrorへ変換し、Native loginのreturnToをallowlist resolverへ集約した。非customer RoleはNative Customer UIを表示せず、logout導線だけを提供する。
- Android CIはProduction verify対象を実際のProduction APKへ修正し、Production JS bundle再生成とNative assembleを分離した。iOS Production Maestroは独立stepで完結するようにした。
- Purchase完了ではorder ID、Checkout restartではstarted／resumedをMaestroで確認するようにした。

## 検証結果

- 全テストはUnit 65、Integration 94、Repository 31、Web Component 76、Native Component 31、Contract 154がPASSした。
- Web export、Native bundle guard、lint、Markdown、security、EAS、route、image manifest、typecheckがPASSした。format checkは未変更Baseline 2ファイルのみ残った。
- 最新Android実機ではAutomation／ProductionのBuild、Install、Smoke、購入系Flow、Runtime／Boundary Suite、Production-validationをPASSした。機械証跡は`.artifacts/native-local/`へ保存した。

## 未確認事項

- Windows環境にXcode／SimulatorとGitHub CLIがないため、iOS Simulator RuntimeとRemote GitHub Actions Runは未実行である。Workflow静的契約のPASSを実Runtime／Remote PASSへ拡張して扱わない。
