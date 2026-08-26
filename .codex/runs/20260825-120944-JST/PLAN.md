# Plan

## Objective

- PR #62へ`origin/main`を通常mergeし、main側の変更を保持したままIssue #59のExpo SDK 57 patch alignmentを維持する。

## Scope

- In:
  - 指定worktree/branchでの`git merge origin/main`。
  - 実conflictの列挙とファイル単位の解消。
  - package.jsonのmain baseline + Issue #59差分再構成。
  - main baselineからのpnpm lockfile再生成。
  - 新Runへの判断・検証記録、merge commit、explicit refspec push、PR/CI確認。
- Out:
  - rebase、force push、mainへのpush、PR #62のmerge。
  - 新worktree/branch作成。
  - PR #58、Issue #60、brace-expansion remediationの変更。
  - Expo Doctor skip、workflow gate緩和、unrelated dependency更新。

## Assumptions

- merge前の復旧点はremote feature branch `6ebaf458b4f5b04b8d40c7f85c4551060b2f452f`で保存済み。
- 過去Run Artifactと過去planはmain側が正本であり、今回のfollow-upは新Run `20260825-120944-JST`へ記録する。
- lockfileは手動編集せず、main版を基準にpackage.jsonから生成する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。merge方式と保持すべき変更はユーザー指示で確定している。
- 仮定してよい細部: 想定外conflictは内容を確認し、main既存機能を優先して局所解消する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: conflictは過去Run/plan、package.json、pnpm-lock.yamlに限定され、過去履歴はmain側採用で解消できる。
- H2: package.jsonをmain baselineから再構成し、7 Expo patchとexpo-constants overrideを再適用すれば、mainのjs-yaml security overridesを失わずにExpo Doctor 17/17を維持できる。
- H3: main baselineからlockfileを再生成すれば、unrelated rollback/churnを避けられる。

## Research Plan

- Round 1 Query: merge前のbranch safety、remote SHA、merge-base/ahead-behind、main/featureの差分、workflow commandを確認する。
- Round 2 Query: merge後の各conflict内容、package/lockfile差分、local gates、PR mergeability、最新head CIを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 1. merge前安全確認と新Run/plan保存。
- 2. `git merge origin/main`を実行し、conflictをファイル単位で確認する。
- 3. 過去Artifact/planはmain、package.jsonはmain baseline + Issue #59、lockfileは生成し直す。
- 4. marker/差分/dependency/quality gatesを確認する。
- 5. 明示stage、merge commit、branch safety確認、explicit refspec pushを行う。
- 6. PR mergeability、最新headのWeb/Mobile CI、Native/Android/iOS実stepを確認し、PR本文を同期する。

## Definition of Done

- unmerged file 0、conflict markerなし。
- 7 Expo packageが`57.0.13/57.0.16/57.0.14/57.0.14/57.0.2/57.0.15/57.0.16`、expo-constants overrideが`57.0.14`。
- mainのjs-yaml override 2件、React 19.2.3、React Native 0.86.2を保持。
- frozen install、Expo check/Doctor、Native Static相当、format、verify、diff checkがPASS。
- merge commitが作成され、指定remoteへforceなしでpushされる。
- PR #62がCONFLICTINGでなく、最新headのrequired CIとMaestro実flowが成功する。

## Risks / Unknowns

- package.jsonをfeature側で丸ごと採用するとmain security overrideを失う。main版をbaselineにする。
- lockfileの手動mergeはresolution rollbackを招く。main版から再生成する。
- main取り込みによるCI interactionは、最初のfailureを分類してから必要最小限対応する。
- GitHubのmergeability反映遅延があり得るため、無目的なpoll/re-runはしない。

## Thinking Log

- 2026-08-25 12:09 JST: 指定worktreeはclean、branch/upstreamは正しく、local/remote feature headは`6ebaf458...`で一致。`origin/main`は`74834bf...`、merge-baseは`a3a58ae...`、関係はmain 10 ahead / feature 4 ahead。
- 2026-08-25 12:09 JST: main/feature差分は過去Run Artifact 5件、過去plan 1件、package.json、pnpm-lock.yaml。main packageにはjs-yaml security override 2件があるため、packageはmain baselineから再構成する。
