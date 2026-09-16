# 講師なし自己学習化とAgent協働運用の統合計画

## Status

- 状態: **Plan only / implementation not started**
- 作成日: 2026-09-15 JST
- このPlanは、直前の自己学習レビューで確定した課題と、今後の複数Agent活用をRepositoryの標準運用へ組み込むための統合Planである。
- 既存の`2026-09-05_pr4a_curriculum_self_study_remediation.md`は完了済みの履歴として維持する。
- `2026-09-05_pr5_training_baseline_exercise_artifact_evidence.md`はTraining実行入口・Artifact境界の詳細な子Planとして再利用し、本Planで同じ仕様を重複定義しない。
- 本Planの作成では、製品コード、テストコード、カリキュラム本文、Agent設定を変更しない。

- 分割後の正本はこのファイルをインデックスとし、本文契約は下表の詳細ファイルに分散して保持する。
- 分割前基準: 824行、SHA-256 `5B52C08A3453E44D73C7F14A0EF02B930BFD29AAF59716BECC314B6A8DBFCCF8`。分割後の内容保持検証にのみ使用する。
- 今回はPlan文書だけを変更し、製品コード、テストコード、カリキュラム本文、Agent設定、GitHub metadataは変更しない。

## 0. 依頼概要

### 依頼内容

- このPlanの目的は、講師なしで受講者がInput確認、実施、結果解釈、Failureからの復帰、完了判定、次LessonへのHandoffまで進められる状態を設計することである。
- Test Caseが前Lessonで作成される場合は、次LessonのInputとして作成元・識別子・完成状態を表示する。Playwright実装には、提供Caseまたは前Lessonで作成した学習者Caseを明示的なInputとして渡す。
- 複数Agentは、タスクの性質に応じて独立した調査・検証を並列化するために活用し、Parentが結果を統合して最終判断する。

### 分割後の読み方

- 17 LessonのInput / Activity / Output / Self-check / DoD / Feedback / Recovery / Handoff、Workbookと評価intake、確定方針は[詳細1](2026-09-15_213247_self-study-agent-orchestration/01-context-and-lesson-contract.md)に収録する。
- 影響範囲、保護対象、Waveの依存関係とwrite setは[詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md)に収録する。
- 受講者向け修了確認、Local / GitHub ActionsのReceipt、Part 2自走導線は[詳細3](2026-09-15_213247_self-study-agent-orchestration/03-completion-and-github-actions.md)に収録する。
- AC / Test target matrix、Agent実Run、最終検証コマンドは[詳細4](2026-09-15_213247_self-study-agent-orchestration/04-tests-and-validation.md)に収録する。
- リスク、停止条件、成果物、実装時のWave別成果物、備考は[詳細5](2026-09-15_213247_self-study-agent-orchestration/05-risks-deliverables-and-notes.md)に収録する。
- 詳細ファイルは独立したPlanではなく、このインデックスから参照される分割本文である。詳細側からもこのファイルへ戻れる。

## 1. ゴール / 完了条件

### 1.1 ゴール

- 受講者が「何を準備し、何を作り、何を見て、何ができれば完了か」をLessonごとに判断できる学習ループを完成させる。
- Common課程はローカルで完了可能にし、Part 2ではGitHub Actionsを準備されたWorkflowと手順で利用可能にする。Native / iOSは選択課程として分離する。

### 1.2 実装完了時のDoD

- 17 LessonのInput / Activity / Output / DoD / Feedback / Recovery / Handoffが、監査表と各本文の対応付きで読める。
- `TC-CART-101`を中心に、Test Case、Playwright実装、Failure / Recovery、Workbook、Local receipt、必要なCI receiptを縦断追跡できる。
- Stock / baseline PASSと学習者所有のAssertion・差分・Evidenceを分離し、修了状態をPASS / INCOMPLETE / BLOCKED / FAIL / NOT_RUNで扱える。
- GitHub Actionsを使うPart 2はAccount、Fork / Training Copy、Permission、Actions実行、Artifact確認まで自己開始できる。
- Agent routing、出力契約、並列化、親の非ブロッキング管理、調査Agentの自然終了、子Agentのコマンド単位timeout、助言・追加派遣、join / close、Run記録が既存のRepository契約へ接続される。

