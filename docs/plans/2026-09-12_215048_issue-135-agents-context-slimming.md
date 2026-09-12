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

root `AGENTS.md` を、Codexが常時保持する必要があるRepository-wide契約と高レベルroutingへ絞る。Run、Git、Native、Subagent、Harness等の詳細は既存のSkill / reference / agent定義を正本として必要時参照にし、通常タスク開始時の無条件読み込み対象を現状より減らす。

### 完了条件（DoD）

- `AGENTS.md` の現行section / ruleを次の4区分で棚卸ししてから変更する。
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
  - repository fileを変更する実装タスクは、Repositoryの実装Harness契約に従って完了判断し、ローカル変更やローカル検証だけで完了扱いにしない。
  - ユーザー向け成果物、PR、Run Artifact等の言語ルール。
  - Skill routingの入口とRepository固有Inputの所在。
  - Parent / child subagentの高レベル責務境界。
- Gitのbranch確認、rescue branch、ancestry、cherry-pick、reset条件、明示refspec等の詳細は `docs/reference/git-branch-safety.md` を正本とし、rootへ重複させない。
- repository file変更時の実装完了条件は `docs/reference/codex-implementation-harness.md` を正本として集約する。commit / push / HEAD確認 / PR最新head / 必須CI等の現行契約を項目単位で照合し、欠落があれば同文書へ補完する。Git操作自体の安全手順は `docs/reference/git-branch-safety.md`、Run Artifactは `docs/reference/run-artifacts.md` を正本とする。
- Run初期化、wrapper、Workflow Level、Run Artifact、manifest、checkpoint、retention、sanitization等の詳細は既存の `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` を優先して集約し、rootには入口契約と参照条件だけを残す。
- Windows Android / Maestroのpreflight、再試行、停止条件、ログ保存等は `android-native-local-validation` SkillとNative runbookを正本とし、rootへ重複させない。
- 個別SubagentのRole、Tool / write制約は `.codex/agents/**` と `docs/reference/codex-implementation-harness.md` を正本とし、rootには個別Roleの長い説明を残さない。
- `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` は現在のRepository adapter責務を維持し、rootと同じSkill Workflowを再定義しない。
- 通常タスク開始時の無条件読み込みから、`docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` の一律参照を外し、必要条件をrootから判別できるようにする。
- rootを短くした代わりに、全Skill / reference / runbookを毎回読む構成にしない。
- `scripts/verify` と `scripts/verify.ps1` の現行root assertionを実装前に1件ずつ棚卸しし、「rootへ残す」「詳細正本側へ移す」「既存の正本側検証と重複するため削除」のいずれかを確定する。
- 上記assertion移管表をBash版とPowerShell版へ共通の意味契約として適用する。実装方法や文字列は同一でなくてもよいが、「何をどこで検証するか」は一致させる。
- `scripts/verify` と `scripts/verify.ps1` で、rootに残すべき安全規則・Skill入口・reference導線と、各詳細正本の存在・必要な契約を検証できる。
- `AGENTS.md` のUTF-8 byte数と行数を変更前後で記録する。token数は新規依存を追加して厳密測定せず、Issueの約2,000〜3,000 tokenは目安として扱う。大幅に上回る場合は、常時必要な契約として残す理由を説明できることを確認する。
- 通常タスク開始時の無条件読み込み量について、変更前後の対象ファイル集合と概算byte数を記録し、変更後が減少していることを確認する。
- 変更前の「最近のADR」「最近のRun」は件数未定義のため、ADR 1件・Run 1件を旧契約の保守的な下限として測定する。比較に使ったADR、Run ID、Run側の計上ファイルを記録する。
- #134の範囲である新規Hook、SessionStart再注入、textlint、Hook契約テストは追加しない。

## 2. 現状理解と前提

### Entry points

