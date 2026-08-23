# pnpm-lock.yaml のフォーマット所有権を pnpm に統一する実装プラン

## 0. 依頼概要

- 依頼内容: Issue #51 の対応として、`pnpm-lock.yaml` のフォーマット所有権を Prettier から pnpm に一本化する
- 背景: dependency 変更なしの `pnpm install --lockfile-only --ignore-scripts` でも約 12,000〜13,000 行の formatting diff が発生し、security remediation 等の最小差分レビューを阻害している
- 期待成果: `pnpm-lock.yaml` を pnpm 9.10.0 の canonical 形式へ一度だけ normalization し、その後 pnpm / Prettier のどちらを実行しても不要な lockfile formatting churn が発生しない状態にする

関連:

- Issue #51: `pnpm-lock.yaml のフォーマット所有権を pnpm に統一する`
- PR #50: `security: investigate Dependabot remediation blocker for js-yaml`

## 1. ゴール / 完了条件

### ゴール

`pnpm-lock.yaml` の唯一の format owner を pnpm 9.10.0 とし、Prettier から除外する。

今回の変更では dependency graph を変更せず、次回以降の dependency update で formatting-only の大規模差分が混ざらない状態を作る。

### 完了条件（DoD）

#### Local validation

- [ ] `.prettierignore` に `pnpm-lock.yaml` が追加されている
- [ ] normalization に pnpm 9.10.0 を使用している
- [ ] normalization 前後の `pnpm-lock.yaml` を YAML parse し、全体の deep equality が成立している
- [ ] dependency version / resolution / integrity / importer / package / snapshot / override / settings / checksum に semantic change がない
- [ ] 1 回目の normalization 後と、2 回目の `pnpm install --lockfile-only --ignore-scripts` 後の `pnpm-lock.yaml` の SHA-256 が一致している
- [ ] `pnpm exec prettier --file-info pnpm-lock.yaml --ignore-path .prettierignore` で `ignored: true` を確認している
- [ ] `pnpm install --frozen-lockfile --ignore-scripts` が成功する
- [ ] `pnpm run format:check` が成功する
- [ ] `pnpm run verify` が成功する

#### PR-level validation

- [ ] Web CI が成功する
- [ ] Mobile App CI が成功する
- [ ] `js-yaml` remediation が混在していない
- [ ] unrelated dependency update / application behavior change が混在していない

## 2. 現状理解と前提

### Current understanding

確認済みの事実:

- `package.json` の `packageManager` は `pnpm@9.10.0`
- Web CI の `PNPM_VERSION` は `9.10.0`
- Mobile App CI の `PNPM_VERSION` は `9.10.0`
- `.prettierignore` には現在 `pnpm-lock.yaml` が含まれていない
- `pnpm run format` / `pnpm run format:check` は `.prettierignore` を使用する
- dependency 変更なしの `pnpm install --lockfile-only --ignore-scripts` で大規模な formatting diff が発生する
- pnpm canonical lockfile に対する Prettier check は fail する
- その canonical lockfile に Prettier write をかけると現行 Repository の lockfile と一致する
- PR #50 の調査では、normalization 前後の dependency graph が semantic に同一であることを確認済み
- `.github/workflows/native-ci.yml` の change detection には `pnpm-lock.yaml` が含まれているため、今回の PR では Mobile App CI が実行対象になる

### Assumptions

以下の前提が崩れた場合は、そのまま実装を続けず計画を見直す。

- 実装開始時点でも `package.json` の dependency 定義に Issue #51 と無関係な変更が入っていない
- pnpm 9.10.0 を利用できる実行環境で作業できる
- Issue #51 の目的は lockfile ownership conflict の解消であり、dependency remediation は別対応のままである

### Non-goals

以下は今回実施しない。

- `js-yaml` の脆弱性修正
- Dependabot Alert #5 の remediation / dismiss
- dependency version update
- dependency resolution の意図的変更
- pnpm / Prettier の version update
- CI workflow の変更
- Dependabot 設定の変更
- application code の変更
- test の追加・変更
- format / lint / security gate の弱体化
- YAML 全体を Prettier 対象外にする変更
- lockfile ownership 検証専用の恒久スクリプト追加
- native change detection の変更による CI 回避

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

なし。

Issue #51 と既存 Repository 設定から、目的・変更範囲・成功条件は確定している。

### 仮定してよい細部

- temporary snapshot / hash 値の保存先は Git 管理外の一時領域を使用してよい
- Windows / Linux で snapshot 作成方法が異なる場合、同等の安全なコマンドを使用してよい

### 未回答の重要質問

なし。

## 4. 影響範囲

### Impacted areas

#### 実装上の変更対象

- `.prettierignore`
- `pnpm-lock.yaml`

