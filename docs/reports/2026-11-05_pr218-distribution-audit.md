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

## Markdownリンクの配布先依存閉包（2026-11-05追補・訂正）

### 監査対象と初回判定の訂正

`training/course-sync/manifest.json`にあるMarkdown 69ファイルをGitHubから全件読み、配布先における相対リンクを確認した。**最初の監査は配布元のMarkdownを直接配布先へ置いたと仮定しており、既存の`remapMarkdownLinks()`を反映していなかった**。そのため当初報告した「16件でリンク切れ」という判定の一部と、[PR #199への最初の引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6651751536)に訂正が必要である。

既存の`remapMarkdownLinks()`は`lesson`と`guide`の`source_path`→`target_path`対応を使ってリンクを書き換える。既存実装を再評価すると、`course/start-here.md`の相対リンク26件は解決済み。各モジュールREADMEの演習・仕様・rubric・学習マップへの既知の配布先参照も解決する。初回にこれらをリンク切れと記載したのは誤り。

**既存変換後に残る未解決は69ファイル中15件**：M00〜M10のREADME全11件（教材図SVG 26とPNG 3が`course/assets/**`には存在しない）、`docs/spec/**`の3件（画面WebP・screen-catalog Markdown参照）、`docs/plans/**learning-map.md`の1件（許可外の内部Planへのリンク）。ここでの「件」は、リンク数ではなく影響を受けるMarkdownファイル数である。通常のMarkdown相対リンクだけを検査し、HTML/JS内の全参照を網羅した主張ではない。

### 配布処理での対応と残条件

[Web CI #41967650261のBuild Artifact](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)（ZIP内312ファイル）にはM00〜M10の図SVG 26とPNG 3、画面WebP、`docs/spec/screen-catalog.html`が実在する。今回の`ai-assisted-qa-course-core.mjs`修正では、配布用リンク変換に`reference`も追加し、まず許可済み`local_files`を優先した上で、**実際に生成した`dist/**`ファイルがある場合だけ**`course/shop/**`へリンクを書き換える。ソースの`.md`へのリンクは、生成Shopに同名の`.html`が実在する場合のみそこへ張り直す。図や画面WebPの重複コピーは増やさない。

さらに`lesson`、`guide`、配布仕様（`docs/spec/features/**`・`docs/spec/state-and-scenarios.md`）について、配布先ファイルの存在を**書込前**に検査する`validatePublishedMarkdownLinks()`を追加した。図・仕様の正例と欠落図の負例を`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`に追加したが、**当該変更後HEADのCIはまだ最終確定していない**。生成Shopのasset構成が変わってリンク先が不足する場合、同期は失敗して未完成のTemplateを作らない。

`docs/plans/**learning-map.md`が参照する配布対象外の旧Plan/評価関連文書は**自動追加・自動書換えしない**。公開してよい教材版の学習マップとPlan参照を#199と教材所有者が確定する必要がある。従って全69ファイルの依存閉包とTemplate完全性のチェックは未完了とし、元の公開除外要件を弱めない。

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

## Phase 1/2成果物のGit不要保全：既存手順と不足（2026-11-05）

- `training/ai-assisted-qa-course/templates/learner-repo-README.md`は、Phase 1/2成果物をGit操作なしでエクスポートする方針と、`workspace/Mxx/`編集・`pnpm course:assess`を説明しているが、**提出Markdown・作成spec・Playwright Config・Trace・Run一式をCodespacesからダウンロードする具体的な対象パス、操作、復元確認の手順がない**。
- 既存の`ai-assisted-qa-assessment.mjs`には`course:assess M04|M07 --export <assessment UUID>`があり、正式評価完了済みattemptだけを`workspace/course-assessment-exports/<UUID>/`へコピーする。名前を固定した9ファイル以外は持ち出さず、元ファイルや既存exportを置換せず、途中失敗では公開先へ部分コピーを残さない。現行[評価契約テスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/tests/contracts/ai-assisted-qa-assessment.test.mjs)の`exports a finalized assessment once...`、`does not publish a partial export...`、`preserves a destination...`、`leaves no published export after abrupt process termination...`が挙動を規定している。ただし**これは提出Markdown/spec/Trace/Runの総合エクスポート機構ではない**。
- `workspace/.gitignore`には`/M00/`〜`/M07/`、`/.course-assessments/`、`/course-assessment-exports/`などの保護がある。root`.gitignore`には`output/`等の除外がある。**Gitに載せないだけでCodespaces内のファイルを永続化・ダウンロードしたことにはならない**。
- #199への引継ぎ：Codespacesの作業終了前に、(1)本人提出・実装・設定、(2)Trace/ログ/Run/スクリーンショット、(3)正式評価履歴/明示exportのそれぞれの対象パスとSecret除外を本人が確認し、**Git/PRを使用せず手元へ保存してバイト照合・復元する手順**を受講者READMEに追加・実受入する。CLIでの追加自動化が必要なら、共有`ai-assisted-qa-course.mjs`と評価専用コードの所有者で境界を調停する。本ブランチではこれらの所有ファイルを変更しない。実ダウンロード・復元は未実施のため該当チェックは未完了。

## 2026-11-05 継続検証：Template生成・配布後リンク・Webクイズ版

- [Web CI #41986991331](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41986991331)（HEAD `53aa8c168aa6350283ec45436e4d255675340dd9`）の`Vitest (contracts)`は **1113件PASS**（一時Prettier診断テストを含む）。`prepares and verifies a complete Template from a clean main Git fixture`が個別PASS：実Gitのclean `main` commit、CLIの`prepare-learner-template.mjs`、固定SHAの同期、22状態、2ファイルのfixture Shop Build、配布manifest/hash確認、非空出力先への再生成拒否、ソースworktree/出力ファイル不変を確認。これは固定のtest fixtureであり、**本番の公開repoや最新Shop全体の実配布・再配布承認とは別**。
- 同Runの`Style Quality`は`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`のPrettier違反でFAIL。テストログの`PR218_TEST_PRETTIER_DIFF`で診断用1行の折返し、preload文字列の引用符2箇所を特定。`9b26364035e0daa40d78ddb085135bed316b8183`で診断テストを削除し、該当2箇所を修正した。
- 追加の`validatePublishedMarkdownLinks()`を`verifySyncedCourseDistribution()`からも呼び出すように変更。配布後に学習者READMEのリンクを壊し、manifestのSHA-256/サイズを改ざんして合わせても`verify-distribution`と`course:load`が拒否する負例を追加。前回は`course:sync`の書込前だけに同じ検査があり、配布済みmanifestとファイル双方の改ざんに対する再検査が不足していた。
- Web/Templateクイズについて、`course/shop/docs/curriculum/ai-assisted-qa/quizzes/M00..M10.json`が存在するとき、`course/quizzes/M00..M10.json`と**全11件のバイト一致**を`course:sync`・`verify-distribution`で検査。1件だけを含む生成物は同期前に拒否し、全11件が存在しても1件が不一致なら拒否。配布後にWeb側のJSONとmanifestのハッシュを同時に改変した場合も拒否する契約テストを追加した。
- 以前の[Web CI #41967650261 Build Artifact](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)は`docs/curriculum/ai-assisted-qa/quizzes/M00..M10.json`が全11件存在し、同Build HEADのGit Blobとバイト一致していた。一方、Web側の教材本文はHTMLで生成され、TemplateのMarkdownとバイト一致する形式ではない。公開WebのSHA/revision表示・版不一致時BLOCKED、旧Planリンク、本人実ブラウザでの再読込非上書きは**未受入**。また軽量fixtureの`dist/index.html`のみのケースではWebクイズの不在を許容するため、**実Shop全ファイルを生成する統合CI**の最終確認は必要である。
- 新しいクイズ/リンク負例は契約テストへ追加済みで、**追加したHEADでのCI成功は未確定**。`#199`と他担当の公開対象判断を代替しない。専用チェックリストは**12/21件チェック済み**（Template生成の固定fixture受入を新たに1件チェック）。

## 2026-11-05 CI失敗の修正：モジュール読込前の配布検証

- [Web CI #41988734264](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41988734264)、HEAD `f216ad54afd9bf538e80244369f76fa0fbb06ec3`：`Style Quality`・`Code Quality`・Web Build・主要Chromium E2Eは成功。一方、`Vitest (contracts)`は**1114件PASS、2件FAIL**。`rejects forged learner links even when distribution hashes are rewritten`と`pins all 11 built Web quizzes to the learner JSON bytes`の2件で、`verifySyncedCourseDistribution()`は拒否するのに`loadModule()`が拒否しなかった。テストの期待値を緩めずに実行経路の差を修正した。
- `loadModule()`の書込前に`validateModulePublishedMaterials()`を追加。選択したモジュールのREADMEを固定ハッシュで読み、相対リンクの配布対象存在とリンク先ファイルの実ハッシュを照合する。Web側クイズが含まれる配布では、`course/quizzes/M00..M10.json`と生成Web側の同11件を全件読み、バイト一致を検証する。Web側が生成されていない小さなfixtureと、実Shop版の全11件一致を区別する。これらは他モジュールの受講者作業ファイルを変更しない。
- 追加の負例：配布後に公開READMEとmanifest hashを同時改ざんした場合、WebクイズJSONとmanifest hashを同時改ざんした場合、READMEが参照する生成Shop画像を削除した場合、元の内容とハッシュが正しいファイルを配布root外へのSymlinkに差し替えた場合。どの場合も`course:load`のコピー・receipt作成前に拒否する契約をテストに追加。
- `verifiedCourseSource()`で`resolveWithin()`による字面のroot内検査だけでなく、`assertNoSymlinkPath(..., true)`を使って配布された元ファイルと祖先のSymlinkを拒否するよう修正。元ファイルが同じバイト列でも外部Symlinkを辿らない。
- [CI #41989887188](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41989887188)では`Code Quality`と`Style Quality`が成功した一方、新しいcommitの発生により`Vitest (contracts)`はcancelled。**追加修正後HEADの全件テストは未完了**。契約追加をPASSに換算せず、Web/Template版整合・実Build同期・依存閉包のチェックは引き続き未完了とする。

専用チェックリストは**12/21件完了**のまま。実Shop Build、Webのsource SHA/revision表示、旧教材除外、第三者ライセンス、本人環境での送信/保全は別途受入が必要。

## 2026-11-05 旧教材5ページの配布拒否（追加）

- [Web CI #41967650261](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261)で取得したWeb Build Artifactには、`docs/curriculum/00_learning-design.html`、`01_spreadsheet-test-design.html`、`02_competency-rubric.html`、`03_instructor-reference.html`、`04_learning-effort-reference.html`が存在した。講師向けの`03_instructor-reference.html`も含まれる。これはその**固定HEADの実測**であり、最新Web Buildの内容まで確認したことを意味しない。
- 配布処理`verifyPublicFileContent()`で、これら5名称のHTML/Markdownを`course/shop/docs/curriculum/**`に含めようとした場合、同期の書込前に`legacy curriculum page must not be distributed`で停止する検証を追加した。配布後に生成物とmanifestのハッシュを改変した場合も`verify-distribution`で同じ理由で拒否する。
- 契約テストで5名称をそれぞれ生成`dist/**`に追加して同期が未書込で失敗する負例、および正常同期後に講師向けページをmanifestへ追加した改ざんを検出する負例を追加。
- **この変更によって、旧ページが残るWeb Buildからの`course:sync`は成功しなくなる**。これは安全側の拒否であり、旧教材を公開Web側から除外したことではない。Web Build生成の修正・公開WebとTemplate双方の実確認は#199本体に[引継ぎコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6652852811)で依頼した。
- 上記修正後HEADの契約テスト結果は未確定。旧教材・講師向け資料の完全除外、最新Build Artifactの内容確認、再配布許諾の最終判定は**引き続き未完**で、専用タスクリストは**12/21件**のまま。

## 2026-11-05 最新HEADのCIと本番Web Artifact実物照合

- **監査元HEAD**：`7904bb6f4d3995ab6f97a0878af273547fbeb5f3`（PR #218、base `166412cf402f07ed3b4229eb6b3aeb6b5dd5cadf`。監査時点のPR #199 HEADと一致）。本節を記録するcommit後のHEADについてCI成功を主張しない。
- **同一監査元HEADのCI**：[Web CI #41991216665](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41991216665)が`success`。Vitest (contracts) 74ファイル・1120 PASS・1 expected fail・15 skipped、Training runtime contracts 2/2 PASS。Style Quality、Code Quality、Build、production smoke、Chromium E2E、verify、validateも成功。skippedはPASSに含めない。
- **現物取得**：同Runの`web-dist-production`（Artifact ID `13398845703`）をZIPとして取得し、ローカル計算SHA-256 `5ca19ff169f2c7706f75a84bcd58aa62e381a93f31c1d3c551efb8410249979b`がGitHub記録の`digest`と一致。ZIP内312ファイル、Symlink 0。ファイル名検査では`assessment/reference-solutions/`、`assessment/scoring-tests/`、`assessment/completed-states/`、`.env`、`.git/`のパスなし。これは内容全体にSecret/個人情報が存在しないことの証明ではない。
- **クイズ元データの照合**：`docs/curriculum/ai-assisted-qa/quizzes/M00.json`〜`M10.json`が11件存在し、各ZIP内バイト列から算出したGit Blob SHA-1が監査元HEADの同パスのGitHub Blob SHAと**11/11一致**。Web BuildとGitソースのJSON照合であり、生成後Template側との全量実同期やブラウザ版表示を立証しない。
- **旧教材の残存を最新Artifactで再現**：`docs/curriculum/00_learning-design.html`、`01_spreadsheet-test-design.html`、`02_competency-rubric.html`、`03_instructor-reference.html`、`04_learning-effort-reference.html`の5件が**全て存在**。講師向け`03_instructor-reference.html`も含む。現在の`verifyPublicFileContent()`はこれらの配布を拒否するため、**このArtifactを用いた`course:sync`成功は未実証であり、旧ページを残したままの配布成功を受け入れない**。Web生成側の除外はPR #199の所有範囲。
- **公開評価基準との区別**：ZIPに`assessment/phase-1-rubric.md`〜`phase-3-rubric.md`の3件があるが、各本文は公開評価基準と明記。非公開の`scoring-tests`や模範解答と同一視しない。公開可否の最終判定・第三者権利の確認は引き続き未完。
- **Web静的参照の追加検査**：ZIP内のHTML/CSSから`script/img/source/video/audio/iframe`の`src`、`link`の`href`、`srcset`、CSSの`url(...)`を抽出し、ローカル参照**168件を解決、ファイル欠落0件**。HTMLの`<a href>`は別に確認し、旧5ページ宛てのリンクが**12件**（うち旧ページ以外から**10件**）残っている。例：`docs/curriculum/index.html`は旧5ページ全てを参照。旧ページだけを削除しても参照切れが生じるので、**#199側で生成対象と導線の両方を修正**する。JavaScriptによる動的な読み込み、実ブラウザの遷移、生成物とTemplateの全依存閉包までは検証していない。
- **残条件**：実Shopの全import/asset/runtime依存閉包、旧Planの公開参照、Template/Webの教材本文・SHA/revision・異版BLOCKED、実`build:web → course:sync → verify-distribution → 再同期`、外部AI送信範囲・Git不要総合export・再配布権利・本人環境の実受入は未確認。**専用チェックリスト12/21件を維持**し、複合条件が残る項目にはチェックを追加しない。

## 2026-11-05 JavaScript組込みWeb資産の依存閉包追加監査

- **監査対象**：[Web CI #41991216665](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41991216665) の本番 `web-dist-production`（Artifact ID `13398845703`）、監査元HEAD `7904bb6f4d3995ab6f97a0878af273547fbeb5f3`。ZIP SHA-256 `5ca19ff169f2c7706f75a84bcd58aa62e381a93f31c1d3c551efb8410249979b` の再確認に成功。
- **先行監査との境界**：HTML/CSSの静的参照168件・欠落0は、JavaScriptバンドルのリソースURIを含んでいなかった。`_expo/static/js/web/entry-0f7fe515b3a784d710d5636b0aee4623.js` の `uri:"/assets/...png"` を重複排除して抽出した結果、Expo Router/React Navigation由来の**画像URI 12件／ZIP内一致0件（欠落12件）**を確認。例：`/assets/node_modules/.pnpm/expo-router@57.0.29_f4b90d3b97c668193d7808bce0be73de/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png`。これは**JavaScriptバンドル内の静的埋込みURIの存在とZIP欠落**の確認であり、実ブラウザの対象表示・404再現まで行ったものではない。
- **PR #218の配布側対応**：`scripts/training/ai-assisted-qa-course-core.mjs` に `validateBundledShopAssets()` を追加し、生成された`course/shop/**/*.js`に埋め込まれた`/assets/...` URIに対応する配布ファイルを要求。 `course:sync` の**書込前**と `verify-distribution` の両経路から呼ぶ。 `tests/contracts/ai-assisted-qa-course-distribution.test.mjs` に欠落URIの事前拒否、正規ファイルを追加した正常同期、配布後にファイルとmanifest登録を削除した偽装の再拒否を確認する契約を追加した。さらに配布ファイルが**0バイト**の場合も拒否するよう強化し、空ファイルの負例を追加。これはPNGの内容妥当性・実ブラウザ表示の証明ではない。fixtureテストの新HEAD CIは未確認であり、合格済みとはしない。
- **#199側の修正条件**：Web生成側で実行時に必要な`/assets/`をBuildへ同梱するか、参照を実在する資産へ修正し、同一HEADの新Artifactで組込みURIの欠落0、旧教材5ページ・旧リンク0を確認。Metro由来の参照が実行経路で不要と判断する場合は、根拠と代替の検証を#199で記録する。**配布guardの緩和や空ファイルの追加でPASSを作らない**。
- **進捗判定**：manifest/生成Shopの**完全**依存閉包と実Shop同期は未完。旧5ページ・参照12件に加えて画像URI12件が残る。専用チェック**12/21件を維持**。修正commit `69de9ec9`、`29e68c19`、`f5e98cd4`、空ファイル拒否の`8da37df1`・`e611c2b8` は新しいHEADのCI/実Build検証待ち。

## 2026-11-05 継続：配布rootのSymlink・外部AI送信境界

- **CI失敗の原因**：PR #218 HEAD `94c7efd1265df94a8141f1c89eb7ed9b26de4313` の[Web CI #42001514745](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42001514745)はfailure。失敗元は`Style Quality`のPrettier違反（`scripts/training/ai-assisted-qa-course-core.mjs`、`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`の2ファイル）。`Vitest (contracts)`、`Code Quality`、Build、Training runtime contracts、主要Chromium E2Eは成功。 `verify`のfailureはStyle Quality、`validate`のfailureはverify failureに連動する。原因を確認せず機能不具合として扱わない。書式修正commit `d2a19115`、`a986c3ca`を反映済み。修正後HEADのCIは未確認。
- **生成Web Build rootのSymlink検証漏れ**：`expandBuildOutput()` は以前`assertNoSymlinkPath(root, "dist", false)`を使っており、`dist`自体が外部directoryへのSymlinkでも`fs.statSync()`を通過していた。`true`へ修正（`8a190ecc`）。fixtureの`dist`を別ディレクトリへ移動し、その参照Symlinkに差し替えた場合、`syncCourse`がコピー前に拒否し、対象に書き込みがないことを検証する負例を追加（`61842367`）。**追加テストのCIは未確認**。すでにチェック済みのSymlink負例項目の強化であり、チェック数を増やさない。
- **通常チューターの送信範囲**：`scripts/training/ai-assisted-qa-course-tutor-core.mjs`の`buildTutorConfig()`は`workspace/${moduleId}/*`を読み取り許可し、`scripts/training/ai-assisted-qa-course-tutor.mjs`は`START provider/model-id`を要求するが、起動前にそのworkspaceに含まれるSecret/個人情報を全件検査する処理や読取ファイルサイズ上限は実装上確認できない。学習者が配置した機密を**モデルが実際に読み送信したかは未実証**。システム指示の「Secretを読まない」だけでは機密情報の機械的排除を証明できない。通常会話の保存先はCLIにも「OpenCodeの通常の保存設定」と説明されるが、Git外・保持期間を含む検証は未完。
- **正式評価との区別**：`ai-assisted-qa-assessment-core.mjs`には証拠1ファイル256 KiB、合計2 MiB、モデル入力4 MiB、既知Secretパターンの拒否があり、`ai-assisted-qa-assessment.mjs`も送信確認を持つ。未知のPIIを完全に除外することまでは立証しない。非公開`workspace/.course-assessments/`への保存は、本人端末への外部export/復元の代替ではない。
- **所有境界と再開条件**：チューター/正式評価の実装変更は配布専用ブランチで行わない。#199（必要なら正式評価担当 #217）へ、読み取り対象の最小化、**送信前**のトークン・PII・サイズ制約、通常会話の保存先、送信確認と拒否の負例、ログ・本人ファイル保全を引き継ぐ。配布後実行と本人認証・課金の確認は#199の本人実受入。専用リストの外部AI送信条件は未完。

## 2026-11-05 再現監査：既知SecretパターンとPrettier修正

- **監査元**：[Web CI #41991216665](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41991216665)の`web-dist-production`（Artifact ID `13398845703`、保存済みZIP 19,587,731 bytes）。この会話の実行環境にある実ZIPのSHA-256を再計算し、GitHub記録の`5ca19ff169f2c7706f75a84bcd58aa62e381a93f31c1d3c551efb8410249979b`と一致。ZIP 312エントリ・Symlink 0を確認した。
- **公開禁止素材の再現**：旧教材の5 HTML（講師向け`03_instructor-reference.html`を含む）は現在のZIPにも存在。`_expo/static/js/web/entry-0f7fe515b3a784d710d5636b0aee4623.js`内の`uri:"/assets/...png"`は重複排除後12件で、12件すべてZIPの相対パスに対応ファイルがない。旧教材や不足画像を配布できたとは判定しない。
- **既知Secretパターン検査**：312エントリのうち拡張子`html/css/js/json/md/ts/tsx/txt/xml/webmanifest/svg/csv`のテキスト189ファイルを対象に、GitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLabのtoken・API key、秘密鍵ヘッダ、主要個人メールドメイン（gmail/yahoo/icloud/outlook/hotmail）の正規表現照合を実施。**該当0件**。これはこの固定Artifactのパターン一致検査に限定し、未知形式の認証情報、その他の個人情報、バイナリ123ファイルの秘密情報、別HEADの成果物まで無害化できたことを意味しない。
- **CIの書式修正**：HEAD `8bf4a34d02335d0b7cfe3a706151d4b36063d20b` の[Web CI #42004989437](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42004989437)では、前回の2ファイルから`ai-assisted-qa-course-core.mjs`の1ファイルへStyle Quality失敗が縮小。`validateBundledShopAssets()`の条件式と`continue`を、`printWidth:100`に収まる1行へ修正（`a44463d9`）。[新Web CI #42006792619](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619)で**Style Quality成功**を確認済み。全ジョブの結論と新HEADの契約テスト結果は別途記録し、現時点では全部PASSと主張しない。
- **進捗判定**：実Shop全量sync/版表示/旧教材除外/JavaScript参照画像の欠落は未解消。既知Secretパターン0件も包括除外条件を満たさないため、専用チェックは**12/21件**を維持する。

## 2026-11-05 固定HEADの依存・配布契約／Build／Serve証拠

- **検証対象の固定HEAD**：`a44463d960a24014ade5a74d7812ad862d46a474`、[Web CI #42006792619](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619)。この固定版は先に追加したJavaScript組込み画像の欠落・空ファイル拒否、`dist` root Symlink拒否と負例テストを含む。検査対象のcommitと後続の監査文書更新commitは区別する。
- **配布契約／異常系**：[Vitest (contracts)](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619/job/127175479825) **74ファイル、1122 PASS、1 expected fail、15 skipped**。`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`のWeb画像欠落/空ファイル/manifest偽装拒否、Symlink配布元の未書込拒否を含む。本番実Shopの通し同期はfixtureテストと別物であり、この件数に算入しない。
- **BuildとServe**：[build-production](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619/job/127175480132) 成功。`production-smoke`（[job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619/job/127175958260)）は、prebuilt `dist` Artifactを取得し、Playwright `test:smoke` を実行して**5 passed**。`Training runtime contracts`（[job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42006792619/job/127175479390)）**2 PASS**。`Style Quality`および`Code Quality`も成功。
- **同RunのCI全体との区別**：`Chromium E2E (required)`が後続commitに伴う`cancelled`となり、`verify`は`e2e-chromium result was cancelled`で失敗。したがって、このRunを「全CI成功」とは記載しない。配布の契約/異常系・Build/Serveの**対象ジョブ**で実測した成功のみを受け入れる。
- **未確認事項と受入境界**：旧教材5ページ、JavaScript参照画像12件の欠落、全量`build:web → course:sync → verify-distribution → 再同期`、WebとTemplateのsource SHA/revision表示・異版BLOCKED、Git/PR不要の総合exportとTutorの送信前保護、再配布権利最終判断は別タスクとして**未完**。[#199へのWeb Build側引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6654207455)と[外部AI・保存境界の引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6654777121)を元Plan側の再開条件とする。
- **限定した完了判定**：専用タスクリストの「依存/配布の契約・異常系テスト、Build/Serve、検証証拠を固定HEADで報告。未確認事項を元Planに引継ぐ」は、上記の固定HEADと担当ジョブ・引継ぎにより受入可能。これをもって実Shop全量同期、公開除外、第三者許諾まで完了したとはしない。

## 2026-11-05 Phase 1/2成果物のGit不要バックアップ・復元受入

- **追加した実装**：`training/course-sync/learner-workspace-backup.mjs`と`training/course-sync/learner-workspace-backup.md`を配布manifestの`local_files`に登録（出力先`scripts/training/learner-workspace-backup.mjs`、`course/learner-workspace-backup.md`）。元HEADでlocal **142ファイル**、固定Skill **105ファイル**、load **110件**、local/外部Skill target重複0。共通course router、`package.json`、正式評価エンジン、教材本体、製品SUTは変更していない。
- **Git/PRなしの利用経路**：学習者Templateのルートから`node scripts/training/learner-workspace-backup.mjs export --target /tmp/qa-course-learner-backup.json.gz`、同一配布元版で`restore --source /tmp/qa-course-learner-backup.json.gz`。単一`.json.gz`に本人のPhase 1/2提出物`workspace/M00..M07/**`、Playwright Run/Trace`workspace/Mxx/evidence/runs/**`、`workspace/.course-assessments/P1|P2/**`の非公開結果・履歴、`.course-load/M00..M07-*.json`を収録。M08..M10、`.env*`、Secret/credential名、Git・node_modules・出力領域は除外。既知Secretの検査は既存`assertNoSecretText()`を再利用し、主要個人メール検査を追加。認証情報がテキストに含まれる場合は公開せず全体をBLOCKED。未知PIIやバイナリに埋め込まれた秘密は保証対象外。
- **エクスポートと復元の安全性**：配布manifestの`source_sha`/revision、アーカイブ内のパス許可リスト、ファイル単位SHA-256/サイズ、重複、Symlinkと領域逸脱、別版の復元を検査。バックアップ先は学習者repo外の既存親ディレクトリ・未使用ファイル名に限定。復元では既存ファイルの内容衝突を**全件書込前**に検査し、既存ファイルを一切上書きしない。同一内容の再復元は新規書込0。ファイルの大きさ上限64 MiB/件、256 MiB/合計、1万件を超えた場合は失敗として停止し、黙って省略しない。保存ファイルは**非暗号化**、Unixでmode`0600`、本人の安全な保存が必要。SHAは誤破損検査であり署名や真正性保証ではない。中断時に新規ファイルが一部残る可能性は明示し、既存ファイルは変えない。
- **固定HEADの実測**：`6433402aab4bb7145a9528f963bc2b54d0647f36`の[Web CI #42011215918](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42011215918)／[Vitest (contracts)](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42011215918/job/127191145655)は**75ファイル・1131 PASS、1 expected fail、15 skipped**。新設`tests/contracts/ai-assisted-qa-course-backup.test.mjs` **9/9 PASS**。具体的にGitなし・実node CLIでexport/restore、Markdown・spec/Config・バイナリTrace/Run・非公開評価・load receiptのバイト一致、除外ファイル、同一版再復元、別SHA・改ざん・パス逸脱・重複・秘密・個人メール・Symlink・既存ファイル衝突時の拒否を確認。fixtureは同一`source_sha`/revisionの模擬配布環境であり、本人Codespaces・ダウンロード/復元の実操作ではない。`Code Quality`もsuccess、`Prettier`も全ファイルsuccess。
- **限定したStyle失敗と修正**：同Runの`Style Quality`は`training/course-sync/learner-workspace-backup.md`の末尾改行不足（MD047）でfailure、後続commit`90fdb7a9`にて改行を追加。**新HEADの全CI成功は未確認**。同Run全体をsuccessと主張しない。
- **チェック判定**：専用リスト「Phase 1/2の提出Markdown・spec/Config・Trace/Run・非公開評価結果についてGit/PR不要のエクスポート手順・保存先・除外・再ロード非破壊性をfixture/契約・CIで検証。本人のダウンロード・復元は#199へ渡す」は、上記固定HEADの契約結果と配布manifest・手順によって完了。本人の外部保存先の保全、Codespaces実操作、暗号化要否、サイズ上限を超える実データの取扱い、正式評価そのものは**#199の最終実受入**で判断する。公開やmergeは行わない。

## 2026-11-05 HTML/CSS閉包と教材SHA-256版照合（未完）

- **Web Artifact実物を固定して再検査**：保存済み`web-dist-production` ZIP、SHA256 `5ca19ff169f2c7706f75a84bcd58aa62e381a93f31c1d3c551efb8410249979b`、312件。静的拡張子のURLについて、HTML`src/href` 2485参照（対象がZIPにないもの0）、CSS`url(...)`12参照（不在0）、JS`uri:"/assets/..."`12参照（**不在12**）を確認。リンク形式に一致した静的参照の数であり、ブラウザの動的URLや実リクエストを網羅した数値ではない。
- **配布ガード強化**：`scripts/training/ai-assisted-qa-course-core.mjs`の`validateBundledShopAssets()`を拡張。HTML/CSSの固定URL参照を配布対象へ解決して不足・空ファイル・領域逸脱を拒否。これまでのJS組込みURI検査は維持。`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`へHTML/CSSの不足・同期前停止とmanifest改ざん後拒否を検査する負例を追加。[Web CI #42015673142](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42015673142)で**契約テスト1132 PASS、1 expected fail、15 skipped**、Code Quality成功。Style Qualityは当時の追加core部分のPrettier違反でFAIL、後続の書式修正を追加。実Shop全量syncは未完。
- **Web配布ファイル名の競合**：欠落12 URIは`/assets/node_modules/.pnpm/.../*.png`を参照する。`expandBuildOutput()`は生成Webの全パスに`normalizeRelativePath()`を適用し、その`FORBIDDEN_PATH`は`node_modules`のパス要素を禁止。Web Build側で画像を同じパスにコピーするだけでは配布時に拒否される。**ファイル自体と参照先を、禁止ディレクトリを含まない静的公開パスへ揃える修正が必要**。所有境界は#199。引継ぎは[PR #199コメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6656558380)。
- **Web/Template教材revisionの照合**：`scripts/docs/build-ai-assisted-qa.ts`（#199側）は元MarkdownのSHA256をHTML`course-source-revision`と`data-course-revision`、元クイズJSONのSHA256をHTML`quiz-revision`と`data-revision`へ書き込む。Template配布処理は`lesson/guide/exercise`の**リンク変換前**の原文SHA256をmanifestの`source_sha256`に保持するように追加。これとWeb開始ページ、11モジュールの教材・演習、11クイズのmeta/data属性・同期済みJSONを比較し、異版を`BLOCKED`にする契約を追加。`course:sync`の書込前と`verify-distribution`の両方で実施。元教材の相対リンク変更で配布後MarkdownのSHAが異なることを考慮し、配布済みファイルのSHAとは別に元MarkdownのSHAを記録する。
- **限界と未完条件**：上記版照合の追加後HEADの契約・Style結果はまだ確定していない。Webが利用者にGit commitの`source_sha`（40桁）を表示して異版を説明する受入、旧教材5ページの生成除外、JS画像12件の欠落、同一固定commitでの実Build→Shop同期→検証は未実施。専用タスクリストの項目1、2、11、12とWeb横断項目は未チェックのまま。

## 2026-11-05 Web revision契約のfixture修正・検証状態

- **新しい正本連携**：`validateWebCourseRevisions(files)`で、Webの開始ページ・M00〜M10の教材HTML/演習HTML・11クイズHTMLの`meta`/DOM版と、固定Templateの元Markdown・配布クイズJSONを照合。学習用Markdownは相対リンクを再配置するため、`course:sync`でリンク書換え前の`source_sha256`をmanifestに残す。書込前と`verify-distribution`両方で不一致を拒否。元Web生成器`build-ai-assisted-qa.ts`のSHA256メタデータを再利用し、新しいWeb側仕様は作っていない。
- **契約テストの一時失敗と原因**：[Web CI #42017563048](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42017563048)、`Vitest (contracts)`は1件FAIL、1133件PASS。FAILは追加した版照合テストの汎用fixtureに原因があり、演習ソースの`role`が実manifestの`exercise`ではなく`fixture`だったため、元SHA256が埋め込まれずクイズ版違いケースより先にM00演習の不整合で停止した。共有実装の演習が誤っている証拠ではない。fixtureを実manifestに揃え（`role:"exercise"`）、契約テストが元SHA256を持つ状態へ修正。Prettierの実整形差分を同CI診断から反映し、**診断専用テストは削除**。この変更後のテスト結果は別途確認する。
- **生成先の禁止pathを負例化**：欠落画像の元URI `/assets/node_modules/.pnpm/.../*.png` をファイルとして`dist/**`に追加しても、既存`FORBIDDEN_PATH`が`node_modules`を拒否することを配布契約テストへ追加。#199でWeb Buildの出力URLと生成先を禁止領域外へ揃える再設計が必要。[引継ぎコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6656558380)。
- **実物Artifactとfixtureの区別**：既存ZIPのHTML静的参照2485件・CSS 12件は参照先欠落0、JS組込みURI12件は欠落12件。fixtureのWeb HTML/クイズ版照合テスト成功は、本番Webの全量`course:sync`成功を意味しない。元Webにはcommit `source_sha`（40桁）の画面表示・異版説明がなく、旧教材5ページも残存する。受入条件1、2、11、12およびWeb横断項目は未完。
- **最終コードcommit**：診断削除とfixtureの一致修正`9a179df7`、禁止パス負例`8e0c7295`。GitHub Actionsは起動しており、**全CI／修正後の契約テストの結果は確認時点では未確定**。チェックを増やさない。

## 2026-11-05 同一固定HEADの実Web教材・Template版照合（受入）

- **実成果物**：[Web CI #42018819384](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42018819384)（PR #218の固定HEAD `14bbde10726f3fb75e41c3e2467431e2f0d18d95`）の`web-dist-production` Artifact **ID `13409274806`** をGitHub Actionsから実際に取得し、ZIP SHA-256 **`c40b43b8aa07e5d1d01a9ab222cdee93a434c888c60982b20bb0a7ee9c8f18a3`** がGitHubのartifact digestに一致。ZIPは312ファイル。
- **Web/教材原本の実際の版一致**：`docs/curriculum/ai-assisted-qa/`以下の生成HTMLの版メタデータを確認した結果、開始ページ1、M00〜M10の教材HTML11、演習HTML11、クイズHTML11、学習項目マップ1の**計35ページ**で`meta`のSHA-256と`data-course-revision`/`data-revision`が一致。ZIP自体が含む演習Markdown11・クイズJSON11の計**22/22件**は、HTMLのrevisionと実バイト列SHA-256が一致。開始ページ/教材READMEの**12/12件**は現PR HEADのGitHub原本を取得してテキストSHA-256を計算し、HTMLと一致。学習項目マップの残り1件は`docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md`の実SHA-256と一致。合計**35/35一致**。
- **固定HEADとの整合**：Web生成器`scripts/docs/build-ai-assisted-qa.ts`のGit Blob SHA `96c56b69564134ba73fe6538ab83342c0321f9d6`は、以前のArtifact生成HEAD `7904bb6f...` と現HEADで同一。両HEAD間のGitHub compareは **ahead 51 commits、変更ファイル8件**で、`docs/curriculum/ai-assisted-qa/**`および`training/ai-assisted-qa-course/exercises/**`に変更0件。PR HEADの配布manifest `local_files` に、開始ページ/教材11/演習11/クイズ11の**34/34原本が登録済み**で、`source_sha`は`${SOURCE_SHA}`を固定HEADに実行時置換する契約、revisionは`ai-assisted-qa-course-v3`。
- **固定HEADの契約CI**：同Runの`Vitest (contracts)`は**75ファイル・1134 PASS、1 expected fail、15 skipped**。`pins all Web lesson, exercise and quiz HTML revisions to learner Markdown and JSON`がPASSし、誤revisionを同期前にBLOCKED、manifest `source_sha256`を改ざんすると配布後検証がBLOCKED、同一版への再同期では`copied=[]`かつ全配布ファイル不変。Style/Code/Build/production-smoke/必須Chromium E2E/`verify`/`validate`もsuccessで、同Run全ジョブが終了・失敗0。
- **限定した完了判定**：専用リスト「Web生成物と学習Templateが同一のMarkdown/クイズJSON・固定SHA/revisionに対応することを静的/CIで検証し、異版時のBLOCKEDと再読込非上書き契約を確認」は、**実Artifactのバイト・版照合と固定HEAD契約CI**で受入成立。実Shop全量`course:sync`は別項目であり、JS画像の**12件欠落**と旧教材**5 HTML**の混入により依然BLOCKED。Webが利用者にGit `source_sha`を**表示・説明する受入**も別の未完項目（#199所有）。この2条件を完了したとは扱わない。

## 2026-11-05 最新Web Artifact再監査と不完全Web教材の拒否

- **CIとArtifactを固定**：PR #218の固定HEAD `9d3acdcbb1f4bed7c0d367c21fcc02c9f1ec850c` に対する[Web CI #42022449903](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42022449903) はStyle Quality、Code Quality、Vitest (contracts)、Build/Serve、必須Chromium E2E、`verify`、`validate`ともにsuccess。GitHub Actionsの`web-dist-production` **Artifact ID `13412915763`** を再取得し、ZIP 312件・SHA-256 `be725b85b76ea0570f7f423f300eac1b88ae65cb98688a64777f0ca00b9bcab9`がGitHubのdigestと一致。
- **生成Webの未解消事象を再現**：Web ZIPの`docs/curriculum/`に旧教材HTML **5件**が依然存在（`00_learning-design.html`、`01_spreadsheet-test-design.html`、`02_competency-rubric.html`、`03_instructor-reference.html`、`04_learning-effort-reference.html`）。これらへのroot絶対`href`は**12件／6 HTML**に残る。Expo/Metroの`_expo/static/js/web/entry-76f40d453b9263658e7b398b739252d9.js`に`uri:"/assets/node_modules/.pnpm/.../*.png"` **12種類**があり、12件すべてZIPに実ファイルがない。禁止パス`node_modules`を含むため、元URI通りの画像を追加するだけでは配布guardを通らない。**実Shop全量sync／依存閉包／旧教材除外は未達**。
- **既知Secretの限定検査**：同ZIPのテキスト189ファイル（7,245,754 byte）を、GitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLab token/秘密鍵ヘッダと主要個人メールドメインの正規表現で照合し、該当0件。バイナリ123件、未知のSecretや個人情報の不在は保証していない。この結果は「全禁則ファイルを含まない」との受入条件を満たす証拠にはならない。
- **配布時のrevision guardを閉じる**：当初はM00〜M10の教材`index.html`がひとつもない場合にHTML版照合を回避できた。`webRoot`以下の全配布ファイルで検査を起動する初期修正（`5a2036a8`）は範囲が広すぎ、[Web CI #42023504519](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42023504519)で教材画像だけ、またはクイズJSONだけを使う既存fixtureが3件失敗した（契約1132 PASS、3 FAIL）。**実運用のWeb教材HTMLが部分的に生成された場合**のみ全HTML版検査を実行するよう修正（`ead49c3e`、書式修正`c2d18874`）。11クイズJSONが正しく揃っている状態でM00クイズHTMLのみ追加し、開始ページ/教材HTMLを欠くfixtureは、同期前BLOCKED・配布先空を期待する新規負例に変更（`1a4d4ff4`）。既存の「クイズJSON単体」「画像単体」のfixtureは引き続き許容する。最終修正後の[Web CI #42024731679](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42024731679)の受入結果は別途確認する。**実Web不足解消の代替ではない**。
- **受入境界**：専用タスクリストの残6件はすべて未チェックのまま。旧教材とリンクの生成除外、Expo画像の安全な出力パスへの再配置は#199が所有。PR #218は配布側の事前拒否とテストだけを変更し、Web生成器・製品UIを修正していない。

## 2026-11-05 静的Web import・assetと学習runtime依存の閉包検査

- **配布runtimeのimport解決**：`training/course-sync/manifest.json`のローカル142ファイルのうち`role=runtime`は16件（`package.json`・`pnpm-lock.yaml`を含む）。実行コード14件（.mjs/.tsの静的import）を固定HEAD `b4b4d060d65e5650fed94c6468c403f42aa6fffb`の実ソースと照合すると、**相対import 16箇所**は`local_files`または`load_files`で到達可能。Node組込以外の`@playwright/test`と`yaml`は配布`package.json`の`devDependencies`に存在。`pnpm-lock.yaml`も配布対象。テキストに現れない動的組立importや実モジュール実行時の全挙動はこの静的調査の対象外。
- **実行位置の違い**：`workspace/M07/failure-assertion.spec.ts`は初期配布で`course/exercises/M07/failure-assertion.spec.ts`に置かれ、`course:load M07`で`workspace/M07/failure-assertion.spec.ts`へコピーされる。コード内の`../../training/playwright/support/reset-scenario`は後者の**実行時位置**から解決し、配布中の`training/playwright/support/reset-scenario.ts`に一致。初期配布先から直接実行する前提で依存欠落と判定しない。この条件を含む動的manifest契約を`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`へ追加した。
- **Web資産の参照検証を拡張**：`validateBundledShopAssets()`で、HTML `src/href`に加えて`srcset/imagesrcset`、CSS `url(...)`に加えて文字列`@import`、JSの組込み`uri:/assets`に加えて静的`import/export ... from`・文字列リテラル付き`import(...)`をチェック。相対importから配布対象内の`.js/.mjs/.css/.json`等への依存を検査し、未登録・空ファイルを同期前に拒否。srcset、CSS import、ESM import、動的importの不足時に同期前にBLOCKED、全参照先が揃ったときだけShop配布が成功する契約テストを追加。変数から動的に構築したURLは静的解析不能であり保証範囲外。
- **固定HEADでの実測**：[Web CI #42027883152](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42027883152)（HEAD `7c19cecd6f0888c60838443358b3aa95499e31e7`）で`Vitest (contracts)` **75ファイル・1136 PASS、1 expected fail、15 skipped**、Style Quality・Code Quality success。追加したruntime import契約を含む後続HEAD `b5661677`のCI #42028794762ではコードのStyle Qualityが配布テストファイルのPrettier違反1件でFAIL。commit `5b51b58f`で書式を修正したが、後続[Web CI #42029391755](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42029391755)でも追加テストファイルのPrettier違反が残りStyle QualityがFAIL。import検査テストの正規表現ループと拡張子照合を簡素化（commit `61bd38be`）。[最新Web CI #42029892694](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42029892694)の最終結果は未確定。後続CIの成功を先取りしない。
- **未完了の境界**：実Web ZIPのJS内URI 12件には実ファイルがなく、旧教材HTML5件と旧教材向けhref12件も残る。元Web Artifactの全依存閉包・同一固定commitの実Shop全量sync／公開Web上のsource commit表示・除外はまだ不成立。専用タスクリスト**15/21件を維持**する。PR #199の最新HEADは`a50541e12511095fdd502ac1ee4892f1d9ddf8c1`へ1 commit進んだが、差分は統合受入タスクリスト1ファイルのみでWeb生成実装は未変更。PR #218はmerge・rebase・force pushを行っていない。

## 2026-11-05 PR #218 最終担当範囲：固定配布依存の全件照合（受入）

- **固定HEAD/manifest**：`8d5bc4ce54f3cf7da7d1075fd1b2a9f6acef5986`、`training/course-sync/manifest.json` Git Blob `da2f8efd5789d6f66a600504b63c4d880529a90e`。
- **allowlistローカル全数**：`local_files` **142/142件**を固定HEADから個別に取得し、実在・非空142件、欠落0件。`local_files`142件＋`external_skill_files`105件の配布先**247件に重複0**。禁止path（`.github/workflows/**`、`.git/**`、`node_modules/**`、`evals/**`、非公開assessment等）を含むsource/target0件。
- **固定外部Skill全数**：`ryu-yoshikawa-pro-vision/qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324` の実原本105件を個別に取得。Git Blob SHA・実バイト数がmanifestと**105/105件一致**、不一致0。13 Skillの各source/targetの対応に不整合0。固定Git treeとの105/105件過不足0検査は本レポートの以前の原典監査節に記録済み。再配布の最終権利判断は別。
- **ロード110件とモジュール**：`load_files` **110/110件**のsourceが配布先247件に存在し、有効なM00〜M10の11 ID、各モジュールのlesson/quiz/exercise/start/end各1件を全件確認。配布runtimeは16件（実行コード14件）、静的相対import16箇所は配布先または`course:load`後の配置へ解決。M07の`failure-assertion.spec.ts`は`workspace/M07`へロードした後の位置から`training/playwright/support/reset-scenario.ts`を参照する。`@playwright/test`/`yaml`も配布`package.json`に依存宣言済み。
- **固定SHA・Shop Build**：manifestの`source_sha`は正確に`${SOURCE_SHA}`。validatorがそのplaceholderを要求し、通常の`syncCourse()`は40桁SHAとcleanな`git HEAD`の一致、固定commitの`git show`バイトとworktreeの一致を確認後、配布manifest/状態へsource SHAを設定する。`generated.shop_build`は`pnpm run build:web`、`dist/**` → `course/shop/**`、`required=true`でvalidatorが契約固定。Symlink・禁止パス・HTML/CSS/JS参照の欠落/空ファイルを同期前/検証時に拒否する。
- **同一HEAD CI**：[Web CI #42032068337](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42032068337)はcompleted/success、**29ジョブ中27 success・2 skipped・0 failure**。Style Quality/Code Quality、必須Chromium E2E、`verify`、`validate`が成功。`Vitest (contracts)`は**75ファイル、1137 PASS、1 expected fail、15 skipped**。配布固有80件、Git不要のバックアップ・復元9件も全PASS。これらは固定HEADの契約受入であって、#199のWeb生成物修正やShop全量同期を意味しない。
- **完了判定と境界**：#218に残る「allowlist・固定Skill・`source_sha`・`generated.shop_build`・validator/runtimeのimport/asset依存」を**受入**。元21項目のうち#218担当16項目は16/16完了。Web生成物の画像12件欠落、旧教材HTML5件/旧リンク12件、実Shop全量同期、外部AI送信・Web版表示などの**移管済み6条件**は[#199の未完了リスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)で引き続き判定する。動的に組み立てるimport先やブラウザ全挙動は静的解析の保証範囲外。配布guardを緩和して実Web欠落を無視しない。
