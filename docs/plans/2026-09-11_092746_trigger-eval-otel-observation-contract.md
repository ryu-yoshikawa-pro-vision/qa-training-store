# PR #127 Trigger Eval OTel観測契約 実装Plan（レビュー修正版）

> Status: レビュー指摘を反映済み、実装承認前のPlan。今回のRunではTrigger Eval本体、dataset、Skill、Hook、Result schemaを変更しない。
>
> 対象: Issue #117 / PR #127 / branch `refactor/117-pr2-trigger-eval-baseline`
>
> 調査Run: `.codex/runs/20260911-083242-JST/`
>
> レビュー修正Run: `.codex/runs/20260911-142800-JST/`

## 1. 目的

PR2のTrigger Evalは、`PostToolUse`のshell commandから`SKILL.md` direct-readを推定し、最初のcanonical Skillを`initial_skill`としている。Hostが同じ処理を別のPowerShell表現で出力するたびに、固定shapeの追加、`artifact_contract_gap`、Qualification停止が発生する。

今回の目的は新しいshell regexを追加することではなく、Codex自身が出力するSkill injection telemetryを、shell表記とは独立したrouting observationへ昇格できるかを確定することである。診断結果に基づき、実装者が判断を残さずに進められる観測契約、処理経路、変更file、tests、Qualification順、停止条件を定義する。

今回の採用案は **A: OTelをTrigger Evalの主観測へ採用** とする。ただし、OTelを「任意のSkill選択順序」や「process成功」の代替にはしない。`codex.thread.started`を独立したtelemetry liveness controlとして検証したうえで、`codex.skill.injected`で得るcanonical Skill集合、process lifecycle、collector/export、process close起算のquiet 1,000ms / hard cap 5,000msを別々に検証し、単一SkillのidentityだけをPR2の`initial_skill`へ写像する。

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
| metric attributes | `status`、`skill`。OTel contextとして`auth_mode`、`originator`、`session_source`、`model`、`app.version`も出る | routing契約は`skill`、`status`、counter valueの形式だけを検証する。`invoke_type`、`plugin_id`、context属性は診断専用で、identity・absence・dedup・順序・outcomeの入力にしない |
| telemetry liveness control | catalog名は`thread.started`、runtime export nameは`codex.thread.started`。公式catalogではCounter、実測exportは`sum` | `codex.thread.started`に完全一致し、type=`sum`、numericかつpositiveなdatapointを少なくとも1件要求する。Skill routingには使わず、欠落・不正ならOTel観測をunobservableにする |
| OTel logsとmetrics | 別のexport設定 | 今回はmetricsだけを有効化し、logsをrouting証拠へ混ぜない |
| config precedence | CLI overrideが最優先 | `codex exec`のcase-local `-c`だけを使い、tracked `.codex/config.toml`を変更しない |
| exporter | OTLP HTTP / gRPC等。batch非同期、shutdown時flush | localhost OTLP HTTP JSONをcaseごとに起動し、child close起算のquiet 1,000ms / hard cap 5,000msで受信を確認する |
| 環境変数 | stableなCodex環境変数の正本にOTel専用overrideはない | `OTEL_*`の未確認環境変数は使わない。既存認証を読み取り、`CODEX_HOME`やcredentialを複製しない |

公式ページのcatalog表記と実OTLP export nameにprefix差があるため、Plan・実装・reportでは両方を記録する。`thread.started`は公式catalog名、`codex.thread.started`は実OTLP exportの完全一致名である。0.153.4で利用可能という判断は最新版文書の記載だけではなく、Explicit / Implicit / Negativeの3 raw probeで同じcontrol metricを各1件受信した事実でも実証する。

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
- receiverはcaseごとに`127.0.0.1:0`へbindし、OSが割り当てた実portを取得してCodex CLIのcase-local overrideへ渡す。固定port、port reuse、shared listenerは使わず、probeごとにdirectory、process、request bodyを分離する。
- OTLP JSONをparseし、metric名、type、datapoint数、timestamp、`skill` / `status` / counter valueをformalに検証する。`invoke_type` / `plugin_id`は診断分類として保存してよいが、routing contractには含めない。Authorization header、環境変数、prompt全文、filesystem absolute path、user-specific値はsummaryへ保存しない。
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

| Probe | expected | OTel control liveness | OTel canonical Skill | Hook initial Skill | process / quiet collection | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| Explicit | `feature-plan` | `codex.thread.started` / `sum` / positive numeric 1件 | `feature-plan` 2 datapoints。`status=ok`、同一timestamp | unavailable（fresh Targetのproject trust未永続化でHook recordなし） | exit 0、`turn.completed`。4 HTTP request、全JSON parse成功。close起算のquiet 1,000msを完了し、quiet中のlate requestなし | OTel routing identityは観測可能。datapoint数や属性順は正本不可 |
| Implicit | `feature-plan` | `codex.thread.started` / `sum` / positive numeric 1件 | `feature-plan` 1 datapoint。`status=ok` | unavailable | fixed `CASE_TIMEOUT_MS=327000`超過後に診断停止、trusted terminalなし。7 HTTP request、JSON parse成功。timeout probeとしてはwindowを完了したがcaseはunobservable | routing metricは観測されたがcaseはunobservable |
| Negative | `null` | `codex.thread.started` / `sum` / positive numeric 1件 | 0 datapoint | unavailable | exit 0、`turn.completed`。1 HTTP request、JSON parse成功。close起算のquiet 1,000msを完了し、quiet中のlate requestなし | control livenessとprocess/collectionは成立。OTel trusted absence候補。ただしHook相関なし |

