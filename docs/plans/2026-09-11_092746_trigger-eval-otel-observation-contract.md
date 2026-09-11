# PR #127 Trigger Eval OTel観測契約 実装Plan

> Status: 診断probe完了、実装承認前の新規Plan。今回のRunではTrigger Eval本体、dataset、Skill、Hook、Result schemaを変更しない。
>
> 対象: Issue #117 / PR #127 / branch `refactor/117-pr2-trigger-eval-baseline`
>
> 調査Run: `.codex/runs/20260911-083242-JST/`

## 1. 目的

PR2のTrigger Evalは、`PostToolUse`のshell commandから`SKILL.md` direct-readを推定し、最初のcanonical Skillを`initial_skill`としている。Hostが同じ処理を別のPowerShell表現で出力するたびに、固定shapeの追加、`artifact_contract_gap`、Qualification停止が発生する。

今回の目的は新しいshell regexを追加することではなく、Codex自身が出力するSkill injection telemetryを、shell表記とは独立したrouting observationへ昇格できるかを確定することである。診断結果に基づき、実装者が判断を残さずに進められる観測契約、処理経路、変更file、tests、Qualification順、停止条件を定義する。

今回の採用案は **A: OTelをTrigger Evalの主観測へ採用** とする。ただし、OTelを「任意のSkill選択順序」や「process成功」の代替にはしない。`codex.skill.injected`で得るcanonical Skill集合、process lifecycle、collector/export/flushの成立を別々に検証し、単一SkillのidentityだけをPR2の`initial_skill`へ写像する。

## 2. 背景と過去shape追従ループの原因

- Negativeでは、固定queryが正常終了したにもかかわらず、Hostが`((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name`を出力した。既存の承認済みcompound shapeは`$pkg = Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json; $pkg.name`であり、前者を一般PowerShell parserで受理することはPR2の安全境界を広げる。
- Positiveでは、Host由来absolute pathをRouting Targetのresolved canonical pathへ完全一致させるbounded実装を追加した。これはpath identityの問題を解消するが、Skill readのshell表記依存自体は残る。
- 現在のselectorは、untrustedなHook inputを一般shell grammarとして解釈せず、固定reader/path/operatorの範囲だけを受理する設計である。表記差ごとにruleを足すと、routing observerがHost command languageの保守台帳になる。
- Codex 0.153.4の実測では、Skill injectionに専用metricがあり、`skill`属性はcanonical Skill名そのものを返した。したがって、固定shell表記を増やすより直接的な観測点が存在する。

## 3. Codex公式仕様

公式ドキュメントの正本は以下とする。

