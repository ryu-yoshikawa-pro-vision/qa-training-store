# Plan（計画）

## Objective（目的）

- PR #180の同一head branch上で、最新のfollow-up Planに記載されたDomain / Application境界refactorをTask 0〜15まで実施する。

## Scope（対象範囲）

- In: `docs/plans/2026-09-24_132400_issue-132-follow-up-domain-application-boundary.md`の対象source、test、documentation、Run Artifact、commit、通常push、PR #180本文更新、最新head CI確認。
- Out: Plan §11 / §15に列挙されたProduct behavior、Repository method semantics、DB schema、transaction scope、Test Control、Native / Web feature、generic architecture、無関係なrefactor。
- Branch: `plan/issue-132-follow-up-domain-application-boundary`（PR #180のhead branchを継続使用）。
- 正本: `docs/plans/2026-09-24_132400_issue-132-follow-up-domain-application-boundary.md`、ADR-0027、Current AGENTS / Safety / implementation harness。

## Assumptions（仮定）

- PR #180はopen、baseは`main`、headは`edbbe565d5af0f6c1c010ecace78ab2d5349781d`。local branch / HEAD / origin PR branchも同じ。
- GitHub mainとlocal `origin/main`は開始時点で`ac4e57721b55091ace3689eda289d44188241aee`。
- local working treeは開始時にclean。Task 1で`git fetch origin main`後に再確認する。
- new-run.shはWindows上のbash起動が30秒超停止したため使わず、Planに定めるfallbackでtemplateのAgent-managed 3 artifactだけを初期化した。`run.json`はcollectorまで作らない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: なし。material driftはTask 1でCurrent sourceから確認する。
- 未回答の重要質問: Safety契約上のfile-delete operationが明示承認下で可能か。Task 1のCurrent Safety確認で判定する。

## Hypotheses（仮説）

- H1: Current mainからのmaterial driftがなければ、PlanのRepository ownership一覧と呼出経路がCurrent sourceに一致する。
- H2: Task 1の安全確認を通過すれば、既存契約を弱めずにsource migrationと検証を完了できる。

## Research Plan（調査計画）

- Round 1 Query: PR/current branch/latest main/Plan/ADR/Safety/harnessを確認し、material driftとdelete gateを判定する。
- Round 2 Query: Task 2 baseline後に対象consumer・既存test・CI契約・documentationをCurrent sourceで照合する。
- Exit Criteria: Plan完了条件を1件ずつ確認し、Web CIとMobile App CIを最新PR headで`success`にする。

## Approach（進め方）

- durable PlanのTask 0〜15を順番に実行する。
- material driftがあれば影響した箇所だけ再評価し、ADR-0027のDecisionは再設計しない。
- Task 10 focused validation、Task 11 repository gate、Task 12 final inventory、Task 13 collector / sanitizer、Task 14 commit/push/PR update、Task 15 latest-head CIの順を守る。

## Definition of Done（完了条件）

- Plan §13に列挙された全条件を満たす。PR #180はopenのまま維持する。
- local HEAD / remote branch HEAD / PR headを一致させ、Web CI / Mobile App CIを最新headでsuccessにする。

## Risks / Unknowns（リスク・未知点）

- 未使用Domain Repository moduleの物理削除はCurrent Safety gateに従う。許容されない場合はTask 1で停止し、Runへ根拠と未完了事項を残す。
- main追従で公開branchのhistory rewrite / force pushが必要になる場合は停止する。
- 検証・CI failureは因果関係を分類し、Current repair contractの範囲で対応する。

## Thinking Log（判断記録）

- 2026-09-24: 最新PlanとPR本文はPR #180同一branch上のsource/test実装へ更新済み。PRはopenで、PlanのTask 0〜15が今回の依頼に適用される。
- 2026-09-24: 削除対象2 fileの明示承認はユーザーから受領済み。実行可否はCurrent Safety契約の追加条件を読んでTask 1で確定する。
- 2026-09-24: Task 1で`git fetch origin main`を実行。`FETCH_HEAD`、`origin/main`、GitHub mainはすべて`ac4e57721b55091ace3689eda289d44188241aee`。`origin/main...HEAD`はbehind 0 / ahead 13で、PR branchは最新mainを含む。Plan作成時SHA `9cef8501c2b19e1764892b0c17ee50318fa90b97`から`origin/main`への指定対象path差分は0 file、material driftなし。
- 2026-09-24: Safety確認ではcommand-based deletionは禁止。safe patchの削除は原則不可だが、対象明示・レビュー可能な理由を満たす場合はcandidateとして扱う契約。ユーザーが2 fileと理由を明示承認済みであり、Task 6でconsumer移行と旧path 0を再確認後、parent agentが差分をレビュー可能なoperationで物理削除する。現在は削除しない。
- 2026-09-24: Task 10の最初のpolicy validationはVitest worker startup timeoutで4 unhandled errors、0 tests、exit 1。transform / import / test assertion段階へ到達していない。複数の別worktree Node processとVitestのnested output projectを観測したため`ENVIRONMENT_FAILURE`として分類し、source修正ではなくbounded serial-worker validationを一度実施する。same stageが再度失敗した場合はrepair-loop stop conditionで停止する。
- 2026-09-24: final precommit確認で`origin/main`が開始時`ac4e57721b55091ace3689eda289d44188241aee`から`e829f5dea70fc7513596724d816b8c09e53b76b1`へ進み、head branchはahead 13 / behind 1。追加commit `e829f5d` (#168) はWorkflow E2E Evalを追加し、`package.json`へeval script 1行、skill-eval source/test、QA_AGENT、関連Plan / Run Artifactを変更。Plan Task 1の指定source / consumer / architecture-test / ADR / documentation / Safety path familyは`ac4e577..origin/main`で差分0。package script追加は`eval:skills:workflow`のみでverify/test scriptは変更なし。material driftはなく、ADR-0027再Decision・merge/rebaseは行わず、同一PR branchから通常fast-forward push可能なまま作業する。
- 2026-09-24: push後Mobile App CI `Native Static / Run Expo Doctor`がfailure。current `main`とPR sourceの両方で同じ4つの既存Expo package patchがExpo Doctor 1.17.6のexpected patchより1つ遅れていることを比較確認した。Repository repair policyと明示された必須Mobile CI success条件に従い、`package.json` / `pnpm-lock.yaml`のみで該当4 direct dependencyを指定patchへ更新する限定repairを1 iteration実施。新direct dependency / architecture判断なし。CI同一doctor local 17/17 PASS、frozen install / native component / route / EAS / 3 typechecksもPASS。repairに起因しないstrict local verify残差はignored stale `output/**` copyのunit policy 3件と分類し、generated copiesは変更しない。
