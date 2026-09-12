# Plan

## Objective

- PR #143 の保存Planを正本として、Issue #141のExpo SDK 57 patch整合、`expo-sqlite`のdynamic App Config blocker解消、検証、commit、push、PR CI確認、PR本文更新まで完了する。

## Scope

- In: `app.config.ts`、`tests/contracts/app-config.test.ts`、`package.json`、`pnpm-lock.yaml`、必要なactive Run Artifact。
- Out: workflowの変更、mainへの反映・merge、Issue close、branch削除、force push、main上のno-op実行、Android/iOS生成物のcommit。

## Assumptions

- 作業対象は既存の `issue-141-expo-dependency-maintenance` branch とし、別branchは作成しない。
- package versionは手編集で推測せず、実装時点の `pnpm exec expo install --check` / `pnpm exec expo install --fix` の結果を正とする。
- iOS prebuildはWindowsでは実行できない可能性がある。その場合は未実施として記録し、PR CIのiOS buildを必須証跡とする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Planの判断ルールと実CLI/CI結果で解決できる。
- 仮定してよい細部: `expo-sqlite` はoptionなしの文字列pluginとして既存pluginsへ追加する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `expo-sqlite`をdynamic `app.config.ts`へ明示登録すれば、`expo install --fix`の自動編集要求とdynamic config errorは解消する。
- H2: Expo CLIが実装時点で提示するSDK 57互換patchへ揃えれば、Expo Doctorとmaintenance後続checkが成功する。
- H3: 既存workflowのguard/allowlist/PR作成契約は変更不要で、contract testとPR #136の実績で確認できる。

## Research Plan

- Round 1 Query: branch/HEAD/mainとの差分、Issue #141、PR #143、保存Plan、対象config/test/package/lock/workflow/native CI/contractを確認する。
- Round 2 Query: baseline CLI結果、Expo CLI update path、依存差分、peer warning、prebuildと標準検証、push後のPR CIを確認する。
- Exit Criteria:
  - H1/H2/H3それぞれに実行結果とファイル/CI根拠がある。
  - 未実施のiOS prebuild、live update-needed automation PR作成、main反映後no-opは未確認事項としてPR本文と最終報告に明記する。

## Approach

- 保存Planの順序で、baseline確認、App Config変更と機械assert、contract test追加、fix直前基準点のpath/hash保存、`expo install --fix`を1回だけ実行、override/lockfile同期、基準点比較、最終config/CLI/test/prebuild/標準検証、sanitization、commit/push、PR CI確認、PR本文更新を行う。
- maintenance基準点を保存してからallowlist比較完了までは、Run Artifactを含む人間変更を追加しない。
- workflow固有不具合が再現しない限り `.github/workflows/expo-dependency-maintenance.yml` と関連workflow/contractは変更しない。

## Definition of Done

- `expo-sqlite`がpluginsに1回だけ登録され、既存router/build-properties/runtime metadataが維持され、prebuild config JSONの `_internal.pluginHistory["expo-sqlite"]` が存在する。
- 実装時点のExpo SDK 57互換package、`expo-constants` override、lockfileが整合し、Expo check/Doctor/frozen installが成功する。Expo/RN major.minorは不変。
- fix直前基準点比較で、新規変更pathが `package.json` / `pnpm-lock.yaml` のみ、その他基準点fileのhashが不変である。
- contract、Native component、native route、EAS、typecheck、lint、markdown lint、diff check、verify、Android prebuildが成功し、iOSは実行可否を記録する。
- commit/push後、PR #143がOPENのまま指定branch/headで、今回起動した必須CIを結果付きで確認し、PR本文を実績へ更新する。

## Risks / Unknowns

- SDK 57の推奨patchがPlan作成時から進んでいる可能性: 実CLI出力を正とし、major.minor guardで範囲を固定する。
- peer warningが残る可能性: warningを分類し、実害がなければ独自override/direct dependencyを追加しない。`@react-native/jest-preset`更新時だけ既存packageExtensionsを再評価する。
- WindowsではiOS prebuildを実行できない可能性: PR CIのiOS buildを最終証跡とする。
- 既存branchにはPlan由来のmain差分があるため、workflowのHEAD基準allowlistは使わず、fix直前基準点と内容hashを比較する。

## Thinking Log

- 2026-09-12: PR #143はOPEN、headは指定branch/`dfaf5ed`で、作業ツリーはclean。branch作成時のbase `12fff8e`に対してremote mainは同SHAで、local `main`は古い。PR既存CIにはPlan-only時点のStyle Quality/verify/validate failureがあるため、実装後の新exact-head CIを正として再確認する。
