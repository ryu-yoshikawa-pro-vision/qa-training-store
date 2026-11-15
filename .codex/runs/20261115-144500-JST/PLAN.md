# Plan（計画）

## Objective（目的）

- `qa-training-store`でnpmの既存Renovate security-only運用と競合させず、GitHub Actions依存のsecurity updateだけを提案する。
- ユーザー承認済みの`expo-dependency-maintenance.yml`日次互換更新は維持する。

## Scope（対象範囲）

- In: `.github/dependabot.yml`に`github-actions`のweekly scheduleと`open-pull-requests-limit: 0`を追加する。計画書、Run Artifactを同じPRに含める。
- Out: npm ecosystem、Renovate設定、Expo workflow、GitHub管理設定、PRのmerge。

## Assumptions（仮定）

- GitHub公式仕様では`open-pull-requests-limit: 0`が通常のversion-update PRを止め、security updateは別枠で扱われる。
- `target-branch`を設定せず、default branchに対するsecurity-update用の設定を有効にする。
- Dependabot alerts/security updatesのサーバー側toggleはこの変更で操作しない。現在値と実動作は未確認として残す。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。ユーザーは全repo security-onlyとExpo workflow例外を明示済み。
- 仮定してよい細部: Actions ecosystemの更新確認頻度はweekly、PR上限0とする。
- 未回答の重要質問: repo SettingsのDependabot alerts/security updatesが有効か、UI上で確認が必要。

## Hypotheses（仮説）

- H1: GitHub Actions向けのDependabot設定がなく、既存Renovateのnpm-only managerではworkflow action参照を更新しない。
- H2: Actions-only Dependabot設定はRenovate npm managerおよび日次Expo互換workflowと競合しない。

## Research Plan（調査計画）

- Round 1 Query: current default branch、Renovate設定、依存manager、Actions workflow、repo固有のplan/run/verification契約を確認する。
- Round 2 Query: 変更差分、YAML構文とsecurity-only意味、標準検証、PRの最新headと必須CIを確認する。
- Exit Criteria:
  - Actions-only変更がRenovate npm設定、Expo workflowを変更しない。
  - ローカル検証と変更範囲を確認してPRを作成し、最新headの必須CI結果を確認するか、確認不能の理由を記録する。

## Approach（進め方）

- 対象設定とworkflowを読む。Repository planを保存し、標準Runを作る。
- Actions-only Dependabot設定を作り、YAML構文・security-only条件・`bash scripts/verify`を検証する。
- diffとRun Artifactを確認してcommitし、default branch以外のbranchへpushしてPRを作る。mergeしない。
- PR最新headの必須CI確認を行う。`wait_for_required_ci`が利用できない場合はagent側でCIをpollせず、未確認blockerとして報告する。

## Definition of Done（完了条件）

- Actions-only Dependabot configがsecurity-onlyの意味を持つことを構文・意味検証で確認する。
- Expo日次workflowとRenovate npm設定に差分がないことを確認する。
- Run Artifactをfinal commit前にsanitizeし、変更のみをbranchへpushしてPRを作成する。
- Repository必須CIは最新PR headの`Web CI`と`Mobile App CI`がsuccessのときのみ完了。waiter不在ならCI未確認のため未完了。

## Risks / Unknowns（リスク・未知点）

- リスク: repo settingsのDependabot alerts/security updatesが無効または読取不能なら、config fileだけではsecurity PRの実動作を保証しない。
- 対策: 管理設定は変更せず、UI確認とT09での実動作を残件にする。security updateの有効化が必要な場合は別途対象・影響を示して承認を待つ。

## Thinking Log（判断記録）

- 2026-11-15: `renovate.json`はnpm managerのみでsecurity-only。DependabotをActions ecosystemだけに限定すれば競合を避けられる。
- 2026-11-15: 公式仕様上、PR上限0は通常version updatesの停止に使い、security updatesは別扱い。`target-branch`は指定しない。
