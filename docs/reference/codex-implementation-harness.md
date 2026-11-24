# Codex実装ハーネス運用ガイド

## 目的

通常の起動方法はLinuxのプロジェクトルートから `codex` を直接実行することです。Codexのproject config/rulesはproject trust条件を満たす場合に読み込まれ、非managed環境ではHook定義もtrustが必要です。`.codex/config.toml`のPreToolUse matcherはBashだけを対象とし、`apply_patch`やMCP toolには適用されません。設定の存在だけでruntime Hookの配信・発火を証明したものとして扱ってはなりません。

## 直接起動とRun管理

- 通常のLinux作業はリポジトリルートから `codex` を起動します。`.codex/config.toml` の `workspace-write`、`approval_policy = "on-request"`、network access、Hooks、agents、共通`.codex/rules/*.rules`を維持します。
- `scripts/new-run.ps1|sh` は `runs/<run_id>/` を初期化し、厳密なmanifest契約が必要な場合はmachine-managed `run.json`も用意します。既存Runは上書きしません。
- strict RunではRunを初期化してから直接 `codex` を起動します。作業後、必要な既存manifest更新のため `scripts/collect-run-artifacts.ps1` または `.sh` を明示実行します。エージェントは実体の `run.json` を直接編集しません。
- Logging Hookは既存Node loggerを使用します。PreToolUseの安全HookとBash matcherは独立して維持します。
- project configと実効runtimeのapproval / sandboxが異なる場合があるため、session内で実効権限を確認します。`on-request`は承認要求経路を提供しますが、`.git`書込みを許可する証明にはなりません。詳細は [`codex-safety-harness.md`](codex-safety-harness.md) と [`git-branch-safety.md`](git-branch-safety.md) を参照します。

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
- `lightweight` における `PLAN.md`／`TASKS.md`／`REPORT.md` などのエージェント管理成果物（Agent-managed Artifact）は、Parentが必要に応じて管理する。childは作成・更新せず、結果をParentへ返す。
- `new-run` を使わずに手動で初期化する場合も、Parentが該当するワークフローレベルで作成すべき成果物に対応した既存テンプレートを元に作成する。
  - `.codex/templates/PLAN.md`
  - `.codex/templates/TASKS.md`
  - `.codex/templates/REPORT.md`
- 実体の `run.json` は機械管理（machine-managed）であり、エージェントが直接作成・直接編集することはない。判断に迷う場合は `new-run` を使用し、少なくとも1件のエビデンスコマンドを残す。
- ワークフローレベル一覧表の `lightweight` における `run.json` の「任意」は、Run マニフェスト自体が不要となるケースがあることを示すものであり、存在する `run.json` をエージェントが直接作成・編集してよいことを意味しない。

## 検証レベル（tier）

- 利用側リポジトリ（consumer repo）での通常確認:
  - 本リポジトリではLinux上の `bash scripts/verify` を通常の確認入口とする。
  - PowerShell版はWindows向け対応として保持し、通常の完了条件には含めない。Windows向け変更は既存のテスト／CI契約で確認する。
- 配布元リポジトリ（source repo）メンテナーによる配布前確認:
  - `bash template/scripts/verify --strict-harness`
  - `powershell -ExecutionPolicy Bypass -File template/scripts/verify.ps1 -StrictHarness`
- `--strict-harness` / `-StrictHarness` はソースリポジトリの構成、仕様・テンプレート・ドキュメント・バージョン・CI に関する規約を前提としているため、利用側リポジトリでは通常の verify を使用する。

## 文章品質ゲートの検証

文章品質の自動検査はCLIとCIで実施し、Codexの `UserPromptSubmit`／`PostToolUse`／`Stop` には品質Hookを登録しません。session baseline stateは作成せず、Stopによる完了ブロックも行いません。

- `pnpm run lint:text` は `scripts/check-text-quality-changes.mjs --base-ref HEAD --working-tree` を呼び出し、現在のワークツリーを開始時の HEAD と比較する。比較不能な場合は失敗として扱う。
- `pnpm run lint:text:all` は同じチェッカーの `--all` モードを呼び出し、既存の `getWorkingTreeMarkdownPaths()` で列挙された現在の Markdown から、`runs/`、preserved legacy/historyの`.codex/runs/`、`docs/plans/`、`docs/reports/`、`docs/history/`、`docs/adr/`、`CHANGELOG.md` を除外した範囲を全件検査する。差分ゲートのフィンガープリント比較とは責務を分離する。
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

