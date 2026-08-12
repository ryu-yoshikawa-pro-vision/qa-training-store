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

- 複雑なタスク、明示的な計画依頼、Plan Mode のときは `PLANS.md` を読み、`.agents/skills/feature-plan/SKILL.md` を使う。Plan では planning に集中し、実装やレビューを混ぜない。
- レビュー依頼または `/review` のときは `CODE_REVIEW.md` を読み、`.agents/skills/code-review/SKILL.md` を使う。Review では findings を返し、実装や設計相談へ逸れない。
- review findings や validation failure の修正では `docs/reference/repair-loop.md` を読み、`.agents/skills/repair-loop/SKILL.md` を使う。Repair loop は bounded workflow であり、無制限再試行ではない。
- 実行結果や評価結果から harness 自体の改善候補を作るときは `docs/reference/harness-improvement-loop.md` を読み、`.agents/skills/harness-improvement/SKILL.md` を使う。実装修正と harness improvement は分離する。
- 探索的QA、仕様ベースQA、Agentic QA、実Runtimeを操作してProduct Behaviorを確認する依頼では、`QA_AGENT.md` と `.agents/skills/exploratory-qa/SKILL.md` を使用する。Exploratory QA SkillがQA実行のPrimary Entry Pointである。
- `scripts/agentic-qa/**` はCoding Agentを起動・制御するものではなく、Deterministic Preparation / Validation / Isolation Verification / Evaluationの補助として使用する。QA探索中はProduct Codeを修正しない。修正依頼へ進む場合はQA Findingを確定した後、Repair Workflowへ明示的に切り替える。
- チャットで合意した計画を実装に移す前に、`docs/plans/` 配下へ保存する。

## 1. Run 初期化

- `run_id = YYYYMMDD-HHMMSS-JST` を使う。
- 現在の会話に active run がない場合は `.codex/runs/<run_id>/` を作る。
- 同じ会話セッション内で同一タスクを継続する場合は、既存の active run と同じ `run_id`／Run Directory（`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`）を再利用し、新しい Run を作成しない。進捗、判断、検証結果は既存 Artifact へ追記・更新する。
- 同じ会話セッション内でも、ユーザーが別タスクの開始を明示した場合は新しい Run を作成してよい。会話セッションが変わった場合も、active run の引継ぎが明示されない限り新しい Run を作成する。
- `standard` / `strict` では `scripts/new-run.sh` または `scripts/new-run.ps1` を優先して run を初期化する。
- `lightweight` でも run artifact は残す。手動作成してよいが、迷う場合は `new-run` を使う。
- `new-run` を使わず手動初期化する場合は以下をコピーする。
  - `.codex/templates/PLAN.md`
  - `.codex/templates/TASKS.md`
  - `.codex/templates/REPORT.md`
- `run.json` が必要な workflow では `.codex/templates/RUN_MANIFEST.json` を元に作成するか、`new-run` に生成させる。
- run artifact は日本語で書く。

## 1.1 Run artifact の保存・蓄積方針

- `.codex/runs/<run_id>/` 配下の成果物は、一時的な作業ファイルではなく、作業履歴、判断経緯、検証結果、未完了事項を引き継ぐための正式なリポジトリ成果物として扱う。
- 作業完了後も Run Directory を保存し、今後の調査、レビュー、修正、再発防止に利用できるよう蓄積する。
- 同一会話セッション内の継続作業では、既存 Run Artifact を同じものとして使い、`REPORT.md` は append-only で追記し、`PLAN.md`／`TASKS.md`／`run.json` は履歴を失わない範囲で更新する。active run があるのに新しい Run Directory を作成して履歴を分散させない。
- 過去の Run Directory や `PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json` を、通常のcleanupや成果物整理を理由に削除しない。
- 過去Runの内容は原則として上書きせず、修正作業では新しいRunを作成する。既存Runへ補足が必要な場合は、履歴を失わない形で追記する。
- `.codex/runs/`を`.gitignore`へ追加しない。
- 個別タスクで「コードのみ変更する」「作業用ファイルを追加しない」「不要なドキュメントを削除する」と指定されていても、標準Run Artifactの作成・更新・保存はその対象外とする。
- Run Artifactの作成を省略、削除、移動してよいのは、ユーザーが`.codex/runs/`または対象Runを明示して指示した場合に限る。
- Git操作が禁止されている場合でも、Run Artifactの作成・更新は通常のファイル編集として実施する。ただし、禁止された`git add`、`git commit`、`git push`等は実行しない。

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