- [Codex configuration advanced](https://developers.openai.com/codex/config-advanced/)
- [Codex configuration reference](https://developers.openai.com/codex/config-reference/)
- [Codex environment variables](https://developers.openai.com/codex/config-reference/#environment-variables)

公式仕様から今回の実装へ引き継ぐ事項は次のとおりである。

| 項目 | 公式仕様上の確認 | 本Planでの扱い |
| --- | --- | --- |
| Skill metricのcatalog名 | `skill.injected` | 実OTLP payloadの`codex.skill.injected`を対応するexport nameとして扱う。文字列のsubstring探索はしない |
| metric type | Counter | OTLP `sum` datapointとして受信し、datapoint数を単純なinjection回数と同一視しない |
| metric attributes | `status`、`skill`。OTel contextとして`auth_mode`、`originator`、`session_source`、`model`、`app.version`も出る | routing判定は`skill`、`status`、`invoke_type`へ限定し、context属性をrouting入力にしない |
| OTel logsとmetrics | 別のexport設定 | 今回はmetricsだけを有効化し、logsをrouting証拠へ混ぜない |
| config precedence | CLI overrideが最優先 | `codex exec`のcase-local `-c`だけを使い、tracked `.codex/config.toml`を変更しない |
| exporter | OTLP HTTP / gRPC等。batch非同期、shutdown時flush | localhost OTLP HTTP JSONをcaseごとに起動し、process終了後の受信とbounded waitを確認する |
| 環境変数 | stableなCodex環境変数の正本にOTel専用overrideはない | `OTEL_*`の未確認環境変数は使わない。既存認証を読み取り、`CODEX_HOME`やcredentialを複製しない |

公式ページのcatalog表記と実OTLP export nameにprefix差があるため、Plan・実装・reportでは両方を記録する。0.153.4で利用可能という判断は最新版文書の記載だけではなく、後述の受信payloadで実証する。

## 4. 現在固定しているversionと実行時OTel有効化

- `codex --version`: `codex-cli 0.153.4`
- `codex exec --help`: `-c/--config`、`--ephemeral`、`--sandbox`、`--json`、`--dangerously-bypass-hook-trust`を確認した。
- 0.153.4のmetrics OTLP configは単純な文字列ではなく、次のvariant tableをCLIへ渡す形式を受理した。

```text
otel.metrics_exporter={otlp-http={endpoint="http://127.0.0.1:<case-port>/v1/metrics",protocol="json"}}
```

- `otel.metrics_exporter="otlp-http"`は0.153.4のconfig errorになり、variant tableはCLI parserを通過した。これはparser受理の事実であり、metric実装の証明ではない。実装済み判定はprobe payloadの到着で行う。
- 実装時もこのoverrideを`executeCodex`のcase-local argsへ追加する。user/project configへOTelを永続化しない。
- `--ephemeral`を使いsession fileの永続化を避ける。既存のChatGPT認証は読み取りだけにし、credential、config、login状態をコピー・削除・上書きしない。
- `--dangerously-bypass-hook-trust`はfresh Targetのproject trustを変更せずに使用できるかを診断するためだけに使う。認証・sandbox・approvalをbypassする`--dangerously-bypass-approvals-and-sandbox`は使わない。

## 5. 診断環境とdata handling

### 5.1 Fresh Target

- Routing SHA: `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`
- 新規remote clone、detached、non-shallow、clean、Target内common-dir、alternatesなし。
- 6 canonical Skillの`SKILL.md` readable、Trigger datasetとnamed evaluator artifactはTarget内にない。
- probe後もTargetのtracked statusはclean。
- 既存TargetやEvaluator worktreeは再利用していない。

### 5.2 Collector

- 既存collector（otelcol / grpcurl / protoc等）は利用可能でなかった。
- Docker、global install、Repository dependency追加は行わず、Node built-in `http`だけの一時receiverを使用した。
- receiverは`127.0.0.1`だけでlistenし、probeごとにport、directory、process、request bodyを分離する。
- OTLP JSONをparseし、metric名、type、datapoint数、timestamp、`skill` / `status` / `invoke_type` / `plugin_id`の安全な分類を記録する。Authorization header、環境変数、prompt全文、filesystem absolute path、user-specific値はsummaryへ保存しない。
- wire bodyは機密混入の可能性があるため、raw fileを`.artifacts/trigger-eval-otel-probe-20260911/`配下のGit管理外へ限定保存する。Run Artifactへはbody length、SHA-256、content type、parse結果、必要なmetric summaryだけを記載し、raw payloadはcommitしない。
- 実測したraw bodyに指定3 queryの全文、`C:\\Users\\...`などのabsolute path、credential patternは存在しなかった。一方、metric属性名に`prompt`や`secret`の一般語が含まれるpayloadはあったため、rawを永続Artifactへ複製しない。

## 6. Probe実行条件

診断probeはQualification、canonical、baseline取得ではない。既存dataset/query/Skill/Hook/selector/timeoutを変更せず、各caseを一度だけ実行した。

| Probe | 固定入力 | 実行回数 | Target | OTel endpoint | 判定上の注意 |
| --- | --- | ---: | --- | --- | --- |
| Explicit | `$feature-plan を使って、この依頼の実装計画だけを作ってください。` | 1 | fresh detached Target | case-local localhost | explicit markerを含む |
| Implicit | dataset `feature-plan-train-001`のquery | 1 | 同じfresh Target | 別case-local localhost | queryはdatasetからそのまま使用 |
| Negative | `package.json に記載されている package name だけを確認して答えてください。` | 1 | 同じfresh Target | 別case-local localhost | canonical injection 0件候補 |

ExplicitのCodex起動前に一時wrapperのWindows `.cmd` spawn/config quoting failureが2回発生したが、queryはCodexへ実行されず、receiverにもprobe payloadは到達しなかった。これはprobe caseの実行回数に含めない。wrapperを修正した後のCodex processはExplicit 1回だけである。Implicitは一度実行し、固定上限を超えたため停止した。再実行はしていない。

## 7. Probe結果

| Probe | expected | OTel canonical Skill | Hook initial Skill | process | collector / flush | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| Explicit | `feature-plan` | `feature-plan` 2 datapoints。`invoke_type=explicit`と`implicit`、両方`status=ok`、同一timestamp | unavailable（fresh Targetのproject trust未永続化でHook recordなし） | exit 0、`turn.completed` | 4 HTTP request、全JSON parse成功。process終了後に最終batchを受信 | OTel routing identityは観測可能。datapoint数は2でorder正本不可 |
| Implicit | `feature-plan` | `feature-plan` 1 datapoint。`invoke_type=implicit`、`status=ok` | unavailable | fixed `CASE_TIMEOUT_MS=327000`超過後に診断停止、trusted terminalなし | 7 HTTP request、全JSON parse成功。graceful flushは未確認 | routing metricは観測されたがcaseはunobservable |
| Negative | `null` | 0 datapoint | unavailable | exit 0、`turn.completed` | 1 HTTP request、JSON parse成功。process終了直前にbatch受信 | collector/export/parseとprocessは成立。OTel trusted absence候補。ただしHook相関なし |

### 7.1 OTel属性の実測

| payload | metric | type / value | `skill` | `status` | `invoke_type` | `plugin_id` | timestamp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Explicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `explicit` | `unattributed` | 同一値 |
| Explicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `implicit` | `unattributed` | 上段と同一 |
| Implicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `implicit` | `unattributed` | 単独値 |
| Negative request-001 | なし | — | — | — | — | — | — |

Explicitでは、同一canonical Skillが異なる`invoke_type`で2 datapointsになった。これは「datapoint 1件」を成功条件にできないこと、同じSkillの複数injectionをcounterが表現し得ることの実測根拠である。`skill`はpathやdisplay nameではなく、実測payloadではcanonical name `feature-plan`だった。mappingは6値の完全一致だけで行い、substring・path suffix・display name推測はしない。

## 8. Metric semanticsの確定範囲

実測と公式名から、`codex.skill.injected`は「Skill injection成功に関連するcounter event」として扱う。これを「最初に選択されたSkill」「SKILL.mdのread syscall」「turn完了」「Skillの全履歴」と同一視しない。

| 論点 | Evidence / 判断 |
| --- | --- |
| 選択時点か | `invoke_type`が`explicit`/`implicit`を区別して出たため、routing/invocation経路に近い。しかしselection前後の全内部stateは出ないため、metricだけを選択decision全体の正本にはしない |
| injection成功か | `status=ok`のpointがcanonical Skill名とともに出た。0.153.4で成功metricとして受理するstatusは`ok`に限定する |
| read成功か | Hook direct-readとは異なる。OTel pointはSkill injection観測であり、Hook read成功の代替証明ではない |
| explicit / implicit | 同じmetricで`invoke_type`が分かれる。Explicitでは両方が同時に出たため、このattributeを単独でdatapoint dedup keyにしない |
| failure injection | 3probeではfailure statusを観測していない。`ok`以外のstatusは成功injectionにもabsenceにも数えず、unobservableへfail-closeする |
| 複数回増加 | Explicitの同一Skill 2 pointで可能性を実証した。raw event countは保存するが、routing identityはunique canonical setで扱う |
| built-in / 外部Skill | `skill`完全一致が6 canonical以外ならmappingせず、unknown injectionとしてunobservableにする |
| repository Skill識別 | `skill`属性を6 canonical name allowlistへexact mapする。path解析はしない |
| statusの意味 | 0.153.4では`ok`を実測。`success`を仮定しない。future versionでstatus mappingが変われば実装を止める |

## 9. 順序、aggregation、case相関

- 各datapointには`timeUnixNano`があるが、Explicitの2 datapointsは同一timestampであり、同じSkillでも順序を判別できなかった。
- metric typeは`sum`であり、export requestはbatchである。request到着順はinjection event順ではない。後続requestには周期的に別metricが含まれ、OTel export orderをturn/event orderとみなせない。
- `invoke_type`はidentityの補助属性であり、global sequence numberではない。datapoint配列順、metric配列順、HTTP request順から`initial_skill`を推測しない。
- `1 process = 1 case`、case-local endpoint、case-local collection window、Codex PID、process終了、receiverのbody hashをcorrelation keyとする。turn IDがOTel metricにないことはこのcase isolationで補うが、同一processへ複数queryを送るrunner設計は採用しない。
- process終了後、receiverへHTTP 200 responseを伴うpayloadが到達したことをflush evidenceとする。ただしCodexから明示的なflush acknowledgementは得られないため、実装ではprocess close後のbounded waitを置き、late export・no export・parse failureをunobservableにする。
- 前caseのmetric混入は、receiverをcaseごとにbindして閉じ、次caseで新port/new directoryを使うことで防ぐ。receiver failureでport reuseやshared bufferへのfallbackはしない。

## 10. 採用案の比較

| 案 | 評価 | 決定 |
| --- | --- | --- |
| A. OTel主観測 | Explicit/Implicitでcanonical nameとstatusを受信し、Negativeでは正常processとparse成功を伴う0件を得た。shell表記に依存しない。単一Skill identityは取得できるが、複数Skill order、unknown/status異常、flush failureはfail-closeが必要 | **採用** |
| B. Hybrid | Hookをinitial order/fallback、OTelをabsenceへ使う設計は可能。ただしfresh TargetでHook trustがなく、Hookを必須にすると今回のHost制約を再び抱える。PR2 single-intentではOTel unique setだけでidentityを決められるため、primaryにはしない | 不採用。Hookは診断・旧artifact互換用に残す |
| C. OTel不採用 / Hook継続 | OTel payloadが存在しない場合の結論ではない。0.153.4で直接metricを受信でき、Negative 0件とcollector parseを分離できたため、主観測としての導入可能性はある | 不採用 |
| D. Host能力でbaseline取得不能 | 今回のHostではfresh TargetのHook correlationは不能、Implicit queryはtimeoutした。しかしこれはOTelそのものの観測不能ではなく、OTelでrouting identityが得られた証拠があるため、全体baseline不能の結論にはしない | 今回は不採用。Hook trust/lifecycle failureは個別unobservableとして扱う |

## 11. 採用する観測契約

### 11.1 Routing observation

1. collectorがcase-localで起動し、bind成功する。
2. OTLP HTTP responseが2xxで、payloadがJSONとしてparseできる。
3. `codex.skill.injected`の各pointを検証する。
   - metric nameは`codex.skill.injected`に完全一致。
   - typeは`sum`。
   - `status`は`ok`に完全一致。
   - `skill`は6 canonical Skill名の完全一致。
   - `skill`以外の属性はrouting identityの判定に使わない。
4. canonical Skill名をunique setへ集約する。raw datapoint count、timestamp、invoke typeはdiagnostic evidenceとして保持する。
5. unique canonical setが次のとおりである場合だけ既存Result schema 2へ写像する。
   - `0`: process/lifecycle/collector/export/flush/parseが正常ならtrusted absence候補、`observed_skills=[]`。
   - `1`: そのSkillを`initial_skill`、`observed_skills=[skill]`へ写像する。同一Skillのduplicate pointはorder ambiguityとしないが、duplicate countを隠さない。
   - `2以上`: 初期順序を推測せず、`observed_skills=null`のunobservable。
6. unknown Skill、built-in Skill、外部repository Skill、`status != ok`、malformed point、attribute欠落、予期しないmetric schemaは`observed_skills=null`とする。unknownを`null`へ変換してNegative PASSへ流さない。

### 11.2 Positive契約

- `expected_skill`がcanonicalで、collector/export/flush/parseが成立し、unique canonical setがexactly `{expected_skill}`ならrouting identityはobservableである。
- `{other_canonical_skill}`は既存`scoreInitialRouting`へ渡し、expectedとのboundaryに応じて`false_negative`または`sibling_misroute`を既存契約どおり算出する。
- unique setが複数、unknownを含む、status異常、telemetry failure、flush未確認は`unobservable`。最初に見えたpoint、timestampの早いpoint、HTTP到着順を`initial_skill`にしない。
- process lifecycleはrouting outcomeと別集計する既存契約を維持する。trusted positive emission後のprocess timeoutは既存Result semanticsに従い、routing outcomeを保持して`process_lifecycle=timed_out`とする。ただしEnvironment Qualificationのgateはprocess正常終了条件を別途維持する。

### 11.3 Negative trusted absence契約

Negativeを`pass`へ進める条件は、単なるmetric 0件ではなく、すべてを満たすことである。

- Codex processが`turn.completed`、exit 0、timeout/spawn/signaledなし。
- receiverがcase-local bind成功し、listener failureがない。
- OTLP HTTP requestを少なくとも1つ受信し、HTTP response 2xx、JSON parse成功。
- process終了後のbounded flush waitが完了し、遅延exportがないことを確認。
- `codex.skill.injected`が0件。
- unknown / noncanonical / non-`ok` Skill pointが0件。
- Hookの有無やshell command shapeとは独立して、OTel correlationがcase-localで成立している。

どれか一つでも欠ける場合は`observed_skills=[]`にせずunobservableとする。receiver未起動、export failure、flush未確認、malformed body、前case混入はrouting qualityやNegative absenceではなく観測基盤failureである。

### 11.4 `status`、unknown、built-in、複数Skill

- 0.153.4で実測した成功statusは`ok`だけを受理する。`success`、`failure`、`error`、その他は未確認のため成功・absenceへ補完しない。
- failure injectionは、失敗したためSkill routingが成立したとは扱わない。metricが存在しても`status != ok`ならunobservableとし、Negative absenceにも数えない。
- `skill`属性が6 canonical以外の場合は、`initial_skill=null`のobservable outcomeへ変換しない。Result schema 2で表現できないためunobservableにする。
- unique canonical Skillが2以上の場合は、timestampに差があってもsingle-intent initial orderを推測しない。PR6のmulti-Skill workflowは対象外である。

## 12. Hookとの責務分離と既存selector

- OTelはTrigger Evalのprimary routing observerとし、Skill injection identity / trusted absenceを担当する。
- Hookは、既存artifactの診断情報、旧Resultとの調査比較、OTel導入前artifactの解釈に残す。ただし新Qualificationのprimary PASS条件にHookのshell representationを要求しない。
- `APPROVED_PACKAGE_NAME_COMPOUND`、Target-aware absolute recognition、generic bounded tokenizer、`classifyCommand`、`classifyHookEvent`は今回削除しない。既存artifact互換とfallback診断のため残すが、新しいHost shell shapeを主観測へ追加するruleは作らない。
- OTel parserとsecurity目的の`.codex/hooks/pre_tool_use_policy.mjs`を共通化しない。security parserはsecurity boundary、OTel observerはtelemetry boundaryとして分離する。
- 今回のfresh Targetではproject trustが永続化されず、既存Hook recordが3probeとも0件だった。これはHookを無効化した結果ではなく、fresh path上のHost capability limitationである。将来のQualificationではHookの存在を必須にせず、OTelが主相関を担えることをpreflightで検証する。
- 既存Negative Plan `docs/plans/2026-09-11_010903_trigger-eval-negative-qualification-blocker-remediation.md`は削除・上書きしない。OTel方式を使えない旧runnerまたは診断fallbackのbounded ruleとして**保留・fallback**にする。OTel主観測の成功後にこのPlanの固定shapeを追加実装することはしない。

## 13. Result schema、8/8 validity、comparisonへの影響

### 13.1 Result schema 2

- serialized Result schema 2の`initial_skill`、`observed_skills`、`outcome`、`unobservable_reason`、`process_lifecycle`、`summary`のshapeは維持する。migrationやschema version 3は作らない。
- `observed_skills`は既存コメントどおり、trusted absenceでは`[]`、untrustedでは`null`、unique canonical Skillでは`[skill]`とする。
- `selector_reliable`はrenameせず、observerがOTelの場合は「選択されたrouting observerが信頼可能」という後方互換の意味へ文書化する。shell selectorだけを意味する名称へ狭く固定しない。
- `ObservationSignals`など内部型には`observation_source`、telemetry collector/flushの判定を持たせてよいが、CaseResultのserialized fieldへ新しいtelemetry payloadやraw attributesを追加しない。
- telemetry failureとHook failureは内部判断・Run Artifactで区別し、Result schema 2へunknown Skillやraw failure statusを誤った`null`/`[]`として出力しない。既存の`unobservable_reason`互換値へ写像する場合も、collector evidenceを別に保持する。

### 13.2 8/8 side validity

- OTelで0件のNegativeをtrusted absenceへするには、Negative process、collector、export、flush、parseの全条件を満たす必要がある。これによりtelemetry failureをrouting failureとして8-sideへ数えない。
- Positiveはunique canonical setが1つであることをrouting観測条件とし、process lifecycleは既存の別dimensionで集計する。
- unknown、複数、status異常、timeout前のabsenceはunobservableであり、8/8 observable sideへ昇格しない。
- Environment QualificationはNegative / Positive controlの両方が既存gateを満たしたときだけPASSとする。今回のImplicit timeout、Hook unavailable、既存Negative FAILは変更しない。

### 13.3 Comparison

- baselineとcandidateは同じEvaluator source SHA、同じOTel observer実装、同じmetrics config、同じcase-local collector条件、同じResult schema 2を使用する。
- observer実装前のHook artifactとobserver実装後のOTel artifactを、同じ契約のbaseline/candidate比較へ直接混ぜない。
- `evaluator_git_sha`と`routing_source_git_sha`の既存provenanceを維持し、観測契約の実装commitをEvaluator SHAとして固定する。新しいversion fieldは追加しない。
- comparisonは既存の`outcome`と`process_lifecycle`を使い、raw telemetry count、HTTP request count、Hook event countをscoreへ混ぜない。

## 14. 実装対象fileと非対象file

### 14.1 変更するfile

次回の承認済み実装Runでは、以下だけを変更する。

- `scripts/evals/otel-skill-observer.ts`
  - case-local localhost HTTP receiver
  - narrow OTLP JSON parser
  - `codex.skill.injected` exact metric validation
  - status/skill/invoke_type parsing
  - unique canonical set、duplicate count、timestamp/order ambiguity、collector/export/flush state
- `scripts/evals/run-skill-trigger-evals.ts`
  - `executeCodex`のcase-local observer lifecycle
  - process-local OTel `-c` override
  - process close後flush wait、receiver failure、前case混入防止
  - OTel observationを既存`ObservationSignals`へ渡すsource-specific変換
  - 既存Hook captureはdiagnostic/fallbackとして維持
- `scripts/evals/skill-trigger-evals.ts`
  - OTel sourceのtrusted absence / unique-one / multiple / unknown / failure mapping
  - `selector_reliable`の後方互換な意味拡張
  - serialized Result schema 2 shape維持
- `tests/repository-contract/otel-skill-observer.test.ts`
  - observer parser/collectorのpure fixtureとfailure contract
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - OTel-derived signalsと既存outcome/lifecycle/comparisonの回帰
- `docs/adr/0024-trigger-eval-otel-observation-contract.md`
  - 実装が承認され、focused testsで契約が確定した後にContext / Decision / Consequencesを記録する。

### 14.2 変更しないfile

- `package.json`、`pnpm-lock.yaml`、Repository dependency
- `.codex/config.toml`、`.codex/hooks/**`、`.codex/rules/**`
- `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、既存`docs/history/**`
- `.agents/skills/**`、Trigger dataset YAML、query、case ID、`expected_skill`、boundary
- Product source、Hook security parser、timeout `CASE_TIMEOUT_MS = 327_000`
- `.codex/runs/`の過去Run、今回以外のRun Artifact

### 14.3 追加・削除

- 追加するtracked sourceは`otel-skill-observer.ts`とそのcontract testだけで、OTel SDKやcollector packageは追加しない。
- `docs/adr/0024...`は実装Runの恒久設計記録として追加する。
- 既存selector、Negative Plan、既存Hookは削除しない。
- raw receiver、raw OTLP body、download、build outputはtracked fileへ追加しない。

## 15. 実装処理経路

```text
evaluateCases
  ↓
case-local OTel collector bind
  ↓
executeCodex（既存query、`--json`、`--ephemeral`、read-only、CLI OTel override）
  ↓
Codex process close / lifecycle parse
  ↓
bounded flush wait と receiver close
  ↓
OTLP JSON parse / exact metric filter
  ↓
status=`ok`確認 / exact canonical Skill mapping
  ↓
unique Skill set、duplicate、timestamp/order、telemetry stateを判定
  ↓
既存Hookはdiagnosticとして別保存
  ↓
OTel-derived ObservationSignals（Result schema 2へ写像）
  ↓
evaluateCase
```

具体的な実装境界は次のとおりとする。

- collector bind failureはCodexを起動する前に`unobservable`へする。
- `executeCodex`はqueryごとに一回だけspawnし、既存のprocess timeoutを変更しない。
- processが終了したら、receiverが最後のHTTP requestを受理し、body parseが完了するまでcase-local bounded waitを行う。wait内にpayloadがない・追加payloadが遅延する場合はflush未確認とする。
- receiverはmetric payloadを集約し、raw bodyをrunnerのResultへ流さない。
- `skill`のexact allowlist判定は`skill-trigger-evals.ts`の`CANONICAL_SKILLS`と重複した別一覧を作らず、共有importまたは一つの正本から行う。
- process lifecycleの`completed` / `turn_failed` / `timed_out`等の6値と固定優先順位は維持する。

## 16. Test計画

### 16.1 Observer unit / contract

以下のfixtureを必須とする。

- expected Skill exactly one、`status=ok`、`invoke_type=implicit`
- expected Skill exactly one、duplicate same Skill、same timestamp、explicit/implicit混在
- wrong sibling Skill exactly one
- canonical Skill 0件でcollector/export/flush/parse成功
- canonical Skill複数、timestampが同じ、timestampが異なる、export requestが分割されるケース
- unknown Skill、built-in/external-looking Skill、path値、display name、substring近似
- `status=ok`以外のfailure/error/unknown status
- metric name/type違い、attribute欠落、malformed JSON、malformed point
- collector未起動、bind failure、HTTP non-2xx、export failure、flush未確認
- 前case telemetry混入、duplicate request、late request、receiver close failure

### 16.2 Existing evaluator regression

- Result schema 2の`observed_skills=[]` / `[skill]` / `null`三状態
- positive expected / wrong sibling / unexpected trigger / false negative
- telemetry failureとHook correlation failureをPASSへ補完しないこと
- process failed / timed out / `turn.failed` / trusted positive後timeoutの既存semantics
- `summary.by_outcome`と`summary.by_process_lifecycle`の分離
- comparisonのbaseline/candidate schema、provenance、unobservable transition
- existing relative read、Target-aware absolute read、negative exact compound、candidate prefixのHook fallback回帰

### 16.3 Static / safety

- `pnpm run lint:markdown`
- 対象source/test/ADR/RunのPrettier check
- `git diff --check`
- dataset / Skill / Markdown validation
- `pnpm run verify`
- dependency diffがないこと、tracked `.codex/config.toml` / Hook / query / dataset差分がないこと
- evaluation schema validation、sanitizer Write/Check、strict collector

OTLP receiverを実際に使うfocused integrationは、unit/contract testが先にPASSした後に一回だけ実行する。source変更後の実runtimeでは、同じ条件を無目的に繰り返さない。

## 17. 実装後のQualification手順

1. Plan承認後、上記の変更fileだけを実装する。
2. focused observer/evaluator testsをPASSさせる。
3. dataset、Skill、Markdown、Prettier、diff、full verifyをPASSさせる。
4. Evaluator source SHAを固定し、実装後はQualification中に変更しない。
5. fresh independent Routing Targetを新規作成する。detached、clean、expected Routing SHA、6 Skill readable、dataset/evaluator artifact分離、common-dir/alternatesをpreflightする。
6. Targetのproject trust、OTel endpoint、receiver bind、Hook/OTel configが意図どおりであることをprobe前に確認する。認証を複製しない。
7. Negativeを固定queryで1回実行する。
8. Negativeのprocess、collector、export、flush、parse、0 canonical injectionが全PASSのときだけPositiveを1回実行する。
9. NegativeまたはPositiveがFAIL/unobservableならcanonical `all`、8/8 side、valid baselineは実行しない。
10. 両controlがPASSした場合だけEnvironment Qualification PASSを記録する。
11. 同じfresh Target、同じEvaluator SHA、同じobserver条件でcanonical `all`を1回だけ実行する。
12. baseline/candidateの両側へ同じOTel observer契約を適用し、比較前にprovenanceを確認する。

retry、query tuning、別Target交換、Host shell shape rule追加、OTel 0件の補完判断は禁止する。

## 18. 停止条件

次のいずれかで実装・Qualificationを止める。

- 0.153.4または固定versionで`codex.skill.injected`を受信できない。
- process-local CLI overrideがtracked config変更なしに成立しない。
- collector failure、export failure、flush未確認、malformed payload、case cross-contaminationを検出した。
- metric name/type/status/skill semanticsがversion変更で未確認になった。
- `skill`を6 canonicalへ完全一致mappingできない。
- 複数canonical Skillの初期順序を要求するcaseがPR2へ混入した。
- process failure/timeout前の0件をtrusted absenceにできない。
- raw telemetryにcredential、Authorization、prompt全文、absolute pathが入り、保存前に安全に分離できない。
- expected Routing SHA、Evaluator SHA、Target isolation、dataset fingerprint、Result schema 2が不一致。
- 同一failureがretry停止条件に到達した、または次の仮説なしに再実行する状態になった。

停止時は`unobservable`または`BLOCKED`として根拠、未実行validation、次の対応者をRun Artifactへ記録する。shell regexを追加して停止条件を回避しない。

## 19. 今回の調査Runにおける完了境界

今回のRunで完了したのは、公式仕様確認、0.153.4実測、最大3probe、OTel/Hook/process比較、A案の設計判断、新Plan作成である。今回のprobe結果はQualification、canonical、baseline、8/8 validityへ昇格しない。

今回のruntime状態は次のまま維持する。

- Negative Qualification: FAIL（既存固定shape外のHook evidence）
- Positive Qualification: 未実行
- Environment Qualification: FAIL
- canonical `all`: 未実行
- 8/8 side validity: 未判定
- valid baseline: 未取得

今回のPlan-only validationでは、source/test/ADR/Product/dataset/Skill/Hook/configへ実装差分を作らない。次回の実装は、このPlanのfile scope、observer contract、failure semantics、Qualification順について承認を得た後だけ開始する。

## 20. 対象外

- OTel logsをrouting observerへ統合すること
- OTel SDK、外部collector、Docker、global package、general telemetry frameworkの導入
- Codex versionの更新、config precedenceの変更、認証方式の変更
- Skill description、query、dataset、expected outcome、boundaryの変更
- PowerShell / shell一般parser、regex拡張、security parser共通化
- PR2のmulti-Skill workflow、Skill chain、PR6 semantics
- Result schema 3、raw telemetryのResult埋め込み、score dashboard、remote telemetry backend
- Qualificationのretry、canonical allの先行実行、valid baselineの推測

## 21. 完了条件

- `codex.skill.injected`のformal name、type、attributes、status、skill mappingを固定versionで実証できる。
- explicit / implicit / Negativeのcase-local evidence、Hook状態、process lifecycle、collector/flushを比較できる。
- unique canonical set 0 / 1 / 2+の扱い、duplicate、unknown、failure、telemetry failure、order ambiguityをfail-closeで定義している。
- A/B/C/Dの比較とA案の採用理由がある。
- Result schema 2、8/8 validity、comparisonへの影響が明記されている。
- 実装対象file、変更しないfile、追加/削除、処理経路、tests、Qualification、停止条件が確定している。
- 既存Negative Planはfallbackとして保留し、既存shell selectorはprimaryから外すが削除しない。
- 今回のtracked差分は新Plan、新Run Artifact、必要最小限のPR本文追記だけである。
