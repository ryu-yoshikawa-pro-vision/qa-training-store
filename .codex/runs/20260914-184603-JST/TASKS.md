# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [x] 1. 既存Plan／Issue／PR／#135／branch／rootサイズ／Codex CLI versionを確認し、Task 4ゲートを通過させる。
- [x] 2. 0.147.0のSessionStart Hook schema、matcher、additionalContext、continue:false、additionalContextLimitを公式source／docsで確認する。
- [x] 3. 実装対象、非対象、検証ケースをRun-local PLANへ確定する。
- [x] 4. Hook、config、既存contract、必要最小限のreferenceを実装・変更する。
- [x] 5. focused contract、launcher、標準lint／typecheck／test／verifyを検証する。
- [x] 6. runtime canary、trust、変更範囲、production rule、#135依存を確認する（runtime canaryは非対話環境のため未確認として記録）。
- [x] 7. Run Artifactをfinal commit前状態まで更新・sanitizer検証する。
- [ ] 8. branch／stageを再確認してcommitし、通常pushする。
- [ ] 9. local／remote／PR headを確認し、最新headのWeb CI／Mobile App CIを確認する。
- [ ] 10. PR本文を現状へ更新し、PR OPEN維持とIssue参照を確認する。
- [ ] 11. 完了報告を作成する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked

- ブロック時のみ記載する。
