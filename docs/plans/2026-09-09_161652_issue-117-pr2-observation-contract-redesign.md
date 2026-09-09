# Issue #117 PR2 Trigger Eval observation / evaluation contract 再設計計画

> Status: 実装前の設計Plan（今回の作業では実装・canonical `all`を行わない）
>
> 対象: PR #127 / branch `refactor/117-pr2-trigger-eval-baseline`

## 0. 依頼概要

### 0.1 目的

Issue #117 PR2「Trigger Eval baseline」について、Skill description変更前後のrouting性能を比較できる観測・評価契約を再設計する。現在の契約は、Skill readの観測とtask全体のterminal completionを一つの判定へ結合している。そのため、routing evidenceが得られた後にHost taskが長時間実行されるだけで、routing結果まで`unobservable`として失われる。

今回のPlanでは、PR2が本当に測る対象を明確にし、positive presence、absence、process lifecycleを別々に扱う最小設計を決める。実装はこのPlanの承認後の別作業とする。

### 0.2 背景

最新のEnvironment Qualificationでは、negative controlは`59.1266秒`で`turn.completed`に到達し、Skill readなしを確定できた。一方、positive controlではprocess開始から約133秒後に実際の`feature-plan/SKILL.md` readが発生したにもかかわらず、terminalは`367.7009秒`後だった。現在のrunner固定timeoutは`327_000ms`であり、現行`deriveRoutingObservation`はtimeoutを最初に判定するため、途中のread evidenceを`observed_skills: null`へ落とす。

さらに、実際のcommandは次の形で、現行の4つの完全一致selectorに含まれなかった。

```text
Get-Content -LiteralPath '.agents\skills\feature-plan\SKILL.md' -Raw
```

従って、単なるHost latencyの問題ではなく、routing observationの終了条件とcommand evidenceの表現契約にも問題がある。

### 0.3 今回の成果物

- 新しい設計Plan
- 必要な調査事実と設計判断を記録したactive Run Artifact
- PR #127本文の既存Gate FAILを保持した次対応Plan path

以下は今回実施しない。

- `scripts/evals/**`、runner、selector、scoringの実装変更
- dataset query、`expected_skill`、boundary、case IDの変更
- Skill description、`AGENTS.md` routing意味契約、Hook実装、timeout値の変更
- canonical `all`、case retry、unobservable retry、PR merge

## 1. ゴール / 完了条件

### 1.1 PR2の測定対象

PR2の主測定対象は、single-intent queryに対する**initial Skill routing**である。現在のHostからrouting decisionそのものを表すnative eventは得られないため、実装時は次の観測可能なproxyを使う。

> `first trusted canonical SKILL.md direct read` = `initial routing evidence proxy`

これは「モデル内部の選択」や「後続workflowでのSkill利用」を直接証明する定義ではない。後続readを含む実行全体をPR2のrouting結果とみなさず、proxyの限界をartifactとcomparison provenanceへ残す。

### 1.2 設計Planの完了条件

- 現行契約の問題を、実測timing、Hook evidence、selector実装、既存Runから説明できる。
- Candidate A〜Dを比較し、Issue #117 PR2の目的に対する推奨案を一つ選んでいる。
- `expected_skill != null`、`expected_skill = null`、positive read、absence、timeout、process failure、複数readを含むdecision tableがある。
- routing resultとprocess lifecycleの保存方法、`observed_skills`/`outcome`/`unobservable_reason`の互換方針が明確である。
- structured evidence優先、fallback selectorのbounded grammar、general shell parserを作らない境界が明確である。
- 8 boundary-side validity、PR2/PR6境界、comparison provenance、旧invalid artifactの扱い、canonical rerun条件が明確である。
- 実装対象file、tests、validation、rollback/invalidation、scope guardが実装者の追加判断なしに着手できる粒度である。

### 1.3 将来実装後のDoD

これは今回達成しない実装フェーズのDoDである。

- 新contract marker付きのresultが24 caseの固定dataset fingerprintを記録する。
- `outcome`はrouting result、`process_lifecycle`はprocess状態として別々に出力される。
- positive readがtrustedならterminal completionの遅延やtimeoutでrouting resultを消さない。
- readなしの`false_negative`/null `pass`はtrusted absence completion後だけ確定する。
- canonical `all`は従来どおり4 boundary × 2 expected side = 8 sideを最低1 observable caseで満たす。
- 旧contractのartifactと比較せず、新contractで取得した最初のvalid canonical resultをPR3 baselineにする。

## 2. 現状理解と証拠

### 2.1 Repository / PR状態

調査時点のRepository状態は次のとおりである。

- current branch: `refactor/117-pr2-trigger-eval-baseline`
- PR #127: `OPEN`、base `main`、head branch一致
- current HEAD: `11c90377dedb04b0c7a422719dd30d7e6c4439a6`
- `origin/main`: `f7cc237d8ca719646d9654fba2129732b6eab457`
- sourceの未コミット差分: 今回のactive Runと新Planを除きなし
- 最新Environment Qualification Run: `.codex/runs/20260908-004640-JST/`
- 今回のactive Run: `.codex/runs/20260909-160634-JST/`

`origin/main`のrouting / observation関連差分を確認したが、今回の設計判断を変えるincoming source差分はなかった。現行PR本文のGate FAIL、canonical未実行、valid baseline未取得は維持する。

### 2.2 PR2が区別すべき五つの事象

| 記号 | 事象 | PR2での扱い |
|---|---|---|
| A | Skill routing / initial Skill selection | 主測定対象。ただしnative decision eventがないためfirst canonical readをproxyにする |
| B | Skillが実際に`SKILL.md`をreadした事実 | Aを推定するtrusted observable evidence。Aそのものとは表現しない |
| C | Skill read後のtask execution | PR2のrouting scoreから分離。必要なprocess lifecycleだけ記録する |
| D | task全体の成功 / 失敗 | PR2 routing outcomeとは別のhealth / execution情報 |
| E | `turn.completed` / `turn.failed`までのprocess lifecycle | routing resultを上書きしない別dimension |

