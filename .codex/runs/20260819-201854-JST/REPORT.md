# Report (append-only)

- 行動のたびに追記する（調査/編集/判断も含む）
- コマンドや確認結果は必ず記録する

## Evidence Record (optional)

- Record ID:
- Round:
- Query:
- Source:
- Supports/Refutes:
- Confidence:
- Decision:
- Rationale:
- Open Issues:
- Next Action:

## YYYY-MM-DD HH:MM (JST)

- Summary:
- Completed:
- Changes:
- Commands:
  - `...` => result
- Notes/Decisions:
- New tasks:
- Remaining:
- Progress: NN% (done/total)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-08-19 20:18 (JST)

- Summary: Playwright CI install stabilityのStrict implementation runを初期化し、指定planを正本として実装境界を確定した。
- Completed: `docs/PROJECT_CONTEXT.md`、最新ADR、過去Run、`AGENTS.md`、`PLANS.md`、指定plan、feature-plan skill、GitHub skillを確認した。PR #34はopen／mergeable／未mergeで、branchと`origin/main`のbase commitはplan記載と一致した。
- Changes: sourceは未変更。`.codex/runs/20260819-201854-JST/`のPLAN／TASKS／REPORTだけを今回Run用に更新した。
- Commands:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/new-run.ps1 -TaskType implementation -WorkflowLevel strict -Preset safe` => Run `20260819-201854-JST`を初期化。
  - `git fetch origin main fix/playwright-ci-install-stability` => main `d297497e...`、branch `44966d0d...`を確認。
  - `git diff --stat origin/main...HEAD` => plan 1 fileのみ。
  - GitHub PR #34 metadata => `fix/playwright-ci-install-stability`、base `main`、open、head `44966d0d...`。
  - GitHub run `32246170451` jobs/artifacts => plan-only baseline runでUI Review 4 viewport artifact作成済み、Chromium E2E requiredは確認時点で`Install Chromium`実行中。
- Notes/Decisions: mainが進んでいないため指定planのbase commitは更新しない。source変更は`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`を基本とし、planは実装結果の事実更新が必要な場合だけ変更する。PR merge、new PR、履歴改変は行わない。過去Runは変更しない。
- New tasks: なし。
- Remaining: workflow／contract実装、local gate、push後のPR CI／log／artifact／rerun／workflow_dispatch確認。
- Progress: 25% (3/12)

## 2026-08-19 20:30 (JST)

- Summary: 指定されたChromium install変更と最小contract testを実装した。
- Completed: 固定5 jobの`--with-deps chromium`をbrowser-onlyへ変更し、`extended-e2e`をChromium条件付きbrowser-only／非Chromium条件付き`--with-deps`へ分岐した。既存`jobBlock()`／`stepBlock()`のみを利用して2 focused testを追加した。
- Changes: `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`を変更。plan、package、lockfile、Playwright config、E2E／application／training codeは未変更。
- Commands:
  - `git diff -- .github/workflows/ci.yml tests/contracts/ci-workflow.test.ts` => 固定5 jobの6 command変更と、条件式を含むcontract 2件のみ。
  - `rg -n -C 2 'playwright install' .github/workflows/ci.yml` => Chromium固定5箇所はbrowser-only、extended-e2eは条件付き2 step。
  - `git diff --name-only` => sourceは指定2ファイル、Run Artifactは別管理。
- Notes/Decisions: `verify`／`validate`、Firefox／WebKit command、matrix構造、`max-parallel`、timeoutは変更していない。extended-e2eのmatrix `--with-deps`は文字列出現数を1に固定し、Chromiumが両方のstepを通らない契約にした。
- New tasks: なし。
- Remaining: local quality gates、commit／push、PR CI／logs／UI artifact、rerun、workflow_dispatch、sanitization／evaluation。
- Progress: 50% (6/12)

## 2026-08-19 20:35 (JST)

- Summary: 実装後の必須local quality gateがすべて成功した。
- Completed: format、Markdown lint、contract suite、差分確認。
- Changes: source差分は`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`のみ。`package.json`／`pnpm-lock.yaml`の変更はない。
- Commands:
  - `pnpm run format:check`（初回はnode_modules未導入で開始前失敗、install後の再実行）=> PASS。
  - `pnpm run lint:markdown`（初回はnode_modules未導入で開始前失敗、install後の再実行）=> PASS、0 issues。
  - `pnpm run test:contracts`（初回はnode_modules未導入で開始前失敗、install後の再実行）=> 30 files / 396 tests passed、0 failed。SQLite ExperimentalWarningのみ。
  - `pnpm install --frozen-lockfile --ignore-scripts` => lockfile up-to-date、依存導入成功。package／lockfile差分なし。
  - `git diff --check` => PASS。
  - `git diff --name-only` => `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`、Run Artifactのみ。
- Notes/Decisions: 既存plan-only PR run `32246170451`は確認時点でもChromium E2E requiredの旧`Install Chromium`でin_progress。UI Review 4 viewport、production-smoke等はsuccessだったため、比較可能なbaseline artifactとして保持する。今回のsource差分が直接原因のfailureはlocalではない。
- New tasks: なし。
- Remaining: commit／push、PR CI初回、install log／UI artifact、rerun、workflow_dispatch、sanitization／evaluation。
- Progress: 58% (7/12)

## 2026-08-19 20:42 (JST)

- Summary: 実装commitを既存PR #34のbranchへpushした。
- Completed: source 2ファイルとRun Artifactをcommitし、`fix/playwright-ci-install-stability`へ通常pushした。PR #34は継続利用し、新規PR／merge／rebase／履歴改変は行っていない。
- Changes: implementation commit `2ba2ec850c437daff5544cabdc5557bfd27f8902`。
- Commands:
  - `git commit -m "fix: stabilize Chromium Playwright install"` => commit `2ba2ec8`、6 files changed（source 2 + Run Artifact 4）。
  - `git push origin fix/playwright-ci-install-stability` => `44966d0..2ba2ec8`でpush成功。
  - `git status --short --branch` => remote branchと一致。
- Notes/Decisions: push時にdefault branchの既存Dependabot vulnerability通知（7 high / 1 moderate）が表示されたが、今回差分のfailureとは扱わない。GitHub Actions runの発生を待って初回CIを確認する。
- New tasks: なし。
- Remaining: PR初回CIの全job、install log、UI artifact、順次rerun、workflow_dispatch、最終sanitization／evaluation。
- Progress: 58% (7/12)

## 2026-08-19 21:05 (JST)

- Summary: PR #34の初回Phase 1 CIが完了し、要求されたChromium jobではbrowser-only installとtestが成功した。一方、UI Review artifactで明確な日本語font fallback退行を確認した。
- Completed: run `32248129288`（source commit `2ba2ec850c437daff5544cabdc5557bfd27f8902`）の主要job、`verify`、`validate`、`deploy-preview`を確認した。PRでは`extended-e2e`と`deploy-production`が既存条件どおりskipだった。
- Changes: source差分は`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`だけで、app／UI sourceは変更していない。UI Review current artifactはdesktop `9363490661`、tablet `9363485943`、mobile `9363469013`、small `9363443943`。比較baselineはそれぞれ`9362777257`、`9362755604`、`9362819442`、`9362716536`。
- Commands:
  - GitHub job summary取得 => Chromium E2E required、accessibility、mobile-boundary、cross-role、training-web-baseline、UI Review 4 viewport、production-smoke、deploy-preview、verify、validateがsuccess。`extended-e2e`／`deploy-production`はPR条件によりskip。
  - Chromium install log確認（10 job）=> `pnpm exec playwright install chromium`を実行。`apt`、`apt-get`、`Installing dependencies...`、`apt-mirrors`、`package mirror`の該当行は0件。
  - deploy-preview job log `96054176775`確認 => `pnpm exec playwright install chromium`、禁止語句0件、deployed smoke success。
  - UI Review artifact展開・目視比較 => 4 viewportとも画像を取得。currentは日本語文字列の一部が豆腐文字になり、baselineの正常な日本語表示と明確に異なる。desktop／tablet／mobile／small-mobileで同じ傾向を確認した。
  - web-distのCSS／font asset hash比較 => `fonts-e754fff864979b2d8b8d4437de5a6b38.css`とNoto Sans JP 400／600／700のwoff2はbaselineとcurrentで同一hash。source app／UI差分はない。
- Notes/Decisions: CI greenだけではvisual退行なしの根拠にならない。今回の差異は`--with-deps`が供給していたrunner側font fallbackをbrowser-only化で失った可能性が高く、少なくともplan §11.4の確認項目「日本語表示」「明確なfont fallback退行なし」に違反する。plan §23のロールバック／再設計条件に該当するため、推測でapt package追加、UI code変更、再試行を行わない。current branch／PRはmergeせず、rerunとworkflow_dispatchはこの判定の解決前には進めない。
- New tasks: `D1`としてbrowser-only UI Reviewのfont fallback差異の成立可否を分類するタスクを追加した。
- Remaining: D1の最終判定、同一commit rerun、workflow_dispatch mobile-chromium、Firefox／WebKit切り分け、sanitizer／evaluation、最終報告。
- Progress: 69% (9/13)

## 2026-08-19 21:20 (JST)

- Summary: D1の分類を完了し、今回の最小変更はChromium install／testの安定化には有効だが、UI Reviewの受け入れ条件を満たさないため保留と判定した。Run Artifactとevaluationを最終化した。
- Completed: `evaluation.json`を`partial`／`flaky_or_env_issue`として作成し、JSON／schema validation、sanitizer Write／Checkを成功させた。Firefox／WebKitの既存挙動を変更せず、verify／validate gateも変更していない。
- Changes: 実装sourceはcommit `2ba2ec8`の2ファイルのみ。今回の最終Run更新は`.codex/runs/20260819-201854-JST/`内のTASKS／REPORT／run.json／evaluation.jsonに限定した。planは事実更新が不要なため変更していない。
- Commands:
  - `python scripts/validate-output-schema.py .codex/templates/evaluation.schema.json .codex/runs/20260819-201854-JST/evaluation.json` => success。
  - `Get-Content run.json/evaluation.json | ConvertFrom-Json` => `JSON parse: PASS`。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260819-201854-JST -Write -Check` => 5 files、0 replacements、0 residual findings。
  - `git diff --name-only origin/main...HEAD` => plan、source 2ファイル、今回Run Artifactのみ。app／UI source、package、lockfile、Playwright configは含まれない。
