# Chromium必須CIとクロスブラウザ確認の分離プラン

## 0. 依頼概要

- 依頼内容:
  - Phase 1 CI の必須ブラウザ検証を Chromium 系へ限定する。
  - Firefox / WebKit の smoke は削除せず、Phase 1 CI から独立した非ブロッキング workflow へ分離する。
  - 2026-08-20 JST の GitHub Actions run `32272685727` で発生した Firefox / WebKit の OS dependency install 停止が、`verify` / `validate` を巻き込む構造を解消する。
- 背景:
  - `Extended E2E (firefox)` / `Extended E2E (webkit)` は、テスト開始前の `playwright install --with-deps` で Ubuntu package mirror への apt 処理が進まず、30分 timeout で `cancelled` となった。
  - Chromium 系 job は `playwright install chromium` に切り替えられており、同runでは主要な Chromium 系 job は成功した。
  - Firefox / WebKit は現状 `e2e/web/smoke.spec.ts` 1本ずつであり、主要な機能品質は Chromium E2E の方が広く深く検証している。
  - PR #34 で `tests/contracts/ci-workflow.test.ts` に CI 構造の contract が追加され、現在の Firefox / WebKit matrix と `--with-deps` 分岐も明示的に固定されているため、workflow変更と同時に contract test の更新が必要である。
- 期待成果:
  - PR / main push の必須品質ゲートが Firefox / WebKit の環境構築不調で失敗しない。
  - Firefox / WebKit のブラウザエンジン差分確認は、定期・手動の独立 workflow で継続する。
  - CI contract test も変更後構成へ更新し、ローカルの `test:contracts` と CI の Vitest contracts が一致する。
  - CI設計変更を `docs/PROJECT_CONTEXT.md`、history、ADR、run artifact にも整合させ、リポジトリの正本ドキュメントを古い状態にしない。

## 1. ゴール / 完了条件

### Goal

Phase 1 CI を Chromium 系の required quality gate として安定化し、Firefox / WebKit smoke を `Cross Browser Smoke` という独立した non-blocking workflow へ分離する。

今回の主目的は Firefox / WebKit CI の高度化ではなく、**必須CIの信頼性を Firefox / WebKit のOS依存環境構築から切り離すこと**である。

### 完了条件（DoD）

#### マージ前

1. `.github/workflows/ci.yml` の `extended-e2e` job id は維持されている。
2. `extended-e2e` は `Extended E2E (mobile-chromium)` の単一jobとなり、1要素 matrix は削除されている。
3. Phase 1 CI に Firefox / WebKit の `playwright install --with-deps` が存在しない。
4. Firefox / WebKit の Playwright project、既存npm script、`smoke.spec.ts` は削除されていない。
5. `.github/workflows/cross-browser-smoke.yml` が追加され、workflow name は `Cross Browser Smoke` である。
6. `Cross Browser Smoke` は `schedule` と `workflow_dispatch` のみを trigger とし、`push` / `pull_request` では起動しない。
7. `Cross Browser Smoke` は `mcr.microsoft.com/playwright:v1.62.0-noble` を使用し、project側 `@playwright/test` とversionが一致している。
8. `Cross Browser Smoke` は automation build を1回だけ行い、Firefox / WebKit を1回の Playwright invocation で実行する。
9. `Cross Browser Smoke` に `PLAYWRIGHT_USE_PREBUILT_DIST=true` と既存 `build-automation` 相当のautomation envが設定されている。
10. `Cross Browser Smoke` の checkout は既存CI契約どおり `persist-credentials: false` を明示する。
11. 新workflowは30分 timeoutを持つ。
12. 新workflow YAML が既存 `yaml` package で parse できる。
13. `tests/contracts/ci-workflow.test.ts` の旧 `extended-e2e` matrix / `--with-deps` contract が変更後構成へ更新されている。
14. `tests/contracts/ci-workflow.test.ts` が新しい `Cross Browser Smoke` の重要契約を focused test で固定している。
15. `pnpm run test:contracts` がsuccessになる。
16. PR event の Phase 1 CI で `verify` / `validate` がsuccessになる。
17. feature branch を指定した既存 `ci.yml` の `workflow_dispatch` で `Extended E2E (mobile-chromium)` / `verify` / `validate` がsuccessになる。
18. `docs/PROJECT_CONTEXT.md` が変更後の現行CI状態を説明している。
19. `docs/PROJECT_CONTEXT.md` が「Phase 1 CI内のbuild-once artifact contract」と「独立Cross Browser Smoke内のbuild-once」を区別している。
20. `docs/PROJECT_CONTEXT.md` 更新前の状態が `docs/history/` に既存規約どおり保存されている。
21. Chromium required / Firefox・WebKit non-blocking / isolated Playwright container の設計判断が新規ADRに記録されている。
22. 既存 `docs/adr/0002-ci-artifact-pipeline.md` は歴史的ADRとして書き換えず、新ADR側で関係性を説明している。
23. `AGENTS.md` に従い、実装時のactive `.codex/runs/<run_id>/` を初期化または再利用し、PLAN / TASKS / REPORT 等の必要artifactへ判断・進捗・検証結果を記録している。
24. Codex Run Artifact は完了前に既存sanitize契約に従って検証されている。
25. アプリケーションコード、E2E test body、Playwright project definition、package versionに不要な変更がない。

