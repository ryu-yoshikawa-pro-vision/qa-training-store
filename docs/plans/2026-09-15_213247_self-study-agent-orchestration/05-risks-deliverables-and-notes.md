# 詳細5：リスク・成果物・備考

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、インデックスから参照するPlan詳細です。収録した既存節の本文は、分割前Planの内容を維持しています。

## 7. リスクと未解決論点

### リスク

- **教材全面rewrite化**: 既存Lessonへ共通枠を追加する際、すべての説明を書き換えず、既存本文の責務をInput / Output / DoDへ接続する。
- **新しいSSOTの増殖**: Case / Seed / Account / workflow literalをコピーせず、Workbook・Spec・既存metadataへリンクする。
- **受講者向け修了確認の誤検出**: 完全一致ではなく、必須Caseとの対応、意味のあるAssertion、実行Receipt、Evidenceの実在性に対象を限定して検査する。
- **外部環境依存**: GitHub ActionsはPart 2の必須環境として準備手順とPermissionを明示し、Commonのローカル完了を阻害しない。Android実機、iOS/macOSは選択課程として分離する。
- **Artifactの期限切れ**: CI ArtifactのRetentionだけに依存せず、Run IDと必要なreceiptをローカル保存する。
- **Agentの過剰利用**: Agent数をKPIにせず、独立作業・時間短縮・Evidence品質で評価する。
- **並列writeの競合**: isolationと変更 attributionを実証できるまでworkerは直列にする。
- **L3変更の混入**: Agent permission、sandbox、wrapper、config変更は文書routingと別Plan / explicit approvalにする。
- **既存Failureの見落とし**: Cross-role、`typecheck:app`、format / lint、Node version差、Contract timeoutを最終検証で再確認する。

### 停止条件

- Product behaviorまたはNormative Specificationの判断が必要になった。
- C07 / C08、Common / Native route、既存Assessment contractを変更しないと成立しない。
- learner成果の判定にDB、AI grader、完全一致答案が必要になった。
- Training exerciseをProduct Formal Regressionへ混在させる必要が出た。
- GitHub / Native環境の問題をSource defectと区別できない。
- Agentのrecursive delegation、read-only、scope、Source Integrityを信頼できるEvidenceで確認できない。
- 既存required validationを弱めないと通らない。

## 8. 成果物

### 今回作成したもの

- `docs/plans/2026-09-15_213247_self-study-agent-orchestration.md`

### 実装時のWave別成果物

| Wave | 作成／更新するexact file | 成果物の完了条件 |
| --- | --- | --- |
| L1 | `docs/curriculum/test-automation/00_learning-design.md`、`docs/curriculum/test-automation/README.md`、`training/workbook/README.md` | 共通Lesson契約、route、Workbook schema、編集場所と評価intakeの境界 |
| L2 | P1-2〜P1-6の5本文、`training/workbook/01_target-risk.csv`〜`04_execution-improvement.csv`、`training/playwright/exercises/training-exercise-starter.spec.ts`、新規`training/playwright/exercises/learner-cart.spec.ts`、`training/playwright/failure-exercises/expected-failure.spec.ts`、`training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts` | `TC-CART-101`のCase → 実装 → Failure → 修正 → Evidenceの縦断 |
| L3 | 17行表のL3-A / L3-Bに列挙した残り12本文 | 全17 LessonのInput / Output / DoD / Recovery / Handoffとroute境界 |
| T1 | `package.json`、`scripts/training/check-completion.ts`、`tests/contracts/training-completion.test.ts`、`training/github-actions/README.md`、`training/github-actions/training-ci.yml`（Native接続時のみ`training-native-ci.yml`） | local / CIのcompletion contract、Receipt、Status、positive / negative fixture |
| T2 | `part2/02_git-version-control.md`〜`part2/05_playwright-ci.md`の4本文、`training/github-actions/README.md`。既存scriptの修正はWave 0で欠陥が確認されOwner承認された場合だけ | Copy準備 → PR → Checks → Artifact → 修了確認の講師なし導線 |
| C1 | `tests/integration/cart-use-cases.test.ts`、`tests/integration/review-user-use-cases.test.ts`、`tests/contracts/training-curriculum.test.ts`、必要なCI contract test | AC matrix、Case、Assertion、Evidenceの対応と既存回帰の維持 |
| G2 | `AGENTS.md`、`docs/reference/codex-implementation-harness.md`、`.codex/templates/PLAN.md`、`scripts/verify` / `scripts/verify.ps1`（Agent設定変更なし。文書変更は既存L2契約に従う） | routing、Work Package、非ブロッキングjoin、子Agentのコマンドtimeout、watchdog、close、Run接続 |

今回のRunで実際に作成した成果物は本Planとactive Run Artifactだけであり、上表の実装成果物はまだ作成しない。`.codex/config.toml`、permission / sandbox / wrapperの変更は上表に含めず、必要なら別L3 Planとする。

## 9. 備考

- 「明示的に複数Agentを使って」と毎回依頼しなくてもよい状態にするには、Agent数を常に最大化するのではなく、Repositoryの`AGENTS.md`にdelegationを判断する既定契約を置き、詳細をHarnessへ集約する必要がある。
- Parentは、要件解釈、作業分解、scope、最終検証、Failure解釈、完了判断を保持する。Agentへ最終責任を移さない。
- 既存5役で当面の要求を満たせるため、最初から新しいAgent roleを追加しない。新roleは既存役割で解けない具体的な反復作業とEvidence契約が確認できた場合だけ追加する。
- 実装は、まずWave W0でSSOTと保護Pathを固定し、G1〜G2のrouting契約、L1〜L2のP1縦断パイロット、L3の全Lesson契約を確定する。その後にT1の受講者向け修了確認、T2のPart 2自走導線、C1のACテスト、G3 / V1へ進む。技術的な安全確認が未実施のまま実装を開始しない。Agent設定は既存リポジトリから継承し、学習者へ要求しない。
