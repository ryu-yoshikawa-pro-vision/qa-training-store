# MCPでCI待機をAgent外へ委譲する計画

## 0. 依頼概要

- 依頼内容: 実装・push後のCI確認でAgentがGitHub状態を反復確認してトークンを消費する運用をやめ、CI終了時だけ同じAgentへ制御を戻す。
- 背景: 現在のRepository契約では最新PR headの `Web CI` / `Mobile App CI` 成功確認が完了条件に含まれるが、待機方法は「無制限pollingや独自監視scriptを追加しない」とだけ定義されている。
- 期待成果: Codexから1回のMCP tool callを行い、MCP server内部でCIを監視し、成功・失敗・timeout等が確定した時だけtool resultをCodexへ返す。
- 実装範囲: このbranch / PR #182でPlan修正からMCP実装、検証、push後の実地確認まで行う。Plan-only PRにはしない。

## 1. ゴール / 完了条件

### ゴール

- CI待機中にAgent / LLMの追加turnを発生させない。
- Codex threadやprocessを終了して `resume` する方式は使わず、同じturn内の長時間MCP tool callとして待機する。
- latest PR headに対する `Web CI` と `Mobile App CI` だけをRepositoryの完了判定対象とする。
- GitHub状態のpollingはMCP server内部で行い、Agentへ途中結果を返さない。

### 完了条件（DoD）

- `.codex/config.toml` のMCP server登録、tool approval、GitHub credential利用、Harness変更は `AGENTS.md` のL3として扱い、実装開始前にユーザーの明示承認を確認する。rollback planも実装前に確定する。
- project-scoped MCP serverがRepository rootまたはRepository内subdirectoryから起動でき、fresh Codex processの初回tool catalogにCI待機toolが登録される。
- tool catalogへの登録だけでは完了扱いにせず、`scripts/codex-safe.*` のinteractive経路と `scripts/codex-task.*` のnon-interactive `codex exec` 経路の両方から `wait_for_required_ci` を実際に1回callし、tool resultがCodexへ返ることを確認する。
- MCP serverはstdio transportを使い、外部HTTP server、daemon、queue、webhook receiverを追加しない。
- Codex側のMCP tool timeoutがCI待機上限より長く設定され、MCP tool callが待機途中でCodex側timeoutにならない。
- CI待機tool `wait_for_required_ci` は、最低限次を入力に取る。
  - PR番号
  - expected head SHA
- Repository名はmodel入力にせず、MCP server process起動時にローカルGitの `origin` URLから1回だけ導出し、そのprocess lifetime中は同じRepository identityを使用する。Repository固定のためにserver startup中のGitHub API通信は行わない。
- toolは開始時にPRがOPENであり、current head SHAがexpected head SHAと一致することを確認する。
- exact HEADかつ `pull_request` eventの `Web CI` / `Mobile App CI` が両方登録されるまでboundedに待つ。
- 両workflow登録後は対象runだけを監視し、次のいずれかでtool resultを返す。
  - 両方 `success`。
  - どちらかが終端の非success。
  - PR headがexpected head SHAから変わった。
  - registration timeout。
  - overall timeout。
  - GitHub CLI / API error。
- CI待機中にCodex側で `exec_command` / `write_stdin` / GitHub状態確認tool callを反復しない。
- `docs/reference/codex-implementation-harness.md` がMCP toolをCI待機の正本経路として説明する。
- `scripts/verify` と `scripts/verify.ps1` が新しい契約へ同期し、Bash / PowerShellの標準verifyがPASSする。
- PR #182 latest headの実CIでMCP tool callを実行し、CI終了後に同じCodex turnへresultが返ることを確認する。
- PR #182のbodyは実装着手前に最新PlanのMCP方式・対象ファイル・実装gateへ同期し、実装後はtitle / bodyを実装結果へ再同期する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状理解と前提

### Repository

- `AGENTS.md` はfile-changing taskのcommit / push / PR / CI lifecycleの正本を `docs/reference/codex-implementation-harness.md` としている。rootへCI待機詳細を重複させない。
- `docs/reference/codex-implementation-harness.md` は通常PRの必須CIを `Web CI` と `Mobile App CI` と定義している。
- `.github/workflows/ci.yml` のworkflow名は `Web CI`、`.github/workflows/native-ci.yml` のworkflow名は `Mobile App CI`。どちらも `pull_request` eventで起動する。
- `scripts/verify` と `scripts/verify.ps1` は現在のpolling禁止文言をliteralで検証しているため、正本文書だけを変更すると標準verifyが失敗する。
- `.codex/config.toml` はproject-scoped Codex configとして既に使われているが、現在は `[mcp_servers.*]` 定義を持たない。
- `package.json` / `pnpm-lock.yaml` にMCP server SDKは入っていない。
- RepositoryはZod 4.4.3、Node.js / TypeScript系の既存テスト基盤を持ち、GitHub ActionsではNode 24を使用している。

### Codex MCP

