# Plan（計画）

## Objective（目的）

- PR #229のExpo SDK推奨依存更新を保ち、Android CI失敗の原因を切り分け、必要な最小修正と最終HEADのWeb/Mobile CIを完了する。

## Scope（対象範囲）

- In: PR #229 head branch、Android共通CI/build設定と契約テスト、依存lock整合、関連Web/Android/iOS回帰、PR #229本文、PR #199への後続引継ぎ。
- Out: PR #199・mainの変更、merge/close、Expo/RN major/minor更新、Expo Doctorや必須CIの弱体化、production/automation境界の変更、release/tag/外部配布。

## Assumptions（仮定）

- 失敗ログは原因の手掛かりであり、同一HEAD rerun/attempt historyと生成設定で確認する。
- 一時的外部取得障害で修正不要ならコード変更を作らない。
- PR本文は自動生成文を保持して結果を追記する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。作業範囲・許可・完了条件は明示済み。
- 仮定してよい細部: 既存共通workflow/contractを優先し、必要最小限を修正する。
- 未回答の重要質問: 再実行でGradle plugin/NDK問題が再現するか、必要なNDK版と生成元。

## Hypotheses（仮説）

- H1: ProductionのGradle plugin artifact解決とAutomationのNDK ZIP展開は別々の外部取得障害かもしれない。
- H2: NDK失敗後のSoftwareComponent release errorは二次障害かもしれない。
- H3: expo-sqlite更新がNDK 27.0.12077973を要求し、別projectの27.1.12297006要求とは独立に両方必要かもしれない。

## Research Plan（調査計画）

- Round 1 Query: PR/head/upstream/worktree、GitHub workflow attempts/jobs/artifacts、初回失敗ログ、package config/plugin/CI contractsを確認。
- Round 2 Query: rerun結果とExpo prebuild生成物、expo-sqlite 57.0.7/57.0.5 Gradle設定、SDK/NDK要求を照合。必要なときだけ関連workflowを変更し、既存回帰を実行。
- Exit Criteria:
  - 主要な失敗ごとにfirst errorと支持/反証Evidenceがある
  - 未解決論点は次の根拠取得または停止理由を持つ
  - 最終HEADの必須CIは同じSHAで確認する

## Approach（進め方）

- PR metadataとGit安全条件確認後に、現行失敗ログを確認する。rerun履歴・状態を確認し、再実行の既存結果を尊重して追加rerunしない。
- code/configの別担当調査結果を確認し、原因が再現する失敗だけを直す。bounded repair loopとローカル関連検証を適用する。
- independent review、変更scope、GitHub branch/PR HEADを再確認後に必要差分をcommit/pushする。CI waiterとGitHub APIで最新SHAの必須CIを確認し、PR本文を更新する。

## Definition of Done（完了条件）

- PR #229はOPENのまま。最終HEADのWeb CIとMobile App CI全必須jobがSUCCESS。Expo Doctor・依存整合・指定された回帰が成功。変更が必要ならPR branchへ通常push済み。独立レビュー済み。PR本文に検証とPR #199引継ぎを記録済み。

## Risks / Unknowns（リスク・未知点）

- NDK取得不全とGradle plugin取得不全は別々の外部依存経路であり、無関係なtoolchain更新は避ける。
- NDK複数版は生成Gradle設定と要求projectから確定する。SDK全体初期化、無制限retry、失敗隠蔽をしない。
- Androidローカル環境がなければCI Buildの実体結果が必要。

## Thinking Log（判断記録）

- PR #229のOPEN/head SHA/branch一致を確認。worktreeは開始時clean、upstreamは同じorigin branch。
- GitHub run-list APIはattempt番号を返さなかった。後からattempt詳細を確認すると、初回ジョブ指定が既にattempt 2に属していた。attempt 2は完了FAILUREで、attempt 3を開始してしまった。追加rerunはしない。この重複実行をRun/PR本文で明示し、attempt 3の結果を待つ。
