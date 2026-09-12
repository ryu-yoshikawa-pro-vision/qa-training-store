# Trigger Eval routing observability remediation plan

- 作成日: 2026-09-12 (JST)
- Status: Proposed（本Runでは実装しない）
- 対象: PR #127 / `refactor/117-pr2-trigger-eval-baseline`
- 調査Run: `.codex/runs/20260912-181316-JST/`
- 基準HEAD: `fd83c55467f1cd818171e0caa85d099b37e904d9`

## 目的

Trigger Evalのrouting evidenceで、repository canonical Skillと環境側の補助Skillを区別して扱えるようにする。`exploratory-qa-train-001`で正しいcanonical identityが、user-level `playwright`との同一turn併用だけで`unknown_skill`になり得る問題を解消する。ただし、未知Skillを無条件に無視して誤routingを隠さないこと、OTelにSkill pointが存在しないケースをHookや`SKILL.md` readで採点しないことを維持する。

## 確認した原因

### A. canonical外Skillの併用（確認済み）

- `playwright`はrepository `.agents/skills/`のcanonical Skillではない。
- `CODEX_HOME`未設定時のCodex user Skill rootにある`playwright/SKILL.md`で、確認できたscopeはuser-levelである。`plugin_id=unattributed`だけからplugin scopeとは判断しない。
- descriptionはreal browserのnavigation、form filling、snapshot／screenshot、data extraction、UI-flow debuggingをterminalから自動化するSkillである。対象queryの一覧→詳細→カートというUI flowとは実行手段として整合するが、queryがPlaywrightを明示した事実はない。
- raw stdoutでは同一turn内でrepository `exploratory-qa/SKILL.md` readの後にuser-level `playwright/SKILL.md`／`playwright-cli/SKILL.md` readがあり、OTelは両方を`status=ok`／`invoke_type=implicit`で観測した。
- 現行observerはcanonical 6件との完全一致だけを受理するため、`[exploratory-qa, playwright]`は`playwright`をunknownとしてfail-closeする。これは現在のADR-0024に沿うが、正当な補助Skill併用と誤routing由来のunknownを区別できない。

### B. AndroidのSkill point欠落（read事実は確認済み、emit原因は未確定）

- 2ケースともstdoutに`exploratory-qa/SKILL.md` readがあるが、OTelはcollection completed・control valid 1・Skill point 0である。
- Codex `rust-v0.153.4`相当のsource／testsでは単純な`Get-Content`、`-Raw`、`-Path`、`-LiteralPath`などはSkill document readとして検出する一方、複合PowerShell readは保守的に分類しないテストがある。
- 今回のreadは複数の`Get-Content`／`Write-Output`等を含む複合`pwsh -Command`であり、単純readと同じemit経路だったかは対象case再実行禁止のため直接確認しない。したがって「Skill routingがなかった」とは断定せず、detector形式差またはtelemetry gapとして扱う。
- 将来の修正でもHook commandや`SKILL.md` readをOTel scoring fallbackにしない。provenance付きOTel pointがない場合はunobservableを維持する。

### C. 327秒timeout（child lifecycleは確認済み、特定のhang箇所は未確認）

- runnerは`CASE_TIMEOUT_MS=327000`までCodex childのcloseを待ち、timer到達時にprocess treeを終了する。OTel collectionはchild close後のquiet／hard-cap windowで、今回のcollection completedは327秒待ちの原因ではない。
- 2ケースとも`turn.completed`／`turn.failed`がなく、最終eventは正常終了するprocess確認またはMaestro MCP callで、最後に長時間server／browser commandが残った証拠はない。trainのstderrにはread-only sandboxへのpatch rejectionが1行あるが、validationのstderrはemptyである。
- よって確認済みなのは「terminal eventなしのagent childがrunner hard capまで生存した」こと。agentがなぜterminalを発行しなかったか、特定commandが内部で待ったかは未確認である。
- OTelでSkill 0件のtrusted absenceが得られても、runner lifecycleがtimeoutなら現行evaluatorはabsenceを`timeout`としてunobservableにする。positive identityが既に得られた場合だけtimeout後もrouting outcomeを保持する既存契約は維持する。