#### マージ後の運用開始確認

1. default branch 上の `Cross Browser Smoke` を `workflow_dispatch` で即時実行できる。
2. Firefox smoke と WebKit smoke の両方が実際にテスト実行へ到達する。
3. 両browserがsuccessになる。
4. `playwright install --with-deps` を実行していない。
5. Playwright test step 開始後の通常failureでは `output/playwright` のartifact upload経路が成立する。

container pull failure、job timeout、runner cancellation など、artifact upload step 自体へ到達できないケースでは artifact 取得を保証しない。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- `.github/workflows/ci.yml`
  - Phase 1 CI のrequired経路。
  - `pull_request`、`main` push、weekly schedule、`workflow_dispatch` を持つ。
- `tests/contracts/ci-workflow.test.ts`
  - `.github/workflows/ci.yml` の job / step 契約と、`.github/workflows/*` の remote action SHA pinning を固定する。
  - PR #34 で `extended-e2e` の Chromium / non-Chromium install 分岐を contract 化している。
  - 現状の `branches extended-e2e browser installation by the matrix browser` は今回の変更後には成立しないため更新必須である。
- `playwright.config.ts`
  - `firefox-smoke` / `webkit-smoke` project を定義する。
- `e2e/web/smoke.spec.ts`
  - Firefox / WebKit / Chromium deployed smoke で共有される smoke contract。
- `package.json`
  - `@playwright/test: 1.62.0`。
  - `test:e2e:smoke:firefox` / `test:e2e:smoke:webkit` を保持する。
  - `test:contracts` は `vitest run tests/contracts --no-file-parallelism --maxWorkers=1` を実行する。
- `docs/PROJECT_CONTEXT.md`
  - リポジトリのliving documentであり、CI/CD構成と最新のQA/CI状態を保持する。
  - 「Automation / Production の `dist/` はPhase 1 CI workflow内でそれぞれ一度だけBuildし、後続jobへartifact共有する」という既存契約を持つ。
  - 全 Checkout は `persist-credentials: false` とする既存CI/CD契約を持つ。
- `docs/adr/0002-ci-artifact-pipeline.md`
  - Phase 1 CI の並列job / artifact pipeline / `verify` / `validate` の既存設計判断を保持する。
- `AGENTS.md` / `PLANS.md` / `.agents/skills/feature-plan/**`
  - plan / implementation / living documentation / run artifact のrepo-local contract。

#### Main flow

現在の非PR Phase 1 CI は概ね次の経路で動く。

```text
build-automation
    ↓
extended-e2e matrix
    ├─ mobile-chromium
    ├─ firefox
    └─ webkit
    ↓
verify
    ↓
validate
```

`verify` は非PR eventでは `extended-e2e=success` を必須とするため、Firefox / WebKit の環境構築が `cancelled` になると、Chromium系が成功していても最終required gateが失敗する。

変更後は次とする。

```text
Phase 1 CI / required
├─ build-automation ×1
│  └─ web-dist-automation artifact
└─ extended-e2e
   └─ mobile-chromium

Cross Browser Smoke / non-blocking
└─ 1 Playwright container job
   ├─ automation build ×1（このworkflow内だけ）
   └─ smoke.spec.ts
      ├─ firefox-smoke
      └─ webkit-smoke
```

Cross Browser Smoke は別workflowであり、Phase 1 CI run の `web-dist-automation` artifact をworkflow横断で再利用しない。したがって「build once」は次の2つの独立した境界として扱う。

- Phase 1 CI: workflow内で automation / production build を各1回生成しartifact共有する。
- Cross Browser Smoke: 独立workflow内で automation buildを1回だけ生成し、そのまま同一jobのFirefox / WebKitへ使う。

#### Key abstractions

- `extended-e2e` job id:
  - `verify` が `needs.extended-e2e.result` を参照する内部契約。
  - job idは維持する。
- `Extended E2E (mobile-chromium)` check name:
  - 現行matrixで表示されているcheck名を単一job化後も維持する。
- `validate`:
  - Required Check互換性のため維持する。
- `tests/contracts/ci-workflow.test.ts`:
  - CI構造変更と同時に更新する必要があるrepo-local regression contract。
  - 既存string-based helper / assertion方式を維持し、新しいparser / test frameworkは導入しない。
- `PLAYWRIGHT_USE_PREBUILT_DIST=true`:
  - Playwright test時の `build:web` 再実行を防ぐ。
- automation env:
  - `EXPO_PUBLIC_APP_ENV=automation`
  - `EXPO_PUBLIC_BUILD_KIND=automation`
  - `EXPO_PUBLIC_TEST_MODE=true`
  - `EXPO_PUBLIC_DEFAULT_SEED=default`
  - `EXPO_PUBLIC_BUILD_SHA=${{ github.sha }}`

#### Existing tests / checks

Phase 1 CI の Chromium 系では次が存在する。

- `Chromium E2E (required)`
- `Chromium E2E (accessibility)`
- `Chromium E2E (mobile-boundary)`
- `Chromium E2E (cross-role)`
- `Chromium E2E (training-web-baseline)`
- `UI Review` 4 viewport
- `production-smoke`
- `Extended E2E (mobile-chromium)`

