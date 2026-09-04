# PR 4A child Plan: Curriculum Core / Extension / Reference / Self-study remediation

## Goal

Issue #98を単独の教材・報告・チェックリストへ複製せず、Master PlanのPR 4Aへ引き渡す。Current `main`、Master Plan、既存Curriculum Finding、PR #103で固定されたDecision B / Competency / Assessment Contractを照合し、Learner Required pathとlearner-facing specializationの自己学習品質をboundedに改善する。

成果物は、Common CoreがNative specializationを前提にせず、選択したspecializationが一意にskip / branch / rejoinでき、受講者がlearner-facing materialだけで学習・演習・自己確認・Recovery・completion・次の行動を判断できる状態である。Repository-required assetとLearner Required pathの境界、Instructor Referenceのsupport-only責務も同時に明確にする。

## Baseline

- 実行開始時刻（JST）: 2026-09-04 20:50:03
- 作業branch: `docs/pr4a-curriculum-self-study-remediation`
- Current base: `origin/main` と `010dfc8d564818c4484fdf908e43961a2b2b7cc2`（PR #103 merge後）へfast-forward同期済み
- Working tree: baseline同期時点では今回のRun Directory以外の差分なし
- Tracking Issue #72: `Current: PR 4A child Plan review / Pre-change audit preparation`
- Issue #98: PR 4Aへのhandoff input。Issue専用の永続教材・報告・checklist・第三のSSOTは作成しない
- Validator contract: `validate:curriculum`が要求する22件のCurriculum文書、Workbook 4件、Training / Workflow assetを維持する
- Contract test: PR #103後の`tests/contracts/training-curriculum.test.ts`は13 test block。PR #103が追加したDecision B invariantは変更しない

## Fixed decisions inherited from Master Plan / PR #103

### Competency and route

- Decision B: target learnerはentry-levelの汎用Test Automation Engineer。Common CoreはWeb中心で成立する
- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2
- `C08`、Physical Android、Native CIはNative specialization。Common completionには要求しない
- Route: Part 1 Common `P1-6 → P1-8 → P1-9`、Native `P1-6 → P1-7 → P1-8 → P1-9`
- Route: Part 2 Common `P2-5 → P2-7 → P2-8`、Native `P2-5 → P2-6 → P2-7 → P2-8`
- P2-6のMaestro能力はNative内部prerequisiteであり、Commonの隠れた前提にはしない

### Evidence and support boundary

- C08 Minimum Evidenceはlearner-authored Native exercise diff + successful Maestro execution artifact
- Training baseline / stock flow / Repository-required assetの存在だけでlearner competencyを満たしたことにしない
- Learner-facing materialが学習内容、演習、self-check、learning Recovery、completion、evaluationの正本。Instructor / 運営は環境、権限、端末、Training Copy、Infrastructure / Toolchainを支援する
- Workbook、Training入口、validator、Workflow TemplateはRepository-required assetであり、存在だけでLearner RequiredやCommon completionにはならない
- `docs/spec/**`がNormative Oracle。Product behavior変更、Formal Test Strategy再設計、Training runner / workflow / Artifact contract変更はしない

## Scope

### In scope

- Learner Required Common（P1-1〜P1-6、P1-8〜P1-9、P2-1〜P2-5、P2-7〜P2-8）のfile / internal Lesson監査とbounded remediation
- learner-facing Native specialization（P1-7、P2-6）の開始条件、内部prerequisite、skip / rejoin、実行Evidence、Recoveryの整理
- Core / Extension / Referenceの境界整理。特にP1-5の観点分け、P1-8のPlaywright-only Common、P2のRepository固有詳細のReference化
- 学習目標 → explanation → practice / exercise → evidence → self-check → recovery → completion → next actionの接続
- `/guide`、Seed metadata、Test Control protocol、static address dictionary、Workbook / validatorへ受講者が到達するための参照案内。値の重複コピーはしない
- P1-6へのIssue #98 H98-2〜H98-4の最小限の分類・成立条件・Evidence整合説明
- `docs/reference/curriculum-self-study-review.md`の再利用可能チェックリスト追加
- Instructor Referenceをsupport-onlyへ仕分けし、learner-facing情報を公開教材への参照へ移行
- `docs/spec/**`全Markdown / text contractのterminology、wording、internal consistency、learner / maintainer readability、semantic safety監査（実変更なし）

