# Playwright CI install stability plan

## 1. 目的

GitHub Actions の Playwright 実行で `pnpm exec playwright install --with-deps chromium` が Linux の `apt` / Ubuntu package mirror 待ちで長時間停止し、Playwright テスト本体を開始する前に CI が timeout / cancel される問題を安定化する。

今回の第一目的は、テスト並列度を下げて問題を隠すことではない。Chromium 実行に不要な OS dependency installation を CI の Playwright job から外せるかを実証し、外部 apt mirror 依存を最小化する。

`playwright install chromium` 自体は削除せず、Playwright が要求する Chromium browser binary の取得は維持する。

## 2. 対象ブランチ

- branch: `fix/playwright-ci-install-stability`
- base: `main`
- base commit: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`

## 3. 背景と baseline evidence

PR #32 の Phase 1 CI run `32224974073` では、同一 workflow run 内で一部の Playwright job が成功する一方、以下の job が `Install Chromium` 中に cancel された。

- `production-smoke`: job `95993329460`
- `Chromium E2E (cross-role)`: job `95993339388`
- `UI Review (ui-review-desktop)`: job `95993339406`
- `UI Review (ui-review-small-mobile)`: job `95993339452`

一方、同じ run の `Chromium E2E (required)` job `95993339416` は同じ `--with-deps chromium` を通過して成功した。

失敗 job では次のコマンド実行後、Ubuntu package mirror へのアクセス付近で長時間停止している。

```bash
pnpm exec playwright install --with-deps chromium
```

成功 job のログでは、Chromium の主要な Linux runtime dependency の多くが GitHub-hosted runner に既に存在し、`already the newest version` となっていた。

例:

- `libasound2t64`
- `libatk-bridge2.0-0t64`
- `libatk1.0-0t64`
- `libcairo2`
- `libcups2t64`
- `libdbus-1-3`
- `libdrm2`
- `libgbm1`
- `libglib2.0-0t64`
- `libnspr4`
- `libnss3`
- `libpango-1.0-0`
- X11 系ライブラリ
- `xvfb`

`--with-deps` によって新規追加されていたものは主にフォント / X font 系 package だった。

この evidence から、Chromium 本体の取得は維持しつつ OS dependency installation のみを外せる可能性が高い。ただし Playwright の一般的な Linux CI 構成では `--with-deps` が利用されるため、削除を前提とせず、このリポジトリの実際の GitHub-hosted runner 上で成立することを確認してから採用する。

## 4. 現時点の原因整理

### 4.1 観測された直接的失敗点

`--with-deps` によって各 GitHub-hosted runner が OS dependency installation を実行し、`apt` / Ubuntu package mirror へのアクセス付近で停止している。

今回確認できた範囲では、Playwright test code の実行前に失敗しているため、テストコード自体を今回の直接原因とは扱わない。

### 4.2 並列実行の影響は仮説として扱う

現在は Chromium E2E、UI Review、production smoke など複数 job が同時期にそれぞれ `--with-deps` を実行する。

各 job は別 runner であるため、同一マシン内の apt lock 競合ではない。一方、1 workflow 内で外部 package mirror へのアクセス回数が増え、いずれかの job が mirror 不調を引く確率を高めている可能性はある。

ただし、並列実行そのものが mirror 障害を発生させていることまでは確認できていない。

そのため初回修正では `max-parallel` を変更しない。`--with-deps` と並列度を同時に変更せず、どちらが安定性に影響したかを分離できるようにする。

## 5. Playwright install の現状 inventory

`.github/workflows/ci.yml` には、Chromium 固定の `--with-deps` が次の 5 logical job に存在する。

1. `e2e-chromium`
2. `ui-review`
3. `production-smoke`
4. `deploy-preview`
5. `deploy-production`

さらに、`extended-e2e` には browser matrix 共通の次の install が存在し、matrix には `mobile-chromium`、Firefox、WebKit が含まれる。

```bash
pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

したがって、Chromium 固定 5 箇所だけを変更すると、PR 以外の `extended-e2e` では Chromium が引き続き apt を実行する。

今回の実装ではこの 6 logical install site をすべて意識し、Chromium の扱いに漏れを残さない。

## 6. 修正方針

### Phase 1: Chromium 固定 5 箇所から `--with-deps` を外す

次のように変更する。

```diff
- pnpm exec playwright install --with-deps chromium
+ pnpm exec playwright install chromium
```

対象:

1. `e2e-chromium`
2. `ui-review`
3. `production-smoke`
4. `deploy-preview`
5. `deploy-production`

Chromium browser installation 自体は削除しない。

`deploy-preview` は internal PR の最終 `validate` に影響するため、事前 E2E のみ修正して漏らさない。

