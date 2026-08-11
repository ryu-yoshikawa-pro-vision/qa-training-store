# Tasks

## Now

- [x] 1. 貼り付けテキスト、AGENTS、PROJECT_CONTEXT、最近のADR/Run、PLANS、CODE_REVIEW、対象Planを全文確認する
- [x] 2. strict Runを初期化し、Run ArtifactのPLAN/TASKS/REPORT/run.jsonを準備する
- [x] 3. Wave 0: Start Gate、git履歴、Package/CI/Native/Curriculum/QA/Run schema、固定Path、Tool/Runtime境界をRebaselineする
- [x] 4. Wave 0: project-scoped read-only subagent調査を回収し、採用判断とSafe Change Surfaceを確定する
- [x] 5. Wave 1: Product Behavior inventoryと `document stale | implementation deviation | unresolved specification` 分類を完了する
- [x] 6. Wave 2: `docs/spec/**` Normative/Supporting Specification SystemとExecutable Canonical Source責務を実装する
- [x] 7. Wave 3: Required 5 Sections、BR/AC、Related BR、Coverage、Change Processのexact grammarを実装する
- [x] 8. Wave 4: Markdownから決定的Static HTMLを生成する `build:spec` とGeneratorテストを実装する
- [x] 9. Wave 5: Spec/Link/Reference/Contract/Mode/Coverage/Cross-file/Revision/Impact Validatorと `validate:spec` を実装する
- [x] 10. Wave 5: 既存 `verify` と適切なCI JobへSpec validation、HTML build、HTML artifactを統合する
- [x] 11. Wave 6: `QA_AGENT.md`、exploratory-qa Skill、Workflow、Normal/Gray-box Charter、Snapshot、Finding Contractを実装する
- [x] 12. Wave 7: Basic/Intermediate/Advanced Challenge、Answer Key、Tool Profile、Patch、Learner Bundleを実装する
- [x] 13. Wave 7: Benchmark Revision/Identity、isolated root、Fresh Session、Positive Allowlist、Forbidden Probe、Runner/Evaluator分離を実装する
- [x] 14. Wave 7: Matching/Classification/Scoring、invalid_reasons、Environment Blocker、Unexpected Finding Fresh Re-runを実装する
- [x] 15. Wave 7: 少なくとも1 ChallengeでPreparation→Sanity→Patch→Bundle→Probe→Runner→Frozen Findings→Evaluator E2Eを完走する
- [x] 16. Wave 8: CurriculumをCurrent Specification/Agentic QA/Native CI契約へ同期する
- [x] 17. Wave 9: README/Guide/PROJECT_CONTEXT/ADR/Existing Testの責務を整理し、必要なLiving Documentation履歴を残す
- [x] 18. Wave 10: Spec/Generator/Contract/Challenge/Evaluation/IsolationのFocused testsと機械検証を実行する
- [x] 19. Wave 10: Full local validation（format/lint/typecheck/e2e/a11y/mobile/verify）を実行し、失敗は原因調査・bounded repairする（verifyは既存baseline format blockerでfail-close）
- [x] 20. Runtime Validation: Web Normal Agentic QA、Generated HTML Human review、可能ならAndroid Native Agentic QAを実施する（Web/HTML/Android Native Agentic Dry Run完了）
- [x] 21. Final: Scope差分、Product Behavior、Patch isolation、Machine Contract、Run Artifact Sanitizer、全Blockerを監査する
- [x] 22. Final: Run report/evaluation/manifestを完成し、Final DoDをfail-close判定してGoalを完了またはblockedに更新する
- [x] 23. Repair Loop iteration 2: ユーザー承認済みの既存84件formatter baselineを修復し、`pnpm run verify`を再実行する

## Discovered

- [x] D1. `docs/reference/run-artifacts.md` の実在しない `spec/evaluation.schema.json` 参照を、既存Run schemaの責務整理で同期する
- [x] D2. Evaluator CLIのBenchmark Identity／Runner Profile期待値未接続を修正し、Manifest／Evaluationの契約検証を追加する
- [x] D3. Candidateのreview_needed、Non-defect Item-specific Evidence、Positive Tool Allowlist、Evaluator別Sessionの欠落を修正する
- [x] D4. Normal／Gray-boxのbefore／after Working Tree Snapshot、追加Source差分0 comparison、Zod validator参照を実装する
- [x] D5. Changed BR／AC・直接参照Normative fileからAffected Challenge IDを出すReview Summaryを既存CI Jobへ接続する

