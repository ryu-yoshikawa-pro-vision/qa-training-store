# PR #199：知識グラフ未登録152パスの変更影響確認

## 対象と判定方法

対象：PR #199、調査対象HEAD `b2970a6e5c1c8dbee0324eefa3e45272d457e324`。[Web CI #42399471859](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42399471859) のArtifact [`pr199-course-distribution-42399471859-1`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42399471859/artifacts/13584509673) 内の `qa-knowledge-pr-impact.json` と `qa-knowledge-validation.json`、同HEADのgit tree、`training/course-sync/manifest.json`、`knowledge-graph.json`を照合した。

これは**知識グラフに新しいノードを追加すべきか**の分類であり、教材の意味承認・製品のPASS・実AIモデル評価を実施したという報告ではない。公開配布からの除外と、リポジトリ全体での非公開は異なる（評価資料は公開リポジトリ上に存在する）。

| 項目 | 件数 | 確認結果 |
| --- | ---: | --- |
| PR変更ファイル | 426 | PR #199のファイル一覧 |
| 知識グラフの既存ノードに対応 | 104 | 既存ノードで追跡 |
| 教材から参照される図版 | 29 | 26 SVG・3 PNG。変更影響検査でlessonへ対応付け |
| 手動レビュー対象（修正前） | 181 | 図版29件を含む |
| 手動レビュー対象（今回のCI） | **152** | `manual_review_required`。以下で漏れなく分類 |
| 学習者向け配布対象外の採点・完成資料 | **42** | グラフの公開ノードへ一律に追加しない |
| 契約テスト・テスト補助コード | **72** | 教材ノードではない。契約CIと個々の受入条件で確認 |
| その他の変更影響候補 | **38** | 下記の既存作業1〜8へ引継ぎ、内容/実行受入は継続 |

**重要**：152件は解消済みの152不具合ではない。42件と72件のグラフ登録を増やさず、それぞれ配布・評価・回帰検証の受入へ接続する。残る38件を「未確認の製品不具合」と断定しない。

## 学習者向け配布対象外の42ファイル

次の3系列が各M00〜M10の11件、計33件。さらに `assessment/playwright/M05〜M07/**` の9件がある。いずれも実git treeに存在する。コードの完成例・採点基準をグラフの公開教材ノードとして混在させない。

- `training/ai-assisted-qa-course/assessment/completed-states/M00.json`〜`M10.json`（11）
- `training/ai-assisted-qa-course/assessment/scoring-tests/M00.json`〜`M10.json`（11）
- `training/ai-assisted-qa-course/assessment/reference-solutions/M00.md`〜`M10.md`（11）

追加の9ファイル：

- `training/ai-assisted-qa-course/assessment/playwright/M05/cart-locator-inspection.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M05/product-link.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M06/cart-cases.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M06/quantity-update.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M06/remove-item.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M07/expected-failure/intentional-assertion.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-before/cart.spec.ts`
- `training/ai-assisted-qa-course/assessment/playwright/M07/repaired/repaired-assertion.spec.ts`

**照合結果**：`training/course-sync/manifest.json`の`local_files` 142件・`external_skill_files` 105件・`load_files` 110件のsource/targetには上記42ファイルが**0件**。同HEADで生成した配布manifestの登録567件（local 142 / generated-shop 320 / external-skill 105）にも評価資料の対象パスは**0件**。これは学習者へのコピー対象ではないという範囲の証拠であり、権利や評価内容の承認ではない。作業1（配布安全性）と作業5（評価の証拠・校正）で引き続き確認する。

## 契約テスト・補助コード72ファイル

テスト名 `*.test.mjs`、`*.test.ts`、`*.test.tsx` の**70件**と、M06/M07の参照CI補助スクリプト**2件**。いずれもこの調査対象HEADに存在し、教材そのものを指す知識グラフのノードではない。現HEADのWeb CIでは`Vitest (contracts)`、`Training runtime contracts`、`Code Quality`がSUCCESS。テストの合格はScenario Shop正式Caseの全面受入や教材内容の意味承認を意味しない。

