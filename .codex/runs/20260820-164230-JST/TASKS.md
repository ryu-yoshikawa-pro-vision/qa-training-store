# Tasks

## Now

- [x] 1. 対象plan、必須repo文書、active run、現在のCI/contractを確認する
- [x] 2. package/config/toolchainと変更禁止ファイルの前提を確認する
- [x] 3. `ci.yml`の`extended-e2e`をmobile Chromium単一jobへ変更する
- [x] 4. `cross-browser-smoke.yml`を最小1-job構成で追加する
- [x] 5. `tests/contracts/ci-workflow.test.ts`を変更後契約へ更新する
- [x] 6. PROJECT_CONTEXTのhistory保存、PROJECT_CONTEXT更新、新規ADR作成を行う
- [x] 7. YAML parseと静的self-checkを実行する
- [x] 8. `test:contracts`とrepository checksを実行する
- [x] 9. 差分全体を自己レビューし、protected fileと不要差分がないことを確認する
- [x] 10. Run Artifactへ最終結果を記録し、sanitize Write/Checkを実行する

## Discovered

- 作業中に発見した事項は、checkbox taskの分母を変えずにREPORTへ記録する。
- D1. 指定planはworktreeになく、`origin/main`の`da62eea`から全文を読み取った。planのコピーは追加せず、実装根拠として扱う。

## Blocked

- B1. GitHub上のPR CI、feature branch `ci.yml` workflow_dispatch、merge後`Cross Browser Smoke` manual runは、commit/pushなしでは実行できないため後続確認とする。
