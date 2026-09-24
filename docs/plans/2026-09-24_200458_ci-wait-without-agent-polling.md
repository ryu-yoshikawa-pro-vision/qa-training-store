# CI待機中のモデル推論を停止し、完了時にAgentを再開する計画

## 0. 依頼概要

- 依頼内容: 実装・push後のCI確認でAgentが状態確認を反復してトークンを消費する運用をやめ、CIが成功または失敗で終了した時点でAgentの作業を再開できるようにする。
- 背景: 現在のRepository契約では最新PR headの必須CI確認が完了条件に含まれるが、待機方法は「無制限pollingや独自の監視scriptを追加しない」とだけ定義されている。
- 期待成果: CI待機中はモデル推論を発生させず、exact HEADの `Web CI` / `Mobile App CI` が終端状態になった時だけAgentへ制御を戻す。
- 実装範囲: このbranch / PR #182でPlan修正から実装、検証、push後の実地確認まで行う。Plan-only PRにはしない。

## 1. ゴール / 完了条件

### ゴール

- CI待機をAgent自身の反復確認から外し、モデルを使わないプロセスへ委譲する。
- 最新PR headに対する `Web CI` と `Mobile App CI` だけをRepositoryの完了判定対象として扱う。
- 両workflowが `success` ならAgentを成功経路へ戻し、どちらかが終端の非successになったら原因調査へ戻す。
- 旧headの結果、branch protectionから推測したrequired checks、CodeRabbit等の別checkをRepository必須CIの代替にしない。

### 完了条件（DoD）

- 実装開始前に、実際に使っているCodex実行経路で「長時間commandをモデルへ制御を返さず完了まで待てるか」を実測している。
- CI待機中に `write_stdin` 等のAgent側pollingを繰り返さない経路が確立している。
- exact HEADに紐づく `pull_request` eventの `Web CI` / `Mobile App CI` が両方登録されるまで、モデル外でboundedに待機する。
- workflow登録後は、両workflowのrunをモデル外で監視し、次のいずれかで終了する。
  - 両方 `success`。
  - どちらかが終端の非success。
  - registration timeout、overall timeout、GitHub API / CLI error。
- 待機開始前と終了時にPR headを取得し、期待するcommit SHAから変わっていないことを確認する。
- `docs/reference/codex-implementation-harness.md` のCI lifecycle契約と実装経路が一致している。
- `scripts/verify` と `scripts/verify.ps1` のsemantic contractを新契約へ同期し、Bash / PowerShellの標準verifyがPASSする。
- 実装後のPR #182最新headで、実際の `Web CI` / `Mobile App CI` 完了待機を新経路で実行し、待機中にモデルpollingが発生していない証跡を残す。
- PR #182のtitle / bodyをPlan-only表現から実装内容へ同期する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状理解と確認済み事実

### Repository

- `AGENTS.md` はfile-changing taskのcommit / push / PR / CI lifecycleの正本を `docs/reference/codex-implementation-harness.md` としている。rootへ詳細契約を複製する必要はない。
- `docs/reference/codex-implementation-harness.md` は通常PRの必須CIを `Web CI` と `Mobile App CI` と定義し、pushした最新commitをheadとするPRで確認する契約を持つ。
- `.github/workflows/ci.yml` のworkflow名は `Web CI`、`.github/workflows/native-ci.yml` のworkflow名は `Mobile App CI` で、どちらも `pull_request` で起動する。
- `scripts/verify` と `scripts/verify.ps1` は現在の「`queued` / `in_progress`を理由に無制限pollingや独自の監視scriptを追加しません。」という文言をliteralで検証している。正本文書だけを変更すると標準verifyが失敗する。
- 過去Runでは `gh pr checks <PR> --watch` を使用しているが、これは「モデル推論を発生させず待てる」というruntime保証にはならない。

### GitHub CLI