- `tests/contracts/ai-assisted-qa-admin-last-admin-interleaving.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-order-detail-actions.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-order-filters.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-self-change.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-suspension.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`
- `tests/contracts/ai-assisted-qa-admin-withdrawn.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-calibration-fixtures.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-calibration-identity.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-free-pricing.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-fresh-run.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-isolation.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-m06-assertions.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-m07-dependencies.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-m07-run-versions.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-pinned-assets.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-practical-criteria.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-process.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-resume-current.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment-untrusted-input.test.mjs`
- `tests/contracts/ai-assisted-qa-assessment.test.mjs`
- `tests/contracts/ai-assisted-qa-catalog-empty-navigation.test.tsx`
- `tests/contracts/ai-assisted-qa-catalog-review-contract.test.ts`
- `tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs`
- `tests/contracts/ai-assisted-qa-checkout-processing.test.mjs`
- `tests/contracts/ai-assisted-qa-course-backup.test.mjs`
- `tests/contracts/ai-assisted-qa-course-distribution.test.mjs`
- `tests/contracts/ai-assisted-qa-course-tutor.test.mjs`
- `tests/contracts/ai-assisted-qa-curriculum.test.ts`
- `tests/contracts/ai-assisted-qa-github-run-evidence.test.mjs`
- `tests/contracts/ai-assisted-qa-home-customer-boundary.test.tsx`
- `tests/contracts/ai-assisted-qa-home-guest-actions.test.tsx`
- `tests/contracts/ai-assisted-qa-home-membership-benefits.test.tsx`
- `tests/contracts/ai-assisted-qa-inventory-stock-boundaries.test.mjs`
- `tests/contracts/ai-assisted-qa-knowledge-graph-revision.test.mjs`
- `tests/contracts/ai-assisted-qa-knowledge-review-links.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-handoff.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-m00-correction.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-m01-contract.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-m02-source-boundary.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-m03-design.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-m04-review.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-objective-evidence.test.mjs`
- `tests/contracts/ai-assisted-qa-phase1-pinned-skill-entry.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-direct-run.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-handoff.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m05-config-evidence.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m05-foundations.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m05-locator.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m06-fixed-cases.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m06-reference-ci.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m06-reference-ci.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m06-reset-isolation.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m06-separate-cases.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m07-diagnostics.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m07-maintenance.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m07-reference-ci.mjs`
- `tests/contracts/ai-assisted-qa-phase2-m07-reference-ci.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-reference-run-preservation.test.mjs`
- `tests/contracts/ai-assisted-qa-phase2-typecheck.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-ci-diagnostics.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-distribution-handoff.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-git-fixture.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-handoff.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-m10-preflight.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-quiz-knowledge.test.mjs`
- `tests/contracts/ai-assisted-qa-phase3-review.test.mjs`
- `tests/contracts/ai-assisted-qa-practical-exercises.test.mjs`
- `tests/contracts/ai-assisted-qa-shared-assessment-contract.test.mjs`
- `tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`
- `tests/contracts/ai-assisted-qa-test-control-reset.test.mjs`

## 残る38ファイルと再確認先

下表の「対応作業」は[統合受入Plan](../plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)の作業番号。**この表は作業の受付先を決めたもの**であり、記載した検証をすべて実施済みとするものではない。

