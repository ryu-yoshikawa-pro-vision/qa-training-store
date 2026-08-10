# PR #16 Agentic QA fail-close 修正計画

## 0. 依頼概要

- 依頼内容: PR #16 のレビュー結果を反映し、Black-box Scored QA の隔離、Preparation、Evidence、Scoring、Benchmark Identity、Spec Validator を実態と一致する fail-close 契約へ修正する。
- 背景: 現行経路に固定 Finding、未実測の Forbidden Probe、Evidence 不足でも completed になる Coverage、Expected のみを根拠にした TP、無条件の session/scope true、Git inspection failure の clean 扱いが残っている。
- 期待成果: Contract fixture と Official/model-backed Scored Run を明確に分離し、実行できない状態を PASS や正式スコアへ昇格させない。

## 1. ゴール / 完了条件

- ゴール: PR 指示の P0/P1 と必須 P2 を、Product Behaviorを変更せず既存 JSON + Zod Machine Contract の範囲で実装する。
- 完了条件（DoD）:
  - Forbidden Probe が isolated root の実体と runner tool scope を検査し、1件でも利用可能なら fail-close する。
  - Patched runtime の reset と runner callback 経路が実装され、runtime handle/PID/絶対PathをMachine Artifactへ保存しない。
  - Required Evidence Type と Mission completion が Coverage completed の条件になる。
  - Finding の Expected / Reproduction / Actual deviation / Evidence が同一Defectを指す場合だけTPになる。
  - Fresh runner session と別Evaluator sessionが実測され、scope失敗・session再利用・fixture実行は正式Scoringを無効化する。
  - Benchmark、Snapshot、Spec validator、CLIが壊れた入力でfail-closeする。
  - Basic/Intermediate/Advanced preparation、必須local validation、artifact sanitizerを実行し、未実行検証をPASS扱いしない。

## 2. 現状理解と前提

- Current understanding:
  - `run-contract-fixture.ts` は固定Findingを生成する契約fixtureで、patched runtimeの観察を行っていない。
  - `isolation.ts` は列挙結果を破棄し、Forbidden Probeの `available` を全件falseで返す。
  - `prepare-challenge.ts` はpost-patch sanity後にruntimeを停止し、scored resetとrunner提供が疑似stepに留まる。
  - Coverage schemaにrequired evidence typeはあるが、Coverage Result検証へ接続されていない。
  - EvaluatorはExpected/Actualの単純な不一致と正常文言のevidence matchでTPを成立させる。
  - Benchmarkのstatus failure、NUL path、shared comparator、Snapshot再導出、同一file anchor、削除Spec、CLI value validationに不足がある。
  - PR #16のCodeRabbit unresolved threadsは現HEADと照合済みで、P0/P1の多くは有効。低価値の単純重複整理とupload-artifact SHA pinは今回扱わない。
- Assumptions:
  - LLM/model-backed Official Scored Runの実行基盤は本リポジトリに存在しないため、fixtureは `contract_fixture` として無効化し、foundation runtime callbackは実装・契約テストで確認する。
  - 既存Product source、challenge patchの適用先、Actions tag方針は変更しない。
- Non-goals:
  - Product Behaviorの修正、Application Sourceへのpatch適用、branch/commit/push/rebase/merge/PR操作。
  - 新規dependency、YAML等の第二Machine Contract、全CodeRabbit trivial指摘への過剰な抽象化。
  - `actions/upload-artifact@v4` だけのSHA pin。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。添付指示に完了条件と非対象が明記されている。
- 仮定してよい細部: Runtime handleはPreparation内callbackへ渡し、Artifactには相対証跡だけを保存する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: Agentic QA contracts、isolation、preparation、runner/evaluator、coverage、benchmark/snapshot、spec validator、challenge教材、docs、contract tests、Run Artifact。
- Files to inspect:
  - `scripts/agentic-qa/{contracts,coverage,isolation,benchmark-revision,working-tree-snapshot,prepare-challenge,runner,run-contract-fixture,evaluate,validate-contracts,spec-refs}.ts`
  - `scripts/spec/{validate-spec,summarize-impact}.ts`
  - `tests/contracts/spec-agentic-qa.test.ts`
  - `training/agentic-qa/**`
  - `docs/spec/**`, `docs/curriculum/test-automation/**`, `docs/reference/**`

## 5. 変更方針

