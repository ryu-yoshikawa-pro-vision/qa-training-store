# Plan

## Objective

- PR #50のレビュー指摘を、指定PlanとRepositoryのRepair Loop契約に従って修正する。
- 完了済みRun `20260823-145911-JST` のREPORT.mdへ、15:25 remediation記録と15:41 Final gatesの順序不整合をappend-onlyで訂正する。
- 未解消のHigh/runtime Alert #5（`js-yaml@4.3.0` / `GHSA-5p4m-2wfm-xmqj`）について、既存Candidate 1〜3を再実行せず、新しい根拠に基づく安全な最小remediationの有無をboundedに再調査する。

## Scope

- In:
  - `20260823-145911-JST/REPORT.md`末尾へのappend-only訂正。
  - 本repair RunのPLAN/TASKS/REPORT/run.json。
  - branch、canonical remote main、lockfile、pnpm設定、Node/pnpm、公式pnpm CLI/documentationのread-only調査。
  - 新しい仮説で安全性とsupported性を説明できるcandidateが1件だけある場合のbounded評価。
  - remediationを採用した場合だけ、`package.json` / `pnpm-lock.yaml`の必要最小差分とPlan記載のvalidation。
  - commit、push後のPR #50 CIとAlert #5状態確認。
- Out:
  - 既存Candidate 1〜3の同一コマンドまたは単なるvariationの再実行。
  - PR title/body変更、unrelated Alertの修正、dependency全体更新、ancestor更新、direct dependency化、global override、lockfile手編集。
  - application behavior、architecture、workflow policyの変更、merge/rebase/force push、Alert dismiss。

## Assumptions

- 現在のbranchは対象branchで、canonical remote mainに対して`behind == 0`であり、dependency filesの開始時差分はない。
- `pnpm-lock.yaml`のlockfileVersion、resolution、snapshotをaffected判定の正本とする。
- `pnpm why` / `pnpm list`はfrozen install後の補助情報であり、mutation直後の採否根拠にはしない。
- network-required executionはrepair Runの`auto-net`前提で実行する。
- 既存RunのAlert inventory（8件、全件`dependency.scope=runtime`、Alert #5のみ`IN_SCOPE`）とCandidate 1〜3の不採用根拠は再利用し、同一inventoryを無意味に再取得しない。ただしpush後のAlert状態確認は別途行う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定Planがscope、停止条件、BLOCKED判定を確定している。
- 仮定してよい細部: `--resolution-only`がselector限定でない場合は実行せず、公式仕様とCLI helpの根拠だけを記録する。
- 未回答の重要質問: pnpm再生成範囲の原因、`--resolution-only`の実際の作用範囲、対象経路だけを再解決するsupported手段の有無。

## Hypotheses

- H1: Candidate 1〜3の大規模diffは、js-yaml selector自体ではなく、pnpm 9.10.0のlockfileVersion／peer dependency設定／生成時環境との差により再解決範囲が広がった可能性がある。lockfile header、settings、package.json、workspace/npmrc、pnpm config、現在のNode/pnpmとGit履歴を突合して支持または反証する。
- H2: `--resolution-only`はinstall全体のresolution処理を制御するoptionであり、selector付きtransitive 1件へ限定できない可能性がある。pnpm 9.10.0 CLI helpとpnpm公式documentの仕様を突合し、全体再解決なら実行しない。
- H3: pnpm 9.10.0で公式にselector限定・transitive対象・lockfile-only・manifest不変を同時に満たす新しいsyntaxが確認でき、現在のlockfile設定と環境を固定すれば対象2経路だけを変更できる可能性がある。supported性、実diff、semantic resolutionの3点が揃った場合だけ1回評価する。

## Research Plan