### 1.3 Plan自体の完了条件

- 実装Wave、対象ファイル、検証、停止条件、Owner判断、17 Lesson監査表、exact write set、rollback境界が相互に矛盾しない。
- 分割後に、分割前本文の全セクションが詳細ファイルへ保持され、リンクと既存Plan validatorが通る。

## 2. 現状理解と前提

### 2.1 確認済みの事実

- 既存のcanonical Lesson、Workbook、Rubric、Training入口、既存Test / CI / Agent契約を基準にする。
- 現状はLessonごとのInput / Output / Handoff、学習者Caseとstock PASSの分離、Part 2の講師なし開始導線、Agentの標準routingが不足している。
- 用語の定義、Repository mapping、17 Lesson監査表、Workbookスキーマ境界は詳細1を正本とする。

### 2.2 分割構造と正本関係

- 既存のPlanファイル名と保存場所は変更しないため、`PLANS.md`、active Run、既存参照はインデックスを指し続ける。
- 詳細ファイルはこのPlanの一部であり、新しい独立Planや新しいSSOTを作らない。
- 既存PR 4A / Master Plan / Rubric、PR 5 Plan、Workbook、Spec、Run / Safety契約の正本関係は変更しない。

### 2.3 確定方針の要約

- 正式名称は「受講者向け修了確認」とする。GitHub Actionsはそれ自体ではなく、テストや修了確認をGitHub上で実行するCI基盤である。
- 非コード成果物は既存WorkbookのCSV（Test Case、Target / Risk、Automation Mapping、Execution / Improvement）等とし、既存Workbookを成果物の正本にする。
- Workbookの編集場所は一律に縛らない。ただし評価時のExport / Handoff intakeは一つの契約へ集約し、コード・CIが直接読むものの保存場所は既存契約に従う。
- Agentはカリキュラム上の学習者設定ではなく、Codex側の開発・運用Agentを指す。既存の`AGENTS.md`、`.codex/agents/`、`.codex/config.toml`、Harness契約を継承し、Agent設定変更や学習者へのAgent設定要求は行わない。

## 3. 質問 / 曖昧性

### 3.1 今回確定した方針

- Common課程はローカル完了、Part 2はGitHub Actionsを利用可能にする、Native / iOSは選択課程とする。
- 受講者向け修了確認とGitHub Actionsの責務を分離する。
- Workbookは自由なworking locationを許容し、評価時のHandoff bundle / intakeで受け取る。格納先を一律に縛らない。
- AgentはCodex側の既存Agentを必要な作業で引き継ぎ、permission / sandbox / wrapper / model / threadを変更しない。

### 3.2 分割に関する扱い

- 重要な仕様の本文は詳細ファイルへ移したが、要約だけで置き換えていない。分割前の各セクションをそのまま保持し、インデックスは探索入口とする。
- 実装開始前に詳細ファイルを個別に読み、必要な範囲だけをWork Packageへ割り当てる。

## 4. 影響範囲

### 4.0 確認対象ファイル

- 実装対象の一覧、保護対象、既存正本との関係は[詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md)に集約する。
- 今回の分割で変更するファイルは、このインデックスと5つの詳細ファイルだけである。

### 4.1 学習・成果物

- 対象は17 canonical Lesson、Workbook、Training専用資材、受講者向け修了確認、評価intakeである。
- LessonごとにInputの出所（provided / previous lesson / learner-created / environment）、Output、Evidence、Handoff、自由なworking locationと固定intakeを区別する。

### 4.2 Training / Test / CI

