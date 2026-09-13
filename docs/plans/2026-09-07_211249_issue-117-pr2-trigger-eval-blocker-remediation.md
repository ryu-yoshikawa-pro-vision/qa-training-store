# Issue #117 PR2 Trigger Eval blocker remediation 計画

## 0. 依頼概要

- 依頼内容: PR #127 の有効 baseline 取得前に、current Codex Host の Skill read selector drift、24 query の実行可能性、Codex version 条件を是正し、4つの validation と Observation Probe を再実行する。
- 背景: 旧 canonical artifact は `codex-cli 0.153.4` の `pass=1`、`false_negative=1`、`unobservable=22`、8 boundary sides `2/8` であり、valid baseline として不採用である。旧 artifact の provenance と dataset fingerprint は変更しない。
- 期待成果: selector の最小正規化、repository-contract regression test 7種、24 case の self-contained / execution-bounded / single-intent / natural query 監査と必要な修正、更新 fingerprint、current version 固定条件、4 validation、positive/negative Probe、条件成立時の fresh canonical `all` 1回、および PR本文の事実更新。

## 1. ゴール / 完了条件

- ゴール:
  - current Host で実測された次の4形状だけを、同じ Skill read として扱う。
    - `Get-Content -Raw .agents/skills/<skill>/SKILL.md`
    - `Get-Content -Raw '.agents/skills/<skill>/SKILL.md'`
    - `Get-Content -Raw .agents\\skills\\<skill>\\SKILL.md`
    - `Get-Content -Raw -LiteralPath '.agents/skills/<skill>/SKILL.md'`（再確認で追加した完全形）
  - 別file、path mention、search/grep、canonical Skill 以外の読み出しを誤検出しない。
  - 24 query を routing measurement に適した、自己完結・bounded・single-intent・自然な依頼へ監査する。
  - measurement / Probe / canonical で `codex-cli 0.153.4` を同一にする。Repository独自のversion managerは追加しない。timeout `327_000ms` は今回再変更しない。
- 完了条件（DoD）:
  - selector regression 7種以上を repository-contract test へ追加し、runnerが同じ pure selector logicを使用する。
  - 24/24 caseを表形式で再manual reviewし、欠陥、変更理由、変更有無をRun Artifactへ記録する。
  - dataset fingerprintを再生成し、旧 `283cb4d...` artifactを旧fingerprintのinvalid evidenceとして保持する。
  - `pnpm run eval:skills:trigger:validate`、`pnpm run test:repository`、`pnpm run validate:skills`、`pnpm run verify` がすべてPASSする。
  - selectorと同じlogicで positive は Skill read 1件以上、negative は canonical Skill read 0件を確定できる Probeを `codex-cli 0.153.4` で完了する。
  - version、latest main、routing source SHA、Target clean、answer-key-free、trust、Probe、selector shape、fingerprint の直前条件を再確認する。
  - 上記条件成立後のみ、fresh `all` / 24 cases / sequential / retryなしを1回実行する。validity、8-side coverage、provenanceを判定し、失敗なら部分結果をvalid baselineへ昇格しない。
  - PR本文を `timeout=327秒`、`canonical result=invalid`、`observable=2/24`、`8 boundary sides=2/8`、`pass=1`、`false_negative=1`、`unobservable=22`、`Codex=0.153.4` の現状へ更新する。ただし新しいcanonicalが成立した場合は、その事実を優先して本文を更新する。

## 2. 現状理解と前提

- Current understanding:
  - branch は `refactor/117-pr2-trigger-eval-baseline`、PR #127 は `OPEN`、base は `main`、現HEADは `91dea5e`。
  - `scripts/evals/run-skill-trigger-evals.ts` の selector は `Get-Content -Raw .agents/skills/<skill>/SKILL.md` の一形状に完全一致している。
  - current Host の保存Hookには forward-slash / unquoted、forward-slash / single-quoted、backslash / unquoted の実測がある。
  - 旧 canonical artifact は全24 caseを保存しているが、8-side coverage不足と version drift のため invalid evidence である。
  - 旧 timeout measurement は `0.153.0`、旧 canonical は `0.153.4` であり、同一version条件を満たしていない。
- Assumptions:
  - 現在PATH上の `codex-cli 0.153.4` を、既存環境での最小の固定手段として measurement / Probe / canonical の全工程に使う。
  - queryは各caseの routing boundary を保ち、expected Skill名や評価labelを直接要求しない。
  - Target上で対象pathが読めることを前提にしても、query内の対象、入力、完了条件は一意に記述する。
- Non-goals:
  - timeoutを600秒等へ再変更すること。
  - queryを人工的な分類問題へ単純化すること、expected labelを漏らすこと、過去invalid resultを良く見せること。
  - scoring、`[]` / `null`、coverage、Hook correlation、process lifecycle、Skill description、AGENTS.mdのrouting意味契約を変更すること。
  - Product code、training content、依存、Codex本体、独自version manager、retry/parallel frameworkを変更すること。
  - 旧artifactを上書き・削除すること。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが対象branch、allowed change、validation、canonical実行条件、PR本文の最低限の事実を指定済み。
