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
- Part 1 Common completion は C01〜C07 と C09〜C10 の bounded Level 2 とし、Part 2 完了 / 最終 Common graduation はそこへ C11〜C12 の bounded Level 2 を加える。C08 Native Automation は Part 1 / Part 2 の Common completion には含めず specialization とする。
- C01〜C12 の Minimum Evidence を Lesson / Exercise / Artifact から追跡できる。
- 各 Learner Required Lesson が、独立した学習単位として成立するか、または前後の内容へ統合されている。
- 学習目標 → 説明 → Practice / Exercise → Completion Evidence が矛盾なくつながる。
- Learner-facing な一般用語は日本語中心で統一され、Tool / API / Code identifier など英語を維持すべき語との境界が一意である。
- Curriculum / Workbook / Validator / Training asset / Normative Specification の参照契約に矛盾がない。
- `docs/spec/**` の learner-facing / normative text が同一の言語・用語方針で監査され、Product behavior を変えずに必要な editorial correction が行われている。
- Training の Baseline と Learner-authored Evidence を区別できる。
- コース開始時の対象受講者像が明文化され、コードベースの自動化未経験者を前提に教材の説明深度と自己確認方法を判断できる。後続 Common Core Lesson では、Learner Required path 上でそれ以前に明示的に学んだ Common Core 内容だけを既習知識として利用できる。
- Common Core completion は specialization / Extension / Reference を受講していなくても成立し、これらの内容を後続 Common Core の隠れ前提にしない。
- Native specialization が Part 1 / Part 2 の途中に配置されたままでも、Learner が specialization を選択する場合と選択しない場合の分岐・Common Core への復帰経路を learner-facing navigation から一意に辿れる。
- Learner Required path と、Learner が選択した specialization の learner-facing material では、学習内容の説明、演習判断、答え合わせ、学習上のRecovery、完了判定を learner-facing material だけで進められる。
- Instructor / 運営は、環境準備・アカウント・権限・端末・演習Repository / Training Copy・Infrastructure / Toolchain 等、受講内容の外側を支援する担当として利用可能である。
- Instructor / 運営向け資料は、上記の受講内容外支援だけへ限定されている。
- 受講者視点レビューを継続的に実施できる品質基準と再利用可能なチェックリストが定義されている。
- 受講者視点レビューの実施結果や PASS は、本 Master Plan の完了条件にはしない。
- Technical Debt 候補は size 単独ではなく Evidence に基づいて分類される。

## 2. Current understanding

実装開始時に前提とする Current Repository の事実は次のとおり。

- Curriculum の canonical Learning Design file は `docs/curriculum/test-automation/00_learning-design.md`。
- `scripts/validate-curriculum.ts` は `docs/curriculum/test-automation/00_learning-design.md` を required file として要求している。
- RA-M7 は、commit済みHEADで上記 consumer path を確認し、non-canonical literal が残る場合だけ最小修正する。既に canonical なら source / contract test は変更しない。
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
- Current Curriculum は `03_instructor-reference.md` を持ち、Facilitation / Troubleshooting / evaluation guidance を Instructor 向けに記載している。また Rubric や一部 Lesson には講師支援・採点・提出を前提とした表現があり、Learner Required path と specialization の learner-facing material だけで自己確認できる情報との責務分離が必要である。
- Current Learning Design では Maestro / Native が Part 1 の途中に置かれ、その後の保守性改善 Lesson が Playwright / Maestro の両方を前提にする記述を持つため、Native specialization 化後は後続 Common Core が specialization を暗黙前提にしないよう整理が必要である。
- Current README / Learning Design の教材順は Part 1 / Part 2 とも番号順の直列 navigation であり、途中の Native Lesson を specialization として飛ばす経路と、選択後に Common Core へ復帰する経路はまだ明示されていない。
- Current Rubric は Part 1 を C01〜C10、Part 2 を C01〜C12 の主要項目とし、Part 1 の必須 Evidence に Native Flow を含めているため、Decision B 後の Common completion / specialization 契約へ同期する必要がある。
- Current validator の required-file list は Repository上存在必須の curriculum asset を表しており、受講者が修了のために必ず読む Learner Required path と同義ではない。`03_instructor-reference.md` は前者には含め得るが、後者には含めない。

### Assumptions

- PR #53 の2レポートは Master Plan の初期入力として有効だが、各 child PR 開始時に Current `main` で再検証する。
- Current Repository の局所差分は Phase 0 / 各 child Plan の repo mapping で解消でき、Master Plan の大順序を崩す必要はない。
- PR 4 の全文監査で新規 Finding が出ることは想定するが、Product behavior変更や Formal Regression 再設計が必要になった場合は本 remediation へ無理に取り込まない。
- Instructor / 運営は、環境準備、端末、アカウント、権限、演習Repository / Training Copy、Infrastructure / Toolchain障害を支援する担当として利用可能であることを運用前提とする。
- 自己学習品質で禁止する依存は、Learner Required path または選択した specialization の learner-facing material の理解、演習の選択・判断、答え合わせ、学習上のRecovery、完了判定を Instructor の口頭説明・個別判断・非公開情報に依存させることである。
- Common Core の後続 Lesson は、specialization / Extension / Reference を未受講でも成立することを前提とする。
- 受講者視点レビューは Repository remediation の最終Gateではなく、教材を運用しながら繰り返す継続的な品質改善活動として扱う。
- 受講者視点レビューは初見受講者だけに限定しない。対象受講者像に近い初見受講者が利用できる場合は初見レビューとして実施し、教材変更後などは同一または別のレビュアーによる再レビューも許容する。
- 受講者視点レビューの実施回数、実際の完走率、所要時間、支援回数は Pilot / 継続運用で確認し、本 Master Plan の完了をブロックしない。

### Safe change surface

- Current Fact / SSOT の文書修正。
- Curriculum の Learner Required / specialization / Core / Extension / Reference 境界の明確化。
- Repository-required curriculum asset と Learner Required path の役割分離。
- Lesson 内部構成、説明深度、用語・表記、navigation、Practice / Evidence 接続の整理。
- Learner-facing self-check、Recovery、Completion criteria と Instructor Reference の責務分離。
- Instructor Reference の責務を受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援へ限定する整理。
- 継続的な受講者視点レビューのための最小チェックリストの追加。
- Training learner entry / artifact / validation contract の必要最小限の追加・修正。
- Normative Specification の semantics-preserving な editorial correction。ただし Product behavior の意味を変えない範囲に限る。
- Validator / contract test は、既存 canonical contract と文書の不整合を防ぐために必要な最小変更だけ行う。

### Unknowns

- Learner Required path と learner-facing specialization material を同一基準で監査したときに発生する Curriculum P0〜P3 Finding の具体件数と分布。
- `docs/spec/**` 全 text document の監査で、実変更が必要な editorial Finding が発生するかどうか。
- Learner-facing 用語のうち、日本語化すべき一般語と公式英語を維持すべき語の最終境界。
- Instructor Reference にしか存在しない学習上の判断・Recovery・評価観点がどの程度あるか。
- 継続的な受講者視点レビューで初めて発見される navigation / prerequisite / self-check / completion blocker の有無。

これらは推測で先に固定せず、本文で定義した分割条件・停止条件に従って扱う。

## 3. Fixed decisions

次を固定条件として扱う。

- 共通卒業像は entry-level の汎用 Test Automation Engineer とする。
- §5.10 の対象受講者像はコース開始時の基準とする。
- コース開始時の想定受講者は、テスト自動化の目的・基本概念を理解している。
- コース開始時の想定受講者は、ノーコード / ローコードのテスト自動化ツールを触ったことがある、または仕組み・利用イメージを理解している程度を標準とする。
- コース開始時は Playwright などコードベースの自動化ツールは未経験を標準とし、プログラミング経験を必須前提にしない。
- Common Core Lesson で前提にできる学習済み知識は、コース開始時の対象受講者像に加え、Learner Required path 上でその時点より前に明示的に学んだ Common Core 内容に限定する。
- specialization / Extension / Reference で学ぶ内容を、その後の Common Core Lesson の必須前提・完了条件へ暗黙に持ち込まない。これらを未受講でも Common Core completion が成立する。
- specialization Lesson で前提にできる知識は、コース開始時の対象受講者像、明示された Learner Required path 上の Common Core prerequisite、同一 specialization 内でそれ以前に必須として明示された Lesson / completion に限定する。
- 教材外の実務経験・経験者の暗黙知は Common Core / specialization のどちらでも前提にしない。
- specialization は、開始前に必要な Learner Required path 上の Common Core prerequisite と、specialization 内の必要な前段Lesson / completionを README / Learning Design / 対象Lessonのいずれかで明示する。
- Native specialization の分岐周辺の canonical navigation は、トップレベルファイルの番号・配置を変えず branch / rejoin を明示する。次の経路はCommon Core全体ではなくNative分岐前後の局所経路を示す。
  - Part 1 Native分岐周辺の Common Core: `P1-6 → P1-8 → P1-9`。
  - Part 1 Native specialization 選択時: `P1-6 → P1-7 → P1-8 → P1-9`。P1-7 完了後は P1-8 の Common Core へ復帰する。
  - Part 2 Native分岐周辺の Common Core: `P2-5 → P2-7 → P2-8` の Common Core 範囲。
  - Part 2 Native specialization 選択時: P2-6 の prerequisite を満たした後に `P2-6 → P2-7 → P2-8` へ進み、P2-7 で Common Core に復帰する。P2-8 の Native / full multi-platform 部分は specialization / Advanced として Common completion から分離する。
- Part 1 Common completion の能力契約は C01〜C07 と C09〜C10 の bounded Level 2 とする。
- Part 2 完了 / 最終 Common graduation の能力契約は Part 1 Common completion に C11〜C12 の bounded Level 2 を加えた C01〜C07 と C09〜C12 とする。
- C08 Native Automation は Part 1 / Part 2 の Common completionには含めず Native specialization とし、Physical Android Hands-on、Native CI、Native Capstoneもspecializationとして扱う。
- Native specialization 化は Curriculum learner の Required / specialization 境界だけを変更する。
- Product Formal Native Regression、Android Runtime Gate、iOS Build-only Gate は維持する。
- Native Lesson / Training asset は specialization の canonical asset として残す。
- Normative Specification を Expected Behavior の Oracle とする。
- Normative Specification が明確で Current implementation だけが異なる場合は Specification を実装へ寄せず、`Product implementation deviation` として本 remediation の Product変更scope外へ分離する。
- Normative Specification 自体が曖昧・不足している、複数解釈できる、または Product Decision が必要な場合だけ `Specification clarification` とする。
- Analysis → Design → Selection → Implementation → Failure → Maintainability → Development Process の大順序を維持する。
- Part 1 / Part 2 のトップレベル教材ファイル数と大順序は維持する。
- 各教材ファイル内部の Lesson / subsection 数は固定しない。独立した学習単位として成立しない細切れな Lesson は、同一ファイル内で前後へ統合してよい。
- Lesson を維持するためだけに文章量を増やさない。内容を追加する価値がなければ統合を優先する。
- Curriculum Core を簡潔化するために Product behavior / Formal Regression の品質を下げない。
- 用語を次の2つへ分離する。
  - `Repository-required curriculum asset`: Validator / Repository contract 上、存在・整合が必須の教材・支援文書。Learner が修了のために必ず読むことは意味しない。
  - `Learner Required path`: Learner が共通卒業要件を満たすために読む・実施する必要がある learner-facing material。Common Core の自己学習品質監査の正本範囲とする。
