# Plan（計画）

## Objective（目的）

- 講師なしで開始、実施、評価、失敗回復、修了、次Lessonへの引き渡しができるカリキュラムへ改善する計画を作成する。
- 今後の複雑なtaskで、ユーザーが毎回明示しなくてもParent Agentが複数Agentを適切に活用できる運用計画を作成する。

## Scope（対象範囲）

- In:
  - 17 canonical LessonのInput / Activity / Output / DoD / Feedback / Recovery / Handoff。
  - P1-2〜P1-6の`TARGET-CART-101` / `RISK-CART-101` / `TC-CART-101`縦断、受講者向け修了確認、Part 2自走導線。
  - AC単位の不足テスト、Traceability、コメントの構造化。
  - Agent routing matrix、Work Package、lifecycle、Run記録、read-only / worker / quality gate責務。
- Out:
  - Product behavior、Normative Specification、LMS、learner-state DB、AI grader。
  - Product Formal RegressionへのTraining test混在。
  - 実装、merge、Agent permission / sandbox / wrapperのL3変更。なお、本Runで許可されたPlan／Run Artifact差分のcommit／pushは、検証後に実施する。

## Assumptions（仮定）

- P1-3は学習者がCaseを作成し、P1-4は導入Case、P1-5はP1-3のCaseを使う。
- 既存`TC-CART-001/002`は提供参照例、`TC-PRODUCT-001`はTraining-onlyの提供Case、`TC-CART-101`は学習者所有の縦断Caseとする。
- CommonはWeb中心、Native / Physical Android / iOSは選択課程とする既存契約を維持する。
- Common課程はローカルで完了可能にし、Part 2は自己学習開始前に運営側または既存の教材提供手順が準備したGitHub上のTraining Copyを学習者が操作して、branch／commit／push／PR／GitHub Actions／Run／Check／Artifact確認まで進める課程とする。ForkはGit／GitHub基礎学習のP2-01〜P2-03だけで利用でき、C12／Training CI／Part 2最終修了の代替にはしない。学習者へrepository作成・管理権限やworkflow権限変更を要求しない。
- 非コード成果物は既存Workbookの4 CSVを正本とし、編集場所は自由にするが、Part 1からPart 2最終確認まで固定`handoff-root/`を評価正本として使う。Training Copyへは実行に必要なWorkbook、Repository相対パスを保った学習者コード、必要なテキスト成果だけをmaterializeし、Trace等のEvidence／Receipt／self-checkを別正本として複製しない。
- ローカルとGitHub ActionsのExecution Receiptはrun全体／case／Retryを分けた共通JSON形式とし、Part 1の任意`part1_distribution_sha`（既存入力名が`source_sha`の場合を含む）、`training_copy_source_sha`、`submission_sha`、`ci_sha`／`execution_sha`を分離する。Pull Request／Run ID／Artifact URLなどのCI固有情報は機械情報と人間可読Evidenceへ分ける。
- Agentは学習者向けカリキュラムの必須設定ではなく、既存リポジトリの`AGENTS.md`、`.codex/agents/`、`.codex/config.toml`、Harnessを引き継いで利用する。Agent設定値は変更しない。
- Part 2のGitHub上のTraining Copy repositoryは、自己学習開始前に運営側または既存の教材提供手順が準備する。`training:copy:prepare`は指定した正式な`training_copy_source_sha`のローカル作業コピーを作る既存処理であり、GitHub repositoryの作成・管理を学習者へ移さない。materializeは固定Handoff rootのWorkbook／Repository相対コード等をこの準備済みTraining Copyへ配置する。
- 既存のPR 4Aは完了済み、PR 5は詳細子Planとして再利用する。
- 複数Agentの活用は「常に最大数」ではなく、独立作業の並列化とParentの判断材料の増加を意味する。

## Questions / Ambiguity（質問・曖昧性）

- 今回確定した方針:
  - Q1: Workbookの評価intakeは固定`handoff-root/`方式とする。編集場所は自由だが、完了時は固定rootの4 CSV、Repository相対コード、Evidence参照、Execution Receipt、Lesson ID別self-checkを正本として渡す。Training Copy側へPart 1のEvidence／Receipt／self-checkを複製しない。
  - Q2: ローカルとCIのExecution Receiptはrun全体／case／Retryを分けた共通JSON形式とする。CI固有のRun／Check／Artifact情報は機械情報と人間可読Evidenceへ分離し、Completion Receiptは`receipts/`外へ出す。
  - Q3: Agent設定は既存リポジトリから継承し、学習者へ要求しない。permission / sandbox / wrapper / model / thread変更は行わない。運用文書の補足が必要な場合も、既存のL2契約に従う。
- 仮定してよい細部:
  - 現行5役を当面再利用し、新Agentは追加しない。
  - workerの並列writeはIsolation実証まで行わず、原則直列とする。
  - `max_threads = 4`を超える設定変更は行わない。
- 未回答の重要質問: なし。技術的な不透明点はWave 0の検証結果により、該当Waveの開始可否を判断する。

## Hypotheses（仮説）