### Out of scope

- Product behavior、Seed Data、Test Clock、Test Control protocol、address lookup、実在住所APIの変更
- `docs/spec/**`の変更、PR 4Bの実装、Specification clarificationを要する仕様判断
- Security Curriculum全般、XSS専門Lesson、脆弱性判定の新しい台帳やDB
- Test Clock / Seed値の教材への大量複製、Issue #98専用の恒久文書・レポート・Evidence台帳・第三SSOT
- Formal Test Strategy、Training runner / workflow / Artifact contract、PR 5の実行基盤
- Curriculum全体の全面rewrite、P2/P3の無制限cleanup、Optional Agentic ReferenceやLegacy Aliasの再設計
- Pull Requestのmerge、force push、default branchへの直接mutation

## Pre-change audit coverage

### Curriculum coverage

ValidatorのLearner Required 22文書を全文、内部Lesson / exercise / confirmation / completion単位で確認し、navigation boundaryのOptional / Legacy 2文書も明示ラベルの確認対象にした。対象は次のとおり。

- Entry / navigation / contract: `README.md`、`00_learning-design.md`、`01_spreadsheet-test-design.md`、`02_competency-rubric.md`
- Part 1 Common: `part1/01_test-automation-foundations.md`〜`part1/06_execution-and-failure-analysis.md`、`part1/08_test-management-and-maintainability.md`、canonical `part1/09_part1-capstone.md`
- Part 1 route boundary: Native `part1/07_maestro-native-automation.md`、Optional `part1/09_specification-agentic-qa.md`、Legacy `part1/10_part1-capstone.md`
- Part 2 Common: `part2/01_software-development-process.md`〜`part2/05_playwright-ci.md`、`part2/07_ci-cd-quality-gates.md`、`part2/08_integration-design-capstone.md`
- Part 2 route boundary: Native `part2/06_native-ci-maestro.md`
- Repository-required support asset: `03_instructor-reference.md`

監査観点は、独立したLesson、entry profile、暗黙のPlaywright / Maestro / Git / CI / programming prerequisite、Common独立性、specializationのskip / branch / rejoin、learning flow、self-check、learner判断可能性、Recovery、Instructor boundary、terminology、canonical identifier / path / command / ID grammar、必要なSpiralと重複の境界である。

### Supporting contract coverage

- `docs/spec/**`の全Markdown / text contractを読み、normative / supporting / executable sourceの境界、BR / AC / ID、state / UI / screen / known issue / unresolved contractの用語と内部整合を確認した
- Spec auditの母集団は、audit baselineで `git ls-files docs/spec` から得られるGit-tracked file集合のうちMarkdown / text contractに該当する全件とした。画像・binaryは母集団外とし、問題のないfileごとの`no_change` Findingは作らない
- `scripts/validate-curriculum.ts`、`tests/contracts/training-curriculum.test.ts`、`training/workbook/README.md`、Workbook CSV 4件を確認した。`RISK-<DOMAIN>-NNN`、`TC-<DOMAIN>-NNN`のgrammarとrequired-file contractは維持する
- `training/playwright/**`、`training/maestro/**`、`training/github-actions/**`、Native baseline、`src/seeds/metadata.ts`、`src/seeds/scenarios.ts`、`src/test-controls/native-test-control-protocol.ts`、`src/infrastructure/address-lookup/static-address-lookup.ts`、`src/presentation/pages/guide-page.tsx`を確認した
- PR #103のADR / child Plan、Current ADR、Master Plan §5.8〜§5.10 / §16を照合した

