# run.json machine-managed契約明確化計画

## 0. 依頼概要

- 依頼内容:
  - 通常のCodex Run運用における`.codex/runs/<run_id>/run.json`をmachine-managed artifactとして明確化する。
  - `AGENTS.md`等に残る、Agentによる`run.json`の手動作成・直接編集を許容または示唆するactive instructionを除去する。
  - 既存の自動生成・自動更新経路は維持し、運用instructionと実装済みの責務を一致させる。
- 背景:
  - `scripts/new-run.ps1/sh`は`.codex/templates/RUN_MANIFEST.json`から`run.json`を自動生成する。
  - `scripts/codex-task.ps1/sh`はmanifest記録時に`run.json`を更新する。
  - `scripts/collect-run-artifacts.ps1/sh`はrun-local artifactを再集約し、`run.json`を更新する。
  - `docs/reference/run-artifacts.md`ではobserved factsをrunner / wrapper / hooksが生成し、`changed_files`等をAgentが手書きしない責務が既に定義されている。
  - 一方、`AGENTS.md`には`run.json`の手動作成・直接更新と解釈できる表現が残っている。
- 期待成果:
  - actual Runの`run.json`について、生成・更新責務が既存writer / collectorへ一意に寄る。
  - Agentが通常workflowで`run.json`を直接作成・編集しないことがactive instruction上も明確になる。
  - 将来この契約が戻らないよう、既存verifyで最小限の回帰検知を行う。

## 1. ゴール / 完了条件

- ゴール:
  - `.codex/runs/<run_id>/run.json`をmachine-managed aggregate manifestとして固定し、Agent-managed Artifactとの責務境界を明確化する。
- 完了条件（DoD）:
  - `AGENTS.md`に、actual Runの`run.json`は通常workflowでAgentが直接作成・直接編集しないことが明記されている。
  - 新規生成は`scripts/new-run.ps1/sh`、更新は`scripts/codex-task.ps1/sh`または`scripts/collect-run-artifacts.ps1/sh`を正規経路として説明している。
  - `AGENTS.md`の以下4種類の曖昧表現が解消されている。
    1. lightweightの「run artifactを手動作成してよい」が`run.json`まで含むように読める表現。
    2. `RUN_MANIFEST.json`を元にAgentが`run.json`を直接作成できるように読める表現。
    3. 既存Run継続時にAgentが`run.json`を直接「更新する」と読める表現。
    4. 「Git操作禁止でもRun Artifactの作成・更新は通常のファイル編集として実施する」が`run.json`まで含むように読める表現。
  - `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json`のAgent-managed責務と、`run.json`のmachine-managed責務が区別されている。
  - `docs/reference/run-artifacts.md`に同じ責務境界が明記されている。
  - `docs/reference/codex-implementation-harness.md`は、実装前確認で矛盾が見つかった場合のみ最小修正する。
  - `scripts/verify` / `scripts/verify.ps1`にmachine-managed契約を確認する最小限のpositive checkが追加されている。
  - writer / collector / schema / manifest templateの動作は変更していない。
  - `evaluation.json`のAgent / reviewerによる評価判断の責務は変更していない。
  - `lightweight`で`run.json`が任意である既存契約、`--no-run-manifest` / `-NoRunManifest`は維持している。
  - Bash / PowerShell verify、Markdown lint、diff checkがPASSしている。

## 2. 現状理解と前提

### Current understanding

#### Main flow

1. 新規Runでmanifestが必要な場合、`new-run.ps1/sh`が`run.json`を生成する。
2. 非対話実行時は`codex-task.ps1/sh`がmachine factをmanifestへ反映する。
3. 必要に応じて`collect-run-artifacts.ps1/sh`がrun-local artifactを再集約する。
4. Agentは意味情報を`REPORT.md`、評価判断を`evaluation.json`へ記録する。
5. `run.json`はmachine-managed aggregateとして参照する。

#### 現在確認できている矛盾

`AGENTS.md`には少なくとも以下が残っている。

- lightweightではrun artifactを「手動作成してよい」。
- `run.json`が必要なworkflowでは`RUN_MANIFEST.json`を元に作成するか`new-run`に生成させる。
- 同一Run継続時に`PLAN.md` / `TASKS.md` / `run.json`を更新する。
- Git操作禁止時でもRun Artifactの作成・更新は通常のファイル編集として実施する。

この4点を、actual Runの`run.json`だけmachine-managed例外として明確化する必要がある。

#### 既存の正規経路

- 新規生成: `scripts/new-run.ps1/sh`
- 非対話実行による更新: `scripts/codex-task.ps1/sh`
- 再集約: `scripts/collect-run-artifacts.ps1/sh`
- canonical responsibility reference: `docs/reference/run-artifacts.md`