Firefox / WebKit はどちらも `e2e/web/smoke.spec.ts` を実行する。

`smoke.spec.ts` の確認範囲は次である。

- トップページ表示
- 見出し表示
- 商品一覧への遷移
- 商品一覧表示
- 商品画像ロード
- console error がないこと
- page error がないこと

テスト本体は Chromium の `deployed-smoke` と共通だが、対象artifactは完全には同一ではない。

- `deployed-smoke`: production artifact
- 現行 Firefox / WebKit `extended-e2e`: automation artifact

そのため Firefox / WebKit を「Chromium smoke の完全な重複」とは扱わない。一方、automation build自体はChromiumのより広いPhase 1 E2Eで検証されているため、Firefox / WebKit smokeの主な追加価値はブラウザエンジン差分の確認である。

現行 `tests/contracts/ci-workflow.test.ts` には少なくとも次の関連contractがある。

- Chromium-only jobでは `playwright install chromium` を使う。
- `extended-e2e` はmatrix browserに応じてChromium / non-Chromium installを分岐する。
- 全remote workflow actionはfull-length commit SHAへpinする。
- Phase 1 CIの後続consumerはdownload済みartifactを再buildしない。

今回 `extended-e2e` のmatrix contractは意図的に変更するため、旧assertionを残してはいけない。

#### Safe change surface

今回安全に変更する範囲は次に限定する。

- GitHub Actions workflow構成
- CI contract test
- CI/CDのliving documentation
- PROJECT_CONTEXT history
- CI方針を記録する新規ADR
- 実装runの標準 `.codex/runs` artifact

アプリケーション実装、E2E assertion本体、Playwright project definition、依存versionは変更しない。

#### Unknowns

- 実装時点で `@playwright/test` が `1.62.0` のままか。
- 実装時点で対応する official Playwright image exact tag が利用可能か。
- 実装開始時にactive runが既に存在するか。
- 実装時点でADR `0019` が未使用か。
- 実装時点で `tests/contracts/ci-workflow.test.ts` に追加変更が入っていないか。

これらは既存repo状態から実装時に確認できる。前提が崩れた場合は勝手に代替せず、本プランの該当箇所を再評価する。

### Assumptions

- Phase 1 CI のrequired browser guaranteeは Chromium 系へ限定してよいというユーザー合意がある。
- Firefox / WebKit は正式削除ではなく、non-blocking cross-browser smokeとして保持する。
- Firefox / WebKit の現行1本ずつのsmoke規模では、build共有 + artifact + matrixの3-job構成より1-job構成を優先する。
- 新workflow専用のSlack通知等は追加せず、GitHub Actionsの既存run確認運用で扱う。
- CI contract testは既存のraw text / helper方式を踏襲し、新規YAML parserや別validator frameworkを導入しない。
- 新規ADR番号は現在の連番上 `0019` を想定するが、実装時に使用済みなら次の空き番号を使う。

### Non-goals

- Firefox / WebKit test自体の削除
- Firefox / WebKit向け独自test case追加
- Chromium E2Eシナリオ変更
- アプリケーションコード変更
- package manager / Node / Playwright version update
- timeoutを60分等へ単純延長する対症療法
- apt retry script追加
- 独自Docker image作成
- reusable workflowへの大規模refactor
- cross-browser用 build/artifact/matrix 3-job構成
- branch protection緩和
- Playwright version不一致imageへのfallback
- `latest` / canary imageへの無条件切替
- cross-browser workflow専用通知基盤追加
- CI contract test用の新しいparser / validator framework追加
- 既存ADR-0002の履歴を書き換えること
- 過去の `docs/PROJECT_CONTEXT.md` 内のPR #34等の歴史的記述を、今回の現行状態に合わせて改変すること

## 3. 質問 / 曖昧性

### Contract marker

`mandatory-question`

### 必ず質問する不透明点

現時点で blocking question はない。

ユーザーとは次の方針で合意済みである。

- required CIはChromium系にする。
- Firefox / WebKitは削除せず、定期・手動のnon-blocking workflowへ分離する。
- 必要以上にCIを複雑化しない。

### 仮定してよい細部

- 新ADRの正確な連番は実装時の最新 `docs/adr/` 状態から決める。
- PROJECT_CONTEXT historyのtimestampは実装時JSTで決める。
- actionsのSHAは実装時の既存 `ci.yml` と同じpinを再利用する。
- container user optionは初期実装では追加しない。実runで権限問題が確認された場合のみ再評価する。
- CI contract testのtest名は既存命名規則に合わせて局所的に決めてよい。

### 未回答の重要質問

なし。

### Follow-up notes

- Firefox / WebKitを将来正式サポートブラウザとしてPR単位で強く保証する要件が生じた場合は、頻度、test範囲、required化を別途再評価する。
- cross-browser test数・実行時間が増えた場合のみ、build共有 + matrix並列化を再検討する。

## 4. 影響範囲

### Impacted areas

1. Phase 1 CI required browser構成
2. non-blocking cross-browser smoke運用
3. CI workflow contract test
4. CI/CD living documentation
5. CI architecture decision record
6. Codex implementation run artifacts