- Git mutationはcheckout rootへのliteral anchorを付けた通常Git CLIだけを使う。G10、execpolicy、Codex sandbox、OS/ACL、lock、認証・通信、non-fast-forwardの分類とhandoffは [`git-branch-safety.md`](git-branch-safety.md) に従い、拒否されたGit mutationをAPI、MCP、`gh api`、Git library、`.git`編集、別scriptや別agentで代行しない。GitHub read-only APIとユーザーが明示許可したPR/Issue metadata操作は、commit/ref更新と区別する。
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

- 通常の直接対話型エントリー（lightweight／standard）では、`runs/<run_id>/`をマニフェストなしで初期化する。
- Bash:
  - `bash scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`
- PowerShell:
  - `powershell -ExecutionPolicy Bypass -File scripts/new-run.ps1 -TaskType implementation -WorkflowLevel standard -NoRunManifest`
- `--run-id` / `-RunId` を省略した場合は、JST 現在時刻から `YYYYMMDD-HHMMSS-JST` を生成する。
- `--no-run-manifest`／`-NoRunManifest`を指定した通常lightweight／standard経路の生成対象:
  - `runs/<run_id>/PLAN.md`
  - `runs/<run_id>/TASKS.md`
  - `runs/<run_id>/REPORT.md`
- manifestを作成するstrict経路では、上記に加えて`runs/<run_id>/run.json`を生成します。
- `--no-plan` / `-NoPlan` は `PLAN.md` の生成を省略する。
- `--no-run-manifest` / `-NoRunManifest` は `run.json` の生成を省略する。
- 既存の Run ディレクトリが存在する場合は失敗する。`--force` / `-Force` は親ディレクトリの作成を許可するのみであり、既存の Run を上書きすることはない。

## サブエージェントの実装フロー

- コード・依存関係の調査は`code_researcher`、実装前の変更箇所・方針の調査は`implementation_researcher`、テスト・CI・回帰リスクの調査は`test_investigator`に原則として委譲する。互いに独立した読み取り専用調査は必要に応じて並列に起動する。
- Parentは調査結果を踏まえて要件、実装方針、委任先、対象ファイル、変更範囲、禁止操作、必要な検証を決定する。調査・実装・検証コマンドの実行を直接代行せず、結果の採否、差分確認、失敗原因の解釈、次の指示を担う。
- 実装は`implementation_worker`、Parentが確定した検証コマンドの実行は`quality_gate_runner`に原則として委譲する。複数の実装範囲は独立性を確認して分割し、書き込み担当は原則直列で実行する。childは独自の変更範囲・検証項目を追加しない。
- 予定した委任ができない場合（custom agentの検出失敗、起動失敗、必要な権限・作業範囲の不足など）は未完了と理由を記録し、親による直接実行を代替経路にしない。修正指示が必要な場合はParentへ判断を戻す。
- ParentのRun Artifact所有、Git mutation、PR/CIライフサイクル、委任結果の最終確認と完了承認は既存契約に従う。これらの管理上の責務は実装・調査・検証のchildへの委任とは区別する。
- childの既定モデルは`.codex/config.toml`の`agents.default_subagent_model = "gpt-6-luna"`、推論強度は`max`とする。親のモデルはCodexセッションで選択し、childの既定値で親を固定しない。現行モデルカタログではGPT-6 LunaはMulti-agent v2を使用するため、v2の強制有効化設定は追加しない。
- `agents.max_threads = 4`は現行Codexのv2設定解決で親を含む5スレッドに換算される。既存の同時実行数を変更しない。`agents.max_depth = 1`はv1専用であり、v2で孫エージェントを禁止する強制機構ではない。childの追加subagent禁止は各Roleの指示で規定し、実際の委任を確認する。
- 現行CodexのRole適用は`.codex/agents/*.toml`の`developer_instructions`を反映するが、`sandbox_mode`を子ごとの実効権限として適用するとは限らない。「read-only」調査担当の無編集はRole指示による制約であり、設定値の静的確認だけで権限制御が実証されたと判断しない。実効sandboxと変更差分はCodexのNative実行記録で確認する。確認できない場合は未検証と報告する。