### 対象境界

今回「直接作成・直接編集しない」とする対象は、**通常のCodex Run運用における`.codex/runs/<run_id>/run.json`**とする。

以下は禁止対象に含めない。

- contract testやtemporary directory内の`run.json` fixture。
- `.codex/templates/RUN_MANIFEST.json`自体のmaintenance。
- manifest writer / collectorの実装・テスト。
- 将来、manifest機能そのものを変更することが目的の専用タスク。

この区別により、production Runの直接編集だけを防ぎ、test fixtureやmanifest機能の保守を不必要に制限しない。

### Assumptions

- 現行の`new-run` / `codex-task` / collectorで通常workflowに必要な`run.json`生成・更新は完結できる。
- `run.json` schema v2やv1 legacy value preservationを変更する必要はない。
- `evaluation.json`はAgent / reviewerが評価判断を書く既存責務のまま維持する。

### Non-goals

- writer / collector / schema / manifest templateのロジック変更。
- manifest fieldの追加・削除。
- schema v3やmigration utilityの追加。
- Hook JSONLの`run.json`集約。
- Run correlation、DB、daemon、registry等の追加。
- `evaluation.json`のmachine-managed化・自動評価化。
- `REPORT.md` / `TASKS.md` / `PLAN.md`のmachine-managed化。
- `run.json`を全workflowで必須化すること。
- `--no-run-manifest` / `-NoRunManifest`の削除。
- 過去Run / 過去Plan / historyの書換え。
- Product code、Hook、Safety、ECサイト仕様、カリキュラム本体の変更。
- 新しいtest frameworkや新しいmanifest writerの追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 未回答の重要質問: なし。
- Stop conditionに該当するwriter不足が実装前確認で見つかった場合のみ、本Planの実装を止めて別タスクへ切り出す。

## 4. 影響範囲

### 必須変更候補

- `AGENTS.md`
- `docs/reference/run-artifacts.md`
- `scripts/verify`
- `scripts/verify.ps1`

### 条件付き変更候補

- `docs/reference/codex-implementation-harness.md`
  - 実装前確認でmachine-managed契約と矛盾するactive guidanceが見つかった場合のみ修正する。

### 確認のみ

