# Playwright CI install stability plan

## 1. 目的

GitHub Actions の Playwright 実行で `pnpm exec playwright install --with-deps chromium` が Linux の `apt` / Ubuntu package mirror 待ちで長時間停止し、Playwright テスト本体を開始する前に CI が timeout / cancel される問題を安定化する。

今回の第一目的は、テスト並列度を下げて問題を隠すことではない。Chromium 実行時の OS dependency installation を CI の Playwright job から外せるかを実証し、今回の直接的な不安定要因である runtime の apt / package mirror 依存を減らすことである。

`playwright install chromium` 自体は削除せず、Playwright が要求する Chromium browser binary の取得は維持する。

## 2. 対象ブランチ

- branch: `fix/playwright-ci-install-stability`
- base: `main`
- base commit: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`

実装直前に `main` が進んだ場合は、必要に応じて最新 `main` を取り込み、以下を同時に更新する。

- plan 上の base commit
- UI Review baseline commit
- 実装前後の比較基準

古い base commit と新しい branch 状態を混在させない。

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

この evidence から、Chromium 本体の取得を維持しつつ OS dependency installation のみを外せる可能性が高い。ただし、削除を前提とせず、このリポジトリの実際の GitHub-hosted runner 上で成立することを CI で確認してから採用する。

## 4. 現時点の原因整理

### 4.1 観測された直接的失敗点

`--with-deps` によって各 GitHub-hosted runner が OS dependency installation を実行し、`apt` / Ubuntu package mirror へのアクセス付近で停止している。

今回確認できた範囲では Playwright test code の実行前に失敗しているため、テストコード自体を今回の直接原因とは扱わない。

### 4.2 並列実行の影響は仮説として扱う

現在は Chromium E2E、UI Review、production smoke など複数 job が同時期にそれぞれ `--with-deps` を実行する。

各 job は別 runner であるため、同一マシン内の apt lock 競合ではない。一方、1 workflow 内で外部 package mirror へのアクセス回数が増え、いずれかの job が mirror 不調を引く確率を高めている可能性はある。

ただし、並列実行そのものが mirror 障害を発生させていることまでは確認できていない。

そのため初回修正では `max-parallel` を変更しない。`--with-deps` と並列度を同時に変更せず、変更効果を分離できるようにする。

## 5. 現行 Playwright install の inventory

`.github/workflows/ci.yml` には、Chromium 固定の `--with-deps` が次の 5 logical job に存在する。

1. `e2e-chromium`
2. `ui-review`
3. `production-smoke`
4. `deploy-preview`
5. `deploy-production`

さらに `extended-e2e` には browser matrix 共通の次の install が存在する。

```bash
pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

現行 `extended-e2e` の matrix は以下。

- `mobile-chromium`
- `firefox`
- `webkit`

Firefox / WebKit は今回新しく追加するものではなく、現行 CI に既に存在する。

`extended-e2e` は pull request event では skip され、`main` push / schedule / `workflow_dispatch` などの非 PR event で実行される。

## 6. 今回のスコープ

### 6.1 修正対象

今回変更する予定のファイルは原則として次の 3 ファイルだけとする。

1. `.github/workflows/ci.yml`
2. `tests/contracts/ci-workflow.test.ts`
3. `docs/plans/2026-08-19_190200_playwright-ci-install-stability.md`

不足 dependency などの新しい evidence が得られない限り、次のようなアプリ / test / dependency ファイルは変更しない。

- `package.json`
- `pnpm-lock.yaml`
- `playwright.config.*`
- `e2e/**/*.spec.ts`
- `training/**`
- `app/**`
- `src/**`

### 6.2 Firefox / WebKit は修正対象外

Firefox / WebKit は既存 CI に含まれるが、今回の問題調査・修正対象は Chromium の `--with-deps` で発生している apt / mirror flake である。

そのため今回の PR では以下を行わない。

- Firefox の `--with-deps` 削除
- WebKit の `--with-deps` 削除
- Firefox / WebKit 用 system dependency の再設計
- Firefox / WebKit の matrix 構造変更

Firefox / WebKit は現行挙動を維持する。

## 7. 修正方針

### Phase 1: Chromium 固定 5 job から `--with-deps` を外す

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

`deploy-production` は `main` push 時のみ実行されるため、変更対象には含めるが PR 上の直接検証対象とはしない。最終確認は merge 後の `main` run で行う。

### Phase 2: `extended-e2e` の Chromium だけ browser-only install にする

Firefox / WebKit の既存 `--with-deps` は維持する。

matrix 自体を再設計せず、install step の条件分岐だけを追加する。

想定形:

```yaml
- name: Install Chromium
  if: matrix.browser == 'chromium'
  run: pnpm exec playwright install chromium

- name: Install browser with system dependencies
  if: matrix.browser != 'chromium'
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

これにより `extended-e2e` の `mobile-chromium` では apt を通さず、Firefox / WebKit は現状維持とする。

### Phase 3: 既存 CI contract test に今回の契約を追加する

既存の `tests/contracts/ci-workflow.test.ts` に最小限の assertion を追加する。

少なくとも以下を契約化する。

- `e2e-chromium` が `pnpm exec playwright install chromium` を使う
- `ui-review` が `pnpm exec playwright install chromium` を使う
- `production-smoke` が `pnpm exec playwright install chromium` を使う
- `deploy-preview` が `pnpm exec playwright install chromium` を使う
- `deploy-production` が `pnpm exec playwright install chromium` を使う
- 上記 Chromium 固定 job に `playwright install --with-deps chromium` が存在しない
- `extended-e2e` に Chromium 用 browser-only install 分岐が存在する
- `extended-e2e` の非 Chromium path では既存 `--with-deps ${{ matrix.browser }}` を維持する

新しい contract test framework や validator は作らない。

## 8. 実装後の静的確認

最低限、次を実行する。

```bash
pnpm run format:check
pnpm run test:contracts
```

目的:

- workflow / contract test のフォーマット不備を検出する
- 今回の Chromium install 契約を確認する
- CI workflow の既存構造を壊していないことを確認する

新しい lint dependency は追加しない。

## 9. PR CI の必須確認

internal PR 上で以下が成功することを確認する。

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

PRでは `extended-e2e` は既存仕様どおり skip のため、Firefox / WebKit は PR merge gate には含まれない。

## 10. Chromium install log の確認

CI green だけを根拠にしない。

browser-only install に変更した Chromium job の `Install Chromium` ログを確認する。

必須確認:

1. `playwright install chromium` が正常終了する
2. apt / OS dependency installation が起動していない
3. Ubuntu package mirror へのアクセスが発生していない
4. その後 Chromium launch と Playwright test が成功する

これにより、「たまたま apt が成功した」のではなく、問題の外部依存を実際に通らなくなったことを確認する。

## 11. UI Review の確認

### 11.1 CI green と visual 確認を分ける

現行 UI Review は screenshot を生成して artifact にアップロードするが、既存画像との pixel diff を CI gate として自動判定しているわけではない。

したがって `UI Review` job が green であることだけを「font / rendering 退行なし」の根拠にしない。

### 11.2 baseline の優先順位

今回の CI 変更以外の差分が混入しない artifact を baseline にする。

優先順位:

1. 既に存在する、base commit `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a` または UI 内容が同一である正常 run の UI Review artifact
2. それが利用できない場合、CI workflow 修正直前の branch commit で baseline UI Review を 1 回取得する

実装前に `main` が進み、本 branch へ取り込んだ場合は、新しい実装直前 commit を baseline とする。

### 11.3 baseline 取得が apt flake で失敗した場合

baseline取得自体は修正前の `--with-deps chromium` を通るため、今回問題にしている apt / mirror flake で失敗する可能性がある。

その場合は baseline のためだけに無期限または複数回の retry を行わない。

次のように扱う。

1. 既存の比較可能な成功 artifact がないことを記録する
2. baseline取得を 1 回試したことを記録する
3. apt / mirror 停止だけで失敗した場合は、baseline取得不能として先へ進む
4. 変更後の UI Review 4 viewport artifact を目視確認する
5. app / UI codeを変更していないことを diff で再確認する

新しい visual regression framework は今回導入しない。

### 11.4 visual 確認観点

- 日本語文字が正しく表示される
- font fallback による明確な見た目の変化がない
- 改行位置や文字幅に不自然な変化がない
- レイアウト崩れや横 overflow がない
- emoji 等を利用する画面で欠落がない
- desktop / tablet / mobile / small-mobile の各 viewport で明確な rendering 退行がない

アプリ側では Inter / Noto Sans JP を依存として持ち、`build:web` の `prepare:font-assets` で web font assets を配置しているが、それを理由に visual 確認を省略しない。

## 12. 同一 commit の追加 rerun

一度の green だけでは安定性の確認として弱いため、実装 commit の Phase 1 CI を追加 rerun する。

目安:

- 初回 green
- 同一 commit で rerun 2 回以上
- 合計 3 回程度、Chromium install 起因の timeout / cancel が発生しない

ただし「3 回成功したから flake が完全に解消した」とは判断しない。

主な判断根拠は、Chromium install から apt 処理自体が消えていることと、その状態で test が継続して成功することである。

PR workflow は `cancel-in-progress` が有効なため、PR run / rerun を重ねず、各 run 完了後に次を実行する。

## 13. `extended-e2e` の確認

### 13.1 `workflow_dispatch` は診断 run として扱う

`extended-e2e` は pull request event では実行されないため、PR CI だけでは `mobile-chromium` の分岐を実動作確認できない。

そのため PR 側の検証完了後、branch `fix/playwright-ci-install-stability` を指定して `workflow_dispatch` を 1 回実行する。

### 13.2 今回の必須確認対象

今回の必須確認は `mobile-chromium` に限定する。

- `mobile-chromium` が `playwright install chromium` で成功する
- install log で apt が起動しない
- Chromium launch が成功する
- `pnpm run test:e2e:mobile` が成功する

### 13.3 Firefox / WebKit の扱い

Firefox / WebKit は今回変更していないため、`workflow_dispatch` 全体の green を pre-merge 条件にはしない。

Firefox / WebKit が正常に成功した場合はその結果を記録する。

一方、Firefox / WebKit が既存の次の step 内で apt / mirror 起因の失敗をした場合は、今回の PR の blocking failure としない。

```bash
pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

