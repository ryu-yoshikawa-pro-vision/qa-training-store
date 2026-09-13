# Issue #135 `AGENTS.md` 常駐コンテキスト整理 Plan

## 0. 依頼概要

- 対象Issue: #135「`AGENTS.md` をスリム化し常駐指示と詳細運用仕様を分離する」
- 対象branch: `issue-135-agents-context-slimming`
- 目的: 既存Repository-wide policyの意味を変えず、root `AGENTS.md` を常時必要な契約、高レベルrouting、条件付きreferenceへの入口へ絞る。
- 非目的: 新規Hook、compact後再注入、textlint、Hook契約テスト、新validator、Skill package再設計、Product behavior変更、Run schema変更、Subagent runtime変更。
- 関連Issue:
  - #117: Skill package / routing責務。Skill固有WorkflowはこのIssueで再設計しない。
  - #134: Hook契約、compact後再注入、文章品質ゲート。#135では扱わない。

## 1. ゴールと完了条件

### ゴール

root `AGENTS.md` には、通常タスクで常時保持する必要があるRepository-wide契約だけを残す。

Run、Git、Progress計算、品質ゲートfailure、Android / Native validation、Subagent、Harness等の詳細は既存のSkill / reference / agent定義へ寄せ、通常タスク開始時の無条件読み込み量を現状より減らす。

### A / B / C / D分類

現行 `AGENTS.md` はsection単位ではなくbullet単位で次へ分類する。

- A: 常時必要なのでrootへ残す。
- B: 特定状況だけ必要なので既存Skill / reference / runbookへ寄せる。
- C: 対象となるすべての実行経路で既存Harnessが機械的に判定・拒否できるため、rootは高レベル契約だけ残す。
- D: 重複または通常タスクで常時保持する必要がないためrootから外す。

Cは「関連Hook / rulesがある」という理由だけでは選ばない。Hook matcher外、部分的なrules、fail-closeしない経路が1つでもある場合はC単独にせず、AまたはBを併用する。

### rootへ必ず残す契約

- ユーザーの明示指示と対象範囲を優先する。
- 関係のない変更を行わない。ただし、品質ゲートfailureについて後述のRepository-wide repair policyが適用される場合はその契約に従う。
- default branchへ直接commit / pushしない。
- force pushや未承認の破壊的操作を行わない。
- delete / rename / move等の破壊的操作は既存Safety契約に従い、必要な承認なしで実行しない。
- Git mutationはRepositoryのGit safety契約に従う。
- 品質ゲートFAILを未確認のまま完了扱いにしない。
- 品質ゲートfailureがbaseline、既存問題、今回のdiffと無関係であることだけを理由に、安全な最小修正を保留しない。
- safety、permission、credential、不可逆な外部副作用、要件判断、Repositoryのretry停止条件に該当する場合はrepairを停止する。
- file-changing taskの適用条件・Git操作禁止例外を含む完了判断の入口を残す。
- GitHub metadataのみ、review-only、plan-only、調査のみ、質問、状態確認、repository file変更を伴わない分析にはfile-changing task完了契約を適用しない。
- ユーザー向けProgressを報告する高レベル契約を残す。
- ユーザー向け成果物、PR、Run Artifact等の言語ルールを残す。
- Skill routingの入口とRepository固有Inputの所在を残す。
- Parent / child subagentの高レベル責務境界とchildのrecursive delegation禁止を残す。
- 改善ガバナンスのL1 / L2 / L3承認境界をrootへ残す。

### 完了条件

- rootから外した契約について、禁止条件、許可条件、例外条件、停止条件、復旧条件、実行前後の必須確認の意味が変わっていない。
- `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` の一律読み込みを通常タスク開始条件から外す。
- rootを短くした代わりに、全Skill / reference / runbookを毎回読む構成にしない。
- Progress、Report、file-changing task、品質ゲートfailure、Subagent、Android / Native validationの正本がPlan上で確定している。
- `.codex/templates/TASKS.md` をProgress / file-changing task / 品質ゲートfailureの正本にせず、責務分離後のreferenceへ導くtemplateへ更新する。
- `scripts/verify` / `scripts/verify.ps1` のroot literal assertionを責務分離後の正本へ移管する。
- Bash版とPowerShell版は検索文字列ではなく「何をどの正本で検証するか」という意味契約を揃える。
- `AGENTS.md` のUTF-8 byte数、行数、通常タスク開始時の無条件読み込み量を変更前後で記録する。
- Issue記載の約2,000〜3,000 tokenはhard gateにせず目安として扱う。大幅に上回る場合はrootに残す理由を確認する。
- #117 / #134の責務へ範囲を広げない。

