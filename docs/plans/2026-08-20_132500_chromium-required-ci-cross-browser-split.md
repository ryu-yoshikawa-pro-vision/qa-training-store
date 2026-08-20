# Chromium必須CIとクロスブラウザ確認の分離プラン

## 1. 目的

Phase 1 CI の必須品質ゲートを Chromium 系に絞り、Firefox / WebKit のクロスブラウザ smoke を別 workflow に分離する。

狙いは次の3点。

1. `main` push や通常の必須CIが、Firefox / WebKit のOS依存パッケージ取得不調で巻き込まれて失敗・キャンセルされることを防ぐ。
2. Firefox / WebKit のクロスブラウザ確認自体は削除せず、定期実行・手動実行で継続する。
3. アプリケーションコードやテストケースを変更せず、CI構成だけを必要最小限変更する。

## 2. 背景

2026-08-20 JST に確認した GitHub Actions run `32272685727` では、主要な Chromium 系 job はすべて成功した一方で、次の2 job が `cancelled` となった。

- `Extended E2E (firefox)`
- `Extended E2E (webkit)`

両方ともテスト実行前の次の処理で停止した。

```bash
pnpm exec playwright install --with-deps firefox
pnpm exec playwright install --with-deps webkit
```

Ubuntu 24.04 runner 上で `azure.archive.ubuntu.com` / `archive.ubuntu.com` への apt 処理が進まなくなり、`extended-e2e` の `timeout-minutes: 30` に到達してキャンセルされた。

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

したがって Firefox / WebKit の現状の主な価値は、独自シナリオの検証ではなく、同じ smoke シナリオを Gecko / WebKit エンジンでも通すクロスブラウザ確認にある。

## 4. 採用方針

### 4.1 必須CIは Chromium 系に限定する

`.github/workflows/ci.yml` の Phase 1 CI では Firefox / WebKit を実行しない。

`main` push、PR、通常の Phase 1 CI の成否は Chromium 系の品質ゲートだけで判定する。

ただし、既存の `Extended E2E (mobile-chromium)` は維持する。これは `phase1-required.spec.ts` を mobile Chromium でも実行するため、Firefox / WebKit の smoke と異なり Chromium 必須品質の補完として価値がある。

### 4.2 Firefox / WebKit は別 workflow に分離する

新規 workflow を追加する。

候補ファイル名:

```text
.github/workflows/cross-browser-smoke.yml
```

実行トリガーは次だけとする。

- `schedule`
- `workflow_dispatch`

`push` / `pull_request` では実行しない。

これにより Firefox / WebKit の失敗が Phase 1 CI、PR merge gate、main push の必須判定へ波及しない構造にする。

### 4.3 クロスブラウザ workflow では Playwright 公式 Docker image を使う

Firefox / WebKit workflow では GitHub-hosted Ubuntu 上で毎回 `playwright install --with-deps` を実行しない。

代わりに、プロジェクトの `@playwright/test` と同じ Playwright version に固定した公式 image を利用する。

現時点の `package.json` は次である。

```json
"@playwright/test": "1.62.0"
```

したがって現時点では次を使用する。

```text
mcr.microsoft.com/playwright:v1.62.0-noble
```

Playwright 公式 image には browser binary と browser system dependencies が含まれているため、今回問題となった apt dependency install を各 job 内で実行する必要がない。

Playwright version 更新時は `package.json` と container image tag を同時に更新する。

参考:

- https://playwright.dev/docs/docker
- https://playwright.dev/docs/ci

## 5. 実装対象

### 5.1 `.github/workflows/ci.yml`

`extended-e2e` の matrix から次を削除する。

```yaml
- name: firefox
  browser: firefox
  command: pnpm run test:e2e:smoke:firefox

- name: webkit
  browser: webkit
  command: pnpm run test:e2e:smoke:webkit
```

`mobile-chromium` だけを残す。

そのうえで browser 条件分岐を削除し、Chromium install を単純化する。

変更前:

