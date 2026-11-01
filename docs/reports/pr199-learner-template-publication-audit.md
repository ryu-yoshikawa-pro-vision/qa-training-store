# PR #199 学習用公開Templateの公開前監査

## 2026-11-01 配布ライセンスの実装状況（更新）

MIT Licenseの採用承認に従い、学習者用配布元の`training/ai-assisted-qa-course/templates/`に`learner-LICENSE`、`learner-THIRD_PARTY_NOTICES.md`、`learner-OFL-1.1.txt`を追加した。配布manifestのlocalは**137件から140件**へ増加し、それぞれ`LICENSE`、`THIRD_PARTY_NOTICES.md`、`licenses/OFL-1.1.txt`に対応付けた。外部Skill104件の固定参照は変更していない。学習者READMEと配布契約テストにも3ファイルの案内・検査を追加した。[実装commit](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/60b853a17d888afe7139e8fa0e59f4dd17d12d25)、[書式修正commit](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/7a714286118ac9a35616a30eb9330bfe26f8a7c0)を参照する。

**旧記録との差分**：本報告の「local 137件」「LICENSE未指定」は最初の静的監査時点の結果。現在のmanifestには3件の配布指定がある。ただし配布指定の存在は、生成済みTemplateへの実際のコピーと全Hash検証を意味しない。実`course:sync`は未実施。

**公開前の確認**：GitHubアカウント名とGit commitのauthorだけでは著作権者・再許諾権を確定できない。MIT本文の著作権者表記は公開アカウント`ryu-yoshikawa-pro-vision`として準備したが、対象教材・コード・Skillの権利帰属と共同著作者、第三者素材を確認する。Inter/Noto Sans JPのフォントにはMITではなく元のOFL-1.1を適用し、著作権表示とライセンス本文を分けて配布する。ShopのJS/CSS/画像・外部Skill・依存物全体の権利/通知の監査は未完了。

**未達を維持する条件**：CI全体の成功、実配布全件の検証、Template設定と公開の個別承認、本人Private 2コアCodespacesの無料枠確認と実環境受入、独立AI正式評価の校正。製品本体・正式製品仕様は変更していない。

## 判定と対象

**判定：公開承認待ち（公開可の判定には至らない）。** ユーザー回答Q01〜Q08に従い、対象候補は `ryu-yoshikawa-pro-vision/ai-assisted-qa-learner`、書込・設定変更は所有者のみ。生成・事前監査まで許可されており、GitHub上での作成・公開、本人Private repo・2コアCodespaceの作成や有料利用は今回の監査では実施しない。

この記録はPRの固定HEAD `a343b2948d078c41d9cb9f053905c2fbda1708cc` と、`qa-workflow-skills` の固定commit `7cc6cba7772de549841a39d71694cbafbc783324` を読取り確認した結果。**静的検証と実際の公開配布物・2コア実Runは別判定**とする。

## 静的に確認した項目

| 確認項目 | 証拠 | 判定 |
| --- | --- | --- |
| 配布元のファイル実在 | `training/course-sync/manifest.json` の `local_files` 137件を配布元Git treeと照合 | 137/137件存在 |
| 外部Skillの実在・固定内容 | `external_skill_files` 104件を固定Skill Git treeのBlob SHA・サイズと照合 | 104/104件一致 |
| シンボリックリンク・配布先パス | 配布元Git treeのmode、manifestの`target_path`重複・絶対パス・`..`を確認 | 今回の静的対象で検出なし |
| 評価資料の配布境界 | `forbidden_paths` と `assessment_asset_allowlist`、専用契約テストを確認 | 採点テスト・完成状態を除外する設定あり。Phase rubricの3ファイルは公開可能な教材として配布対象 |
| 固定SHA・既存ファイル保護 | `scripts/training/ai-assisted-qa-course-core.mjs` の `verifySourceCheckout`、`externalSkillBytes`、`preflightWrites`、`atomicWriteNewFile`を確認 | 静的にガード実装を確認。実配布の実行結果ではない |
| 配布契約テスト | `tests/contracts/ai-assisted-qa-course-distribution.test.mjs` を読取り | 禁止パス、同期、非破壊ロード、生成Shopと照合するfixture検証あり。今回の実Runは未実施 |
| Codespace構成 | `learner-devcontainer.json` を確認 | 2コア選択は受講者側。Node/pnpm/Playwright Chromium/OpenCode CLIを導入する設定が存在。実環境でのインストール成功は未確認 |

