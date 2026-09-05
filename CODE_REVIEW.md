# Repository Code Review Contract

この文書は、Scenario Shop Repositoryに固有のレビュー入力、Coding Standards、外部レビュー承認、review成果物の保存契約を定義します。genericなreview workflow、findingの意味、出力形式、severity順は `code-review` Skill packageを正本とします。

## Repository inputs

- Coding policy: [`docs/CODING_STANDARDS.md`](docs/CODING_STANDARDS.md)
- Review persistence policy: 通常のreview結果はchatまたはcurrent Runの `REPORT.md` に記録し、durable reportが必要な条件・保存先・命名・保持はRepositoryの依頼条件とRun運用へ従います。
- Skill package: [`code-review`](.agents/skills/code-review/SKILL.md)

## 外部レビューサービスの実行承認

CodeRabbit など外部レビューサービスの full review / 再レビューは、明示的な実行指示または承認を得てから起動する。レビュー完了後は結果を報告して停止し、指摘の修正、thread操作、再レビューはユーザーの判断を受けるまで実行しない。既存レビューの取得、reviewDecisionの確認、inline thread状態の参照は、レビュー起動とは別のread-only確認として扱う。

## Repository Coding Standards

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
- Markdown変更がある場合、`pnpm run lint:markdown`を実行し、`pnpm run verify`へ接続された品質ゲートを壊していないか

規約違反であっても、変更と無関係な既存問題や実害のない表現差は、今回の必須Findingとして扱わない。

## Review persistence policy

- Review-only、plan-only、status update、軽い確認、通常のevidence command結果、Run progress記録、chatで完結する評価は `docs/reports/` へ保存しない。
- ユーザーが保存を明示した場合、計画DoDにreport fileがある場合、または複数ソースの調査・監査・検証結果を後で参照する必要がある場合だけ、Repositoryのdurable report保存先を使う。
- `.codex/runs/<run_id>/REPORT.md` はRun-localの意味記録であり、durable reportとは別扱いとする。