`REPORT.md`のAppend-only契約は、行動記録、判断、検証結果を
削除、並べ替え、意味変更しないことを指す。

既存記録に含まれるローカル絶対Pathを`<REPO_ROOT>`、`<USER_HOME>`等の
既定Tokenへ、記録の意味を変えずに置換する場合のみ、
Append-only契約の安全性例外として許可する。

Credential Redactionや汎用的な機密情報マスキングは、この例外に含めない。
それらが必要になった場合は、別途契約・実装・テスト・承認を行う。

## 2. 実行ループ

1) `.codex/runs/<run_id>/TASKS.md` のタスクを上から順に実行する。  
2) 各タスク完了後に次を行う。  
   - `TASKS.md` のチェックを更新する  
   - `REPORT.md` に JST 時刻の記録を追記する  
   - `Progress: <NN>% (<done>/<total>)` を含める  
3) 作業中に見つかったタスクは `## Discovered` に追加する。  
4) 判断メモは `PLAN.md` に、行動ログは `REPORT.md` に追記する。

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

- 関連のないファイルは変更しない。
- `.codex/runs/`配下の標準Run Artifactは削除候補として扱わない。一時ファイルと標準Run Artifactを区別し、標準Run Artifactをcleanup対象に含めない。
- プロジェクト配下の読み書きは許可する。ただし shell / PowerShell / git などの command によるファイル削除、履歴破壊、配布対象除去は明示承認なしに行わない。command-based deletion is forbidden.
- command-based deletion is forbidden.
- `apply_patch` は差分単位で意図を確認できる通常の編集手段として許可する。
- 手動の Codex 実行には `scripts/codex-safe.ps1` または `scripts/codex-safe.sh` を優先する。
- 非対話の `codex exec` には `scripts/codex-task.ps1` または `scripts/codex-task.sh` を優先する。
- 明示的な依頼と外部 sandbox がない限り、`--dangerously-bypass-approvals-and-sandbox` は使わない。
- repository の execpolicy ルールは `.codex/rules/*.rules` 配下で管理する。

## 8. 必須検証

- 必要に応じて次の一部または全部を実行する。
  - `bash scripts/verify`
  - project formatter / lint / typecheck / tests / build
- 実行できない検証があれば、run report とユーザー向けレポートの両方に明記する。
- 品質ゲートでエラーが出た場合、最初に「今回の変更範囲外」と分類して保留してはならない。Baseline、変更差分、共有依存、CI／テスト契約、実行環境を確認し、今回の変更が影響している可能性を調査する。
- 現在の変更が原因である、または現在の変更を正しく検証するために不可欠である場合は、元のPR／依頼の変更範囲に含まれていなくても現在のPRで最小修正する。型注釈、回帰テスト、契約、文書など必要な修正を行い、関連する品質ゲートを再実行する。
- 現在の差分と因果関係がなく、独立して修正可能な問題は、安全に修正できることだけを理由に現在のPRへ追加せず、Run Artifactへ記録して別PRまたはユーザー承認後の対応とする。
- 調査の結果、真に無関係、環境依存、危険な変更が必要、または要件判断が必要な場合だけ保留できる。その場合も、根拠、因果関係の評価、未実行の検証、次の対応者／アクションをRun Artifactとユーザー向けレポートへ記録する。「既存エラー」「安全に直せる」というラベルだけでは、現在のPRへ追加・保留いずれの理由にもならない。
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

- Parentからdelegationされたchild subagentは独自のRun DirectoryまたはRun Artifactを作成・更新しない。childは結果をParentへ返し、delegation内容、結果、採否はParentがactive Runへ記録する。これはrootの通常Run初期化規則に対するdelegated child専用の例外である。
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
- read-only調査subagentは編集・作成・削除を行わず、調査結果だけを返す。subagentを使った場合、委譲内容、返ってきた要約、親 agentが採用した判断、省略理由を `.codex/runs/<run_id>/REPORT.md` に記録する。
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
