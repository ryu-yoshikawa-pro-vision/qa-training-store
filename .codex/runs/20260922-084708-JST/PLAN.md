# Plan（計画）

## Objective（目的）

- PR #169で再発したStop Hookの診断不足を、既存のfail-open / fail-close・state semantics・安全境界を変えずに解消する。Hook内部failureはinactive Stopの`systemMessage`へ安全なcode/causeを出し、Stop launcher failureは既存のlauncher diagnosticへ統一する。

## Scope（対象範囲）

- In:
  - `.codex/hooks/text_quality_gate.mjs`のsafe diagnostic整形とinactive Stop block出力。
  - `.codex/config.toml`のUnix / Windows Stop launcher inactive fallback。
  - `tests/contracts/codex-text-quality.test.ts`、`tests/contracts/codex-hook-contract.test.ts`のprocess/static contract。
  - 正本Plan、`docs/reference/codex-safety-harness.md`、今回Run Artifact。
  - focused / wrapper / Repository標準 / `pnpm run verify`、commit・push・既存PR #169のCI確認。
- Out:
  - active Stopの`baseline_state_missing`特例、normal cleanup後repeated Stop、block reason、state schema / session tracking / doctor責務、Hook event・matcher・timeout、CI job構成。
  - 新規framework、dependency、state field、marker/evidence file、merge、force push、branch削除、PR close等。

## Assumptions（仮定）

- 既存Planと今回のユーザー指示で仕様判断は確定しており、追加質問はない。
- Windows EncodedCommandは現行decoded launcherを正本にsafe fallbackを反映し、UTF-16LE/Base64で再生成する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses（仮説）

- H1: `formatDiagnosticMessage(code, diagnosticCause)`をHook内部failureと既存diagnosticsで共有すれば、allowlist境界を重複実装せずinactive Stopで原因を観測できる。
- H2: launcher fallbackへ`systemMessage`だけを追加すれば、inactive block reasonとactive fail-openを変えずにHook本体経路とlauncher経路を区別できる。

## Research Plan（調査計画）

- Round 1 Query: Task 0としてorigin/main、PR head、branch、merge base、working tree、Plan全文、Run、Hook/config/test/CI/package/wrapperを再確認する。
- Round 2 Query: Hookの出力責務、既存safe cause contract、Unix/Windows decoded launcher、inactive/active/repeated Stop testを確認し、最小差分を実装する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - inactive Hook failure、launcher failure、active missing cleanupの3経路をprocess contractで確認できる。
  - 未許可cause、raw path/session/payload/secret/exceptionが出力されない根拠がある。

## Approach（進め方）

- Task 0確認後、既存Planの関連箇所を最小更新する。
- Hookのpure formatter / optional `outputBlock`を実装し、既存診断整形を再利用する。
- Unix/Windows launcher fallbackを更新し、decoded PowerShellを再エンコードする。
- inactive state分類、安全cause、正常violation block、launcher failure、active/repeated Stopのcontractを追加・更新する。
- focused、wrapper、標準検証、最終verify、diff/scope、Run sanitizationを実施してからcommit・push・PR/CI確認を行う。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done（完了条件）

- inactive Stopは`decision=block`とgeneric `reason`を維持し、Hook内部failureのsafe code/causeを`systemMessage`へ出す。
- active Stopのmissing-state無診断allowと正常cleanup後repeated Stopを維持する。
- Unix/Windows launcher failureはinactive generic block + `Stop launcher unavailable`、active fail-open + 同じ診断になる。
- safe cause allowlist、情報漏えい防止、通常violation blockのsystemMessageなしを維持する。
- 指定されたローカル検証、PR最新headのWeb/Mobile CI、Run/PR本文更新、pushが完了する。

## Risks / Unknowns（リスク・未知点）

- `systemMessage`へraw errorを出すリスク: `diagnosticCauseFor`と固定codeのみを使い、formatterを一箇所へ集約する。
- active missing特例を誤変更するリスク:既存の早期`outputAllow()`とrepeated Stop testを変更しない。
- Windows EncodedCommand破損リスク: decoded current launcherから完全なcommandを再生成し、static decode contractで検証する。

## Thinking Log（判断記録）

- 2026-09-22 JST: PR headは確認済みSHA `1994690a...` と一致、working treeはclean。今回の追加修正は前回実装の診断情報欠落を補う別taskとして新Run `20260922-084708-JST`へ記録する。
- 2026-09-22 JST: Planのinactive Stop原因非出力記述を、generic reason維持 + safe systemMessage出力へ最小更新する。active missing特例は変更対象外とする。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
