# 公開sampleのConfig

- 正本: `playwright.ai-assisted-qa.config.ts`
- 対象: `workspace/M08/public-sample/`内の指定specのみ
- URL: loopback HTTP `127.0.0.1:8082`
- 結果: `output/training/ai-assisted-qa/`
- Configと全参照runtimeは配布manifestが記録する同一source SHAのファイルを使う。
- M08 fallbackはM08単独ロード後に実行できる、同じ配布revisionのmodule-local specです。
