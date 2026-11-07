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

## 作業ブランチの個別タスクリスト

各ブランチの開始時にrootの`AGENTS.md`を読み、該当ブランチ専用のタスクリストを参照する。各リストは**その作業ブランチにのみ存在し、#199統合先からのリンク先にはまだ存在しない場合がある**。差分の責務・完了条件はそのリストと本Planの両方を確認する。

| ブランチ | タスクリスト |
| --- | --- |
| `work/pr199-analysis-coverage` | `docs/plans/2026-11-04_133500_pr199-analysis-coverage-tasks.md` |
| `work/pr199-curriculum-phase1` | `docs/plans/2026-11-04_133500_pr199-curriculum-phase1-tasks.md` |
| `work/pr199-curriculum-phase2` | `docs/plans/2026-11-04_133500_pr199-curriculum-phase2-tasks.md` |
| `work/pr199-curriculum-phase3` | `docs/plans/2026-11-04_133500_pr199-curriculum-phase3-tasks.md` |
| `work/pr199-formal-assessment` | `docs/plans/2026-11-04_133500_pr199-formal-assessment-tasks.md` |
| `work/pr199-distribution-security` | `docs/plans/2026-11-04_133500_pr199-distribution-security-tasks.md` |
| `work/pr199-sut-acceptance` | `docs/plans/2026-11-04_133500_pr199-sut-acceptance-tasks.md` |

個別PRは#199をbaseとしたDraftで作成する。個別PRの作成時点は着手準備完了であり、分析・教材受入やCIの完了を意味しない。旧定期タスクはユーザーが停止する予定であり、本Plan・ブランチの作成だけで停止したと判断しない。

## #199統合先に残す横断受入

[統合・横断受入タスクリスト](docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)を#199本体だけが編集し、個別7PRの受入後もWeb学習・クイズ画面、82理解事項の内容レビュー結果の集約、知識グラフの共通変更、51目標・22状態・教材/評価/配布の対応、通常AIチューターと独立AI正式評価の連結、同一最終HEADのCI・独立レビューを確認する。

- **#213**：要件ID別の分析根拠・79要件と29横断要件の対応。#219のCase実Runは直接更新せず参照。
- **#214〜#216**：自分のモジュールの`quizzes/Mxx.json`と知識ノードの意味的な確認・レポート。共有`knowledge-graph.json`・`knowledge-graph.mjs`・`scripts/docs/build-ai-assisted-qa.ts`・`scripts/docs/build-docs.ts`は変更せず#199に引き継ぐ。
- **#217**：正式AI評価のPlaywright実Run/API照合と校正。通常のOpenCodeチューターの教材/配布条件は#214〜#218と連携し、学習用Agentを正式な評価セッションとして使い回さない。
- **#218**：配布後の実行入口、Phase 1/2の成果物保全、WebとTemplateの版境界、外部AI送信対象を検証。Web共通UI生成処理は#199に引き継ぐ。
- **#219**：採用Case別の実Run・期待/観測・#199/#210対象HEADを証拠で管理。基本分析台帳と製品SUTは変更しない。

個別PRのタスクリストへ具体的な受入と引継ぎを記し、横断チェックを個別PRのマージ前条件として二重計上しない。Web学習画面のアクセシビリティは#199本体が担当し、#219の製品画面受入とは別に記録する。

## エージェント作業と#199最後の実受入

PR #213〜#219では専有ファイルの仕様・コード・教材の照合/修正、契約・負例テスト・既存GitHub Actionsによる自動検証、Case別証拠と未実行条件の整理を行う。本人Private 2コアCodespaces、OpenCode認証済みモデル・本人の独立課題、GitHub Private PR/CI、実Android/ブラウザ・DB前後、再配布権利の最終判断などは、**#199の統合後の最終実受入**へ送る。自動実行結果は残すが実利用者の合格判定へ転用しない。

各PRの現行タスクリストにはこの作業境界と引継ぎ先を記録する。#199の[統合・横断受入タスクリスト](2026-11-04_143600_pr199-integration-acceptance-tasks.md)が本体の実受入の正本。CI不具合、契約テスト、教材修正などエージェントが実行できる作業は各PRで完了させる。7件のチェック済み項目は当時の実施範囲を維持し、実受入の完了とは区別する。Public Template公開は従来どおり#199マージ後の本人作業。