### 7.1 OTel属性の実測

| payload | metric | type / value | `skill` | `status` | `invoke_type` | `plugin_id` | timestamp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Explicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `explicit` | `unattributed` | 同一値 |
| Explicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `implicit` | `unattributed` | 上段と同一 |
| Implicit request-001 | `codex.skill.injected` | `sum`, value `1` | `feature-plan` | `ok` | `implicit` | `unattributed` | 単独値 |
| Negative request-001 | なし | — | — | — | — | — | — |

Explicitでは、同一canonical Skillが2 datapointsになった。これは「datapoint 1件」を成功条件にできないこと、同じSkillの複数injectionをcounterが表現し得ることの実測根拠である。`invoke_type`の違い、`plugin_id`、datapoint配列順はrouting契約に採用しない。`skill`はpathやdisplay nameではなく、実測payloadではcanonical name `feature-plan`だった。mappingは6値の完全一致だけで行い、substring・path suffix・display name推測はしない。

### 7.2 保存済みraw evidenceのprocess / request時系列

`meta.json`の`started_at` / `finished_at`はprobe wrapperが観測したCodex childのspawn開始・child `close`時刻として扱う。`stdout.jsonl`の最終`turn.completed` eventはExplicitが70行目、Negativeが12行目に存在するが、event自身にtimestamp fieldがない。したがって`turn.completed`をquiet / hard capの基準時刻にせず、runnerが取得できるchild `close` event（`finished_at`、`exit_code`、`signal`）をprocess closeの正本とする。OTLP `codex.process.start` datapointはtelemetry上のstart観測であり、wrapperのspawn開始時刻やcollection起算点を置き換えない。

| Probe | child spawn開始（`meta.started_at`） | `turn.completed` | child close / exit | OTLP request受信時刻（process closeとの差） | 主なmetric / 判定 |
| --- | --- | --- | --- | --- | --- |
| Explicit | `00:03:23.203Z` | stdout line 70、timestampなし | `00:07:03.242Z`、exit `0` | 1: `00:04:23.413Z`（-159,829ms）、2: `00:05:23.393Z`（-99,849ms）、3: `00:06:23.417Z`（-39,825ms）、4: `00:07:03.198Z`（-44ms） | request 1に`codex.thread.started` 1 point、`codex.skill.injected` 2 points（`feature-plan` / `status=ok`）。全4 bodyを直接JSON parseし、receiver eventのSHA-256と一致。 |
| Negative | `00:22:54.907Z` | stdout line 12、timestampなし | `00:23:31.577Z`、exit `0` | 1: `00:23:31.524Z`（-53ms） | request 1に`codex.thread.started` 1 point、`codex.skill.injected` 0 points。bodyを直接JSON parseし、receiver eventのSHA-256と一致。 |
| Implicit（timeout probe、正常flush根拠外） | `00:13:07.550Z` | terminal `turn.completed`なし | `00:20:47.432Z`、exit `1` | 1: `00:14:08.057Z`（-399,375ms）、2: `00:15:08.026Z`（-339,406ms）、3: `00:16:08.054Z`（-279,378ms）、4: `00:17:08.132Z`（-219,300ms）、5: `00:18:08.212Z`（-159,220ms）、6: `00:19:08.257Z`（-99,175ms）、7: `00:20:08.123Z`（-39,309ms） | request 1に`codex.thread.started` 1 point、`codex.skill.injected` 1 point（`feature-plan` / `status=ok`）。約60秒周期のexportはtelemetry挙動の参考にするが、trusted terminalがないため正常shutdown flushの遅延根拠にはしない。 |

Completed probeのprocess closeから最終OTLP requestまでの遅延は、Explicit `-44ms`、Negative `-53ms`であり、process close後の実測late requestは0件（観測上の最大遅延は`0ms`）だった。closeに最も近いrequestはExplicitの44ms前であり、quiet `1,000ms`は956ms（約22.7倍）の追加余裕を持つ。request間隔はExplicitで59,980ms、60,024ms、39,781ms、Implicitで約60秒周期だった。これはprocess中のbatch exportであり、process close後のflush完了を意味しない。

## 8. Metric semanticsの確定範囲

実測と公式名から、`codex.skill.injected`は「Skill injection成功に関連するcounter event」として扱う。これを「最初に選択されたSkill」「SKILL.mdのread syscall」「turn完了」「Skillの全履歴」と同一視しない。`codex.thread.started`はOTel receiverとcase-local processが実際にmetricを受信できたことを確認するliveness controlであり、Skill identityやrouting outcomeには使わない。

| 論点 | Evidence / 判断 |
| --- | --- |
| 選択時点か | `invoke_type`は診断上の経路情報に過ぎず、selection前後の全内部stateや最初の順序を示さない。metricだけを選択decision全体の正本にはしない |
| injection成功か | `status=ok`のpointがcanonical Skill名とともに出た。0.153.4で成功metricとして受理するstatusは`ok`に限定する |
| read成功か | Hook direct-readとは異なる。OTel pointはSkill injection観測であり、Hook read成功の代替証明ではない |
| explicit / implicit | 同じmetricで`invoke_type`が分かれる。Explicitでは両方が同時に出たため、このattributeをrouting identity、absence、dedup、順序の入力にしない |
| failure injection | 3probeではfailure statusを観測していない。`ok`以外のstatusは成功injectionにもabsenceにも数えず、unobservableへfail-closeする |
| 複数回増加 | Explicitの同一Skill 2 pointで可能性を実証した。raw event countは保存するが、routing identityはunique canonical setで扱う |
| built-in / 外部Skill | `skill`完全一致が6 canonical以外ならmappingせず、unknown injectionとしてunobservableにする |
| repository Skill識別 | `skill`属性を6 canonical name allowlistへexact mapする。path解析はしない |
| control liveness | `codex.thread.started`に完全一致し、type=`sum`、numericかつpositiveなpointが1件以上あればreceiver/process livenessのcontrolを満たす。counter valueはevent件数として数えない。欠落・type違い・非numeric・0以下はunobservable |
| statusの意味 | 0.153.4では`ok`を実測。`success`を仮定しない。future versionでstatus mappingが変われば実装を止める |

