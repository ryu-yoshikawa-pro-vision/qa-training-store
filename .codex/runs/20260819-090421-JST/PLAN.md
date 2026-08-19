# Plan

## Objective

- PR #31 post-mergeで発生した `codex-hook-contract.test.ts` のA4 branch依存failureを、Hook本体のG10 policyを変更せず解消する。

## Scope

- In:
  - `tests/contracts/codex-hook-contract.test.ts` のmatrix代表テスト。
  - testCase.contextがあるcaseを、実checkoutではなく明示contextで評価する小さなtest helper。
  - focused / full contracts、format、lint、typecheck、diff check、可能ならverify。
  - 指定feature branchへのcommit / push。
- Out:
  - `.codex/hooks/pre_tool_use_policy.mjs`、workflow、package、lockfile、Application / Native source。
  - A4 expectedの変更、G10弱体化、retry、CI skip、PR作成・レビュー操作・merge。

## Assumptions

- `origin/main`の現在HEADが指定された `7a045d66271bdecc0ae9e191872038f29d95e41b` と一致している。
- Hook本体の `evaluateCommand(command, suppliedContext)` がcontextを明示指定すればGit checkoutを参照しない。
- context付きmatrix caseの判定はchild Node processで既存のmodule exportを呼ぶ方式で十分である。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象ファイル、禁止事項、検証、push先が明示されている。
- 仮定してよい細部: 既存のcontextual testと重複しない最小helperの形は実装時に決定する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: matrix代表テストがcontext付きcaseでもrunNodeHook()を呼ぶため、A4/A5が実branchに依存している。
- H2: context付きcaseをevaluateCommandへ明示的に渡せば、main checkoutでもA4/A5はallowとなり、G10のprotected branch判定は既存のcontextual deny testで維持される。

## Research Plan

- Round 1 Query: current branch / origin/main、既存Run、ADR、test / Hook実装、baseline focused testを確認する。
- Round 2 Query: 修正後のfocused/full contractsと必須品質gate、diff scope、sanitizerを確認する。
- Exit Criteria:
  - H1/H2をコードとtest結果で支持する根拠がある。
  - 変更ファイルが許可範囲を超えない。
  - validation failureが残る場合はbounded repair停止条件に従う。

## Approach

- `main`を`origin/main`へfast-forward同期し、既存feature branchへ戻る。
- baseline focused contractで失敗を確認する。
- `testCase.context === undefined`は現在のCLI Hook実行を維持し、context付きcaseだけをchild Node process内の`evaluateCommand(command, context)`で評価する。
- A4/A5のfeature allowとprotected branchのG10 denyを含む既存回帰テストを通し、指定品質gateを実行する。
- self-review、Run Artifactのsanitizer Write / Check、strict evaluation後にcommitし、feature branchへ通常pushして停止する。

## Definition of Done

- A4/A5が実checkout branchに依存せずmatrix contextでallowになる。
- G10 policy本体とprotected branch deny契約が変更されていない。
- focused test、full contracts 393/393、format / lint / typecheck / diff checkが成功する。
- verifyを実行できた場合は結果を記録する。
- commit / pushが完了し、mainへの直接push、PR作成、review操作、mergeを行わない。

## Risks / Unknowns

- `pnpm run verify`は長時間または環境依存で失敗する可能性がある。失敗時は最初の異常を記録し、別コードへ拡張しない。
- Run Artifactとplanは運用上必須だが、コード変更scopeのself-reviewではtarget test以外の差分として明示的に分離する。

## Thinking Log

- 2026-08-19 JST: input failureをmust_fix、allowed_filesを`tests/contracts/codex-hook-contract.test.ts`に固定した。
- 2026-08-19 JST: `main` / `origin/main` / fix branchはすべて指定HEAD `7a045d6…`で一致し、working treeはコード上cleanだった。
- 2026-08-19 JST: ADR-0016によりHook本体のNode policyがSSOTであり、今回の修正はcontract test側に限定する。

## Decision Update — PR #33 再レビュー

- 2026-08-19 JST: 再レビューの残存findingを`must_fix`として受領した。protected branch上の通常commitをG10 denyする明示的regression testが不足していた。
- allowed_files / expected_changed_filesは引き続き`tests/contracts/codex-hook-contract.test.ts`のみ。既存`runNodeHookWithExplicitContexts()`を再利用し、Hook本体・helper仕様・workflow・packageは変更しない。
- Repair iteration 2の停止条件は、追加testと既存A4/A5・protected push契約の全validation成功、scope violationなし、通常commit / push完了とする。