- `implementation_worker` は、親エージェントが計画、対象ファイル、変更範囲、禁止事項を確定させた後に限り使用する。
- `implementation_worker` は、小さく限定された実装を行うワークスペース書き込みサブエージェント（workspace-write subagent）であり、親エージェントが指定した対象ファイルのみを最小限の差分で編集する。
- 書き込み権限を持つサブエージェント（writable subagent）は、原則として1タスクにつき1つのみ使用する。
- `implementation_worker` による実装完了後は、親エージェントが diff、仕様上の判断、未検証の項目、検証結果を確認する。
- `implementation_worker` は、ファイルの削除、リネーム、移動、Git 状態の変更（git mutation）、削除やリネームを含むパッチ操作、スコープ外のリファクタリングを行わない。
- サブエージェントの開始・終了に関する機械的事実（machine fact）はフックの JSONL へ記録し、専用の構造化成果物（Structured Artifact）は作成しない。
- サブエージェントを利用した場合は、直後の TASK 完了時または Run 完了チェックポイントの REPORT に、`Delegation`、`Result`、`Parent decision` のみを取りまとめて1度記録する。`SubagentStop` や `Stop` のイベントから最終完了や成功／失敗（success / failure）を推測してはならない。

### サブエージェントの待機

- Parentは子の起動後、他の子の結果統合や重複しない判断業務を進められる。待機中の状態確認を目的として`wait_agent`、`list_agents`、`sleep`等を短時間で繰り返してはならない。
- GPT-6 Lunaを使うMulti-agent v2では、`wait_agent`の既定待機を10分（`default_wait_timeout_ms = 600000`）、下限を5分（`min_wait_timeout_ms = 300000`）とする。明示的な待機時間も原則10分単位とし、短時間の状態確認を繰り返さない。v2の実行可否は使用CLIとモデルカタログに依存するため、Native実行記録で確認する。別モデルによりv1を使用する場合は、対応する`wait_agent`へ長い待機時間を明示する。
- 待機呼び出しがタイムアウトしても、それはParentの合流待機が終了したことだけを意味する。子の実行失敗、プロセスのタイムアウト、子の終了を意味しない。待機タイムアウトのみを理由に`close_agent`、`interrupt_agent`、子の再起動、同じ質問の再送を行わない。引き続き必要なら長い待機を行い、短い再試行を連続させない。
- 子から完了・失敗・判断依頼が届いた場合、ユーザーから新しい指示を受けた場合、または安全上の重大な異常が確認された場合は、待機時間の経過を待たずに対処する。子が実行するテスト・ビルドなどのコマンド単位のタイムアウトは子が管理し、Parentの`wait_agent`タイムアウトと区別する。
- 対象のCodex CLIで指定した待機時間が利用できない場合は、そのランタイムが認める最長の待機を使用し、不要な追加ポーリングはしない。`wait_agent`自体が利用できない場合は、短い`sleep`やstatus確認の反復で代替せず、未完了として理由を報告する。
- この規則は子の完了待機を対象とする。GitHub ActionsのCI待機は上記の`wait_for_required_ci`契約を使用し、Agent側からGitHub状態をポーリングしない。

### childが実行できない操作

- `implementation_worker`は従来どおり削除・rename・移動・Git mutationを実行しない。必要な変更がこの制約に抵触する場合、Parentは削除対象、理由、影響、既存の安全性規約で必要な承認、代替手段を評価する。
- 権限・操作経路が確定するまでは該当変更を停止し、親自身によるコード編集や通常のworkerへの禁止操作の指示で回避しない。ユーザーによる明示的な操作承認が必要な場合は、承認なしで進めない。既存の安全性規約を緩める変更が必要なら別途L3承認とrollback planを得る。
- 現行の委任Roleには削除・rename・移動の実行担当がない。安全性規約で承認を得た場合でも自動的にworkerやParentの実装権限を拡大しない。対象パスと影響、実行主体、具体的な実行経路を個別に確定してから当該操作だけを再開する。未確定なら未完了として報告する。

## 推奨フロー

- `scripts/new-run.*` で必要なRunを初期化する。
- Linuxのプロジェクトルートから直接 `codex` を起動する。
- strict Runでは作業後に既存 `scripts/collect-run-artifacts.*` を明示実行し、machine-managed manifestを更新する。
- Run成果物は保持し、Git管理対象にする前にsanitizerとcredential/security scanを実施する。

## 関連資料

- `docs/reference/codex-safety-harness.md`
- `docs/reference/repository-layout.md`
