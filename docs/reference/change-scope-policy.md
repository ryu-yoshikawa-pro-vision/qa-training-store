# 変更範囲のポリシー

## 目的

この文書は、`codex-task`における変更範囲の適用規則と、変更が期待されるファイルの扱いを定義します。

- `template/docs/reference/change-scope-policy.md` は、利用者向けのリファレンスです。
- `spec/change-scope-policy.json` は、ソースリポジトリ側の正本（source-of-truth）カタログであり、バリデータの検証対象です。
- 後続のランナー実装は、JSONカタログと本Markdown規約の両方に従います。

## パスの正規化

- パスは、リポジトリルート相対のPOSIXパスに正規化します。
- Windowsのパス区切り文字は `/` に正規化します。
- 絶対パスは、スコープ比較に直接使用しません。
- 絶対パスをスコープの入力として受け取ってはなりません。
- `.` や `..` を含むパスは、正規化後にリポジトリルート外へ出ないことを確認します。
- ディレクトリ指定では、末尾のスラッシュ（trailing slash）の有無を同等として扱います。
- スコープオプションを使用する際は、`--run-id` と `--record-run-manifest` の指定を必須とします。

## 変更ファイル

- 追跡対象の変更ファイル（tracked modified files）を `changed_files` に含めます。
- 未追跡ファイル（untracked files）を `changed_files` に含めます。
- 削除されたファイル（deleted files）を `changed_files` に含めます。
- 名前が変更されたファイル（renamed files）は、変更前の旧パスと変更後の新パスの双方を評価対象とします。
- コピーされたファイル（copied files）は、コピー先を新規ファイルとして扱います。
- `.codex/runs/` 配下に生成された実行成果物は、スコープ検証の対象外とします。
- `.codex/runs/` 配下の生成成果物は、`changed_files` に混入させません。
- ただし、`.codex/runs/` 配下の成果物はマニフェストに記録してよいものとします。
- `changed_files` は、リポジトリ相対のPOSIXパスの配列として `run.json` に記録します。

## Clean Gitの前提条件

- `--require-clean-git` は、Codex実行前におけるソースの未コミット変更（dirty状態）を検出します。
- 追跡対象の変更、追加、未追跡、削除、名前変更、コピーを、未コミットのソース変更（dirty source changes）として扱います。
- `.codex/runs/` は生成成果物として、クリーンなGit状態の判定から除外します。
- dirty状態（未コミットの変更が存在する状態）の場合は、Codexを実行しません。
- dirty状態による失敗（dirty failure）時には、Codex実行前から存在していたソースの変更（pre-existing source changes）を `changed_files` に記録してよいものとします。

## 許可するファイル

- `allowed_files` は「変更を許可するファイルの上限」を表します。
- 完全一致で評価します。
- `allowed_files` に含まれないソースファイルの変更は、スコープ違反（scope violation）として扱います。
- `.codex/runs/` 配下の生成成果物はスコープ検証の対象外に設定できますが、ソースの変更と混同しないようにします。

## 許可するディレクトリ

- `allowed_dirs` は「このディレクトリ配下であれば変更してよい」という範囲を表します。
- パスは、リポジトリルート相対のPOSIXパスに正規化します。
- `template/docs/reference` と `template/docs/reference/` は同一の意味として扱います。
- `allowed_dirs` 自体の前方一致（prefix一致）ではなく、ディレクトリ境界に基づいて判定します。
- 許可条件は、`changed_path == allowed_dir` または `changed_path starts with allowed_dir + "/"` です。

## 許可するGlobパターン

- `allowed_globs` は、限定的なglobパターンを用いた許可リスト（allow list）です。
- 特殊トークンは `*`、`**`、`?` のみです。
- `*` は、`/` をまたがない0文字以上の文字列を表します。
- `?` は、`/` をまたがない1文字を表します。
- `**` は、`/` をまたぐ0文字以上の文字列を表します。
- ブレース展開（brace expansion）、拡張glob（extglob）、文字クラス（character class）は前提とせず、これらを特殊構文としては解釈しません。
- `../*` や `/absolute/path/*` のようなリポジトリ外への参照は無効です。

## 対象範囲の優先順位

- 変更ファイルが以下のいずれかに一致すれば許可します。
  1. `allowed_files` に完全一致
  2. `allowed_dirs` 配下に一致
  3. `allowed_globs` に一致
- いずれにも一致しないソースファイルの変更は、スコープ違反（scope violation）となります。

## 変更を期待するファイル

- `expected_changed_files` は「必ず変更されるべきファイル」を表します。
- `allowed_files` とは意味合いが異なります。
- `expected_changed_files` に指定されたファイルが変更されていない場合のデフォルト動作は `fail` です。
- `expected_changed_files` は、`allowed_files` / `allowed_dirs` / `allowed_globs` を統合した許可スコープ（allowed scope）の部分集合（subset）であることが望ましいです。
  - カタログ上のキー名は `must_be_subset_of_allowed_scope` です。
- `--require-evaluation` や `--require-clean-git` を併用した場合でも、`.codex/runs/` 配下の生成成果物はソーススコープに混入させません。

### expected_missingの動作

- `--expected-missing fail`
  - 変更されていない期待ファイル（expected file）を失敗（failure）として扱います。
  - ゼロ以外の終了コード（non-zero exit）で終了します。
- `--expected-missing warn`
  - 変更されていない期待ファイルを警告（warning）として記録します。
  - 標準出力および標準エラー出力（stdout/stderr）に警告を出力します。
  - `run.json` が存在する場合は `validation.warnings` に記録します。
  - 終了コード（exit code）は成功扱いのまま維持されます。

## 削除・名前変更・コピー（Deleted / Renamed / Copied）

### 削除（deleted）

- 削除も変更の一環として扱います。
- `allowed_files` に含まれていないファイルの削除は、スコープ違反となります。

### 名前変更（renamed）

- 変更前の旧パスと変更後の新パスの双方を評価対象とします。
- 変更先のパスが `allowed_files` に含まれない場合は、スコープ違反の候補（scope violation candidate）となります。

### コピー（copied）

- コピー先を新規ファイル（new file）として扱います。
- コピー先のパスが `allowed_files` に含まれない場合は、スコープ違反の候補となります。

## JSONカタログ

- `spec/change-scope-policy.json` は、ソースリポジトリ側バリデータの検証対象です。
- Markdown文書は利用者向けのリファレンスであり、JSONカタログはソースリポジトリ側の正本（source-of-truth）です。
- バリデータは、カタログ種別（catalog type）、スキーマバージョン、パスの正規化、変更ファイル種別、成果物の除外設定、ならびに `allowed_files` / `allowed_dirs` / `allowed_globs` / `expected_changed_files` の意味的な差分を検証します。
- 現在のベースラインでは、ランナーによる強制適用（runner enforcement）、変更ファイルの収集、および限定的なglobマッチングを有効化しています。