- Learner Required path は自己学習を標準とする。学習目標、説明、演習、自己確認、学習上のRecovery、完了条件、次の行動、評価観点は learner-facing material 内で完結させる。
- Learner が specialization を選択した後は、その specialization の learner-facing Lesson / Exercise にも Learner Required path と同じ自己学習品質基準を適用する。ただし specialization の環境・実行・Evidence を Common Core completion に暗黙強制しない。
- Instructor / 運営は、環境構築、端末、アカウント、権限、演習Repository / Training Copy、Infrastructure / Toolchain障害対応を担う支援担当として利用可能であることを運用前提とする。
- Instructor / 運営向け資料は受講内容の外側だけを扱う。
- Instructor / 運営向け資料へ、学習内容の説明、問い返し、答え合わせ、学習上のRecovery、評価基準、模範的な考え方を置かない。
- `03_instructor-reference.md` は Repository-required support asset として残してよいが、Learner Required path には含めず、受講内容外の支援だけを記載する。
- README / Learning Design / Validator では Repository-required curriculum asset と Learner Required path を混同しない。README上も Instructor Reference が受講者の必修教材ではないことを判別できるようにする。
- Rubric / Minimum Evidence は Learner-facing な共通契約とする。外部評価を行う場合も同じ公開 Rubric / Evidence を参照し、Instructor専用の非公開採点基準を作らない。
- 受講者視点レビューは継続的な品質改善活動とし、本 Master Plan の完了条件にしない。
- 受講者視点レビューは、初見レビューと再レビューを使い分けてよい。再レビューでも対象受講者像を超える暗黙知で教材不足を補完しない。
- 個別の受講者視点レビュー結果は保存・履歴管理しない。問題が見つかった場合はその都度具体的な修正指示へ落とし込む。
- 継続レビュー用チェックリストは再利用する観点だけを保存し、個別レビューの Finding / 備考 / 未検証理由 / Evidence を書き込む結果記録フォームにはしない。
- 本 Master Plan では、継続レビューに使える対象受講者像、観点、チェックリストを整備するところまでを責務とする。
- 各 Finding は Remediation Matrix で Primary owner を1つだけ持つ。
- Follow-up verification は Primary owner を置き換えない。
- Learner-facing な一般説明は日本語を基本とする。ただし Tool / Product / API / Code identifier / file path / command / ID grammar / Official concept name は意味を壊さない範囲で英語を維持する。
- Machine-consumed heading、ID、path、token、validator contract は単純翻訳しない。変更が必要な場合は parser / validator / contract test と同一変更単位で扱う。
- Normative Specification の日本語整理では Product behavior の意味を変更しない。意味が変わる可能性がある文言は editorial change として処理せず、Product Decision が必要な別課題として記録する。
- `docs/spec/**` の実変更は、Pre-change audit で `PR 4B` Disposition と判定した bounded な semantics-preserving Finding だけを Curriculum 変更へ混ぜず PR 4B として分離する。typo / punctuation / spacing 等の軽微な editorial Finding だけでは PR 4B を発生させない。
- PR 4B が必要な場合は PR 4A merge 後の最新 `main` から branch を作り、stacked PR にしない。

## 4. Non-goals

- Product behavior の変更。
- `docs/spec/**` 全件を Current implementation と総当たり照合する Product behavior conformance audit。
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
- 受講者視点レビューの実施、PASS、所定回数の完了を本 Master Plan の blocker にすること。
- 受講者視点レビュー結果の保存場所、履歴管理、専用台帳を作ること。
- RA-M7 修正へ Curriculum semantic change、file rename、validator cleanup を混ぜること。
- Normative Specification の Product Rule を「読みやすさ」の名目で変更すること。
- 明確な Normative Specification と Current implementation が不一致な場合に、Observed Behaviorへ合わせてSpecificationを変更すること。
- 全英語を機械的に日本語へ置換すること。
- PR 4 の用語整理のために新しい permanent glossary / terminology database を作ること。
- 自己学習を理由に Instructor / 運営による環境準備、権限付与、端末準備、Infrastructure / Toolchain 障害支援まで排除すること。
- 設計判断や自由記述を含む全 Exercise を機械採点するための新しい scoring engine / AI grader を作ること。

## 5. Review policy for Curriculum quality

PR 4 の child Plan 作成時に、Learner Required path 全文と learner-facing specialization material を次の観点で監査する。既存 Report の Finding だけを直して終了せず、Common Core と、Learner が specialization を選択した後に読む Lesson / Exercise へ同じ自己学習品質基準を適用する。Repository-required support asset は、Learner Required path / specialization learner-facing material との責務境界・参照整合を別途確認する。

### 5.1 Accuracy / Contract consistency

- file path、command、script name、project name、ID grammar が Current Repository と一致する。
- Curriculum / Workbook / Validator / Training asset / Specification の同一概念が矛盾しない。
- Expected Behavior を Current UI / test code / README から逆算していない。
- Normative Specification と Supporting Evidence の責務を混同していない。
- Editorial change の semantic equivalence確認、Learner Required / 選択したspecializationのExpected Behavior確認、または監査中に実際の不一致を発見した場合だけ、必要な範囲でCurrent implementationと照合する。全SpecのProduct behaviorを能動的に実装と総当たり照合しない。
- 上記の必要な照合で Normative Specification が明確なのに Current implementation が異なる場合、その差を Specification clarification と誤分類せず Product implementation deviation として分離する。

### 5.2 Learning-unit completeness

各内部 Lesson / subsection について、少なくとも次を確認する。

- 何を理解・判断できるようになるのかが明確である。
- なぜその知識が必要か、前後の学習との関係が分かる。
- 定義だけで終わらず、Scenario Shop または実務に接続した具体例がある、またはその Lesson が短い Reference として明示されている。
- Learner に判断・操作・作成を求める内容なら Practice / Exercise への入口がある。
- 完了条件または次の Lesson への接続が分かる。

数行しかないことを自動的に defect としない。独立 Lesson として意味が薄い場合は、文章を水増しせず同一ファイル内の前後へ統合する。

### 5.3 Learning flow / prerequisites

- Common Core Lesson では、コース開始時の対象受講者像に加え、Learner Required path 上でそれ以前に明示的に学んだ Common Core 内容を前提知識として利用してよい。前段 Common Core で学んだ内容を後続 Common Core でゼロから再説明しない。
- specialization / Extension / Reference の内容を後続 Common Core の必須前提にしない。これらを未受講でも Common Core の学習・演習・完了条件が成立する。
- specialization Lesson では、明示された Learner Required path 上の Common Core prerequisite と、同一 specialization 内の必須前段Lesson / completionだけを既習として扱ってよい。
- Native specialization を途中で選択しない Learner は、learner-facing navigation から次の Common Core Lesson へ直接進める。選択した Learner は specialization 完了後に明示された rejoin point から Common Core へ復帰できる。
- 正規の前提経路で説明していない概念や、教材外の実務経験・経験者の暗黙知を当然の前提として使用しない。
- Test Target → Risk → Design → Layer → Automation → Implementation の順序を壊していない。
- Playwright / Maestro / Git / CI の Tool 操作より、必要な判断能力を先に学べる。
- コース開始時のPlaywright等コードベース自動化未経験・プログラミング非必須という前提から学習を開始できる。後続 Common Core では Learner Required path 上の前段 Common Core で学んだ Playwright / TypeScript / Git / CI 等を既習として扱ってよい。
- specialization は開始に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionが learner-facing navigation または対象Lessonから一意に分かる。
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
| Current terms | Learner Required path と learner-facing specialization material 内で実際に使われている表記 |
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
- Learner Required / Extension / Reference / Legacy / specialization が directory browse でも誤解しにくい。
- Optional / Legacy asset が Learner Required completion と競合しない。
- specialization / Extension / Reference が後続 Common Core の隠れ prerequisite になっていない。
- 途中配置の specialization について skip / branch / rejoin が learner-facing navigation から一意に分かる。
- Repository owner 向け運用契約を Learner Required text に過剰露出しない。
- Instructor Reference に learner-facing learning content を置かない。
- Repository-required curriculum asset と Learner Required path を同じ「Required」として曖昧に表示しない。

### 5.8 Curriculum Finding severity

PR 4 child Plan の Curriculum Finding は次で分類する。Specification Findingにはこの severity を適用せず、§16 の Specification Disposition だけで扱う。

- `P0`: 教材どおり進めると実行不能、誤った Expected Behavior、validator / implementation contract と矛盾する。
- `P1`: 学習目標・演習・評価の不整合、前提知識の飛躍、Lesson が学習単位として成立しない、または learner-facing learning content / self-check が Instructor の追加説明に依存するなど学習成果へ大きく影響する。
- `P2`: 日本語 / 英語混在、重複、Learner Required / specialization / Reference 発見性、情報量の偏りなど理解・保守性へ影響する。
- `P3`: 語尾、軽微な表記、文章上の微修正。

Curriculum Finding の修正境界は次で固定する。

- `P0` / `P1`: PR 4A の blocker とし、Pre-change audit で確認したものは PR 4A で必ず解消する。ただし解消に未決の `Specification clarification` が必要な場合は Expected Behavior を推測して修正しない。関連する Specification Finding を child Plan 上で紐付け、clarification が解消するまで当該 Curriculum P0 / P1 を PR 4A completion blocker のまま維持する。明確なSpecに対する `Product implementation deviation` が Learner Required completion、選択したspecialization completion、または本Plan DoDを実際に阻害する場合も、Product側の解消まで関連するCurriculum P0 / P1を解消扱いにしない。Learner経路・DoDを阻害しないProduct deviationはfollow-upへ分離し、PR 4A blockerにしない。
- `P2`: 本 Master Plan の目的である learner-facing の自己学習品質、navigation、用語一貫性、重複削減、保守性へ直接関係し、かつ bounded な変更で解消できるものだけ `fix_now` とする。それ以外は `defer` とし、PR 4A の scope を広げない。ただし Goal / Fixed decisions / Definition of Done の成立に必要な P2 は規模だけを理由に `defer` しない。必要な P2 が bounded に収まらない場合は、無理に defer せず stop condition として PR 4 child Plan の scope を見直す。
- `P3`: PR 4A で実際に変更する箇所の周辺を局所修正する場合だけ `fix_now` とする。P3 全件の一括cleanupは行わず、それ以外は `defer` とする。

修正順は `P0 → P1 → P2 → P3` とする。P2 / P3 を見つけたこと自体を、無条件に全件修正する理由にしない。

### 5.9 Self-study completeness

Learner Required path と、Learner が選択した specialization の learner-facing material は、環境が開始可能な状態になった後の学習進行を learner-facing material だけで完結させる。specialization の環境・実行・Evidence を Common Core completion に要求することはしない。

各対象 Lesson / Exercise で次を確認する。

- 何を開始条件として満たせばよいかが分かる。端末・アカウント・権限・演習Repository等を Instructor / 運営が提供する場合も、Learner が受領後に確認する条件を明示する。
- Common Core Lesson の開始条件に specialization / Extension / Reference completion を含めない。
- 途中配置された specialization では、選択しない場合の次の Common Core と、選択した場合の rejoin point が分かる。
- 学習内容を理解するために Instructor の口頭説明・追加資料・非公開 Answer Key を必要としない。
- Exercise で何を作る・実行する・記録するかが明確である。
- Self-check は、Learner が「自分の回答・成果物がその学習目標を満たしているか」を合理的に判定できる具体性を持つ。単に Rubric / Spec / Reference へのリンクがあるだけで、該当する評価条件・BR / AC・確認観点を特定できない場合は self-check とみなさない。
- command / test / validator で判定できる内容は、期待する結果、終了状態、Artifact、確認箇所のいずれかを具体的に示す。
- 知識・確認問題は、回答例と理由、または正答に最低限含むべき具体的チェックポイントで自己確認できるようにする。
- 設計判断・自由記述・Trade-off問題は、一意の模範解答を強制せず、最低限考慮すべき観点と、許容できる判断理由の条件を示す。
- Specification を使う自己確認は、関連する BR / AC / section など具体的な参照箇所を示し、Learner が自分の回答と照合できるようにする。
- Environment / Toolchain 障害は Instructor / 運営へ相談してよい。学習内容・設計判断・答え合わせ・学習上のRecoveryが教材だけで解決できない場合は、Instructorが内容を補完せず教材改善Findingとして扱う。
- 完了条件が Learner 自身で確認でき、Instructor独自の追加判定を待たないと次へ進めない構造にしない。
- 次に読む Lesson / 実施する Exercise が明確である。

### 5.10 Course-entry target learner profile

次はコース開始時の対象受講者像とする。

