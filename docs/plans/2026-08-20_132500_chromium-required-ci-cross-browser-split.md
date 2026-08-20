# Chromium必須CIとクロスブラウザ確認の分離プラン

## 1. 目的

Phase 1 CI の必須品質ゲートを Chromium 系に絞り、Firefox / WebKit のクロスブラウザ smoke を独立した非ブロッキング workflow に分離する。

狙いは次の3点とする。

1. `main` push や通常の必須CIが、Firefox / WebKit のOS依存パッケージ取得不調で巻き込まれて失敗・キャンセルされることを防ぐ。
2. Firefox / WebKit のクロスブラウザ確認自体は削除せず、定期実行・手動実行で継続する。
3. アプリケーションコードやテストケースを変更せず、CI構成だけを必要最小限変更する。

今回の主目的は Firefox / WebKit のCIを高度化することではなく、必須CIの信頼性をクロスブラウザ環境構築の不安定さから切り離すことである。

## 2. 背景

2026-08-20 JST に確認した GitHub Actions run `32272685727` では、主要な Chromium 系 job はすべて成功した一方で、次の2 job が `cancelled` となった。

- `Extended E2E (firefox)`
- `Extended E2E (webkit)`

両方ともテスト実行前の次の処理で停止した。

```bash
pnpm exec playwright install --with-deps firefox
pnpm exec playwright install --with-deps webkit
```

Ubuntu 24.04 runner 上で Ubuntu package mirror への apt 処理が進まなくなり、`extended-e2e` の `timeout-minutes: 30` に到達してキャンセルされた。

その結果、後段の `verify` が `EXTENDED_E2E_RESULT=cancelled` を検知して failure となり、さらに `validate` も failure となった。

重要なのは、Firefox / WebKit のテスト自体は1件も開始されていないことである。今回の失敗はアプリケーションやE2Eシナリオではなく、CI環境構築の不安定さによるものと判断する。

## 3. 現状整理

### 3.1 Chromium 系

現在の Phase 1 CI では Chromium 系で次を実行している。

- `Chromium E2E (required)`
- `Chromium E2E (accessibility)`
- `Chromium E2E (mobile-boundary)`
- `Chromium E2E (cross-role)`
- `Chromium E2E (training-web-baseline)`
- `UI Review` 4 viewport
- `production-smoke`
- `Extended E2E (mobile-chromium)`

Chromium の browser install は基本的に次の形式であり、今回問題となった apt dependency install を伴わない。

```bash
pnpm exec playwright install chromium
```

### 3.2 Firefox / WebKit

`playwright.config.ts` では、Firefox / WebKit はどちらも `e2e/web/smoke.spec.ts` を実行している。

- `firefox-smoke` → `smoke.spec.ts`
- `webkit-smoke` → `smoke.spec.ts`

`smoke.spec.ts` の確認内容は次の範囲である。

- トップページ表示
- 見出し表示
- 商品一覧への遷移
- 商品一覧表示
- 商品画像ロード
- console error がないこと
- page error がないこと

同じ `smoke.spec.ts` は Chromium の `deployed-smoke` でも実行されている。

したがって Firefox / WebKit の現状の主な価値は、独自シナリオの検証ではなく、同じ smoke contract を Gecko / WebKit エンジンでも通すクロスブラウザ確認にある。

主要な機能品質は Chromium E2E の方が深く検証しているため、Firefox / WebKit をPR・main pushの必須ゲートから外すことによる品質低下は現状では限定的と判断する。

## 4. 採用方針

### 4.1 必須CIは Chromium 系に限定する

`.github/workflows/ci.yml` の Phase 1 CI では Firefox / WebKit を実行しない。

`main` push、通常のPR CI、既存 Phase 1 CI の成否は Chromium 系の品質ゲートだけで判定する。

既存の `Extended E2E (mobile-chromium)` は維持する。これは `phase1-required.spec.ts` を mobile Chromium でも実行するため、Firefox / WebKit の smoke と異なり Chromium 必須品質の補完として価値がある。

### 4.2 `extended-e2e` は1件だけになるため matrix を外して単純化する

Firefox / WebKit を除外すると `extended-e2e` の matrix は `mobile-chromium` 1件だけになる。

1要素 matrix を残す理由はないため、job id `extended-e2e` は維持しつつ matrix 自体を削除する。

変更後の意図は次のとおり。

