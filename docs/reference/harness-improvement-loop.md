# Harness改善のリポジトリリファレンス

## 目的

この文書は、ポータブルな`harness-improvement`スキル向けに、Scenario Shopにおける具体的なtarget catalog、strictness mapping、成果物（artifact）の保存先、および共通のevaluation契約を提供します。候補の項目、targetの定義、Evidenceの要件、およびレビューの位置づけは、package-local workflowを正本とします。

なお、Repository target catalog、Strictness mapping、safety layer、Evaluation artifact、follow-up candidatesは、既存のHarness契約で使われる固定名称としてそのまま保持します。

## リポジトリの入力

- リポジトリのevaluation契約に記載されているevaluation artifactとFindingスキーマ。
- `spec/failure-taxonomy.json`に定義されているfailure category。
- Run manifestおよびRunの`REPORT.md`にあるチェックポイント。
- `.codex/logs/`または該当する`.artifacts/codex-hooks/`内にあるHook JSONLログ。
- アクティブなワークフローから提供されるSubagentレコードとレビューコメント。

## Harnessの対象カタログ

候補の`target`項目を指定する際は、以下の具体的なRepository targetを使用します。

- 指示レイヤー: `AGENTS.md`、`PLANS.md`、`CODE_REVIEW.md`、`.agents/skills/`。
- 安全性レイヤー: `.codex/rules/`、`.codex/hooks/`。
- 実行レイヤー: `scripts/codex-safe.*`、`scripts/codex-task.*`。
- 契約レイヤー: `spec/`、`docs/reference/`、`examples/`。
- その他: 既存レイヤーに当てはまらないRepository target。パスを明示的に記録します。

この対応のために、新しいcatalog schemaやレジストリ、JSON設定を新設することはありません。

## Strictnessの対応

- `normal`: ドキュメント、サンプル、安全性に影響しないスキルの動作。
- `strict`: 安全性レイヤー、ランナー、スキーマ、ルール、フック、`codex-safe`、`codex-task`、および`spec/`契約の変更。
- `blocked`: 破壊的操作、クレデンシャル（認証情報）の取り扱い、外部権限の行使、ポリシーのバイパス。

Safety layerの変更にはstrictワークフローによるレビューが必要です。また、`blocked` candidateは、明示的な許可や個別の対象範囲の指定がない限り、現在のタスクには適用しません。

## Evidenceの統合

- Evidenceは、`evaluation.json`のFindingまたはimprovement candidate、run manifestの検証コマンド（validation command）、Hook JSONL、Runのチェックポイント、レビューコメント、および複数Runにわたる反復的な失敗から取得します。
- `failure_category`には`spec/failure-taxonomy.json`のカテゴリを使用し、候補作成時に新しいカテゴリを追加しません。
- Hook JSONLには、blocked actionや検証動作などの客観的・機械的な事実を記録します。
- Runの`REPORT.md`には、Delegation、Result、Parent decisionといった、エージェントによる意味付けや判断内容を記録します。

## repair loopとの関係

- repair loopの停止理由や反復的な失敗は、Harness改善のEvidenceとして活用できます。
- 現在のrepair loopでは解決できない構造上の問題は、`strict`または`blocked`の後続候補（follow-up candidates）として切り離します。
- ネイティブ環境でのステージ反復、プリフライト不足、試行ログ（attempt log）の上書き、および上流ステージ失敗後に下流ステージを実行した事実は候補のEvidenceとして残しますが、自動ランナー、安全性、スキーマの変更を許可するものではありません。

## 分離と承認

ユーザーが両方を明示的に対象として指定しない限り、プロダクトの実装修正とHarness改善は明確に分離します。改善候補はすべて`proposed`から開始し、オーナーレビュー（owner review）を必須とし、自動適用は行いません。また、却下または保留となった候補についても、Evidenceと判断理由を保持します。

## 対象外

- 改善候補の自動適用。
- Safety layerの即時変更。
- Harness改善の提案へのプロダクト実装の混在。
- failure categoryの推測、または新しいタクソノミー（taxonomy）の作成。