### Audit conclusion

- P0: なし
- P1: Common独立性、learner-facing self-check / Recovery、Issue #98の観測分類・security成立条件・Evidence整合、Instructor Referenceの責務境界にbounded remediationが必要
- P2: 固定環境値の重複・到達性、P1-5観点分け、P1-8 scope、Part 2 repository detail、canonical Risk ID、Spiral labelにbounded remediationが必要
- P3: 変更対象周辺の表記整理に限定し、全件cleanupはしない
- `docs/spec/**`: 実変更を要するSpecification Findingなし。意味を変える修正、Specification clarification、Product implementation deviationは確認されなかったため、PR 4Bは作成しない

## Curriculum Finding matrix

| ID | Current evidence / impact | Severity | Existing Finding / contract | Disposition | Planned owner / file | Rationale / follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `CUR-4A-001` | 多くのRequired moduleに目標・exercise・確認問題・完了条件はあるが、期待する回答、Evidence確認、失敗時の戻り先、次の行動が一意でない | P1 | `CUR-H4`、`CUR-H5`、`CUR-M10`、`CUR-M14`、`CUR-L5` | `fix_now` | `00_learning-design.md`、Required moduleのself-study section、P1/P2 capstone | 各moduleに小さなself-study checkpointを置き、第三SSOTは作らない。継続checklistで再確認する |
| `CUR-4A-002` | P1-8本文が既存Playwright / Maestroを使用し、受講者自身が複数の両方を作成済みと前提にする | P1 | `CUR-H1`、`CUR-M4`、PR #103 Common independence | `fix_now` | `part1/08_test-management-and-maintainability.md`、README / Learning Designの境界案内 | CommonはP1-6後のPlaywright資産だけで成立し、Maestroは選択specialization / Referenceへ限定する |
| `CUR-4A-003` | P1-5の観点がCoreとExtensionに分かれず、技法・Mobile・Accessibility・Cross-roleを同じ深さで読ませ得る | P2 | `CUR-M1`、Master Plan §16 P1-5 | `fix_now` | `part1/05_playwright-e2e-practice.md` | CoreをCart / Reset / 代表Boundary / Mobileへ、Payment / Cross-role / Inspection / AccessibilityをExtensionへ明示する |
| `CUR-4A-004` | P1-8がPattern、Fixture、Seed、Lifecycleを一度に要求し、Part 2 bridgeとReferenceの境界が薄い | P2 | `CUR-M4`、Master Plan §16 P1-8 | `fix_now` | `part1/08_test-management-and-maintainability.md` | 実在するmaintainability issueと最小改善をCore、Pattern詳細とNative比較をReference / optionalへ置く |
| `CUR-4A-005` | Part 2のexact SHA / Copy mechanics、Action pin / allowlist、Preview / Production / Native detailがCoreと同じ深さに見える | P2 | `CUR-M6`、`CUR-M8`、PR #103 C12 bounded Web | `fix_now` | `part2/02_git-version-control.md`、`part2/04_ci-github-actions.md`、`part2/07_ci-cd-quality-gates.md`、`part2/08_integration-design-capstone.md` | CoreはBranch / Diff / Commit、Trigger / Job / least privilege、bounded Web Gate / Artifact / Failure。Current implementation detailはReference / Extensionへ整理する |
| `CUR-4A-006` | P2-7の完了条件にAndroid Build + RuntimeとiOS Build-onlyの差がCommon必須として残る | P1 | `CUR-H3`、`CUR-M8`、PR #103 Decision B | `fix_now` | `part2/07_ci-cd-quality-gates.md` | Native差分は選択specialization / Referenceへ移し、Common routeをP2-5 → P2-7 → P2-8で閉じる |
| `CUR-4A-007` | P1-6がFailureの技術分類は示すが、仕様違反・UX懸念・改善提案・未確定の判断とEvidence整合を明示しない | P1 | `CUR-M3`、`CUR-M12`、Issue #98 H98-2 / H98-4 | `fix_now` | `part1/06_execution-and-failure-analysis.md`、self-study checklist | 既存Failure分類を置き換えず、観測の結論を断定しない判断と報告Evidenceの一致を追加する |
| `CUR-4A-008` | `<script>`文字列の入力・保存・escape表示・HTML解釈・JavaScript実行をSecurity Findingとして区別する説明がない | P1 | Issue #98 H98-3 | `fix_now` | `part1/06_execution-and-failure-analysis.md` | Failure Analysis内のboundedな1節だけで成立条件を説明し、Security Curriculumを新設しない |
| `CUR-4A-009` | Test Clockのlearner-facing Deep Link例に固定値が複製され、必要な時点でprotocol / executable sourceへ戻る手掛かりが弱い | P2 | `CUR-H5`、`CUR-H6`、Issue #98 H98-1 | `fix_now` | `part1/02_scenario-shop-analysis.md`、`part1/07_maestro-native-automation.md`、`00_learning-design.md` | 値はコピーせず、`/guide`、Seed metadata、Test Control protocol、address dictionaryへ到達する参照経路を示す。baseline assetは変更しない |
| `CUR-4A-010` | Workbook / validatorのcanonical grammarが`RISK-CART-001`なのにP1-1の例が`RISK-CART-01` | P2 | `RA-M8`、`CUR-L3` | `fix_now` | `01_spreadsheet-test-design.md` | 変更対象周辺の局所修正。Validator / Workbook contractは変更しない |
| `CUR-4A-011` | Instructor Referenceにlearning contract、評価判断、lesson facilitationが残り、learner-facing SSOTとの境界が曖昧 | P1 | `CUR-H7`、PR #103 transition notice | `fix_now` | `03_instructor-reference.md`、learner-facing docsへの参照 | Support-onlyの環境・権限・端末・Training Copy / Toolchain責務へ整理し、学習内容を非公開側へ残さない。validator required headingはsupport意味で維持する |
| `CUR-4A-012` | 継続レビュー用の再利用可能な受講者視点checklistが存在しない | P2 | `CUR-M15`、Master Plan §16 | `fix_now` | `docs/reference/curriculum-self-study-review.md` | checklistは観点のみ。個別Finding、reviewer、日付、PASS履歴、Evidence台帳、progress欄を持たせない |
| `CUR-4A-013` | Role / State / Seed / Resetの再登場が初回定義とApplication practiceの区別なしに見える箇所がある | P3 | `CUR-L1` | `fix_now`（変更周辺のみ） | README、`00_learning-design.md`、関連self-study案内 | Spiral learningは残し、Canonical Definition / Application Practiceのラベルだけを追加する。全体cleanupはしない |
| `CUR-4A-014` | Optional Agentic ReferenceとLegacy AliasはRequired navigation / rubric / validatorから除外済みである | P2 | Master Plan discoverability contract | `no_change` | `part1/09_specification-agentic-qa.md`、`part1/10_part1-capstone.md` | 現在の明示ラベルとREADMEのnavigationが十分であり、no-op変更を作らない |
| `CUR-4A-015` | PR #103で固定したRubric、validator、contract test、Native baseline、Product / spec contractはCurrentと一致する | P0/P1 | PR #103 Decision B / C08 / C12 contract | `no_change` | `02_competency-rubric.md`、validator、contract test、Training asset | PR 4Aで再設計しない。差分が発生した場合はstop conditionとして扱う |

