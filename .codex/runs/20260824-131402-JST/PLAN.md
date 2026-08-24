# Plan

## Objective

- Issue #51 / PR #52でpnpm canonical lockfileへのnormalizationとPrettier ownership統一がmainへ反映された前提で、PR #50のDependabot Alert #5（`js-yaml@4.3.0` / `GHSA-5p4m-2wfm-xmqj`）を必要最小限のdependency差分でremediateする。
- これまでのCandidate 1〜4は再実行せず、Issue #51解消後の新しい前提でR1、必要時のみR2を各1回だけ評価する。
- 安全な最小remediationが成立した場合だけ`FIX`として採用し、成立しなければ具体的根拠を付けて`IN_SCOPE / BLOCKED`を維持する。

## Scope

### In

- 新Run `.codex/runs/20260824-131402-JST/` のPLAN/TASKS/REPORT/run.json。
- branch/main同期、working tree、Node/pnpm、Issue #51 no-op precondition、current Dependabot inventory、lockfile authoritative resolutionの確認。
- R1 `pnpm update js-yaml@4.3.1 --depth Infinity --lockfile-only` の1回評価。
- R1不採用時だけR2のparent-scoped overrideを1回評価。
- 採用candidateのfrozen install、why/list、audit、format:check、verify、Run Artifact finalization、commit、ordinary push、PR #50 CI確認。
- rejected candidateを通常のfile restorationでbaselineへ戻す。

### Out

- Candidate 1〜4、`--resolution-only`、新しいupdate variationの探索。
- global override、ancestor更新、transitive dependencyのdirect dependency化、manual lockfile edit、dedupe、audit --fix、unrelated Alert修正。
- application source、test、workflow、Dependabot設定、Prettier設定、PR title/body、PR merge。
- force push、rebase、git reset、git clean。

## Assumptions

- Issue #51 / PR #52のcanonical lockfileは対象branchの現在HEADで既に取り込み済みであり、no-op lockfile generationはdiff 0になる。
- `package.json`と`pnpm-lock.yaml`は作業開始時にcleanで、before hashを最終確認の基準にする。
- `@eslint/eslintrc@3.3.6`と`@expo/xcpretty@4.4.4`のparent rangeはpatched `js-yaml@4.3.1`を許容する。
- GitHub Alertのdefault-branch基準stateは、branch上のlockfile remediation判定とは分離して扱う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。実験回数、候補順、採否条件、禁止事項、完了条件はユーザー指示とPlanで確定している。
- 仮定してよい細部: lockfileのsemantic比較はimporters/packages/snapshots/settings/overrides/checksumとjs-yaml keys、経路はlockfile snapshotとinstalled treeで確認する。
- 未回答の重要質問: なし。R1のsemantic diffでR2要否を決定する。

## Hypotheses

- H1: Issue #51のownership統一後、`pnpm install --lockfile-only --ignore-scripts`はdiff 0となり、targeted updateの差分からformatting churnが消える。
- H2: R1は`js-yaml@4.3.0`だけを4.3.1へ移し、safe 3.15.1/5.2.2とunrelated resolutionを変更しない。
- H3: R1がunrelated semantic churnを発生させる場合のみ、確認済み2 parentに限定したR2が安全な最小差分になる。

## Research Plan

- Round 1: branch/main baseline、Issue #51 no-op precondition、current Alert inventory、pnpm-lock.yamlのjs-yaml全resolution/pathを確認する。
- Round 2: R1をsupported syntax確認後に1回実行し、package/lockfile diffとsemantic resolutionで採否する。
- Round 3: R1不採用時だけbaseline復元を確認し、R2のparent-scoped overrideを1回実行・採否する。R1採用時はR2を実行しない。
- Round 4: 採用stateをvalidationし、Run Artifactをfinalize、Sanitizer/lint、explicit stage、commit/push、PR CI/Alertを確認する。
- Exit Criteria:
  - no-op diff 0またはprecondition blockerを客観的に記録する。
  - initial Alert全件をscope/disposition付きで記録する。
  - R1/R2の採否をsemantic diffで判定し、rejected stateをbaselineへ復元する。
  - 採用時はaffected 4.3.0を対象経路から除去し、frozen install/audit/why/list/format:check/verifyを実行する。
  - Run Artifact Sanitizer Write/Checkとmarkdown lint、final diff、commit/push、PR CIを確認する。

## Approach

1. 既存Runと必須文書を確認し、branchがcanonical mainにbehindしていないこととdependency baseline cleanを確認する。
2. 新RunへbaselineとIssue #51 preconditionを記録し、`pnpm install --lockfile-only --ignore-scripts`を1回実行する。
3. no-op diff 0後にOpen Dependabot Alertsを再取得し、lockfileを正本としてjs-yamlの全経路を確認する。
4. `pnpm help update`でR1 syntaxを確認し、R1を1回だけ評価する。採用条件を満たさなければ通常のfile restorationで完全復元する。
5. R1不採用時のみ、確認済みparentに限定したR2を1回評価する。安全な最小差分でなければ復元してBLOCKEDで停止する。
6. 採用candidateをvalidationし、Run Artifactを最終化してから明示stage、commit、ordinary push、PR checks確認を行う。

## Definition of Done

- Standard Runを作成し、branch/main `behind == 0`、Node 24、pnpm 9.10.0、baseline hashを記録している。
- Issue #51 no-op preconditionを確認し、dependency mutation前のcurrent Alert inventory全件を記録している。
- R1を1回、必要時のみR2を1回評価し、過去Candidate 1〜4や禁止variationを実行していない。
- 採用時は`js-yaml@4.3.0`を対象経路から除去し、safe 3.15.1/5.2.2とunrelated dependencyを不要更新していない。
- frozen install、audit、why/list、format:check、verify、git diff --checkを最終stateで確認している。
- Run Artifactへvalidation、disposition、follow-up、未実行項目、subagent省略理由を記録し、Sanitizer/lintを成功させている。
- explicit stage、commit、ordinary push、PR #50最新HEADのrequired CI確認を完了し、PR title/bodyを変更していない。

## Risks / Unknowns

- no-opでdiffが出た場合はIssue #51 precondition regressionとしてmutationを停止する。
- R1/R2がunrelated semantic churnを含む場合はexit codeに関係なく不採用とし、追加variationを行わない。
- installed treeはlockfile-only mutation直後にstaleとなり得るため、採否はlockfile/diffを正本、採用後のfrozen install後にwhy/listを補助確認とする。
- `pnpm audit`は独立Alertが残るためnon-zeroになり得る。Alert inventoryの代替にはしない。
- High/runtime Alert #5を安全にFIXできない場合は、脆弱性解消済みとは報告せずBLOCKEDとする。

## Thinking Log

- 2026-08-24 13:14 JST: canonical remote main `b6d6923b7428b4446ae7037ac3d73401abf4a529`に対しbranch `a42e1b00b1f13f65d14617fb3959756a2c1a43a1`は`behind_by=0`、`ahead_by=33`。dependency filesはclean、package hash `d85fc12c...`、lock hash `e1e4b817...`。
- 2026-08-24 13:14 JST: PR #50はOPEN、head/base/branchは対象どおり、title/bodyは変更しない。既存Runは完了済みで、今回専用Runを新規作成する。
