# 詳細4：テスト実装・Agent実Run・最終検証

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、インデックスから参照するPlan詳細です。収録した既存節の本文は、分割前Planの内容を維持しています。

## 収録範囲

### 5.9 Wave C1 — 仕様ACとテスト実装の不足を埋める

**Owner**: Parent + test owner。**Dependency**: W0でSpec / existing testを突合し、L2でCase IDと期待結果を固定すること。**Write set**: `tests/integration/cart-use-cases.test.ts`、`tests/integration/review-user-use-cases.test.ts`、`tests/contracts/training-curriculum.test.ts`、必要な`tests/contracts/ci-workflow.test.ts` / `native-ci-workflow.test.ts`の不足箇所だけ。`src/**`、Spec本文、Formal E2Eはwrite set外。

- Cartの`RANK_REQUIRED`、`INSUFFICIENT_STOCK`、Reviewの`NOT_OWNER`など、仕様にある重要分岐をCase単位で整理する。
- 直接テストが必要なものはIntegration testへ追加し、仕様上の意図をTest titleまたは構造化metadataで追えるようにする。
- `spec_ref → br_ids / ac_ids → risk_id → test_case_id → implementation_path → evidence`の各段階を、ID存在だけでなく対応関係まで確認する。
- Global coverage thresholdは今回の既定gateに追加しない。Branchの重要度、既存CI時間、対象ACの直接Evidenceを測定した結果、閾値が必要とOwnerが判断した場合だけ、別L2変更として数字・対象範囲・実行時間・rollbackを承認する。
- コメントは、Seed・Clock・Reset・非自明な期待値・仕様上の理由に限定して追加する。一般的な操作の説明はTest title / metadataで表現する。

#### 先に固定するAC / Test target matrix

| AC | 最低限確認する境界 | 主なTest target | 完了Evidence |
| --- | --- | --- | --- |
| `AC-CART-001` | 在庫・購入上限・99の境界、超過拒否、既存数量維持 | `tests/integration/cart-use-cases.test.ts` | 仕様ID、Case ID、期待結果、Pass result |
| `AC-CART-002` | Guest CartからCustomer Cartへの統合と再計算 | `tests/integration/cart-use-cases.test.ts` | Guest / Customerの状態と統合後の結果 |
| `AC-CART-003` | 価格変更、在庫0、非公開、Rank不足、無効SKUの再検証とCheckout阻止 | `tests/integration/cart-use-cases.test.ts` | 各理由または対象外理由をCase単位で記録 |
| `AC-REVIEW-001` | delivered本人の一度だけの投稿、未配達・他人・既存・削除済みの拒否 | `tests/integration/review-user-use-cases.test.ts` | eligibilityの各分類と`NOT_OWNER`等の対応 |
| `AC-REVIEW-002` | published / hidden / deleted、編集、Admin操作、summary集計 | `tests/integration/review-user-use-cases.test.ts` | state transitionと表示集計の結果 |

上表は「全実装を同じTest layerへ置く」指定ではない。既存のContract / Integration / E2Eの責務をW0で確認し、直接テストが不要な分岐は理由付きで`covered by ...`または`out of scope`としてTraceへ残す。`out of scope`は未検証のままではなく、別課程・別Test layer・仕様対象外のいずれかを明記する。

完了条件:

- 重要ACの未検証条件が、テスト済み・対象外・別課程のいずれかに分類される。
- 学習者が自分のCaseにどのAssertionが必要か説明できる。
- コメントを増やすだけでなく、Case IDと期待結果を構造化して追跡できる。
- 上表の5 ACについて、既存Testの重複、first failure、追加／対象外判断がRun evidence付きで確認できる。

**停止条件**: Specの意味変更が必要、既存Formal RegressionとTraining exerciseを混在させないと検証できない、またはcoverage数字だけで十分性を判定する要求が出た場合。**Rollback**: 追加Testとcontract assertionだけを戻し、既存テストの削除・弱体化は行わない。

