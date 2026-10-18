# Evaluation契約

## 目的

この文書は、Codex harness における `evaluation.json` の評価契約について説明します。初期実装（Initial implementation A）の段階ではスキーマ実装そのものではなく、後続のスキーマおよびバリデータ実装に先行する契約例（contract example）として位置づけます。

## 基本方針

- 初期段階では数値スコア（score）を主軸としません。
- `rating + evidence`（評価値と根拠）の組み合わせを基本とします。
- 数値スコアについては、十分な評価データが蓄積されてから後段で改めて検討します。
- 評価（evaluation）には成果物の評価だけでなく、ハーネス改善候補（harness improvement candidate）を含めることができます。
- 客観的な観測事実には `run.json`、`codex-task` のレポートJSON、およびログを参照します。
- エージェント自身が終了コード（exit code）、変更ファイル（changed files）、実行コマンド（executed commands）などの実行事実を事後的に自己申告・後書きすることはありません。
- `evidence` は人間向けの簡潔な説明文、`evidence_refs` は機械可読（machine-readable）な成果物（artifact）への参照として扱います。

## Rating Enum（評価値）

評価観点（dimension）ごとの評価値の列挙型（rating enum）は、以下に固定します。

```text
pass | warn | fail | not_evaluated
```

## Evaluation Result Enum（評価結果）

実行（run）全体の `evaluation.result` は、以下に固定します。

```text
pass | partial | fail | not_evaluated
```

`dimensions.*.rating` は観点ごとの状態を示し、`evaluation.result` は実行全体の成果達成度を表します。

## 主な評価観点

### `task_completion`

- 何を評価するか:
  - ユーザーからの依頼や計画で定義された成果がどこまで達成されたか。
- どのような evidence を求めるか:
  - 変更ファイル（changed files）、実装差分、出力成果物（artifact）、未完了項目の明記。
- 判断例:
  - `pass`: 必須成果物がすべて揃っており、非目標（スコープ外事項）も遵守されている。
  - `warn`: 主要な成果物は揃っているものの、未完了項目や追加修正を前提とする部分が残っている。
  - `fail`: 必須成果物が不足しており、目的を達成できていない。

### `scope_control`

- 何を評価するか:
  - 変更が許可範囲内に収まり、不要な差分を発生させていないか。
- どのような evidence を求めるか:
  - `changed_files`、計画上の対象ファイル、除外対象の確認結果。
- 判断例:
  - `pass`: 変更が許可された対象のみに限定されている。
  - `warn`: 境界線上にあたる変更が含まれており、追加レビューが必要である。
  - `fail`: スコープ外のソースファイル（source file）の変更や削除が行われている。

### `validation_confidence`

- 何を評価するか:
  - 実施された検証が十分であるか、またその結果をどこまで信頼できるか。
- どのような evidence を求めるか:
  - 検証コマンド（verify command）のステータス、既存テスト／スモークテスト／結合テスト（integration test）の実行結果、未実行の理由。
- 判断例:
  - `pass`: 必須の検証が実行され、結果も妥当である。
  - `warn`: 一部が未実行または失敗しているものの、限定的な補足説明がなされている。
  - `fail`: 必須の検証が不足している、失敗している、あるいは正当な理由なく省略されている。

### `safety_compliance`

- 何を評価するか:
  - 安全規則（safety rule）、フック（hook）、ラッパーポリシー（wrapper policy）、および禁止事項を遵守したか。
- どのような evidence を求めるか:
  - ブロックされたアクション（blocked action）の有無、実行コマンド、ラッパーの利用状況、禁止操作が実行されていないことの確認。
- 判断例:
  - `pass`: 安全ポリシー違反が一切ない。
  - `warn`: ブロックされたアクションは発生したものの、危険な操作自体は実行されていない。
  - `fail`: 禁止された実行経路の利用や、安全でないアクション（unsafe action）が行われた。

### `reviewability`

- 何を評価するか:
  - 事後に人間が差分、根拠、判断の経緯を追跡できるか。
- どのような evidence を求めるか:
  - `REPORT.md`、実行成果物（run artifact）、明示された根拠（evidence）、整合性の取れたカテゴリ／指摘事項（category / finding）。