`deploy-production` は `main` push 時のみ実行されるため、変更対象には含めるが、PR 上の直接検証対象とはしない。最終確認は merge 後の `main` run で行う。

### Phase 2: `extended-e2e` は Chromium のみ browser-only install にする

Firefox / WebKit の system dependency 要件まで同時に変更しない。

matrix 自体の再設計は行わず、install step を最小限の条件分岐にする。

想定形:

```yaml
- name: Install Chromium
  if: matrix.browser == 'chromium'
  run: pnpm exec playwright install chromium

- name: Install browser with system dependencies
  if: matrix.browser != 'chromium'
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

これにより、今回の対象である Chromium の apt 依存は `extended-e2e` からも除去しつつ、Firefox / WebKit は現状動作を維持する。

Firefox / WebKit の `--with-deps` 削除は今回の必須スコープに含めない。

### Phase 3: 既存 CI contract test に今回の契約を追加する

リポジトリには既に `tests/contracts/ci-workflow.test.ts` があり、`.github/workflows/ci.yml` の job 境界、deployment、step 構造などを契約テストで固定している。

今回の変更も同じ既存 contract test に最小限の assertion を追加し、将来 `--with-deps chromium` が意図せず戻されることを検知できるようにする。

少なくとも以下を契約化する。

- `e2e-chromium` の Chromium install が `pnpm exec playwright install chromium` である
- `ui-review` の Chromium install が `pnpm exec playwright install chromium` である
- `production-smoke` の Chromium install が `pnpm exec playwright install chromium` である
- `deploy-preview` の Chromium install が `pnpm exec playwright install chromium` である
- `deploy-production` の Chromium install が `pnpm exec playwright install chromium` である
- 上記 Chromium 固定 job に `playwright install --with-deps chromium` が存在しない
- `extended-e2e` の Chromium path は browser-only install である
- `extended-e2e` の Firefox / WebKit path は従来どおり `--with-deps` を維持する

新しい contract test file や専用 validator は作らず、既存 `tests/contracts/ci-workflow.test.ts` の責務内で対応する。

## 7. 検証方針

### 7.1 実装後の静的 / contract verification

workflow 修正後、最低限以下を実行する。

```bash
pnpm run test:contracts
```

必要に応じて通常の repository quality gate も実行するが、今回追加した CI contract が確実に通ることを明示的に確認する。

### 7.2 PR 上の必須 CI

internal PR として以下が成功することを確認する。

- Chromium E2E `required`
- accessibility
- mobile-boundary
- cross-role
- training-web-baseline
- UI Review desktop
- UI Review tablet
- UI Review mobile
- UI Review small-mobile
- production-smoke
- deploy-preview
- verify
- validate

### 7.3 Install log で apt が消えていることを確認する

CI green だけを根拠にしない。

Chromium の browser-only install に変更した job の `Install Chromium` ログを確認し、`apt` / OS dependency installation が起動していないことを evidence として確認する。

確認したい状態:

1. `playwright install chromium` が正常終了する
2. apt / Ubuntu package mirror への依存処理が発生しない
3. その後 Chromium launch と各 Playwright test が成功する

これにより、「たまたま apt が成功した」のではなく、今回問題になっている外部依存を実際に通らなくなったことを確認する。

### 7.4 UI Review は CI green と visual 確認を分ける

現行 UI Review は screenshot を生成して artifact にアップロードするが、既存画像との pixel diff を CI gate として自動判定しているわけではない。

したがって、`UI Review` job が green であることだけを「font / rendering 退行なし」の根拠にしない。

比較 baseline は「最新の main」ではなく、今回の CI 変更以外の差分が混入しない commit に固定する。

優先順位:

1. 実装直前の `fix/playwright-ci-install-stability` commit で取得した UI Review artifact
2. 取得できない場合は、この branch の base commit `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a` と同一内容の正常 artifact

現在この branch は plan のみが `main` との差分であり、アプリ / UI は base commit と同一であるため、実装前 baseline として利用できる。

実装前に `main` が進み、本 branch へ rebase / merge してアプリ内容が変わった場合は、古い baseline を使わず、**CI workflow 修正を入れる直前の新しい branch commit** で baseline artifact を取り直す。

これにより、アプリ変更による UI 差分を `--with-deps` 削除による font / rendering 差分と誤認しない。

新しい visual regression framework は今回導入しない。

比較観点:

- 日本語文字が正しく表示される
- font fallback による明確な見た目の変化がない
- 改行位置や文字幅に不自然な変化がない
- レイアウト崩れや横 overflow がない
- emoji 等を利用する画面で欠落がない
- desktop / tablet / mobile / small-mobile の各 viewport で明確な rendering 退行がない

アプリ側では Inter / Noto Sans JP を依存として持ち、`build:web` の `prepare:font-assets` で必要な web font assets を配置しているが、それを理由に visual 確認を省略しない。

### 7.5 同一 commit で追加 rerun する

一度の green だけでは安定性の確認として弱いため、実装 commit の Phase 1 CI を追加 rerun する。

目安:

- 初回 green
- 同一 commit で rerun 2 回以上
- 合計 3 回程度、Chromium install 起因の timeout / cancel が発生しない

ただし「3 回成功したから flake が完全に解消した」とは判断しない。

主な判断根拠は、Chromium install から apt 処理自体が消えていることと、その状態で test が継続して成功することである。

PR workflow は `cancel-in-progress` が有効なため、PR run / rerun を重ねて自分で cancel を発生させない。各 run の完了後に次を実行する。

### 7.6 `extended-e2e` は branch の `workflow_dispatch` で確認する

`extended-e2e` は pull request event では実行されないため、PR CI だけでは検証しない。

実装 branch `fix/playwright-ci-install-stability` を指定して `workflow_dispatch` を実行し、実際の `extended-e2e` workflow で確認する。

必須確認:

- `mobile-chromium` が `playwright install chromium` で成功する
- `mobile-chromium` の install log で apt が起動しない
- Firefox は従来の `--with-deps` のまま成功する
- WebKit は従来の `--with-deps` のまま成功する

今回 Firefox / WebKit の browser-only install 可否調査は必須としない。Chromium 安定化と無関係な変更を増やさない。

`pull_request` と `workflow_dispatch` は concurrency group が別になるため同時実行できる。原因分離と runner / mirror 負荷の混在を避けるため、検証は次の順序で直列に行う。

1. PR 初回 run を完了させる
2. 同一 commit の PR rerun を必要回数完了させる
3. PR 側の確認が終わってから branch の `workflow_dispatch` を実行する

PR rerun と `workflow_dispatch` を意図的に重ねない。

### 7.7 `deploy-production` は merge 後に確認する

`deploy-production` は `push` かつ `refs/heads/main` の場合のみ実行されるため、PR 上では job 自体を直接検証できない。

pre-merge では同じ `ubuntu-latest` runner class を使う Chromium job、`production-smoke`、`deploy-preview` を通して browser-only install の成立を確認する。同じ VM、Azure region、runner image revision であることまでは前提にしない。

merge 後の `main` run で以下を post-merge verification とする。

- `deploy-production` の `playwright install chromium` が成功する
- install log で apt が起動しない
- deployed production smoke が成功する

### 7.8 Post-merge で `deploy-production` だけ失敗した場合

`deploy-production` は Cloudflare production deployment 後に Chromium install と deployed smoke を行うため、browser-only install の system dependency 不足だけで失敗した場合、直ちに production アプリケーション障害とは判断しない。

失敗時はログから次を切り分ける。

1. Cloudflare production deployment 自体が成功しているか
2. `playwright install chromium` が成功しているか
3. Chromium launch が system dependency 不足で失敗しているか
4. deployed smoke のアプリケーション検証で失敗しているか

browser-only install / Chromium launch の dependency 不足が原因と確認できた場合は、CI runner 側の検証環境問題として扱い、この CI 変更に対する最小 hotfix / revert を行う。アプリケーション自体の production 障害として誤分類しない。

一方、deployed smoke がアプリケーション挙動で失敗している場合は、本 CI install 変更とは分離して原因を調査する。

## 8. `--with-deps` を外して失敗した場合

browser-only install 後の Chromium launch または test で system dependency 不足が判明した場合、推測で package を追加しない。

次の順で原因を絞る。

1. Playwright のエラーから不足 library / package を特定する
2. 必要に応じて `pnpm exec playwright install-deps chromium --dry-run` を診断材料として利用する
3. 実行に必須の dependency か、font 等の補助 dependency かを分ける
4. 必須 dependency が少数なら、必要最小限の明示 install が妥当か評価する
5. browser-only install が成立しない場合のみ、apt mirror 対策または Playwright 公式 Docker image を fallback として検討する

Playwright 公式 Docker image を利用する場合は、リポジトリで使用中の `@playwright/test` `1.62.0` と browser version を一致させる。

今回の初回実装では Docker 化しない。

## 9. GitHub-hosted runner への依存というトレードオフ

`--with-deps` を外す場合、Chromium 実行に必要な Linux runtime dependency が GitHub-hosted runner image に存在することへ依存する。

これは今回の apt mirror flake を避ける代わりに受け入れるトレードオフである。

そのため、今回の CI 成功を「今後すべての Linux 環境で `--with-deps` が不要」と一般化しない。

将来 GitHub runner image 更新後に system dependency 不足で Chromium launch が失敗した場合は、本 plan の fallback 方針に従って再評価する。

## 10. 並列数の扱い

初回修正では以下を変更しない。

- `e2e-chromium.strategy.max-parallel`
- `ui-review.strategy.max-parallel`
- `extended-e2e.strategy.max-parallel`
- その他 Playwright matrix の並列度

理由は、`--with-deps` と並列度を同時に変更すると、どちらが安定化に寄与したか判別できなくなるため。

Chromium の apt 依存を除去した後も Playwright job が不安定な場合のみ、次の調査として runner resource、アプリ / test server 負荷、外部 service 制約、matrix 並列度を確認する。

並列数削減は必要性が確認された場合に限り、別の修正として扱う。

## 11. 今回変更しないもの

初回 PR では以下をスコープ外とする。

- job timeout の延長
- apt retry loop の追加
- Ubuntu mirror の強制置換
- browser binary の独自 cache
- browser artifact の job 間共有
- matrix 構成の大幅な再設計
- `max-parallel` の削減
- self-hosted runner 導入
- Playwright Docker image への移行
- Firefox / WebKit の `--with-deps` 削除
- visual regression framework の新規導入
- 新しい CI contract test framework / validator の導入
- Playwright version の更新
- Node / pnpm version の更新

まず最小変更で Chromium の apt 依存を取り除けるかを確認する。

## 12. 完了条件

### 12.1 Pre-merge 必須条件

- Chromium 固定 5 箇所が `playwright install chromium` になっている
- `extended-e2e` の Chromium だけが browser-only install になっている
- Firefox / WebKit の既存 `--with-deps` は維持されている
- `tests/contracts/ci-workflow.test.ts` に今回の Chromium install 契約が追加されている
- `pnpm run test:contracts` が成功する
- Chromium install log で apt / OS dependency installation が起動していない
- Chromium E2E の全 matrix が成功する
- UI Review の全 viewport が成功する
- CI変更以外の差分を含まない固定 baseline と UI Review artifact を比較し、明確な font / rendering 退行がない
- production-smoke が成功する
- internal PR の deploy-preview が成功する
- verify が成功する
- validate が成功する
- PR 初回 run と追加 rerun を完了した後、branch の `workflow_dispatch` で `extended-e2e` が成功する
- 同一 commit の追加 rerun でも Chromium install 起因の timeout / cancel が発生しない
- `max-parallel` を変更していない

### 12.2 Post-merge 必須確認

- `main` push の Phase 1 CI が成功する
- `deploy-production` の Chromium install で apt が起動しない
- deployed production smoke が成功する

Post-merge で browser-only install / Chromium launch の dependency 不足だけが失敗した場合は、CI runner 側の検証環境問題として最小 hotfix / revert を行う。

## 13. ロールバック / 再設計条件

以下の場合は Chromium の `--with-deps` 削除をそのまま merge しない。

- Chromium launch が system dependency 不足で失敗する
- UI Review artifact 比較で font / rendering の明確な退行が出る
- browser-only install に起因する新しい再現性のある failure が発生する
- `extended-e2e` の `mobile-chromium` が system dependency 不足で失敗する
- 既存 CI contract と矛盾し、今回の意図を最小変更で契約化できない

その場合は不足 dependency または workflow contract の不整合を特定し、必要最小限の代替案を再設計する。

## 14. 実施順序

1. 必要であれば `main` の最新状態を取り込み、CI workflow 修正直前の branch commit を確定する
2. UI Review の比較用 baseline artifact をその commit で確保する
3. Chromium 固定 5 箇所の `--with-deps` を外す
4. `extended-e2e` で Chromium のみ browser-only install に分岐する
5. `tests/contracts/ci-workflow.test.ts` に今回の契約を追加する
6. `pnpm run test:contracts` を実行する
7. internal PR の初回 Phase 1 CI を完了させる
8. UI Review artifact を固定 baseline と比較する
9. 同一 commit の PR rerun を順番に実行し、必要回数を完了させる
10. PR 側の検証完了後、branch の `workflow_dispatch` を実行して `extended-e2e` を確認する
11. CI 安定化 PR を merge する
12. merge 後の `main` run で `deploy-production` まで確認する
13. 問題なければ PR #32 の branch に最新 `main` を取り込む
14. PR #32 の CI を再実行する
15. PR #32 自体の品質判断を行う

## 15. PR #32 との関係

この CI 安定化は PR #32 の機能変更とは独立しているため、別 PR とする。

CI infrastructure の flake と PR #32 の変更内容を分離し、PR #32 の合否を不安定な Playwright install に左右されにくくする。