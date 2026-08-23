# PR #44 レビュー修正計画

## Goal

PR #44のレビューで確認されたG7、G9、Run Artifactの不整合だけを、既存Repository Audit Remediation Planの契約に沿って修正する。G8の実装・方針、Product code、依存、Action major version、Agentic QA frameworkは変更しない。

## Current understanding

- PR #44は`fix/qa-repository-hardening`から`main`へ向いており、修正前HEADは`75d06f586dd0e4ab59b2f7e81d6c814d4f50db58`である。
- Flow JはAdmin側で「発送準備を開始」の有無と操作後の「発送準備中」を確認しているが、操作前の注文stateをPageHeader上で明示しておらず、Customer側は注文番号確認だけで終了している。
- `scripts/training/workflow-contract.ts`はcheckoutのexact SHAをallowlistと固有`persist-credentials`判定へ重複記述している。
- CurriculumのTraining Workflow例はmutableな`@v4`を掲載している。
- 既存Run `20260822-193304-JST`の`evaluation.json`とREPORTには、commit／push／PR作成後の実行事実と矛盾する記録がある。REPORTはappend-onlyなので既存entryを移動せずCorrectionを末尾へ追加する。
- 公式upstream再確認では、`pnpm/action-setup`のcurrent `v4`は`b906affcce14559ad1aafd4ab0e942779e9f58b1`（Node 20へのrevert）、`v4.4.0`はNode 24の`fc06bc1257f339d1d5d8b3a19a8cae5388b55320`、最新major releaseは`v6.0.10`である。対象5 Action repositoryのGitHub security advisory API結果はすべて0件だった。

## Assumptions

- G7の有効初期stateは既存`cross-role-product-lifecycle`の`order-paid`であり、Admin Order detailのPageHeader descriptionを注文stateのUI領域としてscopeする。
- G9はversion／major upgradeではなく、既存current majorのfull SHA pinを維持する。`pnpm/action-setup`のNode 24対応releaseや`setup-java` v5移行は別対応とする。
- setup-java v4のdeprecationは今回の新Run Artifactへfollow-upとして記録する。Repository内に既存のcanonical migration trackerが見つからないため、新しい管理frameworkは作らない。

## Non-goals

- G8の`prepare-challenge.ts`、challenge patch、`.gitattributes`の変更。
- Product source／behavior、依存package、GitHub Actions major version、Agentic QA frameworkの変更。
- `actions/setup-java` v5 migration、その他Actionの不要なupgrade。
- retry、skip、timeout増加、`--ignore-whitespace`、EOL normalization、assertion弱体化。
- G1〜G6、G7〜G9以外の修正、PR merge、force push、rebase、amend、destructive reset／clean、review thread操作。

## Entry points / Main flow

- G7: `e2e/web/ui-ux-improvements.spec.ts` Flow J → Admin Order detail → shipment transition → Customer Order detail。
- G9: Training workflow YAML → `scripts/training/workflow-contract.ts` → `tests/contracts/training-curriculum.test.ts` → curriculum snippet。
- Artifact correction: 既存Runの`evaluation.json`とREPORTを事実に合わせ、今回Runへ修正判断・検証結果を記録する。

## Key abstractions / Existing tests

- G7は既存のPageHeader、注文状態dictionary、`cross-role-lifecycle.spec.ts`の`配送状況` scope patternを再利用する。
- G9は既存の`APPROVED_TRAINING_ACTIONS`とworkflow validatorを維持し、checkout refだけをexport定数へ集約する。
- Focused Playwright、training curriculum contract、全contract、Repository gateを既存script経由で実行する。

## Safe change surface

- `e2e/web/ui-ux-improvements.spec.ts`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- `.codex/runs/20260822-193304-JST/evaluation.json`
- `.codex/runs/20260822-193304-JST/REPORT.md`（末尾Correctionのみ）
- `.codex/runs/20260822-214522-JST/` の標準Run Artifact
- 本計画ファイル

## Change strategy

1. 公式upstreamのcurrent major alias、release、relevant history、runtime compatibility、advisoryを確認し、既存SHA維持の判断をRunへ記録する。
2. Flow Jへ操作前のpaid state、exact button locator、Customer側preparing stateの明示assertを追加する。Product codeは触らない。
3. checkout Action refを`APPROVED_TRAINING_CHECKOUT_ACTION`へ集約し、allowlistと`persist-credentials: false`判定が同じ定数を参照するようにする。既存negative contractを維持する。
4. Curriculum snippetを実workflowと同じfull SHAへ更新し、SHA pin policyの短い説明を直後へ追加する。
5. 既存Runのevaluation scope evidenceを修正し、REPORT末尾へcanonical chronologyとself-referential head表現のCorrectionを追記する。新Runへも全iterationとfollow-upを記録する。
6. Focused／contract／curriculum／Repository gates、JSON parse、sanitizer、最終diffを確認してからnormal commit／pushする。PRはmergeしない。

## Validation plan

- G7: `pnpm run test:e2e:chromium -- --grep "Flow J"`。可能ならinitial state、button不在、Customer反映不在を一時negative controlでFAIL確認し、永続差分を残さない。
- G9: `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`、`pnpm run validate:curriculum`。mutable checkout、欠落／trueの`persist-credentials`、unknown Action拒否を維持確認する。
- Repository gates: `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run lint:markdown`、`pnpm run security:check`、`pnpm run test:contracts`、`git diff --check`。
- Artifact: sanitizerのWrite／Check、`run.json`／`evaluation.json`／JSON parse、既存Run correctionの整合性を確認する。
- GitHub: 修正後HEADのPR #44についてPhase 1 CI／Native CIを含むRequired CIを確認する。修正前HEADの結果は最終Evidenceに使わない。

## Risks

- Admin PageHeaderのstate表示を誤って広いlocatorで確認すると別テキストを拾う可能性があるため、対象注文headingの親領域へscopeする。
- `pnpm/action-setup`のNode 24対応は公式履歴上存在するが、current `v4` aliasはNode 20へrevertされたSHAであり、今回upgradeするとG9のversion変更へ逸脱する。current alias、revert理由、advisoryを記録して既存SHAを維持する。
- REPORTを再配置するとappend-only契約を破るため、時系列は末尾Correction内のcanonical chronologyとして示す。
- 修正後のRequired CIは外部状態であり、failure時は最初の異常を分類してboundedに停止する。

## Open questions

- なし。ユーザーの修正対象、禁止事項、完了条件、PR操作範囲が確定している。

## Follow-up notes

- `actions/setup-java` v4は公式deprecationを確認したが、このPRではv5へ上げない。Node 24／runner compatibilityを含む別PRでmigration／compatibility validationを行う。
- PRの現在HEADはGitHub側を正本とし、Run Artifactへ「永久的なfinal PR head」を記録するためだけのcommitは追加しない。
