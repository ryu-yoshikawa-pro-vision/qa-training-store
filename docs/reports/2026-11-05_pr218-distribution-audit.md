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

## 2026-11-05 Web Build成果物の現物監査

- 対象：[Web CI #41967650261](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)の`build-production`成功、Artifact `web-dist-production`（ID `13388865001`、実行HEAD `594a72b724ebbd27f8c61d3af9c64507f1e9b9e9`）。ダウンロードZIPのSHA-256：`a5e6c1d95e8b670efe4dedd5722e2f9349410566aeb89953f79cd62a51a5aebd`。
- ZIP内312ファイル、展開後25,667,824 bytes。内訳：`docs/` 280、`_expo/` 18、`images/` 11、root 3。Webフォント12ファイル、生成JS2ファイル。ZIPに`dist/`のprefixはなく、`course/shop/`配下へ配置される想定で調査した。
- ZIPパスに`.env`、`.git`、`.github`、`node_modules`、`scoring-tests`、`reference-solutions`、`completed-states`、`evals`を含むものは0件。HTML/JS/CSS/JSON/Markdown等のテキストファイルに既知のGitHub/OpenAI/AWS/Google/Slack token、秘密鍵、主要個人メールドメインの明示パターン一致は0件。**未知形式の機密・個人情報やJS内部の第三者著作権表示までの完全性を保証しない**。
- HTMLの`src`/`href`とCSSの`url(...)`に出るローカル参照は、クエリ/アンカー・root相対/ディレクトリ`index.html`を正規化して静的照合し、参照先不在0件。JS runtimeの動的参照、実ブラウザの404、`course:sync`後のasset解決は別の確認が必要。
- **除外条件の未達候補**：生成物には従来の`docs/curriculum/00_learning-design.html`、`01_spreadsheet-test-design.html`、`02_competency-rubric.html`、`03_instructor-reference.html`、`04_learning-effort-reference.html`の5ページが存在する。特に`03_instructor-reference.html`は講師向け資料で、文章中に「模範解答」という語がある。旧教材の公開対象範囲を#199で明確化し、不要ならWeb生成処理側で除外すること。**現行`generated.shop_build.source=dist/**`ならこれらもTemplateの`course/shop/**`へコピーされる**ため、除外項目はチェック不可。Web生成ソースは#199担当範囲で、本PRでは無断変更しない。

## 固定Skillと第三者素材の権利資料（途中経過）

| 対象 | 一次資料・固定版の事実 | 利用許諾・残条件 |
| --- | --- | --- |
| Learner Template独自ファイル | `training/ai-assisted-qa-course/templates/learner-LICENSE`、Copyright (c) 2026 ryu-yoshikawa-pro-vision、MIT全文 | その権利者が許諾できる部分のみに適用。第三者コードやSkill原著作者を包含したと推定しない |
| 固定`qa-workflow-skills`13 Skill／105ファイル | [固定commit `7cc6cba7772de549841a39d71694cbafbc783324`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)の完全Git treeには`LICENSE`/`NOTICE`のパスが0件 | **固定repoで全体に適用する明示LICENSEを確認できない**。同じGitHub ownerというだけでは権利許諾を証明できない。再配布前に#199で著作権者・同梱素材の権利・明示的な許諾を確認する |
| Inter／Noto Sans JP | `learner-THIRD_PARTY_NOTICES.md`、`learner-OFL-1.1.txt`。今回Web Artifactに`woff/woff2`12ファイルあり | NOTICEはOFL-1.1、パッケージ`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`、著作権・Reserved Font Nameを表示。実fontメタデータと上流原典を全て独立照合するまでは最終判断しない |
| Webのbundled JSとその他の画像・依存物 | `learner-THIRD_PARTY_NOTICES.md`は旧CI `41297580957`のReact・bezier-easing表示等を記載。今回のBuild Artifactは別HEAD・別JS bundle | 旧Build結果を新規Buildの権利証拠へ流用しない。**全第三者依存物／生成JS表示の網羅監査は未完了** |

この節は許諾の最終判断ではない。#199で公開対象・再配布可否を確認するまで、配布除外とライセンス監査のチェックを付けない。

## 2026-11-05 CI不具合修正とチェック証拠（継続）

- [CI Run #41967650261](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)、HEAD `594a72b724eb`：`Vitest (contracts)`は5件FAIL（既存M03 Risk CSVのworkspace配置先を誤って要求した新しいguardが原因）、`Style Quality`はPrettier違反。同Run内で固定commit fixtureの再同期・clean/dirty/別branch・`course:load`の不正ID・全22状態・prebuilt Shop検証・`serve-web-dist.test.ts`は個別PASS、Web Buildとtraining Web Chromium E2Eは成功。全RunのPASSを意味しない。
- [CI Run #41970080624](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41970080624)、一時診断commit `25a8e76eb2ac`：M03 guardの強制条件が汎用`courseFixture()`の独立したテスト用manifestに適用され、契約テスト37件FAIL。**原因は汎用fixtureへ製品固有の追加必須条件を強制したことで、37件の異なる製品欠陥ではない**。
- 後続commit `822a826d5ab1`で重複するM03強制guardを削除。既存の`loads the M03 public risk row only with M03 and requires it for the independent fallback`および静的参照テストによる対象範囲の確認を残した。診断用TEMPテストは`31154915f074`で削除し、CI内のPrettier APIが指摘した`for (const skill of [...])`の配列を1行へ整形した。**修正後HEADでのテスト・書式検査結果は未確定**。
- 専用チェックリストに、個別PASSとソース照合の根拠を明記して固定SHA再同期、`course:load` ID境界、11モジュール/22状態、配布済みShopの`verify-distribution`・loopback 8082・Seed/Reset入口・全Buildへのfallback禁止を追加チェック。合計 **6/21件**。実Shopを含む`course:sync`結合実行、Private Codespaces Port/Reset/Browser、旧教材除外、全権利許諾は未完。
- Webと配布元Git treeの11 quiz JSONは、CI Artifact `web-dist-production`（同Run `41967650261`）でGit Blob SHAとサイズが11/11一致。一方、公開Web側の`source_sha`表示・不一致時BLOCKED説明は未確定。引継ぎ：[PR #199 comment](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6649975046)。