## 現在の処理経路

1. runnerがcase-local OTel receiverをbindし、`codex exec --json --sandbox read-only`を起動する。
2. childが終了するか`327000ms`に到達するまでrunnerは待機する。
3. child close後、OTel observerがquiet／hard-cap windowを収集する。
4. observerはcontrol、metric形状、status、canonical Skill名、unique Skill数を検証する。
5. evaluatorはtrusted positive identityをtimeout後も採用するが、Skill 0件のabsenceはcompleted lifecycleなしではunobservableにする。
6. Hook deltaとstdoutの`SKILL.md` readは診断情報であり、scoringへは流れない。

## 変更後の処理経路（提案）

1. Codex／OTel契約に、Skill pointのscopeまたはsourceを識別できるprovenance（例: repository canonical、宣言済みenvironment auxiliary、未確認unknown）を追加する。現行pointにprovenanceがない場合は推測せず、機能をunobservableとして停止する。
2. observerは、各pointを`canonical`、`declared_auxiliary`、`unexpected_unknown`へ分類し、診断配列には全pointを保持する。
3. `canonical`がちょうど1件で、残りが宣言済みauxiliaryだけの場合、そのcanonical identityをrouting evidenceとして採用する。auxiliaryの存在だけでcanonical identityをunknownにしない。
4. unexpected／provenance不明のunknownが1件でもある場合、現行どおりfail-closeする。canonicalが複数の場合もfail-closeする。auxiliary-onlyをtrusted absenceへ自動変換するかはADRで明示決定し、実装前に未決定のまま進めない。
5. `SKILL.md` read、Hook、`plugin_id=unattributed`、Skill名の文字列alias／normalizationはprovenanceの代替にしない。
6. child close／timeoutのlifecycle契約と`CASE_TIMEOUT_MS`は変更しない。routing-only評価へ変更する場合は、追加Skillの後続emitとcollection windowを含む別ADRが必要である。

## 変更対象ファイル（実装時）

### 必須

- `docs/adr/0024-trigger-eval-otel-observation-contract.md`
  - canonical／declared auxiliary／unexpected unknownのcontract、trusted identity、auxiliary-only、provenance欠落時のfail-closeを明文化する。
- `scripts/evals/otel-skill-observer.ts`
  - provenance付きpointのparse、分類、diagnostic保存、canonical identityの受理条件を実装する。
- `scripts/evals/skill-trigger-evals.ts`
  - observer common signalに分類済みcanonical／auxiliary／unknownを受け渡し、positive timeout保持とnegative absence lifecycle要件を維持する。
- `tests/repository-contract/otel-skill-observer.test.ts`
  - provenance別のobserver contractを追加する。
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - canonical＋declared auxiliary、unknown混在、複数canonical、timeout positive／absenceの回帰を追加する。

### 条件付き

- `scripts/evals/run-skill-trigger-evals.ts`
  - OTel provenance capabilityの受け渡しまたは診断JSONLへの分類結果保存が必要な場合だけ変更する。`CASE_TIMEOUT_MS`短縮、metric受信直後kill、Hook scoring fallbackは実装しない。
- Codex側がprovenanceを提供できない場合の環境manifest／preflightファイル
  - scopeを名前だけで推測せず、宣言済みauxiliary inventoryを明示入力にするために必要な場合だけ設計する。今回のRunでは新規ファイルを決め打ちしない。

## 変更しないもの

- `.agents/skills/**`、dataset、query、`CANONICAL_SKILLS`のalias／normalization。
- `CASE_TIMEOUT_MS=327000`とchild lifecycleの待機契約。
- Result schema version 2。provenanceはobserver／OTel diagnostic境界に閉じ込め、比較可能なcase outcome schemaを変えない。
- Hook scoring fallback。Hookはread／command診断に限定する。
- Qualification、canonical all、8/8、valid baselineの判定ロジック。
- 新dependency、merge conflict解消、PR merge。

