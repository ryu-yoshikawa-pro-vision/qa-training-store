# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalの実装Planを、全体レビューで確定した必要修正まで統合する。
- Issue #117、PR2 / PR4 / PR5、各Skill契約、Codex標準Runtime、Agentic QA、Native helperを確認し、実装者がfixtureや判定方法を追加設計せず着手できる状態へ確定する。
- このRunでは実装、PR作成、Issue更新を行わない。

## 対象範囲

- 対象: 固定5 Workflow case、same-thread handoff、Artifact reuse、OTel観測、repair structured output、Case A/C/D固定fixture、Case B source-free QA / Runtime lifecycle、Case E Doctor gate。
- 対象外: Skill semantics変更、Product codeの恒久変更、追加Workflow case、独自Agent Runtime / Session Manager / Workflow Engine / trust manager、Required CI化。

## 確定した設計

- handoffはCodex標準`codex exec resume <thread_id>`を使う。
- Case Bではsame threadのままQA rootからsource workspaceへcwdを切り替える。installed Codexで成立しなければrunを`blocked`にする。
- Artifact reuseはfresh session / fresh workspaceで必要Artifactだけを渡す。
- `multiple_skills`はADR-0025どおり`unobservable`。single wrong canonical SkillだけFAIL。
- repairは既存Iteration Model 9 fieldを共通`--output-schema`で取得し、期待decisionをschemaへ埋め込まない。
- Case Aはstatus fixture、trial回帰、code-review Finding prerequisiteまで固定する。
- Case Bは`CHALLENGE-BASIC-001`をdeterministic fixtureとして使い、QAはsource-free Gray-box、repairはpatched source workspaceで実行する。QA Runtimeとrepair後Runtimeはrunnerがbuild / start / stopする。
- Case Bの`not_executed`は外部Browser capability不足だけに限定し、fixture / build / sanity不整合はFAILまたはrun `blocked`。
- Case Cはconfig / protected-data / validatorを固定し、安全なconfig repair後にdestructive deletionだけが残る状態で`stop_unsafe`を評価する。
- Case Dはstate / validatorを固定し、bounded repair後も同一failureが残る状態で`stop_no_progress`を評価する。
- Case EはHost preflightをWindows / PowerShell / helper存在へ限定し、Node / Java / SDK / deviceは実際のDoctorへ判定させる。
- Native command EvidenceはCodex標準JSONLの`command_execution`を使う。
- run-level `completed | blocked`とcase / Workflow stateを分離する。

## 実装前に確認する事項

- latest `main`取り込み後のmaterial drift。
- installed Codexでresume / cwd切替 / OTel / structured output / actual write / `command_execution`取得が成立すること。
- Browser / Playwright localhost capability。
- Windows / PowerShell Native helper起動能力。

## 完了条件

- canonical Planへ上記設計が反映されている。
- Plan-only `PLAN.md` / `TASKS.md` / `REPORT.md`がcanonical Planと整合している。
- 旧4-field repair schema、Case Aの抽象的回帰、Case Bのsource-visible QA /曖昧Runtime lifecycle、Case C/Dの未確定fixture、広すぎるNative preflightが残っていない。
- 実装、PR作成、Issue更新へ進んでいない。
