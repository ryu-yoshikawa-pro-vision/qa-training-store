# Trigger Eval Windows argv検証・Qualification計画

## 0. 依頼概要

- 依頼内容: PR #127のWindows `Node → cmd.exe → codex.cmd → -c config` argv境界を検証し、固定条件でTrigger Eval Qualificationを実行する。
- 背景: 前回QualificationではOTel設定のdouble quoteがWindows shell境界で失われ、Codexが`unknown variant {otlp-http=...}`で終了した。現head `3140873`ではTOML literal stringとWindows argv contract testが追加済み。
- 期待成果: argv回帰、focused／repository／static検証、fresh Target preflight、Negative 1回、条件付きPositive／canonical `all`、8/8、valid baseline判定、Run Artifact／PR本文を実結果へ同期する。

## 1. ゴール / 完了条件

- ゴール: 現headのWindows argv修正を実環境で確認し、固定Evaluator／Routing SHA／Codex versionのQualification結果を観測事実だけで確定する。
- 完了条件（DoD）:
  - `windows-codex-argv.test.ts`がWindowsでskipされずPASSする。
  - focused、repository contract、指定static gateを完了し、dataset fingerprintが`84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`と一致する。
  - `pnpm run verify`を実行し、既知failureと新規failureを分離する。
  - Qualification開始前にEvaluator source SHA、Routing SHA、Codex version、fresh Target isolationを固定する。
  - Negativeを1回だけ実行する。FAIL／unobservableなら即停止し、Positive／canonical／8/8／valid baselineを未実行・未取得と記録する。
  - Negative／PositiveがともにPASSした場合だけEnvironment Qualification PASS、canonical `all`、8/8、valid baselineを判定する。
  - Run Artifactをsanitizer／schema／strict collectorで検証し、PR本文を日本語の実結果へ更新する。

## 2. 現状理解と前提

- Current understanding:
  - branchは`refactor/117-pr2-trigger-eval-baseline`、PR #127はOPEN、base `main`、mergeable `CONFLICTING`、headは`3140873e5095b35072e074101b5da06c68e50b39`。
  - `buildCodexOtelMetricsExporterConfig()`はendpoint／protocolにTOML literal stringを使い、`executeCodex()`は同関数の値を`-c`へ渡す。
  - Windows contract testは`spawnSync("fixture.cmd", ["-c", config], { shell: ComSpec })`で2引数保持を検証する。
  - OTel observerはprimary、Hookはdiagnostic only。OTel failureをHookでPASSへ補完しない。
  - 前回raw evidenceは`.artifacts/trigger-eval-qualification-20260912/`にあり、前回はdouble quote parse failure、OTLP request 0、control missingで停止した。
