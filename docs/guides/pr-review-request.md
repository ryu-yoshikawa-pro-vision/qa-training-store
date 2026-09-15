# PRレビュー依頼テンプレート

PRレビューを依頼するときは、対象、確認範囲、優先観点、出力形式を先に固定する。

## テンプレート

```md
対象PR:
確認範囲:
- 実装差分
- CI結果
- ドキュメント差分

優先観点:
1. 正しさ / 挙動の回帰
2. セキュリティ / データの扱い
3. テスト不足
4. 保守性
5. ドキュメント

出力形式:
- Findings first
- Severity
- Location
- Why it matters
- Evidence
- Suggested fix
- Open questions
- Verdict
```

## 例

```md
https://github.com/<owner>/<repo>/pull/<number> をレビューしてください。
CIと現在の実装差分を含めて確認し、残っている問題だけ severity 順に出してください。
```

## 注意事項

- review-only の場合、`docs/reports/` に report file を作らない。
- 重要な判断根拠はチャット返答または `.codex/runs/<run_id>/REPORT.md` に残す。
- GitHub上の変更操作は、ユーザーが明示した場合だけ行う。
