# Harness改善のリポジトリReference

## 目的

この文書は、portableな`harness-improvement` Skillに対して、Scenario Shopの具体的なtarget catalog、strictness mapping、artifact保存先、共通evaluation契約を提供します。候補の項目、targetの意味、Evidenceの要件、レビューの意味はpackage-local workflowを正本とします。

Repository target catalog、Strictness mapping、safety layer、Evaluation artifact、follow-up candidatesは、既存のHarness契約で使われる固定名称として保持します。

## リポジトリの入力

- Repositoryのevaluation契約にあるevaluation artifactとFinding schema。
- `spec/failure-taxonomy.json`にあるfailure category。
- Run manifestとRun `REPORT.md`のcheckpoint。
- `.codex/logs/`または該当する`.artifacts/codex-hooks/`にあるHook JSONL log。
- active workflowから提供されるSubagent recordとレビューコメント。

## Harnessの対象カタログ

候補の`target`項目を埋めるときは、次の具体的なRepository targetを使います。

- 指示layer: `AGENTS.md`、`PLANS.md`、`CODE_REVIEW.md`、`.agents/skills/`。
- 安全性layer: `.codex/rules/`、`.codex/hooks/`。
- 実行layer: `scripts/codex-safe.*`、`scripts/codex-task.*`。
- 契約layer: `spec/`、`docs/reference/`、`examples/`。
- その他: 既存layerに当てはまらないRepository target。pathを明示的に記録します。

この対応のために新しいcatalog schema、registry、JSON設定を作りません。

## Strictnessの対応

- `normal`: 文書、例、安全性に関わらないSkillの動作。
- `strict`: 安全性layer、runner、schema、rules、hooks、`codex-safe`、`codex-task`、`spec/`契約の変更。
- `blocked`: 破壊的操作、credentialの取り扱い、外部権限、policy bypass。

Safety layerの変更にはstrict workflowのレビューが必要です。`blocked` candidateは、明示的な許可と別の対象範囲がない限り、現在のtaskには適用しません。

## Evidenceの統合

- Evidenceは`evaluation.json`のFindingまたはimprovement candidate、run manifestのvalidation command、Hook JSONL、Run checkpoint、レビューコメント、複数Runにわたる反復失敗から得られます。
- `failure_category`には`spec/failure-taxonomy.json`のcategoryを使い、候補作成時に新しいcategoryを追加しません。
- Hook JSONLには、blocked actionや検証動作などの機械的な事実を記録します。
- Run `REPORT.md`には、Delegation、Result、Parent decisionなどのagentによる意味付けを記録します。

## repair loopとの関係

- repair-loopの停止理由と反復失敗は、Harness改善のEvidenceにできます。
- 現在のrepair loopで解決できない構造上の問題は、`strict`または`blocked`の後続候補として分離します。
- Nativeでのstage反復、preflight不足、attempt logの上書き、上流stageの失敗後に下流stageを実行した事実は候補のEvidenceとして残しますが、自動runner、安全性、schemaの変更を許可するものではありません。

## 分離と承認

ユーザーが両方を明示的に対象にしない限り、実装修正とHarness改善は分けます。候補は`proposed`から始まり、owner reviewを必要とし、自動適用しません。却下または保留した候補もEvidenceと判断理由を保持します。

## 対象外

- 自動適用。
- Safety layerの即時変更。
- Harness改善の提案へのProduct実装の混在。
- failure categoryの推測または新しいtaxonomyの作成。
