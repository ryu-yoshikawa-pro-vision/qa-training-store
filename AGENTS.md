# Codex Working Agreement

Codex は、このリポジトリで作業を始める前にこの文書へ従うこと。

## 0. 最初に必ず読むもの

1) `docs/PROJECT_CONTEXT.md`
2) `docs/adr/`（最近の ADR を確認する）
3) `.codex/runs/`（最近の run があれば確認する）
4) この `AGENTS.md`

> `docs/PROJECT_CONTEXT.md` は living document として保つこと。  
> 重要な設計判断は ADR として記録すること。

## 0.1 モード別の入口ファイル

- 複雑なタスク、明示的な計画依頼、Plan Mode のときは [`feature-plan Skill`](.agents/skills/feature-plan/SKILL.md) を使う。Repository plan storage、filename、active Run lifecycleは [`PLANS.md`](PLANS.md) からlogical external inputとしてmappingし、Planではplanningに集中する。
- レビュー依頼または `/review` のときは [`code-review Skill`](.agents/skills/code-review/SKILL.md) を使う。Repository coding policy と review persistence policy は [`CODE_REVIEW.md`](CODE_REVIEW.md) からlogical external inputとしてmappingし、Reviewではfindingsを返す。
- CodeRabbit など外部レビューサービスの full review / 再レビューは、明示的な実行指示または承認を得た場合に限り起動する。レビュー完了後は結果を報告して停止し、指摘の修正・thread操作・再レビューをユーザーの判断なしに続けない。既存のreview結果・thread状態の参照はこの確認とは別に行ってよい。
- review findings や validation failure の修正では [`repair-loop Skill`](.agents/skills/repair-loop/SKILL.md) を使う。Repository-side artifact、scope、evaluation、failure taxonomy、run/sanitization integrationは [`docs/reference/repair-loop.md`](docs/reference/repair-loop.md) からlogical external inputとしてmappingする。Repair loop は bounded workflow であり、無制限再試行ではない。
- 実行結果や評価結果から harness 自体の改善候補を作るときは [`harness-improvement Skill`](.agents/skills/harness-improvement/SKILL.md) を使う。Repository target catalog、path-based strictness mapping、artifact/evaluation integrationは [`docs/reference/harness-improvement-loop.md`](docs/reference/harness-improvement-loop.md) からlogical external inputとしてmappingし、実装修正とharness improvementは分離する。
- 探索的QA、仕様ベースQA、Agentic QA、実Runtimeを操作してProduct Behaviorを確認する依頼では [`exploratory-qa Skill`](.agents/skills/exploratory-qa/SKILL.md) を使う。Scenario Shop固有のexecution ownership、Machine Contract、artifact/schema、Harness integrationは [`QA_AGENT.md`](QA_AGENT.md) と [`docs/reference/agentic-qa-workflow.md`](docs/reference/agentic-qa-workflow.md) からlogical external inputとしてmappingする。
- `scripts/agentic-qa/**` はCoding Agentを起動・制御するものではなく、Deterministic Preparation / Validation / Isolation Verification / Evaluationの補助として使用する。QA探索中はProduct Codeを修正しない。修正依頼へ進む場合はQA Findingを確定した後、Repair Workflowへ明示的に切り替える。
- Windows AndroidのTooling、Release APK、physical device、Maestro、Native failureを確認する依頼では [`android-native-local-validation Skill`](.agents/skills/android-native-local-validation/SKILL.md) を使う。Repositoryの具体的command、version、path、setup、troubleshootingは [`docs/native/windows-android-local-validation.md`](docs/native/windows-android-local-validation.md) と [`docs/native/windows-android-troubleshooting.md`](docs/native/windows-android-troubleshooting.md) からlogical external inputとしてmappingする。
- チャットで合意した計画を実装に移す前に、`docs/plans/` 配下へ保存する。

## 1. Run 初期化

- `run_id = YYYYMMDD-HHMMSS-JST` を使う。
- 現在の会話に active run がない場合は `.codex/runs/<run_id>/` を作る。
- 同じ会話セッション内で同一タスクを継続する場合は、既存の active run と同じ `run_id`／Run Directory（`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`）を再利用し、新しい Run を作成しない。進捗、判断、検証結果は既存 Artifact へ追記・更新する。
- 同じ会話セッション内でも、ユーザーが別タスクの開始を明示した場合は新しい Run を作成してよい。会話セッションが変わった場合も、active run の引継ぎが明示されない限り新しい Run を作成する。
- `standard` / `strict` では `scripts/new-run.sh` または `scripts/new-run.ps1` を優先して run を初期化する。
- `lightweight` でも run artifact は残す。`PLAN.md`／`TASKS.md`／`REPORT.md`等は必要に応じて手動作成してよいが、actual `run.json`は手動作成せず、迷う場合は `new-run` を使う。
- `new-run` を使わず手動初期化する場合は以下をコピーする。
  - `.codex/templates/PLAN.md`
  - `.codex/templates/TASKS.md`
  - `.codex/templates/REPORT.md`