## Blocked

### B1. Full verify の既存フォーマットベースライン（Resolved）

- Record ID: B1
- Round: Wave 10 / final local validation
- Query: `pnpm run verify` は PASS か
- Source: `pnpm run verify` と `pnpm run format:check`
- Supports/Refutes: Refutes full PASS。`format:check` が既存 tracked file 84件で停止した。今回の追加・変更ファイルは targeted Prettier check PASS。
- Confidence: high
- Decision: Final DoDはfail-close。既存84件を無関係な大規模再整形で変更しない。
- Rationale: 変更差分との因果関係を `git diff --name-only` と targeted check で分離した。
- Re-audit (2026-08-10 09:58 JST): `prettier --list-different` 84件の全件が既存tracked file、今回変更trackedとの交差0、新規fileとの交差0。今回変更起因ではないことを確認した。
- Open Issues: 既存84件のベースライン整形を別作業で扱う必要がある。
- Next Action: Ownerがbaseline formatter repairを承認した場合のみ、対象84件を別Runで整形して `verify` を再実行する。
- Resolution (2026-08-10 12:15 JST): ユーザー承認を受け、実行開始時点の`prettier --list-different`が返した既存84件をPrettierで整形した。再監査はexit 0・残件0。`pnpm run verify`も全工程をPASSし、B1は解消した。GitのLF正規化により意味のある差分は発生していないが、作業ツリーはPrettier準拠のLF状態になっている。

### B2. Android Native Agentic capability（Resolved）

- Record ID: B2
- Round: Runtime Validation
- Query: Android物理端末でAgentic QAを実行できるか
- Source: `pnpm run native:android:doctor`、Native Runbook、利用可能Tool一覧
- Supports/Refutes: 初回監査ではDoctor PASSのみでMaestro MCP capability不足だったが、再監査でMaestro MCPの実機Fresh sessionを取得し、Agentic Dry Runを実行できた。
- Confidence: high
- Decision: Required Native Agentic Dry RunはPASSとしてB2を解消する。Maestro Regression PASSを代用した判定ではない。
- Rationale: `native-test-control.yaml` と `native-storefront.yaml` をMaestro MCPで実行し、Hierarchy／Screenshotのruntime evidenceを取得したため。
- Open Issues: Native full Runtime/Boundary Suiteは今回のDry Runの範囲外で未実行。必要なら別AttemptでRunbook順に実施する。
- Next Action: Native Runtime/Boundary full Suiteが別途必要なら、Runbook順の新Attemptで実施する。今回のFinal判定はB1/B3を継続監査する。
- Resolution (2026-08-10 09:50 JST): Maestro MCPの実機Fresh sessionで`native-test-control.yaml`（8 commands）と`native-storefront.yaml`（28 commands）をPASS。Hierarchy／screenshotで`Native test runtime ready`、Product detail、Cart追加メッセージを確認した。B2は解消し、Native Agentic QAの未実施扱いは解除する。ただしRuntime/Boundary全Suiteの実行結果を意味しない。

### B3. Required Remote CI（Resolved）

- Record ID: B3
- Round: Final DoD
- Query: Required GitHub Actionsが成功したか
- Source: Plan Final DoD、Git status、ユーザーのGit mutation禁止
- Supports/Refutes: 未実行。現在の作業treeをpush/PR化できないため、Remote CIの成功を確認できない。
- Confidence: high
- Decision: Required CIはPASS扱いしない。
- Rationale: GitHub Actionsの実行には外部状態変更または既存CI run参照が必要で、本Runの権限・指示範囲にない。
- Re-audit (2026-08-10 09:58 JST): GitHub connector read-only確認でrepository default branchは`main`、current HEAD `b281b878...`のworkflow runs/statusesは空、current implementation branchのremote refも存在しない。
- Open Issues: Remote CI resultが無い。
- Next Action: Ownerが変更を適切なImplementation branchへ公開した後、Required CI結果を取得する。
- Resolution (2026-08-10 12:22 JST): GitHub connector read-onlyでHEAD `4f943ff28363718b06a62eacc00d248913a06422`のPhase 1 CI run `31350967334`とNative CI run `31350967422`がcompleted/success。Native CIの全10 jobs（Android Runtime / Maestro、iOS Automation／Production-validation Build、Native verifyを含む）もsuccessで、B3を解消した。
