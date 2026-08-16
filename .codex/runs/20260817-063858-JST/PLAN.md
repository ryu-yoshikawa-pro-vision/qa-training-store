# Plan

## Objective

- Windows branch switch後のCRLF/LF差分を、`.gitattributes`、`.editorconfig`、Prettier設定、tracked fileのrenormalizeで恒久解消する。先行Codex Hook実装と既存変更は保持する。

## Scope

- In:
  - `.gitattributes`のLF checkout contract
  - root `.editorconfig`の最小EOL contract
  - `.prettierrc.json`の`endOfLine: lf`
  - `git add --renormalize .`とstaged／unstaged差分確認
  - branch switch acceptance、Git attributes、format／verify gate
  - `docs/PROJECT_CONTEXT.md`とRun Artifact
- Out:
  - Git global config変更、style rule再設計、CI architecture、新Dependency
  - 先行Codex Hookの再実装、PR／commit／push、destructive reset／checkout

## Assumptions

- `* text=auto eol=lf`でRepositoryの通常tracked text fileを一律LFにする。`.bat`／`.cmd`は存在しないため例外を追加しない。
- ユーザー明示の`git add --renormalize .`を、before／after statusとdiffを記録して実行する。
- branch acceptanceは現在のworktree上に一時branch A／Bを作って行い、branch削除はしない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼文で目的、設定、検証、DoDが確定している。
- 仮定してよい細部: 関連DocumentationはPROJECT_CONTEXTへ最小追記する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `.gitattributes`の`eol=lf`がglobal `core.autocrlf=true`に依存せずcheckout EOLをLFへ固定する。
- H2: `.editorconfig`とPrettier `endOfLine=lf`がEditor／Formatter側のEOLを一致させる。
- H3: renormalize後のbranch A→B→Aで`format:check`が連続PASSする。

## Research Plan

- Round 1 Query: `.gitattributes`、Editor／Prettier、package scripts、Git EOL config、status／staged／unstaged diff、batch file有無を確認する。
- Round 2 Query: EOL contract追加後にrenormalize、attributes、branch switch、format／verify／Hook gateを検証する。
- Exit Criteria:
  - H1-H3の実測根拠がREPORTへ記録される。
  - DoD未達があれば原因分類と次アクションを残す。

## Approach

- 変更前証跡を保存し、docs planを確定する。
- root contractを最小追加し、PROJECT_CONTEXTへ責務を追記する。
- `git add --renormalize .`後にstaged／unstaged／content／binaryを比較する。
- Windows Nativeのbranch switch acceptanceとRequired gatesを実行する。
- 標準フロー: `PLAN -> repo mapping -> docs plan -> TASKS -> 実装 -> 検証 -> REPORT`

## Definition of Done

- `.gitattributes`、`.editorconfig`、PrettierがLFを指定する。
- tracked fileがrenormalizeされ、意図しない意味変更・binary混入がない。
- representative `git check-attr`、branch A→B→Aのformat check、`format:check`、`verify`、`git diff --check`がPASSする。
- 先行Codex Hook実装を壊さず、destructive Git操作・global config変更・新Dependencyを行わない。

## Risks / Unknowns

- `git add --renormalize .`は現在の既存変更を広くstageする可能性がある。before／afterを比較し、resetや巻き戻しはしない。
- Global `core.autocrlf=true`を原因Evidenceとして残すが、解決策にはしない。
- 先行全体format変更とHook実装が混在しているため、今回の意味変更はroot EOL contractとdocsへ限定する。

## Thinking Log

- 2026-08-17 06:38 JST: 既存`.gitattributes`は`* text=auto`のみ、`.editorconfig`はなく、Prettier `endOfLine`も未指定。global `core.autocrlf=true`へ依存せずRepository contractを追加する方針を確定した。
- 2026-08-17 06:40 JST: `.bat`／`.cmd`がないためCRLF例外は設けず、`.gitattributes`の`* text=auto eol=lf`を唯一のcheckout EOL contractとする。
- 2026-08-17 07:05 JST: EOL設定、renormalize、attributes、fresh checkoutのA→B→A、format／verifyを完了した。current worktreeの既存CRLFバイトはdestructive checkoutで書き換えず、clean checkoutでLF実効値を確認した。