## 2. 責務と正本

### 2.1 常駐契約とrouting

- root契約: `AGENTS.md`
- Plan adapter: `PLANS.md`
- Review adapter: `CODE_REVIEW.md`
- Agentic QA adapter: `QA_AGENT.md`
- Skill: `.agents/skills/**`

### 2.2 Run / Progress

- Run Artifact / `TASKS.md` / checkpoint / Run-local `REPORT.md`: `docs/reference/run-artifacts.md`
- 実装Harness / file-changing task完了契約: `docs/reference/codex-implementation-harness.md`
- Run task template: `.codex/templates/TASKS.md`

Progressは次のように責務を分ける。

| 契約 | 正本 | root / templateでの扱い |
| --- | --- | --- |
| `TASKS.md` の `## Now` + `## Discovered` を分母とし、`## Blocked` を除外する基本Progress計算 | `docs/reference/run-artifacts.md` | rootはProgressを報告する高レベル契約だけ残す。templateは正本にしない |
| `Progress: <NN>% (<done>/<total>)` の基本表記 | `docs/reference/run-artifacts.md` | rootには短い表記要求を残してよい。templateはreferenceへ従う |
| file-changing taskでpush後の必須CI確認1件を分母・分子へ加算する条件 | `docs/reference/codex-implementation-harness.md` | 詳細計算をroot / templateへ重複させない |
| `Web CI` / `Mobile App CI` success、必要なPR本文更新、queued / in_progress / failureとの関係 | `docs/reference/codex-implementation-harness.md` | 詳細をroot / templateへ重複させない |
| review-only、plan-only、調査、GitHub metadataのみ、Git操作禁止等ではCI確認1件を加算しない条件 | `docs/reference/codex-implementation-harness.md` | 詳細をroot / templateへ重複させない |
| ユーザー向けSummary / Progress / 未完了時Next / Evidence | root `AGENTS.md` | 短いRepository-wide出力契約として残す |

`run-artifacts.md` と `codex-implementation-harness.md` に同じProgress条件を重複定義しない。基本計算は前者、file-changing taskとCI連動部分は後者を正本とする。

`.codex/templates/TASKS.md` はRunごとの作業雛形であり、Progressや完了条件の正本にはしない。新規Runへ古い `AGENTS.md` 詳細契約をコピーし続けないよう、template内の完了処理は正本referenceへ従う短い導線へ置き換える。

### 2.3 file-changing task完了契約

`docs/reference/codex-implementation-harness.md` へ、現行 `AGENTS.md` と `.codex/templates/TASKS.md` の次の意味を項目単位で移管する。

- 適用対象: repository working tree上のファイルを実際に変更し、Git commit対象差分を作る実装・変更タスク。
- 例外: ユーザーがそのタスクでGit操作を明示的に禁止した場合。
- 除外: GitHub metadataのみ、review-only、plan-only、調査のみ、質問、状態確認、repository file変更を伴わない分析。
- Git操作が許可される場合のcommit / push。
- 既存PRがある場合はそのPRを利用する条件。
- PRが必要で存在しない場合の作成条件。
- push後のlocal / remote HEAD確認とPR最新head確認。
- 通常PRの必須CIは `Web CI` / `Mobile App CI`。
- `Cross Browser Smoke` は通常PR必須CIに含めない。
- 必須CIの列挙はRepository契約を正本とし、branch protectionから自動推測しない。
- `queued` / `in_progress` は完了扱いにしない。
- `queued` / `in_progress` を理由に無制限pollingや独自監視scriptを追加しない。
- failure修正後は新しいheadの必須CIを再確認する。
- `TASKS.md` checkbox Progressと実装・変更タスク全体の完了判定は同一ではない。
- push後の必須CI確認1件はProgressへ加算するが、`TASKS.md` checkbox、manifest field、独自schemaへ追加しない。
- tracked Run Artifactはfinal commit前に、その時点で保存すべき状態まで更新・検証する。
- push後のCI結果だけを記録する目的でtracked Run Artifactを変更・再commit・再pushしない。

Git branch、refspec、recovery等の安全手順は `docs/reference/git-branch-safety.md` を正本とし、implementation harnessへ重複コピーしない。

### 2.4 品質ゲートfailure / Repair

品質ゲートfailureは次の3層へ分ける。

| 契約 | 正本 / 配置 |
| --- | --- |
| Repository-wideな高レベルrepair方針 | root `AGENTS.md` |
| Repository固有の原因分類、repair可否、停止・記録方針 | `docs/reference/repair-loop.md` |
| boundedなReview -> Repair -> Validate workflow | `.agents/skills/repair-loop/**` |
| push後に修正commitの最新PR headで必須CIを再確認する契約 | `docs/reference/codex-implementation-harness.md` |

