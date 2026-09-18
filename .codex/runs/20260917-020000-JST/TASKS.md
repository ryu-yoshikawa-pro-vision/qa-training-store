# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Issue #159で保存済みのPlanを参照し、baseline_state修正のallowed scopeを確定する。
- [x] 2. 必要な調査を行い、証跡をrun-local REPORTへ残す。
- [x] 3. 実行タスクへ落とし込む。
- [x] 4. 実装・変更する。
- [x] 5. ローカル検証を実行し、baseline修正の結果と既存環境failureを分離する。
- [x] 6. 変更範囲を確認する。
- [x] 7. Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 8. commit対象を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- [x] #160未mergeのため、#159 timeoutをbaseline branchへ重複実装しない。baseline PRのCI base依存はpush前に判断する。
- [x] PreToolUse aggregate test（8 launcher invocation / 30秒）は既存failureとして確認し、今回のPreToolUse scopeへ取り込まない。
- [x] verifyのNative component test 1件（Jest 5秒）は既存environment failureとして記録し、今回のNative scopeへ取り込まない。

## Blocked（ブロック中）

- ブロック時のみ記載する。