- Assumptions:
  - Routing SHAは指示どおり`55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、Codexは`codex-cli 0.153.4`を比較条件とする。
  - Qualification用の一時 harnessは`.artifacts/trigger-eval-qualification-20260912-02/`配下に置き、current runnerのconfig生成／observer／evaluator契約をimportする。
  - source変更が必要になった場合はQualification開始前だけ修正し、新implementation commitをEvaluator SHAとして固定する。
- Non-goals:
  - OTel contract、dataset、query、Skill、Hook、Result schema、timeout、依存関係の再設計・変更。
  - Qualification内のretry、query tuning、Target交換、main merge、rebase、force push。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが固定条件、順序、停止条件、変更禁止範囲、完了判定を明示している。
- 仮定してよい細部: 過去raw evidenceのharness形状を踏襲しつつ、current sourceの`buildCodexOtelMetricsExporterConfig()`を使う。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Windows process argv contract testとOTel CLI override。
  - Trigger Eval static / runtime Qualification、Run Artifact、PR本文。
- Files to inspect:
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `scripts/evals/skill-trigger-evals.ts`
  - `scripts/evals/otel-skill-observer.ts`
  - `tests/repository-contract/windows-codex-argv.test.ts`
  - `tests/repository-contract/otel-skill-observer.test.ts`
  - `tests/repository-contract/skill-trigger-evals.test.ts`
  - `package.json`、既存Run、前回raw evidence
- Safe change surface:
  - Qualification開始前のargv実装／testの最小修正、Run Artifact、PR本文。
  - `.artifacts/`のraw evidenceはGit管理外。
- Unknowns:
  - Windows実環境でliteral stringが`cmd.exe`／`codex.cmd`を通過するか。
  - 固定Codex versionがOTLP control／Skill datapointを受信側へ送るか。

## 5. 変更方針

- Change strategy:
  1. remote／branch／PR／HEAD／差分を確認し、current headの実装とtestをread-onlyで再確認する。
  2. 本計画とRun Artifactを保存する。
  3. Windows argv contractを最初に実行する。FAILなら証跡保存・原因分類・Qualification未開始で停止する。
  4. focused tests、repository contract、static gates、dataset fingerprint、`pnpm run verify`を順序どおり実行する。
  5. sourceを固定し、fresh detached Routing TargetのpreflightとCodex versionを確認する。
  6. Negativeを1回だけ実行し、PASS時だけPositive、両方PASS時だけcanonical `all`へ進む。
  7. Run Artifact、evaluation、PR本文を実結果へ同期し、sanitizer／collector／branch safety／CIを確認してpushする。
- 実行タスク:
  - [ ] 1. 現在状態、remote、PR、current head、変更差分、既存evidenceを確認する。
  - [ ] 2. 計画とStrict Run Artifactを保存する。
  - [ ] 3. Windows argv contractを`win32`環境で実行する。
  - [ ] 4. OTel/evaluator focused testsとrepository contract全体を実行する。
  - [ ] 5. format、lint、typecheck、Skill、dataset、diff、verifyを実行する。
  - [ ] 6. Evaluator SHAを固定し、fresh Routing Target／Skill／dataset境界／Git isolationをpreflightする。
  - [ ] 7. Codex versionを固定確認し、Negativeを1回実行する。
  - [ ] 8. Negative PASS時だけPositiveを1回実行し、両方PASS時だけEnvironment QualificationをPASSとする。
  - [ ] 9. Environment Qualification PASS時だけcanonical `all`、8/8、valid baselineを判定する。
  - [ ] 10. Evidence、evaluation、Run Artifact、PR本文を実結果へ同期する。
  - [ ] 11. sanitizer、schema、strict collector、branch safety、push、CIを完了する。

## 6. 検証方法

- Validation plan:
  - Windows: `node -p "process.platform"`、`node --version`、`$env:ComSpec`、指定argv contract。
  - Focused: Windows argv、OTel observer、evaluator testsをsingle workerで実行。
  - Repository: `pnpm run test:repository`。
  - Static: format、lint、typecheck、Skill、dataset validate、fingerprint、`git diff --check`。
  - Standard: `pnpm run verify`。既知のHook launcher timeoutは変更対象外として既存／新規を分類する。
  - Qualification: fresh Target preflight、Codex `0.153.4`、Negative → conditional Positive → conditional canonical。
  - Artifact: evaluation schema、sanitizer Write/Check、strict collector、PR／remote head／CI。
- 成功判定:
  - すべての条件を満たした場合のみ各段階をPASSとする。unobservable、control missing、OTLP request 0、process failure、timeout、unknown／malformed／status異常はFAIL／停止とする。
  - valid baselineはEnvironment Qualification PASS、canonical all完了、fingerprint／case set／SHA／version一致、8/8 observableをすべて満たす場合だけ取得とする。

## 7. リスクと未解決論点

- Risks:
  - shell境界でliteral stringが再び壊れる可能性。argv testをQualification前の最初のゲートにする。
  - Codex version／OTel export failure。request metadataとcontrol summaryをraw evidenceへ保存し、FAIL時に停止する。
  - verifyの既知Hook timeout。前回baselineと変更diffを比較し、OTel関連failureと混同しない。
  - PR remote headが外部更新される可能性。push前にfetch、branch、PR headを再確認し、force pushしない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: Qualification前の最小source/test修正が必要な場合のみ。通常はRun Artifact、PR本文。
- 付随ドキュメント: 本Plan、`.codex/runs/20260912-065418-JST/`、`.artifacts/trigger-eval-qualification-20260912-02/`（rawはGit管理外）。

## 9. 備考

- Qualification開始後はsourceを変更しない。同一Qualification内の修正・retryは禁止。
- merge conflictは今回解消しない。
