# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [x] 1. 正本Plan、対象branch／PR／Issue／CLI version、作業treeを確認する。
- [x] 2. Run-local PLANを今回の調査範囲・仮説・DoDへ確定する。
- [x] 3. 現在headのHook contract、text-quality state、既存CI基準を再確認する。
- [x] 4. 正規wrapperで`/hooks` trust確認とcompact runtime確認を試行する。
- [x] 5. 安全な範囲でfail-close runtime確認の可否を判定する。
- [x] 6. Repository-wideの明示的文章規約と既存validatorを調査する。
- [x] 7. 根拠のあるproduction rule候補表と、候補0件の場合の理由を作成する。
- [x] 8. `not-configured`、実装、PR／Issue stateが不変であることを検証する。
- [x] 9. Run Artifactをcollector／sanitizerで検証し、commit／pushなしで完了報告を作成する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- [x] 10. `gh` CLIが未インストールのため、GitHub MCPを読み取り証跡として使用する。
- [x] 11. `computer-use` skillのCodex CLI自動操作禁止により、対話TTYが無い場合はruntime未確認理由を記録する。

## Blocked

- ブロック時のみ記載する。