Repository-wideな意味は現行 `AGENTS.md` を基準とし、次を維持する。

- 品質ゲートfailureはbaseline、current diff、shared dependency、test / CI contract、実行環境を確認して原因を分類する。
- baseline、既存問題、今回のdiffとの無関係だけを理由に保留しない。
- 原因が今回の変更にあるか、今回の変更を正しく検証するために必要か、独立した既存問題かにかかわらず、現在の権限内で安全な最小修正が可能なら現在のタスクで修正する。
- 破壊的操作、権限不足、secret / credential操作、不可逆な外部副作用、要件判断が必要な変更は勝手に進めない。
- Repositoryのretry停止条件に達した場合はrepairを停止する。
- 停止時は根拠、因果関係評価、未実行検証、次の対応を記録する。

現在の `docs/reference/repair-loop.md` にある「unrelated issueは後続対応へ記録する」という意味は、上記Repository-wide policyと一致していない。Issue #135の実装では `Shared quality-gate policy` を現行 `AGENTS.md` と同じ意味へ合わせる。

portableな `.agents/skills/repair-loop/**` はbounded scope、停止条件、human escalationを定義するSkillとして維持し、#117の責務を再設計しない。Repository固有の「既存・無関係でも安全な最小修正なら現在タスクで扱う」方針は `docs/reference/repair-loop.md` からSkillへ供給する。

`.codex/templates/TASKS.md` のCI failure導線は削除予定の `AGENTS.md` 詳細節へ依存させず、Repository固有repair policyとして `docs/reference/repair-loop.md` / `repair-loop` Skillへ到達する短い導線へ置き換える。修正後の最新PR headでCIを再確認する部分は `codex-implementation-harness.md` に従う。

### 2.5 Report

Report関連は3種類を分離する。

| 対象 | 正本 |
| --- | --- |
| Repository-wideな `docs/reports/` 作成判断 | `docs/reference/codex-safety-harness.md` の `Report file generation policy` |
| review固有の保存契約 | `CODE_REVIEW.md` |
| Run-local `REPORT.md` | `docs/reference/run-artifacts.md` |

新規Report referenceは作成しない。Report作成可否を判断する場合はrootから `docs/reference/codex-safety-harness.md` へ到達できる導線を残す。

### 2.6 Git / Safety

- Git安全詳細: `docs/reference/git-branch-safety.md`
- Safety Harness / Repository-wide Report policy: `docs/reference/codex-safety-harness.md`
- Scope契約: `docs/reference/change-scope-policy.md`
- 機械的安全規則: `.codex/rules/**`、`.codex/rules-auto-net/**`、`.codex/hooks/**`

Hookやrulesが一部経路しか捕捉しない場合、その制約をrootから完全に外さない。

### 2.7 Codex delegationとAndroid / Native validation

同じ「Native」という語を含むが別概念として扱う。

**Codex native delegation**

- Subagent運用の仕組み。
- rootにはParent / childの高レベル責務とchildのrecursive delegation禁止を残す。
- 詳細は `.codex/config.toml` の `max_depth = 1`、`.codex/agents/**`、`docs/reference/codex-implementation-harness.md` を正本とする。

**Android / Native validation**

- Android実機・ローカル検証のWorkflow。
- rootにはAndroid依頼時のSkill入口だけ残す。
- 詳細は `.agents/skills/android-native-local-validation/**` と `docs/native/**` を正本とする。
- Android専用Subagentが存在する前提を置かない。

### 2.8 改善ガバナンス

現行L1 / L2 / L3は短いRepository-wide承認境界なのでrootへ残す。`harness-improvement` Skill / referenceへ移管しない。

rootで次の意味を現行どおり維持する。

- L1: wordingのみの文書改善は、`REPORT.md` に記録すれば自己承認でよい。
- L2: workflow / template構造変更は、実装前にユーザー承認が必要。
- L3: permission / sandbox / approval / wrapper behavior変更は、実装前に明示承認とrollback planが必要。

`harness-improvement` Skill側のnormal / strict / blocked等は別責務であり、このL1 / L2 / L3を置き換える正本として扱わない。

## 3. `AGENTS.md` 初期分類

実装開始時に現行全文を再確認し、次を初期方針とする。