### Files to inspect

実装前に最低限次を再確認する。

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`
- `.github/workflows/ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `package.json`
- `playwright.config.ts`
- `e2e/web/smoke.spec.ts`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/README.md`
- `docs/adr/0002-ci-artifact-pipeline.md`
- `docs/plans/TEMPLATE.md`
- active `.codex/runs/<run_id>/` の有無

### 実装で変更するファイル

必須:

- `.github/workflows/ci.yml`
- `.github/workflows/cross-browser-smoke.yml`（新規）
- `tests/contracts/ci-workflow.test.ts`
- `docs/PROJECT_CONTEXT.md`
- `docs/history/<implementation-JST-timestamp>_project-context-before-chromium-required-ci-cross-browser-split.md`（新規。既存history conventionに合わせる）
- `docs/adr/0019-chromium-required-ci-cross-browser-smoke.md`（新規。実装時に0019が使用済みなら次の空き番号）

repo-local implementation contractに従う標準成果物:

- `.codex/runs/<run_id>/PLAN.md`
- `.codex/runs/<run_id>/TASKS.md`
- `.codex/runs/<run_id>/REPORT.md`
- workflow levelで必要なら `.codex/runs/<run_id>/run.json`

既存active runがある場合は新規runを作らず再利用する。

### 原則変更しないファイル

- `package.json`
- `playwright.config.ts`
- `e2e/web/smoke.spec.ts`
- `docs/adr/0002-ci-artifact-pipeline.md`

ただし実装時の事実確認で前提が崩れていた場合は、本プランを見直してから変更する。

## 5. 変更方針

### Change strategy

#### 5.1 実装runを初期化または再利用する

`AGENTS.md` に従う。

1. active runの有無を確認する。
2. 同一会話/同一タスクのactive runがあれば再利用する。
3. なければ既存 `new-run` 経路を優先して初期化する。
4. PLAN / TASKSへ本プランを実装可能なタスク単位で反映する。
5. REPORTへ行動・判断・検証結果をappend-onlyで記録する。

過去runをcleanup目的で削除・置換しない。

#### 5.2 Playwright Docker image前提を確認する

実装前に次を確認する。

- `package.json` の `@playwright/test` が `1.62.0` のままである。
- `mcr.microsoft.com/playwright:v1.62.0-noble` がofficial exact tagとして利用可能である。
- project packageとcontainer image versionが一致する。

利用不能な場合は次を行わない。

- 旧version imageへの勝手なfallback
- `latest` 利用
- canaryへの無条件切替

version一致を維持できない場合は、cross-browser workflow導入を止めて本プランを再評価する。

#### 5.3 Phase 1 CI を mobile Chromium専用 extended E2Eへ単純化する

`.github/workflows/ci.yml` の `extended-e2e` を変更する。

変更内容:

- Firefox matrix entry削除
- WebKit matrix entry削除
- 1要素となるmatrix自体を削除
- `Install browser with system dependencies` step削除
- `Install Chromium` を条件なしで維持
- `pnpm run test:e2e:mobile` を直接実行
- existing automation env維持
- automation artifact download維持
- `extended-e2e` job id維持
- `name: Extended E2E (mobile-chromium)` を明示しcheck名互換性を維持

意図する構造:

```yaml
extended-e2e:
  if: github.event_name != 'pull_request'
  name: Extended E2E (mobile-chromium)
  needs: build-automation
  runs-on: ubuntu-latest
  timeout-minutes: 30
  env:
    PLAYWRIGHT_USE_PREBUILT_DIST: "true"
    EXPO_PUBLIC_APP_ENV: automation
    EXPO_PUBLIC_BUILD_KIND: automation
    EXPO_PUBLIC_TEST_MODE: "true"
    EXPO_PUBLIC_DEFAULT_SEED: default
  steps:
    # existing checkout / pnpm / node / install / artifact download
    - name: Install Chromium
      run: pnpm exec playwright install chromium

    - name: Run extended E2E
      run: pnpm run test:e2e:mobile
```

`verify` / `validate` の判定ロジックは、Firefox / WebKitを個別参照する条件が新たに見つからない限り変更しない。

#### 5.4 `Cross Browser Smoke` を1-jobで追加する

新規:

```text
.github/workflows/cross-browser-smoke.yml
```

workflow名:

```yaml
name: Cross Browser Smoke
```

Trigger:

```yaml
on:
  schedule:
    - cron: "17 19 * * 0"
  workflow_dispatch:
```

`17 19 * * 0` は Monday 04:17 JST 相当。既存 Phase 1 CI weekly schedule (`0 18 * * 0`) とずらし、毎時00分も避ける。

Permissions:

```yaml
permissions:
  contents: read
```

Workflow-level env:

```yaml
env:
  CI: "true"
  NODE_VERSION: "24"
  PNPM_VERSION: "9.10.0"
```

Job:

```yaml
jobs:
  cross-browser-smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    container:
      image: mcr.microsoft.com/playwright:v1.62.0-noble
