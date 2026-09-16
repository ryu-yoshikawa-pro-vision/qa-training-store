# 詳細3：受講者向け修了確認・Part 2自走導線

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、インデックスから参照するPlan詳細です。収録した既存節の本文は、分割前Planの内容を維持しています。

## 収録範囲

### 5.7 Wave T1 — 受講者向け修了確認（成果物・実行結果）とEvidence契約

**Owner**: Parent + Training owner。**Dependency**: L1のCase / intake契約、L2の縦断成果、確定したHandoff bundle / Receipt方針、既存PR 5の境界確認。**Write set**: `package.json`（`training:completion:check`のscript登録）、`scripts/training/check-completion.ts`（新規予定）、`tests/contracts/training-completion.test.ts`（新規予定）、`training/github-actions/README.md`、`training/github-actions/training-ci.yml`。Native選択経路をCIへ接続する場合だけ`training/github-actions/training-native-ci.yml`を追加write setとし、既存Product Formal workflowはwrite setに含めない。

既存PR 5 Planを基礎に、静的資材検証と学習者修了検証を分離する。ここでいう受講者向け修了確認はGitHub Actionsそのものではない。学習者がローカルで実行できる確認Command / 判定ロジックを用意し、GitHub Actionsはその同じ契約をPR / Push上で実行する場所とする。ローカルとCIで「学習者の成果が必要」というoutcomeは共通にするが、CIだけが持つPR / Run / Artifact情報までローカルと同一にするとは解釈しない。

#### 維持するもの

- Web / Nativeの既存direct entryとTraining config。
- Nativeのbaseline → exercise、same attempt / runId、JUnit、output namespaceの境界。
- Training workflowとProduction / Formal workflowの分離。
- Failure Artifactを診断用に残す契約。

#### 追加するもの

- learner-owned差分があることの確認。
- Test Case IDとlearner code / Flowの対応確認。
- Webは有意なAction / Locator / Assertion、Nativeはcanonical exercise graphから到達するlearner diffを確認する。
- 実行Receipt（Command、Run Context、exit code、Artifact path）を生成する。
- 修了確認モードでは`Not run`を完了扱いにしない。
- Failure演習では、初回Failと修正後Passの2つのReceiptを結び付ける。
- Evidence pathの実在性と、該当Case / Runへの対応を確認する。

#### 受講者向け修了確認の契約（実装前に固定する）

| 項目 | 契約 |
| --- | --- |
| Command | `corepack pnpm run training:completion:check -- --mode <common\|part2\|native> --root <handoff-root>`。今回採用したHandoff bundle方式の固定入口とする |
| Input | 評価intake内の4 CSV、learner-owned code / Flow、実行Receipt、Evidence参照、必要なsource SHA / Copy manifest |
| Web必須 | `TC-CART-101`との対応、learner-owned `training/playwright/exercises/learner-cart.spec.ts`差分、意味のあるAction / Locator / Assertion、Pass実行、Evidence実在性。`training-exercise-starter.spec.ts`の提供Caseだけでは不可 |
| Native必須 | Native opt-in時だけ、canonical exercise graphへ到達するlearner diff、同一attemptのbaseline → exercise、JUnit / Screenshot / log evidence。baseline単独、iOS Build-only単独は不可 |
| Part 2必須 | Training Copy識別、source SHA、Branch / PR、Workflow Run / Check、Web exercise実行、Artifact参照。GitHub Actionsを使わないローカルPassはPart 2の完了へ変換しない |
| Receipt最低項目 | `mode`、`case_id`、`run_context`、実行Command、exit code、判定、source SHA、実行時刻、artifact / evidence refs、環境情報。秘密情報・Token・個人credentialは記録しない |
| Status | `PASS`（全必須条件）、`INCOMPLETE`（成果物・対応・説明・Evidence不足）、`FAIL`（実行または契約違反）、`BLOCKED`（Account / Permission / Runner / GitHubなど環境要因）、`NOT_RUN`（未実行）。`PASS`以外は完了にしない |

`validate:curriculum`は22 required documents、4 Workbook、Training資材のstatic validatorであり、checkerのPASSではない。checkerのstatusとProcess exit codeは実装時に一致させ、少なくとも`PASS=0`、それ以外は0以外とする。環境BLOCKEDをFAILへ偽装せず、Block理由と復帰手順を人間向け出力へ含める。

「意味のあるAssertion」は、対象Caseの期待結果または状態変化にデータ依存するAssertion（例: visible text / role state / count / URL / business outcome）を最低1つ含み、単なる`toBeTruthy`、固定URLだけ、要素存在だけ、または無関係なDOM要素だけを合格としない。実装時はAST / metadata検査の対象構文を明示し、positive / negative fixtureでfalse positiveを検証する。自由な実装表現を機械的に一つへ揃えない。

Failure演習の最低証跡は、同一`case_id`に対する`initial`（意図したFail、原因分類、Evidence）と`repaired`（修正内容、Pass、別Evidence）の2 Receiptである。`04_execution-improvement.csv`の`run_context`は異なる値にし、expected-failure教材の既定Artifactだけを学習者の修了Evidenceに流用しない。Self-checkの説明文は学習者の理解を促すが、checkerは説明の意味理解を自動採点しない。

#### 実装制約

- learner-state DB、採点エンジン、AI graderを追加しない。
- 受講者のコードを一つの正解と完全一致させない。
- `validate:curriculum`は資材・構造・static wiringの正本、受講者向け修了確認は受講者成果と実行Evidenceの正本とする。
- ローカルとGitHub Actionsの両方で受講者向け修了確認を実行し、baselineだけの成功を修了としない。共通のoutcome contractと、環境固有Evidence（Local path対PR / Run / Artifact）を明確に分ける。

