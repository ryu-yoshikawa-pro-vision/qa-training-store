# Subagent Orchestration SSOT / Strict Run 計画

## 0. 依頼概要

- 依頼内容: PR #20のSubagent Orchestration基盤を、モデル名・reasoning effortの設定変更に耐えるSSOT構造へ仕上げ、新しいStrict Runで再実証する。
- 背景: 現在のvalidator、collector、recorder、verify、現役ファイル名にGPT-5.6 Luna固有の参照が残っている。
- 期待成果: Parent configを期待値の正本とし、custom agent設定・dispatch ledger・runtime観測値を比較できるgenericな検証基盤と、監査可能なPASS Run Artifactを残す。

## 1. ゴール / 完了条件

- ゴール: `.codex/config.toml`の`agents.default_subagent_model`／`default_subagent_reasoning_effort`を参照して、将来モデル・effortを変更しても検証コードの変更を不要にする。
- 完了条件（DoD）:
  - validatorがconfigからmodel／effortを取得し、agent TOMLとの一致を検証する。
  - dispatch ledgerがParent設定からmodel／effortを保存し、collectorがexpected対observedを比較する。
  - runtime effort未観測を違反とせず、観測時のみ比較する。
  - 現役validator／contract testをgeneric名へ移行し、全参照を更新する。
  - model／effort migration fixture、runtime compliance、changed-files／dirty baseline／rename／status unavailable契約をPASSさせる。
  - read-only parallel 3件、quality runner 5 action、dispatcher positive/negativeを新Strict Runで実行する。
  - Source Integrity、scope、sanitizer、既存品質ゲートをPASSさせる。
  - 外部CI未確認の場合は`LOCAL_IMPLEMENTATION_COMPLETE=true`、`MERGE_READY=false`とする。

## 2. 現状理解と前提

- Current understanding:
  - HEADはPR修正およびpyc除去後のコミットで、作業ツリーはclean。
  - `.codex/config.toml`には現在値`gpt-5.6-luna`／`max`が定義済み。
  - generic化前のvalidator、`scripts/collect-run-artifacts.py`、`scripts/record-expected-invocation.py`、Bash／PowerShell verifyに固定値または旧ファイル名が残る。
  - 既存Run `20260812-070120-JST`は過去の実証記録として保存されている。
  - custom agent TOMLは明示的なmodel／effort設定を維持する要件である。
- Assumptions:
  - 過去のplans/history/Run Artifactは事実履歴として変更せず、現役参照と新Strict Runだけを更新する。
  - `tomllib`（Python 3.11+）でconfig／agent TOMLを読む既存方式を維持する。
  - generated logは`.artifacts`または新Runのsanitized logに保存し、global raw hook logは追跡しない。
- Non-goals:
  - Product behavior、application implementation、既存assertion、大規模refactorの変更。
  - write syscall監視、sandbox／orchestration platformの新規実装。
  - Git mutation、branch／PR操作、review thread操作。
  - CodeRabbitのdocstring coverageだけを目的とした変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザー指示にmodel／effort SSOT、generic rename、新Strict Run、完了判定が明記されている。
- 仮定してよい細部: 現役スクリプトはgeneric名へrenameし、互換wrapperは追加しない。過去履歴の旧名は保持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - orchestration config／custom agent validation
  - expected invocation ledger／runtime compliance aggregation
  - cross-platform validation dispatcher／verify
  - focused contract tests／migration fixtures
  - current Strict Run Artifact and durable plan
- Files to inspect:
  - `.codex/config.toml`, `.codex/agents/*.toml`
  - `scripts/validate-subagent-orchestration.py`
  - `scripts/collect-run-artifacts.py`
  - `scripts/record-expected-invocation.py`
  - `scripts/test-subagent-orchestration-contract.py`
  - `scripts/codex-local-validation.mjs`, `scripts/verify`, `scripts/verify.ps1`
  - docs/reference、package scripts、current Run Artifact、旧Run manifest

## 5. 変更方針

- Change strategy:
  1. validatorにParent configのmodel／effort取得を導入し、固定比較とLuna markerをgeneric化する。
  2. recorderにconfig参照のdispatch expectationを導入し、明示CLI値はfixture／診断用途に限定する。
  3. collectorでexpected ledgerのmodel／effortとruntime観測を比較し、未観測effortを`null`として表現する。expected model自体を固定値検証しない。
  4. 現役validator／contract testをgeneric名へ移し、dispatcher／verify／docsの参照を更新する。過去履歴は保持する。
  5. migration fixture（future model／future effortのPASS、drift／runtime mismatchのFAIL）をfocused contract testへ追加する。
  6. 新Strict Runを初期化し、ledgerを独立生成してread-only parallel、quality runner、dispatcher negative、全検証、sanitizerを実行する。
  7. Run Artifactのevaluation／manifest／PLAN／TASKS／REPORTを実測値へ更新し、strict collectorで整合性を確認する。
- 実行タスク:
  - [ ] 1. SSOT参照とgeneric runtime scriptへ変更する。
  - [ ] 2. migration／runtime／artifact契約テストとcross-platform参照を更新する。
  - [ ] 3. 新Strict Runの実Runtime／Quality Gate／dispatcherを実行する。
  - [ ] 4. 最終検証、Source Integrity、sanitizer、Run Artifact整合性を確認する。

## 6. 検証方法

- Validation plan:
  - `python -B scripts/validate-subagent-orchestration.py`
  - `python -B scripts/test-subagent-orchestration-contract.py`
  - dispatcher positive 5 action、negative 3 action
  - `bash scripts/verify`
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
  - `pnpm run test:contracts`
  - `pnpm run verify`
  - strict collector、evaluation schema、Source Integrity、sanitizer Write／Check、`git diff --check`
  - `rg`で現役scriptsの固定model／effort比較と旧Luna参照を監査する。
- 成功判定:
  - migration PASS／drift FAIL／runtime expected-observed PASS・FAILが期待どおり。
  - runtime complianceはexpected>0、missing／unexpected／violations=0、allowlist一致、model一致。effortは観測時のみ一致確認。
  - quality runner required 5件が順序どおり各1回、exit code 0、PASS marker。
  - strict collector警告0、scope violation false、source integrity pass、sanitizer residual 0。

## 7. リスクと未解決論点

- Risks:
  - ファイルrenameによるpackage／verify／docs参照漏れ。`rg`と全dispatcher／contract実行で検出する。
  - 実runtime hookがreasoning effortを提供しない可能性。未観測をnullで記録し、modelだけをruntime必須比較とする。
  - quality runnerの長時間`verify`。既存成功Runと同じdispatcher経路で1回だけ実行する。
  - Run Artifact編集後にsanitizer／collectorの整合性が崩れる可能性。最後にstrict collectorとCheckを再実行する。
- Open questions: 外部GitHub Actions／Native CIの結果はこの環境では未確認の場合があり、確認できない場合はMERGE_READYをfalseに保持する。

## 8. 成果物

- 変更ファイル: SSOT／validator／collector／recorder／contract test／dispatcher／verify／docsの現役参照、および新Strict Run Artifact。
- 付随ドキュメント: 本計画、Run-local PLAN／TASKS／REPORT／run.json／evaluation.json。

## 9. 備考

- Git操作禁止を厳守し、commit／pushは行わない。
- 修正はbounded repair iterationとして記録し、同一失敗の盲目的再実行は行わない。