ただし次の場合は別扱いとする。

- 今回の workflow 変更によって Firefox / WebKit job が実行されなくなった
- 条件分岐誤りで Firefox / WebKit の browser install が行われない
- browser install 後に、今回の変更に起因すると考えられる新しい workflow failure が発生する

この場合は regression として修正する。

`workflow_dispatch` は `mobile-chromium` の実動作確認用の診断 run であり、Firefox / WebKit の既知 apt flake を解消するための run ではない。

## 14. `deploy-production` の確認

`deploy-production` は `push` かつ `refs/heads/main` の場合のみ実行されるため、PR 上では job 自体を直接検証できない。

pre-merge では同じ `ubuntu-latest` runner class を使う Chromium job、`production-smoke`、`deploy-preview` を通して browser-only install の成立を確認する。

同じ VM、Azure region、runner image revision であることまでは前提にしない。

merge 後の `main` run で以下を確認する。

- `deploy-production` の `playwright install chromium` が成功する
- install log で apt が起動しない
- deployed production smoke が成功する

## 15. Post-merge で `deploy-production` だけ失敗した場合

`deploy-production` は Cloudflare production deployment 後に Chromium install と deployed smoke を行う。

そのため browser-only install の system dependency 不足だけで失敗した場合、直ちに production アプリケーション障害とは判断しない。

失敗時はログから次を切り分ける。

1. Cloudflare production deployment 自体が成功しているか
2. `playwright install chromium` が成功しているか
3. Chromium launch が system dependency 不足で失敗しているか
4. deployed smoke のアプリケーション検証で失敗しているか

browser-only install / Chromium launch の dependency 不足が原因と確認できた場合は、CI runner 側の検証環境問題として扱い、この CI 変更に対する最小 hotfix / revert を行う。

アプリケーション自体の production 障害として誤分類しない。

一方、deployed smoke がアプリケーション挙動で失敗している場合は、本 CI install 変更とは分離して原因を調査する。

## 16. browser-only install が成立しない場合

Chromium launch または test で system dependency 不足が判明した場合、推測で package を追加しない。

次の順で原因を絞る。

1. Playwright のエラーから不足 library / package を特定する
2. 必要に応じて `pnpm exec playwright install-deps chromium --dry-run` を診断材料として利用する
3. 実行必須 dependency か、font 等の補助 dependency かを分ける
4. GitHub-hosted runner image 上で本当に不足していることを確認する
5. runtime apt を再導入する案と、必要 dependency が事前投入された Playwright container 等を比較する

少数 package の明示 install であっても runtime に `apt` / package mirror を利用するなら、今回の直接的な不安定要因を再導入することになる。

そのため「package 数が少ないから解決」とは判断しない。

runtime apt を再導入する場合は暫定策であることを明記し、安定性とのトレードオフを評価する。

Playwright 公式 Docker image を利用する場合は、リポジトリで使用中の `@playwright/test` `1.62.0` と browser version を一致させる。

今回の初回実装では Docker 化しない。

## 17. GitHub-hosted runner への依存というトレードオフ

`--with-deps` を外す場合、Chromium 実行に必要な Linux runtime dependency が GitHub-hosted runner image に存在することへ依存する。

これは今回の apt mirror flake を避ける代わりに受け入れるトレードオフである。

今回の成功を「すべての Linux 環境で `--with-deps` が不要」と一般化しない。

将来 GitHub runner image 更新後に system dependency 不足で Chromium launch が失敗した場合は、本 plan の fallback 方針に従って再評価する。

## 18. 並列数の扱い

初回修正では以下を変更しない。