### 2.3 現行の主経路

現行実装の論理は次のようにterminal-boundである。

```text
Codex child実行
  -> Hook deltaをchild close後に取得
  -> stdoutからtrusted terminalを確定
  -> timed_out / process failureを先に判定
  -> Hook parse / selectorを確認
  -> canonical Skillの全distinct setを作る
  -> set-based scoring
```

`run-skill-trigger-evals.ts`では`CASE_TIMEOUT_MS = 327_000`のtimerがchildを停止し、`close` callback内でstdoutのterminalをparseする。`skill-trigger-evals.ts`の`deriveRoutingObservation`はtimeout、process failure、terminal欠落、Hook failure、selector failureの順に`observed_skills: null`を返し、terminalが`turn.failed`かつSkill read 0件の場合も`lifecycle_failure`としている。observableになった場合だけ`observed_skills`のsetを`scoreRouting`へ渡す。

### 2.4 Environment Qualificationの実測

`.codex/runs/20260908-004640-JST/observation-probe.md`と`evaluation.json`に保存された事実は次のとおりである。

| Control | terminal | timing | Skill read | 現行selector | 判定 |
|---|---|---:|---|---|---|
| negative | `turn.completed` | `59.1266秒` | なし | `[]` | PASS |
| positive | `turn.completed` | `367.7009秒` | `feature-plan/SKILL.md`を約133秒後にread | `[]` | FAIL |

- positive actual command: `Get-Content -LiteralPath '.agents\\skills\\feature-plan\\SKILL.md' -Raw`
- positiveのHook correlation / parseはPASSした。
- positive terminalはEnvironment Qualificationの`<=240秒` Gateと固定timeout `327秒`の両方を超えた。
- canonical `all`はGate FAIL条件により未実行である。

この事実は「Skill routingが遅い」とは限らない。少なくともSkill read evidenceがtask terminalより前に存在し、現在のcontractが後続task completionを理由にそのevidenceを捨てていることを示す。

### 2.5 過去canonical / invalid artifact

`.codex/runs/20260906-191724-JST/`には、旧contractおよび現行contractで得たinvalid evidenceが保持されている。

- 旧artifact: `pass=1`、`false_negative=1`、`unobservable=22`、旧dataset fingerprint
- fresh remediation artifact: 24/24 case完了、`pass=2`、`false_negative=2`、`unobservable=20`、observable `4/24`、8 side中`3/8`
- fresh artifactの`unobservable`は全件timeoutで、8-side validityを満たさない。
- これらは旧contractが成立しなかった経緯を示す証拠であり、新contractのbaseline sourceへ昇格させない。

validationがPASSしたことと、routing baselineがvalidであることは別である。旧Runではdataset validation、repository tests、Skill validation、full verifyがPASSしているが、canonical observability条件はFAILしている。

### 2.6 既存Hookから確認できるstructured evidence

`.codex/hooks/log_event.mjs`と`.codex/config.toml`を確認した結果、現行のPostToolUse recordは概ね次のenvelopeである。

- `event`、`timestamp`、`session_id`、`turn_id`
- `tool_name`（現行selectorは`Bash`を対象）
- `tool_use_id`
- `tool_input_preview`（JSON文字列、最大preview、`truncated` flag）
- `truncated`

canonical file pathをtyped fieldで直接表すnative structured evidenceは現行Hook recordにない。したがって実装時は、将来structured `path` / `file` / tool input fieldが利用できる場合を最優先し、現時点では`tool_input_preview.command`のbounded fallbackを使う。response本文、stdoutの説明、query文字列、path mentionだけはevidenceにしない。

### 2.7 過去24 caseのread順序調査

Repositoryへraw target logを保存することはせず、既存Targetに残るcanonical実行時のHook JSONLをread-onlyで調査した。調査対象はcanonical実行の24 promptに対応する24 Hook logである。結果は次のとおりである。

- canonical Skill readなし: 2 case
- canonical Skill read 1回: 20 case
- 同一Skillのcanonical read 2回: 2 case
- 異なるSkillへのcanonical read chain: 0 case
- wrong Skillを先にreadしてexpected Skillへ遷移した例: 0 case
- expected Skillを先にreadして別Skillへ遷移した例: 0 case
- first canonical read: PostToolUse index 1〜8、promptから約10.274〜47.632秒後
- task execution後半で初めてcanonical readが出た例: 今回の保存範囲では確認されなかった

この結果は、現行dataset / Hostでfirst canonical readが初期routingのproxyとして扱える可能性を支持する。ただしraw logはRepositoryの長期Artifactとして保存されておらず、Hookにrouting decision fieldもないため、`first read = internal selection`を証明するものではない。今後の契約文言は必ず`proxy`とする。

## 3. Current contractの問題

### 3.1 Routing observationとtask completionの過剰結合

現在は、Skill read、task execution、terminal、最終Skill set、scoreを一つのordered pipelineへ結合している。positive readが先に起きても、childがtimeoutするとstep 1で`observed_skills: null`になり、routing resultが復元不能になる。

これはPR2の目的と合わない。description変更前後で初期routingの差を見たいのに、後続taskの時間・外部tool・長い回答生成がroutingのobservable判定を決めているためである。

### 3.2 Positive evidenceとabsence evidenceを同一視している

「canonical readを見た」はその時点でpositive evidenceになり得る。一方、「まだcanonical readがない」は、query実行途中では「今後もreadされない」を意味しない。現行のterminal-boundは後者を安全側に扱うが、前者までtimeoutで捨てている。

必要なのは、presenceとabsenceで観測終了条件を分けることである。

### 3.3 selectorがcommand文字列の列挙に依存している

現行selectorは4つの完全文字列だけを受理する。今回のpositiveは同じ`Get-Content` direct readでも、backslash、`-LiteralPath`、single quote、`-Raw`の順序が違うため空集合になった。これはrouting failureではなくobservation selector driftである。