- `gh pr checks --watch` はstatus checkが存在する場合にcheck完了まで監視できる。
- status checkが0件の時点では `no checks reported on the '<branch>' branch` で終了するため、push直後のregistration raceを単体では吸収できない。
- `--fail-fast` はPR上の最初のcheck failureを対象とするため、Repositoryが正本としている `Web CI` / `Mobile App CI` だけの終了条件とは一致しない。
- そのため、本実装では `gh pr checks --watch --fail-fast` をCI待機の正本にしない。

### Codex runtime

- 現行OpenAI Codexの `exec_command` は通常modeで `yield_time_ms` を持ち、defaultは10秒。長時間commandはlive sessionを返し、`write_stdin` で継続する経路を持つ。
- upstream sourceにはcommand completionまで待つone-shot用specも存在するが、現在このRepositoryで使っている実行経路から選択できるかは未確認である。
- event-driven wakeupやhookから「process終了までモデルを起こさず待つ」機能についてはOpenAI Codex repositoryでfeature requestが公開されており、通常のinteractive `exec_command` に一般提供済みと仮定しない。
- よって「`gh ... --watch` を1回呼べばトークン消費が止まる」という前提では実装しない。

### 外部仕様・確認元

- GitHub CLI `gh pr checks`: https://cli.github.com/manual/gh_pr_checks
- GitHub CLI `gh run list`: https://cli.github.com/manual/gh_run_list
- GitHub CLI check 0件時の実装: https://github.com/cli/cli/blob/trunk/pkg/cmd/pr/checks/checks.go
- OpenAI Codex unified exec: https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/unified_exec.rs
- OpenAI Codex exec command handler: https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs
- event-driven wakeup提案: https://github.com/openai/codex/issues/32188
- long-running commandのwait-until-completion提案: https://github.com/openai/codex/issues/39596

GitHub Issueは現行仕様の正本ではなく、通常のinteractive経路で自動wakeを前提にできないことを確認する補助情報として扱う。

## 3. 前提 / 質問 / 曖昧性

### 前提

- 削減対象はGitHub APIへのpolling回数そのものではなく、CI待機中に発生するモデル推論・Agent turn・そのトークン消費である。
- モデル外のprocessがGitHub APIを一定間隔で確認することは許容する。
- CI失敗時の原因分類・修正は既存 `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**` を正本とする。
- 新しい依存packageは追加しない。必要なhelperを作る場合もNode.js標準APIと既存の `gh` CLIで完結させる。

### 実装開始時に必ず解消する不確定事項

次はユーザー判断ではなく、実際のruntimeを確認して決める実装gateとする。

1. 現在のfile-changing taskで使う実行経路は、`codex-safe` のinteractive path、`codex-task` のnon-interactive path、または別host pathのどれか。
2. その経路でcommand completionまでモデルへ制御を返さないmodeを明示的に使用できるか。
3. 使用できない場合、同一threadを安全に再開できる `codex exec resume <thread-id>` 相当のsupervisor経路を、現在のCodex version・cwd・sandbox契約を維持して実装できるか。

これらを確認せず、docsだけで「モデルpollingなし」と宣言しない。

## 4. 影響範囲

### 確定している確認・変更対象

- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`
- `.github/workflows/ci.yml`（read-only確認）
- `.github/workflows/native-ci.yml`（read-only確認）
- `AGENTS.md`（read-only確認）
- `.codex/config.toml`（runtime契約確認）
- `scripts/codex-safe.sh`
- `scripts/codex-safe.ps1`
- `scripts/codex-task.sh`
- `scripts/codex-task.ps1`

### runtime gate通過後に追加し得る実装対象

- exact HEADの必須workflowだけをモデル外で監視するrepo-local helper。
- helperの状態判定を検証するcontract test。
- native completion waitが使えず、既存non-interactive wrapperで安全にresume可能と確認できた場合だけ、対象wrapperのsupervisor処理。

### 原則として変更しないもの

- `AGENTS.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- branch protection / ruleset
- Hookのpermission / sandbox契約
- repair-loopの分類
- Product code
- 外部常駐service、webhook server、queue

上記を変更しないと目的を達成できないことがruntime gateで判明した場合は、勝手にscopeを拡大せずblockerとして報告する。

## 5. 変更方針

### Task 0: 実際のCodex実行経路を固定する