## 9. 順序、aggregation、case相関

- 各datapointには`timeUnixNano`があるが、Explicitの2 datapointsは同一timestampであり、同じSkillでも順序を判別できなかった。
- metric typeは`sum`であり、export requestはbatchである。request到着順はinjection event順ではない。後続requestには周期的に別metricが含まれ、OTel export orderをturn/event orderとみなせない。
- `invoke_type`と`plugin_id`はdiagnostic attributeであり、identity、global sequence number、dedup keyではない。datapoint配列順、metric配列順、HTTP request順から`initial_skill`を推測しない。
- `1 process = 1 case`、case-local endpoint、case-local quiet/hard-cap window、Codex PID、process終了、receiverのbody hashをcorrelation keyとする。turn IDがOTel metricにないことはこのcase isolationで補うが、同一processへ複数queryを送るrunner設計は採用しない。
- process close後は、後述の固定quiet period中に受信したrequestをすべて同じcaseへ取り込む。quiet完了時にreceiverをcloseするため、`late request`は「process close後かつreceiver close前に受信したrequest」と定義する。receiver close後に到着するrequestはこの契約では観測できず、後から不在を保証したり、collection成功を遡及変更したりしない。Codexから明示的なflush acknowledgementは得られないため、flush成功とは記録せず、window内のexport・no export・parse failureを契約どおり判定する。
- 前caseのmetric混入は、receiverをcaseごとに`127.0.0.1:0`へbindしてcloseし、取得した新port/new directoryを次caseだけへ渡すことで防ぐ。receiver failureでport reuseやshared bufferへ切り替えない。

## 10. 採用案の比較

| 案 | 評価 | 決定 |
| --- | --- | --- |
| A. OTel主観測 | Explicit/Implicitでcanonical nameとstatusを受信し、全3probeで独立control livenessも受信した。Negativeでは正常processとparse成功を伴う0件候補を得た。shell表記に依存しない。単一Skill identityは取得できるが、複数Skill order、unknown/status異常、quiet/hard-cap collection failureはfail-closeが必要 | **採用** |
| B. Hybrid | Hookをinitial order/diagnostic path、OTelをabsenceへ使う設計は可能。ただしfresh TargetでHook trustがなく、Hookを必須にすると今回のHost制約を再び抱える。PR2 single-intentではOTel unique setだけでidentityを決められるため、primaryにはしない | 不採用。Hookは診断・旧artifact互換の別経路に残し、新OTel runのscoringへ使わない |
| C. OTel不採用 / Hook継続 | OTel payloadが存在しない場合の結論ではない。0.153.4で直接metricを受信でき、Negative 0件とcollector parseを分離できたため、主観測としての導入可能性はある | 不採用 |
| D. Host能力でbaseline取得不能 | 今回のHostではfresh TargetのHook correlationは不能、Implicit queryはtimeoutした。しかしこれはOTelそのものの観測不能ではなく、OTelでrouting identityが得られた証拠があるため、全体baseline不能の結論にはしない | 今回は不採用。Hook trust/lifecycle failureは個別unobservableとして扱う |

## 11. 採用する観測契約

### 11.1 Routing observation

1. collectorがcase-localで`127.0.0.1:0`へbind成功し、OS割当portを取得してからCodex CLIへ渡す。bind failureはCodex起動前にunobservableとする。
2. OTLP HTTP requestを受信し、responseが2xxで、payloadがJSONとしてparseできる。
3. telemetry liveness controlとして`codex.thread.started`を検証する。
   - metric nameは`codex.thread.started`に完全一致。
   - typeは`sum`。
   - datapoint valueはnumericかつfiniteでpositiveなものを少なくとも1件要求する。
   - `is_git`その他の属性はdiagnostic専用で、Skill routingへ渡さない。
   - control metricが欠落・不正なら、Skill metricが0件でもOTel観測全体をunobservableとする。
   - counter valueは存在確認だけに使い、event件数・Skill injection回数とは解釈しない。
4. `codex.skill.injected`の各pointを検証する。
   - metric nameは`codex.skill.injected`に完全一致。
   - typeは`sum`。
   - datapoint valueはnumericかつfiniteでpositiveなものだけをvalid pointとする。
   - `status`は`ok`に完全一致。
   - `skill`は6 canonical Skill名の完全一致。
   - `skill`以外の属性はrouting identityの判定に使わない。`invoke_type` / `plugin_id`はdiagnostic evidenceとして保持してよいが、identity・absence・dedup・順序に使わない。
