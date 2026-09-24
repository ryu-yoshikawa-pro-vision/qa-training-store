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

- project-scoped MCP serverがRepositoryから起動でき、Codexのtool catalogにCI待機toolが登録される。
- MCP serverはstdio transportを使い、外部HTTP server、daemon、queue、webhook receiverを追加しない。
- Codex側のMCP tool timeoutがCI待機上限より長く設定され、MCP tool callが待機途中でCodex側timeoutにならない。
- CI待機tool `wait_for_required_ci` は、最低限次を入力に取る。
  - PR番号
  - expected head SHA
- Repository名はmodel入力にせず、MCP serverの固定cwdから導出する。
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
- PR #182のtitle / bodyをPlan-only表現から実装内容へ同期する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状理解と前提

### Repository

- `AGENTS.md` はfile-changing taskのcommit / push / PR / CI lifecycleの正本を `docs/reference/codex-implementation-harness.md` としている。rootへCI待機詳細を重複させない。
- `docs/reference/codex-implementation-harness.md` は通常PRの必須CIを `Web CI` と `Mobile App CI` と定義している。
- `.github/workflows/ci.yml` のworkflow名は `Web CI`、`.github/workflows/native-ci.yml` のworkflow名は `Mobile App CI`。どちらも `pull_request` eventで起動する。
- `scripts/verify` と `scripts/verify.ps1` は現在のpolling禁止文言をliteralで検証しているため、正本文書だけを変更すると標準verifyが失敗する。
- `.codex/config.toml` はproject-scoped Codex configとして既に使われているが、現在は `[mcp_servers.*]` 定義を持たない。
- `package.json` / `pnpm-lock.yaml` にMCP server SDKは入っていない。
- RepositoryはZod 4.4.3、Node.js / TypeScript系の既存テスト基盤を持つ。

### Codex MCP

- Codexはstdio MCP serverの `command` / `args` / `cwd` を設定できる。
- MCP server単位で `tool_timeout_sec` を設定できる。Codex upstreamの既定MCP tool timeoutは300秒なので、CI待機用途では明示的な延長が必要。
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
- Repository名はMCP serverの固定cwdにあるRepositoryから導出し、modelから任意Repositoryを指定させない。
- 各 `gh` 子processは30秒でtimeoutし、`GH_PROMPT_DISABLED=1` を設定して非対話実行に固定する。
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

- 必ず質問する不透明点: なし。
- 仮定してよい細部:
  - MCP server名、script path、test file名はRepository既存命名に合わせて実装時に確定する。
  - registration poll intervalは10秒、workflow poll intervalは15秒を初期値とする。設定項目化しない。
  - registration timeoutは5分、tool全体のoverall timeoutは90分とする。
  - Codex側 `tool_timeout_sec` は内部overall timeoutより十分長い100分（6000秒）を設定する。
- 実装時に実測する項目:
  - project-scoped `.codex/config.toml` からstdio MCP serverがWindows / host runtimeで起動できること。
  - 長時間MCP call中にAgentへ途中turnが戻らないこと。
  - MCP result返却後に同じCodex turnが継続すること。
- 未回答の重要質問: なし。上記は実装gateとして実測し、失敗した場合は実装を完了扱いにしない。

## 4. 影響範囲

### 変更予定

- `.codex/config.toml`
  - repo-local MCP server登録。
  - MCP tool timeout設定。
- `package.json`
  - 公式 `@modelcontextprotocol/server` v2 stableをexact versionで `devDependencies` に追加。
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

1. installed Codex versionとproject-scoped configの有効性を記録する。
2. 公式 `@modelcontextprotocol/server` v2 stableのcurrent exact version、Node要件、licenseを確認する。
3. `devDependencies` へexact versionを追加し、`pnpm-lock.yaml` を同期する。
4. stdio MCP serverを追加する。
5. serverは1つの目的だけを持ち、最終状態では `wait_for_required_ci` 以外の業務toolを増やさない。
6. MCP stdioのstdoutはprotocol専用とし、診断ログを通常stdoutへ出さない。必要な診断はstderrへ限定する。
7. shell文字列連結を使わず、Node `child_process.execFile` / `spawn` のargvで `gh` を呼ぶ。

公式SDKを使えない明確な互換性問題が見つかった場合は、MCP protocolを手書き実装せず停止して報告する。

### Task 1: project-scoped Codex configへMCPを登録する

`.codex/config.toml` にrepo-local serverを登録する。

契約:

- transport: stdio。
- server command: Repository内serverをNodeで起動する。
- `tool_timeout_sec = 6000`。
- serverが公開するtoolはCI待機toolだけに限定する。
- `wait_for_required_ci` だけをtool単位で `approval_mode = "approve"` に固定し、他toolへの包括的なapproval設定は追加しない。
- user-level `~/.codex/config.toml` へ設定を要求しない。
- secret / PAT / GitHub tokenをconfigへ追加しない。
- existing `gh` authenticationをserver processから利用する。

