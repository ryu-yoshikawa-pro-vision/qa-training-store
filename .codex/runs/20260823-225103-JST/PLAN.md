# 調査計画

## Objective

- カリキュラム、テスト戦略・観点、技術的負債の後続レビューを判断可能にするため、Normative Specificationから実装・CI・CompetencyまでのRepository Evidenceを収集し、事実・不一致・欠落・重複・複雑性・未確定事項を分離して整理する。

## Scope

- In:
  - Repository Map、主要ファイルの行数・サイズ・依存関係
  - Curriculum / Competency / Lesson / Exercise / Evidence / Completion Criteriaの追跡
  - Formal Test Strategy / Training Test / Test Layer / CI Gateの追跡
  - Web / Native / Shared Domain・Application / Dexie・SQLite / Harnessの境界
  - 指定Hotspotの責務、API、依存、transaction boundary、caller、test、変更リスク
  - 重要Learning ObjectiveとRisk・Test・Training・Formal Regression・Competencyの双方向Traceability
- Out:
  - Product / Test / Training / Specification / Curriculum / ADR / Plan / CI / Configの変更
  - 修正、リファクタリング、新規テスト、Issue / PR、Git操作、外部レビュー起動
  - 改善提案、修正Plan、`docs/reports/`へのReport作成
  - Runtime操作を伴う探索的QA（既存の静的Evidenceと保存済みRun / CI Evidenceを優先する）

## Assumptions

- 現在のRepository working treeを調査対象のCurrent Stateとし、Git履歴やGitコマンドは使用しない。
- 既存Plan / Run / ADR / Changelog相当記録は変更頻度・既知状態の補助Evidenceとして扱い、Normative Specificationの代替にはしない。
- 既存Testの存在やObserved Behaviorは期待動作の正本ではなく、`docs/spec/`のNormative ownerと照合して分類する。
- 件数は収集時点の概算とし、generated / dependency / Run ArtifactをProduct・Testの件数から分離する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、順序、禁止事項、最終出力が十分具体的である。
- 仮定してよい細部: Evidence収集はread-only command、検索、静的解析、既存validator / test定義の読解を中心とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Required CurriculumのNavigation、Validator、Rubric、CIは同じ22文書とC01〜C12を一貫して必須扱いしている。
- H2: Normative Risk / BR / ACの一部にはFormal Regressionまでの明示Traceabilityがある一方、教材で明示しない高度観点や逆方向の孤立が存在し得る。
- H3: Formal Web、Formal Native、Training Web、Training NativeはDirectory / Config / Runtime / CIで意図的に分離されているが、共有Harness・Seed・Test Controlには境界上の集中がある。
- H4: 指定Hotspotは単純な行数だけでなく、複数業務責務、transaction、platform contract、test callerの集中を持つ可能性がある。
- H5: Android Runtime保証とiOS Build-only保証はADR・Curriculum・CIで一致するが、古いPlan / Runには歴史的状態が残るためCurrent契約との区別が必要である。

## Research Plan

- Round 1: Repository全体のfile inventory、主要entry point、行数・サイズ、設定・workflow・script・recent ADR / Runを収集する。
- Round 2: CurriculumをRequired / Optional / Advanced / Reference / Legacy Aliasまで読み、C01〜C12とLesson / Exercise / Evidence / Completion Criteriaを追跡する。
- Round 3: Specification、risk、test perspective / technique、test layer、Formal / Training、CI trigger / gateを追跡する。
- Round 4: Architectureと指定Hotspotのsymbol、dependency、caller、transaction、test、historical change evidenceを追跡する。
- Round 5: 双方向Traceabilityをcross-checkし、`FACT` / `MISMATCH` / `GAP` / `DUPLICATION` / `COMPLEXITY` / `QUESTION` / `CANDIDATE`へ分類する。
- Exit Criteria:
  - ユーザー指定の8つの最終出力InventoryをRepository path / section / line / test / spec / lesson / CI Evidence付きで構成できる。
  - C01〜C12、主要Feature / Risk、主要Test Layer、指定Hotspotを少なくとも1回ずつ追跡している。
  - Current contractとhistorical observation、NormativeとObserved、FormalとTrainingを混同していない。
  - 変更はこのRunの標準Artifactだけで、Sanitizer Write / CheckがPASSする。

## Approach

- Parentがscope、Evidence基準、最終分類を統合し、read-onlyの調査subagentへCurriculum、Test / CI、Architecture / Hotspotを独立委譲する。
- Subagentはファイルを変更せず、子subagentを起動せず、Gitコマンドを使わず、path / line / symbol付きEvidenceだけを返す。
- 結論は改善判断ではなく、後続レビューに必要な事実と未確定事項に限定する。

## Definition of Done

- Repository Map、Curriculum Evidence、Test Strategy / Perspective Evidence、Technical Debt Evidence、Traceability Matrix、Confirmed Mismatch / Gap、Open Questions、Next Review Inputsを報告できる。
- 主要主張がRepository Evidenceへ追跡可能である。
- 実装・修正・新規Report・Git操作を行っていない。
- `TASKS.md` / `REPORT.md` / `run.json`を更新し、Run Artifact SanitizerがPASSする。

## Risks / Unknowns

- Repositoryが大規模なため、全test caseを逐語的に列挙せず、機械的inventoryと代表Traceを組み合わせる。網羅範囲と概算方法を明示する。
- 最近のRun / Planには当時の未完了・旧保証が含まれる。Current code / workflow / ADRと照合し、historical Evidenceとしてラベル付けする。
- 実Runtimeを操作しないため、Current observed UI behaviorは保存済みEvidenceとtest contractまでに限定される。未実測事項は`QUESTION`または不足情報として残す。

## Thinking Log

- 2026-08-23 22:51 JST: `feature-plan`はrepo mappingと調査の非目標・検証定義に限定して使用する。修正Planと`docs/plans/`保存はユーザー禁止事項のため適用しない。
- 2026-08-23 22:51 JST: `scripts/new-run.ps1`は失敗時のcommand-based deletionを含むため使用せず、Working Agreementが許可する手動初期化を選択した。
- 2026-08-23 22:51 JST: Workflow Levelは、複数領域にまたがるdurable auditであるためStandardとする。Product / Test / docs / CI / configはread-onlyで扱う。
- 2026-08-23 23:05 JST: Phase 0の機械InventoryとPhase 1の全Lesson／Rubric／Validator／Training asset追跡を完了した。Required 22文書の境界は一貫する一方、LessonからCompetency・BR/AC・提出物・Validatorへの明示Traceは部分的という仮説へ更新した。
- 2026-08-23 23:13 JST: Phase 2とPhase 3を完了した。現行Test／CIはFormal StrategyのPhase 1表より広く、Native・Training・Platform parity・Static operational contractを含む。Hotspotは行数に加え責務、transaction、route/testID、CI job、最近のRun参照を用いて分類し、分割要否は判断しない。
- 2026-08-23 23:18 JST: Phase 4の双方向Cross-checkを完了した。代表MatrixはStorefront、Cart、Checkout／Payment、Auth／Role、Inventory／Order／Review、Accessibility／Mobile、Native保証、CI／Maintainabilityを対象とし、Curriculum-only technique、Formal-only operational contract、Product behaviorの教材薄さを分離した。