- H1: 問題の中心はTest Caseの不存在ではなく、Input / Output / Handoff / 自己判定の契約不足である。
- H2: 既存5役と現在のRun / Hook契約で、routing文書と実Run検証を先に整備すれば、Agent数を増やさずに複数Agentを標準利用できる。

## Research Plan（調査計画）

- Round 1 Query:
  - Curriculum researcher: P1-2〜P1-6と全Lessonの成果物・Handoff。
  - Test researcher: 受講者向け修了確認、Training、CI、Evidence、契約テスト。
  - Agent operations researcher: config、role、Run、routing、close lifecycle。
  - Round 2 Query:
  - Round 1修正後の17 Lesson / Workbook、受講者向け修了確認／CI／Test、Wave / Run / Agent契約を狭い範囲で再レビューする。
  - current `main`のvalidator、package script、Run契約へ再照合する。結果がtimeoutした委譲はPASS扱いせず、親Agentのevidenceで補完する。
- Exit Criteria:
  - 主要仮説ごとに支持根拠がある。
  - 実装Wave、exact target、validation、stop conditionがある。
  - Owner判断と技術的Unknownが分離されている。

## Delegation plan（委譲計画）

- 今回は独立した3軸を2〜3名のread-only Agentへ分担する。
- researcherはファイルを変更せず、根拠・行番号・unknown・validationを返す。
- Parentは要件、scope、Plan、結果統合、completionを保持する。
- ParentはAgentをspawnした後も非重複の作業を継続し、completion notificationまたは非ブロッキングjoinで結果を管理する。
- 調査・レビューAgentは指定scopeの確認と結果返却まで自然終了を待ち、経過時間だけでinterrupt / closeしない。
- テスト・ビルド・lint等のコマンド実行Agentは、自身のコマンド単位timeoutを管理し、status、command、exit code、timeout理由を報告する。
- Parentは困っている子Agentへ助言し、独立した未確認観点がある場合だけ異なるscopeの追加Agentを派遣する。正常終了または明示中止のAgentはjoin後にcloseする。
- 実装時はPlan確定後に`implementation_worker`を原則1体だけ起動し、最後に`quality_gate_runner`を使う。

## Approach（進め方）

1. 既存PlanとCurrent `main`を再Baselineし、Owner gateと保護Pathを固定する。
2. Lesson共通契約、Workbook schema、評価intake、Agent Work Packageを確定する。
3. P1-2〜P1-6を`TC-CART-101`で縦断パイロットにする。
4. 残り12 LessonへInput / Output / DoD / Recovery / Handoffを展開する。
5. 受講者向け修了確認、ACテスト、Part 2自走導線を実装する。
6. Agent routingをAGENTS / Harness / Plan templateへ接続し、実Runで検証する。
7. Local / CI quality gate、既存Failure、Run Artifactを確認する。

標準フロー: `classify -> scope -> parallel research -> Parent non-blocking work -> completion notification / join -> advice or additional dispatch if needed -> Parent synthesis -> scoped implementation -> Parent review -> quality gate -> report`

## Definition of Done（完了条件）

- 計画本体が`docs/plans/2026-09-15_213247_self-study-agent-orchestration.md`へ保存されている。
- 実装Wave、対象範囲、依存、検証、リスク、停止条件、Owner判断が計画に含まれる。
- 講師なし自己学習の修了条件と、複数Agentの標準routingが別責務として定義されている。
- 17 Lesson監査表、変更対象（write set）、Wave dependency、rollback、受講者向け修了確認のstatus／exit code、Part 2の自己実行経路が相互に矛盾しない。
- 今回はimplementationを開始していない。

## Risks / Unknowns（リスク・未知点）

- Part 2のGitHub準備ができないとPart 2を開始できない。Commonのローカル完了とは分離し、PreflightとEnvironment blockを明示する。
- 受講者向け修了確認を強くしすぎると自由な学習成果を拒否する。必須概念とEvidenceだけに対象を限定して検査する。
- Agent routingを強制しすぎると軽微なtaskに過剰コストが発生する。規模・不確実性・独立観点で起動を判断する。
- `max_threads`、recursive delegation、read-only変更検知の実効性は実Runで確認する。
- 全`test:contracts`が現環境でtimeoutしたため、対象contract fileの限定実行とfirst failure分類を別Evidenceとして扱う。
- `wait_agent(timeout_ms)`のtimeoutは親のjoin呼び出しの終了であり、子Agentのtimeoutやcloseではない。調査は自然終了まで維持し、コマンド実行のtimeoutは子Agentが管理する。Run終了・安全上の異常だけをwatchdogの停止条件とする。
- コマンド単位timeoutの具体値・process tree停止方法、watchdogの実装主体・発火条件・証跡保存先、同時実行枠が満杯のときの追加派遣方法は、Wave 0で確定する。確定できない場合は該当Waveを開始しない。
- G3では、親のjoin timeout後の調査自然終了、childのcommand timeout、Parentの助言・独立scope追加派遣、遅延結果の二重集約防止、closeの一回性、read-only / scope / recursive delegationのnegative caseを検証する。これらのfixture実装は未着手である。