- actual `.codex/runs/<run_id>/run.json` は、通常workflowでもmanifest writer / collectorの実装タスクでもmachine-managedとし、Agentが直接作成・直接編集しない。直接生成・編集してよいのはtemporary test fixture等に限る。
- 通常workflowで新規manifestが必要な場合は `scripts/new-run.ps1` または `scripts/new-run.sh` を正規生成経路とし、非対話更新は `codex-task --record-run-manifest`、interactive更新は `codex-safe -RunId`／`codex-safe --run-id` 終了時のcollectorに委ねる。
- active Runに紐づくinteractive実行で `codex-safe` を使う場合は、current active Runの `RunId` を必ず指定する。`RunId`省略はactive Runに紐づかないad-hoc interactive実行に限る。wrapperはRunIdを自動探索・推測・環境変数伝播しない。
- `.codex/templates/RUN_MANIFEST.json` はmanifest仕様変更タスクの対象として直接編集してよい。manifest writer / collectorのsource codeは通常の実装対象だが、actual `run.json`の直接編集許可を意味しない。
- run artifact は日本語で書く。

## 1.1 Run artifact の保存・蓄積方針

- `.codex/runs/<run_id>/` 配下の成果物は、一時的な作業ファイルではなく、作業履歴、判断経緯、検証結果、未完了事項を引き継ぐための正式なリポジトリ成果物として扱う。
- 作業完了後も Run Directory を保存し、今後の調査、レビュー、修正、再発防止に利用できるよう蓄積する。
- 同一会話セッション内の継続作業では、既存 Run Artifact を同じものとして使い、`REPORT.md` は append-only で追記し、Agent-managedな`PLAN.md`／`TASKS.md`等は履歴を失わない範囲で更新する。actual `run.json`はmachine-managed writer / collectorの経路だけで更新し、active run があるのに新しい Run Directory を作成して履歴を分散させない。
- 過去の Run Directory や `PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json` を、通常のcleanupや成果物整理を理由に削除しない。
- 過去Runの内容は原則として上書きせず、修正作業では新しいRunを作成する。既存Runへ補足が必要な場合は、履歴を失わない形で追記する。
- `.codex/runs/`を`.gitignore`へ追加しない。
- 個別タスクで「コードのみ変更する」「作業用ファイルを追加しない」「不要なドキュメントを削除する」と指定されていても、標準Run Artifactの作成・更新・保存はその対象外とする。
- Run Artifactの作成を省略、削除、移動してよいのは、ユーザーが`.codex/runs/`または対象Runを明示して指示した場合に限る。
- Git操作が禁止されている場合でも、Agent-managedなRun Artifactの作成・更新は通常のファイル編集として実施する。ただし、actual `run.json`は直接編集せず、禁止された`git add`、`git commit`、`git push`等も実行しない。

### 長期保存する標準Run Artifact

- `PLAN.md`
- `TASKS.md`
- `REPORT.md`
- Workflow Levelで必要な`run.json`
- Workflow Levelで必要な`evaluation.json`
- ユーザーまたはDoDが保存を要求した補足資料

標準Run Artifactは正式なリポジトリ成果物として扱い、通常のcleanup、成果物整理、コード以外のファイル整理を理由に削除しない。

### 長期保存しない一時ファイル

以下は標準Run Artifactに含めない。

- `shims/`
- cache
- `node_modules`
- browser binaries
- 一時的なPATH設定用ファイル
- OSや実行端末固有の絶対パスを含むファイル
- 再生成可能な一時ログ
- credential、token、secretを含む可能性があるファイル
- 一時的なdownload、build、test output

一時ファイルをRun Directory内に生成した場合は、作業完了前に標準Run Artifactと分離する。

### 過去Runの変更ルール

