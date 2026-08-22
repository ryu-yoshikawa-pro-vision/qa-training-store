# Plan

## Objective

- PR #42の再レビュー後に残る、Native Catalog Component TestのReact `act()`警告とRun Artifactの監査性だけを最小修正する。

## Scope

- In:
  - `tests/component/native/native-catalog-screen.test.tsx`の非同期イベント待機をRNTL 14契約へ合わせる。
  - `.codex/runs/20260822-150117-JST/REPORT.md`と`.codex/runs/20260822-194304-JST/REPORT.md`へappend-onlyの末尾訂正を追記する。
  - CodeRabbit既存thread、PR/CI状態のread-only再確認とfocused validation。
- Out:
  - Product code、Expo依存、lockfile、CI設定、CodeRabbit thread操作、PR merge。
  - Search/SQLite設計の再変更、timeout/sleep、console警告抑制。

## Assumptions

- RNTL `14.0.1`では`render`、`fireEvent`、`userEvent`がasyncであり、操作をawaitすることがwarning解消の最小根因修正である。
- Deferred PromiseによるSearch/Suggestion raceの順序制御とassertionは維持する。
- 旧REPORTは既存ブロックを変更せず、指定されたファイル末尾への追記だけを行う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象ファイル、禁止事項、validationは依頼で確定している。
- 仮定してよい細部: wall-clock timestampに確信がない修復Runの順序は、既存Run ID・artifact記録を正本として記載する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 未awaitの`fireEvent.changeText`がRNTL内部のasync `act()`をテストの次操作と重ね、`overlapping act()`と未設定warningを発生させている。
- H2: H1修正後もwarningが残る場合のみ、Deferred helperと手動`act()`の境界を最小変更する。H1で消えた場合はhelperを変更しない。

## Research Plan

- Round 1 Query: 現HEAD、PR/CI、CodeRabbit comments、両REPORT末尾、RNTL version、対象testのstderrを確認する。
- Round 2 Query: H1を対象testの未awaitイベントへ最小適用し、7 testsとwarning scanを実行する。
- Exit Criteria:
  - 対象suiteが全件PASSし、stdout/stderrに指定されたact warningがない。
  - stale Search、stale Suggestion、2文字未満invalidatingのDeferred scenarioが残る。
  - Product sourceの差分がない。
  - 両REPORTの既存内容を変更せず、実際の末尾へ訂正を追記する。

## Approach

- review findingをmust-fix / reject / deferへ分類し、対象testだけを修正する。
- focused component、関連component、前回修正面のcontract、静的gateを実行する。
- REPORT追記後にMarkdown、JSON、evaluation schema、sanitizer、絶対path残存を検証し、diffをself-reviewする。
- 標準フロー: `PLAN -> TASKS -> 最小修正 -> focused validation -> artifact validation -> commit/push`

## Definition of Done

- `native-catalog-screen.test.tsx`の最新全件がPASSし、同suite由来のact warningが0件。
- Product code変更がなく、race testとinvalidating testの意図が維持される。
- 旧Run REPORTの最終訂正とrepair REPORTのCanonical execution orderがそれぞれ物理的な末尾に存在する。
- PR #42はOPEN/未merge、Expo Doctor mismatchは別PR要因として記録される。
- 変更をnormal commit/pushし、作業ツリーとremote HEADを確認する。

## Risks / Unknowns

- RNTL warningが既存setup由来で対象testに残る可能性がある。その場合は全Native suiteへscope拡大せず、根拠をREPORTへ記録する。
- CodeRabbitのreviewDecisionは旧threadが未resolveのまま残る可能性がある。thread操作はせず、findingごとのCurrent statusとEvidenceを報告する。
- 最新CIはExpo Doctorの既知mismatchでrollupがFAILする可能性がある。package/lockfile/CIを変更せず、他jobと分離して記録する。

## Thinking Log

- 2026-08-22 22:36 JST: 初期確認で対象suiteに7/7 PASSと`not configured to support act`、複数の`overlapping act()`を再現した。RNTL 14.0.1のmigration guideと現行コードを照合し、未awaitの`fireEvent.changeText`を第一仮説とした。
- 2026-08-22 22:36 JST: CodeRabbitの6件は前回修正済み5件とfalse positive 1件であり、今回の新規must-fixはテストwarningのみ。Product sourceはallowed scope外とした。
