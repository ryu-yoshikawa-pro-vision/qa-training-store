# Codex安全ハーネス運用ガイド

## 目的

- リポジトリ内で Codex を使用するにあたり、危険な実行オプションやコマンドの実行を抑制するための実用的なガードレールを提供する。
- `AGENTS.md` の定めに加え、`execpolicy` ルールおよびラッパーによって技術的な制御レイヤーを追加する。

## 構成

- `scripts/codex-safe.ps1`
  - Codex 起動ラッパー
  - 危険な CLI 引数（`--dangerously-bypass-approvals-and-sandbox`, `-c/--config`, `--add-dir` など）を拒否
  - 安全側のデフォルト設定（`--sandbox`, `--ask-for-approval`）を強制付与
  - 起動前に `codex execpolicy check` を実行し、ルールのスモークテストを実施（事前検証 / preflight）
  - JSONL ログ（既定: `.codex/logs/codex-safe-YYYYMMDD.jsonl`、`--run-id` 指定時: `.codex/runs/<run_id>/logs/codex-safe-YYYYMMDD.jsonl`）に開始・ブロック・事前検証・起動の各イベントを追記
- `scripts/codex-safe.sh`
  - Bash 向け Codex 起動ラッパー（PowerShell 版と同等の方針）
  - 危険な CLI 引数の拒否、`--sandbox` / `--ask-for-approval` の強制付与、事前検証を実施
  - `--print-command`、`--preflight-only`、`--allow-search`、`--run-id`、`--log-path` をサポート
- `.codex/agents/*.toml`
  - プロジェクトスコープのカスタムエージェント定義
  - `code_researcher`、`implementation_researcher`、`test_investigator` は読み取り専用（read-only）の調査エージェント
  - `implementation_worker` は親エージェントが承認した小さく限定的な実装のみを担当する書き込み可能（workspace-write）エージェント
  - 書き込み可能なサブエージェントは原則として 1 タスクにつき 1 つのみ使用し、ファイルの削除、名前変更（rename）、Git の変更操作（mutation）、スコープ外の編集は行わない
- `.codex/rules/*.rules`
  - `execpolicy` ルール
  - 読み取り系の allow（許可）、影響範囲の広い操作への prompt（確認要求）、破壊的操作の forbidden（禁止）を定義
- `.codex/rules-auto-net/*.rules`
  - `--preset auto-net` 指定時のみ追加で読み込む execpolicy ルール
  - ネットワーク、パッケージマネージャー、ビルド、テスト関連のコマンドを allow に設定し、シェルラッパー系コマンドはフックによる検証が完了するまで forbidden とする
