# Tasks（タスク）

## Now（現在）

- [x] 1. PLANを確定する。
- [x] 2. 必要な既存証拠を調べ、Issue/PR/Run HEADを確認する。
- [x] 3. 各本人決定と更新先を対応付ける。
- [x] 4. 統合受入Plan、継続手順、監査レポート、learner NOTICE、AGENTS、Issue #228を更新する。
- [x] 5. Markdown差分のformat/lint、文書品質、security scan、diff checkを検証する。
- [x] 6. PR本文へ本人確定事項と現行受入状態を反映し、旧判定を履歴として区別する。
- [x] 7. Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 8. 変更差分・対象ブランチ・commit対象を確認する。
- [ ] 9. 明示承認後に通常pushし、PR HEAD・remote HEADを一致させる。
- [ ] 10. push後の最新PR HEADのWeb/Mobile CIを確認し、結果をPR本文へ記録する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- Issue #228の旧PR関係欄が1.2の受入をマージ前必須としていた。現在は公開前条件に変更し、未受入状態と公開禁止は保持する。
- 固定Skill監査報告の旧BLOCKEDは2026-11-07の記録として残し、2026-11-23の本人決定を現在判定として後続追加する。
- PR本文・GitHub Issue更新は実施権限があるが、merge/close/public releaseは対象外。

## Blocked（ブロック中）

- 通常pushとpush後CIは未実施。過去のPR #199指示ではremote pushに当該操作の明示承認が必要とされている。今回の指示はforce pushを禁止しているが通常pushを明示していないため、GitHub上へのbranch更新は停止し、ローカルcommitまでを行う。`git fetch origin`はread-only `.git` のため失敗したが、GitHub PR APIでHEAD `00670f8ca016845e288f019ae5ad160ca1eca051`、base `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`、OPENを確認した。
