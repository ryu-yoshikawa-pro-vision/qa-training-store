# ADR-0024: Trigger EvalのOTel observation contract

- Status: Accepted
- Date: 2026-09-11

## Context

PR #127のTrigger Evalは、Hostが生成するshell commandの表記をHookから推測してSkill routingを判定していた。この方式は、同じ意図でもPowerShellのquote、slash、compound commandの差で観測結果が変わり、Hookが欠落した場合にSkillなしへ誤って倒す危険がある。保存済みprobeではCodex 0.153.4から `codex.thread.started` と `codex.skill.injected` のOTLP JSONがcase-local receiverへ到着することを確認した。

## Decision

### OTelをprimary、Hookをdiagnostic onlyとする

runnerはcaseごとにNode標準 `http` で `127.0.0.1:0` へbindし、OS割当portをそのcaseの `codex exec` へprocess-local `-c` overrideとして渡す。tracked `.codex/config.toml`、OTel SDK、collector package、新dependencyは追加しない。新OTel runでOTel observationが失敗した場合、Hookが正常でもHookをscoring fallbackにしない。

`skill-trigger-evals.ts` は内部のobserver-common signalとしてsource、reliability、initial skill、observed skill set、lifecycleを受け取る。routing outcome、boundary、Result schema 2、comparisonは既存 evaluator と `scoreInitialRouting` が所有する。

### liveness controlとrouting evidenceを分離する

`codex.thread.started` はrouting identityではなく、telemetry liveness controlとして扱う。metric name完全一致、`sum`、numeric value、value `> 0` のvalid pointが最低1つ必要である。controlが欠落・不正ならSkill metricが0件でもtrusted absenceへ変換せず、`unobservable`へfail-closeする。

`codex.skill.injected` の各pointは `sum`、`skill` string、`status=ok`、numeric value `> 0` を検証する。canonical Skillとの完全一致だけを受理し、unknown、status異常、malformed pointはunobservableとする。同じSkillの複数pointはunique setへ畳み、counter valueをevent数とは解釈しない。異なるcanonical Skillが同じcaseに現れた場合はcounterに順序がないためunobservableとする。

`invoke_type` と `plugin_id` は診断情報に限定し、identity、absence、dedup、order、outcomeへ使わない。

### collection windowをchild close起算でboundedにする

`turn.completed` はstdout terminalの根拠には使うが、timestampがないためtimerの起算点にはしない。child closeをprocess closeとし、`OTEL_COLLECTION_QUIET_MS = 1_000`、`OTEL_COLLECTION_HARD_CAP_MS = 5_000`を固定する。起算点は `max(processClose, lastRequest)`、process close後requestの受信ごとにquiet timerをresetする。hard capはprocess closeからの絶対上限であり、到達時はcollector timeoutとしてunobservableにする。quiet完了後の将来request不存在やCodex flush acknowledgementは主張しない。

## Consequences

- Host shell表記の差はprimary routing evidenceから除外され、OTel schema／liveness／collection failureはabsenceと区別される。
- Positiveでunique Skillが観測できた場合は、process lifecycleがtimeout／turn.failedでもrouting outcomeを保持できる。Environment Qualificationのcompletion判定は別に行う。
- Negativeのtrusted absenceにはcompleted lifecycle、HTTP 2xx、JSON parse、control、collection window、canonical／status／malformedの全条件が必要になる。
- observerはoutcomeやResult serializationを知らず、evaluatorはOTLP parserを持たないため責務が分離される。
- OTelが不安定な環境では新しいHook fallbackで結果を捏造せず、unobservableとraw evidenceを残して停止できる。
- runnerはResult schema 2を変更せず、caseごとのcollection state、request count、相対timing、metric countだけを別のGit管理外OTel diagnostic JSONLへ保存できる。

## Validation

- observer contract testでcontrol欠落、absence、unknown／malformed／status異常、duplicate／multiple Skill、diagnostic-only fields、hard cap、HTTP receiver／OS portを検証する。
- evaluator contract testでOTel primary、Hook failure併存、pass／false_negative／sibling_misroute／unexpected_triggerの委譲を検証する。
- runtime Qualificationは固定Evaluator SHAのfresh TargetでNegative → Positive → canonical allの順に1回ずつ実行し、段階失敗時はその場で修正・再実行しない。
