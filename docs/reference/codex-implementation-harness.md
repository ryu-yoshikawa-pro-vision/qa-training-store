# Codex実装ハーネス運用ガイド

## 目的

- Codex の実行経路を `manual interactive`（手動対話型）/ `non-interactive task`（非対話タスク型）/ `docker sandbox`（Docker サンドボックス型）に分離し、用途ごとに安全性と再現性を統一する。

## 使い分け

- direct `codex`
  - リポジトリ／ワークスペース内での通常の対話型エントリーポイント。
  - プロジェクトの既定値は `workspace-write` / `approval_policy = "never"` / ネットワークアクセス有効。プロンプト承認要求（`prompt`）は自動で拒否されるため、影響の大きい操作は実行しない。
- `scripts/new-run.ps1|sh`
  - Run ディレクトリ初期化用のヘルパー。
  - `.codex/runs/<run_id>/PLAN.md` / `TASKS.md` / `REPORT.md` / `run.json` を一括作成する。
  - 通常ワークフローにおいて、実体の `.codex/runs/<run_id>/run.json` を生成する正規の経路である。エージェントが実体の `run.json` を直接作成・編集することはない。
  - 既存の Run は上書きせず、`--force` / `-Force` を指定した場合でも未作成の親ディレクトリを補完する動作にとどめる。
- `scripts/codex-safe.ps1|sh`
  - 事前チェック（preflight）や JSONL ログの記録が必要な場合、および direct の `never` ポリシーで拒否される例外操作を明示的に承認するためのラッパー。
  - 事前チェック、危険な引数の拒否、サンドボックスおよび承認ポリシーの固定、JSONL ログ機能を提供する。
  - `safe` プリセットは workspace-write / on-request / ネットワーク無効（network false）を明示する。ローカルブランチの削除やマージ／リベースのリカバリは、ネットワーク権限の昇格なしで承認できる。ネットワークを伴う例外操作は、承認とネットワーク昇格のランタイム検証に成功した場合に限り使用する。
  - アクティブな Run に紐づく対話実行では、現在の `RunId` を `-RunId`／`--run-id` で必ず指定する。指定を省略できるのはアクティブな Run に紐づかないアドホックな実行に限られ、その場合はマニフェスト同期を行わない。
  - RunId 指定時は、ログ生成前に既存の Run ディレクトリの存在を確認し、存在しない RunId では Codex を起動しない。既存の `run.json` がある場合に限り、Codex 終了後に絶対パスでコレクターを1度実行してマニフェストを同期する。マニフェストを持たない Run（manifest-less Run）は実行されるが、マニフェストの生成は行わない。
  - `--no-log`／`-NoLog` はログ記録のみを無効化し、マニフェスト同期は無効化しない。Codex の終了や `Stop` フックのみを根拠に `status=completed` へ変更してはならない。
- `.codex/config.toml` / `.codex/hooks/log_event.mjs`
  - `UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop` を同一の Node ロガーへ接続する。
  - ロギングフックはマッチャーなし、タイムアウト10秒、リポジトリルート基準で起動し、セッション単位の `.codex/logs/hooks-<safe-session-id>.jsonl` へ保存する。10秒という設定値は、基準値5秒の2倍にあたる有界なバッファ（bounded headroom）であり、タイムアウトの無制限化を意味しない。
  - 既存の安全性確保用 `PreToolUse` および Bash マッチャーは、独立したブロック経路として維持する。
- プロジェクトローカルのフックを追加・変更した場合は、対話型／非対話型の実行経路にかかわらず、同一の `CODEX_HOME` で [codex-safety-harness.md](codex-safety-harness.md) のフック信頼（Hook trust）手順を確認してから使用する。フック信頼の定義元、`/hooks`、再レビュー、ランタイム境界などの詳細は同文書へ集約し、本書では重複して記載しない。
- `scripts/codex-task.ps1|sh`
  - 非対話の `codex exec` 用ラッパー。
  - 実行順序は `preflight -> codex exec -> output/schema check -> verify -> report`。
  - 最終メッセージ出力（`output-last-message`）と機械可読なレポート JSON（machine-readable report JSON）を必ず残す。
  - `--run-id` 指定時は、`.codex/runs/<run_id>/artifacts|reports|logs` に既定の出力を集約する。