- Codexはstdio MCP serverの `command` / `args` / `cwd` を設定できる。
- MCP server単位で `startup_timeout_sec` / `tool_timeout_sec` を設定できる。今回は `startup_timeout_sec = 5`、`tool_timeout_sec = 6000` を明示し、server単位の既定値には依存しない。
- optional MCP serverは初回tool catalog構築時の共有startup graceを超えると、そのturnのtool catalogから外れ得る。project configで `mcp_optional_startup_grace_ms = 5000` を明示し、5秒以内にreadyとなったrepo-local waiterを初回catalogへ含める。
- MCP tool callは通常の `exec_command` live sessionとは別経路であり、tool serverがresultを返すまでMCP callを保持できる設計になっている。
- 今回はこの性質を使い、「1回のtool call → MCP内部で待機 → result返却」を実現する。
- 長時間tool callが現在のinstalled Codex / Windows環境で必要時間保持されることは、実地検証で確認する。upstream実装だけを根拠に完了扱いにしない。

### MCP SDK

- 公式TypeScript SDKのv2 stable lineは `@modelcontextprotocol/server` を提供し、stdio serverをサポートする。
- 公式SDKはStandard Schemaを使い、既存のZod 4をtool schemaに利用できる。
- MCP protocolを独自実装するより、公式SDKを使う方がprotocol互換性・保守性・テスト容易性で適切。
- 実装時に公式stable versionを確認し、Repositoryの既存方針に合わせてexact versionを `devDependencies` へ追加する。

### 前提

- 削減対象はGitHub APIへのpolling回数そのものではなく、CI待機中のモデル推論・Agent turn・tool再呼び出しによるトークン消費である。
- MCP server内部のread-only GitHub pollingは許容する。
- GitHub認証は既存の `gh` CLI認証を使用し、新しいtoken保存・credential管理を追加しない。
- stdio MCP childへはCodexの既定環境に加え、親processに存在する場合だけ `GH_TOKEN` / `GITHUB_TOKEN` をMCP `env_vars` で明示継承する。token値はtracked config、ログ、tool resultへ書かない。
- Repository identityはserver process起動時に `git remote get-url origin` を1回だけ実行してローカルに確定する。`https://github.com/<owner>/<repo>[.git]` と `git@github.com:<owner>/<repo>[.git]` を受理し、`owner/repo` をprocess内へ固定する。以降のtool callでは固定owner / repoをendpointへ明示し、Git remoteを再解決しない。modelから任意Repositoryを指定させない。
- 各 `gh` 子processは30秒でtimeoutし、`GH_PROMPT_DISABLED=1` を設定して非対話実行に固定する。
- `gh api` は全呼び出しで `--method GET` を明示する。`-f` / `-F` query parameterを使う場合もHTTP methodを暗黙値に任せない。
- CI失敗後の原因分類・修正は既存 `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**` を正本とする。

### 対象外

- `codex exec resume`。
- Codex processの終了・再起動を管理するsupervisor。
- GitHub Actions `workflow_run` からAgentを起動する構成。
- webhook受信server、queue、常駐daemon。
- GitHub Actions workflow変更。
- branch protection / ruleset変更。
- CIのcancel / rerun / dispatch等のwrite操作。
- 汎用MCP gateway / MCP manager。
- Product code変更。

## 3. 質問 / 曖昧性

- 実装前の必須確認: `.codex/config.toml` のMCP server登録、tool approval、GitHub credential利用、Harness変更は `AGENTS.md` のL3に該当するため、ユーザーの明示承認を得る。今回のPlan修正依頼だけをL3実装承認とは扱わない。
- 仮定してよい細部:
  - MCP server名、script path、test file名はRepository既存命名に合わせて実装時に確定する。
  - registration poll intervalは10秒、workflow poll intervalは15秒を初期値とする。設定項目化しない。
  - registration timeoutは5分、tool全体のoverall timeoutは90分とする。
  - Codex側 `tool_timeout_sec` は内部overall timeoutより十分長い100分（6000秒）を設定する。
- 実装時に実測する項目:
  - host Nodeが `node --run` を利用できるversionであること。
  - Repository rootとRepository内subdirectoryの両方からproject-scoped `.codex/config.toml` のstdio MCP serverがWindows / host runtimeで起動できること。
  - `mcp_optional_startup_grace_ms = 5000` と `startup_timeout_sec = 5` でfresh Codex processの初回tool catalogに `wait_for_required_ci` が登録されること。
  - `scripts/codex-safe.*` と `scripts/codex-task.*` の両経路で、tool listingではなく実際の `wait_for_required_ci` callが成立し、resultが返ること。non-interactive `codex exec` でtool callがcancel /拒否される場合はblockerとする。
  - 長時間MCP call中にAgentへ途中turnが戻らないこと。
  - MCP result返却後に同じCodex turnが継続すること。
- 未回答の重要質問: L3実装承認は実装開始前に確認する。runtime gateは実測し、`codex-safe` / `codex-task` のどちらか一方でも実tool callが成立しない場合はHarness切替へ進まずblockerとして停止する。

## 4. 影響範囲

### 変更予定

- `.codex/config.toml`
  - repo-local MCP server登録。
  - optional MCP startup grace、server startup timeout、MCP tool timeout設定。
  - `GH_TOKEN` / `GITHUB_TOKEN` の名前だけをMCP childへ継承する設定。