ただし、緩いsubstringやpath regexへ変えると、検索結果、echo、path mention、別fileの内容をSkill readと誤認する。structured evidenceを優先し、fallbackをcanonical direct readの小さなgrammarへ限定する必要がある。

### 3.4 process failureの意味がrouting resultを上書きする

現行はtimeout、spawn failure、signal、terminal欠落を`unobservable`へまとめる。これは「routing evidenceがまだない」ケースでは妥当だが、既にtrusted positive readがあるケースでは情報を失う。routing resultとprocess lifecycleの二つの問いを一つの`outcome`で表していることが問題である。

### 3.5 240秒Gateが旧terminal-bound前提に依存している

`positive terminal <=240秒`はtask terminalを観測終了とする契約には意味があるが、first readをrouting proxyとする契約の必要条件ではない。terminalが240秒を超えたことだけでrouting evidenceを無効にするのは、今回のpositive実測と逆になる。

240秒を単に600秒へ延長するのではなく、routing validityとprocess healthを分離する。`CASE_TIMEOUT_MS=327_000`は今回も実装時も安全上の固定値として扱い、別の根拠なしに変更しない。

## 4. 評価候補の比較

### Candidate A: 現行terminal-bound contract

- 概要: `turn.completed` / `turn.failed`またはtimeoutまで待ち、最後のcanonical Skill setを確定してset-based scoringする。
- 長所:
  - 最終的なSkill集合を保存できる。
  - trusted terminalまで待つためabsenceを比較的強く判定できる。
  - 現行schemaとtestsへの変更が少ない。
- 短所:
  - task execution latency、外部tool、回答生成へ強く依存する。
  - `Skill read済み + timeout`を`unobservable`へ変換し、PR2のrouting evidenceを失う。
  - positive controlが`367.7009秒`、現行timeoutが327秒であり、canonical 24 caseの壁になる。
  - `turn.failed`、timeout、routing failureの意味が混ざる。
- 判定: PR2の主目的には不採用。process healthの情報として一部は残す。

### Candidate B: First canonical Skill read contract

- 概要: 最初のtrusted canonical `SKILL.md` readをinitial routing resultとし、task completionを待たずにscoreする。first expectedは`pass`、siblingは`sibling_misroute`、non-siblingは`unexpected_trigger`とする。
- 長所:
  - routing observationをtask completionから分離できる。
  - 実測でfirst readがprompt直後の初期tool列に現れている。
  - wrong first -> expected laterのようなchainをPR2のinitial resultとして明示できる。
- 短所:
  - Hookにnative selection eventがなく、first readが内部選択そのものとは証明できない。
  - readなしのexpected Skillや`expected_skill=null`を途中で判定できない。
  - Hostが複数候補を調査してから選択する場合、first readをselectionと誤解する危険がある。
  - absenceの終了条件を別途設計しないとfalse negative / false passを作る。
- 判定: presence側の基本原理として採用可能だが、absenceを同じ契約で処理できないため単独案では不採用。

### Candidate C: Hybrid observation contract（推奨）

- 概要:
  - trusted canonical readが先に得られた場合は、first readをinitial routing evidence proxyとしてrouting resultを確定する。
  - canonical readがまだない場合は、trusted `turn.completed`とHook整合まで待ってabsenceを確定する。
  - timeout / process failureはprocess lifecycleへ保存し、既に確定したrouting resultを上書きしない。
- 長所:
  - positive evidenceをtask completion latencyから切り離す。
  - absenceはterminalとHook整合を要求するため、途中時点の空集合をfalse passにしない。
  - `expected_skill=null`、false negative、positive timeoutを論理的に区別できる。
  - 既存の`outcome`/`unobservable_reason`/8-side coverageを最小限の追加fieldで拡張できる。
  - PR2をinitial routing、PR6をmulti-Skill chainへ分けられる。
- 短所:
  - first readはあくまでproxyで、routing decisionの直接計測ではない。
  - terminalなしでpresenceを確定するため、Hook correlation・prefix parse・selector trustが厳密でなければならない。
  - process healthとrouting validityを別々に表示・レビューする必要がある。
- 判定: Issue #117 PR2の目的、現行evidence、最小変更、false evidence回避のバランスが最もよい。推奨する。

### Candidate D: Routing-phase / window contract

- 概要: routing開始event、Skill read群、routing phase終了eventを定義し、そのphase内のread setをscoreする。
- 長所:
  - first readより豊かなphase semanticsを表せる可能性がある。
  - 将来Hostがrouting phase boundaryを提供すれば、PR6との連携にも使える。
- 短所:
  - 現行Hookにrouting開始・終了の信頼できるphase boundaryがない。
  - `5秒待つ`、`10秒quietなら終了`のようなmagic timingはabsenceを証明しない。
  - phase state machine、event bus、generic lifecycle frameworkを導入する過剰設計になる。
- 判定: 現在は不採用。native phase eventが追加された場合の将来拡張候補としてのみ記録する。

## 5. Chosen Design: Candidate C

### 5.1 契約名

実装時のprovenanceへ次の固定markerを入れる。

```text
observation_contract_version = "pr2-hybrid-initial-canonical-read-v1"
```

`schema_version`は現行のdataset schema versionと結び付いているため、datasetを変更せずに意味の世代を区別する専用markerを追加する。markerのない旧artifact、または値が異なるartifactはcomparison対象にしない。

### 5.2 Routing observationの意味

1. caseごとのUserPromptSubmit以降のHook deltaを、session/turnとappend fileのcorrelationで確定する。
2. Hook recordにtrusted structured path/file fieldがある場合は、それを最優先でcanonical direct readへ解決する。
3. structured fieldがない現行Hostでは、bounded fallback selectorでcanonical `SKILL.md` direct readだけを認識する。
4. chronologicalなcanonical readのうち最初のtrusted Skillを`initial_skill`として固定する。
5. `initial_skill`が存在した時点で、routing resultはterminalの成功・失敗・timeoutとは独立に確定可能とする。
6. 同じSkillの後続readや別Skillの後続readは`observed_skills`へdiagnostic setとして保存するが、PR2のscoreは`initial_skill`だけで決める。
7. `initial_skill`がない場合だけ、trusted `turn.completed`、Hook全体のparse/correlation、selector reliabilityを確認してabsenceを確定する。

