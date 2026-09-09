# PR #133 Test Automation Curriculum 学習体験改善

## 変更理由

正本Plan `docs/plans/2026-09-08_161615_test-automation-curriculum-learning-experience.md` に従い、初学者向けの学習順序、既存Workbook、Playwright / Maestro演習、Failure分析、演習用CI、評価基準、仕様書導線の契約を同じ状態へ揃える。

## 判断と移行

- CommonはWeb中心で完了し、Nativeは選択式のspecializationとして既存Lesson番号のまま分岐・再joinする。
- P1-4より前は仕様・Role・状態・画面観察を中心にし、実装上のScenario Metadataは実装段階の照合へ置く。
- 既存4 CSVのスキーマを維持し、Cartの代表ケースを購入上限と購入不可明細へ分ける。実行行の`run_context`、`result`、`evidence`は状態契約として検証する。
- Playwrightの基準確認、受講者Exercise、恒久Failure、診断Failure、Maestro Exerciseを別の責務として扱う。Training WorkflowのPull Requestではbaseline後に受講者Exerciseを実行する。
- `docs/spec/README.md`では期待動作の読み始めを先に示し、仕様管理用語を後段へ置く。認証ScenarioとFixture pathの文書不整合はProduct codeを変更せず修正し、旧Capstoneは案内Aliasへ短縮する。

## 対象外

Product Behavior、BR / ACの意味、Seed Scenario、`src/**`、Formal Regression、本番 / Preview CI、Native保証範囲、既存のAgentic QA基盤は変更しない。
