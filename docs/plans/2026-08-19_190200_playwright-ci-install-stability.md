# Playwright CI install stability plan

## 1. 目的

GitHub Actions の Playwright 実行で `pnpm exec playwright install --with-deps chromium` が Linux の `apt` / Ubuntu mirror 待ちで長時間停止し、Playwright テスト本体を開始する前に CI が timeout / cancel される問題を安定化する。

今回の第一目的は、テスト並列度を下げて問題を隠すことではなく、Chromium 実行に不要な OS dependency installation を CI の並列 job から外せるかを実証し、外部 apt mirror 依存を最小化することである。

## 2. 対象ブランチ

- branch: `fix/playwright-ci-install-stability`
- base: `main`
- base commit: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`

## 3. 背景と確認済み事実

PR #32 の Phase 1 CI では、同一 workflow run 内で一部の Playwright job が成功する一方、以下の job が `Install Chromium` 中に cancel された。

- `production-smoke`
- `Chromium E2E (cross-role)`
- `UI Review (ui-review-desktop)`
- `UI Review (ui-review-small-mobile)`

失敗 job の共通点は、次のコマンド実行後に Ubuntu package mirror へのアクセスが停止していることである。

```bash
pnpm exec playwright install --with-deps chromium
```

一方、同じ workflow run で成功した Chromium job では、Chromium の主要な Linux runtime dependency の多くが既に GitHub-hosted runner に存在していた。

成功ログ上で `already the newest version` となっていた主要 dependency の例:

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

そのため、Chromium 本体の取得は維持しつつ、OS dependency installation のみを外せる可能性が高い。ただし Playwright 公式では Linux CI の一般的な構成として `--with-deps` が推奨されているため、削除を前提とせず、このリポジトリの実際の CI で成立することを確認してから採用する。

## 4. 原因仮説

### 根本原因

`--with-deps` によって各 GitHub-hosted runner が `apt` を実行し、Ubuntu package mirror の応答不良に巻き込まれている。

### 並列実行の影響

現在は Chromium E2E、UI Review、production smoke など複数 job が同時期にそれぞれ `--with-deps` を実行する。

並列 job は別 runner であるため、同一マシン内の apt lock 競合ではない。一方、1 workflow 内で外部 apt mirror へのアクセス回数が増え、いずれかの job が mirror 不調を引く確率を高めている可能性がある。

したがって、初回修正では `max-parallel` を変更しない。まず `--with-deps` を外した状態で現在の並列度を維持し、CI が安定するかを確認する。

## 5. 修正方針

### Phase 1: Chromium 系 job から `--with-deps` を外す

`.github/workflows/ci.yml` の Chromium 系 Playwright install を次のように変更する。

```diff
- pnpm exec playwright install --with-deps chromium
+ pnpm exec playwright install chromium
```

Chromium browser installation 自体は削除しない。Playwright のバージョンに対応した browser binary を確実に利用するため、`playwright install chromium` は維持する。

対象は少なくとも以下。

1. `e2e-chromium`
2. `ui-review`
3. `production-smoke`
4. `deploy-preview`
5. `deploy-production`

`deploy-preview` は internal PR の最終 `validate` に影響するため、事前 E2E のみ修正して漏らさないこと。

### Phase 2: Chromium CI の実動作を確認する

以下を全て確認する。

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
- validate

特に UI Review は、`--with-deps` が追加していた OS font package の影響を受ける可能性があるため、単に Chromium が起動することだけでは合格としない。

確認項目:

- 日本語文字が正しく表示される
- font fallback による明確なレイアウト崩れがない
- 改行位置や文字幅に不自然な変化がない
- screenshot / UI review が従来どおり成立する
- emoji 等を利用する画面で欠落がない

アプリ側では Inter / Noto Sans JP を依存として持っているが、それを理由に OS font 差異の確認を省略しない。

### Phase 3: 同一 commit で安定性を確認する

一度成功しただけでは外部 flake の改善を証明できないため、同一 commit の Phase 1 CI を複数回実行する。

最低条件:

- 初回 green
- 同一 commit で rerun 2 回以上
- 合計 3 回程度、Playwright install 起因の timeout / cancel が発生しない

この段階でも `max-parallel` は変更しない。

## 6. Firefox / WebKit / extended-e2e の扱い

`extended-e2e` は Chromium と同時に一括変更しない。

現在の browser ごとの system dependency は異なる可能性があるため、以下を個別に確認する。

- Chromium
- Firefox
- WebKit

各 browser について、GitHub-hosted runner 上で browser-only install と該当 smoke test が成立するか確認する。

候補:

```bash
pnpm exec playwright install chromium
pnpm exec playwright install firefox
pnpm exec playwright install webkit
```

必要に応じて診断目的で以下を利用する。

```bash
pnpm exec playwright install-deps <browser> --dry-run
```

全 browser で browser-only install が成立することを確認できた場合のみ、`extended-e2e` の

```bash
pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

