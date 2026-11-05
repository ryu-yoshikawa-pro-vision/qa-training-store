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

## 2026-11-05 継続対応：固定配布の閉包・非破壊性・CI

- 作業時のGitHub PR HEAD：`74d5c6c1f18b32e08faff41fc7c6cd8d0817f584`（本記録の更新前）。
- 前回HEAD `e2079ad5127610966e71f67e2a68cbc846e9ae8e` の[Web CI #41962554581](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41962554581)は**failure**。直接原因は`Style Quality / Format check`でのPrettier違反（`scripts/training/ai-assisted-qa-course-core.mjs`と`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`）。`Vitest (contracts)`、`Code Quality`、Build、Chromium E2EはそのHEADでsuccess。依存する`verify`/`validate`のfailureを独立した製品FAILと数えない。書式は後続commitで調整したが、最終HEADの成功確認は別。
- [Git tree監査時HEAD `bdcfcb1c0069d1b7be06d32c035d41e547c98d5c`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/bdcfcb1c0069d1b7be06d32c035d41e547c98d5c)：Git Trees API `recursive=1`、`truncated=false`、3469 entries。manifestのlocal 140/140ファイルと評価参照17/17ファイルはすべて通常Git Blob（`100644`）で存在。重複target0、禁止された配布source/target0。
- 受講者に配置して実行するruntime・ロード後specの相対importは、manifestの配布済みtarget/ロード後targetに閉じるかを契約テストで検査するようにした。生成`dist/**`の実ファイル依存/asset閉包は実Buildと一緒に未確認。
- `syncCourse`の一時Git checkoutを使う契約テストを追加。固定SHAのclean commitからの同期と22状態確認、同SHA再同期の不変性、未commitファイル・別branchで進んだHEADの拒否を検証する設計。現時点では**テスト追加済み・最新HEADの実行結果未確認**。実Shop Buildを行ったとは扱わない。
- 同じ理由で、生成Shopのファイル列挙を名前順に固定し、manifest内`generated-shop`の順序が安定する契約テストを追加。prebuilt Shop生成/serveの実行結果は別。
- Template生成先の事前検査を追加。`sourceRoot`内/上位の生成先、途中のsymlink祖先を拒否し、出力前に停止する。検証用の純粋関数は`validateTemplateTarget`。安全な隣接ディレクトリを許可する負例/正例テストを追加。本人のPublic Template公開やコピー結果の実受入とは別。
- `course:load` CLIの未知ID・複数ID・パストラバーサルは、引数の先行チェックと新たな負例テストで確認対象にした。M03の公開Risk CSVのmanifest/local load二重必須化、Authority/Scope参照の静的テストを追加。
- **未解消**：修正後HEADの契約テスト・Prettier/CI結果、固定HEADからの実`course:sync`→Web Build→`verify-distribution`、生成Webの全資産、第三者NOTICE完全性、実Codespaces/Private repo、外部AI送信・料金・実データの保全と本人最終受入。

### 完了チェックの扱い

専用21件のうち本追補で新たにチェックを増やしていない。機能・負例テストの追加を、CI/実同期の成功へ換算しない。固定SHAの確定したログと全対象での検査後に該当項目を再判定する。