- root契約: `AGENTS.md`
- Plan adapter: `PLANS.md`
- Review adapter: `CODE_REVIEW.md`
- Agentic QA adapter: `QA_AGENT.md`
- 実装Harness詳細: `docs/reference/codex-implementation-harness.md`
- Run Artifact詳細: `docs/reference/run-artifacts.md`
- Git安全詳細: `docs/reference/git-branch-safety.md`
- Safety Harness詳細: `docs/reference/codex-safety-harness.md`
- Scope契約: `docs/reference/change-scope-policy.md`
- Skill: `.agents/skills/**`
- Subagent定義: `.codex/agents/**`
- Native Skill: `.agents/skills/android-native-local-validation/**`
- Native runbook: `docs/native/windows-android-local-validation.md`、`docs/native/windows-android-troubleshooting.md`
- 機械的安全規則: `.codex/rules/**`、`.codex/rules-auto-net/**`、`.codex/hooks/**`
- Harness契約検証: `scripts/verify`、`scripts/verify.ps1`

### Main flow

現状のroot `AGENTS.md` は、タスク開始時の無条件参照、Skill routing、Run初期化・保持・sanitization、進捗計算、ユーザー向け報告、Living Documentation、Plan / Report保存、Git safety、PR言語、品質ゲート、実装完了条件、調査、Subagent、改善ガバナンス、Safety Harness、auto-net、Lightweight、Workflow Levelまで直接保持している。

一方、同じ詳細責務の多くは既に次へ分離済みである。

- Run / wrapper / Workflow Level: `docs/reference/codex-implementation-harness.md`
- Run manifest / evaluation / Hook JSONL / cleanup / Subagent記録: `docs/reference/run-artifacts.md`
- Git復旧: `docs/reference/git-branch-safety.md`
- Skill固有Workflow: `.agents/skills/<skill>/`
- Native: `android-native-local-validation` Skill + Native runbook
- Subagentの個別制約: `.codex/agents/*.toml`
- 危険操作の機械判定: `.codex/rules/**`、`.codex/hooks/pre_tool_use_policy.mjs`

ただし、機械的なSafety実装はすべての操作経路を一律に覆うとは限らない。Hook matcher外の操作や部分的なrulesがある場合、その契約を「機械強制済み」とみなしてrootから完全に外さない。

また、現行 `AGENTS.md` が持つrepository file変更時の実装完了条件は、Git safety、Run Artifact、CI確認までをまたぐRepository-wide契約である。実装では、これを `docs/reference/codex-implementation-harness.md` に集約し、Git操作の安全手順とRun Artifact責務は既存の各正本へ分離する。

実装では、これらの既存正本を先に確認し、rootから外す内容の受け皿が既にある場合は新規referenceを作らない。

### Key abstractions

- `AGENTS.md`: 常駐するRepository-wide policyとrouting。
- Skill package: 特定種類のタスクでのみ必要なWorkflow、停止条件、Output Contract。
- Repository adapter: Skillへ渡すRepository固有Input、保存先、Product固有契約。
- reference / runbook: Git、Run、Harness、Native等の詳細運用契約。
- `.codex/agents/**`: Subagent個別Roleと権限制約。
- `.codex/rules/**` / Hook / validator / CI: 機械的に判定・強制できる契約。ただし、対象操作のすべての実行経路を既存実装が捕捉できる場合に限り、rootから詳細を外す根拠として扱う。

### Existing tests / validation

- `scripts/verify` と `scripts/verify.ps1` がRepository template / Harness契約を確認している。
- 現在のverifyは、`implementation_worker`、各researcher名、`scripts/new-run.*`、`run.json`、`Report file`、`command-based deletion`、Native delegation関連等の文言が `AGENTS.md` に直接存在することも要求している。
- 同じverify内で `.codex/agents/*.toml` 等の詳細正本も個別に検証しているため、root assertionをそのまま残すと責務重複が継続し、単に削除すると契約検証が欠落する可能性がある。
- Bash版とPowerShell版は検証対象の意味を揃える必要があるが、現状のassertion構成は完全に同一ではない。
- `pnpm run lint:markdown` がMarkdown構造を検証する。
- `pnpm run validate:skills` がSkill package構造とlink integrityを検証する。
- `pnpm run test:repository` がRepository contract testsを実行する。
- `pnpm run verify` がRepository全体の標準検証へ接続されている。ただし、`scripts/verify` / `scripts/verify.ps1` のHarness contract確認は個別実行を省略しない。

