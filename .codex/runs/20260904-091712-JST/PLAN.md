# Plan

## Objective

- child Plan `docs/plans/2026-09-03_013450_pr3_decision_b_competency_assessment_contract.md` をSSOTとして、Decision B / Competency / Assessment Contractを既存Curriculumへ最小差分で実装する。

## Scope

- In:
  - next unused ADR
  - 指定されたREADME、Learning Design、Rubric、Instructor Reference、P1/P2 Lesson・Capstone
  - `tests/contracts/training-curriculum.test.ts`への新規`it` 2件
  - 今回Runの標準Artifact
- Out:
  - `scripts/validate-curriculum.ts`、Product、Product Native CI Gate、Formal Test Strategy / Traceability、`training/**`、`.github/workflows/**`
  - PR 4A / PR 5のLesson改善、runner、workflow、Artifact実装
  - historical `.codex/runs/**`、既存ADR、既存planning history

## Current understanding

- 対象branchは`docs/decision-b-competency-assessment-contract`で、初期作業ツリーはcleanだった。
- `origin/main`は`cf5b7b0`で、現在HEADのancestorである。`git fetch origin`と`git merge origin/main`は実行環境の承認ポリシーにより拒否されたが、既存HEADが取り込み済みであることをread-only履歴で確認した。
- PR #103はOPEN、baseは`main`、headは対象branchである。
- planning baselineから`origin/main`までのdeltaはHook / Run / Issue対応で、PR 3対象のCurriculum / Rubric / validator / Training / workflow差分はない。
- 最新ADRは0021まで存在するため、現時点のnext unused候補は0022。ただし実装直前に再確認する。
- ユーザー指定の`00_learning_design.md`はRepository上では`00_learning-design.md`であり、既存READMEリンク・validator対象に合わせて後者を編集する。

## Assumptions

- child Planで固定されたcanonical wordingをそのままRubric / READMEとcontract testへ使用する。
- 新規Run Artifactは今回の実装履歴として保存する。historical Run Artifactは変更しない。
- Git mutationはユーザー許可済みだが、実行環境の承認拒否が継続する場合は、実装・検証後にcommit/push blockerとして報告する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。child Planに目的、範囲、DoD、停止条件が固定されている。
- 仮定してよい細部: 既存Markdownの構造と用語を保ち、対象section内の直接矛盾だけを局所修正する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現行文書はCommon / Native境界、entry profile、completion set、Evidence境界を一意に表現していないため、指定sectionの局所修正が必要である。
- H2: 既存contract testの`readFileSync` + `toContain` styleへ、Rubric 1件・README 1件の2 blockを追加すれば、固定invariantを最小限guardできる。

## Research Plan

- Round 1: 必須文書、child Plan、最新ADR、Run履歴、planning baselineからlatest mainのtargeted deltaを確認する。
- Round 2: 実装前baseline 4件を実行し、既存failureをPR 3由来と混同しないよう記録する。続いて対象文書と既存testの該当sectionを読み、最小patchを作る。
- Round 3: post-validation、diff allowlist、child Plan DoDのmanual cross-check、artifact sanitizerを実行する。
- Exit Criteria:
  - child Plan固定のCommon / Native / Evidence / navigation契約が対象文書へ反映される。
  - 新規contract testは2`it`だけで、Rubric / READMEのstable wordingだけをassertする。
  - validator / Product / Formal / Training / workflow / historical Run Artifactに差分がない。
  - 実装後validation結果と、Git承認制約を含む残課題が明示される。

## Approach

1. ADR番号を再確認し、最新main deltaにDecision Bとの競合がないことを確認する。
2. baselineを実行して既存failureを記録する。
3. child Planの順序に従ってADR、README、Learning Design、Rubric、Instructor notice、4 Lesson / Capstone、contract testを局所編集する。
4. post-validationと差分allowlistを確認し、失敗があれば最初の異常を分類して必要最小限だけ修正する。
5. Run Artifactをsanitizerで確認し、Git branch / statusを再確認してcommit、push、PR #103更新を試みる。

## Definition of Done

- child PlanのFuture PR 3 implementation DoDを満たす。
- Part 1 Common=`C01〜C07 + C09〜C10`、Part 2 / Final Common=`C01〜C07 + C09〜C12`、C08=`Native specialization / Common non-required`がRubricを正本に固定される。
- README / Learning Designでentry / graduation / prior knowledge / branch-skip-rejoin / Repository-requiredとLearner Required / Instructor境界が整合する。
- P1-7既存physical-device / baseline / serial / artifact contractを維持する。
- 指定validationが成功、またはbaseline / environment / policy起因の未解決事項を根拠付きで記録する。

## Risks / Unknowns

- README / Learning Designに既存のNative必須表現が残るリスクがある。対象sectionと直接近接する矛盾をmanual cross-checkする。
- Rubricの既存Competency名、Primary source(s)数、採点表を過剰に再構成するリスクがある。child Planの列拡張・局所修正だけに限定する。
- 実行環境のGit mutation承認拒否により、commit / push / PR更新だけ完了できない可能性がある。

## Thinking Log

- 2026-09-04 JST: 初期状態は指定branch・clean treeで、current HEADは`origin/main`をすでに含む。fetch/mergeは実行環境の承認拒否で実行できなかったため、履歴を書き換えずancestor確認を採用した。
- 2026-09-04 JST: child Planを実装SSOTとし、planning Run Artifactの旧baseline・旧ADR候補は変更しない。
