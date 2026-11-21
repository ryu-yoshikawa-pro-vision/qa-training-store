# Run Artifact

## 目的

この文書でいう `Source-of-Truth` は、各契約における正本（信頼できる唯一の情報源）を指します。

Codexハーネス（Codex harness）で生成・参照される成果物（artifact）の責務を明確に分離するための取り決めです。実行された事実、集約マニフェスト、評価・判断、人間向けの要約、低レベルなログを混在させないことを目的としています。

## Progress calculation

- `TASKS.md` の `## Now` および `## Discovered` にあるチェックボックス付きタスクの合計を、基本進捗（Progress）の分母とします。
- `## Blocked` のチェックボックスは基本進捗の分母に含めません。
- 基本表記は `Progress: <NN>% (<done>/<total>)` とします。
- この基本進捗は、最終コミット（final commit）前に完了できる追跡対象タスク（tracked task）の進捗を示します。ファイル変更を伴うタスク（file-changing task）全体の完了条件や、プッシュ後のCI完了判定とは切り離して扱います。
- CI確認結果を進捗へ加算する条件、加算対象外とするタスク種別、およびCI状態の扱いについては、`docs/reference/codex-implementation-harness.md` を正本とします。本ドキュメントではCI加算条件の重複定義を行いません。

## Run Artifact lifecycle

- `runs/<run_id>/` 配下の標準成果物は、一時的な作業ファイルではなく、作業履歴、判断経緯、検証結果、および未完了事項を引き継ぐための正式なリポジトリ成果物です。
- 作業完了後も実行ディレクトリ（Run Directory）を保持し、調査、レビュー、修正、再発防止に活用できるよう蓄積します。
- 同一の会話セッション内で同一タスクを継続する場合は、既存のアクティブなRunを再利用します。`REPORT.md` は追記専用（append-only）で更新し、エージェントが管理する `PLAN.md` や `TASKS.md` などは履歴を損なわない範囲で更新します。実体の `run.json` はマシン管理のライター／コレクター（machine-managed writer / collector）経由でのみ更新します。アクティブなRunが存在する状態で、同一タスクのために別のRun Directoryを作成して作業履歴を分散させてはなりません。
- 同一の会話セッション内であっても、ユーザーが別タスクの開始を明示した場合は、新しいRunを作成できます。
- 会話セッションが変わった場合は、アクティブなRunの引き継ぎが明示されていない限り、新規にRunを作成します。
- 過去の実行ディレクトリや `PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json` は保持し、通常の整理を理由に削除しません。後続の自動cleanup workflowはありません。`.codex/runs/**`もpreserved legacy/historyとして変更しません。
- `runs/` とpreserved legacy/historyの`.codex/runs/`を`.gitignore`に追加してはなりません。新規Run ArtifactはGit管理対象として扱い、追跡対象にする前にsanitizerとcredential/security scanを通します。
- 個別タスクで「コードのみ変更する」「作業用ファイルを追加しない」「不要なドキュメントを削除する」と指示された場合でも、Parentが標準成果物（Run Artifact）を管理します。childはRun Artifactを作成・更新せず、作業結果をParentへ返します。
- Run Artifactの作成を省略する場合は、該当タスクの明示的な要件に従います。strict Runでは直接 `codex` の終了後に既存collectorを `--strict` / `-Strict` 付きで明示実行し、`evaluation.json` と `run.json` を検証・更新します。preserved legacy/historyの`.codex/runs/**`は移動・削除・書換えを行いません。
- Git操作が禁止されている環境であっても、Parentが管理するRun Artifactの作成・更新は通常のファイル編集として実施します。ただし、実体の `run.json` の直接編集や、禁止されているGitの変更操作（mutation）は行いません。

### Canonical Run root and preserved legacy root

- 新規Run Artifactのcanonical rootはリポジトリ直下の`runs/<run_id>/`です。`codex-project.toml`の`default_run_root`は`runs`、`report_policy.run_report`は`runs/<run_id>/REPORT.md`を指します。
- Runの初期化は`scripts/new-run.sh`または`scripts/new-run.ps1`を使います。`scripts/init-project.sh`／`.ps1`は`runs/`と`.gitkeep`を用意し、`new-run`は`runs/<run_id>/`を作成します。いずれも`.codex/runs/**`の内容には触れません。
- `runs/`がsymlink、junction、reparse pointである場合や、正規化された場所がRepository直下の`runs/`でない場合は拒否します。`runs/<run_id>/`と`.codex/runs/<run_id>/`のいずれかに同じIDが既にある場合は、新規作成を拒否します。`--force`は既存Runの上書きを許可しません。
- `.codex/runs/**`はpreserved legacy/historyとして読み取り用に保管します。新しいRunの自動探索、作成、collector更新の対象にはせず、旧Runを明示した更新経路は拒否またはread-onlyとします。IDの曖昧なfallbackを行いません。
- ParentがRun Artifactの作成・更新・保持を管理し、childは独自のRun DirectoryやArtifactを作らず、Parentへ結果を返します。

