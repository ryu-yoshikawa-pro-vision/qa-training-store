# セキュリティポリシー

## 対象範囲

Scenario Shopは学習とテストのための模擬ECアプリケーションです。実際の販売や決済は行わず、本番のユーザーデータも扱いません。

セキュリティ報告の対象は、現在の`main` branch、そのリポジトリ設定とworkflow、およびこのリポジトリから生成した最新のデプロイです。

## 脆弱性の報告

セキュリティ脆弱性の疑いをPublic IssueやPull Requestへ投稿しないでください。

GitHub Private Vulnerability Reportingを使用してください。

1. [Security page](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/security)を開きます。
2. **Advisories**を開きます。
3. **Report a vulnerability**を選択します。

概要、再現手順、影響、環境、補足となる根拠を記載してください。このリポジトリでは、別のメール報告先は公開していません。

## 公開情報の境界

未修正Alert番号、raw payload、actual exposure、攻撃経路、private triageはPublic IssueやPull Requestへ記載しないでください。Security修正PRで公開してよい情報は、dependency名、変更前後のversion、Security Updateであること、およびCI・検証結果の最小限の情報です。

Alertの自動dismissは行いません。

## 対応と公開

報告はGitHubの非公開advisoryプロセスで確認します。必要に応じて、そのadvisoryを通じて修正と公開を調整します。対応または修正の固定SLAは定めていません。

意図的に模擬している動作や、この学習アプリケーションに文書化された制限だけに関する問題は、セキュリティ報告の対象外です。
