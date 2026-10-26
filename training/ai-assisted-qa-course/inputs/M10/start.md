# M10 開始サンプル：証拠を結び付ける

M10ではM07で確認したPlaywright specと、M09の修正workflow案またはM10専用の公開fallbackを使います。workflowを実行する場合は、学習者自身の作業用リポジトリで権限と対象を確認し、Templateへの自動配置・有効化を行わないでください。

CI成功の証拠には対象PR HEADの完全なSHA、同じSHAを実行したRun/Check、必要なArtifactを記録します。古いRun、別SHA、AIの成功報告だけでは現在の変更を検証した証拠になりません。

実際の照合用にロードされた`workspace/M10/ci-run-evidence.json`へ、本人の非公開学習repo、PR番号、PR head SHA、Run ID、選択したspec pathとtest rootを記録します。M07本人成果物があれば`workspace/M07/repaired-assertion.spec.ts`、なければM10公開fallbackのどちらかだけを選びます。ひな型の`OWNER/REPOSITORY`等は説明用の未設定値です。Token・Secretをファイルへ書かず、対象repoのContents/Actions/Checks/Pull requests読取り権限だけを持つfine-grained tokenを環境変数`GH_TOKEN`または`GITHUB_TOKEN`で使います。M10の正式評価はGitHub APIからworkflow・Run・Check・Artifactを独立に確認し、Artifact内Playwright JSONでunexpected、flaky、skippedがないことを照合します。入力が未設定・古い・失敗している場合はPASSではなくBLOCKEDまたは未達です。

M07/M09の本人成果物がない場合は、M10専用`public-sample-*`一式を使います。spec・Config・依存・Reset・実行証拠と、`.github/workflows/`外にある無効化workflowを含みます。サンプルworkflowは教材例であり、実Run・現在SHAの証拠ではありません。ロード時に他モジュールを追加ロードしたりworkflowを有効化したりしません。
