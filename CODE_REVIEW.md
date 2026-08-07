# Code Review Entry Point

## 適用条件
- ユーザーがレビューを依頼した場合
- `/review` を使う場合
- 実装完了前の自己レビュー

## 使い方
1. `AGENTS.md` を確認する。
2. `docs/CODING_STANDARDS.md` を確認する。
3. `.agents/skills/code-review/SKILL.md` を読む。
4. 必要に応じて `.agents/skills/code-review/references/review-workflow.md` を読む。

## Review objective
1. correctness
2. security
3. behavioral regression
4. missing tests
5. maintainability
6. performance
7. developer experience

## Coding standards review

変更差分について、特に次を確認する。

- 通常の型定義が`type`で記述されているか
- `as`や`!`で設計・検証不足を隠していないか
- 外部値が検証されずApplicationやDomainへ入っていないか
- 相関する状態がnullableなPropertyの組み合わせになっていないか
- 型、選択肢、型ガードの正本が重複していないか
- ApplicationがInfrastructureへ依存していないか
- WebとNativeの依存が混在していないか
- Errorを捕捉する目的が明確か
- 固定待機、Timeout延長、Assertionの弱体化で問題を隠していないか
- 今回の変更に必要のない抽象化や規約対応を追加していないか

規約違反であっても、変更と無関係な既存問題や実害のない表現差は、今回の必須Findingとして扱わない。

## What to report
- 差分に起因する問題だけを報告する。
- 根拠が弱い論点は finding にせず `Open questions` に回す。
- 単なる好みや既存問題を差分起因として扱わない。
- 規約を機械的に適用することで差分が過度に広がる場合は、最小修正または別対応を提案する。
- レビュー結果は原則チャット返答のみとし、明示的な調査・保存依頼がない限り `docs/reports/` に report file を作らない。

## Required review format
- findings-first
- severity 順
- Severity
- Title
- Location
- Why it matters
- Evidence
- Suggested fix
- Open questions
- Verdict
- confidence

## Report file 生成ルール
- Allowed: ユーザーが「レポートとして保存」「調査レポートを作成」など保存を明示した場合、計画 DoD に report file が明記されている場合、複数ソース調査・監査・検証結果を後で参照する durable artifact として残す必要がある場合。
- Not allowed: review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録、チャットで完結する評価。
- 保存先: consumer repo 作業は `docs/reports/`。`.codex/runs/<run_id>/REPORT.md` は run-local log として別扱い。
- 判断に迷う場合は report file を作らず、チャット返答と run-local `REPORT.md` に留める。
