# 公開sampleの依存とReset

依存の正本は同じ配布revisionの`package.json`と`pnpm-lock.yaml`です。Node.js 24、`pnpm@10.34.5`、lockfile固定の`@playwright/test`を使います。Resetは`training/playwright/support/reset-scenario.ts`で、`default` ScenarioとReset後metadataを照合します。独自Resetや依存の複製は行いません。
