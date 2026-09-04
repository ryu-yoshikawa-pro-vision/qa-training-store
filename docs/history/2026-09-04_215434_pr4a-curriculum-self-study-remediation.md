# PR 4A Curriculum self-study remediationのProject Context履歴

## 変更理由

Issue #98をMaster PlanのPR 4Aへhandoffし、Current Curriculumの受講者視点・自己学習品質を実装したため、`docs/PROJECT_CONTEXT.md`のliving documentへ現在の判断を追記した。

## 記録した判断

- PR #103で固定されたDecision B、Common / Native specialization、Learner Required / Repository-required、C08 / C12の契約を維持する。
- Issue #98の4観点は、既存のScenario / Test Control / Failure Analysis / self-study review責務へ統合する。Issue専用の恒久SSOT、Finding DB、Evidence台帳は作らない。
- Learner-facing materialが学習内容・self-check・Recovery・completionの正本であり、Instructor Referenceは環境・権限・端末・Training Copy・Toolchainのsupport-only assetとする。
- `docs/spec/**`は全Markdown / text contractを監査したが、実変更を要するSpecification Findingはなかったため、PR 4Bは作成しない。

## 実装範囲

`docs/curriculum/test-automation/`の必要なCore / Extension / Reference / specialization文書、`docs/reference/curriculum-self-study-review.md`、PR 4A child Planを更新した。Product、Training runner / workflow / Artifact、validator / contract test、`docs/spec/**`には差分を作っていない。