- Round 1 Query: lockfileVersion、lockfile settings、package.jsonのpnpm設定、workspace/npmrc、pnpm config、Node/pnpm、lockfile変更履歴、現在branchとcanonical mainを調査する。
- Round 2 Query: pnpm 9.10.0の`pnpm help install` / `pnpm help update`と公式pnpm documentationを突合し、`--resolution-only`とselector付きtransitive lockfile-only再解決の作用範囲を確認する。
- Round 3 Query: 新しい仮説が示すsupported candidateが存在する場合だけ、attempt前diff確認後に1回評価する。存在しない場合はBLOCKEDを維持する。
- Exit Criteria:
  - H1〜H3ごとにCLI、公式仕様、lockfile/config、実動作の支持/反証がある。
  - candidateを実行する場合、採否基準・復元条件・停止条件が事前に記録されている。
  - Alert #5の最終判定（FIXまたはIN_SCOPE / BLOCKED）と残差、append-only監査訂正、validation、CI状態に根拠がある。

## Approach

- 既存Runの失敗候補を事実として参照し、まず再生成差分のroot causeを調べる。
- 公式仕様で全体再解決と分かるoptionは、exit codeや存在だけを理由に実行しない。
- 新しい候補を評価する場合、dependency filesのattempt前hash、selector、package.json不変、target resolution、unrelated churnを順に確認し、不採用なら通常のfile editでattempt前へ戻してhash一致を確認する。
- 採用時はfrozen install、audit、why/list、verifyを実行する。不採用／BLOCKED時はPlanの非変更手順に従いread-only validationを行う。
- 既存Runへの訂正は末尾appendのみとし、その後にSanitizer Write / Check、Markdown lintを実行する。最終Sanitizer後はRun Artifactを変更しない。
- 標準フロー: `PLAN -> 既存Run監査 -> 原因調査 -> bounded repair -> validation -> Artifact finalization -> commit/push -> PR確認`

## Definition of Done

- 指定branchがcanonical remote mainに対して`behind == 0`で開始した。
- 既存REPORT末尾にappend-only訂正を追加し、過去記録を削除・移動・書換えしていない。
- H1〜H3の調査結果、candidateの実行有無と採否、Alert #5の最終判定を新repair Runに記録した。
- remediation採用時は対象`js-yaml@4.3.0`が4.3.1以上へ移り、3.15.1/5.2.2とunrelated resolutionを不要更新していない。未採用時はdependency filesのbaseline hashとdiffが一致する。
- Planに必要なvalidation、Sanitizer Write / Check、Markdown lintを最終Artifact状態で完了し、未実行項目を成功扱いしていない。
- 明示ファイルだけをstageしてcommit/pushし、force pushせず、PR title/bodyを変更していない。
- push後のPR #50 required checksとAlert #5状態を確認し、今回変更起因failureが残っていない。CI未完了の場合はその状態と次アクションを記録する。

## Risks / Unknowns

- `--resolution-only`が全体再解決なら、同じ大規模churnを増やさず実行せずBLOCKEDとする。
- lockfile生成環境の差が確認できても、それだけで新しいmutationの安全性は証明しない。実diffとsemantic resolutionを必須にする。
- High/runtime Alert #5のBLOCKED継続は完了扱いではない。人間のtoolchain／parent判断をfollow-upとして明示する。
- push後CIは外部状態であり、監視可能な範囲まで確認する。未完了・失敗は成功と表現しない。

## Thinking Log

- 2026-08-23 17:36 JST: `scripts/new-run.ps1 -TaskType repair -WorkflowLevel standard -Preset auto-net`でRun `20260823-173606-JST`を作成した。
- 2026-08-23 17:37 JST: 対象branch、upstream、canonical remote main比較を確認し、`behind_by=0`、Node 24.12.0、pnpm 9.10.0、dependency filesの開始時差分0を確認した。
- 2026-08-23 17:37 JST: 既存REPORTの15:25記録が15:41 Final gatesより後ろにあるため、旧REPORT末尾へappend-only訂正を追加した。15:41を最後のArtifact変更後の最終Sanitizerとは扱わず、今回のrepair Runで再度finalizeする。
- 2026-08-23 17:49 JST: H3を検証するCandidate 4（`pnpm update js-yaml --lockfile-only --no-save`、`--depth`なし）を1回評価した。`js-yaml@4.3.1`へ移ったが、Candidate 1と同じ`13214 lines`のunrelated churnを発生させたため不採用。hash復元後、追加variationを停止しAlert #5をBLOCKEDへ戻す。
