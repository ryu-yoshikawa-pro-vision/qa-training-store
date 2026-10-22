# M09 合成CIログ

ここにある3つのログは練習用の架空例です。GitHub ActionsやScenario Shopで実行した記録ではなく、実際の障害・課金・成功を証明しません。学習者は最初の失敗stepと次に確認する証拠を説明します。

## A：Build失敗

```text
[synthetic] Run build
[synthetic] Error: unresolved import in generated training bundle
[synthetic] Process completed with exit code 1
```

## B：Test失敗

```text
[synthetic] M06 CASE-CART-003
[synthetic] Expected cart quantity 3, received 2
[synthetic] Process completed with exit code 1
```

## C：Artifact未生成

```text
[synthetic] Upload course-playwright-results
[synthetic] No files were found with the provided path: output/training/ai-assisted-qa/
[synthetic] Artifact upload reported no files
```

## 記録

各例について、どのRun/step/logを本物の実行で確認する必要があるか、現時点で分かることと仮説を分けます。上の文面を提出時の実行証拠として引用しません。
