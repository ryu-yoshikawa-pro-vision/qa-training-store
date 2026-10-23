# M10 開始サンプル：証拠を結び付ける

M10ではM07で確認したPlaywright specと、M09の修正workflow案またはM10専用の公開fallbackを使います。workflowを実行する場合は、学習者自身の作業用リポジトリで権限と対象を確認し、Templateへの自動配置・有効化を行わないでください。

CI成功の証拠には対象PR HEADの完全なSHA、同じSHAを実行したRun/Check、必要なArtifactを記録します。古いRun、別SHA、AIの成功報告だけでは現在の変更を検証した証拠になりません。

M07/M09の本人成果物がない場合は、M10専用`public-sample-*`一式を使います。spec・Config・依存・Reset・実行証拠と、`.github/workflows/`外にある無効化workflowを含みます。サンプルworkflowは教材例であり、実Run・現在SHAの証拠ではありません。ロード時に他モジュールを追加ロードしたりworkflowを有効化したりしません。
