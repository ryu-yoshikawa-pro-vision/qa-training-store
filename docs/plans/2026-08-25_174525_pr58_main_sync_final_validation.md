# PR #58 最新main同期・最終検証計画

## 0. 依頼概要

- 依頼内容: PR #58の対象branchへ最新`origin/main`を通常mergeで取り込み、依存・文書・CI・PR metadataを最新headで再確認する。
- 背景: PR #62／#64がmainへmerge済みで、PR #58はExpo patch alignmentとPR日本語ルールを含む最新mainへ追従する必要がある。
- 期待成果: PR #58をmergeせず、brace-expansion remediationとmain側修正を維持したREADY / NOT READY判定を行う。

## 1. ゴール / 完了条件

- ゴール: `fix/dependabot-brace-expansion-r2-metadata-evaluation`へ`origin/main`を通常mergeし、最新headでIssue #54のDoDとrequired CIを確認する。
- 完了条件（DoD）:
  - current worktree／branchがPR #58の正本と一致し、merge前headと`origin/main` SHAを記録する。
  - rebase、force push、mainへのcommit／push、PR merge、Issue #60実装を行わない。
  - `package.json`は最新mainをbaselineにし、brace-expansion parent-scoped override 2件、js-yaml override 2件、Expo SDK 57 patchを維持する。
  - `pnpm-lock.yaml`をmain baselineと完成済み`package.json`から再生成し、2回目resolutionで追加diff 0を確認する。
  - `AGENTS.md`のPR日本語ルールと既存Git Branch Safety、PR template日本語版、既存`docs/reference/git-branch-safety.md`を維持する。
  - unmerged file 0、frozen install、依存監査、Expo check／Doctor 17/17、format、verify、diff check、sanitizerを確認する。
  - merge commitを作成し、確認済みexplicit refspecでPR branchへpushする。
  - push後の最新headでWeb／Mobile required CIとnative実行stepを確認し、PR title/bodyを日本語化してREADY / NOT READYを判定する。

## 2. 現状理解と前提

- Current understanding:
  - 対象worktreeは`<REPO_ROOT>`、current branchは`fix/dependabot-brace-expansion-r2-metadata-evaluation`。
  - PR #58はOPEN、baseは`main`、headは`58ed3791de80b3640da44e656aae4dbacc5db795`、mergeableはCONFLICTING。
  - `origin/main`は`47ea1477dda468864d3b053bedcfef0a6afb887e`、merge-baseは`74834bf9ac859db5d9aec1f34bd8c6337f4698c8`、関係はmain 2 ahead / feature 7 ahead。
  - `git fetch origin`は完了した。対象worktreeでは通常mergeの途中状態で、`MERGE_HEAD`は`origin/main`、`ORIG_HEAD`はmerge前head、未解決は`AGENTS.md`のみ。
  - index上の`package.json`はmainのExpo patch／js-yamlにbrace-expansion override 2件を加えた状態で、`pnpm-lock.yaml`も対応resolutionを含む。
- Assumptions:
  - 既存のmerge途中状態はユーザー指定の通常merge結果として継続し、`git merge --abort`、stash、resetで捨てない。
  - `AGENTS.md`は最新mainをbaselineに、PR #58側のGit Branch Safety sectionを再適用し、PR #64側のPR日本語ルールを同時に保持する。
  - CIの未取得・未実行結果はPASSへ繰り上げず、必要な場合はNOT READYの根拠として記録する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。merge方式、対象差分、禁止事項、完了判定は指定済み。
- 仮定してよい細部: なし。CI job名やPR本文の検証項目は実際のworkflow／GitHub結果に合わせる。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Git履歴: `origin/main`をsecond parentとする通常merge commit。
  - 依存契約: `package.json`、`pnpm-lock.yaml`、Expo SDK 57、js-yaml、brace-expansion resolution。
  - Repository運用文書: `AGENTS.md`、PR template、既存Git Branch Safety document。
  - GitHub外部状態: PR #58のfeature branch push、title/body、CI／review metadata。
  - Run／plan artifact: 今回のStrict Runとplanのみを新規作成する。
- Files to inspect:
  - `package.json`
  - `pnpm-lock.yaml`
  - `AGENTS.md`
  - `.github/pull_request_template.md`
  - `docs/reference/git-branch-safety.md`
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
  - `.github/workflows/native-ios-ci.yml`
  - `scripts/sanitize-codex-artifacts.ps1`

