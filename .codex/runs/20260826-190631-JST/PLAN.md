# Plan

## Objective

- 指定された canonical Plan `docs/plans/2026-08-26_091000_image-size-vulnerability-remediation-strategy.md` に従い、Issue #56 / PR #67 の `image-size` 2件の調査対応を完了する。
- 現行 baseline の resolved graph、公式GHSA / upstream情報、必要な場合だけ call path と production input reachability を根拠付きで確定し、durable report とPR本文へ反映する。

## Scope

- In:
  - 現在の `origin/main` を含む指定branchの baseline dependency graph と `image-size` parent path の確認。
  - GHSA-5p2g-fcmc-qvqq / GHSA-w3rx-r6r6-pgpr と `image-size` upstreamの公式情報確認、resolved instanceごとの affected / unaffected 判定。
  - affected instanceが残る場合に限る、parent固有の call path、input source、execution phase、reachability、compatibility、workaround、remediation候補の調査。
  - durable report、今回Run Artifact、必要最小限のPR #67本文更新、docs-only commit / push。
- Out:
  - `package.json`、`pnpm-lock.yaml`、dependency version / override、Expo / React Native / Metro、application / build / CI codeの変更。
  - `pnpm audit --fix`、broad update、exploit fixture追加、Alert #6 / #7のdismiss、Issue #56以外の脆弱性対応、独自scanner追加。
  - affected判定前の旧version経路調査、全体unaffected時の不要なreachability / workaround / matrix / Metro深掘り。

## Assumptions

- branch freshness確認後の baseline SHA は `c2e7384dd8f815594e5f724d34a257f3433a3509`、`origin/main` は `eea380784365e31494767f46ae32df97becddf52` で、`origin/main...HEAD` は `0 7`。
- 作業開始時のworking treeはcleanであり、current branchとPR #67のhead branchは `security/image-size-remediation-investigation` で一致している。
- affected / unaffected の正本はIssue作成時のversion/rangeではなく、調査時点の公式GHSA affected rangeとする。
- 外部情報は GitHub Advisory Database、`image-size`公式npm metadata / repository / release、必要な場合のExpo / React Native / Metro公式情報を優先する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、branch、PR、canonical Plan、禁止事項、完了条件が指定済み。
- 仮定してよい細部: reportのファイル名は完了時JST timestamp、Runは今回の会話の新規standard Runを使用する。
- 未回答の重要質問: resolved instance数、現行affected range、parent path、reachability、safe remediation候補は調査で確定する。

## Hypotheses

- H1: baselineの `image-size` resolved instance / parent path は `pnpm why` とlockfileから再現可能に確定できる。
- H2: GHSAの最新affected rangeにより、少なくとも1件がaffectedなら、そのparent固有のexact sourceとRepository inputからreachabilityを分類できる。全件unaffectedならcanonical Planのearly-exitへ進む。

## Research Plan

- Round 1: baseline固定、frozen install、`pnpm why/list`、lockfileから全resolved instanceとparent pathを記録する。
- Round 2: 2件の公式GHSA、`image-size` metadata / upstreamの現状を確認し、instance × GHSAを判定する。
- Round 3: affectedが残る場合だけ、Metro / non-Metroを分離してexact parent sourceとRepository input reachabilityを追跡し、compatible remediation / workaround / decision matrixを作る。
- Round 4: durable report、PR本文、Run Artifactを更新し、canonical Plan指定の最終validation後にcommit / pushする。
- Exit Criteria:
  - 全resolved instanceのversion / parent path / GHSA別判定とupstream根拠が保存されている。
  - affectedがあれば各経路のcall path、input source、execution phase、reachabilityと候補比較が保存されている。全件unaffectedならTask 3〜7をN/Aとする理由が保存されている。
  - dependency / application / build / CI code、Alert stateにsemantic changeがない。
  - sanitizer、Markdown lint、dependency差分、changed-file、status、diff checkを完了し、PR #67へ反映できる。

## Approach

- canonical PlanのTask 1〜9を順番どおり実行し、各完了時に `TASKS.md` と `REPORT.md` を更新する。
- 外部の最新情報が必要なため公式web / package metadataを実行時に確認する。候補検証が必要でも本branchのdependencyやapplicationを変更せず、read-onlyまたは隔離された一時確認に限定する。
- 早期終了条件を判定した後は、Planが禁じる不要な旧call path・reachability・workaround・framework深掘りを行わない。
- PR本文はdurable reportへの参照と結論・validation・非変更scopeを簡潔に記載し、Alert / PR stateは変更しない。

## Definition of Done

- durable report `docs/reports/{yyyy-mm-dd}_{HHMMSS}_image-size-vulnerability-remediation-investigation.md` が作成され、canonical Plan指定の証拠・判定・結論・follow-upを含む。
- Runの `PLAN.md` / `TASKS.md` / `REPORT.md`（必要なら `run.json`）が日本語で完了状態になり、sanitizer CheckがPASSする。
- `pnpm run lint:markdown`、final diff / status / semantic scope確認、`git diff --check`がPASSする。
- docs/reportとRun Artifactだけをcommitし、指定branchへexplicit refspecでpushし、PR #67のhead・本文・stateを確認する。

## Risks / Unknowns

- GHSAのupdated rangeやupstream状況はIssue作成時から変化し得るため、調査時刻・公式参照元・rangeをreportへ明記する。
- 同一versionでもparent pathが複数ある可能性があるため、`pnpm why`だけでなくlockfile / listを突合する。
- dependency存在だけではproduction reachabilityを示さない。source control、execution phase、call site、triggerの証拠が揃うまで結論を出さない。
- candidate調査中のinstallや実験がlockfileを変更し得るため、候補はmetadata / exact source中心に確認し、working treeと禁止ファイルを各段階で監視する。
- Git mutation前後はbranch、status、tracking、PR headを再確認し、mainへの直接commit / pushを避ける。

## Thinking Log

- 2026-08-26 19:06 JST: 初期branch確認でworking tree clean、指定branch一致、`origin/main...HEAD = 0 7`を確認。baselineは現行HEADに固定した。
- 2026-08-26 19:06 JST: 直近Runは別Issue #55の完了履歴であり、今回の会話のactive runとは扱わず、新規Run `20260826-190631-JST` を作成した。
- 2026-08-26 19:06 JST: canonical PlanのTask 2でaffected判定を確定するまで、旧 `image-size@1.2.1` 情報やMetro pathを現在の結論として採用しない。