- `scripts/codex-sandbox.ps1|sh`
  - `codex-task --runtime docker-sandbox` の軽量な互換ラッパー。
  - Docker イメージと認証が明示的に設定されている場合にのみ使用する実験的パス。

## ワークフローレベルの使い分け

| ワークフローレベル | PLAN | TASKS | REPORT | run.json | evaluation | scope 指定 | 想定用途 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lightweight` | 任意 | 簡易で可 | 最終 1 ブロックで可 | 任意 | 不要 | 任意 | 誤字修正、小規模なドキュメント修正、軽微な設定修正 |
| `standard` | 必須 | 必須 | 必須 | 推奨 | 任意 | 推奨 | 通常の実装、複数ファイルにまたがる変更 |
| `strict` | 必須 | 必須 | 必須 | 必須 | 必須 | 必須 | 安全性・移行・公開契約に関わる変更 |

- `lightweight` は制限なしのモードではない。
- 外部通信、削除、リネーム、移行、権限変更、セキュリティへの影響、公開インターフェースや契約（公開 contract）の変更を含む場合は、`standard` 以上へ引き上げる。
- `standard` / `strict` では、`scripts/new-run.sh` または `scripts/new-run.ps1` を優先して Run を初期化する。
- direct `codex` を通常の対話型エントリーとする lightweight／standard Run では、`new-run` 実行時に `--no-run-manifest`／`-NoRunManifest` を指定する。`PLAN.md`、`TASKS.md`、`REPORT.md` は残すが、direct セッション用のマニフェストは追加しない。
- `run_manifest = "recommended"` は機械管理の標準経路として維持する。strict Run では既存のライター／コレクターを使用し、Run マニフェストと評価結果（evaluation）の出力を必須とする。
- `lightweight` レベルであっても Run 成果物（Run Artifact）を残す。
- `lightweight` における `PLAN.md`／`TASKS.md`／`REPORT.md` などのエージェント管理成果物（Agent-managed Artifact）は、必要に応じて手動作成してよい。
- `new-run` を使わずに手動で初期化する場合は、該当するワークフローレベルで作成すべきエージェント管理成果物に対応した既存テンプレートを元に作成する。
  - `.codex/templates/PLAN.md`
  - `.codex/templates/TASKS.md`
  - `.codex/templates/REPORT.md`
- 実体の `run.json` は機械管理（machine-managed）であり、エージェントが直接作成・直接編集することはない。判断に迷う場合は `new-run` を使用し、少なくとも1件のエビデンスコマンドを残す。
- ワークフローレベル一覧表の `lightweight` における `run.json` の「任意」は、Run マニフェスト自体が不要となるケースがあることを示すものであり、存在する `run.json` をエージェントが直接作成・編集してよいことを意味しない。

## 検証レベル（tier）

- 利用側リポジトリ（consumer repo）での通常確認:
  - `bash scripts/verify`
  - `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`
- 配布元リポジトリ（source repo）メンテナーによる配布前確認:
  - `bash template/scripts/verify --strict-harness`
  - `powershell -ExecutionPolicy Bypass -File template/scripts/verify.ps1 -StrictHarness`
- `--strict-harness` / `-StrictHarness` はソースリポジトリの構成、仕様・テンプレート・ドキュメント・バージョン・CI に関する規約を前提としているため、利用側リポジトリでは通常の verify を使用する。

## 文章品質ゲートの検証

- `pnpm run lint:text` は `scripts/check-text-quality-changes.mjs --base-ref HEAD --working-tree` を呼び出し、現在のワークツリーを開始時の HEAD と比較する。比較不能な場合は失敗として扱う。
- `pnpm run lint:text:all` は同じチェッカーの `--all` モードを呼び出し、既存の `getWorkingTreeMarkdownPaths()` で列挙された現在の Markdown から、`.codex/runs/`、`docs/plans/`、`docs/reports/`、`docs/history/`、`docs/adr/`、`CHANGELOG.md` を除外した範囲を全件検査する。差分ゲートのフィンガープリント比較とは責務を分離する。
- `scripts/verify` および `scripts/verify.ps1` の `--hook-contracts` / `-HookContracts` は、既存の `tests/contracts/codex-hook-contract.test.ts` と文章品質規約を追加実行するためのオプトインフラグである。通常検証における strict の意味や依存条件を変更するものではない。
- `scripts/lint-text-quality.mjs` は、リポジトリ固有のカスタムリテラル／正規表現と、`.textlintrc.json` に定義された7個の個別 textlint ルールのみを本文へ適用し、Markdown の構造チェックは `lint:markdown` に委ねる。`no-unmatched-pair` は技術文書内のインラインコードなどを誤検知するため採用しない。未確定の禁止語、置換ルール、許可リスト（allowlist）、英語混在判定は追加しない。
- プルリクエストでは、`origin/${{ github.base_ref }}` とワークフローがチェックアウトしたマージ後の `HEAD` との merge-base を比較基準とする。push では `github.event.before`、スケジュール実行および workflow_dispatch では `HEAD^` を使用する。ローカル環境以外では、クリーンチェックアウト時の `HEAD -> worktree` 比較を CI ゲートとして使用しない。
- 変更パス、ベースライン本文、現在の本文、リネームのマッピングは、同一の比較ツリーから取得する。Git のリネームマッピングが存在せず、削除されたパスを現在の Markdown へ完全一致のコンテンツ SHA-256 で一意に対応付けられない場合は、推測を行わずに比較失敗とする。

## ファイル変更を伴うタスクの完了規約

次の規約は、リポジトリのワーキングツリー内のファイルを実際に変更し、Git コミット対象となる差分を生成する実装・変更タスクに適用する。ユーザーがそのタスクにおいて Git 操作を明示的に禁止した場合は、禁止された工程を実行せず、その理由と残作業を報告する。

### 適用対象と除外

- 適用対象は、コード、テスト、設定、ドキュメント、Run 成果物などのリポジトリファイルを変更し、コミット対象の差分を作成する実装・変更タスクである。
- GitHub のメタデータのみの変更（PR や Issue の本文、ラベル、レビューコメント、レビュアー設定など）、レビューのみ、計画作成のみ、調査のみ、質問、状態確認、リポジトリファイルの変更を伴わない分析には、このコミット／push／PR／CI 完了規約を適用しない。
- リポジトリファイルの変更と GitHub メタデータの変更を同時に行う場合は、通常のファイル変更タスクとして扱う。

### コミット・push・PR・CI のライフサイクル

- ローカル検証、追跡対象の Run 成果物の最終コミット前状態への更新・検証、変更スコープの確認を完了した後にコミットする。
- 既存の PR がある場合はその PR を使用する。PR が存在せず、対象の CI が `pull_request` イベントをトリガーとして実行される場合に限り、CI 確認に必要な PR を作成する。CI 確認を目的として `main` ブランチへ直接 push してはならない。
- コミット後は対象ブランチへ通常通り push し、ローカル HEAD、リモート HEAD、および PR の最新 head を確認する。ブランチ、refspec、復旧手順の詳細は `docs/reference/git-branch-safety.md` を参照する。
- 通常の PR で確認すべき必須 CI は `Web CI` と `Mobile App CI` である。`Cross Browser Smoke` はスケジュール実行および `workflow_dispatch` で起動される通常 PR 対象外のワークフローであり、通常 PR の必須 CI には含めない。必須 CI の一覧は本リポジトリ規約を正本とし、ブランチ保護ルール（branch protection）から自動推測してはならない。
- push 後は、push した最新コミットを head とする PR の GitHub Actions を確認する。過去のコミットの結果を最新 head の結果として流用してはならない。
- `Web CI` と `Mobile App CI` がともに `success` となり、必要な CI 結果を PR 本文へ記録した時点をもって、ファイル変更タスクの完了とみなす。`queued`、`in_progress`、未確認、`failure` の状態では完了扱いとしない。
- 必須 CI が failure となった場合は、`docs/reference/repair-loop.md` および `.agents/skills/repair-loop/**` に定める有界な修復ワークフロー（bounded repair workflow）に従い、修正後の新しいコミットと最新の PR head で必須 CI を再確認する。
- push 後は最新の PR head の SHA を指定して `wait_for_required_ci` MCP ツールを1度呼び出し、Codex に返される結果を待機する。
- `wait_for_required_ci` が待機する対象は、厳密な HEAD（exact HEAD）における `Web CI` と `Mobile App CI` である。
- MCP による CI 待機中、エージェントは GitHub の状態に対するポーリングを行ってはならない。
- 待機ツール（waiter）が利用不能な場合は、CI 未確認のブロッカーとして扱い、エージェント側での GitHub 状態ポーリングへフォールバックしてはならない。
- 追跡対象の Run 成果物は、最終コミット前に保存すべき状態まで確定させる。push 後の CI 結果を記録するためだけの目的で `TASKS.md`、`REPORT.md`、`PLAN.md`、`run.json` などを変更・再コミット・再 push してはならない。push 後の CI 結果は、GitHub Actions、PR 本文、およびユーザーへの報告に記録する。

### 進捗率（Progress）との責務分離

- `TASKS.md` のチェックボックスに基づく進捗（Progress）は、`docs/reference/run-artifacts.md` の基本計算に従う追跡タスク（tracked task）の進捗であり、ファイル変更タスク全体の完了判定とは異なる。
- ファイル変更タスクでは、push 後の必須 CI 確認1件を、ユーザー向けの進捗率（Progress）の分母および分子に加算する。分母は `TASKS.md` の `## Now` と `## Discovered` のチェックボックス総数に +1 した値とし、分子は完了チェックボックス数に、条件を満たして完了した必須 CI 確認1件（+1）を加えた値とする。この CI 確認1件は、`TASKS.md` のチェックボックス、マニフェストのフィールド、独自のスキーマには追加しない。
- CI 確認1件の加算は、最新の PR head において `Web CI` と `Mobile App CI` がともに `success` となり、必要な PR 本文の更新まで完了した時点に限られる。CI の success を確認済みであっても、必要な PR 本文の更新前や、`queued` / `in_progress`、未確認、`failure` の間は加算しない。
- レビューのみ、計画作成のみ、調査、質問、状態確認、リポジトリファイルの変更を伴わない分析、GitHub メタデータのみの変更、または Git 操作が禁止されたタスクでは、CI 確認1件を加算しない。これらにはチェックボックスに基づく基本進捗のみを適用する。

## Run の初期化

- 通常の直接対話型エントリー（lightweight／standard）では、マニフェストなしで初期化する。
- Bash:
  - `bash scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`
- PowerShell:
  - `powershell -ExecutionPolicy Bypass -File scripts/new-run.ps1 -TaskType implementation -WorkflowLevel standard -NoRunManifest`
- `--run-id` / `-RunId` を省略した場合は、JST 現在時刻から `YYYYMMDD-HHMMSS-JST` を生成する。
- 生成対象:
  - `.codex/runs/<run_id>/PLAN.md`
  - `.codex/runs/<run_id>/TASKS.md`
  - `.codex/runs/<run_id>/REPORT.md`
  - `.codex/runs/<run_id>/run.json`
- `--no-plan` / `-NoPlan` は `PLAN.md` の生成を省略する。
- `--no-run-manifest` / `-NoRunManifest` は `run.json` の生成を省略する。
- 既存の Run ディレクトリが存在する場合は失敗する。`--force` / `-Force` は親ディレクトリの作成を許可するのみであり、既存の Run を上書きすることはない。

## `codex-task` の主な引数

- `--preset safe|readonly|auto-net`
- `--runtime host|docker-sandbox`
- `--task-type plan|review|implementation|investigation|repair|harness-improvement`
- `--workflow-level lightweight|standard|strict`
- `--prompt-file <path>` または末尾の prompt
- `--output-file <path>`
- `--output-schema <path>`
- `--report-path <path>`
- `--run-id <run_id>`
- `--record-run-manifest`
- `scripts/collect-run-artifacts.ps1|sh`
  - Run ローカルの `codex-task` レポートと評価結果（evaluation）を再走査し、`run.json` の非推奨でないサマリー（非廃止 summary）を更新するヘルパー。
  - フックの JSONL やサブエージェント専用の成果物は再走査・集約しない。
- `--verify-command <cmd>`
- `--allow-search`
- `--skip-preflight`
- `--skip-verify`
- `--allowed-files <path1,path2,...>`
- `--allowed-dirs <dir1,dir2,...>`
- `--allowed-globs <pattern1,pattern2,...>`
- `--expected-changed-files <path1,path2,...>`
- `--expected-missing warn|fail`

### スコープオプションの要点

- `allowed-files` は完全一致パス（exact path）を指定する。
- `allowed-dirs` は指定ディレクトリ配下を許可する。末尾スラッシュの有無は同一として扱う。
- `allowed-globs` は限定的な glob パターンを処理する。使用可能な特殊トークンは `*`、`**`、`?` のみとする。
- スコープオプションを使用する場合は、`--run-id` と `--record-run-manifest` の指定を必須とする。
- `.codex/runs/` 配下の生成成果物（generated artifact）は、ソースコードのスコープ対象から除外する。

### expected missing の要点

- 既定値は `fail`。
- `warn` を指定すると、`expected_changed_files` に挙げたファイルが未変更であっても終了コードは成功（0）のまま維持される。
- 警告は標準出力／標準エラー出力、および `run.json.validation.warnings` に記録する。
- 警告が記録された Run マニフェストは、`validation.status = "passed_with_warnings"` となる。

### `--verify-command` の扱い

- PowerShell ラッパー:
  - 実在する `.ps1` / `.cmd` / `.bat` / `.sh` / 実行ファイルのパスは、拡張子に応じて直接実行する。
  - それ以外は PowerShell コマンドとして実行する。
- Bash ラッパー:
  - `bash -lc "<cmd>"` として実行する。

## 成果物

- 出力ファイル（output file）:
  - `codex exec --output-last-message` の最終出力
  - 既定値: `.codex/artifacts/codex-task-YYYYMMDD-HHMMSS.json`
  - `--run-id` 指定時: `.codex/runs/<run_id>/artifacts/codex-task-YYYYMMDD-HHMMSS.json`
- レポート JSON（report JSON）:
  - 既定値: `.codex/reports/codex-task-YYYYMMDD-HHMMSS.report.json`
  - `--run-id` 指定時: `.codex/runs/<run_id>/reports/codex-task-YYYYMMDD-HHMMSS.report.json`
  - 必須キーは `runtime`, `preset`, `prompt_source`, `output_file`, `output_schema`, `log_path`, `codex_exit_code`, `verify_exit_code`, `status`, `run_id`, `git_branch`, `git_dirty`, `cwd`, `mode`
- JSONL ログ:
  - ラッパー起動、事前チェック、codex exec、スキーマチェック、検証の各イベントを追記する
  - 既定値: `.codex/logs/codex-task-YYYYMMDD-HHMMSS.jsonl`
  - `--run-id` 指定時: `.codex/runs/<run_id>/logs/codex-task-YYYYMMDD-HHMMSS.jsonl`
- Run マニフェスト（run manifest）:
  - `--record-run-manifest` 指定時のみ `.codex/runs/<run_id>/run.json` を更新する
  - 新規マニフェストはスキーマ v2 とし、レポート数、変更ファイル、バリデーション結果、ネットワーク／スコープ設定、評価結果のみをサマリーする
  - フックの JSONL はセッションスコープのまま保持し、`run.json` へ新規集約しない。既存の v1 マニフェストはレガシーフィールドの値のみを保持する
  - 対話型 `codex-safe` 終了時の同期は既存マニフェストのみに限定し、`Stop` / `SubagentStop` フックをトリガーとしない
  - `validation.warnings` に致命的でない警告（non-fatal warning）を記録できる
  - `expected-missing=warn` を使用した場合は `validation.status = "passed_with_warnings"` となる

## `--output-schema` の対応範囲

- リポジトリローカルのバリデーターが対応しているのは、`type`、`enum`、`required`、`properties`、`items`、`additionalProperties`、およびメタデータ系キーのみである。
- `oneOf`、`anyOf`、`allOf`、`const`、`pattern`、`minimum` など、未対応のキーワードを含むスキーマは、`invalid_output` ではなく「unsupported schema keyword」として失敗させる。

## Docker サンドボックス

- 既定では無効。`CODEX_DOCKER_IMAGE` を設定しない限り、`docker-sandbox` ランタイムの実行は失敗する。
- リポジトリルートを `/workspace` にマウントし、必要に応じて `~/.codex` と `OPENAI_API_KEY` をコンテナへ渡す。
- ホスト環境へのフォールバックは行わない。Docker 実行に必要な前提条件が不足している場合は、明示的なエラーを出力して停止する。

## サブエージェントの実装フロー

- 実装前の調査は、`code_researcher` / `implementation_researcher` / `test_investigator` に委譲できる。
- `implementation_worker` は、親エージェントが計画、対象ファイル、変更範囲、禁止事項を確定させた後に限り使用する。
- `implementation_worker` は、小さく限定された実装を行うワークスペース書き込みサブエージェント（workspace-write subagent）であり、親エージェントが指定した対象ファイルのみを最小限の差分で編集する。
- 書き込み権限を持つサブエージェント（writable subagent）は、原則として1タスクにつき1つのみ使用する。
- `implementation_worker` による実装完了後は、親エージェントが diff、仕様上の判断、未検証の項目、検証結果を確認する。
- `implementation_worker` は、ファイルの削除、リネーム、移動、Git 状態の変更（git mutation）、削除やリネームを含むパッチ操作、スコープ外のリファクタリングを行わない。
- サブエージェントの開始・終了に関する機械的事実（machine fact）はフックの JSONL へ記録し、専用の構造化成果物（Structured Artifact）は作成しない。
- サブエージェントを利用した場合は、直後の TASK 完了時または Run 完了チェックポイントの REPORT に、`Delegation`、`Result`、`Parent decision` のみを取りまとめて1度記録する。`SubagentStop` や `Stop` のイベントから最終完了や成功／失敗（success / failure）を推測してはならない。

## 推奨フロー

- Run を初期化する:
  - 直接対話型の lightweight／standard では `new-run --no-run-manifest` または `new-run -NoRunManifest` を使用する
- 通常の対話作業:
  - リポジトリルートから `codex` を実行する
- ローカルでの例外操作／リカバリや、明示的なネットワーク例外操作:
  - ランタイム上で検証が成立した範囲に限り、`codex-safe safe` のオンリクエスト承認経路を使用する
- 成果物をファイルとして残す自動実装や CI 補助:
  - strict Run では `codex-task --run-id <run_id> --record-run-manifest` を使用する
- 外部の隔離環境を明示的に用意できる場合:
  - `codex-sandbox` を使用する

## auto-net プリセット

- `codex-safe` および `codex-task` の既定プリセットは `safe` のままとする。
- `auto-net` は明示的に指定した場合にのみ適用し、direct のプロジェクト既定値へ自動適用することはない。
- `auto-net` はプロジェクトプロファイルに依存せず、`workspace-write` サンドボックス、`approval_policy = "never"`、およびラッパーが明示する `sandbox_workspace_write.network_access=true` を使用する。
- `safe` はネットワーク無効（network false）を明示し、`readonly` は読み取り専用サンドボックス、`safe` はオンリクエスト承認（on-request）、`auto-net` は承認なし（never）を維持する。
- `codex-task` は非対話型ハーネスであるため、safe / readonly / auto-net のいずれであっても Codex CLI には `--ask-for-approval never` を渡す。プリセットはサンドボックス、ネットワークオーバーライド、事前チェックルールの選択に使用する。
- `.codex/rules/*.rules` が実際のランタイムポリシー（actual runtime policy）の正本である。`.codex/rules-auto-net/*.rules` は auto-net ラッパーの事前チェック専用オーバーレイであり、ランタイムでの強制ルール（runtime enforcement）としては扱わない。
- 生の（raw な）`--full-auto`、`danger-full-access`、`--dangerously-bypass-approvals-and-sandbox` は使用しない。
- `codex-task` の事前チェックは指定されたプリセットを `codex-safe` に渡すため、safe と auto-net の期待値は明確に分離される。

## 関連資料

- `docs/reference/codex-safety-harness.md`
- `docs/reference/repository-layout.md`