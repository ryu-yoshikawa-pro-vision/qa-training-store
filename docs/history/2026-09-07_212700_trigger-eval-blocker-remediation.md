# Trigger Eval blocker remediation の理解更新

2026-09-07 JST、PR #127のinvalid canonical evidenceを再利用する前に、current Codex HostのSkill read shapeとTrigger Eval queryのexecution contractを再確認した。

- selectorは単一のforward-slash/unquoted完全一致だけではなく、current Hostで観測された4つのcanonical repository path形状を扱う必要がある。
- 24 queryには、未特定のPull Request・error・Run・fileを参照するもの、full APK build/install/Maestroや購入フロー全体などrouting確認を越えるものがあった。query単体で対象とbounded completionを解決できるよう修正した。
- `expected_skill`、`boundary`、scoring、timeout、Skill description、AGENTS.md routing意味契約はこの修正で変更しない。
- 旧fingerprint `283cb4d...` のartifactはinvalid evidenceとして保持し、新fingerprint `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`とは混在させない。
