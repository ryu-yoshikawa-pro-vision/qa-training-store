# run.json machine-managed契約明確化計画

## 0. 依頼概要

- 依頼内容:
  - `run.json`をCodex自身が直接作成・編集する運用を廃止し、既存writer / collectorが生成・更新するmachine-managed artifactとして統一する。
  - `AGENTS.md`等に残る、`run.json`の手動作成・直接更新を許容または示唆するactive instructionを整理する。
  - このブランチで後続実装・検証まで行えるよう、実装対象・停止条件・検証条件を固定する。
- 背景:
  - `scripts/new-run.ps1/sh`は既に`.codex/templates/RUN_MANIFEST.json`から`run.json`を自動生成する。
  - `scripts/codex-task.ps1/sh`はRun manifest記録を有効にした実行で`run.json`を自動更新する。
  - `scripts/collect-run-artifacts.ps1/sh`はrun-local artifactを再走査し、`run.json`の非廃止summaryを再集約する。
  - `docs/reference/run-artifacts.md`では、実行事実はrunner / wrapper / hooksが生成し、`changed_files`等をAgentが手書きしない責務分離が既に定義されている。
  - 一方、`AGENTS.md`には「lightweightではrun artifactを手動作成してよい」「`RUN_MANIFEST.json`を元に`run.json`を作成するか`new-run`に生成させる」「既存Run継続時に`run.json`を更新する」と読める記述が残り、machine-managed方針と矛盾している。
  - PR #76の実装Runでは、v1で初期化された`run.json`がcommit時にはv2になっており、自動migrationではなくcommit前の手動同期・編集が確認できる範囲の原因として残った。直接編集余地をactive instructionから除く必要がある。
- 期待成果:
  - `run.json`の生成・更新責務がmachine-managedで一意になる。
  - Agentは通常workflowで`run.json`を直接作成・編集せず、既存writer / collectorを使用する。
  - active docs / instructions間で同じ契約が一貫する。
  - 将来、直接編集を促す文言が戻った場合に既存verificationで検出できる。

## 1. ゴール / 完了条件

- ゴール:
  - `run.json`を「Agentが意味情報を手書きする成果物」ではなく「runner / wrapper / collectorが生成・更新するaggregate manifest」として明確に固定する。
- 完了条件（DoD）:
  - `AGENTS.md`に`run.json`はmachine-managed artifactであり、通常workflowではAgentが直接作成・編集しないことが明記されている。
  - 新規Runで`run.json`が必要な場合は、`scripts/new-run.ps1/sh`による生成を正規経路とする。
  - 既存Runの`run.json`更新は、`scripts/codex-task.ps1/sh`のmanifest writerまたは`scripts/collect-run-artifacts.ps1/sh`経由で行うことが明記されている。
  - `RUN_MANIFEST.json`を直接コピー・編集して`run.json`を作ることを通常手順として案内しない。
  - `PLAN.md` / `TASKS.md` / `REPORT.md`の手動編集可能性と、`run.json`のmachine-managed責務が区別されている。
  - `evaluation.json`はAgent / reviewerが評価判断を書く既存責務を維持し、`run.json`と同じmachine-managed扱いへ変更しない。
  - `lightweight`で`run.json`が不要な既存workflowを壊さず、`run.json`自体を全Run必須にはしない。
  - `--no-run-manifest` / `-NoRunManifest`等の既存opt-out契約を、この目的だけで削除・変更しない。
  - `docs/reference/run-artifacts.md`と`docs/reference/codex-implementation-harness.md`が同じproducer / updater責務を説明している。
  - active instruction / active referenceに「Agentが`run.json`を直接作成・編集する」と読める矛盾した文言が残っていない。
  - Bash / PowerShellの既存verify contractに、machine-managed責務を確認する最小限の回帰チェックが追加されている。
  - 既存manifest v2、v1 value preservation、Hook、Safety、Product codeの挙動を変更していない。
  - 関連verification、Markdown lint、必要なcontract testがPASSする。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- `AGENTS.md`
  - Run初期化・継続・Artifact管理のPrimary instruction。
  - 現在、`run.json`の手動作成・直接更新と解釈できる文言が残る。
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
  - 新規Run Directoryを作成し、manifestを省略しない場合は`.codex/templates/RUN_MANIFEST.json`から`run.json`を生成する。
  - 既存Run Directoryは上書きしない。
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
  - `--record-run-manifest`相当の経路で`run.json`を生成・更新する既存writer。
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `scripts/collect-run-artifacts.py`
  - run-local artifactを再走査し、`run.json`のaggregate summaryを再生成・更新する。
