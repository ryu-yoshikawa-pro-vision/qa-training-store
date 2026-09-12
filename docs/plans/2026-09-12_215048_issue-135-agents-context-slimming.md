# Issue #135 `AGENTS.md` 常駐コンテキスト整理 Plan

## 0. 依頼概要

- 依頼内容: Issue #135「`AGENTS.md` をスリム化し常駐指示と詳細運用仕様を分離する」を実装するためのPlanを作成する。
- 背景: root `AGENTS.md` が Run lifecycle、Git safety、Validation、Native、Subagent、Harness運用などの詳細を抱え、通常タスク開始時にも `docs/PROJECT_CONTEXT.md`、最近のADR、最近のRunを無条件参照する契約になっている。Issue #135では、既存Repository-wide policyの意味を変えず、常時必要な指示と必要時だけ読む詳細を分離する。
- 期待成果: 実装者が追加判断なしで、既存の正本を再利用しながら root `AGENTS.md` と無条件読み込み量を削減し、既存Harness契約を壊さず検証できる状態にする。
- 関連Issue:
  - #117: Agent Skillsの自己完結化・routing整理。Skill package構造やSkill固有WorkflowをこのIssueで再設計しない。
  - #134: Hook契約テスト、compact後の `AGENTS.md` 再注入、文章品質ゲート。新しいHookや再注入処理はこのIssueで実装しない。

## 1. ゴール / 完了条件

### ゴール

root `AGENTS.md` を、Codexが常時保持する必要があるRepository-wide契約と高レベルroutingへ絞る。Run、Git、Android / Native validation、Subagent、Harness等の詳細は既存のSkill / reference / agent定義を正本として必要時参照にし、通常タスク開始時の無条件読み込み対象を現状より減らす。

### 完了条件（DoD）

- `AGENTS.md` の現行section / ruleを次の4区分でbullet単位に棚卸ししてから変更する。
  - A: 常時必要なのでrootへ残す。
  - B: 特定状況だけ必要なので既存Skill / reference / runbookへ寄せる。
  - C: 対象となるすべての実行経路で既存Harnessが当該制約を機械的に判定・拒否できるため、rootは高レベル契約だけ残す。
  - D: 重複または常時読み込み不要としてrootから外す。
- Cへ分類する前に、Hook matcher、rules、validator、CIの対象経路を確認する。`apply_patch` 等のHook対象外経路、部分的なrules、fail-closeしない経路が1つでもある場合はC単独にせず、rootの高レベル契約または条件付きreferenceを維持する。
- 要約、移管、削除の前後で、禁止条件、許可条件、例外条件、停止条件、復旧条件、実行前後の必須確認の意味を変えない。
- `AGENTS.md` に次のRepository-wide契約を直接残す。
  - ユーザーの明示指示と対象範囲を優先する。
  - 関係のない変更を行わない。
  - default branchへ直接commit / pushしない。
  - force pushや未承認の破壊的操作を行わない。
  - delete / rename / move等の破壊的操作は既存Safety契約に従い、必要な承認なしで実行しない。
  - Git mutationはRepositoryのGit safety契約に従う。
  - 品質ゲートFAILを未確認のまま完了扱いにしない。
  - repository working tree上のファイルを実際に変更してGit commit対象差分を作る実装・変更タスクでは、ユーザーがGit操作を明示的に禁止していない場合、`docs/reference/codex-implementation-harness.md` の適用条件・例外を含む完了契約に従い、ローカル変更・ローカル検証だけで完了扱いにしない。
  - GitHub metadataのみの変更、review-only、plan-only、調査のみ、質問、状態確認、repository file変更を伴わない分析には、上記のfile-changing task完了契約を適用しない。
  - ユーザー向け成果物、PR、Run Artifact等の言語ルール。
  - Skill routingの入口とRepository固有Inputの所在。
  - Parent / child subagentの高レベル責務境界。childのrecursive delegationは禁止する。
