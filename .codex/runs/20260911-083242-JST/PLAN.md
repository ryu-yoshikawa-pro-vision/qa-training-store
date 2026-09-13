# Plan

## Objective

PR #127のTrigger Evalについて、shell command表記に依存しないCodex Skill injection観測が、固定Codex `0.153.4`で実用的な観測契約になるかを調査する。最大3件の診断probe、公式仕様との照合、採用案A/B/C/Dの決定、新しい実装Plan作成までを行う。本RunではTrigger Eval本体の実装を行わない。

## Scope

### In

- Codex公式のOTel設定、正式metric名、attributes、export/flush仕様の確認。
- `codex-cli 0.153.4`のCLI overrideによるprocess-local設定の実測。
- localhost限定の一時receiverによるOTLP診断。rawは`.artifacts/trigger-eval-otel-probe-20260911/`だけへ保存する。
- fresh independent Routing Target上で、固定queryを変更しないexplicit / implicit / Negativeの最大3probeを各1回実行する。
- 各probeのOTel、既存Hook、stdout JSONL、process lifecycle、collector相関を比較する。
- 新しい日本語Plan、strict Run Artifact、schema/evaluation/sanitizer/collector証跡、PR本文の最小追記。

### Out

- `scripts/evals/**`、`tests/**`、`docs/adr/**`、`.codex/hooks/**`、tracked `.codex/config.toml`、dataset、query、Skill、AGENTS、PROJECT_CONTEXT、history、timeout、Result schema、dependencyの変更。
- Negative固定shapeの実装、Qualification、canonical `all`、valid baseline、query tuning、retry、別Target交換。
- Docker、global install、長時間service、一般telemetry framework、認証情報の複製・変更。

## Assumptions

- 既存PR2で固定したRouting SHA `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`をfresh Targetへ再現し、Evaluator sourceと分離する。
- 1つのCodex processを1つのprobe caseに対応させ、receiver endpoint、raw output、collection windowもcaseごとに分ける。
- `--ephemeral`とCLI `-c`を使い、ユーザー設定・認証は読み取り、既存credentialをコピー・上書きしない。
- OTel設定の実測は診断であり、0件はcollector起動、HTTP export、flush、parse、process lifecycleがすべて成立した場合だけtrusted absence候補とする。

## Questions / Ambiguity

- 0.153.4がmetrics/logsをどのOTLP protocol/schemaで送るかはreceiver実測で確定する。
- `skill.injected`が選択、injection、read、explicit/implicit、success/failureのどの時点を表すかは、3probeとpayload attributesを突き合わせて判断する。
- metric timestampが単調でもexport順序や複数Skillの初期順序を保証するかは別問題として扱う。

## Hypotheses

- H1: 公式に記載されたSkill injection metricは0.153.4でもprocess-local overrideで受信できる。
- H2: explicitとimplicitの両方でcanonical Skillを識別でき、Negativeでは正常な0件をcollector failureと区別できる。
- H3: metricがcounter集計だけなら、timestampやexport順だけからinitial orderを推定できず、既存Hookまたはunobservable境界が必要になる。
- H4: 受信不能、属性不足、flush不確実、routing汚染のいずれかがある場合、OTel主観測ではなくHybrid、Hook継続、またはHost能力上のbaseline取得不能を採用する。

## Research Plan

1. 公式ドキュメントとローカルCLI/version/config parserを確認する。
2. 一時receiverとfresh Targetを作成し、probeごとに独立した相関境界を検証する。
3. 指定queryを次の順序で各1回だけ実行する。
   - Explicit: `$feature-plan を使って、この依頼の実装計画だけを作ってください。`
   - Implicit: dataset `feature-plan-train-001`のquery（explicit markerなし）。
   - Negative: `package.json に記載されている package name だけを確認して答えてください。`
4. raw evidenceをredaction確認し、sanitized summaryへ落とす。
5. A/B/C/Dの決定、新Planの実装対象・tests・Qualification手順・停止条件を確定する。
6. Plan-only validation、evaluation schema、sanitizer、strict collector、source差分確認、PR/Git最終化を行う。

### Exit Criteria

- 3probeを超えず、各probeのretryがなく、query/dataset/Skill/Hook/Targetの追改変がない。
- 公式仕様、0.153.4実測、metric semantics、attributes、順序、flush、failure区別に根拠がある。
- OTel主観測、Hybrid、Hook継続、baseline取得不能を比較し、A/B/C/Dを1つ選ぶ。
- 新Planに必須設計項目、変更対象file、処理経路、tests、Qualification順、対象外を記載する。
- tracked source差分なし、Plan-only validationがPASS、runtime statusが既存記録どおり維持される。

## Approach

- 既存PR2のHookを無効化せず、OTel設定だけをCLIで加える。
- receiverはNode built-in `http`のみのlocalhost listenerとし、authorization header、環境変数、prompt全文、絶対path、user-specific情報を保存しない。payloadは必要なmetric名・attributes・timestampと通信状態へ要約する。
- OTLP JSONが成立しない場合は、同じprobeを再実行せず、そのcaseのcollector結果をfailureとして記録し、残りのprobeで判断できる範囲だけ進める。protocol選択はprobe開始前に決定する。
- 既存Result schema 2へ直ちに変更を加えず、Planで既存fieldsへのmapping可否を決める。
- 標準フロー: `PLAN -> 公式/ローカル調査 -> TASKS -> receiver/Target準備 -> 最大3probe -> 設計判断 -> 新Plan -> validation -> REPORT -> commit/push`

## Definition of Done

- 公式仕様と0.153.4実測の差を記録済み。
- explicit / implicit / Negativeのprobe結果とHook比較表、metric attributes表、collector/flush判定が新PlanまたはRun Artifactにある。
- A/B/C/D、Positive/Negative契約、複数Skill、順序、telemetry failure、unknown/built-in、既存selector、Negative Plan、schema/8/8/comparisonの扱いが確定している。
- 新PlanとRun Artifactのみがtracked変更で、PR #127へ実装未着手とruntime未完了状態を保持した追記がある。
- commit、non-force push、local/remote/PR HEAD一致を確認する。

## Risks / Unknowns

- OTelが最新版仕様だけで0.153.4では未実装の可能性。CLI parser受理だけで実装済みと判断せず、receiver payloadで実証する。
- OTLP payloadに機密情報が混入する可能性。rawをGit管理外に限定し、保存前にheader/body redactionと内容検査を行う。
- Codex exportが非同期でcase境界を越える可能性。case-local endpoint/window、process終了後flush待機、receiver shutdown markerを使い、0件と通信失敗を分離する。
- OTel metricsはcounter集計で順序保証がない可能性。複数Skill時にinitial orderを推測せず、unobservableまたはHook補完とする。
- PR baseが更新され`mergeable=CONFLICTING`でもrebase/mergeは行わず、取得時点の事実を保存する。

## Thinking Log

- 2026-09-11: 0.153.4は`codex exec --json --ephemeral`と`-c/--config`を提供し、metrics OTLPはstringではなくvariant tableを受理することをCLIで確認した。正式な送信可否はprobeで決める。
- 2026-09-11: 既存HookはTargetの`.codex/logs`へ記録するため、Hook結果を同じprocessのOTel結果と並べられる。既存Hook/config/sourceは変更しない。
