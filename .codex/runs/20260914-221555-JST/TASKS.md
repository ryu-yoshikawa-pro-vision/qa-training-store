# Tasks

## Now

- [x] 1. 既存Plan、branch/head、PR/Issue、Node/CI version、既存scanner/Hook/contract/CIを確認してRun PLANを確定する。
- [x] 2. textlint v15公式API、6 ruleのpackage metadata/README、実行互換性を調査する。
- [x] 3. 依存を追加し、実インストール版のAPI/type/README/fixture挙動を確認する。
- [x] 4. `.textlintrc.json`とcustom/textlint統合scannerを最小差分で実装する。
- [x] 5. 既存baseline/fingerprint/rename/PostToolUse/Stop/設定failure契約をtextlint対応へ拡張する。
- [x] 6. tracked Markdownへ6候補ruleのdry-runを実行し、rule別結果と採否を確定する。
- [x] 7. focused contract、Hook contract、lint/typecheck/test、verify、performance、diff checkを実行する。
- [x] 8. PR/Issue/head/working treeを再確認し、Run Artifactをsanitize/collectorで確定する。
- [ ] 9. branch安全確認後にcommit/pushし、最新headのPR CIを確認してPR本文を更新する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- [x] D1. textlint 15.8.0はNode.js `>=20.18.0`を要求し、CI Node 24/local Node 22.20.0と整合する。
- [x] D2. PR #146 head/local/remoteは`310d5d169a49c9e89453dc6be4d0e51924f4f45c`で一致し、PR/IssueはOPEN。
- [x] D3. interactive compact runtimeは既存のTTY制約により未確認のまま記録し、textlint対応の完了条件へ繰り上げない。

## Blocked

- ブロック時のみ記載する。