- Gitのbranch確認、rescue branch、ancestry、cherry-pick、reset条件、明示refspec等の詳細は `docs/reference/git-branch-safety.md` を正本とし、rootへ重複させない。
- repository file変更時の実装完了条件は `docs/reference/codex-implementation-harness.md` を正本として集約する。現行 `AGENTS.md` から、適用対象、除外対象、Git操作禁止例外、既存PR利用、必要時PR作成、commit、push、HEAD確認、PR最新head、`Web CI`、`Mobile App CI`、queued / in_progressは未完了、failure修正後は新しいheadで再確認、を項目単位で移管し、意味を変えない。
- Git操作自体の安全手順は `docs/reference/git-branch-safety.md`、Run Artifactは `docs/reference/run-artifacts.md` を正本とする。
- Repository-wideなReport作成契約は `docs/reference/codex-safety-harness.md` の `Report file generation policy` を正本とする。review固有の保存契約は `CODE_REVIEW.md`、Run-local `REPORT.md` は `docs/reference/run-artifacts.md` を正本とし、3つを混同しない。
- Run初期化、wrapper、Workflow Level、Run Artifact、manifest、checkpoint、retention、sanitization等の詳細は既存の `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` を優先して集約し、rootには入口契約と参照条件だけを残す。
- Codex native delegationはSubagent運用の概念として扱い、Android / Native validationと混同しない。Parent / child境界はroot、詳細は `.codex/config.toml`、`.codex/agents/**`、`docs/reference/codex-implementation-harness.md` を正本とする。
- Windows Android / Maestroのpreflight、再試行、停止条件、ログ保存等は `.agents/skills/android-native-local-validation/**` とNative runbookを正本とし、rootへ重複させない。
- 個別SubagentのRole、Tool / write制約は `.codex/agents/**` と `docs/reference/codex-implementation-harness.md` を正本とし、rootには個別Roleの長い説明を残さない。
- `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` は現在のRepository adapter責務を維持し、rootと同じSkill Workflowを再定義しない。
- 通常タスク開始時の無条件読み込みから、`docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` の一律参照を外し、必要条件をrootから判別できるようにする。
- rootを短くした代わりに、全Skill / reference / runbookを毎回読む構成にしない。
- `scripts/verify` と `scripts/verify.ps1` の現行root assertionを後述の移管表へ対応付け、「rootへ残す」「詳細正本側へ移す」「既存の正本側検証と重複するため削除」のいずれかを実装前に確定する。
- Bash版とPowerShell版は検索文字列を一致させるのではなく、「何をどの正本で検証するか」という意味契約を一致させる。
- `AGENTS.md` のUTF-8 byte数と行数を変更前後で記録する。token数は新規依存を追加して厳密測定せず、Issueの約2,000〜3,000 tokenは目安として扱う。大幅に上回る場合は、常時必要な契約として残す理由を説明できることを確認する。
- 通常タスク開始時の無条件読み込み量について、変更前後の対象ファイル集合と概算byte数を記録し、変更後が減少していることを確認する。
- 変更前の「最近のADR」「最近のRun」は件数未定義のため、ADR 1件・Run 1件を旧契約の保守的な下限として測定する。比較に使ったADR path、Run ID、Run側の計上ファイル、各UTF-8 byte数を記録する。
- #134の範囲である新規Hook、SessionStart再注入、textlint、Hook契約テストは追加しない。

## 2. 現状理解と正本

### Entry points

- root契約: `AGENTS.md`
- Plan adapter: `PLANS.md`
- Review adapter: `CODE_REVIEW.md`
- Agentic QA adapter: `QA_AGENT.md`
- 実装Harness詳細 / file-changing task完了契約: `docs/reference/codex-implementation-harness.md`
- Run Artifact詳細: `docs/reference/run-artifacts.md`
- Git安全詳細: `docs/reference/git-branch-safety.md`
- Safety Harness / Repository-wide Report policy: `docs/reference/codex-safety-harness.md`
- Scope契約: `docs/reference/change-scope-policy.md`
- Skill: `.agents/skills/**`
- Subagent定義: `.codex/agents/**`
- Codex subagent深度: `.codex/config.toml`
- Android / Native validation Skill: `.agents/skills/android-native-local-validation/**`
- Android / Native runbook: `docs/native/windows-android-local-validation.md`、`docs/native/windows-android-troubleshooting.md`
- 機械的安全規則: `.codex/rules/**`、`.codex/rules-auto-net/**`、`.codex/hooks/**`
- Harness契約検証: `scripts/verify`、`scripts/verify.ps1`

### Main flow

現状のroot `AGENTS.md` は、タスク開始時の無条件参照、Skill routing、Run初期化・保持・sanitization、進捗計算、ユーザー向け報告、Living Documentation、Plan / Report保存、Git safety、PR言語、品質ゲート、実装完了条件、調査、Subagent、改善ガバナンス、Safety Harness、auto-net、Lightweight、Workflow Levelまで直接保持している。

同じ詳細責務の多くは既に次へ分離済みである。

- Run / wrapper / Workflow Level: `docs/reference/codex-implementation-harness.md`
- Run manifest / evaluation / Hook JSONL / cleanup / Subagent記録: `docs/reference/run-artifacts.md`
- Git復旧: `docs/reference/git-branch-safety.md`
- Repository-wide Report policy: `docs/reference/codex-safety-harness.md`
- review固有の保存契約: `CODE_REVIEW.md`
- Skill固有Workflow: `.agents/skills/<skill>/`
- Android / Native validation: `android-native-local-validation` Skill + Native runbook
- Subagentの個別制約: `.codex/agents/*.toml`
- 危険操作の機械判定: `.codex/rules/**`、`.codex/hooks/pre_tool_use_policy.mjs`

ただし、次は既存正本を補完する必要がある。