| 対象ファイル | 対応作業 | 必要な照合 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 3・8 | Web実行、契約・配布、required CIの結果と結び付けて確認 |
| `docs/curriculum/ai-assisted-qa/README.md` | 4 | 教材正本・知識グラフ・Web入口の相互参照と82理解事項・51目標の意味を確認 |
| `docs/curriculum/ai-assisted-qa/knowledge-graph.json` | 4 | 教材正本・知識グラフ・Web入口の相互参照と82理解事項・51目標の意味を確認 |
| `docs/curriculum/ai-assisted-qa/start-here.md` | 4 | 教材正本・知識グラフ・Web入口の相互参照と82理解事項・51目標の意味を確認 |
| `e2e/web/ai-assisted-qa-course.spec.ts` | 3・8 | Web実行、契約・配布、required CIの結果と結び付けて確認 |
| `package.json` | 3・8 | Web実行、契約・配布、required CIの結果と結び付けて確認 |
| `playwright.ai-assisted-qa.config.ts` | 3・8 | Web実行、契約・配布、required CIの結果と結び付けて確認 |
| `scripts/docs/build-ai-assisted-qa.ts` | 1・3 | 公開Web出力、XSS・採点資産除外、配布の版一致を確認 |
| `scripts/training/ai-assisted-qa-assessment-core.mjs` | 2・5 | 正式評価の隔離・証拠・不正入力・実モデル校正 |
| `scripts/training/ai-assisted-qa-assessment.mjs` | 2・5 | 正式評価の隔離・証拠・不正入力・実モデル校正 |
| `scripts/training/ai-assisted-qa-course-core.mjs` | 3 | manifestの整合・学習状態・復元非破壊を照合 |
| `scripts/training/ai-assisted-qa-course-tutor-core.mjs` | 2 | 送信前拒否・権限・セッション/履歴・Providerの実動作を照合 |
| `scripts/training/ai-assisted-qa-course-tutor.mjs` | 2 | 送信前拒否・権限・セッション/履歴・Providerの実動作を照合 |
| `scripts/training/ai-assisted-qa-course.mjs` | 3 | manifestの整合・学習状態・復元非破壊を照合 |
| `scripts/training/ai-assisted-qa-github-run-evidence.mjs` | 5 | Run ID、spec SHA、GitHub Run/attempt、runnerの実在を照合 |
| `scripts/training/ai-assisted-qa-playwright-settings.ts` | 5 | Run ID、spec SHA、GitHub Run/attempt、runnerの実在を照合 |
| `scripts/training/ai-assisted-qa-run-evidence.mjs` | 5 | Run ID、spec SHA、GitHub Run/attempt、runnerの実在を照合 |
| `scripts/training/knowledge-graph.mjs` | 4 | 変更影響ルール・負例・新旧の候補件数を照合 |
| `training/ai-assisted-qa-course/assessment/README.md` | 1・5 | 公開Repoと配布物の境界、採点資料の取得と配布除外 |
| `training/ai-assisted-qa-course/coverage/supported-behaviors.json` | 6 | 既存208動作の採否・正式Caseとの対応（SUTの受入とは別） |
| `training/ai-assisted-qa-course/exercises/M03/case-runtime-evidence-template.json` | 4・5 | 合成証拠の明示、提出・採点との整合と実Runの区別 |
| `training/ai-assisted-qa-course/exercises/M03/condition-runtime-evidence-template.json` | 4・5 | 合成証拠の明示、提出・採点との整合と実Runの区別 |
| `training/ai-assisted-qa-course/exercises/M07/failure-cases.md` | 4・5 | 合成証拠の明示、提出・採点との整合と実Runの区別 |
| `training/ai-assisted-qa-course/exercises/M08/local-only-run.log` | 4・5 | 合成証拠の明示、提出・採点との整合と実Runの区別 |
| `training/ai-assisted-qa-course/exercises/M09/failure-cases.md` | 4・5 | 合成証拠の明示、提出・採点との整合と実Runの区別 |
| `training/ai-assisted-qa-course/integrations/M02-M03-contract.md` | 4 | M02→M03の固定Skill revision・Entity・成果物を照合 |
| `training/ai-assisted-qa-course/templates/learner-LICENSE` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/learner-OFL-1.1.txt` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/learner-devcontainer.json` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/learner-repo-README.md` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/learner-repo.gitignore` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/ai-assisted-qa-course/templates/workspace.gitignore` | 1・3 | LICENSE/NOTICE、設定・workflowの非自動起動、学習者配布の保全 |
| `training/course-sync/README.md` | 1・3 | 配布manifestの許可リスト、秘密情報、バックアップ・復元保護 |
| `training/course-sync/learner-workspace-backup.md` | 1・3 | 配布manifestの許可リスト、秘密情報、バックアップ・復元保護 |
| `training/course-sync/learner-workspace-backup.mjs` | 1・3 | 配布manifestの許可リスト、秘密情報、バックアップ・復元保護 |
| `training/course-sync/manifest.json` | 1・3 | 配布manifestの許可リスト、秘密情報、バックアップ・復元保護 |

## 残る受入条件

- 図29点は各READMEからの参照を既存契約テストと実Artifactで確認した。SVGの視覚・スクリーンリーダーでの実見え方は本監査からは判断しない。
- `qa-knowledge-validation.json`は`ok:true`、339ノード、796関係、51学習目標、82理解事項、`tentative:82`。**82件すべての意味レビューは未承認**。51目標の説明と採点・復習の妥当性確認も継続する。
- 152パスが既存ノードに直接対応しないため、変更影響CLIの`manual_review_required`は現状の仕様どおり維持する。この監査記録だけを理由に`ok:true`へ強制変更しない。
- M02→M03等のPhase引継ぎ、実モデル・本人実技、公開/外部Skillライセンス、Android/DB/独立レビューは各作業の受入証拠で判定する。公開対象外の42ファイルを知識グラフへ登録して、候補件数をゼロへ近付ける対応は行わない。
