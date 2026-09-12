# Tasks

## Now

- [x] 1. 既存Run、canonical result/OTel diagnostic、dataset、provenanceを読み取り専用で確認する。
- [x] 2. `exploratory-qa`側4代表caseと全timeout分類を比較する。
- [x] 3. OTel observer、runner signal変換、evaluator、contract tests、ADR-0024を照合する。
- [x] 4. source defectの証明可否を判定し、証明できないためsource/test修正を行わないと決定する。
- [x] 5. Run Artifact、evaluation、sanitizer、PR本文、branchを最終同期する。

## Discovered

- D1. canonical diagnosticは`unknown_skill`の実際のOTel `skill`属性を保存していないため、具体的なSkill名の断定には追加evidenceが必要。

## Blocked

- B1. 既存evidenceだけではunknown Skillの値とsource defectの因果を確定できない。推測修正・同一canonical retry・query/dataset/Skill alias変更は行わない。
- B2. source defectを証明できなかったため、Negative→Positive→Environment→canonical、8/8、valid baselineは未実行・未取得。merge conflict解消とCI再実行はvalid baseline取得後の後続条件とする。