`CUR-4A-001`は全Required moduleを機械的に同文へ書き換える意図ではない。各fileの既存Lesson / exercise / completionへ、そのmoduleで実際に必要なself-check・Recovery・next actionだけを局所追加する。

### Post-implementation review correction

2026-09-05の反証レビューで、本文のCore / Reference境界を修正済みでも旧Required completionが残る箇所を確認した。新しいscopeは追加せず、既存Finding / Master Plan責務の実装漏れとして次を最小修正する。

- P1-3: `10件 / 3技法`等のPractice VolumeをRequired completionから外し、Risk / Specificationに対するtechnique選択理由を正本にする
- P1-8: Common completionを「実在するPlaywright保守問題1件の診断 + 最小改善1件」へ閉じ、Lifecycle / Regression inventory等はPart 2 bridge / Referenceへ残す
- P2-2: Training Copy provisioning / exact SHA / allowlist / copy mechanicsをInstructor support / Referenceへ下げ、Branch / Diff / CommitだけをCommon completionにする
- P2-3: Review件数quotaや将来Operational validationをCommon completionから外し、material diffのself-review / PR説明へ閉じる
- P2-6: Native specializationのRequired completionをlearner-authored Native CI実行、工程別Failure Evidence、Artifact / Cost判断へ閉じ、Current Job topology / API Level / Trigger / guard等はReferenceへ下げる
- self-study checklist: Issue #98固有のSecurity例はP1-6へ保持しつつ、継続checklistでは「専門的なFindingの成立条件とEvidenceを段階で区別する」一般観点へ昇華する

