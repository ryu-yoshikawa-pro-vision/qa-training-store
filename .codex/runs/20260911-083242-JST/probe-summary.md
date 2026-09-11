# OTel診断Probe sanitized summary

## Scope

- Run: `20260911-083242-JST`
- Codex: `codex-cli 0.153.4`
- Routing SHA: `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`
- 実probe数: 3（Explicit、Implicit、Negativeを各1回。実行後のretryなし）
- ProbeはQualification、canonical、baseline取得ではない。

## Probe結果

| Probe | OTel `codex.skill.injected` | process | receiver / flush | 解釈 |
| --- | --- | --- | --- | --- |
| Explicit | `feature-plan`、`status=ok`、2 datapoints。`invoke_type=explicit`と`implicit` | exit 0、`turn.completed` | 4 HTTP JSON request、全parse成功、終了後batch受信 | 単一canonical identityは観測可能。重複・同時刻のため順序正本にはしない |
| Implicit | `feature-plan`、`status=ok`、1 datapoint。`invoke_type=implicit` | 固定`CASE_TIMEOUT_MS=327000`超過後に診断停止、exit 1、trusted terminalなし | 7 HTTP JSON request、全parse成功、graceful flush未確認 | metric identityは観測されたがcase全体はunobservable |
| Negative | 0 datapoints | exit 0、`turn.completed` | 1 HTTP JSON request、parse成功、終了直前にbatch受信 | OTel trusted absence候補。既存QualificationのPASSへは昇格しない |

## Hookとの相関

3 probeともfresh Targetの`.codex/logs`は`.gitignore`だけで、Hook recordは得られなかった。新Targetのproject trustが永続化されず、process-local OTel overrideもHook recordを有効化しなかったためである。既存Hook source/configは変更していない。これはHook unavailableというHost capability limitationとして扱い、OTelのpayload成功と混同しない。

## OTel観測事実

- 実際のexport metric名は`codex.skill.injected`。
- metric typeはOTLP `sum`で、観測した各datapointのvalueは`1`。
- `skill`はcanonical名`feature-plan`、`status`は`ok`、`invoke_type`は`explicit`または`implicit`だった。
- Explicitでは同じSkillが異なる`invoke_type`かつ同一timestampで2 datapointsになった。datapoint数、配列順、HTTP到着順からinitial orderを推測しない。
- Negativeの0件は、正常process、receiver bind、HTTP 2xx、JSON parse、終了後flushが全て成立した場合だけtrusted absence候補とする。collector/export/flush/parse failureは0件ではなくunobservableとする。

## Data handling

raw OTLP bodyは`.artifacts/trigger-eval-otel-probe-20260911/`配下にのみ保存し、Git管理対象へ複製しない。summaryにはquery全文、absolute path、Authorization、環境変数、credentialを保存していない。raw bodyには一般的なtelemetry attribute keyが含まれ得るため、raw fileはcommit対象外のまま維持する。

詳細なcase-local evidenceは次を参照する。

- `.artifacts/trigger-eval-otel-probe-20260911/target-preflight.json`
- `.artifacts/trigger-eval-otel-probe-20260911/hook-observation.jsonl`
- `.artifacts/trigger-eval-otel-probe-20260911/<case>/meta.json`
- `.artifacts/trigger-eval-otel-probe-20260911/<case>/receiver-events.ndjson`

## Runtime status

- Negative Qualification: FAIL（既存固定shape外のHook evidence）
- Positive Qualification: 未実行
- Environment Qualification: FAIL
- canonical `all`: 未実行
- 8/8 side validity: 未判定
- valid baseline: 未取得