実装前に次を実施する。

1. `codex --version` と対象taskの起動経路を記録する。
2. 通常のfile-changing taskと同じ経路で、repositoryを変更しない35〜40秒程度のlocal commandを1回だけ実行する。
3. command終了前にlive sessionがAgentへ返り、`write_stdin` 等の追加tool callが必要になるかを確認する。
4. installed Codexのhelp / config / 実行経路から、one-shotまたは同等のcompletion waitを明示的に利用できるか確認する。
5. upstream `main` に機能が存在するだけでは利用可能と判定しない。installed versionと実際のtool surfaceで確認する。

#### 判定A: モデルを起こさずcommand completionまで待てる

- 下記Task 1のCI waiterを、そのcompletion wait経路から1回だけ起動する。
- CI waiter実行中にAgentへlive sessionを返さないことを実地確認する。
- supervisor / resume機構は追加しない。

#### 判定B: interactive commandは必ずyieldするが、既存wrapperの外側から同一threadを安全にresumeできる

- CI waiterはCodex processの外側で実行する。
- 初回Codex turnはpushと待機情報の確定までで終了する。
- wrapper / supervisorがモデルを起動せずCI waiterを実行する。
- CI waiter終了後にだけ同一threadをresumeし、結果を渡してrepairまたは完了処理を続ける。
- `codex exec resume` のcwd、sandbox、session識別がinstalled versionで決定論的に維持できることを先にcontract testまたは実地確認する。
- 既存 `codex-task` のoutput / report / manifest契約を壊す変更は行わない。

#### 判定C: completion waitも安全なresumeも使えない

- repo-local scriptだけでは「CI終了時にAgentを自動再開する」という目的を達成できないため、実装を停止する。
- `gh pr checks --watch` の文書追加だけで完了扱いにしない。
- 確認したruntime制約、未達条件、次に必要なhost機能をPR / Run Artifactへ記録する。

### Task 1: exact HEADの必須CIをモデル外で監視する

判定AまたはBの場合、Repository固有のCI waiterを実装する。

#### 入力

最低限、次を明示入力とする。

- repository
- PR番号
- expected head SHA

現在branchや「最新PR」を暗黙推測して待機対象を決めない。

#### 開始時guard

- PRがOPENであることを確認する。
- PRのcurrent head SHAがexpected head SHAと一致することを確認する。
- 不一致なら待機を開始せずnon-zeroで終了する。

#### workflow登録待ち

- expected head SHAかつ `pull_request` eventに対するworkflow runを取得する。
- 対象名は `Web CI` と `Mobile App CI` の2つだけとする。
- 「PR上にcheckが1件存在する」ことを登録完了条件にしない。
- 両workflowのrunが見つかるまで10秒間隔で最大5分待つ。
- 同一workflow名・同一headに複数runがある場合は、最新に作成されたrunを対象とし、採用したrun IDを固定して以後の監視に使う。
- 認証失敗、GitHub API / CLI errorはretry対象にせず即時non-zeroで返す。
- 5分経過時に両方揃わなければregistration timeoutとして終了する。

#### workflow完了待ち

- 固定した `Web CI` / `Mobile App CI` のrun IDだけを監視する。
- 15秒間隔で状態を確認する。
- 両方 `completed + success` になったらexit 0。
- どちらかが `completed` かつ `success` 以外になったら、その時点でnon-zero終了する。
- overall waitは90分を上限とする。
- `queued` / `in_progress` は失敗に読み替えない。
- `cancelled`、`timed_out`、`action_required`、`stale`、`startup_failure`、`neutral`、`skipped` 等、Repository契約の `success` 以外の終端結果はすべてAgentへ返して原因分類する。
- unrelated checkのfailureをこのwaiterの終了条件にしない。

#### 終了時guard

- PRのcurrent head SHAを再取得し、expected head SHAと一致することを確認する。
- 待機中に新しいcommitがpushされてheadが変わった場合は、旧headの成功を現在headへ流用せずstale-head errorとして終了する。

#### 出力