## 5. 変更方針

- Change strategy:
  1. 現在のmerge metadata、branch safety、index差分、remote SHAを記録する。
  2. `AGENTS.md`をファイル単位で解消し、main側の日本語PRルールとPR #58側のGit Branch Safetyを統合する。
  3. conflict marker／unmergedを確認し、package／lockfile／template／既存docsの内容をmain基準で監査する。
  4. 完成済み`package.json`からlockfileを`pnpm install --lockfile-only --ignore-scripts`で再生成し、安定性とsemantic差分を確認する。
  5. frozen install、brace-expansion why/list/audit、Expo check／Doctor、repository quality gatesを実行する。
  6. Run ArtifactをsanitizerでWrite／Checkし、明示stage・cached diff・branch safetyを確認してmerge commitを作成する。
  7. post-merge差分を確認後、explicit refspecでpushし、push後headのCI／review／PR metadataを取得する。
  8. 実結果だけでPR本文を日本語更新し、PRをmergeせずREADY / NOT READYを判定する。
- 実行タスク:
  - [ ] 1. merge途中状態と対象差分を記録する。
  - [ ] 2. `AGENTS.md`を個別解消する。
  - [ ] 3. package／lockfile／docsの契約を監査する。
  - [ ] 4. lockfile再生成とstability確認を行う。
  - [ ] 5. local validationとsanitizerを実行する。
  - [ ] 6. merge commitを作成し、explicit refspecでpushする。
  - [ ] 7. 最新headのCI、review、PR metadataを確認する。
  - [ ] 8. PR本文を更新し、最終判定を記録する。

## 6. 検証方法

- Validation plan:
  - Git: `git status`、branch／upstream、`git diff --name-only --diff-filter=U`、marker、cached diff、post-merge main基準diff。
  - Dependency: `pnpm install --lockfile-only --ignore-scripts`、2回目同コマンド、`pnpm install --frozen-lockfile --ignore-scripts`、`pnpm why`、`pnpm list`、`pnpm audit`。
  - Expo／repository: `pnpm exec expo install --check`、`pnpm dlx expo-doctor@1.17.6`、`pnpm run format:check`、`pnpm run verify`、`git diff --check`、必要なNative Static相当コマンド。
  - Artifact: `scripts/sanitize-codex-artifacts.ps1 -Write -Check -ChangedOnly`。
  - Remote: latest headのWeb／Mobile CI全required job、Android RuntimeのAPK download／verify／install／launch／Maestro実flow、iOS build gate、native-ci / verify、PR metadata、review threadを確認する。
- 成功判定:
  - Issue #54対象の1.1.16／5.0.8がなく、1.1.18／5.0.9がparent path付きで解決される。
  - Expo Doctorが17/17、local quality gateとsanitizerがPASSし、merge後にbehind 0となる。
  - latest headのrequired CIがすべてsuccessし、PRがOPEN／未mergeのままmergeableで、title/bodyが日本語である。

## 7. リスクと未解決論点

- Risks:
  - `AGENTS.md`を片側採用するとbranch safetyまたはPR日本語ルールを失うため、両sectionを明示確認する。
  - lockfileを手作業で編集するとmainのExpo／peer graphを巻き戻すため、生成結果を使う。
  - CI failureがmerge interactionかbaseline／externalか不明なままrerunしない。最初のfailureと派生エラーを分離する。
  - GitHub metadata更新やpushは外部状態を変更するため、直前にbranch／PR headを再確認する。
- Open questions: 実際のlatest head CI結論とGitHub mergeabilityはpush後に確認する。

## 8. 成果物

- 変更ファイル: merge解消済み`AGENTS.md`、依存／lockfile、既存main docs、今回Run Artifact、今回plan、PR metadata。
- 付随ドキュメント: `.codex/runs/20260825-174525-JST/`、`docs/plans/2026-08-25_174525_pr58_main_sync_final_validation.md`。

## 9. 備考

- PR #58はmergeしない。Issue #60、nanoid、image-size、uuid、unrelated dependency、workflow gate緩和は対象外とする。
- `git add .`、rebase、force push、bare push、reset、audit --fix、update --latestは使用しない。