`first read`は「initial routing evidence proxy」であり、`internal selection`という名前や断定はresult、Plan、PR本文で使用しない。

### 5.3 Process lifecycleの意味

既存`outcome`はrouting resultとして維持し、次の最小fieldをCaseResultへ追加する。

```text
process_lifecycle:
  "completed" | "turn_failed" | "timed_out" |
  "spawn_failed" | "signaled" | "unknown"
```

状態の決定順は次のとおりとする。

- timerが発火した場合: `timed_out`
- spawn errorがある場合: `spawn_failed`
- childがsignalで終了した場合: `signaled`
- trusted terminalが`turn.failed`の場合: `turn_failed`
- `turn.completed`かつ正常終了の場合: `completed`
- 上記以外で終了根拠が一意でない場合: `unknown`

`process_lifecycle`はrouting scoreの入力にしない。例えば、trusted positive read後にtimerが発火したcaseは、`outcome=pass`等を保持し、`process_lifecycle=timed_out`として別途警告する。

### 5.4 Result schemaの最小変更

既存fieldは次の理由で維持する。

- `outcome`: routing resultを既に表すため、`routing_result`という重複nested objectは追加しない。
- `unobservable_reason`: 既存のfailure taxonomyを維持し、absence未確定とHook/process failureを説明する。
- `observed_skills`: 全canonical readのdistinct setをdiagnosticとして維持する。`[]`はtrusted absence、`null`はrouting observation不成立に限定する。

追加するfieldは二つである。

- `initial_skill: SkillName | null`: first trusted canonical read。absenceまたはunobservableでは`null`。
- `process_lifecycle`: 上記enum。

想定JSONの最小例は次のとおりである。

```json
{
  "schema_version": 1,
  "provenance": {
    "evaluator_git_sha": "<EVALUATOR_SHA>",
    "routing_source_git_sha": "<ROUTING_SHA>",
    "dataset_sha256": "<DATASET_SHA256>",
    "codex_version": "codex-cli <VERSION>",
    "observation_contract_version": "pr2-hybrid-initial-canonical-read-v1",
    "split": "all"
  },
  "cases": [
    {
      "id": "case-id",
      "observed_skills": ["feature-plan"],
      "initial_skill": "feature-plan",
      "outcome": "pass",
      "unobservable_reason": null,
      "process_lifecycle": "timed_out"
    }
  ]
}
```

この例の`pass`はrouting proxyの結果であり、task全体が成功したことを意味しない。`summary`へprocess lifecycle countを追加するかは実装時に既存output shapeを確認して決めるが、routing outcomeと混ぜない。

### 5.5 Absenceの終了条件

absenceは次の全条件が揃ったときだけ確定する。

- trusted terminalが`turn.completed`である。
- child processの終了とHook deltaのcorrelationが一意である。
- Hook JSONLの全対象行がparseでき、対象PostToolUseの`tool_input_preview`がtruncatedでない。
- structured selectorまたはbounded fallback selectorがreliableである。
- canonical Skill readが0件である。

`turn.failed`はroutingが最後まで試行されたことを保証しないため、read 0件のabsence完了には使わない。timeout、spawn failure、signal、terminal欠落もabsenceを証明しない。従って、それらは`false_negative`やnull `pass`ではなく`unobservable`とする。

### 5.6 Positiveの終了条件

positiveは次の全条件が揃ったcandidate eventを一件以上得た時点でrouting observationを確定できる。

- caseのHook correlationが成立している。
- candidate event自体と、それより前のHook recordが完全なJSONとしてparseできる。
- eventがtrusted structured path evidence、またはbounded fallback direct-read evidenceである。
- pathがcanonical `.agents/skills/<skill>/SKILL.md`へ一意に解決する。

candidate後にprocessが長く続く必要はない。現行runnerの最初の実装ではchildの安全な終了監視を継続してもよいが、後続terminalの失敗で既に確定したrouting resultを`null`へ戻してはならない。candidate後の後続recordがmalformedでも、candidateとprefixのtrustが成立していればfirst routing resultは保持し、後続Hook integrityは別のdiagnostic warningとして扱う。

### 5.7 `expected_skill`ごとのscore

scoreは`observed_skills`全体ではなく`initial_skill`だけを入力にする。

- expected Skillがfirst: `pass`
- boundary siblingがfirst: `sibling_misroute`
- boundary外のnon-sibling Skillがfirst: `unexpected_trigger`
- expected Skillあり、absence確定: `false_negative`
- expected Skillがnull、absence確定: `pass`
- expected Skillがnull、Skillがfirst: `unexpected_trigger`
- routing observation不成立: `unobservable`

`observed_skills`に後続Skillが含まれていても、PR2のinitial scoreは変えない。first wrong -> expected laterはwrong firstのclassificationを維持する。multi-Skill chainの意味づけはPR6で行う。

## 6. Observation decision table

