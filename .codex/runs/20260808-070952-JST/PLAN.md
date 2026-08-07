# 計画

## 目的

- `markdownlint-cli2`を通常Markdownのローカル／CI品質ゲートへ追加する。
- 既存のコーディング規約関連文書とRun Artifact生成元を、意味を変えずに品質ゲートへ接続する。

## 対象範囲

- 対象: package script／lockfile、Markdownlint設定、Phase 1 CI quality job、開発者向け文書、通常Markdown、Run Artifactテンプレートと関連契約。
- 対象外: Native実装、Maestro、Playwright、Architecture、過去`.codex/runs/**`、Sanitizer本体、Git操作。

## 前提

- `HEAD`はPR #9を含む`origin/main`を取り込んだ`agent/coding-standards`である。
- `markdownlint-cli2@0.23.2`をexact devDependencyとして追加する。
- Run Artifactの英語見出しは`scripts/verify`等の機械契約が参照するため、互換対応なしの日本語化は行わない。

## 調査仮説

- H1: `.codex/templates/*.md`がRun Artifact Markdownの正本であり、過去Runを変更せずに生成元の再発を防げる。
- H2: MD013は日本語文書、URL、表、コマンドと衝突しやすく、実測後に無効化が必要になる可能性がある。
- H3: `verify`とPhase 1 CIへ同じ`pnpm run lint:markdown`を追加すれば、Local／CIの品質基準を一致させられる。

## 変更方針

1. CLI設定形式、default Rule、対象Markdownの違反を確認する。
2. package／lockfile／config／verify／CIを最小変更する。
3. 通常Markdownと生成元の形式だけを修正し、機械契約の英語見出しと過去Run履歴を維持する。
4. focused contract、Markdownlint、format、lint、typecheck、contracts、verify、Sanitizerを実行する。

## 完了条件

- `pnpm run lint:markdown`、`pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:contracts`、`pnpm run verify`が成功する。
- MD022／MD029を無効化せず、disable Ruleは実測した必要最小限にする。
- `.codex/runs/**`の過去Artifactを一括変更せず、Current Runのsanitizer Write + Checkが成功する。

## 記録

- 詳細な保存用計画は`docs/plans/2026-08-08_071732_pr10-markdown-quality-gate.md`に記録する。
- read-only調査は`code_researcher`、`implementation_researcher`、`test_investigator`へ委譲し、結果をREPORTへ記録する。