を

```bash
pnpm exec playwright install ${{ matrix.browser }}
```

へ変更する。

成立しない browser がある場合、必要 dependency を特定してから次の対応を判断する。Chromium の修正成功を理由に Firefox / WebKit まで推測で変更しない。

## 7. `--with-deps` を外して失敗した場合の対応

browser-only install 後の browser launch または test で system dependency 不足が判明した場合、すぐに `--with-deps` を元に戻して終了しない。

次の順で原因を絞る。

1. Playwright のエラーから不足 library / package を特定する
2. `install-deps <browser> --dry-run` を診断材料として確認する
3. 実行に必須の dependency か、font 等の補助 dependency かを分ける
4. 必須 package が少数なら、必要性と保守性を評価する
5. apt mirror workaround や Playwright Docker image は、browser-only install が成立しないことを確認した後の代替案とする

不要な package を網羅的に固定列挙する方式は避ける。

## 8. 並列数の扱い

初回修正では以下を変更しない。

- `e2e-chromium.strategy.max-parallel`
- `ui-review.strategy.max-parallel`
- その他 Playwright matrix の並列度

理由は、`--with-deps` と並列度を同時に変更すると、どちらが安定化に寄与したか判別できなくなるため。

`--with-deps` 削除後も Playwright job が不安定な場合のみ、次の調査として runner resource、アプリ / test server 負荷、外部 service 制約、matrix 並列度を確認する。

並列数削減は根本原因が確認された場合に限って行い、CI 時間を不必要に伸ばす変更は避ける。

## 9. 今回変更しないもの

初回 PR では以下をスコープ外とする。

- job timeout の延長
- apt retry loop の追加
- Ubuntu mirror の強制置換
- browser binary の独自 cache
- browser artifact の job 間共有
- matrix 構成の再設計
- `max-parallel` の削減
- self-hosted runner 導入
- Playwright Docker image への移行
- Playwright version の更新
- Node / pnpm version の更新

まず最小変更で apt 依存を取り除けるかを確認する。

## 10. 完了条件

### 必須

- Chromium 系 install から `--with-deps` を外しても browser が正常起動する
- Chromium E2E の全 matrix が成功する
- UI Review の全 viewport が成功する
- production-smoke が成功する
- internal PR の deploy-preview が成功する
- final `validate` が成功する
- UI / font に明確な退行がない
- 同一 commit の CI rerun を含め、複数回連続で Playwright install 起因の timeout / cancel が発生しない

### extended-e2e

- Chromium / Firefox / WebKit それぞれの browser-only install 可否を確認する
- 成立する browser のみ `--with-deps` 削除対象とする
- 成立しない場合は不足 dependency と判断根拠を記録する

## 11. ロールバック条件

以下の場合は Chromium の `--with-deps` 削除をそのまま merge しない。

- Chromium launch が system dependency 不足で失敗する
- UI Review に font / rendering の明確な退行が出る
- browser-only install に起因する新しい再現性のある failure が発生する

その場合は不足 dependency を特定し、次の最小案を再設計する。

## 12. PR #32 との順序

この CI 安定化は PR #32 の機能変更とは独立しているため、別 PR とする。

推奨順序:

1. `main` から本 branch を作成
2. CI 安定化修正を実装
3. CI を複数回確認
4. 安定化 PR を merge
5. PR #32 の branch に最新 `main` を取り込む
6. PR #32 の CI を再実行
7. PR #32 自体の品質判断を行う

CI infrastructure の flake と PR #32 の変更内容を分離し、PR #32 の合否を不安定な Playwright install に左右されにくくする。
