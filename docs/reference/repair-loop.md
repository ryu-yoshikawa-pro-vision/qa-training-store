# 修復ループのリポジトリReference

## 目的

この文書は、portableな`repair-loop` Skillへ提供するScenario ShopのRepository-side contractsを定義します。package-localのSkillとworkflowは、一般的な対象範囲を限定したloop、Findingの仕分け、反復記録、検証、停止の意味を定義します。

## Repository inputs

- Repositoryのcoding and review policyは`CODE_REVIEW.md`を参照します。
- 対象範囲ポリシーは`docs/reference/change-scope-policy.md`を参照します。
- evaluation artifactとFinding schemaはRepositoryのevaluation契約を参照します。
- Failure categoriesは`spec/failure-taxonomy.json`を参照します。
- Run manifest、Run report、Hook observation、Subagent recordの保存先はactive Run契約を参照します。
- Run Artifactのlifecycleとpath sanitizationは[`docs/reference/run-artifacts.md`](run-artifacts.md)を参照します。Repair workflowはこのRepository-wide契約を利用し、ここでは重複定義しません。

`AGENTS.md`はこれらのRepository inputをpackageへ対応付けます。別のRepositoryで使うとき、このpackageはこれらのpath、schema、commandを前提にしてはいけません。

## 共通の品質gate方針

品質gateのfailureは、保留する前にbaseline、current diff、shared dependency、test or CI contract、execution environmentに照らして調査します。原因が現在の変更、現在の変更を検証するために必要なもの、または独立した既存問題のいずれであっても、現在の権限内で安全な最小修正が可能ならcurrent loopで扱います。baseline、既存問題、unrelated statusだけを理由に保留しません。

安全な修復が、unsafe、destructive、permissionまたはcredentialに依存する、irreversible external side effectを伴う、requirement-dependentである、またはRepositoryのretry stop conditionに達したため実行できない場合は、causal assessment、unexecuted checks、next actionを記録し、bounded workflowに従って停止します。

## EvaluationとFailure Taxonomyの統合

この文書の`failure taxonomy`（Failure Taxonomy）は、Repositoryの評価分類契約を指します。

- Repositoryのevaluation artifactを、loopの結果、Finding、残差、改善候補の正本とします。
- RepositoryのFailure Taxonomyを`failure_category`の正本とします。Native execution labelは補助Evidenceとして対応付け、新しいevaluation categoryとして追加しません。
- loopが完了条件を満たさず停止した場合も、`partial`または`fail`の結果を見える状態で残します。

## 対象範囲とartifactの統合

- `allowed_files`と`expected_changed_files`はRepositoryの変更範囲ポリシーに照らして確認します。
- Run reportはappend-only契約に従い、checkpointの意味を保持します。
- Hook JSONL、Run manifest、evaluation file、Subagent recordはEvidenceの源です。最終判断はevaluation artifactと記録したdecisionに残します。
- Repository artifactのsanitizationは完了ゲートです。サニタイズされていないローカル絶対パスがある場合、Runを完了扱いにしません。

## Subagent Evidenceの境界

既存のSubagent生成recordと観測は、対象範囲への適合や親の判断のEvidenceとして利用できます。このRepository referenceは、Subagentのrole、tool、permission、sandbox設定、delegationルールを定義・複製しません。

## 外部レビューの方針

外部サービスのfull reviewや再レビューは、ユーザーの明示的な指示または承認後だけ開始します。結果を報告した後の修復、thread操作、別レビューにはユーザーの判断が必要です。

## 永続的な報告

Runの進捗はactive Run reportに記録します。永続的なレポートファイルは、ユーザーまたは完了条件が後日の監査参照を明示的に求める場合だけ作成します。レビューのみや軽い確認だけを理由に永続的なレポートを作成しません。
