# Tasks

## Now

- [x] 1. remote／branch／PR／HEAD／差分／既存Run／raw evidenceを確認する。
- [x] 2. feature-planを`docs/plans/`へ保存し、Strict Run Artifactへ反映する。
- [x] 3. Windows argv contractを最初に実行し、`process.platform`と環境証跡を保存する。初回はliteral config未引用でFAILしたため、Qualification前にshell quoteを最小修正し再実行PASS。
- [x] 4. OTel/evaluator focused testsとrepository contract全体を実行する（focused 47 tests、repository 94 tests PASS）。
- [x] 5. format、lint、typecheck、Skill、dataset、diff、`pnpm run verify`を実行する（指定static gates PASS、verifyは既知Hook launcher timeout 2件でFAIL）。
- [x] 6. Evaluator SHAを固定し、fresh Routing Target／Skill／dataset境界／Git isolationをpreflightする（Evaluator snapshot `4921023`、implementation `536ad46`、Routing `55cb43a`、Codex `0.153.4`）。
- [x] 7. Codex versionを確認し、Negativeを1回実行して判定する（PASS: request 1、control 1、Skill 0、completed）。
- [x] 8. Negative PASS時だけPositiveを1回実行し、両方PASS時だけEnvironment Qualificationを判定する（Positive PASS、Environment Qualification PASS）。
- [x] 9. Environment Qualification PASS時だけcanonical `all`、8/8、valid baselineを判定する（canonical完了、観測可能7/8、valid baseline未取得）。
- [x] 10. Evidence、evaluation、Run Artifact、PR本文を実結果へ同期する。
- [x] 11. sanitizer、schema、strict collector、branch safety、push、CIを完了する。

## Discovered

- D1. Qualification raw evidenceは`.artifacts/trigger-eval-qualification-20260912-02/`へ保存する。

## Blocked

- （なし）