### Standard and temporary artifacts

標準成果物（Run Artifact）として長期保存する対象は、`PLAN.md`、`TASKS.md`、`REPORT.md`、ワークフローレベルで必要とされる `run.json`／`evaluation.json`、およびユーザーや完了定義（DoD: Definition of Done）が保存を要求した補足資料です。標準成果物は正式なリポジトリ成果物として扱い、通常のクリーンアップや成果物の整理、コード以外のファイル整理のみを理由とした削除は行いません。

以下の項目は、標準成果物に含めない一時生成物です。

- `shims/`、キャッシュ、`node_modules`、ブラウザのバイナリ
- 一時的なPATH設定用ファイル、OSや実行環境固有の絶対パスを含むファイル
- 再生成可能な一時ログ、認証情報（credential）・トークン・機密情報（secret）を含む可能性があるファイル
- 一時的なダウンロード、ビルド、テストの出力

一時ファイルを実行ディレクトリ内に生成した場合は、作業完了前に標準成果物から分離します。生のCLIログ、MCPログ、ADBのlogcatなどは、原則としてGit管理対象外の `.artifacts` 配下に保存し、Run Artifactには必要な要約とリポジトリ相対パス（repo-relative）の参照のみを記録します。

### direct `codex` とmanifest境界

- 通常の軽量／標準的な対話型（interactive）作業では、リポジトリ内から直接 `codex` を起動します。Runの管理には `PLAN.md`、`TASKS.md`、`REPORT.md` を使用します。
- この手順でRunを初期化する際に `scripts/new-run.*` を使用する場合は、`--no-run-manifest` または `-NoRunManifest` を指定して `run.json` を作成しないようにします。直接起動したセッションの実行メタデータを、現行のマニフェスト形式では正確に表現できないためです。
- `codex-project.toml` の `run_manifest = "recommended"` はマニフェスト推奨を示すmetadataであり、直接 `codex` が `run.json` を自動作成する契約ではありません。通常の対話型作業では `--no-run-manifest` / `-NoRunManifest` を指定し、エージェントが実体の `run.json` を直接作成・編集してはなりません。
- strict Runでは直接 `codex` を起動し、終了後に既存collectorを明示実行します。Bashでは `bash scripts/collect-run-artifacts.sh --run-id <run_id> --strict`、PowerShellでは `scripts/collect-run-artifacts.ps1 -RunId <run_id> -Strict` を使います。strict collectionには同じRun IDを持つ有効な `evaluation.json` が必要です。欠落・不正・Run ID不一致の場合、collectorは警告を含む `run.json` を書き込んだ後に非0終了します。`--strict` を付けないlightweight／standard Runではevaluation欠落を許容します。
- `run.json.safety.network` は旧wrapper経路由来のlegacy compatibility fieldです。現在の直接 `codex` 実行ではネットワーク利用を観測せず、新規manifestの既定値や既存値を実行時の事実として解釈してはなりません。collectorは既存値を保持します。実行時の検証結果は根拠とともに `REPORT.md` および `evaluation.json` に記録します。

### Past Run changes

- 過去のRunに属する標準成果物は、事実誤認やフォーマット破損の修正を除き、原則として上書きしません。
- 過去のRunの内容を補完する必要がある場合は、履歴を損なわない追記にとどめ、今回の作業内容は新しいRunへ記録します。
- 標準成果物の削除、移動、置換は、ユーザーが対象パスを明示的に指定した場合にのみ行います。

### Run Artifact Path Sanitization

