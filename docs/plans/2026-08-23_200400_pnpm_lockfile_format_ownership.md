# pnpm-lock.yaml のフォーマット所有権を pnpm に統一する実装プラン

## 目的

Issue #51 の対応として、`pnpm-lock.yaml` のフォーマット所有権を Prettier から pnpm に一本化する。

現在は pnpm が生成する canonical lockfile を Prettier が再整形するため、dependency 変更がなくても `pnpm install --lockfile-only --ignore-scripts` によって約 12,000〜13,000 行規模の formatting diff が発生する状態になっている。

このプランでは、`pnpm-lock.yaml` を pnpm 9.10.0 の canonical 形式へ一度だけ normalization し、その後は pnpm を再実行しても lockfile が変化しない状態にする。

関連:

- Issue #51: `pnpm-lock.yaml のフォーマット所有権を pnpm に統一する`
- PR #50: `security: investigate Dependabot remediation blocker for js-yaml`

## 背景

PR #50 の Dependabot Alert #5 (`js-yaml` / `GHSA-5p4m-2wfm-xmqj`) 調査で、security remediation より先に lockfile ownership conflict が存在することが判明した。

確認済みの事実:

- `package.json` の `packageManager` は `pnpm@9.10.0`
- Web CI の `PNPM_VERSION` は `9.10.0`
- Mobile App CI の `PNPM_VERSION` は `9.10.0`
- `.prettierignore` には現在 `pnpm-lock.yaml` が含まれていない
- `pnpm run format` / `pnpm run format:check` は `.prettierignore` を使用する
- dependency 変更なしで `pnpm install --lockfile-only --ignore-scripts` を実行すると、大規模な formatting diff が発生する
- pnpm が生成した lockfile に対する `prettier --check` は fail する
- その lockfile に `prettier --write` をかけると Repository HEAD の lockfile と一致する
- YAML semantic comparison では dependency graph は同一であることが PR #50 の調査で確認されている

したがって、今回の修正対象は dependency graph ではなく、lockfile の serializer / formatter ownership である。

## スコープ

### 変更対象

原則として変更するファイルは次の 2 ファイルだけとする。

- `.prettierignore`
- `pnpm-lock.yaml`

必要な変更:

1. `.prettierignore` に `pnpm-lock.yaml` を追加する
2. `pnpm-lock.yaml` を pnpm 9.10.0 で canonical 形式へ一度だけ normalization する

### 非対象

以下はこの Issue / PR では実施しない。

- `js-yaml` の脆弱性修正
- Dependabot Alert #5 の remediation
- Dependabot Alert の dismiss
- dependency version の更新
- dependency resolution の意図的変更
- pnpm の version update
- Prettier の version update
- CI workflow の変更
- Dependabot 設定の変更
- application code の変更
- format / lint / security gate の弱体化
- YAML 全体を Prettier 対象外にする変更
- lockfile ownership 検証専用の恒久スクリプト追加

## 実装方針

実装は「ownership の一本化」と「一度限りの normalization」に限定する。

恒久的な設定変更は `.prettierignore` の `pnpm-lock.yaml` 追加だけとする。

`pnpm-lock.yaml` の大規模差分は pnpm 9.10.0 自身による serializer normalization として扱う。ただし、formatting diff に dependency graph の変更が混入していないことを機械的に確認する。

## 実装手順

### 1. 作業開始時の状態を確認する

実装開始前に以下を確認する。

```bash
pnpm --version
git status --short
```

期待値:

- `pnpm --version` が `9.10.0`
- Issue #51 と無関係な未コミット変更がない

pnpm が 9.10.0 でない場合は、そのまま normalization を実行しない。

Repository が `packageManager: pnpm@9.10.0` を定義しているため、Corepack 等を使用して Repository 指定版へ合わせてから作業する。

### 2. normalization 前の lockfile semantic snapshot を保存する

`pnpm-lock.yaml` を normalization する前に、比較用 snapshot を一時領域へ保存する。

例:

```bash
cp pnpm-lock.yaml <temporary-before-path>
```

Windows の場合は同等の PowerShell コマンドでよい。

snapshot はコミット対象にしない。

### 3. `.prettierignore` に `pnpm-lock.yaml` を追加する

`.prettierignore` に次の 1 行を追加する。

```text
pnpm-lock.yaml
```

既存の ignore 範囲を広げない。

`*.yaml` / `*.yml` のような広域指定にはしない。

### 4. pnpm 9.10.0 で lockfile を canonical normalization する

```bash
pnpm install --lockfile-only --ignore-scripts
```

この時点では `pnpm-lock.yaml` に大量の formatting diff が発生してよい。

ただし、`package.json` や dependency version を変更しない。

### 5. normalization 前後の semantic equality を検証する

最重要検証として、normalization 前後の lockfile を YAML として parse し、semantic に同一であることを確認する。

比較対象は一部キーだけではなく、原則として parse 後の lockfile 全体とする。

特に以下に差分がないことを確認する。

- `lockfileVersion`
- `settings`
- `overrides`
- `packageExtensionsChecksum`
- `importers`
- `packages`
- `snapshots`
- dependency version
- peer dependency resolution
- integrity

Repository には `yaml` package が存在するため、一時的な `node -e` 等で比較してよい。ただし、この検証専用スクリプトは Repository に追加しない。

概念的には以下を満たすこと。

```text
parse(before pnpm-lock.yaml) === parse(after pnpm-lock.yaml)
```

### 停止条件

semantic equality が成立しない場合は実装を停止する。

以下のいずれかが発生した場合も normalization として一括コミットしてはならない。

- dependency version が変化した
- importer が変化した
- package / snapshot が追加・削除された
- integrity が変化した
- peer dependency resolution が変化した
- override / settings / checksum が意図せず変化した