- `.codex/templates/RUN_MANIFEST.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `scripts/collect-run-artifacts.py`
- `.agents/skills/**`のactive Run Artifact instruction
- `docs/guides/**` / `docs/reference/**`のactive `run.json` guidance

### 変更禁止

- 上記writer / collector / schema / manifest templateのproduction logic。
- `.codex/runs/**`の過去Run。
- 過去Plan / history。
- Hook logger / Hook config / Safety Hook。
- Product code。

## 5. 変更方針

### 契約

#### actual Runの新規生成

- `run.json`が必要な場合は`new-run.ps1/sh`を使用する。
- Agentは`.codex/templates/RUN_MANIFEST.json`を直接コピー・編集してactual Runの`run.json`を作成しない。

#### actual Runの更新

- 非対話実行時の更新は`codex-task.ps1/sh`を使用する。
- artifact再集約が必要な場合は`collect-run-artifacts.ps1/sh`を使用する。
- Agentは`.codex/runs/<run_id>/run.json`を直接編集しない。

#### Agent-managed Artifact

- `PLAN.md`: 計画・判断メモ。
- `TASKS.md`: task進捗。
- `REPORT.md`: checkpoint意味情報。
- `evaluation.json`: Agent / reviewerによる評価判断。

これらと`run.json`の責務を混同しない。

### 実行タスク

- [ ] 1. `run.json` / `RUN_MANIFEST.json` / `record-run-manifest` / `collect-run-artifacts`をrepo-wide検索し、結果を「正規writer」「active instruction / reference」「test / fixture」「historical record」に分類する。
- [ ] 2. `new-run` / `codex-task` / collectorの現行経路だけでactual Runの必要な生成・更新が完結することを確認する。不足があればproduction writerを修正せずStop conditionとして別タスク化する。
- [ ] 3. `AGENTS.md`の4種類の曖昧表現を最小差分で修正し、actual Runの`run.json`をmachine-managed例外として明記する。Git操作禁止時の一般的なRun Artifact編集規則にも`run.json`の例外を反映する。
- [ ] 4. `docs/reference/run-artifacts.md`をcanonical contractとして、actual Runの`run.json`はmachine-managedで直接編集しないこと、正規producer / updater、test / fixture等の対象外境界を明記する。
- [ ] 5. `docs/reference/codex-implementation-harness.md`を確認し、上記contractと矛盾する表現がある場合だけ最小修正する。既に整合している箇所は変更しない。
- [ ] 6. `scripts/verify` / `scripts/verify.ps1`へ、`AGENTS.md`と`run-artifacts.md`にmachine-managed契約が存在することを確認する最小限のpositive checkを追加する。一般語の「作成」「更新」を禁止する広範なnegative checkは追加しない。
- [ ] 7. active instruction / referenceを再検索し、actual Runの`run.json`直接作成・直接編集を促す矛盾が残っていないことを確認する。test / fixture / historical recordは変更対象にしない。
- [ ] 8. Bash / PowerShell verify、Markdown lint、diff checkを実行し、最終diffがinstruction / reference / verifyの最小範囲に留まっていることを確認する。

### Stop conditions

以下が見つかった場合は、このブランチでwriterを拡張せず実装を停止する。

- actual Runで必要なfieldを更新する正規writerが存在せず、直接編集が唯一の手段になっている。
- machine-managed化にwriter / collector / schema / templateのproduction logic変更が必要になる。
- `run.json`の全workflow必須化、migration framework、Hook→manifest aggregation等のNon-goalが必要になる。
- active consumerが未管理fieldを必須参照しており、instruction修正だけでは破壊的変更になる。

不足が見つかった場合は、writer改善を別タスクとして切り出す。

## 6. 検証方法

### 実装前確認

- active filesを対象に`run.json`関連記述とwriterを1回検索・分類する。
- historical recordは変更対象としない。

### Static contract

- `scripts/verify`
- `scripts/verify.ps1`

最低限確認する。

- `AGENTS.md`にactual Runの`run.json`をmachine-managedとする契約がある。
- `docs/reference/run-artifacts.md`に同じ責務境界がある。
- `new-run` / `codex-task` / collectorが正規経路として説明されている。

### Docs validation

- `pnpm run lint:markdown`
- `git diff --check`相当のrepository標準diff check。

### Contract test

- writer behaviorを変更しないため、新規Vitest追加は原則不要。
- 既存manifest contract testを変更しない。
- 実装中にwriter behavior変更が必要と判明した場合は、本Planでは変更せずStop conditionとする。

### 実装後確認

- active instruction / referenceを1回再検索する。
- actual Runの`run.json`を直接作成・編集する通常手順が残っていないことを確認する。
- test / fixture / historical recordの正当な`run.json`操作を誤って禁止していないことを確認する。

### 成功判定

以下をすべて満たせば完了とする。

- actual `.codex/runs/<run_id>/run.json`がmachine-managed aggregate manifestと明示されている。
- Agentが通常workflowでactual Runの`run.json`を直接作成・編集しない。
- 新規生成は`new-run.ps1/sh`、更新は`codex-task.ps1/sh`またはcollectorが正規経路である。
- `AGENTS.md`の4種類の曖昧表現が解消されている。
- `run-artifacts.md`にproducer / updaterと対象境界が明記されている。
- `evaluation.json`は既存どおりAgent / reviewerの評価判断の正本である。
- writer / collector / schema / templateのproduction logicに変更がない。
- `--no-run-manifest` / `-NoRunManifest`を維持している。
- verifyがBash / PowerShell双方でPASSする。
- Markdown lint / diff checkがPASSする。
- Product code、Hook、Safety、過去Run等へ変更を広げていない。

## 7. リスクと未解決論点

### Risks

- Run Artifact全体の一般ルールに`run.json`例外を明記しないと、直接編集禁止が再び曖昧になる。
- actual Runとtest fixtureを区別せず禁止すると、contract testやmanifest maintenanceまで不必要に制限する。
- `run.json`と`evaluation.json`をまとめてmachine-managedとすると評価責務を壊す。
- verifyで一般語を広く禁止すると、正当な説明まで壊れる。
- 本件を理由にwriter / schemaを変更するとscopeが目的以上に広がる。

### Open questions

- なし。writer不足が見つかった場合のみStop conditionとして別タスク化する。

## 8. 成果物

- 必須変更想定:
  - `AGENTS.md`
  - `docs/reference/run-artifacts.md`
  - `scripts/verify`
  - `scripts/verify.ps1`
- 条件付き:
  - `docs/reference/codex-implementation-harness.md`
- 変更しない:
  - writer / collector / schema / template production logic
  - contract test
  - 過去Run / 過去Plan / history
  - Product code / Hook / Safety
- 付随ドキュメント:
  - 本Planのみ。
  - `docs/reports/`は作成しない。

## 9. 備考

- 今回の目的は`run.json`機能を拡張することではなく、既に存在する自動生成・自動更新経路とactive instructionを一致させることである。
- 実装時に別のRun Artifact改善候補が見つかっても、actual Runの`run.json`直接編集防止に必須でなければ別タスクへ分離する。