```yaml
extended-e2e:
  if: github.event_name != 'pull_request'
  name: Extended E2E (mobile-chromium)
  needs: build-automation
  runs-on: ubuntu-latest
  timeout-minutes: 30
  # existing automation envを維持
  steps:
    # existing setup steps
    - name: Install Chromium
      run: pnpm exec playwright install chromium

    - name: Run extended E2E
      run: pnpm run test:e2e:mobile
```

`extended-e2e` という job id は変更しない。

理由:

- `verify` が `needs.extended-e2e.result` を参照している。
- job id を維持すれば後段ゲートの変更を最小化できる。
- 1件だけの matrix を残すより構造が明確になる。

`verify` の判定ロジックは原則変更しない。

### 4.3 Firefox / WebKit は独立した1-job workflow に分離する

新規 workflow を追加する。

```text
.github/workflows/cross-browser-smoke.yml
```

実行トリガーは次だけとする。

- `schedule`
- `workflow_dispatch`

`push` / `pull_request` では実行しない。

Firefox / WebKit は現時点で `smoke.spec.ts` 1本ずつしか実行しないため、build job + artifact + browser matrix の3-job構成にはしない。

1つの container job 内で次を順に実行する。

1. checkout
2. pnpm setup
3. Node 24 setup
4. dependency install
5. automation web build を1回だけ実行
6. Firefox / WebKit の2 project を1回の Playwright invocation で実行
7. failure 時に Playwright artifact をupload

これにより、checkout・dependency install・build・artifact受け渡しの重複を避ける。

将来クロスブラウザテストが増えて実行時間が問題になった場合にのみ、build共有 + matrix並列化を再検討する。

### 4.4 クロスブラウザ workflow では Playwright 公式 Docker image を使う

Firefox / WebKit workflow では GitHub-hosted Ubuntu 上で毎回 `playwright install --with-deps` を実行しない。

代わりに、プロジェクトの `@playwright/test` と同じ Playwright version に固定した公式 image を利用する。

現時点の `package.json` は次である。

```json
"@playwright/test": "1.62.0"
```

したがって候補 image は次とする。

```text
mcr.microsoft.com/playwright:v1.62.0-noble
```

Playwright 公式 image には browser binary と browser system dependencies が含まれるため、job 内で次を実行しない。

```bash
playwright install --with-deps firefox
playwright install --with-deps webkit
```

Playwright package と container image のversionは一致させる。

Playwright更新時は必ず次を同時に更新する。

- `package.json` の `@playwright/test`
- `cross-browser-smoke.yml` の container image tag

`latest` や異なるPlaywright versionへ自動フォールバックしない。

実装前に、採用する exact version tag が公式に利用可能であることを確認する。利用不能な場合は、異なるversion imageで代用せず本プランを再評価する。

参考:

- https://playwright.dev/docs/docker
- https://playwright.dev/docs/ci

## 5. 実装対象

### 5.1 `.github/workflows/ci.yml`

`extended-e2e` から Firefox / WebKit を削除し、`mobile-chromium` 専用jobへ単純化する。

削除対象:

```yaml
- name: firefox
  browser: firefox
  command: pnpm run test:e2e:smoke:firefox

- name: webkit
  browser: webkit
  command: pnpm run test:e2e:smoke:webkit
```

削除対象step:

```yaml
- name: Install browser with system dependencies
  if: matrix.browser != 'chromium'
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

維持する環境変数:

```yaml
env:
  PLAYWRIGHT_USE_PREBUILT_DIST: "true"
  EXPO_PUBLIC_APP_ENV: automation
  EXPO_PUBLIC_BUILD_KIND: automation
  EXPO_PUBLIC_TEST_MODE: "true"
  EXPO_PUBLIC_DEFAULT_SEED: default
```

Chromium install と実行commandは直接記述する。

```yaml
- name: Install Chromium
  run: pnpm exec playwright install chromium

- name: Run extended E2E
  run: pnpm run test:e2e:mobile
```

`verify` / `validate` のロジックは、Firefox / WebKit を参照している個別条件がない限り変更しない。

### 5.2 `.github/workflows/cross-browser-smoke.yml` を新規追加

#### Trigger

```yaml
on:
  schedule:
    - cron: "17 19 * * 0"
  workflow_dispatch:
```

`17 19 * * 0` は Monday 04:17 JST 相当。

既存 Phase 1 CI の weekly schedule (`0 18 * * 0`) から1時間以上ずらし、GitHub Actionsで混雑しやすい毎時00分も避ける。

#### permissions

```yaml
permissions:
  contents: read