- Training baseline / exercise / diagnostic / expected-failure、Workbook Trace、Local receipt、Part 2のCopy / GitHub Actions、AC target testを対象にする。
- Product code、Formal Regression、Production Workflowは、必要性・承認・rollbackが別途ない限り保護する。

### 4.3 Agent協働運用

- G1 / G2で標準routingとRun接続を設計し、G3で実Runを検証する。既存のAgent設定そのものは変更しない。

## 5. 変更方針

### 5.0 Wave構成

| Wave | 目的 | 詳細 |
| --- | --- | --- |
| W0 / Wave 0 | 再Baseline、既存Plan統合、保護Path固定 | [詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md) |
| G1 / G2 | Agent routing、Work Package、Run接続 | [詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md) |
| L1 / L2 / L3 | Lesson共通契約、P1縦断、全17 Lesson展開 | [詳細2](2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md) |
| T1 / T2 | 受講者向け修了確認、Part 2のGitHub Actions自走 | [詳細3](2026-09-15_213247_self-study-agent-orchestration/03-completion-and-github-actions.md) |
| C1 | ACとテスト実装の不足を埋める | [詳細4](2026-09-15_213247_self-study-agent-orchestration/04-tests-and-validation.md) |
| G3 / V1 | Agent実Run、最終検証、既存Failure分類 | [詳細4](2026-09-15_213247_self-study-agent-orchestration/04-tests-and-validation.md) |

### 5.1 Wave共通の実行契約

- 各WaveのOwner、Dependency、read set、exact write set、禁止範囲、entry / exit gate、Evidence、Rollback、停止条件を詳細2〜4で維持する。
- WaveはW0 → G1 / G2 → L1 / L2 / L3 → T1 / T2 / C1 → G3 / V1の依存順で進め、技術的な安全確認が未実施のまま実装を開始しない。

### 5.2 完了確認・テスト・Agentの関係

- 受講者向け修了確認は、必須成果物・実行結果・Evidenceに対象を限定した確認であり、理解そのものを自動保証しない。
- C1はACとTest targetの対応、重要な未検証条件、コメントの必要性、既存Formal / Training境界を扱う。
- G3は複数Agentの起動数ではなく、親の非ブロッキング管理、調査Agentの自然終了、コマンドAgentのtimeout報告、助言・追加派遣、独立性、scope attribution、結果Evidence、close lifecycle、Parent統合を検証する。

## 6. 検証方法

### 6.1 分割後に追加した確認

1. 分割前Planの実ファイルを行範囲で取得し、SHA-256、行数、見出し数、17 Lesson行、Wave数を基準化する。
2. 詳細ファイルに分割前の各セクションブロックが存在することを比較する。特に17 Lesson監査表、確定方針、`TC-CART-101`、`TARGET-CART-101`、`RISK-CART-101`、AC matrix、全Wave、検証コマンド、停止条件を確認する。
3. インデックスと詳細ファイルの相対リンクの実在性を確認し、各詳細からインデックスへ戻れることを確認する。
4. Plan validator、Markdown lint、既存のカリキュラムvalidator、必要なContract testを実行し、今回の分割で実装未着手の状態が変わっていないことを確認する。

### 6.2 既存Planの検証

- Plan validatorの対象は既存パスのインデックスである。詳細ファイルはインデックスから到達できる本文としてリンク検査する。
- 検証結果の詳細と実行時刻はactive Run REPORTへ追記する。

### 6.3 成功判定

- 内容保持比較が全セクションでPASS、リンク切れ0件、Plan validator `valid: true`、Markdown lint 0 issuesであること。
- 既存のカリキュラム・Training・Contractの検証は、今回のPlan分割自体が実装を開始していないことを前提に、既存baselineと同じ結果または既知の環境状態として記録する。
- Agent運用では、`wait_agent`のtimeoutを子Agentのtimeoutと誤分類せず、親の非ブロッキング管理、自然終了、子Agentのコマンドtimeout、助言・追加派遣、closeを確認する。
- 子Agent / commandの`TIMEOUT`等の観測statusは、Run manifestの正式enumへ原因を失わず対応付け、遅延結果の二重集約や結果なしのPASS化を許さない。G3の自然終了、追加派遣、close一回性、read-only / scope / recursive delegationのnegative caseを実Runで検証する。