### 5.10 Wave G3 — Agent利用の実Run検証

**Owner**: Parent。**Dependency**: G1 / G2の文書契約、実装後のsafe diff。**Write set**: なし（active Runのmachine-managed artifactとREPORT追記を除く）。実装後に、Repositoryの現在のAgent設定を前提として読み取り専用の実Runを行う。

- 2〜3の独立read-only Agentが重複なく並列実行される。
- 各Agentが許可されたroleで起動し、read-only Agentの変更がない。
- Parentはspawn後も非重複の作業を継続し、completion notificationまたは非ブロッキングjoinで結果を受け取る。
- 調査・レビューAgentは、指定scopeの確認項目と出力契約を満たして自然終了するまで継続する。
- テスト・ビルド・lint等のコマンド実行Agentは、自身のコマンド単位timeoutで終了し、status、command、exit code、timeout理由を返す。
- childが追加Agentを起動しない。
- Agentが不要な軽微なtaskでは、delegationなしで進められる。
- Parallel writeは、分離とattributionを実証できない限り実施しない。
- Parentは子Agentが困っている場合に助言し、独立した未確認観点がある場合だけ異なるscopeの追加Agentを派遣する。
- 正常終了または明示中止のAgentをParentがcloseする。経過時間だけで調査Agentをcloseしない。

実Runでは、各Work Packageのread setと禁止範囲を事前に記録する。`wait_agent(timeout_ms)`のtimeoutは親のjoin呼び出しの終了として扱い、子Agentのtimeout、partial、closeとは区別する。Parentは非重複の作業を継続し、調査Agentは自然終了まで待つ。read-onlyの変更なしは開始前後の`git diff --name-only`、Run collector、必要なhook evidenceの三者で確認する。子Agentの自己申告だけを証拠にしない。

テスト・ビルド・lint等のコマンド実行Agentは、子Agent自身がコマンド単位timeoutを設定する。実際のtimeout、interrupted、errored、またはRunのwatchdog / 終了時点で結果がない場合は、Parentが`TIMEOUT`、`BLOCKED`、`partial`または`NOT_RUN`として記録し、PASSへ変換しない。子Agentが困っている場合はParentが助言し、必要なら異なるscopeの追加Agentを派遣する。

観測はAgent数そのものではなく、wall-clock、重複作業、Parentのcontext負荷、Evidence品質、scope違反、retry回数、助言・追加派遣の妥当性で評価する。成功条件は「2〜3体起動した」だけでなく、Parentが非重複作業とAgent管理を継続し、各findingにline evidenceがあり、調査Agentを経過時間だけで打ち切らず、実際のpartial / timeout / interrupted / erroredがあればPASSではなく記録されることである。

**停止条件**: read-onlyのSource Integrity、child recursive delegation禁止、scope attribution、またはclose lifecycleを証明できない場合。**Rollback**: G3は検証だけでSourceを戻す必要はない。Agent設定の変更が必要と判明した場合は、変更せずL3別Planへ移す。

#### G3 lifecycle validation cases

実Runでは、次の順序と境界を、成功ケースだけでなく負のケースでも確認する。

- 調査Agent: Parentの`wait_agent`呼び出しだけがtimeoutした後もParentが非重複作業を継続し、調査Agentの自然終了通知を受け、結果を一度だけjoinしてからcloseする。
- コマンド実行Agent: child自身のcommand単位timeoutを`TIMEOUT`として返し、Parentのjoin timeoutをcommand timeoutへ誤対応付けしない。command、exit code、elapsed、timeout理由が欠ける場合はPASSにしない。
- 助言・追加派遣: 子Agentが詰まった場合にParentが助言し、助言で解消しない独立観点だけを別scopeの追加Agentへ派遣する。同じ問いの重複派遣、無制限retry、同時実行枠超過がない。
- 遅延・重複通知: 追加Agentの結果や遅れて届いた結果を二重集計せず、closeを一度だけ行う。必要Evidenceのない遅延結果をPASSの根拠にしない。
- 境界のnegative check: read-only AgentのSource変更、childからのrecursive delegation、Parent指定外のcommand / write、またはscopeを越えた結果は検出され、該当RunをFAIL / BLOCKEDとして扱う。

