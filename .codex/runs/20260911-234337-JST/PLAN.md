# Plan（PR #127 OTel Trigger Eval observer実装・Qualification）

## 0. 依頼概要

- 依頼内容: 正本Planに従い、Trigger Evalのrouting観測をHookのshell表記解析からOTel `codex.skill.injected` 主観測へ移行する。
- 背景: Hostが生成するPowerShell／shellの表記差に依存せず、Codex自身のSkill injection telemetryでsingle-intent routingを評価する。
- 期待成果: case-local OTel receiver、厳格なmetric検証、既存Result schema 2との統合、回帰テスト、ADR、固定SHAのfresh Target Qualificationを完了する。

## 1. ゴール / 完了条件

- ゴール: 正本Planのcollection window、liveness control、observer-common、非scoring Hook方針を実装し、Negative → Positive → canonical allの順でQualificationする。
- 完了条件（DoD）:
  - `scripts/evals/otel-skill-observer.ts` がNode標準HTTP APIだけで `127.0.0.1:0` receiver、OTLP JSON、metric schema、control、Skill集合、reliabilityを処理する。
  - `run-skill-trigger-evals.ts` がcase-local実portをprocess-local overrideへ渡し、child close起算のquiet/hard-cap契約を実行する。
  - `skill-trigger-evals.ts` がOTel observer-common信号を受け、outcomeは既存 `scoreInitialRouting` に一元化する。Result schema 2は維持する。
  - OTel primary、Hookはlegacy／diagnostic only、unknown／malformed／control欠落はfail-close、`invoke_type`／`plugin_id`は診断専用であることをテストする。
  - 実装・テスト・静的検証後にEvaluator source SHAを固定し、fresh Routing TargetでNegative 1回、PASS時のみPositive 1回、両方PASS時のみcanonical all 1回を実行する。
  - Qualification停止条件では実装を変更・再実行せず、raw evidenceとRun Artifactへ記録する。

## 2. 現状理解と前提

- Current understanding:
  - 現在のrunnerはHook JSONLのselectorを `ObservationSignals` へ変換し、`deriveRoutingObservation` と `scoreInitialRouting` でResult schema 2を生成する。
  - 正本Planは `codex.thread.started` をOTel liveness control、`codex.skill.injected` をrouting evidenceと定義し、collection値をquiet 1,000ms／hard cap 5,000msへ固定している。
  - 既存の保存済みprobeではExplicit／Negativeのrequest body SHAがreceiver eventと一致し、Plan-only RunのCIは確認時点でPASS済み。既存Negative Qualification FAILは今回の実装で再評価する。
- Assumptions:
  - Codex CLIのprocess-local `-c` override形式と `--ephemeral` は保存済みprobe／正本Planの形式を再利用する。
  - `meta.finished_at`相当のchild closeをrunnerのclose eventとして取得し、`turn.completed`はterminal判定だけに使う。
  - 新しいobserverの内部型はResult schemaへ直接露出させず、既存のunobservable reason／lifecycleへ変換する。
- Non-goals:
  - tracked `.codex/config.toml`、Hook、dataset／query／Skill、Product source、Result schema、既存Run／raw artifactの変更。
  - OTel SDK／collector package／新dependency、固定port、port retry、shared receiver、一般PowerShell parser。
  - Qualification failure後の同一条件retry、query tuning、rebase、merge、force push、外部review再起動。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象ファイル、契約、Qualification順序、停止条件、port／timer値はユーザー指示と正本Planで確定している。
- 仮定してよい細部: internal observer-commonの型名、diagnostic detailの保持場所、fake timerのテスト構成は既存repoのTypeScript／Vitest慣行に合わせる。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: OTel receiver／metric parser、case execution lifecycle、routing observation conversion、unit／contract tests、ADR、Run／PR記録、fresh Target Qualification。
- Files to inspect/change:
  - `scripts/evals/otel-skill-observer.ts`（新規）
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `scripts/evals/skill-trigger-evals.ts`
  - `tests/repository-contract/otel-skill-observer.test.ts`（新規）
  - `tests/repository-contract/skill-trigger-evals.test.ts`
  - `docs/plans/2026-09-11_092746_trigger-eval-otel-observation-contract.md`（44ms／956ms／約22.7倍の事実補正のみ）
  - `docs/adr/0024-trigger-eval-otel-observation-contract.md`（新規）
  - `.codex/runs/20260911-234337-JST/**` とPR本文

## 5. 変更方針

