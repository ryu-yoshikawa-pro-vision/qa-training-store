# PR #199：配布用Web ZIPと固定配布manifestの実ファイル監査（2026-11-07）

## 対象と方法

本監査はPR #199のHEAD `5f97f32e47b5991c8712f527f2e39e7e27efa348`で成功した[Web CI #42359608112](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42359608112)の以下のArtifactをダウンロードして検査した結果である。**このHEADより後の修正内容やMobile実動作の証拠には流用しない。**

| Artifact | ID | ZIP SHA-256 |
| --- | --- | --- |
| `pr199-course-distribution-42359608112-1` | [13568279521](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42359608112/artifacts/13568279521) | `017932dce077f4caaa7481dedfe044595ce5a73d1c1739a53a86c994f95b1bda` |
| `web-dist-production` | [13568463773](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42359608112/artifacts/13568463773) | `691fc5ea42b38732352c41c054cced59016e956f4eb910dea129e325ad05a142` |

実ZIPをPython標準`zipfile`で開き、CRC、パス、通常ファイル/Symlink、manifest登録パスとSHA-256、機密情報の既知パターンを走査した。追加でPNG/WebPをPillowでデコードし、EXIF/XMPに相当するメタデータの存在を確認した。manifestの`source_sha`は対象HEADと一致した。

## 検証結果

| 項目 | 結果 |
| --- | --- |
| Web ZIPファイル数 | 320件、展開合計25,654,131 bytes |
| 配布manifestの`generated-shop` | 320件（manifest全567件中） |
| ZIP重複・不正パス・Symlink・破損CRC・禁止パス | 各0件 |
| テキスト（UTF-8として妥当、制御文字なし） | 190件、7,217,475 bytes |
| 非テキスト | 130件、18,436,656 bytes（画像・フォント） |
| ZIP全ファイルのバイト列から検出したGitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLabの既知Token・秘密鍵ヘッダ・主な個人用メールドメイン | 0件 |
| 公開禁止の評価資料・旧教材のパス | 0件 |
| 配布先の同期前後SHA-256一覧 | 568行、両ファイルのバイト列が一致 |
| Web ZIPと配布manifestのパス・SHA一致 | 318件一致、2件不一致（下記） |

### 一致しない2件

- 生成JavaScript：Web ZIPには`_expo/static/js/web/entry-9a6449d71ef66199037e28d970e8aa9d.js`、配布manifestには`entry-3ec5aae50076f108a2e240b6d051d1bc.js`がある。パスの差であり、ZIP内に余分な登録外JSがあると断定しない。
- `index.html`：双方2,149 bytesだがSHA-256が異なる（manifest `021f11773f3997798b608660ec78fa98870ccaa4fbf8695955a8501b8ce2b3fd`／Web ZIP `6a289a697d5e0c3e223d53432d85b6f2f34c72a1256e2c6128fa989147f4db9a`）。

これらは**別のCIジョブがそれぞれBuildした配布物の比較**であるため、同一HEADでもバイト列の完全一致は主張しない。同一同期ジョブ内のmanifest整合と、別ジョブ間のBuild差分を分けて扱う。

### 画像・フォントと権利の限界

- 画像118件はデコード可能。確認したPNG/WebPメタデータにEXIF/XMPの項目は見つからなかった。これは**画像のピクセル内容に個人情報がないことの証明ではない**。
- 非テキスト130件の画像内容・フォント内部の全情報、未知形式のSecret、未列挙の個人情報、第三者の再配布許諾については今回のパターン検査では保証しない。
- 固定外部`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`の配布対象は13 Skill・105ファイルで、Skill原著作物のLICENSE/NOTICEと`THIRD_PARTY_NOTICES.md`の最終権利判断は未完了。**learner用LICENSEが存在することは外部Skillの再配布許諾を意味しない。**

## 判定と残タスク

