# pnpm-lock.yaml のフォーマット所有権を pnpm に統一する実装プラン

## 0. 依頼概要

- 依頼内容: Issue #51 の対応として、`pnpm-lock.yaml` のフォーマット所有権を Prettier から pnpm に一本化する
- 背景: dependency 変更なしでも `pnpm install --lockfile-only --ignore-scripts` により約 12,000〜13,000 行の formatting diff が発生し、dependency / security update のレビューを阻害している
- 期待成果: `pnpm-lock.yaml` を pnpm 9.10.0 の canonical 形式へ一度だけ normalization し、以後は pnpm 再実行でも不要な formatting diff が出ない状態にする

関連:

- Issue #51: `pnpm-lock.yaml のフォーマット所有権を pnpm に統一する`
- PR #50: `security: investigate Dependabot remediation blocker for js-yaml`

## 1. ゴール / 完了条件

### ゴール

`pnpm-lock.yaml` の format owner を pnpm 9.10.0 に統一し、Prettier の対象外にする。

dependency graph は変更しない。

### 完了条件（DoD）

Local:

- [ ] `.prettierignore` に `pnpm-lock.yaml` が追加されている
- [ ] pnpm 9.10.0 で normalization している
- [ ] normalization 前後の YAML parse 結果が `deepStrictEqual` で一致する
- [ ] 2 回目の `pnpm install --lockfile-only --ignore-scripts` 前後で `pnpm-lock.yaml` の SHA-256 が一致する
- [ ] Prettier `--file-info` で `pnpm-lock.yaml` が `ignored: true` になる
- [ ] `pnpm install --frozen-lockfile --ignore-scripts` が成功する
- [ ] `pnpm run format:check` が成功する
- [ ] `pnpm run verify` が成功する

PR:

- [ ] Web CI が成功する
- [ ] Mobile App CI が成功する
- [ ] `js-yaml` remediation / unrelated dependency update / application change が混在していない

## 2. 現状理解と前提

### Current understanding

確認済み:

- `package.json` の `packageManager` は `pnpm@9.10.0`
- Web CI / Mobile App CI の `PNPM_VERSION` は `9.10.0`
- `.prettierignore` に `pnpm-lock.yaml` は含まれていない
- `format` / `format:check` は `.prettierignore` を使用する
- pnpm canonical lockfile に Prettier をかけると、現行 Repository の lockfile 形式へ戻る
- PR #50 の調査では、pnpm normalization 前後の dependency graph は semantic に同一だった
- Native change detection に `pnpm-lock.yaml` が含まれている

### Assumptions

以下が崩れた場合は実装を止めて計画を見直す。

- 実装開始時点でも Issue #51 と無関係な dependency change が入っていない
- pnpm 9.10.0 を利用できる
- security remediation は Issue #51 と分離したまま進める

### Non-goals

実施しない:

- `js-yaml` / Dependabot Alert #5 の remediation や dismiss
- dependency version / resolution の意図的変更
- pnpm / Prettier の version update
- CI / Dependabot 設定変更
- application / test code 変更
- format / lint / security gate の弱体化
- `*.yaml` / `*.yml` 全体の Prettier 除外
- 恒久的な lockfile 検証スクリプト追加
- Native CI 回避のための change detection 変更

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし
- 未回答の重要質問: なし
- 一時 snapshot / hash の保存先は Git 管理外であれば実行環境に合わせてよい

## 4. 影響範囲

### 実装上の変更対象

- `.prettierignore`
- `pnpm-lock.yaml`

### 許容する記録 Artifact

- この Plan
- `AGENTS.md` に従って実装 Run で作成・更新される `.codex/runs/<run_id>/**`

Plan / Run Artifact を除き、上記 2 ファイル以外の product / config / source / dependency file は変更しない。

### Files to inspect

実装開始前に最低限確認する。

- `package.json`
- `.prettierignore`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `AGENTS.md`

### Safe change surface

恒久設定変更は `.prettierignore` への `pnpm-lock.yaml` 1 行追加のみ。

`pnpm-lock.yaml` の大規模差分は pnpm 9.10.0 による一度限りの serializer normalization として扱う。

## 5. 変更方針

### Task 1: 開始状態を確認する

```bash
pnpm --version
git status --short
```

必須:

- pnpm = `9.10.0`
- Issue #51 と無関係な未コミット変更がない

pnpm が 9.10.0 でない場合は normalization しない。Repository 指定版を利用できる環境へ合わせてから再開する。version 定義自体は変更しない。

### Task 2: normalization 前 snapshot を保存する

`pnpm-lock.yaml` を Git 管理外の一時領域へコピーする。

例:

```text
<temporary-path>/pnpm-lock.before.yaml
```

snapshot はコミットしない。

### Task 3: `.prettierignore` を変更する

次の 1 行だけを追加する。

```text
pnpm-lock.yaml
```

`*.yaml` / `*.yml` 等へ広げない。

### Task 4: pnpm 9.10.0 で normalization する

```bash
pnpm install --lockfile-only --ignore-scripts
```

`pnpm-lock.yaml` の大規模 formatting diff は許容する。

`package.json` や dependency 定義は変更しない。

