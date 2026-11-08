# M09 開始サンプル：CI workflowを読む

course/templates/phase3/course-e2e.workflow.yml.disabledは安全な完成見本です。workspace/M09/course-e2e.workflow.yml.disabledはPR HEADの確認、Browser導入、対象SHAと実行結果Artifactの対応が未完成の修正対象です。二つを比較し、後者を最小権限で完成させます。修正後も.disabledを保ち、.github/workflows/へ配置・有効化しません。

M09-public-handoff-01は、M08から実際の成果物がない場合に前工程の変更履歴・branch・レビュー可能なPR記録を読むための合成公開handoffです。これはM08の修了や実在PR/CIを証明しません。workflow-starter.yml.disabledは別の必須演習入力であり、handoffに含まれるものとして扱いません。

合成ログは実CIのRun/Check/Artifactではありません。Build、Test、Artifactのどの段階で何が起きたかを、実行証拠と区別して記録します。
