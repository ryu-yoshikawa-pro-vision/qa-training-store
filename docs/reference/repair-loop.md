# 修復ループのリポジトリReference

## 目的

この文書は、portableな`repair-loop` Skillへ提供するScenario Shopのリポジトリ側契約を定義します。package-localのSkillとworkflowは、一般的な対象範囲を限定したloop、Findingの仕分け、反復記録、検証、停止の意味を定義します。

この文書のRepository-side contractsには、`failure taxonomy`、artifact、対象範囲、evaluation、sanitizationの各契約を含めます。

## リポジトリの入力

- `CODE_REVIEW.md`のRepository coding and review policy。
- `docs/reference/change-scope-policy.md`の対象範囲ポリシー。
- Repositoryのevaluation契約にあるevaluation artifactとFinding schema。
- `spec/failure-taxonomy.json`にあるfailure category。
- active Run契約で定義されたRun manifest、run report、hook observation、Subagent recordの保存先。
- `scripts/sanitize-codex-artifacts.ps1`のsanitization commandとcheck契約。

`AGENTS.md`はこれらのRepository inputをpackageへ対応付けます。別のRepositoryで使うとき、このpackageはこれらのpath、schema、commandを前提にしてはいけません。

## 共通の品質gate方針

品質gateの失敗は、保留する前にbaseline、現在のdiff、共有依存関係、testまたはCI契約、実行環境に照らして調査します。現在の変更またはその検証に必要な安全で最小の修復は、現在のloopで扱います。無関係、unsafe（安全でない）、破壊的、環境だけに起因する、または要件判断を要する問題は、因果関係の評価、未実行チェック、次の対応とともに後続対応として記録します。

## EvaluationとFailure Taxonomyの統合

- Repositoryのevaluation artifactを、loopの結果、Finding、残差、改善候補の正本とします。
- RepositoryのFailure Taxonomyを`failure_category`の正本とします。Native実行ラベルは補助Evidenceとして対応付け、新しいevaluation categoryとして追加しません。
- loopが完了条件を満たさず停止した場合も、`partial`または`fail`の結果を見える状態で残します。

## 対象範囲とartifactの統合

- `allowed_files`と`expected_changed_files`はRepositoryの変更範囲ポリシーに照らして確認します。
- Run reportはappend-only契約のもとでcheckpointの意味を保持します。
- Hook JSONL、Run manifest、evaluation file、Subagent recordはEvidenceの源です。最終判断はevaluation artifactと記録したdecisionに残します。
- Repository artifactのsanitizationは完了gateです。sanitizationされていないlocal absolute pathがある場合、Runは完了できません。

### REPORT.mdのappend-only契約

`REPORT.md`のAppend-only契約は、checkpointの意味を削除、並べ替え、意味変更せずに保持することを指します。既存記録のローカル絶対Pathを既定Tokenへ置換する安全性例外は、記録の意味を変えない場合に限ります。

## Subagent Evidenceの境界

既存のSubagent生成recordと観測は、対象範囲への適合や親の判断のEvidenceとして利用できます。このRepository referenceは、Subagentのrole、tool、permission、sandbox設定、delegationルールを定義・複製しません。

## 外部レビューの方針

外部サービスのfull reviewや再レビューは、ユーザーの明示的な指示または承認後だけ開始します。結果を報告した後の修復、thread操作、別レビューにはユーザーの判断が必要です。

## 永続的な報告

Runの進捗はactive Run reportに記録します。永続的なレポートファイルは、ユーザーまたは完了条件が後日の監査参照を明示的に求める場合だけ作成します。レビューのみや軽い確認だけを理由に永続的なレポートを作成しません。
