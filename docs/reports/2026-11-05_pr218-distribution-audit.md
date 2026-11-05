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

## 継続確認：Symlink・学習者データ保全・Python依存（2026-11-05）

- 配布側`assertNoSymlinkPath()`とsync/loadの事前競合検査は、`fs.existsSync()`だけでは検出できないリンク先不存在Symlinkも`lstatIfExists()`で拒否するように変更。既存ファイルを変更せず停止する負例を追加。[Web CI #41972606658](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41972606658)ではdangling Symlink祖先/ファイル、およびmodule load先のSymlink負例が個別PASS。そのRun全体の失敗は別の追加fixtureテストに起因し、別途修正した。
- [Web CI #41973229193 / Vitest (contracts)](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41973229193/job/127066168734)（HEAD `9ae5efba9057ed875037d9f97ce45b4c662416aa`）は**74ファイル／1108件PASS**（診断用テスト1件を含む）。同Run内でM05成功・同一ID再load、M06意図的コピー失敗、M05回答改変後の再load拒否を通じて、M04以前回答、M05本人メモ、M06私有ファイル、Private評価履歴、Git不要の評価export、Traceと元receiptのバイト保持を確認。一時診断テストを削除し、Prettier差分（`linkedPath`の不要な折返し1箇所）を後続commitで修正。**新しいHEADでのStyle Quality結果は別確認**。
- 固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`から配布されるPython script **44件を全件読み、`import`/`from`の参照を確認**した。必須のSkill-local moduleは同じ配布manifest内に存在し、外部非標準Python packageの必須importは確認されなかった。13`SKILL.md`のMarkdown形式の相対リンクは0件（コード中のパス文字列の完全な静的網羅を意味しない）。`qa-workflow/scripts/artifact_graph.py`と`workflow_runtime.py`には配布対象外の`wcag-conformance-evaluation/scripts/wcag_em_structure.py`と`wcag_runtime.py`を呼ぶ任意経路がある。対象scriptがない場合はそれぞれ`blocked`を返す明示契約であり、今回の13 Skillカリキュラム経路の実行PASSではない。将来WCAG用途に使う場合は、その追加Skillの配布とruntimeを別に受け入れる。
- Web CIの生成Artifactは312ファイル（ZIP内Symlinkは0）。公開Quiz 11件はBuild元Git Blobと一致、HTML/CSSの既知ローカル参照不在0。**旧教材・講師向け5ページの同梱は残存**するので、最終除外は依然未完。
- M03の必要Risk CSVについて、配布manifestの`course/modules/M03/inputs/public-risk-input.csv`から`workspace/M03/public-sample/risk-input.csv`への配置を、source manifest・配布後manifest双方のvalidatorに追加。fixtureも実際のロード先と揃え、削除・誤配置・配布後のload entry改変を負例で検査する。Authority/Risk/Scopeの公開開始入力と、7つの固定Skill scriptも静的契約テストの照合対象。**この変更後HEADのCIは未確定なので11モジュール全入力の完全検証項目は保留**。

## 外部AI関連の仕様照合（静的確認のみ）

- `ai-assisted-qa-assessment-core.mjs`は、証拠1ファイル最大256 KiB、合計2 MiB、モデル入力最大4 MiB、既知Secretパターンを設定している。`ai-assisted-qa-assessment.mjs`は明示的な`SEND provider/model-id`確認、版固定・履歴のGit外保存を持つ。`ai-assisted-qa-course-tutor.mjs`も`START provider/model-id`で本人確認するが、通常セッションの外部送信履歴・認証/料金は実未確認。
- `buildTutorConfig()`が用いるV2の`agents`/`permissions`と`opencode mini --model ... --prompt ...`形式は、[OpenCode V2 Agents](https://dev.opencode.ai/v2/docs/agents/)・[Permissions](https://dev.opencode.ai/v2/docs/permissions/)・[CLI](https://dev.opencode.ai/v2/docs/cli/commands/)に掲載された形式と一致する。認可が実runtimeで機能した証拠にはならない。V1の`agent`/`permission`と混同しない。
- チューターの読取許可には`workspace/<moduleId>/*`があり、対象module内に受講者がSecretや個人情報を置くケースについて、文面上の警告のみでは外部送信防止を保証できない。正式評価側の正規表現も未知の個人情報を全検出しない。**外部送信/権限のチェックは未完**として#199の本人実確認と所有者側の検証に引き継ぐ。

専用タスクリストは本追補時点で**9/21件チェック済み**。配布元からの実Build同期、再配布権利、旧教材除外、正式評価・チューターの実モデル権限など、完了証拠のない項目は未チェック。

## M03開始入力の参照欠落を拒否する追加検査

- 固定`course/modules/M03/inputs/start.md`について`SCOPE-101`、`RISK-CART-001`、`Authority Entity`、`BR-CART-001`、`AC-CART-001`の出典・参照識別子が欠落した状態を、`course:sync`の書き込み前と`verify-distribution`、`course:load M03`の書き込み前に拒否する処理を追加。
- M03公開Risk CSVは`course/modules/M03/inputs/public-risk-input.csv`から`workspace/M03/public-sample/risk-input.csv`へコピーする実契約を使用。同期元manifestと配布後manifestの両方で削除・不正リダイレクトを拒否する。汎用の先行検証とM03固有条件を分離し、他モジュールの一般的なloadエラー検証を先に通す。
- 契約テストではAuthority・Risk・Scope識別子をそれぞれ欠落させた同期が空の出力先を保って失敗すること、配布後にScopeを削ってSHA-256を書き換えたmanifestでも`verify-distribution`と`course:load M03`が拒否すること、必要な外部Skill helper 7 scriptが固定Git blob SHAとともにmanifestへ入ることを検証する。
- 本検査は参照**存在**の契約検証であり、M02の意味抽出やAuthority/Risk/Scopeの意味的正しさを証明するものではない。**新規テスト導入後のCI結果は別途確認**し、M03の完了チェックを増やさない。

[CI #41974335705](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41974335705)（HEAD `d81a9afa21119562fd855f0dd3203109ac3700ed`）では`Style Quality`、`Code Quality`、`Vitest (contracts)`の各ジョブ成功を確認。これは上記M03参照欠落検査を追加する**前**のHEADであり、上記新規検査のPASSとは扱わない。

## Markdownリンクの配布先依存閉包（2026-11-05追補）

固定HEAD `67ee9bff93bf8efa20a87523240064bac44f3fa8` の `training/course-sync/manifest.json` にある`local_files`のMarkdown **69件**をGitHubから全件取得し、`[...](relative/path)`形式の参照を各`target_path`のディレクトリ基準で正規化し、配布対象`local_files.target_path`＋固定Skill対象`external_skill_files.target_path`へ静的照合した。**69件中16件のMarkdownファイルで配布先参照が解決しなかった**（11モジュールREADME、`course/start-here.md`、仕様3ファイル、learning-map）。本調査は静的な通常Markdownリンクを対象とし、HTML内埋込・コードブロック・動的JS内の全参照を網羅した主張ではない。

| 対象 | 実際の未解決例 | 直接原因・影響 |
| --- | --- | --- |
| `course/modules/M00..M10/README.md` | `../../assets/figures/M03/01-test-design-methods.svg`、`../../../../../training/ai-assisted-qa-course/exercises/M05/exercise.md`、`../../../../spec/features/cart.md` | READMEの原本は`docs/curriculum/ai-assisted-qa/modules/Mxx/`基準。配布先`course/modules/Mxx/`では相対リンク先が`course/assets/**`、root `training/**`、root `spec/**`等へ変わる。manifestは図をこれらのpathには配置せず、演習は`course/exercises/**`、仕様は`docs/spec/**`に配置するため欠落。 |
| `course/start-here.md` | `../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md` | 元パスから配布先への相対位置が変わり、配布済み`docs/plans/**`へ到達しない。 |
| `docs/spec/features/cart.md`、`storefront.md`、`docs/spec/state-and-scenarios.md` | `../screen-catalog.md`、`../assets/screens/SCREEN-STOREFRONT-CART/default/web-desktop.webp` | 原本が参照するscreen-catalog Markdownや画像は`local_files`に存在しない。生成ShopのZIPには`docs/spec/screen-catalog.html`や多くの`docs/spec/assets/screens/**`が存在するが、`course/shop/**`へ置かれるため既存の相対リンクからは到達できない。 |
| `docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md` | 同じディレクトリの`..._assessment.md`、`..._states.md`、`..._progression.md`等 | 関連する内部Planはallowlistにない。追加配布すると旧教材・内部資料除外条件と競合する可能性があり、未確認のまま公開allowlistへ拡張しない。 |

[Web CI #41967650261 のBuild Artifact](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)（ZIP内312ファイル）の一覧では教材図SVG 27、教材PNG 3、各種仕様画面WebP、`docs/spec/screen-catalog.html`の存在を確認できる。**WebにあることはMarkdownのリンク先が正しくなることを意味しない**。

**修正方向と所有境界**：公開してよい原本リンクのみ、`source_path`→`target_path`の確定対応を使って配布時に相対リンクを再構成するか、必要な静的assetを明示allowlistへ追加する。Web Build由来のassetは`course/shop/**`の実ファイル存在を確かめる。未許可の古いPlanや評価内部資料は自動追加しない。教材の正本変更・公開対象の確定は#199/各Phase担当に引き継ぐ。本PRにおける配布変換を導入する場合も全69 Markdown・生成assetの負例/回帰テストが必須。**配布閉包とTemplate完全性のチェックは未完了**。

## 第三者素材・再配布許諾の原典照合台帳（追加調査）

対象のWeb Build実物は[CI #41967650261](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)、HEAD `594a72b724ebbd27f8c61d3af9c64507f1e9b9e9` の `web-dist-production`（Artifact ID `13388865001`）。ZIP 312ファイルの拡張子別内訳はWebP 103、HTML 83、Markdown 50、SVG 27、JSON 18、CSS 6、woff 6、woff2 6、PNG 3、disabled 3、JS 2、TS 2、拡張子なし1、log 1、CSV 1。**この成果物の権利検証結果を別Build HEADへ転用しない**。

| 配布対象・版 | ライセンス原典・著作権者 | 原典にある再配布条件と既存NOTICE | 状態と残課題 |
| --- | --- | --- | --- |
| 固定Skill 13件・105ファイル：`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324` | [固定Git tree](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)。同commitのrootおよび選定Skill treeの`LICENSE`/`NOTICE`は確認できない | 同一ownerという事実やTemplate付属MITだけでは固定Skill全ファイルの再配布許諾は立証されない | **許諾未確認**。権利者・出典・外部採用資料・各scripts/assetsの帰属を#199で確認する。許諾が確認できなければ公開を保留 |
| Template独自教材・コード | [配布元`learner-LICENSE`](../../training/ai-assisted-qa-course/templates/learner-LICENSE)（MIT）、表示`Copyright (c) 2026 ryu-yoshikawa-pro-vision` | MITの著作権・許諾表示を維持。権利者が許諾可能な独自部分に限る | **範囲条件付き**。第三者部分への一律MIT適用は禁止 |
| Inter：`@fontsource/inter@5.3.0` | [Inter原典`LICENSE.txt`](https://github.com/rsms/inter/blob/master/LICENSE.txt)、Git Blob `9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea`。Copyright (c) 2016 The Inter Project Authors | OFL-1.1。フォントのみ単体販売しない。再配布時は原著作権表示とOFL本文を保持。派生版のReserved Font Name要件に従う。Templateの`licenses/OFL-1.1.txt`＋`THIRD_PARTY_NOTICES.md`を確認 | **原典と既存NOTICE照合済み**。実woff/woff2（6件）の再圧縮/派生状態と表示保持を配布最終版で再確認 |
| Noto Sans JP：`@fontsource/noto-sans-jp@5.3.0` | [Google Fonts原典`OFL.txt`](https://github.com/google/fonts/blob/main/ofl/notosansjp/OFL.txt)、Git Blob `1c9f43281b8f216c5461fe9ac729afbade7724e4`。Copyright 2014–2021 Adobe、Reserved Font Name 'Source'。[Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/notosansjp/METADATA.pb) | OFL-1.1。上記著作権表示とReserved Font Nameを保持。TemplateのOFL本文とNOTICEに対応表示あり | **原典と既存NOTICE照合済み**。配布後の6フォントファイル個別確認は残る |
| React/React DOM/React is/scheduler/use-sync-external-store-shim（Web生成JS） | [React公式リポジトリ](https://github.com/facebook/react)のMIT License。生成bundleの`@license React`と`Copyright (c) Meta Platforms, Inc. and affiliates.`を7箇所検出 | MITは元の著作権・許諾表示の保持が必要。既存NOTICEでMetaの表示とMIT記載あり | **検出したライセンス表示とNOTICE対応を確認**。すべてのtransitive依存関係を列挙した判断ではない |
| `bezier-easing`（Web生成JS） | [原典LICENSE](https://github.com/gre/bezier-easing/blob/master/LICENSE)、Git Blob `3ca2c8ed87287f9a5d72a00e578154a29b7726e6`。Copyright (c) 2014 Gaëtan Renaudeau。生成bundleには2014–2015年の表示 | MITは著作権・許諾表示を維持。既存NOTICEに該当表示あり | **原典と既存NOTICE照合済み**。生成bundleのyear表記差異は元bundle表示を保持し、出典として原典を記録 |
| 上記以外のWeb JS依存・CSS・画像・生成HTML・ローカル図 | Build Artifact内の配布物の存在は確認したが、全JSモジュール・SVG/PNG/WebPの元著作者・ライセンスを1件ずつ同定した証拠はない | 同梱NOTICEはReact/Bezier/2フォントを明記し、JS全件は未完了と明示している | **権利未確認**。Third-party inventory/SBOMと生成物の元ライセンス、著作者、NOTICE要否、画像の利用許可を固定最終Buildで照合する |

`pnpm-lock.yaml`のimporterとresolutionは`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`を固定（`package.json`宣言は`^5.3.0`）。生成JSにはReact関連の`@license`ブロック7件とbezier-easingのCopyrightブロック1件を確認した。MITやOFLは条件付きの再配布を許すが、**固定Skill全体や未同定の依存・画像の許諾を推定しない**。前掲のリンク切れ・旧教材同梱も配布承認の独立した阻害要因として残る。

本節は原典・著作権者・NOTICE状況と未確認項目を管理する**調査台帳**であり、法律上の最終判断、Public Template公開の承認ではない。最終許諾判定は#199へ引継ぐ。
