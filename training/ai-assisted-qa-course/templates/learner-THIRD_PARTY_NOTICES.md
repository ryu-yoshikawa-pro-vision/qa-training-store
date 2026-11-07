# 第三者ライセンス・著作権表示

この配布物の `LICENSE` は、`ryu-yoshikawa-pro-vision` が許諾する権利を持つ独自の教材・コード・Skillに適用するMIT Licenseです。第三者の著作物や依存パッケージのライセンスをMITへ変更するものではありません。配布元のGitHub所有者名は個々の著作権者を証明しません。

## 配布済みWebフォント

Web Buildの `course/shop/_expo/static/css/files/` に含まれる以下のファイルは、MITではなくSIL Open Font License 1.1（OFL-1.1）です。全文は `licenses/OFL-1.1.txt` を参照してください。各フォント内部の著作権メタデータとReserved Font Nameも維持します。

| フォント | 対象ファイル | 著作権表示（配布ファイル内のメタデータ） | ライセンス |
| --- | --- | --- | --- |
| Inter | `inter-latin-{400,600,700}-normal.woff{,2}` | Copyright 2016 The Inter Project Authors (`https://github.com/rsms/inter`) | OFL-1.1 |
| Noto Sans JPとして配布されるファイル | `noto-sans-jp-japanese-{400,600,700}-normal.woff{,2}` | (c) 2014-2021 Adobe (`http://www.adobe.com/`), with Reserved Font Name 'Source'. | OFL-1.1 |

配布元パッケージ：`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`。OFL公式サイト：[OFL公式](https://openfontlicense.org/) 。

## Web JavaScriptに含まれる第三者コード

Web CI Run [41297580957](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41297580957)（対象HEAD `708c7be0d6cb3a97050593f48939e073ef484bca`）の生成JavaScript `course/shop/_expo/static/js/web/entry-*.js`には、次の著作権・MITライセンス表示が含まれています。実際のファイル名にはBuildごとに変わるハッシュが付くため、この通知では固定しません。原文の表示を保持し、独自著作物のMITに帰属させません。

| 対象 | 著作権表示 | ライセンス |
| --- | --- | --- |
| React / react-dom / react-is / scheduler / use-sync-external-store-shim等 | Copyright (c) Meta Platforms, Inc. and affiliates. | MIT |
| bezier-easing | Copyright 2014-2015 Gaëtan Renaudeau | MIT |

MITの全文はこの配布物の`LICENSE`にも含まれますが、元の著作権者は上記のとおり別です。Webアプリの生成JSに含まれる依存物のライセンス・通知の**全件検査はまだ未完了**です。

## その他の配布物

- `.agents/skills/**` は[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)の[固定commit `7cc6cba7772de549841a39d71694cbafbc783324`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)から取得します。MIT対象となるのは権利者が許諾可能な自作部分のみです。外部から採用したコード・資料が含まれる場合は、その元ライセンスと表示を維持します。
- `course/shop/**` のJS/CSS/画像、依存ライブラリ、その他の第三者素材にはそれぞれの元ライセンスが適用されます。依存物と素材の全件確認は公開前監査の受入条件であり、この文書だけで全件の権利確認が完了したことにはなりません。

公開・再配布前に、実際に生成した `course/shop/**` と配布manifestを照合し、含まれる第三者ファイルの表示とライセンスを確認してください。
