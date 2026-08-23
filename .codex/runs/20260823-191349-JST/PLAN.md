# Plan

## Objective

- PR #50の既存dependency remediationとは別の調査Runとして、`pnpm`が生成するcanonicalな`pnpm-lock.yaml`とRepositoryへcommitされている形式の差がPrettierによる再整形で生じるかを、指定された最小実験で1回だけ確認する。
- js-yaml remediation、Candidate 1〜4、新しいdependency update commandの探索は今回行わない。
- 実験結果を`CASE P`（Prettier / pnpm lockfile ownership conflict confirmed）または`CASE N`（Prettier conflict not confirmed）へ分類し、Alert #5は`IN_SCOPE / BLOCKED`のまま扱う。

## Scope

### In

- 新規Run `.codex/runs/20260823-191349-JST/` の標準Artifact。
- `pnpm-lock.yaml`のdependency変更なしno-op生成を1回だけ実行する実験。
- RepositoryのPrettier設定、過去のlockfile整形commit、no-op前後のhash/diff/semantic resolution、Prettier check/write結果のread-only調査。
- 実験後のbaseline復元、`pnpm audit`、Alert #5確認、Sanitizer、Markdown lint、commit/push、PR #50 CI確認。

### Out

- 既存Run `.codex/runs/20260823-145911-JST/`、`.codex/runs/20260823-173606-JST/`、`.codex/runs/20260823-183345-JST/` の変更。
- Candidate 1〜4の再実行、`--resolution-only`、新しいdependency update variation、js-yaml remediation。
- `.prettierignore`、`package.json`、`pnpm-lock.yaml`の最終変更、normalization採用、manual lockfile edit、override、ancestor update、direct dependency化。
- application source、test、workflow、PR title/body、別PR作成、Alert dismiss。

## Assumptions

- 作業開始時のbranchは`fix/dependabot-security-vulnerability-remediation`で、canonical remote mainに対する`behind_by=0`を確認済みである。
- `package.json`と`pnpm-lock.yaml`は実験開始時にcleanであり、開始時hashをbaselineとして保存する。
- 既存Runのno-op調査結果とCandidate 1〜4の不採用理由を正本とし、今回のRunでは同じ操作を再実行しない。
- no-opまたはPrettier writeで生じたlockfile差分は採用せず、通常のpatch/file restorationで開始時stateへ戻す。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。実験、判定条件、禁止事項、最終操作はユーザー指示で確定している。
- 仮定してよい細部: semantic比較はimporters/packages/snapshots/settings/overrides/packageExtensionsChecksumとjs-yaml version/pathを対象とし、formatting比較はquote、inline/multiline、blank line、indentation、YAML structureを対象とする。
- 未回答の重要質問: なし。Prettier check/writeの結果でCASEを確定し、追加のformatter探索は行わない。

## Hypotheses

- H1: pnpm canonical lockfileへPrettier checkを行うとformatting違反としてfailし、Prettier writeでRepositoryの現在形式へ近い巨大formatting diffが発生する。これが確認できれば、pnpm canonical serializerとRepositoryのPrettier formatting policyの衝突と分類する。
- H2: pnpm canonical lockfileに対してPrettier checkがpassし、Prettier writeでも差分0となる。これが確認できた場合、Prettierを原因と断定せず、今回の調査をCASE Nとして停止する。

## Research Plan

- Round 1 Query: branch/remote/baseline、Prettier設定、`.prettierignore`、過去のlockfile整形commit、H1/H2を確認・記録する。
- Round 2 Query: `pnpm install --lockfile-only --ignore-scripts`を1回だけ実行し、canonical生成直後のdiffとsemantic equalityを確認する。
- Round 3 Query: canonical状態で`pnpm exec prettier --check pnpm-lock.yaml`を1回実行し、その後`pnpm exec prettier --write pnpm-lock.yaml`を1回実行する。A=HEAD、B=pnpm生成、C=Prettier write後をformatting/semanticに比較する。
- Round 4 Query: baselineへ復元し、Alert #5、`pnpm audit`、最終dependency diff、Run Artifact、CIを確認する。
- Exit Criteria:
  - H1またはH2をPrettier check/writeとA/B/C比較で支持または反証する。
  - `package.json` / `pnpm-lock.yaml`の最終diffとhashがbaselineへ戻っている。
  - Alert #5を`IN_SCOPE / BLOCKED`として記録し、remediation未実施を明示する。
  - 新Run ArtifactのSanitizer Write/Check、Markdown lint、commit/push、PR CI確認が完了している。

## Approach

1. 既存Runと必須文書を確認し、branch/behind/dependency diffが開始条件を満たすことを確認する。
2. 新RunのArtifactへ実験前の仮説、allowed files、before hash、Prettier設定を記録する。
3. dependency selector/overrideなしでno-op lockfileを一時生成し、semantic resolutionを比較する。
4. canonical状態でPrettier check、続けてwriteを各1回だけ実行し、A/B/Cの差を比較する。
5. lockfileをpatch/file restorationでbaselineへ戻し、hash/diff一致を確認する。
6. 結果、Alert #5、audit、未実行validation、推奨次PR方針をRunへ記録し、Sanitizer/lint後に明示stage、commit、push、PR CI確認を行う。

標準workflowは`investigation / standard / auto-net`。今回の調査にWeb検索は不要であり、外部仕様の総当たりやformatter探索は行わない。

## Definition of Done

- 指定文書・既存Runを確認し、branch `behind_by=0` とdependency baseline cleanを記録している。
- no-opを1回、Prettier checkを1回、Prettier writeを1回だけ実行している。
- pnpm canonical、Prettier output、HEADのformatting/semantic比較とCASE P/N判定を記録している。
- `package.json` / `pnpm-lock.yaml`をbaselineへ復元し、before/final hashとdiffが一致している。
- Alert #5がOpen / High / runtime / transitive / `js-yaml@4.3.0` / patched `4.3.1`で、`IN_SCOPE / BLOCKED`のままであることを確認している。
- `pnpm audit`、Sanitizer、Markdown lint、final diff、明示stage、commit/push、最新PR CIを記録している。

## Risks / Unknowns

- pnpm canonical生成とPrettier writeはlockfileを変更するため、candidateを採用せず実験後にpatch restorationし、hash一致を確認する。
- Prettier checkが失敗しても、write結果とHEAD形式が一致しなければCASE Pとは断定しない。
- `pnpm audit`は既知脆弱性でnon-zeroになり得る。Alert inventoryの代替にはせず、残件として記録する。
- CI failureは今回のRun Artifact差分との因果関係を確認し、無関係な修正を追加しない。

## Thinking Log

- 2026-08-23 19:13 JST: 既存Runでno-opがsemantic equalityのまま約12,858行のformatting/generation diffを出すことを確認済み。今回はPrettierだけを追加検証し、dependency remediationへ戻らない。
- 2026-08-23 19:13 JST: `CASE P`の成立にはcheck結果だけでなく、write結果がRepository HEAD形式へ戻ることとsemantic graph不変を要求する。
- 2026-08-23 19:24 JST: no-opはexit 0で12,858行の差分を生成した。canonical Bはsingle quote/inline resolution、HEAD Aはdouble quote/multiline resolutionで、semantic graphは一致した。
- 2026-08-23 19:25 JST: Prettier 3.8.1のcheckはexit 1、writeはexit 0。write後CはAとバイト単位・semanticとも一致したため、CASE Pを採用する。