```

#### workflow-level env

既存 `ci.yml` と整合させる。

```yaml
env:
  CI: "true"
  NODE_VERSION: "24"
  PNPM_VERSION: "9.10.0"
```

#### job

1 jobのみとする。

```yaml
jobs:
  cross-browser-smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    container:
      image: mcr.microsoft.com/playwright:v1.62.0-noble
```

container user の追加指定は今回の必須要件にしない。

このリポジトリ自身の trusted E2E を実行する用途であり、まずは公式Playwright imageの標準構成で最小実装する。権限問題等が確認された場合のみ `options` の追加を検討する。

#### automation build環境

cross-browser smoke も現行 `build-automation` と同じautomation buildを対象にする。

最低限、job env に次を設定する。

```yaml
env:
  PLAYWRIGHT_USE_PREBUILT_DIST: "true"
  EXPO_PUBLIC_APP_ENV: automation
  EXPO_PUBLIC_BUILD_KIND: automation
  EXPO_PUBLIC_TEST_MODE: "true"
  EXPO_PUBLIC_DEFAULT_SEED: default
  EXPO_PUBLIC_BUILD_SHA: ${{ github.sha }}
```

これを省略しない。

特に `PLAYWRIGHT_USE_PREBUILT_DIST=true` がない場合、`playwright.config.ts` の `webServer` がテスト実行時に再度 `pnpm run build:web` を実行するため、「buildを1回だけ行う」という設計が崩れる。

#### setup

既存 `ci.yml` と同じaction pinning方針を使う。

- `actions/checkout` は既存と同じSHA
- `pnpm/action-setup` は既存と同じSHA
- `actions/setup-node` は既存と同じSHA
- failure artifact upload は既存 `actions/upload-artifact` と同じSHA

Nodeは既存CIと同じ24を使用する。

依存関係は既存CIと同じく次で導入する。

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

#### build

現行 `build-automation` と同じautomation envで次を1回だけ実行する。

```bash
pnpm run build:web
```

続けて最低限次を確認する。

```bash
test -f dist/index.html
```

別jobへ渡さないため、`dist` のupload/downloadは行わない。

#### Firefox / WebKit smoke

既存の `firefox-smoke` / `webkit-smoke` project definitionをそのまま使う。

2ブラウザを別stepやmatrixに分けず、1回のPlaywright invocationで両方を実行する。

```bash
pnpm exec playwright test e2e/web/smoke.spec.ts \
  --project=firefox-smoke \
  --project=webkit-smoke
