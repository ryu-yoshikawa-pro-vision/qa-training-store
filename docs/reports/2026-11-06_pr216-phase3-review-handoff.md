# PR #216 Phase 3レビューと統合引継ぎ（2026-11-06）

- 修正前PR HEAD：`20787bed8083752d208f7a32aadfd0e691527449`。元Web CI #41959787427：success。
- 担当範囲：M08隔離Git fixture、M08-04レビュー停止条件、M09→M10 fallback ID、M10 P05提出7条件、固有契約テスト。
- 変更：`GIT_*` の子プロセス継承除外（両fixture）、不正 `GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE` の負例、実staged diffの禁止path拒否、教材P05停止条件への直接照合、fallback全input衝突と2件目負例、M10 7条件を講義・演習・提出へ照合。
- データ保護：一時fixtureのダミー値のみ。実リポジトリのindex・作業ツリーと本人Secretは操作しない。無効workflowやSUTは変更しない。
- 既存の固定SHA/manifest、source revision、path、contract ID、optional条件、Phase 3任意条件は維持。
- ローカルGitHub DNS解決失敗によりbranch checkoutとpnpm実行は不可。新HEADのWeb CI、Vitest・Style/Code Quality・verify/validateでの実受入は別途照合する。

## #199に残る最終1件（未受入）

入力見本 `training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled` （変更前Blob `ea1e8fa0e4ac2f6ae06742fef7e54ea5ea88f7dc`）は `verify-distribution` と固定prebuilt実行条件が欠落。所有者を確認のうえ統合先で、完成見本 `training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled` にある `test -s course/shop/index.html`、`test -s .course/distribution-manifest.json`、`node scripts/training/ai-assisted-qa-course.mjs verify-distribution`、`PLAYWRIGHT_USE_PREBUILT_DIST: "true"` を移植し、対象rootは `workspace/M10/public-sample` のままにする。

M07→M08の本人spec・Config・Reset・Run/Trace・SHA・依存とM09→M10のShop・manifest・source SHA・fallback・workflowを連続照合する。本人が不在なら公開fallbackを選ぶが、未検証の資料で済ませずmanifest/SHA/配送・Chromiumを統合採用HEADで再検証する。専用タスクは23/24のまま。本人Private repo/課金/実PR/実CI/正式採点は統合後の別受入。