```

job env:

```yaml
env:
  PLAYWRIGHT_USE_PREBUILT_DIST: "true"
  EXPO_PUBLIC_APP_ENV: automation
  EXPO_PUBLIC_BUILD_KIND: automation
  EXPO_PUBLIC_TEST_MODE: "true"
  EXPO_PUBLIC_DEFAULT_SEED: default
  EXPO_PUBLIC_BUILD_SHA: ${{ github.sha }}
```

Checkoutは既存CI/CD security contractを明示的に維持する。

```yaml
- uses: actions/checkout@<既存ci.ymlと同じfull-length SHA>
  with:
    persist-credentials: false
```

残りのremote actionも既存 `ci.yml` と同じfull-length SHA pinを再利用する。

Steps:

1. checkout (`persist-credentials: false`)
2. pnpm setup
3. Node 24 setup
4. `pnpm install --frozen-lockfile --ignore-scripts`
5. `pnpm run build:web`
6. `test -f dist/index.html`
7. Firefox / WebKit smokeを1回のPlaywright invocationで実行
8. Playwright test開始後の通常failure時に `output/playwright` をupload

Playwright invocation:

```bash
pnpm exec playwright test e2e/web/smoke.spec.ts \
  --project=firefox-smoke \
  --project=webkit-smoke