- 過去Runの標準Run Artifactは、事実誤認や形式破損の修正を除き、原則として変更しない。
- 過去Runの不足を補う必要がある場合は、履歴を失わない追記とし、今回の作業内容は新規Runへ記録する。
- 標準Run Artifactの削除、移動、置換は、ユーザーが対象Pathを明示した場合に限る。

### Run Artifact Path Sanitization

Repositoryへ追加するCodex Run Artifactは、作業完了前に
scripts/sanitize-codex-artifacts.ps1のWriteとCheckを実行する。

未サニタイズのローカル絶対パスを含むRun Artifactは
完了扱いにしない。

生のCLIログ、MCPログ、ADB logcatなどは原則として
Git管理対象外の`.artifacts`配下へ保存し、Run Artifactには
必要な要約だけを記載する。

`REPORT.md`のAppend-only契約は、checkpoint単位の意味情報を
削除、並べ替え、意味変更しないことを指す。Hook JSONLで取得できる
machine factをREPORTへ逐次転記しない。

既存記録に含まれるローカル絶対Pathを`<REPO_ROOT>`、`<USER_HOME>`等の
既定Tokenへ、記録の意味を変えずに置換する場合のみ、
Append-only契約の安全性例外として許可する。

Credential Redactionや汎用的な機密情報マスキングは、この例外に含めない。
それらが必要になった場合は、別途契約・実装・テスト・承認を行う。

## 2. 実行ループ

1) `.codex/runs/<run_id>/TASKS.md` のタスクを上から順に実行する。  
2) TASK完了、blocker、重要判断、計画変更、Run完了のcheckpointで次を行う。
   - `TASKS.md` のチェックを更新する  
   - `REPORT.md` に JST 時刻の記録を追記する  
   - `Progress: <NN>% (<done>/<total>)` を含める  
3) 作業中に見つかったタスクは `## Discovered` に追加する。  
4) 判断メモは `PLAN.md` に、意味情報はcheckpointとして `REPORT.md` に追記する。

## 3. Progress ルール

- 分母は `## Now` + `## Discovered` の checkbox task
- `## Blocked` は分母に含めない
- 表記は `Progress: <NN>% (<done>/<total>)`

## 4. ユーザー向けレポート

すべての返答に以下を含めること。

1) 5件以内の `Summary`
2) `Progress: <NN>% (<done>/<total>)`
3) 完了していない場合は `Next`
4) 実行コマンド/結果と主要ファイルを含む `Evidence`

## 5. Living Documentation

- プロジェクト理解が変わったら `docs/PROJECT_CONTEXT.md` を更新する。
- PROJECT_CONTEXT の履歴は `docs/history/YYYY-MM-DD_HHMMSS_<summary>.md` に残す。
- 重要な設計判断は `docs/adr/` に記録する。

## 6. Plan と Report の保存先

- Plans: `docs/plans/{yyyy-mm-dd}_{HHMMSS}_{plan_name}.md`
- Reports: `docs/reports/{yyyy-mm-dd}_{HHMMSS}_{report_name}.md`
- タイムスタンプは JST (`Asia/Tokyo`) を使う。
- `docs/reports/` は durable な調査・監査・検証結果の置き場であり、通常のレビュー返答、進捗報告、軽い確認結果、run 内ログの既定保存先ではない。
- Report file を生成してよいのは、ユーザーが保存を明示した場合、計画 DoD に report file がある場合、複数ソース調査・監査・検証結果を後で参照する必要がある場合のみ。
- review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録、チャットで完結する評価では `docs/reports/` にファイルを作らない。
- 判断に迷う場合は report file を作らず、チャット返答と `.codex/runs/<run_id>/REPORT.md` に留める。

## 7. 安全性 / スコープ

- 関連のないファイルは変更しない。ただし、品質ゲートFAILへの対応として§8に従い修正が必要と判断されたファイルは、ゲート回復に必要な最小範囲で変更対象とする。
- `.codex/runs/`配下の標準Run Artifactは削除候補として扱わない。一時ファイルと標準Run Artifactを区別し、標準Run Artifactをcleanup対象に含めない。
- プロジェクト配下の読み書きは許可する。ただし shell / PowerShell / git などの command によるファイル削除、履歴破壊、配布対象除去は明示承認なしに行わない。command-based deletion is forbidden.
- command-based deletion is forbidden.
- `apply_patch` は差分単位で意図を確認できる通常の編集手段として許可する。
- 手動の Codex 実行には `scripts/codex-safe.ps1` または `scripts/codex-safe.sh` を優先する。
- 非対話の `codex exec` には `scripts/codex-task.ps1` または `scripts/codex-task.sh` を優先する。
- 明示的な依頼と外部 sandbox がない限り、`--dangerously-bypass-approvals-and-sandbox` は使わない。
- repository の execpolicy ルールは `.codex/rules/*.rules` 配下で管理する。

