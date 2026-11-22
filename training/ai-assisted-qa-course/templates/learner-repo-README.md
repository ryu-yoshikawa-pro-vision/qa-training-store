# AI協働QA 学習用リポジトリ

このリポジトリは、公開の`qa-training-store`で管理される教材・専用実行環境から、確定したsource commitと配布許可リストを使って生成されます。リポジトリのルートに製品全体のソースコードや採点用模範解答は含めません。

## 学習の始め方

1. この公開Templateで **Use this template → Create a new repository** を選択し、自分のアカウントに**非公開**リポジトリを作成します。公開forkを非公開へ変更する方式ではありません。
2. 自分のリポジトリで **Code → Codespaces** を開き、マシンを **2-core** に指定します。所有者・支払者・利用枠・課金停止条件を確認し、分からなければ作成せず管理者に確認します。
3. 起動後に`pnpm course:load M00`を実行します。ロード済みの課題を編集してから再ロードしても、本人のファイルを上書きしません。モジュールごとに`M00`〜`M10`を指定します。
4. `course/start-here.md`または公開Webの教材を読み、課題は`workspace/Mxx/`で編集します。
5. M05〜M07のPlaywright課題は教材指定の`pnpm course:run`から実行します。配布済みShopは`course/shop/`にあり、受講者が製品全体のBuildをする必要はありません。
6. 正式評価の外部モデル呼び出しは現在利用できません。Providerのデータ保持／削除条件を一次根拠で確認できていないため、新しいモデル評価は`BLOCKED`として停止します。再開操作や`SEND`確認へ進まず、修了判定にも使わないでください。ローカル評価準備、既存結果の再検証・復旧、履歴、エクスポートは外部送信を行わない範囲で利用できます。

通常チューターの`pnpm course:tutor`は現在利用できません。Providerごとの認証状態・実際の費用条件・データ保持／削除条件を一次根拠で確認できていないため、起動時に`BLOCKED`として停止し、教材や質問を読み取らず、料金取得やOpenCode等の外部プロセスを開始しません。OpenCodeの`share: disabled`設定や公表単価0は、Provider側の保持条件・実アカウントの請求額・無料枠の根拠にはなりません。確認が完了するまでTutorへの入力を用意・送信しないでください。

Secretや本人の答案・評価記録を公開リポジトリへpushしないでください。Phase 1/2の提出物はGit操作を前提にせずエクスポートし、Codespacesの停止と保全は別操作です。

## 正式AI評価の外部送信（現在BLOCKED）

`pnpm course:assess M04 --model provider/model-id --resume <attempt-id>`（M07・M10も指定可）による新しい外部AI評価は現在`BLOCKED`です。選択Providerのデータ保持／削除条件を一次根拠で確認できるまで再開しないでください。この停止は料金取得、`opencode models`、送信同意の表示、OpenCode評価処理より前に行われます。`SEND provider/model-id`を入力する手順は現在ありません。

将来、一次根拠に基づく利用承認と実装更新が完了した場合の評価用入力には、選択したPhaseの評価基準、固定版の仕様・Skill抜粋、必要な`workspace/Mxx/`の回答・コード・実行証拠、ライブ課題への回答、SHA-256やRunの照合情報が含まれます。現行のBLOCKED状態では、これらは外部Providerへ送信されません。

`.env`、GitHub Token、Codespaces Secret、個人情報、他Phaseの作業領域、無関係なファイル、全AI会話、Trace全量を外部送信のために準備しないでください。Provider保持条件の一次確認が完了しても、料金・認証・データ対象の別確認と明示的な利用承認が必要です。

評価結果は本人の非公開`workspace/.course-assessments/`に保持します。記録や提出物を公開GitHubへpushしないでください。

## 利用許諾

独自の教材・コード・Skillのうち権利者が許諾できる部分は `LICENSE` のMIT Licenseを参照してください。Webフォントなどの第三者素材は `THIRD_PARTY_NOTICES.md` と `licenses/OFL-1.1.txt` を参照してください。リポジトリ全体・第三者の著作物にMITを一律適用するものではありません。

固定Skillの出典は[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)です。固定commitと第三者素材の取扱いは`THIRD_PARTY_NOTICES.md`を確認してください。

## 配布版の確認

`.course/distribution-manifest.json`に、配布元commit、配布対象ファイルのSHA-256、固定Skill版、配布済みShopの対応が記録されています。変更したファイルの上書きと無検証の新しい教材版への自動切替は行いません。

このTemplateの正本は`qa-training-store/training/course-sync/manifest.json`および`qa-training-store/training/ai-assisted-qa-course/templates/`です。外部Template側で教材や依存関係を独自改変しないでください。