- polling中は通常stdoutへ逐次ログを出さず、モデルへ流れる出力量を増やさない。
- 終了時だけ、次を含む短いmachine-readable summaryを出す。
  - expected / observed head SHA
  - PR番号
  - `Web CI` run ID / status / conclusion / URL
  - `Mobile App CI` run ID / status / conclusion / URL
  - waiter result
  - timeout / error reason
- secret、token、環境変数値を出力しない。

### Task 2: CI waiterの実装方法を最小化する

- runtime gate後もinline shellだけで、Windows / Bashの差異なく上記契約を決定論的に満たせる場合は、新しいhelperを作らない。
- quoting、並列監視、timeout、JSON処理の差で実装が分岐する場合は、Node.js標準APIだけを使う1個のrepo-local helperへ集約する。
- helperを追加する場合は、GitHubアクセス処理と純粋な状態判定を分離し、failure / timeout / stale-headをnetworkなしでtestできるようにする。
- 新しいnpm dependency、framework、daemon、serviceは追加しない。

### Task 3: Harness契約を実装へ同期する

`docs/reference/codex-implementation-harness.md` に次を明記する。

- CI待機中にAgent自身がGitHub状態を反復解釈しない。
- CI待機対象はexact HEADの `Web CI` / `Mobile App CI`。
- model-free waitが利用可能な実行経路だけで自動待機を行う。
- interactive runtimeがlive sessionを返す場合、`write_stdin` pollingを「トークン削減済み」と扱わない。
- runtimeにcompletion wait / safe resumeがない場合は、未達を明示して停止する。
- `gh pr checks --watch --fail-fast` はRepository必須CI完了判定の正本にしない。
- CI failure後は既存repair-loopへ戻る。
- tracked Run ArtifactをCI結果記録だけのために再commitしない既存契約は維持する。

### Task 4: verify contractを同期する

- `scripts/verify` と `scripts/verify.ps1` の旧literal contractを、新しいCI待機契約の最小semantic markersへ置き換える。
- Bash / PowerShellで同じ意味を検証する。
- 実装方法の詳細を大量のliteralで固定しない。次の契約だけを固定する。
  - exact HEAD
  - `Web CI`
  - `Mobile App CI`
  - Agent pollingを行わない
  - model-free waitが使えないruntimeでは完了扱いにしない
- helperを追加した場合は、存在と最低限の契約だけを既存verifyへ追加し、処理詳細は専用testで検証する。

### Task 5: PR #182を実装PRとして同期する

- 実装開始時にPR title / bodyからPlan-only表現を除く。
- 同じbranch `plan/ci-wait-without-agent-polling` とPR #182を継続使用する。branch renameは行わない。
- PR本文には最終的に次を記録する。
  - 採用したruntime経路と理由
  - CI waiterの対象と停止条件
  - local validation
  - latest head SHA
  - 新経路で待機した `Web CI` / `Mobile App CI` の結果
  - 待機中にモデルpollingがなかったことの確認方法

## 6. 検証方法

### runtime gate

- `codex --version`
- 実際のtask起動経路の確認
- repositoryを変更しない35〜40秒のcommandを同じtool surfaceで1回実行
- live session / `write_stdin` が必要か確認
- completion waitまたはsafe resumeをinstalled versionで確認

成功条件:

- 判定AまたはBについて、待機中にモデル推論を挟まないことを実測で説明できる。
- 判定Cなら、目的未達を隠して実装を進めない。

### CI waiterの自動テスト

helperを追加する場合、最低限次をnetworkなしで検証する。

- expected headとPR head一致。
- stale headを拒否。
- 片方のworkflowだけ登録済みなら待機継続。
- 両workflow登録で監視開始。
- 両方successでexit 0相当。
- Web CI failureで即時failure。
- Mobile App CI cancelled / timed_out等でfailure。
- registration timeout。
- overall timeout。
- GitHub CLI / API error。
- unrelated checkは判定に影響しない。
- duplicate runがある場合に最新runを固定する。

### Repository標準検証

