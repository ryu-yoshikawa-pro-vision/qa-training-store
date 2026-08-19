# Plan

## Objective

既存の`docs/plans/2026-08-19_190200_playwright-ci-install-stability.md`を正本として、Chromiumのbrowser binary installを維持したまま、固定5 jobと`extended-e2e`のChromiumだけからruntime `apt`依存を外す。

## Scope

- In:
  - `.github/workflows/ci.yml`のChromium固定5 jobのinstallコマンド変更。
  - `extended-e2e`のChromium／非Chromium install stepの条件分岐。
  - `tests/contracts/ci-workflow.test.ts`の最小focused contract追加。
  - 必須local gate、PR #34のCI／log／artifact、同一commit rerun、workflow_dispatchの確認。
  - Strict Run Artifactの保存・sanitization・evaluation。
- Out:
  - Firefox／WebKitの挙動、matrix、`max-parallel`、timeout、`verify`／`validate` gate。
  - package、lockfile、Playwright設定、E2E本体、application／training code。
  - apt retry／mirror変更、cache、Docker、runner変更、Playwright／Node／pnpm更新。
  - PR merge、新規PR作成、履歴改変。

## Assumptions

- `origin/main`はplan記載のbase commitと一致しており、取り込みは不要である。
- PR #34は同一リポジトリのinternal PRであり、変更push後に既存PRのCIを確認できる。
- GitHub connectorでPR metadata、workflow jobs、logs、artifactsを確認し、connectorで取得できない情報は結果として明記する。
- 既存の`jobBlock()`／`stepBlock()`をそのまま使い、新しいparser／validator／frameworkは作らない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象branch、PR、plan、変更範囲、検証条件が明示されている。
- 仮定してよい細部: contractは1〜2個のfocused testへまとめ、既存step名を維持する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Chromium固定jobのbrowser-only installで、Chromium test開始前のapt／Ubuntu mirror経路が消える。
- H2: `extended-e2e`の`matrix.browser == 'chromium'`分岐により、mobile-chromiumだけbrowser-onlyとなり、Firefox／WebKitは従来の`--with-deps`を維持できる。
- H3: runnerのChromium runtime dependencyが不足していなければ、install後のlaunch／既存test／UI Reviewは成立する。

## Research Plan

- Round 1 Query: required docs、最新ADR、過去Run、指定plan、main／branch／PR #34、対象workflow／contractの現状を確認する。
- Round 2 Query: 実装後にlocal gate、mainとの差分、PR job／install log／UI artifact、rerun、workflow_dispatchを確認する。
- Exit Criteria:
  - H1/H2/H3をlocal構造・contract・CI結果で支持または反証できる。
  - 変更sourceが指定3ファイル（plan更新時のみplan含む）に収まり、禁止事項とgate変更がない。
  - 未確認のPR／post-merge項目は、取得不能理由と次アクションを明記する。

## Approach

1. main／baseline／PR #34の現状を記録する。
2. `.github/workflows/ci.yml`を指定コマンドと条件分岐だけ変更する。
3. `tests/contracts/ci-workflow.test.ts`へ固定5 job、条件式、無条件step不在の契約を追加する。
4. format、Markdown lint、contracts、差分scopeを確認する。
5. 変更を既存branchへ通常commit／pushし、PR #34のPhase 1 CIを完了させる。
6. install log、UI Review 4 viewport、同一commitの順次rerun、workflow_dispatchのmobile-chromiumを確認する。
7. Firefox／WebKitの既存apt failureと今回の条件分岐regressionを切り分け、Run Artifactをsanitizeして完了判定する。

## Definition of Done

- 固定5 jobが`pnpm exec playwright install chromium`を使い、`--with-deps chromium`を使わない。
- `extended-e2e`に条件付きChromium stepと条件付き非Chromium stepがあり、無条件のmatrix `--with-deps`がない。
- Firefox／WebKitの既存install、matrix、`max-parallel`、`verify`／`validate`が不変である。
- 指定local 3 gateが成功する。
- PR #34の確認可能なrequired check、install log、UI Review、rerun、workflow_dispatch結果を記録する。
- source差分が許可範囲内で、Run Artifact sanitizer Write／Checkとstrict evaluationが成功する。

## Risks / Unknowns

- GitHub runnerに必要なChromium libraryが不足する場合は、推測でpackageを追加せず、Playwright error／dry-runを記録して代替案として停止する。
- Firefox／WebKitの既存`--with-deps`がworkflow_dispatchでmirror failureを起こす可能性がある。その場合もgateは緩めず、Chromium修正とは分離する。
- PR CI／rerun／workflow_dispatch／artifact取得は外部状態に依存するため、権限・実行中・未提供の情報は未確認として明記する。
- merge禁止のため、`deploy-production`とpost-merge main確認は今回の実行完了条件外として未実施を記録する。

## Thinking Log

- 2026-08-19 JST: `origin/main`、branch、PR #34のbaseはplanのbase commit `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`で一致したため、planのbase更新は不要と判断した。
- 2026-08-19 JST: PR #34のplan-only初回Phase 1 CIでは、複数Chromium／UI Review jobが成功する一方、Chromium E2E requiredが`Install Chromium`で実行中だった。実装前baselineとして記録する。
- 2026-08-19 JST: 初回browser-only UI ReviewでLink由来の日本語font fallback退行を確認したため、repair-loopのallowed-filesを`src/presentation/styles/global.css`と`e2e/web/ui-ux-improvements.spec.ts`へ限定した。`a[href]`の`font-family`継承と既存Flow Eのcomputed CSS assertionを1 iterationで適用し、local E2E／lint／typecheck／contractを通過した後にremote検証へ進む。