- `docs/reference/run-artifacts.md`
  - `run.json`をrun全体のaggregate manifestと定義し、observed factsをAgentが手書きしない責務を既に説明している。
- `docs/reference/codex-implementation-harness.md`
  - `new-run`による初期生成、`codex-task` / collectorによる更新経路を既に説明している。
- `tests/contracts/codex-run-manifest-contract.test.ts`
  - schema v2 writer整合、v1 legacy value preservation、mixed-version mergeを検証する。
- `scripts/verify`
- `scripts/verify.ps1`
  - harness / docsのactive contractを静的に検証する既存経路。

#### Main flow

1. Run開始時に`new-run.ps1/sh`を使う。
2. `run.json`が必要なworkflowでは`new-run`がmanifest templateから自動生成する。
3. 非対話実行時は`codex-task.ps1/sh`がmachine factをmanifestへ更新する。
4. 必要に応じて`collect-run-artifacts.ps1/sh`がrun-local artifactを再集約する。
5. Agentの意味情報は`REPORT.md`、評価判断は`evaluation.json`へ記録する。
6. `run.json`は上記machine-managed事実のaggregateとして参照する。

#### Key abstractions

- `run.json`: machine-managed aggregate manifest。
- `REPORT.md`: checkpoint単位の人間向け意味情報。append-only。
- `evaluation.json`: Agent / reviewerによる評価判断の正本。
- Hook JSONL: session-scopedの低レベルmachine fact。
- `RUN_MANIFEST.json`: writerが新規manifestを生成するためのtemplate。Agentが通常workflowで直接コピー・編集するための入力ではない。

#### Existing tests / verification

- `tests/contracts/codex-run-manifest-contract.test.ts`がmanifest writer shapeとv1/v2 merge contractを検証する。
- `scripts/verify` / `scripts/verify.ps1`が`run-artifacts.md`、`codex-implementation-harness.md`、manifest template、writer / collectorの存在と主要contractを確認する。

#### Safe change surface

- Active instructions / referencesの責務表現を明確化する。
- 既存verifyへ静的contractを最小限追加する。
- 必要な場合のみ既存manifest contract testを補強する。
- writer / schemaの動作変更は、repo-wide確認で直接編集しか手段がないactive workflowが見つからない限り行わない。

#### Unknowns

- `AGENTS.md`以外のactive skill / guide / referenceに、`run.json`の直接作成・直接編集を促す文言が残っている可能性がある。
- historical plans / past runsには旧運用の記録が存在し得るが、これはactive instructionとは分離して扱う必要がある。

### Assumptions

- `new-run`、`codex-task`、`collect-run-artifacts`の現行writer経路で、通常workflowに必要な`run.json`生成・更新は完結できる。
- 今回は`run.json` schema v2の内容変更を必要としない。
- 既存v1 manifestはPR #76で実装したlegacy value preservationのまま扱える。
- `evaluation.json`のAgent / reviewer編集契約は意図された責務であり、今回変更しない。
- `lightweight` workflowで`run.json`が任意である既存契約は維持する。

### Non-goals