- テスト自動化の目的・基本概念を理解している。
- ノーコード / ローコードのテスト自動化ツールについて、操作経験または概要理解がある。
- Playwright 等のコードベース自動化ツールは未経験である。
- プログラミング経験は前提にしない。
- Git / GitHub / CI / Maestro などは、そのLessonで説明される前の知識として補完しない。
- Repository固有のpath、Training command、Seed、Formal Test、Workflow構成を事前に知っている前提にしない。

Common Core Lesson の説明深度と受講者視点レビューでは、このコース開始時プロフィールに、Learner Required path 上でそれ以前に明示的に学んだ Common Core 内容だけを加えた状態を基準とする。specialization / Extension / Reference で得る知識は Common Core の必須前提として扱わない。

specialization の説明深度と受講者視点レビューでは、このコース開始時プロフィールに、明示された Learner Required path 上の Common Core prerequisite と同一 specialization 内の必須前段Lessonで学んだ内容を加えた状態を基準とする。どちらの経路でも教材外の実務経験、過去の運用知識、経験者の暗黙知で不足を補完しない。

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
- `docs/reference/curriculum-self-study-review.md`（PR 4A で追加する受講者視点レビュー用チェックリスト）

### Normative Specification / learner-facing reference

Audit scope:

- `docs/spec/**` の Markdown / text contract 全件。
- `README.md`、`change-process.md`、`glossary.md`、`known-deviations.md`、`product-scope.md`、`roles-and-permissions.md`、`screen-catalog.md`、`state-and-scenarios.md`、`ui-ux-contract.md`、`_templates/**`、`features/**` を含む。
- binary / image asset は内容監査対象外。ただし text document からの参照整合は確認する。

この全件監査は、text contractの用語・表記・内部整合・semantic safetyを確認するための監査であり、全Product behaviorをCurrent implementationと照合するconformance auditではない。Current implementationとの照合は、editorial changeのsemantic equivalence確認、Learnerが参照するExpected Behavior確認、または監査中に実際の不一致を発見した場合だけ必要な範囲で行う。

Specification は Oracle であるため、実変更は semantics-preserving な用語・表現整理に限定する。Product behavior の意味に触れる可能性がある Finding は変更せず follow-up へ分離する。必要な照合でCurrent implementation との意味差を確認した場合は、Specification 自体が曖昧なら `Specification clarification`、Specification が明確なら `Product implementation deviation` として区別する。

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
- `docs/curriculum/test-automation/03_instructor-reference.md` と、そこから learner-facing material へ移すべき学習上の説明・判断・Recovery・評価観点

## 8. Remediation Matrix

この Matrix は、Finding の予定 Disposition、Primary owner、Follow-up verification を定義する実行割当表とする。進捗や完了状態はこの Matrix では管理しない。

実際の対応結果は、各 child Plan / PR、Phase 6 durable report、Run Artifact で記録・確認する。

| ID | Finding | Planned disposition | Primary owner | Follow-up verification |
| --- | --- | --- | --- | --- |
| RA-M1 | Required Web E2E 件数 / command の文書差 | fix | PR 1 | PR 2 |
| RA-M2 | Cross-role を PR 外とする文書と Current PR Gate の差 | fix | PR 1 | PR 2 |
| RA-M3 | Playwright project 名の文書差 | fix | PR 1 | PR 2 |
| RA-M4 | Seed Version の Current Documentation / implementation 差 | fix | PR 1 | なし |
| RA-M5 | Test Strategy / Acceptance / E2E 文書が Native を future / Phase 1 外として扱う | fix | PR 1 | PR 2 / PR 3 |
| RA-M6 | Curriculum の iOS manual-only 説明と Native change 時 Build-only Required Gate の差 | fix | PR 1 | PR 2 / PR 3 |
| RA-M7 | Curriculum canonical filename と `validate:curriculum` required-file contract の差 | verify; mismatch が残る場合だけ最小修正 | Master Plan publication PR | PR 3 |
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
| CUR-H4 | Learner-facing Lesson 内の学習目標・説明・Practice・完了条件が弱く、独立した学習単位として成立しない箇所 | audit + fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-H5 | Learner-facing learning content / self-check / learning Recovery が Instructor の追加説明や非公開判断に依存する箇所 | audit + fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-H6 | Repository-required curriculum asset と Learner Required path が同じ Required 表現で混同され、Instructor Reference 等の役割が曖昧 | fix | PR 3 | PR 4 / 継続的な受講者視点レビュー |
| CUR-H7 | Instructor Reference に受講内容・Facilitation・評価観点が残り、講師側と受講者向け教材の責務境界が曖昧 | audit + fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-M1 | P1-5 への観点集中 | fix | PR 4 | なし |
| CUR-M2 | C04 Level 2 と Practice 量の非対称 | fix | PR 3 | PR 4 |
| CUR-M3 | C09 Failure Evidence が弱くなり得る | fix | PR 3 | PR 4 |
| CUR-M4 | P1-8 Core scope が広い | fix | PR 4 | なし |
| CUR-M5 | Native baseline と meaningful learner flow の Assessment 差 | fix | PR 3 | PR 5 |
| CUR-M6 | Part 2 の Repository 固有運用詳細が Core と同深度 | fix | PR 4 | なし |
| CUR-M7 | Learner exercise の継続評価境界が薄い | fix | PR 3 | PR 5 |
| CUR-M8 | C12 scope が広い | fix | PR 3 | PR 4 |
| CUR-M9 | iOS Current Gate の Documentation Drift | fix | PR 1 | PR 2 / PR 3 |
| CUR-M10 | 学習目標 → 本文 → 演習 → 成果物 → Rubric の縦方向整合が Learner Required path と learner-facing specialization material 全体で未監査 | audit + fix | PR 4 | PR 5 / 継続的な受講者視点レビュー |
| CUR-M11 | Learner Required / specialization / Extension / Reference / Legacy の発見性が directory browse / lesson navigation で弱い | fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-M12 | Rubric / assessment contract が Learner の自己確認と外部評価で同じ Evidence を使う契約になっていない | fix | PR 3 | PR 4 |
| CUR-M13 | 受講者視点レビューの対象受講者profileが未定義で、経験者の暗黙知で教材不足を補完し得る | fix | PR 3 | PR 4 / 継続的な受講者視点レビュー |
| CUR-M14 | Self-check が単なる参照先提示で成立し得て、Learner が自分の回答・成果物の充足を判定できない | fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-M15 | 受講者視点レビューが単発の最終Gateとして扱われ、継続改善とMaster Plan完了境界が競合する | fix | PR 4 | 継続運用 |
| CUR-L1 | Spiral と説明重複の境界が薄い | 最小ラベル整理 | PR 4 | なし |
| CUR-L2 | Pilot 実測値がない | defer | Follow-up | なし |
| CUR-L3 | Learner-facing 一般用語の日本語 / 英語混在と表記揺れ | fix | PR 4 | 継続的な受講者視点レビュー |
| CUR-L4 | `docs/spec/**` を含む learner-facing / normative reference の用語・言語一貫性が未監査 | 全 text contract を audit。bounded な semantics-preserving editorial Finding だけ PR 4B、Specification clarification / Product implementation deviation は別課題。全Product behaviorの実装適合監査はscope外 | PR 4 | `validate:spec` / 継続的な受講者視点レビュー |
| CUR-L5 | 初出用語・前提知識・次アクションが不明瞭で Learner が停止し得る箇所 | audit + fix | PR 4 | PR 5 / 継続的な受講者視点レビュー |

Phase 0 では Current `main` で Finding の存否と Primary owner の妥当性を再確認する。Evidence を後続 Phase / PR で収集する Finding は、Phase 0 だけで最終判断しない。

## 9. Change strategy and execution order

実行順序は次のとおり。

1. Step 0: Master Plan publication PR に含める RA-M7 の Current State 確認（必要時のみ最小修正）と local validation を完了する。
2. Master Plan publication PR を作成し、Run Artifact の最終更新を含む候補headを確定してpushする。
3. push後にGitHubで観測したPR headのCI / review / merge-readyを確認する。CI結果や自己SHAをRun Artifactへ書き戻すためだけの追加commitは作成しない。
4. ユーザーの明示承認後に Master Plan publication PR を `main` へ merge する。
5. 最新 `main` から PR 1 branch を作り、Phase 0 → PR 1 child Plan → Current Documentation / SSOT Repair を実施する。RA-M8 をここで解消する。
6. PR 1 merge 後の最新 `main` から PR 2 branch を作り、Formal Test Strategy / Perspective / Traceability を実施する。
7. PR 2 merge 後の最新 `main` から PR 3 branch を作り、Decision B / Competency / Assessment Contract を実施する。ここでコース開始時の対象受講者像、Common Core / specialization の既習知識境界と branch / rejoin navigation、Part 1 Common=C01〜C07+C09〜C10 / Part 2 final Common=C01〜C07+C09〜C12 / C08=specialization の能力契約、Repository-required curriculum asset / Learner Required path、Learner-facing Rubric、Instructor Referenceの責務境界を正本化する。Instructor Reference本体は冒頭のtransition noticeだけを最小修正し、既存Facilitation / 判断 / Recovery / 評価観点の実仕分け・移行はPR 4Aで行う。
8. PR 3 merge 後の最新 `main` から PR 4A branch を作る。実装前に Learner Required path 全文、learner-facing specialization material、Repository-required support assetとの境界、`docs/spec/**` の Markdown / text contract 全件を監査し、Curriculum P0〜P3 Finding、実際に発生した Specification Finding の Disposition、Terminology Decision Table を child Plan に記録する。Spec監査は全対象のcoverageを確認するが、問題がない対象へ人工的な `no_change` Findingを作らない。Spec監査はtext contractの用語・表記・semantic safetyを対象とし、全Product behaviorの実装適合監査へ拡張しない。PR 4A では Curriculum Core / Extension / Reference / specialization / language / learning-flow / self-study remediation、Instructor Reference内情報の仕分け・移行、継続的な受講者視点レビュー用チェックリストの追加、Curriculum側の安定した用語ルール反映を実施する。
9. Spec監査で `PR 4B` Disposition の Finding が1件以上ある場合は、PR 4A merge 後の最新 `main` から PR 4B branch を作り、bounded な semantics-preserving Specification editorial を実施する。`PR 4B` Disposition がなければ PR 4B は作らない。`Specification clarification` / `Product implementation deviation` は PR 4B へ入れない。
10. PR 4 stage（PR 4A、必要な場合は PR 4B）merge 後の最新 `main` から PR 5 branch を作り、Training Evidence / learner exercise / specialization workflow を実施する。
11. PR 5 では継続レビュー用チェックリストの command / Artifact / Environment block 観点が実際のTraining入口と矛盾しないことを確認する。
12. Phase 6 は PR 2 merge 後から PR 3〜5 と並行して調査してよい。decision-only PR は最新 `main` へ追従して確定する。
13. Repository remediation 完了後は、§18 のチェックリストを使った受講者視点レビューを継続タスクとして運用する。実際のレビュー実施・PASSは本 Master Plan の完了条件に含めない。
14. 必要に応じて Pilot Feedback を収集する。

### Branch / PR rules

