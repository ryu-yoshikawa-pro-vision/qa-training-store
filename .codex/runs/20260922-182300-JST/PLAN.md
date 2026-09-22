# Plan（計画）

## 目的

- Issue #130の保存Planを再レビュー結果に合わせて修正し、Current Evidence、設計比較、責務境界、change detection、検証条件を実装開始可能な状態へ確定する。

## 対象範囲

- Issue #130 / 保存Plan / Run Artifact
- Current `native-ci.yml` / `native-ios-ci.yml` / Native CI関連script / contract test
- Phase 6後のPR #133
- GitHub Actions Reusable Workflow公式仕様
- Repository ruleset `main-protection`

Native CI実装、Product code、PR作成、merge、Issue closeは対象外。

## 確認した前提

- branch作成時の`main`は`2a76df4e7c4efabfc1e50ce4a4b0d88c92ddabd3`。
- 再レビュー時の`main`は`8d73289350d45e28b4186c47caa32ad8d4809657`。
- 両commit間の`main`差分はIssue #163のSecurity fallback 3ファイルだけで、Native CI関連fileは不変。
- PR #133でPhase 6後にもlauncher stabilization、Maestro startup helper、iOS timeoutのNative CI修正が入っている。
- Reusable Workflow caller jobは`name` / `uses` / `with` / `needs` / `if`等を利用できる。caller workflow-level `env`はcalled workflowへ自動伝播しない。
- active rulesetでrequired status checkとして固定されているのは`validate`のみ。

## 判断

- Refactorは必要。
- Android buildはGradle commandだけのhelper化をやめ、Automation / Productionのjob IDを維持したReusable Workflowへ移す。
- Production Bundle Guardは新規shell wrapperを作らず、既存`validate-native-production-bundle.ts`へAPK入力責務を寄せる。
- Android Runtimeは親workflowに残し、Emulator start / visual profile / visual capture / runtime evidenceだけをhelperへ移す。
- change detectionは通常PRとmanual visual pathで分ける。

## 完了条件

- 先のレビューで挙げた必須修正を保存Planへ反映している。
- helper数を6本固定から4本へ削減している。
- buildの設計比較と採用理由がある。
- Phase 6後のCurrent Evidenceがある。
- workflowへ残す処理の基準がある。
- change detectionを通常PRとmanual visualで分けている。
- executable bitを必須条件から外している。
- 実装・PR作成へ進んでいない。