## Thinking Log（判断記録）

- 既存のPR 5 Planを再利用し、Training runner / Artifact契約の重複定義を避ける。
- Agent設定をすぐ変更せず、まずAGENTS / Harnessのrouting契約と実Run Evidenceを整備する。
- 「複数Agentをフル活用」は、全taskで最大数を起動する意味ではなく、独立した調査を並列化し、writeと最終判断をParentが管理する意味とした。
- Round 1で検出されたPlan契約不足を修正し、Round 2の委譲timeoutは成功扱いにせず、親Agentの静的監査と個別validatorで補完する方針を採用した。
- 今回のOwner確認により、Workbook評価intakeは固定`handoff-root/`、local / CI Execution Receiptはrun／case／Retryを分けた共通JSON、Agentは既存リポジトリから継承して設定変更なしとした。編集場所は自由だが、Training Copyは実行環境であり評価正本にはしない。
- 今後のAgent運用では、親Agentは要件・scope・結果統合・完了判定を保持し、実作業は子Agentへ委譲する。調査の経過時間で打ち切らず、子Agentのコマンドtimeout、Parentの助言・追加派遣、正常終了後のcloseを標準とする。

## 2026-09-16 PR #157残存指摘対応

- 今回の対象は、Planインデックスと詳細1〜5、および本Runの`PLAN.md`／`TASKS.md`／`REPORT.md`に限定する。教材本文、Workbook、Training実装・テスト・workflow、Hook、Agent設定、Harness、package、script、Product／Specは変更しない。
- ForkはGit／GitHub基礎学習（P2-01〜P2-03）に限って利用できる。C12を含むTraining CIとPart 2最終修了は、正式な`training_copy_source_sha`をHEADへ固定したTraining Copyを正式経路とし、Fork上のRun／Check／Artifactを同等の修了証跡へ読み替えない。Training Copy／権限などの環境が用意できない場合は、該当するC12／Training CI以降をBLOCKEDとする。環境は用意できているが必要な実行をまだ行っていない場合だけNOT_RUNとする。
- 引き渡しは固定`handoff-root/`と既存4 CSV、Repository相対パスを保った学習者コード、Evidence、Execution Receipt、Lesson ID別self-checkで成立させる。Training Copyは実行環境であり評価正本ではない。新しいJSON Manifest、対応表、sidecar metadata、独自Evidence URI、採点用Manifestは追加しない。ケース対応は既存のTest Case ID、Workbookの`implementation_path`、Playwrightのtitle／annotation／metadata、Receiptの`case_id`等から解決し、安定した対応が作れない場合は新基盤を追加せずT1／T2を停止する。
- ローカルの受講者向け修了確認は、構造・成果物・実行記録・Evidence参照・記録したGitHub参照の形式／対応を確認する。GitHub API／Tokenなしでは、Runの実在、最終`success`、Check結論、Artifactの現在の存在、別Runでないことを独立証明したとは扱わない。
- 実装は開始せず、既存契約と矛盾しないことを検証した後、許可されたPlan／Run差分のみcommit／pushする。既存PR #157の最新headと必須CIを確認する。
- Execution Receiptの正式入口は`training:web:exercise:with-receipt`とし、既存Desktop／Mobileの直接実行を薄く呼び出してrun／case／Retryの実行事実と、そのrunのEvidenceを固定Handoff rootへ保存する。`training:completion:check`は再実行・Receipt生成を行わず構造確認だけを担う。
- 正式入口は`--suite exercise|diagnostic`、`--project`、`--run-context`、`--root`を受け、C09のdiagnostic initial／repairedも同じ入口で別runとしてReceipt／Evidenceを生成する。Training CIのlearner exercise stepは正式入口を1回だけ実行し、既存の直接exerciseを同じjobで重ねない。materializeの入口は`corepack pnpm run training:copy:materialize -- --root <handoff-root> --target <training-copy>`とする。
- `training:copy:validate`はprepare直後と、HEADが`training_copy_source_sha`のままのmaterialize直後だけに適用する。学習者commit後／CI後は`submission_sha`／`ci_sha`／`execution_sha`、変更範囲、Run／Check／Artifactを別に確認する。
- C09のdiagnostic initial Failureとdiagnostic repaired Pass、expected-failure教材の期待された非0終了はcontext別期待結果として扱い、必要な最終成功ケースのFailureだけを通常のFAILとする。Completion状態はPASS／INCOMPLETE／FAIL／BLOCKED／NOT_RUNを固定し、環境・権限・Runner等の不足はBLOCKED、環境が利用可能なのに必要な実行が未実施の場合はNOT_RUNとする。self-checkは`self-check/<既存Lesson ID>.md`で識別する。
- 既存`validate:curriculum`はリポジトリ側`training/workbook/`を検証し、T1は固定Handoff rootの`workbook/`を直接検証する。既存`.gitignore`、materialize後の`git status`、出力配置をT2で確認し、Trace等をcommitしない最小手段を選ぶ。GitHub上のTraining Copy URLは事前準備済みのpush先であり、学習者へrepository作成・管理を要求しない。