5. canonical Skill名をunique setへ集約する。raw datapoint count、timestamp、`invoke_type`、`plugin_id`はdiagnostic evidenceとして保持する。counter valueはpresence確認だけに使う。
6. unique canonical setが次のとおりで、control livenessとcollection条件が成立した場合だけ既存Result schema 2へ写像する。
   - `0`: process lifecycleがcompleted、collector/export/JSON parse、固定quiet window、receiver close、control livenessが正常ならtrusted absence候補、`observed_skills=[]`。判定根拠はprocess close後の1,000msに新規requestを受信しなかったことに限定する。
   - `1`: そのSkillをobserverのidentityとして`initial_skill`、`observed_skills=[skill]`へ写像する。同一Skillのduplicate pointはorder ambiguityとしないが、duplicate countを隠さない。
   - `2以上`: 初期順序を推測せず、`observed_skills=null`のunobservable。
7. unknown Skill、built-in Skill、外部repository Skill、`status != ok`、malformed point、attribute欠落、予期しないmetric schema、control liveness failure、collector/export/collection failureは`observed_skills=null`とする。unknownやcontrol欠落を`null`/`[]`へ都合よく変換してNegative PASSへ流さない。
8. observerはidentityと観測信頼性だけを返し、outcome（`pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger`）を判定しない。outcomeは後段の`scoreInitialRouting`だけが決める。

### 11.2 Positive契約

- `expected_skill`がcanonicalで、control liveness、collector/export/固定quiet/hard-cap window/parseが成立し、unique canonical setがexactly `{expected_skill}`ならrouting identityはobservableである。
- `{expected_skill}`のidentityをobserverから受け取った後、既存`scoreInitialRouting`へ渡して`pass`を決める。
- `{sibling_canonical_skill}`は`scoreInitialRouting`で`boundary`に設定されたconfigured siblingなら`sibling_misroute`とする。
- `{other_canonical_skill}`はconfigured siblingでなければ`unexpected_trigger`とする。wrong Skillを`false_negative`にはしない。
- `false_negative`は、expected Skillがcanonicalで、観測がtrusted absence（`initial_skill=null`、`observed_skills=[]`）になった場合だけである。
- unique setが複数、unknownを含む、status異常、telemetry failure、固定quiet/hard-cap window未確認は`unobservable`。最初に見えたpoint、timestampの早いpoint、HTTP到着順を`initial_skill`にしない。
- process lifecycleはrouting outcomeと別集計する既存契約を維持する。trusted positive emission後のprocess timeoutは既存Result semanticsに従い、routing outcomeを保持して`process_lifecycle=timed_out`とする。ただしEnvironment Qualificationのgateはprocess正常終了条件を別途維持する。

### 11.3 Negative trusted absence契約

Negativeを`pass`へ進める条件は、単なるSkill metric 0件ではなく、すべてを満たすことである。

- Codex processが`turn.completed`、exit 0、timeout/spawn/signaledなし。
- receiverがcase-local `127.0.0.1:0` bindに成功し、取得したportをCodexへ渡し、listener failureがない。
- OTLP HTTP requestを少なくとも1つ受信し、HTTP response 2xx、JSON parse成功。
- `codex.thread.started`が完全一致、type=`sum`、numericかつpositiveなvalid pointを少なくとも1件持つ。これはliveness controlだけであり、Skill routingのidentityには使わない。
- process closeをchild `close` eventで取得し、`OTEL_COLLECTION_QUIET_MS = 1,000`の間に新規requestを受信せず、receiver closeまで完了する。quiet完了後に追加late requestがないことは要求・主張しない。Codexのflush acknowledgementは存在しないため、flush成功とは記録しない。
- `codex.skill.injected`が0件。
- unknown / noncanonical / non-`ok` / malformed Skill pointが0件。
- Hookの有無やshell command shapeとは独立して、OTel correlationがcase-localで成立している。

どれか一つでも欠ける場合は`observed_skills=[]`にせずunobservableとする。特にrequestがあってもcontrol metricがない場合、controlはあってもSkill pointがmalformedまたはunknownの場合はunobservableであり、Negative PASSへ補完しない。receiver未起動、export failure、quiet/hard-cap collection未確認、malformed body、前case混入はrouting qualityやNegative absenceではなく観測基盤failureである。

### 11.4 `status`、unknown、built-in、複数Skill

- 0.153.4で実測した成功statusは`ok`だけを受理する。`success`、`failure`、`error`、その他は未確認のため成功・absenceへ補完しない。
- failure injectionは、失敗したためSkill routingが成立したとは扱わない。metricが存在しても`status != ok`ならunobservableとし、Negative absenceにも数えない。
- `skill`属性が6 canonical以外の場合は、`initial_skill=null`のobservable outcomeへ変換しない。Result schema 2で表現できないためunobservableにする。
- unique canonical Skillが2以上の場合は、timestampに差があってもsingle-intent initial orderを推測しない。PR6のmulti-Skill workflowは対象外である。

### 11.5 固定collection window値とcompletion algorithm

process close後のcollectionは実装者が任意値を決める設定ではなく、次の固定constantを`run-skill-trigger-evals.ts`へ置く。runnerがchild process、receiver、request timestamp、closeを同じcaseで管理するため、collection lifecycleの所有者もrunnerとする。

```text
OTEL_COLLECTION_QUIET_MS = 1_000
OTEL_COLLECTION_HARD_CAP_MS = 5_000
```