## 公開前に解消する事項

1. **配布物の利用許諾・ライセンス通知。** `qa-training-store` と固定`qa-workflow-skills` のGit treeで、独立した一般的な`LICENSE`・`NOTICE`ファイルを確認できなかった。両repoの所有者が同じことと、受講者への再利用許可が明記されていることは別。ライセンスを勝手にMIT等へ決めず、所有者の希望とコード/教材・共同著作者・第三者素材の権利を確認する。配布manifestにもライセンス・NOTICEの配布指定がない。**ライセンスファイル不在だけで違法とは断定しない**。
2. **生成されたShopの実物。** `expandBuildOutput()` はビルド後の `dist/**` を走査して全ファイルを `course/shop/**` に格納する。シンボリックリンクと禁止パスを検査するが、生成JS/CSS/map等の**内容**に秘密情報や再配布禁止のデータがないか、今回は検査できていない。固定HEADで `pnpm run build:web` → `course:sync` → 全出力一覧/内容監査を行い、source map、画像、埋込みデータと生成物のライセンス/通知を確認する。
3. **フォントの再配布条件。** `scripts/prepare-font-assets.ts` が `@fontsource/inter` と `@fontsource/noto-sans-jp` のwoff/woff2をビルド出力へコピーする。Fontsource公開情報では両書体はOFL-1.1（[Inter](https://fontsource.org/fonts/inter/about)、[Noto Sans JP](https://fontsource.org/fonts/noto-sans-jp/about)）。正式にバンドルするファイルの著作権表示と適用ライセンス全文を確認し、必要な通知を公開配布物へ含める。フォントファイルをチャット成果物として配布しない。
4. **同期の実Runと実配布後の通し検証。** cleanな確定commitから実`course:sync`でShopのビルドと全コピー・manifest/Hash検査を実施。禁止ファイル・改変・途中失敗・再同期の負例、`course:load`一モジュールと本人ファイル不変、8082 Serve/Reset/Playwrightの実行結果を記録する。fixtureの1ファイル`dist/index.html`成功は実Shopの成功に流用しない。
5. **無料枠と権限。** `.devcontainer/devcontainer.json`相当の配布設定で`@opencode/cli@2.0.22`を導入するが、公式V2のnpmパッケージ名が一致することと、この固定版が対象環境に導入・認証・校正成功することは別。実アカウントのCodespaces/Actions残量、請求設定、2コア環境の起動/依存・AI無料モデルを個別確認し、枠不足ならBLOCKEDとする。
6. **公開作成の承認。** 上記の監査結果、配布ファイル一覧、ライセンス・第三者素材、Secret検査、実行証拠を提示後に、公開リポジトリを新規作成するか別途承認を得る。公開Template作成前の試験環境・ローカル配布検査と、実Template→本人Private 2コアCodespacesの最終技術受入は区別する。

## 実行状況・変更境界

- 今回確認したのはGitHub上のソース・Git tree・既存テストの**静的内容**。ローカルで固定SHAのShopをビルド・配布していない。ライセンス・実生成物と2コア実行環境は未受入。
- 製品SUT、正式製品仕様、既存Seed/Reset、製品用テストとworkflowは変更しない。
- 新規Template・Private repo・Codespace・Issueは作成しない。課金・マージ・PR外部公開の操作はしない。
- 定期実行のQ-34と重複する検証は既存証拠を利用し、本報告の未解決事項をQ-34の次の選択材料にする。作業実施証拠がない項目を完了に更新しない。

## 追加確認：配布物の利用許諾と生成される成果物

### 独自コード・教材・固定Skill

- `qa-training-store` の当該commitのGit tree、および固定`qa-workflow-skills` commitのGit treeを検索したが、一般的な`LICENSE`・`NOTICE`相当のファイルは見つからなかった。これは当該リポジトリが著作権放棄されたという意味ではない。GitHub公式[ライセンスの説明](https://docs.github.com/ja/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)によると、ライセンス不在では既定の著作権が適用される。
- 配布対象の固定Skillは13種類、計104ファイル。各Skillの`SKILL.md`の冒頭にも独立したライセンス指定は確認できなかった。コード・教材・Skillの利用許諾は、所有者の公開方針と元著作者等の権利を照合して決定する。**MIT等のライセンスを本人の承認なしに追加しない**。
- 公開Templateの目的は学習者が私有リポジトリを生成して教材やコードを編集することなので、単にリポジトリをPublicにするだけでは、想定する再利用条件を明確にしたことにならない。再配布に含むファイルごとの許諾と表示方法の決定が必要。

### 固定依存フォント

- `pnpm-lock.yaml`の`@fontsource/inter`と`@fontsource/noto-sans-jp`は、ともに`5.3.0`に固定されている。実ビルドでフォントをコピーする実装は`scripts/prepare-font-assets.ts`。
- Fontsourceが示す[Inter](https://fontsource.org/fonts/inter/about)と[Noto Sans JP](https://fontsource.org/fonts/noto-sans-jp/about)のライセンスは、いずれもSIL OFL 1.1。再配布時には対応する著作権表示とライセンスの同梱が求められる。具体的なコピー済みフォントと通知の有無は**ビルド後の実物を確認するまで未受入**。
- 独自教材/コードへ選ぶライセンスと第三者フォントのOFLは別に扱い、フォントを独自ライセンスへ置換しない。

### Shop出力の追加確認

- `package.json`の`build:web`は`prepare:font-assets`→画像manifest生成/検証→`expo export --platform web`→`build:docs`の順。`build:docs`は`dist/docs`に正式仕様、旧課程の教材と新課程の公開資料を生成する。`course:sync`は`expandBuildOutput()`で**`dist/**`全体**を`course/shop/**`へコピーする。公開Templateには学習用ShopのJS/CSS/フォントだけでなく公開仕様/教材ページも含まれる想定。
- この配布対象はファイル名だけの禁止条件では判定し切れないため、固定commitからの実`build:web`後に`dist/**`を列挙し、Secrets、Source Map、第三者の権利表示、不要な個人/組織情報、配布上限・サイズを確認する。現時点では**実ビルドを実行しておらず内容検査は未完**。
- 学習用Templateの`package.json`は製品リポジトリの`package.json`を配布する指定で、Expo/React Native関連を含む。2コアCodespacesでの`pnpm install --frozen-lockfile`とChromium導入の成否・使用量は**実環境で確認**する。依存削減の変更は、実証前に憶測で行わない。

### 公開前に必要な判断

所有者による判断が必要なのは、**自作の教材・Skill・ソースコードを学習者へどの条件で複製・修正・再利用させるか**というライセンス方針である。第三者のOFL通知は確認可能な技術的対応として調査を継続し、ライセンス選択と混同しない。公開作成は引き続き個別承認待ち。

## 追加監査：Web CIの実ビルド成果物（2026-11-01）

`Web CI`のRun [41293093957](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41293093957)の`web-dist-production` Artifact（ID `13078780383`）を取得し、ZIPの**全312ファイル（展開後25,506,467バイト）**を静的に走査した。Runの`head_sha`は`c7c4a57deef7fa1afbbfb8a7bd78f2085031dea8`であり、**後続のPlan・本監査文書の変更HEADを検証したものではない**。本Artifactは`dist/**`のWebビルドであり、`course:sync`後の241個の配布元コピー、`.course/distribution-manifest.json`、実TemplateのGit設定は含まない。

| 検査項目 | Artifactの確認結果 | 判定範囲 |
| --- | --- | --- |
| Webビルドのファイル実在 | 312件、HTML83件・Markdown50件・WebP103件・CSS6件・woff/woff2計12件など | 実ビルドArtifactの内容を確認 |
| 配布禁止の典型的なパス | `.env`、`.git/`、`scoring-tests/`、`reference-solutions/`、`completed-states/`、`.github/workflows/`というファイル名を検出せず | ファイル名ベースの検査。内容監査とは別 |
| 秘密情報を示す典型的な文字列 | 秘密鍵ヘッダー、GitHub Token、AWS Access Key、OpenAI API Key、長いToken/Password代入式、JWT形式をテキストファイル群で検索し**検出0** | パターンベース。すべてのSecret混入がない保証ではない |
| source map・評価完成資料への文字列参照 | `.map`ファイルなし。`sourceMappingURL`、評価用完成資料パスの指定パターンを検出せず | パターンベースの確認 |
| メールアドレスらしい文字列 | 抽出した59件のドメインはいずれも`example.com` | 実際のユーザーアドレスが一切ない保証ではない |
| フォント | Inter 6ファイル、Noto Sans JP 6ファイル。woff内の著作権メタデータとOFL参照URLを確認 | SIL OFLの完全遵守・第三者ライセンス全量の検査ではない |
| `LICENSE`/`NOTICE`類 | 該当する独立ファイルを検出せず | フォントメタデータに著作権表示とライセンスURLがある。独立ファイルの欠如だけで違反とは判定しない |
| 旧カリキュラムと講師向け資料 | `docs/curriculum/03_instructor-reference.html`ほか、旧課程と正式仕様ページを同梱 | 公開済み資料であっても**学習者Templateに必要か**は配布範囲の確認が必要 |

**確定した実装上の配布経路**：`package.json`の`build:web`はWebアプリ・フォント・画像と`build:docs`の成果物を作り、`expandBuildOutput()`が`dist/**`を`course/shop/**`へ無差別に追加する。従って、生成物の一覧には新課程だけでなく旧課程の講師向け資料・正式仕様等も含まれる。これを直ちに機密情報漏えいと断定しないが、Q03の「公開に必要な範囲」の審査では**配布する/しないの根拠を示す必要がある**。

**ライセンスについての追加判断**：ユーザーは自作の教材・コード・SkillをMITにする方針に同意済み。ただし、本人以外の著作物には自動適用しない。SILの[OFL FAQ](https://software.sil.org/oflt/)では、バンドルされるフォントはメタデータ内の著作権・ライセンス参照で条件を満たせる場合がある。Artifact中のフォントには著作権表示とOFL URLがあるが、利用者が容易に参照できる表示か、依存パッケージ全体の通知条件を満たすかは未判断。**OFL全文の独立ファイルがないだけで違反と断定しない**。MIT本文・著作権者の確定と第三者NOTICEの整理は公開前に必要。

**今回の新しい結論**：実Web Artifactの一次検査は完了。典型的なSecretや学習者へ渡さない評価完成資料の直接混入を示す証拠は得ていない。ただし、学習者Templateへ配布する実ファイル集合は`dist/**`より大きく、実`course:sync`後の全量検査、ライセンス/配布範囲の判断、2コア環境受入、無料枠、公開作成の個別承認は**未完了**。

## 追加監査：Webビルド同梱資料の内訳と判断

Run `41293093957`から取得した`web-dist-production` ZIP（SHA-256: `a005e0167c7f61454d255cbdfbe90b0c99fcaba4ac14713fcddb949324dc3abb`）の312ファイルを、パスごとに重複なく分類した。

| 対象 | ファイル数 | 展開後バイト数 |
| --- | ---: | ---: |
| `docs/curriculum/ai-assisted-qa/**`（新課程） | 139 | 6,214,770 |
| `docs/curriculum/**`のうち新課程以外（旧課程） | 25 | 1,001,612 |
| `docs/spec/**`（製品の正式仕様・画面参照） | 116 | 6,994,597 |
| `_expo/**`・`images/**`・ルート（アプリ・画像など） | 32 | 11,295,488 |
| 合計 | **312** | **25,506,467** |

`build:web`の成果物としては上記が確認できたが、`course:sync`は`dist/**`全件を`course/shop/**`へ含めるため、旧課程の`docs/curriculum/03_instructor-reference.html`と多数の正式仕様ページも学習者Templateへ配布する設計になっている。いずれも**公開済み資料の可能性が高いが、それをもって学習者の実行に必要な配布範囲とは判定しない**。

削除を実施する前に、Shopからの相対リンク、既存Web appの遷移、Playwright演習と教材の参照先が壊れないかを確認する。配布範囲を見直す場合は`build:web`の生成責務と`expandBuildOutput()`の配布責務を区別する。現時点ではSUTの成果物を無断で減らさず、**公開前監査の判断待ち**とする。

ライセンスについては本人が自作の教材・コード・SkillをMITにする方針を承認済み。ただし独自コード・教材の著作権者と第三者素材の権利確認は未完了のため、既存リポジトリ全体のライセンス変更・第三者Skillの一括再許諾は行わない。公開前に`LICENSE`/必要なNOTICEの実同梱と、`course:sync`生成manifestの内容を検査する。

## 追加確認：実ビルドのフォント著作権メタデータ

Run `41293093957`の`web-dist-production` Artifactに含まれる`woff`/`woff2`の**12ファイル全部**を、OpenType `name` tableの`nameID=0`（Copyright）、`nameID=13`（License description）、`nameID=14`（License URL）で検査した。

| ファイル群（各400/600/700、woff/woff2） | 件数 | `nameID=0` | `nameID=13` | `nameID=14` |
| --- | ---: | --- | --- | --- |
| Inter | 6 | `Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)` | なし | `https://openfontlicense.org` |
| Noto Sans JP配布ファイル | 6 | `(c) 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.` | なし | `http://scripts.sil.org/OFL` |

`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`のnpm packageはともに`OFL-1.1`。特にNoto Sans JPの**配布フォント内部の著作権表示はAdobe/Source**であり、npmの説明欄にある権利者を根拠なくフォント全量へ上書きしない。実ファイルの改変・別名配布・Reserved Font Name扱いは、該当するOFLの規定と元ファイルの表示を照合する。

[SIL公式OFL FAQ](https://openfontlicense.org/ofl-faq/)では、配布プログラムにバンドルされたOFLフォントについて、ライセンス本文が別ファイルにないことだけでは違反と断定できない。フォント内に参照URLを含める対応も説明されているが、**利用者が参照しやすいOFL全文と著作権表示を別途同梱することを推奨**している。したがって、今回は「独立ライセンスファイル欠如＝違反」と判定せず、実配布前に通知/ライセンス文を用意して、元ファイルの著作権表示と一致することを確認する。

この監査はビルド済みフォントの**静的なメタデータ検査**であり、Template側でのライセンス同梱や2コア実行環境の受入ではない。

## 追加監査：JSバンドル内の第三者著作権表示

Run `41293093957`の`web-dist-production` Artifact（SHA-256 `a005e0167c7f61454d255cbdfbe90b0c99fcaba4ac14713fcddb949324dc3abb`）の`_expo/static/js/web/entry-21b4711df1c6db0566115828ee2d23ee.js`をテキスト検査した。React/React DOM/React IS/scheduler/use-sync-external-store-shim等の`@license React`と`Copyright (c) Meta Platforms, Inc. and affiliates.`、`bezier-easing`の`Copyright 2014-2015 Gaëtan Renaudeau. MIT License.`を確認した。これは実ビルドに含まれる**少なくとも2系統の第三者著作物**の根拠であり、全依存コードの権利者を検出できたことは意味しない。

学習者用`THIRD_PARTY_NOTICES.md`へ著作権者・MITの別個の表示を追加した。元バンドル内の`@license`表示は削除しない。学習者用`LICENSE`に独自コードの著作権者名を記載していても、第三者MITコードがその著作権者へ移転するわけではない。依存物の全量調査・実`course:sync`は引き続き未受入。

## 2026-11-01 ライセンス配布実装と受講者への説明の再確認

公開Templateの生成元では、`training/course-sync/manifest.json`に以下を追加済み。静的検証時の宣言は**local_files 140件、external_skill_files 104件**であり、以前の「137件」という値は**新規ライセンス配布ファイル3件の追加前**の値である。

| Template内の配布先 | 配布元 | 用途 |
| --- | --- | --- |
| `LICENSE` | `training/ai-assisted-qa-course/templates/learner-LICENSE` | 権利者が許諾可能な独自教材・コード・Skill向けMIT本文 |
| `THIRD_PARTY_NOTICES.md` | `training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md` | Inter、Noto Sans JP、Web JSから確認したReact・bezier-easing等の別著作権表示 |
| `licenses/OFL-1.1.txt` | `training/ai-assisted-qa-course/templates/learner-OFL-1.1.txt` | フォント用OFL-1.1本文 |

`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`では、3件のsource/target/role、配布元実在、READMEへの参照を検証するよう更新した。以前は`THIRD_PARTY_NOTICES.md`のファイル名だけ確認していたため、配布元の欠落を検出できなかった。

学習者READMEには、`pnpm course:assess M04 --model provider/model-id`（M07/M10も対象）の**外部AI評価**について、選択Phaseの教材/評価基準・本人回答・コード・Run証拠等の限定送信、Secret・個人情報・他Phaseデータの除外、非公開履歴、料金確認、`SEND provider/model-id`による送信前の対話確認を明記した。これは実装の`scripts/training/ai-assisted-qa-assessment.mjs`にある`confirmExternalSend()`と照合済み。受講者向けの通知追加であり、実モデル校正や料金保証を完了扱いにはしない。

**現時点の残条件**：配布元の存在とmanifest登録・CIでの配布契約テストに加え、確定した同一HEADでの`course:sync`実行後に3ファイルと実Shop全件が**実際に**出力され、distribution manifestのhash、禁止パス、symlink、本人の既存ファイル不変、Serve/Reset/Playwrightが成立するか確認する。固定Skill13種類の第三者由来ファイル、Web JSのその他の依存物、画像の権利・著作権者・配布通知は未確定。本人2コアCodespacesの無料枠と実行受入も未完了。公開作成の個別承認が必要であることは変わらない。

## 2026-11-01 再監査：ライセンス通知のビルド版依存と実Web Artifact

固定HEAD `708c7be0d6cb3a97050593f48939e073ef484bca`の[Web CI Run 41297580957](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41297580957)は**success**。当該Runの`web-dist-production` Artifact（ID `13080117556`、ZIP SHA-256 `e003e1b3e7b67d0cd0f62777e6206b38ad432517f8d7ec85b1393e91cb49a4c0`）を直接取得し、312ファイル・展開後25,509,496バイトを確認した。

`186`件のHTML/JS/CSS/Markdown/JSON等を対象に、代表的なGitHub Token、AWS Access Key、OpenAIキー、秘密鍵ヘッダー、GCPキー、採点用完成資料パスとsource map指定をパターン検査し、**検出0件**。採点用完成資料の禁止ディレクトリ、`.env`や`.map`に該当する配布ファイル名も検出しなかった。これは典型的な文字列・パスの一次検査であり、Secretや第三者の利用許諾の全件保証ではない。

**ライセンス通知の版ずれを発見・修正**した。旧ArtifactのWeb JSは`entry-21b4711df1c6db0566115828ee2d23ee.js`だったが、今回の実ビルドでは`entry-3428026f221adef0293a1a69747110f6.js`へ変わった。従来の`learner-THIRD_PARTY_NOTICES.md`は旧ハッシュ名を固定記載していたため、学習者が現行Template内で指している実ファイルを見つけられない。通知を`course/shop/_expo/static/js/web/entry-*.js`へ修正し、固定ハッシュの再混入を拒否する配布契約テストを追加した。新JSバンドルでもReact（Meta Platforms）およびbezier-easing（Gaëtan Renaudeau）の著作権表示があることを確認した。これは**全第三者依存の監査完了ではない**。

同じ固定HEADのGit treeと`qa-workflow-skills`固定commit `7cc6cba7772de549841a39d71694cbafbc783324`のGit treeを、配布manifestと再照合した。**local_files 140/140件、external_skill_files 104/104件**の配布元実在、外部Skillの宣言Blob SHA・サイズ、ファイルmode、配布先244件の重複なしを確認した。ライセンス3ファイルもGit Blobとして存在する。これは**配布元の静的整合性**であり、`course:sync`を実行して生成したTemplateの受入ではない。

**残条件**：この環境ではGitHubへ直接`git clone`できず、固定HEADのclean checkoutから実`course:sync`、配布後の全hash検証、Serve/Reset/Playwright、2コアCodespaces実Runは未実施。ライセンス通知の対象となる画像・JS依存・外部Skillの元著作者/再配布条件も全件未確定。最新変更HEADのCIと本実Web ArtifactのHEADを混同しない。公開Template作成、課金、製品コード変更、マージは別承認が必要。

## 2026-11-01 固定Skillの許諾根拠とCI検証の限界

`qa-workflow-skills`の固定commit `7cc6cba7772de549841a39d71694cbafbc783324`のGit tree（1,654 entries）を再調査した。ルートと子ディレクトリに一般的な`LICENSE`・`NOTICE`・`COPYING`名のファイルは見つからなかった。学習者へ同期する13種類の`SKILL.md`すべてを確認し、冒頭のfrontmatterに独立した`license:`、著作権者、外部原著作物の帰属は見つからなかった。リポジトリの`README.md`にも全体をMIT等で利用できるという許諾文は見つからなかった。

**この結果は「第三者の著作物が存在する」とも「違法な配布である」とも断定しない。** GitHubの同一ownerやcommit authorは、すべてのファイルに関する著作権者・再利用権の証明ではない。ユーザーが承認したMIT方針は権利者が許諾できる独自部分に限るため、公開前に外部Skill104ファイルの出典・翻案元・含まれる外部コード・権利者を確認し、必要なライセンス本文と原著作権表示を`THIRD_PARTY_NOTICES.md`等へ適切に反映する。確認できないファイルを**自作と推定してMITへ含めない**。

`qa-training-store/.github/workflows/ci.yml`の`Dependency Review` jobには`license-check: false`が設定されている。したがって、[Web CI Run 41299878485](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41299878485)のHEAD `7d75f68357aac23f3c7f4bbdcddbfa979f1bc1d1`での`success`（27成功・2スキップ）は、**コード品質・既存テスト等の成功**であって第三者の著作権/ライセンスの自動受入ではない。既存CI設定は製品用workflowの変更禁止範囲とし、この調査では変更していない。

現行の`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`は`courseFixture()`で1件の`dist/index.html`を作り、`syncCourse({allowUncommittedFixture:true, buildShop:false})`で同期・改ざん・非破壊性を検証する。一方、実配布入口の`scripts/training/ai-assisted-qa-course.mjs sync`は`verifySourceCheckout()`で40文字SHA・`HEAD`一致・clean worktreeを要求し、実`build:web`・104ファイルの外部取得・配布manifestのhash記録を実行する。**fixtureの成功を固定HEADでの実配布成功と読み替えない**。受入時には同一HEADで`pnpm course:sync --source-sha <HEAD> --target <空の既存ディレクトリ>`を実行し、その配布先で`node scripts/training/ai-assisted-qa-course.mjs verify-distribution`を実行する。結果に`distribution_files_verified`、`shop_files_verified`、`state_files_verified`、実行環境/終了コード/対象HEADを残す。その他の再同期・load・Serve/Reset/Playwright・実Codespaces受入は別途検証する。

**現時点の判断**：固定Skillの利用許諾と実配布の成功は未受入のまま。公開Template作成と製品workflow改変は実施せず、証拠と承認が揃うまで公開保留を維持する。
