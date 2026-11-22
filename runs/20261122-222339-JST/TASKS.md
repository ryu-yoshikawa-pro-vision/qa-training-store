# Tasks（タスク）

## Now（現在）

- [x] 1. 作業ブランチ、HEAD、upstream、main、PR状態、clean worktree、PR #210取り込みを確認する。
- [x] 2. 指定正本・repair-loop/code-review Skill・既存RunとPlanを確認し、strict Runを初期化する。
- [x] 3. exact-head Web/Mobile workflow、job、artifact一覧とCI失敗の初期内訳を取得する。
- [x] 4. 統合／契約／PR固有E2E失敗の全Assertion、現行仕様、source経路、テスト所有範囲を確定する。
- [x] 5. 親が承認した範囲でPR #199専用テスト／coverage evidenceを最小修正する。
- [x] 6. 対象テストとintegration/contracts/repository/component/hooks/E2E/build/verifyを環境に応じて再実行する。
- [ ] 7. exact-head配布実体とmanifestを照合し、1.2/1.3/1.4および外部AI安全条件を根拠付きで判定する。
- [x] 8. 別担当による7.1統合レビュー・7.2移管レビューを受領し、指摘と残リスクを確認する。
- [ ] 9. 統合受入Planと継続手順に最新判定を履歴を保って反映し、PR本文に証拠と残条件を記録する。
- [x] 10. 差分境界、format/security/sanitizer/Run Artifact、変更ファイルを最終確認する。
- [ ] 11. 関連検証後に必要なローカルcommitを作成し、GitHubへのpush承認状態を確認する。
- [ ] 12. push承認が得られた場合だけ通常pushし、最新HEADのWeb/Mobile CIをwaiterで1回確認する。
- [ ] 13. B案8.4とmerge可否を証拠に基づき判定する。PR #199のmerge/close/公開はしない。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- [x] 14. main既存`e2e/web/cross-role-lifecycle.spec.ts`の曖昧なstatus Locatorを対象・影響・最小案とともに製品テスト保守PRへ引き継ぐ。新PRの作成は別途承認が必要。
- [ ] 15. 固定Skill一次許諾、第三者素材全件の権利者根拠、実Providerの認証/料金/保持条件を取得する。
- [x] 16. 後続12条件と本人マージ後6条件を旧未受入状態のまま引き継ぐ。
- [x] 17. Tutorの未確認Provider/保持条件でのfail-closedと送信前availability/auth契約を修正・検証する。
- [x] 18. Tutor excerpt/public fileの親directory symlink raceを閉じ、決定的な回帰テストを追加する。

## Blocked（ブロック中）

- 外部固定Skillの配布権利者による一次許諾、全生成物の素材ライセンス証拠、実Provider契約/保持検証、本人環境の実受入、最終GitHub Actions確認には外部当事者またはpush承認が必要。
- Tutorの実Provider送信は保持条件の一次根拠を取得できるまで利用不可とし、実Provider認証・課金・保持をこのRunで推測しない。
