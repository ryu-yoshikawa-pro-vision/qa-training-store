# brace-expansion R2 metadata再評価計画

## 0. 依頼概要

- 依頼内容: Issue #54 の前Runで reject した parent-scoped R2 overrideを一度だけ再現し、`bufferutil` / `utf-8-validate` 差分の意味を判定する。
- 背景: 前Runではbrace-expansion `1.1.18` / `5.0.9` へ解決できたが、別snapshotにpeer metadata差分があり、安全側にrejectした。
- 期待成果: metadata-onlyかつlockfile安定ならR2を採用してPR/CI確認まで進め、semantic変更または不安定ならbaselineへ復元してIssue #54をBLOCKEDとして記録する。

## 1. ゴール / 完了条件

- ゴール: R2差分をTARGET / INCIDENTAL METADATA / UNRELATED SEMANTIC CHANGEに厳密分類し、採否を再現可能な証跡で確定する。
- 完了条件（DoD）:
  - `origin/main`起点のbaseline hash、Node/pnpm、no-op diff 0を記録。
  - R2を一度だけ適用し、全差分を分類。
  - 採用時は二回目no-op diff 0、target Alert解消、frozen install、why/list/audit、format:check、verify、diff check成功。
  - 採用時は明示stage、commit、ordinary push、Issue #54対応PR、CI確認まで完了。mergeはしない。
  - reject時はbaselineへ完全復元し、semantic性または不安定性をIssue #54とRun Artifactへ記録。dependency commit/PRは作らない。
  - いずれの場合もnanoidへ進まない。

## 2. 現状理解と前提

- Current understanding:
  - 前RunのR2 selectorは `minimatch@3.1.5>brace-expansion` と `minimatch@10.2.5>brace-expansion`。
  - targetは `brace-expansion@1.1.16 -> 1.1.18`、`brace-expansion@5.0.8 -> 5.0.9`。
  - `bufferutil` / `utf-8-validate` の差分がmetadata-onlyかは未確定。
- Assumptions:
  - canonical mainは `origin/main`。
  - pnpmは9.10.0、Nodeは24系。
- Non-goals:
  - R1、R3、R4、新しいremediation方式。
  - nanoid / image-size / uuidの実装。
  - global override、merge。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: diff比較用のhash・snapshot抽出方法、Run ID、branch名。
- 未回答の重要質問: R2で別packageのresolution実体が変化するか。

## 4. 影響範囲

- Impacted areas: `package.json`、`pnpm-lock.yaml`、Run Artifact、plan、Issue #54、採用時のPR/CI。
- Files to inspect: `pnpm-lock.yaml`、前Run `REPORT.md` / `PLAN.md`、`package.json`、pnpm help output。

## 5. 変更方針

- Change strategy:
  - baselineを固定し、R2 overrideだけを`apply_patch`で追加。
  - lockfileをpnpmに一度再解決させ、baselineとの差分を構造的に比較。
  - semantic差分がゼロでmetadata-only、かつ二回目no-opが0なら採用候補とする。
  - それ以外は差分を逆適用してbaselineへ復元する。新方式は試さない。
- 実行タスク:
  - [ ] baseline hash/version/no-opを記録
  - [ ] R2を一回再現し、差分分類・安定性確認
  - [ ] 条件に応じたvalidation、採否、Issue/PR/CIを実施

## 6. 検証方法

- Validation plan:
  - `pnpm install --lockfile-only --ignore-scripts` と `git diff -- pnpm-lock.yaml`（baseline diff 0）。
  - R2後に `git diff`、package/snapshot/importer構造比較、version/integrity/dependency edge/peer resolution確認。
  - R2後に同じno-opを再実行し追加diff 0を確認。
  - 採用候補のみ `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm why brace-expansion`、`pnpm list brace-expansion --depth Infinity`、`pnpm audit`、`pnpm run format:check`、`pnpm run verify`、`git diff --check`。
- 成功判定:
  - C分類が0、Bがmetadata-onlyとして具体的に証明され、target versionのみが変化し、no-opが安定。

## 7. リスクと未解決論点

- Risks: pnpmがpeer metadataを再計算するだけでなく、別packageのversion/edge/snapshot identityを更新する可能性。
- Open questions: `bufferutil` / `utf-8-validate` の差分がどのlockfile fieldに限定されるか。

## 8. 成果物

- 変更ファイル: 採用時は`package.json`、`pnpm-lock.yaml`、今回Run Artifact、plan。reject時は今回Run Artifact、plan、Issueコメントのみ（dependency fileはbaseline）。
- 付随ドキュメント: `.codex/runs/20260824-202628-JST/`、本計画書。

## 9. 備考

- 以前の「peer metadataがあるためreject」は、今回の証明結果に基づき過剰拒否だったかどうかを明記する。

## 10. 実績

- R2はCASE Aとして採用した。`bufferutil` / `utf-8-validate` に関係する差分は、version、integrity、dependency edge、importer、actual peer resolutionを変えないmetadata-only差分であり、二回目のno-opでも安定した。
- `fe0d58cc347a395ebc564df7b1327cc0977cf081`をcommitし、PR #58を作成した。mergeは行っていない。
- Web CIとAndroid/iOSの主要jobは成功した。Native StaticはExpo Doctorの既存patch mismatch 7件で失敗し、別のExpo依存更新は行わず独立failureとして記録した。
- 今回はbrace-expansionで停止し、nanoidへ進まない。