```

今回の規模では次を導入しない。

- browser別matrix
- build artifact upload/download
- reusable workflow
- custom Docker image
- concurrency設定

container user optionも初期必須要件にしない。trusted repository E2Eのため、実行上の権限問題が確認された場合だけ追加検討する。

Failure artifact:

```text
playwright-cross-browser-${{ github.run_id }}-${{ github.run_attempt }}
```

`if: ${{ failure() }}` で `output/playwright` をuploadする。ただしこれはPlaywright test step開始後の通常failureを対象とする。container pull failure、job timeout、runner cancellationなど、upload stepに到達しないfailureではartifactを保証しない。

#### 5.5 CI contract testを変更後構成へ更新する

対象:

```text
tests/contracts/ci-workflow.test.ts
```

PR #34で追加された現在の次のcontractは、今回の変更後には意図的に成立しなくなる。

```text
branches extended-e2e browser installation by the matrix browser
```

このtestを削除して無保証にするのではなく、変更後のrequired contractへ置き換える。

##### `extended-e2e` のfocused contract

既存 `jobBlock()` / `stepBlock()` 等のstring-based方式をそのまま使い、最低限次を固定する。

- `extended-e2e` job idが存在する。
- `name: Extended E2E (mobile-chromium)` を持つ。
- `matrix.browser` / Firefox / WebKit entryを持たない。
- `Install Chromium` が `pnpm exec playwright install chromium` を実行する。
- `extended-e2e` job内に `--with-deps` が存在しない。
- `pnpm run test:e2e:mobile` を実行する。
- `PLAYWRIGHT_USE_PREBUILT_DIST: "true"` を維持する。

##### `Cross Browser Smoke` のfocused contract

`cross-browser-smoke.yml` を同test fileから読み、既存のraw-text contract方式で重要な構造だけ固定する。

最低限:

- workflow nameが `Cross Browser Smoke`。
- `schedule` / `workflow_dispatch` が存在し、`push` / `pull_request` をtriggerにしない。
- `timeout-minutes: 30`。
- container imageが `mcr.microsoft.com/playwright:v1.62.0-noble`。
- checkoutに `persist-credentials: false`。
- automation envと `PLAYWRIGHT_USE_PREBUILT_DIST=true`。
- `pnpm run build:web` は1回だけ。
- Firefox / WebKit projectを同じPlaywright invocationで指定する。
- `playwright install` / `--with-deps` を実行しない。

既存の `allWorkflows` による「全remote actionは40文字SHA pin」のcontractは新workflowにも自動適用されるため、同等assertionを重複追加しない。

新しいYAML parser / validator / helper frameworkは追加しない。既存contract testを変更後構成へ最小限追従させる。

#### 5.6 Living documentation を更新する

##### `docs/history/`

`docs/PROJECT_CONTEXT.md` を更新する前に、既存history conventionに従い変更前状態をJST timestamp付きhistoryへ保存する。

想定path:

```text
docs/history/<implementation-JST-timestamp>_project-context-before-chromium-required-ci-cross-browser-split.md
```

##### `docs/PROJECT_CONTEXT.md`

現行CI状態として最低限次を反映する。

- Phase 1 CI のrequired browser pathはChromium系のみ。
- `extended-e2e` はmobile Chromium専用。
- Firefox / WebKit smokeは `Cross Browser Smoke` へ分離。
- `Cross Browser Smoke` はschedule + workflow_dispatchのみ。
- `Cross Browser Smoke` はmain / PRをblockしない。
- Firefox / WebKitはofficial Playwright containerで実行し、Phase 1 CIの `--with-deps` 依存を除去。
- package / container image version一致を維持する。
- 全 Checkout の `persist-credentials: false` 契約を新workflowでも維持する。
- Phase 1 CIのautomation / production `dist` は従来どおりworkflow内で各1回だけbuildしartifact共有する。
- Cross Browser Smokeは別workflowなのでPhase 1 artifactを横断再利用せず、そのworkflow内でautomation buildを1回だけ行う。

既存 `Agentic QA Feedback Loop Latest-main Delta Rebaseline` 等にある「PR #34時点ではFirefox / WebKitの`--with-deps`を維持した」という記述は、その時点の歴史的事実なので書き換えない。必要ならその後のcurrent-state deltaを新しく追記する。

#### 5.7 新規ADRへCI方針変更を記録する

現在の連番では次を想定する。

```text
docs/adr/0019-chromium-required-ci-cross-browser-smoke.md
```

実装時に0019が使用済みなら次の空き番号を使う。

最低限 `Context / Decision / Consequences` を含める。

Decisionには次を記録する。

- Phase 1 CI のrequired browser guaranteeをChromium系へ限定する。
- Firefox / WebKit smokeをnon-blocking separate workflowへ移す。
- cross-browser workflowはweekly + manual only。
- cross-browser workflowだけ official Playwright containerを使用する。
- package / image versionを一致させる。
- Firefox / WebKit test自体は削除しない。
- 将来正式サポート要件が変わればrequired化を再評価する。
- Phase 1 CIのbuild-once artifact pipelineは維持し、Cross Browser Smokeは独立workflow内でのみautomation buildを1回行う。

既存 `ADR-0002` との関係も明記する。

- ADR-0002のPhase 1 CI artifact pipeline / `verify` / `validate` / required check互換性は維持する。
- ADR-0002の「Container化はNon-goal」は当時のPhase 1 CI設計に対する判断として保持する。
- 今回はPhase 1 CI全体をcontainer化するのではなく、**隔離したnon-blocking cross-browser workflowだけに限定して公式containerを採用する追加判断**である。
- ADR-0002を過去に遡って書き換えない。

#### 5.8 Run artifactを更新・sanitizeする

実装中は `AGENTS.md` に従い、active runのTASKS / REPORT等を更新する。

完了前に既存sanitize契約に従いCodex Run Artifactをcheckする。

今回のplan revision自体はplan-onlyであり、`docs/reports/` に新しいreport fileを作らない。

### 実行タスク

- [ ] 1. active runと最新repo状態を確認する。
- [ ] 2. Playwright package / official image exact version整合を確認する。
- [ ] 3. `.github/workflows/ci.yml` の `extended-e2e` をmobile Chromium専用へ単純化する。
- [ ] 4. `.github/workflows/cross-browser-smoke.yml` を1-job構成で追加する。
- [ ] 5. `tests/contracts/ci-workflow.test.ts` を変更後CI契約へ最小更新する。
- [ ] 6. 新workflow YAMLとCI contractを静的確認する。
- [ ] 7. focused `pnpm run test:contracts` を実行する。
- [ ] 8. PROJECT_CONTEXT更新前のhistoryを保存する。
- [ ] 9. `docs/PROJECT_CONTEXT.md` を現行CI構成へ更新する。
- [ ] 10. 新規ADRへrequired browser / cross-browser container判断を記録する。
- [ ] 11. PR eventのPhase 1 CIを確認する。
- [ ] 12. feature branch指定 `ci.yml` workflow_dispatchで非PR経路を確認する。
- [ ] 13. run artifactsへ検証結果を記録しsanitizeする。
- [ ] 14. マージ後、`Cross Browser Smoke` をworkflow_dispatchで即時確認する。

## 6. 検証方法

### Validation plan

#### 6.1 静的確認

新規 `cross-browser-smoke.yml` はdefault branchへ入るまでGitHub UIから `workflow_dispatch` できないため、マージ前の静的確認を明示する。

既存 `yaml` packageでparse確認する。

```bash
node -e "const fs=require('fs'); const YAML=require('yaml'); YAML.parse(fs.readFileSync('.github/workflows/cross-browser-smoke.yml','utf8'));"
```

これはGitHub Actions semantic validationの完全な代替ではない。基本的なYAML syntax errorをマージ前に除去する目的で使う。

追加確認:

- workflow nameが `Cross Browser Smoke`
- `push` / `pull_request` triggerがない
- `schedule` / `workflow_dispatch` のみ
- `permissions: contents: read`
- timeout 30分
- package / container image version一致
- existing action SHA pinning方針と一致
- checkoutに `persist-credentials: false`
- automation envが存在
- `PLAYWRIGHT_USE_PREBUILT_DIST=true`
- `pnpm run build:web` が1回だけ
- `ci.yml` に Firefox / WebKit `--with-deps` が残っていない
- `extended-e2e` に不要なmatrixが残っていない
- `extended-e2e` job id維持
- `Extended E2E (mobile-chromium)` check name維持

#### 6.2 Focused CI contract gate

今回CI workflow contract自体を変更するため、次を**必須**で実行する。

```bash
pnpm run test:contracts
```

成功条件:

- 既存contract suiteが全件success。
- 旧 Firefox / WebKit matrix contractが変更後contractへ置き換わっている。
- new `Cross Browser Smoke` focused contractがsuccess。
- 既存all-workflows action SHA pin contractもsuccess。

`test:contracts` を通さずPR CIだけで変更を確定しない。

#### 6.3 リポジトリ標準検証

workflow / TypeScript contract test / Markdown / docs変更を含むため、変更範囲に応じて最低限次を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
```

`pnpm run test:contracts` は6.2で必須実行する。

