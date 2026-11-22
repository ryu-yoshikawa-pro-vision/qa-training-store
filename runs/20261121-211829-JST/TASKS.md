# Tasks（タスク）

## Now（現在）

- [x] 1. merge状態と仕様・テスト・PowerShell経路を読み取り専用で確認し、PR #210修復計画を確定する。
- [x] 2. 在庫境界テストを`pageSize: 50`へ修正し、Nativeファイル内の未await `render()` 3箇所を修正する。
- [x] 3. Native個別テストを実行し、成功後に対象ファイル全体を実行する。
- [x] 4. typecheck、integration、component、contracts、formatおよび必要なverify gateを実行し、失敗を分類する。
- [x] 5. Run Artifactをsanitizer/security scanし、PR #210製品変更・PR #226移行・conflict・差分を確認して必要なファイルだけstageする。
- [x] 6. commit前のmerge状態と残件を報告し、commit/merge continue/pushなしで停止する。

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

## Follow-up: WSL2/Bash検証環境（2026-11-21）

- [x] 7. 通常検証入口とWSL2/Linux実行環境を確認し、このコマンドに限ってWindows PATHを除外する。
- [x] 8. `test:contracts`をsandbox内と信頼実行環境で比較し、PowerShellのSKIPを分類する。
- [x] 9. `test:repository`をsandbox内と信頼実行環境で比較する。
- [x] 10. 信頼実行環境で`pnpm run verify`全体を実行する。
- [x] 11. Runを最終更新・sanitizer/security scanし、差分・stage・merge状態を確認して報告する。