## 7.1 Git Branch Safety / Protected Branch Safety

Git mutation（commit、push、merge、cherry-pick、branch設定変更を含む）が許可されたタスクでも、現在いるbranchへ無条件にmutationしてよいとは解釈しない。詳細な復旧手順は [`docs/reference/git-branch-safety.md`](docs/reference/git-branch-safety.md) を正本とする。

- `main`、`master`、またはrepositoryのdefault branchへCodexが直接commit/pushしてはいけない。ユーザーがdefault branchへの直接反映を明示的に指定した場合だけ、別途その意図と安全条件を確認して実行対象にできる。
- PR、Issue、feature、fix branchが作業対象として存在する場合は、GitHubのPR `headRefName`またはユーザー指定branchを作業対象の正本とし、必ずそのbranchを使用する。
- Git mutationを伴うタスクの開始時、PR対応では次を確認する。`git status --short`、`git branch --show-current`、`git branch -vv`、および `gh pr view <number> --json headRefName,headRefOid,state`。current branchはPR `headRefName`と一致しなければならない。
- `git commit`直前に `git branch --show-current` を再実行する。期待branchと異なる場合はcommitせず、mainへ自動switchして続行せず、現在HEADをrescue branchで保護してから復旧手順へ移る。
- `git push`直前にも `git branch --show-current`、`git status --short`、`git branch -vv` を再実行する。PR対応ではcurrent branchとPR `headRefName`の完全一致を必須とする。一致しない場合はpushしない。
- branch一致を確認していない状態でbare `git push`を実行しない。PR branchへは、確認済みの明示refspec `git push origin HEAD:<expected-branch>` を優先する。current branchがmainのときに `git push -u origin HEAD` を使ってはいけない。
- cleanup、最新化、タスク終了処理を理由にactive task branchから勝手にmainへswitchしない。別branchへswitchする場合は、理由、切替前後のbranch、uncommitted changeの有無を確認してから実行する。
- 期待branchとcurrent branchが異なる状態で変更またはcommitを発見した場合は、mutationを停止し、current HEADをrescue branchで保護し、remoteをfetchしてmain汚染とancestryを確認する。fast-forward可能なら `--ff-only`、それ以外は対象commitだけを古い順にcherry-pickする。救出確認前のreset、branch delete、force pushは禁止する。
- `git push --force`、`git push -f`、`git branch -D`、`git clean -fd`は禁止する。`git reset --hard`も原則禁止だが、ユーザーが明示した復旧で、対象commitがrescue branchと期待branchの両方で保護され、remote状態を確認済みの場合に限り、ローカルbranchをcanonical remoteへ戻す目的で限定的に使用できる。remote mainの履歴を書き換えるforce pushは常に禁止する。

### Pull Request の言語ルール

- Codex がこのリポジトリで作成・更新する Pull Request のタイトルと本文は、原則として日本語で記載する。
- PR本文のsection heading、Summary、変更内容、検証結果、CI結果、リスク、対象外などの説明文も日本語を使用する。
- package名、function名、class名、file path、branch名、commit SHA、CLI command、コード、GitHub Actions job名などの技術識別子は無理に翻訳しない。
- ユーザーが明示的に英語または別言語を指定した場合のみ、その指定を優先する。
- 既存PRを更新する場合も、ユーザーから別言語の指定がない限り、PRタイトル・本文を日本語へ統一する。
- `gh pr create` / `gh pr edit` などで自動生成された英語本文をそのまま残さない。
- PR作成・更新後は、タイトルと本文が日本語になっていることを確認してから完了報告する。

## 8. 必須検証

- 必要に応じて次の一部または全部を実行する。
  - `bash scripts/verify`
  - project formatter / lint / typecheck / tests / build
