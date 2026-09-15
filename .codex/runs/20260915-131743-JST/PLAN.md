# Plan（計画）

## Objective（目的）

PR #151の最終レビュー指摘を、PR #146の文章品質ゲートを先行混入させずに修正する。人間向け文章の意味・文体は`docs/WRITING_STANDARDS.md`で整合させ、決定論的な文字品質gateとは責務を分離する。

## Scope（対象範囲）

### In

- `docs/WRITING_STANDARDS.md`
- `.agents/skills/**/*.md`のうち、今回の監査で一般表現の英語混在または固定section名の扱いに問題が確認できたSkill本文・reference
- `.agents/skills/code-review/references/review-workflow.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`
- `docs/curriculum/test-automation/04_learning-effort-reference.md`
- 今回のactive Runと、実装前に保存する`docs/plans/`の計画artifact

### Out

- PR #146のbranch、merge、cherry-pick、dependency、`.textlintrc.json`、`.codex/text-quality-rules.json`、text quality Hook、`lint:text`実装
- source code、E2E、test、workflow、schema、identifier、path、URL、command、固定文字列の意味変更
- validator / contractを弱める変更、固定section名をダミー一覧へ置くだけの変更
- 過去Run、過去Plan / Report / history、既存ADR、生成artifact、fixture、snapshot、ログの表現変更

## Assumptions（仮定）

- 作業開始時点のPR #146が`open`・未mergeであるため、PR #146のgateは現在branchへ存在せず、今回の`lint:text`実行対象外とする。
- `Summary`、`Progress`、`Evidence`、`A later gate runs only after its upstream gate passes`など既存契約が参照する固定文字列は維持する。
- `Common Core`は課程、`Common route`は経路を表すため、それぞれ`共通課程`、`共通経路`とする。
- 固定section名の実契約は`origin/main`、`scripts/verify`、`scripts/verify.ps1`、`tests/contracts/**`、`tests/repository-contract/**`のEvidenceで判断する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。対象ファイル、用語、PR #146の扱い、完了条件が明示されている。
- 仮定してよい細部: 一般説明の英語は意味を保つ自然な日本語へ変更し、正式名称・技術用語・契約文字列は原文を残す。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: `docs/WRITING_STANDARDS.md`の`Common route`とPR #151依存記述は、局所修正で正本として自立できる。
- H2: `.agents/skills/code-review`と`feature-plan`の固定section名は、validatorの互換リストではなく実際の見出しへ英語名を併記すれば、文書の日本語化と契約を両立できる。
- H3: `04_learning-effort-reference.md`の英語括弧とネイティブ学習用語は、同一概念の本文・README・rubric照合で削除または統一を判断できる。

## Research Plan（調査計画）

- Round 1 Query: PR #146 / #151の状態、`origin/main...HEAD`差分、対象Skillの英語混在、固定section名のvalidator / contract参照、カリキュラム用語を確認する。
- Round 2 Query: 修正後の差分分類、既存Skill評価command、必須ローカルgate、Run Artifact sanitization、PR headとCIを確認する。
- Exit Criteria:
  - H1〜H3ごとに対象箇所と根拠がある。
  - `allowed_files`内の最小差分だけでレビュー指摘を解消する。
  - Skill評価、関連contract、必須gate、最新PR headのWeb / Mobile CIを確認する。

## Approach（進め方）

1. PR状態と差分・契約を調査し、Findingを`must_fix`として分類する。
2. `docs/WRITING_STANDARDS.md`、Skill本文・reference、学習工数文書を文脈単位で修正する。
3. 固定section名、固定文字列、正式名称、数値、ID、path、URL、commandに残差がないことを確認する。
4. `validate:skills`と既存Skill評価、指定されたlint / validation / build / contractを実行する。
5. Run ArtifactをSanitizerで確認し、branch safetyに従って同一branchへcommit / pushする。
6. 最新headのWeb CI・Mobile App CI成功とPR本文更新を確認して完了する。

## Definition of Done（完了条件）

- `Common Core → 共通課程`と`Common route → 共通経路`を意味どおりに修正する。
- `WRITING_STANDARDS.md`からPR #151固有の履歴依存を除く。
- 現行Skillの不要な一般英語混在を文脈ごとに修正し、固定section名は実際の見出しへ戻す。
- `04_learning-effort-reference.md`を既存カリキュラム用語へ整合させ、学習工数・数値・Lesson・合計を変更しない。
- PR #146の未merge実装・textlint責務を混入させず、既存contractを弱めない。
- 指定されたSkill評価とローカル検証を、未実行項目を明示して完了する。
- 同一branchのlocal / remote / PR headが一致し、最新Web CI・Mobile App CIが成功し、PR #151本文を更新する。PRはmergeしない。

## Risks / Unknowns（リスク・未知点）

- 固定section名を英語併記する位置・形式を誤ると、validatorだけでなくSkillの読み手にも誤解を与える。main版、validator、contract testを照合する。
- 一般英語と正式名称の境界を誤ると、機械契約やSkill意味を変える。requested phraseを一括置換せず、各文脈を確認する。
- Skill semantic evalやNative評価が環境制約で実行できない可能性がある。その場合は実行不能理由、代替Evidence、残余リスクを記録する。
- PR #146が作業中にmergeされる可能性があるため、push前に状態を再確認する。merge済みならmainとの差分と既存gateを再評価する。

## Thinking Log（判断記録）

- 2026-09-15: PR #146は`open`・未mergeだったため、PR #146の実装を今回branchへ追加しない方針を確定した。
- 2026-09-15: 固定section名は冒頭の互換一覧だけに残さず、実際の見出しへ英語名を併記する方針を採用する。
