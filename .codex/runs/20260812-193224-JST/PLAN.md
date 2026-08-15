# Plan

## Objective

- （今回の指示を達成する）

## Scope

- In:
- Out:

## Assumptions

- （不明点があれば明示）

## Questions / Ambiguity

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses

- H1:
- H2:

## Research Plan

- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 満たしたら完了とする条件

## Risks / Unknowns

- リスクと対策

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
# PLAN

## 目的

`docs/plans/2026-08-10_132200_screen-catalog-visual-specification.md` のWave 0〜10をCurrent Repositoryへrebaselineし、Screen CatalogからNormative Screen Contract、typed Capture Registry、Canonical Visual、Markdown / Generated HTML、Validator、Android CIまでを一つの自己完結した変更として実装する。

## Current understanding

- 専用ブランチは `feat/implement-screen-catalog-visual-specification`。既存worktreeの境界を維持して継続する。
- Current logical route familyは38件で、Planの初期値と一致する。platform variant、dynamic route、Native current UI、Test-onlyを分類してCatalogへ反映する。旧route inventoryの後半Native placeholder記録はCurrent source scanで更新する。
- `docs/spec/` はBR/ACとFeature Grammarまでで、Screen Contract / Visual Reference / visual validatorは未実装。
- UI Reviewは4 viewportとScenario/ready/capture setupを既に持つため、実行経路を再利用する。
- `sharp`は既存devDependency。Static HTMLは画像placeholder、asset copyなし。
- Native CIは既存Android runtime / Maestroを持つが、canonical visual capture dispatch inputは未接続。

## 方針 / Non-goals

- Normative Product SpecをExpected Behaviorの唯一のSSOTとし、Catalogはindex、Registryは実行metadata、ScreenshotはNon-normative Referenceに限定する。
- Native Admin、iOS Runtime、Product Fix、UI redesign、新Screenshot DB / Route DB / hash manifest /外部Visual SaaSは対象外。
- 他worktree参照・コピー、Git mutation、既存Run削除は行わない。

## Wave / DoD

1. [x] Wave 0/1: route、scenario、UI Review、Native CIを再走査し、38 Screenのclass/platform/owner/countを確定する。
2. [x] Wave 2/3: Screen Catalog、Screen-owning Spec、Important State grammar、ownerless/cross-cutting禁止を実装する。
3. [x] Wave 4/5: typed Capture Registry、既存UI Review接続、Web capture、WebP promotion、asset budgetを実装する。
4. [x] Wave 6: Android canonical profile、manifest digest契約、既存Native CI dispatch capture branchを実装・検証する。ただしlocal canonical captureはbuild blockerで未完了。
5. [x] Wave 7/8: Markdown actual image / safe copy、4-way validator、spec入口/HTML/build/contract testを接続する。
6. [ ] Wave 9/10: Web/Android backfill、human/self review、全Validation、sanitizer、release marker、最終DoD判定を行う。Web/self-review/sanitizer準備は完了したが、Android backfill、format baseline、release marker条件が未完了。

## 仮説

- H1: 既存UI Reviewのroute setupとScenario resetをmetadataへ接続すれば、第二のcapture harnessを作らずにWeb canonical captureを再現できる。
- H2: CatalogのPrimary specificationからowner setをderiveし、Specの固定SCREEN grammarをValidatorが走査すれば、cross-cutting Screen Stateの複製をfail-closeできる。
- H3: Android raw manifestにcapture case / source SHA / APK SHA-256 / profileを要求すれば、profileだけが一致するstale artifactをpromotionできない。

## 検証・完了判定

- `format:check`、Markdown lint、spec validation/build、lint、typecheck、contract tests、Web UI Review/regression、Android required validation、`pnpm run verify`を実行する。
- 未実行・blockedをPASSへ昇格しない。Required Android targetまたはProduct Fix依存が残ればDoDはBLOCKED。

## 最終ステータス

- 判定: BLOCKED（実装は大部分完了したが、PlanのDefinition of Doneは未達）。
- 必須未完了: Canonical API34 Android targetのcapture/promotion（local Release build blocker）、checkout processingのProduct Fix依存、全体format baselineの解消。
- 実行済み: Web canonical 68 assets、Spec validator/build、contract tests、lint/typecheck、full test、Web UI Review、Native doctor、Native CI dispatch契約。