- `.codex/config.toml`
  - プロジェクトスコープのデフォルト設定: `sandbox_mode = "workspace-write"`, `approval_policy = "never"`, `web_search = "cached"`
  - `sandbox_workspace_write.network_access = true`, `writable_roots = []`
  - 通常の対話型エントリポイントは直接起動（direct `codex`）。Codex の承認プロンプトは表示せず自動拒否する。
  - `codex-safe safe` は `--ask-for-approval on-request` および `sandbox_workspace_write.network_access=false` を明示的に指定し、ローカルでの例外操作やリカバリにおける承認経路として利用できる。ネットワークを伴う例外操作には、承認とネットワークサンドボックスへの昇格に関する実行時検証が必要となる。
  - `readonly` プリセットは読み取り専用サンドボックスかつ on-request、`auto-net` プリセットは workspace-write かつ never かつ network true を明示する。
  - ログインシェルは `allow_login_shell = false`
  - Codex 0.147.0 で有効なプロジェクトプロファイルには依存せず、ラッパーがプリセットごとのサンドボックスおよび承認設定を明示的に注入する。
  - `safe` の network false および `auto-net` の network true は、ラッパー側で明示的にオーバーライドする。
  - PreToolUse / Bash フック: `.codex/hooks/pre_tool_use_policy.mjs`
  - Windows ネイティブランチャー: `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - 状態を変更する Git 操作は、フックが所有するチェックアウトの canonical root に明示的に固定し、直接 Git ラッパーや `git -C` による対象変更を拒否する。詳細は[Git ブランチ安全性](git-branch-safety.md#hookによる操作rootの固定)を参照する。
  - 文書品質フック: `.codex/hooks/text_quality_gate.mjs`
- `.codex/text-quality-rules.json`
  - リポジトリ固有のリテラル・正規表現ルールの正本。現在は明示的な4つの置換ルールを設定値として管理しており、一般的な日本語ルールはここに複製しない。
- `.textlintrc.json`
  - 一般的な日本語向け本番ルールの正本。評価用プリセットから個別に選定した2つのルールを既存の5ルールに追加した、計7個の個別ルールのみを有効化している。プリセット全体の導入、AI判定（AI Judge）、広範な辞書、独自の自然さ判定などは追加しない。なお、`no-unmatched-pair` は技術文書内のインラインコードなどを誤検知するため採用していない。
- `scripts/lint-text-quality.mjs` / `scripts/check-text-quality-changes.mjs`
  - 前者はカスタムのリテラル・正規表現および textlint の個別ルールを Markdown 本文へ適用するスクリプト。後者はベースラインと現在のフィンガープリント・マルチセットを Git ツリー単位で比較するほか、同一の Markdown 列挙ロジックを用いた全件スキャンモードを提供する。
- `.codex/requirements.toml`
  - 管理配布や機能有効化の際に使用する補助的な最小要件定義
- `scripts/verify`
  - 品質ゲート実行の統一エントリポイント
  - execpolicy の判定、Bash ラッパーの事前検証、Bash / PowerShell テスト（実行可能な環境のみ）を実施する。
  - ソースリポジトリのメンテナーは、配布前に追加で `--strict-harness` / `-StrictHarness` を実行し、仕様・バージョン・CI・更新計画に関する契約（contract）もあわせて確認する。
- `scripts/cleanup-runs.sh` / `scripts/cleanup-runs.ps1`
  - 実行時に生成された成果物（run artifact）を整理するためのプレビューおよび確定実行用エントリポイント
  - デフォルトでは削除を実行せず、明示的な確認（confirm）が指定された場合のみ、対象として把握している成果物を削除する。

関連する上位ガイド:

- `docs/reference/codex-implementation-harness.md`
  - `codex-safe` / `codex-task` / `codex-sandbox` の使い分け

## 推奨起動方法

通常の対話型作業では、リポジトリのルートディレクトリから直接 `codex` を起動します。

```powershell
codex
```

プロジェクトの `.codex/config.toml` におけるデフォルト値は、`workspace-write` / `approval_policy = "never"` / `network_access = true` です。`never` の設定下では、サンドボックスの承認や execpolicy の `prompt` などによる確認プロンプトが表示されず自動的に拒否されるため、影響度の高い操作は実行されません。なお、`git switch` は通常のブランチ切り替えとして確認プロンプトの対象から除外されており、破壊的な切り替え操作（destructive switch）については既存のフックが拒否（deny）します。

ローカルでの例外操作、リカバリ、事前検証、ラッパーによるログ記録などが必要な場合は、補助的な経路として `codex-safe` を使用します。PowerShell からの実行例:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1
```

非対話実行の例:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 exec "作業内容..."
```

読み取り専用（readonly）プリセット:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -Preset readonly
```

auto-net プリセット:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -Preset auto-net
```

事前検証（preflight）のみ実行:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly
```

Bash からの実行例:

```bash
bash scripts/codex-safe.sh
```

auto-net プリセット:

```bash
bash scripts/codex-safe.sh --preset auto-net
```

`git checkout`、マージやリベースのリカバリ、ローカルブランチの削除は、引き続き確認プロンプト（prompt）の対象です。明示的に依頼されたローカル例外操作に限って、ネットワーク昇格を伴わない `codex-safe safe`（on-request）経由で実行できます。`gh api` や、PRのマージ・クローズ、リリースの作成、リポジトリ削除といった影響度の高い GitHub CLI 操作もプロンプト対象を維持します。これらのネットワーク例外操作については、safe ラッパーによる execpolicy の承認とネットワークサンドボックスへの昇格が、読み取り専用の実行時検証によって確認できた場合に限り、承認経路として利用します。通常の直接実行からラッパーへの自動フォールバックは行いません。

`auto-net` は明示的に指定した場合にのみ有効となる既存のプリセットです。ラッパーのデフォルト設定は `safe` のまま維持されます。直接起動時のプロジェクトデフォルトのネットワーク設定とは独立しており、ラッパー側からネットワーク設定を明示的に指定します。

`safe` プリセットは、Codex に対して `sandbox_workspace_write.network_access=false` を明示的に設定します。ただし、検証時に確認した Windows の昇格サンドボックス環境（elevated sandbox）においては、`CodexSandboxOffline` として動作しているセッションから Python による HTTPS 通信が成功する事象が観測されました。この結果は当該環境における特定の挙動であり、一般的な Windows 環境における動作や原因を断定するものではありません。そのため、Windows においては safe プリセットの `network=false` のみをもって完全なネットワーク分離境界（isolation boundary）とはみなしません。ネットワークの遮断そのものがセキュリティ要件となる作業では、この不確実な状態を前提とせず、別途信頼できる隔離環境を用意するか、実行時検証を行う必要があります。

## 何をブロックするか（例）

- `--dangerously-bypass-approvals-and-sandbox`
- `-c` / `--config`
- `--add-dir`
- `-C` / `--cd`
- `-s` / `--sandbox`
- `-a` / `--ask-for-approval`
- `-p` / `--profile`
- `--enable` / `--disable`
- raw `--full-auto`