### 5.11 Wave V1 — 最終検証と既存Failureの扱い

**Owner**: Parent + quality gate runner（検証のみ）。**Dependency**: すべての実装Wave、G3のSource Integrity確認。**Write set**: なし。formatterは`format:check`だけを使い、`format`のようなwrite commandをquality gateへ渡さない。

Parentはcommand set・順序の指定、非ブロッキング管理、助言、必要時の追加派遣、結果統合、最終判断を担う。`quality_gate_runner`はParent指定commandの実行と子Agent側のcommand単位timeout管理、結果返却を担う。調査Agentやquality gate runnerはWave / Runの完了判定を代行しない。

変更後の検証順序は次とする。各項目は`PASS`、`FAIL`、`TIMEOUT`、`BLOCKED`、`SKIPPED`、`NOT_RUN`を観測statusとして記録し、結果なしの`partial`を含め、非PASS状態をPASSへ集約しない。ここでの`TIMEOUT`は子Agentまたはcommandの観測statusであり、Run manifestの正式enumではない。Runへ保存するときは、既存の`validation.status` / `evaluation.result`の契約へ、原因を失わない形で`blocked`、`not_run`、`partial`等に対応付ける。`run.json`やHook JSONLを手編集して対応付けない。

1. Markdown / Curriculum static validation。
2. Training typecheck、Web baseline、Web exercise、diagnostic、expected-failure contract。
3. Native runtime（選択課程かつ環境が利用可能な場合のみ）とTraining Copy validation。
4. 受講者向け修了確認のpositive / negative contract tests。
5. Cart / Reviewの追加Integration test。
6. `typecheck:app`、Cross-role E2E、format / lint、Repository / Contract全体をNode 24相当で再確認する。
7. `corepack pnpm run verify`、`git diff --check`、Run Artifact collector / sanitizer。

既存Failureは、今回の変更との因果関係をParentが分類し、未確認のFAILを完了扱いにしない。安全な最小修正が可能で今回の品質ゲートに影響する場合は、repair-loopへ接続する。

全child結果、追加派遣結果、validation statusをParentが統合し、Wave / Runの最終statusと完了可否をParentだけが判断する。調査Agentと`quality_gate_runner`は判定を代行しない。

#### V1の期待コマンドと証跡

| 順 | Command / 手順 | 期待結果 | 必須Evidence / Block扱い |
| --- | --- | --- | --- |