- Repositoryへ追加するCodex Run Artifactは、作業完了前に`scripts/sanitize-codex-artifacts.mjs --path <path> --write --check`を実行します。PowerShell互換入口として`scripts/sanitize-codex-artifacts.ps1`も利用できます。
- 共通実装はNode.js 24の標準libraryを使います。Run成果物は既知のartifact pathを対象に `Write`→`Check` し、任意directoryを再帰走査しません。
- Huskyは`node scripts/sanitize-codex-artifacts.mjs --staged --check`で、`runs/**`、preserved legacy/historyの`.codex/runs/**`、`.codex/artifacts/**`、`.codex/reports/**`、`.codex/logs/**`のstage 0 blobを検査します。`scripts/security-static-check.ts`もRun Markdown／JSONL／JSONを含むcredential scanを実行します。追跡対象にするRun Artifactはcommit前に両検査を通し、検査はworktreeやindexを自動修正しません。修正後はsanitizeしてstageし直します。
- Staged／committed検査は、Git管理しないruntime pathであるroot `logs/**`、`.artifacts/codex-hooks/**`もpath guardで拒否します。`runs/<run_id>/logs/**`は引き続きRun Artifactとして検査・追跡できます。
- CIは`--committed --check --base-ref <base>`で比較範囲のHEAD blobとGit modeを検査します。symlink／gitlink／unmerged entry／blob取得不能は拒否し、working treeの内容を代替入力として使いません。
- staged stage-0 blobとcommit済みblobの両方で`runs/**`のRun Artifactを検査し、`.codex/runs/**`への既存検査も維持します。`runs/`は`.gitignore`に登録せず、credential/security scanから除外しません。
- Markdownlint、Prettier、full Markdown/text scanでは`runs/**`を歴史Runと同様に対象外とします。この除外はRun sanitizerとcredential/security scanには適用しません。
- Web CIはイベントに対応する比較元（PR base branch、pushの`event.before`、schedule／workflow_dispatchのfirst parent）を実在commit SHAへ解決してからサニタイザーへ渡します。入力不正、commit不存在、またはGit履歴不足は検査失敗として扱います。
- 未サニタイズのローカル絶対パスを含むRun Artifactは完了扱いにしません。Unsanitized local absolute paths prevent Run completion. SanitizationはRun Artifactのcompletion gateです。
- `REPORT.md`のAppend-only契約は、checkpoint単位の意味情報を削除、並べ替え、意味変更せずに保持することを指します。Hook JSONLで取得できるmachine factを`REPORT.md`へ逐次転記しません。
- 既存記録に含まれるローカル絶対Pathを`<REPO_ROOT>`、`<USER_HOME>`等の既定Tokenへ、記録の意味を変えずに置換する場合だけ、Append-only契約の安全性例外として許可します。
- Credential Redactionや汎用的な機密情報マスキングはこの例外に含めません。それらが必要になった場合は、別途契約・実装・テスト・承認を行います。

## Source-of-Truth Rule

```text
Observed facts are generated by 実行記録 / hooks.
Interpretation is generated by the agent.
Both are validated by schema / validator.
```

- 実行事実の正本はmachine-managed collectorが集約するmanifest、Hooks、validation evidenceです。
- 失敗原因の解釈における正本は `evaluation.json` です。
- 汎用的なRun評価を用いる場合、`run.json.primary_failure_category` は `evaluation.json.primary_failure_category` からコピーされる要約フィールド（summary field）です。Agentic QAの評価では `valid_for_scoring` と `invalid_reasons[]` を正本とし、この汎用フィールドへの読み替えは行いません。
- `evaluation.json` が生成される前は、`run.json.primary_failure_category` の値は `null` となります。
- `run.json.evaluation_path` は、評価の正本となる `evaluation.json` を指します。
- `run.json.primary_failure_category` と `evaluation.json.primary_failure_category` の値に不一致がある場合、後続のバリデータ（validator）は警告（warning）または失敗（failure）と判定すべきです。
- `changed_files`、終了コード（exit code）、ログパス（log path）、レポートパス（report path）、実行コマンド（executed commands）を、エージェントが手動で記述してはなりません。
- エージェントは、観測された事実を `run.json`、各種ログ、またはvalidation evidenceから参照して評価します。

## Artifactの責任分担

### 旧Codex task report

- `codex_task_reports` と `artifact_summary.codex_task_report_count` は、既存Run reportの参照・collector互換性のため維持するlegacy fieldです。直接 `codex` ではこれらのtask reportを新規生成しません。

### `run.json`

