# Plan

## Objective

- Issue #55 の `nanoid` High Alert（`GHSA-2v37-7h3g-55p8`）について、最新 `origin/main` を基準に全 dependency path と一次情報を調査し、production dependency を変更せずに実装可能な remediation 方針を1つ確定する。
- 調査結果を durable report と Run Artifact に保存し、対象 branch へ通常 commit・pushする。

## Scope

- In:
  - 保存済みPlan `docs/plans/2026-08-25_205100_nanoid_vulnerability_remediation_investigation.md` の Task 1〜13。
  - `origin/main` と current branch の dependency 関連差分確認。
  - `pnpm@9.10.0` による current graph、direct usage、Advisory、parent range、isolated candidate 検証。
  - lockfile-only → targeted resolution → manifest-controlled parent update の順の候補評価。
  - `docs/reports/` の調査結果と `.codex/runs/20260825-225012-JST/` の標準 Artifact。
- Out:
  - `package.json` / `pnpm-lock.yaml` への production remediation 実装。
  - product code / test code / Issue #55 / PR #66 の変更。
  - `pnpm run verify`、Web CI、Native CI、framework major upgrade、Alert dismiss、新規PR作成、PR merge。

## Assumptions

- current branch と PR #66 の head branch が一致している限り、この branch を調査 baseline とする。
- `origin/main` の dependency 関連ファイルに差分がなければ merge / rebase は行わない。
- candidate 検証による変更は tracked working tree ではなく isolated copy に限定する。
- 調査専用の新規 test code は追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。保存済みPlan、対象PR、対象branch、非目標が明示されている。
- 仮定してよい細部: isolated copy の作成場所、candidate の一時的な manifest 編集方法、Evidence の保存形式。
- 未回答の重要質問: lockfile-only、targeted resolution、parent update のどれが current graph で成立するか。

## Hypotheses

- H1: current parent の semver range 内で `pnpm` の通常 resolution を再生成すれば、全 `nanoid` resolution を Advisory affected range 外へ移行できる。
- H2: H1 が成立しない場合、current graph の親に限定した targeted resolution で unrelated dependency 変更なしに解消できる。
- H3: H1/H2 が成立しない場合、manifest-controlled parent の互換 patch/minor update が最小の安全候補になる。成立候補がなければ阻害要因と再評価条件を記録する。

## Repo mapping

- Entry points: root `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`（存在時）、`.npmrc`（存在時）、source / test / scripts / config の `nanoid` 参照。
- Main flow: root manifest → pnpm lockfile resolution → `expo-router` / `postcss` 等の parent → `nanoid` resolution → runtime/build/dev scope。
- Key abstractions: pnpm semver resolution、pnpm overrides/resolution設定、GitHub Advisory affected range、Expo SDK 57 package compatibility。
- Existing tests: repository既存の focused test/build のみ。今回の全体 quality gate は対象外。
- Safe change surface: durable report、Run Artifact、必要なら調査結果を反映する最小限の文書のみ。production dependency file は変更しない。
- Unknowns: current origin/main 差分、全 parent path、直接利用の有無、Advisory の現行範囲、isolated candidate の再現性。

## Research Plan

- Round 1 Query: Git branch safety、`origin/main` baseline、current dependency graph、direct usage、一次 Advisory と parent range を確定する。
- Round 2 Query: isolated copy で lockfile-only candidate を最初に検証し、必要な場合のみ targeted resolution、parent update、focused/final validation を行う。
- Exit Criteria:
  - 全 `nanoid` resolution と parent path が Evidence 付きで列挙されている。
  - Advisory の affected/patched range、成立 API/条件、parent range が一次情報に基づき整理されている。
  - 実際に成立した candidate のみ比較し、推奨方式または安全な候補なしを確定している。
  - 実装用 safe change surface、validation、rollback、再評価条件が記録されている。
  - report、Run Artifact の sanitizer Check、commit、explicit refspec push、push後のPR head確認が完了している。

## Approach

- 保存済みPlanの順序を変更せず、Task 1〜13を逐次実行する。
- 事実（コマンド・一次情報）と推測（candidateの採否）を分離して記録する。
- candidate は isolated copy でのみ生成し、lockfile は pnpm に生成させる。tracked production files は最後まで不変に保つ。
- 標準フロー: `PLAN -> TASKS -> repo/evidence調査 -> isolated candidate検証 -> REPORT -> sanitizer -> commit -> push`。

## Definition of Done

- 保存済みPlanの調査タスクを完了し、全 vulnerable path の判定根拠を report に保存している。
- production `package.json` / `pnpm-lock.yaml`、product code、test code に remediation 実装差分がない。
- `docs/reports/` と Run Artifact が日本語で保存され、sanitizer Check がPASSしている。
- current branch がPR #66 head branchと一致した状態で、調査成果物だけを通常 commit・explicit refspec pushしている。
- PR #66 がDraftのまま維持され、Issue更新・PR作成・merge・force pushを行っていない。

## Risks / Unknowns

- Issue作成時の情報が古く、current graph に複数の `nanoid` path が残っている可能性がある。全 path と lockfile snapshot を正本にする。
- lockfile-only candidate が unrelated resolution を巻き込む可能性がある。isolated diff で dependency edge と他 package の変更を確認する。
- parent update が Expo / Metro / React Native に波及する可能性がある。Expo SDK 57 の互換性と manifest policy を確認し、major upgradeは除外する。
- 調査後に main が進む可能性がある。implementation 開始時の再確認条件を report に明記する。

## Thinking Log

- 2026-08-25 22:50 (JST): 作業ツリーはclean、current branchは `investigate/issue-55-nanoid-remediation`、PR #66 head branchと一致、PRはDraft/Open。別Issueの `in_progress` Runは今回の調査Runではないため再利用しない。
- 2026-08-25 22:50 (JST): 保存済みPlanを正本とし、今回の調査 scope を拡張しない。`feature-plan` の repo mapping / fact-inference separation をRunへ反映する。