- `docs/reference/codex-implementation-harness.md` はRun初期化、wrapper、Workflow Level、Subagent実装フローを既に保持するが、現行 `AGENTS.md` にあるfile-changing taskの適用条件・例外・commit / push / PR / CIまでの完了契約をすべては保持していない。実装時に現行契約を項目単位で移管する。
- `scripts/verify` / `scripts/verify.ps1` は詳細文言をrootへ直接要求するassertionが残っているため、責務分離後の正本へ検証先を移す必要がある。

機械的なSafety実装はすべての操作経路を一律に覆うとは限らない。Hook matcher外の操作や部分的なrulesがある場合、その契約を「機械強制済み」とみなしてrootから完全に外さない。

### Reportの責務

Report関連は次の3種類を別契約として扱う。

| 対象 | 正本 | 実装方針 |
| --- | --- | --- |
| Repository-wideな `docs/reports/` 作成判断 | `docs/reference/codex-safety-harness.md` の `Report file generation policy` | rootの詳細を外し、Report作成判断が必要な場合に同referenceを読む導線を残す |
| review固有の保存契約 | `CODE_REVIEW.md` | review時だけ参照するRepository adapterとして維持する |
| Run-local `REPORT.md` | `docs/reference/run-artifacts.md` | `.codex/runs/**` のArtifact契約として維持する |

新規Report referenceは作成しない。

### Codex delegationとAndroid / Native validation

同じ「Native」という語を含むが、次の2概念を分離する。

- Codex native delegation:
  - Subagent運用の仕組み。
  - rootにはParent / childの高レベル責務、childのrecursive delegation禁止を残す。
  - 詳細は `.codex/config.toml` の `max_depth = 1`、`.codex/agents/**`、`docs/reference/codex-implementation-harness.md` で検証する。
- Android / Native validation:
  - Android実機・ローカル検証のWorkflow。
  - rootにはAndroid依頼時のSkill入口だけ残す。
  - 詳細は `.agents/skills/android-native-local-validation/**` と `docs/native/**` を正本とする。
  - Android専用Subagentが存在する前提を置かない。

### Existing tests / validation

- `scripts/verify` と `scripts/verify.ps1` がRepository template / Harness契約を確認している。
- 現在のverifyは、`implementation_worker`、各researcher名、`scripts/new-run.*`、`run.json`、`Report file`、`command-based deletion`、Parent / child関連等の文言が `AGENTS.md` に直接存在することも要求している。
- 同じverify内で `.codex/agents/*.toml` 等の詳細正本も個別に検証しているため、root assertionをそのまま残すと責務重複が継続し、単に削除すると契約検証が欠落する可能性がある。
- Bash版とPowerShell版は検証対象の意味を揃える必要があるが、検索文字列やassertion構成を完全一致させる必要はない。
- `pnpm run lint:markdown` がMarkdown構造を検証する。
- `pnpm run validate:skills` がSkill package構造とlink integrityを検証する。
- `pnpm run test:repository` がRepository contract testsを実行する。
- `pnpm run verify` は `scripts/verify` / `scripts/verify.ps1` を内包しないため、Harness verifyは個別実行する。

### Assumptions

- Issue #135の目的は責務分離であり、既存Repository-wide policyの強化・緩和は行わない。
- 新規referenceは原則作らない。rootから外す詳細の既存正本が不足する場合は、まず責務が最も近い既存referenceへ追記する。
- `AGENTS.md` のサイズ目安は品質判断の補助であり、byte数やtoken数だけを満たすために必要な契約を削らない。
- 無条件読み込み量の比較は、厳密token課金計算ではなく対象ファイル集合とUTF-8 byte数の比較で十分とする。
- 旧契約の「最近のADR」「最近のRun」は件数未定義であるため、ADR 1件・Run 1件の計測値は実際の上限ではなく保守的な下限として扱う。

### Non-goals

- `.codex/config.toml` へのSessionStart Hook追加。
- compact後の再注入処理。
- textlint導入。
- Hook契約テスト追加。
- 新しいvalidatorやWorkflow Engineの追加。
- Skill package構造の再設計。
- Product behavior変更。
- Run Artifact schemaやSubagent runtimeの仕様変更。
- 既存Git safetyの強化・緩和。
- Report policyの文書配置そのものの再設計。

## 3. 影響範囲

### `AGENTS.md` sectionの初期分類

実装開始時に現行全文を再確認し、section全体ではなく例外条件を含むbullet単位まで分類する。

Cは「関連するHook / rulesが存在する」という理由だけでは選ばない。対象操作のすべての実行経路で既存Harnessが判定・拒否できることを確認できた場合だけCとする。Hook対象外、部分的なrules、fail-closeしない経路がある場合はAまたはBを併用する。