#### 完了条件

- Web starterのAssertionなし実行が修了確認でPASSにならない。
- Native baselineだけの成功がC08の修了にならない。
- `Not run`、存在しないEvidence、unreachable Flow、無関係なAssertionを検出できる。
- localとGitHub Actionsで共通の必須成果を説明でき、環境固有Evidenceの差も説明できる。
- positive / negative fixture、初回Fail → 修正 → 再実行の2 Receipt、各Statusのexit codeがcontract testで確認できる。

**停止条件**: checkerが自由な保存場所を直接推測する必要がある、Assertion判定が完全一致／AI採点へ拡大する、Part 2のGitHub証拠を取得できない、または既存Training / Formal境界を壊さないと成立しない場合。**Rollback**: 新checkerを診断モードへ戻し、既存Training command / validatorを残す。workflowを変更した場合はtemplateとactive copyを同時にrevertする。

### 5.8 Wave T2 — Part 2のGitHub Actions自力準備と講師なし開始導線

**Owner**: Parent + curriculum / Training owner。**Dependency**: T1のReceipt / status契約、W0のTraining Copy安全確認。**Write set**: `part2/02_git-version-control.md`、`part2/03_github-pull-request-review.md`、`part2/04_ci-github-actions.md`、`part2/05_playwright-ci.md`、`training/github-actions/README.md`、T2で追加するcontract assertionを含む`tests/contracts/training-curriculum.test.ts`。既存の`prepare-training-copy.ts` / `validate-training-copy.ts`はinspect-onlyとし、W0で再現可能な欠陥が確認されOwnerが変更を承認した場合だけ、その該当scriptを別の修正taskとして扱う。Productionの`.github/workflows/*.yml`は原則write set外。

1. Part 2開始前に、Node / pnpm / Git / GitHub Account / Fork / Training Copy / Permission / Actions設定を自己診断できるPreflightを追加する。各項目を`ready` / `blocked` / `not started`に分け、講師へ質問する前に確認するCommandと復帰先を示す。
2. 主経路は、学習者がSource SHAを確認し、`corepack pnpm run training:copy:prepare -- --source-sha <40-char-sha> --target <new-dir>`で既存SourceをDisposable Copyへ複製し、Copy内で`corepack pnpm run training:copy:validate -- --root <training-copy>`を実行してから自分のGitHub AccountへPushする手順とする。事前にSourceのfull history、対象SHAの存在、空のtarget、Push可能な自分のGitHub RepositoryをPreflightで確認する。既存scriptがclone / checkout / workflow生成を行うこと、target既存時は上書きしないことを説明する。
3. `training:copy:prepare`、`training:copy:validate`を、`source-sha`、target、active workflow、allowlistの意味とともに受講者向けへ説明する。`training/github-actions/training-ci.yml` / `training-native-ci.yml`はSource template、Copyの`.github/workflows/`はactive workflowであり、templateとactive fileのbyte equalityを確認する。Copy validationは学習者変更前のprovisioning gateであり、学習者変更後のcompletion gateではない。
4. `docs/curriculum/test-automation/part2/02_git-version-control.md`〜`05_playwright-ci.md`に残る「講師または組織が準備済みCopyを提供」「受講者はCopy準備を要求されない」という現行記述を、主経路と矛盾しない自己学習記述へ更新する。`03_instructor-reference.md`は必須経路ではなく、例外時の補足へ戻す。Production Workflow、Secret、Deployを受講者が編集する導線は追加しない。
5. 検証済みCopyで作業Branchを作り、P2-2〜P2-5は、Branch → Commit → Push → PR → Checks → Artifact → `training:completion:check`までを一本道にする。ForkはRemote / 権限の説明に使うが、Forkと自己生成Copyの二つを異なる完了基準として並列表示しない。
6. Part 2ではGitHub Actionsを必須の実施環境・修了条件として明示する。GitHub Account、Fork / Training Copy、Permission、workflowの有効化、Artifact確認ができない場合は環境BLOCKEDまたは未開始とし、講師の個別設定を完了条件へ混ぜない。Common課程はこの条件から独立してローカルで完了できる。
7. P2-5のRun ID / Check / Artifactを、URLだけに依存せずReceiptへ転記し、P2-8まで参照可能にする。14日Retentionに依存せず、必要なreceiptと要約をローカルへ保存する。Token、Secret、個人情報を保存しない。
8. Native / iOSは選択課程とし、P2-6をskipする場合のP2-5 → P2-7のrejoinを明示する。iOS Build-onlyはNative選択時の補助Evidenceであり、Common / Web CIの代替ではない。

完了条件:

- 講師向け資料を読まなくても、受講者がPart 2開始可否を判断できる。
- 環境問題、権限問題、学習理解の問題を分類し、それぞれのRecoveryへ進める。
- P2-8の最小成果物が、Web CI → Gate → Artifact → Failure reasoningとして有限に定義される。
- 学習者が一度のclean copyで、Copy準備からPRのTraining Workflow実行までを再現し、必要なRun / ArtifactをReceiptへ残せる。

**停止条件**: Training CopyのSource SHA、active workflow allowlist、template byte equality、Secretなし／least privilegeを検証できない、またはGitHub Account / Permissionが外部管理者の手作業なしに用意できない場合。**Rollback**: 学習者向けrunbookとTraining READMEだけを戻し、Production Workflowを変更しない。Copy生成処理を変更した場合は、旧scriptと旧allowlistを維持したまま新経路を必須化しない。
