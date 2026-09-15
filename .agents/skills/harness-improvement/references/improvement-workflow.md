# Harness Improvement Workflow（Harness改善Workflow）

## When to use（使う場面）

- Run結果またはevaluation findingをHarness改善候補へ変換するとき。
- repair-loopで繰り返した失敗を後続改善へ変換するとき。
- レビューコメントまたは再発する失敗を、安全でレビュー可能な提案へ変換するとき。

## Do not use（使わない場面）

- タスクがProduct実装そのものの修正である場合。
- 単発のbugで、Harnessレベルの再発防止候補がない場合。
- 提案する改善を裏付けるEvidenceがない場合。

## Inputs（入力）

- evaluation resultとFinding。
- Run manifestと検証結果。
- Hookの観測とSubagent record。
- レビューコメントと、複数Runにわたる繰り返しの失敗。
- リポジトリから提供されるtarget catalog、strictness mapping、失敗taxonomy、artifact契約。

## Candidate model（候補モデル）

候補は次のfieldを持ちます。

```text
candidate_id
target
failure_category
source_runs
evidence
expected_impact
risk
recommended_change
strictness
status
owner_decision
```

### target

`target`は改善対象のHarness componentまたはlayerを識別します。実際のpathまたはlayerには、具体的なRepository target catalogを使い、このSkillに新しいcatalogやregistryを作りません。

### strictness

```text
normal
strict
blocked
```

- `normal`: 文書、例、安全性に関わらない動作。
- `strict`: 安全性、実行、schema、policy、契約の動作をレビューする必要がある変更。
- `blocked`: 破壊的操作、credentialの取り扱い、外部権限、policy bypassが必要になる変更。

どの具体的なtarget pathまたはlayerに各分類を適用するかは、Repository mappingで決めます。

### status

```text
proposed
accepted
rejected
deferred
implemented
```

### owner_decision

```text
not_reviewed
approved
rejected
needs_more_evidence
```

## Evidence requirements（Evidenceの要件）

各候補には具体的なEvidenceを含めます。次のいずれかを少なくとも1つ必須とします。

- evaluation finding
- 既存の改善候補
- active Runに記録された検証command
- Hookの観測
- Subagent record
- レビューコメント
- 複数Runにわたる繰り返しの失敗

Evidenceのない候補は禁止します。

## Classification and prioritization（分類と優先順位）

- 提供されたRepository failure taxonomyを使い、分類を追加しない。
- 失敗の種類、改善対象、strictnessを分ける。
- 正しさ、安全性、契約の曖昧さ、繰り返しの失敗を優先する。
- `strict`と`blocked`の候補について、レビューコストとリスクを説明する。

## Safety and separation（安全性と分離）

- `strict`候補にはRepository strict workflowのレビューが必要です。
- `blocked`候補は、明示的な許可と別の対象範囲なしに現在のtaskで扱いません。
- ユーザーが両方を明示的に対象にしない限り、実装修正とHarness改善を分けます。
- 候補を自動適用せず、レビューのため計画、文書、Issue、後続変更へ送ります。

## Output format（出力形式）

候補の概要、Evidence、期待する影響、リスク、推奨する変更、strictness、担当者の判断、後続作業の対象範囲を含めます。却下または保留した候補も、Evidenceと理由を保持します。

## Non-goals（対象外）

- 自動適用。
- 安全性レイヤーの即時変更。
- Harness改善の提案へのProduct実装の混在。
- 失敗分類の推測や新しいtaxonomyの作成。