| 現行領域 | 方針 | 移管先 / root残置 |
| --- | --- | --- |
| `最初に必ず読むもの` | D / 再構成 | rootを常駐入口とし、PROJECT_CONTEXT / ADR / 過去Runは条件付き参照へ |
| Skill routing | A + B | routingはroot、詳細WorkflowはSkill / adapter |
| Run初期化・Artifact・実行ループ | B | implementation harness / run-artifacts |
| Progress | A + B | 報告契約はroot、基本計算はrun-artifacts、CI連動はimplementation harness |
| ユーザー向けレポート | A | Summary / Progress / 未完了時Next / Evidenceを短くrootへ残す |
| Living Documentation | A + B | 更新条件だけroot、無条件読み込みは廃止 |
| Plan保存 | B | `PLANS.md` |
| Repository-wide Report policy | B | `codex-safety-harness.md` |
| review固有Report | B | `CODE_REVIEW.md` |
| Run-local `REPORT.md` | B | `run-artifacts.md` |
| 安全性 / スコープ | A + C | 高レベル禁止はroot、機械判定詳細は全経路を捕捉できる範囲だけC |
| Git Branch Safety | A + B | default branch禁止等はroot、復旧詳細はgit-branch-safety |
| PR言語 | A | root |
| 必須検証 / 品質ゲートfailure | A + B | 高レベルrepair / 停止境界はroot、Repository固有詳細はrepair-loop reference、bounded workflowはrepair-loop Skill、最新head再確認はimplementation harness |
| file-changing task完了条件 | A + B | 適用条件・例外の入口はroot、詳細はimplementation harness |
| 言語ポリシー | A | root |
| 自律的な調査 | B | planning / repair / harness-improvement Skill |
| Codex Subagent | A + B | Parent / child境界はroot、Role詳細はagent定義 / implementation harness |
| Android / Native validation | A + B | Skill入口はroot、詳細はAndroid Skill / Native runbook |
| 改善ガバナンス | A | L1 / L2 / L3をrootへ残す |
| Safety Harness / auto-net | A + B + C | 高レベル安全境界と必要時導線はroot、詳細はSafety reference / rules / Hook |
| Lightweight / Workflow Level | B | implementation harness |

## 4. 変更手順

### 4.1 変更前の棚卸しと測定

- [ ] 1. 現行 `AGENTS.md` の各bulletをA〜Dへ分類する。
- [ ] 2. C候補はHook matcher、rules、validator、CIを経路単位で確認する。
- [ ] 3. rootと既存reference / Skill / agent定義の重複を対応付ける。
- [ ] 4. `scripts/verify` / `scripts/verify.ps1` のroot assertionを4.4の移管表へ対応付ける。
- [ ] 5. `.codex/templates/TASKS.md` がProgress、file-changing task、品質ゲートfailureをどこから参照しているか棚卸しし、古い `AGENTS.md` 詳細契約への依存を列挙する。
- [ ] 6. 現行 `AGENTS.md` と `docs/reference/repair-loop.md` の品質ゲートfailure契約を項目単位で比較し、不一致を記録する。
- [ ] 7. 変更前の無条件読み込み対象を記録する。
  - `AGENTS.md`
  - `docs/PROJECT_CONTEXT.md`
  - 最新ADR 1件
  - 最新Run 1件の標準Run Artifact
- [ ] 8. ADR path、Run ID、計上Artifact一覧、各UTF-8 byte数、`AGENTS.md` 行数を記録する。
- [ ] 9. ADR 1件 / Run 1件は旧契約の実読込量ではなく、件数未定義の「最近」に対する保守的な下限として扱う。

### 4.2 正本を補完する

- [ ] 10. `docs/reference/run-artifacts.md` に基本Progress算出契約が不足している場合、`TASKS.md` の `## Now` + `## Discovered`、`## Blocked`除外、基本表記を移管する。
- [ ] 11. `docs/reference/codex-implementation-harness.md` にfile-changing taskの適用・除外・Git操作禁止例外・commit / push / PR / CI契約を移管する。
- [ ] 12. 同文書へfile-changing taskのCI確認1件のProgress加算条件、`Web CI` / `Mobile App CI`、queued / in_progress / failure、除外条件を移管する。
- [ ] 13. 同文書へ、`TASKS.md` checkbox Progressとタスク全体の完了判定を同一視しないこと、CI確認1件をTASKS checkbox / manifest field / 独自schemaへ追加しないことを移管する。
- [ ] 14. 同文書へ、tracked Run Artifactをfinal commit前に必要な状態まで確定すること、push後CI記録だけを理由にtracked artifactを再commitしないことを移管する。
- [ ] 15. 同文書へ、`Cross Browser Smoke`を通常PR必須CIに含めないこと、必須CI列挙をbranch protectionから自動推測しないこと、queued / in_progress時に無制限pollingや独自監視scriptを追加しないことを移管する。
- [ ] 16. `docs/reference/repair-loop.md` の `Shared quality-gate policy` を現行 `AGENTS.md` のRepository-wide意味へ合わせる。
  - baseline / current diff / shared dependency / test・CI contract / environmentを確認して原因分類する。
  - baseline、既存問題、今回のdiffとの無関係だけを理由に、安全な最小修正を保留しない。
  - current change、verification requirement、独立した既存問題のいずれでも、現在の権限内で安全な最小修正なら現在タスクで扱う。
  - unsafe / destructive / permission / credential / irreversible side effect / requirement judgmentは停止する。
  - retry停止条件に達した場合は停止する。
  - 停止時の因果評価、未実行検証、次の対応を記録する。
