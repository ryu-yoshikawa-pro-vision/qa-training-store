# Plan

## Objective

- 正本Plan `docs/plans/2026-09-08_161615_test-automation-curriculum-learning-experience.md` の全実装フェーズを、現在の `refactor/test-automation-curriculum-learning-experience` に反映する。
- 教材、Workbook、Training資産、演習用CI契約、仕様書、validator / contract testを相互に整合させ、検証・commit・push・PR #133更新まで完了する。

## Scope

- In: 正本Planの「変更対象」に列挙された `docs/curriculum/test-automation/**`、`training/**`、必要最小限の `scripts/training/**`、`scripts/validate-curriculum.ts`、関連contract test、`docs/spec/**`、Run Artifact。
- Out: Product Behavior、BR / ACの意味、Seed Scenario、`src/**`、正式回帰テスト、本番 / Preview CI、新規dependency、Planの「非対象」および「別対応」に分類された問題。

## Assumptions

- Plan記録のmain SHA `f7cc237d8ca719646d9654fba2129732b6eab457` は実装開始時点の `origin/main` と一致するため、rebaseは行わない。
- Native実機と、受講者編集後のGitHub Actions runtimeは利用可能性を確認し、利用できなければ成功扱いにせず未実行 / 未確認として記録する。
- 既存のTraining runner、copy prepare / validate、Test API、workflow contract、Workbook 4 CSVを再利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Planと既存契約で実装判断できる範囲を先に進める。
- 仮定してよい細部: 既存ファイルの現在の構成に合わせた局所的な文面・実装配置。
- 未回答の重要質問: GitHub Actions runtimeの実行可否、Android実機の利用可否は検証時に判定する。

## Hypotheses

- H1: 現行の教材・演習・validator・Training workflowの不整合は、既存の入口と契約を局所的に同期することで解消できる。
- H2: `training:web:exercise`接続とC09の診断状態は、既存runner / copy経路とWorkbookスキーマを拡張せずに表現できる。
- H3: Plan記載の認証メタデータとFixture pathは、Product Codeや正式回帰テストを変更せず文書だけで修正できる。
- H4: Android API 34のfresh `google_apis` AVDで発生したPixel Launcherの一時的なANRダイアログは、Product CodeやMaestro Flowを変更せず、APK起動前に既知のlauncher packageを停止するCI環境安定化で解消できる。

## Research Plan

- Round 1 Query: Planの変更対象と各既存ファイルの現行契約を照合し、参照関係と最小変更面を確定する。
- Round 2 Query: 変更後の既存検証、演習用copyの `--source-sha`、native / GitHub Actions runtimeの実行可否を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持 / 反証の根拠がある。
  - 全フェーズと完了条件を確認し、未確認事項を明示できる。

## Approach

- Planの実装順（学習経路 → Workbook → 演習 / CI → レッスン / 評価 → 仕様書 → 日本語 / 旧版 → validator）に沿って、各変更後に対応する局所検証を行う。
- `src/**`、正式回帰テスト、本番 / Preview CIを編集せず、関連する参照・契約だけを同時に更新する。
- コミットはPlanの責務単位へ分け、最終commit後のSHAを使って演習用copyを検証する。
- 標準フロー: `PLAN -> repo docs / existing contract -> TASKS -> 実装 -> 局所検証 -> 全体検証 -> REPORT`

## Definition of Done

- Planの全実装フェーズ、完了条件、検証条件を確認済みである。
- 既存のProduct / Formal / Production契約を維持し、Workbook、演習、評価、CI、validator、仕様書が新契約へ揃っている。
- Plan指定のRepository標準検証がPASS、または安全な停止条件と根拠を記録している。
- 対象branchへnon-force pushし、PR #133の本文を実装後の状態へ更新している。

## Risks / Unknowns

- 教材の文面変更が既存の自然文固定検証に影響する可能性があるため、構造契約へ棚卸しする。
- WorkbookのケースIDや実行状態を誤って混在させるリスクがあるため、4 CSVを相互参照して確認する。
- Training workflowの変更がcopy validator / contract testとずれるリスクがあるため、テンプレート・契約・生成copyを同じ変更単位で検証する。
- Native実機、GitHub Actions runtimeは環境依存のため、local static / copy validationと成功扱いを混同しない。

## Thinking Log

- 2026-09-09: Plan全文を確認した。mainはPlan記録値と一致し、branch差分はPlan 1ファイルだけのため、rebase不要と判断した。
- 2026-09-09: 既存経路の再利用、Product / Formal / Production非変更、Workbook列非追加、C09のFail / Pass行分離、`evidence`実在確認の緩和とpath安全性維持を実装判断の固定条件とする。
- 2026-09-09: Push後Native Runtimeの一次FAILは、アプリの起動失敗ではなくPixel Launcher ANRダイアログによるMaestro画面遮蔽と分類した。D2の修復範囲を`.github/workflows/native-ci.yml`と`tests/contracts/native-ci-workflow.test.ts`へ限定し、APK起動前のlauncher停止を追加する。
