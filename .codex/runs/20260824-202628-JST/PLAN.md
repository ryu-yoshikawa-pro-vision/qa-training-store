# Plan

## Objective

- Issue #54 の前Runで reject した R2 parent-scoped override を、同じ selector で一度だけ再現する。
- `bufferutil` / `utf-8-validate` の lockfile差分が、実際の dependency resolution 変更か、pnpm の metadata 再計算だけかを厳密に分類する。
- metadata-only かつ lockfile が安定し、brace-expansion の3 Alertを解消できる場合だけ R2 を採用候補とする。

## Scope

- In:
  - canonical `origin/main` 起点の baseline 確定
  - 前Runで記録された R2 override の一回限りの再現
  - lockfile差分の TARGET / INCIDENTAL METADATA / UNRELATED SEMANTIC CHANGE 分類
  - R2適用後の no-op 安定性、依存、audit、repository validation
  - CASE A の commit / push / Issue #54 対応PR / CI確認、または CASE B の復元と根拠記録
- Out:
  - R1、R3、R4、新しい remediation 方式
  - nanoid / image-size / uuid の実装
  - global brace-expansion override
  - Issue #54 の merge

## Assumptions

- `origin/main` が canonical main の正本であり、branch は `fix/dependabot-brace-expansion-r2-metadata-evaluation` とする。
- 前Run Artifact に記録された selector は `minimatch@3.1.5>brace-expansion` と `minimatch@10.2.5>brace-expansion` である。
- R2で期待する target は brace-expansion `1.1.16 -> 1.1.18` と `5.0.8 -> 5.0.9` である。
- pnpm は 9.10.0、Node は 24 系で測定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。採用条件と停止条件は依頼文で確定している。
- 仮定してよい細部: Run ID、branch名、比較用のハッシュ・snapshot抽出方法。
- 未回答の重要質問: R2差分が metadata-only と証明できるか。

## Hypotheses

- H1: `bufferutil` / `utf-8-validate` の差分は package version、integrity、dependency edge、actual peer resolution、importerを変えない pnpm metadata再計算である。
- H2: R2適用後の lockfile は二回目の `pnpm install --lockfile-only --ignore-scripts` で追加差分を生じない。
- H3: R2採用時、brace-expansion `1.1.16` / `5.0.8` は消え、`1.1.18` / `5.0.9` だけが target line として残る。

## Research Plan

- Round 1 Query: baseline hash、Node/pnpm version、no-op diff、lockfileの package/snapshot/importer を固定する。
- Round 2 Query: R2を一度再現し、全差分を構造化比較して分類し、二回目 no-op と validation で採否を決める。
- Exit Criteria:
  - H1〜H3に支持または反証の具体的根拠がある。
  - CASE Aなら PR/CI確認まで完了する。
  - CASE Bなら baselineへ復元し、Issue #54とRun Artifactへ根拠を残す。
  - nanoidへ進まず停止する。

## Approach

- `origin/main` と clean worktreeを確認し、R2だけを一回適用する。
- `package.json` と `pnpm-lock.yaml` の baseline / candidate をハッシュ、構造、diffで比較する。
- candidate stateで安定性と依存 validationを行い、意味的変更がない場合だけ repository validationを続ける。
- standard flow: `PLAN -> TASKS -> R2再現 -> 分類 -> validation -> 採否 -> REPORT`

## Definition of Done

- CASE A: R2が採用され、brace-expansion Alert #2/#3/#4が解消見込みで、audit/format/verify/diff check成功、明示stage・commit・ordinary push・Issue #54対応PR・CI確認まで完了。mergeはしない。
- CASE B: R2を完全に baselineへ復元し、`bufferutil` / `utf-8-validate` の semantic性または不安定性を証明し、Issue #54へ根拠を追記して dependency commit/PRなしで停止。

## Risks / Unknowns

- R2再現時に別 package の version、integrity、edge、snapshot identityが変わる可能性がある。1件でもあれば CASE B。
- pnpm metadata差分と semantic差分を混同しないよう、package identity・version・integrity・dependencies・peer/optional resolution・importerを別々に比較する。
- auditは他のOpen Alertを含み得るため、brace-expansion由来findingの消失を個別に確認する。

## Thinking Log

- 2026-08-24 20:26 JST: 前Runの R2 reject理由だけを対象にする新Runを作成。R1や別方式は再実行しない。
- 2026-08-24 20:26 JST: 前Runの未追跡Artifactは削除せずstashで保全し、`origin/main` から新規branchを作成した。
- 2026-08-24 20:46 JST: R2はCASE A候補。非target package entry、integrity、dependency edge、importer、settingsは不変で、`@react-native/metro-config` の差分は `transitivePeerDependencies` 集合から2名が除去されたmetadata-only差分だった。
- 2026-08-24 20:46 JST: R2適用後の二回目no-opはpatch/hash不変。前Runの「peer metadataがあるためreject」は安全側に過剰だったと判断し、R2を採用候補として扱う。
- 2026-08-24 21:22 JST: PR #58を作成しCIを確認した。Web CI、Android/iOS build/runtimeは成功。Native Staticは今回のdependency diffと無関係なExpo Doctorのpatch mismatch 7件で失敗し、派生`native-ci / verify`も失敗した。scope外のExpo更新は行わず、独立failureとして記録してbrace-expansionで停止する。
- 2026-08-25 07:15 JST: レビュー指摘対応で、既存最終head `7a20fdeb`のCIを再読した。Native Staticに加えてAndroid Automation Buildもroot failureであり、Android Runtime / Maestroはjob successでもAutomation APK依存flowがskip、`native-ci / verify`は両gateを要求する集約failureと訂正する。以後のCI結果はGitHub metadataを正本とし、Artifact更新だけの無限commitを作らない。
