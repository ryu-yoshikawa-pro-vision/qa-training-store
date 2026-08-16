# Plan

## Objective

- 最新 main の PR #24 / #25 変更を正本として保持し、PR #23 Official Black-box Scored E2Eの意図・Trust Boundaryを失わず、現在のrebase conflictをworking tree編集だけで解消する。

## Scope

- In: conflict fileの意味統合、Official ADRの0015移行、旧ADR filename参照の現行canonical path更新、Agentic QA契約・テスト・文書のself-review、指定validation、Run Artifact。
- Out: Git index/history/branch mutation、rebase continue、PR #23後続commitの手動replay、Product / Visual / Curriculumの機能変更、Official Host実行・採点。

## Assumptions

- rebase baseは`600b5ca`、expected branchは`feat/implement-official-black-box-scored-e2e`。
- 現在のunmerged fileは`docs/PROJECT_CONTEXT.md`のみ。後続PR commitはユーザーのstage/continueで適用される。
- 過去Run Artifactは監査証跡として保持し、現Runへ今回の判断と検証結果を記録する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: ADR移行はworking treeのadd/delete patchで行い、Git renameは使わない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: conflict blockはmainのCurriculum / Visual Specification履歴とPR #23 Official履歴を両方保持すれば意味統合できる。
- H2: 現在のconflictはPROJECT_CONTEXTだけなので、Agentic QA実装のTrust Boundaryは後続commitと既存差分をself-reviewすれば確認できる。
- H3: Official ADRを0015へ移し、mainの0013 / 0014を保持すれば番号衝突と旧path参照を解消できる。

## Research Plan

- Round 1: AGENTS、PROJECT_CONTEXT、直近ADR / Run、rebase status、conflict sidesを確認する。
- Round 2: main / PR #23の関連コード・tests・docs・後続commitをself-reviewし、Trust Boundaryとidentity bindingを確認する。
- Round 3: PROJECT_CONTEXTとADRを編集し、marker / reference / diffを確認する。
- Round 4: focusedからfull validationまで実行し、index未stage由来の結果を切り分ける。
- Exit Criteria:
  - markerと旧Official ADR filename参照が除去される。
  - mainのPR #24 / #25履歴、ADR-0013 / 0014とPR #23履歴、Official ADR-0015が共存する。
  - Trust Boundaryとfully-rebound test / positive chainの状態を根拠付きで報告する。
  - Run Artifactがsanitizerを通過し、Git mutationをしていない。

## Approach

- main側を正本とし、conflict blockをours/theirs全面採用せず、履歴ブロックを意味単位で併存させる。
- 実装・テストの検証は、現treeと後続rebase commitを区別する。Host ReceiptなしのOfficial Scoreは作らない。
- Git操作はread-only queryに限定し、編集はapply_patch、Run Artifactのsanitizerは既存scriptを使用する。

## Definition of Done

- `docs/PROJECT_CONTEXT.md`のworking tree内容にmarkerがなく、main / PR #23の必要な履歴が残る。
- Official ADRは0015、main ADR-0013 / 0014は保持、旧Official ADR filenameの現行参照は0件。
- 指定validationを可能な範囲で実行し、PASS / FAIL / BLOCKED / NOT RUNを明示する。
- Git mutationなしで、ユーザーが次に`git add`→`git rebase --continue`できる状態を判定する。

## Risks / Unknowns

- 後続rebase commitにも旧ADR path変更があるため、次のcontinueでrename相当の追加conflictが起こり得る。
- 後続commit未適用のため、現treeのvalidationはPR #23最終状態の完全な代替ではない。

## Thinking Log

- 2026-08-16: rebase onto `600b5ca`、expected branch、current unmerged file 1件を確認。main側はPR #24 / #25履歴、PR側はOfficial履歴を持つため、両方を残す方針とした。
- 2026-08-16: mainのADR-0013 / 0014とPR側旧ADR-0013の番号衝突を確認。Official ADRは0015へ移行する。
