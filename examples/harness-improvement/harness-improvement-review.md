# Harness改善のレビュー

## 候補の概要

- `hic-001`: normal docs improvement
- `hic-002`: strict schema / validator follow-up
- `hic-003`: blocked policy-bypass proposal

## 根拠の確認

- `hic-001`はrepair-loop例の`evaluation.findings[]`で裏付けられる。
- `hic-002`は複数Runにわたる繰り返しのレビューコメントで裏付けられる。
- `hic-003`はblockedのSafety layer提案であり、自動適用してはならない。

## リスクの確認

- normal candidate: 低リスク
- strict candidate: contractとCIのリスクがあるため、別途レビューが必要
- blocked candidate: policyと安全性のリスクがあるため、現在の対象範囲では却下

## 担当者の判断

- `hic-001`: 後続のdocs PRで対応することを承認
- `hic-002`: 受け入れ前に追加のEvidenceが必要
- `hic-003`: rejected

## 採用した候補

- `hic-001`

## 却下した候補

- `hic-003`

## 保留した候補

- `hic-002`

## 後続PRの対象範囲

- docs / examplesの更新はrunnerまたはSafety変更と分けて進められる。
- strictの後続対応を無関係な実装作業へまとめてはならない。
