# AI協働QA 学習用リポジトリ

このリポジトリは、公開の`qa-training-store`で管理される教材・専用実行環境から、確定したsource commitと配布許可リストを使って生成されます。リポジトリのルートに製品全体のソースコードや採点用模範解答は含めません。

## 学習の始め方

1. この公開Templateで **Use this template → Create a new repository** を選択し、自分のアカウントに**非公開**リポジトリを作成します。公開forkを非公開へ変更する方式ではありません。
2. 自分のリポジトリで **Code → Codespaces** を開き、マシンを **2-core** に指定します。所有者・支払者・利用枠・課金停止条件を確認し、分からなければ作成せず管理者に確認します。
3. 起動後に`pnpm course:load M00`を実行します。ロード済みの課題を編集してから再ロードしても、本人のファイルを上書きしません。モジュールごとに`M00`〜`M10`を指定します。
4. `course/start-here.md`または公開Webの教材を読み、課題は`workspace/Mxx/`で編集します。
5. M05〜M07のPlaywright課題は教材指定の`pnpm course:run`から実行します。配布済みShopは`course/shop/`にあり、受講者が製品全体のBuildをする必要はありません。
6. 正式評価時には、利用モデルの料金・認証を確認してから`pnpm course:assess`を使用します。モデルの利用不可・校正失敗・証拠不足は合格扱いにせず、理由を確認します。

通常チューターの`pnpm course:tutor`は、送信のたびに公開料金カタログで選択モデルの公表単価を検査し、有料・不明・取得失敗ならOpenCodeを起動しません。公表単価0でも実アカウントの請求額・無料枠・Providerのデータ保持条件は保証されないため、本人が送信前に確認してください。

Secretや本人の答案・評価記録を公開リポジトリへpushしないでください。Phase 1/2の提出物はGit操作を前提にせずエクスポートし、Codespacesの停止と保全は別操作です。

## 正式AI評価での外部送信

`pnpm course:assess M04 --model provider/model-id`（M07・M10も指定可）は、指定したOpenCodeモデルによる外部AI評価です。外部送信前に、使用するモデルと無料枠・利用条件を本人が確認してください。料金が発生するモデルへ自動で切り替えません。

送信対象は、選択したPhaseの評価基準、固定版の仕様・Skill抜粋、必要な`workspace/Mxx/`の回答・コード・実行証拠、ライブ課題への回答、SHA-256やRunの照合情報です。提出物は自動的に一般公開されるものではありませんが、**指定した外部モデルの提供者へ評価用入力として送信されます**。送信先は実際に選んだモデルの提供者に依存します。

`.env`、GitHub Token、Codespaces Secret、個人情報、他Phaseの作業領域、無関係なファイル、全AI会話、Trace全量は送信しないでください。CLIは既知のSecret形式を検査しますが、検出できない情報もあるため、本人が提出前に内容を確認してください。CLIは送信前にモデルIDと対象範囲を表示し、`SEND provider/model-id`という**対話的な明示確認**を要求します。確認できない場合はBLOCKEDとして停止し、正式な合格にはしません。

評価結果は本人の非公開`workspace/.course-assessments/`に保持します。記録や提出物を公開GitHubへpushしないでください。

## 利用許諾

独自の教材・コード・Skillのうち権利者が許諾できる部分は `LICENSE` のMIT Licenseを参照してください。Webフォントなどの第三者素材は `THIRD_PARTY_NOTICES.md` と `licenses/OFL-1.1.txt` を参照してください。リポジトリ全体・第三者の著作物にMITを一律適用するものではありません。

固定Skillの出典は[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)です。固定commitと第三者素材の取扱いは`THIRD_PARTY_NOTICES.md`を確認してください。

## 配布版の確認

`.course/distribution-manifest.json`に、配布元commit、配布対象ファイルのSHA-256、固定Skill版、配布済みShopの対応が記録されています。変更したファイルの上書きと無検証の新しい教材版への自動切替は行いません。

このTemplateの正本は`qa-training-store/training/course-sync/manifest.json`および`qa-training-store/training/ai-assisted-qa-course/templates/`です。外部Template側で教材や依存関係を独自改変しないでください。