- Child branch は依存 PR merge 後の最新 `main` から作る。
- 原則 stacked PR は使わない。
- PR 1〜5 はそれぞれ child Plan を `docs/plans/` に保存してから実装する。
- PR 4 child Plan は Learner Required path 全文、learner-facing specialization material、Repository-required support assetとの境界、`docs/spec/**` text contract の audit coverage、実際に発生した Finding 一覧、Terminology Decision Table を含める。Curriculum Finding にだけ `P0`〜`P3` severity と `fix_now` / `defer` の Disposition を記載し、§5.8 の修正境界に従う。Specification Finding は実際に問題・判断対象が見つかった場合だけ作成し、§16 の `no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` で扱う。問題のないSpec file / headingへ `no_change` Findingを作る必要はない。別の permanent audit SSOT / glossary は追加しない。
- PR 4A で `docs/reference/curriculum-self-study-review.md` を追加し、継続的な受講者視点レビューのチェックリストだけを保存する。個別レビュー結果やレビュー履歴は保存せず、チェックリスト自体にも個別結果を書き込む欄を設けない。
- PR 4B が必要な場合は、PR 4A merge 後の最新 `main` から作成し、PR 4Aで保存済みの同一 child Planを入力として使用する。新しい Master Plan や第三の tracking SSOT は作らない。
- PR 4Aへ `docs/spec/**` の実変更を含めない。Specの実変更は `PR 4B` Disposition としたboundedなsemantics-preserving FindingだけをPR 4Bへ含める。
- 受講者視点レビューの実施・改善は本 Master Plan 完了後の継続タスクとして扱い、本 Master Plan を live status tracker にしない。
- Phase 6 decision-only PR は本 Master Plan を直接使用する。candidate inventory、Evidence criteria、output scope が変わる場合だけ別 Plan を作る。
- `refactor_now` と判定した実装だけ Phase 6 decision-only PR merge 後に別 Plan / 別 PR を作る。

## 10. Step 0 — RA-M7 CI unblocker and PR-ready validation

### Changes

Master Plan branch 上で次だけを変更する。

- `scripts/validate-curriculum.ts` の required curriculum path が `00_learning-design.md` を指していることをcommit済みHEADで確認し、non-canonical literal が残る場合だけ最小修正する。
- `tests/contracts/training-curriculum.test.ts` が同じ誤 literal を直接保持している場合だけ、その literal を最小修正する。
- active Run Artifact を実状態へ更新する。

次は変更しない。

- canonical Curriculum file の rename
- Curriculum wording / Required boundary
- RA-M8 以降の Curriculum finding
- validator cleanup / refactor
- Product behavior / Formal Test / Product CI
- PR 1 以降の remediation

### Run Artifact handling

- active Run `20260824-201800-JST` を継続使用する。
- `run.json.task_type` は `plan` のまま維持する。
- 実変更は `run.json.changed_files` に追加する。
- Validation 実行結果は `run.json.validation` と `REPORT.md` に記録する。
- `REPORT.md` は append-only とする。
- Run Artifact は、local validation と `run.json.status: pending` を含む最終更新を先に確定する。
- その最終Artifact更新を含むpush後に観測したPR headを、CI / review / merge-ready判定の `PR head at observation time` とする。commit自身のSHAをArtifactへ事前記録しない。
- 最終Artifact commit後のCI / review / PR headはGitHub PR metadataを正本とし、結果を書き戻すためだけの追加commitは作成しない。RunはGitHub metadataでgreenかつmerge-readyを確認した時点で完了判定する。
- Run 完了後の実際の merge 状態は GitHub PR を正本とし、merge 後に Run Artifact を追加更新しない。

### Local validation

