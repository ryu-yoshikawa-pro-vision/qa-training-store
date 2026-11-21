# 変更範囲のポリシー

## 目的

この文書は、明示的なスコープがある評価・修復ワークフローにおける変更範囲の記録と判定の考え方を定義します。通常の直接 `codex` セッション全体へ自動適用される強制ポリシーではありません。

- 配布元templateで管理される場合、`spec/change-scope-policy.json` はその正本（source-of-truth）カタログであり、対応するvalidatorの検証対象です。
- このconsumer側リファレンスは、明示されたscopeの評価方法を説明します。直接Codexの全操作をOS sandboxやHookがこのポリシーで制限すると主張しません。

## パスの正規化

- パスは、リポジトリルート相対のPOSIXパスに正規化します。
- Windowsのパス区切り文字は `/` に正規化します。
- 絶対パスは、スコープ比較に直接使用しません。
- 絶対パスをスコープの入力として受け取ってはなりません。
- `.` や `..` を含むパスは、正規化後にリポジトリルート外へ出ないことを確認します。
- ディレクトリ指定では、末尾のスラッシュ（trailing slash）の有無を同等として扱います。

## 変更ファイル

- 追跡対象の変更ファイル（tracked modified files）を `changed_files` に含めます。
- 未追跡ファイル（untracked files）を `changed_files` に含めます。
- 削除されたファイル（deleted files）を `changed_files` に含めます。
- 名前が変更されたファイル（renamed files）は、変更前の旧パスと変更後の新パスの双方を評価対象とします。
- コピーされたファイル（copied files）は、コピー先を新規ファイルとして扱います。
- `runs/` とpreserved legacy/historyの`.codex/runs/`配下に生成された実行成果物は、スコープ検証の対象外とします。
- 両Run root配下の生成成果物は、`changed_files` に混入させません。
- Run Artifact自体のパスは、マニフェストに記録してよいものとします。
- `changed_files` は、リポジトリ相対のPOSIXパスの配列として `run.json` に記録します。

## 許可するファイル

- `allowed_files` は「変更を許可するファイルの上限」を表します。
- 完全一致で評価します。
- `allowed_files` に含まれないソースファイルの変更は、スコープ違反（scope violation）として扱います。
- `runs/` と`.codex/runs/`配下の生成成果物はスコープ検証の対象外に設定できますが、ソースの変更と混同しないようにします。

## Catalogで定義する許可ディレクトリ

- catalog contractでdirectory scopeを定義する場合、`allowed_dirs` は「このディレクトリ配下を許可する」という範囲を表します。現在のskill-workflow evaluatorはこのfieldではなくstageごとの許可prefixを検査します。
- パスは、リポジトリルート相対のPOSIXパスに正規化します。
- `template/docs/reference` と `template/docs/reference/` は同一の意味として扱います。
- `allowed_dirs` 自体の前方一致（prefix一致）ではなく、ディレクトリ境界に基づいて判定します。
- 許可条件は、`changed_path == allowed_dir` または `changed_path starts with allowed_dir + "/"` です。

## Catalogで定義するGlobパターン

- `allowed_globs` はcatalog contractで利用する限定的なglobパターンを用いた許可リスト（allow list）です。現在のskill-workflow evaluatorはこのfieldによるglob判定を行いません。
- 特殊トークンは `*`、`**`、`?` のみです。
- `*` は、`/` をまたがない0文字以上の文字列を表します。
- `?` は、`/` をまたがない1文字を表します。
- `**` は、`/` をまたぐ0文字以上の文字列を表します。
- ブレース展開（brace expansion）、拡張glob（extglob）、文字クラス（character class）は前提とせず、これらを特殊構文としては解釈しません。
- `../*` や `/absolute/path/*` のようなリポジトリ外への参照は無効です。

## 対象範囲の優先順位

- catalogまたはworkflowがこれらのscope形式を明示的に使用する場合、変更ファイルは以下のいずれかに一致すれば許可します。
  1. `allowed_files` に完全一致
  2. `allowed_dirs` 配下に一致
  3. `allowed_globs` に一致
- いずれにも一致しないソースファイルの変更は、スコープ違反（scope violation）となります。

## 変更を期待するファイル

- `expected_changed_files` は、特定の評価・修復契約で「変更が期待されるファイル」を表します。
- `allowed_files` とは意味合いが異なります。
- 期待ファイルが変更されていない場合の扱いは、そのworkflowの明示された契約に従います。
- `expected_changed_files` は、`allowed_files` / `allowed_dirs` / `allowed_globs` を統合した許可スコープ（allowed scope）の部分集合（subset）であることが望ましいです。
  - カタログ上のキー名は `must_be_subset_of_allowed_scope` です。
- `runs/` と`.codex/runs/`配下の生成成果物はソーススコープに混入させません。

### 期待ファイルが変更されなかった場合

評価・修復workflowは、未変更をfailまたはwarningとして扱うかを個別に定義します。特定の共通CLI optionや終了コード動作は規定しません。

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
- skill-workflow evaluatorは、各stageの許可prefixとrepair outputに宣言された`allowed_files`を検査します。この検査は当該評価workflow内の契約であり、通常の直接Codexセッションの一般的な強制機構ではありません。