- Notes/Decisions: 追加rerun 2回とworkflow_dispatch 1回は、明確なfont/rendering退行が確認された状態で成功回数だけを積み上げることになるため実施しなかった。PR #34はopen／未mergeのまま。根本原因の代替案（runner fontの明示供給、font asset／CSS修正等）は今回の禁止されたスコープ拡大に当たるため、次タスクとして別途判断する。
- New tasks: なし。
- Remaining: Blocked task 10（同一commit rerun）と11（workflow_dispatch mobile-chromium）。UI regressionの解消方針が承認・実装されるまで、今回PRはmerge不可。
- Progress: 100% (11/11)（Blocked 2件は分母外）。

## 2026-08-19 21:30 (JST)

- Summary: 最終evidenceとしてPR初回runのChromium install logを11 job分再スキャンし、全jobでbrowser-only commandとapt非実行を確認した。
- Completed: required／accessibility／mobile-boundary／cross-role／training-web-baseline、UI Review 4 viewport、production-smoke、deploy-previewの全11 jobで`Run pnpm exec playwright install chromium`が1件ずつ存在し、禁止語句の該当行は各job 0件だった。Run Artifact更新後もformat／Markdown lint／`git diff --check`は成功した。
- Commands:
  - GitHub logs scan => job IDs `96053414368`、`96053414363`、`96053414374`、`96053414430`、`96053414410`、`96053414244`、`96053414284`、`96053414411`、`96053414414`、`96053461494`、`96054176775`。全11件でbrowser-only install、禁止語句0件。
  - `pnpm run format:check` => PASS。
  - `pnpm run lint:markdown` => PASS、0 issues。
  - `git diff --check` => PASS（Run jsonのCRLF warningのみ）。
