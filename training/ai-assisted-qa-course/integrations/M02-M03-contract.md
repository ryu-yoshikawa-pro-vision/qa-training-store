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

### 2026-10-23 source-backed deterministic downstream run

- 入力ソース: PR開始HEAD `b8f8642c45c6622b227c5c08f8756129eb037d00`時点の正式Cart仕様と`training/workbook/01_target-risk.csv`。固定Skill scriptsはcommit `7cc6cba7772de549841a39d71694cbafbc783324`のread-only checkoutから実行しました。
- 前段: 上記sourceに基づいて人が正規化したAuthority行を`authority_entities.py`へ渡し、`AUTH-CART-BR-001`と`AUTH-CART-AC-001`を生成しました。Risk台帳`RISK-CART-001`の定性的なImpact「高」/Likelihood「中」をordinal `4`/`2`に対応付けた入力は判断値であり実測ではありません。`risk_matrix.py`は固定schemeで「高」を計算し、matrix fingerprintは`sha256:7704758b8f6591b0d89f0a97a5f442e1da5184f1c158c3a9a3fccd32793d0b26`でした。生成したAuthority Entity、Risk入力/matrix結果を`analysis_entities.py`へ渡し、Product Risk参照`RISK-CART-001`を持つcurrent contextを生成しました（fingerprint `sha256:958feead5522087e86da4f7f5ffa885ba9e124d8e7ca3134e13826230c1f4091`）。
- 条件と技法: `condition_structure(direct)`は生成済みAuthority/Risk Entityとsource-backed文字列`SCOPE-001`を受け、`TCN-001`を生成しました（fingerprint `sha256:f2b337e5a83c37853b3a2a0ebe7f1c8cddef65863cd2d3a98a119b3c51327f44`）。BVAを使う判断は正式仕様から人が入力したもので、OpenCodeの技法選択結果ではありません。`bva.py`はlow-stock scenario（在庫3、purchaseLimit 5、有効上限3）の境界値2/3/4を生成しました（fingerprint `sha256:92f57f6ecbf33e4534f653bbfc1dbdf22cadbddf033e6cf580873960a0b17998`）。
- downstream: `test_data_requirements.py`はscenario/variant/stock/purchaseLimitを含むTDRを生成しました（fingerprint `sha256:e39246df2a91ace95ba2aa2c496f3ca479f42eff5fb53a2cf9036d8992a1cb2`）。`materialize_coverage(artifact)`は3件のCoverage Itemを生成しました（fingerprint `sha256:0bdd5a3f0ffb8497f3d6764cc9da4bf313ff94b3068a5be5764a8eab8453dde7`）。current Entity blockを保持して`case_structure`を実行し、数量2/3/4の3 Caseを生成しました（fingerprint `sha256:e1cb860d620116d5072f0373ab97b6ce5626aa5f6339ead91083f6e2f8ccca21`）。上限超過Caseは拒否と従前数量保持を期待結果にしました。
- runtime evidence: `test-condition-design/scripts/runtime_contract.py verify_runtime_evidence`は`valid=true`、issues 0、期待/実績4 unitsでmissing/extra 0。`test-case-design/scripts/runtime_contract.py verify_runtime_evidence`も`valid=true`、issues 0、Case runtime unit 1、missing/extra units/entities 0でした。両検証には上流Machine Entity blockを保持した同じsource-backed入力系列を使用し、flattenしたmetadataのみで代用していません。
- 境界: これは正式仕様を根拠に人が意味を選択して固定Skillの決定論的runtimeを最後まで実行した開発用統合検証です。OpenCode CLIのモデル依存意味分析・技法選択を実行していないため、OpenCode経由の統合受入やM02→M03全体のPlan受入PASSとはしません。M02の「AI/Skillが仕様の意味を誤って分析しない」という能力確認は未達のままです。未実行結果を合成していません。

### 2026-10-23 M03公開fallback SCOPE-101 deterministic integration

