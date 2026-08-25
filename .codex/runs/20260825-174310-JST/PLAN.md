# Plan

## Objective

- PR #63の競合中mergeを完了し、最新`origin/main`（PR #62・#64 merge後）を保持したまま、PR #63固有の`xcode@3.0.1>uuid: 11.1.1`だけを載せ直す。

## Scope

- In:
  - 既に開始済みの`git merge origin/main`を通常mergeとして完了する。
  - `package.json`をmain版baselineに戻し、PR #63のparent-scoped overrideだけを追加する。
  - `pnpm 9.10.0`で`pnpm-lock.yaml`を再生成する。
  - conflict、dependency graph、Expo、uuid/xcode smoke、repository validation、merge commit、通常push、PR #63本文と最新CIの確認。
  - 今回専用のRun Artifactとplanの作成・保存・sanitize。
- Out:
  - rebase、force push、mainへの直接push、新しいPRの作成。
  - direct/global `uuid`追加、`xcode`/Expo/React Native/Metroの追加更新、selectorの一般化。
  - CI workflow、アプリケーションソース、テストの変更、Expo Doctorのskip/exclude/allow-failure。
  - 過去Run Artifactの上書き・削除。

## Assumptions

- 現在の`MERGE_HEAD=47ea147`は今回依頼と同じ通常mergeの途中状態であり、mergeを再開始せず安全に引き継ぐ。
- 既にindexへ入っているmain側の`AGENTS.md`、`.github/pull_request_template.md`、過去Run/planは破棄せず、PR #64とmainの変更として保持する。
- `pnpm --version`が9.10.0であることを確認してからlockfileを生成する。異なる場合はそのまま生成せず原因を記録する。
- GitHub Actionsはpush後に非同期で進むため、確認時点の状態をjob単位で記録し、pendingはPASSとみなさない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象branch、merge方式、保持するversion、override selector、完了条件は依頼で確定している。
- 仮定してよい細部: merge中のmain-side staged filesは既存mergeの正しい取り込み結果として維持する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 競合は`package.json`と`pnpm-lock.yaml`に限定され、main baseline採用と生成済みlockfileで解消できる。
- H2: mainのExpo patch versionsと`expo-constants` overrideを保持し、xcode配下だけにuuid overrideを追加すれば、Expo Doctorとxcode smokeを同時に満たせる。
- H3: lockfile再生成後のPR差分は、scoped overrideとそのresolution edge、および今回Run/planに限定され、main側のExpo/PR #64変更を巻き戻さない。

## Research Plan

- Round 1 Query: worktree、merge state、`origin/main`、PR #62/#63/#64、Issue #57、必須docs/ADR/Runを確認する。
- Round 2 Query: conflict解消後のpackage/lockfile、graph、local gates、commit、push後のPR/CIを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 1. 新Runを作成し、現在のmerge stateと既存変更をRun Artifactへ記録する。
- 2. `package.json`と`pnpm-lock.yaml`はmain側をbaselineとして採用し、`package.json`へscoped overrideのみを追加する。
- 3. `pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile`でlockfileを再生成し、手作業のlockfile継ぎ合わせは行わない。
- 4. unmerged/marker/version/diff、frozen install、graph、Expo、uuid/xcode smoke、config、verifyを順序どおり実行する。
- 5. 変更範囲と安全条件を再確認してmerge commitを作成し、通常のexplicit pushを行う。
- 6. push後のPR #63 metadata/checksを確認し、日本語の最新本文へ更新する。CIがpendingの場合はその事実を残し、結果確定後に再確認する。

## Definition of Done

- unmerged pathが0で、意図しないconflict markerがない。
- mainのExpo主要version、`expo-linking`、React、React Native、PR #64の文書変更を保持する。
- `package.json`とlockfileに`expo-constants: 57.0.14`と`xcode@3.0.1>uuid: 11.1.1`があり、xcodeは3.0.1、direct/global uuid変更がない。
- pnpm 9.10.0によるlockfile再生成、frozen install、Expo check、Expo Doctor 17/17、graph、uuid/xcode smoke、`expo config`、`pnpm run verify`、`git diff --check`が成功する。
- 通常merge commitを作成し、指定branchへforceなしでpushする。
- PR #63の本文が日本語で、統合方法・version維持・最新CI結果を反映し、mergeable状態を確認する。
- Run Artifactをsanitizeし、未完了事項としてDependabot Alert #1のmerge後resolved確認を記録する。

## Risks / Unknowns

- feature側packageをそのまま採用すると`expo-constants 57.0.13`へrollbackするため、必ずmain側をbaselineにする。
- lockfileを手動編集するとresolution graphが不整合になるため、pnpm生成結果だけを採用する。
- local validationやCIで失敗した場合、最初の異常を上流として分類し、現在の差分で安全に直せる最小修正だけを検討する。
- GitHubのmergeability/checks反映遅延があり得る。無目的な再実行やCI設定変更はしない。

## Thinking Log

- 2026-08-25 17:43 JST: 指定worktree/branchは正しい。`HEAD=c8606ec`、`origin/main=47ea147`、`MERGE_HEAD=47ea147`で、通常merge途中。unmergedは`package.json`と`pnpm-lock.yaml`のみ。
- 2026-08-25 17:43 JST: stage 2はPR #63側、stage 3はmain側。main側にPR #62のExpo patch alignmentとPR #64の文書変更があるため、package/lockfileはmain baselineを採用する。
- 2026-08-25 17:43 JST: 過去Run `20260825-120944-JST`、`20260825-135622-JST`と既存planは上書きせず、今回Run `20260825-174310-JST`へ記録する。
