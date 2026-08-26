# PR #62 conflict解消計画

## 0. 依頼概要

- 依頼内容: PR #62の`fix/expo-sdk-57-patch-alignment`へ`origin/main`を通常mergeし、conflictを解消する。
- 背景: PR #62はIssue #59のExpo SDK 57 patch alignmentを実装済みだが、現在のmainより10 commit遅れており、GitHub上でCONFLICTINGになっている。
- 期待成果: mainの既存変更を保持しつつ、Issue #59の7 package alignmentを維持したmerge commitを作成・pushし、最新headのCIとmergeabilityを確認する。

## 1. ゴール / 完了条件

- ゴール: `origin/main`の変更を`fix/expo-sdk-57-patch-alignment`へ通常mergeで取り込み、PR #62をconflictなしにする。
- 完了条件（DoD）:
  - 指定worktree・branch・upstreamを維持する。
  - rebase、force push、mainへのpush、PR #62のmergeを行わない。
  - package.jsonで7つのExpo patch、`expo-constants` override、mainのjs-yaml 2 overrideを保持する。
  - lockfileをmain baselineから再生成し、unrelated rollback/churnがない。
  - unmerged file 0、local quality gates PASS、merge commitをexplicit refspecでpushする。
  - PR #62のmergeable状態と最新head CIを確認する。

## 2. 現状理解と前提

- Current understanding:
  - 作業worktreeは`C:/Users/sella/Documents/qa-training-store-expo59`。
  - current branchは`fix/expo-sdk-57-patch-alignment`、upstreamは`origin/fix/expo-sdk-57-patch-alignment`。
  - merge前HEADとremote feature headは`6ebaf458b4f5b04b8d40c7f85c4551060b2f452f`で一致している。
  - `origin/main`は`74834bf9ac859db5d9aec1f34bd8c6337f4698c8`、merge-baseは`a3a58ae4b4168c34307e6dd0f2d21c039a972fab`、関係はmain 10 commits ahead / feature 4 commits ahead。
  - mainとfeatureの差分対象は過去Run Artifact 5件、過去plan 1件、`package.json`、`pnpm-lock.yaml`。
  - mainの`package.json`にはjs-yaml security override 2件が存在し、feature側にはない。
- Assumptions:
  - ユーザー指定どおり、conflict解消は`git merge origin/main`のみで行い、rebaseは使わない。
  - 過去Run Artifactと過去planはmain側を正本とし、今回のfollow-upは新Run `20260825-120944-JST`へ記録する。
  - lockfileは手動でconflict markerを継ぎ合わせず、main版をbaselineとしてpackage.jsonから再生成する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。merge方式、保持対象、禁止事項、完了条件はユーザー指定で確定している。
- 仮定してよい細部: 実際のconflictファイルが事前想定と異なる場合は、内容を確認してmainの既存機能を優先し、Issue #59の差分だけを再適用する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Git履歴: `origin/main`を親とするmerge commit。
  - 依存契約: Expo SDK 57 patch versionとpnpm lockfile。
  - Run/plan記録: 今回のconflict解消専用の新Runとplan。
  - CI: Web CI、Mobile App CIおよびNative/Android/iOS gate。
- Files to inspect:
  - `package.json`
  - `pnpm-lock.yaml`
  - `.github/workflows/native-ci.yml`
  - `.codex/runs/20260823-001154-JST/*`
  - `docs/plans/2026-08-23_001628_expo_sdk_57_patch_alignment.md`
  - `.codex/templates/*`、`scripts/sanitize-codex-artifacts.ps1`

## 5. 変更方針

- Change strategy:
  1. merge前のbranch safety、clean状態、remote、復旧点を確認する。
  2. `git merge origin/main`を実行し、conflict一覧を列挙する。
  3. 過去Run Artifactと過去planは、conflictしたものだけmain側を採用する。
  4. `package.json`はmain版をbaselineにして、7つのExpo patchと`expo-constants` overrideだけを再適用し、js-yaml override 2件とmainのReact/React Nativeを保持する。
  5. `pnpm-lock.yaml`はmain版をbaselineにして`pnpm install --lockfile-only --ignore-scripts`で再生成し、Prettier後にstabilityを確認する。
  6. unmerged file、marker、差分、dependency contractを確認し、local gatesを実行する。
  7. 明示的に対象ファイルをstageしてmerge commitを作成し、branch safetyを再確認して`git push origin HEAD:fix/expo-sdk-57-patch-alignment`する。
  8. GitHubのmergeabilityと最新headのCI、Android Runtime/Maestroの実step、iOS/native verifyを確認し、PR本文を最新headへ同期する。

## 6. 検証方法

- Validation plan:
  - `git status`、`git diff --name-only --diff-filter=U`、conflict marker検索。
  - `git diff --cached`、merge後の`git diff origin/main...HEAD`。
  - `pnpm install --frozen-lockfile`、`pnpm list ... --depth 0`、`pnpm exec expo install --check`、`pnpm dlx expo-doctor@1.17.6`。
  - Native Static workflow定義の実command: native assets、generated diff、image manifest、native component、native route、EAS、Expo Doctor。
  - `pnpm run format:check`、`pnpm run verify`、`git diff --check`。
  - GitHub ActionsのWeb CI/Mobile App CI全jobと、Android RuntimeのAPK download/verify/install/launch/Maestro flowをstep単位で確認する。
- 成功判定:
  - unmerged file 0、対象overrideと7 patchが維持され、local gatesがPASS。
  - merge commitがremote feature branchへfast-forward pushされ、PR #62がCONFLICTINGでない。
  - 最新headのrequired CIがsuccessし、Maestroの実flowがskipされていない。

## 7. リスクと未解決論点

- Risks:
  - package.jsonをfeature側で丸ごと採用するとmainのsecurity overrideを失うため、main baselineから再構成する。
  - lockfileを手動解決するとmainのresolutionを巻き戻す恐れがあるため、生成し直す。
  - merge後CIでmainとのinteractionが見つかる可能性があるため、最初のfailureを特定してから必要最小限のみ修正する。
  - GitHubのmergeability判定に更新遅延がある可能性があるため、無目的なpoll/re-runは行わない。
- Open questions: なし。実際のconflict内容はmerge後に確認する。

## 8. 成果物

- 変更ファイル: main側を保持したconflict解消結果、package.json、再生成pnpm-lock.yaml、merge commit。
- 付随ドキュメント: `docs/plans/2026-08-25_120944_pr62_conflict_resolution.md`、`.codex/runs/20260825-120944-JST/`。

## 9. 備考

- PR #58、Issue #60、main worktree、main branchには変更を加えない。
- PR #62はmergeせず、最終判断だけを報告する。
