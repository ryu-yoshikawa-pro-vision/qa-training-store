# PR #199の並行作業：ブランチと変更範囲

## 目的・統合先

- 統合先はPR #199の `docs/plan-ai-agent-qa-curriculum-redesign`。各作業ブランチはこの文書を追加した同一HEADから作る。
- PR #199の正式な受入条件を縮小しない。基本分析、製品適合、実Run、教材受入、正式AI評価、配布監査は別判定。
- 製品SUT（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`）、正式製品仕様、既存Seed/Reset、製品用テスト/workflowは読み取り専用。製品修正はPR #210。
- 個別の作業PRを作る場合は **baseを`docs/plan-ai-agent-qa-curriculum-redesign`** とする。mainへ直接マージしない。merge、force push、branch削除、PR closeは別途明示指示を要する。

## 作業ブランチと所有範囲

| ブランチ | 残作業 | 変更できる主要範囲 | 他ブランチとの境界 |
| --- | --- | --- | --- |
| `work/pr199-analysis-coverage` | 9操作・3状態、79要件の内容/参照、分母188+20の監査、分析証拠/Validator | `training/ai-assisted-qa-course/coverage/**`、`scripts/training/validate-supported-behaviors.mjs`、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`、分析専用レポート | **分析台帳はこのブランチだけが書込む**。動的証拠は別ブランチから引き継ぐ |
| `work/pr199-curriculum-phase1` | M00〜M04・22目標、M02→M03の固定Skill通し検証、学習開始/分析/設計 | `docs/curriculum/ai-assisted-qa/modules/M00..M04/**`、該当`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`、該当クイズ・固有テスト | 正式な採点エンジン、`assessment/**`、共通manifestは変更しない |
| `work/pr199-curriculum-phase2` | M05〜M07・15目標、Playwright/Seed/Reset/Trace、独立Case・before/after検証 | `modules/M05..M07/**`、該当`exercises/Mxx/**`・`states/Mxx/**`、学習専用Playwright/固有テスト | 製品用E2Eや既存Seed/Resetは変更しない。正式採点資料は評価ブランチが所有 |
| `work/pr199-curriculum-phase3` | M08〜M10・14目標、Git/CI教材、M09→M10の配布済みShop利用契約、SHA/Run/Artifact | `modules/M08..M10/**`、該当`exercises/Mxx/**`・`states/Mxx/**`、`templates/phase3/**`、`scripts/training/ai-assisted-qa-github-run-evidence.mjs`、固有テスト | `course:sync`/manifest・正式評価エンジンを変更しない。workflow見本は無効のまま |
| `work/pr199-formal-assessment` | M04/M07/M10の実モデル校正、重大な誤PASS拒否、独立評価・再評価・非公開履歴 | `training/ai-assisted-qa-course/assessment/**`、`scripts/training/ai-assisted-qa-assessment*.mjs`、`scripts/training/ai-assisted-qa-run-evidence.mjs`、評価固有テスト | モジュール教材・共通course router/manifestを直接編集しない。境界変更は統合先で調停 |
| `work/pr199-distribution-security` | 固定SHA配布、依存閉包、Skill/NOTICE、Secret除外、`course:sync/load/check`・非破壊性、配布物の検証 | `training/course-sync/**`、`scripts/training/ai-assisted-qa-course-core.mjs`、`scripts/training/prepare-learner-template.mjs`、配布固有テスト、配布監査レポート | `assessment/**`・各`modules/Mxx/**`・Phase 3の無効workflowを変更しない |
| `work/pr199-sut-acceptance` | 認可/Cart/Checkout/DB/RoleのWeb/Android実証、視覚/a11y、再現証拠と製品不具合の切分け | 新規の受入用テスト・実行証拠・`docs/reports/`内の専用レポート | 分析台帳は直接変更しない。製品不具合はPR #210用の根拠として引き渡す。実機がない場合は未実行と記録 |

`modules/M00..M04/**`などの省略表記は、対象モジュールの各ディレクトリを意味する。ほかのモジュールには適用しない。

## 統合先だけで変更する共通ファイル・作業

- `docs/plans/2026-11-01_pr199-execution-tasks.md`、この分担Plan、全体設計Plan、PR本文、`docs/curriculum/ai-assisted-qa/knowledge-graph.json`は統合先で一元管理。必要な変更提案は専用レポートに残し、各ブランチから同時編集しない。
- `package.json`、lockfile、`scripts/training/ai-assisted-qa-course.mjs`、共有`tests/contracts/ai-assisted-qa-curriculum.test.ts`・`ai-assisted-qa-practical-exercises.test.mjs`などは、複数責務をまたぐため統合時の単一変更にする。必要な個別テストは専用ファイルを追加する。
- `.github/workflows/native-ci.yml`の`pull_request`復元とWeb/Mobile最終HEAD受入、独立レビュー、全分岐の統合・共通Plan更新は統合先の最後の工程。Mobile CIを止めた状態でmainへマージしない。
- Public Template実公開はPR #199マージ後、本人Private repo/2コアCodespaces実受入は他の作業完了後。実受講者の学習効果検証はPR #199外。

## 各ブランチの進め方・完了条件

1. ブランチ起点とPR #199の最新HEADを確認。変更対象の最新実装・仕様・既存テスト・CIを調査し、既存の解決済み事項を再作業しない。
2. 自分の所有範囲だけを変更。別の所有者が必要な場合は、直接変更せず根拠、変更インターフェース、検証条件を記録する。製品SUT修正は不可。
3. 静的/直接テストの結果、実行した環境、固定HEAD・ファイルSHA、失敗・未実行・BLOCKED、残リスクを記録。追加しただけのテスト、形式的status変更、AI自己申告はPASSにしない。
4. 固有の変更範囲を完了させたら、統合先をbaseにしたPRで差分レビューし、#199の最新HEADへ取り込む。自動的にmergeしない。先に別ブランチが更新されたらbase差と受入契約を再検証する。
5. 共有ファイルの最後の調停と、Web/Mobileの**同一最終HEAD**の必須CI・独立レビューを終えるまで、PR #199は未完了とする。

## 定期実行との関係

既存の毎時00/15/30/45分の4件は、現在PR #199本体の**同じ共通逐次作業**を指している。ブランチ作成だけでは実行先は変更されず、並行タスクも自動開始されない。これらを分担ブランチに割り当てる場合は、対象branch・所有範囲・引継ぎ方法を明示して別途設定を変更する。未変更のまま運用する場合は、#199本体での並行更新と分析台帳/教材の競合が起き得るため、各作業開始時にHEAD・対象Blobを再確認する。
