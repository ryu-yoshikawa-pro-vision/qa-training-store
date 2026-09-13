# PR #133 複数モデルレビュー再評価の文脈更新

## 更新日

2026-09-11 JST

## 更新内容

- C09の配布Workbook診断行は受講者が記録する`Not run`の初期状態とし、診断FailureのEvidenceは受講者の実行へ委ねる。
- C12はTraining Copyの生成検証と、受講者のPlaywright TestをPull Requestで成功させたrun / Artifactを別のEvidenceとして扱う。
- `training:web:exercise`の`pull_request`条件はexercise Step自身に存在することを構造契約で検証する。
- Evidence説明文に含まれるローカルPath境界、Android launcher package取得時のbroken pipe、Android helper callの誤検出、iOS timeout原因の過剰断定を再評価し、成立した項目だけをbounded repair対象とする。ja-JP ANRの因果関係とP1-4以前のmetadata参照は未確認または修正不要とする。

## 境界

Workbook schema、Product Behavior、BR / AC、Seed Scenario、Maestro Flowの意味、iOS Build-only保証、runner / Xcode / CocoaPods / cache、既存のgrader / framework / dependencyは変更しない。
