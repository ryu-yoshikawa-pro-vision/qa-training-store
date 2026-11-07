# Tasks（タスク）

## Now（現在）

- [x] 1. branch、fetch後のPR HEAD、working tree、対象CIのJobと失敗ログを確認する。
- [x] 2. repository planを保存し、active Runの対象・仮説・検証条件を記録する。
- [x] 3. CI Traceを3 attempt分取得し、停止位置・axe/evaluate・viewport・navigationの時間を解析する。
- [x] 4. `validateSavedChallenge()`の値比較を修正し、正常・clone・改変・欠落/余剰の回帰ケースを追加する。
- [x] 5. CIが列挙した8ファイルだけをPrettier整形し、scoring JSONの値が不変であることを確認する。
- [x] 6. E2Eを`moduleIds`由来のmodule単位testへ分割し、現在の全表示・画像・axe・quiz・結果・導線assertionを保つ。
- [x] 7. focused contracts/E2Eと、指定されたstrict format/lint/typecheck/contracts/Chromium全体を試行し、pass/block状態と環境制約を記録する。
- [ ] 8. diff、回帰範囲、文書整合性、artifact sanitizerを確認し、対象ファイルだけをstageしてcommitする。
- [ ] 9. 通常push、local/origin/PR HEAD一致、PR本文更新、新CIの起動を確認する。CI完了待ちはしない。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- `validateSavedChallenge()`は保存値と再構築値の各トップレベルfieldを`!==`で比較し、配列/オブジェクトの同値な別instanceを拒否する。
- `resumeAttempt()`はmanifest fingerprintと`challenge_sha256`を確認してから`validateSavedChallenge()`を呼び、回答読込・外部送信確認・モデル評価より前にchallengeを検証する。
- E2E targetは同一90秒test内で11教材desktop/mobileと11 quiz flowを処理し、画面状態ごとのaxe scanを行う。`fullyParallel: false`、CI retries 2、trace retain-on-failure、workers明示なし。
- CIログ上のStyle Quality failureは指定8ファイルのPrettier違反。Vitest suiteではassessment Contractの19件中1件のみ失敗。

## Evidence（証拠）

- CI traceは3 attempt分すべて取得済み。初回は教材M08まで、retry 1は全教材とクイズM00、retry 2はクイズM06まで進んで90秒に達した。`Frame.evaluateExpression`は約42.6〜44.8秒、viewport切替は約14.1〜19.5秒/attempt。固定画面の停止ではなく累積処理時間の仮説を支持する。
- assessment Contract 19/19、repository-wide strict Prettier、ESLint（0 errors）、3つのTypeScript typecheck、`git diff --check`はPASS。scoring JSON 5ファイルはformat前後のparse済みvalue SHA-256が一致。
- 全`tests/contracts`は通常のOS tempではVitest cache renameの`EPERM`でtest load前に失敗。回避用`TEMP/TMP`を`node_modules`へ向けた実行は55 files/865 testsまで進んだが、OS temp契約をrepository配下に置く不適切な回避となったため、62 fail/764 pass/29 skipを製品結果として扱わない。OS temp配下の別dirでもVitest起動時の同じ`EPERM`を再現し、この全suiteはBLOCKED。
- Playwright `--list`は30件を検出し、その中にmodule単位の11件を確認。system Chromeで実行を試したが、Playwright local cacheにffmpegがなく`browserContext.newPage`前に停止したためChromium実行はBLOCKED。Corepack pnpm取得もnpm registryの`ENOTFOUND`。
- assessment資料・rubric・scoring fixtureの意味内容は変更しておらず、調査した文書とコード間の不整合は見つからなかった。