この表の各commandはParentが指定し、`quality_gate_runner`または対象の子Agentが実行する。必須Evidenceには実行Agent、command、exit code、elapsed、timeout理由、結果なし時のstatusを含める。`wait_agent`のtimeoutはcommand timeoutとはみなさない。commandごとの具体的timeout値とprocess tree停止方法はWave 0で確認し、既存wrapper / Hookの変更が必要ならL3別Planへ分離する。
| Plan | `corepack pnpm exec tsx -e "import fs from 'node:fs'; import { validatePlanOutput } from './.agents/skills/feature-plan/scripts/validate-plan-output.ts'; const result = validatePlanOutput(fs.readFileSync('.agents/skills/feature-plan/assets/plan-template.md', 'utf8'), fs.readFileSync('docs/plans/2026-09-15_213247_self-study-agent-orchestration.md', 'utf8')); console.log(JSON.stringify(result)); if (!result.valid) process.exit(1);"` | `valid: true` | templateと対象Planを実際に読み込んだstdout。単一Pathを渡すだけのCLI表記は採用しない |
| Curriculum | `corepack pnpm run validate:curriculum`、`corepack pnpm run lint:markdown` | exit 0 | 22 required documents、4 Workbook、Training workflow、markdown 0 issues |
| Training | `corepack pnpm run typecheck:training`、`corepack pnpm run training:web:baseline`、`corepack pnpm run training:web:exercise`、`corepack pnpm run training:web:diagnostic` | exit 0 | baselineとlearner exerciseを別結果で保存。starter / baselineだけを修了Evidenceにしない |
| Failure | `corepack pnpm run training:web:check-expected-failure` | wrapper exit 0。内部のfailure exerciseは非0、`.zip` / `.png` / `.webm` / `.html`を生成 | `output/training/playwright/`の期待Failure Artifact。`training:web:expected-failure`単独の非0を品質ゲートFAILと誤分類しない |
| Copy | `corepack pnpm run training:copy:prepare -- --source-sha <40-char-sha> --target <new-dir>`、続けて`corepack pnpm run training:copy:validate -- --root <training-copy>` | 生成とvalidationがexit 0 | manifest SHA、active allowlist 2ファイル、template byte equality、least privilege。target既存時の上書き拒否も確認 |
| Tests | `corepack pnpm run test:contracts`、`corepack pnpm run test:integration` | exit 0 | checker、Trace、Training / Formal境界、AC targetの結果 |
| Type / quality | `corepack pnpm run typecheck:app`、`corepack pnpm run typecheck:native-tests`、`corepack pnpm run format:check`、`corepack pnpm run lint`、必要なE2E（Cross-roleを含む） | exit 0 | Node 24相当、first failureと対象Waveを記録 |
| Full | `corepack pnpm run verify`、`git diff --check` | exit 0 | full gateのstdout、FAIL時はfirst failure分類。verifyが環境依存で実行不能ならBLOCKEDとして理由と代替Evidenceを記録 |
| Run | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`、`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check` | exit 0、residual findings 0 | collector由来のchanged files、sanitized Run Artifact。run.json / Hook JSONLは手編集しない |

Nativeを選択しない場合は`SKIPPED`を記録し、Common / Web Part 2のPASSへ影響させない。Nativeを選択したのにAndroid runtimeが使えない場合は`BLOCKED`であり、C08の完了へ進めない。GitHub Actionsの実Runを取得できない場合もPart 2をPASSにせず、Copy準備／Account／Permission／runnerのどこで止まったかを記録する。

## 6. 検証方法

### 6.1 Plan検証

- templateと対象Planの両方を読み込む`corepack pnpm exec tsx -e ...validatePlanOutput...`（5.11の表に記載した完全なCommand）を実行する。`node --import tsx ... <plan-file>`のように、CLI実装がないpure functionへ単一Pathを渡すだけの表記は検証とみなさない。
- 主要セクション（Goal、Current understanding、Assumptions、Non-goals、Impacted areas、Files、Change strategy、Validation、Risks、Open questions）が存在する。
- 実装前の未解決質問と停止条件が、推測で埋められていない。
- 既存PR 4A / PR 5 / Agent orchestration Planとの重複が、参照または境界として整理されている。
- 17行監査表、今回確定した方針、Wave dependency、exact write set、rollback、status / exit codeが互いに矛盾しない。

### 6.2 Curriculum / Workbook

- `corepack pnpm run validate:curriculum`
- `corepack pnpm run lint:markdown`
- 全17 Lessonについて、`docs/reference/curriculum-self-study-review.md`の既存checklistと17行監査表を突合し、Input / Output / DoD / Feedback / Handoffの各欄を埋める。
- P1-2〜P1-6の各Handoffを、ファイル・列・Case ID（`TARGET-CART-101` / `RISK-CART-101` / `TC-CART-101`）・Commandまで手動確認する。
- clean learner copyで、講師向け資料を開かずにCommon routeをP1-1からP1-9まで通読し、P1-2〜P1-6を実施する。P1-7を選択しない場合のP1-8 rejoinも確認する。
- clean learner walkthroughの記録には、Lesson ID、Inputの入手元、実施Command、Output / Handoff参照、Self-check回答の最低要素、Recovery結果を含める。これは理解の手動確認であり、checkerの自動PASSと混同しない。

### 6.3 Training / 受講者向け修了確認

- `corepack pnpm run typecheck:training`
- `corepack pnpm run training:web:baseline`
- `corepack pnpm run training:web:exercise`
- `corepack pnpm run training:web:diagnostic`
- `corepack pnpm run training:web:check-expected-failure`
- `corepack pnpm run training:copy:prepare -- --source-sha <40-char-sha> --target <new-dir>` → `corepack pnpm run training:copy:validate -- --root <training-copy>`
- Nativeを選択した場合だけ、`corepack pnpm run training:native:baseline` → `corepack pnpm run training:native:exercise`とJUnit / Evidenceを同じattemptで確認する。未選択はSKIPPED、選択したがruntime不可はBLOCKEDとする。
- positive fixture（有意なAssertion / Evidenceあり）とnegative fixture（starterのみ、Not run、unreachable Flow、架空Evidence、baselineのみ、Case不一致）を受講者向け修了確認で比較する。
- Part 2では、実際のGitHub PR / Checks / Workflow Run / Artifactを取得できた場合だけPASSとし、取得できない場合はBLOCKEDまたはNOT_RUNのままにする。

### 6.4 Product test / CI

- Cart / Review追加Integration test。
- AC / Case / Assertion / EvidenceのTraceability contract test。
- `tests/contracts/training-curriculum.test.ts`でbaseline非代替、Training / Formal分離、workflow safetyを確認する。
- Training workflowとProduct Formal workflowに、不要なlearner exerciseが混在していない。
- CI Artifactの成功EvidenceとFailure diagnostic Artifactを区別する。
- `corepack pnpm run test:contracts`と`corepack pnpm run test:integration`で、上記AC target・checker status・Traceabilityの期待結果を確認する。

### 6.5 Agent運用

- read-only researcherの2〜3並列Run。
- Parentがspawn後も非重複作業を継続し、completion notificationまたは非ブロッキングjoinで結果を管理することを確認する。
- 変更ファイルがないこと、scopeが重複しないこと、正常終了または明示中止後にcloseされることを確認する。
- child recursive delegationのnegative check。
- 調査・レビューAgentは自然終了まで継続し、経過時間だけを理由にcloseしないことを確認する。
- workerはParent指定scopeだけを変更するスコープ限定Runとし、テスト・ビルド等のコマンドtimeoutはworker / quality gate runner自身が管理する。
- quality_gate_runnerはParent指定commandだけを実行し、Sourceを変更しない。
- `scripts/verify` / `scripts/verify.ps1`、Run Artifact sanitizer、必要なHook / collectorを確認する。
- `wait_agent`のtimeoutだけでは子Agentのtimeoutと判定しない。実際のtimeout / interrupted / errored、またはwatchdog / Run終了までに結果がない場合をpartial / BLOCKED / NOT_RUNとして記録し、結果なしをPASSへ変換しない。軽微な1ファイルtaskではdelegationなしのnegative caseも確認する。
- 子Agentが困っている場合のParentの助言と、独立した未確認観点に対する追加Agent派遣が、同じ問いの無制限な再投入になっていないことを確認する。

### 6.6 成功判定

- curriculum static validationがPASSするだけでなく、学習者がInputからOutputまで進め、Self-checkの最低回答要素とHandoffを説明できる。
- stock baselineのみでは修了にならない。
- 失敗を経験し、修正理由を説明して再実行できる。
- CaseとEvidenceのTraceが途中で切れた場合にFAILまたは未完了として判定される。
- Agent利用の有無がタスク規模とリスクに対応し、過剰起動・重複・recursive delegationがない。
- Quality gateのFAIL / 未実行 / Environment blockが、PASSや完了へ誤変換されない。
- 自動checkerのPASSは成果物・実行Evidenceの判定であり、理解の完全な証明ではない。理解はLessonのSelf-checkとclean learner walkthroughで別に確認する。