## Issue #98 handoff Disposition

| Input | Current evidence | Existing Finding / contractとの対応 | Disposition | Planned owner / file | Rationale | Blocker / follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| H98-1: Test Clock / Seed Dataの日付 / 学習用固定住所 / Test Control・Scenario初期状態 | `/guide`、`src/seeds/metadata.ts`、`src/seeds/scenarios.ts`、`src/test-controls/native-test-control-protocol.ts`、`src/infrastructure/address-lookup/static-address-lookup.ts`が既存SSOT。P1-7のDeep Link例だけが固定clock値を教材へ複製 | `CUR-H5`、`CUR-H6`、`CUR-4A-009`、Repository-required / Learner Required境界 | 既存PR 4A Finding / checklist観点へ統合 | `00_learning-design.md`、P1-2、P1-7、self-study checklist | 値を教材へコピーせず、必要なタイミングで既存SSOTへ到達する経路と、初期状態をTest Control / Scenarioから確認する方法を示す | Product / Seed / protocol変更なし。Runtime値の追加照合はscope外 |
| H98-2: Bug / UX / Suggestion / 未確定の区別 | P1-6の技術的Failure分類はあるが、探索結果の結論分類と再現・Evidence不足の扱いが一意でない | `CUR-M3`、`CUR-M12`、`CUR-4A-007` | 既存PR 4A Finding / checklist観点へ統合 | P1-6、self-study checklist | 既存Failure分類を維持し、その上に観測のDispositionを重ねる。新しい管理taxonomyやFinding DBは作らない | ProductのExpected Behavior推測はしない。BR / ACとEvidenceへ戻る |
| H98-3: `<script>`のSecurity成立条件 | 入力・保存・escape表示・HTML解釈・実行を区別する学習上の説明がP1-6にない。文字列が見えるだけでは実行Evidenceにならない | `CUR-4A-008`、PR #103のassessment boundary | 新しいbounded Finding | P1-6のSecurity成立条件の最小説明 | 入力からexecutable sink / JavaScript実行までの段階だけをFailure Analysisへ追加し、Security専門教材へ拡張しない | 実際のProduct security判定や修正はscope外。未成立なら未確定として扱う |
| H98-4: Evidenceと報告内容の一致 | FailureメモはEvidence欄を持つが、report本文・対象画面・操作・事象の一致とEvidence不足時の断定回避が明記されていない | `CUR-4A-001`、`CUR-4A-007`、Master Plan self-study / Evidence contract | 既存PR 4A Finding / checklist観点へ統合 | P1-6、各self-study checkpoint、self-study checklist | Screenshot / video / traceは対象・操作・事象を説明できる最小Evidenceとして扱い、台帳や専用保存フォーマットを追加しない | 再現できない場合は未確定。Evidenceの長期保存設計はPR 5 / scope外 |

