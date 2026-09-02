# Plan

## Objective

- PR #88 merge後のCurrent sourceを正本として、`CT-BOUNDARY-001` の8 Requirementをゼロベース再監査する。
- Current Formal evidenceが8件すべてを説明できる場合だけTraceabilityのDispositionを`stop`から`bounded-multi-ref`へ更新し、PR #78の既存branchへ反映する。

## Scope

- In:
  - Requirement本文、Current Decision、Product implementation、Current Formal assertion / executable evidenceの順序で、`FR-AR-001`〜`FR-AR-004`、`NFR-MA-020`〜`NFR-MA-023`を監査する。
  - `docs/12_quality/requirements_traceability.md`の対象rowとLower Traceability集計を、実在するCurrent evidenceへ最小更新する。
  - `.codex/runs/20260902-232609-JST/` のPLAN／TASKS／REPORT／machine-managed manifestを保存する。
  - 指定validation、branch safety確認、commit、明示refspec push、push後read-only確認を行う。
- Out:
  - Product code、Formal Test、Requirement、Decision、workflow、package、Playwright configの変更。
  - 新しいPlan、過去Runの変更、PR本文の変更、merge／auto-merge。

## Assumptions

- `origin/main`が指すcommitをCurrent sourceの正本とし、開始時にbranchがその祖先を含むことを確認する。
- 既存Planのtaxonomyとscope制約を維持し、test titleはCurrent repositoryで確認できたものだけ記載する。
- 複数の独立evidenceが必要なRequirementは、対象観点を明示した`bounded-multi-ref`で表現する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（ユーザー指示で目的、許可範囲、停止条件、検証、push先が確定済み）。
- 仮定してよい細部: Runのtask typeはtraceability文書更新を含むため`implementation`、workflow levelは必須artifact／外部pushを含むため`strict`とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: PR #88のCurrent remediationにより、8 RequirementすべてにCurrent Formal evidenceが存在し、`CT-BOUNDARY-001`は`bounded-multi-ref`へ遷移できる。
- H2: PR #88 merge以降、他のLower Traceability rowの既存referenceを壊すCurrent driftはない。
- H3: Product／Formal Testを変更せずに、Traceability rowと集計だけをCurrent evidenceへ同期できる。

## Research Plan

- Round 1 Query: Current branch／origin/main／PR head、正本Plan、Requirements、Decision、対象ProductとFormal testの実在・title・実行契約を確認する。
- Round 2 Query: 8件をRequirement→Decision→Product→Formal evidenceの順に判定し、既存Traceability全rowの参照実在性とlabel数を再確認する。
- Exit Criteria:
  - 8件それぞれにcoveredまたは不足の根拠がある。
  - 1件でもFormal gap、仕様矛盾、指定gate failureがあれば`stop`維持として記録する。
  - coveredの場合は対象row、集計、Run Artifact、指定validation、Git結果が整合する。

## Approach

1. 必須入口文書と直近Runを確認し、Run Artifactを初期化する。
2. Current source／test／config／decisionをread-onlyで調査し、各Requirementを同じ4段階で判定する。
3. 8件すべてcoveredの場合だけTraceabilityの対象rowと実集計を最小編集する。gapなら編集せずstopを記録する。
4. Self-reviewとscope確認後、指定validationを順序に従い実行する。上流failure時は後続を無目的に実行しない。
5. 完了条件を満たした場合にのみcommit／pushし、push後のheadを確認する。

## Definition of Done

- 8 Requirementの監査結果がRun REPORTに、Requirement／authority／Product evidence／Formal evidence／Disposition付きで記録されている。
- `requirements_traceability.md`のCT rowが実在するCurrent evidenceへ接続し、旧stop理由を残していない。
- Lower Traceability 4 labelの実数合計がrow総数と一致する。
- `format:check`、`lint:markdown`、`validate:spec`、`test:contracts`、native gate、Chromium E2E、`verify`、`git diff --check`が指定どおり確認済み、または停止条件の具体的根拠が記録されている。
- 新規差分がallowlist内で、commit／明示refspec push後にbranchとremote headが一致する。

## Risks / Unknowns

- Formal testの存在だけでRequirement全体をcoveredと誤判定するリスク。対策として各testのassertion／実行経路／対象境界を本文とsourceへ照合する。
- 旧stop理由や過大なscope説明を残すリスク。対策として対象rowを再読し、D-032／D-033／D-026とCurrent evidenceを明示的に照合する。
- validationがenvironment-sensitiveに失敗するリスク。最初の異常を確認し、同一条件の無目的な再試行やTest変更をしない。
