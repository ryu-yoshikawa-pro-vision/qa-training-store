# M09 合成CIログ

6つのログは練習用の架空例であり、実GitHub Actions・Scenario Shopの実行証拠ではありません。表示されたstepの結果と、記録がないstepの未確認を区別します。

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

## D：Install失敗（実workflowに対応する合成例）

```text
[synthetic] Install dependencies — failure
[synthetic] pnpm install --frozen-lockfile: lockfile mismatch
[synthetic] Verify pinned learner distribution — skipped
[synthetic] Install Chromium — skipped
[synthetic] Playwright tests — skipped
[synthetic] Upload course-playwright-results (if: always(), if-no-files-found: error) — failure
[synthetic] No files were found in the expected output paths
```

**最初の失敗**はInstallです。後続Artifact失敗は派生結果であり、テストの仕様不適合やShopのBuild失敗を示しません。AのBuildは一般的なCI説明用の合成例であり、完成見本のworkflowではShopは事前配布され、RunnerはフルBuildしません。

## E：配布検証失敗（実workflowに対応する合成例）

```text
[synthetic] Install dependencies — success
[synthetic] Verify pinned learner distribution — failure
[synthetic] course/shop/index.html: missing
[synthetic] Install Chromium — skipped
[synthetic] Playwright tests — skipped
[synthetic] Upload course-playwright-results (if: always(), if-no-files-found: error) — failure
```

**最初の失敗**は配布検証です。Shop生成元・追跡済みファイル・manifest SHA-256・配布元SHAの固定条件を調査します。Runnerで`pnpm run build:web`へ切り替えて回避しません。

## F：Serve失敗（実workflowに対応する合成例）

```text
[synthetic] Verify pinned learner distribution — success
[synthetic] Install Chromium — success
[synthetic] Playwright tests — failure
[synthetic] webServer failed to start at http://127.0.0.1:8082
[synthetic] Test assertions — not executed
[synthetic] Upload course-playwright-results (if: always()) — attempted, result unknown
```

**最初の失敗**はPlaywright step内のServeです。実際のテストAssertionが失敗した証拠はなく、`webServer`設定、配布済みShopのパス、ポートと起動ログを調べます。Uploadの結果は合成ログに記録がないため不明です。

## 記録

各例（A〜F）の最初の失敗step、実行済み・skipped・不明の後続step、次に確認するRun/step/logを記録します。ログにない成否や製品不具合を推測せず、合成ログを実行証拠として提出しません。