Issue #98の4観点に、今回の実装で分離した恒久SSOTはない。4観点は既存教材の責務と再利用checklistへ統合し、PR本文からIssueへ戻れる形でhandoffする。

## Specification Finding / Disposition

### Audit result

`docs/spec/**`の全Markdown / text contractを、terminology、wording、internal consistency、learner / maintainer readability、semantic safetyの観点で監査した。Normative README、glossary、change process、product scope、roles、state、UI、screen catalog、known / unresolved、feature contract、templateを含め、BR / AC、screen / state、executable sourceの説明にPR 4Aで修正すべき意味上の不一致は見つからなかった。

したがって、人工的なfile別`no_change` Findingは作らず、Specification Findingは0件、`PR 4B`は不要とする。`docs/spec/**`には差分を作らない。今後、仕様の曖昧さ、明確なSpecとProduct implementationの不一致、semantics-preservingでも独立Reviewが必要な変更が見つかった場合だけ、別のSpecification disposition（`Specification clarification`、`Product implementation deviation`、または`PR 4B`）へ分離する。

## Terminology Decision Table

今回実際に判断が必要だった用語だけを対象にする。恒久Glossaryは追加しない。

| 用語 / 表記 | Decision | 使用方針 | 対象 |
| --- | --- | --- | --- |
| Learner Required path / Repository-required asset | 英語の契約語を維持 | 初出で日本語説明を添え、前者は受講者の必須学習経路、後者はvalidatorが存在を確認するRepository資産とする | README、00、Instructor Reference |
| Common Core / Native specialization / Extension / Reference / Legacy | 既存のroute / classification tokenを維持 | learner-facing説明は日本語中心とし、Common独立性、Nativeの選択branch、Extension / Referenceの非必須性、Legacy Aliasの非canonical性を明記する | README、P1-5、P1-7、P1-8、P2-6〜P2-8 |
| Test Case ID / Risk ID | machine grammarを維持 | `TC-<DOMAIN>-NNN`、`RISK-<DOMAIN>-NNN`を翻訳・短縮しない。例は`RISK-CART-001`へ統一する | Workbook、P1-1、P1-3、P1-9 |
| Seed Scenario / Test Control / fixed clock | Product / Tool / protocol名を維持 | 値を複製せず、Seed metadata、Test Control protocol、`/guide`等の既存SSOTへ到達する。`Test Clock`は一般説明内でもこの表記を維持する | 00、P1-2、P1-7 |
| Evidence / baseline / exercise | 既存 assessment語を維持 | baselineはRepository / harnessの正常性、exerciseはlearner-authored変更、Evidenceは完了判断の根拠として分離する | P1-6、P1-7、P1-9、P2-5、P2-6 |
| 仕様・Expected Behavior違反 / UX上の懸念 / 改善提案 / 未確定（Evidence・再現条件不足） | learner-facing分類をこの4表現へ統一 | 新taxonomyではなく、探索観測を断定する前の説明ラベルとして使う。BR / AC、利用者影響、実現したい変更、再現 / Evidenceの不足を分ける | P1-6、checklist |

## File-level implementation plan

### Entry / Common learning flow

- `README.md`: existing route / asset boundaryを維持し、self-study completion loopと環境SSOTへの到達案内を追加する
- `00_learning-design.md`: entry profile / prior-knowledgeを維持し、self-study loop、Canonical Definition / Application Practice、Recovery / next actionを追加する
- `01_spreadsheet-test-design.md`: `RISK-CART-01`の例を`RISK-CART-001`へ局所修正し、Risk → Test Case → Layer / Tool → Evidenceのself-checkを追加する
- `02_competency-rubric.md`: PR #103で固定済みのため変更しない

### Part 1