### Safe change surface

主な変更候補は次の範囲に限定する。

- `AGENTS.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `scripts/verify`
- `scripts/verify.ps1`

次は内容不足や参照不整合が確認された場合だけ変更する。

- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `.agents/skills/**`
- `.codex/agents/**`
- Native runbook

### Current understanding

- #117でSkill packageの責務分離は既に進んでおり、このIssueでSkill Workflowを再構成する必要はない。
- `docs/reference/git-branch-safety.md` はGitの復旧詳細を既に保持しており、rootの詳細Git手順を移すための新規referenceは不要と考える。
- `docs/reference/codex-implementation-harness.md` はRun初期化、wrapper、Workflow Level、Subagent実装フローを既に保持している。一方、repository file変更時のcommit / push / HEAD確認 / PR最新head / 必須CIまでを含む完了条件は、現行rootとの項目照合を行い、必要な内容を同文書へ集約する。
- `docs/reference/run-artifacts.md` はmanifest、evaluation、Hook JSONL、cleanup、Subagent記録の契約を既に保持する。一方、rootにあるretention、sanitization、progress / report等の全詳細が同文書だけで完結しているかは実装時に項目単位で照合する。
- `docs/reference/codex-safety-harness.md`、`.codex/rules/**`、HookはSafetyの一部を機械判定するが、実行経路ごとの捕捉範囲を確認せずCへ分類しない。
- verifyのroot文言固定を更新しなければ、責務分離後にHarness contractがFAILする。

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
- 既存Git safetyの緩和・強化。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点では実装を止める質問はない。Issue本文が責務境界、非目標、完了条件を具体的に定義している。

実装中に次のどれかが発生した場合だけ、Planを勝手に拡張せずIssue境界へ戻る。

- rootから外したい詳細に既存の正本がなく、新規referenceを作るかRepository-wide policy自体を変更しないと移管できない。
- 現行の複数文書で同じルールが異なる意味になっており、単純な責務移管では解消できない。
- verify契約を更新するために新規Hook / validator実装が必要になる。

### 仮定してよい細部

- 見出し構成や文章順は、契約の意味と参照条件が保たれる範囲で整理してよい。
- rootの具体的な文量は固定しない。
- 既存referenceに同一契約が十分記載されている場合、reference本文を変更せずroot側だけ縮小してよい。

### 未回答の重要質問

- なし。

## 4. 影響範囲

### `AGENTS.md` sectionの初期分類

実装開始時に現行全文を再確認し、少なくとも次の方針で項目単位に分類する。section全体を機械的に同じ区分へ入れず、例外条件を含むbullet単位まで確認する。

Cは「関連するHook / rulesが存在する」という理由だけでは選ばない。対象操作のすべての実行経路で既存Harnessが判定・拒否できることを確認できた場合だけCとする。Hook対象外、部分的なrules、fail-closeしない経路がある場合はAまたはBを併用する。

| 現行領域 | 初期方針 | 移管先 / 残す内容 |
| --- | --- | --- |
| `最初に必ず読むもの` | D / 再構成 | rootを常駐入口とし、`PROJECT_CONTEXT`、ADR、過去Runは条件付き参照へ変更 |
| `モード別の入口ファイル` | A + B | Skill routingはroot、高レベル以外はSkill / adapterへ |
| Run初期化・Run Artifact・実行ループ | B | `codex-implementation-harness.md` / `run-artifacts.md` |
| Progress・ユーザー向けレポート | A + B | 必要な高レベル形式だけroot、計算やcheckpoint詳細はRun関連referenceへ |
| Living Documentation | A + B | 「いつ更新するか」の高レベル条件だけroot。通常タスクでの無条件読込は廃止 |
| Plan / Report保存 | B | `PLANS.md` と既存Run / review persistence契約 |
| 安全性 / スコープ | A + C | delete / rename / move、Git mutation、未承認破壊操作等の高レベル禁止はroot。機械判定詳細は全経路を捕捉できる範囲だけC |
| Git Branch Safety | A + B | default branch禁止等はroot、復旧詳細は `git-branch-safety.md` |
| PR言語 | A | 高レベル契約をrootへ残す |
| 必須検証 | A + B + C | gateを無視しない契約と実装完了判断の入口はroot。完了詳細はimplementation harness、repair / Native詳細は各Skill / referenceへ |
| 実装タスク完了条件 | A + B | rootは「Repositoryの実装Harness契約に従い、ローカル変更だけで完了扱いにしない」という入口。commit / push / HEAD / PR最新head / 必須CIはimplementation harnessへ |
| 言語ポリシー | A | rootへ残す |
| 自律的な調査 | B | planning / repair / harness-improvement Skillへ |
| Subagent | A + B | Parent / child境界のみroot、Role詳細は `.codex/agents/**` とimplementation harnessへ |
| 改善ガバナンス | AまたはB | 既存referenceの受け皿を確認し、常時必要な承認境界だけrootへ残す |
| Safety Harness / auto-net | A + B + C | destructive operationでSafety referenceへ到達できる入口はroot。詳細は `codex-safety-harness.md` / implementation harness / rules / Hook |
| Lightweight / Workflow Level | B | `codex-implementation-harness.md` |

### Files to inspect

実装時に最低限再確認する。

- `AGENTS.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/`
- `.codex/runs/`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `docs/reference/change-scope-policy.md`
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `.agents/skills/**/SKILL.md` と、rootから参照するpackage-local reference
- `.codex/agents/*.toml`
- `.codex/rules/**`
- `.codex/rules-auto-net/**`
- `.codex/hooks/**`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`
- `scripts/verify`
- `scripts/verify.ps1`
- `tests/repository-contract/validate-skills.test.ts`
- `package.json`

## 5. 変更方針

### 5.1 変更前の棚卸しと測定

- [ ] 1. 現行 `AGENTS.md` の各section / bulletをA〜Dへ分類し、rootに残す理由または移管先を記録する。
- [ ] 2. C候補は、Hook matcher、rules、validator、CIを経路単位で確認する。`apply_patch` 等の対象外経路、部分的なrules、fail-closeしない経路がある場合はC単独にしない。
- [ ] 3. 同じルールが `AGENTS.md` と既存reference / Skill / agent定義に重複している箇所を対応付ける。
- [ ] 4. `scripts/verify` / `scripts/verify.ps1` が `AGENTS.md` に直接要求している各assertionを列挙し、後述のassertion移管表へ対応付ける。
- [ ] 5. 通常タスク開始時に無条件で読むよう指示されている対象を具体化する。
  - `AGENTS.md`
  - `docs/PROJECT_CONTEXT.md`
  - 「最近のADR」は件数未定義のため、比較用に最新1件を旧契約の保守的な下限として採用する。
  - 「最近のRun」は件数未定義のため、比較用に最新1 Runの標準Run Artifactを旧契約の保守的な下限として採用する。
- [ ] 6. 比較に使うADRのpath、Run ID、Run側で計上するArtifact一覧を記録する。
- [ ] 7. 上記対象のUTF-8 byte数と、`AGENTS.md` の行数を記録する。これは比較用evidenceであり、新しいhard gateにはしない。

### 5.2 詳細契約の正本を先に確認・補完する

- [ ] 8. Run関連のroot詳細を `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` へ対応付ける。
- [ ] 9. rootから外すRun契約に既存referenceの不足がある場合だけ、責務が近い既存referenceへ追記する。
  - Run初期化 / wrapper / Workflow Levelは `codex-implementation-harness.md` を優先する。
  - Artifact retention / machine-managed manifest / sanitization / checkpoint / cleanup / evaluationは `run-artifacts.md` を優先する。
  - 同じ契約を両文書へ重複追加しない。
- [ ] 10. 現行 `AGENTS.md` の「実装タスク完了条件」を項目単位で棚卸しし、次の責務へ分ける。
  - root: repository file変更時はRepositoryの実装Harness契約に従い、ローカル変更・ローカル検証だけで完了扱いにしないという入口契約。
  - `docs/reference/codex-implementation-harness.md`: 変更、ローカル検証、Run Artifact確認、commit、push、HEAD確認、PR最新head、必須CI等の完了フロー。
  - `docs/reference/git-branch-safety.md`: branch、push、refspec、復旧等のGit安全手順。
  - `docs/reference/run-artifacts.md`: Run Artifactの保存・評価・証跡契約。
- [ ] 11. `codex-implementation-harness.md` に現行の実装完了条件が不足している場合だけ補完する。通常PRで確認する既存CI名等も現行契約から落とさない。
- [ ] 12. Git詳細が `git-branch-safety.md` で完結していることを確認する。不足がなければ同ファイルは変更しない。
- [ ] 13. Safety詳細について、delete / rename / move、Git mutation、`apply_patch`、明示承認が必要な破壊的操作の各経路を確認する。機械強制されない経路があれば、rootの高レベル禁止と `docs/reference/codex-safety-harness.md` への条件付き導線を維持する。
- [ ] 14. Native詳細がSkill / Native runbook、Subagent詳細が `.codex/agents/**` / implementation harnessで完結していることを確認する。不足がなければ変更しない。
- [ ] 15. `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` はRepository adapterとして現状の責務を維持し、root短縮のためだけに内容を増やさない。

### 5.3 `AGENTS.md` を常駐契約へ再構成する

- [ ] 16. 「最初に必ず読むもの」の無条件4項目を廃止し、必要時参照の条件をrootへ明記する。
  - `docs/PROJECT_CONTEXT.md`: Product / architecture / repository contextが変更判断に必要な場合。
  - `docs/adr/`: 対象領域の既存設計判断を変更・依存する場合。
  - `.codex/runs/`: 同一会話・同一タスクのactive Runを継続する場合、または過去Runが調査evidenceとして明示的に必要な場合。
  - `PLANS.md`: Plan作成時。
  - `CODE_REVIEW.md`: review時。
  - `QA_AGENT.md`: Agentic QA時。
  - Native runbook: Native / Androidローカル検証時。
  - `docs/reference/codex-safety-harness.md`: delete / rename / move等の破壊的操作、またはSafety Harnessの詳細判断が必要な場合。
  - Harness / Run reference: 対応するHarness操作やRun運用が必要な場合。
- [ ] 17. Skill routingを高レベル入口として残し、Skill固有Workflow、停止条件、長いChecklistをrootへ置かない。
- [ ] 18. Repository-wide safetyをrootへ残す。少なくともdefault branch直接mutation禁止、force push、delete / rename / move等の未承認破壊操作禁止、Git mutationはGit safetyに従うこと、関係のない変更禁止、ユーザー明示指示優先、品質ゲート未確認禁止を保持する。
- [ ] 19. Git safetyは絶対条件と `docs/reference/git-branch-safety.md` を読む条件だけrootへ残し、復旧コマンド列を削る。
- [ ] 20. Run / Harnessは高レベル契約と正本reference導線だけrootへ残す。具体的なCLI option、manifest field、retention列挙、sanitizer例外、Workflow Level表等はrootから外す。
- [ ] 21. repository file変更時の完了判断について、「Repositoryの実装Harness契約に従い、ローカル変更・ローカル検証だけで完了扱いにしない」という入口をrootへ残す。commit / push / HEAD確認 / PR最新head / 必須CI等の詳細は `docs/reference/codex-implementation-harness.md` へ集約する。
- [ ] 22. Validationは「変更に応じたRepository標準検証を実行し、FAILを未確認で完了扱いにしない」をrootへ残す。Repair loop詳細、Native再試行条件、CI確認の具体手順は既存の担当文書へ寄せる。
- [ ] 23. SubagentはParentが要件解釈、計画、委譲、結果統合、完了判断を持つこと、childは委譲範囲を越えず独自Runや再委譲をしないこと等の高レベル境界だけrootへ残す。個別agent名ごとの長い責務説明は削る。
- [ ] 24. 言語、PR、Plan保存等で常時必要な短い契約はrootへ残す。
- [ ] 25. 設計変更の経緯や「以前はこうだった」という説明を新しい `AGENTS.md` やreferenceへ書かない。

### 5.4 Harness契約を責務分離後へ合わせる

実装前に、現行root assertionを次の移管方針へ対応付ける。表にないroot assertionも同じ基準で1件ずつ追加し、未分類のまま削除または残置しない。

| 現行root assertion | 実装後の扱い | 検証先 / 判断基準 |
| --- | --- | --- |
| `.agents/skills/feature-plan/SKILL.md` / `.agents/skills/code-review/SKILL.md` 等のSkill入口 | rootへ残す | rootの高レベルroutingとRepository固有Inputへの導線を検証する。Skill内部の詳細Workflowはrootへ要求しない |
| `scripts/new-run.sh` / `scripts/new-run.ps1` | rootにRun開始入口として必要な最小導線だけ残す | 具体的なRun初期化手順は `docs/reference/codex-implementation-harness.md` で検証する |
| `run.json` | rootから外す | `docs/reference/run-artifacts.md` のRun Artifact契約で検証する |
| `Report file` | rootから外す | Report persistenceを所有する既存Run / review契約で検証する。移管先が曖昧なら実装前に責務を確定し、単純削除しない |
| `command-based deletion` | rootの高レベル安全契約は残す | delete / rename / moveの安全入口をrootで確認し、詳細は `docs/reference/codex-safety-harness.md` と既存rules / Hookの実装範囲を検証する |
| `implementation_worker`、`quality_gate_runner`、各researcher | rootから個別名要求を外す | `.codex/agents/**` と `docs/reference/codex-implementation-harness.md` でRole / permission契約を検証する |
| `Codex native delegation` | Parent / childの高レベル契約として必要な意味だけrootへ残す | 詳細なdelegate条件はimplementation harness / agent定義で検証する |
| `No child subagent delegation` | rootに再委譲禁止の高レベル境界を残す | `.codex/config.toml` の `max_depth = 1` と各Agent定義のrecursive delegation禁止を検証する |
| Native delegation / Native validation marker | rootから詳細文言を外す | `android-native-local-validation` Skill、Native runbook、該当Agent定義で検証する |
| repair / harness-improvement関連reference | 必要時参照の入口だけrootへ残す | 各Skill / reference側の契約とlink integrityを検証する |

- [ ] 26. `scripts/verify` の `check_template_contract` を、上記移管表へ合わせて更新する。
  - `AGENTS.md` にSkill入口、主要Repository-wide safety、実装完了判断の入口、必要時reference導線があることを確認する。
  - rootから移した詳細文言を `AGENTS.md` に直接要求しない。
  - 既存の詳細正本側で必要な契約を確認する。
  - 既に同じ正本契約を別assertionで検証している場合は重複assertionを削除してよいが、検証対象の意味自体は失わない。
- [ ] 27. `scripts/verify.ps1` にも同じ移管表を適用する。Bash版とPowerShell版で実装方法や検索文字列は異なってもよいが、「どの意味をどの正本で検証するか」は一致させる。
- [ ] 28. Bash版・PowerShell版の双方について、移管表の各行が「root残置 / 正本移管 / 重複削除」のどれで実装されたかdiffで照合する。
- [ ] 29. 既存のSkill package validationやrepository contract testを壊さない。必要な場合だけ既存テストを更新し、新規Hookテストへ広げない。
- [ ] 30. rootの再肥大化を防ぐための新しいtoken / byte hard limitは追加しない。Issueのサイズ目安はレビュー時の判断材料として扱う。

### 5.5 無条件読み込み量と意味保持を確認する

- [ ] 31. 変更後の無条件読み込み対象を列挙する。通常タスクではroot `AGENTS.md` 以外を一律必須にしないことを確認する。
- [ ] 32. `AGENTS.md` の変更後byte数・行数と、通常タスク開始時の無条件読み込み総量を変更前と比較する。
- [ ] 33. 変更前のADR 1件・Run 1件は旧契約の「最近」の保守的な下限として扱い、実際の旧契約が1件に限定されていたとは記載しない。
- [ ] 34. 比較結果には、対象 `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、ADR path、Run ID、Run側で計上したArtifact、各UTF-8 byte数を残す。
- [ ] 35. rootを短くした代わりに複数referenceを一括で常時読む記述がないことを確認する。
- [ ] 36. 棚卸し表を使い、各ルールについて移管後の正本またはroot残置先を照合する。意味が変わる短文化を発見した場合は、そのbulletをrootへ戻すか正本referenceを補完する。

## 6. 検証方法

### 文書・参照整合

- `pnpm run lint:markdown`
- `pnpm run validate:skills`
- rootから参照するSkill / reference / adapterのlinkが実在することを確認する。
- `AGENTS.md` 内に、通常タスクで `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` を一律必須とする記述が残っていないことを確認する。
- Git / Run / Native / Subagentの詳細がrootへ二重定義されていないことをdiffで確認する。
- repository file変更時の実装完了条件について、rootの入口契約と `codex-implementation-harness.md` の詳細契約を照合し、現行policyのcommit / push / HEAD / PR最新head / 必須CI等が欠落していないことを確認する。

### Safety分類

- A / B / C / D棚卸しでCとした項目について、Hook matcher、rules、validator、CIのどれが対象経路を捕捉するか記録する。
- `apply_patch`、delete、rename / move、Git mutation、明示承認が必要な破壊的操作について、Hook対象外または部分強制の経路がある場合はrootの高レベル契約が残っていることを確認する。
- destructive operationから `docs/reference/codex-safety-harness.md` へ到達できる条件付き導線を確認する。

### Harness契約

- `pnpm run test:repository`
- `bash scripts/verify`
- Windows環境では `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `pnpm run verify` だけで上記Harness verifyを実行した扱いにせず、Bash / PowerShell版を個別に確認する。
- `scripts/verify` と `scripts/verify.ps1` のroot contract assertionsをassertion移管表と照合し、同じ意味契約になっていることを差分レビューする。
- rootから削除したassertionについて、正本側の検証または既存の同等assertionが残っていることを確認する。
- `.codex/config.toml`、Hook script、rulesを変更していないことを確認する。変更が必要になった場合は#134との境界を再確認し、このIssueへ混ぜない。

### Repository標準検証

- `pnpm run verify`
- 実行環境上の理由で一部を実行できない場合は、未実行項目と代替evidenceをRun ArtifactとPR本文へ明記する。

### サイズ・読込量

- 変更前後の `AGENTS.md` のUTF-8 byte数と行数を比較する。
- 変更前は `AGENTS.md` + `docs/PROJECT_CONTEXT.md` + 最新ADR 1件 + 最新Run 1件の標準Artifactを計測する。ただし「最近」の件数は旧契約で固定されていないため、この値は変更前の保守的な下限として扱う。
- 比較記録には、採用したADRのpath、Run ID、Run側で計上したArtifact一覧、各ファイルのUTF-8 byte数を含める。
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
- repository file変更時の実装完了判断について、rootからimplementation harnessへ到達でき、commit / push / HEAD / PR最新head / 必須CI等の現行契約が正本側で保持されている。
- 条件付きreferenceの詳細を通常タスクで無条件に読む必要がない。
- 既存policyの意味が変わっていない。
- #117のSkill package責務を重複実装していない。
- #134のHook / compact再注入 / textlintへ範囲を広げていない。
- Bash / PowerShell双方のHarness契約が共通のassertion移管表に沿って責務分離後の構造を受理する。
- rootから外したverify assertionの意味が、正本側の検証または既存同等assertionとして残っている。
- Markdown、Skill validation、Repository contract、Bash / PowerShell Harness verify、標準verifyが通る、または未実行理由が具体的に説明されている。
- 無条件読み込み対象と概算量が、変更前の保守的な下限より減っている。

## 7. リスクと未解決論点

### Risks

- **短文化によるpolicy意味変更**: 例外付き禁止や停止条件を一文に縮めると、許可範囲が意図せず変わる可能性がある。bullet単位の棚卸しと正本照合で防ぐ。
- **機械強制範囲の過大評価**: Hookやrulesが存在するだけでCへ分類すると、`apply_patch` 等の対象外経路から安全契約が抜ける。経路単位で捕捉範囲を確認し、部分強制はrootまたはreferenceを維持する。
- **実装完了条件の欠落**: rootからCIやGit詳細を削る際に、commit / push / HEAD / PR最新head / 必須CI等のRepository-wide policyが正本へ移らない可能性がある。implementation harnessへ項目単位で対応付ける。
- **verify契約の置き去り**: rootだけ変更すると `scripts/verify` / `scripts/verify.ps1` がFAILする。文書移管とcontract assertion更新を同じ実装単位で扱う。
- **verify契約の単純削除**: root assertionを消すだけでは回帰検出が弱くなる。assertion移管表で検証先を確定し、同じ意味の検証を残す。
- **Bash / PowerShellの契約差**: 両実装の検索文字列を揃えること自体を目的にせず、共通の移管表に対して同じ意味を検証しているかを確認する。
- **referenceへの重複移植**: root削減のために同じ詳細を複数referenceへコピーするとSSOTが悪化する。既存責務に最も近い1箇所へ寄せる。
- **必要時参照が曖昧になる**: rootをリンク集にしすぎると、どの条件で何を読むか判断できなくなる。各referenceにtask conditionを添える。
- **無条件読込が別名で復活する**: 「関連referenceを最初に全部読む」等の記述を追加しない。
- **読込量の変更前値を過大解釈する**: ADR 1件・Run 1件は旧契約の実際の件数ではなく下限である。比較記録に対象を明示し、上限や正確な旧読込量として扱わない。
- **#134との混線**: size削減のついでにSessionStart Hookやtextlintへ進まない。

### Open questions

- 実装時の棚卸しで、改善ガバナンス等に既存の適切な正本がないことが判明した場合、rootに短い契約として残すことを優先する。新規reference追加は、それでもrootが詳細手順を抱える場合だけ検討する。
- `Report file` 等、現行root assertionの一部について既存の正本が複数候補にまたがる場合は、5.4の移管表を実装前に確定してから変更する。正本を確定できないままassertionを削除しない。

## 8. 成果物

### 変更が見込まれるファイル

- `AGENTS.md`
- `docs/reference/run-artifacts.md`（既存正本に不足がある場合）
- `docs/reference/codex-implementation-harness.md`（既存正本に不足がある場合。実装タスク完了条件の不足があればここへ集約）
- `scripts/verify`
- `scripts/verify.ps1`

### 条件付き変更

- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `QA_AGENT.md`
- `.agents/skills/**`
- `.codex/agents/**`
- Native runbook

これらは、rootから移す契約の正本が不足している、または参照不整合が確認された場合だけ変更する。

### 変更しない範囲

- `.codex/config.toml`
- 新規Hook
- textlint設定
- Product code / test behavior
- Skill package構造
- Run schema

### 付随ドキュメント

- 新規の移行履歴文書や責務一覧文書は作成しない。
- 棚卸し、assertion移管表、判断経緯、検証結果はIssue / PR / Git履歴とactive Run Artifactで追跡する。

## 9. 備考

- このPlanはIssue #135の実装範囲だけを扱う。
- 実装開始時はmainとの差分とIssue #117関連の既存変更を再確認し、既に解決済みの責務分離をやり直さない。
- 実装中に新規Hookやcompact再注入が必要に見えても、#134へ残し、このbranchでは追加しない。
