# Black-box Scored Mode

## 選択

Black-box Scored modeは、Agentの未知の不具合を見つける能力を評価するときだけ選択します。Required Coverageは提供されたchallenge inputだけから取得します。通常のQA依頼で自動選択せず、リポジトリレベルのread-only境界を隔離の代わりに使いません。

## 隔離の境界

評価対象のCoding Agentには、preparation workflowが提供するlearner-safeの規範入力、challenge missionまたはrunbook、採点用Skill input、制約付きoutput contractだけを渡します。Source、version-control metadata、tests、patches、answer keys、build artifacts、過去Run、一般的なShell、任意のbrowser evaluation、network response body、native package fileは、trusted contractが明示的に許可しない限り受講者境界の外に置きます。

Runnerは評価対象となるFresh Coding Agent Sessionです。Repository固有のNode.js runner、LLM API wrapper、CLI wrapper、orchestration processではありません。

## 信頼済みCapability

Official Scored Runには、Fresh Session、trusted session identity、Tool Isolation、trusted Actual Tool Scope inventory、source-free Prepared Target、trusted host capability evidenceが必要です。これらはHostまたはpreparationのreceiptであり、Repositoryから推測した主張ではありません。

`Sec-Fetch-Dest`などのbrowser UX情報は多層防御にすぎず、security boundaryではありません。trusted isolationと実際のresource negative probeを正本とします。

## Preparationの境界

Preparationはmachine contractとChallengeを検証し、protected patchとbaselineまたはpatched sanityを確認し、learner-safeな仕様入力とSource-free targetを作成し、canonical inputとartifact identityをfreezeし、Forbidden Boundaryを確認して、準備済みRuntime capabilityをHostへ渡します。Coding Agent Sessionの起動、tool routing、retry、lifecycle管理は行いません。

protected patchは採点用preparationの使い捨てtargetにだけ適用します。application branchへcommitせず、Runner-visible inputへcopyしません。precondition、patch check、postcondition、deterministic reset sanityのいずれかが失敗した場合、preparationはRunを開始しません。

## Blockedと停止の意味

必要なHost capability、trusted proof、source-free target、isolationのいずれかが欠ける場合、Official Scored Runを`BLOCKED`、`DEFERRED`、または`NOT EXECUTED`として記録します。欠落したreceiptを推測で補わず、決定的なfixtureをOfficial Runへ昇格させず、custom Runnerやwrapperでblockerを修復しません。

targetが必要な初期状態でない、protected patchを適用できない、preparation後に再現条件がない、outputが制約またはfreezeされていない、benchmark identityが不整合、またはisolation・Tool Scopeのproofが無効な場合は、採点せず停止します。

## Findingsとevaluationの境界

RunnerのFindingはevaluation前にfreezeします。分離されたEvaluatorはRun後だけprotected answer materialを読み、提供されたRepository contractに従って一致、atomicity、重複、non-defect、environment blocker、isolationまたはTool Scope failure、予期しない有効Findingを記録します。ground-truthの変更には、元の結果を書き換えず、新しいrevisionとFresh Runを使います。

Metricは有効なOfficial Scored Runだけに適用し、定義できない0除算の分母は提供された契約に従ってnullのままにします。

## 対象外

- NormalまたはGray-box QAをBlack-box isolationとして扱うこと。
- 非公開またはリポジトリ固有のagent orchestratorを実行すること。
- 欠落したHost Evidenceを補完して、無効または信頼できないRunを通すこと。
- 実行後にFrozen Findingsを書き換えること、またはbenchmark identityを変更すること。