## 7. リスクと未解決論点

### リスク

- 詳細ファイルの一部だけが読まれ、依存関係や停止条件が見落とされる可能性がある。インデックスの章別リンクと実装前の読み合わせで防ぐ。
- 詳細ファイルを独立Planと誤認する可能性がある。冒頭の戻りリンクと「分割本文」の明記、既存Planパス維持で防ぐ。
- 分割時の手動コピーで行・表・コマンドが欠落する可能性がある。分割前基準とのセクション比較を必須にする。

### 停止条件

- 分割前の本文ブロックを再現できない、リンクが解決できない、Plan validatorの必須見出しが失われる場合は、Plan分割を完了扱いにしない。
- 今回は製品コード、テストコード、カリキュラム、Agent設定の実装へ進まない。

## 8. 成果物

### 今回作成するもの

- このインデックスファイル（既存パスを維持）。
- 5つの詳細ファイル（前提・契約、影響範囲・Wave、修了確認・GitHub Actions、テスト・検証、リスク・成果物）。
- active Run REPORTへの分割前基準、Agent監査結果、分割後比較、validator / lintのEvidence。

### 実装時に引き継ぐもの

- 詳細ファイルに保持した既存のWave別成果物、exact write set、テスト対象、コマンド、期待結果、rollback、停止条件。
- 実装開始時はこのPlanを読み取り、必要な詳細ファイルをWork Packageへ明示的に割り当てる。

## 9. 備考

- この分割は内容を短縮して破棄するためではなく、探索入口と領域別本文を分けるための構造変更である。
- Planの合意内容、特にCommon / Part 2 / Native・iOS、Workbook intake、修了確認、Agentの扱いは維持する。
- 今回の作業完了後も、実装の承認は別途必要であり、この変更だけでカリキュラムやテストが十分になったとは判定しない。

## 分割ファイル構成

| ファイル | 収録範囲 |
| --- | --- |
| `2026-09-15_213247_self-study-agent-orchestration.md` | Planのインデックス、要約、保存規約上の正本パス |
| `2026-09-15_213247_self-study-agent-orchestration/01-context-and-lesson-contract.md` | 依頼、ゴール、現状理解、Lesson共通契約、17 Lesson監査表、Workbook、確定方針 |
| `2026-09-15_213247_self-study-agent-orchestration/02-scope-and-waves.md` | 影響範囲、保護対象、Wave共通契約、W0、G1 / G2、L1 / L2 / L3 |
| `2026-09-15_213247_self-study-agent-orchestration/03-completion-and-github-actions.md` | T1受講者向け修了確認、T2 Part 2自走導線 |
| `2026-09-15_213247_self-study-agent-orchestration/04-tests-and-validation.md` | C1 AC / Test target、G3 Agent実Run、V1最終検証、コマンド |
| `2026-09-15_213247_self-study-agent-orchestration/05-risks-deliverables-and-notes.md` | リスク、停止条件、成果物、備考 |

## 分割後の内容保持チェック

- 原文の全H2セクション（Status、0〜9）、17 Lesson行、全Wave（5.0〜5.11）、重要ID、検証コマンド、Rollback / 停止条件を、詳細ファイルへ移して保持する。
- 詳細ファイルは原文の節を意味変更なしで収録し、追加した見出し・戻りリンク・インデックス要約はナビゲーション情報として扱う。
- 検証完了条件は、セクション比較PASS、相対リンク0件、Plan validator `valid: true`、Markdown lint 0 issues、既存検証結果の記録である。
