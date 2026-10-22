# Plan（計画）

## Objective（目的）
PR #199の最新Planに定義された新課程全11モジュールと関連機能を実装し、必要な開発検証を行う。

## Scope（対象範囲）
- In: M00〜M10教材・クイズ・演習・評価基準、22状態、知識グラフ、Web、同期/単一モジュールロード、固定Skill統合、Phase 2実技、Phase 3 CIサンプル、関連テスト・文書・PR更新。
- Out: 実受講者/評価者による実地受入、外部Template作成・公開、非公開資料の未指定保存先への配置、運用開始判断。

## Assumptions（仮定）
- PR開始HEADは9cb5bd4ddd1c0cdbb2fe16ce3f2c862b5093f7dd。作業ブランチと開始時worktreeは正しい/clean。
- 実地検証は実装完了条件外。開発用自動検証は完了条件内。
- 公開範囲と秘密資料の境界は維持し、未指定保存先・評価者・Template権限を推測しない。

## Questions / Ambiguity（質問・曖昧性）
- 必ず質問する不透明点: 今回なし。未指定の外部保存/管理事項は依存箇所を明示する。
- 仮定してよい細部: 既存構成に沿う最小のvalidator/CLI拡張。
- 未回答の重要質問: 外部Template名・作成先・管理権限、非公開資料保存先/アクセス権/管理担当、正式評価者、実受講者Codespaces条件。

## Hypotheses（仮説）
- H1: 既存サイト/クイズ/知識グラフを拡張して全モジュールを配布できる。
- H2: 同期/ロード/状態契約はローカルfixtureで検証でき、Template作成権限なしで実装可能。
- H3: 固定Skill実統合可否は環境と実在Entityを確認して判定する。

## Research Plan（調査計画）
- Round 1 Query: 全詳細Plan、現行コード・テスト・CI、固定外部Skill revision・Cartの根拠Entityを確認。
- Round 2 Query: 各新規契約実装後、validator、unit/contract、Chromium E2E、Phase2 runner、verify/CIを確認。
- Exit Criteria: 11 modules/51 IDs/22 states/関連CLIと同期・ロードの実装・検証状況をPlanへ照合し、残課題を個別列挙。

## Approach（進め方）
1. 代表M02→M03/M05→M06の教材と開発受入を実施。
2. 開発受入結果を反映してM00〜M10へ展開。
3. 状態・KG・同期/ロード・Web・CI機能を完成。
4. 必須開発検証・旧課程非回帰・PR本文・Run記録を確認し、段階commit/push。

## Definition of Done（完了条件）
- 関連Planの成果物が揃い、必須開発用検証が通過する。
- 全11モジュール、51学習項目、22状態、Quiz/Web/KG/同期・ロード/CIサンプルが検証される。
- 実地検証は別工程として未実施を記録し、実装BLOCKEDとしない。
- 非公開模範/採点資料が公開Gitへ入らない。指定保存先がないことに依存する成果物は未達として報告。

## Risks / Unknowns（リスク・未知点）
- 固定Skill実行に必要な正式Authority/Risk/Scope/TR entitiesが作業環境にない可能性。
- 非公開資料の安全な保存先が未指定。
- 段階的大規模な教材/機能追加に対してWindows上の既存verify/contract/native suitesに既知環境差がある。

## Thinking Log（判断記録）
- 2026-10-22: 開始HEAD/remote一致、作業ブランチ正当、開始時worktree clean（Run Artifactのみ未追跡）。残りは7モジュール。実地検証は後工程。
- 2026-10-22: Plan上のM02→M03契約は正確なSkill revision・実在runtime evidenceを要求する。形だけのJSON fixtureをPASSとしない。
