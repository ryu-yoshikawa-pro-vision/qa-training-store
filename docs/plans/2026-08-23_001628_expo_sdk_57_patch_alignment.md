# Expo SDK 57 patch依存整合計画

## 0. 依頼概要

- 依頼内容: `origin/main` の共通baselineで発生している Expo Doctor のpatch version不整合を、SDK 57の範囲内で最小修正する。
- 背景: PR #42 / #43 / #45 のNative CIで共通して観測された失敗を、feature PRへ混ぜず独立PRで解消する。
- 期待成果: 指定7パッケージと `expo-constants` overrideをExpo Doctorの要求patchへ揃え、package.jsonとpnpm-lock.yamlを整合させる。

## 1. ゴール / 完了条件

- ゴール: Expo SDK 57、React、React Native、CI契約を変更せず、Expo Doctorが要求する7パッケージだけをexact patch versionへ更新する。
- 完了条件（DoD）:
  - `@expo/metro-runtime` 57.0.12、`expo` 57.0.15、`expo-build-properties` 57.0.13、`expo-constants` 57.0.13、`expo-dev-client` 57.0.14、`expo-linking` 57.0.7、`expo-router` 57.0.15へ整合する。
  - `pnpm.overrides.expo-constants` が57.0.13となる。
  - `pnpm install --frozen-lockfile`、`pnpm dlx expo-doctor@1.17.6`、指定ローカルvalidationが成功する。
  - 無関係な依存、Application code、Workflow、Doctor設定、ignore/excludeを変更しない。
  - PR作成後、Native CIに今回の変更起因の新規regressionがないことを確認する。
  - Run ArtifactをSanitizerのWrite／Checkに通す。

## 2. 現状理解と前提

- Current understanding:
  - `HEAD`、`origin/main`、`FETCH_HEAD`はすべて `a3a58ae4b4168c34307e6dd0f2d21c039a972fab` で一致している。
  - 作業ブランチ `fix/expo-sdk-57-patch-alignment` は既に存在し、mainとの差分はなく、固有コミットもないため安全に継続利用する。
  - `package.json` は7対象をそれぞれ 57.0.11 / 57.0.14 / 57.0.12 / 57.0.12 / 57.0.13 / 57.0.6 / 57.0.14で指定し、overrideは `expo-constants: 57.0.12` である。
  - Native CIは `pnpm install --frozen-lockfile`、Native component tests、route dependency check、EAS config validation、`pnpm dlx expo-doctor@1.17.6`を同一 `native-static` jobで実行する。
  - mainでfrozen install後にDoctorを実行すると15/17 checks passed、2 checks failedとなり、package version checkが7対象のpatch mismatchを報告した。config schema checkはExpo APIへの接続timeoutも報告した。
- Assumptions:
  - ユーザーが明示した7つの expected patch versionが、実装前に再取得したDoctor出力と一致したため、その値だけを適用する。
  - 既存ブランチを強制再作成せず、最新mainと同一であることを証跡化したうえで利用する。
  - Expo API schema checkの一時的なネットワーク失敗は、patch alignmentとの因果関係がない限りscope外として記録する。
- Non-goals:
  - Expo SDK 58またはmajor/minor migration。
  - React、React Native、TypeScript、Playwright、無関係なdependencyの更新。
  - Product／Native／Web code、Test仕様、Maestro flow、CI workflow、Doctor version、gate条件の変更。
  - `expo.install.exclude`、ignore、retry、timeout等でDoctor failureを回避すること。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象、DoD、PRタイトル、PR作成可否が明示されている。
- 仮定してよい細部: lockfileは変更後のpackage.jsonを基準にpnpmの通常解決で再生成し、差分を対象パッケージと必要なpeer contextに限定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: package manifest、pnpm lock importer／package／snapshot entries、Run Artifact、計画書、PRとNative CIの観測結果。
- Files to inspect:
  - `package.json`
  - `pnpm-lock.yaml`
  - `.github/workflows/native-ci.yml`
  - `scripts/check-native-route-dependencies.ts`
  - `scripts/validate-eas-static-config.ts`
  - `jest.config.cjs`／native component tests
  - `scripts/sanitize-codex-artifacts.ps1`

