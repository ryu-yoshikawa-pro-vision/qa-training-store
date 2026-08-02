# CI Skip 伝播修正の変更履歴

## 変更理由

PR #6 の GitHub Actions Run `30741740232` で、PRの `extended-e2e=skipped` と `verify=success` の後に `deploy-preview=skipped`、最終 `validate=failure` となった。`deploy-preview` に Job-level `always()` がなく、依存チェーン内の Skip が条件評価前に伝播したためである。

## 変更内容

- Preview／Production のデプロイ Job に `always()` と直接依存 Job の成功条件を追加した。
- Cloudflare Secret を認証確認 Step と Wrangler Action Input に限定した。
- 全 Checkout に `persist-credentials: false` を設定した。
- Preview branch 名の検証と UI Review Artifact path の環境変数再利用を追加した。
- fork PR は必須 Preview デプロイと公開 URL Smokeを実行できないため、現行CI/CD運用のサポート対象外と文書化した。

## 検証状態

ローカルの契約テスト、全体テスト、lint、typecheck、manifest、security、対象Prettierは成功した。修正後のGitHub Actions成功Runは、Push／手動再実行を行わないため未確認である。