- quiet periodは、process close後に新しいrequestを受信しないことを観測する1,000msである。Completed raw probeのprocess close後の最終request遅延はExplicit `0ms`、Negative `0ms`で、いずれも最終requestはclose前だった。closeに最も近いrequestでも53ms前なので、1,000msはその近接に対して947ms（約18.9倍）の追加余裕を持つ。これは「今後一切requestが来ない」保証ではなく、process close後の定義したquiet intervalにrequestがなかったという観測契約である。
- hard capはprocess closeから5,000msで、quiet periodの5倍とする。正常completed caseでは通常、最後のbatchがclose前に到着してquietはclose起算で一度だけ満了する。断続的なrequestがquiet timerを何度もresetしても、collectionを5秒を超えて延長しない。Implicitの約60秒周期exportはtrusted terminalのないtimeout probeなので、正常flush待ちの根拠にはせず、hard capをその周期まで伸ばさない。
- canonical 24 casesでは、completed caseが各回quiet満了まで待つ単純上限は`1,000ms × 24 = 24,000ms`（24秒）である。全caseがhard capへ到達する異常時の追加待機上限は`5,000ms × 24 = 120,000ms`（120秒）で、case timeoutやretryを含まない。正常時の安全なquietを性能だけを理由に短縮せず、hard capで異常時の無期限延長だけを防ぐ。
- この値は環境変数、CLI option、config fileへ外出しせず、依存追加も行わない。`CASE_TIMEOUT_MS = 327_000`はprocess executionの責務として変更せず、collection hard capとは別の時計とする。

completion algorithmは次の順序で固定する。

1. child processの`close` eventで`processCloseAt`、`exit_code`、`signal`、timeout状態を確定し、ここをquiet / hard cap両方の起算点にする。`turn.completed`はterminal typeの判定に使うが、timestampがないため起算点にしない。
2. `lastRequestAt`の初期値を`max(processCloseAt, 最終request受信時刻)`とする。process close前の最終requestがcloseの300ms前であっても、Negative absenceの安全性を優先し、quiet timerはprocess closeから改めて開始する。process close後にrequestがなければ、`processCloseAt + 1,000ms`で完了候補になる。
3. receiverがopenの間にprocess close後のrequestを受信したら、そのrequestを同じcaseへ追加し、`lastRequestAt = requestReceivedAt`としてquiet timerをその時点から再開始する。quiet timer満了前のrequestはlate requestとして正常に取り込む。quiet満了時刻がhard capを超える場合は、quiet成功ではなくhard capを優先する。
4. `processCloseAt + 5,000ms`までに`lastRequestAt`から1,000ms連続して新規requestがなければ、receiverをcloseし、collectionを`completed`とする。close後に到着するrequestはreceiverが閉じていて観測できないため、後からlate requestを検出する契約は持たない。
5. hard capへ到達した場合はreceiverをcloseし、collectionを成功扱いにせず、内部詳細原因を`collection_timeout`相当として`observation_reliable = false`、`unobservable`へ写像する。特にSkill 0件をtrusted absenceへ変換しない。

collection完了時に必ずRun Artifactのdiagnostic evidenceへ残せるよう、caseごとに`process close` timestamp、最初/最後のOTLP request timestamp、request count、上記2 constant、実collection duration、`completed` / `hard-cap reached`、control metric count、Skill metric countを取得する。Result schema 2へraw timestamp、request count、constant、OTLP属性は追加しない。保存時はGit管理外raw artifactでは必要に応じてtimestampを保持し、Run Artifactへはprocess closeからの相対msを優先する。

### 11.6 lifecycle別のcollectionとfailure

- `completed`: `turn.completed`のterminal event、child `close`、exit 0、signalなし、timeoutなしを確認した後も、必ず上記quiet / hard cap windowを実行する。quiet完了、receiver close、HTTP 2xx、JSON parse、control liveness、Skill validationがすべて成立してからunique Skill setを確定する。
- `timed_out`: `CASE_TIMEOUT_MS`でprocessを停止した後も、child `close`を取得できた場合は同じ最大5,000msのwindowを一度だけ実行し、既に送信中のtelemetryを回収する。collectionが正常完了し、timeout前に検証済みのcanonical unique Skillが1つだけ得られた場合は既存契約どおりrouting identityを保持して`process_lifecycle = timed_out`とする。Skill 0件、control欠落、malformed/unknown、複数Skill、hard cap到達はtrusted absenceへせずunobservableとする。
- `spawn_failed`: child processのcloseを待てないためquiet/hard-cap windowを開始せず、`spawn_failed` / `unobservable`として記録する。absence判定のための5秒待機はしない。
- receiver bind failure: `127.0.0.1:0`のbindに失敗した時点でCodexをspawnせず、別portへのretryもせず、caseを`unobservable`とする。
- receiver close failure、HTTP non-2xx、body parse failure、hard cap到達、window中のcase cross-contaminationはcollection failureとして扱う。quiet完了後にreceiverをcloseした時点までの観測だけを根拠にし、close後の将来request不存在は主張しない。

## 12. Hookとの責務分離と既存selector