## 5. 変更方針

- Change strategy:
  1. 最新main、作業ブランチ、package manifest、lock、Native CI、main baseline Doctorを確認する。
  2. `package.json` の指定7箇所と `pnpm.overrides.expo-constants` だけをexact versionで更新する。
  3. `pnpm install --lockfile-only`でlockfileを再解決し、差分を調査する。対象外の依存が更新された場合は原因を確認し、不要な更新を残さない。
  4. frozen install後にDoctorと指定validationを実行する。Doctorの別failureは、今回の変更、main baseline、scope外／環境依存に分類する。
  5. 差分・Run ArtifactをSanitizerで確認し、commit／push／PR作成後にremote Native CIを確認する。Merge、CodeRabbit再レビュー、thread操作は行わない。
- 実行タスク:
  - [ ] 1. 最新main・作業ブランチ・依存・Native CI・baseline Doctorを記録する。
  - [ ] 2. 実装前計画とRun Artifactを保存する。
  - [ ] 3. package.jsonの7対象とoverrideをpatch alignmentする。
  - [ ] 4. pnpm-lock.yamlを必要範囲だけ再生成し、差分を監査する。
  - [ ] 5. frozen installとExpo Doctorを再実行する。
  - [ ] 6. Native component、route、EAS、typecheck、lint、format、markdown、diff checkを実行する。
  - [ ] 7. 可能なら全テストを実行し、baseline／scope外failureを分類する。
  - [ ] 8. 最終差分、Run Artifact、Sanitizerを確認する。
  - [ ] 9. commit／push／PR作成とremote Native CIの結果を確認する。
  - [ ] 10. 最終判定、未完了事項、次アクションを記録する。

## 6. 検証方法

- Validation plan:
  - `pnpm install --frozen-lockfile`
  - `pnpm dlx expo-doctor@1.17.6`
  - `pnpm run test:component:native`
  - `pnpm run check:native-route-dependencies`
  - `pnpm run validate:eas:config`
  - `pnpm run typecheck`
  - `pnpm run lint`
  - `pnpm run format:check`
  - `pnpm run lint:markdown`
  - `git diff --check`
  - 可能なら `pnpm run test`
  - PR後のNative Static、Native component tests、Expo Doctor、Android／iOS automation／production build、Production Bundle Guard、Android Runtime／Maestro、`native-ci / verify`。
- 成功判定: Doctorが17/17 checks passedで、package version checkを含む指定ローカルvalidationがPASS。remote Native CIは今回のdependency変更起因の新規failureなし。全差分が許可されたファイルに限られる。

## 7. リスクと未解決論点

- Risks:
  - Expo patch更新によりpeer contextがlockfile内で広く書き換わる可能性があるため、lock diffを旧版との比較で確認する。
  - Expo Doctorのconfig schema checkが外部Expo APIに依存するため、ネットワークtimeoutをpackage mismatchと分離する。
  - Native CIはbuild／runtimeを含むため、Doctor PASSだけで完了扱いせず、PR後のjob結果を確認する。
- Open questions:
  - 実装前Doctorで報告された以外のpackage mismatchが出た場合は、今回の7更新との直接因果を確認してから判断する。

## 8. 成果物

- 変更ファイル:
  - `package.json`
  - `pnpm-lock.yaml`
  - `.codex/runs/20260823-001154-JST/**`
- 付随ドキュメント:
  - `docs/plans/2026-08-23_001628_expo_sdk_57_patch_alignment.md`

## 9. 備考

- PRタイトル: `fix: align Expo SDK 57 patch dependencies`
- PR本文では、#42 / #43 / #45で共通観測されたmain baseline failureを独立修正すること、およびfeature修正を含めないことを明記する。