- 固定source: `qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`。Authority、Risk matrix、technique candidate、analysis、requirement、condition、BVA、test-data、materialize、caseの実行scriptと各Skillの`runtime_contract.py`は、この固定revisionから抽出した一時read-only Skill sourceで実行しました。これには`authority_entities.py`、`risk_matrix.py`、`technique_candidates.py`、`analysis_entities.py`、`requirement_structure.py`、`condition_structure.py`、`bva.py`、`test_data_requirements.py`、`materialize_coverage.py`、`case_structure.py`が含まれます。
- 入力根拠: PR開始HEAD `b8f8642c45c6622b227c5c08f8756129eb037d00`時点のCart `BR-CART-001` / `AC-CART-001`、default Seedの`variant-basic-shirt-01`在庫20・購入上限5、workbook `RISK-CART-001`高Impact/中Likelihood、および作業中のM03公開fallback `SCOPE-101`です。公開入力に明記された定性的Riskのordinal mappingはImpact `4` / Likelihood `2`で、実測値ではありません。
- Authority helperは`AUTH-CART-BR-001` / `AUTH-CART-AC-001`を生成しました（schema `entity-state-v2`、implementation fingerprint `sha256:3762c8913bafab87e84c66fd15fbb9376cc7ba29645629cda7bf45d32b2081c6`）。Risk matrixは`RISK-CART-001`をlevel/priority「高」で生成しました（`artifact:risk_matrix:all`、fingerprint `sha256:7704758b8f6591b0d89f0a97a5f442e1da5184f1c158c3a9a3fccd32793d0b26`）。Technique candidateは境界値分析を候補に返しましたが、`stateful` signalは未確定でした。分析上の狭い数量境界範囲に対して「今回の選択に影響しない」と人が判断して記録しています。Analysis helperはProduct Risk、Technique Selection、Test Analysis Contextを生成しました（`artifact:analysis_entities:all`、fingerprint `sha256:4252f4b91e48a7f3772736a2be6ef78d7bebb0664a58be42d2c3da9b45bddc6c`）。
- Requirement runtimeは`TR-001`を生成しました（fingerprint `sha256:f41b534899542a437f9850596ade93c814e7212a1fdca61bb1bf237d69fe6ddc`）。現在のTRを含む`condition_structure(direct)`は`TCN-001`と`bva-001`を生成し、Scope/Authority/Risk参照を保持しました（fingerprint `sha256:2c5c107db8b3811a503f6c36623ad5f9afce1aa927aa6a734d260ed776f3244c`）。BVA runtimeは有効上限5に対して`BELOW=4`、`AT=5`、`ABOVE=6`を生成しました（`model:bva-001`、fingerprint `sha256:fe430407fb69f9e1fc54275315f90da7d5c0b4ecf3031b0db8d1d4cd4a092519`）。
- `test_data_requirements`はdefault scenario、variant ID、stock 20、purchaseLimit 5の4要件を生成しました（fingerprint `sha256:663cf8158f45d6edb9fedb1bbc26c4f561bd7b56f4683e3dd1a4456226393075`）。`materialize_coverage(artifact)`は`TCN-001-CI01/02/03`を生成しました（fingerprint `sha256:e7f909b48f3e9f15525c32bc28e17d39a85a728e669b472f1b7118d6f4093002`）。Case runtimeは`TC-001/002/003`を生成しました（fingerprint `sha256:c38c3833e1b65200c8357f2453f352729710118bd9b4a990c662bdd6d32192f3`）。
- 最終evidence gate: condition-designは`valid=true`、issues/missing/extra/missing entities/extra entitiesが全て0で、4 runtime unitsを照合しました。case-designも`valid=true`、同じ項目が0で、1 runtime unitを照合しました。両方とも実際のInput/ResultとMachine Entityを含む成果物Markdownを検証しています。
- 境界: これはsource-backed入力を人が与え、固定Skillの決定論的runtimeを最後まで実行した開発用統合検証です。初回の確認では境界値入力の置換漏れを検出し、その結果は採用せず、入力を4/5/6へ揃えた再実行を行いました。OpenCode CLIのモデル依存意味分析・技法選択は実行していません。よってOpenCode経由の受入、AIが仕様を意味的に正しく分析・選択できること、M02→M03全体のPlan受入PASSを証明するものではありません。未実行結果は合成していません。

固定revisionの全Package（SKILL.md、references、assets、Skill-local scripts）を配布する場合は、外部repoのcommit tree全体との一致を同期前に検証します。evalsや共有の秘密資料は配布許可リストへ含めません。
