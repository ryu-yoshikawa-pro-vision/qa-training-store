# PR #218 教材配布・固定Skill監査（2026-11-05）

## 監査対象・根拠

- 対象PR：[#218](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/218)、監査時のブランチHEAD：`69e71fc685d3e66072c5cd21d17b140dd3a9c459`（この文書のcommit前）。base：`docs/plan-ai-agent-qa-curriculum-redesign`。
- 配布manifest：`training/course-sync/manifest.json`、監査時Git blob：`6cebbf688c077631f1c6fa3826b24430e07b6a4f`。
- 固定参照元：[`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)。GitHub Git Trees APIの`recursive=1`取得結果：`truncated=false`。
- 比較：manifestの`external_skill_files[]`と、選択13 Skillの`SKILL.md`・`scripts/**`・`assets/**`・`references/**`のGit treeをパス・Git blob SHA・サイズで完全照合。

## 確認できた結果

- 固定Skill：**13 Skill、105/105件一致**。内訳：`SKILL.md` 13、`scripts/**` 44、`assets/**` 28、`references/**` 20。欠落0、改変0、重複対象外0。
- 元のmanifestでは104件。欠落していた`skills/test-requirement-design/scripts/runtime_v1_cutover.py`を追加した。固定元でのblobは`fe0f10a9f6ffe48416faecf7176a1081773d9529`、サイズ16,087 bytes。対象はM02/M03。
- 選択13 Skillの`evals/**`は248ファイル存在するが、manifest配布対象は**0件**。固定版の評価用資料は配布しない。
- manifest改変による`generated.shop_build.command/source/target/required`の逸脱、Skillのパッケージ外取得・配置、Shopと通常ファイルの配置先衝突を検証時に拒否するコードを追加。対応する負例テストを`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`に追加。
- Phase 3への連携：[#216の引継ぎコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/216#issuecomment-6648932414)で配布パッケージ取得・manifest・固定SHA・ファイルhash・実Run照合の契約を共有した。**信頼済みパッケージ保管場所の確定と実Runner検証は未完**。

## 実行・未実行の区別

- 既存HEAD `b49c09b598dcd63b32517c20620fc6a7527b64e9`：GitHub Actions [Web CI #41862844440](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41862844440)は`success`（Vitest contracts、Style、Code Quality、Build、Chromium E2Eなど）。**今回の修正後HEADの合格証拠ではない**。
- 修正後HEADでのGitHub Actions：[Web CI #41962011876](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41962011876)は監査時`in_progress`。ユーザー指示に従い終了待ちは実施しない。後続のHEADで再実行された場合も、最終的なHEAD/Runを個別に照合する。
- 手元の`pnpm`/依存物・ネットワークがなく、ローカルVitest、`course:sync`、Shop Build、配布先でのPython helper実行は**未実施**。Git Trees APIから得た静的照合と、既存HEADのCIを区別する。
- 本人Private Codespaces/Port、OpenCode認証付き実モデル、学習者ファイルのダウンロード・復元、実Private repoの料金・権限、第三者ライセンスと全生成物の最終再配布承認は**#199の最終実受入**。未実施をPASSとしない。

## 次の確認

1. 最新HEADの契約テスト・Style/Code QualityとBuild結果を確認し、失敗した場合は原因を調査する。
2. `course:sync`→`verify-distribution`→Buildの固定SHA再現、異常時の非破壊性、Template生成先の安全性、生成ShopとWebの版一致を実Runで検証する。
3. Web生成物を含む第三者NOTICE/依存ライセンスと外部AI送信対象の全量監査を継続する。#216ではRunnerへ検証済み配布物を実際に取得する方式を確定する。
