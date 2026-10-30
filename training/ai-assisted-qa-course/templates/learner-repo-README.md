# AI協働QA 学習用リポジトリ

このリポジトリは、公開の`qa-training-store`で管理される教材・専用実行環境から、確定したsource commitと配布許可リストを使って生成されます。リポジトリのルートに製品全体のソースコードや採点用模範解答は含めません。

## 学習の始め方

1. この公開Templateで **Use this template → Create a new repository** を選択し、自分のアカウントに**非公開**リポジトリを作成します。公開forkを非公開へ変更する方式ではありません。
2. 自分のリポジトリで **Code → Codespaces** を開き、マシンを **2-core** に指定します。所有者・支払者・利用枠・課金停止条件を確認し、分からなければ作成せず管理者に確認します。
3. 起動後に`pnpm course:load M00`を実行します。ロード済みの課題を編集してから再ロードしても、本人のファイルを上書きしません。モジュールごとに`M00`〜`M10`を指定します。
4. `course/start-here.md`または公開Webの教材を読み、課題は`workspace/Mxx/`で編集します。
5. M05〜M07のPlaywright課題は教材指定の`pnpm course:run`から実行します。配布済みShopは`course/shop/`にあり、受講者が製品全体のBuildをする必要はありません。
6. 正式評価時には、利用モデルの料金・認証を確認してから`pnpm course:assess`を使用します。モデルの利用不可・校正失敗・証拠不足は合格扱いにせず、理由を確認します。

Secretや本人の答案・評価記録を公開リポジトリへpushしないでください。Phase 1/2の提出物はGit操作を前提にせずエクスポートし、Codespacesの停止と保全は別操作です。

## 配布版の確認

`.course/distribution-manifest.json`に、配布元commit、配布対象ファイルのSHA-256、固定Skill版、配布済みShopの対応が記録されています。変更したファイルの上書きと無検証の新しい教材版への自動切替は行いません。

このTemplateの正本は`qa-training-store/training/course-sync/manifest.json`および`qa-training-store/training/ai-assisted-qa-course/templates/`です。外部Template側で教材や依存関係を独自改変しないでください。
