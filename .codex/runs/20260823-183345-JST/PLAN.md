# Plan

## Objective

- PR #50の既存Remediation Runとは別に、`pnpm-lock.yaml`のno-op再生成を1回だけ実施する。
- dependency変更なしで差分が発生するかを確認し、lockfile/toolchain driftとdependency resolution変更時の大規模再解決を切り分ける。
- 結果に基づき、lockfile normalizationを別PRへ分離するか、Alert #5を`IN_SCOPE / BLOCKED`のまま維持するかを客観的に決定する。
- 作業完了後は新Run Artifactだけを明示stageしてcommit/pushし、PR #50の最新CIとAlert #5を確認する。

## Scope

### In

- 新Run `.codex/runs/20260823-183345-JST/` の標準Artifact。
- `pnpm install --lockfile-only --ignore-scripts` をdependency selector/overrideなしで1回実行するno-op test。
- no-op前後のpackage/lockfile hash、diff、semantic diff、pnpm/Node/Repository設定、限定したGit historyのread-only調査。
- 最終`pnpm audit`、Alert #5確認、Sanitizer、Markdown lint、final diff、commit/push、PR CI確認。

### Out

- 既存Run `.codex/runs/20260823-145911-JST/` と `.codex/runs/20260823-173606-JST/` の変更。
- 既存Candidate 1〜4の再実行、新しい`pnpm update` variation探索、根拠のない`--resolution-only`実行。
- `package.json` / `pnpm-lock.yaml` の最終差分、ancestor update、override、direct dependency化、manual lockfile edit。
- application source、test、workflow、PR title/body、別PR作成、Alert dismiss。

## Assumptions

- 作業開始時のbranchは`fix/dependabot-security-vulnerability-remediation`であり、GitHub canonical `main`に対して`behind_by=0`であることを確認している。
- `package.json`と`pnpm-lock.yaml`の開始時差分は0である。
- Candidate 1〜4の結果と停止判断は既存Runの証跡を正本とし、今回再実行しない。
- no-op testで一時差分が生じた場合は、通常のpatch/file restorationで開始時stateへ戻し、hash一致を確認する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。今回の判定基準、禁止事項、最終操作はユーザー指示で確定している。
- 仮定してよい細部: semantic比較はlockfileのpackages/snapshots/importer/peer metadata/resolution/version/formatting単位で、調査目的に必要な範囲に限定する。
- 未回答の重要質問: なし。no-opの結果が出た時点で、追加のdependency commandを探さず指定CASEへ分岐する。

## Hypotheses

- H1（driftあり）: dependency変更がなくても、pnpm 9.10.0の現在のcanonical生成結果とcommit済み`pnpm-lock.yaml`が異なり、大規模diffが発生する。この場合、lockfile/toolchain normalizationをsecurity remediationから別PRへ分離する。
- H2（no-op stable）: pnpm 9.10.0でdependency変更なしの再生成はdiff 0または実質0となり、過去Candidate 1〜4の大規模churnはdependency resolution変更時の再解決に起因する。この場合、通常supported mechanismで安全なnarrow remediationを確認できないためAlert #5を`IN_SCOPE / BLOCKED`に維持する。

## Research Plan

- Round 1 Query: 開始baseline、hash、Node/pnpm、canonical main比較をRunへ記録し、H1/H2と採用/停止条件を確定する。
- Round 2 Query: `pnpm install --lockfile-only --ignore-scripts`を1回だけ実行し、直後のdiffとsemantic内容を取得する。Candidate 1〜4と`--resolution-only`は実行しない。
- Round 3 Query: no-op差分がある場合だけ、lockfile/toolchain/config/CI/historyの最有力原因をread-onlyで絞る。diff 0の場合は追加command探索を停止する。
- Exit Criteria:
  - H1またはH2を支持/反証するdiff・hash・semantic evidenceがある。
  - 最終dependency diffが0で、Alert #5の状態と次アクションが明記されている。
  - new Run ArtifactのSanitizer Write/CheckとMarkdown lintが成功している。
  - commit/push後のPR CIと最終working treeが確認されている。

## Approach

1. 既存文書・既存Runを確認済みとして、branch/remote/baselineを記録する。
2. 新RunのPLAN/TASKS/REPORT/run.jsonへ、allowed files、H1/H2、Candidate再実行禁止、no-op commandを記録する。
3. mutation直前にdependency filesのstatus/diff/hashを確認する。
4. no-op commandを1回実行し、候補差分を採用せず調査evidenceとして取得する。
5. 差分があればsemantic比較と限定read-only調査後、通常のpatch restorationでbaselineへ戻す。
6. final evidenceを新Runへ記録し、Sanitizer/lint/final diff後に明示stage、commit、pushする。
7. push後CIとAlert #5を確認し、Runをfinalizeする。

## Definition of Done

- no-op commandを指定どおり1回だけ実行し、exit code、diff行数、semantic diff、before/final hashを記録している。
- H1/H2の判定とCASE A/B、Alert #5の`IN_SCOPE / BLOCKED`維持または変更理由が記録されている。
- Candidate 1〜4、`--resolution-only`、新たなupdate variationを実行していない。
- 最終`package.json` / `pnpm-lock.yaml`差分が0である。
- `pnpm audit`、Alert #5、Sanitizer、Markdown lint、push後PR CIの結果を記録している。
- 新Run Artifact以外に意図しない変更がなく、commit/pushが成功している。

## Risks / Unknowns

- no-op自体がlockfileを変更する可能性がある。候補差分は採用せず、patch restorationとhash一致を確認する。
- no-op差分だけでは原因を一意に特定できない可能性がある。toolchain/config/CI/historyを突合し、最有力説明と未確定部分を分けて記録する。
- `pnpm audit`は既知Alertによりnon-zeroになり得る。Alert inventoryの代替にせず、実行結果として分類する。
- CIはRun Artifact変更に起因して失敗する可能性がある。失敗時は今回差分との因果関係を確認し、無関係な修正を追加しない。

## Thinking Log

- 2026-08-23 18:33 JST: 既存Candidate 1〜4でdependency resolution変更時の大規模churnは既に確認済み。今回の新情報はdependency変更ゼロのno-op再生成だけに限定する。
- 2026-08-23 18:33 JST: H1/H2を切り分けるまで新しいremediation commandを探さない。no-op diff 0ならH2を支持し、no-op diffありならH1を支持する。
- 2026-08-23 18:40 JST: no-opはexit 0だがlockfileに12,858行の差分を生成した。YAML構造比較では全体semantic equalityがtrueであり、H1を「semantic resolution drift」ではなく「lockfile formatting/generation drift」として支持する。
- 2026-08-23 18:40 JST: 直近の大規模整形commit `f0a21218daa1070f7cf7f0471c93c4cbb9cab23d` はpackageManagerを`pnpm@9.10.0`のまま、single quote/inline形式からdouble quote/multiline形式へ変更していた。security remediationとlockfile normalizationは分離する。
