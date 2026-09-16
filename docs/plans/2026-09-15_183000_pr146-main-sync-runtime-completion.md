# PR #146 最新main同期とCodex runtime完了計画

## 0. 依頼概要

- 依頼内容: PR #146へ最新`main`を取り込み、Issue #134のHook契約を維持したまま、Stop複数違反通知、active Stop再入、契約テスト、標準検証、compact runtime、GitHub CI／PR状態を完了条件まで確認する。
- 背景: #151以降の`main`契約を失わず、PR #146固有の実装を保持した最新branchで完了判定する必要がある。
- 期待成果: 最新`main`を含むcommit済みbranchを通常pushし、local／remote／PR head、CI、PR／Issue状態を証跡付きで一致させる。

## 1. ゴール / 完了条件

- ゴール: 最新branchでStopの複数新規違反を1回のinactive blockから通知し、active Stopで無制限再blockせず、既存Hook contractと標準検証をPASSさせる。
- 完了条件: ユーザー指定のmain同期、競合解消、実装保持、回帰テスト、focused Hook contract、`lint:text`、`lint:markdown`、`git diff --check`、関連標準検証、compact runtimeまたは実行不能理由、commit／push、head一致、Web CI／Mobile App CI success、PR本文更新、PR／Issue openをすべて確認する。

## 2. 現状理解と前提

- 現状理解: local branchは`issue-134-codex-hook-quality-gates`、HEADは`2b05dd6ef3242382bde014ef82b0dfd15d60fc52`。`origin/main`は`22f73a98e5e11c9ee622512345b17e85694537e9`で、main取り込みmergeが開始済み。conflictは`docs/reference/codex-safety-harness.md`の1ファイル。
- 前提: 最新`main`の文章規約・運用契約を採用し、PR #146の`.codex/hooks`、launcher、baseline、SessionStart、既存契約テストを削除しない。
- 対象外: force push、reset／rebaseによる履歴破棄、merge／PR／Issueのclose、PRのmerge、branch削除、release、tag作成、無関係な製品コード変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが対象branch、取り込み対象、完了条件、外部操作の範囲を明示している。
- 仮定してよい細部: conflict内で同一内容の見出しは最新`main`側の日本語表記を採用する。実runtimeのinteractive slash commandがこのAPIから起動できない場合は、実行不能理由と代替evidenceを明記する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: `docs/reference/codex-safety-harness.md`のmerge conflict、`.codex/config.toml`と`.codex/hooks/**`のStop／SessionStart launcher、本体scanner、`tests/contracts/**`、package scripts、CI workflow、PR本文。
- 確認対象ファイル: `.codex/config.toml`、`.codex/hooks/text_quality_gate.mjs`、`.codex/hooks/session_start_context.mjs`、`.codex/hooks/log_event.mjs`、`scripts/lint-text-quality.mjs`、`tests/contracts/codex-text-quality.test.ts`、`tests/contracts/codex-hook-contract.test.ts`、`package.json`、`.github/workflows/ci.yml`。

## 5. 変更方針

- 変更方針: (1) 既存mergeを安全に解消し、#151の契約と#146の実装を両立する。(2) 現行Stop出力をfixtureで再現し、最初の異常と派生エラーを分類する。(3) 必要な場合だけStopの複数違反通知と回帰テストを最小変更する。(4) focused／標準検証、runtime、GitHub CIを順に確認する。(5) PR本文を実際の最新状態へ更新してcommit／通常pushする。
- 実行タスク:
  - [x] 1. merge conflictを解消し、最新`main`とPR #146実装の差分を確認する。
  - [x] 2. inactive／active Stopと複数違反の現行挙動を再現し、必要な最小修正と回帰テストを適用する。
  - [x] 3. focused Hook contract、`lint:text`、`lint:markdown`、`git diff --check`、関連標準検証を実行する。
  - [x] 4. compact runtimeまたは実行不能理由を確認し、commit／通常push後にheadとCIを確認する。
  - [ ] 5. PR本文、PR／Issue open、最終working treeを確認して完了報告する。

## 6. 検証方法

- 検証計画: merge-base／対象SHA確認、Stop複数違反とactive再入の契約テスト、`bash scripts/verify --hook-contracts`または同等のPowerShell focused検証、`pnpm run lint:text`、`pnpm run lint:markdown`、`git diff --check`、packageに定義された関連lint／typecheck／test／build、Codex interactive `/hooks`／`/compact`、GitHub Actions check runを確認する。
- 成功判定: inactive Stopは1回のstructured blockに新規違反を複数件含み、active Stopはallowして再blockしない。全必須コマンドがexit 0、CIがsuccess、local／remote／PR headが同一SHA、PR #146とIssue #134がopenであること。

## 7. リスクと未解決論点

- リスク: 最新`main`の文書変更とHook trust文書が競合する。Codex interactive runtime capabilityがAPIから提供されず、compactを直接実行できない可能性がある。CIはpush後に非同期で完了する。
- 未解決の質問: runtime capabilityがない場合の最終判定は、ユーザー指定どおり実行不能理由を明示して完了条件の該当項目を未確認とする。

## 8. 成果物

- 変更ファイル: 必要な場合のHook／launcher／契約テスト、merge conflict解消、計画、PR本文。無関係な製品コードは変更しない。
- 付随ドキュメント: Run Artifact契約に従う既存Runの証跡と、本計画。durable reportは必要性が確認された場合だけ作成する。

## 9. 備考

- repair loopは再現可能なfailureを確認した場合に限り、allowed filesを宣言した1回のbounded iterationとして扱う。
- commit／push／GitHub metadata更新は、各直前にbranch、PR head、remote、stage、recoveryを確認する。
