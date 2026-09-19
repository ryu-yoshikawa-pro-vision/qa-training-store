# Tasks（タスク）

## Now（現在）

- [x] 1. 直近修正以降のレビュー結果をIssue #163と現行Planへ再照合し、重複を10件へ統合する。
- [x] 2. range正規化、最小version、1 Alert境界、lockfile構造差分、grep deny、固定concurrency、OIDC境界、one-shot契約、activation前PR確認をPlanへ反映する。
- [x] 3. 同一Run Artifactを更新し、今回もPlan以外の実装へ進んでいないことを確認する。
- [x] 4. branch差分をPlanとRun Artifactだけに保ってcommit可能な状態にする。

## Discovered（発見事項）

- GitHubのnpm `vulnerable_version_range`は`,`区切りを含むため、`node-semver`へ渡す前に狭い正規化が必要。
- `parent_candidates`のversion列挙は安全なparent fixの証明にならないため、isolated temp copyで最小の安全versionをworkflow側が検証する方針へ変更。
- 1 Alert入力では、そのAlert range内の複数pathだけを修正対象にすることでPR #58型の複数Alert groupingを初期版から外せる。
- Alert番号をconcurrency groupへ含めず、固定groupでfallback全体を直列化する方が公開情報境界と初期要件に合う。

## Blocked（ブロック中）

- Owner権限で現在のopen Dependabot Alert件数を確認し、Issue #163の契約に沿って`prConcurrentLimit`の具体値を決定する必要がある。値がPlanへ追記されるまでRenovate設定実装は開始しない。