- `package.json`
  - 公式 `@modelcontextprotocol/server` v2 stableをexact versionで `devDependencies` に追加。
  - Repository内subdirectoryからもserverを起動できる `mcp:ci-wait` scriptを追加。
- `pnpm-lock.yaml`
  - dependency追加に同期。
- `scripts/mcp/ci-wait-server.mjs`
  - stdio MCP server。
  - `wait_for_required_ci` tool。
  - GitHub read-only polling。
- `tests/contracts/ci-wait-mcp.test.ts`
  - 入力検証、run選択、状態遷移、timeout、stale head等の回帰テスト。
- `docs/reference/codex-implementation-harness.md`
  - CI待機の正本経路をMCPへ更新。
- `scripts/verify`
- `scripts/verify.ps1`
  - 新しいHarness契約へ同期。
- `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md`
- `.codex/runs/20260924-200458-JST/**`

### read-only確認

- `AGENTS.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `docs/reference/repair-loop.md`

### 変更しないもの

- `scripts/codex-safe.*`
- `scripts/codex-task.*`
- GitHub Actions workflow
- Hook permission / sandbox policy
- Product code

MCP実装のために上記変更不可対象が必要になった場合は、scopeを勝手に広げずblockerとして報告する。

## 5. 変更方針

### Task 0: MCP serverの最小構成を確定する

#### L3 governance gate

- `.codex/config.toml` のMCP server登録、`approval_mode = "approve"`、`GH_TOKEN` / `GITHUB_TOKEN` の環境変数継承、implementation harnessの標準待機経路変更は `AGENTS.md` のL3として扱う。
- 実装開始前にユーザーの明示承認を確認する。承認が確認できない場合は `.codex/config.toml`、dependency、server、Harnessを変更しない。
- rollbackは次に限定する。
  - `.codex/config.toml` から今回追加するMCP server、startup grace、tool approval、`env_vars` 設定だけを戻す。
  - `package.json` の `mcp:ci-wait` とMCP SDK dependency、対応する `pnpm-lock.yaml` 差分を戻す。
  - 今回追加する `scripts/mcp/ci-wait-server.mjs` と専用contract testを戻す。
  - `docs/reference/codex-implementation-harness.md`、`scripts/verify`、`scripts/verify.ps1` を変更前のCI確認契約へ戻す。
  - user-level Codex config、保存済みGitHub credential、PAT / token値は変更・削除しない。

1. installed Codex versionとproject-scoped configの有効性を記録する。
2. 公式 `@modelcontextprotocol/server` v2 stableのcurrent exact version、Node要件、licenseを確認する。
3. `devDependencies` へexact versionを追加し、`pnpm-lock.yaml` を同期する。
4. Repository標準セットアップどおり `pnpm install --frozen-lockfile` を完了してからMCP起動検証へ進む。fresh checkoutでdependency未導入のままMCP server起動成功を要求しない。
5. host Nodeが `node --run` を利用できることを確認し、`package.json` に `mcp:ci-wait` scriptを追加する。Repository root / subdirectoryのどちらからでも上位の `package.json` を解決してserverを起動する経路とする。
6. 公式MCP TypeScript SDK v2の `serveStdio` を使ってstdio MCP serverを追加する。transportを手書き実装しない。
7. serverは1つの目的だけを持ち、最終状態では `wait_for_required_ci` 以外の業務toolを増やさない。
8. MCP stdioのstdoutはprotocol専用とし、診断ログを通常stdoutへ出さない。必要な診断はstderrへ限定する。
9. Repository identity取得は `git remote get-url origin` をNode `child_process.execFile` / `spawn` のargvで1回だけ実行する。GitHub API通信をserver startup条件にしない。
10. GitHub read I/Oはshell文字列連結を使わず、Node `child_process.execFile` / `spawn` のargvで `gh` を呼ぶ。

公式SDKを使えない明確な互換性問題が見つかった場合は、MCP protocolを手書き実装せず停止して報告する。

### Task 1: project-scoped Codex configへMCPを登録する

`.codex/config.toml` にrepo-local serverを登録する。このTaskはTask 0のL3明示承認を確認した後にだけ実施する。

契約:

- transport: stdio。
- server command: `node --run mcp:ci-wait`。MCP `cwd` へuser固有絶対pathを埋め込まず、Nodeのpackage script探索でRepository rootの `package.json` を解決する。
- project-level `mcp_optional_startup_grace_ms = 5000`。
- server-level `startup_timeout_sec = 5`。
- server-level `tool_timeout_sec = 6000`。
- serverが公開するtoolはCI待機toolだけに限定する。
- `wait_for_required_ci` だけをtool単位で `approval_mode = "approve"` に固定し、他toolへの包括的なapproval設定は追加しない。
- user-level `~/.codex/config.toml` へ設定を要求しない。
- secret / PAT / GitHub tokenをconfigへ追加しない。
- existing `gh` authenticationをserver processから利用する。
- MCP serverの `env_vars` に `GH_TOKEN` / `GITHUB_TOKEN` を指定し、親processに存在する場合だけ継承する。token値自体はconfigへ記載しない。
- `required = true` は設定しない。dependency未導入のfresh checkoutでCodex全体の起動を妨げない。
- server process初期化時に `git remote get-url origin` を1回だけ実行し、GitHub HTTPS / SSH origin URLから `owner/repo` を抽出してprocess stateへ固定する。初期化後はGit remoteを再参照しない。
- originがない、GitHub URLとして解釈できない、またはRepository identityを確定できない場合はserver startupを成功扱いにしない。
- server startupではGitHub API / `gh` 認証確認を行わない。GitHub接続・認証の検証は `wait_for_required_ci` tool call開始後に行う。

Repository root以外のsubdirectoryからCodexを起動する経路も検証する。`node --run mcp:ci-wait` でroot `package.json` を解決できない場合は、`scripts/codex-task.*` やuser固有絶対pathへfallbackせずblockerとして報告する。

MCP dependency / configを追加したcurrent実装process自体はtool availabilityの証拠にしない。`pnpm install --frozen-lockfile` 完了後に起動したfresh Codex processでserver startupとtool catalogを検証する。custom MCP startup failure後に同じprocessでdependencyを導入すれば自動復旧する、という前提は置かない。

### Task 2: `wait_for_required_ci` tool契約

#### 入力

- `pr_number`
  - 正の整数。
- `expected_head_sha`
  - 40桁hex SHA。

Repository、自由なcommand、workflow名、poll interval、URLをtool inputとして受け取らない。

#### Repository固定

- MCP serverは `node --run mcp:ci-wait` で起動し、Repository root / subdirectoryのどちらからでもroot `package.json` のscriptへ到達できることを実地検証する。
- server process初期化時に `git remote get-url origin` を1回だけ実行し、ローカルGit情報からRepositoryを解決する。startup中にGitHub APIは呼ばない。
- `https://github.com/<owner>/<repo>[.git]` と `git@github.com:<owner>/<repo>[.git]` を受理し、`owner/repo` をprocess stateへ固定する。以降のPR / workflow API endpointは `repos/<fixed-owner>/<fixed-repo>/...` を組み立て、Git remoteを再解決しない。
- model入力でRepository、owner、repo、GitHub endpointを上書きする経路を持たない。
- tool call開始後に取得したPRの `base.repo.full_name` が起動時に固定した `owner/repo` と一致しない場合は `repository_mismatch` を返し、そのPRやworkflowの監視へ進まない。
- tool resultの `repository` には起動時に固定した `owner/repo` を使用する。
- server process初期化時にRepository identityを確定できない場合はMCP startup failureとし、tool call内の `github_error` へ変換しない。