| 条件 | `initial_skill` / `observed_skills` | `outcome` | `process_lifecycle` | `unobservable_reason` |
|---|---|---|---|---|
| expected Skillを最初にtrusted read、terminal完了 | expected / `[expected]` | `pass` | `completed` | `null` |
| expected Skillを最初にtrusted read、後でtimeout | expected / `[expected]`以上 | `pass` | `timed_out` | `null` |
| expected Skillを最初にtrusted read、後で`turn.failed` | expected / `[expected]`以上 | `pass` | `turn_failed` | `null` |
| siblingを最初にtrusted read | sibling / `[sibling]` | `sibling_misroute` | lifecycleに従う | `null` |
| boundary外Skillを最初にtrusted read | other / `[other]` | `unexpected_trigger` | lifecycleに従う | `null` |
| 同じSkillを複数回trusted read | same first / setは一意化 | firstに応じる | lifecycleに従う | `null` |
| wrongを先にreadしexpectedを後でread | wrong first / `[wrong, expected]` | wrongに応じる | lifecycleに従う | `null` |
| expected Skillなし、`turn.completed`、Hook全体trusted | `null` / `[]` | `false_negative` | `completed` | `null` |
| expected null、`turn.completed`、Hook全体trusted、readなし | `null` / `[]` | `pass` | `completed` | `null` |
| expected null、trusted Skill readあり | Skill / non-empty | `unexpected_trigger` | lifecycleに従う | `null` |
| readなし、timeout | `null` / `null` | `unobservable` | `timed_out` | `timeout` |
| readなし、spawn failure | `null` / `null` | `unobservable` | `spawn_failed` | `process_failure` |
| readなし、signal終了 | `null` / `null` | `unobservable` | `signaled` | `process_failure` |
| readなし、`turn.failed` | `null` / `null` | `unobservable` | `turn_failed` | `lifecycle_failure` |
| terminal欠落または複数terminal | `null` / `null` | `unobservable` | `unknown` | `lifecycle_failure` |
| candidate前のHook correlation失敗 | 不確定 / `null` | `unobservable` | lifecycleに従う | `hook_correlation` |
| candidate前のHook parse/truncated失敗 | 不確定 / `null` | `unobservable` | lifecycleに従う | `hook_parse`または`skill_read_observation` |
| candidate自体がstructured/fallbackで解決不能 | 不確定 / `null` | `unobservable` | lifecycleに従う | `skill_read_observation` |

ここで「lifecycleに従う」は、routing evidenceが既にtrustedならprocess lifecycleだけを保存し、routing outcomeを保持することを意味する。candidateがない場合には、同じprocess状態を`unobservable`へ分類する。

## 7. Selector contract

### 7.1 優先順位

selectorは次の順に評価する。

1. Hostが提供するtyped structured path/file/tool-input field
2. 現行Hookの`tool_input_preview` JSON内`command`に対するbounded direct-read recognizer
3. 上記以外は未観測。response本文、stdout、query、filename mentionから補完しない

structured fieldがある場合でも、pathがcanonical Skillの相対pathへ一意に正規化できなければrejectする。absolute path、別repository、unknown Skill、directoryだけの指定は受理しない。

### 7.2 現行Host fallbackの意味

fallbackは一般PowerShell parserではなく、次の意味だけを認識する。