## 削除禁止

- プロジェクト配下のファイルの読み取りや新規作成・編集は、通常の作業であれば承認なしで行って差し支えない。
- シェル、PowerShell、Git コマンドによるファイルの削除は禁止する。対象の例として、`rm`、`del`、`erase`、`Remove-Item`、`rmdir`、`unlink`、および通常の `git rm` が挙げられる。
- `cleanup-runs` は、生成された実行時成果物（run artifact）を限定的に削除するための例外コマンドである。ただし、デフォルトがプレビューのみであること、明示的な確認（confirm）が必須であること、リポジトリルート外やシンボリックリンクの候補を拒否すること、という前提条件を満たす場合にのみ使用する。
- `auto-net` は、共通の Full Access ポリシーとは異なる非対話型プリセットであり、`git add`、`git commit`、`git push`、`git rm`、`git reset`、`git clean` といった既存の禁止事項をそのまま維持する。
- `auto-net` では、削除や名前変更（rename）を含むパッチ操作も禁止する。不要と思われるファイルがある場合は、削除候補として `REPORT.md` に記録する。
- `implementation_worker` も同様に、削除、名前変更、移動、Git の変更操作、削除や名前変更を伴うパッチ操作を行わない。
- 追跡対象となっている実行時成果物を配布対象から除外する移行作業（migration）に限り、明示された対象に対して `git rm --cached -- <path>` を使用してよい。その場合でも、物理ファイル自体の削除は行わない。

## apply_patch operationの方針

`apply_patch` によるパッチ操作は、通常のファイル編集であれば使用してよい。ただし、削除（delete）、名前変更（rename）、移動（move）は意図が不透明になりやすく影響範囲も大きいため、通常の編集とは区別して扱う。

| 操作 | readonly | direct `codex` | safe | auto-net |
| --- | --- | --- | --- | --- |
| 既存ファイルの内容変更 | 不可 | 可 | 可 | 可 |
| 新規ファイル作成 | 不可 | 可 | 可 | 可 |
| ファイル削除 | 不可 | 原則不可。明示された対象とレビュー可能な理由がある場合のみ候補化 | 原則不可。明示された対象とレビュー可能な理由がある場合のみ候補化 | 不可 |
| rename / move | 不可 | 要レビュー。必要性、影響、migration を説明する | 要レビュー。必要性、影響、migration を説明する | 不可 |
| 削除候補の `REPORT.md` 記録 | 可 | 可 | 可 | 可 |

判断に迷う場合は、削除・名前変更・移動を実行せず、`REPORT.md` に削除候補または移動候補として記録にとどめる。

## Hook guard

