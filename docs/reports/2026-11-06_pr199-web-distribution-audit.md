# PR #199 公開Web生成・配布受入の検証記録（2026-11-06）

## 変更範囲

- 対象ブランチ：`docs/plan-ai-agent-qa-curriculum-redesign`、調査開始HEAD：`76344d6530876e6eddae4bc5b0eba21374d14036`。
- 生成処理修正：`scripts/docs/build-docs.ts`、新規 `scripts/docs/repair-expo-router-web-assets.ts`、新規 `tests/contracts/web-public-build.test.ts`。修正commit：`1a858a73fd8ec0a17f8ae966750e257a5c29fc6e`。
- #218所有の配布manifest、validator、配布契約テスト、#210所有の製品SUTやSeed/Reset、#214〜#217・#219固有処理、#215所有の共有CI workflowは変更していない。

## 原因と修正

1. Expo export後のJavaScript bundleは12のPNG参照を `/assets/node_modules/.pnpm/.../expo-router/assets/` に残すが、`dist` に実ファイルを出力していなかった。`build:docs`入口で該当PNGだけを実インストール済みExpo Router packageから参照し、MIT許諾・PNGヘッダー・非空を確認して `dist/assets/expo-router/**` に配置、公開URIへ書き換える。未解決の内部資産パスは例外として停止。Expo Router/React NavigationのMIT表示を同梱。
2. `build-docs.ts`が旧教材のMarkdownルート直下資料5件までHTML化し、既存の目次/レッスンから12リンクを生成していた。生成対象の選別で5件を除外し、公開する旧レッスン/目次内の5件へのリンクを非リンク化する。M00〜M10の生成元は変更しない。

## 実Artifact比較

| 検査項目 | 修正前 | 修正後 |
| --- | ---: | ---: |
| GitHub Actions | [#42148338991](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42148338991) | [#42153712878](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42153712878) |
| HEAD | `76344d6530876e6eddae4bc5b0eba21374d14036` | `1a858a73fd8ec0a17f8ae966750e257a5c29fc6e` |
| `web-dist-production` Artifact ID | `13470714401` | `13474021574` |
| ファイル数 | 312 | 320 |
| 画像12 URIの参照先欠落 | 12 | **0**（12/12実体解決） |
| 画像URIの `.pnpm` 内部パス | 12 | **0** |
| 旧教材HTML | 5 | **0** |
| 旧教材HTMLへのリンク | 12 | **0** |

除外ページ：`docs/curriculum/00_learning-design.html`、`01_spreadsheet-test-design.html`、`02_competency-rubric.html`、`03_instructor-reference.html`、`04_learning-effort-reference.html`。

修正後Artifact320ファイルをZIPから読み取り、HTMLの`src`/`href`/`srcset`/`imagesrcset`のローカル参照3,626件、CSS `url()`/`@import`のローカル参照12件を独立して走査し、欠落はいずれも0件。空ファイル0件、禁止パス0件、既知GitHub/OpenAI/AWS Secret・秘密鍵のパターン一致0件。M00〜M10教材11件、演習11件、クイズHTML/JSON各11件が存在。対象PNG12件とライセンス表示1件が追加されている。

この静的走査はJavaScriptの任意動的参照、全バイナリの意味、未知の個人情報、第三者素材の再配布許可まで証明しない。現物監査の対象HEADと、修正後最終HEADのWeb CIを混同しない。

## テストと未解決条件

- 回帰テスト：12画像URIの書換・配置・MIT表示・再実行、欠落/空画像・ライセンス不明・内部パスの拒否、旧5ページの選別・Markdownリンク除外・コードフェンス保持を追加。生成物の確認と単体負例テストは別判定する。
- #218最新HEAD `17c0cf734727ad73e224e61752cf3d50423a5092` は [Web CI #42053275732](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42053275732)成功。ただし#218のvalidator、Markdown配布先依存閉包と固定Skill 13件/105ファイルの変更は#199の修正HEADに未統合。
- 今回のローカル環境にはcleanなGit checkoutと `pnpm` がなく、GitHubへ直接Git通信できない。GitHub連携はコード/PR/CI/生成Artifactの確認・commit・pushを提供するが、`course:sync`や受講者Templateの実行環境を提供しない。**同じ固定commitでの実Shop全量同期・再同期・`verify-distribution`は未実施**。
- #218の配布実装が担当者の承認済み手段で#199へ統合された後、cleanな固定HEADを用意し、Node24・pnpm10.34.5、GitHub固定Skillの取得権限を備えた環境で以下を実行する。`source_sha`40桁と教材revision64桁を別々に検証し、manifest/固定Skill/配布ファイルSHA-256、負例、学習者の任意ファイルの非破壊性を証拠に残す。

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build:web
SOURCE_SHA="$(git rev-parse HEAD)"
TARGET="$(mktemp -d)"
pnpm course:sync --source-sha "$SOURCE_SHA" --target "$TARGET"
(cd "$TARGET" && node "<source-root>/scripts/training/ai-assisted-qa-course.mjs" verify-distribution)
# 学習者の独自ファイルを置き、同じSOURCE_SHAで再同期してバイト不変性を照合
pnpm course:sync --source-sha "$SOURCE_SHA" --target "$TARGET"
```

未実行の通常AI送信保護、Web版表示、独立正式AI評価、本人Private Codespaces・実モデル・権利の最終受入は、この作業で完了扱いにしない。