- commandの最初のsimple invocationが`Get-Content`
- canonical `.agents/skills/<skill>/SKILL.md`を一つのpath tokenとして指定
- `/`と`\`を区別せずcanonical relative pathへ正規化
- single quote / double quote / quoteなしの単純tokenを許可する
- `-Path` / `-LiteralPath`を許可する
- `-Raw`の位置とparameter順序を許可する
- current actual shape `Get-Content -LiteralPath '.agents\skills\feature-plan\SKILL.md' -Raw`を受理する
- `;`で後続のdiagnostic commandが続くHost shapeは、先頭segmentそのものが上記simple invocationに一致する場合だけ先頭readを認識する

先頭segment以外のscript、variable interpolation、command substitution、pipeline、redirection、loop、script block、複数の曖昧なpath tokenは解析しない。`Get-Content`のdirect readが実際に行われたことを狭く確認するため、許容範囲外はfalseへ寄せず`unobservable`へ寄せる。

### 7.3 rejectする入力

- `grep`、`rg`、`Select-String`、`Get-ChildItem`
- `echo`、`Write-Output`、response本文、検索結果
- path文字列を含むだけのcommand
- 別fileの内容内にcanonical pathが記載されているだけのread
- canonicalではないSkill、`SKILL.md`ではないfile、directory read
- arbitrary shell / PowerShell script内に偶然pathが現れる形
- truncated preview、malformed JSON、unbalanced quote

selectorテストは個別command列挙の追加ではなく、上記の意味境界とnormalization invariantをテストする。将来Hostが別のstructured fieldを提供した場合は、fallbackの正規表現を増やす前にstructured adapterを追加する。

## 8. Lifecycle / timeout / Environment Qualification

### 8.1 timeoutの役割

`CASE_TIMEOUT_MS = 327000`はprocess safety capであり、routing性能指標ではない。今回のPlanでは値を変更しない。

- positive evidence前のtimeout: routing `unobservable`、`process_lifecycle=timed_out`
- positive evidence後のtimeout: routing outcome保持、`process_lifecycle=timed_out`
- absence確定前のtimeout: `[]`やfalse negativeへ変換しない
- timeout後にlate Hookを偶然拾っても、candidateとprefix trustを確認できなければ採用しない

新たな`routing observation timeout`をmagic numberで追加しない。absenceはevent-based terminal、presenceはtrusted eventで終了する。

### 8.2 240秒Gateの再評価

旧terminal-bound契約に基づく`positive terminal <=240秒`は、new routing validityの必要条件から外す候補とする。代わりに実装後のqualificationは次を確認する。

- positive controlでtrusted initial readがselectorにより観測できる。
- negative controlで`turn.completed`、Hook整合、read 0件が成立する。
- positive read後にterminal遅延やtimeoutが発生しても、routing resultが保持される。
- terminal durationはprocess-health evidenceとして保存・表示する。

240秒はperformance warningとして過去との比較に残してよいが、routing evidenceを無効にする判定には使用しない。process healthを別途pass/failする運用判断が必要なら、PR2 routing validityとは別のgateとして明示し、今回のPlanで勝手に数値を決めない。

## 9. Scoring / coverage / PR2とPR6

### 9.1 Scoring

current set-based scoringは後続Skillもinitial routing failureへ含めるため、PR2の測定対象に対して不適切になる。新contractでは純粋関数を次の責務へ分ける。

- `deriveRoutingObservation`: trusted positive / trusted absence / unobservableを決め、`initial_skill`とdiagnostic setを返す。
- `scoreInitialRouting`: `initial_skill`とcaseのexpected/boundaryから既存4種類のobservable outcomeを返す。
- `evaluateCase`: routing outcomeとprocess lifecycleを組み合わせるが、lifecycleで既存routing outcomeを上書きしない。

既存の`outcome` enum（`pass`、`false_negative`、`sibling_misroute`、`unexpected_trigger`、`unobservable`）は維持する。`unobservable`は「routingを判断できない」意味に限定し、task failure全般の別名にはしない。

### 9.2 8-side validity

8-side条件は緩和しない。

- `exploratory-qa-vs-android-native-local-validation`の2 side
- `code-review-vs-repair-loop`の2 side
- `repair-loop-vs-harness-improvement`の2 side
- `feature-plan-vs-direct-implementation`のfeature-plan sideとnull side

`pass`だけでなく、`false_negative`、`sibling_misroute`、`unexpected_trigger`もroutingがobservableならcoverageへ数える。`process_lifecycle=timed_out`でもtrusted positive routing outcomeがあればobservableである。逆にabsence確定前のtimeoutはunobservableである。

既存`evaluateRunCoverage`の「allでは8 sideすべてに最低1 observable」を維持し、routing resultを良く見せるためにside条件を減らさない。24 caseの個別unobservableはsummaryへ残し、side coverageとprocess-health warningを別々に読む。

### 9.3 PR2 / PR6の境界

PR2は次を責務とする。

- single-intent query
- initial Skill routing
- first canonical read proxy
- description変更前後のrouting baseline

PR6は次を責務とする。

- multi-Skill workflow
- Skill chainの順序とphase
- 後続Skill invocationの妥当性
- Workflow全体の成功 / 失敗

PR2で後続Skillをrouting scoreへ加算せず、diagnosticとして残すだけにする。distinct later readが多い場合はPR6の入力候補として記録する。

## 10. Comparison contract / invalid artifact

### 10.1 Provenance

新resultの`provenance`へ次を追加する。

```text
observation_contract_version: "pr2-hybrid-initial-canonical-read-v1"
```

comparison parserは次を必須条件にする。

- current / baseline双方が同じcontract markerを持つ。
- markerがない場合は旧contract artifactとして拒否する。
- dataset fingerprintが一致する。
- splitが双方`all`である。
- case ID setが一致する。
- Codex version、evaluator SHA、routing source SHAはprovenanceとして表示し、version差は条件差として扱う。

旧artifactへmarkerを後付けして比較可能にしない。`schema_version=1`だけではold terminal-boundとnew hybridを区別できないため、markerなしのcomparisonはfail closedする。

### 10.2 PR3 baseline

新contract実装後に、次の順でfresh baselineを作る。

1. new evaluator / new contractのcommit SHAとmarkerを固定する。
2. dataset query、expected、boundary、Skill descriptionの変更がないことを確認する。
3. new contractのpositive/negative qualificationを一回ずつ実施する。
4. canonical `all`を24 case sequential、retryなしで最初から一回だけ実行する。
5. 8/8 side、provenance、result schema、process lifecycle summaryを確認する。
6. 条件を満たす最初のnew-contract resultだけをPR3 comparison baselineとする。

`.codex/runs/20260906-191724-JST/`の旧invalid artifact、`.codex/runs/20260908-004640-JST/`のEnvironment Qualification、途中結果はhistory/evidenceとして保持し、new baselineへ混ぜない。

## 11. 実装対象file / change strategy

### 11.1 実装phaseの変更file

必要最小限の候補は次のとおりである。

1. `scripts/evals/skill-trigger-evals.ts`
   - `initial_skill`、`process_lifecycle`、trusted positive/absenceのpure type/function
   - `scoreInitialRouting`または同等のfirst-only scoring
   - 既存`outcome`/`unobservable_reason`/coverage/comparisonへの契約適用
2. `scripts/evals/run-skill-trigger-evals.ts`
   - Hook deltaからfirst trusted evidenceを取り出す処理
   - structured evidence優先とbounded fallback selector
   - timeout後もpositive routing resultを保持するlifecycle連携
   - `observation_contract_version`のprovenance出力と、現在のprocess状態のmapping
3. `tests/repository-contract/skill-trigger-evals.test.ts`
   - pure observation、selector、lifecycle、coverage、comparisonのregression contract
4. `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
   - 実装承認後、旧terminal-bound sectionsをnew contractへの参照へ更新する。過去Planの履歴意味を消す編集はしない。
5. `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`
   - 実装承認後、current selector decisionをstructured-first / bounded fallbackとhybrid observationのaccepted decisionへ追記または明示的にsupersedeする。

### 11.2 変更しないfile / data

- 12 dataset YAML: query、`expected_skill`、boundary、case ID、split、fingerprintを維持
- `.agents/skills/*/SKILL.md`: descriptionとrouting意味を維持
- `AGENTS.md`: routing instructionを維持
- `.codex/hooks/log_event.mjs`: 今回はnative structured fieldを新設しない
- `CASE_TIMEOUT_MS`: `327_000`を維持
- Product code、Product test、training content、依存package:変更しない

Hostがstructured path evidenceを新設する案は、今回の実装scopeに含めない。fallbackが現行Hookで機能し、将来fieldを優先できるadapter境界を作るだけにする。

### 11.3 実装順

1. pure moduleでnew contractのtypes、`derive`、first-only scoring、lifecycle mappingを定義する。
2. repository contract testsを先に追加し、decision tableの各行を固定する。
3. runnerへstructured-first / bounded fallback selectorを実装し、Hook candidate後のtimeoutでrouting結果を消さない。
4. result provenanceへcontract markerを追加し、comparison parserをmarker不一致でfail closedにする。
5. baseline PlanとADRをnew contractへ整合させる。datasetとSkill/AGENTSは変更しない。
6. focused validation、dataset/Skill/full validation、positive/negative qualificationを順に実施する。
7. canonical `all`はこのPlanのpreconditionsが全てPASSした場合だけ、fresh targetで一回実施する。

## 12. Tests

### 12.1 Selector tests

