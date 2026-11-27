# M08 開始サンプル：差分を安全に共有する

個人学習リポジトリの変更を前提にします。working treeは作業中の差分、stageは次のcommitに含める差分、commitはローカル履歴の一点、branchは変更を分ける参照です。

公開してよい教材・テストだけを対象にし、`git status`と`git diff`で差分、削除、Secret、生成物を確認します。確認後に必要なファイルだけstageし、commit前にstaged diffを読み直します。remoteへのpushは本人が選ぶ操作です。

M07の本人handoffがない場合は、同梱の`public-sample-*`ファイル一式を参照します。これはGit/PR練習用の安全な公開入力で、M07修了や本人の実行を示すものではありません。Config、依存、Reset helperの実体は同じ配布SHAのルートruntimeを参照し、`public-sample-run-evidence.md`にあるローカル実行結果はGitHub CIの証拠ではありません。
