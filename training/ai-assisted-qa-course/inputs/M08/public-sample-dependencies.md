# 公開sampleの依存

`package.json`と`pnpm-lock.yaml`が依存の正本です。Node.js 24、`pnpm@10.34.5`、lockfile固定の`@playwright/test`を使います。依存ファイルはM08用に複製せず、配布manifestに記録されたruntimeコピーを参照します。`pnpm install --frozen-lockfile`の結果と配布SHAをhandoffの説明から区別します。