- Full Access 共通ポリシーの正本は `.codex/hooks/pre_tool_use_policy.mjs` のみである。`PreToolUse` の `Bash` マッチャー（`^Bash$`）から `tool_input.command` のみを受け取り、ポリシーマトリクス（Section 3 Matrix）相当の G1〜G10 および N1〜N4 を判定する。
- Windows ネイティブ環境では、`command_windows` から `.codex/hooks/pre_tool_use_policy_windows.ps1` を経由して Node プロセスへ標準入力（stdin）を転送する。リポジトリルートは、ルート直下およびネストされた作業ディレクトリ（cwd）のいずれからでも解決できるようにする。
- 不正な形式（malformed）やスキーマ違反の入力に対しては、標準出力（stdout）を空、標準エラー出力（stderr）を非空としたうえで終了コード 2（exit 2）により安全側に倒して拒否（fail-close）する。拒否（deny）時は `hookSpecificOutput.permissionDecision = "deny"` を含む構造化データを出力し、安全（safe）と判定された場合は終了コード 0（exit 0）かつ出力なしとする。
- Git 操作については、既存のシェル境界内にある個々の Git 呼び出し（invocation）を個別に共通解析し、`git -C <path> <subcommand> ...` のような形式であっても通常形式と同様に G1〜G10 および N1〜N4 のポリシーを適用する。呼び出しの中に 1 つでも DENY（拒否）対象が含まれている場合は、コマンド全体を DENY とする。
- 複数の `-C <path>` が指定された場合は出現順に累積適用し、後続のパスは直前の有効な作業ディレクトリ（effective cwd）を基準として解決する。コンテキスト未指定時における保護対象ブランチ（protected branch）の判定は、各呼び出しが選択した有効なリポジトリ（effective repository）を対象とする。同一のサブコマンドが複数含まれるコマンドであっても、すべての呼び出しを漏れなく評価する。
- `--git-dir`、`--git-dir=<path>`、`--work-tree`、`--work-tree=<path>` は、リポジトリの参照先を変更するグローバルオプション（repository-changing global option）として区別して扱う。完全な Git CLI パーサーまでは実装せず、commit、merge、cherry-pick、revert、pull、am、push などのコンテキストに依存する変更操作（context-sensitive mutation）では安全側に倒して拒否（fail-close）する一方、読み取り専用の操作（read-only operation）を一律で拒否（blanket deny）することはない。解析不能な Git 呼び出しについては、曖昧なコンテキストのまま ALLOW（許可）することはしない。
- Bash 系の `git` と Windows / PowerShell の `git.exe` は、同一の Git 実行ファイルとして扱う。サブコマンド以降はクォートを考慮した引数トークン（quote-aware argument token）として評価し、クォートで囲まれた `--force`、`--amend`、`-fd`、`-D`、`HEAD:main` なども、通常の危険なオプションと同様に判定する。
- push 操作は、明示的かつ一意な単一の refspec を指定した場合のみ ALLOW の候補とし、保護対象の宛先（protected destination）、強制実行や削除（force / delete）、`--all` / `--branches`、マッチング push、ワイルドカード、複数 refspec、リモートや URL・パスのみを指定した暗黙的な push、実行時設定や環境変数によって宛先が変わり得る push などは、すべてフェイルクローズ（fail-close）する。通常の `git fetch` は許可を維持するが、保護対象のローカル ref を宛先とする fetch、`update-ref`、および `worktree add -B` による保護ブランチの変更は DENY とする。
- `-c`、`--config`、`--config-env` や、インラインの `GIT_DIR`、`GIT_WORK_TREE`、`GIT_CONFIG_*` による実行時セマンティクスの変更は完全には解決せず、コンテキスト依存の変更操作ではフェイルクローズする。なお、完全なシェル／Git パーサーの実装、エイリアスの展開、PowerShell の状態追跡、各種ラッパー、`.git` ディレクトリの直接書き換えへの対応は本ポリシーの対象外である。
- シェルコマンドの前半に `git switch` やブランチ切り替え形式の `git checkout`、`cd` / `chdir` / `pushd` / `Set-Location` / `sl`、永続的な Git 環境変数の変更があり、その後にコンテキスト依存の Git 変更操作が続く場合は、実行時コンテキストのシミュレーションは行わず、コマンド全体をフェイルクローズする。単独のブランチ切り替え、カレントディレクトリ変更後の読み取り専用 Git 操作、`git config --get` / `--list` などの読み取り専用の設定参照操作はそのまま許可を維持する。
- 操作単体で拒否理由が確定する G1〜G9 などのルールは、リポジトリのブランチコンテキストが未解決であっても既存の判定結果（deny）を返す。通常の `git fetch origin` など、保護対象のローカル ref への反映を伴わない安全な fetch は ALLOW とし、ブランチコンテキストの解決が必要な変更操作はコンテキスト未解決時に G10 としてフェイルクローズする。
- コンテキスト未解決による G10 の判定は一旦保留して後続の Git 呼び出しも評価し、後続に具体的な拒否理由がある場合はそちらを優先する。すべての呼び出しに具体的な拒否理由がない場合に限り、保留していた G10 を返す。
- `update-ref -m <reason>` のオプション値、`fetch` や `pull` の `--refmap` / `--stdin`、保護対象ローカル ref の宛先、状態を変更する `git config`、保護ブランチに対する `branch -d` / `--delete` / `-m` / `--move` のターゲットなどをトークン単位で検査し、対象が不明な場合や未対応の構文（unsupported syntax）である場合は、曖昧なコンテキストのまま ALLOW することはない。Bash の行継続（line continuation）や限定的な引用符なしオプションのエスケープは正規化するが、完全なシェル／Git パーサーの実装までは行わない。
- `.codex/config.toml` では `features.hooks = true` を使用し、非推奨（deprecated）となった `codex_hooks` や過去の PowerShell / Python ポリシーは参照しない。`apply_patch` はマッチャーの対象外であり、共通フック側でその追加・更新・削除・移動（Add / Update / Delete / Move）を検査することはない。
- `.codex/rules/**` は静的なプレフィックス照合による多層防御（defense-in-depth）であり、共通ポリシーの正本ではない。`auto-net` におけるシェルラッパーの禁止など、プリセット固有のルールは別個の規約として維持する。
- Phase 1 では、シェルラッパー系の `bash -lc`、`sh -c`、`pwsh -Command`、`cmd /c` は、auto-net rules 側で原則禁止（forbidden 寄り）として扱う。

## Hook trust運用

### project trustとHook definition trust

リポジトリを Codex で信頼済みに設定することと、リポジトリ内の `.codex/config.toml` に定義された個々のプロジェクトローカルフック（project-local Hook）を信頼することは、異なる条件です。プロジェクトローカルフックを実行可能にするには、少なくとも次の両方を満たす必要があります。

- プロジェクトの `.codex/` レイヤーが信頼されていること。
- 実行対象となる非管理フック（非 managed Hook）の現在の定義がレビュー済みであり、信頼されていること。

