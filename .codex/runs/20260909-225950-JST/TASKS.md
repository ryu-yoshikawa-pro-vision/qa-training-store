# Tasks

## Now

- [x] A. 開始時点のbranch、PR、active Run、対象file、承認済みPlanを確認する
- [x] B. pure contractへResult schema 2、initial-only observation、lifecycle、summary、comparisonを実装する
- [x] C. repository contract testを新しい型とdecision tableへ更新する
- [x] D. bounded selector、Hook parse／candidate prefix／absence処理、process lifecycleをrunnerへ実装する
- [x] E. Result生成とcomparison parserをschema 2へ接続する
- [x] F. ADR-0023へ実装済み契約を追補し、scopeと差分を確認する
- [x] G. focused test、dataset validation、Skill／Markdown validationを指定順で実行する
- [x] H. `pnpm run verify`を実行し、FAIL時はfirst anomalyを修正して関連gateを再実行する
- [x] I. fresh independent Targetをpreflightし、Codex／evaluator／routing／dataset provenanceを記録する
- [x] J. 同一TargetでEnvironment Qualification positive／negativeを実行する（negativeのselector不確実性によりQualification FAIL）
- [ ] K. Qualification PASS時だけcanonical `all`を24 case sequential・retryなしで一回実行する
- [ ] L. 8/8 side、Result完全性、comparison前提を確認しvalid baseline可否を判定する
- [x] M. sanitizer／collector、Run／PR／Git evidenceを最終化して完了判定する（Qualification FAILを記録し、canonical／baselineは停止）

## Discovered

- （実装中に発見した追加タスクをここへ追記する）

## Blocked

- Qualification FAIL: negative controlの唯一のPostToolUseが複合PowerShell `Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json` であり、bounded selectorが`unreliable`と判定したため、trusted absence（`observed_skills=[]`）を確定できない。Plan §15.4に従いcanonical `all`、query tuning、retryは実施しない。