- `e2e-chromium.strategy.max-parallel`
- `ui-review.strategy.max-parallel`
- `extended-e2e.strategy.max-parallel`
- その他 Playwright matrix の並列度

理由は、`--with-deps` と並列度を同時に変更すると、どちらが安定化に寄与したか判別できなくなるため。

Chromium の apt 依存を除去した後も Playwright job が不安定な場合のみ、runner resource、アプリ / test server 負荷、外部 service 制約、matrix 並列度を別途調査する。

並列数削減は必要性が確認された場合に限り、別の修正として扱う。

## 19. 今回変更しないもの

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
- Firefox / WebKit の system dependency 再設計
- visual regression framework の新規導入
- 新しい CI contract test framework / validator の導入
- Playwright version の更新
- Node / pnpm version の更新

## 20. Pre-merge 完了条件

以下をすべて満たすこと。

- 変更ファイルが原則として `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`、本 plan に限定されている
- Chromium 固定 5 job が `playwright install chromium` になっている
- `extended-e2e` の Chromium path が browser-only install になっている
- Firefox / WebKit の既存 `--with-deps` behavior を維持している
- `tests/contracts/ci-workflow.test.ts` に今回の Chromium install 契約が追加されている
- `pnpm run format:check` が成功する
- `pnpm run test:contracts` が成功する
- PR CI の Chromium E2E 全 matrix が成功する
- UI Review 全 viewport が成功する
- production-smoke が成功する
- internal PR の deploy-preview が成功する
- verify が成功する
- validate が成功する
- Chromium install log で apt / OS dependency installation が起動していない
- UI Review を比較可能な baseline と比較し退行がない、または baseline 取得不能時の fallback visual 確認を完了している
- 同一 commit の追加 rerun でも Chromium install 起因の timeout / cancel が発生しない
- PR 側検証後の `workflow_dispatch` で `mobile-chromium` が browser-only install とテストまで成功する
- Firefox / WebKit の apt / mirror failure のみを理由に今回の PR を blocking していない
- `max-parallel` を変更していない

## 21. Post-merge 必須確認

- `main` push の Phase 1 CI を確認する
- `deploy-production` の Chromium install で apt が起動しない
- deployed production smoke が成功する

Post-merge で browser-only install / Chromium launch の dependency 不足だけが失敗した場合は、CI runner 側の検証環境問題として最小 hotfix / revert を行う。

## 22. ロールバック / 再設計条件

以下の場合は Chromium の `--with-deps` 削除をそのまま merge しない。

- Chromium launch が system dependency 不足で失敗する
- UI Review で明確な font / rendering 退行が出る
- browser-only install に起因する新しい再現性のある failure が発生する
- `extended-e2e` の `mobile-chromium` が system dependency 不足で失敗する
- 条件分岐によって Firefox / WebKit の既存挙動を壊す
- 既存 CI contract と矛盾し、今回の意図を最小変更で契約化できない

その場合は不足 dependency または workflow contract の不整合を特定し、必要最小限の代替案を再設計する。

## 23. 実施順序

1. `main` の最新状態を確認する
2. `main` が進んでいれば必要に応じて取り込み、base / baseline commit を更新する
3. 既存の比較可能な UI Review artifact があるか確認する
4. なければ workflow 修正前の branch commit で baseline 取得を 1 回だけ試す
5. Chromium 固定 5 job の `--with-deps` を外す
6. `extended-e2e` で Chromium のみ browser-only install に分岐する
7. `tests/contracts/ci-workflow.test.ts` に今回の契約を追加する
8. `pnpm run format:check` を実行する
9. `pnpm run test:contracts` を実行する
10. internal PR の初回 Phase 1 CI を完了させる
11. Chromium install log から apt が起動していないことを確認する
12. UI Review artifact を baseline と比較する。baseline取得不能なら fallback visual 確認を行う
13. 同一 commit の PR rerun を順番に実行し、必要回数を完了させる
14. PR 側の検証完了後、branch の `workflow_dispatch` を 1 回実行する
15. `mobile-chromium` の browser-only install と test 成功を確認する
16. Firefox / WebKit が失敗した場合は、既存 `--with-deps` 内の apt / mirror failure か、今回の regression かを切り分ける
17. Pre-merge 完了条件を満たしたら CI 安定化 PR を merge する
18. merge 後の `main` run で `deploy-production` まで確認する
19. 問題なければ PR #32 の branch に最新 `main` を取り込む
20. PR #32 の CI を再実行する
21. PR #32 自体の品質判断を行う

## 24. PR #32 との関係

この CI 安定化は PR #32 の機能変更とは独立しているため、別 PR とする。

CI infrastructure の flake と PR #32 の変更内容を分離し、PR #32 の合否を不安定な Playwright install に左右されにくくする。
