# Plan

## Objective

- 完了済みの `20260825-225012-JST` Runと既存nanoid reportを正本として、Candidate Bの却下根拠を同一baselineのOriginal / Control / Candidate B対照実験で追加検証する。
- `expo-router@57.0.16>nanoid` と `postcss@8.5.23>nanoid` のparent-scoped overrideにより発生した差分と、pnpm再resolutionによるbaseline driftをdependency semanticsで切り分ける。
- production dependencyを変更せず、追加Evidenceをdurable reportと新規Run Artifactへ保存し、対象branchへcommit・pushする。

## Scope

- In:
  - 同一commitから独立isolated copyを3つ作成し、Node / pnpm / registry / command / scripts条件を固定する。
  - Original baseline、Control（scoped overrideで3.3.16固定）、Candidate B（scoped overrideで3.3.18固定）のlockfileをpnpmで生成する。
  - hash、nanoid resolution、parent edge、Metro / Babel / PostCSS、peer snapshot、bufferutil、utf-8-validate、package / edge差分を比較する。
  - 既存durable reportへFollow-up validationをappendし、Candidate BのRecommendationをEvidenceに基づき再判定する。
  - 新規Run Artifactの保存、sanitizer、commit、明示refspec push、PR head確認。
- Out:
  - production `package.json` / `pnpm-lock.yaml`へのremediation実装。
  - product code / test code、global override、direct dependency、PostCSS direct dependencyの追加。
  - `pnpm run verify`、Web CI、Native CI、Issue / PR metadata変更、PR merge、force push、rebase。

## Assumptions

- 現在branch `investigate/issue-55-nanoid-remediation` とPR #66 head branchが一致している限り、現在HEADを全実験の固定baselineとする。
- 既存Run `20260825-225012-JST` は完了履歴として変更せず、今回の追加検証は新規Runへ記録する。
- 既存Candidate Bと同じ `pnpm install --lockfile-only --ignore-scripts` を再現し、command変更が必要な場合だけ理由を記録する。
- isolated copyは作業用temporary領域に作成し、pathやraw logをRun Artifactへ保存しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対照条件、候補、非目標、完了条件が指定されている。
- 仮定してよい細部: isolated copyの一時配置、差分抽出方法、Evidenceの要約形式。
- 未回答の重要質問: Controlでも発生する差分とCandidate B固有差分の範囲、Candidate Bの再判定。

## Hypotheses

- H1: ControlでもMetro / peer metadata差分が発生し、これらはoverrideによるnanoid version変更固有ではなくpnpm再resolution driftである。
- H2: Candidate B固有の変更がnanoid resolutionと必要なlockfile metadataに限定されれば、Candidate Bはclean candidateとして再評価できる。
- H3: Candidate Bだけにunrelated package version、dependency edge、peer resolution変更が残れば、既存の「安全なcandidateなし」を維持する。

## Research Plan

- Round 1 Query: baseline HEAD、Node / pnpm / registry、初期manifest / lockfile hash、同一install commandを固定する。
- Round 2 Query: Original / Control / Candidate Bをfresh isolated copyで実行し、3-way semantic diffとcausal classificationを作成する。
- Round 3 Query: reportのFollow-up validation、Run Artifact、sanitizer、commit / push / PR head確認を完了する。
- Exit Criteria:
  - 3実験の初期hashと実行条件がEvidence付きで記録されている。
  - Control発生差分とCandidate B固有差分がdependency semanticsで分類されている。
  - Candidate BのRecommendation AまたはBを明確に確定している。
  - production dependency fileに変更がなく、report / Run Artifactがsanitizedされ、push後headが確認されている。

## Approach

- Originalはmanifest / lockfileを変更せず同一commandを実行し、自然な再resolution driftを取得する。
- Controlは既存overrideを保持したまま2つのparent-scoped selectorを3.3.16へ固定し、Candidate Bと同一commandを実行する。
- Candidate Bは同じselectorを3.3.18へ固定し、Controlと同じ条件で実行する。
- Original→Controlで共通化した差分をoverride構造 / baseline drift、Control→Candidate Bで増えた差分をversion変更固有として分類する。
- 標準フロー: `PLAN -> TASKS -> isolated experiments -> semantic diff -> report -> sanitizer -> commit -> push`。

## Definition of Done

- 3-way実験結果、主要hash、command、差分分類、Candidate B再判定が既存reportへ追記されている。
- Recommendation AまたはBと、採用時のsafe change surfaceまたは却下時のblocker / 再評価条件が明記されている。
- 新規RunのPLAN / TASKS / REPORT / 必要なrun.jsonが日本語で完了状態になっている。
- sanitizer Write / CheckがPASSし、production `package.json` / `pnpm-lock.yaml`、product code、test codeに差分がない。
- 対象branchへ通常commit・explicit refspec pushし、PR #66の現在のDraft / Ready状態を変更せずhead更新を確認している。

## Risks / Unknowns

- pnpm registry metadataが前回調査と変化し、3実験の全てに新しいdriftが発生する可能性がある。3実験の同時条件とOriginalとの差分で分類する。
- Controlでmanifest override自体のsnapshot差分が発生しても、productionへ混ぜてよいとは判断しない。実際の変更対象とunrelated semanticsを分離する。
- Candidate Bがcleanになっても、今回の追加検証ではproduct validationを実行せず、implementation PRのvalidation条件として残す。

## Thinking Log

- 2026-08-26 07:21 (JST): branchは対象branch、working treeはclean、PR #66はOPEN・Readyであることを確認した。PR状態は変更しない。
- 2026-08-26 07:21 (JST): 既存Run `20260825-225012-JST` と他branchのactive Runを確認した。今回のCandidate B follow-upに対応するactive Runはないため新規Runを初期化した。
- 2026-08-26 07:36 (JST): Originalは同一commandでlockfile不変、ControlとCandidate Bは共通してMetro edgeを`0.84.5`へ再解決した。Metroはnanoid version固有ではないが、Candidate Bの実生成diffから除外できないためclean candidate判定は維持する。
- 2026-08-26 07:36 (JST): Candidate Bで`bufferutil` / `utf-8-validate`追加は再現せず、Control-only差分だった。既存reportの帰属を訂正し、Recommendation BをEvidence付きで確定した。