- Run全体の集約マニフェスト（aggregate manifest）です。
- 実体の `runs/<run_id>/run.json` は常にマシン管理（machine-managed）です。エージェントは通常のワークフローはもちろん、マニフェストライター／コレクターの実装タスクであっても直接作成・直接編集を行ってはならず、一時的なテスト用フィクスチャ（temporary test fixture）のみを例外とします。
- 通常ワークフローにおける新規マニフェスト作成は `scripts/new-run.ps1|sh`、既存マニフェストのmachine-managed更新はRun終了後に `scripts/collect-run-artifacts.*` を明示実行する経路とします。
- `codex_task_reports` は既存task report pathを参照できます。
- 新規マニフェストはスキーマv2に準拠し、タスク種別（task type）、ワークフローレベル（workflow level）、変更ファイル一覧（changed files）、検証サマリー（validation summary）、`safety.network` / `safety.scope_violation`、評価パス（evaluation path）を保持します。新規Runは `preset` を出力しません。既存manifestに `preset` がある場合は、旧wrapperの選択値を示すlegacy compatibility metadataとしてcollectorが保持します。直接 `codex` のactive policyを示す値ではありません。
- v2の `artifact_summary` は、legacy compatibility field `codex_task_report_count` と `evaluation_present` を保持します。直接 `codex` のRunでは新しいtask reportを作成せず、collectorが既存reportを見つけない場合はcountは0です。
- v2では、`agents_used`、`hook_observations`、`subagents`、および旧observerに由来する専用の安全フィールドは生成しません。
- Hookの低レベルな事実はRunへ自動集約せず、セッション単位の `logs/hooks-<safe-session-id>.jsonl` を参照します。
- 既存のv1マニフェストを明示的に処理する場合にのみ、既存のレガシーフィールドの値を保持します。v1からv2への自動移行（migration）や、過去のJSONに対する再走査・再集約は行いません。
- 旧task report pathを置き換えるものではありません。
- `validation.commands` は単一コマンド（single command）を前提とせず、出力スキーマ検証（`output schema validation`）、検証（`verify`）、評価結果検証（`evaluation validation`）、未コミット変更チェック（`clean git check`）など、複数の観測結果を保持できます。
- `run.json.evaluation_path` は、`evaluation.json` への要約リンク（summary link）です。
- `run.json.primary_failure_category` は、有効（valid）な `evaluation.json.primary_failure_category` からのみコピーされる要約フィールドです。
- `scripts/collect-run-artifacts.sh` および `scripts/collect-run-artifacts.ps1` は、ディスク上の成果物を再走査し、`run.json` のサマリーを再集約できます。

### `evaluation.json`

- エージェントまたはレビュー担当者（reviewer）による成果評価、失敗原因の解釈、および改善提案に関する正本です。
- 観測された事実は、`run.json`、各種ログ、またはvalidation evidenceから参照します。
- エージェントが終了コードや変更ファイル一覧などの実行事実を事後的に書き込む場所ではありません。
- ランナー側で評価結果（evaluation result）を自動判断することはありません。
- ランナーが実施するのは、`evaluation.json` のテンプレート作成、存在確認、JSON／スキーマ検証、`run_id` の一致確認、およびマニフェストのサマリーフィールド更新のみです。
- `evidence` 文字列は必須（required）の仕様を維持しつつ、必要に応じて `evidence_refs` を用いて `run.json`、レポート、Hook JSONL、検証コマンドなどへの構造化参照（structured reference）を追加できます。
- Strict Codex Runにおける汎用的な `evaluation.json` は、既存ツールの仕様に従い `runs/<run_id>/evaluation.json` に保存します。`run.json.evaluation_path` はこの相対パスを指し、`artifact_summary.evaluation_present` はその実体の存在有無を示します。また、`primary_failure_category` は汎用評価の値からのみ転記され、未実施の評価をこのフィールドへ手動で書き込んではなりません。
- Agentic QAのスコア対象評価（Scored evaluation）は別個の規約として扱い、同一の公式実行ルート（Official Run Root）配下の `.artifacts/agentic-qa/<run_id>/evaluation/evaluation.json` にCanonical JSON形式で保存します。これは `scripts/agentic-qa/contracts.ts` に定義された `valid_for_scoring` および `invalid_reasons[]` を正本とし、汎用Codex Runの `primary_failure_category` への読み替えは行いません。

### Agentic QA evaluation boundary

