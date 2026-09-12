# ADR-0023: Trigger Eval selectorとquery execution contractを固定する

- Status: Accepted
- Date: 2026-09-07

## Context

PR #127のcanonical Trigger Evalでは、Codex HostがSkillの`SKILL.md`を読み出していても、runnerがforward-slash/unquotedの一形状だけを完全一致判定していたため、Hostのquote・slash差をSkill read 0件として扱う可能性があった。また、24 queryには未提供のPR／error／Run文脈や、routing確認を越える長時間workflowが含まれており、timeoutをrouting failureと混同する要因になっていた。

## Decision

runnerは、`Get-Content -Raw`によるcanonical `.agents/skills/<skill>/SKILL.md` direct readのうち、current Hostで実測済みの4つの完全形だけを受理する。受理形はforward slash/unquoted、forward slash/single-quoted、backslash/unquoted、`-LiteralPath` + forward slash/single-quotedである。一般的なPowerShell parser、substring判定、path mention、search結果、外部絶対pathは実装しない。

Trigger Eval queryは、query単体とRepositoryの一意なpathから対象を解決でき、routingに必要な最小のbounded action、single intent、自然な依頼でなければならない。query修正ではexpected Skill、boundary、scoringを変更せず、dataset defectの修正理由と旧／新fingerprintをRun Artifactへ残す。

## Consequences

- selectorのfalse negativeをcurrent Host shapeに対して減らしつつ、誤検出の範囲を明示的な形状へ閉じ込められる。
- datasetの長時間作業・不足文脈によるunobservableを、routing contractの問題とHost latencyの問題から分離できる。
- 新旧datasetはfingerprintで分離され、旧invalid artifactをvalid baselineとして再利用できない。
- current Codex version、Observation Probe、canonical runは同じversionで揃え、timeout `327_000ms`は別のmeasurement判断なしに変更しない。

## PR2 observation contract redesign

実装時点で、PR2の測定対象をsingle-intent queryのinitial Skill routingへ限定する。最初のtrusted canonical `SKILL.md` direct readはHost上で観測できる`initial routing evidence proxy`であり、model internal selection、final Skill set、workflow phaseの証明とは扱わない。

### Selector

Hook deltaの`PostToolUse` recordを、`canonical_skill`、`safe_no_read`、`unreliable`の3状態へ分類する。`selector_reliable=true`はcanonical Skill direct readの有無を安全に判定できたことを示し、safe no-readは正常な観測結果である。Bashだけに限定せず、known non-Bashのsafe query shapeも分類対象とする。non-`PostToolUse` eventはSkill selectorから除外する。