```yaml
- name: Install Chromium
  if: matrix.browser == 'chromium'
  run: pnpm exec playwright install chromium

- name: Install browser with system dependencies
  if: matrix.browser != 'chromium'
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

変更後の意図:

```yaml
- name: Install Chromium
  run: pnpm exec playwright install chromium
```

`extended-e2e` job id は変更しない。

理由:

- `verify` が既に `needs.extended-e2e.result` を参照している。
- job id rename は今回の目的に不要。
- 必要以上に workflow diff を増やさない。

`verify` のロジックも基本的に変更しない。

`main` push / schedule / workflow_dispatch では、残った `Extended E2E (mobile-chromium)` が success であることをこれまで通り必須とする。

### 5.2 `.github/workflows/cross-browser-smoke.yml` を新規追加

最低限、次の構成とする。

#### Trigger

```yaml
on:
  schedule:
    - cron: "0 19 * * 0"
  workflow_dispatch:
```

`0 19 * * 0` は Monday 04:00 JST 相当で、既存 Phase 1 CI の weekly schedule (`0 18 * * 0`) と1時間ずらす。

意図は、同一時間帯に複数の重い browser job を集中させないことである。

#### permissions

```yaml
permissions:
  contents: read
```

#### build job

別 workflow では Phase 1 CI の `web-dist-automation` artifact を同一 run として直接再利用できないため、cross-browser workflow 内で automation web artifact を1回だけ生成する。

実施内容:

1. checkout
2. pnpm setup
3. Node setup
4. `pnpm install --frozen-lockfile --ignore-scripts`
5. `pnpm run build:web`
6. `dist` を artifact upload

Firefox / WebKit ごとに build を重複させない。

#### smoke job

matrix:

```yaml
matrix:
  include:
    - name: firefox
      command: pnpm run test:e2e:smoke:firefox
    - name: webkit
      command: pnpm run test:e2e:smoke:webkit
```

job container:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.62.0-noble
```

各 matrix job では次を行う。

1. checkout
2. pnpm setup
3. Node setup
4. dependency install
5. build job の artifact download
6. `matrix.command` を実行
7. failure 時に `output/playwright` を artifact upload

次は実行しない。

```bash
playwright install --with-deps firefox
playwright install --with-deps webkit
```

公式 container に browser と system dependencies が含まれている前提で直接 test を実行する。

### 5.3 `package.json`

原則変更しない。

既存 script をそのまま利用する。

```json
"test:e2e:smoke:firefox": "playwright test --project=firefox-smoke",
"test:e2e:smoke:webkit": "playwright test --project=webkit-smoke"
```

削除しない。

### 5.4 `playwright.config.ts`

原則変更しない。

次の project を維持する。

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
- package manager / Node / Playwright のversion update
- branch protection の緩和

特に timeout 延長は、今回のような apt hang の待ち時間を伸ばすだけなので対策としない。

## 7. 実装順序

### Step 1: Phase 1 CI から Firefox / WebKit を外す

`.github/workflows/ci.yml` の `extended-e2e` matrix を `mobile-chromium` のみにする。

同時に `Install browser with system dependencies` step を削除し、Chromium install だけに単純化する。

### Step 2: cross-browser workflow を追加する

`.github/workflows/cross-browser-smoke.yml` を追加する。

- weekly schedule
- manual dispatch
- automation build 1回
- Firefox / WebKit matrix
- Playwright公式Docker image pinned to `1.62.0-noble`
- failure artifact upload

を実装する。

### Step 3: 静的確認

workflow YAML と関連設定を確認する。

最低限確認すること:

- YAML syntax が正しい
- action pinning 方針が既存 workflow と整合している
- `permissions: contents: read` のみで成立する
- artifact name が同一workflow内で衝突しない
- `package.json` の Playwright version と Docker image version が一致している
- `ci.yml` 内に Firefox / WebKit の `--with-deps` が残っていない

### Step 4: Phase 1 CI を実行する

PR または対象 branch の workflow execution で、少なくとも次を確認する。