今回の配布用Web ZIPについて、上記の**既知禁止パス・既知Secretパターン・ZIP整合の確認は完了**。ただし、Web/Templateの最終版一致、未知PII、画像の表示内容、外部Skill許諾、本人のPrivate環境、実モデルの送信保護および最終HEADの両CIは未受入とする。既存44受入条件のチェック状態を独断で変更しない。

次回の再開は、最終配布対象HEADのWeb Buildと同期配布を**同一ジョブの固定生成物**で照合し、画像内容・権利・個人データの独立確認を行い、確認できた実際のArtifactをCase/受入Planへリンクする。

## 2026-11-07 追加監査：成功済みHEAD `855cb40d0c6ae8f37e966437f6a676dae13218e2`

[Web CI #42362617820](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42362617820)（`completed/success`）の実Artifactを、上記と同じZIP展開・manifest SHA・禁止パス・既知Secret/個人メールパターン・画像デコードの手順で再検査した。

| 対象 | Artifact ID | ZIP SHA-256 |
| --- | --- | --- |
| `web-dist-production` | [13569854511](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42362617820/artifacts/13569854511) | `e93385024bf2ee57763606a4f5da74779eacfc222f790fc9a5ccd65b39bdb350` |
| `pr199-course-distribution-42362617820-1` | [13569623511](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42362617820/artifacts/13569623511) | `45b0d33474f9ad2bd09a59b32069c67b6b660b06f012fedf621bfbd88b0ca3f6` |

- 配布manifestの`source_sha`は`855cb40d0c6ae8f37e966437f6a676dae13218e2`、全登録567件、Shop生成320件。Web ZIPも320件。**318件のパスとSHA-256が一致**。
- 別ジョブ間の差：manifestは`_expo/static/js/web/entry-61f21d6bec9fba9fcb532130bdb71009.js`、独立Web ZIPは`entry-05166bf8c94b0d2d5cddc620a54c298c.js`を生成。`index.html`のSHA-256もmanifest `e7a50642913f38e60c9d38240a7c2282ef3a8ba1a76b6b50e4931bb10bb70dff`、独立Web ZIP `edd1691cbe12c711c321cf9d642d2f83b0b014f3146a1eb57285cf08a7989afa`で異なる。**別ジョブの完全一致と主張しない**。
- 配布同期前後のSHA一覧は568行がバイト単位で一致。Web ZIPは重複0、CRC破損0、Symlink0、禁止パス0、空/サイズ不一致0。テキスト190件・7,217,475 bytesを識別し、全320ファイルのバイト列に既知のGitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLab Token形式・秘密鍵ヘッダ・主要個人用メールドメインの検出0。画像118件はデコード可能、確認したEXIF項目0。
- この検査で未知PII、画素中の個人情報、フォントの権利、外部Skillの再配布許諾を保証しない。後続のCase追跡テスト変更によってPR HEADが移動しているため、`855cb40`を最終HEADの合格証拠へ流用しない。本人のPrivate配布は未実施。

**判定**：このHEADの公開ZIP実体の既知禁止物検査・配布同期整合は完了。Web生成ジョブとcourse同期ジョブの完全バイト一致、公開前の全資料・権利・個人データ監査は未完了のまま。

## 2026-11-08 追加監査：HEAD `b37df6084eb9303aec24fd6e08afc839a6e3aacd`

同HEADの[Web CI #42395158961](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42395158961)が生成したArtifact 3件を取得し、ZIP実ファイルをPython標準`zipfile`と`hashlib`で検査した。**Web CI全体は`Chromium E2E (cross-role)`が失敗して`completed/failure`。配布ジョブの成功とWeb CI全体の合格は区別する。**

| ZIP Artifact | ID | ファイル数 | ZIP SHA-256 |
| --- | ---: | ---: | --- |
| [`pr199-course-distribution-42395158961-1`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42395158961/artifacts/13583128084) | 13583128084 | 7 | `10e5bcf316d8ddb34128cac326489977657214cefc4d60afac981d667f04c69e` |
| [`web-dist-production`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42395158961/artifacts/13583575325) | 13583575325 | 320 | `bf9bbaa3361c0e6f502a9b89d8c80d04ba4e51d3b5f06bb369fae2a271a19414` |
| [`spec-site-automation`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42395158961/artifacts/13583561004) | 13583561004 | 116 | `c594c9416e78861b76797eee4866515b766770a9f2592eb128b7aa70488c4b41` |

- 配布manifestの`source_sha`はHEADと一致。全登録567件（`generated-shop` 320・`local` 142・`external-skill` 105）、配布先重複0。同期前後SHA一覧568行の内容はバイト列一致。
- Web ZIPは320件、展開25,654,131 bytes。Shop登録320件と319件でパスが一致し、そのうち318件はSHA-256一致。別ジョブが生成した`entry-*.js`のファイル名と`index.html`のSHAが異なるため、同一HEADでも別ジョブ間の完全一致は証明しない。
- Web ZIPのテキスト190件（7,217,475 bytes）・非テキスト130件（18,436,656 bytes）。3つのZIPの公開禁止パス、ZIP重複、Symlink、空ファイル、CRC破損は検出0。全ファイルのバイト列を対象とするGitHub/OpenAI/AWS/Google/Slack既知Token形式・秘密鍵ヘッダ・主要個人メールドメインの正規表現検出は0件。未知PII、画像内容、フォント内情報、再配布許諾の保証ではない。
- **配布ガードに不足を確認**：`manifest.json`の`**/.env*`に対し、`scripts/training/ai-assisted-qa-course-core.mjs`の`FORBIDDEN_PATH`は`.envrc`・`.environment`を拒否せず、`.kube/config`も禁止対象外だった。一方`.env_backup`と`.env.local`は従来から拒否できる。現Artifactの混入ではなく、将来の生成Shop/manifest登録の検証漏れ。共通ガードと既存契約テストに負例を追加する。**修正後HEADのCIが成功するまで受入未確定**。

**マージ前の作業1は未完了。** 固定Skill 105ファイル・Web JS/フォント/画像の権利/NOTICEの全件確認、公開禁止情報の独立監査、許諾の解消が必要。Web CI全体が失敗しているため、最終CIも未完了。

## 2026-11-23 現行ガードとの照合

- 2026-11-08の上記「配布ガードに不足」の記述は当時のHEAD `b37df6084eb9303aec24fd6e08afc839a6e3aacd`で観測した履歴として維持する。後続commit `cd7dbce79ceb0afda26befef18afe9717aba1770`で`FORBIDDEN_PATH`が`.env*`と`.kube/**`を拒否し、既存Distribution contractにsource/destination manifestとgenerated Shopの負例が追加された。
- 現行ソースの`FORBIDDEN_PATH`は`.envrc`、`.environment`、`.kube/config`を含む上記パスを拒否する。これはmanifest/path guardの回帰証拠であり、最終HEADの実Web/Template/ZIP Artifact全走査や未知PII・画像内容・著作権の監査を代替しない。
- 2026-11-23時点では最終作業HEADが未確定で、最終HEADのArtifact全実体走査は未実施。B案1.2の判定は未受入のまま維持し、同一最終HEADのCI生成物が利用可能になった場合にのみその実ファイルを監査する。

## 2026-11-23 06:05 JST 追加確認：HEAD `49af44d72a4fcbd14e393e56b3e07c2346b0cd03`

対象はWeb CI [#45063620677](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45063620677) のArtifact。Web CIとMobile App CI [#45063620660](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45063620660) は同じHEADでSUCCESS。artifact一覧と実体を再取得し、ZIPパス・CRC・manifest・既知Secret patternを検査した。

| Artifact | ID | entries / compressed ZIP bytes | ZIP SHA-256 |
| --- | ---: | ---: | --- |
| `web-dist-production` | 14770088637 | 320 / 19,612,027 | `dc6eaf3c628a78499611a8101d184926b1111030ec1b6964ba30109e2df47079` |
| `web-dist-automation` | 14770687052 | 320 / 19,612,027 | `9fd3f229a96c0bb1afe569590a377b8f1e31e67f7cbbcb771cfbd73a5906ee30` |
| `spec-site-automation` | 14770501644 | 116 / 6,510,466 | `405ededec192401fdc54e9527a04e3a70a397843a098ac1b1de6ff5b2618ab24` |
| `pr199-course-distribution-45063620677-1` | 14770806464 | 7 / 119,494 | `bb872205cbbd2cbd0d2d6ff104e352b75bf49683074498c92ea1fea203a99ed6` |

- 全4 ZIPでCRC error、duplicate path、absolute/parent traversal path、symlink、禁止file nameは0件。既知GitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLab token、秘密鍵header、主要個人メールdomain patternのmatchは0件。これは未知Secret/PIIを否定する検査ではない。
- course distribution evidenceの`qa-course-distribution-manifest.json`はSHA-256 `9ad238a9dc0a6d935d516e0d36da0536252210ff4b3b22e98f0d4e61808ae876`、source SHAはHEAD。567配布fileはgenerated Shop 320、local 142、external Skill 105。before/after SHA一覧は各568行で内容が一致し、manifest target pathの重複・unsafe・禁止pathは0件。manifest flagsはreference solutions / scoring tests / completed states / secretsを含めない。
- Production Web ZIPとcourse-sync manifestのgenerated Shopは318/320 fileでpath・SHAが一致。1つの`entry-*.js`はfile hash由来名が別jobのBuildで異なってmanifestのpathに存在せず、`index.html`もSHAが異なる。これは独立Build間の比較であり、course-sync job内の検証ではsource SHAと同期前後file hashesが一致している。完全同一の生成物とは主張しない。
- ProductionとAutomation ZIPは320 pathの集合が異なる。異なるpathは両Buildそれぞれの`_expo/static/js/web/entry-*.js`と`index.html`。Build kind別の独立成果物として扱い、同一artifactの複製とは扱わない。
- Spec ZIPは116 entriesで、asset pathの不正やzip破損は検出されなかった。画像ファイル118件（Web artifact）と94件（Spec artifact）はPython Pillowが利用できず、pixel内容、EXIF/XMP相当metadataの検査を実施していない。
- course distribution artifactはmanifest、before/after SHA一覧、knowledge graphの検証・impact evidenceのみを収録し、実learner template／distribution ZIPのpayloadを含まない。したがってtemplate全ファイルの実体検査は未完了。
- local regenerationも試した。通常`course:sync`はWSL checkout外のLinux依存package pathをShop assets由来のtarget pathへ変換し、distribution path guardが`course/shop/assets/______home/...`を拒否した。CI Web ZIPをShop buildに指定した再生成は、external fixed Skill fetchの`raw.githubusercontent.com` DNS `EAI_AGAIN`で停止。どちらもソース変更やArtifact内容の変換をせず、環境制約として記録。

**B案1.2判定：未受入（BLOCKED、部分実検査のみ）。** Web/Specの取得ZIPとcourse evidenceの既知pattern・path検査は完了したが、実learner template payloadがCI Artifactに存在せず、template全体・画像の表示内容/metadataを検査できていない。再開条件は、最終HEADの実template/ZIPを再現可能なCI Artifactとして取得し、同一HEADでそのpayload全体と画像内容を確認すること。1.3/1.4の権利監査とは独立し、許諾を推測しない。

## 2026-11-23 B案1.4：第三者ライセンス現行確認

この追記はB案1.4の第三者ライセンス確認だけを扱う。配布物全体のSecret／PII監査である1.2は未受入のままIssue #228で継続する。

### Expo Routerへ同梱されたReact Navigation画像5件

候補HEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`のroot `pnpm-lock.yaml`は`expo-router@57.0.31`をtarball integrity `sha512-a1JskzAVbIFi9POmayde7U7TkvQHiK5NR2vqTeu4PbU+6oNg9dnsBRmP1kNimDjJJCj6VrGlKPhXASICeFOyYA==`で固定する。Expoの固定source commit `76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6`にある`packages/expo-router/package.json`はversion `57.0.31`・MITを示し、同commitの`src/react-navigation/elements/index.tsx`が下記の5 PNGをimportする。Expo package配下のPNGとReact Navigationの固定版`@react-navigation/elements@2.9.10`の各source PNGはGit blob SHA-1が全件一致した。

React Navigationのversion tag `@react-navigation/elements@2.9.10`は署名検証済みannotated tagで、そのtag object `b4349722e9560f2ddbe8f2e6097b0605f053aec8`はcommit `69573410534dc9a467ace6e749e82d32058b3092`を指す。同commitの`packages/elements/package.json`はversion `2.9.10`・MIT、同directoryの`LICENSE`はCopyright (c) 2017 React Navigation ContributorsとMIT全文を示す。root lockfileにこのpackageの直接依存はなく、Expo Routerに同梱された画像sourceとして扱った。

| PNG source | React NavigationとExpo Routerで一致したGit blob SHA-1 |
| --- | --- |
| `back-icon-mask.png` | `7c1fd8493d91711b33e87bd36d6e9ae4363ed656` |
| `back-icon.png` | `17e52e8550e5668f7117bcb755beb70c3a21c9e9` |
| `clear-icon.png` | `d9af7b68070ef97abf8b805a32b99bdb7e2c340d` |
| `close-icon.png` | `34396d478f85572dd50c67a708cd3a752d785005` |
| `search-icon.png` | `87a30caff95ccb0bc812f8ee77abbe8a7a8f0ac6` |

一次根拠：[Expo Router 57.0.31 package metadata](https://github.com/expo/expo/blob/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router/package.json)、[ExpoのReact Navigation Elements import](https://github.com/expo/expo/blob/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router/src/react-navigation/elements/index.tsx)、[Expo root MIT LICENSE](https://github.com/expo/expo/blob/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/LICENSE)、[React Navigation Elements 2.9.10 metadata](https://github.com/react-navigation/react-navigation/blob/69573410534dc9a467ace6e749e82d32058b3092/packages/elements/package.json)、[同versionのLICENSE](https://github.com/react-navigation/react-navigation/blob/69573410534dc9a467ace6e749e82d32058b3092/packages/elements/LICENSE)。5件の個別比較は[learner NOTICE](../../training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md)にも記録した。

`learner NOTICE`と`scripts/docs/repair-expo-router-web-assets.ts`が生成する`assets/expo-router/LICENSE`を同じ固定source／versionへ更新した。Build処理はpackage名・version `57.0.31`・MITのいずれかが一致しなければ停止し、contract testはNOTICEの固定commitとpackage version guardを確認する。

### 現行Web Bundleの依存閉包

現checkoutに`course/shop/**`はなく、既存ignored `dist/`のentry bundleを候補HEADから生成したとは確認できず、source mapも存在しない。候補HEAD `24944a73…`のGit archiveで`pnpm install --offline --frozen-lockfile --ignore-scripts`を試したが、pnpm storeに`@expo/metro-runtime@57.0.18`がなく`ERR_PNPM_NO_OFFLINE_TARBALL`で停止した。旧remote HEAD `00670f8ca016845e288f019ae5ad160ca1eca051`のWeb CI run `45071575804` artifact `14773985467`はGitHub download APIから一時file URIを取得できたものの、checkoutのツール群から内容を読み出せず、shell経由のsigned URL取得もhostのDNS解決に失敗した。artifactは候補HEADと異なり、候補由来source mapもない。したがってbundleのmodule closure、含有packageごとのfixed version、license本文とNOTICEの完全な対応は未確認。履歴HEAD `708c7be0…`のReact関連・`bezier-easing`表示を最新Bundleの全依存へ転用しない。

**B案1.4判定：部分確認。React Navigation PNG5件の出典・version・MIT・著作権表示はPASS。Web Bundle依存閉包が未確認のため1.4全体はBLOCKED。** 必要な再開証拠は最終HEADのWeb production bundleとsource map（または同じ依存閉包を確定できるBuild証拠）、含有package一覧、versionごとのlicense／copyright／NOTICE対応である。未確認依存をMITと推定しない。商品画像9件のCodex生成出典および固定13 Skillの本人決定はこの監査に戻さない。

### 2026-11-23 後続確認：凍結依存のWeb Bundle解析

以下は先行節の「Bundle/source mapを確認できない」という当時の結果を保持したうえで、同日後続の追加確認を記録する。PR branchは`24944a73f769d32f38061a26fce5911e2cbb8bc5`を基点とし、lockfileを変更せず`pnpm install --frozen-lockfile --store-dir /tmp/qa-training-store-pr199-store`でNode `v24.22.2`／pnpm `10.34.5`を用意してWeb exportした。依存物のsource mapは一時領域にのみ生成し、CI/public artifactへsource mapを追加していない。

| 証拠 | 実測 |
| --- | --- |
| Web export bundle | `entry-2eacba5967e32f773219f7b9a8ab134a.js`、source-map buildで3,739,363 bytes、SHA-256 `638f0265cceeb3aebe140366eb9b7af33d2696933f6550a68a183b8f633277bc` |
| Source map | 13,936,040 bytes、SHA-256 `0b6bc4b6c3b7b9294c64621923fd29b4b03bcd8bad5a3b8e513e60e6841d4027`、2,326 source entries、61 package/version |
| frozen dependency records | root `pnpm-lock.yaml` tarball integrityと解決済み`node_modules` metadata／LICENSE・NOTICEを照合。MIT、Apache-2.0、BSD-3-Clauseのライセンス全文と確認できた著作権表示をlearner NOTICEへ記録 |
| 旧HEADのCI Web Artifact | Run `45135921223`、artifact `14799488416`、GitHub SHA-256 `b2adea79b56a1686c542537e2f746da84209a345b452ca20bb6767e7ab4823d1`と取得ZIPのhashが一致。320 entries、symlinkなし、source mapなし。`_expo/static/js/web/entry-570e4a28f5ddd4b416fb29b6de7f6f8e.js`は3,739,296 bytes、SHA-256 `4ae89b2284098840098997e3c6455667daddc55f8d7739ed30c5963ab881e455` |

source-mapped local buildは調査用の再現可能な解析出力であり、GitHub production artifactとbyte-identicalとは扱わない。旧HEADのGitHub artifactにはWeb entry bundleと画像用`assets/expo-router/LICENSE`だけがあり、全依存のnotice/mapは含まない。新しい`repairExpoRouterWebAssets`はTemplateの固定区画を`dist/THIRD_PARTY_NOTICES.md`へ生成するため、今回追加commitのWeb CI Artifactで実出力を確認する。

Bundle source mapで確認した`client-only@0.0.1`は空の`index.js`のみで、`error.js`は含まれず、当該package由来のsource byteはない。対して`standard-navigation@0.0.5`の`lib/src/index.js`は186 bytesでBundleに含まれる。package metadataはMIT・author `Satyajit Sahoo`を示すが、解決済みpackage内にLICENSE／著作権表示がなく、固定source tree [commit `0016fae7800b9f27bab91326697b740a6d2266dc`](https://github.com/react-navigation/standard-navigation/tree/0016fae7800b9f27bab91326697b740a6d2266dc)にもLICENSEがない。author metadataを著作権根拠へ読み替えない。これが現時点で特定した具体的な未解決対象であり、権利侵害を確認したとの結論ではない。

**2026-11-23現行1.4判定：BLOCKED。** 依存閉包の大部分、実バージョン、宣言ライセンス、確認できた著作権表示と必要ライセンス全文は通知へ反映したが、`standard-navigation@0.0.5`に適用する著作権表示を特定できない。外部Web配布は行わない。再開条件は当該packageの権利者による一次著作権表示根拠を取得して通知へ記録するか、承認済み製品変更で当該コードがBundleから除外されたことを新しい最終HEADで確認すること。後者はPR #199の製品SUT変更境界外である。

### 2026-11-23 追加review指摘：OFLフォント通知出力

独立の差分reviewで、Web Buildが同梱する`@fontsource/inter@5.3.0`および`@fontsource/noto-sans-jp@5.3.0`の12 font filesについて、`learner NOTICE`のOFL-1.1節が公開通知markerの外にあり、Build生成物にライセンス全文が含まれない指摘を受けた。OFL本文は既存の`learner-OFL-1.1.txt`を正本としている。

修正ではWeb font 2系統の版・12ファイルpattern・元copyright／Reserved Font Name・OFL-1.1をpublic Web notice区画へ追加し、postprocessorが固定Templateの区画を`dist/THIRD_PARTY_NOTICES.md`へ、OFL本文を検証後`dist/OFL-1.1.txt`へ出力するようにした。空のWeb JS directoryではbundle通知を出力しない。contract testはmarker抽出、OFL file copy、empty JS directory、Expo Router 12画像と既存拒否ケースを含む8/8 PASS。実Web Buildでdist内の両通知ファイルと12 font assetsが揃うことは、この追記時点では未実行で、後続`build:web`で確認する。

この追加表示契約は先行1.4判定の根拠を更新するが、`standard-navigation@0.0.5`の著作権表示不足を解消しない。したがって1.4は引き続きBLOCKEDで、外部配布は不可。

### 2026-11-23 local candidate Web Buildの出力確認

復元した10ファイルを含むlocal candidateを、frozen-lockfile依存で`pnpm run verify`後に`pnpm run build:web`で再生成した。NOTICE重複行整理後のBuildもexit 0。Web JavaScriptは`dist/_expo/static/js/web/entry-2eacba5967e32f773219f7b9a8ab134a.js`（3,739,226 bytes、SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`）。`dist/THIRD_PARTY_NOTICES.md`は24,009 bytes（SHA-256 `4a0970b8770c771bd759a8cd5a63adf834a8132f2d6a39d4c157e858536d2fc8`）で、public marker内の配布通知を生成した。`dist/OFL-1.1.txt`は4,004 bytes、SHA-256 `92df93e7fa51c9c96dea4f8d3149f79be3407162f805595e60c7c2a17e314deb`で、Templateの`learner-OFL-1.1.txt`とbyte-identical。12 font assetsとReact Navigation PNG5件がdistに存在した。

生成NOTICE inventoryは61 unique package/versionに重複がなく、`client-only@0.0.1`と`standard-navigation@0.0.5`の記載は各1行。`client-only`のpackage source bytesはBundleにない一方、`standard-navigation@0.0.5`の186-byte sourceはBundleに含まれる。このpackageのMIT metadataは確認済みだが、適用可能なcopyright noticeを確認できないため、外部配布を停止しB案1.4はBLOCKEDのまま。権利侵害を確認したとの判断ではない。

このBuildはGitHub CI Artifactではなく、push前のlocal candidateの証拠である。最終commit後の同一HEAD CI Artifact／SHAは別途8.3で確認し、旧HEAD `24944a73…` のCI結果・Artifactを転用しない。

### 2026-11-23 symlink出力先review指摘と修正

独立レビューで、`existsSync`がdangling symlinkをfalseと扱うため、NOTICE/OFLの`writeFileSync`がlink targetへ書き込める経路を指摘された。`repairExpoRouterWebAssets`に出力dirとJS出力までの各path componentを`lstat`で確認するguardを追加し、生成NOTICE/OFLのdestinationも`lstat`で存在確認してsymlink・非regular fileを拒否する。ENOENTだけを未存在として扱う。契約テストにdangling NOTICE symlinkおよびsymlink dist rootの拒否・外部targetが作られないassertionを追加した。focused `web-public-build.test.ts`は10/10 PASS。独立レビュアーは修正後の2負例と出力経路を確認し、P0–P2指摘なしと報告。修正後`pnpm run verify`もexit 0（Contracts 125 files、1,456 passed／7 skipped、unit 66、integration 197、repository 150／1 skip、component web 127／native 92、Build含む）。

修正前の`pnpm run verify`はexit 0（125 files、1,454 pass／7 skip、Web/Spec Build含む）だったが、その後にこのP2修正を加えたため、修正後結果で置き換えず別の実行証拠として扱う。GitHub CI Artifactはまだ追加commit前で未確認。

## 2026-11-23 追加HEAD `dc9408b90f8009cb8d87de2e774306e4ca392682` Web Artifact／配布ガード調査

Web CI [#45172067403](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45172067403)のproduction Artifact `14817077162`を取得。APIのartifact digestとZIP SHA-256 `21292446a3709f8294c46c465a5f429dd6d0e9e3551a8fdce4f6d23fbff47668`が一致した。ZIPは322 entries、CRC failureなし。source mapは含まれていなかった。

| 実ファイル | bytes | SHA-256 |
| --- | ---: | --- |
| `_expo/static/js/web/entry-819ddc18c83e19678e8b437f7e98480a.js` | 3,739,296 | `0475df1591a675c3c936a0a358680293e8b439c3515716544ad640d508102378` |
| `THIRD_PARTY_NOTICES.md` | 24,009 | `4a0970b8770c771bd759a8cd5a63adf834a8132f2d6a39d4c157e858536d2fc8` |
| `OFL-1.1.txt` | 4,004 | `92df93e7fa51c9c96dea4f8d3149f79be3407162f805595e60c7c2a17e314deb` |

このCI Artifactの`THIRD_PARTY_NOTICES.md`に含まれたGmail連絡先が、`Full learner distribution (#199)`と`M06/M07 actual course:run`で同じpublic-content guardに拒否された。`verify`はrequired-result依存エラーであり、独立した3つ目の原因ではない。NOTICE作成変更に直接起因する入力内容上の不整合として分類し、scannerやセキュリティ条件は変更せず、公開側の帰属表から連絡先メールだけを除く。各copyright holder、年、package/source表示は残す。
その候補を使ったlocal `pnpm run build:web`はexit 0。生成JS SHA-256は`611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`、`THIRD_PARTY_NOTICES.md`は23,898 bytes/SHA-256 `2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`、OFL全文は4,004 bytesでsourceとbyte-identical。Template/生成NOTICEでemail patternは0。`tests/contracts/web-public-build.test.ts`は10/10 PASS。course syncはdirty worktreeを拒否したため、修正後のdistribution gateは新しいclean commit上で再確認する。

依存分析の限界：同じSHAのproduction ZIPにはsource mapがない。61 package-version／2,326 source-entry inventoryは同SHAと同じfrozen lockfileを用いたlocal source-map Buildから得た証拠であり、GitHub production artifactにsource mapが含まれるとは主張しない。具体的な1.4 blockerは引き続き、実bundleにある186-byte `standard-navigation@0.0.5/lib/src/index.js`と、固定source/packageに適用できるcopyright noticeを確認できないこと。侵害の認定ではないため、外部配布は停止し、rightsholderの一次通知または承認された除外変更を再開条件とする。

## 2026-11-23 clean learner distribution revalidation

Commit `0324dbd260043fd356178262159d917ec0cad606`のclean source treeで`pnpm course:sync --source-sha 0324dbd260043fd356178262159d917ec0cad606 --target <TEMP_ROOT>/pr199-course-sync-0324dbd2`を実行。初回はsandboxのraw GitHub fetchが失敗したが、固定公開revision／同一HEAD assessmentへのread-only networkアクセスを許可した再実行でexit 0。配布先の`verify-distribution`もexit 0（569 distribution files、Shop 322、state 22、assessment references 17）。同期済みWeb NOTICE SHA-256は`2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`、entry JS SHA-256は`611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`。配布先NOTICEのemail patternは0 hits。これはlocal candidate evidenceであり、最終PR HEADのproduction Artifactではない。1.4の`standard-navigation@0.0.5`著作権表示はなお未特定のため、外部配布を停止してBLOCKEDを維持する。