#### GitHub操作

- GitHub操作は `gh api --method GET` に統一する。Repository取得用の `gh repo view` やwrite系subcommandは使用しない。
- GitHub API endpointでは `{owner}` / `{repo}` placeholderを使わず、server startup時に固定したowner / repoを明示する。GitHub API通信はtool call開始後だけ行う。
- query parameterに `-f` / `-F` を使う場合も必ず `--method GET` を明示し、parameter追加による暗黙POSTを許可しない。
- registration / overall timeoutはtool開始時からのdeadlineとして保持する。各sleep / `gh` callの前に残時間を確認し、各 `gh` 子processのtimeoutは `min(30秒, remaining deadline)` とする。残時間がない場合は該当するtimeout resultを返し、1回の子processでdeadlineを超えない。子process自体のtimeout / API errorは `github_error` とする。ただしserver初期化時のRepository identity取得失敗はstartup failureとして扱う。
- 子processへ `GH_PROMPT_DISABLED=1` を設定し、認証prompt等による無期限待機を許可しない。
- PR情報からstate / current head SHA / `base.repo.full_name` を取得し、固定Repositoryとの一致をguardする。
- workflow run一覧はworkflow fileを直接指定し、次の2 endpointを別々に取得する。
  - `GET repos/<fixed-owner>/<fixed-repo>/actions/workflows/ci.yml/runs`
  - `GET repos/<fixed-owner>/<fixed-repo>/actions/workflows/native-ci.yml/runs`
- 各workflow run一覧は `head_sha=expected_head_sha`、`event=pull_request`、`per_page=100` をGET queryとして指定する。
- run候補はさらに `pull_requests[].number` に入力 `pr_number` が含まれるものだけに限定する。同じSHAを使う別PRのrunを採用しない。
- Repository契約上の表示名はserver内の固定値 `Web CI` / `Mobile App CI` とする。
- workflow操作、PR更新、comment、rerun、cancel等のwrite APIは持たない。

#### PR guard

- PRを取得するたびに、次を同じ共通guardとして評価する。
  - `base.repo.full_name` が起動時に固定したRepositoryと違う場合は `repository_mismatch`。
  - stateがOPENでない場合は `invalid_pr_state`。
  - current head SHAがexpected head SHAと違う場合は `stale_head`。
- tool call開始時、workflow登録待ちの各poll、workflow完了待ちの各pollでこのPR guardを先に実行する。
- GitHub CLI未導入、未認証、API errorは `github_error`。

#### workflow登録待ち

