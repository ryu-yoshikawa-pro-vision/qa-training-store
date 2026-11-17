# Plan（計画）

## Objective（目的）

- PR #223の3つのPRファイル取得経路を不正なAPI要素に対してfail-closedにし、実workflowのページネーション回帰テストを追加する。

## Scope（対象範囲）

- In: .github/workflows/security-dependency-fallback.yml、tests/contracts/security-dependency-fallback-workflow.test.ts、PR #223用Plan/Run Artifact。
- Out: PR #223以外、main、permission/sandbox/approval/wrapper動作、secret、dependency、merge/close、workflow_dispatch。

## Assumptions（仮定）

- 作業branchはPR #223のhead。作業開始時のPR/ローカル/origin headは一致し、mainはmerge済み。
- 配列要素不正と101要素以上のページは、それぞれの既存固定診断で拒否する。
- ユーザーから2026-11-17に3経路の要素検証、1ページ100件上限、fixture回帰テストのL2承認を受領した。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。明示L2承認を受領済み。
- 仮定してよい細部: 既存の3診断コードを維持し、単一ページ上限診断には該当する既存invalid codeを使う。
- 未回答の重要質問: 提案したworkflow変更をL2承認するか。

## Hypotheses（仮説）

- H1: [ {} ]は現行workflowでfilename未定義のまま競合対象外となり、後続処理が成功扱いになる。
- H2: 配列要素とページ長の検証を実コードへ追加すれば、不正応答を拒否しつつ正常なページ分割と3,000件上限を維持できる。

## Research Plan（調査計画）

- Round 1: PR状態、base/head、branch、remote、working tree、PR本文・差分・レビュー履歴を確認する。
- Round 2: 3箇所のNode heredoc、既存test helper、Run/Plan契約とL2承認のEvidenceを確認する。
- Exit Criteria:
  - 各経路の診断と実行境界を特定する。
  - L2承認の有無をEvidenceとともに判断し、未解決ならworkflow編集を停止する。

## Approach（進め方）

- 変更前にPlanを保存し、承認後に実workflowから抽出したNode heredocをHTTP fixtureで実行するcontract testを追加する。
- read-alert、opencode-edit、publishの各経路で要素型・filename・ページ長を検証し、既存API/権限/競合/30ページ条件を保持する。
- focused test、contracts全体、Repository標準gate、diff review後に既存PR branchへcommit/pushし、PR本文と最新head CIを確認する。
- workflow_dispatchは実行しない。CI waiterが利用不能ならRepository規約に従いpollingへfallbackしない。

## Definition of Done（完了条件）

- ユーザー承認、全3経路のfail-closed検証、境界・失敗fixtureのcontract test、標準gate成功。
- 最新headのWeb CIとMobile App CI success、PR本文の更新、PR #223はOpen/未merge。
- scope外変更なし。Plan/Run Artifactをcommit前に確定。

## Risks / Unknowns（リスク・未知点）

- L2 workflow承認が未確認。
- 現在のtool setにwait_for_required_ciがなく、最新CIの完了確認が阻まれる可能性がある。
- .codexのread-only制限には承認済みescalationを使ってRunを作成した。L3動作の変更は行わない。

## Thinking Log（判断記録）

- 2026-11-17 JST: PR #223はOpen・未merge。local/origin branch headは70508b5e075f17f77c8162bcfd5ca1887867479eで一致。origin/main 17de02cd1adfa3b167965d95a61265b4421393fdをmerge済み。
- 2026-11-17 JST: PR diffはworkflow 1ファイル。review submission/threadはなく、PR bodyに今回の要素検証を認める承認記録はない。既存Plan/Runも検索したがPR #223のL2承認を確認できなかった。
- 2026-11-17 JST: workflow編集の前に、要素検証と101件ページ拒否の変更案を示してL2承認を待つ。現時点では製品/テストソースを変更していない。