- Notes/Decisions: install pathの安定化証拠は成立したが、UI Reviewのfont fallback退行を解消していないため、これをpre-merge完了とは扱わない。
- New tasks: なし。
- Remaining: Blocked task 10／11の再開条件はUI regressionの代替案決定。PR #34はmergeしない。
- Progress: 100% (11/11)（Blocked 2件は分母外）。

## 2026-08-19 22:00 (JST)

- Summary: Repair iteration 1として、browser-only Chromium pathで発生した日本語font fallback退行を、Web共通CSSの最小修正と既存Flow Eのfocused regression assertionで修正した。
- Input findings: 前回`evaluation.json`のhigh severity finding。PR run `32248129288`のdesktop／tablet／mobile／small-mobileで、CSS／Noto Sans JP assetは同一なのにExpo Router Link由来の日本語が豆腐文字になった。
- Repair plan: `a[href] { font-family: inherit; }`だけを既存anchorルール付近へ追加し、Flow Eの「商品を見る」Linkにcomputed `font-family`が`Noto Sans JP`を含むことを`toHaveCSS`で契約化する。`font` shorthand、apt、workflow、Link実装は変更しない。
- Allowed files: `src/presentation/styles/global.css`、`e2e/web/ui-ux-improvements.spec.ts`、今回Run Artifact。
- Changed files: sourceは上記2ファイルのみ。global.cssに4行追加、Flow Eは既存Link locatorを変数化してfocused CSS assertionを1件追加した。
- Validation: `pnpm exec playwright test e2e/web/ui-ux-improvements.spec.ts --project=chromium` => 13 passed (2.1m)。`pnpm run format:check` => PASS。`pnpm run lint:markdown` => PASS、0 issues。`pnpm run lint` => PASS、既存warning 64件・error 0件。`pnpm run typecheck` => PASS。`pnpm run test:contracts` => 30 files／396 tests passed。`git diff --check` => PASS。
- Remaining delta: local browserではcomputed font-family assertionと既存Flowが成功したが、修正版commitのPR CI、4 viewport artifact比較、順次rerun、workflow_dispatchは未実施である。
- Decision: continue。修正版を既存PR #34へ反映し、remote evidenceでvisual acceptanceを確認する。
- Progress: 65% (11/17)（旧Blocked 2件は分母外）。

