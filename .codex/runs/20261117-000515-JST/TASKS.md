# Tasks（タスク）

## Now（現在）

- [x] 1. 対象repository、clean worktree、指定branch、最新origin/mainを確認する。
- [x] 2. main CIとschedule CIの失敗logを確認し、既知事実と未確定原因を分離する。
- [x] 3. PowerShell既定executable失敗をrunner上で直接実行/helper/verify経路に分け、fixture自身の非0終了を確認する。
- [x] 4. repository Planを保存し、workflow変更のL2承認を得る。
- [x] 5. 失敗するOS依存fixtureを決定的な実行可能スクリプトへ置き換え、共通実装を維持する。
- [x] 6. 承認済みevent別base SHA解決とsanitizer regressionを実装する。
- [x] 7. 対象testと標準gateを実行し、PASS/FAIL/SKIP及び中断理由を記録する。
- [x] 8. scope/diffを確認しRun Artifactをfinal commit前状態に確定する。
- [x] 9. 指定branchへcommit/pushし、main向けPR #225を作成する（初回HEAD、CI修正commitのpushは後続）。
- [ ] 10. 最新PR HEADの必須CI結果を確認、またはwaiter不在のblockerを記録する。
- [x] 11. PR #225の最新HEAD、remote refs、作業tree、Git参照仕様、既存L2承認範囲を確認する。
- [x] 12. 同名タグ衝突による比較元誤選択と、実サニタイザーの検査漏れを一時Git repositoryで再現する。
- [x] 13. PR候補を完全修飾し、実workflow resolverを使う同名タグ・タグのみの回帰fixtureを追加する。
- [x] 14. PowerShell/Vitest対象検証のローカル結果と制約、Run Artifactの最終状態を記録する。
- [ ] 15. 既存branchへcommit/pushし、PR本文と最新HEAD CIを更新・確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- scripts/new-run.shはworking-tree CRLFのため直接Bash実行で失敗した。tracked scriptは変更せず、Run初期化ではtemporary LF-normalized streamを使用。
- global pnpm 9.10.0はrepository指定の10.34.5と異なり、frozen installでchecksum mismatch。Corepack経由pnpm 10.34.5と`<TEMP_ROOT>`内storeでfrozen installは成功した。依存setupではesbuildとunrs-resolverのinstall scriptが無効化された。
- `bash scripts/verify`はtemplate contractでFAIL。検査スクリプトは`CI確認をProgressへ`、`file-changing task全体`、`作業完了後もRun Directoryを保存`等の旧文言を現行`run-artifacts.md`へliteral要求する。同ファイルは日本語表現と`codex-implementation-harness.md`への正本委譲を使うため、検査側を今回の対象外として扱い、旧文言の重複は加えない。
- `pnpm run verify`はmarkdownlintでFAIL。依存store配下まで走査し、installed dependencyの5,357 Markdown filesで148,689 issuesを報告。変更したPlan/reference文書は対象指定lintでPASS。
- `pnpm run test:contracts`は前回10分無出力後に中断。今回のfocused sanitizer Vitestは300秒で中断し、最初の6ケースはPASSしたが、次のGit index fixtureの最終結果を得られなかった。隔離probeでNode 24の`execFileSync`にstdinを渡した`cat`がEOFを受け取らず`ETIMEDOUT`となり、同じAPI形の`git update-index --index-info`も時間切れになる環境挙動を再現した。追加したworkflow文字列契約の単独VitestはPASS。ローカルPowerShellは未導入。
- wait_for_required_ciはconnected tool一覧に見つかっていない。独自pollingへ置換しない。

## Blocked（ブロック中）

- ブロック時のみ記載する。