- 10秒間隔の各pollで最初にPR guardを実行し、通過した場合だけ `ci.yml` / `native-ci.yml` のworkflow run一覧を個別に確認する。
- registration中にPRがcloseされた場合は `invalid_pr_state`、headが変わった場合は `stale_head`、base Repositoryが変わった場合は `repository_mismatch` を即時返す。
- 各候補は `head_sha=expected_head_sha`、`event=pull_request`、`pull_requests[].number` に `pr_number` を含むことをすべて満たす。
- 2 workflowの候補が両方見つかるまで待つ。「checkが1件以上存在する」をregistration completeにしない。
- tool開始時から5分のregistration deadlineまでに揃わなければ `registration_timeout`。
- 同一workflow file / exact head / PR番号に複数runが存在する場合は `created_at` が最も新しいrunを選び、同値ならrun IDが大きい方を選んでrun IDを固定する。
- 選択後は別runへ途中で自動乗り換えしない。

#### workflow完了待ち

- 固定した2 run IDを15秒間隔で確認する。
- 15秒間隔の各pollで最初に同じPR guardを実行する。PR closeは `invalid_pr_state`、head変更は `stale_head`、base Repository不一致は `repository_mismatch` として即時返す。
- runの `status != "completed"` はstatus名にかかわらず継続待機とする。
- 両runが `status == "completed"` かつ `conclusion == "success"` なら `success`。
- どちらかが `status == "completed"` かつ `conclusion != "success"` なら `ci_failure`。
- tool開始時から90分のoverall deadlineに達したら `overall_timeout`。
- unrelated checkのfailureを終了条件にしない。

#### tool result

最低限次の固定resultを持つ。

- `success`
- `ci_failure`
- `stale_head`
- `repository_mismatch`
- `invalid_pr_state`
- `registration_timeout`
- `overall_timeout`
- `github_error`

resultには次を含める。

- repository
- PR番号
- expected / observed head SHA
- `Web CI` run ID / status / conclusion / URL
- `Mobile App CI` run ID / status / conclusion / URL
- result
- error reason（該当時）

CI failureはMCP transport failureにせず、正常なtool resultとして返す。予期しないserver内部例外だけをtool errorとして扱う。

#### MCP tool annotations / approval

- `wait_for_required_ci` はread-only toolとして登録する。
- MCP annotationsは `readOnlyHint = true`、`destructiveHint = false`、`openWorldHint = true` とする。
- Codex configではこのtoolだけ `approval_mode = "approve"` に固定し、CI待機開始時に人間approval promptを挟まない。
- annotationsやapproval設定をGitHub write権限の代替にしない。server実装自体をread-only GETへ限定する。

### Task 3: 実装をテスト可能に分離する

MCP protocol処理とCI状態判定を同じ巨大関数へまとめない。

最低限次を分離する。

- MCP server登録 / transport。
- GitHub read I/O。
- workflow run選択。
- wait state判定。

ただし将来拡張用interface / class hierarchyは作らない。現在の1 toolをテストするために必要な関数分離だけにする。

### Task 4: 自動テスト

networkなしで状態判定を検証する。

最低限:

- input validation。
- `git remote get-url origin` のGitHub HTTPS / SSH URLからRepository identityを1回だけ取得し、その後のrequest builderが固定owner / repoを使う。
- unsupported / missing originではserver startup failureとなり、GitHub APIを呼ばない。
- tool call時にGit remote由来のRepository identityを再解決しない。
- PRの `base.repo.full_name` が固定Repositoryと違う場合は `repository_mismatch`。
- PR open + head一致。
- closed PRを拒否。
- stale headを拒否。
- workflow 0件ではregistration wait継続。
- `ci.yml` だけではregistration wait継続。
- `ci.yml` / `native-ci.yml` の両方でexact head + pull_request event + PR番号が一致した時だけrun IDを固定。
- 同じSHAでも `pull_requests[].number` が別PRだけのrunは候補から除外。
- duplicate runから `created_at` 最新、同値ならrun ID最大を選択。
- 両方 `completed + success` で `success`。
- いずれかが `completed` かつnon-success conclusionなら `ci_failure`。
- `status != completed` は `requested` / `waiting` / `pending` / `queued` / `in_progress` 等の名称に依存せず待機継続。
- registration timeout。
- overall timeout。
- GitHub API error。
- 全 `gh api` 呼び出しが `--method GET` を持ち、query parameter追加でもPOSTへ変わらないこと。
- 1回の `gh` 呼び出しが30秒を超えた場合の `github_error`。
- `GH_PROMPT_DISABLED=1` が子processへ渡ること。
- MCP childへ `GH_TOKEN` / `GITHUB_TOKEN` の名前だけを継承設定し、親processに存在しない値を生成しないこと。
- token値をstdout / stderr / tool resultへ出さないこと。
- unrelated workflow / checkを取得・判定対象にしない。
- registration polling中のhead変更で `stale_head`。
- registration polling中のPR closeで `invalid_pr_state`。
- registration polling中のbase Repository不一致で `repository_mismatch`。
- workflow完了polling中も同じPR guardを適用する。
- tool resultにsecret / environment値を含めない。

