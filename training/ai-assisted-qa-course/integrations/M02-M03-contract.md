# M02→M03 固定Skill統合契約

対象は`ryu-yoshikawa-pro-vision/qa-workflow-skills`のcommit `7cc6cba7772de549841a39d71694cbafbc783324`です。M02の人間可読な検証責務を正本とし、初回の`condition_structure.py`は`input_mode=direct`で起動します。metadataはSkill-local `runtime_contract.py`の17キー、inputは15キー、`test_requirements[]`の各行は`tr_id`/`priority`/`authority_refs`/`risk_refs`/`scope_refs`の5キーに厳密に合わせます。説明文を機械行へ追加しません。

## 参照の種類と正規経路

- `BR-CART-001` / `AC-CART-001`は正式仕様IDであり、Authority Entityの`entity_ref`とは別です。`spec-analysis/scripts/authority_entities.py`は、正式仕様から意味を正規化したAuthority行をMachine Entityへ決定論的に変換します。helper自身は仕様の意味を抽出・判断しません。
- `RISK-CART-001`は`training/workbook/01_target-risk.csv`にある実在のRisk記録です。`risk_matrix.py`は、根拠を持って入力したImpact/Likelihood値からrisk levelとpriorityを決定論的に計算します。値の選択と根拠は意味判断として別に確認します。`analysis_entities.py`は実行済みmatrix結果、Risk入力、current Authority Entityを結合してProduct Risk Machine Entityを作ります。
- 固定revisionには独立したScope Machine Entity型がありません。`condition_structure.py`が扱うのは形式`SCOPE-...`のScope参照文字列です。M02成果物が参照の意味、正式な出典、仕様revisionを定義し、`test_requirements[]`と条件・Caseで同じ参照を維持します。`TARGET-CART-001`はRisk台帳のtarget IDであり、Scope参照として流用しません。
- `low-stock`はdefault datasetから作られ、`variant-basic-shirt-02`の在庫3を上書きします。同variantのdefault `purchaseLimit`は5なので、BR-CART-001の有効上限は3です。開始sessionはguestですが、演習で必要な実行時カート数量はReset後に確認します。

## 開発用実行経路

通常の統合経路は `authority_entities.py` → `risk_matrix.py` → `analysis_entities.py` → `condition_structure(direct)` → 選択した技法runtime → `materialize_coverage(artifact)` → 契約に合うmodeの`case_structure` → `verify_runtime_evidence(valid=true)` です。各段階でcurrent Machine Entity、generation fingerprint、Scope/Authority/Risk参照の集合、期待結果の根拠を照合します。終了コード0、`ready`、AIの自己申告だけでは成功にしません。

Authority/Risk helperと`condition_structure(direct)`は正規の固定Skill scriptを実行して確認できます。ここへ渡す人手で作った正規化行・検証責務はソース根拠付きの決定論的smoke inputであり、OpenCodeが抽出・生成した意味分析ではありません。OpenCode CLIがない場合は、利用可否を再確認せず、モデルに依存する意味分析と技法選択の実行を別に記録します。モデル結果を作って補完せず、統合のどこまでが確認済みかを明示します。

## 実行証拠と未達条件

この文書の実行記録には、固定commit、helper/runtime名、入力の出典、各envelopeの状態・Entity参照・fingerprintを記録します。固定revisionの既存CI成功やfixtureのみの成功は、Cartサンプルの実統合証拠にしません。

### 2026-10-23 source-backed deterministic smoke

- 入力の仕様revisionは`qa-training-store` HEAD `55f41bb8a111939aac59fd9b92b3903cdd7fca34`です。Skill scriptsは`qa-workflow-skills`の固定commit `7cc6cba7772de549841a39d71694cbafbc783324`から実行しました。
- `authority_entities.py`へ正式Cart仕様の`BR-CART-001` / `AC-CART-001`から意味を手で正規化した2行を渡し、helperがAuthority Machine Entityを生成しました。出力参照は`AUTH-CART-BR-001`と`AUTH-CART-AC-001`です。正規化はsource-backed smoke inputで、LLMによる意味抽出ではありません。
- `risk_matrix.py`へworkbookの`RISK-CART-001`（Impact「高」/Likelihood「中」）を対応付けたordinal値`impact=4`、`likelihood=2`で渡しました。これは根拠を記録する人による比較入力で、実測値やモデル評価ではありません。固定matrix結果はruntime `ok/ready`、`risk-scheme-v1`、fingerprint `sha256:9c4bccd7ca2931ae79e542ebcd73c1b0236780dddee880691ae8dbff0ade5830`で、risk levelは「高」でした。
- `analysis_entities.py`へ同じRisk入力、matrix結果、生成済みAuthority Entityを渡し、`product_risk` / `test_analysis_context`を生成しました。runtimeは`ok/ready`、Product Risk参照は`RISK-CART-001`、fingerprintは`sha256:7e69c051e4e9175b4d90aa697cef0c57820c7af3163319bd9e0d6300c28630d6`です。
- 生成済みAuthority/Riskとsource-backed Scope文字列`SCOPE-001`を用いて`condition_structure(direct)`を実行しました。runtimeは`ok/ready`、issuesは空、generation fingerprintは`sha256:25082d102a1981e7406aba1a5dbfb59d0715ac5e1314c44189de76d80223bd8f`でした。Scopeは独立Entityではなく、M02で意味・出典・revisionを定義する参照です。
- この開発環境にOpenCode CLIがないため、固定Skill packageの意味分析・技法選択を実行していません。選択技法runtime、`materialize_coverage(artifact)`、`case_structure`、同じartifact群の`verify_runtime_evidence(valid=true)`も未実行です。したがってこれはfixtureではない決定論的script統合の部分証拠ですが、M02→M03のPlan受入PASSではありません。

全受入には、Cart由来のsource-backed Authority/Product Risk、M02で定義したScope参照、意味分析と技法結果、direct起点からmaterialize/Caseまでのcurrent artifact、最終`verify_runtime_evidence valid=true`が同じ統合入力について必要です。いずれかのモデル工程を実行していない場合、当該統合受入は未完了です。

固定revisionの全Package（SKILL.md、references、assets、Skill-local scripts）を配布する場合は、外部repoのcommit tree全体との一致を同期前に検証します。evalsや共有の秘密資料は配布許可リストへ含めません。