- 仮定してよい細部:
  - selectorの純粋なcommand判定をrunnerからexportし、repository-contract testから直接検証する。
  - query修正はrouting boundary維持に必要なケースだけ行い、各変更をmanual review表へ記録する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Hook observation selector（純粋な入力正規化と既存選択処理の接続）。
  - 12 YAML / 24 case の Trigger Eval dataset と fingerprint。
  - repository-contract test。
  - active Run `20260906-191724-JST` の PLAN/TASKS/REPORT/evaluation（既存invalid evidenceは保持）。
  - PR #127本文。
- Files to inspect:
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `scripts/evals/skill-trigger-evals.ts`
  - `tests/repository-contract/skill-trigger-evals.test.ts`
  - `.agents/skills/*/evals/trigger/{train,validation}.yaml`
  - `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
  - `.codex/runs/20260906-191724-JST/{PLAN,TASKS,REPORT,evaluation,trigger-eval-baseline}.json`

## 5. 変更方針

- Change strategy:
  1. current Host shape、current `codex --version`、Target/PR/branchをread-only確認し、旧invalid provenanceを固定する。
  2. selectorを、コマンド全体の形状を確認した上で path slash 差と測定済みsingle quote差だけ正規化する pure functionへ最小変更する。自由なPowerShell parser、substring判定、grep判定は追加しない。
  3. 7種類のpositive/negative selector regression testを追加する。
  4. 24 queryをA Self-contained、B Execution-bounded、C Single-intent、D Natural queryで全件reviewし、欠陥を修正する。各caseの変更理由とfingerprintをRunへ記録する。
  5. 4 validationを指定順に実行し、失敗時は最初の異常だけを修正して同じgateを再実行する。無目的なcanonical retryはしない。
  6. current versionを再確認し、同じselector logicを使う positive/negative Probeを実行する。必要ならtimeout判断のためのpositive measurementを同一versionで1回実施するが、`327_000ms`は変更しない。
  7. canonical直前条件を確認し、成立時だけfresh `all`を1回実行する。
  8. artifactをsanitizeし、source変更とinvalid/new resultを別commitへ分け、明示refspecでpushしてPR本文を更新する。
- 実行タスク:
  - [ ] 1. current Host selector shape、version、PR/branch、旧invalid artifact provenanceを固定する。
  - [ ] 2. selector pure logicと7種regression testを実装する。
  - [ ] 3. 24 queryを全件監査し、欠陥queryを自然なbounded queryへ修正する。
  - [ ] 4. 4 validation、fingerprint、scope、sanitizationを確認する。
  - [ ] 5. 同一versionのmeasurement/Observation Probeを完了する。
  - [ ] 6. canonical直前条件を確認し、fresh `all`を1回だけ実行する。
  - [ ] 7. Run Artifact、source/evaluator SHA、PR本文、commit/pushを確定する。

## 6. 検証方法

- Validation plan:
  - `pnpm run eval:skills:trigger:validate`
  - `pnpm run test:repository`
  - `pnpm run validate:skills`
  - `pnpm run verify`
  - selector unit/contract tests: 3 accepted shapes + 4 rejected shapes。
  - positive/negative Observation Probe: runnerのselector pure logicで positive Skill read `>=1`、negative canonical Skill read `0`。
  - version evidence: `codex --version` が全工程で `codex-cli 0.153.4`。
  - canonical evidence: 24 results、8-side coverage、summary、provenance、dataset fingerprint、evaluator/routing SHA。
- 成功判定:
  - 4 validationとProbeがPASSし、selectorのfalse positive/negative testがPASSする。
  - canonicalが全24 caseをterminalまで観測し8/8 sideならvalid baseline、それ以外はinvalid evidenceとして停止する。
  - invalidの場合でも、旧artifactと新artifactをprovenance/fingerprintで区別し、case retryや部分結果の混在をしない。

## 7. リスクと未解決論点

- Risks:
  - queryを短くしすぎると routing boundary が薄くなるため、対象path・入力・完了条件を一意にしつつ、skill名やexpected labelは出さない。
  - backslash normalizationを広げすぎると一般shell parser化するため、受け入れ形状を明示的な3形状に限定する。
  - `codex-cli 0.153.4`でもHost latencyが327秒を超える可能性がある。その場合は結果をinvalidとして保存し、timeoutを再変更しない。
  - canonicalは長時間実行になるため、PTY切断に依存しないbackground方式を使用し、全case完了前の部分artifactを採用しない。
- Open questions:
  - なし。新たな要件判断が必要なdataset defectが見つかった場合は、実装を止めずに変更理由をRunへ記録できる範囲で最小修正し、判断不能なら `needs_human` へ停止する。

## 8. 成果物

- 変更ファイル:
  - 本計画書
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `tests/repository-contract/skill-trigger-evals.test.ts`
  - 欠陥と判定された Trigger Eval YAML
  - 必要なRun Artifact / active Run記録
- 付随ドキュメント:
  - selector/dataset audit checkpoint
  - current/new fingerprint、旧invalid artifactのprovenance記録
  - PR #127本文の日本語更新

## 9. 備考

- 旧artifact `.codex/runs/20260906-191724-JST/trigger-eval-baseline.json` は削除・上書き・valid baselineへの再利用をしない。
- canonical `all`は本計画の validation / Probe / version /直前条件が成立するまで禁止する。