stdio serverを直接起動するMCP integrationでは、Repository rootと1段以上深いsubdirectoryの両方から `node --run mcp:ci-wait` がroot `package.json` を解決し、tool listingと短時間のmocked tool callが成立することを確認する。既存testだけで同じ回帰を検出できる場合は重複を増やさない。

### Task 5: Codex実行経路と長時間MCP callの実地検証

MCP実装・config・focused testが通った後、HarnessをMCPへ切り替える前に実際のCodex経路をgateする。

まず既に終端状態のexact HEADを使い、同じ `wait_for_required_ci` を次の両経路から1回ずつ実callする。

- `scripts/codex-safe.*` のinteractive経路。
- `scripts/codex-task.*` のnon-interactive `codex exec` 経路。

初回tool catalogへの掲載や `codex mcp list` だけでは成功としない。両経路ともtool resultがCodexへ返ることを必須とする。`codex-task` 経路でMCP tool callがcancel /拒否されるなど、どちらか一方でも実callが成立しない場合はblockerとして停止し、Task 6以降のHarness / verify切替を行わない。別方式へ自動fallbackしない。

このruntime gateを通過した後、PR #182の実CIで長時間callを確認する。

最終push直後のPR #182 latest headを使い、CIが実行中の間にfresh Codex validation processから `wait_for_required_ci` を1回だけ呼ぶ。

確認すること:

1. fresh Codex processの初回tool catalogに `wait_for_required_ci` が存在する。
   - `mcp_optional_startup_grace_ms = 5000` / `startup_timeout_sec = 5` が有効であること。
   - Repository root / subdirectoryの両起動経路で確認する。
2. tool call開始後、CI終了までAgent側のGitHub polling / `write_stdin` /再tool callが発生しない。
3. MCP server内部ではGitHub状態確認が継続する。
4. tool resultが返った後にCodexが同じturnを継続する。
5. tracked configで `tool_timeout_sec = 6000` が指定され、installed Codexがその設定を拒否せずMCP server / toolを利用できる。
6. latest PR headがexpected head SHAと一致している。
7. `Web CI` / `Mobile App CI` のresultがtool outputとGitHub上の実結果に一致する。

実CIのMCP callが360秒以上継続した場合は、その実CIを長時間保持のbehavioral evidenceに使う。360秒未満で完了した場合は、Repositoryを変更しない一時的なlocal smokeで360秒のMCP call保持を1回確認する。

360秒smokeの目的は、長時間tool call中にAgentへ途中turnが戻らず、設定したtimeout overrideによって短時間で切断されず、result返却後に同じturnが継続することのsanity checkである。360秒成功を「90分保持が実証済み」とは扱わない。内部overall timeout 90分と `tool_timeout_sec = 6000` の大小関係は設定契約として検証し、Host側の未知の短い上限が実運用で判明した場合はblockerとする。一時smoke toolやfixtureを最終差分へ残さない。

### Task 6: Harness契約をMCPへ同期する

`docs/reference/codex-implementation-harness.md` に次を明記する。

- push後のCI待機は `wait_for_required_ci` MCP toolを1回呼ぶ。
- Agent自身は `queued` / `in_progress` を理由にGitHub状態を反復確認しない。
- shell `gh pr checks --watch` や `exec_command` live sessionを標準待機経路にしない。
- CI待機対象はexact HEADの `Web CI` / `Mobile App CI`。
- `success` なら完了処理へ進む。
- `ci_failure` は既存repair-loopへ渡す。
- `repository_mismatch` / `stale_head` / timeout / `github_error` は完了扱いにしない。
- fresh Codex processのtool catalogに `wait_for_required_ci` が存在しない、またはrepo-local MCP server startupが失敗した場合はrequired CI未確認のblockerとする。Agent側の `gh` status polling、`gh pr checks --watch`、`exec_command` / `write_stdin` pollingへfallbackしない。
- MCP dependency / configを修復した場合はfresh Codex processを起動し直し、tool availabilityを確認してからCI待機を再開する。同一processでの自動復旧を前提にしない。
- tracked Run ArtifactをCI結果記録だけのために再commitしない既存契約を維持する。

### Task 7: verify contractを同期する

- `scripts/verify` と `scripts/verify.ps1` の旧literal contractを新契約へ置き換える。
- Bash / PowerShellで同じ意味を検証する。
- 次の最低限だけを固定する。
  - `wait_for_required_ci`
  - exact HEAD
  - `Web CI`
  - `Mobile App CI`
  - Agent polling禁止
  - waiter利用不能時のpolling fallback禁止
- MCP server内部の細かなpoll intervalや関数名までliteralで固定しない。

### Task 8: PR #182のmetadataを同期する

- Plan確定時点でPR bodyから旧 `gh pr checks --watch --fail-fast`、3ファイル限定、Plan-only完了表現を除き、MCP方式・実装予定scope・L3 / runtime gateへ同期する。
- 実装開始後はPR title / bodyを実装内容と検証結果へ再同期する。
- 同じbranch `plan/ci-wait-without-agent-polling` とPR #182を継続使用する。branch renameは行わない。
- PR本文へ次を記録する。
  - MCP方式を採用した理由。
  - 追加したMCP server / tool。
  - tool timeoutと内部timeout。
  - local validation。
  - latest head SHA。
  - PR #182での実MCP CI wait結果。
  - CI待機中にAgent pollingがなかったことの確認方法。

