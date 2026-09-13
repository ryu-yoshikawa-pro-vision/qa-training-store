# Plan

## Objective

- diagnostic scriptのtop-level `await`を除去し、CJS互換で実行可能な状態を確認してから、unknown_skill対象3ケースを各1回実行する。

## Scope

- In:
  - 前回Git管理外scriptの新規artifactコピーを`async function main()`形式へ修正する。
  - `--dry-run`でdataset、case一意性、fresh Target、output directoryだけを検証する。
  - 固定したscriptで指定3ケースを順序どおり各1回実行し、stdout／stderr／process lifecycle／OTel実値をraw artifactへ保存する。
  - Run Artifact、evaluation、PR本文、CI状態を同期する。
- Out:
  - tracked source／test／dataset／query／Skill／package設定の変更。
  - canonical `all`、Qualification、8/8、valid baseline、merge conflict解消、rebase、force push、PR merge。

## Assumptions

- 現在のbranchとPR headが開始時の想定どおりであれば、そのHEADをdiagnostic evaluator snapshotとして採用する。
- `codex --version`が`codex-cli 0.153.4`で、fresh Target preflightが既存runnerの契約を満たす場合だけruntimeへ進む。
- dry-run PASS後はscriptを変更せず、case実行中にscript不具合が見つかった場合は本Runを停止する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（対象、順序、timeout、変更範囲、停止条件が明示済み）。
- 仮定してよい細部: raw artifactのファイル名は前回scriptの構造を踏襲し、必要なqueryはdatasetから読み込む。
- 未回答の重要質問: なし。

## Hypotheses

- H1: top-level `await`を`void main().catch(...)`へ移せば、既存`tsx` CJS出力でscriptを起動できる。
- H2: OTel observerの既存diagnostic fieldsから`skill_values`、`status_values`、`invoke_types`、`plugin_ids`を再実装なしで取得できる。

## Research Plan

- Round 1 Query: 開始状態、前回Run、既存export、source差分、Codex versionを確認する。
- Round 2 Query: 新規scriptのdry-run、hash固定、fresh Target preflight後に、3ケースを各1回だけ実行する。
- Exit Criteria:
  - dry-runと3ケースの実行結果・process lifecycle・OTel collection・unobservable reasonがraw artifactにある。
  - Run Artifactのschema、format、lint、sanitizer、collector、diff検証が完了し、valid baselineは未取得として明記される。

## Approach

- 新規Runを作成し、前回raw evidenceを変更せずに保全する。
- 前回scriptの新規コピーへ最小修正とsafe arguments（`--case-id`、`--target-root`、`--output-dir`、`--dry-run`）を加え、dry-runをcase起動なしで実行する。
- 固定hashを記録し、fresh TargetをRouting SHAへdetachしてpreflightする。
- datasetからqueryを取得し、既存のobserver／runner exportとWindowsの`codex.cmd`／`cmd.exe`境界を使って固定順序で1回ずつ実行する。
- 値を分類・正規化せず、Run／evaluation／PRへ事実として記録する。

## Definition of Done

- 新規scriptがCJS互換でdry-run PASSし、script SHA256が固定・記録されている。
- 3ケースが各1回（合計3回）実行され、指定されたOTel／process fieldsが保存されている。
- tracked変更がRun Artifactだけで、raw evidenceが`.artifacts/**`に限定されている。
- `evaluation.json`、sanitizer、strict collector、その他指定validationがPASSし、PRへ追記してnon-force push後のCI状態を確認している。
- Qualification、canonical `all`、8/8、valid baseline、merge conflict解消は未実行・未取得のままである。

## Risks / Unknowns

- case timeoutは診断結果として受け入れ、retryしない。
- OTel値が空、unknown、別名、errorでも変換せず保存する。
- process起動後にscript自体の不具合が判明した場合は、同一Runで修正・再実行せず停止する。

## Thinking Log

- 2026-09-12 JST: 前回停止はcase開始前のCJS変換失敗だったため、新規Run・新規script・新規fresh Targetでのみ再開する。tracked sourceはfreezeする。