- OTelはTrigger Evalのprimary routing observerとし、Skill injection identity / trusted absenceを担当する。
- Hookは、既存artifactの診断情報、旧Resultとの調査比較、OTel導入前artifactの解釈に残す。ただし新Qualificationのprimary PASS条件にHookのshell representationを要求しない。新OTel runではHookをscoring fallbackに使わない。
- `APPROVED_PACKAGE_NAME_COMPOUND`、Target-aware absolute recognition、generic bounded tokenizer、`classifyCommand`、`classifyHookEvent`は今回削除しない。既存artifact互換とlegacy diagnostic compatibilityのため残すが、新しいHost shell shapeを主観測へ追加するruleは作らない。
- OTel parserとsecurity目的の`.codex/hooks/pre_tool_use_policy.mjs`を共通化しない。security parserはsecurity boundary、OTel observerはtelemetry boundaryとして分離する。
- 今回のfresh Targetではproject trustが永続化されず、既存Hook recordが3probeとも0件だった。これはHookを無効化した結果ではなく、fresh path上のHost capability limitationである。将来のQualificationではHookの存在を必須にせず、OTelが主相関を担えることをpreflightで検証する。
- OTel observer failure時にHookがreliableでも、新OTel runのrouting resultは`unobservable`とする。Hookは診断値として保存できるが、OTelの欠落・不正をHookの成功で補完しない。
- 既存Negative Plan `docs/plans/2026-09-11_010903_trigger-eval-negative-qualification-blocker-remediation.md`は削除・上書きしない。OTel方式を使えない旧artifactの調査・legacy compatibility materialとして**保留**する。新runnerがこのPlanを自動採用したり、固定shapeを実装してOTel failureを回復したりすることはしない。

### 12.1 Observer-common internal contract

- `ObservationSignals`相当の内部信号は、`observation_source: "otel" | "hook"`、`observation_reliable: boolean`、process lifecycle fields、`initial_skill`、`observed_skills`、`unobservable_reason`を共通形として持つ。serialized Result schema 2へは既存fieldだけを出力する。
- OTel sourceは`hook_correlation_ok` / `hook_parse_ok`を要求せず、またOTel成立を表すためにそれらを`true`へ捏造しない。OTel sourceの`observation_reliable`とcontrol/collection evidenceだけで判断する。
- OTel sourceの判定順は、(a) process lifecycle、(b) observer reliability、(c) canonical unique setとする。ただし、trustedなunique Skill identityが得られた場合は既存のtimeout distinctionに従いrouting outcomeを保持し、`process_lifecycle=timed_out`を別集計する。trusted absenceはcompleted processに限定し、spawn/signaled/turn.failed/unknown lifecycleをabsenceへ変換しない。
- OTelのcollector/export/JSON parse/quiet/hard-cap collection/control/unknown/multiple/status/malformed failureは、completed lifecycleなら既存の汎用`skill_read_observation`へ写像する。process自体がspawn failure、signal、terminal failure、unknown、またはabsence時のtimeoutなら、既存の`process_failure` / `lifecycle_failure` / `timeout`を保持する。`hook_correlation` / `hook_parse`へは写像しない。
- Hook sourceは既存artifact/legacy compatibility用の既存分岐としてのみ維持する。新OTel runでOTel failure後にHookを使ってscoreする分岐は作らない。

## 13. Result schema、8/8 validity、comparisonへの影響

### 13.1 Result schema 2

- serialized Result schema 2の`initial_skill`、`observed_skills`、`outcome`、`unobservable_reason`、`process_lifecycle`、`summary`のshapeは維持する。migrationやschema version 3は作らない。
- `observed_skills`は既存コメントどおり、trusted absenceでは`[]`、untrustedでは`null`、unique canonical Skillでは`[skill]`とする。
- `selector_reliable`はrenameせず、observerがOTelの場合は「選択されたrouting observerが信頼可能」という後方互換の意味へ文書化する。shell selectorだけを意味する名称へ狭く固定しない。
- `ObservationSignals`など内部型には`observation_source`、`observation_reliable`、control liveness、quiet/hard-cap collectionの判定を持たせるが、CaseResultのserialized fieldへ新しいtelemetry payloadやraw attributesを追加しない。
- telemetry failureとHook failureは内部判断・Run Artifactで区別し、Result schema 2へunknown Skillやraw failure statusを誤った`null`/`[]`として出力しない。既存の`unobservable_reason`互換値へ写像する場合も、collector evidenceを別に保持する。

### 13.2 8/8 side validity

- OTelで0件のNegativeをtrusted absenceへするには、Negative process、collector、export、control liveness、close起算のquiet 1,000ms完了、receiver close、parseの全条件を満たす必要がある。quiet完了後の将来request不存在は条件にせず、telemetry failureをrouting failureとして8-sideへ数えない。
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
  - case-local `127.0.0.1:0` HTTP receiver、OS割当portの取得とclose
  - narrow OTLP JSON parser
  - `codex.thread.started` liveness controlと`codex.skill.injected`のexact metric validation
  - type / numeric positive value / status / skill parsing。`invoke_type` / `plugin_id`はdiagnostic parsingのみ
  - unique canonical set、duplicate count、timestamp/order ambiguity、collector/export/collection-window state、observer reliability
- `scripts/evals/run-skill-trigger-evals.ts`
  - `executeCodex`のcase-local observer lifecycle
  - OS割当portを使ったprocess-local OTel `-c` override
  - process close起算quiet 1,000ms、request受信時reset、hard cap 5,000ms、late request、receiver failure、前case混入防止
  - OTel observationをobserver-common internal contractへ渡すsource-specific変換
  - 既存Hook captureはdiagnostic/legacy compatibilityとして維持し、OTel scoring fallbackにはしない
- `scripts/evals/skill-trigger-evals.ts`
  - OTel sourceのtrusted absence / unique-one / multiple / unknown / failure mapping
  - `observation_source` / `observation_reliable`を含むHook非依存の内部信号
  - observer identityと`scoreInitialRouting`の責務分離、およびsibling / other canonical / false negativeのoutcome回帰
  - `selector_reliable`の後方互換な意味拡張
  - serialized Result schema 2 shape維持
