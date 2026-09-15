# 探索的QA Workflow

## 対象範囲と分離

探索的QAは、対象範囲を限定したリスクベースの探索によってRuntimeの動作をNormative Specificationと比較します。観測と操作はCoding Agentが行います。決定的なSupporting toolは結果の検証や保存を行えますが、Agent Sessionのlaunch、wrap、retry、管理は行いません。

QA中はProduct Codeを変更しません。Product変更が必要な場合は、先にFindingを確定し、Repair workflowへ明示的に切り替えます。

## Modeの選択

- **Normal**は通常のQA依頼で使う既定Modeです。固定契約文言は `**Normal** is the default Mode for ordinary QA requests` です。現在のCharterをCoverageのsourceとして、Normative Specificationに照らしてRuntimeを探索します。
- **Gray-box**はNormalのread-only境界を保ち、seed reset、test control、clockまたはpayment delay、deep link、application restart、限定的なconsoleまたはlog、DOM検査、アクセシビリティ検査など、明示的に許可されたSupporting controlだけを追加します。
- **Black-box Scored**は、未知の不具合を見つける能力を明示的に評価するときだけ選択します。隔離とtrusted capabilityの要件は[scored mode](scored-mode.md)で定義し、通常のQAの自動的な代替にはしません。

Runtimeとの対話の前にModeを選択します。依頼されたModeがその境界を満たせない場合は、適用される契約に従って停止するか、Runをblockedとして記録します。

## Gray-boxの境界

Gray-boxはNormalのread-only境界を保ちます。Coding Agentは、現在のCharterとRepository contractが明示的に許可するcapabilityだけを通じてRuntimeを観測・操作できます。対象には、列挙されたseed/reset、test、clock、payment-delay、deep-link、restart、限定的なconsole/log、DOM、アクセシビリティ支援が含まれます。

Gray-boxでは、Product Source、Test Source、defect patch、answer key、Instructor専用のground truthをoracleの構築に使いません。Expected behaviorは引き続きNormative Specificationから取得します。Repositoryが提供するGray-box capabilityはSupporting controlとして使えますが、Black-box Scoredのsource-free isolationとは異なり、それらの禁止されたsourceへのアクセスやSpecificationのoracleとしての置換を許可するものではありません。

## Charter、Coverage、Budget、Stop

NormalとGray-boxでは、Charterがmission、Normative reference、risk、roleまたはseed、platformまたはdevice、許可されたRuntime control、Required Coverage、探索Budget、Stop Conditionを固定します。Runtimeと対話する前に現在の作業用に作成または再検証し、過去のCharterを暗黙に再利用しません。

Required Coverageは、現在のQAで回答すべき対象範囲を限定したmissionの集合です。1つのCoverage Itemは、1つの明確に限定されたmissionです。現在のCharterまたは採点challengeをCoverageの正本として扱い、探索中に項目を追加、削除、並べ替えしません。

Budgetは探索量を限定し、Stop Conditionは完了の境界を定めます。固定したRuntime limitは実測値として記録します。Runtimeでlimitを固定できない場合だけ、提供された契約のnullまたはunbounded表現を使います。単一のhappy pathや単一のFindingだけで作業を完了したことにはしません。

## Oracleとリスク分析

対話する前にNormative Specificationを読み、対象FeatureのBusiness Rules、Acceptance Criteria、規範feature契約を確認します。Expected BehaviorはApplication SourceやExisting Testsではなく、Normative Specificationから取得します。

依頼された対象範囲に関係するriskを優先します。primary journey、roleまたはpermission、state transition、validation、boundary、error handling、emptyまたはloading state、persistence、session、画面間の整合性、アクセシビリティ、responsive behavior、native behavior、recoveryまたはretry、data integrityなどです。網羅的なchecklistを実行するのではなく、Specification、Charter、challengeのriskから優先順位を決めます。

## Normal and Gray-box bootstrap（NormalとGray-boxの起動）

1. 現在のCharterを確認または作成し、参照、対象範囲を限定したCoverage、Budget、Stop Conditionを検証する。現在の作業用に作成または再検証する固定契約は `Create or revalidate it for the current work` です。
2. リスク分析を完了する。
3. 最初のRuntime interaction前にBEFORE Working Tree Snapshotを取得する。
4. Runtimeと対話し、観測結果を収集する。

必須の順序は次のとおりです。固定Runtime limitは `A fixed Runtime limit must be recorded as measured data` として記録します。

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ first Runtime interaction
```

暗黙の過去RunのCharterや、探索後に取得したBEFORE Snapshotは無効です。

## Runtime exploration（Runtime探索）

Coding Agentが提供するBrowserまたはNative Runtime capabilityを使い、Runtimeそのものを観測・操作します。

```text
移動 → 観察 → 操作 → 状態遷移を観察
→ Specificationと比較 → Evidenceを収集 → 次の探索を選択
```

primary journeyの後は、優先したriskに基づいてalternate path、invalid input、boundary、繰り返し操作、backまたはreload、session遷移、role差分、recoveryを検討します。対象範囲を限定したBudgetとStop Conditionなしに探索しません。

Native QAでcapabilityを利用できない場合は、Evidence付きでblockedまたはnot executedとして記録します。regression suiteの成功だけでは、Agentic QAの完了とはみなしません。

## EvidenceとFindings

現在のcapabilityで取得できるRuntime上のEvidenceを集めます。URLまたはscreen、DOM、アクセシビリティツリー、screenshot、限定的なconsoleまたはlog、表示状態などです。契約が意味的な観測を要求する場合、screenshotだけではmachine-semantic proofになりません。自由記述のメモや説明だけでもObservationの証明にはなりません。

`1 Finding = 1 distinct product deviation`を維持します。各Findingには次を記載します。

- Expected behavior and Actual behavior.
- Reproduction steps, Oracle, Role or Seed, and reproduction count.
- Evidence that supports the deviation.
- Severity and Confidence.

複数のdeviationを1つのFindingへまとめず、Findingを探索している間はProduct Codeを修復しません。

各Coverage Itemでは、次の対象範囲を限定したloopを使います。

```text
Coverage Itemを選ぶ
↓ Specification確認
↓ Runtime観察
↓ 操作
↓ 結果観察
↓ Expected / Actual比較
↓ 必要なら追加探索
↓ Evidence取得
↓ Findingまたは正常観測を記録
↓ 次Coverageへ
```

## 確定処理

探索が完了したら、Repositoryが定義するcandidate findings artifactを作成します。NormalとGray-boxではAFTER Working Tree Snapshotを取得し、同じRunとModeのBEFORE Snapshotと比較して、追加Source diffが0であることを確認してからFindingsを確定します。Repositoryのschema、Coverage、Evidence、scoringの確認には決定的なSupporting toolを使います。

NormalとGray-boxで必須の確定順序は次のとおりです。

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ Runtime QA
→ candidate Findings
→ AFTER Working Tree Snapshot
→ BEFORE / AFTER comparison
→ additional Source diff = 0
→ Findings finalization
```

## 停止条件

Required Coverageが完了した、Budgetを使い切った、明示されたStop Conditionを満たした、Environment blockerによって有効な探索ができない、ユーザーの対象範囲が完了した、またはModeの隔離・trusted capability要件が失敗した場合に停止します。無効なRunを成功と扱わず、理由と未完了のCoverageを記録します。

## 対象外

- 対象範囲を限定しない探索的テスト。
- リスクや情報の増加を伴わないチェックリスト消化。
- QA中のProduct修復。
- 不足しているRuntime capabilityを迂回するための独自Agent Runner、LLM wrapper、session manager。
