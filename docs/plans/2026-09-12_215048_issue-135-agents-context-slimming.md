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
  - C: 既存Harnessで機械的に扱われているためrootは高レベル契約だけ残す。
  - D: 重複または常時読み込み不要としてrootから外す。
- 要約、移管、削除の前後で、禁止条件、許可条件、例外条件、停止条件、復旧条件、実行前後の必須確認の意味を変えない。
- `AGENTS.md` に次のRepository-wide契約を直接残す。
  - ユーザーの明示指示と対象範囲を優先する。
  - 関係のない変更を行わない。
  - default branchへ直接commit / pushしない。
  - force pushや未承認の破壊的操作を行わない。
  - 品質ゲートFAILを未確認のまま完了扱いにしない。
  - ユーザー向け成果物、PR、Run Artifact等の言語ルール。
  - Skill routingの入口とRepository固有Inputの所在。
  - Parent / child subagentの高レベル責務境界。
- Gitのbranch確認、rescue branch、ancestry、cherry-pick、reset条件、明示refspec等の詳細は `docs/reference/git-branch-safety.md` を正本とし、rootへ重複させない。
- Run初期化、wrapper、Workflow Level、Run Artifact、manifest、checkpoint、retention、sanitization等の詳細は既存の `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` を優先して集約し、rootには入口契約と参照条件だけを残す。
- Windows Android / Maestroのpreflight、再試行、停止条件、ログ保存等は `android-native-local-validation` SkillとNative runbookを正本とし、rootへ重複させない。
- 個別SubagentのRole、Tool / write制約は `.codex/agents/**` と `docs/reference/codex-implementation-harness.md` を正本とし、rootには個別Roleの長い説明を残さない。
- `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` は現在のRepository adapter責務を維持し、rootと同じSkill Workflowを再定義しない。
- 通常タスク開始時の無条件読み込みから、`docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` の一律参照を外し、必要条件をrootから判別できるようにする。
- rootを短くした代わりに、全Skill / reference / runbookを毎回読む構成にしない。
- `scripts/verify` と `scripts/verify.ps1` の「詳細文言が `AGENTS.md` に直接存在すること」を要求する契約を、責務分離後の正本配置に合わせて更新する。
- `scripts/verify` と `scripts/verify.ps1` で、rootに残すべき安全規則・Skill入口・reference導線と、各詳細正本の存在・必要な契約を検証できる。
- `AGENTS.md` のUTF-8 byte数と行数を変更前後で記録する。token数は新規依存を追加して厳密測定せず、Issueの約2,000〜3,000 tokenは目安として扱う。
- 通常タスク開始時の無条件読み込み量について、変更前後の対象ファイル集合と概算byte数を記録し、変更後が減少していることを確認する。
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

実装では、これらの既存正本を先に確認し、rootから外す内容の受け皿が既にある場合は新規referenceを作らない。

### Key abstractions

- `AGENTS.md`: 常駐するRepository-wide policyとrouting。
- Skill package: 特定種類のタスクでのみ必要なWorkflow、停止条件、Output Contract。
- Repository adapter: Skillへ渡すRepository固有Input、保存先、Product固有契約。
- reference / runbook: Git、Run、Harness、Native等の詳細運用契約。
- `.codex/agents/**`: Subagent個別Roleと権限制約。
- `.codex/rules/**` / Hook / validator / CI: 機械的に判定・強制できる契約。

### Existing tests / validation

- `scripts/verify` と `scripts/verify.ps1` がRepository template / Harness契約を確認している。
- 現在のverifyは、`implementation_worker`、各researcher名、`scripts/new-run.*`、`Report file`、`command-based deletion` 等の文言が `AGENTS.md` に直接存在することも要求している。
- `pnpm run lint:markdown` がMarkdown構造を検証する。
- `pnpm run validate:skills` がSkill package構造とlink integrityを検証する。
- `pnpm run test:repository` がRepository contract testsを実行する。
- `pnpm run verify` がRepository全体の標準検証へ接続されている。

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
- `docs/reference/codex-implementation-harness.md` はRun初期化、wrapper、Workflow Level、Subagent実装フローを既に保持している。
- `docs/reference/run-artifacts.md` はmanifest、evaluation、Hook JSONL、cleanup、Subagent記録の契約を既に保持する。一方、rootにあるretention、sanitization、progress / report等の全詳細が同文書だけで完結しているかは実装時に項目単位で照合する。
- verifyのroot文言固定を更新しなければ、責務分離後にHarness contractがFAILする。

