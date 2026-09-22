# Plan（計画）

## Objective（目的）

- Issue #130についてCurrent `main`のNative CI責務を再mappingし、実装前の変更境界・検証・完了条件を確定した保存Planを作成する。

## Scope（対象範囲）

- In:
  - Issue #130
  - `.github/workflows/native-ci.yml`
  - `.github/workflows/native-ios-ci.yml`
  - Native CI関連script / contract test / Project Context
  - Phase 6 refactoring report / 修正履歴
  - 保存Planと本Run Artifact
- Out:
  - Native CI実装
  - Product code
  - dependency変更
  - PR作成
  - merge / Issue close

## Assumptions（仮定）

- 基準はbranch作成時の`main` `2a76df4e7c4efabfc1e50ce4a4b0d88c92ddabd3`。
- 実装開始時にはlatest `main`へrebaselineする。
- 現在のjob名、Artifact名、Automation / Production / Training / iOS Build-only保証は互換性契約として維持する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: helper script内の局所的な関数分割。ただし新しい汎用frameworkへ広げない。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 問題の主因はjob数ではなく、高変更頻度のinline Bashがorchestration fileへ集中していること。
- H2: job graphを維持し、複雑なinline実装だけを責務別Native helperへ移せば、保証意味を変えずblast radiusを下げられる。
- H3: Reusable Workflow追加は現在の個別job result contractを複雑化するため、今回の最小解ではない。

## Research Plan（調査計画）

- Round 1 Query:
  - Issue #130、Phase 6 report、Current `native-ci.yml`、iOS reusable workflow、contract testsを確認。
- Round 2 Query:
  - cited repair commit、Native helper pattern、change detection、final verifyを確認。
- Exit Criteria:
  - Refactor要否を現在の根拠で判定できる。
  - 責務変更後の責務を持つfileと保持する契約を具体化できる。
  - 実装・validation・ロールバックを追加判断なしで進められる。

## Approach（進め方）

- Current job graphは維持する。
- orchestrationと高変更頻度のinline implementationを分離する。
- 既存`scripts/native/*.sh`を利用し、新しいCI abstractionを作らない。
- Contract testでjob / artifact / final gateと新責務を固定する。

## Definition of Done（完了条件）

- branch作成済み。
- 現在の構成確認 / history確認済み。
- Refactor要否の結論あり。
- 保存Planに変更対象、非目標、実装順、validation、ロールバック、完了条件が記載されている。
- Plan-only Run Artifactが保存されている。
- 実装・PR作成へ進んでいない。

## Risks / Unknowns（リスク・未知点）

- 実装時のlatest `main` driftは開始時rebaselineで吸収する。
- visual capture pathは通常PR実行されないため、実装Planでmanual branch dispatchを必須にした。

## Thinking Log（判断記録）

- Reusable Workflow分割は個別job resultの再公開が必要になり、Currentより複雑になるため採用しない。
- Composite Actionは既存Native script patternに対して追加層となるため採用しない。
- 既存`android-maestro-run.sh`がNative change detection対象外であることを確認し、新規helperと合わせてPlanへ修正対象として含めた。
