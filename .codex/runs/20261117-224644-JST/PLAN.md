# Run計画 — GitHub Actions lockfile / PR #224

- Repository計画: docs/plans/2026-11-17_224644_github-actions-lock-security-only.md
- 対象: 既存PR #224のみ。作業branchは codex/t08-actions-security-only-20261115。
- 開始時点: local HEADとPR headは ffe51347c68f764f24bb2707dedf1e50c90bd493、baseはmain。開始時のWeb CIとMobile App CIはいずれもsuccess。
- ユーザー指示によりL2 workflow変更は承認済み。main push、force push、merge、close、security setting／permission変更はしない。
- 既存範囲は7 workflow、外部Action参照120件、11種類のSHA、同一repository内reusable workflow参照3件。120件は元のrelease versionを保つ。
- 9種類はrelease tag先のcommit SHAが既存SHAと一致する。pnpm v4.4.0とGradle v5.0.0は既存SHAが公式署名付きannotated tag objectのSHAで、peeled release commitは別SHA。ユーザーは正確な同一version tagへの変更を明示承認した。
- GitHub公式gh-actions-lock CLIでactions.lockを生成し、read-only CI検証へ置き換える。ローカルreusable workflow呼出しはそのまま保持する。
- Dependabot security PRのlock自動同期は、対象PRがなければ未検証とする。security settingsを変更しない。
- 完了条件は、ローカルgate、最新headのWeb CIとMobile App CI、および根拠を記したPR本文。wait_for_required_ciが利用できなければGitHub pollingへ代替せず、CI確認未達として報告する。