次のpositiveを同じcanonical Skillへ解決する。

- `Get-Content -Raw .agents/skills/feature-plan/SKILL.md`
- single-quoted path / double-quoted path / quoteなしのsimple token
- `/`と`\`の差
- `-Path`と`-LiteralPath`
- `-Raw`が前後にあるparameter順序
- parameter順序を入れ替えたsimple invocation
- 実測形 `Get-Content -LiteralPath '.agents\skills\feature-plan\SKILL.md' -Raw`
- 先頭direct-readの後ろにboundedな`;` suffixがあるHook command

次はnullまたはunobservableとしてrejectする。

- non-Skill file、unknown Skill、directory
- `Select-String`、`rg`、`grep`、`Get-ChildItem`
- `echo`、`Write-Output`、検索結果、path mention
- 別fileをreadしてその本文にcanonical pathがある形
- pipe、redirection、variable interpolation、command substitution、loop、script block
- malformed JSON、truncated preview、unbalanced quote、曖昧な複数path

### 12.2 Observation / lifecycle tests

- expected first + `turn.completed` -> `pass` / `completed`
- expected first + timeout -> `pass` / `timed_out`
- expected first + `turn.failed` -> routing outcome保持 / `turn_failed`
- sibling first -> `sibling_misroute`
- non-sibling first -> `unexpected_trigger`
- same Skill multiple read -> first classification保持
- wrong first -> expected later -> wrong first classification保持
- no read + trusted `turn.completed` -> expectedは`false_negative`、nullは`pass`
- no read + timeout -> `unobservable/timeout`
- no read + spawn failure -> `unobservable/process_failure`
- no read + signal -> `unobservable/process_failure`
- no read + `turn.failed` -> `unobservable/lifecycle_failure`
- candidate前のcorrelation/parse failure -> `unobservable`
- candidate後のprocess timeout/failure -> candidateのrouting outcome保持
- candidate自体のtruncated/parse failure -> `unobservable/skill_read_observation`または`hook_parse`

### 12.3 Null tests

- `expected_skill=null` + trusted no-read + `turn.completed` -> `pass`
- `expected_skill=null` + any trusted Skill first -> `unexpected_trigger`
- `expected_skill=null` + timeout前にreadなし -> `unobservable`
- `expected_skill=null` + process failure前にreadなし -> `unobservable`

### 12.4 Coverage / comparison tests

- 8/8 observable side -> success
- 7/8 observable side -> failure、missing sideを列挙
- routing failure (`false_negative` / `sibling_misroute` / `unexpected_trigger`)でもobservableならcoverageへ数える
- lifecycle timeout付きtrusted positiveでもside coverageへ数える
- absence未確定timeoutはcoverageへ数えない
- contract marker一致 + dataset/case ID一致 -> comparison可能
- markerなし -> comparison拒否
- marker不一致 -> comparison拒否
- dataset fingerprint不一致、case ID set不一致、split非`all` -> comparison拒否
- old invalid artifactをnew hybrid baselineへ誤って使えない
- lifecycle差だけではrouting outcomeのcomparison statusを変えない

## 13. Validation plan

### 13.1 実装後の順序

上流失敗時は後続gateを開始しない。

1. focused repository contract test

```bash
pnpm exec vitest run tests/repository-contract/skill-trigger-evals.test.ts --no-file-parallelism --maxWorkers=1
```

2. dataset fingerprint / shape

```bash
pnpm run eval:skills:trigger:validate
```

3. Skill and Markdown links

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

4. full existing gate

```bash
pnpm run verify
```

5. result schema / comparison fixture validation

既存のevaluation schema validatorと新たに追加するcontract fixtureを実行する。Plan-onlyの今回にはsource validationを再実行せず、`git diff --check`とPlan/Artifact sanitizerを実行する。

### 13.2 Plan-onlyの今回のvalidation

- `git diff --check`
- existing Markdown / Plan validatorがcurrent branchに存在する場合は該当Planを対象に実行
- `scripts/sanitize-codex-artifacts.ps1`のWrite / Check
- source implementation diffがないこと
- canonical `all`が未実行であること

current branchには`.agents/skills/feature-plan/scripts/validate-plan-output.ts`が存在しないため、使用可能なMarkdown validatorを確認し、見つからない場合は未実行理由をRun/最終報告へ残す。`origin/main`の未マージscriptを今回のsourceへ持ち込まない。

## 14. Canonical rerun preconditions

以下をすべて満たすまでcanonical `all`を実行しない。

1. このPlanが承認され、実装phaseの変更範囲が確定している。
2. `scripts/evals/skill-trigger-evals.ts` / `run-skill-trigger-evals.ts` / contract testsの実装が完了し、新evaluator SHAが固定されている。
3. `observation_contract_version=pr2-hybrid-initial-canonical-read-v1`がresultとcomparison parserで一致している。
4. dataset query、`expected_skill`、boundary、case ID、Skill description、`AGENTS.md` routing、timeoutが変更されていない。
5. dataset validation PASS、repository contract test PASS、Skill validation PASS、full verify PASSである。
6. dedicated / clean / detached Routing Targetを用意し、Evaluatorとcommon-dir/alternatesを分離する。
7. TargetにTrigger dataset、answer key、Evaluator Run Artifactがない。
8. project trust / hook trust、Hook append delta、session/turn correlation、JSON parseが成立する。
9. fixed Codex version、Evaluator SHA、Routing source SHA、dataset fingerprintをRunへ記録する。
10. positive controlでactual canonical readをstructured evidenceまたはbounded fallbackが認識する。
11. negative controlで`turn.completed`、read 0件、Hook correlation/parse/selector reliabilityが成立する。
12. positive terminalが240秒を超えても、trusted positive routing resultが保持されることをfixture/testで確認する。terminal durationはwarningとして記録する。
13. canonical `all`は24 case sequential、retryなし、同じTarget、同じEvaluator、同じcontract markerで最初から一回だけ実行する。
14. 結果に24 case、provenance、routing outcome、process lifecycleが保存され、8/8 sideがobservableである。
15. old invalid artifactを`--compare`へ渡さず、新contractでの最初のvalid resultだけをPR3 baseline候補にする。

次のいずれかが起きた場合は、そのrunをvalid baselineへ昇格せず停止する。

- positive/negativeのtrusted observationが成立しない
- Hook evidenceがstructured/fallbackで一意に解決できない
- absenceをterminalなしで確定しようとする必要が生じる
- 8 sideのいずれかが全件unobservable
- contract marker、dataset fingerprint、case ID、source provenanceが不一致
- canonical processが全case完了前に失われ、結果の完全性を確認できない

case retry、unobservable-only retry、query tuning、timeout延長、Skill description変更で穴埋めしない。原因がevaluator defectである場合はrunを無効化し、修正後に新Runとして再評価する。

## 15. Rollback / invalidation

### 15.1 実装rollback

- new contract導入前のsource commitをrollback基点として保持する。
- dataset、Skill description、AGENTS、Product codeはrollback対象へ含めない。
- structured adapterまたはfallbackがfalse positiveを作る場合は、fallbackを広げずにそのcontract revisionをinvalidとする。
- `observation_contract_version`を変更した場合、同じbaselineとの比較を続けず、新markerで新baselineを作り直す。

### 15.2 Evidence invalidation

次の場合はrouting resultを`unobservable`またはrun invalidとして保存し、都合のよいcaseだけ採用しない。

- candidate eventより前のHook recordのparse/correlationが不確実
- candidateがpath mention、search result、truncated preview、arbitrary shell由来
- no-readをterminal完了なしで`pass` / `false_negative`へ分類
- old contract artifactにmarkerを後付けしてcomparison
- 8-side条件未達、partial canonical、外部session中断

既存invalid artifactとRunは削除・上書きしない。新contractが成立しない場合は、PR2の測定可能性に関するblockerとしてRun/PRへ記録し、PR6のworkflow semanticsをPR2へ取り込まない。

## 16. Scope guard

### 16.1 実装時に変更可能

- 上記3 source/testと、contractを記録する既存Plan/ADRの最小差分
- 新contract result fixture、Run Artifact、PR本文の次対応記載
- structured-first adapterとbounded direct-read recognizer
- routing resultとprocess lifecycleを分離するpure function / output field

### 16.2 実装時も変更禁止

- 12 dataset YAMLのquery、expected、boundary、case ID、fingerprint
- Skill description、`AGENTS.md` routing meaning、Product behavior
- `CASE_TIMEOUT_MS=327_000`の値
- general PowerShell / shell parser、LLM judge、keyword classifier、routing engine、event bus、generic lifecycle framework
- retry framework、parallel runner、adaptive timeout、quiet-window判定
- canonical resultを良く見せるためのcase retry、partial merge、old artifactの再利用
- 今回のPlan作成中のsource implementation、canonical `all`、PR merge

## 17. PlanレビューYES / NOチェックリスト

| # | 確認事項 | 回答 | 根拠 |
|---:|---|---|---|
| 1 | PR2が測定するroutingの意味は明確か | YES | single-intentのinitial routing、first readはproxyと定義した |
| 2 | routingとtask completionは必要以上に結合していないか | YES | positiveはterminal非依存、absenceのみcompletion依存とした |
| 3 | positive evidenceとabsence evidenceを区別しているか | YES | trusted candidateと`turn.completed` absenceを分離した |
| 4 | `expected_skill=null`のpass確定条件は明確か | YES | trusted `turn.completed` + Hook整合 + read 0件に限定した |
| 5 | false negative確定条件は明確か | YES | expectedあり + 同じabsence条件に限定した |
| 6 | timeout後も成立したrouting evidenceをどう扱うか明確か | YES | outcome保持、`process_lifecycle=timed_out`を別保存する |
| 7 | first Skill readの妥当性Evidenceがあるか | YES（proxy限定） | 24 case read順序調査でfirst readはterminal前、ただし内部選択の証明ではない |
| 8 | selectorはcommand列挙より安定しているか | YES | structured-first + bounded normalizationへ移行する |
| 9 | general shell parserになっていないか | YES | simple direct-read grammar以外をrejectする |
| 10 | PR2とPR6の責務境界は明確か | YES | PR2はinitial、PR6はmulti-Skill chainとした |
| 11 | 8-side validityを維持しているか | YES | 4 boundary × 2 sideを維持した |
| 12 | 過去invalid resultと新baselineを混同しないか | YES | contract marker一致をcomparison必須にした |
| 13 | 実装範囲は最小か | YES | 2 source、1 test、既存Plan/ADRの最小差分に限定した |
| 14 | canonical再実行前の停止条件は明確か | YES | 15 preconditionsとinvalidation条件を定義した |

## 18. 成果物

### 18.1 今回作成するもの

- `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`
- `.codex/runs/20260909-160634-JST/PLAN.md`
- `.codex/runs/20260909-160634-JST/TASKS.md`
- `.codex/runs/20260909-160634-JST/REPORT.md`
- PR #127本文の「次の再検討」へのこのPlan path追記

### 18.2 実装phaseで作成するもの

- new contract result fixture / repository test
- implementation Run Artifact
- new contract marker付きの最初のvalid canonical result（8/8成立時のみbaseline候補）

## 19. 備考

- このPlanは、Host latencyを解消するためだけのtimeout変更Planではない。routing observationの意味、absenceの証明、lifecycleの分離を先に固定する。
- current Environment Qualificationの240秒FAIL、positive selector drift、過去invalid canonical resultは失敗事実として保持する。新contractの成立を先取りしてPR本文へ「blocker解消済み」「valid baseline取得済み」とは書かない。
- raw target Hook logは再利用可能な長期ArtifactとしてRepositoryへコピーしない。保存済みRunのsummaryと、今回調査で確認できた分布の範囲を超えて断定しない。
- 実装承認後に、まずpure logicとrepository contract testを固定し、そこからrunner、provenance、qualification、canonicalの順に進める。