- `part1/01_test-automation-foundations.md`: entry learnerが自分の説明と演習成果物を確認し、つまずきを該当Lessonへ戻すself-checkを追加する
- `part1/02_scenario-shop-analysis.md`: `/guide`、Seed metadata、Scenario、Test Control、address dictionaryへの到達経路を追加し、固定値を複製しない。self-checkを追加する
- `part1/03_test-design-and-automation-selection.md`: Practice Volumeの件数 / 技法数をRequired completionにせず、Risk / Specification fitに対するtechnique選択と理由をcompletionへ接続する
- `part1/04_playwright-foundations.md`: JavaScript / TypeScript未経験を暗黙前提にせず、最小コードの期待確認・Error recovery・次のP1-5を追加する
- `part1/05_playwright-e2e-practice.md`: Core（Cart / Reset / Boundary / Mobile）とExtension（Payment / Cross-role / Inspection / Accessibility）を分け、exercise self-checkを追加する
- `part1/06_execution-and-failure-analysis.md`: H98-2〜H98-4を既存Failure Analysisへ統合し、security成立条件、Evidence整合、Recoveryを追加する
- `part1/07_maestro-native-automation.md`: 固定clock値をparameter exampleへ置換し、既存SSOTへの到達経路、Native start gate、artifactとexerciseのself-check / recoveryを追加する。Physical Androidとrequired tokenは維持する
- `part1/08_test-management-and-maintainability.md`: hidden Maestro prerequisiteを除去し、Common completionを実在するPlaywright保守問題1件の診断 + 最小改善1件に閉じる。Native比較 / Pattern詳細はReference、Lifecycle / Regression inventoryはPart 2 bridgeへ置く
- `part1/09_part1-capstone.md`: Common / Native boundaryを維持し、completion evidenceの自己確認とRecovery / next actionを具体化する
- `part1/09_specification-agentic-qa.md`、`part1/10_part1-capstone.md`: current Optional / Legacy labelsを根拠に変更しない

### Part 2

- `part2/01_software-development-process.md`: Process diagramのexercise、Evidence、self-check、次のGit lessonを接続する
- `part2/02_git-version-control.md`: Branch / Diff / CommitをCommon completionとし、Training Copy provisioning / exact SHA / allowlist / copy mechanicsはInstructor support / Referenceへ置く
- `part2/03_github-pull-request-review.md`: Fork / Remote / Push / PRとmaterial diffのself-reviewをCommonとし、第三者Review・件数quota・将来Operational validationをCommon completionへ入れない
- `part2/04_ci-github-actions.md`: Trigger / Job / least privilege / Failure diagnosisをCore、current SHA / allowlist / pin detailをReferenceとして明示し、self-checkを追加する
- `part2/05_playwright-ci.md`: bounded Web CIのBuild / Browser / Artifact / Failure Evidenceをself-checkへ接続する
- `part2/06_native-ci-maestro.md`: Native specializationのRequired completionをlearner-authored Native CI実行、工程別Failure Evidence、Artifact / Cost判断へ閉じ、Current Job topology / API Level / Trigger / metadata / guard等はReferenceへ置く
- `part2/07_ci-cd-quality-gates.md`: Common Coreをbounded Web Gate / Artifact / fail-closedへ限定し、Preview / Production / Native detailをExtension / Referenceへ整理する
- `part2/08_integration-design-capstone.md`: Common pathのcompletionを明示し、Native / full deliveryをoptional / outside bounded Commonとしたままself-checkを追加する

### Reference and review asset

- `03_instructor-reference.md`: validatorが要求するheadingはsupport意味で維持し、学習内容・評価判断・Answer KeyをInstructor-only側へ残さない。環境 / 権限 / Training Copy / Toolchain troubleshootingだけに整理する
- `docs/reference/curriculum-self-study-review.md`: 受講者視点で継続利用する観点のみ追加し、個別結果を保存する欄は作らない。Issue固有のSecurity例を恒久的な専門Gateにせず、専門的なFindingの成立条件 / Evidenceを段階で確認する一般観点として再利用する