- Agentic QAにおける `evaluation.json` は、`scripts/agentic-qa/contracts.ts` のJSON＋Zodスキーマ定義に従って検証します。Agentic形式の評価データは、ベンチマークマニフェスト（benchmark manifest）が存在しない場合であっても検証対象から除外しません。
- 規約フィクスチャ（Contract Fixture）は `execution_kind=contract_fixture` として保存可能な診断用成果物ですが、必ず `fixture_not_official` を付与し、`valid_for_scoring=false` かつ各指標（Metric）を `null` と設定する必要があります。
- 公式のモデル実行に基づくスコア対象Run（Official model-backed Scored Run）は、パッチ適用済みランタイムでの実測、禁止プローブ検証（Forbidden Probe）、クリーンなランナー実行（Fresh Runner）、必須エビデンスの確保（Required Evidence）、不可分な固定化（Atomic Freeze）、および独立した評価セッション（別Evaluator Session）のすべてが証明された場合にのみ有効となります。未実行の工程を推測で `PASS` や `true` に補完してはなりません。

### Benchmark Manifest

- 公式（Official）v1では、`1 run_id = 1 challenge` の関係を厳格に維持します。ベンチマークマニフェストは、同一の正規実行ルート（Canonical Run Root）にある `trusted/benchmark-manifest.json` のみを正本とし、同一の `run_id` に対して別の課題（Challenge）を暗黙のうちに上書きしてはなりません。

学習者向け安全入力（Learner-safe Input）は、マニフェストのハッシュ一致のみならず、ベンチマークマニフェストから導出された正規の許可リスト（canonical allowlisted）に登録されたファイル／ディレクトリの集合と完全に一致している必要があります。また、分離ランナー環境（Isolated Run Root）においても、固定入力（frozen input）から導出される正規のセットのみを許可します。公式成果物（Official Artifact）および信頼済みエビデンス（Trusted Evidence）のパスは、正規実行ルートから末端ノード（leaf）に至る上位ディレクトリにおいて、シンボリックリンク（symlink）の使用を一切認めません。

### Official Black-box Scored artifact chain

公式v1では、以下の成果物を同一のRun ID配下にCanonical JSON形式で保存します。

```text
.artifacts/agentic-qa/<run_id>/
├─ input/
│  ├─ runner-input.json
│  ├─ learner-safe-input-manifest.json
│  ├─ output-contract.json
│  ├─ scored-skill.md
│  ├─ runbook.md
│  ├─ challenge/challenge.json
│  └─ specification/**
├─ trusted/
│  ├─ benchmark-manifest.json
│  ├─ runner-profile.json
│  ├─ runtime-handoff-receipt.json
│  ├─ prepared-target/target-runtime.json
│  ├─ prepared-target/artifact-manifest.json
│  ├─ initial-state-receipt.json
│  ├─ host-capability-receipt.json
│  ├─ learner-safe-input-artifact-manifest.json
│  ├─ preparation/isolated-run-root-artifact-manifest.json
│  ├─ bootstrap-operations.json
│  ├─ runtime-control-operations.json
│  └─ resource-boundary-probe.json
├─ runner/
│  ├─ runner-session.json
│  ├─ output/qa-findings.json
│  ├─ output/evidence/**
│  ├─ evidence-mapping.json
│  ├─ execution-summary.json
│  ├─ artifact-manifest.json
│  └─ frozen-runner-artifact.json
└─ evaluation/
   ├─ evaluator-session.json
   └─ evaluation.json
```

`canonical-json.ts` は、オブジェクトのキー順序の正規化、UTF-8/LF改行、末尾改行の付与、重複キーの拒否を含む共通シリアライザーです。ランタイムバリアント（Runtime Variant）はベンチマークリビジョンのダイジェスト計算から除外し、`challenge_id + benchmark_revision + runtime_variant_id` で構成される識別子ディメンション（Identity dimension）として扱います。
`host-capability-receipt.json` が存在しない場合、または必須証明（required proof）が `proven` となっていない場合は、他の準備成果物が揃っていたとしても `valid_for_scoring=false` と判定されます。不明（unknown）、未測定（unmeasured）、未実行（not executed）の状態を推測で `PASS` に変換してはなりません。

