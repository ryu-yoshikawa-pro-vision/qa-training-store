# 修復Workflow

## 既存validatorが参照する固定section名

次の英語名は既存validatorとの互換性のため保持します。本文では対応する日本語見出しを使用します。

`When to use`、`Do not use`、`Inputs`、`Entry conditions`、`Iteration model`、`Finding triage`、`Repair planning and scope`、`Validation per iteration`、`Stop conditions`、`Evaluation and failure taxonomy`、`Evidence and report`

## 使う場面

- レビュー指摘を適用するとき。
- 対象範囲を限定したloopで検証失敗を修復するとき。
- `partial`または`fail`のevaluation resultに対応が必要か判断するとき。

## 使わない場面

- 要件の発見や計画作成が主なタスクである場合。
- ユーザーがレビューのみの出力を依頼した場合。
- 根本原因が環境にあり、修復が不要な場合。
- 安全でない操作や破壊的操作が必要になる場合。

## 入力

- レビュー指摘。
- evaluation resultとFinding。
- 検証失敗。
- 対象範囲の報告と、宣言した`allowed_files` / `expected_changed_files`。
- 観測artifactとSubagent record。
- リポジトリから提供されるartifact、対象範囲、taxonomy、evaluation、sanitizationの各契約。

## 開始条件

対応可能な修復シグナルと、明示的に限定された対象範囲の両方がある場合だけ、repair loopを開始します。

### A. 対応可能な修復シグナル

次のいずれか1つ以上を満たす必要があります。

- 対応可能なレビュー指摘がある。
- 検証失敗がある。
- evaluation resultが`partial`または`fail`である。
- evaluation findingに対応が必要である。

### B. 明示的に限定された対象範囲

次のすべてを満たす必要があります。

- 要件が十分に明確である。
- 対象範囲が明確である。
- `allowed_files`を宣言できる。
- 安全性、破壊的操作、権限、credential、policyに関する曖昧さがない。

対象範囲の明確さやallowed file setだけでは、修復を開始する条件になりません。

要件または対象範囲が不明確、安全でない操作や破壊的操作が必要、credentialや権限の判断が必要、ユーザーがレビューのみの出力を依頼、または根本原因が環境で修復不要の場合は開始しません。

## 反復モデル

各iterationについて次のfieldを記録します。

- `iteration_number`
- `input_findings`
- `repair_plan`
- `allowed_files`
- `changed_files`
- `validation_commands`
- `validation_result`
- `remaining_delta`
- `decision`

decisionは次のいずれかです。

```text
continue
stop_success
stop_no_progress
stop_scope_violation
stop_unsafe
stop_max_iterations
stop_needs_human
```

## Findingの仕分け

次の分類だけを使用します。

```text
must_fix
should_fix
defer
reject
needs_human
```

- `must_fix`: 正しさ、安全性、契約、CI、データ整合性に関わるもの。
- `should_fix`: 保守性、明確さ、テストの信頼性に関わるもの。
- `defer`: 現在の対象範囲外で、後続作業に適するもの。
- `reject`: false positive、対応済み、またはEvidenceで裏付けられないもの。
- `needs_human`: 要件、破壊的変更、権限、credential、policy境界の判断、またはユーザー・レビュアーの判断が必要なもの。

`must_fix`を優先します。`should_fix`は必須の修復を妨げない場合だけ扱います。`defer`、`reject`、`needs_human`に分類した場合は、それぞれの理由を記録します。

Findingを`needs_human`に分類したら、直ちに`decision = stop_needs_human`を設定します。`needs_human`はエスカレーション条件であり、loop継続条件ではありません。人の判断が返るまで、修復の継続、対象範囲の拡大、安全でない操作や破壊的操作、policy判断の推測を行いません。

## 修復計画と対象範囲

- 各修復が根本原因にどう対応するかを説明します。
- 編集前に、許可されたファイルと想定対象範囲を宣言します。
- 各反復後に、変更ファイルが宣言した対象範囲内に収まっていることを確認します。
- 対象範囲が曖昧または範囲外の変更が見つかった場合は、loopを拡大せず停止してエスカレーションします。

## 反復ごとの検証

変更した契約に十分な最小検証を、必須チェックを省略せずに実行します。command、結果、残差、次の判断を記録します。想定した結果だけを根拠に修復成功と判断しません。

`--max-iterations`は、上限を記録するための予約または検証済みのrunner optionです。このworkflowはagentを自動再実行せず、設定した上限で停止して`stop_max_iterations`を記録します。

## 停止条件

次のいずれかに該当したらloopを停止します。

- 設定した最大iteration数に達した。
- 同じfailure categoryが繰り返された。
- 同じstageが3回失敗した、または異なる対応をしても最初のエラーが変わらない。
- 新しいlog、環境上の事実、仮説が追加されない。
- 許可された対象範囲を超えた。
- 安全でない操作または破壊的操作が必要になった。
- 環境上の理由で検証を再現できない。
- 修復を続けているが根本原因が不明である。
- 修復によって新しいfailureが発生した。
- 要件の曖昧さについて人の判断が必要になった。

繰り返す失敗はEvidenceであり、盲目的なretryの理由ではありません。停止条件は`stop_*`として記録し、loopを継続しません。

## Evaluationと失敗taxonomy

- 各反復を要約し、提供されたevaluation artifact、Finding、改善候補へ対応付けられるようにします。
- 修復に成功しても文書化すべき残差が残る場合、リポジトリのevaluation契約が求めるときはその状態を`partial`で表します。
- 分類を創作せず、リポジトリから提供された失敗taxonomyを使います。
- Native実行のラベル`ENVIRONMENT_FAILURE`、`DEPENDENCY_FAILURE`、`CONFIGURATION_FAILURE`、`SOURCE_FAILURE`、`BUILD_CACHE_FAILURE`、`DEVICE_FAILURE`、`TEST_FAILURE`、`TRANSIENT_FAILURE`、`UNKNOWN`は補助的な実行分類です。必要に応じて提供されたevaluation taxonomyへ対応付けます。

## Evidenceと報告

- 観測とSubagentのEvidenceは何が起きたかの説明に使い、最終的な正本とはみなしません。
- Subagentが生成したrecordと観測の既存の意味を保ち、その契約をこのSkillへ持ち込みません。
- append-onlyとsanitizationのルールに従い、リポジトリから提供されたRun reportとevaluation artifactへloopを記録します。
- 永続的なレポートは、ユーザー、完了条件、監査要件が求める場合だけ作成します。

## 外部レビューの境界

外部サービスのfull reviewや再レビューには、ユーザーの明示的な指示または承認が必要です。結果を報告したら停止し、指摘の修復やreview threadの操作はユーザーの判断を待ちます。

## 対象外

- 無制限の自己修復。
- runnerレベルの自動修復loop。
- 安全性または対象範囲の制御を迂回する例外。
- repair summaryのrun manifestへの自動統合。