- `tests/repository-contract/otel-skill-observer.test.ts`
  - observer parser/collectorのpure fixtureとfailure contract
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - OTel-derived signalsと既存outcome/lifecycle/comparisonの回帰
- `docs/adr/0025-trigger-eval-otel-observation-contract.md`
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
case-local OTel receiverを`127.0.0.1:0`へbind
  ↓
OS割当portを取得し、Codex CLIのcase-local OTel overrideへ渡す
  ↓
executeCodex（既存query、`--json`、`--ephemeral`、read-only）
  ↓
Codex child `close` / lifecycle parse
  ↓
process close起算のquiet 1,000ms、request受信時reset、hard cap 5,000ms / receiver close
  ↓
OTLP request / JSON parse / metric schema validation
  ↓
`codex.thread.started` control liveness検証
  ↓
`codex.skill.injected`のstatus / value / exact canonical Skill mapping
  ↓
unique canonical set、duplicate、timestamp/order、OTel reliabilityを判定
  ↓
observer-common internal signalへ変換（Hook flagsを捏造しない）
  ↓
deriveRoutingObservation（OTel source path）
  ↓
scoreInitialRouting（outcome / boundary判定）
  ↓
Result schema 2へserialize
```

具体的な実装境界は次のとおりとする。

- OTel observerはreceiver bind、OTLP request/JSON parse、metric schema、control liveness、Skill set、reliabilityを担当し、outcome、boundary、Result serialization、scoreは担当しない。
- runnerはreceiver lifecycle、OS割当portとCLI config、process lifecycle、case correlation、quiet/hard-cap collection、Hook diagnostic capture、observer-common signal変換を担当する。
- `skill-trigger-evals.ts`はprocess lifecycle、OTel/Hook sourceのrouting observation、`scoreInitialRouting`、boundary/outcome、Result schema、comparison、8/8 validityを担当し、OTLP parserは持たない。
- receiver bind failureはCodexを起動する前に`unobservable`へする。
- `executeCodex`はqueryごとに一回だけspawnし、既存のprocess timeoutを変更しない。
- child `close`後、`lastRequestAt = max(processCloseAt, 最終requestAt)`からquiet 1,000msを数える。quiet中のrequestはtimerをresetし、process closeから5,000msに達したらhard cap failureとしてunobservableにする。quiet完了時にreceiverをcloseし、close後のrequestは観測可能性を主張しない。Codexのflush acknowledgementは要求しない。
- receiverはmetric payloadを集約し、raw bodyをrunnerのResultへ流さない。
- `skill`のexact allowlist判定は`skill-trigger-evals.ts`の`CANONICAL_SKILLS`と重複した別一覧を作らず、共有importまたは一つの正本から行う。
- process lifecycleの`completed` / `turn_failed` / `timed_out`等の6値と固定優先順位は維持する。

## 16. Test計画

### 16.1 Observer unit / contract

以下のfixtureを必須とする。

- control metric present（`codex.thread.started`、type=`sum`、positive numeric）+ expected Skill exactly one、`status=ok`
- control metric present + duplicate same Skill、same timestamp、diagnostic attributesの異なるpoint
- control metric present + canonical Skill 0件、completed process、collector/export/quiet 1,000ms/receiver close/parse成功（trusted absence候補）
- requestあり + control metric欠落 + Skill 0件（unobservable）
- control metricあり + malformed Skill point（unobservable）
- control metricあり + unknown Skill（unobservable）
- control metricあり + wrong sibling Skill exactly one
- canonical Skill複数、timestampが同じ、timestampが異なる、export requestが分割されるケース
- unknown Skill、built-in/external-looking Skill、path値、display name、substring近似
- `status=ok`以外のfailure/error/unknown status
- metric name/type違い、attribute欠落、malformed JSON、malformed point
- control metric type/value違い、collector未起動、`127.0.0.1:0` bind failure、取得portのCLI受渡し、HTTP non-2xx、export failure、quiet 1,000ms / hard cap 5,000ms未確認
- 前case telemetry混入、duplicate request、late request、receiver close failure
- process close後requestなし（close + quietでcompleted）、quiet timer reset、quiet中の複数late request
- hard cap到達（requestが断続的に続くため5,000msでunobservable）、quiet完了後のreceiver close
- `timed_out`後のcollection、trusted positive identity保持、Skill 0件のunobservable、spawn failureのno-wait、receiver bind failureのno-spawn
- 既存Vitestのfake timerが利用できる場合は、上記timer fixtureをfake timerで検証する。独自clock abstractionやtimer framework、新規dependencyは追加しない

### 16.2 Existing evaluator regression

- Result schema 2の`observed_skills=[]` / `[skill]` / `null`三状態
- observerはidentityだけを返し、expected canonicalは`pass`、trusted absenceだけは`false_negative`、configured siblingは`sibling_misroute`、その他のcanonicalは`unexpected_trigger`となるoutcome回帰
- `invoke_type` / `plugin_id`の値、順序、欠落がrouting outcomeを変えないこと
- OTel reliable + Hook failureはOTel identityを使い、OTel failure + Hook reliableは`unobservable`となること。explicit caseでもHook scoring fallbackをしないこと
- telemetry failureとHook correlation failureをPASSへ補完しないこと
- process failed / timed out / `turn.failed` / trusted positive後timeoutの既存semantics
- `turn.completed`のtimestamp欠落をchild `close`で補い、close前requestをquiet起算へ再利用しないこと
- completed + Skill 0件のtrusted absence、completed + expected Skillのunique-one、collection途中の`feature-plan`から終了前の`repair-loop`追加によるunique set 2件のunobservable
- request A後にquiet未満でrequest Bが来た場合のtimer reset、requestなしの場合のclose + 1,000ms completion、hard cap 5,000ms failure
- timeout後も最大5,000msだけ回収し、trusted positiveは保持するがSkill 0件をabsenceへしないこと
- `summary.by_outcome`と`summary.by_process_lifecycle`の分離
- comparisonのbaseline/candidate schema、provenance、unobservable transition
- existing relative read、Target-aware absolute read、negative exact compound、candidate prefixのHook diagnostic/legacy compatibility回帰

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
8. Negativeのprocess、collector、export、control liveness、close起算quiet 1,000ms、receiver close、parse、0 canonical injectionが全PASSのときだけPositiveを1回実行する。quiet完了後の将来request不存在は判定しない。
9. NegativeまたはPositiveがFAIL/unobservableならcanonical `all`、8/8 side、valid baselineは実行しない。
10. 両controlがPASSした場合だけEnvironment Qualification PASSを記録する。
11. 同じfresh Target、同じEvaluator SHA、同じobserver条件でcanonical `all`を1回だけ実行する。
12. baseline/candidateの両側へ同じOTel observer契約を適用し、比較前にprovenanceを確認する。

retry、query tuning、別Target交換、Host shell shape rule追加、OTel 0件の補完判断は禁止する。

## 18. 停止条件

次のいずれかで実装・Qualificationを止める。

- 0.153.4または固定versionで`codex.thread.started` controlまたは`codex.skill.injected`を受信できない。
- process-local CLI overrideがOS割当portを使い、tracked config変更なしに成立しない。
- control metricのtype/value不正、collector failure、export failure、quiet/hard-cap window未確認、receiver close failure、malformed payload、case cross-contaminationを検出した。
- metric name/type/status/skill semanticsがversion変更で未確認になった。
- `skill`を6 canonicalへ完全一致mappingできない。
- 複数canonical Skillの初期順序を要求するcaseがPR2へ混入した。
- process failure/timeout前の0件をtrusted absenceにできない。
- raw telemetryにcredential、Authorization、prompt全文、absolute pathが入り、保存前に安全に分離できない。
- expected Routing SHA、Evaluator SHA、Target isolation、dataset fingerprint、Result schema 2が不一致。
- 同一failureがretry停止条件に到達した、または次の仮説なしに再実行する状態になった。

停止時は`unobservable`または`BLOCKED`として根拠、未実行validation、次の対応者をRun Artifactへ記録する。shell regexを追加して停止条件を回避しない。

## 19. 今回の調査Runにおける完了境界

今回のRunで完了したのは、公式仕様確認、0.153.4実測、保存済みrawの全request直接parse、Explicit / Negativeのchild close基準と最終request差分の算出、Implicitのtimeout分離、A案の設計判断、新Plan作成である。今回のprobe結果はQualification、canonical、baseline、8/8 validityへ昇格しない。

今回のruntime状態は次のまま維持する。

- Negative Qualification: FAIL（既存固定shape外のHook evidence）
- Positive Qualification: 未実行
- Environment Qualification: FAIL
- canonical `all`: 未実行
- 8/8 side validity: 未判定
- valid baseline: 未取得
- 既存Runのevaluation `partial` / `flaky_or_env_issue`は変更せず、今回のレビュー修正RunのPlan-only評価と混同しない。

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

- `codex.skill.injected`のformal name、type、`skill` / `status` / value、skill mappingと、`codex.thread.started`のliveness controlを固定versionで実証できる。
- explicit / implicit / Negativeのcase-local evidence、Hook状態、process lifecycle、collector/export、request時系列を比較でき、Explicit / Negativeのprocess close基準を固定し、`OTEL_COLLECTION_QUIET_MS = 1,000`と`OTEL_COLLECTION_HARD_CAP_MS = 5,000`、起算点、timer reset、hard-cap failureを定義している。ただしCodex flush acknowledgementやquiet完了後の将来request不存在は主張しない。
- unique canonical set 0 / 1 / 2+の扱い、duplicate、unknown、failure、telemetry failure、control欠落、order ambiguityをfail-closeで定義している。
- observer identityと`scoreInitialRouting`を分離し、configured sibling=`sibling_misroute`、other canonical=`unexpected_trigger`、trusted absenceだけ=`false_negative`となる回帰を定義している。
- `invoke_type` / `plugin_id`をdiagnostic-onlyとし、routing identity・absence・dedup・order・outcomeへ影響させない。
- `ObservationSignals`相当のOTel pathがHook flagsを要求せず、OTel failure + Hook reliableをunobservableとする。
- A/B/C/Dの比較とA案の採用理由がある。
- Result schema 2、8/8 validity、comparisonへの影響が明記されている。
- 実装対象file、変更しないfile、追加/削除、処理経路、tests、Qualification、停止条件が確定している。
- completed / timed_out / spawn_failed / receiver bind failureのcollection扱い、process close後requestなし、quiet timer reset、hard cap時のNegative fail-close、collection診断値と24 cases（quiet最大24秒、hard cap最大120秒）への影響が確定している。
- 既存Negative Planはhistorical/legacy compatibility materialとして保留し、新OTel runのscoring fallbackにせず、既存shell selectorはprimaryから外すが削除しない。
- 今回のtracked差分は新Plan、新Run Artifact、必要最小限のPR本文追記だけである。