`trusted/learner-safe-input-artifact-manifest.json` は、マニフェスト自体を除く `input/**` 配下の全ファイルセットおよびバイトハッシュを固定（freeze）し、公式検証ツール（Official verifier）は評価時にも実際のファイルシステムと完全一致していることを検証します。Host Capability Receipt に記録される `learner_safe_input_artifact_sha256` は、このマニフェストの `artifact_sha256` と一致していなければなりません。同様に、`trusted/preparation/isolated-run-root-artifact-manifest.json` はリポジトリ側の事前チェック環境（Repository-side preflight root）の完全なファイルセットを固定します。信頼済みエビデンス参照（trusted evidence_ref）は、現在のRunの `trusted/**` 配下に存在する実際の通常ファイル（regular file）として解決できる場合にのみ、有効な証明として扱います。
公式検証ツールへ渡す成果物パスも正規実行ルート（Canonical Run Root）配下に限定され、必須成果物やエビデンスのシンボリックリンク、実行ルート外への参照、および異なるRunを跨ぐ参照（cross-run参照）は一切受理されません。

## Strict Run evaluation completion

- strict Runではリポジトリrootから直接 `codex` を起動し、タスク評価後にschema-validな `runs/<run_id>/evaluation.json` を保存します。`evaluation.run_id` は選択中のRun IDと一致させます。
- Run終了後、Parentは既存のcollectorを `--strict` / `-Strict` 付きで明示実行します。Bashでは `bash scripts/collect-run-artifacts.sh --run-id <run_id> --strict`、PowerShellでは `scripts/collect-run-artifacts.ps1 -RunId <run_id> -Strict` を使用します。
- strict collectorは `.codex/templates/evaluation.schema.json` と既存 `scripts/validate-output-schema.py` で評価ファイルを検証し、欠落、JSON parse error、非object、Run ID不一致、schema不適合をwarningとして `run.json` に記録します。collectorはマニフェストを書き込んだ後、warningがあれば非0終了します。validatorの診断出力や評価内容はwarningに複写しません。
- `--strict` なしの軽量／標準Runではevaluation欠落を許容します。評価ファイルが存在する場合もRun manifestの更新はcollectorが行い、エージェントが実体の `run.json` を直接作成・編集することはありません。

### `REPORT.md`

- 人間向けの実行サマリー（要約）です。
- 機械的な判定における正本としては扱いません。

### REPORT.md append-only contract

`REPORT.md` の追記専用ルールは、チェックポイント単位の意味情報を削除・並べ替え・改変せず、そのまま保持することを指します。既存の記録に含まれるローカル絶対パスを規定のトークンに置換する安全上の例外規定は、記録の意味内容を変更しない場合に限り適用されます。

### Normal / Gray-box Working Tree Snapshot

- 通常（Normal）およびグレーボックス（Gray-box）モードでは、対象となる現在のRunを確定したうえで `runs/<run_id>/qa-charter.json` の存在を確認します。ファイルが欠落している場合、Parentはユーザー定義スコープ、規定仕様（Normative Specification）、ビジネスルール／受け入れ基準（BR／AC）、リスク項目、プラットフォーム、役割／シード情報、ランタイム機能要件に基づき、スコープを限定したチャーター（bounded Charter）を現在のRun内に作成し、既存のZod／バリデータを用いて検証します。childはRun Artifactを作成・更新せず、結果をParentへ返します。過去Runのチャーターを暗黙的に再利用してはなりません。チャーターには既存の `exploration_budget` スキーマおよび停止条件（Stop Condition）を必ず含めます。
- `working-tree-snapshot-<mode>-before.json` と `working-tree-snapshot-<mode>-after.json` は、同一Runおよび同一モードにおけるソース作業ツリー（Source Working Tree）の状態を、統一されたJSON＋Zod形式で記録します。
- `working-tree-snapshot-<mode>-comparison.json` は、`source_head_changed`、`source_diff`、`additional_source_diff_count`、`passed` の各フィールドを保持します。追加のソース差分（additional_source_diff_count）が0でない限り、QAの指摘事項（QA Findings）を確定することはできません。
- チャーターの作成と検証が完了した後、ランタイムに対する最初の操作（Runtime interaction）を開始する前に事前スナップショット（BEFORE Snapshot）を取得します。ランタイムでのQA実施および指摘候補の抽出が完了した後に事後スナップショット（AFTER Snapshot）を取得し、差分比較結果において `passed: true` かつ `additional_source_diff_count: 0` であることを確認したうえで、最終的なFindingsを確定します。
- `runs/`、preserved legacy/historyの`.codex/runs/`、`.artifacts/`、およびその他のランタイム生成物は、スナップショットのソース差分比較の対象から除外します。なお、スナップショットファイル自体はRun Artifactとして保存します。

