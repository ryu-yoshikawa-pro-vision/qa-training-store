# 計画書

## 0. 依頼概要

- 依頼内容: PR #63のconflictを解消し、最新`origin/main`へPR #63固有のuuid remediationを通常mergeで載せ直す。
- 背景: PR #62のExpo SDK 57 patch alignmentとPR #64のPR日本語化ルールがmainへmergeされたため、PR #63がconflict状態になった。
- 期待成果: mainの変更を完全維持し、`xcode@3.0.1>uuid: 11.1.1`だけを追加したmerge commitを指定branchへpushし、PR本文とCI状態を更新する。

## 1. ゴール / 完了条件

- ゴール: `origin/main`の最新状態 + PR #63のparent-scoped uuid overrideを、rebase/force pushなしでPR #63へ反映する。
- 完了条件（DoD）:
  - `package.json`のExpo主要version、`expo-constants` override `57.0.14`、PR #64の文書変更を保持する。
  - `xcode@3.0.1`配下のuuidが11.1.1で、direct/global uuid overrideがない。
  - lockfileをpnpm 9.10.0で再生成し、frozen install、Expo check/Doctor、graph、smoke、verifyが成功する。
  - unmerged/markerなし、通常merge commit、通常push、PR #63本文/CI確認、Run Artifact sanitizeを完了する。

## 2. 現状理解と前提

- Current understanding:
  - worktreeは`<REPO_ROOT>`、branchは`investigate/issue-57-uuid-remediation`。
  - `HEAD=c8606ec`、`origin/main=47ea147`、`MERGE_HEAD=47ea147`。通常merge途中で、unmergedは`package.json`と`pnpm-lock.yaml`。
  - PR #62はmerge済み、PR #64はmerge済み、PR #63はopenかつconflicting。Issue #57はuuid alertの調査Issueである。
  - main側packageにはExpo patch alignment、`expo-constants: 57.0.14`、js-yaml scoped overridesがある。feature側には`expo-constants: 57.0.13`とxcode-scoped uuid overrideがある。
- Assumptions:
  - 進行中mergeは今回依頼と同じ作業の未完了状態として引き継ぎ、既存変更を破棄しない。
  - lockfileはmain baseline + 最終package manifestからpnpmで生成し、手動継ぎ合わせをしない。
  - CIはpush後に非同期確認し、pendingはPASSと扱わない。
- Non-goals:
  - rebase、force push、mainへのpush、新PR作成。
  - Expo/React Native/Metro/xcodeの追加更新、global/direct uuid変更、workflow/test/source変更。
  - Expo Doctorのskip/exclude/allow-failureとPR #62/#64の再設計。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: main側のstaged文書・Run Artifactは既存mergeの取り込み結果として保持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: dependency manifest、pnpm lockfile、merge history、Run Artifact、PR metadata/body、GitHub Actions結果確認。
- Files to inspect: `package.json`、`pnpm-lock.yaml`、`AGENTS.md`、`.github/pull_request_template.md`、`docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/`、関連workflow、既存Issue/PR。

## 5. 変更方針

- `package.json`と`pnpm-lock.yaml`はmain側をbaselineにする。
- `package.json`の`pnpm.overrides`へ`xcode@3.0.1>uuid: 11.1.1`だけを追加し、`expo-constants: 57.0.14`とjs-yaml overridesを維持する。
- pnpm 9.10.0で`pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile`を実行し、lockfileを生成する。
- conflict/graph/local validationを順番に実行してからstage、merge commit、push、PR本文更新を行う。

## 6. 検証方法

- `git diff --name-only --diff-filter=U`、repo-wide marker確認、`git diff --check`。
- package version/override、`pnpm why uuid`、`pnpm why xcode`、`pnpm list uuid --depth Infinity`、`pnpm list xcode --depth Infinity`。
- `pnpm install --frozen-lockfile`、`pnpm exec expo install --check`、`pnpm dlx expo-doctor@1.17.6`。
- `pnpm exec expo config --json`、`require('uuid')`/`uuid.v4`/xcode `generateUuid()` smoke、`pnpm run verify`。
- merge commit parents/diff、通常push、PR #63 head/mergeability/checks、PR本文言語を確認する。
- `scripts/sanitize-codex-artifacts.ps1 -Write -Check`をRun Artifactへ実行する。

## 7. リスクと未解決論点

- Risks: feature側の古いExpo値を採用するとPR #62を巻き戻す。lockfileを手編集するとgraph不整合になる。CIのpending/failureはlocal PASSと別に記録する。
- Open questions: なし。merge後のDependabot Alert #1 resolved確認はfollow-upとして残す。

## 8. 成果物

- 変更ファイル: `package.json`、生成`pnpm-lock.yaml`、通常merge commit、今回Run Artifact。
- 付随ドキュメント: `docs/plans/2026-08-25_174310_pr63_conflict_resolution_latest_main.md`、PR #63の日本語本文更新。

## 9. 備考

- 既存のPR #63 Run Artifactやmainに入ったPR #64 Run Artifactは上書きしない。