canonical readのbounded grammarは単一の`Get-Content` invocation、relative canonical path、`/`／`\`、single／double／unquoted path、`-Path`／`-LiteralPath`／`-Raw`の許可順序に限定する。検索commandはreaderへ昇格させず、6つのcanonical Skill treeと非交差であること、明示target、非recursive、非glob、pattern／targetの安全な分離を同時に確認できる単純shapeだけをsafe no-readとする。それ以外、truncated／malformed／ambiguous input、canonical treeをtargetにする検索はunreliableとする。

### Initial observation and lifecycle

最初のcanonical candidateより前の全対象eventとcandidate prefixがreliableであれば、`initial_skill`と`observed_skills=[initial_skill]`を確定する。candidate後のmalformed／truncated eventはinitial outcomeを上書きせず、later Skill setはPR2 Resultへ保存しない。candidateがない場合のtrusted absenceは、`turn.completed`、Hook correlation／parse、全対象eventのreliable判定、canonical read 0件が揃ったときだけ`initial_skill=null`／`observed_skills=[]`とする。不成立時は`observed_skills=null`／`outcome=unobservable`とする。

Resultはdataset schema 1と分離した`schema_version=2`を使用し、caseへ`initial_skill`と`process_lifecycle`を保存する。process lifecycleは`completed`、`turn_failed`、`timed_out`、`spawn_failed`、`signaled`、`unknown`の6値を固定優先順位で一意に写像する。routing outcomeとlifecycleは独立して集計し、trusted positive後のtimeout／turn.failedでもrouting outcomeを保持する。`summary.by_process_lifecycle`を追加し、`CASE_TIMEOUT_MS=327_000`はprocess safety capとして維持する。

### Comparison

canonical executionではmodelを`gpt-5.6-luna`へ明示的に固定する。baseline／current comparisonはResult schema 2、`split=all`、dataset fingerprint一致、case ID set一致、Codex version完全一致、および`provenance.model`完全一致を必須とする。schema 1、unknown／欠落schema、不一致Codex version、不一致modelはfail closedし、変換やmarker後付けによる旧artifact移行は行わない。model不一致はdescription変更だけの比較として扱えない。受理されたcomparisonの`codex_version_match`は常にtrueとなる。

canonical `all`のrun-level successには8 boundary sideすべてがobservableであることを要求し、8/8未達ではrunnerはexit 1のままとする。これはcoverage不足をrouting successへ読み替えないための条件である。一方、全selected caseを実行し、Result schema／provenance／case ID set等のcomparison contractを満たしてResult artifactが保存されている場合、そのartifactはcoverage不足でも後続runとのcomparison baselineとして利用できる。unobservable caseはbaselineへそのまま残し、後続comparisonでは`newly_unobservable`、`recovered_observable`、`unchanged_unobservable`として扱う。

## Qualification blocker remediation

実測されたnegative Host commandのうち、次の一形状だけをboundedなsafe no-readとして認識する。

    $pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name

認識はcommand全体を固定token・固定相対path・固定pipeline・固定semicolon suffixで照合するanchored exact-shapeとし、限定された空白以外の変形は受理しない。compound内のcanonical Skill read、任意suffix、別path、variable path、別variable、追加reader、別operator、truncatedまたはmalformed inputはunreliableへ倒す。これにより、package.jsonを読むこととcanonical Skill direct readが存在しないことを混同せず、trusted absenceのreliable no-read条件だけを成立させる。

Routing Targetのpreflightは、Git work tree、clean、Evaluatorとのrealpath / common-dir分離、alternates、canonical Skill readable、Trigger dataset不存在、Evaluator source status、output分離に加えて、git rev-parse --abbrev-ref HEADの値がHEADであることを必須とする。Targetはdetached checkoutで作成する。期待routing source SHAは新しいCLI optionへ移さず、Target作成時のRun preflightで明示比較し、実Resultのprovenanceでも再確認する。

この補修はPR2のinitial routing observation、Result schema 2、process lifecycle、comparison、dataset schema 1、query、Skill、Hook、timeoutの契約を変更しない。Hostが未承認compound shapeを返した場合は、selectorを一般parserへ拡張せずunreliableとしてQualificationを停止する。

## Target-aware absolute canonical Skill recognition

実行時にpreflightで解決したRouting Target rootをselectorへ渡し、absolute pathはそのcontextがあるlive evaluationでのみcanonical候補として扱う。HostがHookへ出力したpathはuntrusted observation inputであり、single direct `Get-Content`の既存bounded grammarに合致したうえで、存在するregular fileであり、realpath取得に成功し、resolved pathがTarget root内にあり、6つの既知canonical `SKILL.md`のresolved pathのいずれかと完全一致し、Skillへ一意にmappingできる場合だけ`canonical_skill`へ分類する。

存在、stat、realpath、regular file、containment、canonical一致、または一意mappingのいずれかが成立しないHost pathは、runner-level exceptionへ昇格させず`unreliable`、`selector_reliable=false`、`skill=null`へfail-closeする。`realpathOrFail()`はEvaluator rootやRouting Target rootなどpreflightで存在必須のpathに限定し、Host由来candidateの判定には無条件に使用しない。Target contextなしのabsolute path、arbitrary absolute path、substring/suffixだけの一致は受理しない。

この認識追加は既存relative direct-read、exact negative compound、first trusted candidateとcandidate後の不確実性を変更しない。compound一般対応、PowerShell一般parser、汎用path resolverは追加せず、absolute candidateより前のunreliableは従来どおり全体をunobservableにする。
