# PR #110 Chromium E2E failure repair plan

## Objective

- Issue #95の3状態UI仕様を維持したまま、PR #110のrequired Chromium E2EをIssue #91本来のレイアウト・操作性責務へ整合させる。

## Scope

- In: `e2e/web/ui-ux-improvements.spec.ts` の「Issue #91: 最大長付近の住所Cardと削除Dialogが操作可能」にある、削除Dialogの固定ビジネス文言assertionを汎用的なDialog本文存在assertionへ最小変更する。
- In: focused E2E、required Chromium E2E full suite、component、lint、typecheck、build、verify、diff、PR本文、Run Artifactの更新。
- Out: `src/presentation/pages/addresses-page.tsx`、`tests/component/auth-account-pages.test.tsx`、SearchCombobox、Issue #109、Domain/Application/Repository、scenario framework、seed data、retry/timeout/skip設定。
- allowed_files（source）: `e2e/web/ui-ux-improvements.spec.ts`
- expected_changed_files（source）: `e2e/web/ui-ux-improvements.spec.ts`

## Assumptions

- `createDefaultDataset()`の`userAddresses`は空で、`scenario("default")`のreset直後に`regular@example.com`の配送先は0件である。
- 対象E2Eで新規住所を1件登録すると、既存住所がないため最初の住所が既定になり、削除DialogはIssue #95のCケースになる。
- `card = page.locator(".address-card").first()`は、登録後の唯一のカードを指すため、対象住所の選択自体は不安定要因ではない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Issue #91のE2Eでは特定のIssue #95文言を固定せず、Dialog表示・本文・操作部品・viewport制約を確認する。
- 未回答の重要質問: focused実行時にBケースになったローカル状態の再現条件は、CIのfresh checkout／fresh browser contextとの差として記録するが、Product修正の根拠にはしない。

## Hypotheses

- H1（支持）: CI failureの直接原因は、Issue #95で正しくCケースを表示するProductに対して、Issue #91 E2EがBケース文言を固定期待している責務不整合である。
- H2（支持）: `scenario` fixtureは各testでresetし、CIは2 workersでもbrowser contextとIndexedDBを分離するため、test orderやparallelを修正する必要はない。
- H3（採用）: 固定文言assertionを `.dialog__body` のvisible assertionへ置き換えると、Issue #91の目的を保ちつつIssue #95のA/B/C保証をcomponent testへ委譲できる。

## Research Plan

- Round 1 Query: PR checks／failed job log、target E2E、fixture、scenario dataset、reset service、address repository、Playwright config、CI commandを確認する。
- Round 2 Query: allowed fileの1行修正後にtarget focused E2Eと`pnpm run test:e2e:chromium`を実行し、続けてcomponent／static／build／verify／diffを確認する。
- Exit Criteria:
  - CIのfirst anomalyと派生failureが分離されている。
  - H1/H2/H3を支持するコード・ログ根拠がある。
  - focusedとfull required suiteがPASSし、ProductとIssue #95 component testが不変である。

## Approach

1. CI failureの実値とtest data／isolationを確認し、repair findingを`must_fix`へ分類する。
2. `e2e/web/ui-ux-improvements.spec.ts` の固定B文言だけを、Dialog bodyの存在確認へ置き換える。skip、retry、timeout、seed変更は行わない。
3. focused E2E、required Chromium E2E full suite（package.json定義どおり）、component、lint、typecheck、build、verify、diffを指定順で検証する。
4. 差分scope、Run Artifact sanitizer、PR #110本文・state・headを確認し、修正をcommit／pushする。

標準フロー: `PLAN -> TASKS -> failure triage -> minimal repair -> focused/full validation -> REPORT -> commit/push -> PR update`

## Definition of Done

- 対象E2EがC/Bいずれの状態でもDialogの表示、本文、削除／閉じる操作、layout／overflowを検証できる。
- `pnpm run test:e2e:chromium` が30 tests PASS（または実測値）する。
- Issue #95のcomponent 3ケースがPASSし、Product 3状態分岐は変更されていない。
- Issue #109、SearchCombobox、Domain/Application/Repositoryに差分がない。
- lint、typecheck、build、verify、`git diff --check`、sanitizerがPASSする。
- PR #110をOPEN・非Draftのまま更新し、push済みheadを確認する。

## Risks / Unknowns

- focused実行とCI full suiteの差は、localの再利用server／storageとCIのfresh runtime条件の差が含まれる可能性がある。テストコードの暗黙順序やretryを追加せず、fixtureとCI設定の事実を根拠に判断する。
- `dialog.locator(".dialog__body")` のselectorがConfirmDialog共通markupと一致することを確認済み。共通Component自体は変更しない。
- full suiteは30 tests・2 workers・CI retries設定のため時間がかかる。focused PASSだけで完了扱いにしない。

## Thinking Log

- 2026-09-04 17:19 JST: PR #110のrequired jobは30 tests / 2 workersで29 passed・1 failed。対象failureはline 539のB文言固定assertionで、receivedはC文言だった。`validate`と`verify`はE2E failureの派生である。
- 2026-09-04 17:20 JST: `createDefaultDataset().userAddresses`は空、`TestControlService.reset`はDB削除後にscenario datasetを再seedする。対象testの住所登録後は1件のみで、repositoryの既存ルールにより既定となるためCケースが正しい。
- 2026-09-04 17:20 JST: 対象名はIssue #91のlayout／操作性確認であり、Issue #95のA/B/C文言は既存component testが直接保証する。固定文言を残存状態へ合わせて変更するのではなく、責務の重複を除く方針を採用する。
- 2026-09-04 17:21 JST: 実行前preflightとして、既存Run／PR failure log／変更差分、Node／pnpm／Playwright version、CIの`PLAYWRIGHT_USE_PREBUILT_DIST=true`とlocalのbuild済みdist条件を確認してからfocused／full E2Eを実行する。
- 2026-09-04 17:48 JST: `verify`全体ではcontracts 2件がtimeoutしたが、失敗テストを既定timeoutのまま単独実行するとHookは1 passed（9.61s）、Official artifact mutationは1 passed（391ms）となった。今回のE2E差分と無関係な一時的負荷と判断し、full verifyを一度だけ再検証する。
