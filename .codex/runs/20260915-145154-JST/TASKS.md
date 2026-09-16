# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [x] 1. branch／PR／Issue／Plan／現行launcher／Hook本体／contract／依存状態を確認し、修正scopeを確定する。
- [x] 2. `must_fix`分類、bounded repair計画、allowed files、検証条件をRun PLANへ確定する。
- [x] 3. Stop／SessionStart configured launcherを最小修正する。
- [x] 4. Unix／Windows configured launcher contractとADR-0026を更新する。
- [x] 5. focused contract、Harness、標準関連検証、diff checkを実行する（修正前のstate cleanup failureを再現・原因切り分けし、修正後はfocused／aggregateともPASS）。
- [x] 6. 非対象差分、security出力、Run Artifactを確認・sanitizeする（非対象source差分なし、sanitize residual 0）。
- [x] 7. branch安全確認後にcommit／pushし、local／remote／PR headを一致させる（実装head `357767d...`まで確認済み。最終Run Artifact commit後に再確認する）。
- [ ] 8. 最新PR headのrequired CIを確認し、PR本文を更新する。

## Continuation: PR #146 UserPromptSubmit baseline launcher repair

- [x] 9. configured `UserPromptSubmit`のsilent no-opをUnix／Windows fixtureで再現し、Hook本体到達前またはHook process failure時に診断が失われることを原因候補として確定する。
- [x] 10. Unix／Windows launcherをfail-open・固定bounded stderrへ最小修正し、baseline生成責務をHook本体へ維持する。
- [x] 11. configured正常系、root／Hook欠落、Hook non-zero、module load failure、short／64 KiB promptの回帰契約を追加する。
- [x] 12. focused Hook contract、PowerShell Harness、標準lint／typecheck／contract／build／verifyを実行し、今回差分由来のfailureがないことを確認する。
- [x] 13. 実Codex executable可用性、current session state、最新`main`祖先性、PR／Issue open状態を確認する。compact runtimeはexecutable欠落のため未確認として記録する。
- [ ] 14. Run Artifactを最終化し、commit／通常push、最新head CI、PR本文、local／remote／PR head一致を確認する。

## Repair iteration: latest-head CI feedback

- [x] 15. 最新headのWeb CIで最初に失敗したWindows contract assertionを確認し、Hook実装ではなくpath separator表現の期待値差であることを切り分ける。
- [x] 16. `git rev-parse --show-toplevel`出力を基準にroot identity期待値を作る最小テスト修正を行い、該当Windows testsを再PASSさせる。
- [ ] 17. 修正headをcommit／通常pushし、Web／Mobile CI、PR本文、最終head一致を再確認する。

## Repair iteration: Codex 0.154.0 structured fail-open diagnostics

- [x] 18. `rust-v0.154.0` source、Issue／PR／current diff／CI、対象config／Hook／contract／Planを確認し、exit 0 stdout／systemMessage契約を確定する。
- [x] 19. 2件の`must_fix`、allowed files、非目標、実装順、検証・停止条件をRun PLANへ追記する。
- [x] 20. `text_quality_gate.mjs`のfail-open診断を固定structured stdoutへ変更し、Stop(false)／Stop(true)／state cleanup契約を維持する。
- [x] 21. configured UserPromptSubmit／PostToolUseのUnix launcherをfailure時structured stdout・exit 0・raw output非公開へ修正する。
- [x] 22. configured UserPromptSubmit／PostToolUseのWindows EncodedCommandを可読PowerShellからUTF-16LEで再生成し、Unixとの契約を揃える。
- [x] 23. Hook本体とconfigured launcherのprocess-boundary／正常系／failure／漏えい回帰テストを更新・追加する。
- [x] 24. Plan／ADR／safety reference、Run Artifactを現契約へ更新・sanitizeし、非対象差分を確認する。
- [x] 25. focused contract、`verify.ps1 -HookContracts`、標準verify、文章lint、diff checkを実行し、原因別に修正をboundedに停止する。
- [ ] 26. branch safety確認後にcommit／通常pushし、最新PR headのCI、PR本文、local／remote／PR head一致、runtime未確認範囲を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- [x] D1. `codex-cli 0.154.0`、Node 24.12.0、pnpm 9.10.0、lockfile／node_modulesの存在を確認した。
- [x] D2. PR #146とIssue #134はOPEN、local／remote／PR headは`1382f41d...`で一致し、作業treeは開始時cleanだった。
- [x] D3. GitHub `main`の`22f73a98...`を対象branchへmergeし、`docs/reference/codex-safety-harness.md`の1 conflictを解消した。
- [x] D4. inactive Stopが複数の新規違反を1回のblockで報告する回帰テストと実装を追加した。active Stopの再入allow契約も同じfixtureで確認した。
- [x] D5. Windows Node 24.12.0で日本語を含む一時パス下の`fs.rmSync(..., { force: true })`がstateを残すfailureを再現し、Hookのstate cleanupを`unlinkSync`へ限定修正した。
- [x] D6. Windows PowerShell 5.1のBOMなしUTF-8読込で`CODE_REVIEW.md`の契約検査が誤検知するため、`scripts/verify.ps1`の読込encodingをUTF-8へ修正した。
- [x] D7. `357767d...`を通常pushし、local／remote／PR headを一致させた。GitHub PRは`OPEN`かつ`MERGEABLE`、baseは`22f73a98...`だった。
- [x] D8. `357767d...`のWeb CI run `34958815515`とMobile App CI run `34958815683`がともにsuccessになった。
- [x] D9. Web CIで観測したWindows launcher契約テストのrunner時間超過を、テスト固有timeoutだけ`10_000ms`から`30_000ms`へ調整して解消した。

## Blocked

- ブロック時のみ記載する。

## Repair iteration: Stop active fallback / SessionStart double-failure repair

- [x] 27. 現行Stop／SessionStart実装、decoded Windows command、既存fixture、PR headを確認し、今回の2 findingの差分を確定する。
- [x] 28. Unix／Windows Stop launcherのactive=true failure fallbackを固定structured systemMessageへ変更し、false／missing／malformed／wrong typeのblock契約を維持する。
- [x] 29. SessionStart structured output二重失敗を非0終了へ変更し、configured launcherの固定`continue:false` fallbackへ接続する。
- [x] 30. 既存process-boundary／source contractを更新し、Stop active diagnostic、漏えい防止、SessionStart二重failureの回帰を確認する。
- [x] 31. focused contract、Harness、標準verify、文章lint、diff checkを実行し、今回の差分由来failureを修復する。
- [ ] 32. Run Artifactをsanitizeし、非対象差分とbranch安全性を確認してcommit／通常pushする。
- [ ] 33. 最新PR headの関連CI、PR本文、local／remote／PR head一致、runtime未確認範囲を確定する。