- Change strategy:
  1. Planの事実誤記を1文だけ補正し、observer／runner／evaluatorの責務を再確認する。
  2. receiverをcaseごとにOS割当portへbindし、HTTP 2xx／JSON／metric schema／control／Skill canonical setを収集する。
  3. runnerのchild lifecycleとbounded collection windowをobserverへ渡し、OTel reliable／unobservableをobserver-commonへ変換する。
  4. evaluatorではsource別のrouting observationを扱うが、outcome／boundary／schema／comparisonは既存経路と `scoreInitialRouting`へ残す。
  5. control欠落、unknown、malformed、duplicate canonical、Hook fallback禁止、outcome mapping、diagnostic-only fieldsをテストする。
  6. lint／typecheck／focused test／verifyを実行し、source SHA固定後にfresh Target Qualificationを順序どおり実行する。
- 実行タスク:
  - [x] 1. 正本Planの44ms／956ms／約22.7倍を補正し、既存契約との差分を確定する。
  - [x] 2. OTel observerとcollection lifecycleを実装する。
  - [x] 3. runner／evaluatorへOTel primaryとobserver-commonを統合する。
  - [x] 4. observer／evaluator／runnerの回帰テストを追加・更新する。
  - [x] 5. ADR、静的検証、focused test、full quality gateを完了する（full verifyは既存Windows launcher timeoutを除きPASS）。
  - [x] 6. Evaluator source SHAを固定し、fresh Target preflightを記録する。
  - [x] 7. Negative → Positive → canonical allを停止条件付きでQualificationする（NegativeのOTel export config parse errorで停止）。
  - [x] 8. Run Artifact、PR、commit、non-force push、最終状態を確定する。

## 6. 検証方法

- Validation plan:
  - observer unit／repository contract: valid control、trusted absence、malformed／unknown／status異常、duplicate、multiple canonical、HTTP／port／quiet／hard cap。
  - evaluator contract: OTel reliable／unreliable、Hook failure併存、Hook scoring fallback禁止、pass／false_negative／sibling_misroute／unexpected_trigger、diagnostic fields不変。
  - repository gate: targeted Prettier、`git diff --check`、TypeScript／Vitest focused tests、`pnpm run verify`または該当quality gate、artifact sanitizer／strict collector。
  - Qualification: source SHA固定、fresh Target隔離、Negative 1回 → PASS時のみPositive 1回 → 両方PASS時のみcanonical all 1回。各段階でraw evidenceを`.artifacts`へ保存する。
- 成功判定: OTel livenessとSkill metricが契約どおりfail-closeし、既存Result schema 2と8-side comparison契約を壊さず、全指定gate PASS、Qualification順序と停止条件を満たす。

## 7. リスクと未解決論点

- Risks:
  - Codexがcaseごとに複数batch requestを送るため、quiet reset／hard capを誤るとabsenceが早期確定する。close後のrequestだけでtimerを管理し、hard capはunobservableへ倒す。
  - positive identity後のtimeoutとEnvironment Qualification completionを混同すると、routing outcomeを失う。routing outcomeとlifecycle／Qualificationを分離する。
  - Hookをscoring fallbackにすると、OTel failureをNegative PASSへ変換する。新OTel runではHook failure併存時もunobservableを維持する。
  - fresh TargetやGit SHAの取り違えは結果の再現性を壊す。preflightとResult provenanceを二重確認する。
- Open questions: なし。外部CIやCodex runtimeの未確定状態は実行時のRun Artifactへ記録し、推測で補完しない。

## 8. 成果物

- 変更ファイル: 上記の許可されたsource／test／Plan補正／ADR／新Run Artifact／PR本文のみ。
- 付随ドキュメント: `.codex/runs/20260911-234337-JST/`、`.artifacts/`配下のraw qualification evidence（Git管理外）。

## 9. 備考

- 実装前のreview修正は既存Planで完了済み。今回の実装Runはその契約を実コードとQualificationへ移す。
- repair-loopは validation failure が出た場合に限り、許可ファイルを固定したbounded iterationとして適用する。
- Thinking logはTASK完了・重要判断・停止条件のcheckpointでREPORTへ追記する。

## 10. Runtime outcome

- Evaluator source SHA `6cd374d3d7ef505debf42074ce7fb210b6454f59`を固定し、fresh detached Target／Routing SHA `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`のpreflightをPASSした。
- Negative固定queryを1回だけ実行した。Windowsのshell経由でprocess-local `-c` override内のOTLP config quoteが失われ、Codexが`unknown variant {otlp-http=...}`でexit `1`となった。OTLP requestは0、controlは欠落し、Resultは`unobservable`／`process_failure`となった。
- これはOTel export failure／control欠落のQualification停止条件に該当するため、Positive、Environment Qualification PASS、canonical、8/8、valid baselineは未実行・未取得とする。同Runでsource修正・retryを行わない。
