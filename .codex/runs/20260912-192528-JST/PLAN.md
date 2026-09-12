# Plan

## Objective

既存のcanonical `all` Result schema 2を、PR2のdescription変更前baselineとして保存・parse・compare可能な状態へ収束する。

## Scope

- In:
  - 指定されたcanonical JSONの存在・内容・dataset fingerprint確認
  - 現在のdataset validation、`parseComparableRun()`、`compareRuns()`による保存済みJSONの検証
  - closure Run配下へのJSON snapshot、REPORT、evaluationの保存
  - Sanitizer／Prettier／Markdown lint／strict collector／`git diff --check`
  - PR本文の現在状態更新、origin/mainとの通常merge、指定品質ゲート、commit／push／CI確認
- Out:
  - canonical／qualification／diagnosticの再実行
  - source、test、dataset、query、Skill description、ADR、runner、observer、evaluator、timeout、Result schemaの変更
  - provenance拡張、playwright特例、Android telemetry修正、rebase、force push、PR merge／close

## Assumptions

- baseline原本が存在し、指定された24ケース・集計・provenanceと一致する場合のみ継続する。
- strict 8/8 observabilityはPR2完了条件ではなく、7/8の既知制約として記録する。
- snapshotは原本の内容を手編集せず、SHA256一致を必須とする。

## Execution Decisions

- `docs/plans/*.md`は新規作成しない。既存のprovenance remediation Planは後続候補として保持する。
- `playwright`のunknown Skill、Android 2件のSkill metric gap、20/24 timeoutはbaselineの既知制約として保存し、今回修正しない。
- origin/mainとのmerge後にrouting意味変更が見つかった場合は、canonicalを再実行せず、baselineの適用範囲をREPORT／PRへ明記して停止する。

## Definition of Done

- 指定canonical原本が検証済みで、closure Runのtracked snapshotとSHA256一致する。
- snapshotを現行の`parseComparableRun()`で読め、同一JSONのself-compareが24 casesで期待値になる。
- REPORTにPR2の7条件、既知制約、保留Plan、厳密observabilityの区別を記録する。
- validation／sanitizer／collectorが成功し、変更はRun artifactと必要なPR本文に限定される。
- 指定branchへcommit／pushし、PRをOPENのままCI最終状態を確認する。

## Thinking Log

- 2026-09-12 JST: 8/8をbaseline存在条件にせず、既存canonical 24件を測定結果として保存する方針を確定。
