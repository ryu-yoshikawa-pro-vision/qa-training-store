# Evaluation（評価）

`evaluation.json` は agent または reviewer が作成します。直接 `codex` での作業とvalidationの観測事実を、`run.json`、logs、validation evidenceから参照し、ここでは解釈と判断を記録します。

- `evaluation.json` が failure interpretation の source of truth です。
- `run.json.evaluation_path` は evaluation artifact への summary link です。
- `run.json.primary_failure_category` は valid evaluation からコピーされる summary field です。
- `evidence` は required の短い説明、`evidence_refs` は optional の structured reference です。
- 実行事実、changed files、exit code、log path、executed commandsなどmachine-managed factsを手書きしません。

## Inputs（入力）

- Run manifest:
- Logs:
- Changed files source:
- Validation evidence:

## Rules（ルール）

- 観測事実は実行記録、hooks、validation evidenceから記録する。
- 解釈はagentが生成する。
- `changed_files`、exit code、log path、executed commandsを手書きしない。
- `failure_categories`と`findings[].category`は`spec/failure-taxonomy.json`から選ぶ。
- すべての`rating`とFindingにはEvidenceを含める。
- `evidence_refs` を使う場合は artifact 全文を複製せず、path / selector / event_id / summary で参照する。
- `result`が`fail`または`partial`の場合、通常は`primary_failure_category`をnon-nullにする。
- `improvement_candidates`には`target`、`evidence`、`expected_impact`、`recommendation`を含める。

## Evaluation JSON

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "result": "not_evaluated",
  "primary_failure_category": null,
  "failure_categories": [],
  "dimensions": {
    "task_completion": {
      "rating": "not_evaluated",
      "evidence": "Task completion has not been evaluated yet.",
      "evidence_refs": []
    },
    "scope_control": {
      "rating": "not_evaluated",
      "evidence": "Scope control has not been evaluated yet.",
      "evidence_refs": []
    },
    "validation_confidence": {
      "rating": "not_evaluated",
      "evidence": "Validation confidence has not been evaluated yet.",
      "evidence_refs": []
    },
    "safety_compliance": {
      "rating": "not_evaluated",
      "evidence": "Safety compliance has not been evaluated yet.",
      "evidence_refs": []
    },
    "reviewability": {
      "rating": "not_evaluated",
      "evidence": "Reviewability has not been evaluated yet.",
      "evidence_refs": []
    },
    "maintainability": {
      "rating": "not_evaluated",
      "evidence": "Maintainability has not been evaluated yet.",
      "evidence_refs": []
    },
    "reproducibility": {
      "rating": "not_evaluated",
      "evidence": "Reproducibility has not been evaluated yet.",
      "evidence_refs": []
    }
  },
  "findings": [],
  "improvement_candidates": []
}
```