- 実行できない検証があれば、run report とユーザー向けレポートの両方に明記する。
- 品質ゲートがFAILした場合は、最初の異常を特定し、派生エラーと分離したうえで、baseline、今回のdiff、shared dependency、test／CI contract、実行環境を確認して原因を分類する。
- 原因が現在の変更にあるか、現在の変更を正しく検証するために必要か、または独立しているかにかかわらず、破壊的操作・権限不足・secrets／credentialsへの操作・外部システムへの不可逆な副作用・要件判断が必要な変更でなく、現在の権限内で安全に最小修正できる場合は、元タスクの範囲外、既存問題、baseline、今回のdiffとの無関係を理由に保留せず、現在のタスクで修正して関連する品質ゲートを再実行する。
- 上記の安全な最小修正ができない場合、または同じfailureがリポジトリの再試行停止条件に到達した場合だけ停止できる。停止時は、根拠、因果関係の評価、未実行検証、次の対応者／アクションをRun Artifactとユーザー向けレポートへ記録する。
- FAIL、原因調査、最小修正、関連ゲート再実行を、全ゲートPASSまたは安全上の停止条件に到達するまで繰り返す。最終報告には全ゲートのPASS、または停止条件に該当する具体的な根拠を記載する。
- Build／Install／Test／Maestroを新たに実行する前に、直近Run、完全ログ、変更差分、Shell／Version／環境条件、成功ベースラインを確認し、AndroidではNative Runbook 5.1.1のpreflightと仮説を記録する。同じ条件の無目的な再実行は禁止する。
- 失敗時は最初の異常と派生エラーを分離し、上流工程が失敗したら後続工程を実行しない。同一エラー2回連続、同じ工程3回失敗、新しい情報なし、仮説なしの場合は再試行を止め、原因調査へ戻る。
- 生ログは`.artifacts/native-local/<attempt-id>/`などのGit管理外へ保存し、Run Artifactには要約と相対参照を残す。実行ごとにattempt-idを分け、作業完了前にRun ArtifactのSanitizer Write／Checkを行う。

## 9. 言語ポリシー

- 内部思考: English
- ユーザー向け出力と run artifact: 日本語
- `AGENTS.md`: 日本語

## 10. 自律的な調査ループ

- 未知がある依頼では、`PLAN.md` に仮説を定義する。
- 根拠は `REPORT.md` に記録する。
- 実行に移せる発見は `TASKS.md` に落とし込む。
- 長い task-specific workflow は `AGENTS.md` に直接書き込まず、repo-local skill を使う。
- plan の詳細形式は `PLANS.md` と planning reference、review の詳細形式は `CODE_REVIEW.md` と review reference に委譲する。

## 10.1 Subagent 運用

- Native delegation marker: No child subagent delegation.

- Parentからdelegationされたchild subagentは独自のRun DirectoryまたはRun Artifactを作成・更新しない。childは結果をParentへ返し、delegation内容、結果、採否はParentがTASK完了またはRun完了のcheckpointへ意味情報として一度だけ記録する。これはrootの通常Run初期化規則に対するdelegated child専用の例外である。
- Standard / StrictのParent Codexだけが、requirement interpretation、plan、delegation、result synthesis、implementation scope decision、final validation set decision、failure interpretation、final completion decisionを行う。
- project-scoped custom agentsのmodel / reasoning effortは `.codex/config.toml` の `[agents]` にあるproject defaultをSSOTとし、agent TOMLへ個別値を重複記載しない。
- `code_researcher` は code / dependency / impact investigationを担当する。
- `implementation_researcher` は implementation approach / change surface investigationを担当する。
- `test_investigator` は tests / CI / regression investigationを担当する。
- `implementation_worker` は、親 agent が計画、対象ファイル、変更範囲、禁止事項を確定した後のParent-defined scoped implementationだけを担当する。親 agent が明示した対象ファイルだけを最小差分で編集する。
- `quality_gate_runner` は Parent-defined validationを指定順に実行し、結果だけを返すvalidation-only subagentである。Source、test、docsを修正しない。
- 独立した観点がある場合、`code_researcher` / `implementation_researcher` / `test_investigator` はParentが必要なものだけをNative delegationで並列起動してよい。常に3つ起動するルールにはしない。
- writable subagentは原則1タスクにつき1つをserialで起動し、parallel writable worker、workspace isolation、worktree managerは今回実装しない。
- `implementation_worker` はファイル削除、rename、移動、`git add` / `git commit` / `git push` / `git rm` / `git reset` / `git clean` などのGit mutation、delete / renameを含むpatch operationを行わない。scope、設計判断、対象ファイル、検証方法に迷ったら編集せず親 agentに確認事項を返す。
- すべてのchild agentは追加のsubagentを起動しない（No child subagent delegation）。`agents.max_depth = 1`を維持し、child専用config、hook enforcement、runtime recursion collectorは作らない。
- subagentの起動・停止・並列実行・結果受領はCodex native delegation機能を利用する。Repositoryのshell / PowerShell / Python / Node scriptからsubagentを起動せず、既存`codex-safe.*` / `codex-task.*`をorchestration engineへ変更しない。
- read-only調査subagentは編集・作成・削除を行わず、調査結果だけを返す。Subagentの開始・終了などのmachine factは`.codex/logs/hooks-<safe-session-id>.jsonl`へ記録し、REPORTへeventごとに転記しない。使用時は次のcheckpointでDelegation・Result・Parent decisionだけを記録し、subagentを使わなかったこと自体は毎回記録しない。
- Subagent専用Structured Artifactを新規作成・更新せず、`SubagentStop` / `Stop`を最終終了やsuccess / failureの根拠として推測しない。
- 利用可能なproject-scoped custom agentsは `.codex/agents/` 配下のTOML定義を確認する。

