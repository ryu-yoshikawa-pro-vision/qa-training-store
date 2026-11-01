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
