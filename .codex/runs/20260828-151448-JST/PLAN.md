# Codex Hookログ整理・Subagent記録廃止 実装Run計画

## Objective

- `docs/plans/2026-08-28_091833_codex-hook-run-logging.md`を正本として、5種類のCodex Logging Hook、REPORTのcheckpoint運用、legacy stackの廃止、manifest v2を実装する。
- 既存Safety `PreToolUse`のblocking behavior、wrapper／validation／evaluation、Product codeを維持する。

## Scope

- In:
  - Plan §9で指定されたHook、config、Run template、collector、codex-task wrapper、cleanup、contract test、運用docs、必要なverify／living documentation。
  - `.codex/templates/subagent-run.schema.json`、旧observer scripts、旧observer schema、legacy-only docsの削除。
  - 今回のRun artifact。
- Out:
  - Product code、ECサイト仕様、カリキュラム本体、過去Runの標準Artifact、過去Runの`subagents/*.json`。
  - HookとRunのcorrelation、`CODEX_RUN_ID`、active-run registry、DB／daemon／新rotation、Tool parser、new test framework。

## Assumptions

- repo-wide searchで、旧Subagent／旧Hook observationのlegacy stack外に独立したruntime caller／consumerは見つからなかった。
- `agents_used`は`collect_subagents()`以外の独立producerがなく、新規v2から削除する。
- `safety.scope_violation`はcodex-taskの独立scope validation由来なので維持し、observerだけが更新していた`delete_attempt_blocked`／`git_mutation_attempt_blocked`は新規v2から削除する。
- 既存v1 manifestはschema versionとlegacy field valueを保持するだけにし、legacy機能の再走査・再集約は行わない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定Plan、PR、repo-wide確認で実装条件が確定した。
- 仮定してよい細部: loggerのevent record field名はPlanの既存`event`／`timestamp`慣例に合わせ、text previewは2000文字以内とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現行Codex CLIのHook payloadは5 eventごとにstdin JSONを渡し、event別stdout契約はexpected CLI引数で安定して実装できる。
- H2: configからrepository rootを解決して同じNode loggerを呼ぶことで、root／subdirectoryのWindows・Unix起動を統一できる。
- H3: legacy stack外依存がないため、旧collector／schema／cleanup branch／docsを削除しても、scope／validation／evaluationとSafety Hookは維持できる。

## Research Plan

- Round 1: 現行CLIのversion／features／help、PR状態、Plan全文、既存設計、repo-wide literal searchを確認する。
- Round 2: logger／config／manifest writer／wrapper merge／testsを実装し、targeted test、cross-platform smoke、verify、final diff、PR CIを確認する。
- Exit Criteria:
  - Plan §13の成功判定を1項目ずつPASSまたは具体的な未検証理由で記録する。
  - 既存Safety Hookの契約とProduct codeに差分がない。
  - final commitを指定branchへpushし、PR #76へ反映する。

## Approach

1. Plan §8のrepo-wide確認を先行してlegacy stack内／外を分類する。
2. 現行CLIのruntime前提を確認した後、Plan §9の順にlogger、config、REPORT運用、legacy削除、manifest v2、tests、docs、trust、smokeを実行する。
3. manifestは全writerとmerge経路を確認し、v2では廃止fieldを生成・再注入せず、v1では既存legacy valueだけを保持する。
4. 検証FAIL時は最初の異常を分類し、必要な最小修正後に関連gateを再実行する。
5. diff全体をセルフレビューし、sanitization後にcommit／push／PR状態確認を行う。

## Definition of Done

- 指定Plan §13の全成功判定を確認できる。
- 5eventのcanonical Node logger、repository-root起動、非干渉stdout、failure-safe、redaction／truncation、session-scoped JSONLが実装される。
- 旧Subagent JSON／旧Hook observationのactive legacy機能が廃止され、新規Run manifestがv2になる。
- targeted／local／smoke検証の実結果、未検証理由、commit SHA、push先、PR #76反映をRun artifactと最終報告へ記録する。

## Risks / Unknowns

- 現行CLI 0.150.1と過去Run記録の0.147.0に差があるため、実機挙動は今回のCLIで確認し、推測でPASSにしない。
- Windows project trustがinteractive環境制約で確認できない可能性がある。その場合はlogger単体／config contractとoperator validation未実施を分離して記録する。
- full verifyに既存環境要因が出た場合はfirst failureと差分因果を切り分け、同一条件の無目的再試行をしない。

## Thinking Log

- 2026-08-28 15:14 JST: `refactor/codex-hook-run-logging`、PR #76、clean working treeを確認し、Run `20260828-151448-JST`をstrict implementationとして初期化した。
- 2026-08-28 15:20 JST: Plan全文、AGENTS、PROJECT_CONTEXT、最近のADR／Run、feature-plan workflowを読了した。
- 2026-08-28 15:27 JST: Plan §8のrepo-wide searchを先行実施。旧stack外の独立producer／consumer／callerは確認されず、旧Subagent／旧observerの削除を進める判断を採用した。
- 2026-08-28 15:31 JST: 現行Codex CLIは`codex-cli 0.150.1`、`hooks` featureはstable／enabled。5eventのfull native smokeは最終config確定後に行う。
- 2026-08-28 16:58 JST: 最終Windows commandはnative shell解釈で安定した直接`Join-Path (git rev-parse --show-toplevel)`形式へ確定した。Subagent lifecycleのlive occurrenceはNo child delegation方針により未実施とし、contract smoke結果と未検証理由を分離して記録した。