## 11. 改善ガバナンス

- L1: wording のみの文書改善は、`REPORT.md` に記録すれば自己承認でよい。
- L2: workflow や template 構造の変更は、実装前にユーザー承認が必要。
- L3: permission / sandbox / approval / wrapper behavior の変更は、実装前に明示承認と rollback plan が必要。

## 12. Safety Harness

- 手動実行は `scripts/codex-safe.ps1` または `scripts/codex-safe.sh` を優先する。
- output/report を残す非対話実行は `scripts/codex-task.ps1` または `scripts/codex-task.sh` を優先する。
- `scripts/codex-sandbox.ps1` または `scripts/codex-sandbox.sh` は opt-in の Docker sandbox 実験時だけ使う。
- wrapper behavior、blocked option、preflight expectation が関係する場合は `docs/reference/codex-safety-harness.md` を参照する。
- manual / task / Docker runtime の使い分けは `docs/reference/codex-implementation-harness.md` を参照する。
- 既定の project config は `repo_safe` 相当の workspace-write + untrusted approval とし、live web search と追加 writable root は明示 opt-in にする。

## 12.1 Auto-net execution policy

- このリポジトリは、明示指定時のみ `auto-net` execution mode をサポートする。
- `auto-net` では、Codex は承認なしで workspace 内のファイル作成・編集、tests / linters / formatters / build、必要な依存解決、ドキュメント確認や API check のための network access を実行してよい。
- `auto-net` でも、ファイルやディレクトリの削除、ユーザーが明示していない移動・rename、`git add` / `git commit` / `git push` / `git rm` / `git reset` / `git clean`、remote repository push、Docker / Kubernetes / Terraform / cloud resource deletion、remote script の shell 直結実行、delete / rename を含む patch operation は行ってはいけない。
- cleanup が必要な場合、ファイルを削除せず、既存ファイルの更新で対応する。不要に見えるファイルは `REPORT.md` に削除候補として path、理由、推奨されるユーザー操作を記録する。
- 依存 install は可能な限り lifecycle scripts を抑制し、`npm ci` / `npm install` ではまず `--ignore-scripts` を検討する。lifecycle scripts が必要な場合は理由、対象 package、実行コマンド、結果を `REPORT.md` に記録する。
- `npm publish`、`npm unpublish`、`pip uninstall`、`python -c` など、test/build/dependency resolution を超える外部副作用や任意コード実行は auto-net でも行わない。

## 13. Lightweight Mode

- 狭く低リスクなタスクでのみ許可する。
- その場合でも run artifact と 1 件以上の evidence command は残す。
- `lightweight` は削除、rename、移行、外部通信、セキュリティ影響、権限変更、公開契約変更には使わない。
- それらを含む場合は `standard` 以上へ引き上げる。

## 14. Workflow Level

- Lightweight:
  - PLAN は任意。
  - TASKS は簡易でよい。
  - REPORT は最終 1 ブロックでもよい。
  - `run.json` と evaluation は任意。
  - scope 指定は任意。
  - 想定用途は誤字修正、小規模 docs 修正、軽微な設定修正。
- Standard:
  - PLAN、TASKS、REPORT は必須。
  - `run.json` は推奨。
  - evaluation は任意。
  - scope 指定は推奨。
  - 想定用途は通常の実装、複数ファイル変更、既存 workflow の拡張。
- Strict:
  - PLAN、TASKS、REPORT は必須。
  - `run.json` は必須。
  - evaluation は必須。
  - scope 指定は必須。
  - 想定用途は permission / sandbox / approval / wrapper behavior / external integration / data handling / migration / public contract を触る変更。