### Task 5: semantic equality を確認する

Repository 既存の `yaml` package で以下 2 ファイルを parse し、`node:assert/strict` の `deepStrictEqual` で全体比較する。

- normalization 前 snapshot
- normalization 後 `pnpm-lock.yaml`

成功条件:

```text
parse(before) deepStrictEqual parse(after)
```

かつ exit code 0。

一部 key のみではなく lockfile 全体を比較するため、dependency version / importer / packages / snapshots / integrity / peer resolution / overrides / settings / checksum も含めて検証される。

検証は one-shot の Node command で実施し、専用スクリプトを Repository に追加しない。

#### 停止条件

`deepStrictEqual` が失敗した場合は実装を停止する。

semantic change を formatting normalization としてコミットしてはならない。

### Task 6: pnpm の no-op 性を SHA-256 で確認する

1 回目 normalization 後の `pnpm-lock.yaml` の SHA-256 を取得する。

その後、再度実行する。

```bash
pnpm install --lockfile-only --ignore-scripts
```

再実行後の SHA-256 を取得する。

成功条件:

```text
SHA256(before second run) == SHA256(after second run)
```

HEAD に対する巨大 diff は既に存在するため、2 回目の no-op 判定に `git diff` は使わない。

hash が変わった場合は停止して原因を調査する。

### Task 7: Prettier が lockfile を ignore することを確認する

Repository 全体への `pnpm run format` は実行しない。

```bash
pnpm exec prettier --file-info pnpm-lock.yaml --ignore-path .prettierignore
```

成功条件:

```text
ignored: true
```

これにより unrelated file を write せず、ownership を直接確認する。

### Task 8: lockfile / Repository validation を実行する

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run format:check
pnpm run verify
```

すべて exit code 0 を必須とする。

frozen install 後にも `pnpm-lock.yaml` が変化していないことを確認する。判断が必要なら Task 6 と同じ SHA-256 比較を使う。

品質ゲート failure は `AGENTS.md` の failure handling に従って原因を分類する。ただし Issue #51 と無関係な dependency update / CI policy change を解決策として混ぜない。

### Task 9: 最終 diff を確認する

```bash
git status --short
git diff --stat
git diff -- .prettierignore
git diff -- pnpm-lock.yaml
```

実装変更は以下のみであること。

```text
.prettierignore
pnpm-lock.yaml
```

想定:

- `.prettierignore`: `pnpm-lock.yaml` 1 行追加
- `pnpm-lock.yaml`: pnpm 9.10.0 canonical serializer による formatting normalization

Plan / Run Artifact 以外で以下に差分があれば、Issue #51 に必要かを再確認し、不要なら含めない。

- `package.json`
- `.github/workflows/**`
- application source
- tests
- Dependabot config
- その他 dependency 関連ファイル

### Task 10: PR-level CI を確認する

`pnpm-lock.yaml` が Native change detection 対象のため、次を両方確認する。

- Web CI: success
- Mobile App CI: success

CI 回避のために workflow / change detection を変更しない。

## 6. 検証方法

| 検証 | 成功判定 |
| --- | --- |
| pnpm version | `9.10.0` |
| semantic equality | YAML parse 後 `deepStrictEqual` 成功 |
| pnpm idempotency | 2 回目実行前後 SHA-256 一致 |
| Prettier ownership | `--file-info` で `ignored: true` |
| frozen install | exit code 0 / lockfile 不変 |
| format gate | `pnpm run format:check` 成功 |
| full verify | `pnpm run verify` 成功 |
| PR CI | Web / Mobile App CI 成功 |

ownership conflict 解消の核心条件は以下 3 点。

1. pnpm 9.10.0 の再実行で lockfile が変わらない
2. Prettier が lockfile を ignore する
3. normalization 前後で YAML semantic content が完全一致する

## 7. リスクと未解決論点

### Risks

- 大規模 diff に semantic change が隠れる
  - 対策: lockfile 全体の YAML deep equality を必須化
- pnpm version 差で再変換される
  - 対策: 9.10.0 を実行前に確認
- 2 回目 no-op を HEAD diff で誤判定する
  - 対策: 実行前後 SHA-256 で比較
- ownership 確認のために unrelated file を書き換える
  - 対策: `pnpm run format` ではなく `prettier --file-info` を使用
- `js-yaml` remediation を同じ PR に混ぜる
  - 対策: Issue #51 merge 後に別 Run / branch / PR で実施

### Open questions

なし。

semantic equality が崩れた場合のみ、Issue #51 の前提が変わったものとして再調査する。

## 8. 成果物

実装変更:

- `.prettierignore`
- `pnpm-lock.yaml`

付随 Artifact:

- `docs/plans/2026-08-23_200400_pnpm_lockfile_format_ownership.md`
- `AGENTS.md` に従う `.codex/runs/<run_id>/**`

恒久 validation script、ADR、CI workflow は追加しない。

## 9. Follow-up notes

Issue #51 の PR merge 後、PR #50 で BLOCKED となっている Dependabot Alert #5 (`js-yaml@4.3.0`) の最小 remediation を新しい Run / branch / PR で再評価する。

この Follow-up は Issue #51 に含めない。
