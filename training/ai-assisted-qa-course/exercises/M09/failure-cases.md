# M09 合成CIログ

3つのログは練習用の架空例であり、実GitHub Actions・Scenario Shopの実行証拠ではありません。表示されたstepの結果と、記録がないstepの未確認を区別します。

## A：Build失敗

```text
[synthetic] Install dependencies — success
[synthetic] Build — failure
[synthetic] Error: unresolved import in generated training bundle
[synthetic] Process completed with exit code 1
[synthetic] Playwright tests — skipped
[synthetic] Upload artifacts (if: success()) — skipped
```

## B：Test失敗

```text
[synthetic] Build — success
[synthetic] Playwright tests — failure
[synthetic] M06 CASE-CART-003
[synthetic] Expected cart quantity 3, received 2
[synthetic] Process completed with exit code 1
[synthetic] Upload artifacts (if: always()) — success
```

## C：Artifact保存失敗

```text
[synthetic] Playwright tests — success
[synthetic] Upload course-playwright-results (if-no-files-found: error) — failure
[synthetic] No files were found with the provided path: output/training/ai-assisted-qa/
[synthetic] Process completed with exit code 1
```

**注意**：`actions/upload-artifact`の`if-no-files-found`は既定では`warn`です。「No files were found」の文言だけでは失敗と断定できません。Cでは`error`を明示しているため失敗です。実Runではworkflow設定、step conclusion、Artifact一覧を確認します。Testの合否とArtifact保存の合否は別です。

## 記録

各例の最初の失敗step、実行済み・skipped・不明の後続step、次に確認するRun/step/logを記録します。ログにない成否や製品不具合を推測せず、合成ログを実行証拠として提出しません。