- Change strategy:
  1. 共有Schema/helper（challenge ID、spec ref、code-unit comparator、CLI option、Coverage evidence、session/execution kind）を先に確定する。
  2. Benchmark/Isolation/Preparation/Runner/Evaluatorを、実証値を受け取る境界へ変更する。
  3. Snapshot/Spec/CLIの再導出・fail-close検証を接続する。
  4. Answer Key、Challenge seed、Patch、Normative Spec、Curriculumを最小修正する。
  5. 壊れた入力を中心に契約テストを追加し、対象Runtimeと全Quality Gateを実行する。
- 実行タスク:
  - [ ] 1. P0 contract / isolation / runner-evaluator repair
  - [ ] 2. Preparation runtime reset / callback / cleanup repair
  - [ ] 3. Benchmark / Snapshot / Validator / CLI / Spec repair
  - [ ] 4. Challenge / Answer Key / Normative docs / curriculum repair
  - [ ] 5. Fail-close contract tests and runtime preparation
  - [ ] 6. Full validation, scope audit, artifact update, sanitizer

## 6. 検証方法

- Validation plan:
  - focused `pnpm exec vitest run tests/contracts/spec-agentic-qa.test.ts`
  - `pnpm run typecheck`, `lint`, `lint:markdown`, `validate:spec`, `build:spec`, `test:contracts`, `test`, `build:web`, `security:check`, `validate:image-manifest`, `format:check`, `git diff --check`
  - Basic/Intermediate/Advanced `prepare-challenge.ts` と patch/sanity/reset evidence
  - Agentic contract validator、JSON parse、Run Artifact Sanitizer
- 成功判定: 全コマンドexit 0。実行不能なmodel-backed Scored Runや外部CIは未実行として明記し、Evaluation metricsをnullにする。

## 7. リスクと未解決論点

- Risks:
  - Coverage/Finding schemaの必須化で既存fixture/test artifactが壊れるため、全fixtureを同一変更で更新する。
  - Runtime保持時間が長いとcleanup漏れが起きるため、callback/finallyで停止を保証する。
  - WindowsのCRLF/Prettierで意味差分が混ざらないよう、Product source diffとgenerated output diffを監査する。
- Open questions: model-backed Official Scored Runは基盤不足のため未実行。foundation readyと未実行を別Artifactへ記録する。

## 8. 成果物

- 変更ファイル: 上記Agentic QA scripts、contract tests、challenge/answer-key/patch、docs/spec、curriculum、Run Artifact。
- 付随ドキュメント: 本計画書、Run-local PLAN/TASKS/REPORT、必要なhistory追記。

## 9. 備考

- Git操作（branch、commit、push、rebase、merge、PR操作）は行わない。

## 追加修正方針 — Skill-first 実行可能性とCI安定化 (2026-08-10)

- Phase 1 CIの`tsx`→`esbuild`解決失敗は、package単位のdependency overlayがpnpmの
  transitive topologyを壊すことが原因と判断した。Preparation用Disposable Sourceには
  root `node_modules`全体をjunction／directory symlinkで参照させ、Scored isolated rootへ
  は依存ディレクトリを公開しない。
- Normal／Gray-boxはcurrent runに`qa-charter.json`がなければCoding AgentがUser Scope、
  Normative Specification、BR／AC、Risk、Platform、Role／Seed、Runtime Capabilityから
  bounded Charterを作成し、shared `exploration_budget`を含むZod契約で検証する。過去Runの
  Charterは暗黙再利用しない。
- Charter検証後、最初のRuntime interactionより前にBEFORE Snapshotを取得する。Runtime QA、
  candidate Findings、AFTER Snapshot、comparison、追加Source差分0確認、finalizationの順を
  Skill／Workflow／Run Artifact契約へ固定する。
- Benchmark Revisionのcanonical digest inputからRunner Profileを除外する。ProfileはRun／
  Evaluation metadataとして保持し、Profileだけが異なる場合はRevision／Identityを変えず、
  `sameRunnerCondition`だけをfalseにする。
- Official Black-box Scored E2Eは、trusted Fresh Session／identity／Tool Isolation／Actual
  Tool Scope、またはPrepared patched Target RuntimeをFresh Sessionへ引き渡すlifecycleが
  Hostから提供されないため`BLOCKED / DEFERRED / NOT EXECUTED`とする。Custom Runner等は
  実装しない。