#### 記録 Artifact として追加・更新を許容するもの

- この Plan file
- `AGENTS.md` に従って実装 Run で生成・更新される `.codex/runs/<run_id>/**`

上記 Artifact は実装上の変更対象とは分けて扱う。

上記以外の product / config / source / dependency 関連ファイルを変更しない。

### Files to inspect

実装開始前に最低限以下を確認する。

- `package.json`
- `.prettierignore`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `AGENTS.md`

### Safe change surface

恒久的な設定変更は `.prettierignore` の `pnpm-lock.yaml` 1 行追加だけとする。

`pnpm-lock.yaml` の大規模差分は pnpm 9.10.0 自身による一度限りの serializer normalization として扱う。

## 5. 変更方針

### Change strategy

1. 作業開始時の version / working tree を確認する
2. normalization 前 lockfile を Git 管理外へ snapshot する
3. `.prettierignore` に `pnpm-lock.yaml` を追加する
4. pnpm 9.10.0 で lockfile を normalization する
5. before / after の YAML semantic equality を機械的に検証する
6. normalized lockfile の SHA-256 を取得する
7. 同じ pnpm command を再実行し、SHA-256 が不変であることを確認する
8. Prettier が `pnpm-lock.yaml` を ignore していることを `--file-info` で直接確認する
9. frozen install / format gate / verify を実行する
10. 最終 diff を確認し、scope 外の変更を除外する
11. PR 上で Web CI / Mobile App CI を確認する

### 実行タスク

#### Task 1: 作業開始時の状態確認

```bash
pnpm --version
git status --short
```

成功条件:

- `pnpm --version` が `9.10.0`
- Issue #51 と無関係な未コミット変更がない

`pnpm --version != 9.10.0` の場合:

- normalization を実行しない
- Repository 指定の pnpm 9.10.0 が利用できる環境へ合わせてから再開する
- `package.json` や CI の pnpm version を変更して合わせない

#### Task 2: normalization 前 snapshot を保存する

`pnpm-lock.yaml` を Git 管理外の一時領域へコピーする。

例:

```text
<temporary-path>/pnpm-lock.before.yaml
```

この snapshot はコミットしない。

#### Task 3: `.prettierignore` を変更する

`.prettierignore` に次の 1 行だけを追加する。

```text
pnpm-lock.yaml
```

禁止:

- `*.yaml`
- `*.yml`
- unrelated ignore rule の追加・整理

#### Task 4: pnpm 9.10.0 で normalization する

```bash
pnpm install --lockfile-only --ignore-scripts
```

この時点で `pnpm-lock.yaml` に大規模な formatting diff が発生すること自体は許容する。

`package.json` を変更してはならない。

#### Task 5: YAML semantic equality を検証する

Repository 既存の `yaml` package と Node.js を使い、temporary snapshot と normalized `pnpm-lock.yaml` を YAML parse したうえで、`node:assert/strict` の `deepStrictEqual` で全体比較する。

比較対象を一部 key に限定しない。

成功条件:

```text
parse(before) deepStrictEqual parse(after)
```

かつ command exit code が 0。

確認対象には結果的に以下も含まれる。

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

専用スクリプトは Repository に追加しない。one-shot の Node command でよい。

##### 停止条件

semantic equality が成立しない場合は、その時点で Issue #51 の実装を停止する。

以下のいずれかが見つかった場合も normalization として一括処理しない。

- dependency version の変化
- importer の変化
- package / snapshot の追加・削除
- integrity の変化
- peer dependency resolution の変化
- override / settings / checksum の変化

その場合は、前提が変わったものとして原因調査へ戻る。

#### Task 6: 2 回目 pnpm の no-op 性を SHA-256 で確認する

1 回目 normalization 完了後の `pnpm-lock.yaml` の SHA-256 を取得する。

```text
hash_before_second_run = SHA256(pnpm-lock.yaml)
```

その後、同じ command を再実行する。

```bash
pnpm install --lockfile-only --ignore-scripts
```

再実行後にもう一度 SHA-256 を取得する。

```text
hash_after_second_run = SHA256(pnpm-lock.yaml)
```

成功条件:

```text
hash_before_second_run == hash_after_second_run
```

`git diff` は HEAD との差分が既に大きいため、この no-op 判定には使用しない。

hash が一致しない場合は実装を停止し、差分原因を調査する。

#### Task 7: Prettier ignore を直接確認する

Repository 全体への `pnpm run format` は実行しない。

今回確認したいのは `pnpm-lock.yaml` が `.prettierignore` によって除外されることだけなので、次を実行する。

```bash
pnpm exec prettier --file-info pnpm-lock.yaml --ignore-path .prettierignore
```

成功条件:

- 出力で `ignored: true` を確認できる

これにより、unrelated file へ format write を発生させず ownership を直接検証する。

#### Task 8: frozen lockfile install を確認する

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

成功条件:

- exit code 0
- 実行後に `pnpm-lock.yaml` が変化しない

必要に応じて Task 6 と同様に実行前後の SHA-256 を比較する。

#### Task 9: Repository validation を実行する

```bash
pnpm run format:check
pnpm run verify
```

成功条件:

- 両方 exit code 0

`verify` 内で `format:check` が再実行されても問題ない。今回はリポジトリ標準の全体検証入口を維持するため両方を実行する。

品質ゲートが失敗した場合は `AGENTS.md` の failure handling に従い、今回の差分起因かを判定する。

ただし、Issue #51 と無関係な dependency update や CI policy 変更を解決策として混ぜない。

#### Task 10: 最終 diff を確認する

```bash
git status --short
git diff --stat
git diff -- .prettierignore
git diff -- pnpm-lock.yaml
```

実装上の変更は次だけであること。

```text
.prettierignore
pnpm-lock.yaml
```

想定差分:

- `.prettierignore`: `pnpm-lock.yaml` 1 行追加
- `pnpm-lock.yaml`: pnpm 9.10.0 canonical serializer による formatting normalization

Plan / Run Artifact 以外で以下に差分があれば scope を再確認し、Issue #51 に不要なら含めない。

- `package.json`
- `.github/workflows/**`
- application source
- tests
- Dependabot config
- その他 dependency 関連ファイル

#### Task 11: PR-level CI を確認する

この変更では `pnpm-lock.yaml` が Native change detection 対象のため、Web CI と Mobile App CI の双方を確認する。

成功条件:

- Web CI: success
- Mobile App CI: success

CI を軽くするために native change detection を変更しない。

## 6. 検証方法

### Validation plan

| 検証 | 方法 | 成功判定 |
| --- | --- | --- |
| pnpm version | `pnpm --version` | `9.10.0` |
| semantic equality | YAML parse + `deepStrictEqual` | exit code 0 |
| normalization idempotency | 2 回目 pnpm 前後 SHA-256 比較 | hash 一致 |
| Prettier ownership | `prettier --file-info` | `ignored: true` |
| frozen install | `pnpm install --frozen-lockfile --ignore-scripts` | exit code 0 |
| format gate | `pnpm run format:check` | exit code 0 |
| repository verify | `pnpm run verify` | exit code 0 |
| Web CI | GitHub Actions | success |
| Mobile App CI | GitHub Actions | success |

### 成功判定

以下の 3 点をすべて満たしたら ownership conflict 解消と判断する。

1. pnpm 9.10.0 が生成した lockfile が 2 回目実行で変わらない
2. Prettier が `pnpm-lock.yaml` を明示的に ignore する
3. normalization 前後で YAML semantic content が完全一致する

## 7. リスクと未解決論点

### Risks

#### Risk 1: formatting diff に dependency change が隠れる

対策:

- 目視レビューではなく YAML parse 後の full deep equality を必須にする
- equality 不成立なら即停止する

#### Risk 2: pnpm version 差で再度 lockfile が変換される

対策:

- package / CI で固定済みの pnpm 9.10.0 を使用する
- 実行前に version を必ず確認する

#### Risk 3: no-op 判定を HEAD diff で誤判定する

対策:

- 2 回目実行前後の SHA-256 比較で判定する
- HEAD に対する巨大 diff は no-op 判定に使わない

#### Risk 4: validation のために unrelated file を書き換える

対策:

- Repository 全体への `pnpm run format` は実行しない
- Prettier ownership は `--file-info` で read-only に確認する

#### Risk 5: security remediation を同じ PR に混ぜる

対策:

- Alert #5 / `js-yaml` をこの PR では変更しない
- Issue #51 merge 後に別 Run / branch / PR で再評価する

### Open questions

なし。

実装中に semantic equality が崩れた場合のみ、前提が変わったものとして新しい調査事項を起こす。

## 8. 成果物

### 実装変更

- `.prettierignore`
- `pnpm-lock.yaml`

### 付随ドキュメント / Artifact

- `docs/plans/2026-08-23_200400_pnpm_lockfile_format_ownership.md`
- `AGENTS.md` に従って実装 Run で作成・更新される `.codex/runs/<run_id>/**`

恒久的な validation script、ADR、CI workflow 変更は追加しない。

## 9. Follow-up notes

Issue #51 の PR merge 後、PR #50 で BLOCKED となっている Dependabot Alert #5 (`js-yaml@4.3.0`) の最小 remediation を、新しい Run / branch / PR で再評価する。

この Follow-up は Issue #51 の実装には含めない。
