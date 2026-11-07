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
