# Repository EOL Contract（2026-08-17）

## 変更

- `.gitattributes`を`* text=auto eol=lf`へ更新した。
- ルート`.editorconfig`を追加し、UTF-8／LF／final newlineを明示した。
- `.prettierrc.json`へ`endOfLine: lf`を追加した。
- `docs/PROJECT_CONTEXT.md`へEOL契約を追記した。

## 判断と検証

- global `core.autocrlf=true`は証跡として確認したが、global設定は変更しなかった。
- 既存の変更を保持して`git add --renormalize .`を実行し、EOLだけの差分を意味のある変更から分離した。
- 代表的なTypeScript／Markdown／JSON／PowerShell／Shellファイルで`git check-attr`の`eol: lf`を確認した。
- Windows Native相当のclean checkoutとブランチA→B→Aで`pnpm run format:check`が成功した。
- `pnpm run verify`、`git diff --check`、追加文書を含むformat／markdownチェックを実行し、契約変更に起因する失敗がないことを確認した。
