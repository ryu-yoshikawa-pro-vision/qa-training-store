# Markdown品質ゲート導入（2026-08-08）

PR #10で、通常のMarkdown文書を`markdownlint-cli2`で検査する品質ゲートを追加した。

- 設定正本はリポジトリ直下の`.markdownlint-cli2.jsonc`とし、対象は通常の管理Markdown、生成物・依存ディレクトリ・`.codex/runs/**`は除外する。
- `pnpm run lint:markdown`をpackage scriptへ追加し、`pnpm run verify`とPhase 1 CIの`quality` jobから同じコマンドを呼び出す。
- MD022／MD029は有効維持し、既存文書は意味を変えない形式修正だけで通過させる。MD013等の無意味な大量差分を生むルールは、設定へ理由を記録して必要最小限だけ調整する。
- Run Artifactは`.codex/templates/*.md`を修正して今後の生成物を改善する。過去`.codex/runs/**`は変更しない。英語見出しは`scripts/verify`等の既存文字列契約と互換性があるため今回維持する。