- `run.json` schema v3等のschema再設計。
- manifest fieldの追加・削除。
- v1→v2 migration utilityの追加。
- Hook JSONLを`run.json`へ集約する変更。
- Run correlation基盤、DB、daemon、registryの追加。
- `evaluation.json`の自動評価化またはmachine-managed化。
- `REPORT.md` / `TASKS.md` / `PLAN.md`をmachine-managedへ変更すること。
- `run.json`をlightweightを含む全workflowで必須化すること。
- `--no-run-manifest` / `-NoRunManifest`の削除。
- 過去Run / 過去Plan / historical docsの記録を書き換えること。
- Product code、ECサイト仕様、カリキュラム本体の変更。
- 新しいmanifest writerや新しいtest frameworkの追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - 現時点ではなし。
- 仮定してよい細部:
  - machine-managedを表す日本語表現は、既存docsの文体に合わせて「直接作成・直接編集しない」「既存writer / collectorを使用する」とする。
  - active docsのcontract回帰は、既存`verify`の静的チェックを第一選択とする。
- 未回答の重要質問:
  - なし。

## 4. 影響範囲

### Impacted areas

- Codex Run初期化instruction。
- Codex Run継続時のArtifact更新instruction。
- Run Artifactの責務説明。
- Implementation Harnessの運用ガイド。
- Harness verification contract。

### Files to inspect

#### 変更候補

- `AGENTS.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`
- `tests/contracts/codex-run-manifest-contract.test.ts`（behavior regressionの追加が必要な場合のみ）

#### 実装前に挙動を再確認するファイル