| 現行領域 | 初期方針 | 移管先 / 残す内容 |
| --- | --- | --- |
| `最初に必ず読むもの` | D / 再構成 | rootを常駐入口とし、`PROJECT_CONTEXT`、ADR、過去Runは条件付き参照へ変更 |
| `モード別の入口ファイル` | A + B | Skill routingはroot、高レベル以外はSkill / adapterへ |
| Run初期化・Run Artifact・実行ループ | B | `codex-implementation-harness.md` / `run-artifacts.md` |
| Progress・ユーザー向けレポート | A + B | 必要な高レベル形式だけroot、計算やcheckpoint詳細はRun関連referenceへ |
| Living Documentation | A + B | 「いつ更新するか」の高レベル条件だけroot。通常タスクでの無条件読込は廃止 |
| Plan保存 | B | `PLANS.md` と既存Run persistence契約 |
| Repository-wide Report policy | B | `codex-safety-harness.md` の `Report file generation policy` |
| review固有Report | B | `CODE_REVIEW.md` |
| Run-local `REPORT.md` | B | `run-artifacts.md` |
| 安全性 / スコープ | A + C | delete / rename / move、Git mutation、未承認破壊操作等の高レベル禁止はroot。機械判定詳細は全経路を捕捉できる範囲だけC |
| Git Branch Safety | A + B | default branch禁止等はroot、復旧詳細は `git-branch-safety.md` |
| PR言語 | A | 高レベル契約をrootへ残す |
| 必須検証 | A + B + C | gateを無視しない契約と実装完了判断の入口はroot。完了詳細はimplementation harness、repair / Android詳細は各Skill / referenceへ |
| 実装タスク完了条件 | A + B | 適用条件・Git操作禁止例外を含む入口はroot。適用・除外・commit / push / HEAD / PR / CI詳細はimplementation harnessへ |
| 言語ポリシー | A | rootへ残す |
| 自律的な調査 | B | planning / repair / harness-improvement Skillへ |
| Codex Subagent | A + B | Parent / child境界とrecursive delegation禁止はroot、Role詳細は `.codex/agents/**` とimplementation harnessへ |
| Android / Native validation | A + B | Android依頼時のSkill入口だけroot、詳細はAndroid Skill / Native runbookへ |
| 改善ガバナンス | AまたはB | 既存referenceの受け皿を確認し、常時必要な承認境界だけrootへ残す |
| Safety Harness / auto-net | A + B + C | destructive operationとRepository-wide Report判断でSafety referenceへ到達できる入口をrootへ残す。詳細は `codex-safety-harness.md` / rules / Hook |
| Lightweight / Workflow Level | B | `codex-implementation-harness.md` |

### 主な変更候補

