# Tasks

## Now

- [x] 1. 規約を確認し、元worktreeと既存coverage-remediation worktreeを保全する
- [x] 2. 最新`origin/main`から独立branch/worktreeを作成する
- [x] 3. 本作業専用PlanとRun Artifactを作成し、base SHAとscopeを記録する
- [x] 4. 最新mainでFR-PR-050 / NFR-MA-012のgapと全対象write pathを再監査する
- [x] 5. Product code / SKUのcanonical normalizationとnormalized uniquenessを実装する
- [x] 6. Auth / Account Use CaseとSignup / Profile Formを`INPUT_LIMITS`へ接続する
- [x] 7. 既存Integration / Component Testへobservable boundary Testを追加する
- [x] 8. focused Testとrequired validationを実行する
- [x] 9. Manual Review、scope check、Sanitizer Write / Checkを実施する
- [x] 10. Run Artifactを実績へ同期し、commit/pushなしで完了報告する

## Discovered

- D1. `src/application/use-cases/admin-product-use-cases.ts`がProduct identifierのwrite path（Product create/update、variant create/update）を集約している。
- D2. `INPUT_LIMITS`は既存`src/application/contracts/common.ts`からAuth / Account / Presentationへ直接参照でき、module移動は不要と判断した。

## Blocked

- なし（required validation、manual review、scope check、Sanitizerを完了し、ユーザー指定のStop conditionに該当する新事実は未検出）。
