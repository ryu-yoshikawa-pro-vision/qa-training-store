# Agentic QA Working Tree Snapshot契約の追加

## 変更理由

Wave 6のNormal／Gray-box契約にある「実行前後の同形式Working Tree Snapshotと追加Source差分0確認」を、説明だけでなくJSON + Zodの機械検証対象として固定した。

## 判断

- Snapshotは`working-tree-snapshot.ts`でbefore／afterを取得する。
- 比較結果は`passed`、`source_head_changed`、`source_diff`、`additional_source_diff_count`を持つ。
- `qa-findings-normal.json`／Gray-box Findingsはbefore／after／comparisonの3参照を必須とする。
- `.codex/runs/`、`.artifacts/`等のQA生成物はSource差分比較から除外する。
- Snapshotの差分が残る場合、Training Contract validationをfail-closeする。