## ADR-0024／observer／runner／dataset判断

| 項目 | 判断 | 理由 |
|---|---|---|
| ADR-0024 | 実装時に変更 | 現行unknown fail-closeにprovenance付きauxiliaryの例外条件を追加する必要がある |
| observer | 変更候補（必須） | canonical identityと環境補助Skillを分離してfail-close条件を具体化する |
| runner | 現時点で変更不要 | 327秒はchild lifecycle hard capで、OTel collection待ちではない。routing-only変更は別契約 |
| dataset/query | 変更不要 | queryはexploratory-qaのQA／UI／boundary triggerに整合し、query原因の証拠がない |
| timeout | 現時点で変更不要 | terminal欠落の検出とnegative absenceの不確実性を維持する必要がある |
| Result schema | 変更不要 | provenanceはobserver／diagnostic層に限定する |

## 回帰テスト／検証計画

1. OTel observer unit／repository contract:
   - canonical only → reliable positive。
   - canonical 1件＋provenance付きdeclared auxiliary → canonical identityを保持。
   - unknownまたはprovenance欠落 → unobservable、無条件ignoreなし。
   - canonical複数 → unobservable。
   - duplicate canonicalは既存dedup契約どおり。
2. evaluator contract:
   - positive canonical identity＋timeout → routing outcomeは保持、process lifecycleは`timed_out`。
   - no canonical＋timeout → trusted absenceにせず`timeout` unobservable。
   - Hook／read evidenceだけではoutcomeを生成しない。
3. runtime diagnostic:
   - Codex versionがprovenanceを出せない場合、missing capabilityを明示し、推測採点しない。
   - exact composite PowerShell readは診断fixtureとして扱い、Codexの実runtime挙動をfixtureだけで捏造しない。
4. format／schema／sanitizer／strict collector／`git diff --check`を実装PRで実行する。

## Qualification再実行条件

実装後、次をすべて満たすまでQualificationへ進めない。

- ADR、observer、evaluator contract testがPASSし、provenance capabilityの実値が確認できる。
- fresh detached Target、固定Evaluator SHA、Routing SHA、dataset fingerprint、Codex versionを記録する。
- Negative → Positive → canonical allの順で各段階を1回実行し、段階FAIL時は後続へ進めない。
- unknown／provenance欠落／multiple canonical／timeout absenceが、意図したunobservableとして記録される。
- 3ケースの再実行禁止は本Runだけに適用し、実装後の新Runでユーザー承認済みの評価として扱う。

## canonical all／8/8／valid baseline条件

- canonical all: 全canonical Skillのrouting contractを、同一dataset fingerprint・Codex version・Evaluator／Routing SHAで再測定し、auxiliary併用時もprovenance条件を満たす。
- 8/8: Qualificationの全8ケースが契約どおりobservable passとなり、unobservableをpassへ数えない。
- valid baseline: baseline/currentのResult schema、dataset fingerprint、Codex version、case ID set、Evaluator／Routing provenanceが比較契約を満たし、変更理由とunobservable差分をRun Artifactへ保存する。
- これらは本Runでは実行しない。merge conflictも解消しない。

## リスクと未解決事項

- Codex `0.153.4`の現行OTel pointにscope／sourceがない場合、repository側だけではuser Skillとunexpected unknownを安全に分離できない。Codex側のprovenance提供または明示manifestが前提になる。
- auxiliary-onlyをtrusted absenceとするかunobservableとするかは、negative baselineの意味に影響するためADRで決める。
- composite PowerShell readの実runtime detector挙動は、今回の再実行禁止条件では確定できない。実装後の新Runで、同じ禁止条件を外した専用fixture／diagnosticで確認する。
- `plugin_id=unattributed`はscope証拠ではないため、plugin allowlistは作らない。

## Rollback

実装が既存のcanonical-only評価、negative absenceのlifecycle保護、unknown fail-closeを損なう場合は、実装commitをrevertし、旧ADR契約とcontract testへ戻す。現行Runのraw evidenceと評価結果は削除・上書きしない。
