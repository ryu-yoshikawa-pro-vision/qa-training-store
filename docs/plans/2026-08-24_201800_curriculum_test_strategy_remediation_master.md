# Curriculum / Test Strategy Remediation Master Plan

## 1. Goal

PR #53 で `main` に保存された次の2レポートを入力として、Repository の Current Documentation、Formal Test Strategy、Curriculum、Training Evidence、Refactoring 判断を段階的に整合させる。

- `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- `docs/reports/2026-08-24_074011_curriculum-validity-review.md`

加えて、2026-08-26 の Curriculum 詳細レビューと要件整理で確認した、教材品質・学習体験・用語統一・Canonical Contract・自己学習品質の追加論点も本 Master Plan に統合する。

完了時には次を満たすこと。

- Current Documentation が implementation / CI の事実と一致する。
- Formal Test Strategy が Current Formal Suite、Test Perspective、Execution / Platform / CI Gate を説明する。
- Requirement / Risk / Technique / Formal Test / CI Gate の最小 Traceability がある。
- Curriculum の共通卒業要件と Native specialization の境界が一意である。
- C01〜C12 の Minimum Evidence を Lesson / Exercise / Artifact から追跡できる。
- 各 Learner Required Lesson が、独立した学習単位として成立するか、または前後の内容へ統合されている。
- 学習目標 → 説明 → Practice / Exercise → Completion Evidence が矛盾なくつながる。
- Learner-facing な一般用語は日本語中心で統一され、Tool / API / Code identifier など英語を維持すべき語との境界が一意である。
- Curriculum / Workbook / Validator / Training asset / Normative Specification の参照契約に矛盾がない。
- `docs/spec/**` の learner-facing / normative text が同一の言語・用語方針で監査され、Product behavior を変えずに必要な editorial correction が行われている。
- Training の Baseline と Learner-authored Evidence を区別できる。
- 対象受講者像が明文化され、コードベースの自動化未経験者を前提に教材の説明深度と自己確認方法を判断できる。
- Learner Required path では、学習内容の説明、演習判断、答え合わせ、学習上のRecovery、完了判定を learner-facing material だけで進められる。
- Instructor / 運営向け資料は、環境準備・アカウント・権限・端末・演習Repository / Training Copy・Infrastructure / Toolchain 等、受講内容の外側の支援へ限定されている。
- 初見受講者レビューを継続的に実施できる品質基準、再利用可能なチェック表、記録方法が定義されている。
- 初見受講者レビューの実施結果や PASS は、本 Master Plan の完了条件にはしない。
- Technical Debt 候補は size 単独ではなく Evidence に基づいて分類される。

## 2. Current understanding

実装開始時に前提とする Current Repository の事実は次のとおり。

- Curriculum の canonical Learning Design file は `docs/curriculum/test-automation/00_learning-design.md`。
- `scripts/validate-curriculum.ts` は誤って `docs/curriculum/test-automation/00_learning_design.md` を required file として要求している。
- Web CI は pull request で `format:check`、`lint:markdown`、`validate:spec`、`validate:curriculum` などを実行する。
- Current Seed Version の implementation SSOT は `src/config/versions.ts`。
- `CHANGELOG.md` は履歴であり、Current 値へ書き換える SSOT ではない。
- Current Web Training には `training:web:baseline`、`training:web:mobile`、`training:web:mobile:exercise` があり、Desktop learner exercise の canonical command はない。
- Current Native Training には `training:native:baseline` があり、learner exercise YAML は存在するが canonical package command / artifact contract は baseline より薄い。
- Training Copy は `training-ci.yml` と `training-native-ci.yml` を active workflow として配置する。
- Product Native の Current Guarantee は Android Runtime + iOS Build-only。iOS Runtime / Maestro PASS は Required Guarantee ではない。
- Repository Audit §4.1〜§4.16 は Refactoring candidate inventory の正本であり、`CANDIDATE` / `COMPLEXITY` は Refactor 必須を意味しない。
- Curriculum 本文には `CART-001` / `PRODUCT-001` のような Test Case ID 例がある一方、canonical Workbook / validator contract は `TC-CART-001` / `TC-PRODUCT-001` 形式を要求する箇所があり、Learner が教材どおり入力すると validator contract と不整合になる可能性がある。
- 一部のファイルでは内部 Lesson が数行程度で終わり、独立した学習目的・説明・Practice・到達確認が弱い箇所がある。短いこと自体ではなく、独立した学習単位として成立しているかを確認する必要がある。
- Learner-facing 文書には日本語と英語の一般用語が混在している。固有名詞や code identifier 以外は、受講者の認知負荷を下げる観点で統一基準が必要である。
- `docs/spec/` には Feature spec だけでなく、README、Glossary、Product Scope、Role / Permission、State / Scenario、UI / UX Contract、Change Process、Known Deviations、Template 等の text contract があり、Curriculum から直接参照されない文書も learner / maintainer の仕様理解へ影響する。
- Current Curriculum は `03_instructor-reference.md` を持ち、Facilitation / Troubleshooting / evaluation guidance を Instructor 向けに記載している。また Rubric や一部 Lesson には講師支援・採点・提出を前提とした表現があり、Learner Required path だけで自己確認できる情報との責務分離が必要である。
- Current validator の required-file list は Repository上存在必須の curriculum asset を表しており、受講者が修了のために必ず読む Learner Required path と同義ではない。`03_instructor-reference.md` は前者には含め得るが、後者には含めない。

### Assumptions

- PR #53 の2レポートは Master Plan の初期入力として有効だが、各 child PR 開始時に Current `main` で再検証する。
- Current Repository の局所差分は Phase 0 / 各 child Plan の repo mapping で解消でき、Master Plan の大順序を崩す必要はない。
- PR 4 の全文監査で新規 Finding が出ることは想定するが、Product behavior変更や Formal Regression 再設計が必要になった場合は本 remediation へ無理に取り込まない。
- 自己学習品質は「Instructor / 運営が一切存在しない」ことを意味しない。環境準備、端末、アカウント、権限、演習Repository / Training Copy、Infrastructure / Toolchain 障害の支援は許容する。
- 自己学習品質で禁止する依存は、Learner Required path の理解、演習の選択・判断、答え合わせ、学習上のRecovery、完了判定を Instructor の口頭説明・個別判断・非公開情報に依存させることである。
- 初見受講者レビューは Repository remediation の最終Gateではなく、教材を運用しながら繰り返す継続的な品質改善活動として扱う。
- 初見受講者レビューの実施回数、実際の完走率、所要時間、支援回数は Pilot / 継続運用で収集し、本 Master Plan の完了をブロックしない。

### Safe change surface

- Current Fact / SSOT の文書修正。
- Curriculum の Learner Required / specialization / Core / Extension / Reference 境界の明確化。
- Repository-required curriculum asset と Learner Required path の役割分離。
- Lesson 内部構成、説明深度、用語・表記、navigation、Practice / Evidence 接続の整理。
- Learner-facing self-check、Recovery、Completion criteria と Instructor Reference の責務分離。
- Instructor Reference の責務を受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援へ限定する整理。
- 継続的な初見受講者レビューのための最小チェック表・記録方法の追加。
- Training learner entry / artifact / validation contract の必要最小限の追加・修正。
- Normative Specification の semantics-preserving な editorial correction。ただし Product behavior の意味を変えない範囲に限る。
- Validator / contract test は、既存 canonical contract と文書の不整合を防ぐために必要な最小変更だけ行う。

### Unknowns

- Learner Required path 全文を同一基準で監査したときに発生する P0〜P3 Finding の具体件数と分布。
- `docs/spec/**` 全 text document の監査で、実変更が必要な editorial Finding が発生するかどうか。
- Learner-facing 用語のうち、日本語化すべき一般語と公式英語を維持すべき語の最終境界。
- Instructor Reference にしか存在しない学習上の判断・Recovery・評価観点がどの程度あるか。
- 継続的な初見受講者レビューで初めて発見される navigation / prerequisite / self-check / completion blocker の有無。

これらは推測で先に固定せず、本文で定義した分割条件・停止条件に従って扱う。

## 3. Fixed decisions

次を固定条件として扱う。

- 共通卒業像は entry-level の汎用 Test Automation Engineer とする。
- 想定受講者は、テスト自動化の目的・基本概念を理解している。
- 想定受講者は、ノーコード / ローコードのテスト自動化ツールを触ったことがある、または仕組み・利用イメージを理解している程度を標準とする。
- Playwright などコードベースの自動化ツールは未経験を標準とし、プログラミング経験を必須前提にしない。
- Web Automation、Failure Analysis、Maintainability、Git / PR、bounded Web CI を Common Core とする。
- C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Native specialization 化は Curriculum learner の Required / specialization 境界だけを変更する。
- Product Formal Native Regression、Android Runtime Gate、iOS Build-only Gate は維持する。
- Native Lesson / Training asset は specialization の canonical asset として残す。
- Normative Specification を Expected Behavior の Oracle とする。
- Analysis → Design → Selection → Implementation → Failure → Maintainability → Development Process の大順序を維持する。
- Part 1 / Part 2 のトップレベル教材ファイル数と大順序は維持する。
- 各教材ファイル内部の Lesson / subsection 数は固定しない。独立した学習単位として成立しない細切れな Lesson は、同一ファイル内で前後へ統合してよい。
- Lesson を維持するためだけに文章量を増やさない。内容を追加する価値がなければ統合を優先する。
- Curriculum Core を簡潔化するために Product behavior / Formal Regression の品質を下げない。
- 用語を次の2つへ分離する。
  - `Repository-required curriculum asset`: Validator / Repository contract 上、存在・整合が必須の教材・支援文書。Learner が修了のために必ず読むことは意味しない。
  - `Learner Required path`: Learner が共通卒業要件を満たすために読む・実施する必要がある learner-facing material。自己学習品質の監査対象はこの path とする。
- Learner Required path は自己学習を標準とする。学習目標、説明、演習、自己確認、学習上のRecovery、完了条件、次の行動、評価観点は learner-facing material 内で完結させる。
- Instructor / 運営向け資料は受講内容の外側だけを扱う。対象は環境構築、端末、アカウント、権限、演習Repository / Training Copy、Infrastructure / Toolchain障害対応等とする。
- Instructor / 運営向け資料へ、学習内容の説明、問い返し、答え合わせ、学習上のRecovery、評価基準、模範的な考え方を置かない。
- `03_instructor-reference.md` は Repository-required support asset として残してよいが、Learner Required path には含めず、受講内容外の支援だけを記載する。
- README / Learning Design / Validator では Repository-required curriculum asset と Learner Required path を混同しない。README上も Instructor Reference が受講者の必修教材ではないことを判別できるようにする。
- Rubric / Minimum Evidence は Learner-facing な共通契約とする。外部評価を行う場合も同じ公開 Rubric / Evidence を参照し、Instructor専用の非公開採点基準を作らない。
- 初見受講者レビューは継続的な品質改善活動とし、本 Master Plan の完了条件にしない。
- 本 Master Plan では、継続レビューに使える対象受講者像、観点、チェック表、記録方法を整備するところまでを責務とする。
- 各 Finding は Remediation Matrix で Primary owner を1つだけ持つ。
- Follow-up verification は Primary owner を置き換えない。
- Learner-facing な一般説明は日本語を基本とする。ただし Tool / Product / API / Code identifier / file path / command / ID grammar / Official concept name は意味を壊さない範囲で英語を維持する。
- Machine-consumed heading、ID、path、token、validator contract は単純翻訳しない。変更が必要な場合は parser / validator / contract test と同一変更単位で扱う。
- Normative Specification の日本語整理では Product behavior の意味を変更しない。意味が変わる可能性がある文言は editorial change として処理せず、Product Decision が必要な別課題として記録する。
- `docs/spec/**` に実変更が1件でも必要な場合は Curriculum 変更へ混ぜず PR 4B として分離する。
- PR 4B が必要な場合は PR 4A merge 後の最新 `main` から branch を作り、stacked PR にしない。

## 4. Non-goals

- Product behavior の変更。
- Curriculum 軽量化を理由に Formal Regression を削減すること。
- Product Native CI / iOS Build-only Gate の Optional 化。
- Curriculum 全面書き直しやトップレベル教材ファイルの大量追加。
- 行数を増やすこと自体を目的にした Lesson 拡張。
- POM の必須化。
- 新 LMS、Test Management Tool、learner-state DB、scoring framework の導入。
- 全 Formal Test title への BR / AC / Risk / Technique metadata 埋め込み。
- 新しい第三の Traceability 正本の追加。
- Stable Risk ID の無条件導入。
- Hotspot の行数だけを理由にした Refactor。
- Phase 6 のための常設 call graph / graph DB の導入。
- Pilot 実測完了を Repository remediation の blocker にすること。
- 初見受講者レビューの実施、PASS、所定回数の完了を本 Master Plan の blocker にすること。
- RA-M7 修正へ Curriculum semantic change、file rename、validator cleanup を混ぜること。
- Normative Specification の Product Rule を「読みやすさ」の名目で変更すること。
- 全英語を機械的に日本語へ置換すること。
- PR 4 の用語整理のために新しい permanent glossary / terminology database を作ること。
- 自己学習を理由に Instructor / 運営による環境準備、権限付与、端末準備、Infrastructure / Toolchain 障害支援まで排除すること。
- 設計判断や自由記述を含む全 Exercise を機械採点するための新しい scoring engine / AI grader を作ること。

## 5. Review policy for Curriculum quality

PR 4 の child Plan 作成時に、Learner Required path 全文を次の観点で監査する。既存 Report の Finding だけを直して終了せず、Learner Required path 全体へ同じ基準を適用する。Repository-required support asset は、Learner Required path との責務境界・参照整合を別途確認する。

### 5.1 Accuracy / Contract consistency

- file path、command、script name、project name、ID grammar が Current Repository と一致する。
- Curriculum / Workbook / Validator / Training asset / Specification の同一概念が矛盾しない。
- Expected Behavior を Current UI / test code / README から逆算していない。
- Normative Specification と Supporting Evidence の責務を混同していない。

### 5.2 Learning-unit completeness

各内部 Lesson / subsection について、少なくとも次を確認する。

- 何を理解・判断できるようになるのかが明確である。
- なぜその知識が必要か、前後の学習との関係が分かる。
- 定義だけで終わらず、Scenario Shop または実務に接続した具体例がある、またはその Lesson が短い Reference として明示されている。
- Learner に判断・操作・作成を求める内容なら Practice / Exercise への入口がある。
- 完了条件または次の Lesson への接続が分かる。

数行しかないことを自動的に defect としない。独立 Lesson として意味が薄い場合は、文章を水増しせず同一ファイル内の前後へ統合する。

### 5.3 Learning flow / prerequisites

- 前の章で説明していない概念を当然の前提として使用していない。
- Test Target → Risk → Design → Layer → Automation → Implementation の順序を壊していない。
- Playwright / Maestro / Git / CI の Tool 操作より、必要な判断能力を先に学べる。
- Playwright等のコードベース自動化未経験者が、教材外のプログラミング知識を補完しなくても進められる。
- Core / Extension / Reference / specialization の境界が各 Lesson で一貫する。

### 5.4 Exercise / Evidence / Assessment alignment

- 学習目標に対応する Practice / Exercise がある。
- Exercise の成果物が Rubric / Minimum Evidence とつながる。
- Rubric に要求する能力を本文で教えていない、または Practice していない状態がない。
- Practice volume や Test 本数だけで合否を決めない。
- Baseline PASS を Learner competency と誤認しない。
- Learner が Rubric / Minimum Evidence を使って自分の成果物が完了条件を満たすか確認できる。
- 外部評価を行う場合も、Learner に公開されていない追加基準を Required completion に使わない。

### 5.5 Practical applicability

- 手順だけでなく「なぜこの選択をするか」を説明する。
- UI E2E へ寄せればよいという誤解を生まない。
- Failure を retries / timeout 延長で隠さない。
- Repository 固有の運用詳細を、一般化可能な Core skill と同じ深さで強制しない。

### 5.6 Language / terminology

Learner-facing 文書では次を基準とする。

日本語を基本とする例:

- 学習目標
- 期待動作
- 失敗分析
- リスク分析
- テスト設計
- テストケース
- 完了条件
- 演習
- 参照情報

英語または公式表記を維持する例:

- Playwright
- Maestro
- Git / GitHub / GitHub Actions
- TypeScript
- Locator / Fixture / POM など公式用語。初出では必要に応じて日本語説明を添える。
- command、path、environment variable、project name、Test ID、BR / AC / Risk / Test Case ID

同一概念について日本語と英語を理由なく行き来しない。用語統一のためだけに新しい glossary file は作らない。

PR 4 child Plan の Pre-change audit では、実際に統一判断が必要な語だけを対象に `Terminology Decision Table` を作る。これは child Plan 内の実行判断表であり、全行を permanent glossary として保存しない。

最低限、次を記録する。

| 項目 | 内容 |
| --- | --- |
| Current terms | Learner Required path 内で実際に使われている表記 |
| Canonical learner-facing term | 今回統一する表記 |
| Treatment | 日本語化 / 公式英語維持 / 初出のみ日本語説明追加 / machine contract のため変更禁止 |
| Rationale | なぜその扱いにするか |

`Risk`、`Business Risk`、`Regression`、`Evidence`、`Scenario`、`Action`、`Assertion`、`Result`、`Test Layer`、`Expected Behavior`、`Current Guarantee` など、実際に表記揺れがある語を監査対象とする。表に載せる語を先に固定して全Repository用語集へ拡張しない。

監査後は、今回だけの個別語一覧ではなく、将来の再発防止に必要な安定ルールだけを既存正本へ残す。

- Curriculum 側: `docs/curriculum/test-automation/00_learning-design.md` または `README.md` の既存責務へ、一般用語は日本語、Tool / API / identifier は公式表記、公式英語は必要に応じ初出説明を付ける等の最小ルールを記載する。
- Specification 側: 既存 `docs/spec/glossary.md` と必要な `_templates/**` を利用し、Specで繰り返し使う語・表記規則だけを反映する。
- Terminology Decision Table 全体を恒久SSOTへ複製しない。

### 5.7 Maintainability / information architecture

- 同一説明を複数 Lesson に複製しない。
- Canonical Definition と Application Practice を区別する。
- Learner Required / Extension / Reference / Legacy が directory browse でも誤解しにくい。
- Optional / Legacy asset が Learner Required completion と競合しない。
- Repository owner 向け運用契約を Learner Required text に過剰露出しない。
- Instructor Reference に Learner Required learning content を置かない。
- Repository-required curriculum asset と Learner Required path を同じ「Required」として曖昧に表示しない。

### 5.8 Finding severity

PR 4 child Plan の詳細監査では各 Finding を次で分類する。

- `P0`: 教材どおり進めると実行不能、誤った Expected Behavior、validator / implementation contract と矛盾する。
- `P1`: 学習目標・演習・評価の不整合、前提知識の飛躍、Lesson が学習単位として成立しない、または Learner Required learning content / self-check が Instructor の追加説明に依存するなど学習成果へ大きく影響する。
- `P2`: 日本語 / 英語混在、重複、Learner Required / Reference 発見性、情報量の偏りなど理解・保守性へ影響する。
- `P3`: 語尾、軽微な表記、文章上の微修正。

修正順は `P0 → P1 → P2 → P3` とし、P3 のために大きな diff を作らない。

### 5.9 Self-study completeness

Learner Required path は、環境が開始可能な状態になった後の学習進行を learner-facing material だけで完結させる。

各 Learner Required Lesson / Exercise で次を確認する。

- 何を開始条件として満たせばよいかが分かる。端末・アカウント・権限・演習Repository等を Instructor / 運営が提供する場合も、Learner が受領後に確認する条件を明示する。
- 学習内容を理解するために Instructor の口頭説明・追加資料・非公開 Answer Key を必要としない。
- Exercise で何を作る・実行する・記録するかが明確である。
- Self-check は、Learner が「自分の回答・成果物がその学習目標を満たしているか」を合理的に判定できる具体性を持つ。単に Rubric / Spec / Reference へのリンクがあるだけで、該当する評価条件・BR / AC・確認観点を特定できない場合は self-check とみなさない。
- command / test / validator で判定できる内容は、期待する結果、終了状態、Artifact、確認箇所のいずれかを具体的に示す。
- 知識・確認問題は、回答例と理由、または正答に最低限含むべき具体的チェックポイントで自己確認できるようにする。
- 設計判断・自由記述・Trade-off問題は、一意の模範解答を強制せず、最低限考慮すべき観点と、許容できる判断理由の条件を示す。
- Specification を使う自己確認は、関連する BR / AC / section など具体的な参照箇所を示し、Learner が自分の回答と照合できるようにする。
- 失敗時は、Environment / Toolchain と learning / source failure を区別するための learner-facing Recovery path がある。Instructorへ相談する場合も、その前に確認すべき内容が分かる。
- 完了条件が Learner 自身で確認でき、Instructor独自の追加判定を待たないと次へ進めない構造にしない。
- 次に読む Lesson / 実施する Exercise が明確である。

### 5.10 Target learner profile

Learner Required path の説明深度と継続レビューでは、次の対象受講者像を基準とする。

- テスト自動化の目的・基本概念を理解している。
- ノーコード / ローコードのテスト自動化ツールについて、操作経験または概要理解がある。
- Playwright 等のコードベース自動化ツールは未経験である。
- プログラミング経験は前提にしない。
- Git / GitHub / CI / Maestro などは、そのLessonで説明される前の知識として補完しない。
- Repository固有のpath、Training command、Seed、Formal Test、Workflow構成を事前に知っている前提にしない。

## 6. Impacted areas

### Current Documentation / Formal Strategy

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/12_quality/acceptance_criteria.md`
- `playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

### Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `docs/curriculum/test-automation/part1/**`
- `docs/curriculum/test-automation/part2/**`
- `docs/reference/curriculum-self-study-review.md`（PR 4A で追加する継続レビュー用チェック表）

### Normative Specification / learner-facing reference

Audit scope:

- `docs/spec/**` の Markdown / text contract 全件。
- `README.md`、`change-process.md`、`glossary.md`、`known-deviations.md`、`product-scope.md`、`roles-and-permissions.md`、`screen-catalog.md`、`state-and-scenarios.md`、`ui-ux-contract.md`、`_templates/**`、`features/**` を含む。
- binary / image asset は内容監査対象外。ただし text document からの参照整合は確認する。

Specification は Oracle であるため、実変更は semantics-preserving な用語・表現整理に限定する。Product behavior の意味に触れる可能性がある Finding は変更せず follow-up へ分離する。

### Validation / Training

- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `training/workbook/**`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/**`
- `scripts/training/**`

### Refactoring Evidence

Repository Audit §4.1〜§4.16 の次の16候補を全件扱う。

1. `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
2. `src/infrastructure/database/sqlite/native-customer-repositories.ts`
3. `src/presentation/native/native-purchase-screens.tsx`
4. `src/presentation/native/native-screens.tsx`
5. `src/presentation/pages/admin-product-pages.tsx`
6. `src/application/use-cases/checkout-order-use-cases.ts`
7. `src/application/use-cases/review-user-use-cases.ts`
8. `src/application/use-cases/admin-product-use-cases.ts`
9. `.github/workflows/native-ci.yml`
10. `src/presentation/styles/global.css`
11. `src/seeds/**` の Seed SSOT
12. `scripts/agentic-qa/**`
13. Formal / Training Maestro cleanup helpers
14. `e2e/web/fixtures.ts`
15. Dexie / SQLite adapters
16. Domain → Application type dependency

## 7. Files to inspect before each change

各 child PR は、対象ファイルだけでなく次の正本を Current `main` で再確認してから変更する。

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`
- `docs/plans/TEMPLATE.md`
- 対象 Finding の元 Report
- 対象文書が参照する implementation / workflow / test / ADR
- 対象 Validation script / contract test

PR 1 / PR 4 では追加で次を確認する。

- `training/workbook/README.md`
- `training/workbook/*.csv`
- `scripts/validate-curriculum.ts` の ID / path / header contract
- Test Case ID を例示している Curriculum 文書
- `docs/spec/**` の Markdown / text contract と関連 validator / template
- `docs/curriculum/test-automation/03_instructor-reference.md` と、そこから Learner Required path へ移すべき学習上の説明・判断・Recovery・評価観点

## 8. Remediation Matrix

この Matrix は、Finding の予定 Disposition、Primary owner、Follow-up verification を定義する実行割当表とする。進捗や完了状態はこの Matrix では管理しない。

実際の対応結果は、各 child Plan / PR、Phase 6 durable report で記録・確認する。

| ID | Finding | Planned disposition | Primary owner | Follow-up verification |
| --- | --- | --- | --- | --- |
| RA-M1 | Required Web E2E 件数 / command の文書差 | fix | PR 1 | PR 2 |
| RA-M2 | Cross-role を PR 外とする文書と Current PR Gate の差 | fix | PR 1 | PR 2 |
| RA-M3 | Playwright project 名の文書差 | fix | PR 1 | PR 2 |
| RA-M4 | Seed Version の Current Documentation / implementation 差 | fix | PR 1 | なし |
| RA-M5 | Test Strategy / Acceptance / E2E 文書が Native を future / Phase 1 外として扱う | fix | PR 1 | PR 2 / PR 3 |
| RA-M6 | Curriculum の iOS manual-only 説明と Native change 時 Build-only Required Gate の差 | fix | PR 1 | PR 2 / PR 3 |
| RA-M7 | Curriculum canonical filename と `validate:curriculum` required-file contract の差 | fix | Master Plan publication PR | PR 3 |
| RA-M8 | Curriculum の Test Case ID 例と canonical Workbook / validator grammar の差 | fix | PR 1 | PR 4 |
| RA-G1 | Requirement / Test ID → Product Regression code の direct reference 不足 | fix | PR 2 | なし |
| RA-G2 | Lesson → Competency → Minimum Evidence の direct mapping 不足 | fix | PR 3 | PR 4 / PR 5 |
| RA-G3 | Technique → Formal Test mapping metadata 不足 | fix | PR 2 | PR 3 |
| RA-G4 | Native learner exercise の direct entry / Artifact / assessment 境界が薄い | fix | PR 5 | なし |
| RA-G5 | Native failure exercise が README のみで executable flow がない | defer を第一候補。C08 Minimum Evidence に不可欠な場合だけ fix | PR 5 | なし |
| RA-G6 | Test Strategy が Current Native / Training / parity / operational contract を十分に説明しない | fix | PR 2 | PR 3 |
| RA-Q1 | Domain → Application type dependency の妥当性が未確定 | Evidence で判断 | Phase 6 | なし |
| RA-L1 | Legacy P1 Capstone の Maestro 2 flows と canonical / Rubric 1 flow の限定的差 | reject を第一候補。Learner Required navigation に影響する場合だけ fix | PR 4 | Phase 0 |
| RA-C1 | Hotspot / duplication / large file 等の Refactoring candidate 群 | Necessity Review | Phase 6 | なし |
| CUR-H1 | Universal path と Audience / Level の不整合 | fix | PR 3 | PR 4 |
| CUR-H2 | Lesson から Competency Minimum Evidence への Trace 不足 | fix | PR 3 | PR 4 / PR 5 |
| CUR-H3 | C08 / Physical Android の共通卒業要件 | Decision B を正本化 | PR 3 | PR 4 / PR 5 |
| CUR-H4 | Learner Required Lesson 内の学習目標・説明・Practice・完了条件が弱く、独立した学習単位として成立しない箇所 | audit + fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-H5 | Learner Required learning content / self-check / learning Recovery が Instructor の追加説明や非公開判断に依存する箇所 | audit + fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-H6 | Repository-required curriculum asset と Learner Required path が同じ Required 表現で混同され、Instructor Reference 等の役割が曖昧 | fix | PR 3 | PR 4 / 継続的な初見受講者レビュー |
| CUR-H7 | Instructor Reference に受講内容・Facilitation・評価観点が残り、講師側と受講者向け教材の責務境界が曖昧 | fix | PR 3 | PR 4 |
| CUR-M1 | P1-5 への観点集中 | fix | PR 4 | なし |
| CUR-M2 | C04 Level 2 と Practice 量の非対称 | fix | PR 3 | PR 4 |
| CUR-M3 | C09 Failure Evidence が弱くなり得る | fix | PR 3 | PR 4 |
| CUR-M4 | P1-8 Core scope が広い | fix | PR 4 | なし |
| CUR-M5 | Native baseline と meaningful learner flow の Assessment 差 | fix | PR 3 | PR 5 |
| CUR-M6 | Part 2 の Repository 固有運用詳細が Core と同深度 | fix | PR 4 | なし |
| CUR-M7 | Learner exercise の継続評価境界が薄い | fix | PR 3 | PR 5 |
| CUR-M8 | C12 scope が広い | fix | PR 3 | PR 4 |
| CUR-M9 | iOS Current Gate の Documentation Drift | fix | PR 1 | PR 2 / PR 3 |
| CUR-M10 | 学習目標 → 本文 → 演習 → 成果物 → Rubric の縦方向整合が Learner Required path 全体で未監査 | audit + fix | PR 4 | PR 5 / 継続的な初見受講者レビュー |
| CUR-M11 | Learner Required / Extension / Reference / Legacy の発見性が directory browse / lesson navigation で弱い | fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-M12 | Rubric / assessment contract が Learner の自己確認と外部評価で同じ Evidence を使う契約になっていない | fix | PR 3 | PR 4 |
| CUR-M13 | 初見受講者レビューの対象受講者profileが未定義で、経験者の暗黙知で教材不足を補完し得る | fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-M14 | Self-check が単なる参照先提示で成立し得て、Learner が自分の回答・成果物の充足を判定できない | fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-M15 | 初見受講者レビューが単発の最終Gateとして扱われ、継続改善とMaster Plan完了境界が競合する | fix | Master Plan / PR 4 | 継続運用 |
| CUR-L1 | Spiral と説明重複の境界が薄い | 最小ラベル整理 | PR 4 | なし |
| CUR-L2 | Pilot 実測値がない | defer | Follow-up | なし |
| CUR-L3 | Learner-facing 一般用語の日本語 / 英語混在と表記揺れ | fix | PR 4 | 継続的な初見受講者レビュー |
| CUR-L4 | `docs/spec/**` を含む learner-facing / normative reference の用語・言語一貫性が未監査 | 全 text contract を audit。実変更が必要な場合は PR 4B で semantics-preserving fix | PR 4 | `validate:spec` / 継続的な初見受講者レビュー |
| CUR-L5 | 初出用語・前提知識・次アクションが不明瞭で Learner が停止し得る箇所 | audit + fix | PR 4 | PR 5 / 継続的な初見受講者レビュー |

Phase 0 では Current `main` で Finding の存否と Primary owner の妥当性を再確認する。Evidence を後続 Phase / PR で収集する Finding は、Phase 0 だけで最終判断しない。

## 9. Change strategy and execution order

実行順序は次のとおり。

1. Step 0: Master Plan publication PR に含める RA-M7 の最小修正と local validation を完了する。
2. Master Plan publication PR を作成し、GitHub CI / review を通して merge-ready にする。
3. ユーザーの明示承認後に Master Plan publication PR を `main` へ merge する。
4. 最新 `main` から PR 1 branch を作り、Phase 0 → PR 1 child Plan → Current Documentation / SSOT Repair を実施する。RA-M8 をここで解消する。
5. PR 1 merge 後の最新 `main` から PR 2 branch を作り、Formal Test Strategy / Perspective / Traceability を実施する。
6. PR 2 merge 後の最新 `main` から PR 3 branch を作り、Decision B / Competency / Assessment Contract を実施する。ここで対象受講者像、Repository-required curriculum asset / Learner Required path、Learner-facing Rubric、Instructor Referenceの責務境界を正本化する。
7. PR 3 merge 後の最新 `main` から PR 4A branch を作る。実装前に Learner Required path 全文、Repository-required support assetとの境界、`docs/spec/**` の Markdown / text contract 全件を監査し、P0〜P3 Finding と Terminology Decision Table を child Plan に記録する。PR 4A では Curriculum Core / Extension / Reference / language / learning-flow / self-study remediation、継続的な初見受講者レビュー用チェック表の追加、Curriculum側の安定した用語ルール反映を実施する。
8. Spec監査で `docs/spec/**` に実変更が1件でも必要と判定した場合は、PR 4A merge 後の最新 `main` から PR 4B branch を作り、semantics-preserving Specification editorial を実施する。Spec実変更が不要なら PR 4B は作らない。
9. PR 4 stage（PR 4A、必要な場合は PR 4B）merge 後の最新 `main` から PR 5 branch を作り、Training Evidence / learner exercise / specialization workflow を実施する。
10. PR 5 では継続レビュー用チェック表の command / Artifact / Environment block 観点が実際のTraining入口と矛盾しないことを確認する。
11. Phase 6 は PR 2 merge 後から PR 3〜5 と並行して調査してよい。decision-only PR は最新 `main` へ追従して確定する。
12. Repository remediation 完了後は、§18 のチェック表を使った初見受講者レビューを継続タスクとして運用する。実際のレビュー実施・PASSは本 Master Plan の完了条件に含めない。
13. 必要に応じて Pilot Feedback を収集する。

### Branch / PR rules

- Child branch は依存 PR merge 後の最新 `main` から作る。
- 原則 stacked PR は使わない。
- PR 1〜5 はそれぞれ child Plan を `docs/plans/` に保存してから実装する。
- PR 4 child Plan は Learner Required path 全文、Repository-required support assetとの境界、`docs/spec/**` text contract の監査 Finding 一覧と Terminology Decision Table を含める。別の permanent audit SSOT / glossary は追加しない。
- PR 4A で `docs/reference/curriculum-self-study-review.md` を追加し、継続的な初見受講者レビューのチェック表と記録ルールだけを保存する。レビュー結果の履歴をこのファイルへ積み上げない。
- PR 4B が必要な場合は、PR 4A merge 後の最新 `main` から作成し、PR 4Aで保存済みの同一 child Planを入力として使用する。新しい Master Plan や第三の tracking SSOT は作らない。
- PR 4Aへ `docs/spec/**` の実変更を含めない。Specの実変更は件数や軽微さにかかわらず PR 4Bへ分離する。
- 初見受講者レビューの実施・改善は本 Master Plan 完了後の継続タスクとして扱い、本 Master Plan を live status tracker にしない。
- Phase 6 decision-only PR は本 Master Plan を直接使用する。candidate inventory、Evidence criteria、output scope が変わる場合だけ別 Plan を作る。
- `refactor_now` と判定した実装だけ Phase 6 decision-only PR merge 後に別 Plan / 別 PR を作る。

## 10. Step 0 — RA-M7 CI unblocker and PR-ready validation

### Changes

Master Plan branch 上で次だけを変更する。

- `scripts/validate-curriculum.ts` の required curriculum path を `00_learning_design.md` から `00_learning-design.md` へ変更する。
- `tests/contracts/training-curriculum.test.ts` が同じ誤 literal を直接保持している場合だけ、その literal を最小修正する。

次は変更しない。

- canonical Curriculum file の rename
- Curriculum wording / Required boundary
- RA-M8 以降の Curriculum finding
- validator cleanup / refactor
- Product behavior / Formal Test / Product CI
- PR 1 以降の remediation

### Local validation

次を実行する。

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`

### Step 0 completion

次を満たした時点で Step 0 完了とする。

- RA-M7 の filename mismatch が解消されている。
- `validate:curriculum` / `test:contracts` が filename mismatch で失敗しない。
- typecheck / format / markdown lint が PASS する。
- diff が Master Plan と RA-M7最小修正だけに限定されている。
- PRを作成できる状態になっている。

GitHub pull request の作成、PR-triggered CI、review、merge は Step 0 に含めない。

## 11. Master Plan publication PR

Step 0 完了後に Master Plan publication PR を作成する。

### PR contents

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- RA-M7 の最小修正

### Required checks

1. PR diff が Step 0 scope 内であることを確認する。
2. GitHub Actions の pull request CI を完了させる。
3. review finding がある場合は、今回の diff に起因するものだけ bounded repair する。
4. final head が green で merge-ready であることを確認する。
5. merge はユーザーの明示承認後に行う。

Master Plan publication PR が merge されるまで PR 1〜5 / Phase 6 の実変更を開始しない。

## 12. Phase 0 — Current main revalidation

PR 1 branch を最新 `main` から作成した直後に read-only で実施する。

### Actions

- Audit baseline と Current `main` の差分を確認する。
- RA-M7 以外の Matrix 行について、Finding がまだ存在するか、Primary owner が適切かを implementation / workflow / docs で再確認する。
- RA-M8 は Curriculum の Test Case ID 例、`training/workbook/02_test-cases.csv`、`training/workbook/README.md`、`scripts/validate-curriculum.ts`、contract test を照合し、canonical grammar を Current `main` で確定する。
- 既に解消済みの Finding は child Plan の実装対象から外す。
- Current `main` の変化で Planned disposition または Primary owner を変更する必要がある場合は、該当 child Plan に理由と最終対応を記載する。本 Master Plan を live status tracker として更新しない。
- Evidence が後続 owner で必要な Finding は、Phase 0 だけで `fix` / `defer` / `reject` の最終判断を行わない。
- RA-M7 は regression がないことだけ確認する。
- RA-L1 は Learner Required navigation / completion への影響を確認する。
  - 影響がなければ PR 4 では変更しない。
  - 影響があれば PR 4 child Plan の scope に最小修正を追加する。
- Phase 0 の結果を反映して PR 1 child Plan の scope を確定する。

### Completion

- Current `main` 基準で Finding の存否と Primary owner の妥当性を確認している。
- RA-M8 の canonical Test Case ID grammar が推測ではなく Current contract から確定している。
- PR 1 の scope が確定している。
- 後続 owner で Evidence を集める Finding を Phase 0 だけで推測確定していない。
- RA-L1 の PR 4 での扱いが決まっている。

## 13. PR 1 — Current Documentation / SSOT Repair

### Objective

設計変更なしで直せる Current Fact / Canonical Contract の不整合を解消する。

### Changes

- Required Web E2E の Current command / target / Gate を実装と一致させる。
- Cross-role の Current PR Gate を文書と一致させる。
- Playwright project 名を Current config と一致させる。
- Seed Version の文書を `src/config/versions.ts` と一致させるか、SSOT参照へ寄せる。
- Native を future / Phase 1 外とする古い Current Documentation を修正する。
- iOS について次を区別して記載する。
  - manual dispatch
  - Native change 時の Required Build-only
  - Runtime 非保証
- 変わりやすい件数 / Version は不要に複製せず、実行 SSOT を参照する。
- Historical `CHANGELOG.md` entry は書き換えない。
- RA-M8 の Test Case ID grammar を解消する。
  - Current validator / Workbook を照合して canonical grammar を確定する。
  - canonical が `TC-<DOMAIN>-NNN` 形式である場合、Curriculum の `CART-001` / `PRODUCT-001` 等の learner-facing 例を canonical 形式へ揃える。
  - Validator を教材の誤例へ合わせて緩めない。
  - `training/workbook/README.md` を learner-facing な Test Case ID grammar の canonical explanation とし、validator の regex / validation rule を executable contract として一致させる。
  - Curriculum 側は grammar 自体を複数箇所で再定義せず、必要な箇所では canonical explanation を参照し、具体例だけを置く。
  - Contract test は Workbook sample / validator rule の整合を bounded に確認する。全 Markdown を解析する新しい parser は作らない。
  - Learner Required path を検索し、非canonicalな learner-facing Test Case ID例が残っていないことを確認する。

### Candidate files

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md` の factual statement
- `docs/12_quality/requirements_traceability.md` の factual statement
- `docs/12_quality/acceptance_criteria.md` の factual statement
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- その他 Test Case ID の例を持つ Learner Required Curriculum
- `training/workbook/README.md`
- `training/workbook/02_test-cases.csv`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` の Current Gate factual statement
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` の Current Gate factual statement

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current config / workflow / version SSOT / Workbook / validator grammar との manual cross-check
- Learner Required path の Test Case ID 例を検索し、canonical grammar に反する learner-facing example が残っていないことを確認する。

### Completion

- Current Documentation が implementation / workflow / ADR と一致する。
- RA-M7 が regression していない。
- Curriculum の Test Case ID 例と canonical Workbook / validator grammar が一致する。
- Learner が Curriculum の例をそのまま Workbook へ適用して validator mismatch を起こさない。
- Learner-facing grammar の説明元が `training/workbook/README.md` に一意化され、Validator executable contract と矛盾しない。
- 不要な volatile duplicate を増やしていない。
- Matrix で Primary owner が PR 1 の Finding を child Plan / PR の Evidence で対応・検証している。

## 14. PR 2 — Formal Test Strategy / Perspective / Traceability

### Objective

Current Formal Suite と Test Strategy / Traceability の正本を一致させる。

### Changes

`docs/08_testing/test_strategy.md` を最低限次の3軸で整理する。

1. Test Level / Test Type
   - Unit
   - Application Integration
   - Repository Contract
   - Component
   - Static / Operational Contract
   - Web E2E
   - Native Component / Repository / Android Runtime E2E
   - Deployed / Production Smoke
2. Test Perspective
   - Accessibility
   - Responsive / Mobile Web
   - Role / State / Boundary / Failure など Risk に応じた代表 Perspective
3. Execution / Platform / CI Gate
   - Formal / Training boundary
   - PR / main / periodic / manual
   - Android Runtime
   - iOS Build-only
   - Platform parity / operational contract

Traceability は次を最小単位として結ぶ。

- Risk または一意な Risk label
- Normative Spec / AC
- Representative technique / perspective
- Primary test level
- Representative Formal Test / suite
- CI gate

配置は次を優先する。

- Requirement / AC → representative regression: `docs/12_quality/requirements_traceability.md`
- Risk / technique / level / gate の設計契約: `docs/08_testing/test_strategy.md`

既存2文書で表現できる限り第三の Traceability file は作らない。Stable Risk ID は既存 label で一意に追跡できない場合だけ導入する。

### Candidate files

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/08_testing/e2e_design.md`
- 必要最小限の contract test / validator

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- Curriculum 文書を変更した場合のみ `pnpm run validate:curriculum`
- `playwright.config.ts` / `package.json` / workflow / Formal Test inventory との manual cross-check

### Completion

- Test Level、Perspective、Execution / Platform Gate を別軸として読める。
- Requirement / AC → regression と Risk / technique / gate を追跡できる。
- Formal Regression と Training Test を同じ coverage count として扱っていない。
- 全 Test title / file の大量編集を行っていない。
- Matrix で Primary owner が PR 2 の Finding を child Plan / PR の Evidence で対応・検証している。

## 15. PR 3 — Decision B / Competency / Assessment Contract

### Objective

共通卒業像、対象受講者、C01〜C12 の評価契約、Learner Required / specialization 境界、Repository-required curriculum asset / Learner Required path、Learner self-check の共通 Evidence 契約を正本化する。

### Changes

- 次の空き ADR で Decision B を記録する。
- README / Learning Design に共通卒業像と Learner Required / specialization 境界を記載する。
- README / Learning Design に §5.10 の対象受講者像を記載する。
- README / Learning Design に Repository-required curriculum asset と Learner Required path の違いを記載する。
  - `03_instructor-reference.md` は Repository-required support asset として残してよいが、Learner Required path から外す。
  - README の navigation でも受講者必修教材と Instructor / 運営向け支援資料を明確に分ける。
  - Validator の required-file existence contract は Learner Required path の意味へ読み替えない。
- README / Learning Design に、自己学習の標準境界を記載する。
  - Instructor / 運営の環境・権限・端末・演習Repository / Training Copy・Toolchain支援は許容する。
  - 学習内容、演習判断、自己確認、学習上のRecovery、完了条件、評価観点は learner-facing material を正本とする。
- `03_instructor-reference.md` の責務を次へ限定する。
  - 環境準備
  - アカウント / 権限
  - 端末準備
  - 演習Repository / Training Copy準備
  - Infrastructure / Toolchainの環境障害対応
- `03_instructor-reference.md` から、受講内容の説明、問い返し、設計判断のヒント、答え合わせ、学習上のRecovery、採点・評価観点を learner-facing正本へ移すか、Instructor Referenceから削除して正本を参照する。
- C01〜C12 に次を定義する。
  - bounded Level 2
  - Minimum Evidence
  - Learner Required / specialization / advanced
- C04 は技法数 quota ではなく、Spec / Risk に適切な technique を選び理由を説明できることを中心にする。
- C05 は PR 2 の Test Level / Perspective / Gate 契約を前提にする。
- C09 は Assertion typo だけでなく Locator / Timing 等を含む meaningful diagnostic evidence を要求する。
- C10 は実在する保守問題の診断と理由付き最小改善を Common Core にする。
- C12 は bounded Web CI の Trigger / Gate / Artifact / Failure Evidence を Common Level 2 とする。full multi-platform / delivery は Advanced / specialization とする。
- Baseline receipt と Learner-authored Exercise evidence を分離する。
- C08 Minimum Evidence は `learner-authored native exercise diff + successful Maestro execution artifact` とする。
- stock Native exercise の無変更 PASS は C08 completion としない。
- Rubric / Lesson / Exercise / Artifact mapping は、Learner が C01〜C12 の到達条件を自己確認できる形にする。
- Rubric の Level 定義は、例・ヒント・詳細手順を使った状態と自力実施を区別し、Instructor支援を能力レベルの前提として埋め込まない。
- `提出` を外部提出必須の意味で使わない。Repository内で成果物 / Evidence を保存・記録すれば成立する箇所は、そのように表現する。
- 外部評価が必要な運用でも Learner-facing Rubric / Minimum Evidence / Artifact をそのまま使い、Instructor-only評価基準は作らない。
- Validator / contract test では Native asset の存在と Native common graduation Required を別契約として扱う。

PR 3 で次の4文書は Learner Required / specialization boundary と completion wording だけ同期する。

- `part1/07_maestro-native-automation.md`
- `part1/09_part1-capstone.md`
- `part2/06_native-ci-maestro.md`
- `part2/08_integration-design-capstone.md`

Lesson depth、Practice量、language / terminology、learning-unit completeness、Core / Extension / Reference、各Lessonのself-check / Recoveryの詳細整理は PR 4 に残す。Training workflow / runner の実装は PR 5 に残す。

### Candidate files

- `docs/adr/<next>-test-automation-curriculum-native-specialization.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- 上記4 Lesson / Capstone
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- TypeScript contract を変更した場合は `pnpm run typecheck`
- README / Learning Design / Rubric / Instructor Reference / 対象Lesson の manual cross-check
- 対象受講者像が README / Learning Design / Rubric / Lesson の説明深度と矛盾しないことを manual cross-check
- Repository-required curriculum asset と Learner Required path がREADME / Learning Design / Validator説明で混同されていないことを manual cross-check
- Instructor Referenceに受講内容・学習上の判断・評価基準が残っていないことを manual cross-check

### Completion

- 対象受講者像が一意で、Playwright等のコードベース自動化未経験・プログラミング非必須の前提が正本間で一致している。
- 各 Competency の Minimum Evidence を Rubric から Learner 自身が確認できる。
- 外部評価を行う場合も同じ公開Rubric / Minimum Evidence / Artifact を使い、Required completion に非公開採点基準がない。
- Repository-required curriculum asset と Learner Required path が正本上区別され、`03_instructor-reference.md` がLearner Required pathではないことを受講者が判断できる。
- Instructor Reference が受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援へ限定されている。
- Native specialization と Product Native Gate が分離されている。
- Native実行なしでも Common Core completion が成立する。
- C08 completion は learner-authored change と successful runtime evidence の両方を要求する。
- PR 4 前でも Curriculum 正本間の Learner Required / specialization / self-study 境界が一致している。
- Matrix で Primary owner が PR 3 の Finding を child Plan / PR の Evidence で対応・検証している。

## 16. PR 4 — Curriculum Core / Extension / Reference / Learning Experience

### Objective

PR 3 の評価契約を維持したまま、Learner Required path 全文、Repository-required support assetとの境界、`docs/spec/**` の Markdown / text contract を共通基準で監査し、Curriculum の Lesson 深度・学習単位・説明重複・用語・学習動線・self-study completeness を整理する。継続的な初見受講者レビューを運用できる最小チェック表もここで整備する。Specification は監査のみPR 4Aで行い、実変更が必要な場合は必ずPR 4Bへ分離する。

### PR split rule

- `PR 4A`: Curriculum structure / learning flow / Core-Extension-Reference / learner-facing terminology / self-study completeness、Repository-required asset / Learner Required path境界、継続レビュー用チェック表、Learner Required path + `docs/spec/**` text contract のPre-change auditを担当する。
- `docs/spec/**` に実変更が不要なら PR 4B は作らない。
- `docs/spec/**` に typo、punctuation、spacing、用語統一を含め実変更が1件でも必要なら、PR 4Aへ含めず `PR 4B: semantics-preserving Specification editorial` へ分離する。
- PR 4B は PR 4A merge 後の最新 `main` から branch を作る。
- Product behavior の意味変更、仕様判断、Current implementationとの意味差解消が必要な Finding は PR 4B にも含めず、Specification clarification の別 Issue / Plan へ送る。
- 分割は semantic safety のためであり、新しい恒久的な管理レイヤーや Master Plan を追加しない。

### Pre-change audit

Learner Required path について、ファイル単位・内部 Lesson 単位で次を確認する。

- Accuracy / Current contract
- Learning goal
- Prerequisite
- Explanation depth
- Scenario Shop / practical example
- Practice / Exercise entry
- Self-check / expected result / evaluation criteria
- Recovery / Environment-vs-learning failure boundary
- Artifact / Completion Evidence
- Rubric alignment
- Core / Extension / Reference / specialization
- Instructor dependency
- Japanese / English terminology
- Duplicate / canonical definition
- Next action / next lesson

Repository-required support asset について次を確認する。

- Learner Required path と同じ必修教材として表示されていないか。
- Learner Required learning contract が置かれていないか。
- Instructor Reference が受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援だけになっているか。
- Learner-facing正本との重複がある場合、支援文書側から正本を参照できるか。

`docs/spec/**` の Markdown / text contract 全件について次を確認する。

- learner / maintainer が読む一般語の日本語 / 英語混在と表記揺れ。
- `docs/spec/glossary.md` と各文書の用語差。
- `_templates/**` が新規Specへ古い表記揺れを再生成しないか。
- BR / AC / ID / path / code identifier / machine-consumed heading のcanonical form。
- Product behavior の意味を変えずにeditorial correctionできるか。
- Current implementationとの意味差、複数解釈、Product Decisionが必要な箇所はeditorial fixから除外できるか。

Finding は child Plan 内に次を最低限記録する。

- ID
- severity (`P0` / `P1` / `P2` / `P3`)
- file / heading
- current state
- problem
- learner impact または specification readability / maintainability impact
- minimum fix
- related contract / validation
- Specification Findingの場合は `no_change` / `PR 4B` / `Specification clarification` のDisposition

既存 Report と重複する Finding は新しい permanent report に複製せず、既存 Matrix ID を参照する。

Pre-change audit 完了時に §5.6 の `Terminology Decision Table` を確定し、PR 4A の用語変更はその表に従う。途中で新しい表記判断が必要になった場合は child Plan の表へ追記してから変更し、ファイルごとに場当たり的な判断をしない。

### Part 1 changes

- P1-1 / P1-2 を含む全 Learner Required Lesson で、内部 Lesson が独立学習単位として成立するか確認する。
  - 数行でも目的が明確な short reference なら残してよい。
  - 目的・説明・Practice・前後関係が弱く、単独で切る意味がなければ同一ファイル内で統合する。
  - 見出しを残すためだけの説明追加は禁止する。
- P1-3: 技法数 quota ではなく Risk に対する technique 選択を中心にする。
- P1-4: JavaScript / TypeScript bridge、Playwright concept、Locator / Assertion の初出説明を、Playwright未経験・プログラミング非必須の対象受講者が理解できる深さへ調整する。Official term は必要に応じて日本語説明を添える。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution
- P1-6: meaningful failure diagnosis を Completion Evidence にする。
- P1-7: Native specialization 内の depth / navigation / Practice量を整理する。Physical Android canonical path は残す。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善1件
  - Reference: POM / Helper / Fixture / Flow pattern catalog
  - Lifecycle / Regression inventory は Part 2 bridge へ寄せる
- P1-9: Web Core Capstoneを簡潔化し、Native specialization evidence と Baseline / learner-authored flow を分ける。
- Role / State / Seed / Reset の反復は Canonical Definition と Application Practice を区別する。
- RA-L1 は Phase 0 の確認結果に従う。
  - Learner Required navigation / completion に影響しなければ Legacy P1-10 は変更しない。
  - 影響があれば canonical completion と矛盾する箇所だけ最小修正する。

### Part 2 changes

- P2-1〜P2-8 についても内部 Lesson の成立性、前提知識、演習、自己確認、Recovery、完了条件を同じ基準で確認する。
- P2-2: Branch / Diff / Commit を Core、exact SHA / copy mechanics を Reference。
- P2-3: 他人から実際のReviewを受けることを Learner Required completion にしない。既存 / 教材用DiffのReview、自分のPRのself-review、公開されたReview checklistでC11を自己確認できるようにする。Organization-provided Copyは許容するが、Learner自身が用意できるFork / Training Copy経路を標準として残す。
- P2-4: Trigger / Job / Failure / least privilege を Core、allowlist / parser / pin 詳細を Reference。
- P2-5: Web CI / Artifact / failure evidence を Core。
- P2-6: Native CI specialization 内の Repository 固有詳細を Reference へ寄せる。
- P2-7: Gate / Artifact / fail-closed を Core、vendor / production deployment detail を Advanced / Reference。
- P2-8: Web CI / Gate / Artifact / Failure reasoning を Common Capstone とし、Native / iOS / full CD を specialization / Advanced とする。

### Self-study changes

PR 4Aで Learner Required path 全体へ次を適用する。

- 各 Lesson / Exercise に、必要に応じて開始条件、自己確認、Recovery、完了条件、次の行動を learner-facing に明示する。
- Self-check は Learner が自分の回答・成果物の充足を合理的に判定できる具体性を必須とする。単なるReferenceリンクだけでは不十分な場合、該当する評価条件・BR / AC・確認観点まで特定する。
- 確認問題は、回答例と理由、または正答に最低限含むべき具体的チェックポイントで Learner が自分の理解を検証できるようにする。
- 設計問題・Trade-off問題は一意の模範解答を作らず、最低限考慮すべき観点と許容される判断理由の条件を示す。
- Specification参照による自己確認は、該当するBR / AC / sectionを特定する。
- command / test / validator / artifact で機械確認できるものは、Learner が成功・失敗・Environment blockを区別できる確認方法を示す。
- `03_instructor-reference.md` に存在する受講内容・問い・判断観点・Recovery・評価基準は、Learner Required completion に必要なら README / Learning Design / Rubric / 対象Lessonへ移す。
- Instructor Reference は受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援に限定する。
- `講師に確認する`、`レビューしてもらう`、`答え合わせしてもらう` ことを Learner Required completion にしない。
- 環境・権限・端末・演習Repository提供を Instructor / 運営に依存することは許容するが、受領後の確認手順と学習再開条件は learner-facing にする。

### Continuous learner review checklist

PR 4A で `docs/reference/curriculum-self-study-review.md` を追加し、継続的な初見受講者レビューで再利用するチェック表を定義する。

このファイルは reviewer / maintainer 向けの運用資料であり、Learner Required path には含めない。新 LMS、DB、採点基盤、レビュー結果の恒久台帳は作らない。

最低限、次の列を持つ表を定義する。

| 列 | 確認内容 |
| --- | --- |
| Lesson / Exercise | 対象教材・演習 |
| 開始条件 | Learnerが開始可能か、必要な環境受領条件が分かるか |
| 学習内容の自己完結 | 教材外の口頭説明なしで理解できるか |
| 演習内容 | 何を作る・実行する・記録するか明確か |
| 自己確認 | 回答・成果物の充足をLearner自身で判断できるか |
| Recovery | 学習上の失敗と環境障害を切り分け、次の確認が分かるか |
| 完了条件 | どこまでできれば完了か判断できるか |
| 次の行動 | 次に読む・実施する内容が分かるか |
| 学習内容の追加支援 | 教材外の説明・答え合わせが必要だったか |
| 環境 / Toolchain支援 | 環境側の支援が必要だったか |
| Finding / 備考 | 改善候補、未検証理由、補足Evidence |

レビュー時は §5.10 の対象受講者像を使い、経験者の暗黙知で教材不足を補完しない。

### Language / terminology changes

PR 4Aで次を行う。

- Learner-facing な一般説明は日本語中心へ統一する。
- Tool / Product / API / command / path / identifier は公式表記を維持する。
- `Expected Behavior`、`Learning Goal`、`Failure Analysis` など一般概念は、周辺文脈と役割を確認した上で日本語へ統一する。
- `Locator`、`Fixture` など公式用語を残す場合、初出で必要な日本語説明を付ける。
- 同一文書内・Learner Required path 全体で表記を揃える。
- 機械契約へ使われている文字列は単純置換しない。
- 実装者は Pre-change audit で確定した Terminology Decision Table に従い、用語判断をファイル単位で再発明しない。
- 監査結果から抽出した将来も安定する最小の言語・用語ルールを `00_learning-design.md` または Curriculum README の既存責務へ反映する。

### Specification editorial changes

PR 4Bが必要な場合だけ次を行う。

- Pre-change auditで `PR 4B` と分類した `docs/spec/**` のtext documentだけを変更する。
- `docs/spec/glossary.md` を既存の用語正本として利用し、必要な用語だけ追加・統一する。
- `_templates/**` に同じ表記揺れを再生成する記述がある場合は、semantic contractを変えない範囲で同時に修正する。
- BR / AC / ID / path / code identifier は canonical form を維持する。
- 文言変更は Product behavior の意味が変わらないことを確認できる場合だけ行う。
- Product behavior の解釈が変わり得る文言、複数解釈がある仕様、Current implementation と Normative Specification の意味差は editorial fix に含めない。
- 上記は Product Decision / Specification clarification の follow-up Finding として記録する。
- machine-consumed heading / parser contract を変更する場合は `validate:spec` / contract test と同一変更で扱う。不要なら見出しは維持する。

### Required / Optional / Legacy discoverability

- `09_part1-capstone.md` が canonical Learner Required であることを navigation 上明確にする。
- Optional Agentic QA と Legacy Capstone が Learner Required completion と誤認されないことを確認する。
- `03_instructor-reference.md` が Repository-required support asset であり、Learner Required path ではないことを README / navigation 上明確にする。
- file rename / directory migration はリンク互換と validator contract を壊すため、ラベル改善で十分なら行わない。

### Candidate files

PR 4A:

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`（PR 3 contract を変更しない範囲）
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `docs/curriculum/test-automation/part1/**`
- `docs/curriculum/test-automation/part2/**`
- `docs/reference/curriculum-self-study-review.md`
- `docs/spec/**` の Markdown / text contract（監査のみ。実変更は禁止）
- 必要な場合のみ curriculum validator / contract test

PR 4B が必要な場合:

- Pre-change auditで実変更対象と判定した `docs/spec/**` Markdown / text contract
- `docs/spec/glossary.md`
- 必要な場合のみ `docs/spec/_templates/**`
- 必要な場合のみ spec validator / contract test

### Validation

PR 4A:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Curriculum navigation / specialization boundary の manual cross-check
- Repository-required curriculum asset / Learner Required path 境界の manual cross-check
- 対象受講者像とLessonの前提知識・説明深度の manual cross-check
- Workbook / validator / ID grammar の manual cross-check
- Learner Required path の internal link / command / path / next-action walkthrough
- Learner Required Lesson の self-check / Recovery / Completion が learner-facing に存在し、Instructor-only情報を必須にしていないことの manual cross-check
- Instructor Reference が受講内容外の支援だけになっていることの manual cross-check
- Self-check が単なる generic Reference 提示ではなく、該当する評価条件・回答要素・BR / AC・確認観点まで特定できることを manual cross-check
- `docs/reference/curriculum-self-study-review.md` が §18 の継続レビュー契約と一致することを manual cross-check
- Terminology Decision Table と実際の Learner Required path 表記の manual cross-check
- `docs/spec/**` text audit の全対象に Disposition があることを確認する。
- PR 4A diff に `docs/spec/**` の実変更が含まれていないことを確認する。

PR 4B がある場合:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- BR / AC / Oracle meaning の manual semantic-equivalence cross-check
- `docs/spec/glossary.md` / `_templates/**` / changed spec の用語整合を確認する。
- Curriculum 参照元との link / terminology cross-check

### Completion

- Core / Extension / Reference が PR 3 の評価契約と一致する。
- PR 3 の Learner Required / specialization 境界を変更していない。
- Repository-required curriculum asset と Learner Required path が navigation / validator contract 上混同されていない。
- 対象受講者像が learner-facing material の前提知識・説明深度と一致している。
- トップレベル教材ファイル数と大順序を維持している。
- 内部 Lesson は独立した学習単位として成立するか、同一ファイル内で適切に統合されている。
- 内容の薄い Lesson を文章の水増しで維持していない。
- 各 Learner Required Lesson の学習目標・説明・Practice / Exercise・Self-check・Recovery・Completion Evidence・Next action の接続を確認している。
- Learner Required learning content の理解・演習・自己確認・完了判定が Instructor の追加説明に依存していない。
- Instructor Reference に受講内容・学習上の判断・評価基準が残っていない。
- Self-check がLearner自身で学習目標の充足を合理的に判定できる具体性を持ち、generic Referenceだけに逃げていない。
- 継続的な初見受講者レビューの再利用可能なチェック表と記録方法が `docs/reference/curriculum-self-study-review.md` に定義されている。
- Learner-facing 一般用語の日本語 / 英語混在が整理され、英語を残す基準が Terminology Decision Table と一致している。
- 将来の再発防止に必要な最小の用語・言語ルールが既存 Curriculum 正本へ残っている。
- `docs/spec/**` の Markdown / text contract 全件を監査し、各FindingのDispositionが確定している。
- Spec変更が必要な場合はPR 4Bへ分離され、PR 4AへSpecification実変更を混ぜていない。
- PR 4Bを実施した場合、`docs/spec/glossary.md` / 必要なtemplate / changed specが同じ用語ルールに整合している。
- Normative Specification の Product behavior を editorial cleanup で変更していない。
- Learner Required / Optional / Reference / Legacy / Instructor support の境界が初見で判断できる。
- RA-L1 を Phase 0 の確認結果どおり扱っている。
- 重複削減のために新しい抽象概念や恒久的な管理システムを増やしていない。
- Matrix で Primary owner が PR 4 の Finding を child Plan / PR の Evidence で対応・検証している。

## 17. PR 5 — Training Baseline / Exercise / Artifact / Completion Evidence

### Objective

Harness 正常性と Learner competency の実行入口と Evidence を分離し、機械確認できる結果は Learner が自分で判定できる形にしつつ、Native specialization を Common Core learner へ暗黙強制しない。

### Start condition

- PR 4A が merge 済みである。
- PR 4B が必要と判定された場合は PR 4B も merge 済みである。

### Web changes

- `package.json` に `training:web:exercise` を追加する。
- `training:web:exercise` は `training/playwright/exercises` を `training-chromium` で実行する。
- `training:web:mobile:exercise` は Mobile learner exercise として維持する。
- stock exercise の PASS は harness / starter evidence とし、learner competency evidence としない。
- Learner-facing material から実行する command は、PASS / expected-failure / artifact の確認方法を明記できる出力契約を維持する。
- Web Training CI へ learner exercise を Required 実行として追加するのは、PR 3 の Minimum Evidence で必要と確定した場合だけとする。

### Native changes

- `package.json` に `training:native:exercise` を追加する。
- Current learner exercise YAML を canonical exercise として使用する。
- baseline と exercise は Android serial resolution、cleanup、Maestro invocation を共通化して再利用する。
- baseline / exercise で flow path と JUnit / evidence 名を区別する。
- C08 Completion Evidence は learner-authored exercise diff + successful Maestro artifact とする。
- Training Copy の source SHA / Git diff を利用し、新しい learner-state DB / scoring system は作らない。
- `training/github-actions/training-native-ci.yml` を specialization opt-in にする。
  - `workflow_dispatch` を維持する。
  - `pull_request` は Native specialization asset / runner / workflow に関係する変更だけを対象にする。
  - broad な `training/**` や Curriculum docs 全体を trigger にしない。
- Native workflow が起動した場合は baseline と learner exercise の evidence を識別できるようにする。
- Product `.github/workflows/native-ci.yml` へ learner exercise を追加しない。
- Native failure exercise は C08 Minimum Evidence に不可欠な場合だけ executable 化する。不要なら `defer` / `reject` とする。

### Candidate files

- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-invocation.ts`
- `scripts/training/serial-resolution.ts`
- 必要最小限の shared runner / helper
- Training workflow contract / Training Copy validation
- Curriculum の Evidence section
- `docs/reference/curriculum-self-study-review.md`（command / Artifact / Environment block観点の整合確認のみ）

### Validation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Training workflow contract test
- Native runtime validation は利用可能な実行環境がある場合だけ実施し、Environment failure と source / learner failure を分離する。
- Learner-facing command / Artifact instructions だけで成功・Expected failure・Environment blockを区別できることを manual cross-checkする。
- 継続レビュー用チェック表の実行・Evidence観点がTraining入口と一致することを manual cross-checkする。

### Completion

- Baseline と learner exercise を別commandで実行できる。
- 機械確認できる Learner Required Exercise は Learner が command result / Artifact / validator から自己確認できる。
- C08 completion は learner-authored diff + successful Maestro artifact の両方を要求する。
- Training Native workflow は specialization opt-in である。
- Web / Common Core learner PR に Native runtime を無条件要求しない。
- Product Required Formal Gate に learner exercise が入っていない。
- PR 4 stage で定義した Learner-facing command / path / completion wording と実行入口が一致する。
- 継続レビュー用チェック表がCurrent Training command / Artifact / Environment blockの確認方法と一致する。
- 新しい scoring engine / learner-state DB / AI grader を追加していない。
- Matrix で Primary owner が PR 5 の Finding を child Plan / PR の Evidence で対応・検証し、RA-G5 は根拠付きで `fix` / `defer` / `reject` を確定している。

## 18. 継続的な初見受講者レビュー

### Purpose

初見受講者レビューは、教材を一度だけ合格させる最終Gateではなく、運用中に繰り返して自己学習品質を改善するための継続タスクとする。

本 Master Plan では、レビューを実施できる対象受講者像、観点、チェック表、記録方法を整備するところまでを完了条件とする。実際のレビュー実施、レビュー回数、レビュー結果の `PASS`、すべての改善Findingの解消は本 Master Plan の完了条件に含めない。

### Target learner profile

レビューは §5.10 の対象受講者像を基準とする。

- テスト自動化の目的・基本概念を理解している。
- ノーコード / ローコードのテスト自動化ツールについて、操作経験または概要理解がある。
- Playwright 等のコードベース自動化ツールは未経験である。
- プログラミング経験を前提にしない。
- Git / GitHub / CI / Maestro 等の未説明知識を補完しない。
- Repository固有の知識や過去の教材修正経緯を前提にしない。

### Instructor / 運営支援の境界

レビュー中に次の支援を受けることは許容する。

- 環境準備
- アカウント / 権限
- 端末準備
- 演習Repository / Training Copy準備
- Infrastructure / Toolchain障害対応

次は支援として補完しない。必要になった場合は教材改善Findingとして扱う。

- 学習内容の追加説明
- 演習で何を考えるかの指示
- 答え合わせ
- 学習上のRecovery手順
- 完了判定
- 非公開の評価基準

### Review checklist

`docs/reference/curriculum-self-study-review.md` のチェック表を使い、各 Learner Required Lesson / Exercise を確認する。

最低限、次を確認する。

- 開始条件が分かる。
- 教材だけで学習内容を理解できる。
- 何を作る・実行する・記録するか分かる。
- Self-checkが具体的で、自分の回答・成果物の充足を判断できる。
- 学習上の失敗とEnvironment / Toolchain障害を切り分けられる。
- 学習上のRecoveryが教材にある。
- 完了条件が分かる。
- 次のLesson / Exerciseが分かる。
- Instructor Referenceを読まないと受講内容を理解できない箇所がない。
- 未説明のPlaywright / TypeScript / Git / CI等の知識を当然の前提にしていない。

### Review result

レビュー結果は、各実施時点の改善判断に使う。結果が本 Master Plan の完了状態を変更することはない。

結果の記録では最低限、次を分ける。

- 問題なし
- 教材改善Findingあり
- Environment / Toolchain理由で未検証

Environment / Toolchain理由で未検証の場合は教材不備と即断せず、環境準備後に必要に応じて再確認する。未検証を「問題なし」とみなさない。

### Result recording

- チェック表の定義自体は `docs/reference/curriculum-self-study-review.md` に保持する。
- 個別レビュー結果をチェック表ファイルへ履歴として追記し続けない。
- 継続レビューで改善が必要になった場合は、その時点のIssue / Plan / PR等、通常の変更管理単位で記録する。
- Environment / Toolchain支援と learning-content support を区別して記録する。
- 同じ教材箇所で learning-content support が繰り返し必要なら、self-study品質の改善Findingとして扱う。

### Continuous task

Repository remediation 完了後、次を継続タスクとして扱う。

- 対象受講者像に近い人が利用できるタイミングで初見受講者レビューを実施する。
- Curriculumの大きな変更、Lesson追加、Training command / Toolchain変更後は必要に応じて再レビューする。
- Pilotや実受講で繰り返し質問・停止が発生したLessonは優先して再レビューする。
- レビューで見つかった改善は、本 Master Planを再オープンせず、その時点のIssue / Plan / PRとして対応する。

固定の実施回数や周期は設けない。実運用Evidenceに応じて継続する。

## 19. Phase 6 — Refactoring Necessity Review

### Objective

Repository Audit §4.1〜§4.16 の全 candidate を Evidence で分類し、必要な Refactor だけを後続実装へ送る。

### Start condition

- PR 2 が `main` に merge 済みであること。
- 調査開始時の `main` SHA を durable report に記録する。
- PR 3〜5 と並行して調査してよい。

### Evidence

各 candidate で最低限次を確認する。

- recent Git churn / change frequency
- defect / repair history または CI / runtime failure history
- actual blast radius / consumer / dependency / reference boundary
- test protection
- transaction / state / platform boundary

補助 Evidence:

- maintainer cognitive cost
- split による abstraction / duplication cost

### Classification

- `refactor_now`
- `refactor_when_touched`
- `keep_as_is`
- `needs_more_evidence`

### Freshness check

PR作成前とmerge直前に Current `main` で candidate 関連差分を再確認する。

- candidate 自身
- 初回調査で確認した consumer / dependency / reference path
- protecting test / workflow
- Current `main` で追加・削除された関連 path

関連集合に変化がある candidate だけ blast radius / test protection / boundary / classification を再確認する。Repository 全体の全面再Auditは行わない。

### Output

- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`

Durable report には全16 candidate の Evidence / classification / rationale、investigation baseline SHA、merge直前の最終確認 `main` SHA を記録する。

Decision-only PR に Product refactor を含めない。`refactor_now` だけ decision-only PR merge 後に別 Plan / 別 PR へ切り出す。

### Completion

- 16 candidate 全件に classification がある。
- size 単独で `refactor_now` を付けていない。
- RA-C1 の Necessity Review 結果が durable report に記録されている。
- RA-Q1 は根拠付きで判断できた場合は最終 classification を記録し、`needs_more_evidence` の場合は不足 Evidence と再判断条件を記録する。
- decision-only PR に Product code change がない。

## 20. Validation plan

各 child Plan で、変更面に必要な Validation を選ぶ。無関係な full suite は機械的に実行しない。

### Markdown / Curriculum

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Test Strategy / Specification

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`

### TypeScript / workflow contract

- `pnpm run typecheck`
- 対象 unit / contract test

### Training implementation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Continuous learner review readiness

本 Master Plan の完了確認では、実際の初見受講者レビューを必須実行しない。次の準備状態だけを確認する。

- §5.10 の対象受講者像が README / Learning Design と一致する。
- Instructor Reference が受講内容外の支援へ限定されている。
- `docs/reference/curriculum-self-study-review.md` に §16 / §18 のチェック項目が定義されている。
- チェック表が Learner Required path、self-check、Recovery、Environment / Toolchain支援の境界を確認できる。
- PR 5 のTraining command / Artifact / Environment block確認方法とチェック表が矛盾しない。

実際の初見受講者レビューは §18 の継続タスクとして実施する。

### Wider impact

Product runtime / broad contract に影響する場合だけ次を追加する。

- `pnpm run test`
- `pnpm run verify`

## 21. Risks / stop conditions

次の場合は scope を広げず、Plan または判断を見直す。

- RA-M7 が path literal の最小修正だけで解消できない。
- RA-M7 修正後の失敗が filename mismatch と無関係で、今回 diff との因果を分離できない。
- Current `main` で対象 Finding が既に解消済み。
- RA-M8 の canonical grammar が Current validator / Workbook / contract test 間でも一致しておらず、単純な documentation repair では確定できない。
- Product behavior / Formal CI Gate の変更が必要になる。
- Decision B と矛盾する Current ADR / Normative requirement が見つかる。
- PR 3 の Required boundary 修正が対象4 Lesson / Capstoneの最小 wording変更を超えて構造変更を必要とする。
- PR 4 の教材改善がトップレベル Curriculum 全面再設計を必要とする。
- PR 4A のSpec auditで実変更が必要と判定された場合は、軽微でもPR 4Aへ混ぜずPR 4Bへ分離する。
- PR 4B でも Product behavior の意味を変えないと解消できない。この場合は Specification clarification へ分離する。
- Lesson の不足を埋めるために、目的不明の大量説明追加が必要になる。
- 自己学習化のために Instructor / 運営の環境準備・権限・端末・Toolchain支援までRepositoryだけで自動化する必要があるように見える。この場合は学習内容と環境運用の境界を再確認する。
- 自己確認のために設計判断・自由記述を全件自動採点する新しい scoring engine / AI grader が必要になる。この場合はRubric /回答例/観点による自己確認を優先する。
- 継続レビュー結果を本 Master Plan の完了条件へ戻そうとする。この場合は §18 の「継続タスク」と本Plan DoDの境界を維持する。
- 日本語化によって Tool / API / ID / machine contract の意味を変える必要がある。
- Normative Specification の用語整理中に Product behavior の意味変更または Product Decision が必要になる。
- Traceability のために全 Test title / file の大量編集が必要になる。
- Stable Risk ID の必要性を説明できない。
- Native learner exercise のために Product Formal Gate 変更が必要になる。
- Native specialization opt-in のために Common Core workflow を複雑に分岐させる必要がある。
- C08 evidence 判定に新しい専用 DB / scoring framework が必要になる。
- `training:web:exercise` に新 runner / framework が必要になる。
- Phase 6 の Evidence が不足し、推測で `refactor_now` を付ける必要がある。
- Phase 6 freshness のために新しい常設解析基盤が必要になる。
- Refactor 必要性を size / 主観だけでしか説明できない。
- Native Environment failure と source / learner failure を分離できない。

## 22. Open questions

Blocking question はなし。

実装時に Current Repository から決定する細部:

- ADR番号: PR 3開始時の次の空き番号を使用する。
- child branch名: Repository conventionに従う。
- Traceabilityの最終表形式: 既存文書内で最小変更になる形式を選ぶ。
- Curriculum の内部 Lesson 統合単位: PR 4 の全文監査で learner outcome と前後関係を見て決め、行数だけでは判断しない。
- Learner-facing Japanese / English の境界: §5.6 と PR 4 child Plan の Terminology Decision Table を基準とし、公式名称・machine contract の必要性を file ごとに確認する。
- Self-check の形式: command / validator / Artifactで判定できるものは機械Evidence、知識問題は回答例+理由または具体的チェックポイント、設計判断は必須観点+許容理由、Specification参照は具体的BR / AC / sectionを使い、Learnerが自分の成果物の充足を合理的に判定できる最小方法を選ぶ。
- PR 4B の要否: `docs/spec/**` text auditのDispositionで、実変更対象が1件以上ある場合だけ作成する。
- Normative Specification の editorial change 可否: semantic equivalence を確認できない場合は変更しない。
- Phase 6 candidate ごとの consumer / dependency / reference の具体的取得方法: 既存 code search / Git history / tests で確認し、新しい常設解析基盤は作らない。

## 23. Follow-up notes

Repository remediation 完了後、次を継続タスクとして扱う。

### 初見受講者レビュー

- `docs/reference/curriculum-self-study-review.md` を使って継続的にレビューする。
- 対象受講者像に近い人が利用できるタイミングで実施する。
- Curriculumの大きな変更、Lesson追加、Training command / Toolchain変更後は必要に応じて再実施する。
- Pilot / 実受講で繰り返し停止・質問が発生したLessonを優先する。
- 改善Findingはその時点のIssue / Plan / PRで管理し、本 Master Planを再オープンしない。
- 固定の回数・周期・PASS義務は設けない。

必要に応じて Pilot で次を収集する。

- completion time
- instructor / 運営 support count / category
- environment / toolchain support と learning-content support の内訳
- environment block
- re-submission reason
- competency ごとの失敗傾向
- Native specialization 選択率 / environment failure
- Learner が停止した Lesson / reason
- 用語・指示・Expected Behavior の誤解が発生した箇所

Learner Required pathで learning-content support が繰り返し必要になる箇所は、Instructorの支援実績として許容するだけでなく、self-study品質の追加Findingとして扱う。環境・Toolchain support は別カテゴリとして評価する。

Normative Specification の監査で Product Decision が必要と判定した Finding は、Curriculum editorial cleanup に混ぜず、Specification clarification の別 Issue / Plan として扱う。

実測値がない状態で Required Duration や専用管理システムを作らない。

## 24. Definition of Done

- Master Plan publication PR が `main` に merge 済みで、RA-M7 が解消されている。
- Phase 0 で Current `main` 基準の Finding 存否と owner 妥当性を再確認し、必要な scope 調整を該当 child Plan に反映している。
- PR 1 の Current Documentation / SSOT drift と RA-M8 Test Case ID grammar mismatch が解消されている。
- Test Case ID grammar の learner-facing canonical explanation と validator executable contract が一意に整合している。
- PR 2 の Formal Test Strategy / Traceability が Current Formal Suite と一致している。
- PR 3 の Common Core / Native specialization / Competency / Minimum Evidence 契約が一意である。
- 対象受講者像が README / Learning Design に明記され、テスト自動化の基本理解 + ノーコード / ローコード経験または理解、Playwright等コードベース自動化未経験、プログラミング非必須という前提が一意である。
- PR 3 で Repository-required curriculum asset と Learner Required path が一意に区別され、Instructor Reference がLearner Required pathではないことをREADME / Learning Designから判断できる。
- Instructor Reference が環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain等の受講内容外支援へ限定されている。
- Learner self-check / assessment criteria が learner-facing material にあり、Instructor-onlyの説明・評価基準へ依存していない。
- PR 4A で Learner Required path 全文、Repository-required support assetとの境界、`docs/spec/**` Markdown / text contract 全件を共通基準で監査し、各FindingのDispositionを確定している。
- PR 4A の Curriculum P0 / P1 Finding を、実装時点で確認できた範囲で解消している。
- Learner Required path の学習目標・説明・演習・自己確認・学習上のRecovery・完了条件・次の行動が learner-facing material でつながっている。
- Learner Required learning content が Instructor の追加説明や非公開Answer Keyに依存していない。
- Self-check がLearner自身で学習目標の充足を合理的に判定できる具体性を持ち、単なるgeneric Reference提示で完了扱いしていない。
- PR 4 child Plan の Terminology Decision Table と Learner Required path の表記が一致している。
- 将来の再発防止に必要な最小の言語・用語ルールが既存 Curriculum 正本へ反映されている。
- Spec実変更が必要な場合は PR 4B を PR 4A merge 後の最新 `main` から実施し、`docs/spec/glossary.md` / 必要なtemplate / changed specを整合させている。
- PR 4 の Core / Extension / Reference が PR 3 の評価契約と一致している。
- Learner Required Curriculum の内部 Lesson が独立した学習単位として成立するか、同一ファイル内で適切に統合されている。
- Learner-facing 一般用語の日本語 / 英語混在と表記揺れが、定義した基準に従って整理されている。
- Normative Specification の editorial review で Product behavior を変更していない。
- `docs/reference/curriculum-self-study-review.md` に、継続的な初見受講者レビューの対象受講者像、チェック表、Instructor / 運営支援境界、記録方法が定義されている。
- PR 5 の Baseline / Exercise / Artifact / Completion Evidence と Native specialization workflow が一意である。
- 機械確認できる Learner Required Exercise は Learner が command / validator / Artifact から自己確認できる。
- 継続レビュー用チェック表のcommand / Artifact / Environment block観点がCurrent Training入口と一致している。
- 初見受講者レビューの実施・PASS・所定回数の完了を、本 Master Plan のDoDに含めていない。
- 初見受講者レビューをRepository remediation後の継続タスクとして実施する方針が明記されている。
- Product Formal Native Regression / Android Runtime / iOS Build-only Gate が維持されている。
- Repository Audit §4.1〜§4.16 の全 candidate が Phase 6 durable report で分類されている。
- `refactor_now` 以外を不要に実装タスクへ変換していない。
- Master Plan を live progress tracker として運用していない。
- 新 LMS / DB / Test Management / third traceability SSOT / permanent call graph / automated grading framework を追加していない。
