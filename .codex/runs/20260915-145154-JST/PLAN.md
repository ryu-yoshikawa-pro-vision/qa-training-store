# Plan

## Objective

- PR #146の残存レビュー指摘を、既存Hook本体の契約を変えずに修正する。
- Stop launcher failureはJSON payloadのboolean `stop_hook_active`を解釈し、trueなら再blockしない。
- SessionStart launcher failureはCodex 0.154.0向けにexit 0のstructured `continue:false`へ収束させる。
- ADR-0026を#135完了後の現在実装と履歴の両方が分かる記述へ合わせる。

## Scope

- In:
  - `.codex/config.toml`のStop／SessionStart configured launcher failure fallback。
  - `tests/contracts/codex-text-quality.test.ts`のUnix／Windows Stop launcher contract。
  - `tests/contracts/codex-hook-contract.test.ts`のUnix／Windows SessionStart launcher contract。
  - `docs/adr/0026-codex-text-quality-gate.md`の最小履歴・現在性補正。
  - このRunのPLAN／TASKS／REPORTとsanitize対象Artifact。
- Out:
  - `.codex/hooks/session_start_context.mjs`、`.codex/hooks/text_quality_gate.mjs`本体。
  - scanner、baseline、fingerprint、rename、textlint rule、PostToolUse、CI比較基準、`additionalContextLimit`。
  - 新しいHook framework、retry counter、state machine、独自JSON parser、wrapper file、AGENTS.mdコピー／marker。

## Assumptions

- local HEAD、remote branch、PR #146 headは確認時点で`1382f41d73c675a352dd4a9fea5598d6eb3c4a8c`に一致している。
- PR #146とIssue #134はOPEN、対象branchは`issue-134-codex-hook-quality-gates`である。
- Unixのfailure fallbackは追加packageなしでPython標準`json` parserを使い、WindowsはPowerShell `ConvertFrom-Json`を使う。
- Node実行の非0終了時は捕捉したstdout／stderrを破棄し、固定fallbackだけを返す。正常終了時は既存Hook出力を透過する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Stop active allowはstdout空・exit 0、SessionStart fallback reasonは固定短文とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: launcherがstdinを一度捕捉し、Hook出力を一時バッファすることで、正常系を透過しつつ非0終了時の内部path／exception漏洩を防げる。
- H2: standard JSON parserで厳密にboolean trueを判定すれば、欠落・不正型・malformed JSONをfail-close側へ倒せる。
- H3: SessionStartのstatic fallbackをexit 0で出力すれば、Node起動前／起動失敗でもCodex 0.154.0の停止契約へ到達できる。

## Research Plan

- Round 1 Query: branch／PR／Issue／Plan、config、Hook本体、contract、ADR、Harness、依存状態を確認する。
- Round 2 Query: 現行configured launcherをchild processで実行し、修正後にUnix／Windowsの正常系・failure・security contractと標準検証を実行する。
- Exit Criteria:
  - launcher failureの原因と最小修正が対応している。
  - Stop true／false、SessionStart failureの両方がconfigured command経由で確認できる。
  - 非対象のHook本体と品質gateへ差分がない。
  - push後の最新PR headとrequired CIを確認できる。

## Approach

- review findingを`must_fix`としてbounded repair iteration 1件に固定する。
- config inline launcherを最小編集し、Nodeが成功した場合だけHook stdout／stderrを透過する。
- Stop fallbackはJSON parserで`stop_hook_active === true`のみallow、その他はblockする。
- SessionStart fallbackは入力を理由へ埋め込まず、短い固定`stopReason`と`continue:false`を返す。
- 既存contractへconfigured child processの実測を追加し、ADRを最小修正する。
- focused／Harness／標準関連検証、Run Artifact sanitize、branch safety、commit／push、PR CI／本文更新の順で完了する。

## Definition of Done

- Unix／Windows Stop launcherでHook欠落・Hook非0終了のfalse=block、true=allowがPASSする。
- Unix／Windows SessionStart launcherで正常compact、Hook欠落、Hook非0終了、root解決不能がPASSする。
- failure時はexit 0、Stop inactiveのみblock JSON、SessionStartはstructured `continue:false`、secret／prompt／token／absolute path非漏洩である。
- startup／resume／clear、root全文、`additionalContextLimit=4096`、Hook本体の既存契約が維持される。
- focused tests、`verify -HookContracts`、関連lint／typecheck／contract test／diff checkが確認済みである。
- 最新PR headでWeb CI／Mobile App CIと指定required jobがSUCCESS、PRはOPEN、IssueはOPENである。

## Risks / Unknowns

- PowerShell／cmdのencoded command、stdin encoding、空白・日本語pathを壊すリスクはconfigured child process testで検出する。
- UnixでPython parserが利用できない場合はactiveを確認できずblockする。追加依存は導入せず、実行環境の有無を検証結果へ記録する。
- 実Codex interactive `/hooks`／`/compact` runtimeはTTYが必要で、成立しなければ未確認として報告する。contract PASSへ読み替えない。

## Thinking Log

- 2026-09-15 JST: 現行PR headはレビュー時点の指定SHAと一致し、launcher failure semanticsだけが残存差分であることを確認した。
- 2026-09-15 JST: Hook本体はactive Stopをallowし、SessionStart内部failureをstructured fail-closeするため、変更点はlauncher境界とcontract／ADRに限定する。
