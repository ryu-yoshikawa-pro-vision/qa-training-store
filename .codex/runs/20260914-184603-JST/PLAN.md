# Plan

## Objective

- Issue #134の未実装範囲である、compact後のroot `AGENTS.md`全文再注入を既存PlanのTask 5どおり実装する。
- `SessionStart(source=compact)`、fail-close structured output、Unix／Windows launcher、既存Hook contract、PR #146のCI／本文更新まで完了する。

## Scope

- In:
  - `.codex/hooks/session_start_context.mjs` の新規Hook
  - `.codex/config.toml` のcompact限定 `SessionStart`登録と明示的な`additionalContextLimit`
  - `tests/contracts/codex-hook-contract.test.ts` のTask 5固有contract追加
  - 必要最小限のHarness reference／Run Artifact／PR本文更新
- Out:
  - root `AGENTS.md`、production文章品質rule、既存Hookの意味・launcher
  - 新しいHook framework、session manager、diff framework、#135 branchへの直接依存
  - `--strict-harness`／`-StrictHarness`、Task 6以降の既実装領域の再設計

## Assumptions

- GitHubで確認したIssue #135は`closed`／`completed`であり、PR #147の成果は`origin/main`へ取り込まれている。
- 作業開始時のbranchは`issue-134-codex-hook-quality-gates`、local／remote／PR headは`79bf31fd8a09f344c50b6f7cf56b587a98f583e8`で一致し、作業treeはcleanである。
- root `AGENTS.md`は8,374 UTF-8 bytes。概算は保守的な`ceil(bytes / 4) = 2,094` tokensとして検証する。
- 実際のCodex CLIは`codex-cli 0.147.0`。同versionのsourceで`SessionStart(source=compact)`、`hookSpecificOutput.additionalContext`、exit 0の`continue:false`停止、`additionalContextLimit`のapproximate token thresholdを確認した。
- 現在のサイズ見積もりに対し余裕を持たせ、公式schemaで明示可能な`additionalContextLimit = 4096`を設定する。これはspill閾値であり、stdoutの文字数上限やHook側の切り詰めには使わない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示、正本Plan、現在のsource／Issue／CLI仕様で実装契約を確定できる。
- 仮定してよい細部: repository rootはHookの現在cwdから`.git`を親方向へ探索して解決する。validなnon-compact inputはroot／`AGENTS.md`を読まず、stdout空・exit 0とする。
- 未回答の重要質問: 実Codex本体へcompact eventを配送するfocused runtime canaryは、trust／runtime状態に依存するため、環境で成立しない場合はcontractとCIとは分離して未確認扱いにする。

## Hypotheses

- H1: 既存のprocess-boundary contract helperとconfigured launcher実行経路を再利用すれば、新しいtest frameworkなしでTask 5のUnix／Windows／nested cwd境界を固定できる。
- H2: `additionalContextLimit=4096`は現在のrootサイズ見積もりと0.147.0のspill仕様に整合し、本文をHook側で切り詰めず全文を返せる。
- H3: `continue:false`は0.147.0のSessionStartで`should_stop=true`へ変換されるため、再注入不能時に非0終了へ依存せず停止できる。

## Research Plan

- Round 1 Query: 現在のHook config／contract／Windows launcher／Harness文書と、#135／PR #146／origin/mainの状態を確認する。
- Round 2 Query: Codex CLI 0.147.0の公式source／schemaでmatcher、入力source、output、停止、spill閾値を確認する。
- Exit Criteria:
  - 変更対象と非対象が正本Planから逸脱していない。
  - 0.147.0の仕様根拠とrootサイズの関係がRun Artifactへ記録されている。
  - runtime canaryの実行可否をcontract／CIと混同せず判定できる。

## Approach

- `Task 4`を実状態で再確認し、root `AGENTS.md`は変更せず、marker／コピーを作らない。
- Hookを先にprocess contractとして実装し、入力検証、root解決、UTF-8全文、JSON escaping、fail-closeを固定する。
- configへcompact限定matcher、Unix／Windows command、timeout、explicit limitを追加する。
- 既存`tests/contracts/codex-hook-contract.test.ts`へ不足分だけ追加し、既存Hookの意味を変えない。
- Harness referenceの古い#135未完了記述が実装後の状態と矛盾する場合だけ、SessionStart責務の最小文書更新を行う。
- ローカルfocused／標準検証、sanitizer、commit、通常push、最新headのWeb CI／Mobile App CI、PR本文更新を行う。
- 標準フロー: `既存Plan確認 -> source仕様確認 -> TASKS -> 実装 -> focused検証 -> GitHub CI -> PR更新`

## Definition of Done

- `source=compact`でroot `AGENTS.md`全文を`hookSpecificOutput.additionalContext`へ返す。
- `source!=compact`はrootを読まず、stdout空・exit 0で終わる。
- malformed input、root解決失敗、`AGENTS.md`欠落／read失敗、structured output生成失敗は、secret／raw input／長いpath／本文を含まないexit 0の`continue:false` structured outputでfail-closeする。
- `.codex/config.toml`の`SessionStart` matcherは`^compact$`だけで、Unix／Windows launcherと`additionalContextLimit=4096`が検証される。
- 既存contract正本にTask 5固有のケースが追加され、Windows CIで実行される。
- `AGENTS.md`、production rule、既存Hookの意味、#135 branchは変更されない。
- local／remote HEAD一致、PR #146 OPEN維持、Web CI／Mobile App CIが実装後の同一headでsuccess、PR本文が現状へ更新される。

## Risks / Unknowns

- Codex trust状態やCLI実行環境により`/hooks`確認・compact runtime canaryが成立しない可能性がある。契約test／CIを代替証拠にせず未確認として報告する。
- `additionalContextLimit`はspill閾値であり、サイズ超過時の実際のfull-context配送はCodex本体責務。Hookは全文を返し、contractは設定値とサイズ境界を確認する。
- root探索を`.git`だけへ依存すると非Git cwdで停止するため、解決不能はfail-closeとして固定する。

## Thinking Log

- 2026-09-14 JST: #135はGitHub上でclosed/completed、origin/mainは現在HEADの祖先だったため、Task 5へ進める前提を満たした。
- 2026-09-14 JST: Codex 0.147.0 sourceで`SessionStart`の`source=compact`、`additionalContext`、`continue:false`停止を確認した。公式schemaは`additionalContextLimit`をapproximate token thresholdとし、未設定defaultは2,500 tokens。rootの保守的な2,094-token見積もりに対し4,096を明示する。
