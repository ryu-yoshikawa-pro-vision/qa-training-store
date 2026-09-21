# Plan（計画）

## Objective（目的）

- Issue #163 / PR #167のPlanに従い、Renovate Security Updateと人手起動OpenCode fallbackのRepository実装を完了する。
- OpenCodeへGit操作、任意shell、private Alert情報、GitHub / OIDC credentialを渡さず、検証失敗・再実行・曖昧な依存関係はfail-closedで`needs_human`へ停止する。

## Scope（対象範囲）

- In:
  - PR #167既存branch上のpackage manager更新、Cloudflare Preview分類、Owner確定値`3`を反映したRenovate設定、Security validator、OpenCode設定、6 job fallback workflow、Security公開境界、contract test。
  - `pnpm@10.34.5`へのRepository全体のactive toolchain同期と、更新単体での標準検証。
  - 関連Run Artifactの日本語記録・sanitization・検証。
  - PR #167への意味のあるcommit、対象branchへの通常push、実装状況に合わせたPR本文更新。
- Out:
  - Owner確定値と異なる`vulnerabilityAlerts.prConcurrentLimit`の推測実装。確定値`3`は対象に含む。
  - App installation、Secret登録、GitHub Settings変更、merge、Issue close、activation。
  - auto-merge、schedule、自動retry、branch recovery、queue / lock service、既存CI gate緩和、別branch / 別PR。

## Assumptions（仮定）

- GitHub APIで確認したPR #167 headは最新`origin/main`を祖先に含み、PR #166 merge後の変更を含むため、Repository実装へ進める。
- `vulnerabilityAlerts.prConcurrentLimit`はOwner判断で`3`に確定し、設定と対応contract testへ反映する。`3`はAlert総数から算出した値ではなく、初期運用のSecurity PR同時上限である。
- 過去Run、報告、Planの履歴事実は書き換えず、現行状態の誤記だけを最小修正する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。ユーザー指示とPlanにより実装境界が確定している。
- 仮定してよい細部: 既存workflow / contractの構造、固定OpenCode release値、Plan記載のArtifact契約を正本として再利用する。
- 未回答の重要質問: App / OIDCのlive trust、Zen疎通。これらはRepository実装の未確定範囲外として保留する。

## Research Plan（調査計画）

- Round 1: Issue #163、PR #167 / #166、Plan、AGENTS、active workflow、package / lockfile、Security script、既存contractを照合する。
- Round 2: `pnpm@10.34.5`更新直後の標準検証と、Planの6 job / permission / credential / Artifact境界を実装前後で照合する。
- Exit Criteria:
  - PR #167 branchが最新mainとPR #166 merge後の変更を含む根拠がある。
  - package manager更新単体の検証が成立してからSecurity fallback実装へ進む。
  - Planの必須contractに対応する実装・回帰test・検証結果がある。
  - 未確定事項は仮値で埋めず、最終報告とRun Artifactへ記録する。

## Approach（進め方）

1. Runを初期化し、調査結果と実行タスクを記録する。
2. PR #167 / latest main / PR #166を再確認し、package / lockfile / CI contractの前提を確定する。
3. `pnpm@10.34.5`をroot package、active workflow、local validator、関連contract / current docsへ揃え、lockfileを固定versionで生成する。
4. 更新単体で`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`等の標準検証を実行する。失敗時は原因を分類し、実装側だけを修正して再検証する。
5. Renovate値未確定部分を除き、CI分類、Security validator、OpenCode permission、6 job workflow、Security公開境界、contract testをPlan順に実装する。
6. 関連contract、validator、標準検証を実行し、Run Artifactをsanitization / collector経由で確定する。

## Definition of Done（完了条件）

- PlanのRepository変更DoDのうち、Owner判断・merge後activation・live疎通を除く項目を実装し、関連contract testが成立する。
- `vulnerabilityAlerts.prConcurrentLimit: 3`と専用config / contract testを実装し、仮値を追加しない。
- `preflight`、`read-alert`、`opencode-edit`、`validate-exec`、`finalize`、`publish`のjob、credential、Artifact、re-run、OIDC境界が静的contractで固定される。
- `pnpm run test:contracts`、`pnpm run verify`、`git diff --check`を実行し、失敗は未解消事項として残さない（環境依存の既存問題は根拠付きで分類する）。
- 変更はPR #167 branch内に限定し、commit / push / PR本文更新まで実施する。mergeと外部activationは行わない。

## Risks / Unknowns（リスク・未知点）

- pnpm 10への更新でlockfileまたは既存CI / Native契約が変わる可能性がある。更新単体の検証を先に行い、Security実装と混ぜない。
- Security workflowは実runtimeをdefault branch反映前に実行しない。静的contractで不足を補完せず、live activation条件はOwner判断へ残す。
- Windows環境の長時間contract / verify timeoutが発生しても、test timeoutやSecurity条件を緩和しない。

## Thinking Log（判断記録）

- 2026-09-20 JST: PR #167 head `6b9c7e1`は`origin/main` `1213adc`を祖先に持ち、`552c75f`のmain取り込みでPR #166 merge後の`c0dbf81`を含むことを確認した。Plan冒頭の「未取り込み」は履歴と不一致のため、実装開始条件は満たされたと判断した。
- 2026-09-20 JST: `prConcurrentLimit`はOwner確認値がPlanにないため、設定と値依存contract testだけを保留し、他の実装は進める。

## Review repair continuation（PR #167）

- 対象: Issue #163 / PR #167の実装レビューで残ったbaseline edge証明、publish境界、strict Run Artifact、別Repository由来checkpointの訂正。
- 実装制約: `renovate.json`と`tests/contracts/renovate-config.test.ts`はOwner確定値`3`だけを反映する。Stop Hook / Host設定、外部App / Secret / Settings、merge、live workflow dispatchは変更しない。
- 証明契約: exact parent selectorについてbaseline `packages` / `snapshots`の全instanceと4 dependency fieldのtarget edgeを`baseline_selector_edges`へ固定し、safe / hidden / unknown / unparseable edgeまたはinstalled graphとの矛盾を`needs_human`へ停止する。
- publish契約: installation token取得後の実push直前と、push後・PR作成直前に`BASE_SHA`と最新mainを比較する。stale時はremote branchを削除・rebase・force push・retry・OpenCode再実行せずPRを作成しない。
- Run契約: `evaluation.json`はschemaへ適合させ、既存sanitizer / collectorを通す。`run.json`は直接編集せず、interactive Runのmachine-managed status / validationを正規経路で完了できない場合は未確定として報告する。
- 2026-09-20 JST: 11:57のStop Hook調査は別Repository / 別session由来であり、Issue #163 / PR #167の品質根拠には使用しない。今回の実装へStop Hook / Host設定変更を含めない。
- 2026-09-21 JST: Ownerが`vulnerabilityAlerts.prConcurrentLimit: 3`を、Alert総数ではなく初期運用のSecurity PR同時上限として確定した。`renovate.json`、Renovate contract、Planを更新し、公式validatorとRepository標準検証を実行する。
