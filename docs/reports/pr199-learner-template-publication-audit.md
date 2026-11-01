# PR #199 学習用公開Templateの公開前監査

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
