# Trigger Eval Qualification blockerの理解更新

2026-09-10 JST、PR #127のEnvironment Qualificationで観測されたnegative compound commandを、一般的なPowerShell構文の証明へ拡張せず、bounded observation contractへ反映した。

- 実測の `$pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name` は、固定variable、固定reader/options、固定相対path、固定pipeline、固定property suffixのcommand全体が一致する場合だけsafe no-readとする。
- canonical Skill readの追加、任意suffix、別path、variable path、別variable、追加reader、別operator、truncated、malformed inputはunreliableとしてtrusted absenceを成立させない。
- Routing Target preflightはdetached HEADを自動検査する。期待routing source SHAはTarget作成時のRun preflightで比較し、Result provenanceで再確認する責務とした。
- Qualificationは同一fresh Targetでnegative / positiveが両方PASSした場合だけcanonical allへ進み、FAILまたはunreliable時はcanonicalとvalid baselineを実行しない。

この理解更新に対応する恒久契約はADR-0023へ追補し、実装・回帰test・Run Artifactは別の実装Runへ記録する。
