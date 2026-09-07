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