### Assumptions

- Issue #135の目的は責務分離であり、既存Repository-wide policyの強化・緩和は行わない。
- 新規referenceは原則作らない。rootから外す詳細の既存正本が不足する場合は、まず責務が最も近い既存referenceへ追記する。
- `AGENTS.md` のサイズ目安は品質判断の補助であり、byte数やtoken数だけを満たすために必要な契約を削らない。
- 無条件読み込み量の比較は、厳密token課金計算ではなく対象ファイル集合とUTF-8 byte数の比較で十分とする。

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

| 現行領域 | 初期方針 | 移管先 / 残す内容 |
| --- | --- | --- |
| `最初に必ず読むもの` | D / 再構成 | rootを常駐入口とし、`PROJECT_CONTEXT`、ADR、過去Runは条件付き参照へ変更 |
| `モード別の入口ファイル` | A + B | Skill routingはroot、高レベル以外はSkill / adapterへ |
| Run初期化・Run Artifact・実行ループ | B | `codex-implementation-harness.md` / `run-artifacts.md` |
| Progress・ユーザー向けレポート | A + B | 必要な高レベル形式だけroot、計算やcheckpoint詳細はRun関連referenceへ |
| Living Documentation | A + B | 「いつ更新するか」の高レベル条件だけroot。通常タスクでの無条件読込は廃止 |
| Plan / Report保存 | B | `PLANS.md` と既存Run / review persistence契約 |
| 安全性 / スコープ | A + C | 絶対安全規則はroot、機械判定詳細はrules / Hook / safety reference |
| Git Branch Safety | A + B | default branch禁止等はroot、復旧詳細は `git-branch-safety.md` |
| PR言語 | A | 高レベル契約をrootへ残す |
| 必須検証 | A + B + C | gateを無視しない契約はroot、repair / Native / 実装完了詳細は既存Skill / reference / CIへ |
| 言語ポリシー | A | rootへ残す |
| 自律的な調査 | B | planning / repair / harness-improvement Skillへ |
| Subagent | A + B | Parent / child境界のみroot、Role詳細は `.codex/agents/**` とimplementation harnessへ |
| 改善ガバナンス | AまたはB | 既存referenceの受け皿を確認し、常時必要な承認境界だけrootへ残す |
| Safety Harness / auto-net | B + C | `codex-safety-harness.md` / `codex-implementation-harness.md` / rules / Hook |
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
- [ ] 2. 同じルールが `AGENTS.md` と既存reference / Skill / agent定義に重複している箇所を対応付ける。
- [ ] 3. 通常タスク開始時に無条件で読むよう指示されている対象を具体化する。
  - `AGENTS.md`
  - `docs/PROJECT_CONTEXT.md`
  - 「最近のADR」は比較用に最新1件を採用する。
  - 「最近のRun」は比較用に最新1 Runの標準Run Artifactを採用する。
- [ ] 4. 上記対象のUTF-8 byte数と、`AGENTS.md` の行数を記録する。これは比較用evidenceであり、新しいhard gateにはしない。

### 5.2 詳細契約の正本を先に確認・補完する

- [ ] 5. Run関連のroot詳細を `docs/reference/codex-implementation-harness.md` と `docs/reference/run-artifacts.md` へ対応付ける。
- [ ] 6. rootから外すRun契約に既存referenceの不足がある場合だけ、責務が近い既存referenceへ追記する。
  - Run初期化 / wrapper / Workflow Levelは `codex-implementation-harness.md` を優先する。
  - Artifact retention / machine-managed manifest / sanitization / checkpoint / cleanup / evaluationは `run-artifacts.md` を優先する。
  - 同じ契約を両文書へ重複追加しない。
- [ ] 7. Git詳細が `git-branch-safety.md` で完結していることを確認する。不足がなければ同ファイルは変更しない。
- [ ] 8. Native詳細がSkill / Native runbook、Subagent詳細が `.codex/agents/**` / implementation harnessで完結していることを確認する。不足がなければ変更しない。
- [ ] 9. `PLANS.md`、`CODE_REVIEW.md`、`QA_AGENT.md` はRepository adapterとして現状の責務を維持し、root短縮のためだけに内容を増やさない。