- 対象focused test。
- `bash scripts/verify`
- `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `git diff --check`
- Markdownを変更するためRepository標準の文章・Markdown gateも既存verify経由で確認する。
- 変更ファイル一覧を確認し、runtime gateで必要性を説明できない変更が混入していないことを確認する。

### PR #182での実地検証

最終実装commitを通常pushした後、次を行う。

1. PR #182のlatest head SHAを固定する。
2. 新しいCI waiterを採用したmodel-free実行経路で開始する。
3. exact HEADの `Web CI` / `Mobile App CI` を待機する。
4. 待機中にAgentによる `write_stdin` / GitHub状態確認tool callが発生していないことを、利用したruntimeのlog / eventで確認する。
5. waiter終了後、PR headが同じSHAであることを再確認する。
6. 両workflowがsuccessなら完了処理へ進む。非successなら既存repair-loopへ進む。

実CIを意図的に壊してfailure経路を検証しない。failure / timeoutは自動テストで検証する。

## 7. リスクと停止条件

### 1. Codex host側に自動wake能力がない

最重要リスク。repo-local CI waiterだけを作っても、Agentのtool callが途中でyieldするならトークン削減と自動再開を達成できない。

対策:

- Task 0を最初に実施する。
- runtime capabilityを確認する前にhelperやdocsを作り込まない。
- completion waitもsafe resumeもない場合は判定Cで停止する。

### 2. `gh pr checks --fail-fast` がunrelated checkへ反応する

Repositoryの完了契約と一致しない。

対策:

- exact HEADの `Web CI` / `Mobile App CI` workflow runだけを監視する。

### 3. push直後のworkflow registration race

check 1件の存在だけではrequired workflowの登録を保証できない。

対策:

- 2つのworkflow名とexact HEADが揃うまで5分bounded waitする。

### 4. 待機中に新しいcommitがpushされる

旧headの成功を新headへ流用する危険がある。

対策:

- expected head SHAを入力として固定し、開始時と終了時にcurrent PR headとの一致を検証する。

### 5. supervisor / resumeがsession契約を変える

判定Bでは `codex exec resume` がcwd、sandbox、session identityを安全に維持できない可能性がある。

対策:

- installed versionで先に実地確認する。
- resume経路のためにpermission / sandboxを緩めない。
- 安全に固定できなければ判定Cとして停止する。

### 6. 変更範囲が広がる

wrapper、helper、testを無条件に増やすと今回の目的に対して過剰になる。

対策:

- Task 0の結果で必要な経路だけ実装する。
- 判定Aならsupervisor変更を行わない。
- inlineで契約を満たせるならhelperを追加しない。

## 8. 成果物

### 現在確定しているPlan / Run Artifact

- `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md`
- `.codex/runs/20260924-200458-JST/**`

### 実装で必ず更新するもの

- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`
- PR #182 title / body

### Task 0の結果次第で追加するもの

- CI waiter helper
- CI waiter contract test
- 判定Bで必要と確認された既存wrapper

### 原則変更しないもの

- `AGENTS.md`
- GitHub Actions workflow
- Product code
- package dependency
- Hook permission / sandbox policy

## 9. 実装順

1. Task 0のruntime gateを実行する。
2. 判定A / B / CをRun Artifactへ記録する。
3. AまたはBならCI waiterの最小実装を決める。
4. CI waiterと必要なtestを実装する。
5. 採用runtime経路へ接続する。
6. implementation harnessとBash / PowerShell verifyを同期する。
7. focused testとRepository標準verifyを実行する。
8. Run Artifactをfinal commit前状態まで更新・検証する。
9. commit / pushし、PR #182のtitle / bodyを実装内容へ同期する。
10. latest headを固定し、新しいmodel-free待機経路でPR CIを実地確認する。
11. 成功なら最終報告する。failureなら既存repair-loopへ進む。

## 10. 備考

- このPRはPlan-onlyではない。同じbranch / PR #182で実装まで行う。
- 目的は「GitHubをpollしないこと」ではなく、「CI待機中にモデル推論を繰り返さないこと」。
- upstreamの機能存在だけを根拠にruntime capabilityを仮定しない。installed versionと実際の実行経路で確認する。