- Chromium E2E が成功する
- UI Review が成功する
- production-smoke が成功する
- `Extended E2E (mobile-chromium)` が成功する
- `Extended E2E (firefox)` が Phase 1 CI に存在しない
- `Extended E2E (webkit)` が Phase 1 CI に存在しない
- `verify` が success
- `validate` が success

### Step 5: cross-browser workflow を手動実行する

`workflow_dispatch` で新workflowを実行する。

確認事項:

- build artifact が生成される
- Firefox smoke が実際にテストまで到達する
- WebKit smoke が実際にテストまで到達する
- apt dependency install が実行されない
- `smoke.spec.ts` が Firefox / WebKit で成功する
- failure 時は Playwright artifact が取得可能

## 8. 受け入れ条件

以下をすべて満たしたら完了とする。

1. Phase 1 CI の browser test は Chromium 系のみで構成されている。
2. Phase 1 CI に `playwright install --with-deps firefox` が存在しない。
3. Phase 1 CI に `playwright install --with-deps webkit` が存在しない。
4. `Extended E2E (mobile-chromium)` は維持されている。
5. Firefox / WebKit の Playwright project と npm script は削除されていない。
6. Firefox / WebKit smoke を実行できる separate workflow が存在する。
7. separate workflow は `push` / `pull_request` の必須CIに含まれない。
8. separate workflow は `schedule` と `workflow_dispatch` で実行できる。
9. separate workflow の Playwright Docker image version が `@playwright/test` version と一致する。
10. manual cross-browser run で Firefox / WebKit の両方がテスト実行まで到達する。
11. Phase 1 CI の `verify` / `validate` が Firefox / WebKit の結果に依存しない。
12. アプリケーションコード、E2E test body、Playwright project definition に不要な変更がない。

## 9. リスクと対策

### 9.1 Firefox / WebKit の不具合検知がPR単位ではなくなる

必須CIから外すため、Firefox / WebKit 固有不具合の検知は定期実行まで遅れる可能性がある。

ただし現時点の Firefox / WebKit は1本の smoke のみであり、主要な機能品質は Chromium E2E がより深く検証している。

現状の検知力とCI不安定性のバランスでは許容する。

将来、Safari / Firefox を正式サポートブラウザとして強く保証する必要が出た場合は、クロスブラウザ workflow の頻度や必須度を再評価する。

### 9.2 Playwright package と Docker image のversionずれ

Playwright公式は project package と container image のversion一致を推奨している。

Playwright update 時に以下を同時変更する。

- `package.json` の `@playwright/test`
- `cross-browser-smoke.yml` の `mcr.microsoft.com/playwright:<version>-noble`

workflow 内に「package.json とversionを合わせる」旨のコメントを付ける。

### 9.3 Docker registry 側の一時障害

Microsoft Artifact Registry からimageを取得できない場合、cross-browser workflow は失敗する可能性がある。

ただし separate workflow は Phase 1 CI の必須判定と分離されるため、main / PR をブロックしない。

## 10. ロールバック

問題があった場合は次の順に戻せる。

1. `cross-browser-smoke.yml` を無効化または削除する。
2. 必要なら Firefox / WebKit matrix を `ci.yml` の `extended-e2e` に戻す。
3. browser install 方法を再評価する。

アプリケーションコードやテストケースには変更を入れないため、ロールバック範囲は GitHub Actions workflow のみに限定できる。

## 11. 最終方針

今回の主目的は「Firefox / WebKit を通すこと」ではなく、「必須CIの信頼性をFirefox / WebKit の環境構築不調から切り離すこと」とする。

そのため、次の構成を採用する。

```text
Phase 1 CI / required
├─ Chromium required E2E
├─ Chromium accessibility
├─ Chromium mobile boundary
├─ Chromium cross-role
├─ Chromium training baseline
├─ UI Review
├─ production smoke
└─ Extended mobile Chromium

Cross Browser Smoke / non-blocking
├─ Firefox smoke
└─ WebKit smoke
```

Chromium を日常の必須品質ゲートとし、Firefox / WebKit は削除せず、安定した隔離環境で補完確認する。これを今回の最小かつ現実的な変更範囲とする。