- [ ] 17. `.agents/skills/repair-loop/**` はportableなbounded workflowとして維持し、Repository固有policyをSkillへコピーしない。
- [ ] 18. Progressの基本計算とCI連動条件を両referenceへ重複定義しない。
- [ ] 19. Git安全詳細は `git-branch-safety.md`、Run Artifactは `run-artifacts.md`、Report policyは `codex-safety-harness.md` の既存正本を再利用する。
- [ ] 20. 改善ガバナンスL1 / L2 / L3はrootへ残し、L1の記録先を現行どおり `REPORT.md` に限定する。
- [ ] 21. Codex delegationとAndroid / Native validationの正本を混同しない。

### 4.3 `AGENTS.md` とRun templateを責務分離後へ合わせる

- [ ] 22. `AGENTS.md` の「最初に必ず読むもの」の一律4項目を廃止し、必要時参照条件へ置き換える。
  - `docs/PROJECT_CONTEXT.md`: Product / architecture / repository contextが変更判断に必要な場合。
  - `docs/adr/`: 対象領域の既存設計判断を変更・依存する場合。
  - `.codex/runs/`: active Run継続または過去Runが調査evidenceとして必要な場合。
  - `PLANS.md`: Plan作成時。
  - `CODE_REVIEW.md`: review時。
  - `QA_AGENT.md`: Agentic QA時。
  - `docs/reference/codex-safety-harness.md`: destructive operation、Safety Harness詳細、Repository-wide durable Report作成判断時。
  - `docs/reference/repair-loop.md` / repair-loop Skill: review findingまたは品質ゲートfailureの修復時。
  - Android / Native runbook: Android / Nativeローカル検証時。
  - implementation harness / run-artifacts: 対応するHarness操作、Run運用、Progress詳細が必要な場合。