リポジトリを一度信頼したからといって、その後に新しく追加されたフックや変更されたフックが自動的に実行されるわけではありません。Codex は非管理フックの現在の定義に紐づくハッシュ値によって信頼状態（trust）を管理しており、新規または変更された定義は再レビューの対象となります。未信頼のフックは実行前にスキップされます。

`.codex/config.toml` 内のフック定義に対して、追加、削除、`command` の変更、`command_windows` の変更、マッチャーの変更、タイムアウト値の変更などの変更があった場合は、以前の信頼状態が引き継がれていると判断しないでください。`git pull` やブランチの切り替えによって定義が変更された場合も同様です。現在のフック一覧と定義を `/hooks` で確認し、必要なフックのみを内容確認のうえで再度信頼（trust）してください。

### `/hooks`での確認手順

リポジトリのルートディレクトリで、普段使用している対話型 CLI を起動します。リポジトリ標準のラッパーを使用する場合は、以下を実行します。

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1
```

Bash:

```bash
bash scripts/codex-safe.sh
```

Codex の対話型 CLI が起動したら、その Codex セッション内で次を実行します。

```text
/hooks
```

なお、`/hooks` は対話型 CLI 内部のスラッシュコマンドです。シェルコマンドとして `codex /hooks` のように実行するものではありません。

`/hooks` の画面では、少なくとも次の項目を確認してください。

- フックの定義元が対象リポジトリの `.codex/config.toml` であること。
- 追加または変更されたフックがレビュー待ちの状態になっていないこと。
- 実行予定のフックの `command`、`command_windows`、マッチャー、タイムアウト値などが、リポジトリの意図した定義と一致していること。
- 実行予定のフックが信頼済み（trusted）になっていること。
- フックが意図せず無効化されていないこと。

表示されたフックの定義をリポジトリ内の期待値と照合したうえで、対象のフックを個別に信頼（trust）します。たとえ安全確認用のフックであっても、表示内容を確認せずに機械的・一括ですべて信頼するような運用は避けてください。

### `CODEX_HOME`の一致

フックの信頼情報（trust）は、リポジトリ側ではなく Codex のユーザー環境側に保存される状態です。フックをレビューして信頼設定を行った対話型 CLI と、実際にリポジトリ内で Codex を使用する環境（対話型／非対話型）とで、同一の `CODEX_HOME` を使用してください。`CODEX_HOME` が異なると、同一の信頼状態が参照されない可能性があります。

確認例:

PowerShell:

```powershell
$env:CODEX_HOME
```

Bash:

```bash
echo "$CODEX_HOME"
```

公式の環境変数仕様において、`CODEX_HOME` 未設定時の既定値は `~/.codex` と定義されています。ユーザー固有の絶対パスをリポジトリ内のドキュメントに直接固定することは避け、信頼確認時と実行時で同じ環境変数の値が参照される運用を徹底してください。

### Git更新後の運用

通常の `git pull` やブランチの切り替えを行うたびに、無条件で `/hooks` による確認を要求する必要はありません。フック定義に変更が生じた場合に限り、次の手順で再確認を行います。

```text
git pull / ブランチ切り替え
↓
.codex/config.toml のフック定義に追加・変更がある
↓
Codex 対話型 CLI を起動
↓
/hooks
↓
変更されたフック定義の定義元・内容・状態を確認
↓
確認済みのフックのみを信頼（trust）
↓
通常作業へ移行
```

フック定義に変更がない場合は、pull のたびに同一のレビューを繰り返す必要はありません。ただし、参照する `CODEX_HOME` を切り替えた場合やフックを無効化した場合は、実行前に状態を再確認してください。

### contract testと実runtime確認の境界

以下の確認は、それぞれ独立した異なる検証証拠となります。

- フック契約テスト（Hook contract）の PASS: 設定構造、ランチャー、stdin / stdout、終了コード、エラー処理といったリポジトリ側の契約仕様が満たされていることを確認します。
- `/hooks` での信頼（trust）済み: Codex が対象の非管理フックを実行可能な状態として認識していることを確認します。
- 実際の実行時（runtime）確認: Codex 本体から実際に対象イベントがフックへ配送され、フックが実行されたことを確認します。

フック契約テストが PASS したことのみをもって、実際の Codex 環境でフックが確実に発火する証拠とはみなせません。逆に、`/hooks` で信頼済みであることのみをもって、ランチャーやフックスクリプトの stdin / stdout / exit 規約が正しく機能していることの検証にもなりません。双方を独立して個別に確認してください。

### Codex未起動のHook検証と診断

リポジトリ側のフックを Codex ホストから切り離して検証する場合は、次の 2 つのコマンドを実行します。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

- `test:hooks` は、既存のフック契約（Hook contract）を正本とし、一時的なフィクスチャ（temp fixture）上でフック構成、ランチャー、stdin / stdout / stderr / exit、文書品質状態（text quality state）の外部エラーをプロセス境界レベルで検証します。Codex ホスト本体は起動せず、診断コマンド（doctor）向けのフック一覧の期待値を別実装することもありません。
- `diagnose:hooks` は、ルートの `.codex/config.toml`、`[features] hooks = true`、ルートの `.codex/hooks.json` の診断範囲、ファイルシステムのシンボリックリンク境界、および既存の `.artifacts/codex-text-quality` の状態を読み取り専用で確認します。フックやランチャーの実行、ペイロード処理、ベースライン生成、フック内部エラー診断ログの追記などは行いません。
- 診断コマンドにおける `baseline_state_missing`、`baseline_state_read`、`baseline_state_json`、`baseline_state_schema`、`baseline_state_identity`、`baseline_state_manifest` は、その状態が直ちに現在のセッションにおける障害であると断定するためのものではありません。状態ファイルが存在しない場合や破損している場合であっても、実行時状態の警告（WARN）として扱い、終了コード 0（exit 0）で終了する範囲があります。
- `baseline_unavailable; cause=<code>` には、状態ファイルへ保存された出力許可済みの安全なコード（safe code）のみが表示されます。プロンプト、フックのペイロード、状態本文、生のセッション ID、絶対パス、シークレット、生の例外情報などは出力されません。正規表現に一致する未知のコードについては、状態ファイルとして検証可能であっても外部への原因表示（cause）には含めません。
- 非アクティブな `Stop`（inactive `Stop`）によるブロック時の `reason` は、従来の文言プレフィックスを維持したうえで、`Diagnostic: <code>`（`baseline_unavailable` の安全な原因コードを含む場合は `; cause=<code>`）および `Run pnpm run diagnose:hooks before completion.` を続けて表示します。同一ブロックの `systemMessage` には、`Codex text quality hook: quality check unavailable (<code>)` または許可リスト（allowlist）に登録された原因コード付きの分類が表示されます。これはフック本体が起動したものの内部で失敗した場合の経路であり、AI エージェントはまず reason 内の `Diagnostic:` を確認する必要があります。
- `systemMessage` または reason 内の `Stop launcher unavailable` は、フック本体を起動する前に発生した Stop ランチャーのフォールバック経路を示します。非アクティブな `Stop` では診断コマンドの案内を含む汎用ブロックとなり、アクティブな `Stop`（active `Stop`）では従来どおり `{ "continue": true }` によるフェイルオープン（fail-open）となって、いずれの場合もランチャーの診断情報が表示されます。なお、通常の文書品質違反（text-quality violation）によるブロック時には、診断用の `systemMessage` や `Diagnostic` 付きの reason は追加されません。
- 非アクティブな `Stop` で `Text quality check unavailable` を受け取った AI エージェントは、原因が未確認のまま完了処理へ進んではならず、まず reason 内の `Diagnostic:` を確認し、続いて `pnpm run diagnose:hooks` を実行してください。フック内部の失敗である場合は、必要に応じて最新の安全なログを確認します。

PowerShell:

```powershell
Get-Content .artifacts/codex-hooks/text-quality-diagnostics.jsonl -Tail 1
```

Bash:

```bash
tail -n 1 .artifacts/codex-hooks/text-quality-diagnostics.jsonl
```

このログは、フック内部のエラーのみを記録する一時的な（ephemeral）エラー専用 JSONL ログです。`schema_version`、タイムスタンプ、イベント種別、安全なコード（safe code）、`stop_hook_active`、許可済み原因コードのみが記録され、ログの書き込みに失敗した場合でもフックのフェイルオープン／フェイルクローズの判定は変更されません。ログファイルが存在しないこと自体はエラーではなく、Stop ランチャーの失敗時、正常終了時、通常の違反検知時、およびアクティブな Stop が連続して実行された場合などには作成されないことがあります。

原因コード（code）の定義は次のとおりです。

- `baseline_state_missing`: 想定される状態ファイルが存在しない。
- `baseline_state_read`: 状態ファイルのパスは存在するが、読み取りができない。
- `baseline_state_json`: 状態ファイルの内容を JSON として解析できない。
- `baseline_state_schema`: JSON ではあるが、状態ファイルのスキーマに適合しない。
- `baseline_state_identity`: リポジトリルートまたはセッションの識別情報が一致しない。
- `baseline_state_manifest`: 状態ファイル内のマニフェストに関する安全性・整合性検証に失敗した。
- `baseline_unavailable`: ベースライン作成時点で品質チェックが利用不能であった。安全な原因コードがある場合のみ `cause=<code>` を表示する。
- `baseline_cleanup`: アクティブな Stop 等における状態ファイルのクリーンアップに失敗した。アクティブな Stop の場合はフェイルオープンにより処理を継続する。
- `Stop launcher unavailable`: ランチャーがフック本体の正常終了まで到達できなかった。フック内部のログが残らない場合がある。
- アクティブな `Stop` における `baseline_state_missing` は、正常な Stop 処理で状態ファイルをクリーンアップした後に再度 Stop が呼ばれたケースと区別がつかないため、従来どおり診断なしで `{ "continue": true }` として許可（allow）します。原因の観測は、最初に発生した非アクティブな `Stop` の時点で行います。
- `.artifacts/codex-text-quality` が存在しない、あるいは状態ファイルが 0 件である状態は正常です。また、`N/A` と表示されるプロジェクトの信頼状態、フックの信頼状態、管理下オーバーライド、実際の Codex におけるプロジェクトルート／作業ディレクトリ／設定レイヤーの階層構造、ホストとセッションのバインディングなどは、警告（WARN）のカウント対象には含めません。
- `diagnose:hooks` の実行結果が `WARN=0 ERROR=0` であっても、過去の実行時にエラーが一切発生していなかったことを証明するものではありません。問題が再発した際は、reason 内の `Diagnostic:`、ブロックと同時に出力される `systemMessage`、および必要に応じて安全な診断ログを一次情報として原因を切り分け、オフラインでの確認を行った後にホスト側設定・信頼状態・設定レイヤーの調査を進めてください。

このオフライン経路でリポジトリ側の検証がすべて PASS しているにもかかわらず、実際の Codex 上でフックが動作しない場合は、`/hooks` での定義と信頼状態、プロジェクトの信頼状態、フックの信頼状態、実行環境における `CODEX_HOME` の一致、Codex ホスト側のプロジェクトルート／作業ディレクトリ／設定レイヤーの階層構造を個別に確認してください。`/hooks` および `CODEX_HOME` の運用に関しては本ドキュメントの信頼管理手順が正本であり、オフライン診断ツールがこれらを自動判定することはありません。

### Hookが動かない場合の確認順序

フックが期待どおりに動作しない場合は、直ちにフックの実装不具合と判断するのではなく、以下の順序に沿って確認を進めてください。

1. `[features].hooks = true` に設定されているか。
2. プロジェクトの `.codex/` レイヤーが信頼されているか。
3. `/hooks` コマンドで対象のフックが検出されているか。
4. 対象フックの現在の定義が信頼済み（trusted）になっているか。
5. フックを信頼設定した環境と実行環境とで、`CODEX_HOME` の値が一致しているか。
6. `.codex/config.toml` の変更に伴い、再レビュー待ちの状態になっていないか。
7. 上記をすべて確認したうえで、ランチャー、Node 環境、パス解決、フックスクリプト本体、Codex ランタイム固有の問題について調査を行う。

なお、この順序は運用上の確認手順を定めたものであり、新たな自動診断フレームワークや信頼管理スクリプトを追加することを意図したものではありません。

### `--dangerously-bypass-hook-trust`の扱い

`--dangerously-bypass-hook-trust` は、通常の対話型作業やリポジトリ標準ラッパーの信頼設定を代替する目的で使用してはなりません。使用が認められる場合であっても、Codex の外部でフックの定義元が検証されている単発の自動化処理に限定されます。このオプションは、`scripts/codex-safe.ps1`、`scripts/codex-safe.sh`、`scripts/codex-task.ps1`、`scripts/codex-task.sh` に自動付与される構成にはなっていません。

フックが動作しない場合は、まず `/hooks` による確認、プロジェクトおよびフックの信頼状態、`CODEX_HOME` の一致を確認してください。`--dangerously-bypass-hook-trust` を付与して回避することを、通常のトラブルシューティング手順としてはなりません。

### 公式仕様の参照

本節の記述は、2026-09-14 時点で確認された公式仕様を根拠としています。

- [Codex Hooks](https://developers.openai.com/codex/hooks/): プロジェクト `.codex/` レイヤー、フック定義の現在ハッシュ値、`/hooks`、未信頼フックのスキップ、`--dangerously-bypass-hook-trust`。
- [Codex environment variables](https://developers.openai.com/codex/config-file/environment-variables): `CODEX_HOME` の用途および既定値。

## レポートファイルの作成方針

- `docs/reports/` は、長期保存（durable）を目的とした調査・監査・検証結果の保管場所であり、通常のレビュー回答、進捗報告、簡易な確認結果、実行（run）内ログの既定の保存先ではない。
- レポートファイルを生成してよいケースは、ユーザーから保存の明示的な指示があった場合、タスク計画の完了条件（DoD: Definition of Done）にレポートファイルが含まれている場合、または複数情報源の調査・監査・検証結果を将来参照する必要がある場合に限られる。
- レビューのみ（review-only）、計画のみ（plan-only）、状況報告（status update）、簡易な確認、通常の証跡コマンド実行結果、実行進捗の記録、チャット上で完結する評価などでは、`docs/reports/` にファイルを作成しない。
- 判断に迷う場合はレポートファイルを作成せず、チャットでの回答および `.codex/runs/<run_id>/REPORT.md` への記録にとどめる。

## 文章品質HookとRepository gate

- `UserPromptSubmit` は、セッションごとに開始時の `HEAD`、リポジトリルートの識別ハッシュ、および開始時点で HEAD と差分のある Markdown のワークツリーマニフェストのみを保存する。変更のない追跡対象（clean な tracked）Markdown については、変更発生時にセッション開始時 HEAD の blob からベースラインを取得する。
- ベースラインには、Markdown の本文、プロンプト全文、生のマッチ文字列（raw match）、フックのペイロード、トークン、シークレット、認証情報を一切保存しない。違反情報としては、`rule_id`、正規化済みマッチ文字列の SHA-256 ハッシュ、および件数のみを識別情報（identity）として保持する。
- ファイルの同一性（file identity）は、Git のリネームマッピング、完全一致するコンテンツの SHA-256 ハッシュによる一意な対応、対応付け不能（未解決）の順序で判定する。類似度（similarity）、ファイル名からの推測、編集距離（edit distance）などは使用しない。
- `PostToolUse` は Markdown 変更時の早期フィードバックを担うものであり、障害発生時はフェイルオープン（fail-open）とし、トップレベルに `systemMessage` を含む構造化された標準出力（stdout）で診断情報を返す。exit 0 時に出力される生の標準エラー出力（raw stderr）は、Codex のフック結果診断経路としては扱わない。また、既存のログ記録フックとは責務を分離している。
- `Stop` は、`stop_hook_active=false` の際に新規の違反が存在するか品質チェックが実行不能であれば、構造化された `decision=block` を返す。`true` の場合は診断情報を付与したうえで許可（allow）し、ベースライン状態を削除する。フックのエラー処理契約とリポジトリゲートのエラー処理契約は明確に分離して運用する。
- Issue #135 が main へマージされた現在のブランチでは、`SessionStart` のうち `matcher = "^compact$"` に該当する場合に限り、ルートの `AGENTS.md` 全文を `hookSpecificOutput.additionalContext` へ再注入する。`startup`、`resume`、`clear` では出力を行わず、ルート解決、`AGENTS.md` の読み込み、構造化出力の生成に失敗した場合は、入力本文やパス情報を含めずに `continue=false` および `stopReason` を指定してフェイルクローズする。なお、設定値の `additionalContextLimit = 4096` は CLI における概算のトークンあふれ閾値（approximate token spill threshold）として扱い、標準出力の文字数制限としては扱わない。
- 一般的な日本語向けの本番ルールは、`.textlintrc.json` に設定された 7 個の個別 textlint ルールによって管理されており、既存の markdownlint による構造検査と重複するルールは実装しない。`no-unmatched-pair` は技術文書内のインラインコードなどを誤検知するため採用していない。`.codex/text-quality-rules.json` には、リポジトリ固有のカスタムリテラルルール 4 個を設定値として保持している。

リポジトリレベルの品質ゲート（Repository-level gate）における比較基準は以下のとおりです。

- ローカル環境の `pnpm run lint:text`: `HEAD -> current worktree`。ステージ済み（staged）、未ステージ（unstaged）、未追跡（untracked）の Markdown を対象に含む。
- プルリクエスト（Pull Request）: `origin/${{ github.base_ref }}` とチェックアウト済みワークフローの `HEAD` とのマージベース（merge-base）から `HEAD` までを比較する。PR の生ヘッド（raw PR head）へチェックアウトする方式への変更は行わない。
- push イベント: `github.event.before` を参照し、空またはオールゼロ SHA の場合は `HEAD^` へフォールバックする。
- スケジュール実行（schedule）/ 手動実行（`workflow_dispatch`）: `HEAD^` を基準とする。

すべてのコミット比較において、変更対象パス、ベースライン本文、現在の本文、リネームマッピングの解決には、同一のマージベースツリーを使用する。比較が正常に行えない場合は、違反 0 件として PASS 扱いに倒すのではなく、非 0 の終了コード（エラー）で終了させる。

限定スコープのフック契約テスト（focused Hook contract）は、既存の `tests/contracts/**` を正本とし、以下のコマンドによりオプトイン形式で実行します。

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

## 運用メモ

- ルールを変更した後は、`-PreflightOnly` および `codex execpolicy check` を実行して事前確認を行う。
- 破壊的ルールの追加時は検証を実施し、明示的な保存依頼または完了条件（DoD）がある場合に限って `docs/reports/` に長期保存レポート（durable report）を残す。
- 利用側リポジトリ（consumer repo）では、`bash scripts/verify` を初動の確認コマンドとして使用する。
- 非対話実行を行う場合は `codex-safe` ではなく `codex-task` を使用し、`--run-id` を指定して実行固有の成果物（run-local artifact）として集約する。