### 5.3 `AGENTS.md` を常駐契約へ再構成する

- [ ] 10. 「最初に必ず読むもの」の無条件4項目を廃止し、必要時参照の条件をrootへ明記する。
  - `docs/PROJECT_CONTEXT.md`: Product / architecture / repository contextが変更判断に必要な場合。
  - `docs/adr/`: 対象領域の既存設計判断を変更・依存する場合。
  - `.codex/runs/`: 同一会話・同一タスクのactive Runを継続する場合、または過去Runが調査evidenceとして明示的に必要な場合。
  - `PLANS.md`: Plan作成時。
  - `CODE_REVIEW.md`: review時。
  - `QA_AGENT.md`: Agentic QA時。
  - Native runbook: Native / Androidローカル検証時。
  - Harness / Run reference: 対応するHarness操作やRun運用が必要な場合。
- [ ] 11. Skill routingを高レベル入口として残し、Skill固有Workflow、停止条件、長いChecklistをrootへ置かない。
- [ ] 12. Repository-wide safetyをrootへ残す。少なくともdefault branch直接mutation禁止、破壊的操作、関係のない変更禁止、ユーザー明示指示優先、品質ゲート未確認禁止を保持する。
- [ ] 13. Git safetyは絶対条件と `docs/reference/git-branch-safety.md` を読む条件だけrootへ残し、復旧コマンド列を削る。
- [ ] 14. Run / Harnessは高レベル契約と正本reference導線だけrootへ残す。具体的なCLI option、manifest field、retention列挙、sanitizer例外、Workflow Level表等はrootから外す。
- [ ] 15. Validationは「変更に応じたRepository標準検証を実行し、FAILを未確認で完了扱いにしない」をrootへ残す。Repair loop詳細、Native再試行条件、push後CIの詳細手順は既存の担当文書へ寄せる。
- [ ] 16. SubagentはParentが要件解釈、計画、委譲、結果統合、完了判断を持つこと、childは委譲範囲を越えず独自Runや再委譲をしないこと等の高レベル境界だけrootへ残す。個別agent名ごとの長い責務説明は削る。
- [ ] 17. 言語、PR、Plan保存等で常時必要な短い契約はrootへ残す。
- [ ] 18. 設計変更の経緯や「以前はこうだった」という説明を新しい `AGENTS.md` やreferenceへ書かない。

### 5.4 Harness契約を責務分離後へ合わせる

- [ ] 19. `scripts/verify` の `check_template_contract` を更新する。
  - `AGENTS.md` にSkill入口、主要Repository-wide safety、必要時reference導線があることを確認する。
  - rootから移した詳細文言を `AGENTS.md` に直接要求しない。
  - 既存の詳細正本側で必要な契約を確認する。例: Subagent個別制約は `.codex/agents/*.toml`、Run詳細は `run-artifacts.md` / `codex-implementation-harness.md`、Git詳細は `git-branch-safety.md`。
- [ ] 20. `scripts/verify.ps1` を同じ契約へ更新し、Bash版とPowerShell版で責務分離の判定が食い違わないようにする。
- [ ] 21. 既存のSkill package validationやrepository contract testを壊さない。必要な場合だけ既存テストを更新し、新規Hookテストへ広げない。
- [ ] 22. rootの再肥大化を防ぐための新しいtoken / byte hard limitは追加しない。Issueのサイズ目安はレビュー時の判断材料として扱う。

### 5.5 無条件読み込み量と意味保持を確認する

- [ ] 23. 変更後の無条件読み込み対象を列挙する。通常タスクではroot `AGENTS.md` 以外を一律必須にしないことを確認する。
- [ ] 24. `AGENTS.md` の変更後byte数・行数と、通常タスク開始時の無条件読み込み総量を変更前と比較する。
- [ ] 25. rootを短くした代わりに複数referenceを一括で常時読む記述がないことを確認する。
- [ ] 26. 棚卸し表を使い、各ルールについて移管後の正本またはroot残置先を照合する。意味が変わる短文化を発見した場合は、そのbulletをrootへ戻すか正本referenceを補完する。

