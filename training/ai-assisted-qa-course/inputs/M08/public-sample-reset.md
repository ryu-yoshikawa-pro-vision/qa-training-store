# 公開sampleのReset契約

Reset正本は`training/playwright/support/reset-scenario.ts`です。テスト開始前に`default` ScenarioへResetし、`__TEST_API__.getMetadata().scenario`を照合してから商品ページへ進みます。ブラウザcontextの分離はPlaywrightに任せます。Reset helperをコピー・再実装せず、同じ配布SHAのruntimeを使います。