その場合は Issue #51 の前提と現状が変わっているため、原因を再調査する。

### 6. pnpm の no-op 性を確認する

normalization 完了後の `pnpm-lock.yaml` を基準として、もう一度以下を実行する。

```bash
pnpm install --lockfile-only --ignore-scripts
```

2 回目の実行によって `pnpm-lock.yaml` に追加差分が発生しないことを確認する。

この確認は Issue #51 の本質的な受け入れ条件とする。

期待状態:

```text
pnpm 9.10.0
  -> pnpm-lock.yaml を生成
  -> 再度 pnpm 9.10.0 を実行
  -> pnpm-lock.yaml の変更 0
```

### 7. Prettier が lockfile を変更しないことを確認する

まず format gate を確認する。

```bash
pnpm run format:check
```

その後、ownership をより直接確認するため、必要に応じて以下を実行する。

```bash
pnpm run format
```

実行前後で `pnpm-lock.yaml` の内容が変化していないことを確認する。

`format` 実行で他ファイルに意図しない変更が発生した場合は、その変更を Issue #51 に混ぜず元に戻す。

期待状態:

```text
pnpm -> pnpm-lock.yaml を管理
Prettier -> pnpm-lock.yaml を無視
```

### 8. frozen lockfile install を確認する

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

成功することを確認する。

これにより、`package.json` と canonicalized `pnpm-lock.yaml` が pnpm 9.10.0 で整合していることを確認する。

### 9. Repository verification を実行する

最低限、以下を実行する。

```bash
pnpm run format:check
pnpm run verify
```

`verify` が成功することを確認する。

この変更では `pnpm-lock.yaml` が変更されるため、PR 上では Web CI だけでなく Mobile App CI も実行対象になる可能性が高い。Mobile 側の change detection には `pnpm-lock.yaml` が含まれているため、この Issue で native change detection を変更して CI を回避しない。

### 10. 最終 diff を確認する

最終状態で以下を確認する。

```bash
git status --short
git diff --stat
git diff -- .prettierignore
git diff -- pnpm-lock.yaml
```

原則として変更ファイルは以下のみであること。

```text
.prettierignore
pnpm-lock.yaml
```

想定差分:

- `.prettierignore`: `pnpm-lock.yaml` 1 行追加
- `pnpm-lock.yaml`: pnpm 9.10.0 canonical serializer による大規模 formatting normalization

以下に差分があれば、Issue #51 の scope に必要かを再確認し、不要なら除外する。

- `package.json`
- `.github/workflows/**`
- application source
- tests
- Dependabot config
- その他 dependency 関連ファイル

## レビュー時の重点確認

大規模な lockfile diff を目視で全行レビューするのではなく、以下を中心にレビューする。

1. `.prettierignore` の変更が `pnpm-lock.yaml` だけに限定されているか
2. normalization に使用した pnpm が 9.10.0 か
3. before / after の semantic equality が証明されているか
4. 2 回目の `pnpm install --lockfile-only --ignore-scripts` が no-op か
5. `pnpm run format` が lockfile を再変更しないか
6. frozen install が成功するか
7. `pnpm run verify` が成功するか
8. dependency remediation が混入していないか

## リスクと対策

### リスク 1: formatting diff に dependency 変更が隠れる

約 12,000〜13,000 行規模の変更になるため、目視だけでは semantic change を見落としやすい。

対策:

- YAML parse 後の before / after deep equality を必須にする
- equality 不成立なら即停止する

### リスク 2: pnpm version 差で lockfile が再変換される

異なる pnpm version で normalization すると、CI / 開発環境で再度差分が生じる可能性がある。

対策:

- `package.json` と CI で固定済みの pnpm 9.10.0 を使用する
- 実行前に `pnpm --version` を確認する

### リスク 3: `format` が無関係ファイルを変更する

`pnpm run format` は Repository 全体を対象とするため、既存の formatting drift がある場合に別ファイルまで更新する可能性がある。

対策:

- `format` は ownership 確認目的で使用する
- Issue #51 と無関係な差分はコミットしない

### リスク 4: security remediation を同時に行いたくなる

Issue #51 の normalization 後は `js-yaml` remediation を進めやすくなるが、同じ PR に混ぜると lockfile normalization と dependency update の境界が再び不明瞭になる。

対策:

- この PR では Alert #5 を変更しない
- Issue #51 merge 後に新しい security remediation Run / PR で再評価する

## Definition of Done

以下をすべて満たしたら Issue #51 の実装完了とする。

- [ ] `.prettierignore` に `pnpm-lock.yaml` が追加されている
- [ ] normalization に pnpm 9.10.0 を使用している
- [ ] committed `pnpm-lock.yaml` が pnpm 9.10.0 の canonical 形式になっている
- [ ] normalization 前後の YAML semantic equality が成立している
- [ ] dependency version / resolution / integrity に変更がない
- [ ] 2 回目の `pnpm install --lockfile-only --ignore-scripts` で lockfile 変更が 0
- [ ] `pnpm run format` を実行しても `pnpm-lock.yaml` が変化しない
- [ ] `pnpm install --frozen-lockfile --ignore-scripts` が成功する
- [ ] `pnpm run format:check` が成功する
- [ ] `pnpm run verify` が成功する
- [ ] Web CI が成功する
- [ ] Mobile App CI が成功する
- [ ] `js-yaml` remediation が混在していない
- [ ] dependency update が混在していない
- [ ] application behavior の変更がない

## 実装完了後の Follow-up

Issue #51 の PR を merge した後、PR #50 で BLOCKED となっている Dependabot Alert #5 (`js-yaml@4.3.0`) の最小 remediation を、新しい Run / branch で再評価する。

この Follow-up は Issue #51 の実装には含めない。
