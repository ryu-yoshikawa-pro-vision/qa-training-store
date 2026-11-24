# Codex安全ハーネス運用ガイド

## 目的

- リポジトリ内で Codex を使用するにあたり、危険な実行オプションやコマンドの実行を抑制するための実用的なガードレールを提供する。
- `AGENTS.md` の定めに加え、Codex project config、Hook、execpolicyルールによる独立した制御レイヤーを説明する。

## 構成

- `.codex/config.toml`: Codex project config。`workspace-write`、`approval_policy = "on-request"`、network setting、Hooks、agentsを保持します。
- `.codex/hooks/pre_tool_use_policy.mjs`: 共通PreToolUse command guard。設定matcherはBashのみで、`apply_patch`とMCP toolは対象外です。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`: Windows native transport launcher。
- `.codex/rules/*.rules`: 共通execpolicy rules。読み取り系allow、影響の大きい操作へのprompt、破壊的操作のforbiddenを定義します。
- `.codex/agents/*.toml`: project-scoped custom agentsと権限境界。
- `scripts/verify`: Linux通常verifyとsource template strict-harness検査。
- `scripts/new-run.*` / `scripts/collect-run-artifacts.*`: Run初期化とmachine-managed manifest更新。
- Run Artifactは保持し、sanitizerとcredential/security scanを経て追跡します。

project config/rulesはCodexのproject trust条件を満たす場合に読み込まれます。非managed環境ではHook定義もtrustが必要です。設定や静的execpolicy診断だけではruntime Hookの配信・発火を証明できません。

## 推奨起動方法

通常の起動方法はLinuxのプロジェクトルートから直接 `codex` を実行することです。project config/rulesはCodexのproject trust条件を満たす場合に読み込まれ、非managed環境ではHook定義もtrustが必要です。設定済みPreToolUse matcherはBashだけを対象とし、`apply_patch`やMCP toolには適用されません。設定があることだけをruntimeでのHook発火の証拠として扱ってはなりません。

`.codex/config.toml` の `workspace-write`、`approval_policy = "on-request"`、network setting、Hooks、agentsを維持します。共通のexecpolicyルールは `.codex/rules/*.rules` にあります。`codex execpolicy check` はルール診断であり、Hookのruntime発火確認ではありません。

## Direct Codexの制約

このリポジトリにはCLI引数を書き換えたり拒否したりする起動ラッパーはありません。project configは `approval_policy = "on-request"` ですが、実効runtimeはCLI optionやmanaged policy等で異なる場合があるため、起動後に確認します。実効policyが `on-request` なら該当操作の承認要求経路を利用できますが、`.git`書込みの許可を意味しません。実効policyが `never` の場合は通常の承認要求が出ず、auto-reviewにも届きません。Codex CLIでは、CLI version、runtime、managed policyが許す場合に限り、`--ask-for-approval on-request` または `--approve-for-me` をone-shot起動optionの候補にできます。optionの受理、実効設定、個別操作の承認 / review結果をruntimeで確認してください。sandbox、execpolicy、G10、OS権限等の拒否境界は維持されます。bypass flagでこれらを無効化せず、永続設定の変更にはrepository ownerの明示承認を得てください。Git拒否後の復旧・handoffの詳細は[Git safety reference](git-branch-safety.md)を参照してください。

## 削除禁止

- プロジェクト配下のファイルの読み取りや新規作成・編集は、通常の作業であれば承認なしで行って差し支えない。
- シェル、PowerShell、Git コマンドによるファイルの削除は禁止する。対象の例として、`rm`、`del`、`erase`、`Remove-Item`、`rmdir`、`unlink`、および通常の `git rm` が挙げられる。
- `implementation_worker` も同様に、削除、名前変更、移動、Git の変更操作、削除や名前変更を伴うパッチ操作を行わない。
- 追跡対象となっている実行時成果物を配布対象から除外する移行作業（migration）に限り、明示された対象に対して `git rm --cached -- <path>` を使用してよい。その場合でも、物理ファイル自体の削除は行わない。

## apply_patch operationの方針

`apply_patch` によるパッチ操作は、通常のファイル編集であれば使用してよい。ただし、削除（delete）、名前変更（rename）、移動（move）は意図が不透明になりやすく影響範囲も大きいため、通常の編集とは区別して扱う。

| 操作 | read-only agent | direct `codex` |
| --- | --- | --- |
| 既存ファイルの内容変更 | 不可 | 依頼範囲内で可 |
| 新規ファイル作成 | 不可 | 依頼範囲内で可 |
| ファイル削除 | 不可 | 実行しない。必要性がある場合は停止し、承認された実行主体と経路が明示的に確定するまで保留 |
| rename / move | 不可 | 実行しない。必要性・影響・migration理由と承認済み実行経路が明示的に確定するまで保留 |
| Run Artifact作成・更新 | 不可 | Parentが管理 |

判断に迷う場合は、削除・名前変更・移動を実行せず、`REPORT.md` に削除候補または移動候補として記録にとどめる。

## Hook guard

- Full Access 共通ポリシーの正本は `.codex/hooks/pre_tool_use_policy.mjs` のみである。Hookは `PreToolUse` の `^Bash$` matcherで起動し、`tool_input.command` のみを受け取ってポリシーマトリクス（Section 3 Matrix）相当の G1〜G10 および N1〜N4 を判定する。他のtoolには適用されない。
- Windows ネイティブ環境では、`command_windows` から `.codex/hooks/pre_tool_use_policy_windows.ps1` を経由して Node プロセスへ標準入力（stdin）を転送する。リポジトリルートは、ルート直下およびネストされた作業ディレクトリ（cwd）のいずれからでも解決できるようにする。
- 不正な形式（malformed）やスキーマ違反の入力に対しては、標準出力（stdout）を空、標準エラー出力（stderr）を非空としたうえで終了コード 2（exit 2）により安全側に倒して拒否（fail-close）する。拒否（deny）時は `hookSpecificOutput.permissionDecision = "deny"` を含む構造化データを出力し、安全（safe）と判定された場合は終了コード 0（exit 0）かつ出力なしとする。
- Git 操作については、既存のシェル境界内にある個々の Git 呼び出し（invocation）を個別に共通解析し、`git -C <path> <subcommand> ...` のような形式であっても通常形式と同様に G1〜G10 および N1〜N4 のポリシーを適用する。呼び出しの中に 1 つでも DENY（拒否）対象が含まれている場合は、コマンド全体を DENY とする。
- 複数の `-C <path>` が指定された場合は出現順に累積適用し、後続のパスは直前の有効な作業ディレクトリ（effective cwd）を基準として解決する。コンテキスト未指定時における保護対象ブランチ（protected branch）の判定は、各呼び出しが選択した有効なリポジトリ（effective repository）を対象とする。同一のサブコマンドが複数含まれるコマンドであっても、すべての呼び出しを漏れなく評価する。
- `--git-dir`、`--git-dir=<path>`、`--work-tree`、`--work-tree=<path>` は、リポジトリの参照先を変更するグローバルオプション（repository-changing global option）として区別して扱う。完全な Git CLI パーサーまでは実装せず、commit、merge、cherry-pick、revert、pull、am、push などのコンテキストに依存する変更操作（context-sensitive mutation）では安全側に倒して拒否（fail-close）する一方、読み取り専用の操作（read-only operation）を一律で拒否（blanket deny）することはない。解析不能な Git 呼び出しについては、曖昧なコンテキストのまま ALLOW（許可）することはしない。
- `^Bash$` Hookが受け取るcommand内の `git` と `git.exe` は同一の Git 実行ファイルとして扱う。サブコマンド以降はクォートを考慮した引数トークン（quote-aware argument token）として評価し、クォートで囲まれた `--force`、`--amend`、`-fd`、`-D`、`HEAD:main` なども、通常の危険なオプションと同様に判定する。
- push 操作は、明示的かつ一意な単一の refspec を指定した場合のみ ALLOW の候補とし、保護対象の宛先（protected destination）、強制実行や削除（force / delete）、`--all` / `--branches`、マッチング push、ワイルドカード、複数 refspec、リモートや URL・パスのみを指定した暗黙的な push、実行時設定や環境変数によって宛先が変わり得る push などは、すべてフェイルクローズ（fail-close）する。通常の `git fetch` もHook所有checkoutのcanonical root anchorを伴う場合に限りALLOW候補とし、保護対象のローカル ref を宛先とするfetch、`update-ref`、および `worktree add -B` による保護ブランチの変更は DENY とする。
- `-c`、`--config`、`--config-env` や、inline / inherited `GIT_*`環境変数（`GIT_OPTIONAL_LOCKS`、`GIT_PAGER`、`GIT_TERMINAL_PROMPT`を除く）による実行時セマンティクスの変更は、コンテキスト依存の変更操作でフェイルクローズする。Hookは既知のshell wrapper内のGit呼出しも検査する。対応形式、任意script・間接実行に対する制約、`.git`ディレクトリの直接書換えを検査しない境界は [`git-branch-safety.md`](git-branch-safety.md) を参照する。完全なshell / Git parser、alias展開、PowerShellの状態追跡は実装していない。
- シェルコマンドの前半に `git switch` やブランチ切り替え形式の `git checkout`、`cd` / `chdir` / `pushd` / `Set-Location` / `sl`、永続的な Git 環境変数の変更があり、その後にコンテキスト依存の Git 変更操作が続く場合は、実行時コンテキストのシミュレーションは行わず、コマンド全体をフェイルクローズする。単独のブランチ切り替え、カレントディレクトリ変更後の読み取り専用 Git 操作、`git config --get` / `--list` などの読み取り専用の設定参照操作はそのまま許可を維持する。
- Hookは既知のshell wrapper内のGit呼出しも共通policyへ渡す。対応するwrapper形式と、任意script / 間接実行を包括的に検査しない制約は [`git-branch-safety.md`](git-branch-safety.md) を参照する。
- 操作単体で拒否理由が確定する G1〜G9 などのルールは、リポジトリのブランチコンテキストが未解決であっても既存の判定結果（deny）を返す。`git fetch origin` は、G10のcanonical root anchorを満たし、保護対象のローカルrefを更新しないcontext-safeなfetchに限りALLOW候補とする。anchorを付けない状態変更fetchはG10で拒否する。ブランチコンテキストの解決が必要な変更操作は、コンテキスト未解決時にG10としてフェイルクローズする。
- コンテキスト未解決による G10 の判定は一旦保留して後続の Git 呼び出しも評価し、後続に具体的な拒否理由がある場合はそちらを優先する。すべての呼び出しに具体的な拒否理由がない場合に限り、保留していた G10 を返す。
- `update-ref -m <reason>` のオプション値、`fetch` や `pull` の `--refmap` / `--stdin`、保護対象ローカル ref の宛先、状態を変更する `git config`、保護ブランチに対する `branch -d` / `--delete` / `-m` / `--move` のターゲットなどをトークン単位で検査し、対象が不明な場合や未対応の構文（unsupported syntax）である場合は、曖昧なコンテキストのまま ALLOW することはない。Bash の行継続（line continuation）や限定的な引用符なしオプションのエスケープは正規化するが、完全なシェル／Git パーサーの実装までは行わない。
- `.codex/config.toml` では `features.hooks = true` を使用し、非推奨（deprecated）となった `codex_hooks` や過去の PowerShell / Python ポリシーは参照しない。`apply_patch` はマッチャーの対象外であり、共通フック側でその追加・更新・削除・移動（Add / Update / Delete / Move）を検査することはない。

## Git mutationの拒否境界

- G10を含むGit拒否の分類、root anchor、通常CLIでの復旧、lock対応、handoffの正本は [`git-branch-safety.md`](git-branch-safety.md) とする。
- Hookの許可はCodex sandbox、execpolicy、OS/ACL権限を上書きしない。`.git`等のmetadata更新がsandboxやOS権限で拒否された場合も、同じGit mutationをREST/GraphQL、GitHub MCP、`gh api`、Git database/API、Git library、`.git`直接編集、別script、別agentで実現しない。
- GitHub read-only APIによる状態確認と、ユーザーが明示的に許可したPR/Issue metadata（本文、label、reviewer等）の管理操作は、commit/object/ref更新と区別して維持する。metadata操作の許可をGit refやcommitの更新へ流用しない。

## Hook trust運用

### project trustとHook definition trust

リポジトリを Codex で信頼済みに設定することと、リポジトリ内の `.codex/config.toml` に定義された個々のプロジェクトローカルフック（project-local Hook）を信頼することは、異なる条件です。プロジェクトローカルフックを実行可能にするには、少なくとも次の両方を満たす必要があります。

- プロジェクトの `.codex/` レイヤーが信頼されていること。
- 実行対象となる非管理フック（非 managed Hook）の現在の定義がレビュー済みであり、信頼されていること。

リポジトリを一度信頼したからといって、その後に新しく追加されたフックや変更されたフックが自動的に実行されるわけではありません。Codex は非管理フックの現在の定義に紐づくハッシュ値によって信頼状態（trust）を管理しており、新規または変更された定義は再レビューの対象となります。未信頼のフックは実行前にスキップされます。

`.codex/config.toml` 内のフック定義に対して、追加、削除、`command` の変更、`command_windows` の変更、マッチャーの変更、タイムアウト値の変更などの変更があった場合は、以前の信頼状態が引き継がれていると判断しないでください。`git pull` やブランチの切り替えによって定義が変更された場合も同様です。現在のフック一覧と定義を `/hooks` で確認し、必要なフックのみを内容確認のうえで再度信頼（trust）してください。

### `/hooks`での確認手順

リポジトリのルートディレクトリで、普段使用している対話型 CLI を起動します。

通常運用ではLinuxのリポジトリルートから直接 `codex` を起動します。

```bash
codex
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

通常のGit更新取得やブランチ切替を行うたびに、無条件で `/hooks` による確認を要求する必要はありません。フック定義に変更が生じた場合に限り、次の手順で再確認を行います。

```text
Git更新取得 / ブランチ切り替え
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

リポジトリ側のHook設定と実行経路をCodexホストから切り離して確認する場合は、次を実行します。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

- `test:hooks` は、PreToolUseの安全性Hook、5イベントのログ記録Hook、文章品質CLIのルール・差分比較を契約テストします。Codexホストは起動しません。
- `diagnose:hooks` は、ルートの `.codex/config.toml`、`[features] hooks = true`、イベント別のHook数・matcher・timeout、PreToolUse／ログHookの実ファイル境界、および `.codex/hooks.json` のオフライン診断範囲を読み取り専用で確認します。Hookは実行しません。
- この診断はproject／Hook trust、managed override、実際のCodexにおけるroot・cwd・config layering、host/session bindingを確認しません。これらは `/hooks` と実ホストで別途確認します。

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

フックが動作しない場合は、まず `/hooks` による確認、プロジェクトおよびフックの信頼状態、`CODEX_HOME` の一致を確認してください。`--dangerously-bypass-hook-trust` を付与して回避することを、通常のトラブルシューティング手順としてはなりません。

### 公式仕様の参照

本節の記述は、2026-09-14 時点で確認された公式仕様を根拠としています。

- [Codex Hooks](https://developers.openai.com/codex/hooks/): プロジェクト `.codex/` レイヤー、フック定義の現在ハッシュ値、`/hooks`、未信頼フックのスキップ、`--dangerously-bypass-hook-trust`。
- [Codex environment variables](https://developers.openai.com/codex/config-file/environment-variables): `CODEX_HOME` の用途および既定値。

## レポートファイルの作成方針

- `docs/reports/` は、長期保存（durable）を目的とした調査・監査・検証結果の保管場所であり、通常のレビュー回答、進捗報告、簡易な確認結果、実行（run）内ログの既定の保存先ではない。
- レポートファイルを生成してよいケースは、ユーザーから保存の明示的な指示があった場合、タスク計画の完了条件（DoD: Definition of Done）にレポートファイルが含まれている場合、または複数情報源の調査・監査・検証結果を将来参照する必要がある場合に限られる。
- レビューのみ（review-only）、計画のみ（plan-only）、状況報告（status update）、簡易な確認、通常の証跡コマンド実行結果、実行進捗の記録、チャット上で完結する評価などでは、`docs/reports/` にファイルを作成しない。
- 判断に迷う場合はレポートファイルを作成せず、チャットでの回答および `runs/<run_id>/REPORT.md` への記録にとどめる。Run ArtifactはParentが管理する。

## 文章品質CLIとRepository gate

- Codexの `UserPromptSubmit`／`PostToolUse`／`Stop` には文章品質Hookを登録しません。セッションごとのbaseline stateも作成しません。Stop時の誤ブロック、state lifecycleの複雑性、Hook実行時負荷をなくすためです。
- 文章品質検査は `pnpm run lint:text`、`pnpm run lint:text:all`、`pnpm run lint:markdown`、および `pnpm run verify` から実行します。ルール、fingerprint、Git rename対応、比較不能時の失敗動作は維持します。
- Git safetyのPreToolUse Hookと5イベントのログ記録Hookは独立して維持します。
- `.textlintrc.json` は一般的な日本語向け7個のtextlint rule、`.codex/text-quality-rules.json` はRepository固有の4個のcustom literal ruleを管理します。Markdown構造検査は既存のmarkdownlintへ委譲します。
- GitHub Actionsの `Text quality change gate`、`Text quality full scan`、`Markdown lint` は継続し、違反・比較不能は従来どおり非0終了で失敗します。

ローカル `lint:text` は `HEAD -> current worktree`（staged、unstaged、untrackedを含む）を比較します。commit／PRのchange gateは、PRではcheckout済みmerge `HEAD` とbase refのmerge-base、pushでは `github.event.before`、schedule／workflow_dispatchでは `HEAD^` を基準とします。変更パス、baseline本文、現在本文、rename mappingには同一の比較treeを使用します。比較不能は違反0件として通過させず、非0終了にします。

限定スコープのHook契約テスト（focused Hook contract）は既存の `tests/contracts/**` を正本とし、次のopt-in入口で実行します。文章品質CLIテストは `test:hooks` と `verify` に含まれますが、セッションHookとしては実行しません。

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

## 運用メモ

- ルールを変更した後は、共通 `.codex/rules/*.rules` を使う `codex execpolicy check` でルールを診断する。この診断はruntime Hookの配信・発火を確認するものではない。
- 破壊的ルールの追加時は検証を実施し、明示的な保存依頼または完了条件（DoD）がある場合に限って `docs/reports/` に長期保存レポート（durable report）を残す。
- 利用側リポジトリ（consumer repo）では、`bash scripts/verify` を初動の確認コマンドとして使用する。