## Validation

実装後、次を指定順で実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run typecheck
git diff --check
```

追加のmanual cross-check:

- Learner Required path全文とlearner-facing Native specialization material
- Common routeをspecialization未受講で完了できること、P1-7 / P2-6のskip / branch / rejoin
- Instructor Referenceがlearner-facing learning SSOTになっていないこと、および環境支援責務を保持していること
- self-checkだけで成果物の充足と未達時の次の行動を判断できること
- P1-3 / P1-8 / P2-2 / P2-3 / P2-6のcompletionがPractice Volume、Repository固有運用、Current CI topologyを再びRequiredへ持ち込んでいないこと
- canonical Test Case / Risk ID grammar、Curriculum / Workbook / validator contract
- H98-1〜H98-4のDispositionと実変更の対応
- `docs/spec/**`に差分がないこと、PR 4B対象がないこと、PR 5 / Product変更がないこと

失敗時は最初の異常と派生エラーを分離し、原因が安全に最小修正できる場合は修正後に関連gateだけを再実行する。同じエラー2回連続、同じ工程3回失敗、新しい情報なし、または上流失敗後の後続実行は停止して原因調査へ戻る。

## Stop conditions

- Expected Behaviorを推測しないと直せないSpecification ambiguity
- Product decision、Product behavior変更、Seed / Test Control変更が必要
- 明確なSpecとCurrent implementationの不一致がLearner completionを阻害する
- PR #103 fixed contractと矛盾する変更が必要
- PR 4A bounded scopeを超える、PR 5やSecurity Curriculumへ広がる
- `docs/spec/**`の実変更が必要、またはPR 4Bが必要な意味変更 / clarificationが発生する
- P0/P1を解消できないまま、またはvalidation未実行・失敗のまま完了扱いにする必要がある

Stop conditionに該当した場合は、未解決Finding、根拠、未実行validation、次の対応先をRun Artifactへ記録し、推測実装・無制限retry・Draftでない通常完了へ進まない。

## Completion conditions

- Pre-change audit、Curriculum Finding、#98の4観点Disposition、Specification audit、Terminology Decisionが本Planに記録されている
- `fix_now`のP0/P1とDoDに必要なbounded P2/P3が実装され、`defer` / `no_change`はCurrent evidenceとboundaryが明示されている
- Common / Native / Extension / Reference / Legacy、Learner Required / Repository-required、Instructor supportの境界がPR #103契約どおりである
- Learner Required pathと選択Native specializationでlearning flow、self-check、Recovery、completion、next actionが確認できる
- Practice Volume、Repository固有のprovisioning / copy mechanics、Current CI topologyを「役立つReference」からRequired completionへ逆流させていない
- Issue #98専用の恒久SSOT、Evidence台帳、Security lesson、第三SSOTが存在しない
- `docs/spec/**`にPR 4A差分がなく、PR 4B要否が確定している
- 必須validationとmanual cross-checkが実際の結果に基づきPASSまたは具体的停止理由として記録されている
- self-review後、指定branchからbase `main`へのOpen PRが作成され、mergeしていない

## Follow-up boundary

- `CUR-L2`（pilot実測値）は実測なしのままdefer。必要になった場合は別のpilot / measurement計画で扱う
- Native runner / workflow / Artifact contract、Training failure executable flow、Formal CI / Product behaviorはPR 5または既存contractの所有者へ戻す
- Preview / Production / full multi-platform delivery、第三者Review、Security専門教育はCommon completionへ追加しない
- 今後の受講者視点レビューは`docs/reference/curriculum-self-study-review.md`の観点を再利用する。個別結果の蓄積先は作成しない
- 仕様の意味変更、Specification clarification、明確なSpecへのProduct deviationが新たに確認された場合はPR 4Aへ混ぜず、対象ownerの別Issue / PRへhandoffする