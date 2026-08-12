# Native Subagent Orchestration 最小実装計画

## 0. 位置づけ

この計画は、`docs/plans/2026-08-11_110600_luna-subagent-orchestration.md` の実装方針を今回の正本として supersede する。旧Planは履歴として保持し、今回の作業では大規模に書き換えない。

PR #20で試したRuntime Compliance、独自監査基盤、subprocess launcher、parallel write isolation等は今回のNon-goalとする。subagentの起動・停止・並列実行・結果受領はCodex native delegation capabilityを利用し、Repository側にはcustom agent定義、Parent delegation rules、project default、既存verifyの最小contractだけを追加する。

## 1. ゴール / 完了条件

- ゴール: Parent Codexが、既存4 custom agentと新規`quality_gate_runner`を、役割とsandboxに応じてNative delegationで使い分けられる状態にする。
- 完了条件:
  - 5 agentのTOMLが存在し、parse可能で、名前と役割が一致する。
  - `.codex/config.toml` の`[agents]`がmodel=`gpt-5.6-luna`、reasoning effort=`max`のproject defaultを持つ。
  - 5 agent TOMLに個別`model`/`model_reasoning_effort`がない。
  - Parent routing、read-only parallel可、bounded serial write、validation-only、native delegation、childの追加subagent禁止が`AGENTS.md`に明記される。
  - `scripts/verify`とPowerShell版がquality gate agentと必要markerを確認する。
  - 5 agentのNative smoke test結果、validation、scope、安全性をRun Artifactへ記録する。
  - Git mutation、Product Code変更、独自orchestration framework追加を行わない。

## 2. 現状理解と前提

- Current understanding:
  - 作業ブランチは`feat/native-subagent-orchestration`で、開始時HEADは`main`および`origin/main`と同一、作業ツリーはcleanだった。
  - 既存custom agentは`code_researcher`、`implementation_researcher`、`test_investigator`、`implementation_worker`の4つである。
  - `.codex/config.toml`には`max_threads = 4`、`max_depth = 1`があり、既存hooks/profileは今回維持する。
  - `scripts/verify`にはagent存在、AGENTS marker、config、workerの旧modelを検査する契約がある。PowerShell版はtemplate/configを検査する。
  - ADR-0012はRepository独自のcustom model runner、Codex CLI wrapper、custom orchestrationを作らない方針を持つ。ADR-0006はRun Artifactのsanitizationを要求する。
- Assumptions:
  - 現在のCodex runtimeは`.codex/agents/*.toml`をNative custom agentとして発見できる。
  - `quality_gate_runner`のworkspace-writeはcache/generated temporary outputのためであり、developer instructionsでSource変更を禁止できる。
  - Application/Product validationは変更がworkflow/config/docsに限定されるため、標準`pnpm run verify`を最終確認に使う。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。添付指示に変更範囲、DoD、Git禁止、検証方法が明記されている。
- 仮定してよい細部: 既存agentの文体と`AGENTS.md`の既存markerを保持し、追加文言を最小化する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Codex project defaultとcustom agent discovery
  - Parentからのdelegation routingとchild safety boundary
  - 既存の静的template contract
  - Run Artifactの調査・smoke test・validation記録
- Files to inspect/change:
  - `.codex/config.toml`
  - `.codex/agents/code_researcher.toml`
  - `.codex/agents/implementation_researcher.toml`
  - `.codex/agents/test_investigator.toml`
  - `.codex/agents/implementation_worker.toml`
  - `.codex/agents/quality_gate_runner.toml`
  - `AGENTS.md`
  - `scripts/verify`
  - `scripts/verify.ps1`
  - `docs/plans/2026-08-12_141551_native-subagent-orchestration.md`
  - `.codex/runs/20260812-141551-JST/**`

## 5. 変更方針