## 6. 検証方法

### dependency / config

- dependency / lockfile更新後に `pnpm install --frozen-lockfile` を完了する。
- MCP startup / tool catalogの検証は、そのinstall完了後に起動したfresh Codex processで行う。
- host Nodeが `node --run` をサポートすることを確認する。未対応ならwrapperや絶対pathへ勝手にfallbackせずblockerとする。
- Repository root / subdirectoryの両方から `node --run mcp:ci-wait` がroot package scriptを解決できることを確認する。
- `mcp_optional_startup_grace_ms = 5000` / `startup_timeout_sec = 5` で初回tool catalogへwaiterが入ることを確認する。
- `codex mcp list` 等、installed Codexでproject MCP server登録を確認する。
- installed Codexが `tool_timeout_sec = 6000` とtool単位のapproval設定をconfig errorなく受理することを確認する。
- tool call開始後のGitHub認証確認で、保存済みcredentialまたは継承された `GH_TOKEN` / `GITHUB_TOKEN` によりread-only APIへ到達できることを確認する。
- server起動失敗・認証失敗時にsecretを含まない診断が得られることを確認する。

### focused test

- CI waiter contract test。
- MCP stdio integration test（追加した場合）。
- config / harness contractに関係する既存test。

### Repository標準検証

- `bash scripts/verify`
- `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `git diff --check`
- Repository標準のlint / typecheck / test / verify。
- dependency追加があるためlockfile整合も確認する。

### 実地検証

- PR #182 latest headを固定。
- `wait_for_required_ci` を1回call。
- tool call開始から終了までAgent側状態確認callが増えていないことをCodex event / logで確認。
- tool outputの2 workflow結果をGitHub上のexact head runと照合。
- failure経路のためにCIを意図的に壊さない。failure / timeout / stale headは自動テストで検証する。

### 成功判定

- MCP toolがCodexから利用できる。
- 長時間待機中にLLM pollingが発生しない。
- exact HEADの2 workflowだけを正しく待機する。
- success / failure / timeout / stale head / repository mismatchを決定論的に返す。
- MCP waiter利用不能時にAgent pollingへfallbackせずblockerとなる。
- Repository標準verifyがPASSする。
- PR #182自身で実CI待機を確認できる。

## 7. リスクと未解決論点

### 1. Codex / transport側の長時間tool timeout

内部waiterが正しくても、MCP transportやHostがtoolを途中で切る可能性がある。

対策:

- Codexの `tool_timeout_sec` を100分へ明示設定し、既定値には依存しない。
- PR #182または360秒local smokeで、長時間MCP call中にAgentへ途中turnが戻らないことを確認する。
- 360秒smokeは90分保持の保証には使わない。Host側に100分より短い固定timeoutが存在すると実運用で判明した場合は、resume方式へ自動fallbackせずblockerとして報告する。

### 2. project-scoped MCP起動path

CodexをRepository subdirectoryから起動した場合、単純なrelative script path / `cwd = "."` ではMCP server pathがずれる可能性がある。

対策:

- `package.json` に `mcp:ci-wait` を追加し、MCP commandを `node --run mcp:ci-wait` とする。
- Repository root / subdirectoryの両方からroot package scriptを解決できることをWindows host runtimeで実地確認する。
- `mcp_optional_startup_grace_ms = 5000` / `startup_timeout_sec = 5` を明示し、初回tool catalogへの登録を検証する。
- user固有の絶対pathや `scripts/codex-task.*` 変更へfallbackしない。

### 3. MCP serverへGitHub権限が渡る

MCP serverはCodex sandboxとは別processとして `gh` 認証へアクセスできる。

対策:

- tool実装をread-only GETへ限定する。
- Repositoryはserver process起動時に `git remote get-url origin` からローカルに1回だけ導出してprocess内へ固定し、startup中にGitHub APIを呼ばず、tool call中にGit remoteを再解決しない。
- PRの `base.repo.full_name` と固定Repositoryの一致をguardする。
- modelから任意Repositoryを指定させない。
- modelから任意command / endpoint / workflow名を入力させない。
- 各 `gh` 呼び出しを30秒でtimeoutし、`GH_PROMPT_DISABLED=1` で非対話化する。
- token値を読み取り・出力しない。
- GitHub write操作をserverへ実装しない。
- tool単位の `approval_mode = "approve"` はread-only実装を前提とし、権限境界の代替にしない。

### 4. 新規dependency

MCP SDK追加はsupply-chain / update対象を増やす。また、fresh checkoutでdependency未導入のままCodexを起動するとrepo-local MCP serverが起動できない。

対策:

- 公式 `@modelcontextprotocol/server` だけを追加する。
- exact versionで固定する。
- Node HTTP middleware等の不要packageは追加しない。
- 既存Zodを再利用する。
- Repository標準セットアップ `pnpm install --frozen-lockfile` 済みをMCP利用の前提にする。wrapperへ自動install処理は追加しない。
- `node --run mcp:ci-wait` をRepository root / subdirectoryで検証し、user固有絶対pathや `scripts/codex-task.*` 変更を不要にする。
- dependency導入後のMCP検証はfresh Codex processで行う。
- Repository標準security / verifyを通す。

### 5. polling API量

15秒間隔で長時間pollするとAPI call数が増える。

対策:

- workflow登録後は固定した2 run IDだけを取得する。
- PR head確認を含めてもGitHub API rate limitに対して過剰にならない間隔を維持する。
- 1秒単位のpollingやadaptive backoff frameworkは追加しない。

### 6. `gh` 認証環境

stdio MCP childはCodexが構成した環境で起動するため、shell側にある任意の環境変数が自動で全て引き継がれるとは限らない。

対策:

- MCP server configの `env_vars` に `GH_TOKEN` / `GITHUB_TOKEN` を指定し、存在する場合だけ継承する。
- token値はtracked config、ログ、tool resultへ出さない。
- 保存済み `gh auth login` credentialと環境変数認証の両方をtool-time validation対象にする。
- 認証できない場合は `github_error` とし、別credential保存方式を自動追加しない。

### 7. MCP waiterが利用できない場合

repo-local MCPはdependency / config / startup条件に依存するため、tool catalogへ登録されない可能性がある。

対策:

- `required = true` でCodex全体の起動を止める方式にはしない。
- required CI確認時に `wait_for_required_ci` が存在しない、またはMCP startup failureが確認された場合はblockerとする。
- Agent側のGitHub status pollingへfallbackしない。
- setupを修復した場合はfresh Codex processでtool availabilityを再確認する。

### 8. non-interactive `codex exec` でMCP tool callが成立しない場合

installed Codexのversionやapproval処理によっては、tool catalogにMCP toolが存在してもnon-interactive `codex exec` から実callできない可能性がある。

対策:

- tool listingではなく `scripts/codex-safe.*` と `scripts/codex-task.*` の両方で実callを確認する。
- `codex-task` が `--ask-for-approval never` を使う既存契約を変更して回避しない。
- non-interactive経路で実callできない場合はHarnessをMCPへ切り替えずblockerとする。
- wrapper、approval policy、別transport、resume方式へ自動fallbackしない。

## 8. 成果物

### Plan / Run Artifact

- `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md`
- `.codex/runs/20260924-200458-JST/**`

### 実装予定

- `.codex/config.toml`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/mcp/ci-wait-server.mjs`
- `tests/contracts/ci-wait-mcp.test.ts`
- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`

実装時の既存パターン確認によりtest path等を変更する場合は、同じ責務の既存配置へ合わせる。新しいMCP用framework directoryは作らない。

## 9. 実装順

1. `AGENTS.md` のL3対象であることとrollback planを提示し、ユーザーの明示承認を確認する。未承認ならここで停止する。
2. PR #182 bodyが最新PlanのMCP方式・scope・実装gateへ同期済みであることを確認する。
3. MCP SDK current stable / installed Codex / config仕様を最終確認する。
4. dependency、`mcp:ci-wait` package script、project MCP configを追加し、lockfileを同期する。
5. `pnpm install --frozen-lockfile` を完了し、host Nodeの `--run` 対応を確認する。
6. 公式SDK v2の `serveStdio` でstdio MCP serverを追加し、ローカルGit originによるRepository固定と `wait_for_required_ci` を実装する。
7. CI状態判定のcontract testを実装する。
8. focused testを実行し、Repository root / subdirectoryから `node --run mcp:ci-wait` を確認する。
9. install後に起動したfresh Codex processで初回MCP tool catalog / GitHub認証を確認し、既に終端状態のexact HEADに対して `scripts/codex-safe.*` と `scripts/codex-task.*` の両経路から `wait_for_required_ci` を実callする。どちらか一方でも失敗した場合はblockerとして停止する。
10. runtime gate通過後だけ、implementation harnessへMCP waiter利用不能時のfail-closed契約を追加し、Bash / PowerShell verifyを同期する。
11. Repository標準verifyを実行する。
12. Run Artifactをfinal commit前状態へ更新する。
13. commit / pushし、PR #182 title / bodyを実装内容へ同期する。
14. push後にfresh Codex validation processを起動し、PR #182 latest headでMCP toolを1回callして実CIを待機する。
15. 実CIのcallが360秒未満なら必要に応じて360秒local smokeを1回行う。
16. successなら最終確認へ進む。CI failureなら既存repair-loopへ進む。
17. MCP長時間call自体が失敗した場合は、目的未達としてblockerを記録し、別方式へ勝手に切り替えない。

## 10. 備考

- 今回の目的は「GitHubをpollしないこと」ではなく、「CI待機中にLLMを起こしてpollしないこと」。
- MCP serverはCI待機専用とし、汎用GitHub操作toolへ拡張しない。
- `resume` / supervisor方式は今回の実装対象から外す。
- PR #182はPlan-onlyではない。同じbranchで実装まで行う。