次を実行する。

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check`

Sanitizer Write が Run Artifact を変更した場合は、その変更を確認してから Check を再実行する。

### Step 0 completion

次を満たした時点で Step 0 完了とする。

- RA-M7 の Current State として required path が canonical であることを確認し、non-canonical literal が残る場合だけ最小修正されている。
- `validate:curriculum` / `test:contracts` が filename mismatch で失敗しない。
- typecheck / format / markdown lint が PASS する。
- Sanitizer Check の residual finding が0件である。
- diff が Master Plan、active Run Artifact、RA-M7の確認または必要時の最小修正だけに限定されている。
- PRを作成できる状態になっている。

GitHub pull request の作成、PR-triggered CI、review、merge は Step 0 に含めない。

## 11. Master Plan publication PR

Step 0 完了後に Master Plan publication PR を作成する。

### PR contents

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `.codex/runs/20260824-201800-JST/**`
- RA-M7 の確認（必要時のみ最小修正）

### Required checks

1. PR diff が Step 0 scope 内であることを確認する。
2. Run Artifact（local validation結果を含む）を `pending` のまま最終化し、その更新を含む通常commitをpushする。
3. push後にGitHub Actionsのpull request CIとreviewを完了させる。失敗時は `status` を `pending` のまま保持して必要な bounded repair を行う。
4. push後にGitHubで観測したPR headを `PR head at observation time` として、CI / review / merge-readyを判定する。
5. CI / review / PR headの結果はGitHub PR metadataを正本とし、Run Artifactへ結果や自己SHAを書き戻すためだけの追加commitは作成しない。
6. GitHub metadataでgreenかつmerge-readyを確認できた場合にRunを完了判定する。`run.json.status` はその確認前に `complete` へ変更しない。
7. merge はユーザーの明示承認後に行う。
8. merge 後は GitHub PR を merge 状態の正本とし、Run Artifact を追加更新しない。

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
  - Learner Required path と learner-facing specialization material を検索し、非canonicalな learner-facing Test Case ID例が残っていないことを確認する。

### Candidate files

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md` の factual statement
- `docs/12_quality/requirements_traceability.md` の factual statement
- `docs/12_quality/acceptance_criteria.md` の factual statement
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- その他 Test Case ID の例を持つ Learner-facing Curriculum
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
- Learner Required path と learner-facing specialization material の Test Case ID 例を検索し、canonical grammar に反する learner-facing example が残っていないことを確認する。

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

共通卒業像、コース開始時の対象受講者像と Common Core / specialization の既習知識境界・branch / rejoin navigation、Part 1 Common=C01〜C07+C09〜C10 / Part 2 final Common=C01〜C07+C09〜C12 / C08=Native specialization の能力契約、C01〜C12 の評価契約、Learner Required / specialization 境界、Repository-required curriculum asset / Learner Required path、Learner self-check の共通 Evidence 契約を正本化する。

### Changes

- 次の空き ADR で Decision B を記録する。
- README / Learning Design に共通卒業像と Learner Required / specialization 境界を記載する。
- README / Learning Design / Rubric に、Part 1 Common completion を C01〜C07 + C09〜C10 の bounded Level 2、Part 2 完了 / 最終 Common graduation をそこへ C11〜C12 を加えた C01〜C07 + C09〜C12 の bounded Level 2 とし、C08をNative specializationとする能力契約を一意に記載する。Native分岐周辺の局所navigationをCommon Core全体の定義として扱わない。
- Rubric の Part 1 / Part 2 修了基準を上記契約へ同期し、Part 1 / Part 2 の Common completion に Native Flow / C08 Evidence を要求しない。C08 Evidence は Native specialization completion にだけ要求する。
- README / Learning Design に §5.10 のコース開始時の対象受講者像を記載する。
- README / Learning Design に、Common Core Lesson が前提にできる既習知識を「コース開始時プロフィール + Learner Required path 上でそれ以前に学んだ Common Core 内容」に限定し、specialization / Extension / Reference を後続 Common Core の必須前提にしないルールを記載する。
- specialization の開始に必要な Learner Required path 上の Common Core prerequisite と、specialization 内の前提Lesson / completionを README / Learning Design / 対象Lessonのいずれかで一意に確認できるようにする。
- README / Learning Design に Part 1 / Part 2 の Native specialization の branch / skip / rejoin navigation を明示する。トップレベルファイルの番号・配置は変えず、§3 のNative分岐周辺のcanonical navigationに従う。
- README / Learning Design に Repository-required curriculum asset と Learner Required path の違いを記載する。
  - `03_instructor-reference.md` は Repository-required support asset として残してよいが、Learner Required path から外す。
  - README の navigation でも受講者必修教材と Instructor / 運営向け支援資料を明確に分ける。
  - Validator の required-file existence contract は Learner Required path の意味へ読み替えない。
- README / Learning Design に、自己学習の標準境界を記載する。
  - Instructor / 運営は、環境・権限・端末・演習Repository / Training Copy・Toolchainを支援する担当として利用可能であることを運用前提とする。
  - 学習内容、演習判断、自己確認、学習上のRecovery、完了条件、評価観点は learner-facing material を正本とする。
  - 選択した specialization の learner-facing material にも同じ自己学習品質基準を適用するが、specialization の環境・実行・Evidence を Common Core completion に要求しない。
- PR 3 では Instructor Reference の最終的な内容仕分け・移行を行わない。Learner Required path の正本ではないことと、最終的に受講内容外支援だけへ限定する責務契約を README / Learning Design で正本化する。
- PR 3 では `03_instructor-reference.md` の冒頭 / Public Reference 相当だけを最小修正し、次の transition contract を明記する。
  - Instructor Reference は learner-facing learning SSOT ではなく、Learner Required completion や specialization completion の正本として使用しない。
  - 現在残る Facilitation / 判断 / Recovery / 評価観点は PR 4A で仕分け・移行する transitional content であり、新しい責務契約の例外として恒久維持しない。
  - PR 4A で必要な learner-facing 情報を移す前に、既存の学習情報を削除しない。
- 現行 `03_instructor-reference.md` の Facilitation / 判断 / Recovery / 評価観点の実仕分け・移行は PR 4A の Primary owner とする。
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

Lesson depth、Practice量、language / terminology、learning-unit completeness、Core / Extension / Reference、各Lessonのself-check / Recovery、Instructor Reference 内情報の実仕分け・移行は PR 4 に残す。Training workflow / runner の実装は PR 5 に残す。

### Candidate files

- `docs/adr/<next>-test-automation-curriculum-native-specialization.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`（transition noticeのみ）
- 上記4 Lesson / Capstone
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- TypeScript contract を変更した場合は `pnpm run typecheck`
- README / Learning Design / Rubric / Instructor Reference冒頭 / 対象Lesson の manual cross-check
- Part 1 Common=C01〜C07+C09〜C10 bounded Level 2 / Part 2 final Common=C01〜C07+C09〜C12 bounded Level 2 / C08=Native specialization の能力契約が README / Learning Design / Rubric / 対象Lessonで一意であることを manual cross-check
- Rubric の Part 1 / Part 2 修了基準が上記能力契約と一致し、Common completion に Native Flow / C08 Evidence を要求していないことを manual cross-check
- コース開始時の対象受講者像と、Common Core / specialization で利用できる既習知識ルールが README / Learning Design / Rubric / Lesson の説明深度と矛盾しないことを manual cross-check
- specialization / Extension / Reference を未受講でも後続 Common Core Lesson / completion が成立することを manual cross-check
- Part 1 / Part 2 の learner-facing navigation で specialization の skip / branch / rejoin を一意に辿れることを manual cross-check
- specialization の開始条件から必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionを一意に辿れることを manual cross-check
- Repository-required curriculum asset と Learner Required path がREADME / Learning Design / Validator説明で混同されていないことを manual cross-check
- Instructor Reference が Learner Required path / specialization の学習正本として案内されておらず、冒頭にPR 4Aまでのtransition contractが明記され、既存の学習内容を PR 4A の実仕分け前に削除していないことを manual cross-check

### Completion

- コース開始時の対象受講者像が一意で、Playwright等のコードベース自動化未経験・プログラミング非必須の前提が正本間で一致している。
- Part 1 Common completion が C01〜C07 と C09〜C10 の bounded Level 2、Part 2 完了 / 最終 Common graduation が C01〜C07 と C09〜C12 の bounded Level 2、C08がNative specializationとして正本間で一意である。
- Rubric の Part 1 / Part 2 修了基準が上記能力契約に一致し、Common completion に Native Flow / C08 Evidence を要求していない。
- Common Core の後続Lessonは、コース開始時プロフィールに Learner Required path 上でそれ以前に明示的に学んだ Common Core 内容だけを加えた状態を前提にし、specialization / Extension / Reference や教材外の暗黙知へ依存していない。
- specialization の開始に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionが learner-facing に一意である。
- Part 1 / Part 2 の Native specialization について、選択しないLearnerのskip先と、選択したLearnerのCommon Core rejoin pointが learner-facing navigation で一意である。
- Instructor / 運営が受講内容外の環境支援担当として利用可能であるという運用前提が README / Learning Design と一致している。
- 各 Competency の Minimum Evidence を Rubric から Learner 自身が確認できる。
- 外部評価を行う場合も同じ公開Rubric / Minimum Evidence / Artifact を使い、Required completion に非公開採点基準がない。
- Repository-required curriculum asset と Learner Required path が正本上区別され、`03_instructor-reference.md` がLearner Required pathではないことを受講者が判断できる。
- Instructor Reference を受講内容外支援assetへ限定する最終契約が README / Learning Design に正本化され、Instructor Reference本体にもPR 4Aまでのtransition noticeがあり、現行内容の実仕分け・移行が PR 4A の責務として明示されている。
- Native specialization と Product Native Gate が分離されている。
- Native実行なしでも Common Core completion が成立する。
- C08 completion は learner-authored change と successful runtime evidence の両方を要求する。
- PR 4 前でも Curriculum 正本間の Learner Required / specialization / self-study 境界が一致し、PR 4A で移行すべき Instructor Reference 情報を先行削除していない。
- Matrix で Primary owner が PR 3 の Finding を child Plan / PR の Evidence で対応・検証している。

## 16. PR 4 — Curriculum Core / Extension / Reference / Learning Experience

### Objective

PR 3 の評価契約を維持したまま、Learner Required path 全文、learner-facing specialization material、Repository-required support assetとの境界、`docs/spec/**` の Markdown / text contract を共通基準で監査し、Curriculum の Lesson 深度・学習単位・説明重複・用語・学習動線・self-study completeness を整理する。Instructor Reference 内の学習情報を learner-facing 正本へ仕分け・移行し、継続的な受講者視点レビューを運用できる最小チェックリストもここで整備する。Specification はtext contractの用語・表記・内部整合・semantic safetyをPR 4Aで監査し、全Product behaviorの実装適合監査は行わない。全audit対象のcoverageを確認し、実際に問題・判断対象が見つかった場合だけSpecification Findingを作成する。Pre-change auditで `PR 4B` Disposition の Finding が1件以上ある場合だけ、そのboundedなsemantics-preserving実変更をPR 4Bへ分離する。

### PR split rule

- `PR 4A`: Curriculum structure / learning flow / Core-Extension-Reference-specialization / learner-facing terminology / self-study completeness、Repository-required asset / Learner Required path境界、Instructor Reference 内情報の仕分け・移行、継続レビュー用チェックリスト、Learner Required path + learner-facing specialization material + `docs/spec/**` text contract のPre-change auditを担当する。
- `docs/spec/**` に `PR 4B` Disposition の Finding がなければ PR 4B は作らない。
- `PR 4B` は、`docs/spec/glossary.md` / `_templates/**` / canonical terminology との不整合、または learner / maintainer の読解・保守へ実害があり、Product behavior を変えず bounded に解消できる editorial Finding を対象とする。
- typo、punctuation、spacing等の軽微な editorial Finding は、それ単独ではPR 4Bを発生させない。PR 4Bで別理由により同一箇所を変更する場合だけ、周辺の局所cleanupとして併せて直してよい。
- Product behavior の意味変更、仕様判断、Specification 自体の曖昧さ・不足・複数解釈は PR 4B に含めず、`Specification clarification` の別 Issue / Plan へ送る。
- Normative Specification が明確なのに Current implementation が異なる Finding は PR 4B に含めず、`Product implementation deviation` の別 Issue / Plan へ送る。Specification を Observed Behavior に合わせて変更しない。
- bounded な editorial correction を超えて広範囲cleanupが必要になる場合は、PR 4Bへ膨張させず stop condition としてscopeを見直す。
- PR 4B は PR 4A merge 後の最新 `main` から branch を作る。
- 分割は semantic safety のためであり、新しい恒久的な管理レイヤーや Master Plan を追加しない。

### Pre-change audit

Learner Required path と learner-facing specialization material について、ファイル単位・内部 Lesson 単位で次を確認する。

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

Common Core について、specialization / Extension / Reference を未受講でも後続 Lesson の学習・Exercise・Completion が成立するかを確認する。途中に配置された Native specialization 等を後続 Common Core の隠れ prerequisite にせず、skip先と rejoin point が learner-facing navigation から一意に分かることも確認する。

specialization は選択後の learner-facing 学習経路として同じself-study基準で監査するが、specializationの環境・実行・EvidenceをCommon Core completionへ昇格させない。各specializationについて、開始前に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionがlearner-facingに明示されているかも確認する。

Repository-required support asset について次を確認する。

- Learner Required path と同じ必修教材として表示されていないか。
- Learner-facing learning contract が置かれていないか。
- Instructor Reference が受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援だけになっているか。
- Learner-facing正本との重複がある場合、支援文書側から正本を参照できるか。

`docs/spec/**` の Markdown / text contract 全件について次を確認する。

- learner / maintainer が読む一般語の日本語 / 英語混在と表記揺れ。
- `docs/spec/glossary.md` と各文書の用語差。
- `_templates/**` が新規Specへ古い表記揺れを再生成しないか。
- BR / AC / ID / path / code identifier / machine-consumed heading のcanonical form。
- Product behavior の意味を変えずにeditorial correctionできるか。
- Specification 自体の文面だけでは意味が曖昧・不足・複数解釈可能か、Product Decisionが必要か。
- typo / punctuation / spacing等の軽微なeditorial issueだけでPR 4Bを発生させようとしていないか。

Current implementationとの照合は、上記text auditの全項目へ一律に要求しない。editorial changeのsemantic equivalence確認、Learner Required / 選択したspecializationのExpected Behavior確認、または監査中に実際のSpec-vs-implementation不一致を発見した場合だけ、該当範囲を確認する。その確認でNormative Specificationが明確なのにCurrent implementationだけが異なる場合は`Product implementation deviation`として扱う。

Audit coverage と Finding 記録は分離する。

- Audit coverage: `docs/spec/**` の対象 Markdown / text contract 全件を確認したことが分かるように child Plan で対象範囲を列挙または既存の一覧へ対応付ける。
- Finding: 実際に問題、修正候補、clarification、implementation deviation 等の判断対象が見つかった場合だけ作成する。
- 問題がない file / heading に `no_change` Finding を作らない。
- Disposition は作成した Specification Finding すべてに必須とする。

Finding は child Plan 内に次の形式で記録する。

共通項目:

- ID
- file / heading
- current state
- problem
- impact

Curriculum Findingだけに追加する項目:

- severity (`P0` / `P1` / `P2` / `P3`)
- minimum fix
- related contract / validation
- `fix_now` / `defer` のDisposition

Specification Findingに追加する項目:

- `no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のDisposition
- Disposition理由
- `PR 4B` の場合だけ minimum bounded fix / validation

Specification Finding の Disposition は次で決める。

- `Specification clarification`: Normative Specification 自体が曖昧・不足している、複数解釈できる、または Product Decision が必要。
- `Product implementation deviation`: 必要な範囲の照合で Normative Specification は一意であるが Current implementation がその Product behavior と異なることを確認した。Specification は変更せず、Product修正の別 Issue / Planへ送る。
- `PR 4B`: canonical terminology / glossary / templateとの不整合、または読解・保守上の実害があり、semantics-preservingかつboundedに解消できる。
- `no_change`: 問題または判断対象として記録する価値はあるが、本 remediation では変更不要と判断した Finding。単に問題がない対象を表すためには使用しない。typo / punctuation / spacing等の軽微なeditorial issueだけを記録する場合も、変更しないなら `no_change` とし、別の`PR 4B`変更箇所の周辺cleanupとしてのみ修正してよい。

Curriculum P0 / P1 が未決の `Specification clarification` に依存する場合は、Expected Behaviorを実装やObserved Behaviorから推測して修正しない。関連Findingを相互に参照し、clarificationが解消するまで当該Curriculum P0 / P1をPR 4A completion blockerとして扱う。

`Product implementation deviation` が Learner Required completion、選択したspecialization completion、または本Plan DoDを実際に阻害する場合は、関連するCurriculum P0 / P1と相互参照し、Product側でdeviationが解消されるまで当該P0 / P1をPR 4A completion blockerとして維持する。Learner経路・DoDを阻害しないdeviationはProduct側follow-upへ分離し、PR 4A completionをブロックしない。

既存 Report と重複する Finding は新しい permanent report に複製せず、既存 Matrix ID を参照する。

Pre-change audit 完了時に §5.6 の `Terminology Decision Table` を確定し、PR 4A の用語変更はその表に従う。途中で新しい表記判断が必要になった場合は child Plan の表へ追記してから変更し、ファイルごとに場当たり的な判断をしない。

### Part 1 changes

- P1-1 / P1-2 を含む全 Learner Required Lesson で、内部 Lesson が独立学習単位として成立するか確認する。
  - 数行でも目的が明確な short reference なら残してよい。
  - 目的・説明・Practice・前後関係が弱く、単独で切る意味がなければ同一ファイル内で統合する。
  - 見出しを残すためだけの説明追加は禁止する。
- P1-3: 技法数 quota ではなく Risk に対する technique 選択を中心にする。
- P1-4: JavaScript / TypeScript bridge、Playwright concept、Locator / Assertion の初出説明を、コース開始時のPlaywright未経験・プログラミング非必須の対象受講者が理解できる深さへ調整する。Official term は必要に応じて日本語説明を添える。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution
- P1-6: meaningful failure diagnosis を Completion Evidence にする。
- P1-7: Native specialization 内の depth / navigation / Practice量を整理し、§5.9と同じself-study completenessを適用する。開始前に必要な Learner Required path 上の Common Core prerequisite / completionをlearner-facingに明示し、同一 specialization 内の前段で学んだ内容は既習として扱ってよい。未選択Learnerは P1-6 から P1-8 へ進み、選択Learnerも P1-7 完了後に P1-8 へ復帰する。Physical Android canonical path は残す。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善1件。
  - Native specialization 未選択でも、Playwright のみで学習・Exercise・Completion が成立する構成にする。Maestro / Native の比較・例は specialization 選択者向けの追加例として扱ってよいが、Common Core completion に要求しない。
  - Reference: POM / Helper / Fixture / Flow pattern catalog
  - Lifecycle / Regression inventory は Part 2 bridge へ寄せる
- P1-9: Web Core Capstoneを簡潔化し、Native specialization evidence と Baseline / learner-authored flow を分ける。
- Role / State / Seed / Reset の反復は Canonical Definition と Application Practice を区別する。
- RA-L1 は Phase 0 の確認結果に従う。
  - Learner Required navigation / completion に影響しなければ Legacy P1-10 は変更しない。
  - 影響があれば canonical completion と矛盾する箇所だけ最小修正する。

### Part 2 changes

- P2-1〜P2-8 についても内部 Lesson の成立性、前提知識、演習、自己確認、Recovery、完了条件を同じ基準で確認する。
- Part 2 の Common Core Lessonも、Native specialization未選択で学習・Exercise・Completionが成立することを維持する。
- P2-2: Branch / Diff / Commit を Core、exact SHA / copy mechanics を Reference。
- P2-3: 他人から実際のReviewを受けることを Learner Required completion にしない。既存 / 教材用DiffのReview、自分のPRのself-review、公開されたReview checklistでC11を自己確認できるようにする。Fork / Remote / Push の概念は Learner Required として学ぶが、演習Repository / Training Copy のProvisioning自体は Instructor / 運営が担当してよく、Learner自身による環境ProvisioningをCompletion条件にしない。Learnerは提供済みの演習Repositoryまたは自分のForkを使い、書き込み可能なRemoteへのPushとPR作成を学ぶ。
- P2-4: Trigger / Job / Failure / least privilege を Core、allowlist / parser / pin 詳細を Reference。
- P2-5: Web CI / Artifact / failure evidence を Core。
- P2-6: Native CI specialization 内の Repository 固有詳細を Reference へ寄せ、選択後のlearner-facing内容には§5.9と同じself-study completenessを適用する。必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionを開始条件として明示する。未選択Learnerは P2-5 から P2-7 へ進み、選択Learnerは P2-6 完了後に P2-7 へ復帰する。
- P2-7: Gate / Artifact / fail-closed を Core、vendor / production deployment detail を Advanced / Reference。
- P2-8: Web CI / Gate / Artifact / Failure reasoning を Common Capstone とし、Native / iOS / full CD を specialization / Advanced とする。Common Capstone は Native specialization 未受講でも成立させ、specialization側も選択後はlearner-facing教材だけで進行・自己確認できるようにする。

### Self-study changes

PR 4Aで Learner Required path と learner-facing specialization material 全体へ次を適用する。

- 各 Lesson / Exercise に、必要に応じて開始条件、自己確認、Recovery、完了条件、次の行動を learner-facing に明示する。
- Common Core Lesson の開始条件では、コース開始時プロフィールに加えて前提としてよい Learner Required path 上の先行 Common Core Lesson / completionだけを必要に応じて明示し、specialization / Extension / Reference や教材外の経験を暗黙前提にしない。
- specialization Lesson の開始条件では、必要な Learner Required path 上の Common Core prerequisite と同一 specialization 内の前提Lesson / completionを明示する。
- 途中配置の specialization には、選択しない場合のskip先と、選択後に Common Core へ戻る rejoin point を learner-facing に明示する。
- Self-check は Learner が自分の回答・成果物の充足を合理的に判定できる具体性を必須とする。単なるReferenceリンクだけでは不十分な場合、該当する評価条件・BR / AC・確認観点まで特定する。
- 確認問題は、回答例と理由、または正答に最低限含むべき具体的チェックポイントで Learner が自分の理解を検証できるようにする。
- 設計問題・Trade-off問題は一意の模範解答を作らず、最低限考慮すべき観点と許容される判断理由の条件を示す。
- Specification参照による自己確認は、該当するBR / AC / sectionを特定する。
- command / test / validator / artifact で機械確認できるものは、Learner が成功・失敗・Environment blockを区別できる確認方法を示す。
- `03_instructor-reference.md` に存在する受講内容・問い・判断観点・Recovery・評価基準を全件仕分けし、Learner Required completion または specialization completion に必要なものは README / Learning Design / Rubric / 対象Lesson の適切な正本へ移してから Instructor Reference 側を削除または正本参照へ置き換える。受講内容外の環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain支援だけを Instructor Reference に残す。
- `講師に確認する`、`レビューしてもらう`、`答え合わせしてもらう` ことを Learner Required completion または specialization completion にしない。
- 環境・権限・端末・演習Repository提供を Instructor / 運営に依存することは運用前提として許容し、受領後の確認手順と学習再開条件は learner-facing にする。
- specialization の環境・実行・Evidence を Common Core completion に要求しない。

### Continuous learner review checklist

PR 4A で `docs/reference/curriculum-self-study-review.md` を追加し、継続的な受講者視点レビューで再利用するチェックリストを定義する。

このファイルは reviewer / maintainer 向けの運用資料であり、Learner Required path には含めない。保存するのは再利用する確認観点だけとし、個別レビュー結果やレビュー履歴は保存しない。新 LMS、DB、採点基盤、レビュー結果の恒久台帳は作らない。

最低限、次の項目を確認できるチェックリストとする。

| 項目 | 確認内容 |
| --- | --- |
| Lesson / Exercise | Learner Required または選択したspecializationの対象教材・演習 |
| 開始条件 | Learnerが開始可能か、必要な環境受領条件と正規の前提Lesson / completionが分かるか |
| 学習内容の自己完結 | 教材外の口頭説明なしで理解できるか |
| Common Core独立性 | specialization / Extension / Referenceを未受講でもCommon Coreが進行・完了できるか |
| 分岐 / 復帰 | 途中specializationのskip先、選択時のbranch、完了後のrejoin pointが分かるか |
| 演習内容 | 何を作る・実行する・記録するか明確か |
| 自己確認 | 回答・成果物の充足をLearner自身で判断できるか |
| Recovery | 学習上の失敗と環境障害を切り分け、次の確認が分かるか |
| 完了条件 | どこまでできれば完了か判断できるか |
| 次の行動 | 次に読む・実施する内容が分かるか |
| 学習内容の追加支援 | 教材外の説明・答え合わせが必要になる構造がないか |
| 環境 / Toolchain支援 | 環境側の支援として切り分けるべき条件が明確か |
| 問題発見時の扱い | 問題を見つけたらその場で具体的な修正指示へ落とし込み、個別レビューのFinding・備考・未検証理由・補足Evidenceをこのチェックリストへ記録しない |

このチェックリストは Yes / No、コメント、Finding、備考、未検証理由、Evidence 等の個別レビュー結果を書き込むテンプレートにはしない。

レビュー時は §5.10 のコース開始時対象受講者像と、対象経路で正規に前提としてよい学習済み内容だけを基準にする。Common Coreレビューではspecialization / Extension / Referenceの知識で教材不足を補完せず、specializationレビューでは明示されたLearner Required path上のCommon Core prerequisiteと同一specialization内の前段知識だけを利用する。経験者の教材外知識・暗黙知で教材不足を補完しない。

### Language / terminology changes

PR 4Aで次を行う。

- Learner-facing な一般説明は日本語中心へ統一する。
- Tool / Product / API / command / path / identifier は公式表記を維持する。
- `Expected Behavior`、`Learning Goal`、`Failure Analysis` など一般概念は、周辺文脈と役割を確認した上で日本語へ統一する。
- `Locator`、`Fixture` など公式用語を残す場合、初出で必要な日本語説明を付ける。
- 同一文書内・Learner Required path・learner-facing specialization material 全体で表記を揃える。
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
- Product behavior の解釈が変わり得る文言、複数解釈がある仕様は `Specification clarification` とし、editorial fix に含めない。
- 必要な範囲の照合で Normative Specification が明確なのに Current implementation が異なる場合は `Product implementation deviation` とし、Specificationを実装へ合わせない。
- typo / punctuation / spacing等の軽微なeditorial Findingは、それ単独ではPR 4Bへ含めない。別の`PR 4B` Findingで同一箇所を変更する場合だけ周辺cleanupとして修正する。
- machine-consumed heading / parser contract を変更する場合は `validate:spec` / contract test と同一変更で扱う。不要なら見出しは維持する。
- `PR 4B` Disposition が広範囲に及びboundedなeditorial correctionを超える場合は実装を止め、scopeを再検討する。

### Required / Optional / Legacy discoverability

- `09_part1-capstone.md` が canonical Learner Required であることを navigation 上明確にする。
- Native specialization がCommon Core completionではない一方、選択したLearnerには正規のlearner-facing学習経路であることをnavigation上明確にする。
- Native specialization の Part 1 / Part 2 branch / skip / rejoin が README / Learning Design / 対象Lesson の navigation で一意である。
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
- `docs/spec/**` の Markdown / text contract（text / semantic auditのみ。実変更と全Product behaviorのimplementation conformance auditは禁止）
- 必要な場合のみ curriculum validator / contract test

PR 4B が必要な場合:

- Pre-change auditで `PR 4B` Disposition と判定した `docs/spec/**` Markdown / text contract
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
- Part 1 Common=C01〜C07+C09〜C10 bounded Level 2 / Part 2 final Common=C01〜C07+C09〜C12 bounded Level 2 / C08=Native specialization の能力契約がPR 3から維持されていることの manual cross-check
- コース開始時の対象受講者像、Common Core / specialization の既習知識ルール、Lessonの前提知識・説明深度の manual cross-check
- specialization / Extension / Reference 未受講でも後続 Common Core の internal link / command / path / Exercise / Completion が成立することの manual cross-check
- Part 1 / Part 2 の specialization skip / branch / rejoin が learner-facing navigation から一意に辿れることの manual cross-check
- specialization の開始条件から必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionを一意に辿れることの manual cross-check
- Workbook / validator / ID grammar の manual cross-check
- Learner Required path と learner-facing specialization material の internal link / command / path / next-action walkthrough
- Learner Required Lesson と specialization learner-facing Lesson の self-check / Recovery / Completion が learner-facing に存在し、Instructor-only情報を必須にしていないことの manual cross-check
- specialization の環境・実行・Evidence が Common Core completion に混入していないことの manual cross-check
- Instructor Reference が受講内容外の支援だけになり、必要な学習情報を learner-facing 正本へ移してから削除・参照化していることの manual cross-check
- Self-check が単なる generic Reference 提示ではなく、該当する評価条件・回答要素・BR / AC・確認観点まで特定できることを manual cross-check
- `docs/reference/curriculum-self-study-review.md` が §18 の継続レビュー契約と一致し、個別レビュー結果を書き込む欄を持っていないことを manual cross-check
- Terminology Decision Table と実際の learner-facing curriculum 表記の manual cross-check
- `docs/spec/**` text audit の全対象がcoverageされていることを確認する。問題がない対象へ人工的なFindingを作る必要はない。
- 実際に発生した全Specification Findingに `no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のDispositionがあることを確認する。
- Spec auditがtext contractの用語・表記・内部整合・semantic safetyに限定され、全Product behaviorのCurrent implementation適合監査へ拡張していないことを確認する。
- Curriculum Finding が §5.8 に従って severity と `fix_now` / `defer` に分類され、`fix_now` が実差分で解消されていることを確認する。
- `defer` とした Curriculum P2 が Goal / Fixed decisions / Definition of Done の成立を妨げないことを確認する。
- Specification Finding が severity を持たず、本Sectionの境界に従って `no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` に分類され、軽微なeditorial Findingだけで `PR 4B` を発生させていないことを確認する。
- `Specification clarification` が必要な Curriculum P0 / P1 を推測修正または解消扱いにしていないことを確認する。
- Learner Required completion / 選択したspecialization completion / 本Plan DoDを阻害する `Product implementation deviation` に依存する Curriculum P0 / P1 を、Product側解消前に解消扱いにしていないことを確認する。阻害しないdeviationはPR 4A blockerにしていないことも確認する。
- `Product implementation deviation` で Normative Specification を Current implementation に合わせて変更していないことを確認する。
- PR 4A diff に `docs/spec/**` の実変更が含まれていないことを確認する。

PR 4B がある場合:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- BR / AC / Oracle meaning の manual semantic-equivalence cross-check
- `docs/spec/glossary.md` / `_templates/**` / changed spec の用語整合を確認する。
- Curriculum 参照元との link / terminology cross-check
- PR 4B diff が `PR 4B` Disposition のboundedなeditorial Findingと、その同一変更箇所周辺の局所的な軽微editorial cleanupだけであることを確認する。

### Completion

- Core / Extension / Reference / specialization が PR 3 の評価契約と一致する。
- Part 1 Common completion が C01〜C07 と C09〜C10 の bounded Level 2、Part 2 完了 / 最終 Common graduation が C01〜C07 と C09〜C12 の bounded Level 2、C08がNative specializationとして維持されている。
- PR 3 の Learner Required / specialization 境界を変更していない。
- Repository-required curriculum asset と Learner Required path が navigation / validator contract 上混同されていない。
- コース開始時の対象受講者像と Common Core / specialization の既習知識ルールが learner-facing material の前提知識・説明深度と一致している。
- specialization / Extension / Reference を未受講でも後続 Common Core Lesson / Exercise / Completion が成立する。
- Part 1 / Part 2 の Native specialization の skip / branch / rejoin が learner-facing navigation から一意に辿れる。
- specialization の開始に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionが learner-facing に一意である。
- トップレベル教材ファイル数と大順序を維持している。
- 内部 Lesson は独立した学習単位として成立するか、同一ファイル内で適切に統合されている。
- 内容の薄い Lesson を文章の水増しで維持していない。
- Learner Required Lesson と learner-facing specialization Lesson の学習目標・説明・Practice / Exercise・Self-check・Recovery・Completion Evidence・Next action の接続を確認している。
- Learner Required learning content と specialization learner-facing learning content の理解・演習・自己確認・完了判定が Instructor の追加説明に依存していない。
- specialization の環境・実行・Evidence を Common Core completion に要求していない。
- Instructor Reference の受講内容・学習上の判断・Recovery・評価基準を learner-facing 正本へ必要に応じて移したうえで、Instructor Reference が受講内容外支援だけへ限定されている。
- Self-check がLearner自身で学習目標の充足を合理的に判定できる具体性を持ち、generic Referenceだけに逃げていない。
- Pre-change audit で確認した Curriculum P0 / P1 を解消している。未決の `Specification clarification` に依存するP0 / P1がある場合は解消扱いにせず、clarification解消までPR 4A completion blockerとして残している。Learner Required completion / 選択したspecialization completion / 本Plan DoDを実際に阻害する `Product implementation deviation` に依存するP0 / P1もProduct側解消までblockerとして残し、阻害しないdeviationはfollow-upへ分離している。
- Curriculum P2 / P3 は §5.8 の境界に従って `fix_now` / `defer` を明示し、`fix_now` だけをboundedに解消している。`defer`したP2がGoal / Fixed decisions / DoDの成立を妨げていない。
- `docs/spec/**` の全 Markdown / text contract がaudit coverageに含まれ、実際に発生したSpecification Findingだけが記録され、その全FindingにDispositionがある。問題のない対象へ人工的な `no_change` Findingを作っていない。
- Specification Findingには Curriculum severity を付けず、`no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のDispositionと必要な理由・bounded fixだけを記録している。
- 明確な Normative Specification と Current implementation の差は、必要な範囲の照合で発見した場合に `Product implementation deviation` として分離し、SpecificationをObserved Behaviorへ寄せていない。
- `docs/spec/**` 全text contractの用語・表記・内部整合・semantic safetyを監査しつつ、全Product behaviorのimplementation conformance auditへscopeを広げていない。
- 継続的な受講者視点レビューの再利用可能なチェックリストが `docs/reference/curriculum-self-study-review.md` に定義され、個別レビュー結果を書き込むテンプレートになっていない。
- 個別レビュー結果やレビュー履歴の保存要件を追加していない。
- Learner-facing 一般用語の日本語 / 英語混在が整理され、英語を残す基準が Terminology Decision Table と一致している。
- 将来の再発防止に必要な最小の用語・言語ルールが既存 Curriculum 正本へ残っている。
- `PR 4B` Disposition の Finding がある場合だけ PR 4B を作成し、軽微なeditorial Findingだけを理由にPR 4Bを発生させていない。
- PR 4Bを実施した場合、`docs/spec/glossary.md` / 必要なtemplate / changed specが同じ用語ルールに整合し、boundedなsemantics-preserving editorial correctionに限定されている。
- Normative Specification の Product behavior を editorial cleanup で変更していない。
- Learner Required / specialization / Optional / Reference / Legacy / Instructor support の境界が初見で判断できる。
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
- 受講者視点レビュー用チェックリストの実行・Evidence観点がTraining入口と一致することを manual cross-checkする。

### Completion

- Baseline と learner exercise を別commandで実行できる。
- 機械確認できる Learner Required Exercise と specialization exercise は Learner が command result / Artifact / validator から自己確認できる。
- C08 completion は learner-authored diff + successful Maestro artifact の両方を要求する。
- Training Native workflow は specialization opt-in である。
- Web / Common Core learner PR に Native runtime を無条件要求しない。
- Product Required Formal Gate に learner exercise が入っていない。
- PR 4 stage で定義した Learner-facing command / path / completion wording と実行入口が一致する。
- 受講者視点レビュー用チェックリストがCurrent Training command / Artifact / Environment blockの確認方法と一致する。
- 新しい scoring engine / learner-state DB / AI grader を追加していない。
- Matrix で Primary owner が PR 5 の Finding を child Plan / PR の Evidence で対応・検証し、RA-G5 は根拠付きで `fix` / `defer` / `reject` を確定している。

## 18. 継続的な受講者視点レビュー

### Purpose

受講者視点レビューは、教材を一度だけ合格させる最終Gateではなく、運用中に繰り返して自己学習品質を改善するための継続タスクとする。

本 Master Plan では、レビューを実施できる対象受講者像、観点、チェックリストを整備するところまでを完了条件とする。実際のレビュー実施、レビュー回数、レビュー結果の `PASS`、すべての改善Findingの解消は本 Master Plan の完了条件に含めない。

レビューは次の2区分を持つ。

- `初見`: 対象教材の学習・レビュー経験がない受講者視点で実施する。
- `再レビュー`: 教材修正後などに、過去に同教材を見た人を含めて再確認する。

初見受講者を毎回確保することはRequiredとしない。どちらの区分でも、対象受講者像を超える知識で教材不足を補完しない。レビュー区分自体を履歴として保存する必要はない。

### Target learner profile / prerequisite

レビューは §5.10 のコース開始時対象受講者像を起点とする。

- コース開始時は、テスト自動化の目的・基本概念を理解している。
- コース開始時は、ノーコード / ローコードのテスト自動化ツールについて、操作経験または概要理解がある。
- コース開始時は Playwright 等のコードベース自動化ツールは未経験である。
- コース開始時のプログラミング経験を前提にしない。
- Common Core Lesson のレビューでは、Learner Required path 上でそれ以前に明示的に学んだ Common Core の Playwright / TypeScript / Git / CI 等だけを既習として扱ってよい。specialization / Extension / Reference の知識で不足を補完しない。
- specialization のレビューでは、明示された Learner Required path 上の Common Core prerequisite と同一 specialization 内の必須前段Lessonで学んだ内容だけを既習として扱ってよい。
- その時点までに未説明の Git / GitHub / CI / Maestro 等の知識は補完しない。
- Repository固有の知識や過去の教材修正経緯、教材外の実務経験を前提にしない。ただし再レビューでは過去の確認経験自体は許容し、教材に書かれていない内容をその記憶で補完しない。

### Instructor / 運営支援の境界

レビュー中も、Instructor / 運営は次の受講内容外支援を担当する前提とする。

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

`docs/reference/curriculum-self-study-review.md` のチェックリストを使い、各 Learner Required Lesson / Exercise と、選択した specialization の learner-facing Lesson / Exercise を確認する。specializationを選択していないLearnerにNative等の実行を要求しない。

最低限、次を確認する。

- 開始条件と、対象経路で前提としてよいLesson / completionが分かる。
- Common Coreでは specialization / Extension / Reference 未受講でも進められる。
- 途中 specialization を選択しない場合のskip先と、選択した場合のCommon Coreへのrejoin pointが分かる。
- 教材だけで学習内容を理解できる。
- 何を作る・実行する・記録するか分かる。
- Self-checkが具体的で、自分の回答・成果物の充足を判断できる。
- 学習上の失敗とEnvironment / Toolchain障害を切り分けられる。
- 学習上のRecoveryが教材にある。
- 完了条件が分かる。
- 次のLesson / Exerciseが分かる。
- Instructor Referenceを読まないと受講内容を理解できない箇所がない。
- 対象経路で未説明のPlaywright / TypeScript / Git / CI / Maestro等の知識を当然の前提にしていない。

このチェックリストは確認観点の再利用だけを目的とし、レビューごとの Yes / No、コメント、Finding、備考、未検証理由、Evidence を書き込む結果記録フォームとして使わない。

### Review handling

レビュー結果そのものは保存・履歴管理しない。レビュー中は最低限、次を区別して確認する。

- 問題なし
- 教材改善Findingあり
- Environment / Toolchain理由で未検証

教材改善Findingが見つかった場合は、その都度具体的な修正指示へ落とし込み、必要な変更単位で対応する。レビュー結果を保存するためだけのIssue、Report、Plan、台帳は作らない。

Environment / Toolchain理由で未検証の場合は教材不備と即断せず、環境準備後に必要に応じて再確認する。未検証を「問題なし」とみなさないが、未検証結果自体を文書へ保存する必要はない。

### Continuous task

Repository remediation 完了後、次を継続タスクとして扱う。

- 対象受講者像に近い初見受講者が利用できる場合は初見レビューを行う。
- 教材修正後などは、必要に応じて同一または別のレビュアーで再レビューする。
- Curriculumの大きな変更、Lesson追加、Training command / Toolchain変更後は必要に応じてレビューする。
- Common Coreだけでなく、実際に利用するspecializationのlearner-facing教材も必要に応じてレビューする。
- Pilotや実受講で繰り返し質問・停止が発生したLessonは優先して再レビューする。
- レビューで見つかった改善は、その都度具体的な修正指示へ落とし込み、必要な変更単位で対応する。本 Master Planは再オープンしない。

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

本 Master Plan の完了確認では、実際の受講者視点レビューを必須実行しない。次の準備状態だけを確認する。

- §5.10 のコース開始時対象受講者像と Common Core / specialization の既習知識ルールが README / Learning Design と一致する。
- Part 1 Common completion が C01〜C07 と C09〜C10 の bounded Level 2、Part 2 完了 / 最終 Common graduation が C01〜C07 と C09〜C12 の bounded Level 2、C08がNative specializationとして README / Learning Design / Rubric で一致する。
- specialization / Extension / Reference 未受講でも後続 Common Core の学習・Exercise・Completion が成立する。
- Part 1 / Part 2 の specialization skip / branch / rejoin が learner-facing navigation に明示されている。
- specialization の開始に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionが learner-facing に明示されている。
- Instructor / 運営が受講内容外の環境支援担当として利用可能であるという運用前提が README / Learning Design と一致する。
- Instructor Reference が受講内容外の支援へ限定されている。
- `docs/reference/curriculum-self-study-review.md` に §16 / §18 のチェック項目が定義され、個別レビュー結果を書き込む欄を持っていない。
- チェックリストが Learner Required path と learner-facing specialization material、self-check、Recovery、Environment / Toolchain支援の境界を確認できる。
- specialization の環境・実行・Evidence を Common Core completion に要求していない。
- PR 5 のTraining command / Artifact / Environment block確認方法とチェックリストが矛盾しない。
- 個別レビュー結果やレビュー履歴の保存を要求していない。

実際の受講者視点レビューは §18 の継続タスクとして実施する。

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
- PR 3 の Required boundary 修正が対象4 Lesson / Capstoneの最小 wording変更と Instructor Reference冒頭のtransition noticeを超えて構造変更を必要とする。
- PR 4 の教材改善がトップレベル Curriculum 全面再設計を必要とする。
- Goal / Fixed decisions / Definition of Done の成立に必要な Curriculum P2 が bounded なPR 4A差分に収まらない。この場合は `defer` して完了扱いにせず、PR 4 child Plan のscopeを見直す。
- Curriculum P0 / P1 の正しい修正が未決の `Specification clarification` に依存する。この場合は Expected Behavior を Current implementation / UI / test から推測せず、clarification 解消まで PR 4A completion blocker として維持する。
- Normative Specification が明確なのに Current implementation が異なる場合は、Specification を実装へ寄せず `Product implementation deviation` として別 Issue / Plan へ分離する。そのdeviationがLearner Required completion、選択したspecialization completion、または本Plan DoDを阻害する場合だけ、関連Curriculum P0 / P1をProduct側解消までcompletion blockerとして維持する。阻害しないdeviationはfollow-upとし、本Planを止めない。
- Spec auditで全Product behaviorをCurrent implementationと総当たり照合する必要があるように見える。この場合はtext contractの用語・表記・semantic safety監査へ戻し、必要な局所照合だけに限定する。
- Spec audit coverageを示すために問題のない全file / headingへ `no_change` Findingを作ろうとする。この場合はcoverage一覧と実Finding記録を分離する。
- PR 4A のSpec auditで `PR 4B` Dispositionが発生した場合は、PR 4Aへ実変更を混ぜずPR 4Bへ分離する。
- PR 4B の対象がboundedなsemantics-preserving editorial correctionを超えて広範囲cleanupになる。この場合はPR 4Bを拡大せずscopeを見直す。
- PR 4B でも Product behavior の意味を変えないと解消できない。この場合は Specification clarification へ分離する。
- Lesson の不足を埋めるために、目的不明の大量説明追加が必要になる。
- 自己学習化のために Instructor / 運営の環境準備・権限・端末・Toolchain支援までRepositoryだけで自動化する必要があるように見える。この場合は学習内容と環境運用の境界を再確認する。
- specialization の自己学習品質を理由に Native環境・Runtime Evidence を Common Core completion へ昇格させる必要があるように見える。この場合は Required / specialization 境界へ戻る。
- 後続 Common Core の自己学習品質を理由に specialization / Extension / Reference を必須前提へ昇格させる必要があるように見える。この場合は Common Core の独立性を維持する。
- Native specialization の optional 化を理由にトップレベルファイルを移動・renumberする必要があるように見える。この場合は既存配置を維持し、learner-facing branch / skip / rejoin navigation で解決する。
- Native分岐周辺の局所navigationをCommon Core全体の能力・教材範囲として扱おうとする。この場合はPart 1 / Part 2の能力契約とLearner Required pathへ戻る。
- Part 1 Common completionへC11 / C12またはC08を要求したり、Part 2 Common completionへC08を要求したりする場合は、§3 / §15 のPart単位能力契約へ戻る。
- 後続Lessonの自己学習品質を理由に、前段で既に学んだPlaywright / TypeScript / Git / CI等を毎回再説明する必要があるように見える。この場合は§5.3 / §5.10の既習知識ルールへ戻る。
- Specification Findingへ Curriculum P0〜P3 severityを付けて PR 4A blocker と誤解しそうになる。この場合は§5.8と§16の責務分離へ戻る。
- 自己確認のために設計判断・自由記述を全件自動採点する新しい scoring engine / AI grader が必要になる。この場合はRubric /回答例/観点による自己確認を優先する。
- P2 / P3 Finding の全件修正を理由に PR 4A のscopeが拡大する。この場合は §5.8 の `fix_now` / `defer` 境界へ戻す。
- 受講者視点レビュー結果を本 Master Plan の完了条件へ戻そうとする。この場合は §18 の「継続タスク」と本Plan DoDの境界を維持する。
- 受講者視点レビュー結果の保存・履歴管理のためだけに新しいIssue / Report / Plan /台帳を作ろうとする。この場合はレビュー結果非保存の方針を維持する。
- 継続レビュー用チェックリストへ Yes / No、コメント、Finding、備考、未検証理由、Evidence 等の個別結果入力欄を追加しようとする。この場合は確認観点だけを保存する契約へ戻る。
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
- PR 4B の要否: `docs/spec/**` text audit で実際に発生したSpecification Findingのうち `PR 4B` Disposition が1件以上ある場合だけ作成する。typo / punctuation / spacing等の軽微なeditorial Findingだけでは作成しない。
- Normative Specification の editorial change 可否: semantic equivalence を確認できない場合は変更しない。
- Phase 6 candidate ごとの consumer / dependency / reference の具体的取得方法: 既存 code search / Git history / tests で確認し、新しい常設解析基盤は作らない。

## 23. Follow-up notes

Repository remediation 完了後、次を継続タスクとして扱う。

### 受講者視点レビュー

- `docs/reference/curriculum-self-study-review.md` のチェックリストを使って継続的にレビューする。
- 初見受講者を利用できる場合は初見レビューを行う。
- 教材変更後などは必要に応じて再レビューを行い、同一レビュアーの再利用も許容する。
- Curriculumの大きな変更、Lesson追加、Training command / Toolchain変更後は必要に応じて再実施する。
- Common Coreと、実際に利用するspecializationのlearner-facing教材を対象にする。
- Pilot / 実受講で繰り返し停止・質問が発生したLessonを優先する。
- 個別レビュー結果は保存しない。
- 改善が見つかった場合はその都度具体的な修正指示へ落とし込み、必要な変更単位で対応する。本 Master Planを再オープンしない。
- 固定の回数・周期・PASS義務は設けない。

必要に応じて Pilot で次を確認する。

- completion time
- instructor / 運営 support count / category
- environment / toolchain support と learning-content support の内訳
- environment block
- re-submission reason
- competency ごとの失敗傾向
- Native specialization 選択率 / environment failure
- Learner が停止した Lesson / reason
- 用語・指示・Expected Behavior の誤解が発生した箇所

Learner Required pathまたは選択したspecializationのlearner-facing materialで learning-content support が繰り返し必要になる箇所は、Instructorの支援実績として許容するだけでなく、self-study品質の追加Findingとして扱う。環境・Toolchain support は別カテゴリとして評価する。

Normative Specification の監査で Specification 自体の曖昧さ・不足・Product Decision が必要と判定した Finding は、Curriculum editorial cleanup に混ぜず、`Specification clarification` の別 Issue / Plan として扱う。

必要な範囲の照合で Normative Specification が明確なのに Current implementation が異なる Finding は、Specification を変更せず `Product implementation deviation` の別 Issue / Plan として扱う。Learner Required completion、選択したspecialization completion、本Plan DoDを阻害しない限り、本Planの完了はブロックしない。

実測値がない状態で Required Duration や専用管理システムを作らない。

## 24. Definition of Done

- Master Plan publication PR が `main` に merge 済みで、RA-M7 が解消されている。
- Phase 0 で Current `main` 基準の Finding 存否と owner 妥当性を再確認し、必要な scope 調整を該当 child Plan に反映している。
- PR 1 の Current Documentation / SSOT drift と RA-M8 Test Case ID grammar mismatch が解消されている。
- Test Case ID grammar の learner-facing canonical explanation と validator executable contract が一意に整合している。
- PR 2 の Formal Test Strategy / Traceability が Current Formal Suite と一致している。
- PR 3 の Common Core / Native specialization / Competency / Minimum Evidence 契約が一意である。
- Part 1 Common completion が C01〜C07 と C09〜C10 の bounded Level 2、Part 2 完了 / 最終 Common graduation が C01〜C07 と C09〜C12 の bounded Level 2、C08がNative specializationとして README / Learning Design / Rubric で一意である。
- Rubric の Part 1 / Part 2 修了基準が上記能力契約に一致し、Common completion に Native Flow / C08 Evidence を要求していない。
- コース開始時の対象受講者像が README / Learning Design に明記され、テスト自動化の基本理解 + ノーコード / ローコード経験または理解、Playwright等コードベース自動化未経験、プログラミング非必須という前提が一意である。
- Common Core の後続Lessonでは、コース開始時プロフィールに Learner Required path 上でそれ以前に明示的に学んだ Common Core 内容だけを加えた状態を前提にでき、specialization / Extension / Reference や教材外の実務経験・暗黙知へ依存していない。
- specialization / Extension / Reference を未受講でも Common Core completion が成立する。
- Part 1 / Part 2 の Native specialization の skip / branch / rejoin が learner-facing navigation で一意であり、分岐周辺の局所経路をCommon Core全体の定義として扱っていない。
- specialization の開始に必要な Learner Required path 上の Common Core prerequisite と specialization 内の前提Lesson / completionが learner-facing に明示されている。
- Instructor / 運営が環境・アカウント・権限・端末・Repository / Training Copy・Infrastructure / Toolchain等の受講内容外支援担当として利用可能であるという運用前提が README / Learning Design に明記されている。
- PR 3 で Repository-required curriculum asset と Learner Required path が一意に区別され、Instructor Reference がLearner Required pathではないことをREADME / Learning Designから判断できる。
- PR 3 で Instructor Reference を受講内容外支援assetへ限定する責務契約が正本化され、Instructor Reference本体にPR 4Aまでのtransition noticeがあり、現行Instructor Reference内情報の実仕分け・移行をPR 4Aへ残している。
- Learner self-check / assessment criteria が learner-facing material にあり、Instructor-onlyの説明・評価基準へ依存していない。
- PR 4A で Learner Required path 全文、learner-facing specialization material、Repository-required support assetとの境界、`docs/spec/**` Markdown / text contract 全件を共通基準で監査している。
- PR 4A のSpec監査は全対象のaudit coverageを確認し、実際に発生したSpecification Findingだけを記録し、その全FindingのDispositionを確定している。問題のない対象へ人工的な `no_change` Findingを作っていない。
- PR 4A のSpec監査はtext contractの用語・表記・内部整合・semantic safetyに限定され、全Product behaviorのCurrent implementation適合監査へ拡張していない。
- PR 4A で Instructor Reference 内の受講内容・判断・Recovery・評価観点を仕分けし、Learner Required completionまたはspecialization completionに必要な情報を learner-facing 正本へ移したうえで、Instructor Reference を受講内容外支援だけへ限定している。
- PR 4A の Pre-change audit で確認した Curriculum P0 / P1 Finding を解消している。未決の `Specification clarification` に依存する P0 / P1 がある場合は推測修正せず、clarification 解消まで PR 4A completion blocker として扱っている。Learner Required completion / 選択したspecialization completion / 本Plan DoDを阻害する `Product implementation deviation` に依存するP0 / P1もProduct側解消までblockerとして扱い、阻害しないdeviationはfollow-upへ分離している。
- PR 4A の Curriculum P2 は本 Master Plan の目的へ直接関係し bounded に修正できるものだけ `fix_now` として解消し、その他は `defer` として child Plan で明示している。Goal / Fixed decisions / DoD の成立に必要なP2は規模だけを理由にdeferしていない。P3 は変更箇所周辺の局所修正だけを `fix_now` とし、全件一括修正を要求していない。
- Specification Findingには Curriculum P0〜P3 severityを付けず、`no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のDispositionで扱っている。
- 必要な範囲の照合で確認した明確な Normative Specification と Current implementation の差を `Product implementation deviation` として分離し、Observed Behaviorへ合わせてSpecificationを変更していない。
- Learner Required path と learner-facing specialization material の学習目標・説明・演習・自己確認・学習上のRecovery・完了条件・次の行動が learner-facing material でつながっている。
- Learner Required learning content と specialization learner-facing learning content が Instructor の追加説明や非公開Answer Keyに依存していない。
- specialization の環境・実行・Evidence を Common Core completion に要求していない。
- Self-check がLearner自身で学習目標の充足を合理的に判定できる具体性を持ち、単なるgeneric Reference提示で完了扱いしていない。
- PR 4 child Plan の Terminology Decision Table と learner-facing curriculum の表記が一致している。
- 将来の再発防止に必要な最小の言語・用語ルールが既存 Curriculum 正本へ反映されている。
- `PR 4B` Disposition の Finding がある場合だけ PR 4B を PR 4A merge 後の最新 `main` から実施し、boundedなsemantics-preserving editorial correctionに限定している。軽微なeditorial Findingだけを理由にPR 4Bを作成していない。
- PR 4B を実施した場合は `docs/spec/glossary.md` / 必要なtemplate / changed specを整合させている。
- PR 4 の Core / Extension / Reference / specialization が PR 3 の評価契約と一致している。
- Learner-facing Curriculum の内部 Lesson が独立した学習単位として成立するか、同一ファイル内で適切に統合されている。
- Learner-facing 一般用語の日本語 / 英語混在と表記揺れが、定義した基準に従って整理されている。
- Normative Specification の editorial review で Product behavior を変更していない。
- `docs/reference/curriculum-self-study-review.md` に、継続的な受講者視点レビューのコース開始時対象受講者像、Common Core / specialization の既習知識境界、branch / skip / rejoin、Learner Required / specializationの対象範囲、チェックリスト、Instructor / 運営支援境界が定義されている。
- `docs/reference/curriculum-self-study-review.md` は確認観点だけを保存し、Yes / No、コメント、Finding、備考、未検証理由、Evidence等の個別レビュー結果を書き込むテンプレートになっていない。
- 個別の受講者視点レビュー結果やレビュー履歴を保存する要件を設けていない。
- PR 5 の Baseline / Exercise / Artifact / Completion Evidence と Native specialization workflow が一意である。
- 機械確認できる Learner Required Exercise と specialization exercise は Learner が command / validator / Artifact から自己確認できる。
- 受講者視点レビュー用チェックリストのcommand / Artifact / Environment block観点がCurrent Training入口と一致している。
- 受講者視点レビューの実施・PASS・所定回数の完了を、本 Master Plan のDoDに含めていない。
- 受講者視点レビューをRepository remediation後の継続タスクとして実施する方針が明記されている。
- Product Formal Native Regression / Android Runtime / iOS Build-only Gate が維持されている。
- Repository Audit §4.1〜§4.16 の全 candidate が Phase 6 durable report で分類されている。
- `refactor_now` 以外を不要に実装タスクへ変換していない。
- Master Plan を live progress tracker として運用していない。
- 新 LMS / DB / Test Management / third traceability SSOT / permanent call graph / automated grading framework を追加していない。
