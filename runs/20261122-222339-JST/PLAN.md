# Plan（計画）

## Objective（目的）

- #210を含むPR #199の固定HEADを基準に、最新Web CI失敗をPR #199固有の範囲で修正・再検証し、配布安全性、権利、外部AI安全条件、独立レビュー、B案マージ前7条件を最新証拠で判定する。

## Scope（対象範囲）

- In: PR #199固有の統合契約テスト、学習用の分析データ、PR #199追加E2E、scripts、Run Artifact、既存受入Plan、PR本文、最新CI／Artifact調査。
- Out: 製品SUT、正式仕様、main既存製品テスト、Seed/Reset、外部固定Skill本体、PR #210変更、PR #199のmerge／close、外部公開、権利許諾の推測。
- 追加P1の許可ファイル: `scripts/training/ai-assisted-qa-course-tutor.mjs`、`scripts/training/ai-assisted-qa-course-tutor-core.mjs`、`tests/contracts/ai-assisted-qa-course-tutor.test.mjs`、関連する学習者Tutor案内のみ。未確認Providerはfail-closedし、path raceはroot-anchored no-follow traversalで防止する。仕様上安全性を保証できない実行環境は拒否する。

## Assumptions（仮定）

- PR #199 HEAD `fbc8e551a01882b5e6d8c846edc23f3beea96660` とmain `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd` は取得時に一致し、HEADはmainを含む。
- PR #210はmainへ統合済みだが、製品Caseのexecution acceptanceはそれだけでは更新しない。
- PR本文・既存Run／Planは履歴を保持し、現在値は別チェックポイントで記録する。
- ユーザーは今回、ローカル検証後の既存PRブランチへの通常pushを明示承認している。最新remote refを再確認し、force push・main変更・PR merge/closeは行わない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 権利者の許諾、実Provider認証／費用／保持、本人環境の実受入、独立人間レビュアーが必要な判定。
- 仮定してよい細部: 既存テストとCIログから原因が明らかなPR #199専用テストの最小修正。
- 未回答の重要質問: 外部権利者と独立確認者による判断はこのRunだけで取得できない。

## Hypotheses（仮説）

- H1: Integration／Contracts failureの大部分は#210後の正式挙動に古い期待値・分析証拠が残ったことで説明できる。
- H2: PR #199専用stale Cart E2Eも#210後の復帰仕様に合わせて更新可能だが、製品受入Caseは未受入のまま残す。
- H3: cross-role既存製品テストのstatus Locator失敗はPR #199では修正できず、別製品テスト保守PRの対象。
- H4: B案1.3／1.4と実Provider／本人受入には一次根拠・外部当事者が不足し、8.4のマージ可判定には至らない可能性が高い。

## Research Plan（調査計画）

- Round 1: exact-head CI run/job/log/Artifact、PRとmainの親子・変更境界、既存受入根拠を確定する。
- Round 2:認可回帰、79要件・208動作の分析証拠、在庫分類、stale Cart、既知FAIL、Tutor／評価の安全経路を検査する。
- Round 3:独立レビュー結果、配布実体・manifest・権利一次資料の有無を統合し、B案条件を証拠ごとに判定する。
- Exit Criteria:修正可能なPR #199専用不整合を最小修正・検証し、外部判断・CI・本人受入で残るBLOCKEDと再開条件を明確にする。

## Approach（進め方）

- exact HEAD/CIと変更所有範囲を再確認し、既存証拠を優先する。
- 読み取り専用の調査・独立レビューを別担当へ委任し、親が要件と変更範囲を決める。
- ひとつの実装workerに、確認済みのPR #199専用ファイルだけを直列で変更させる。
- 変更後は対象テスト、関連suite、必要なverify/buildを実行する。旧HEADの結果を流用しない。
- Plan、Run Artifact、PR本文に古い履歴を残したまま最新判定を追加する。push後は最新PR HEADを指定してCI waiterを一度だけ呼び出す。

## Definition of Done（完了条件）

- 最新Web CIのすべての失敗jobを、共通原因と個別原因に分けて説明する。
- PR #199変更境界内の回帰を修正し、関連テストを実行する。
- supported-behaviors validatorが79要件・208動作を検証し、正式Case未受入を維持する。
- 1.2／1.3／1.4、外部AI安全、7.1／7.2、8.3／8.4を最新HEAD・一次根拠で判定する。
- 後続12条件と本人受入6条件を維持し、PR #199をmerge／close／公開しない。
- Run Artifactと既存受入Planを更新・sanitizationし、ローカル変更を安全に記録する。pushが未承認なら最新GitHub CI待機は未完了とする。

## Risks / Unknowns（リスク・未知点）

- 79/208分析の証拠更新を行単位の機械置換だけで済ませると、処理経路の意味の変化を見落とす。
- CI artifactの配布対象を全件確認できない場合、1.2をPASSにしない。
- 権利者の一次許諾、実Providerの契約情報、独立した人間レビュー、本人環境の実受入が必要。
- linked worktreeのGit metadataはworkspace外にあるため、Git fetch/commitの安全Hookと権限を遵守する。

## Rollback plan for L3 safety changes（L3安全変更のrollback plan）

- ユーザーの本タスクは未確認Providerへの送信を止め、安全停止できない機能を利用可能にしないよう明示しているため、このfail-closed実装の許可根拠とする。実Provider・認証情報・課金・外部送信は使用しない。
- 修正がTutorのローカル授業機能に回帰を起こした場合も、未検証Providerへ送信していた旧経路へ戻さない。まず同じPRブランチの次コミットで該当読取経路をさらに制限し、TutorをBLOCKEDに保ったまま修正・検証する。
- Provider gateに問題が出た場合はSEND／評価開始のfail-closedを維持し、旧 `opencode run` 経路や既定許可に戻さない。再実装はProviderの認証、保持／削除、費用の一次根拠が揃い、明示的に再承認された後に限る。
- 復旧は同PRブランチへの通常のforward commitだけで行い、既存merge commitの書換え、reset、rebase、force pushは行わない。公開・mergeは行わない。

## Thinking Log（判断記録）

- 2026-11-22: PR #199はOPEN、HEAD `fbc8e551a01882b5e6d8c846edc23f3beea96660`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`、作業ツリーclean。#210統合後の最新Web CI #45020508148はFAIL、Mobile CI #45020508179はSUCCESS。
- 2026-11-22: Read-only CI logでIntegrationの2件は旧`RESOLVED`期待、Contractsの16件は2 last-admin期待コード・13 supported-behavior validatorの最初の証拠差・在庫`it.fails`旧前提に分類。Cross-role PR固有stale Cartは旧`/checkout/payment`に対し`/cart`を観測。既存製品cross-roleのLocator曖昧性はPR #199専用差分ではない。
