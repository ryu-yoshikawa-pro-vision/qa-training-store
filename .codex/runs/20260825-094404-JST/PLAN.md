# Issue #57 uuid脆弱性remediation調査計画

## 0. 依頼概要

- 依頼内容: `uuid@7.0.3`（GHSA-w5hq-g745-h8pq / CVE-2026-41907）について、現行Expo / React Native構成を壊さない最小かつ安全なremediation方針を調査する。
- 背景: `expo -> @expo/config-plugins -> xcode@3.0.1 -> uuid@7.0.3` のdependency pathがIssue #57で報告されている。
- 期待成果: 実測dependency graph、脆弱APIの到達性、候補ごとの差分、必要validationをdurable reportへまとめ、次Runの実装方針を1案に絞る。

## 1. ゴール / 完了条件

- ゴール: Alert解消だけを目的にした無検証のglobal overrideやmajor upgradeを避け、parent upgrade / parent-scoped resolution / upstream待ちを比較してRecommendedを決定する。
- 完了条件（DoD）:
  - 現在のlockfile / installed graph、直接利用有無、`xcode@3.0.1`のuuid呼び出しをEvidence付きで確定する。
  - Advisory、upstream source / metadata、uuid 7→patched major互換性、parent候補、candidate差分、CI/native/iOS validationを比較する。
  - `docs/reports/<JST timestamp>_uuid_vulnerability_remediation_investigation.md`を作成し、Run ArtifactをsanitizationしてCheckする。
  - canonical `package.json` / `pnpm-lock.yaml`、source、test、workflowを変更せず、Git mutationを行わない。

## 2. 現状理解と前提

- Current understanding: Issue記載のdependency pathとaffected/patched rangeは仮説として提示されている。作業時点のmanifest、lockfile、pnpm実測、GitHub advisory、npm/GitHub upstreamを一次情報中心に再確認する。
- Assumptions: 調査用candidateはcanonical working treeと分離した一時領域で、各scenarioを同一baselineから個別に再現する。比較結果が実装可能性を示しても、今回Runでは依存変更を適用しない。
- Non-goals: `uuid` / Expo / xcodeの恒久upgrade、override / lockfile編集、Alert dismiss、Issue #55/#56等の無関係な更新、source/test/workflow変更、Git mutation。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文がscope、禁止事項、成果物、完了条件、次Runへの引継ぎ項目を指定している。
- 仮定してよい細部: 未知の技術事実は仮定せず、`Not Run`または`未確定`として報告する。レポートのtimestampはJSTとする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: `package.json`、`pnpm-lock.yaml`、installed `node_modules`（読み取り）、Expo config/prebuild、`xcode` source、CI/native workflows、Issue/advisory/upstream metadata。
- Files to inspect: `package.json`、`pnpm-lock.yaml`、`node_modules/xcode/**`、`node_modules/uuid/**`、`src/**`、`scripts/**`、tests/config、`.github/workflows/{ci,cross-browser-smoke,native-ci,native-ios-ci}.yml`、関連docs。

## 5. 変更方針

- Change strategy:
  1. Run初期化済みのbaselineを固定し、manifest / lockfile hashとGit statusを記録する。
  2. `pnpm why/list`とlockfileを突き合わせ、direct dependencyから`uuid@7.0.3`への全経路を確定する。
  3. repo source / toolingと`xcode@3.0.1`の実コードを検索し、v3/v5/v6、buffer/offsetの到達性を分類する。
  4. GitHub advisory / CVE / uuid upstream source・metadata / xcode metadataを確認する。
  5. parent upgrade、parent-scoped override、pnpm 9.10.0のtargeted resolution、upstream待ちを同一baselineの候補として比較する。
  6. candidate検証が必要な場合は隔離一時領域で行い、canonicalファイルへ結果を戻さない。
  7. 推奨案、代替案、却下案、実装PR scopeとvalidationをdurable reportへ整理する。
- 実行タスク: `TASKS.md`の10項目を上から順に実行する。

## 6. 検証方法

- Validation plan: read-only graph commands、source search、package metadata、advisory/upstream確認、isolated candidate install/lockfile diff、必要に応じて現行validation commandのbaseline確認を行う。依存変更なしの調査Runでは、候補をcanonicalへ適用した成功とは扱わない。
- 成功判定: 主要仮説（脆弱API到達性、自然なparent解消、scoped resolution互換性）の支持/反証根拠が揃い、1つのRecommendedと明示的なRejected理由がレポートにある。実行不能な検証は理由付きNot Runとする。

## 7. リスクと未解決論点

- Risks: advisoryの将来更新、npm metadataの時点差、`uuid` majorのmodule/export差、Expo内部packageのversion整合性、iOS prebuildの未実行、candidate install時の意図しない差分。
- Open questions: 実測結果で解消する。解消しないものは、実装PRのrollback条件と追加validationへ引き継ぐ。

## 8. 成果物

- 変更ファイル: Run Artifact（`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`）と指定されたdurable investigation reportのみ。canonical dependency/source/test/workflowは変更しない。
- 付随ドキュメント: なし。既存PROJECT_CONTEXT / ADRは、調査だけで設計方針が確定しない限り変更しない。

## 9. 備考

- `feature-plan`スキルのrepo mapping / change planning手順を使用した。
- 子subagentは使用しない。No child subagent delegation規約と、一次情報・同一baseline比較を親Runで一貫して記録する要件を優先する。