- 判断例:
  - `pass`: 主要な判断と証跡が十分に追跡可能である。
  - `warn`: 一部説明不足な点はあるものの、全体の流れは追跡できる。
  - `fail`: 根拠が不足しており、レビューが不可能な状態である。

### `maintainability`

- 何を評価するか:
  - 変更が既存の構造に沿っており、今後の保守運用を不必要に難しくしていないか。
- どのような evidence を求めるか:
  - 既存設計との整合性、責務の適切な分離、不要な複雑化の有無。
- 判断例:
  - `pass`: 既存の構造と責務の分離が適切に保たれている。
  - `warn`: 動作はするものの、後続作業で整理が必要な箇所が残っている。
  - `fail`: 保守性を著しく損なうような構造変更が行われている。

### `reproducibility`

- 何を評価するか:
  - 同一の実行（run）を別の担当者が容易に追跡・再実行できるか。
- どのような evidence を求めるか:
  - 実行ID（run id）、参照した計画（plan）、実行コマンド、成果物パス（artifact path）、環境依存事項の明記。
- 判断例:
  - `pass`: 再現に必要な情報が十分に記録されている。
  - `warn`: 一部環境依存度が高いものの、未再現の要因が明確に記録されている。
  - `fail`: 再現に必要な前提条件や証跡が欠落している。

## Failure Taxonomyとの接続

- `primary_failure_category` は、`spec/failure-taxonomy.json` に定義されたカテゴリ（category）から選択します。
- `failure_categories` も同様に、分類体系（taxonomy）と整合している必要があります。
- `findings[].category` も、分類体系と整合している必要があります。
- 分類体系（taxonomy）で定義されていない独自のカテゴリは使用しません。
- 根拠（evidence）が示されていない指摘事項（finding）や評価値（rating）は、後続のバリデータ（validator）で警告（warning）または失敗（failure）として扱うべきです。
- `evidence_refs` は任意（optional）ですが、`run.json`、レポート、ログ、サブエージェント（subagent）、検証コマンド（validation command）への参照を含めることで、レビュー容易性（reviewability）が向上します。

## 改善候補

`improvement_candidates`（改善候補）には、少なくとも以下の項目を含めるべきです。

- `target`
- `evidence`
- `evidence_refs` (optional)
- `expected_impact`
- `recommendation`

対象になり得るファイルおよびディレクトリの例:

- `AGENTS.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `.agents/skills/`
- `.codex/rules/`
- `.codex/hooks/`
- `scripts/codex-safe.*`
- `scripts/codex-task.*`
- `spec/`

## 契約の例

以下は初期実装（Initial implementation A）における説明用のサンプルです。スキーマの正式実装ではありません。

```json
{
  "schema_version": 1,
  "run_id": "20260627-103240-JST",
  "result": "partial",
  "primary_failure_category": "missing_validation",
  "failure_categories": ["missing_validation"],
  "dimensions": {
    "task_completion": {
      "rating": "warn",
      "evidence": "Implementation completed, but required verification failed.",
      "evidence_refs": [
        {
          "kind": "validation_command",
          "path": ".codex/runs/20260627-103240-JST/run.json",
          "selector": "$.validation.commands[0]",
          "event_id": null,
          "summary": "verify command exited with code 1"
        }
      ]
    },
    "scope_control": {
      "rating": "pass",
      "evidence": "Changed files were within the allowed scope."
    },
    "validation_confidence": {
      "rating": "fail",
      "evidence": "Required verify command exited with code 1."
    }
  },
  "findings": [
    {
      "category": "missing_validation",
      "severity": "medium",
      "evidence": "bash template/scripts/verify exited with code 1.",
      "evidence_refs": [
        {
          "kind": "run_manifest",
          "path": ".codex/runs/20260627-103240-JST/run.json",
          "selector": "$.validation",
          "event_id": null,
          "summary": "validation summary recorded the verify failure"
        }
      ],
      "detail": "Required verification did not pass."
    }
  ],
  "improvement_candidates": [
    {
      "target": "PLANS.md",
      "evidence": "Repeated missing validation findings across implementation runs.",
      "evidence_refs": [],
      "expected_impact": "Reduce ambiguous fallback validation decisions.",
      "recommendation": "Clarify fallback validation policy."
    }
  ]
}
```