## 6. 検証方法

### 文書・参照整合

- `pnpm run lint:markdown`
- `pnpm run validate:skills`
- rootから参照するSkill / reference / adapterのlinkが実在することを確認する。
- `AGENTS.md` 内に、通常タスクで `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`.codex/runs/` を一律必須とする記述が残っていないことを確認する。
- Git / Run / Native / Subagentの詳細がrootへ二重定義されていないことをdiffで確認する。

### Harness契約

- `pnpm run test:repository`
- `bash scripts/verify`
- Windows環境では `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `scripts/verify` と `scripts/verify.ps1` のroot contract assertionsが同じ責務方針になっていることを差分レビューする。
- `.codex/config.toml`、Hook script、rulesを変更していないことを確認する。変更が必要になった場合は#134との境界を再確認し、このIssueへ混ぜない。

### Repository標準検証

- `pnpm run verify`
- 実行環境上の理由で一部を実行できない場合は、未実行項目と代替evidenceをRun ArtifactとPR本文へ明記する。

### サイズ・読込量

- 変更前後の `AGENTS.md` のUTF-8 byte数と行数を比較する。
- 変更前は比較用に `AGENTS.md` + `docs/PROJECT_CONTEXT.md` + 最新ADR 1件 + 最新Run 1件の標準Artifactを概算対象とする。
- 変更後はrootで無条件指定されたファイルだけを対象とする。
- この比較は「無条件読み込みが減った」ことのevidenceとして使い、byte数そのものを合否の唯一の基準にしない。

### 成功判定

次をすべて満たした場合にIssue #135の実装を完了扱いにする。

- rootが常時必要なRepository-wide契約と高レベルrouting中心になっている。
- rootだけ読めば、守るべき絶対条件と、どの状況で次に何を読むかを判断できる。
- 条件付きreferenceの詳細を通常タスクで無条件に読む必要がない。
- 既存policyの意味が変わっていない。
- #117のSkill package責務を重複実装していない。
- #134のHook / compact再注入 / textlintへ範囲を広げていない。
- Bash / PowerShell双方のHarness契約が責務分離後の構造を受理する。
- Markdown、Skill validation、Repository contract、標準verifyが通る、または未実行理由が具体的に説明されている。
- 無条件読み込み対象と概算量が変更前より減っている。

## 7. リスクと未解決論点

### Risks

- **短文化によるpolicy意味変更**: 例外付き禁止や停止条件を一文に縮めると、許可範囲が意図せず変わる可能性がある。bullet単位の棚卸しと正本照合で防ぐ。
- **verify契約の置き去り**: rootだけ変更すると `scripts/verify` / `scripts/verify.ps1` がFAILする。文書移管とcontract assertion更新を同じ実装単位で扱う。
- **referenceへの重複移植**: root削減のために同じ詳細を複数referenceへコピーするとSSOTが悪化する。既存責務に最も近い1箇所へ寄せる。
- **必要時参照が曖昧になる**: rootをリンク集にしすぎると、どの条件で何を読むか判断できなくなる。各referenceにtask conditionを添える。
- **無条件読込が別名で復活する**: 「関連referenceを最初に全部読む」等の記述を追加しない。
- **#134との混線**: size削減のついでにSessionStart Hookやtextlintへ進まない。

### Open questions

- 実装時の棚卸しで、改善ガバナンス等に既存の適切な正本がないことが判明した場合、rootに短い契約として残すことを優先する。新規reference追加は、それでもrootが詳細手順を抱える場合だけ検討する。

## 8. 成果物

### 変更が見込まれるファイル

- `AGENTS.md`
- `docs/reference/run-artifacts.md`（既存正本に不足がある場合）
- `docs/reference/codex-implementation-harness.md`（既存正本に不足がある場合）
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
- 棚卸し・判断経緯・検証結果はIssue / PR / Git履歴とactive Run Artifactで追跡する。

## 9. 備考

- このPlanはIssue #135の実装範囲だけを扱う。
- 実装開始時はmainとの差分とIssue #117関連の既存変更を再確認し、既に解決済みの責務分離をやり直さない。
- 実装中に新規Hookやcompact再注入が必要に見えても、#134へ残し、このbranchでは追加しない。