- `AGENTS.md`
- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`

既存正本の不足が確認された場合だけ変更する。

- `docs/reference/run-artifacts.md`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `.agents/skills/**`
- `.codex/agents/**`
- `docs/native/**`

## 4. 変更方針

### 4.1 変更前の棚卸しと測定

- [ ] 1. 現行 `AGENTS.md` の各section / bulletをA〜Dへ分類し、rootに残す理由または移管先を記録する。
- [ ] 2. C候補は、Hook matcher、rules、validator、CIを経路単位で確認する。`apply_patch` 等の対象外経路、部分的なrules、fail-closeしない経路がある場合はC単独にしない。
- [ ] 3. 同じルールが `AGENTS.md` と既存reference / Skill / agent定義に重複している箇所を対応付ける。
- [ ] 4. `scripts/verify` / `scripts/verify.ps1` が `AGENTS.md` に直接要求している各assertionを、4.4のassertion移管表へ対応付ける。表外assertionを未分類のまま残さない。
- [ ] 5. 通常タスク開始時に無条件で読むよう指示されている対象を具体化する。
  - `AGENTS.md`
  - `docs/PROJECT_CONTEXT.md`
  - 「最近のADR」は件数未定義のため、比較用に最新1件を旧契約の保守的な下限として採用する。
  - 「最近のRun」は件数未定義のため、比較用に最新1 Runの標準Run Artifactを旧契約の保守的な下限として採用する。
- [ ] 6. 比較に使うADR path、Run ID、Run側で計上するArtifact一覧を記録する。
- [ ] 7. 上記対象のUTF-8 byte数と、`AGENTS.md` の行数を記録する。これは比較用evidenceであり、新しいhard gateにはしない。

### 4.2 詳細契約の正本を先に確認・補完する

- [ ] 8. Run関連のroot詳細を `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` へ対応付ける。
- [ ] 9. 現行 `AGENTS.md` のfile-changing task完了契約を、次の項目まで個別に棚卸しする。
  - 適用対象: repository working tree上のファイルを実際に変更し、Git commit対象差分を作る実装・変更タスク。
  - 例外: ユーザーがそのタスクでGit操作を明示的に禁止した場合。
  - 除外: GitHub metadataのみの変更、review-only、plan-only、調査のみ、質問、状態確認、repository file変更を伴わない分析。
  - Git操作が許可される場合のcommit / push。
  - 既存PRがある場合はそのPRを利用する条件。
  - PRが必要で存在しない場合の作成条件。
  - push後のHEADとPR最新headの一致確認。
  - 通常PRでの `Web CI` / `Mobile App CI` 確認。
  - queued / in_progressを完了扱いにしない。
  - failure修正後は修正後の最新headで再確認する。
- [ ] 10. 上記の詳細を `docs/reference/codex-implementation-harness.md` へ集約する。rootには適用条件・Git操作禁止例外を含む高レベル入口だけ残す。
- [ ] 11. branch、push、refspec、復旧等のGit安全手順は `docs/reference/git-branch-safety.md`、Run Artifactの保存・評価・証跡は `docs/reference/run-artifacts.md` を正本とし、implementation harnessへ重複コピーしない。
- [ ] 12. Repository-wide Report policyは `docs/reference/codex-safety-harness.md` の `Report file generation policy` を正本として利用し、新規referenceを作らない。
- [ ] 13. review固有のReport保存は `CODE_REVIEW.md`、Run-local `REPORT.md` は `docs/reference/run-artifacts.md` を正本とする。
- [ ] 14. Safety詳細について、delete / rename / move、Git mutation、`apply_patch`、明示承認が必要な破壊的操作の各経路を確認する。機械強制されない経路があれば、rootの高レベル禁止と `docs/reference/codex-safety-harness.md` への条件付き導線を維持する。
- [ ] 15. Codex native delegation / recursive delegationの詳細は `.codex/config.toml`、`.codex/agents/**`、implementation harnessで完結させ、Android Skill / Native runbookを検証先にしない。
- [ ] 16. Android / Native validation詳細はAndroid Skill / Native runbookで完結させ、Codex delegation契約を混ぜない。
- [ ] 17. `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` はRepository adapterとして現状の責務を維持し、root短縮のためだけに内容を増やさない。

### 4.3 `AGENTS.md` を常駐契約へ再構成する

- [ ] 18. 「最初に必ず読むもの」の無条件4項目を廃止し、必要時参照の条件をrootへ明記する。
  - `docs/PROJECT_CONTEXT.md`: Product / architecture / repository contextが変更判断に必要な場合。
  - `docs/adr/`: 対象領域の既存設計判断を変更・依存する場合。
  - `.codex/runs/`: 同一会話・同一タスクのactive Runを継続する場合、または過去Runが調査evidenceとして明示的に必要な場合。
  - `PLANS.md`: Plan作成時。
  - `CODE_REVIEW.md`: review時。
  - `QA_AGENT.md`: Agentic QA時。
  - `docs/reference/codex-safety-harness.md`: delete / rename / move等の破壊的操作、Safety Harnessの詳細判断、またはRepository-wideなdurable Report作成可否を判断する場合。
  - Android / Native runbook: Android / Nativeローカル検証時。
  - Harness / Run reference: 対応するHarness操作やRun運用が必要な場合。
- [ ] 19. Skill routingを高レベル入口として残し、Skill固有Workflow、停止条件、長いChecklistをrootへ置かない。
- [ ] 20. Repository-wide safetyをrootへ残す。少なくともdefault branch直接mutation禁止、force push、delete / rename / move等の未承認破壊操作禁止、Git mutationはGit safetyに従うこと、関係のない変更禁止、ユーザー明示指示優先、品質ゲート未確認禁止を保持する。
- [ ] 21. Git safetyは絶対条件と `docs/reference/git-branch-safety.md` を読む条件だけrootへ残し、復旧コマンド列を削る。
- [ ] 22. Run / Harnessは高レベル契約と正本reference導線だけrootへ残す。具体的なCLI option、manifest field、retention列挙、sanitizer例外、Workflow Level表等はrootから外す。
- [ ] 23. file-changing taskの完了判断は、適用条件・Git操作禁止例外を含む高レベル入口だけrootへ残す。詳細な適用・除外、commit / push / HEAD / PR / CI契約はimplementation harnessへ集約する。
- [ ] 24. Validationは「変更に応じたRepository標準検証を実行し、FAILを未確認で完了扱いにしない」をrootへ残す。Repair loop詳細、Android再試行条件、CI確認の具体手順は既存の担当文書へ寄せる。
- [ ] 25. SubagentはParentが要件解釈、計画、委譲、結果統合、完了判断を持つこと、childは委譲範囲を越えず独自Runやrecursive delegationを行わないこと等の高レベル境界だけrootへ残す。個別agent名ごとの長い責務説明は削る。
- [ ] 26. Android / Native validationはSkill入口だけrootへ残し、Codex native delegationの説明と同じ項目へまとめない。
- [ ] 27. 言語、PR、Plan保存等で常時必要な短い契約はrootへ残す。
- [ ] 28. 設計変更の経緯や「以前はこうだった」という説明を新しい `AGENTS.md` やreferenceへ書かない。

### 4.4 Harness契約を責務分離後へ合わせる

現行root assertionは次の移管方針に従う。実装前にBash / PowerShell双方のassertionをこの表へ照合し、同じ意味のassertionが表外にあれば最も近い行へ含める。ここに定義済みの責務について、実装者が別の正本を選ばない。

| 現行root assertion / 意味 | rootでの扱い | 詳細の検証先 |
| --- | --- | --- |
| `.agents/skills/feature-plan/SKILL.md` / `.agents/skills/code-review/SKILL.md` 等のSkill入口 | 高レベルroutingとRepository固有Inputへの導線を残す | 各Skill package。詳細Workflowをrootへ要求しない |
| `scripts/new-run.sh` / `scripts/new-run.ps1` | Run / Harness利用時の最小導線だけ残す | `docs/reference/codex-implementation-harness.md` |
| `run.json` / machine-managed `run.json` | 詳細文言を外す | `docs/reference/run-artifacts.md` |
| active `RunId` / manifest sync | 詳細文言を外す | wrapper実行契約はimplementation harness、manifest同期はrun-artifacts |
| `Delegation` / `Result` / `Parent decision` 等のcheckpoint | 詳細文言を外す | implementation harness / run-artifacts |
| `Report file` / `docs/reports/` 作成条件 | 詳細文言を外す。Report判断時のSafety reference導線を残す | Repository-wide policyは `docs/reference/codex-safety-harness.md` の `Report file generation policy`。review固有は `CODE_REVIEW.md`、Run-local `REPORT.md` はrun-artifacts |
| `command-based deletion` | delete / rename / move等の高レベル安全契約を残す | `docs/reference/codex-safety-harness.md` と既存rules / Hookの捕捉範囲 |
| `implementation_worker` / `quality_gate_runner` / `code_researcher` / `implementation_researcher` / `test_investigator` | 個別agent名要求を外す | `.codex/agents/**` とimplementation harness |
| `writable subagent` / worker scope / Parent指定ファイルだけ変更 | childが委譲範囲を越えない高レベル境界を残す | `implementation_worker.toml` / implementation harness |
| Parentが計画・対象ファイル・変更範囲・禁止事項を決める | Parentが要件解釈・計画・委譲・統合・完了判断を持つ高レベル意味を残す | implementation harness |
| 判断できない場合Parentへ戻す | childが独自判断で範囲を広げない高レベル意味を残す | 各writable agent定義 / implementation harness |
| `Parent-defined validation` | Parentが検証決定を持つ高レベル意味を残す | `quality_gate_runner.toml` / implementation harness |
| `Codex native delegation` | Parent / childの高レベルdelegation境界だけ残す | `.codex/config.toml`、`.codex/agents/**`、implementation harness |
| `No child subagent delegation` / recursive delegation禁止 | childのrecursive delegation禁止をrootへ残す | `.codex/config.toml` の `max_depth = 1` と各Agent定義 |
| Android / Native validation routing | Android依頼時のSkill入口だけ残す | `.agents/skills/android-native-local-validation/**` / `docs/native/**` |
| repair / harness-improvement関連reference | 必要時参照の入口だけ残す | 各Skill / referenceとlink integrity |

- [ ] 29. `scripts/verify` の `check_template_contract` を上記移管表へ合わせて更新する。
  - `AGENTS.md` にSkill入口、主要Repository-wide safety、適用条件・例外を含むfile-changing task完了判断の入口、Parent / child境界、必要時reference導線があることを確認する。
  - rootから移した詳細文言を `AGENTS.md` に直接要求しない。
  - `Report file` のRepository-wide policyは `codex-safety-harness.md` 側を検証する。
  - Agent個別制約は `.codex/agents/**`、Run詳細はrun-artifacts / implementation harness側を検証する。
  - 既に同じ正本契約を別assertionで検証している場合は重複assertionを削除してよいが、検証対象の意味自体は失わない。
- [ ] 30. `scripts/verify.ps1` にも同じ移管表を適用する。Bash版とPowerShell版で実装方法や検索文字列は異なってもよいが、「どの意味をどの正本で検証するか」は一致させる。
- [ ] 31. Bash版・PowerShell版の双方について、移管表の各行が「root残置 / 正本移管 / 重複削除」のどれで実装されたかdiffで照合する。
- [ ] 32. 新規Hookテストやvalidatorへ範囲を広げず、既存のSkill package validationとrepository contractを維持する。
- [ ] 33. rootの再肥大化を防ぐための新しいtoken / byte hard limitは追加しない。

### 4.5 無条件読み込み量と意味保持を確認する

- [ ] 34. 変更後の無条件読み込み対象を列挙する。通常タスクではroot `AGENTS.md` 以外を一律必須にしないことを確認する。
- [ ] 35. `AGENTS.md` の変更後byte数・行数と、通常タスク開始時の無条件読み込み総量を変更前と比較する。
- [ ] 36. 変更前のADR 1件・Run 1件は旧契約の「最近」の保守的な下限として扱い、実際の旧契約が1件に限定されていたとは記載しない。
- [ ] 37. 比較結果には、対象 `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、ADR path、Run ID、Run側で計上したArtifact、各UTF-8 byte数を残す。
- [ ] 38. rootを短くした代わりに複数referenceを一括で常時読む記述がないことを確認する。
- [ ] 39. 棚卸し表とassertion移管表を使い、各ルールについて移管後の正本またはroot残置先を照合する。意味が変わる短文化を発見した場合は、そのbulletをrootへ戻すか正本referenceを補完する。

## 5. 検証方法

### 文書・参照整合

- `pnpm run lint:markdown`
- `pnpm run validate:skills`
- rootから参照するSkill / reference / adapterのlinkが実在することを確認する。
- `AGENTS.md` 内に、通常タスクで `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` を一律必須とする記述が残っていないことを確認する。
- Git / Run / Android / Subagentの詳細がrootへ二重定義されていないことをdiffで確認する。
- Codex native delegationとAndroid / Native validationが同じ責務として記載されていないことを確認する。
- Repository-wide Report policy、review固有Report、Run-local `REPORT.md` の正本が混同されていないことを確認する。
- file-changing task完了条件について、rootの入口とimplementation harnessを現行 `AGENTS.md` と照合し、適用対象、除外対象、Git操作禁止例外、既存PR、必要時PR作成、commit / push / HEAD、PR最新head、`Web CI`、`Mobile App CI`、queued / in_progress、failure後の再確認が欠落していないことを確認する。

### Safety分類

- A / B / C / D棚卸しでCとした項目について、Hook matcher、rules、validator、CIのどれが対象経路を捕捉するか記録する。
- `apply_patch`、delete、rename / move、Git mutation、明示承認が必要な破壊的操作について、Hook対象外または部分強制の経路がある場合はrootの高レベル契約が残っていることを確認する。
- destructive operationとRepository-wide Report作成判断から `docs/reference/codex-safety-harness.md` へ到達できる条件付き導線を確認する。

### Harness契約

- `pnpm run test:repository`
- `bash scripts/verify`
- Windows環境では `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `pnpm run verify` だけで上記Harness verifyを実行した扱いにせず、Bash / PowerShell版を個別に確認する。
- `scripts/verify` と `scripts/verify.ps1` のroot contract assertionsをassertion移管表と照合し、同じ意味契約になっていることを差分レビューする。
- rootから削除したassertionについて、正本側の検証または既存の同等assertionが残っていることを確認する。
- `Report file` のroot literal assertionが、`codex-safety-harness.md` のpolicy検証へ移っていることを確認する。
- `.codex/config.toml`、Hook script、rulesを変更していないことを確認する。変更が必要になった場合は#134との境界を再確認し、このIssueへ混ぜない。

### Repository標準検証

- `pnpm run verify`
- 実行環境上の理由で一部を実行できない場合は、未実行項目と代替evidenceをRun ArtifactとPR本文へ明記する。

### サイズ・読込量

- 変更前後の `AGENTS.md` のUTF-8 byte数と行数を比較する。
- 変更前は `AGENTS.md` + `docs/PROJECT_CONTEXT.md` + 最新ADR 1件 + 最新Run 1件の標準Artifactを計測する。ただし「最近」の件数は旧契約で固定されていないため、この値は変更前の保守的な下限として扱う。
- 比較記録には、採用したADR path、Run ID、Run側で計上したArtifact一覧、各ファイルのUTF-8 byte数を含める。
- 変更後はrootで無条件指定されたファイルだけを対象とする。
- 変更後の無条件読込量が上記の変更前下限より小さいことを確認する。
- この比較は「無条件読み込みが減った」ことのevidenceとして使い、byte数そのものを合否の唯一の基準にしない。
- `AGENTS.md` がIssueの約2,000〜3,000 token目安を大幅に上回る場合は、常駐させる必要がある契約を再確認し、残す理由をPRへ記載する。新しいtokenizer依存やhard gateは追加しない。

### 成功判定

次をすべて満たした場合にIssue #135の実装を完了扱いにする。

- rootが常時必要なRepository-wide契約と高レベルrouting中心になっている。
- rootだけ読めば、守るべき絶対条件と、どの状況で次に何を読むかを判断できる。
- Cへ分類した契約は、対象となるすべての実行経路で既存Harnessが機械判定・拒否できることを説明できる。部分強制の契約はrootまたは条件付きreferenceが残っている。
- delete / rename / move、Git mutation、未承認破壊操作の高レベル安全契約がrootから失われていない。
- file-changing task完了判断の適用条件・Git操作禁止例外がrootから失われていない。
- GitHub metadataのみ、review-only、plan-only、調査のみ等の除外対象へfile-changing task完了契約を誤適用しない。
- implementation harnessに、現行policyの既存PR / 必要時PR作成 / commit / push / HEAD / PR最新head / `Web CI` / `Mobile App CI` / queued・in_progress / failure後再確認が保持されている。
- Repository-wide Report policyは `codex-safety-harness.md`、review固有は `CODE_REVIEW.md`、Run-local `REPORT.md` はrun-artifactsとして責務が確定している。
- Codex native delegation / recursive delegationとAndroid / Native validationが分離されている。
- 条件付きreferenceの詳細を通常タスクで無条件に読む必要がない。
- 既存policyの意味が変わっていない。
- #117のSkill package責務を重複実装していない。
- #134のHook / compact再注入 / textlintへ範囲を広げていない。
- Bash / PowerShell双方のHarness契約が共通のassertion移管表に沿って責務分離後の構造を受理する。
- `writable subagent`、`Parent-defined validation`、active `RunId`、checkpoint、machine-managed `run.json` 等を含むroot assertionの意味が、rootまたは詳細正本の検証として残っている。
- Markdown、Skill validation、Repository contract、Bash / PowerShell Harness verify、標準verifyが通る、または未実行理由が具体的に説明されている。
- 無条件読み込み対象と概算量が、変更前の保守的な下限より減っている。

## 6. リスクと停止条件

### Risks

- **短文化によるpolicy意味変更**: 例外付き禁止や停止条件を一文に縮めると、許可範囲が意図せず変わる可能性がある。bullet単位の棚卸しと正本照合で防ぐ。
- **実装完了条件の強化**: Git操作禁止時や非file-changing taskにもcommit / push契約を適用すると現行policyを強化する。適用・除外・例外をimplementation harnessへ明記し、root入口にもGit操作禁止例外を残す。
- **機械強制範囲の過大評価**: Hookやrulesが存在するだけでCへ分類すると、`apply_patch` 等の対象外経路から安全契約が抜ける。経路単位で捕捉範囲を確認し、部分強制はrootまたはreferenceを維持する。
- **Report責務の再混同**: `docs/reports/`、review persistence、Run-local `REPORT.md` を同じ契約として扱わない。
- **Nativeの語義混同**: Codex native delegationをAndroid / Native validationへ誤接続しない。
- **verify契約の単純削除**: root assertionを消すだけでは回帰検出が弱くなる。assertion移管表で検証先を確定し、同じ意味の検証を残す。
- **Bash / PowerShellの契約差**: 両実装の検索文字列を揃えること自体を目的にせず、共通の移管表に対して同じ意味を検証しているかを確認する。
- **referenceへの重複移植**: root削減のために同じ詳細を複数referenceへコピーするとSSOTが悪化する。既存責務に最も近い1箇所へ寄せる。
- **必要時参照が曖昧になる**: rootをリンク集にしすぎると、どの条件で何を読むか判断できなくなる。各referenceにtask conditionを添える。
- **無条件読込が別名で復活する**: 「関連referenceを最初に全部読む」等の記述を追加しない。
- **読込量の変更前値を過大解釈する**: ADR 1件・Run 1件は旧契約の実際の件数ではなく下限である。比較記録に対象を明示し、上限や正確な旧読込量として扱わない。
- **#134との混線**: size削減のついでにSessionStart Hookやtextlintへ進まない。

### 停止条件

次の場合は勝手に責務を再設計せず、Issue #135の範囲へ戻る。

- rootから外す契約について、上記で確定した既存正本では意味を保持できず、新規referenceまたはpolicy変更が必要になる。
- 現行の複数文書で同じルールが異なる意味になっており、単純な責務移管では解消できない。
- verify契約を更新するために新規Hook / validator実装が必要になる。
- #134のSessionStart / compact再注入 / textlintを変更しないと成立しない。

## 7. 成果物

### 変更が見込まれるファイル

- `AGENTS.md`
- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`

### 条件付き変更

- `docs/reference/run-artifacts.md`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `.agents/skills/**`
- `.codex/agents/**`
- `docs/native/**`

これらは、rootから移す契約の既存正本に不足または参照不整合が確認された場合だけ変更する。`Report file generation policy`は既に `codex-safety-harness.md` に存在するため、配置変更を目的に同文書を変更しない。

### 変更しない範囲

- `.codex/config.toml`
- 新規Hook
- textlint設定
- Product code / test behavior
- Skill package構造
- Run schema
- Subagent runtime

### 付随ドキュメント

- 新規の移行履歴文書や責務一覧文書は作成しない。
- 棚卸し、assertion移管表、判断経緯、検証結果はIssue / PR / Git履歴とactive Run Artifactで追跡する。

## 8. 備考

- このPlanはIssue #135の実装範囲だけを扱う。
- 実装開始時はmainとの差分とIssue #117関連の既存変更を再確認し、既に解決済みの責務分離をやり直さない。
- 実装中に新規Hookやcompact再注入が必要に見えても、#134へ残し、このbranchでは追加しない。
