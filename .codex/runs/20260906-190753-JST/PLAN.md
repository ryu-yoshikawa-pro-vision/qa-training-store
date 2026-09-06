# Phase 6 Refactoring Necessity Review Plan

## Objective

- 最新 `main` を基準に Repository Audit §4.1〜§4.16 の16 candidateをCurrent Evidenceで分類する。
- 分類は `refactor_now` / `refactor_when_touched` / `keep_as_is` / `needs_more_evidence` の4値だけを使用する。
- Phase 6はdecision-onlyとし、Product / Test / Training / Workflow / dependency / Specification / Curriculumの実装変更は行わない。

## Scope

- In: 指定Execution Plan Task 1〜13、candidate単位のbounded Evidence、RA-C1 / RA-Q1、durable report、Run Artifact、指定validation、commit / non-force push、PR #128確認。
- Out: Product refactor、全Repository再Audit、全commit分析、完全call graph、常設解析基盤、Issue #72のClose、PR merge。

## Source of truth

- Candidate / Evidence / classification / freshness / completion: Master Plan §19。
- Global stop conditions: Master Plan §21。
- Repository remediation DoD: Master Plan §24。
- 実行順序: `docs/plans/2026-09-06_140451_phase6_refactoring_necessity_review.md`。
- 初期Evidence: `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`。

## Assumptions

- 現在branchは指定された `docs/phase6-refactoring-necessity-review` を継続使用する。
- 同一会話内のPhase 6は本Run `20260906-190753-JST`で管理する。
- Audit baseline以降のlineageと、inception〜Currentのcandidate-targeted historyを用途分離して確認する。
- Evidence categoryが性質上非該当の場合は `N/A — 理由` とする。

## Hypotheses

- H1: size / line countだけでは `refactor_now` を支持しない。具体的なCurrent risk / cost、benefit、延期コストを確認する必要がある。
- H2: Native / Web、Dexie / SQLite、Formal / Training、CI / physical-deviceの境界は、意図的で保護されている場合、DRY目的だけで統合しない。
- H3: 最低限のCurrent surface、consumer、protection、boundary、targeted historyが揃えば、全candidateをPass 2へ送らず分類できる。

## Research Plan

1. 必須文書、最近のADR、最近のRun、PR #128の状態と差分を確認する。
2. `git fetch origin main`後、latest `origin/main`を含むことを確認し、必要なら通常mergeする。
3. §4.1から§4.16まで、各candidateをEvidence Card → targeted history → consumer / protection / boundary → Pass 1判定の順に連続処理する。
4. Pass 1で判断不能なcandidateだけ、欠けた論点に限定してPass 2を一度実施する。
5. Cross-candidate sanity check、RA-C1 / RA-Q1を行い、durable reportへ集約する。
6. diff-first freshness check、decision-only scope確認、sanitization、指定validation、commit、PR差分確認、non-force pushを行う。

## Classification rule

1. Currentな具体的risk / costがあり、今対応するbenefitが延期より明確に大きい → `refactor_now`
2. maintainability costはあるが、関連変更時に対応する方が合理的 → `refactor_when_touched`
3. それ以外 → `keep_as_is`
4. bounded Pass 2後も判断材料が不足 → `needs_more_evidence`。不足Evidence、取得条件、再判断triggerを記録する。

## Definition of Done

- 16/16 candidateに最終classificationがある。
- Evidence Card相当の指定項目がdurable reportにある。
- RA-C1とRA-Q1がreportに集約されている。
- freshness確認済みで、last confirmed main SHAがreportにある。
- Product等の禁止対象変更がない。
- Run Artifactのsanitization Write / Checkが完了している。
- `pnpm run format:check`、`pnpm run lint:markdown`、`git diff --check HEAD`、commit後の`git diff --check origin/main...HEAD`がPASSしている。
- 指定branchへnon-force pushし、PR #128がOPENのまま最新head SHAとchanged filesを確認している。

## Risks / stop rules

