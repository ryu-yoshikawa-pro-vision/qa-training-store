# Failure Taxonomy

## 目的

この文書は、ソースリポジトリの静的カタログ `spec/failure-taxonomy.json` を人間向けに解説したリファレンスです。Failure Taxonomy の目的は、Run の失敗原因を再発防止につながる統一された形式で記録し、`evaluation.json` の category 名にブレが生じないようにすることです。

## 基本ルール

- `primary_failure_category` には、Run の主たる失敗原因を 1 つ選択します。
- `failure_categories` は複合要因を表す配列です。
- `failure_categories` には `primary_failure_category` を必ず含めます。
- `findings[].category` は taxonomy と整合している必要があります。
- taxonomy 外の category を agent が独自に作成してはいけません。
- エビデンス（evidence）のない分類は、後続の validator で warning または failure と判定すべきです。

## Category一覧

| Category | 意味 | 改善対象 |
| --- | --- | --- |
| `instruction_gap` | 指示が曖昧で Codex が判断に迷った | `AGENTS.md`, skills |
| `scope_creep` | 不要な変更を行った | worker policy, allowed files |
| `missing_context` | 必要なファイルや背景情報を確認していない | planning skill |
| `missing_validation` | 検証不足 | `codex-task`, validation plan |
| `unsafe_action_blocked` | 危険な操作が rule や hook で阻止された | rules, hooks, prompt policy |
| `bad_subagent_delegation` | subagent への委譲が不適切 | subagent policy |
| `flaky_or_env_issue` | 環境差異や不安定性による問題 | sandbox, setup docs |
| `review_gap` | レビュー観点の漏れ | `CODE_REVIEW.md`, review skill |
| `repair_loop_stalled` | 修正ループが収束しない | stop condition, repair skill |
| `artifact_contract_gap` | artifact の責務・構造・正本関係が不明確で Run を評価できない | run artifact docs, schema |

## Runner CandidateとAgentの判断

- runner candidate:
  - exit code、verify status、hook block、変更ファイルなどの客観的な観測事実から候補を提案できる分類です。
  - 例: `missing_validation`, `unsafe_action_blocked`, `scope_creep`, `flaky_or_env_issue`
- agent judgement:
  - 指示の質（instruction quality）、コンテキストの読み漏れ、レビュー観点、subagent 委譲の妥当性など、文脈に応じた判断が必要な分類です。
  - 例: `instruction_gap`, `missing_context`, `bad_subagent_delegation`, `review_gap`, `repair_loop_stalled`, `artifact_contract_gap`

最終的な `primary_failure_category` は、runner が自動決定するのではなく、agent や reviewer が taxonomy から選定します。

## `primary_failure_category` と `failure_categories`

### `primary_failure_category`

- Run の主たる失敗原因として 1 つ選択します。
- サマリー作成や集計（summary / aggregation）で使用します。

### `failure_categories`

- 複合要因を表す配列です。
- `primary_failure_category` を必ず要素に含めます。

## `findings[].category` の扱い

- `findings[].category` は、taxonomy の category と一致している必要があります。
- rating や finding にエビデンス（evidence）が示されていない場合、後続の validator は warning または failure と判定すべきです。
- category だけを付与し、その判断理由を示さないような運用は避けてください。

## `artifact_contract_gap` の利用条件

- 通常の実装失敗（implementation failure）には使用しません。
- artifact のスキーマ・責務・正本関係（source-of-truth relationship）が不明確で、Run 自体を評価できない場合に限って使用します。
- 例:
  - `run.json` と `evaluation.json` のどちらが失敗の解釈（failure interpretation）の正本なのか不明な場合
  - `codex-task` レポート JSON と `run.json` の責務が重複しており、観測事実の正本を特定できない場合

### 誤用防止

- verify の失敗、実装漏れ、単純なバグ、テスト失敗などを理由に `artifact_contract_gap` を設定してはいけません。
- そのような場合は通常、`missing_validation`、`scope_creep`、`instruction_gap` など別の適切な category を選択します。

## 例

```json
{
  "primary_failure_category": "missing_validation",
  "failure_categories": ["missing_validation"],
  "findings": [
    {
      "category": "missing_validation",
      "severity": "medium",
      "evidence": "bash template/scripts/verify exited with code 1.",
      "detail": "Required verification did not pass."
    }
  ]
}
```