# 第三者ライセンス・著作権表示

この配布物の `LICENSE` は、本人が権利を持つプロジェクト独自の教材・コード・Skillに適用するMIT Licenseです。ユーザー本人が作成した固定 `qa-workflow-skills` の13 Skill（commit `7cc6cba7772de549841a39d71694cbafbc783324`）も本人の著作物としてこのMIT Licenseの対象とし、本人は学習者Templateへの配布を承認しています。第三者の著作物や依存パッケージのライセンスをMITへ変更するものではありません。その他の素材については、配布元のGitHub所有者名だけで個々の著作権者を判断しません。

## Codexによる生成画像の出典

次の商品画像9件は、ユーザー本人の指示に基づきCodexを使用して生成したものです。この生成経緯を出典情報として記録し、外部画像サイトから取得した素材として扱いません。

- `public/images/products/basic-shirt-front.a1b2c3.webp`
- `public/images/products/basic-shirt-back.d4e5f6.webp`
- `public/images/products/color-pouch.webp`
- `public/images/products/compact-towel.webp`
- `public/images/products/mug.11aa22.webp`
- `public/images/products/premium-bag.webp`
- `public/images/products/retired.55cc66.webp`
- `public/images/products/running-shoes.33bb44.webp`
- `public/images/products/training-wear.webp`

第三者の既存作品を具体的に使用・複製した証拠が確認された場合に限り、その画像に対象を絞って出典と根拠を記録します。抽象的な可能性だけで同じ出典確認を繰り返しません。この扱いは、次節に記載するExpo Router／React Navigation等が配布する既存画像や、外部ライブラリのコード・素材には適用しません。

## 配布済みWebフォント

Web Buildの `course/shop/_expo/static/css/files/` に含まれる以下のファイルは、MITではなくSIL Open Font License 1.1（OFL-1.1）です。全文は `licenses/OFL-1.1.txt` を参照してください。各フォント内部の著作権メタデータとReserved Font Nameも維持します。

| フォント | 対象ファイル | 著作権表示（配布ファイル内のメタデータ） | ライセンス |
| --- | --- | --- | --- |
| Inter | `inter-latin-{400,600,700}-normal.woff{,2}` | Copyright 2016 The Inter Project Authors (`https://github.com/rsms/inter`) | OFL-1.1 |
| Noto Sans JPとして配布されるファイル | `noto-sans-jp-japanese-{400,600,700}-normal.woff{,2}` | (c) 2014-2021 Adobe (`http://www.adobe.com/`), with Reserved Font Name 'Source'. | OFL-1.1 |

配布元パッケージ：`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`。OFL公式サイト：[OFL公式](https://openfontlicense.org/) 。

## Expo RouterとReact Navigationの配布画像

`course/shop/assets/expo-router/**` に含まれるPNG12件は、Expo Routerおよび同製品が含むReact Navigation Elementsの配布画像です。配布先でファイル名にBuildハッシュが付くため、下記はフォルダ・ファイル種類で対象を示します。両者の元著作権表示とMIT Licenseを保持します。MIT全文は `LICENSE` を参照してください。

| 出典 | 対象画像 | 元の著作権表示 | ライセンス |
| --- | --- | --- | --- |
| [Expo Router](https://github.com/expo/expo/tree/sdk-57/packages/expo-router)（使用版 `expo-router@57.0.31`） | `assets/expo-router/` 直下のPNG7件 | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) | [MIT](https://github.com/expo/expo/blob/sdk-57/LICENSE) |
| [React Navigation Elements](https://github.com/react-navigation/react-navigation/tree/main/packages/elements) | `assets/expo-router/react-navigation/elements/` のPNG5件 | Copyright (c) 2017 React Navigation Contributors | [MIT](https://github.com/react-navigation/react-navigation/blob/main/packages/elements/LICENSE) |

この表示は該当する配布画像の出典を示すものであり、生成WebのJavaScript依存物すべての権利確認や、教材内の商品画像・仕様画面の素材利用権限を証明するものではありません。

React Navigation Elements配布画像の固定元revisionと、そのrevisionでの権利表示は未確認です。上記の`main`参照は固定版の一次根拠ではなく、当該画像の権利確認が完了したことを示しません。

## Web JavaScriptに含まれる第三者コード

Web CI Run [41297580957](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41297580957)（対象HEAD `708c7be0d6cb3a97050593f48939e073ef484bca`）の生成JavaScript `course/shop/_expo/static/js/web/entry-*.js`には、次の著作権・MITライセンス表示が含まれています。実際のファイル名にはBuildごとに変わるハッシュが付くため、この通知では固定しません。原文の表示を保持し、独自著作物のMITに帰属させません。

| 対象 | 著作権表示 | ライセンス |
| --- | --- | --- |
| React / react-dom / react-is / scheduler / use-sync-external-store-shim等 | Copyright (c) Meta Platforms, Inc. and affiliates. | MIT |
| bezier-easing | Copyright 2014-2015 Gaëtan Renaudeau | MIT |

MITの全文はこの配布物の`LICENSE`にも含まれますが、元の著作権者は上記のとおり別です。Webアプリの生成JSに含まれる依存物のライセンス・通知の**全件検査はまだ未完了**です。

## その他の配布物

- `.agents/skills/**` は[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)の[固定commit `7cc6cba7772de549841a39d71694cbafbc783324`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)から取得する本人作成の13 Skillです。本人の決定により既存MIT Licenseの対象として学習者Templateへ配布します。第三者由来と確認できる個別ファイルがあれば、そのファイルの元ライセンス・表示を分けて扱います。
- `course/shop/**` のJS/CSS/画像、依存ライブラリ、その他の第三者素材にはそれぞれの元ライセンスが適用されます。依存物と素材の全件確認は公開前監査の受入条件であり、この文書だけで全件の権利確認が完了したことにはなりません。

公開・再配布前に、実際に生成した `course/shop/**` と配布manifestを照合し、含まれる第三者ファイルの表示とライセンスを確認してください。
