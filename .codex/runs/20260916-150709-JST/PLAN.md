# Plan（計画）

## Objective（目的）

- Issue #117 のPR3として、PR2 Trigger Evalの2件の`false_negative`を履歴として調査し、一般化可能なfrontmatter `description`の欠落が説明できるSkillだけを最小修正する。
- PR2 baselineを直接controlにせず、baseline source SHAからWeb検索無効のcontrolを作り、必要なcandidateと同一条件で比較する。変更不要なら根拠付きno-opで完了する。

## Scope（対象範囲）

- In:
  - `.agents/skills/repair-loop/SKILL.md` と `.agents/skills/android-native-local-validation/SKILL.md` のfrontmatter `description`（意味上のgapが確認できた場合だけ）。
  - strict Run `20260916-150709-JST` のPLAN / TASKS / REPORT、既存runnerが生成するRun-local評価artifact。
  - Plan指定のbaseline/control/candidate/current-main評価、標準検証、既存PR #155本文更新。
- Out:
  - Trigger Eval dataset / expected Skill / boundary / case ID、Skill本文・references、`AGENTS.md` routing、Repository本体の`.codex/config.toml`。
  - runner、OTel observer、scoring / comparison / timeout / schema、routing engine、Product code/test、Training、dependency、workflow、`.codex/agents/**`。
  - 新しいRuntime、Target generator、answer-key scanner、sandbox / retry / 統計評価framework、PR merge / close / branch削除 / force push。

## Assumptions（仮定）

- ユーザー指定のPlan `docs/plans/2026-09-14_190607_issue-117-pr3-trigger-description-optimization.md` が手順・判定・停止条件の正本である。
- 実装開始時の最新`origin/main` `b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`は実装branchへ既に取り込まれているため、source変更直前の`implementation_base_sha`はこのSHAとする。後続fetchでmainが進んだ場合はincoming diffを確認し、必要なら取り込み後に基準を更新する。
- PR2 baseline `codex-cli 0.153.4` / `gpt-5.6-luna` / dataset fingerprint / evaluator SHAはRun実行前に実artifactと現行Evaluator差分で再確認する。条件を維持できない場合はPlanの停止条件に従う。
- Targetのtrustは通常のuser-consented project trust / hook trustで確立し、user-level config・trust state・hook keyをrunnerや補助scriptで変更しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 現時点なし。対象、禁止範囲、評価条件、Git/PR完了条件はユーザー指示とPlanで確定している。
- 仮定してよい細部: Run-localのファイル名はPlan指定のartifact名を使用し、Targetの一時pathはRun REPORTへ絶対pathを残さず既定tokenで記録する。
- 未回答の重要質問: なし。調査でPlan前提との不一致が見つかった場合は推測で継続せず停止・報告する。

## Hypotheses（仮説）

- H1: `repair-loop`のtrain failureは、validation failureへのrepair/revalidation契約がfrontmatter・本文・AGENTSへ既に一貫して存在し、validation caseもpassしているため、一般化可能なdescription gapはない可能性が高い。
- H2: `android-native-local-validation`のtrain failureは、Windows Android tooling / physical device / Doctor-preflightの責務がfrontmatter・本文・AGENTSへ既に表現され、validation caseもpassしているため、一般化可能なdescription gapはない可能性が高い。
- H3: gapが見つかった場合だけ、意味上の境界を一文で明確化したcandidateがcontrol failureをfixedにし、全体`regressed=0`を満たす。

## Research Plan（調査計画）

- Round 1: Issue #117、PR #155、Plan、最新main/branch、baseline、現行6 Skillのrouting、対象2 Skill、dataset、ADR、runner/OTel、repository-contractを照合する。
- Round 2: 各failureをtrain query、validation case、expected/sibling Skill、AGENTS routing、frontmatter/本文の意味境界で独立判定する。
- Round 3（gapがあるSkillだけ）: baseline source側answer-key-free controlを作り、`all`のobservable outcomeを確認してからcandidate `train`、final `all --compare`へ進む。採用candidateがあればcurrent-main側answer-key-free Targetで統合確認する。
- Exit Criteria:
  - 2件のdescription変更要否が独立した意味上の根拠付きで確定している。
  - 実行したcontrol/candidate/current-main artifactのprovenance、isolation、web_search、comparisonがPlan条件を満たす。
  - 最終source、評価artifact、Run Artifact、標準検証、PR/CI状態が一致している。

## Approach（進め方）

1. 現行のIssue/PR/main/branch、baseline、Skill/routing/Eval/ADR/runnerを確認する。
2. Planに従い、2件を独立判定し、gapがなければcontrol/candidate live evalを不要なままno-opとする。
3. gapがある場合のみ、control→observable判定→candidate train→final all comparisonの順に実行する。候補を不採用にする場合はsourceを通常commitで戻し、artifactとsourceを一致させる。
4. 採用candidateがある場合のみ、最新mainを再確認してanswer-key-free current-main Targetを作成し統合確認する。
5. deterministic / repository検証、Sanitizer、scope確認、Run Artifact確定、commit / push、PR head/CI確認、PR本文更新を行う。

## Definition of Done（完了条件）

- Plan §10の全条件を確認し、no-opの場合は変更不要の根拠とN/A項目を明記する。
- 最終source差分は採用Skillのfrontmatter `description`だけ（またはno-opで0）で、禁止範囲・Repository本体config・dataset・Evaluator契約に差分がない。
- 必須検証（trigger validate、対象repository-contract、skills validate、repository test、verify、diff check）が成功し、未実行/失敗は原因付きで未完了扱いにする。
- repository file変更があれば、Run Artifactをfinal commit前に確定し、通常commit/push、local/remote/PR head一致、最新headの`Web CI` / `Mobile App CI` success、PR本文への実結果反映まで完了する。

## Risks / Unknowns（リスク・未知点）

- baselineと現行Evaluatorの意味契約差分、Codex version/model不一致、coverage不足、`unobservable`、trust/isolation不備は因果評価を無効にするため、Planの停止条件として扱う。
- answer key除外でcurrent routing contextを削りすぎる、またはartifactにraw query/expected mappingが残るリスクがある。export後に一時検索し、必要な一般契約は保持する。
- descriptionをtrain queryへ過適合させるリスクがある。candidateは評価結果より先に意味上の根拠を説明できる一文だけに限定する。
- ローカル検証または最新CIの既存環境 failureは原因・scopeとの因果を切り分け、今回の範囲外の修正を勝手に追加しない。

## Thinking Log（判断記録）

- 2026-09-16: PR #155の最新本文はPlan保存のみで、Skill source実装は未着手と確認した。最新`origin/main`は`b9087bd...`、branchはbehindではなくこのSHAを含む。
- 2026-09-16: Planの直接controlはPR2 baselineではなく、`3c5e35e...`を親にWeb検索だけdisabledにしたcontrolとcandidateの比較であることを確認した。