project root以外からCodexを起動したときにrelative script path / `cwd` が壊れる場合は、Codexのstdio MCP `cwd` 設定でRepository rootへ固定できるかを確認する。user固有の絶対pathをtracked configへ書かない。

### Task 2: `wait_for_required_ci` tool契約

#### 入力

- `pr_number`
  - 正の整数。
- `expected_head_sha`
  - 40桁hex SHA。

Repository、自由なcommand、workflow名、poll interval、URLをtool inputとして受け取らない。

#### Repository固定

- MCP serverはproject-scoped configでRepository rootをcwdとして起動する。
- Repository名は固定cwdから `gh repo view --json nameWithOwner` 等で導出する。
- model入力でRepositoryを上書きする経路を持たない。
- Repository導出に失敗した場合は `github_error` とする。

#### GitHub操作

- `gh api` のread-only GETだけを使用する。
- Repository導出を含む各 `gh` 子processは30秒でtimeoutし、timeout時はprocessを停止して `github_error` とする。
- 子processへ `GH_PROMPT_DISABLED=1` を設定し、認証prompt等による無期限待機を許可しない。
- PR情報からstate / current head SHAを取得する。
- Actions workflow runをexpected head SHAと `pull_request` eventで取得する。
- workflow名はserver内の固定値 `Web CI` / `Mobile App CI` とする。
- workflow操作、PR更新、comment、rerun、cancel等のwrite APIは持たない。

#### 開始時guard

- PR stateがOPENでない場合は `invalid_pr_state`。
- current head SHAがexpected head SHAと違う場合は `stale_head`。
- GitHub CLI未導入、未認証、API errorは `github_error`。

#### workflow登録待ち

- exact HEAD / `pull_request` のworkflow runを10秒間隔で確認する。
- `Web CI` / `Mobile App CI` の両方が見つかるまで待つ。
- 「checkが1件以上存在する」をregistration completeにしない。
- 5分で揃わなければ `registration_timeout`。
- 同一workflow名・同一headに複数runが存在する場合は、最も新しいrunを選択してrun IDを固定する。
- 選択後は別runへ途中で自動乗り換えしない。

#### workflow完了待ち

- 固定した2 run IDを15秒間隔で確認する。
- 各poll時にPR current headも確認し、expected head SHAから変わった時点で `stale_head` を返す。
- 両runが `completed + success` なら `success`。
- どちらかが `completed` かつ `success` 以外なら `ci_failure`。
- `queued` / `in_progress` は継続待機。
- tool開始から90分で `overall_timeout`。
- unrelated checkのfailureを終了条件にしない。

#### tool result

最低限次の固定resultを持つ。

- `success`
- `ci_failure`
- `stale_head`
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
- PR open + head一致。
- closed PRを拒否。
- stale headを拒否。
- workflow 0件ではregistration wait継続。
- Web CIだけではregistration wait継続。
- 両workflow登録でrun IDを固定。
- duplicate runから最新を選択。
- 両方successで `success`。
- Web CI failureで `ci_failure`。
- Mobile App CI cancelled / timed_out / skipped / neutral等で `ci_failure`。
- queued / in_progressは待機継続。
- registration timeout。
- overall timeout。
- GitHub API error。
- 1回の `gh` 呼び出しが30秒を超えた場合の `github_error`。
- `GH_PROMPT_DISABLED=1` が子processへ渡ること。
- unrelated workflow / checkを無視。
- polling中のhead変更で `stale_head`。
- tool resultにsecret / environment値を含めない。

可能ならstdio serverを直接起動するMCP integration testも1件追加し、tool listingと短時間のmocked tool callが成立することを確認する。既存testだけで同じ回帰を検出できる場合は重複を増やさない。

### Task 5: 長時間MCP callの実地検証

MCP実装・config・focused testが通った後、実際のCodex経路で確認する。

最終push直後のPR #182 latest headを使い、CIが実行中の間にfresh Codex validation processから `wait_for_required_ci` を1回だけ呼ぶ。

確認すること:

1. tool catalogに `wait_for_required_ci` が存在する。
2. tool call開始後、CI終了までAgent側のGitHub polling / `write_stdin` /再tool callが発生しない。
3. MCP server内部ではGitHub状態確認が継続する。
4. tool resultが返った後にCodexが同じturnを継続する。
5. tool call durationが5分を超えた場合でもCodex既定300秒timeoutではなく設定した `tool_timeout_sec` が有効である。
6. latest PR headがexpected head SHAと一致している。
7. `Web CI` / `Mobile App CI` のresultがtool outputとGitHub上の実結果に一致する。

CIが5分を超えて実行され、MCP callが300秒を超えて保持された場合は、その実CIを `tool_timeout_sec` 検証の証拠に使う。