- [ ] 23. Skill routingは高レベル入口だけrootへ残す。
- [ ] 24. Repository-wide safety、file-changing taskの入口、Progress報告、ユーザー向け出力契約をrootへ残す。
- [ ] 25. 品質ゲートfailureについて、未確認FAILを完了扱いにしないこと、既存・baseline・無関係だけを理由に安全な最小修正を保留しないこと、停止境界を短くrootへ残す。
- [ ] 26. L1 / L2 / L3改善ガバナンスを短い3項目としてrootへ残し、L1は `REPORT.md` 記録条件を維持する。
- [ ] 27. RunのCLI option、manifest field、retention列挙、Progress計算例、CI加算計算例、Workflow Level表等の詳細はrootから外す。
- [ ] 28. Parent / childの高レベル境界だけrootへ残し、個別agent名の長い責務説明を外す。
- [ ] 29. Android / Native validationはSkill入口だけrootへ残し、Codex delegationと同じ項目へまとめない。
- [ ] 30. `.codex/templates/TASKS.md` は作業項目の雛形に留め、Progress / file-changing task / 品質ゲートfailureの正本にしない。
- [ ] 31. template内の `AGENTS.md` 詳細契約への参照を次の導線へ置き換える。
  - 基本Progress: `docs/reference/run-artifacts.md`
  - file-changing task / CI詳細: `docs/reference/codex-implementation-harness.md`
  - 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` / repair-loop Skill
  - 修正後の最新PR headでのCI再確認: `docs/reference/codex-implementation-harness.md`
- [ ] 32. templateから詳細を削る際も、Git操作禁止、非file-changing task除外、repair停止条件等へreference経由で到達できることを確認する。
- [ ] 33. 設計変更の経緯を新しい `AGENTS.md`、template、referenceへ書かない。

### 4.4 `scripts/verify` / `scripts/verify.ps1` のassertion移管

次の意味契約をBash / PowerShell双方で揃える。実装者が別の正本を選ばない。

| 現行root / template assertion・意味 | root / templateでの扱い | 詳細の検証先 |
| --- | --- | --- |
| Skill入口 | rootに高レベルroutingを残す | 各Skill package |
| `scripts/new-run.sh` / `.ps1` | rootにRun利用時の最小導線だけ残す | implementation harness |
| `run.json` / machine-managed `run.json` | 詳細を外す | run-artifacts |
| active `RunId` / manifest sync | 詳細を外す | wrapper契約はimplementation harness、manifestはrun-artifacts |
| checkpointの `Delegation` / `Result` / `Parent decision` | 詳細を外す | implementation harness / run-artifacts |
| `Report file` / `docs/reports/` 作成条件 | 詳細を外しSafety reference導線を残す | Repository-wideはcodex-safety-harness、reviewはCODE_REVIEW、Run-localはrun-artifacts |
| `command-based deletion` | rootに高レベル安全契約を残す | codex-safety-harness + rules / Hook捕捉範囲 |
| 個別Agent名 | rootから個別名要求を外す | `.codex/agents/**` + implementation harness |
| `writable subagent` / worker scope / Parent指定範囲 | rootにchildが範囲を越えない意味を残す | `implementation_worker.toml` + implementation harness |
| Parentが計画・変更範囲・禁止事項を決める | rootにParentの高レベル責務を残す | implementation harness |
| 判断不能時にParentへ戻す | rootにchildが独自に範囲拡大しない意味を残す | writable agent定義 + implementation harness |
| `Parent-defined validation` | rootにParentが検証決定を持つ意味を残す | `quality_gate_runner.toml` + implementation harness |
| `Codex native delegation` | rootにParent / child境界だけ残す | `.codex/config.toml` + agent定義 + implementation harness |
| `No child subagent delegation` | rootにrecursive delegation禁止を残す | `max_depth = 1` + 各Agent定義 |
| Android / Native validation routing | rootにAndroid Skill入口だけ残す | Android Skill + `docs/native/**` |
| Progress基本計算 | rootはProgress報告契約だけ残し、templateは正本にしない | run-artifacts |
| file-changing taskのCI確認1件加算 | root / templateから詳細を外す | implementation harness |
| TASKS checkbox Progress ≠ タスク全体完了 | templateは正本にせずreferenceへ従う | implementation harness |
| CI確認1件をTASKS checkbox / manifest / 独自schemaへ追加しない | templateへ詳細を重複させない | implementation harness |
| tracked Run Artifactをfinal commit前に確定し、CI記録だけで再commitしない | templateへ詳細を重複させない | implementation harness |
| `Cross Browser Smoke`除外 / 必須CI列挙 / branch protection非推測 | templateへ詳細を重複させない | implementation harness |
| queued / in_progress時の無制限polling・独自監視script禁止 | templateへ詳細を重複させない | implementation harness |
| 品質ゲートfailureの原因分類・安全な最小repair・停止条件 | rootに高レベル契約を残し、templateは旧 `AGENTS.md` 詳細節を参照しない | Repository固有policyは `docs/reference/repair-loop.md`、bounded workflowはrepair-loop Skill |
| failure修正後の最新PR head CI再確認 | templateへ詳細を重複させない | implementation harness |
| 改善ガバナンスL1 / L2 / L3 | rootへ残す。L1は `REPORT.md` 記録条件を維持 | rootを正本としてverifyする |
| harness-improvement reference | rootに必要時参照の入口だけ残す | Skill / reference |

- [ ] 34. `scripts/verify` のroot / template assertionを上表へ合わせて更新する。
- [ ] 35. `scripts/verify.ps1` も同じ意味契約へ更新する。
- [ ] 36. rootから外した意味について、正本側assertionまたは既存の同等assertionが残ることを確認する。
- [ ] 37. `.codex/templates/TASKS.md` が削除済みのroot詳細節を正本として参照していないことをBash / PowerShell双方で確認する。
- [ ] 38. `docs/reference/repair-loop.md` のShared quality-gate policyがrootのRepository-wide repair意味と一致していることを既存assertion方式で確認する。
- [ ] 39. 新規Hookテストやvalidatorへ範囲を広げない。

### 4.5 読み込み量と意味保持

- [ ] 40. 変更後の無条件読み込み対象を列挙し、通常タスクではroot `AGENTS.md` 以外を一律必須にしないことを確認する。
- [ ] 41. `AGENTS.md` の変更後byte数・行数を記録する。
- [ ] 42. 変更後の無条件読み込み量が、変更前の保守的な下限より小さいことを確認する。
- [ ] 43. rootから外した代わりに複数referenceを一括で常時読む記述がないことを確認する。
- [ ] 44. 棚卸し表とassertion移管表で、各既存policyのroot残置先または正本を照合する。

## 5. 検証方法

### 文書・参照整合

- `pnpm run lint:markdown`
- `pnpm run validate:skills`
- rootから参照するSkill / reference / adapterのlinkが実在することを確認する。
- `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` の一律読み込み指示が残っていないことを確認する。
- Git / Run / Progress / Repair / Android / Subagent詳細がrootへ二重定義されていないことを確認する。
- Progress基本計算とCI連動条件が、それぞれrun-artifacts / implementation harnessへ分離されていることを確認する。
- `.codex/templates/TASKS.md` がProgress / file-changing task / repair policyの正本になっていないことを確認する。
- TASKS templateから削除済みの `AGENTS.md` 詳細節への依存が残っていないことを確認する。
- `docs/reference/repair-loop.md` のShared quality-gate policyが現行 `AGENTS.md` の意味を保持していることを項目単位で確認する。
- portableなrepair-loop SkillへRepository固有policyをコピーしていないことを確認する。
- 改善ガバナンスL1 / L2 / L3がrootに残り、L1の記録先が `REPORT.md` のままであることを確認する。
- file-changing task完了契約の適用・除外・Git操作禁止例外・PR / CI条件が欠落していないことを確認する。
- Repository-wide Report、review固有Report、Run-local `REPORT.md` の責務を混同していないことを確認する。
- Codex delegationとAndroid / Native validationを混同していないことを確認する。

### Harness契約

- `pnpm run test:repository`
- `bash scripts/verify`
- Windows環境では `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `pnpm run verify` だけでHarness verifyを実行した扱いにしない。
- Bash / PowerShell双方をassertion移管表と照合する。
- rootから削除したassertionについて、正本側の検証または既存同等assertionが残っていることを確認する。
- `.codex/templates/TASKS.md` の古いroot依存をBash / PowerShell双方が検出できることを確認する。
- repair policyの意味保持をBash / PowerShell双方で確認する。
- `.codex/config.toml`、Hook script、rulesを変更していないことを確認する。

### Repository標準検証

- `pnpm run verify`
- 実行できない検証がある場合は、未実行項目と理由、代替evidenceをRun ArtifactとPR本文へ明記する。

### サイズ・読み込み量

- 変更前: `AGENTS.md` + `docs/PROJECT_CONTEXT.md` + 最新ADR 1件 + 最新Run 1件の標準Artifact。
- ADR 1件 / Run 1件は旧契約の保守的な下限として扱う。
- ADR path、Run ID、計上Artifact一覧、各UTF-8 byte数を記録する。
- 変更後: rootで無条件指定されたファイルだけを計測する。
- 変更後が変更前下限より小さいことを確認する。
- byte数を唯一の合否基準にしない。

### 成功判定

次をすべて満たす。

- rootがRepository-wide契約、高レベルrouting、条件付きreference入口中心になっている。
- rootだけ読めば、守るべき絶対条件と必要時に読む正本を判断できる。
- Cへ分類した契約は全実行経路で既存Harnessが機械判定・拒否できる。
- 部分強制の安全契約はrootまたは条件付きreferenceが残っている。
- 品質ゲートfailureについて、既存・baseline・無関係だけを理由に安全な最小repairを保留しない現行意味が保持されている。
- unsafe / destructive / permission / credential / irreversible side effect / requirement judgment / retry停止条件がrepair停止境界として保持されている。
- `docs/reference/repair-loop.md` とrootの品質ゲートpolicyが意味上一致している。
- portableなrepair-loop Skillはbounded workflowのままで、Repository固有policyを再定義していない。
- TASKS templateのfailure導線がrepair-loop reference / Skillへ到達し、修正後headのCI再確認はimplementation harnessへ到達する。
- file-changing taskの適用条件・Git操作禁止例外・除外対象が保持されている。
- implementation harnessにPR / commit / push / HEAD / `Web CI` / `Mobile App CI` / queued / in_progress / failure後再確認が保持されている。
- TASKS checkbox Progressとタスク全体の完了判定が区別されている。
- CI確認1件をTASKS checkbox / manifest / 独自schemaへ追加しない契約が保持されている。
- tracked Run Artifactをfinal commit前に必要な状態へ確定し、push後CI記録だけを理由に再commitしない契約が保持されている。
- `Cross Browser Smoke`を通常PR必須CIへ含めず、必須CIをbranch protectionから自動推測しない契約が保持されている。
- queued / in_progress時に無制限pollingや独自監視scriptを追加しない契約が保持されている。
- Progress基本計算はrun-artifacts、CI確認1件加算はimplementation harnessへ分離されている。
- `.codex/templates/TASKS.md` は上記契約の正本ではなく、各referenceへ従うtemplateになっている。
- ユーザー向けProgress / Summary / 未完了時Next / Evidenceの高レベル契約がrootに残っている。
- 改善ガバナンスL1 / L2 / L3がrootに残り、L1の記録先が `REPORT.md` のままである。
- Reportの3責務が確定している。
- Codex delegationとAndroid / Native validationが分離されている。
- #117のSkill責務を再実装していない。
- #134のHook / compact再注入 / textlintへ範囲を広げていない。
- Bash / PowerShellのHarness契約が共通の意味契約に沿っている。
- Markdown、Skill validation、Repository contract、Bash / PowerShell Harness verify、`pnpm run verify` が通る、または未実行理由が具体的に説明されている。
- 無条件読み込み量が変更前の保守的な下限より減っている。

## 6. リスクと停止条件

### リスク

- **短文化によるpolicy意味変更**: 例外付き禁止や停止条件を短縮して意味を変えない。
- **Repair policyの意味変更**: root詳細を削った結果、既存・baseline・無関係なfailureを一律後続対応へ送らない。現行Repository-wide policyをrepair-loop referenceへ移す。
- **Repair scopeの無制限拡張**: Repository-wide policyが安全な最小repairを要求しても、portable Skillのbounded workflow、human escalation、停止条件を外さない。
- **Progress責務の重複**: 基本計算とCI連動条件を両referenceやTASKS templateへ重複定義しない。
- **TASKS templateの旧契約残存**: rootから詳細を外してもtemplateが旧 `AGENTS.md` 詳細を参照すると、新規Runへ古い契約が複製される。templateはreference導線へ更新する。
- **実装完了条件の欠落**: TASKS templateから詳細を削る際、checkboxと全体完了の違い、CI非checkbox、commit前Artifact確定、CI記録だけの再commit禁止、必須CI列挙等をimplementation harnessへ移管してから削る。
- **実装完了条件の強化**: Git操作禁止や非file-changing taskへcommit / push契約を誤適用しない。
- **改善ガバナンスの緩和**: L1の記録先を `REPORT.md` から任意のRun Artifactへ広げない。
- **改善ガバナンスの弱体化**: L2 / L3承認境界をSkill側へ移して常駐契約から消さない。
- **機械強制範囲の過大評価**: `apply_patch` 等のHook対象外経路がある制約をC単独にしない。
- **Report責務の混同**: `docs/reports/`、review persistence、Run-local `REPORT.md` を区別する。
- **Nativeの語義混同**: Codex native delegationをAndroid検証へ接続しない。
- **verify契約の単純削除**: root assertionを削るだけで意味上の検証を失わない。
- **無条件読み込みの別名復活**: 複数referenceの一律読み込みを新設しない。
- **#134との混線**: SessionStart / compact再注入 / textlintへ進まない。

### 停止条件

次の場合は勝手に責務を再設計せず、Issue #135の範囲へ戻る。

- 上記で確定した既存正本ではpolicyの意味を保持できず、新規referenceまたは追加のpolicy変更が必要になる。
- repair-loop referenceを現行Repository-wide policyへ合わせるだけではportable Skillのbounded scopeと両立できないことが判明する。
- verify契約更新に新規Hook / validatorが必要になる。
- #134のSessionStart / compact再注入 / textlintを変更しないと成立しない。

## 7. 成果物

### 変更が見込まれるファイル

- `AGENTS.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/run-artifacts.md`（Progress基本計算の正本として不足がある場合）
- `docs/reference/repair-loop.md`
- `.codex/templates/TASKS.md`
- `scripts/verify`
- `scripts/verify.ps1`

### 条件付き変更

- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `.agents/skills/**`
- `.codex/agents/**`
- `docs/native/**`

これらは既存正本の不足または参照不整合が確認された場合だけ変更する。`repair-loop` Skill packageはRepository固有policyの移管先にしないため、今回の品質ゲートpolicy整合だけを理由に変更しない。

### 変更しない範囲

- `.codex/config.toml`
- 新規Hook
- textlint設定
- Product code / test behavior
- Skill package構造
- Run schema
- Subagent runtime

### 付随ドキュメント

- 新規の移行履歴文書や責務一覧文書は作成しない。
- 棚卸し、assertion移管、判断経緯、検証結果はIssue / PR / Git履歴とactive Run Artifactで追跡する。

## 8. 備考

- このPlanはIssue #135の実装範囲だけを扱う。
- 実装開始時はmainとの差分とIssue #117関連の既存変更を再確認し、既に解決済みの責務分離をやり直さない。
- `.codex/templates/TASKS.md` の構造変更はL2に該当する。Planの存在やレビュー完了だけを実装承認とみなさず、ユーザーからこのPlanに基づく実装指示が出た時点でL2の承認を得たものとして扱う。
- 実装中に新規Hookやcompact再注入が必要に見えても、#134へ残し、このbranchでは追加しない。
