# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Run-local PLANをPR3 Planへ接続し、対象・禁止範囲・停止条件を確定する。
- [x] 2. Issue / PR / main / baseline / routing / Eval / ADR / repository-contractを再確認し、REPORTへ判断根拠を残す。
- [x] 3. 2件のdescription gap有無を独立判定する。
- [x] 4. gapがある場合だけPlan指定のcontrol / candidate / current-main Trigger Evalを実行し、なければno-opとして記録する（両件no-opのためlive EvalはN/A）。
- [x] 5. 必須のdeterministic / repository検証を実行し、PASS / FAIL / 停止理由を記録する（`verify`の既存timeoutは未解消）。
- [x] 6. source、Target、dataset、config、Run Artifactのscopeとprovenanceを最終確認する。
- [x] 7. Run Artifactをfinal commit前状態へ更新・sanitizer検証する。
- [ ] 8. commit対象を確定し、commit / push / PR head / 必須CI / PR本文更新まで完了する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked（ブロック中）

- ブロック時のみ記載する。