### JSONLログ

- ランナー、Codex、およびHookによって出力される低レベルなイベントログです。
- 集計の正本ではなく、主に実行追跡やデバッグを目的として使用されます。
- ロギング用Hookは `.codex/hooks/log_event.mjs` を通じて、書き込み可能な環境ではセッション単位のroot `logs/hooks-<safe-session-id>.jsonl` へ1イベント1行の形式で追記（append）します。Windowsの管理者サンドボックス環境などでroot `logs/` が書き込み不能の場合は、同一のレコードをGit管理対象外の `.artifacts/codex-hooks/hooks-<safe-session-id>.jsonl` へフォールバックして書き込みます。
- `UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop` といった機械的事実（machine fact）を保持します。`SubagentStop` や `Stop` の発生をもって最終的な処理終了を推測することはありません。
- `Stop` および `SubagentStop` Hookはセッション状態の観測用であり、Runマニフェスト更新のトリガーとしては機能しません。
- HookのJSONLログを `run.json` へ新規に集約することはなく、コレクターもHook JSONLやサブエージェント専用JSONの再走査を行いません。
- root `logs/*.jsonl` および `.artifacts/codex-hooks/*.jsonl` はGit管理対象外です。root `logs/` は`.gitignore`で無視し、既定の汎用クリーンアップ対象とします。`.artifacts/codex-hooks/`は`.artifacts/`配下の一時的な生エビデンス（ephemeral raw evidence）として扱い、いずれもRunマニフェストへの自動集約は行われません。

### Subagentの意味情報

- サブエージェント（Subagent）を利用した場合、機械的事実（machine fact）はHook JSONLに記録し、意味的な情報（semantic information）は次のタスク完了時またはRun完了時のチェックポイントにおける `REPORT.md` へ分離して記録します。
- `REPORT.md` に記録する項目は `Delegation`（委譲内容）、`Result`（結果）、`Parent decision`（親エージェントの判断）のみに限定し、エージェントID、タイムスタンプ、トランスクリプトのパス、生のメッセージ全文、全プロンプト、およびTool呼び出しの詳細は転記しません。
- サブエージェント専用の構造化成果物（Structured Artifact）を新規作成することはせず、最終評価は `evaluation.json` を正本として扱います。

### `failure-taxonomy.json`

- 失敗カテゴリの列挙型（failure category enum）に関する正本です。
- エージェントは、この分類体系（taxonomy）に定義されているカテゴリの中から適切なものを選択します。

## Status / Result Enum

```text
run.status:
  pending | running | completed | failed | cancelled

validation.status:
  not_run | passed | failed | skipped | blocked

evaluation.result:
  pass | partial | fail | not_evaluated
```

意味の違い:

- `run.status = completed` は、ランナーが成果物の生成処理までを完了したことを示します。タスク自体の成功を意味するものではありません。
- `run.status = failed` は、ランナー自体が異常終了し、成果物の生成や検証手順が最後まで完了しなかったことを示します。
- `validation.status = failed` は、実行された検証コマンドが失敗したことを示します。必ずしも `evaluation.result = fail` と同義ではありません。
- `validation.status = blocked` は、セキュリティルール、Hook、または実行環境の制約により検証が実行できなかったことを示します。
- `validation.status = skipped` は、明示的な理由に基づいて検証の実行を見送ったことを示します。
- `evaluation.result` は、成果物としてのタスク達成度に対するエージェントまたはレビュー担当者の総合的な判断結果を表します。

例:

```text
run.status = completed
validation.status = failed
evaluation.result = partial
```

これは、「ランナーの処理自体は完了し、検証コマンドは失敗したものの、成果物の一部は有効であり追加修正によって対応可能な状態」を表しています。

## 実務上の注意

- `run.json` は全体の集約マニフェスト（aggregate manifest）であり、個別の 実行レポートを上書きするものではありません。
- `evaluation.json` は実行結果に対する説明責任を担うものであり、実行された事実そのものを再生成・改変する場ではありません。
- JSONLログは、事後的に評価のエビデンスを追跡するための補助情報であり、要約フィールドの正本ではありません。
- HookのJSONLログはセッションスコープの低レベルな観測記録、`REPORT.md` のチェックポイントはAIによる意味的な要約情報、`evaluation.json` は正式な評価・判断結果として、それぞれの責務を明確に分離して運用します。
