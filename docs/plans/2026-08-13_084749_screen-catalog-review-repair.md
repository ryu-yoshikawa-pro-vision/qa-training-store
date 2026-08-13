# PR #24 Screen Catalog / Visual Specification Review Repair Plan

## Goal

Primary PlanのDefinition of Doneに対して、Structural ValidationとFinal Visual Completion Validationの責務を分離し、未完了のCheckout Processing Product FixとAPI34 Android canonical captureを正しくBLOCKEDとして扱う。併せて、Android runtime provenance、manual target capture、promotion、materializer冪等性、Visual Contract不足を修正する。

## Current understanding

- 対象branchは`feat/implement-screen-catalog-visual-specification`で、PR #24の既存実装HEADから開始した。
- `validate:spec`は構造整合性を検証する入口として維持する必要がある。
- 現在のRequired targetにはAndroid blocked targetsと`SCREEN-CHECKOUT-PROCESSING/default/web-desktop`のblockedが残っている。これはProduct Fix / canonical runtime不足による正当な未完了である。
- Android canonical profileはAPI 34 / `google_apis` / `x86_64` / `pixel_2`、ja-JP、font scale 1.0、light、portraitを期待するが、resolution/densityはCurrent CI runtimeの実測値を確認して固定する必要がある。

## Non-goals

- Product codeの変更、Checkout Processingの修正、正常状態のScreenshot捏造。
- blocked targetのcaptured化、stale/dummy artifactのpromotion。
- 新しいScreenshot DB、外部Visual service、巨大なworkflow case matrix。
- Git mutationまたはPR更新。

## Impacted areas

- Visual contract API / final CLI / package verify wiring。
- Android capture manifest observation and profile normalization in Native CI。
- Registry-backed capture-case selection and promotion CLI。
- Materializer path comparison。
- Screen Contract / state audience / platform / shared / oracle / asset / alt validation。
- Contract tests, Native workflow tests, docs and Run Artifact。

## Change strategy

1. Existing implementation and testsをmappingし、既存APIとcurrent CI profileを再利用する。
2. Structural resultを維持したままFinal resultを追加し、`verify`をFinal Gateへ接続する。
3. AndroidはObserve → Record → Validateの順にし、実測値をmanifestへ記録する。profile mismatch時はcapture前にfailする。
4. RegistryをCase SSOTとしてmanual `capture_case_key`とpromotion CLIを接続する。
5. Materializerとvalidatorの不足契約を最小差分で追加し、negative testsで固定する。
6. Docs / ADR / history / Run Artifactを更新し、構造検証PASSとFinal DoD BLOCKEDを分けて報告する。

## Validation

Structural commandsはPASSを目標とし、Final Gateと`verify`は未完了targetを理由にFAIL/BLOCKEDになることを確認する。その他のformat、markdown lint、spec build、lint、typecheck、contract tests、unit tests、web build、Native static validationを実行し、未実行をPASS扱いしない。

## Open questions

- API34 Current CI emulatorのresolution/density実測値をremote run/artifactから取得できるか。取得できない場合、推測値をcanonical profileへ入れず、CI capture時のobserved-vs-expected validationをfail-closeにする。