- `.codex/templates/RUN_MANIFEST.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `scripts/collect-run-artifacts.py`
- `PLANS.md`
- `.agents/skills/**`のactive Run Artifact関連instruction
- `docs/guides/**` / `docs/reference/**`の`run.json`関連active instruction

#### 原則変更しない

- `.codex/runs/**`の過去Run
- `docs/plans/**`の過去Plan（本Planを除く）
- `docs/history/**`等のhistorical record
- Product code
- Hook logger / Hook config
- Safety Hook
- manifest schema / template shape

## 5. 変更方針

### Change strategy

1. まずrepo-wideで`run.json` / `RUN_MANIFEST.json` / manifest updateに関するactive instructionとwriterを分類する。
2. writerの実態を確認し、machine-managedの正規producer / updaterを固定する。
3. `AGENTS.md`の矛盾する手動運用表現を最小差分で修正する。
4. `run-artifacts.md`と`codex-implementation-harness.md`を同じ責務表現へ揃える。
5. active instructionの回帰を既存verifyで検知できるようにする。
6. writer挙動の不足が見つからない限り、production scriptのロジックは変更しない。
7. targeted validation、full harness verification、Markdown validationで完了判定する。

### 正規producer / updater契約

実装では最低限、以下を明文化する。

#### 新規生成

- `run.json`が必要なRunは`new-run.ps1/sh`で生成する。
- Agentが`.codex/templates/RUN_MANIFEST.json`を直接コピーし、値を手作業で書き換えて`run.json`を作成しない。

#### 自動更新

- 非対話実行のmanifest更新は`codex-task.ps1/sh`の既存writer経路を使用する。
- artifact再集約が必要な場合は`collect-run-artifacts.ps1/sh`を使用する。
- validな`evaluation.json`から`primary_failure_category`等をsummary copyする既存wrapper / collector責務を維持する。

#### Agentが直接編集するArtifactとの境界

- `PLAN.md`: 計画・判断メモ。
- `TASKS.md`: task進捗。
- `REPORT.md`: checkpoint意味情報。
- `evaluation.json`: Agent / reviewerによる評価判断。
- `run.json`: 上記とは異なり、通常workflowでは直接編集しないmachine-managed manifest。

### 実行タスク

- [ ] 1. repo-wideで`run.json`、`RUN_MANIFEST.json`、`schema_version`、`record-run-manifest`、`collect-run-artifacts`に関するactive instruction / writer / historical recordを検索し分類する。
- [ ] 2. `new-run.ps1/sh`、`codex-task.ps1/sh`、`collect-run-artifacts.*`を確認し、通常workflowで直接編集なしに必要fieldを生成・更新できることを確認する。
- [ ] 3. active workflowに直接編集しか更新手段がないfield / operationがないことを確認する。
- [ ] 4. `AGENTS.md`のRun初期化で、lightweightの「手動作成」は`PLAN.md` / `TASKS.md` / `REPORT.md`等に限定し、`run.json`を対象から明示的に除外する。
- [ ] 5. `AGENTS.md`の「`RUN_MANIFEST.json`を元に作成するか`new-run`に生成させる」を削除・置換し、`run.json`が必要なら`new-run`を使用する契約へ変更する。
- [ ] 6. `AGENTS.md`の既存Run継続規則から、Agentが`run.json`を直接「更新する」と読める表現を除去し、writer / collector経由の更新と参照に分離する。
- [ ] 7. `AGENTS.md`へ`run.json`のmachine-managed契約を短く明記し、Agentが通常workflowで直接作成・直接編集しないことを固定する。
- [ ] 8. `docs/reference/run-artifacts.md`の`run.json`節へmachine-managed責務、正規producer / updater、直接編集禁止を明記する。
- [ ] 9. `docs/reference/codex-implementation-harness.md`のRun初期化・成果物・推奨フローを同じ契約へ揃える。
- [ ] 10. repo-wide再検索し、active instructionに直接作成・直接編集を促す矛盾した文言が残っていないことを確認する。過去Run / 過去Plan / historyは検出されても変更対象にしない。
- [ ] 11. `scripts/verify`と`scripts/verify.ps1`へ、`AGENTS.md` / active referenceがmachine-managed責務を保持していることを確認する最小限のcontract checkを追加する。
- [ ] 12. verifyのnegative checkでは、今回削除する既知の危険表現だけを対象にし、一般語の「更新」「作成」を広範囲に禁止する脆い検証にしない。
- [ ] 13. writer behaviorに実際の不足が見つかった場合のみ`tests/contracts/codex-run-manifest-contract.test.ts`を追加し、既存writer経路で必要挙動を固定する。文言確認だけのためにVitestを増やさない。
- [ ] 14. `new-run` / `codex-task` / collector、manifest v2 / v1 preservation、`evaluation.json`責務に意図しない変更がないことをdiff reviewで確認する。
- [ ] 15. targeted verification、Bash / PowerShell verify、Markdown lint、必要なcontract testsを実行する。
- [ ] 16. 最終repo-wide searchとdiff reviewで、Product code・Hook・Safety・過去Run等へscopeが広がっていないことを確認する。

### Stop conditions

以下に該当した場合は、直接編集禁止だけを先に強制して実装を壊さず、原因を記録して再検討する。

- active workflowで、`run.json`の特定fieldを更新する正規writerが存在せず、直接編集だけが唯一の経路になっている。
- `new-run` / `codex-task` / collectorへ新しい大規模writer機能を追加しなければmachine-managed化できない。
- `run.json`を全workflow必須化しなければ目的を達成できない。
- v1 migration framework、Hook→manifest aggregation、Run correlation等のPlan Non-goalsが必要になる。
- active consumerが手動で追加された未知fieldを`run.json`から必須参照しており、単純なinstruction修正では破壊的変更になる。

この場合は、必要なwriter改善を別taskとして切り出し、今回の目的に無関係な基盤拡張を混ぜない。

## 6. 検証方法

### Validation plan

#### Repo-wide contract review

- active filesを対象に以下を検索する。
  - `run.json`
  - `RUN_MANIFEST.json`
  - `record-run-manifest`
  - `collect-run-artifacts`
  - `Set-Content` / `write_text` / redirect等のmanifest writer候補
- 結果を以下へ分類する。
  - 正規writer
  - active instruction / reference
  - test / verify
  - historical record
- historical recordに旧文言が残っていても、それだけを理由に書き換えない。

#### Static contract

- `scripts/verify`
- `scripts/verify.ps1`

最低限確認すること:

- `AGENTS.md`に`run.json`のmachine-managed責務が存在する。
- `AGENTS.md`が`RUN_MANIFEST.json`からの手動作成を通常手順として案内していない。
- active referenceに`new-run`生成、`codex-task` / collector更新の正規経路が存在する。
- `evaluation.json`のAgent / reviewer責務を維持している。

#### Markdown / format

- `pnpm run lint:markdown`
- repositoryでdocs変更に要求されるformat / diff check。

#### Contract tests

writer / behaviorを変更しない場合:

- 既存verifyを主validationとし、不要なtest追加を行わない。

writer / behaviorに必要最小限の修正が発生した場合:

- `tests/contracts/codex-run-manifest-contract.test.ts`
- 必要に応じてcontract suite全体。

#### Manual review

- 新規Run生成例を読み、`run.json`をAgentが手書きする手順がないこと。
- 既存Run継続例を読み、Agentが`run.json`を直接編集する手順がないこと。
- `REPORT.md` / `evaluation.json`との責務分離が明確なこと。
- `lightweight`でmanifest不要の場合は既存どおり省略可能なこと。

### 成功判定

以下をすべて満たせば完了とする。

- `run.json`はmachine-managed aggregate manifestと明示されている。
- Agentは通常workflowで`run.json`を直接作成・編集しない。
- 新規生成は`new-run.ps1/sh`が正規経路である。
- 更新は`codex-task.ps1/sh`または`collect-run-artifacts.ps1/sh`等の既存writer / collectorが担当する。
- `RUN_MANIFEST.json`を直接コピー・編集する通常手順がactive instructionから消えている。
- `AGENTS.md`のlightweight手動作成表現が`run.json`まで許可する形になっていない。
- 既存Run継続時の`run.json`更新が直接編集ではなくmachine-managed経路として説明されている。
- `evaluation.json`は既存どおりAgent / reviewerの評価判断の正本である。
- manifest v2 / v1 value preservationの仕様を変更していない。
- `--no-run-manifest` / `-NoRunManifest`を維持している。
- 過去Run / 過去Plan / historyを不要に書き換えていない。
- verifyが新契約を検証し、Bash / PowerShell双方でPASSする。
- Markdown lintと必要なcontract testsがPASSする。
- Product code、Hook、Safety、カリキュラム等へ変更を広げていない。

## 7. リスクと未解決論点

### Risks

- 「Run Artifactは手動更新可能」という一般ルールと`run.json`の例外を曖昧に書くと、再び直接編集される。
- `run.json`と`evaluation.json`をまとめてmachine-managedと書くと、評価責務を壊す。
- negative wording checkを広げすぎると、historyや正当な説明文までverify failureにしてしまう。
- direct edit禁止だけを先に追加し、必要なwriterが不足している場合はworkflowを詰まらせる。
- この目的に合わせてwriterやschemaを再設計すると過剰実装になる。

### Open questions

- なし。repo-wide確認でactive manual-only workflowが見つかった場合のみStop conditionとして再判断する。

## 8. 成果物

- 変更ファイル（想定）:
  - `AGENTS.md`
  - `docs/reference/run-artifacts.md`
  - `docs/reference/codex-implementation-harness.md`
  - `scripts/verify`
  - `scripts/verify.ps1`
- 条件付き変更:
  - `tests/contracts/codex-run-manifest-contract.test.ts`
  - writer側ファイルは、現行経路だけでは契約を満たせない具体的不足が確認された場合のみ必要最小限で変更する。
- 付随ドキュメント:
  - 本Planのみ。
  - `docs/reports/`は作成しない。

## 9. 備考 / Follow-up notes

- 今回の目的は`run.json`の内容を増やすことではなく、既に存在する自動生成・自動更新経路と運用instructionを一致させることである。
- PR #76で確立したmanifest v2 / v1 compatibility、Hook JSONL、REPORT checkpoint責務は維持する。
- 実装時に別のRun Artifact自動化改善が見つかっても、本件の直接編集防止に必須でなければ別taskへ分離する。
