# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. 正本Planの全文と今回変更契約を確認し、関連箇所の修正方針を確定する。
- [x] 2. Task 0としてorigin/main、PR/branch/head、merge base、working tree、Hook/config/test/CI/package/wrapper/Runを再確認する。
- [x] 3. Hook formatter、inactive Stop output、Unix/Windows launcher fallbackを実装する。
- [x] 4. inactive/active/repeated Stop、safe cause、情報漏えい、通常violation、launcher process/static contractを更新する。
- [x] 5. 正本Planと運用ドキュメントを実装契約へ同期する。
- [x] 6. focused / wrapper / Repository標準 / 最終verifyを実行し、failureがあればbounded repairする。
- [x] 7. diff scope、Run Artifact sanitization、最終契約レビューを完了する。
- [ ] 8. commit・通常push、PR本文更新、最新PR headのWeb/Mobile CIを確認する。

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
