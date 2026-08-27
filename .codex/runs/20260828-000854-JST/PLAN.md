# Issue #73 / PR #74 実装Run計画

## Objective

- Expo SDK 57と依存versionの不整合を、current `expo-doctor@1.17.6` の要求に従う必要最小限のdependency変更で解消する。
- PR #74のStyle Quality / Markdown lint failureをplan末尾の単一改行だけで修正する。

## Scope

- In:
  - `package.json`
  - `pnpm-lock.yaml`
  - `docs/plans/2026-08-27_092000_expo-sdk-57-dependency-alignment.md`（末尾改行のみ）
  - 今回のRun artifact
- Out:
  - Application code、test、CI workflow、Android / iOS native設定、Maestro
  - Expo Doctor skip / exclude、Issue #68 security remediationの再設計
  - affected `image-size` instanceが再発しない限りMetro overrideの変更

## Assumptions

- `origin/main`のfetch後SHAが`c0fea8a489286f829cc5e6cb5c5a95aa31465143`で、指定branch HEADの祖先であることを確認できたため、main同期は不要とする。
- Run artifactはRepository運用上必要な成果物として保存し、absolute pathや生ログは記録しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定planとcurrent PR状態で作業条件が確定している。
- 仮定してよい細部: current Expo Doctorの出力がversion要求の正本となる。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `expo-doctor@1.17.6`のcurrent mismatchはplan記載のExpo SDK 57 patch dependency群であり、対象direct dependency / devDependencyだけの更新で解消できる。
- H2: React Native更新後もIssue #68対象のaffected `image-size` resolved instanceは0件で、Metro overrideは変更不要である。

## Research Plan

- Round 1: Task 1でbaselineと実行環境を固定し、Task 2でcurrent Expo Doctor要求を確定する。
- Round 2: Task 3〜7でimage-size安全条件、dependency更新、lockfile、frozen install、最終Doctorを順に確認する。
- Exit Criteria:
  - current mismatchが0件、Expo Doctor 17/17 PASS。
  - affected `image-size` resolved instanceが更新前後とも0件。
  - package / lockfile差分がIssue #73 scope内で、Markdown lintもPASS。
  - final diff review、push後PR CI確認、working tree cleanが完了する。

## Approach

1. 指定planを正本としてTask 1〜12を順番に実行する。
2. Markdown lint failureはplanの末尾改行だけを修正し、`pnpm run lint:markdown`で確認する。
3. current Expo Doctor要求のdirect dependency / devDependencyだけを更新し、`expo-constants` direct dependencyとoverrideを同期する。
4. `pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile`でlockfileを正規生成し、不要なsemantic diffを確認する。
5. planが指定するローカル検証だけを行い、PR CI検証はpush後に確認する。
6. final diff review後にcommitし、指定branchへ明示refspecでpushする。

## Definition of Done

- plan記載のDoD、停止条件、非ゴールを満たす。
- PR #74のhead SHAが最終commit SHAと一致する。
- 最新PR Web CI / Mobile App CIの失敗をfirst failureまで確認し、Issue #73 scope内の必要修正だけを反映する。

## Risks / Unknowns

- current Expo Doctor要求がplan初期候補と異なる場合はcurrent出力を優先し、広範囲の調査・更新をしない。
- affected `image-size`が再発した場合は`pnpm why image-size`でactual parent pathを確認し、planのBlocker条件に従う。
- React Native互換性failureがIssue #73 scope内で安全に解消できない場合は、追加upgradeやApplication code変更をせずBlockerとして報告する。

## Thinking Log

- 2026-08-28 00:08 JST: 指定plan 414行を最初から最後まで読了した。実装対象と停止条件を確定した。
- 2026-08-28 00:09 JST: 指定branch、clean working tree、Node 24.12.0、pnpm 9.10.0、`origin/main`祖先関係、PR #74 head一致を確認した。
- 2026-08-28 00:09 JST: plan末尾に改行がなく、PR #74のMarkdown lint failureと一致したため、末尾へ単一LFだけを追加した。
