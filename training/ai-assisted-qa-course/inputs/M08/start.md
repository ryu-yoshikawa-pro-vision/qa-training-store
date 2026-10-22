# M08 開始サンプル：差分を安全に共有する

個人学習リポジトリの変更を前提にします。working treeは作業中の差分、stageは次のcommitに含める差分、commitはローカル履歴の一点、branchは変更を分ける参照です。

公開してよい教材・テストだけを対象にし、`git status`と`git diff`で差分、削除、Secret、生成物を確認します。確認後に必要なファイルだけstageし、commit前にstaged diffを読み直します。remoteへのpushは本人が選ぶ操作です。
