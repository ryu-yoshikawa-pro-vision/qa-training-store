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
- [x] D3. PR #84 review Findingを受け、`INPUT_LIMITS` canonical keyとCurrent Form / Application validationの同義literalをbounded auditする。
- [x] D4. bounded auditで対象と判定したAddress / Category / Brand / Review / Inventory consumerを`INPUT_LIMITS`へ接続する。
- [x] D5. 変更した既存Integration / Component Testでlimit boundaryとForm属性のobservable behaviorを確認する。
- [x] D6. Plan、Run Artifact、validation実績、scope、Sanitizerをrepair結果へ同期する。
- [x] D7. PR #84へcommit / pushし、Web CIと既知のMobile Expo Doctor failureを今回差分と切り分けて確認する。
- [x] D8. `validation_and_messages.md`の明示的な文字数Rule 25件を仕様表起点で再監査し、Active consumerを分類する。
- [x] D9. Address / Auth / Product / Master / Review / Inventory / Shipping / SearchのActive Form / Use Case不足を既存`INPUT_LIMITS`へ接続する。
- [x] D10. Web / Nativeを含む既存Formal Testへ必要な境界確認を最小追加する。
- [x] D11. Required validation、focused test、manual audit、scope、Sanitizerを今回repair内容で実行する。
- [x] D12. Run ArtifactとPR本文を同期し、明示pathでcommit / push後にexact HEADのCIを確認する。
- [x] D13. 再レビューFinding 1（Product identifierのraw Domain `TypeError`漏出）を全create / update / preview経路で再監査する。
- [x] D14. 再レビューFinding 2（Search Suggestionの上限超過が`[]`で正常終了）をApplication contractと既存Testで再監査する。
- [x] D15. Product identifierのApplication `VALIDATION`変換とSuggestionのover-limit `VALIDATION`を既存Use Caseへ最小修正し、既存message keyを再利用する。
- [x] D16. 2つの既存Integration Testへ境界・エラー契約を追加し、focused / required validationを実行する。
- [x] D17. Manual self-review、scope確認、Sanitizer Write / Checkを実施する。
- [ ] D18. Run ArtifactとPR本文をCurrent結果へ同期し、明示pathでcommit / push後にexact HEADのCIを確認する。

## Blocked

- なし（required validation、manual review、scope check、Sanitizer、PR #84へのpush、exact HEADのWeb / Mobile CI確認、PR本文更新を完了。Webの`Vitest (contracts)`にenvironment-sensitiveな`spawnSync sh EPIPE`の1 assertion failure、Mobile `Native Static`にExpo Doctor patch mismatchがあるが、いずれも今回のinput-limit source / test差分に起因する証拠はない。第三者re-reviewとmergeは未完了工程として残る）。