## 2026-08-19 22:36 (JST)

- Summary: Repair iteration 1を既存PR #34へ反映し、初回Phase 1 CI、同一commit rerun 2回、workflow_dispatch 1回、install log、UI artifact比較を完了した。日本語font regressionは解消され、Chromium browser-only pathの安定化と両立した。
- Commit／PR: `09596e9a9ecc280812263740501a14611d1f512a`（`fix: inherit bundled web fonts for links`）を`fix/playwright-ci-install-stability`へpush。PR #34はopen／未mergeのまま維持し、新規PR／merge／履歴改変は行っていない。
- 修正版Phase 1初回run: `32255760945` attempt 1。required、accessibility、mobile-boundary、cross-role、training-web-baseline、UI Review desktop／tablet／mobile／small-mobile、production-smoke、deploy-preview、verify、validateがsuccess。extended-e2eとdeploy-productionはPR条件でskip。
- Chromium install log: 上記runの11 job（required、accessibility、mobile-boundary、cross-role、training-web-baseline、UI Review 4件、production-smoke、deploy-preview）すべてで`Run pnpm exec playwright install chromium`が1件、旧`--with-deps chromium`が0件、`apt`／`apt-get`／`Installing dependencies...`／`apt-mirrors`／package mirror markerが0件。Chromium E2E／launch／smokeもsuccess。
- UI Review artifact比較: baseline run `32246170451`の4 viewportと、修正版artifact desktop `9366332723`、tablet `9366326515`、mobile `9366303541`、small-mobile `9366260575`を目視比較した。home、legal-privacy、products、product detail系で、ヘッダー／モバイルナビゲーション／商品名／カテゴリ名／「商品を見る」／「一覧を見る」／footerの日本語が正常。豆腐文字は再現せず、font-size／font-weight／改行／文字幅の明確な差、horizontal overflowは確認しなかった。
- 同一commit rerun: attempt 2とattempt 3を前run完了後に順次実行。両runとも上記主要job、verify、validateがsuccess（extended-e2e／deploy-productionはPR条件skip）。各11 install logでbrowser-only command 1件、旧command 0件、apt／mirror marker 0件。attempt 3 UI artifact（desktop `9366869917`、tablet `9366862337`、mobile `9366843957`、small-mobile `9366803966`）のhomeを目視し、日本語表示正常を確認した。
- workflow_dispatch: run `32257976378`を同一branchで1回実行。mobile-chromium job `96084440819`は`pnpm exec playwright install chromium`、Chromium download、`pnpm run test:e2e:mobile`、14 tests success。mobile logにapt／`Installing dependencies...`なし。Firefox job `96084440499`とWebKit job `96084440574`もsuccessし、両者は従来どおり`--with-deps`とapt markerを通過したがfailureは発生しなかった。verify `96086241824`／validate `96086269569`もsuccess、deploy-preview／deploy-productionはworkflow_dispatch条件でskip。
- Plan／scope: canonical plan `docs/plans/2026-08-19_190200_playwright-ci-install-stability.md`、workflow、CI contract、package／lockfile、Playwright config以外の既存境界は維持。今回の追加CSS／E2E変更はユーザー指定のrepair scopeに明示されており、plan本文は不要な事実更新がないため変更していない。
- Remaining delta: なし。PRはmergeせず、post-mergeのdeploy-production確認はイベント条件上未実施。
- Decision: stop_success。evaluationを`pass`へ更新し、schema validation／sanitizer Write・Check後にRun Artifactを確定する。
- Progress: 100% (19/19)（旧Blocked 2件はタスク17／18で再開・完了し、分母外）。

## 2026-08-19 22:37 (JST)

- Summary: 最終Run Artifact validationを完了した。
- Commands: `pnpm run format:check` => PASS。`pnpm run lint:markdown` => PASS、0 issues。`git diff --check` => PASS（run.jsonのCRLF warningのみ）。`python scripts/validate-output-schema.py .codex/templates/evaluation.schema.json .codex/runs/20260819-201854-JST/evaluation.json` => success。`ConvertFrom-Json`によるrun／evaluation parse => PASS。
- Sanitizer: `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260819-201854-JST -Write -Check` => 5 files、0 changes、0 replacements、0 residual findings。
- Evaluation: `evaluation.json`は`result: pass`、`primary_failure_category: null`へ更新。initial UI regressionはrepairで解消済みとして、final evidenceと履歴をREPORTへ保持した。
- Decision: stop_success。未解決事項はpost-mergeのdeploy-production確認のみで、merge禁止のため実施しない。
- Progress: 100% (19/19)（旧Blocked 2件はタスク17／18で再開・完了し、分母外）。