- 既存4 agentの`model`/`model_reasoning_effort`を削除し、既存sandboxと役割を維持する。
- `[agents]`へproject defaultを追加し、`max_threads`/`max_depth`と既存config migrationは変更しない。
- 5 agentすべてへ、childから追加subagentを起動しないbehavioral ruleを追加する。
- `quality_gate_runner`はParent指定commandを指定順に実行し、exit codeと最初のfailureを返すvalidation-only agentとして新規追加する。
- `AGENTS.md`の10.1をParent orchestrator、agent routing、必要時のread-only parallel、serial writable、native delegation、禁止範囲が分かる最小構成へ整理する。
- verify scriptsへquality gate file、5 agent、必要なParent/native markerを追加し、旧`gpt-5.4-mini` hard-codeを除去する。model名とreasoning effortをverifyへ固定しない。
- 実装前にread-only researcherのNative調査結果を採用し、実装後は各agentをParentからNative smoke testする。workerは1ファイル・明示scopeでserial起動し、quality gateは既存validation commandだけを受け取る。

## 6. 検証方法

- TOML: Python標準`tomllib`で5 agentとconfigをparseし、name、sandbox、重複modelの不在、config default値を確認する。
- Static contract: `bash scripts/verify`、`powershell.exe -ExecutionPolicy Bypass -File scripts/verify.ps1`、`git diff --check`。
- Native smoke: `code_researcher`、`implementation_researcher`、`test_investigator`のread-only調査、`implementation_worker`の指定ファイル限定修正、`quality_gate_runner`の指定command実行をParentから委譲する。独自launcher/ledgerは作らない。
- Repository gate: `pnpm run verify`を実行する。失敗時は最初のfailureと変更差分・baseline・環境を切り分け、無目的な再試行をしない。
- Artifact: `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260812-141551-JST -Write -Check`、run.json parse、最終scope auditを行う。
- 成功判定: 上記commandがPASS（環境依存で実行できないものは理由と次のActionを記録）、5 agent smoke結果が役割どおり、scopeが推奨変更ファイルとRun Artifact内に限定されること。

## 7. リスクと未解決論点

- Risks:
  - 旧verifyが個別modelを要求しているため、削除漏れやmarker不整合でstatic gateが失敗する。
  - Native runtimeがproject custom agentを発見できない場合、独自fallbackやwrapperを作らず、Codex runtime capability failureとして記録する。
  - `quality_gate_runner`はworkspace-writeのため、instructionsとsmoke testでSource変更なしを確認する。
  - Run Artifactにローカル絶対Pathを記録するとsanitizer gateに抵触するため、Reportは相対Pathと既定tokenを使う。
- Open questions: なし。runtime model metadataがsurfaceで直接表示されない場合は、その事実だけをREPORTへ記録する。

## 8. 成果物

- 変更ファイル: 上記5 agent、config、AGENTS、verify 2種、新Plan、今回のstandard Run Artifact。
- 付随ドキュメント: なし。旧Planは削除せず、必要な場合も短いsuperseded注記に限定する。

## 9. 実行タスク

- [ ] 1. Baselineとread-only Native調査をRunへ記録する。
- [ ] 2. config、4 agent、quality gate agent、AGENTS、verify scriptsを最小差分で更新する。
- [ ] 3. TOML/static validationを実行する。
- [ ] 4. 5 agentのNative smoke testをParentから実行する。
- [ ] 5. repository validation、sanitizer、scope auditを実行し、Run Artifactを確定する。

## 10. Follow-up decisions

- delegated child subagentはParentのactive Runを所有し、独自のRun DirectoryまたはRun Artifactを作成・更新しない。過去のworker RunはHistorical Evidenceとして保持する。
- `scripts/verify` / `scripts/verify.ps1`は`default_subagent_model`と`default_subagent_reasoning_effort`のkey存在だけを検証し、model値と`max`を固定しない。
- fresh Parent sessionのNative runtimeで`quality_gate_runner`をspawnし、Parent指定のPowerShell verifyと`git diff --check`がPASSすることを確認する。
- WSL UbuntuのPOSIX/LF overlayでBash verifyを実行したが、HEAD以前から存在するtemplate contractの文言不整合でFAILした。古い運用文言を復活させず、clean CIのformat:check PASSと合わせて環境／baseline差として記録する。