- Evidence不足を`keep_as_is`へ直結せず、まず`deep-dive-needed`としてbounded Pass 2を行う。
- Product behavior / Normative Specification変更、常設解析基盤、candidate identityの対応不能が必要になった場合は追加調査を止め、既存Evidenceで分類できなければ`needs_more_evidence`とする。
- classificationを得るために全Repository、全PR、全Issue、全transitive callerへ調査を拡張しない。
- `refactor_now`があってもこのRunでは実装しない。

## Thinking Log

- 2026-09-06: PR #128は指定branch・OPEN・Execution Planのみの差分であり、Phase 6の実調査とdurable reportを同一PRへ追加する方針を確認した。
- 2026-09-06: `git fetch origin main`後のinvestigation baselineは`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`。Phase 6 branch HEADはこの`origin/main`を含んでいるため通常mergeは不要だった。
- 2026-09-06: §4.1はPass 1で分類可能。13 repository、row mapping、transaction context / runnerを同一SQLite application boundaryとして保護する構造で、現時点のmaterial changeはPhase 2実装と1回の関連修正に限定される。分類は`refactor_when_touched`とし、次の同boundary変更時に再評価する。
- 2026-09-06: §4.2はPass 1で分類可能。Native catalog queryとguest cart compatibilityをSQLite repository / gatewayで持ち、recentな大規模変更はcatalog viewer / route authorization整合の1回だった。分類は`refactor_when_touched`とし、次のcatalog / cart compatibility変更時に再評価する。
- 2026-09-06: §4.3はPass 1で分類可能。Login〜Account〜Checkout〜Order〜ReviewのNative purchase UIを共有runtime hook / checkout state hook / screen primitivesで構成し、直近はinvariant修正とinput contract整合だった。分類は`refactor_when_touched`とし、次のpurchase screen / state boundary変更時に再評価する。
- 2026-09-06: §4.4はPass 1で分類可能。Home / Catalog / Search / Product / Cart / Guide / LegalのNative storefrontを同一platform presentation surfaceで構成し、#42で大きく拡張後も入力制限等の修正が続いた。分類は`refactor_when_touched`とし、次のstorefront capability / async state boundary変更時に再評価する。
- 2026-09-06: §4.5はPass 1で分類可能。Admin product list / create / editと共有ProductEditor・dirty navigation guardが1つのcohesive product-management surfaceにまとまり、過去に複数回の機能・repair変更がある。分類は`refactor_when_touched`とし、次のProductEditor / form workflow変更時に再評価する。
- 2026-09-06: §4.6はPass 1で分類可能。Checkout session、order creation、payment finalize / retry、customer order queryはcustomer purchase lifecycleとしてtransaction scopesを共有し、#43/#84/#88で境界修正が続いた。分類は`refactor_when_touched`とし、次のpayment/order state追加または同じCT boundary repair時に再評価する。
- 2026-09-06: §4.7はPass 1で分類可能。CustomerReview、AdminReview、AdminUserの3 application classがshared dependency typeを使って同一fileにあり、transaction scopesは`review-change`と`change-user-access`へ分かれる。分類は`refactor_when_touched`とし、role/capabilityごとの次回変更時に再評価する。
- 2026-09-06: §4.8はPass 1で分類可能。Admin Productのquery / create / update / preview / status / bulkを同一product aggregate capabilityとして持ち、transaction scopesもaggregate更新に対応する。分類は`keep_as_is`とし、通常のproduct contract変更で自然に同一boundaryを変更するため、別refactor triggerは設定しない。
- 2026-09-06: §4.9はPass 1で分類可能。Native Static、Android automation / production build、bundle guard、runtime / Maestro、training baseline、iOS reusable workflow、final fail-closed verifyを1つのNative CI contractへ結合し、同じworkflow boundaryへのmaterial repairが反復している。分類は`refactor_now`だが、実装はPhase 6外の別Plan / 別PRへ送る。
- 2026-09-06: §4.10はPass 1で分類可能。Web shell、Admin、Storefront、form/table/checkout/review、responsive/accessibilityを単一global stylesheetへ集約し、直近3日だけでもoverflow、loading layout、review link、breadcrumb等の同boundary repairが反復している。分類は`refactor_now`だが、実装はPhase 6外の別Plan / 別PRへ送る。
- 2026-09-06: §4.11はPass 1で分類可能。Seed SSOTはWeb / Native / Formal / Training / Guideへfan-outするが、dataset生成、scenario overlay、metadata、validationの公開面は一貫したshared data boundaryとして保護されている。分類は`refactor_when_touched`とし、次のscenario/version/clock/identity変更またはcross-platform repair反復時に再評価する。
- 2026-09-06: §4.12はPass 1で分類可能。Agentic QA Harnessは大規模だが、Preparation、Validation、Isolation、Artifact、Evaluationを段階ごとのcontractで保護し、ADR-0012/0015の「deterministic supporting harness」責務に整合する。分類は`refactor_when_touched`とし、schema / trust / artifact pipeline変更または同contract repair反復時に再評価する。今すぐの分割は実装しない。
- 2026-09-06: §4.13はPass 1で分類可能。Formal Linux CIのBash helperとTraining Windows physical-deviceのTypeScript runnerはcleanup semanticsに重複があるが、serial / readiness / quoting / artifactのplatform ownershipが異なり、#124でTraining側の責務も整理済みである。分類は`keep_as_is`とし、semantic driftまたはplatform-independent cleanup failureが観測された時だけ再評価する。
- 2026-09-06: §4.14はPass 1で分類可能。Web E2E fixtureは小規模なshared lifecycle adapterで、explicit scenario reset、metadata / identity postcondition、console artifact、未使用scenario fail-closeを持つ。分類は`keep_as_is`とし、fan-inやsizeだけでは分割理由にせず、具体的なlifecycle分離failureが出た場合だけ再評価する。
- 2026-09-06: §4.15はPass 1で分類可能。Dexie / SQLiteは同じApplication contractsを異なるWeb / Native platform modelへ実装する意図的duplicationで、composition root、schema / mapper / transaction、shared contract testsが分かれている。分類は`keep_as_is`とし、semantic driftやadapter-specific failureがない限り共通化しない。
- 2026-09-06: §4.16はPass 1で`deep-dive-needed`とした。type-only import、runtime cycle未確認、既存architecture testの対象範囲は確認できたが、Domain Repository PortとApplication DTOのcanonical owner / 許容依存方向が未確定だった。Pass 2ではADR、repository interface説明、ProductViewer owner、既存contractの不足論点だけを確認し、判断を確定できるnormative evidenceがないため`needs_more_evidence`で停止する。RA-Q1は同じEvidenceを再利用する。
- 2026-09-06: Cross-candidate sanityでは、同じNative SQLite Evidenceを使う候補でも、repository consolidation（§4.1/§4.2）とintentional Web/Native adapter duplication（§4.15）を別boundaryとして扱い、Native/Web UI、Formal/Training helper、Seed/fixture、Application use-caseの分類も責務と保護境界に基づき区別した。RA-C1は16件の集約のみ、RA-Q1は§4.16 Evidenceの再利用のみとする。
- 2026-09-06: Durable reportをdocs/reports/2026-09-06_193114_refactoring_necessity_review.mdへ作成した。freshnessではlatest origin/mainがinvestigation baselineと同一で、既存Evidenceから再利用したrelevant setに変更がないため再評価なしとした。
- 2026-09-06: decision-only scopeを確認し、sanitizer Write / Checkは4 files scanned・residual_findings 0、format check・markdown lint・git diff checkはPASSした。Markdown lintの初回識別子解釈failureはreportの最小表現修正で解消した。
- 2026-09-06: commit 4c4b6b4を作成し、git diff --check origin/main...HEAD PASS後に指定branchへnon-force pushした。remote headとPR #128 OPEN / changed filesを確認した。Run Artifactの最終remote / PR evidenceを追記して追補commitへ進む。