```

これにより、片方のテスト失敗だけを理由にもう片方のjobがmatrix fail-fastでcancelされる構造を避ける。

Playwright側で両projectのテスト結果を同じrunとして収集する。

#### failure artifact

失敗時は既存方針と同様に `output/playwright` をuploadする。

artifact名はrun単位で衝突しないものとする。

例:

```text
playwright-cross-browser-${{ github.run_id }}-${{ github.run_attempt }}
```

### 5.3 `package.json`

原則変更しない。

既存scriptを維持する。

```json
"test:e2e:smoke:firefox": "playwright test --project=firefox-smoke",
"test:e2e:smoke:webkit": "playwright test --project=webkit-smoke"
```

新workflowでは両projectを1回で実行するため直接Playwright CLIを呼んでよい。今回のためだけに新しいpackage scriptは追加しない。

### 5.4 `playwright.config.ts`

変更しない。

次のprojectを維持する。

- `firefox-smoke`
- `webkit-smoke`

クロスブラウザ確認を将来再強化できる状態を残す。

### 5.5 `e2e/web/smoke.spec.ts`

変更しない。

Chromium / Firefox / WebKit で同じ smoke contract を共有する現在の構造を維持する。

## 6. 非対象

今回の変更では次を行わない。

- Firefox / WebKit テスト自体の削除
- Firefox / WebKit 向け独自テストケースの追加
- Chromium E2E シナリオの変更
- アプリケーションコードの変更
- `timeout-minutes` を60分等へ単純延長する対応
- apt retry script の追加
- 独自 Docker image の作成
- reusable workflow への大規模リファクタリング
- cross-browser用のbuild/artifact/matrix 3-job構成
- package manager / Node / Playwright のversion update
- branch protection の緩和
- Playwright versionが異なるDocker imageへのフォールバック

特に timeout 延長は、今回のような apt hang の待ち時間を伸ばすだけなので対策としない。

## 7. 実装順序

### Step 1: Docker image前提を確認する

実装前に次を確認する。

- `package.json` の `@playwright/test` が `1.62.0` のままである
- `mcr.microsoft.com/playwright:v1.62.0-noble` が公式の利用可能なtagである
- versionが一致している

利用不能なら別versionへ勝手に変更せず、対応方針を再検討する。

### Step 2: Phase 1 CI から Firefox / WebKit を外す

`.github/workflows/ci.yml` の `extended-e2e` を `mobile-chromium` 専用jobへ単純化する。

- Firefox matrix削除
- WebKit matrix削除
- 1要素matrix自体を削除
- `Install browser with system dependencies` 削除
- Chromium install維持
- `pnpm run test:e2e:mobile` を直接実行
- existing automation env維持
- job id `extended-e2e` 維持

### Step 3: cross-browser workflow を追加する

`.github/workflows/cross-browser-smoke.yml` を追加する。

- weekly schedule
- manual dispatch
- Playwright公式Docker image pinned to exact package version
- timeout 30分
- automation env
- dependency install 1回
- build 1回
- Firefox + WebKitを1回のPlaywright invocationで実行
- failure artifact upload

を実装する。

### Step 4: 静的確認

最低限、次を確認する。

- YAML syntax が正しい
- action pinning 方針が既存 workflow と整合している
- `permissions: contents: read` だけで成立する
- `package.json` の Playwright version と Docker image version が一致している
- `ci.yml` 内に Firefox / WebKit の `--with-deps` が残っていない
- `extended-e2e` のmatrixが不要に残っていない
- cross-browser workflowにautomation build envが設定されている
- cross-browser workflowに `PLAYWRIGHT_USE_PREBUILT_DIST=true` が設定されている
- cross-browser workflowで `pnpm run build:web` が1回だけ実行される
- cross-browser workflowに `push` / `pull_request` triggerがない
- cross-browser workflowに30分timeoutがある

### Step 5: マージ前に既存 Phase 1 CI を検証する

新規 `cross-browser-smoke.yml` は default branch に存在するまで `workflow_dispatch` で直接起動できないため、マージ前検証とマージ後検証を分ける。

#### PR eventで確認すること

PRでは現行仕様上 `extended-e2e` は `if: github.event_name != 'pull_request'` によりskipされる。

したがってPR CIでは次を確認する。

- Chromium E2E が成功する
- UI Review が成功する
- production-smoke が成功する
- `extended-e2e` が想定どおりskippedになる
- `verify` が `pull_request` 時の `extended-e2e=skipped` を許容してsuccessになる
- `validate` がsuccessになる

#### feature branchを指定した既存 Phase 1 CIの `workflow_dispatch` で確認すること

`ci.yml` 自体は既にdefault branchに存在するため、feature branch refを指定して手動実行し、変更後の非PR経路を確認する。

- `Extended E2E (mobile-chromium)` が実行され成功する
- `Extended E2E (firefox)` が存在しない
- `Extended E2E (webkit)` が存在しない
- `verify` がsuccessになる
- `validate` がsuccessになる

### Step 6: マージ後に cross-browser workflow を即時手動検証する

新規 `cross-browser-smoke.yml` はdefault branchへマージされた後に `workflow_dispatch` で起動する。

確認事項:

- container image を正常にpullできる
- dependency install が成功する
- automation envでbuildが1回だけ実行される
- `dist/index.html` が存在する
- Firefox smoke が実行される
- WebKit smoke が実行される
- `playwright install --with-deps` が実行されない
- Firefox / WebKit の両方がsuccessになる
- failure時はPlaywright artifactを取得できる

このマージ後手動実行は、クロスブラウザworkflowの運用開始確認として必ず実施する。

## 8. 受け入れ条件

### 8.1 マージ前の受け入れ条件

以下をすべて満たすこと。

1. Phase 1 CI の browser test は Chromium 系のみで構成されている。
2. Phase 1 CI に `playwright install --with-deps firefox` が存在しない。
3. Phase 1 CI に `playwright install --with-deps webkit` が存在しない。
4. `Extended E2E (mobile-chromium)` は維持されている。
5. `extended-e2e` job id は維持されている。
6. `extended-e2e` の1要素matrixは削除され、mobile Chromium専用jobとして単純化されている。
7. Firefox / WebKit の Playwright project と既存npm scriptは削除されていない。
8. separate workflow は `schedule` と `workflow_dispatch` のみをtriggerとして持つ。
9. separate workflow は `push` / `pull_request` の必須CIに含まれない。
10. separate workflow の Playwright Docker image version が `@playwright/test` version と一致する。
11. separate workflow に既存 `build-automation` と同等のautomation envが設定されている。
12. separate workflow に `PLAYWRIGHT_USE_PREBUILT_DIST=true` が設定されている。
13. separate workflow のbuildは1回だけである。
14. separate workflow は Firefox / WebKit を1回のPlaywright invocationで実行する。
15. separate workflow のjob timeoutが明示されている。
16. PR eventのPhase 1 CIで `verify` / `validate` がsuccessになる。
17. feature branch指定の既存 `ci.yml` workflow_dispatchで `Extended E2E (mobile-chromium)` / `verify` / `validate` がsuccessになる。
18. アプリケーションコード、E2E test body、Playwright project definition に不要な変更がない。

### 8.2 マージ後の運用開始条件

新規workflowはdefault branchに存在するまで `workflow_dispatch` できないため、次はマージ後の運用開始確認とする。

1. `Cross Browser Smoke` を `workflow_dispatch` で即時実行できる。
2. Firefox smoke が実際に実行される。
3. WebKit smoke が実際に実行される。
4. 両方がsuccessになる。
5. apt dependency installを実行していない。
6. failure時のartifact取得経路が成立している。

## 9. リスクと対策

### 9.1 Firefox / WebKit の不具合検知がPR単位ではなくなる

必須CIから外すため、Firefox / WebKit 固有不具合の検知は定期実行まで遅れる可能性がある。

ただし現時点の Firefox / WebKit は1本の smoke のみであり、主要な機能品質は Chromium E2E がより深く検証している。

現状の検知力とCI不安定性のバランスでは許容する。

Safari / Firefox を正式サポートブラウザとして強く保証する必要が出た場合は、クロスブラウザworkflowの頻度・テスト範囲・必須度を改めて評価する。

### 9.2 Playwright package と Docker image のversionずれ

versionがずれるとcontainer内browserとproject側Playwrightの整合が崩れる可能性がある。

Playwright update 時に次を同時変更する。

- `package.json` の `@playwright/test`
- `cross-browser-smoke.yml` の `mcr.microsoft.com/playwright:<version>-noble`

workflow内にもversion一致が必要である旨をコメントする。

### 9.3 Docker image tag が利用できない

Playwright release直後など、package versionと対応Docker imageの公開タイミングがずれる可能性がある。

そのため実装前にexact tagの利用可能性を確認する。

利用不能な場合に次をしてはいけない。

- 旧Playwright imageへ勝手に下げる
- `latest` を使う
- canary imageへ無条件に切り替える

version一致を維持できない場合はクロスブラウザworkflowの導入を一旦止めて再評価する。

### 9.4 Docker registry 側の一時障害

Microsoft Container Registry からimageを取得できない場合、cross-browser workflow は失敗する可能性がある。

ただし separate workflow は Phase 1 CI の必須判定と分離されるため、main / PR をブロックしない。

### 9.5 新規workflowはマージ前にGitHub UIから手動実行できない

`workflow_dispatch` 対象workflowはdefault branchに存在している必要があるため、新規workflowの実ランナー確認はマージ後となる。

対策として、マージ前は次を確認する。

- workflow静的確認
- PR CI
- 既存 `ci.yml` のfeature branch指定workflow_dispatch

マージ直後にcross-browser workflowを手動実行し、運用開始確認を完了させる。

## 10. ロールバック

問題があった場合は影響範囲を分けて戻す。

### cross-browser workflowだけに問題がある場合

1. `cross-browser-smoke.yml` を無効化または削除する。
2. Chromium必須CIはそのまま維持する。
3. Firefox / WebKit の実行方式のみ再評価する。

cross-browser workflowは非ブロッキングなので、これを理由にFirefox / WebKitを即座にPhase 1 CIへ戻す必要はない。

### Chromium必須CIへの分離自体に問題がある場合

必要性を再評価したうえで Firefox / WebKit を `ci.yml` へ戻す。

ただし今回問題となった `playwright install --with-deps` をそのまま復活させるのではなく、環境構築方式も同時に再設計する。

アプリケーションコードやテストケースには変更を入れないため、ロールバック範囲は GitHub Actions workflow のみに限定できる。

## 11. 最終構成

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
```

Chromium を日常の必須品質ゲートとする。

Firefox / WebKit は削除せず、Phase 1 CIから完全に切り離した軽量な1-job workflowで補完確認する。

現時点のクロスブラウザテスト規模に対してbuild共有・artifact受け渡し・matrix並列化は導入せず、必要になった時点で拡張する。

これを今回の最小かつ現実的な変更範囲とする。