CIが5分以内に完了して300秒超の保持を検証できなかった場合は、「MCP呼び出し成功」と「300秒超の長時間保持成功」を分けて記録し、Repositoryを変更しない一時的なlocal smokeで360秒のMCP call保持を1回確認する。360秒smokeでは、300秒を超えてもAgentへ途中turnが戻らず、360秒後にresultが返って同じturnが継続することを確認する。一時smoke toolやfixtureを最終差分へ残さない。

300秒超の保持を未検証のままDoD達成とはしない。

### Task 6: Harness契約をMCPへ同期する

`docs/reference/codex-implementation-harness.md` に次を明記する。

- push後のCI待機は `wait_for_required_ci` MCP toolを1回呼ぶ。
- Agent自身は `queued` / `in_progress` を理由にGitHub状態を反復確認しない。
- shell `gh pr checks --watch` や `exec_command` live sessionを標準待機経路にしない。
- CI待機対象はexact HEADの `Web CI` / `Mobile App CI`。
- `success` なら完了処理へ進む。
- `ci_failure` は既存repair-loopへ渡す。
- `stale_head` / timeout / `github_error` は完了扱いにしない。
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
- MCP server内部の細かなpoll intervalや関数名までliteralで固定しない。

### Task 8: PR #182を実装PRとして同期する

- PR title / bodyからPlan-only表現と旧 `gh pr checks --watch --fail-fast` 方針を除く。
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

- `pnpm install --frozen-lockfile` が更新後lockfileで成立する状態を確認する。
- `codex mcp list` 等、installed Codexでproject MCP server登録を確認する。
- server起動失敗時にsecretを含まない診断が得られることを確認する。

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
- success / failure / timeout / stale headを決定論的に返す。
- Repository標準verifyがPASSする。
- PR #182自身で実CI待機を確認できる。

## 7. リスクと未解決論点

### 1. Codex / transport側の長時間tool timeout

内部waiterが正しくても、MCP transportやHostがtoolを途中で切る可能性がある。

対策:

- Codexの `tool_timeout_sec` を100分へ設定する。
- PR #182で実際の長時間tool callを確認する。
- Host側にそれより短い固定timeoutが存在すると判明した場合は、resume方式へ自動fallbackせずblockerとして報告する。

### 2. project-scoped MCP起動path

CodexをRepository subdirectoryから起動した場合、relative command / cwd解決が環境差になる可能性がある。

対策:

- project configのstdio `cwd` を利用してRepository rootへ固定する。
- Windows host runtimeで実地確認する。
- user固有の絶対pathをtracked configへ書かない。

### 3. MCP serverへGitHub権限が渡る

MCP serverはCodex sandboxとは別processとして `gh` 認証へアクセスできる。

対策:

- tool実装をread-only GETへ限定する。
- Repositoryは固定cwdから導出し、modelから任意Repositoryを指定させない。
- modelから任意command / endpoint / workflow名を入力させない。
- 各 `gh` 呼び出しを30秒でtimeoutし、`GH_PROMPT_DISABLED=1` で非対話化する。
- token値を読み取り・出力しない。
- GitHub write操作をserverへ実装しない。
- tool単位の `approval_mode = "approve"` はread-only実装を前提とし、権限境界の代替にしない。

### 4. 新規dependency

MCP SDK追加はsupply-chain / update対象を増やす。

対策:

- 公式 `@modelcontextprotocol/server` だけを追加する。
- exact versionで固定する。
- Node HTTP middleware等の不要packageは追加しない。
- 既存Zodを再利用する。
- Repository標準security / verifyを通す。

### 5. polling API量

15秒間隔で長時間pollするとAPI call数が増える。

対策:

- workflow登録後は固定した2 run IDだけを取得する。
- PR head確認を含めてもGitHub API rate limitに対して過剰にならない間隔を維持する。
- 1秒単位のpollingやadaptive backoff frameworkは追加しない。

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

1. MCP SDK current stable / installed Codex / config仕様を最終確認する。
2. dependencyとproject MCP configを追加する。
3. stdio MCP serverと `wait_for_required_ci` を実装する。
4. CI状態判定のcontract testを実装する。
5. focused testと短時間MCP integrationを確認する。
6. implementation harnessとBash / PowerShell verifyを同期する。
7. Repository標準verifyを実行する。
8. Run Artifactをfinal commit前状態へ更新する。
9. commit / pushし、PR #182 title / bodyを実装内容へ同期する。
10. push直後のPR #182 latest headでMCP toolを1回callし、実CIを待機する。
11. successなら最終確認へ進む。CI failureなら既存repair-loopへ進む。
12. MCP長時間call自体が失敗した場合は、目的未達としてblockerを記録し、別方式へ勝手に切り替えない。

## 10. 備考

- 今回の目的は「GitHubをpollしないこと」ではなく、「CI待機中にLLMを起こしてpollしないこと」。
- MCP serverはCI待機専用とし、汎用GitHub操作toolへ拡張しない。
- `resume` / supervisor方式は今回の実装対象から外す。
- PR #182はPlan-onlyではない。同じbranchで実装まで行う。
