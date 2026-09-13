# 修正計画

## Objective

PR #127の最終レビュー指摘に対し、OTel primary評価から不要なHook snapshot filesystem I/Oを除去し、既存Runのmachine-managed状態を正確に確認・記録し、PRタイトル／本文をPR2全体の目的へ戻す。

## Scope

- In:
  - `scripts/evals/run-skill-trigger-evals.ts` のOTel live `evaluateCases()`経路と、完全未使用になるHook snapshot専用コード。
  - 新規repair Run `20260913-085558-JST` のPLAN／TASKS／REPORT／evaluationとmachine-managed manifestのcollector連携。
  - PR #127のタイトル・本文更新。
- Out:
  - 過去Run `20260912-231826-JST` の全ファイル。
  - Trigger Eval baselineの再取得、dataset/query/Skill description/model/timeout/schema/OTel contract変更。
  - `docs/plans/**` の新規作成、PR merge/close/rebase/force push。

## Assumptions

- OTelの `prepareOtelSignals()` と observer contractがscoringの正本であり、Hook snapshot deltaはdiagnostic-onlyの残存コードである。
- `prepareSignals()`、Hook selector/parser、既存 `HookDelta`／`HookEvent` はlegacy compatibilityと既存repository contractのため維持する。
- 過去Runの `run.json` は直接編集せず、collector実行後もstatus／validationが保持されるかを実測して判断する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーが変更範囲、禁止事項、PR更新内容を明示している。
- 仮定してよい細部: Hook snapshot専用定義はlive path以外の参照がない場合のみ削除する。
- 未回答の重要質問: collector以外に過去Runをretroactive finalizeする正式writer経路が存在するかをrepository実装で確認する。

## Hypotheses

- H1: live pathのbefore/after snapshotと`collectHookDelta()`を除去すれば、Hook filesystem I/O failureはOTel observation／scoringを中断できなくなる。
- H2: `collect-run-artifacts` は既存manifestのstatus／validationを保持し、過去Runを再実行なしにcompletedへ変換する正式経路は存在しない。
- H3: PRタイトル／本文の更新はsource commitとは独立したGitHub metadataであり、baseline数値とrun.json制約を明示すれば再レビュー可能な状態になる。

## Research Plan

- Round 1: live pathとHook専用定義の参照関係、OTel／Hook既存テストを確認する。
- Round 2: collector、codex-task／codex-safe、repository contractからretroactive finalize経路の有無を確認する。
- Exit Criteria:
  - H1/H2/H3それぞれに実装または反証の根拠がある。
  - allowed files外の変更がなく、baseline hash／dataset fingerprintが不変である。

## Approach

- bounded repair iteration 1として、調査→最小source修正→focused／repository／required gate検証→Run artifact sanitizer→branch-safe commit/push→PR metadata／latest CI確認を行う。
- OTel observer、scoring、Hook selector/parserの責務は変更しない。
- Run `run.json`はnew-run writerとcollectorの正規経路だけを使用し、手動編集しない。

## Definition of Done

- live `evaluateCases()`からsnapshotHookFiles／collectHookDelta呼び出しを除去。
- 完全未使用のHook snapshot専用定義だけを整理し、Hook selector/parserは維持。
- focused tests、dataset validation、repository gates、verify、diff checkを実行し結果を記録。
- 過去Runを変更せず、new repair Runをsanitizer検証済みで保存。
- PRタイトルを`refactor: Trigger Eval baselineを実装する`へ戻し、本文へOTel修正・run.json制約・baseline事実を反映。
- commit／通常push後、local／remote／PR head一致と最新head CI terminal stateを確認。

## Risks / Unknowns

- Hook専用定義を誤削除するとlegacy selector contractを壊すため、参照検索後に限定する。
- local `pnpm run verify`の既知Hook timeoutが再発する可能性がある。今回sourceとの因果を確認し、同一失敗の無目的再試行はしない。
- PR本文更新後もCIはsource head単位で確認し、旧headの結果を流用しない。

## Thinking Log

- 2026-09-13 JST: 開始時HEADは指定どおり`9c363c2`、branch／PR head一致、PR OPEN／MERGEABLE、working tree clean。過去Runのbaseline hashは指定値で不変。
- 2026-09-13 JST: `snapshotHookFiles`／`collectHookDelta`は`evaluateCases()`のlive pathにのみ残り、Hook selector/parser系は`prepareSignals`と既存testsが利用しているため、後者は削除対象から除外する。
- 2026-09-13 JST: 新規repair Run `20260913-085558-JST`を`new-run.ps1`で初期化。過去Runへ今回の履歴を追記しない。
