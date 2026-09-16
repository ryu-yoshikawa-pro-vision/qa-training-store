# Plan

## Objective

- PR #147 merge後の最新 `origin/main`（`2afae5cb6562aa94b46ecc4f31a245d85ae48eda`）を、PR #146 branchの既存merge途中状態へ通常mergeとして確定する。
- PR #146のHook trust参照・文章品質gate契約と、PR #147のHarness移管・file-changing task・Run lifecycle・Progress・PR/CI契約を共存させる。
- merge marker、既存契約の欠落、compact再注入・production ruleへの不要な拡張がないことを確認し、commit、push、PR #146の最新CI確認まで完了する。

## Scope

- In:
  - 既に開始されている `git merge origin/main`（`MERGE_HEAD=2afae5cb...`）の競合解消。
  - `docs/reference/codex-implementation-harness.md` の内容統合。
  - merge結果に含まれるPR #147由来の既存変更を保持したまま、`scripts/verify`、`scripts/verify.ps1`、関連contractを照合。
  - focused Hook contract、Bash / PowerShell Harness、標準検証、Run Artifact sanitization、commit / push、PR #146と最新必須CIの確認。
- Out:
  - `git rebase`、force push、reset、ours/theirs一括採用。
  - compact後のroot `AGENTS.md`再注入、Issue #135のstate変更、新しいproduction文章品質rule、Windows実Codex runtime canary。
  - 新しいHook framework、session manager、diff framework、別Issueの修正、競合していないsourceの便乗変更。

## Assumptions

- 作業treeの既存staged変更は、ユーザー指示どおり既に開始されたPR #147 mergeの結果として扱い、勝手に退避・破棄しない。
- `origin/main`のmerge先は現在の `MERGE_HEAD` と一致しており、mergeを二重開始しない。
- PR #146はOPENのまま維持し、既存PRを更新する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。現在のmerge state、PR、Issue、source、contractから判断可能。
- 仮定してよい細部: 競合していないPR #147由来のindex内容は変更せず、そのままmerge結果へ含める。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 競合は `docs/reference/codex-implementation-harness.md` の同一位置へPR #146とPR #147が別の節を追加したことによるもので、両節を順序立てて残せば解消できる。
- H2: `scripts/verify` と `scripts/verify.ps1` は既に自動mergeされたindex上で、PR #147のtemplate assertionとPR #146のHook opt-inを両立している。
- H3: merge後のfocused検証は通過するが、標準verifyの失敗が出た場合は最初のfailureを今回のmerge差分・baseline・環境に照合してboundedに診断する。

## Research Plan

- Round 1 Query: merge state、stage 2/3、PR #146/#147、Issue #135、Plan、contract、verify scriptの差分を確認する。
- Round 2 Query: 解消後の文書・verify option・required file・旧regex assertion・marker・production rule・#135境界と、focused／standard／CI結果を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- `MERGE_HEAD`を確認した既存mergeを継続し、stage 3（最新main）の文書を土台に、stage 2のHook trust参照と文章品質gate節を追加する。
- `scripts/verify` / `scripts/verify.ps1`は編集せず、両側の契約が残っていることを確認する。必要最小限の修正が必要な場合のみ、merge結果に対して明示する。
- marker、scope、production rule、#135 stateを確認し、focused → Harness → standardの順に検証する。
- Run Artifactへcheckpointを追記し、sanitizer、branch safety確認後に通常のmerge commitを作成・pushする。push後は最新headのPR、Web CI、Mobile App CI、Windows Hook contractを確認し、PR本文へ結果を追記する。

## Definition of Done

- `origin/main`をrebaseせず通常mergeし、競合が0件でmerge commitを作成する。
- implementation harnessにPR #147の最新契約、PR #146のHook trust参照、文章品質gate検証が共存する。
- verifyのPR #147 assertionと`--hook-contracts` / `-HookContracts`、required file、Hook contract test実行が共存し、旧Hook config regex assertionを復活させない。
- compact再注入、production rule、Issue #135を変更しない。
- focused Hook contract、Bash / PowerShell Harness、必要な標準検証、`git diff --check`、sanitizerが確認済みである。
- merge commitを明示refspecでpushし、local / remote / PR headが一致する。PR #146はOPEN・base main・mergeableである。
- 最新headのWeb CI、Mobile App CI、Windows Hook contractがsuccessである。CI結果とmerge内容をPR本文へ記録する。

## Risks / Unknowns

- merge結果の自動統合で、片側のcontractが欠落するリスクがあるため、文書・script・contractを`rg`とfocused testで照合する。
- 標準verifyは既存のparallel test timeout等の環境要因があり得る。最初のfailureを記録し、無目的な再試行やsource変更を行わない。
- GitHub CIはpush後に新headで再実行されるため、旧headの成功を流用しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-09-14: `git status`で既にmerge途中、`MERGE_HEAD=2afae5cb...`、unmergedはimplementation harnessの1ファイルだけと確認した。二重mergeせず、既存indexを維持する。
- 2026-09-14: 競合解消はstage 3のPR #147文書を土台にし、stage 2のHook trust参照と文章品質gateを追加する方針とした。ours/theirs一括採用は行わない。
