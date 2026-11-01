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