必要に応じて標準全体入口も実行する。

```bash
pnpm run verify
```

実行できない検証がある場合は、未実行項目・理由・残るriskをrun reportへ記録する。

#### 6.4 PR eventで確認すること

PRでは `extended-e2e` は `if: github.event_name != 'pull_request'` によりskipされる。

確認事項:

- Style / Code Quality success
- Vitest contracts success
- Chromium E2E success
- UI Review success
- production-smoke success
- `extended-e2e` skipped
- `verify` がPR時の `extended-e2e=skipped` を許容してsuccess
- `validate` success

#### 6.5 feature branch指定の既存 Phase 1 CI `workflow_dispatch`

`ci.yml` はdefault branchに既に存在するため、feature branch refを指定して変更後の非PR経路を確認する。

確認事項:

- `Extended E2E (mobile-chromium)` が実行されsuccess
- `Extended E2E (firefox)` が存在しない
- `Extended E2E (webkit)` が存在しない
- Vitest contracts success
- `verify` success
- `validate` success
- `deploy-preview` はworkflow_dispatch契約どおりskipped

#### 6.6 マージ後 `Cross Browser Smoke` 手動確認

新workflowはdefault branchに存在した後に `workflow_dispatch` する。

確認事項:

- workflowを手動起動できる
- official Playwright containerをpullできる
- dependency install成功
- checkout credential persistenceを有効化していない
- automation envでbuildが1回だけ実行される
- `dist/index.html` が存在
- Firefox smokeが実行される
- WebKit smokeが実行される
- `playwright install --with-deps` が実行されない
- Firefox / WebKit両方success

通常のPlaywright test failureを確認する必要が生じた場合のみ、failure artifact経路が成立することを確認する。artifact確認のために意図的にテストを壊す変更はしない。

#### 6.7 ドキュメント整合確認

- `docs/PROJECT_CONTEXT.md` のcurrent stateがworkflow実装と一致する。
- PROJECT_CONTEXTがPhase 1のbuild-once artifact contractとCross Browser Smoke内のbuild-onceを区別している。
- 歴史的PR #34記述を事後的に書き換えていない。
- history fileがPROJECT_CONTEXT更新前の状態を保持する。
- 新ADRが `Context / Decision / Consequences` を含む。
- 新ADRがADR-0002との関係を明記する。
- ADR-0002自体を変更していない。
- active runのREPORTに実行した検証と未実行項目が記録されている。

### 成功判定

マージ前DoDをすべて満たし、focused `test:contracts`、PR CI、feature-branch workflow_dispatch の Phase 1 CI required pathがsuccessになること。

そのうえでマージ後の `Cross Browser Smoke` 初回manual runがFirefox / WebKitの実テストまで到達して両方successになれば、運用開始まで完了とする。

## 7. リスクと未解決論点

### Risks

#### 7.1 Firefox / WebKit固有不具合の検知がPR単位ではなくなる

必須CIから外すため、Firefox / WebKit固有不具合の検知は定期実行まで遅れる可能性がある。

現状は1本のsmokeのみで、主要機能品質はChromium E2Eがより深く確認しているため許容する。

#### 7.2 CI contract testが旧構造を固定している

PR #34で追加された `tests/contracts/ci-workflow.test.ts` は、現行 `extended-e2e` のmatrix browser分岐とnon-Chromium `--with-deps` を意図的に固定している。

workflowだけ変更すると `pnpm run test:contracts` / Vitest contractsが失敗する。

対策:

- workflow変更と同じ差分でcontract testを更新する。
- 旧contractを単純削除せず、新しいmobile-Chromium-only contractへ置き換える。
- Cross Browser Smokeの重要構造もfocused contractとして追加する。
- 新parser / frameworkは導入しない。

#### 7.3 Playwright package / Docker image versionずれ

versionがずれるとcontainer内browserとproject側Playwrightが整合しない可能性がある。

Playwright update時は次を同時変更する。

- `package.json` の `@playwright/test`
- `cross-browser-smoke.yml` の `mcr.microsoft.com/playwright:<version>-noble`

workflow内にもversion一致が必要である旨をコメントする。

#### 7.4 official image tag公開タイミング

release直後など、packageとimage公開タイミングがずれる可能性がある。

exact tagが利用できなければ異なるversionで代用せず、本プランを再評価する。

#### 7.5 Microsoft Container Registry / GitHub Actions一時障害

cross-browser workflowが失敗してもPhase 1 CI / main / PRはblockしない。

scheduled runが失敗した場合は次の順で扱う。

1. run logと、取得可能ならPlaywright artifactを確認する。
2. container pull / GitHub Actions / registry等の一時要因が疑われる場合、`workflow_dispatch` で1回再実行する。
3. 再実行でsuccessなら一時環境要因として扱う。
4. 同じFirefox / WebKit failureが再現する場合、browser固有不具合またはtest不具合として通常調査する。
5. 原因確認なしにFirefox / WebKitをPhase 1 CI requiredへ戻さない。

#### 7.6 新workflowはマージ前に実runner確認できない

新規 `workflow_dispatch` workflowはdefault branchへ入るまでUIから直接起動できない。

対策:

- YAML parse
- focused CI contract test
- workflow静的確認
- PR CI
- 既存 `ci.yml` のfeature branch workflow_dispatch
- マージ直後のCross Browser Smoke manual run

#### 7.7 Failure artifactの限界

`if: failure()` のartifact uploadは、upload stepへ到達できる通常failureを対象とする。

次はartifactを保証しない。

- container pull failure
- job-level timeout
- runner cancellation
- setup前のfailure

artifactがないこと自体を「Playwright artifact生成失敗」と誤判定しない。

#### 7.8 Living documentationのbuild境界を混同するリスク

Phase 1 CIには既存の「automation / production buildを各1回生成してartifact共有する」契約がある。

Cross Browser Smokeは独立workflowなので、そのartifactを再利用せず別途automation buildを1回実行する。

これを曖昧に書くと、将来「build once契約に違反している」と誤解される可能性がある。

対策:

- PROJECT_CONTEXTと新ADRで、Phase 1 workflow内のbuild-onceとCross Browser Smoke workflow内のbuild-onceを別境界として明記する。

#### 7.9 Checkout credential contractの脱落

既存PROJECT_CONTEXTは全Checkoutで `persist-credentials: false` を要求している。

新workflowで省略するとrepo-local security contractとの不整合になる。

対策:

- Cross Browser Smokeのcheckoutに明示する。
- focused CI contractでも確認する。

#### 7.10 Living documentationの履歴破壊

`docs/PROJECT_CONTEXT.md` の過去時点の事実を、現在の実装へ合わせて上書きすると履歴の意味を壊す。

対策:

- update前のPROJECT_CONTEXTをhistoryへ保存する。
- historical deltaは残す。
- current stateだけを更新・追記する。

### Open questions

blocking open questionはなし。

実装時確認事項として次だけ残す。

- Playwright versionが変わっていないか。
- exact official image tagが利用可能か。
- ADR next numberが0019のままか。
- active runを再利用すべきか新規作成すべきか。
- CI contract testが実装開始までに追加変更されていないか。

いずれもrepo状態から確定できるため、現時点でユーザー回答を必要としない。

## 8. 成果物

### 変更ファイル

実装完了時の主要成果物:

- `.github/workflows/ci.yml`
- `.github/workflows/cross-browser-smoke.yml`
- `tests/contracts/ci-workflow.test.ts`
- `docs/PROJECT_CONTEXT.md`
- `docs/history/<implementation-JST-timestamp>_project-context-before-chromium-required-ci-cross-browser-split.md`
- `docs/adr/0019-chromium-required-ci-cross-browser-smoke.md` または実装時点の次の空き連番

### 付随ドキュメント / run artifacts

- `.codex/runs/<run_id>/PLAN.md`
- `.codex/runs/<run_id>/TASKS.md`
- `.codex/runs/<run_id>/REPORT.md`
- 必要な場合のみ `.codex/runs/<run_id>/run.json`

plan-only / implementation progressのために `docs/reports/` へ新規report fileは作らない。

### 変更しない成果物

原則として次は変更しない。

- application code
- `package.json`
- `playwright.config.ts`
- `e2e/web/smoke.spec.ts`
- `docs/adr/0002-ci-artifact-pipeline.md`

## 9. 備考

### Rollback

#### Cross Browser Smokeだけに問題がある場合

1. `cross-browser-smoke.yml` を無効化または削除する。
2. Cross Browser Smoke向けcontract testを同時に戻す。
3. Chromium required CIは維持する。
4. Firefox / WebKitの実行方式だけを再評価する。

non-blocking workflowの問題を理由に、Firefox / WebKitを即座にPhase 1 CI requiredへ戻さない。

#### Chromium requiredへの分離自体に問題がある場合

必要性を再評価したうえでFirefox / WebKitを `ci.yml` へ戻す。

その場合は `tests/contracts/ci-workflow.test.ts` も復元後構成に合わせて変更する。

ただし今回問題となった `playwright install --with-deps` をそのまま復活させず、環境構築方式も同時に再設計する。

### 最終構成

```text
Phase 1 CI / required
├─ Chromium required E2E
├─ Chromium accessibility
├─ Chromium mobile boundary
├─ Chromium cross-role
├─ Chromium training baseline
├─ UI Review
├─ production smoke
└─ Extended E2E (mobile-chromium)

Cross Browser Smoke / non-blocking
└─ 1 Playwright container job
   ├─ automation build ×1
   └─ smoke.spec.ts
      ├─ firefox-smoke
      └─ webkit-smoke

CI contract
└─ tests/contracts/ci-workflow.test.ts
   ├─ mobile-Chromium-only extended-e2e contract
   ├─ Cross Browser Smoke isolation contract
   └─ existing all-workflow action SHA pin contract
```

Chromiumを日常のrequired quality gateとする。

Firefox / WebKitは削除せず、Phase 1 CIから完全に切り離した軽量な1-job workflowで補完確認する。

現時点のcross-browser test規模に対してbuild共有・artifact受け渡し・matrix並列化は導入せず、必要になった時点で拡張する。

CI workflow変更とcontract test変更を同一実装単位として扱い、required gateとrepo-local contractの不整合を残さない。

これを今回の最小かつ現実的な変更範囲とする。
