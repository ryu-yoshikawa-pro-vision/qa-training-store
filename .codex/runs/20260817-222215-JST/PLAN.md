# Plan

## Objective

`docs/plans/2026-08-16_162000_public-repository-hardening.md` を SSOT とし、`qa-training-store` の Public Repository Hardening を PR-ready まで実装する。Application / Native の挙動、教材内容、既存仕様は変更しない。

## Scope

- In:
  - `SECURITY.md`、PR / Issue Template、README / CONTRIBUTING の最小整合
  - 既存 `.github/workflows/ci.yml` への Dependency Review 統合
  - `verify` / `deploy-preview` / `validate` の event contract 実装
  - `.github/workflows/**` の全 remote Action の full SHA pin
  - Phase 1 の GitHub / Cloudflare / write-capable principal / finding inventory と未確認境界の記録
  - PR-ready の静的・ローカル検証、diff ベースの自己レビュー、Run Artifact の sanitization
- Out:
  - Dependabot Version Updates、Renovate、独自 Bot / Dashboard / scanner
  - GitHub Environment、Merge Queue、CODEOWNERS、CodeQL Advanced、独立 Workflow
  - package version 更新、Application / Native / 教材変更
  - commit / push / merge / PR 作成、main 反映前の GitHub Settings / Ruleset 変更
  - Owner の明示判断なしの collaborator / App / Deploy Key 権限変更

## Assumptions

- Plan 作成後の最新 `main` を基準にし、現行 `HEAD` と `origin/main` が一致する場合はその状態を rebaseline とする。
- GitHub API / Cloudflare の権限で確認できない情報は推測せず、未確認として DoD の未完了項目へ残す。
- 現行 Action の supported release 系列を維持し、SHA pin のためだけに version を上げない。
- 既存 `verify` / `validate` の shell 判定方式を最小変更し、PR 種別判定は GitHub event payload を `env` で渡す。

## Questions / Ambiguity

- 必ず質問する不透明点: Owner の Cloudflare Deployment Credential trust classification、Token 共有継続の明示承認、main 反映後の Phase 4 実施権限。
- 仮定してよい細部: Issue Form の UI 文言、PR Template の見出し順、README / CONTRIBUTING の導線文は SSOT の最小要件と既存文体から決定する。
- 未回答の重要質問: Cloudflare Token の provider 側 permission / resource scope、Preview と Production の実 Token / Pages project 共有、PVR notification の実受信経路、GitHub Security / Actions / CodeQL の現在値。

## Hypotheses

- H1: 既存 CI の aggregate 構造を維持し、Dependency Review の結果と Preview の expected result を明示判定すれば、PR / non-PR の安全な contract を追加できる。
- H2: 全 remote Action を現行 release tag の commit SHA に固定しても、既存の package / application contract に影響しない。
- H3: Cloudflare Secret の eligibility 判定を削除し、same-repo non-Dependabot PR のみで job を起動すれば、normal PR の Secret 欠落は Fail、fork / Dependabot は Secret 不使用で Skip にできる。

## Research Plan

- Round 1 Query: 最新 `main`、Open PR、workflow、Action ref、Ruleset、collaborator、App / Deploy Key / Secret / Security finding の現在状態を取得する。
- Round 2 Query: Action official release / advisory、Dependency Review supported inputs、workflow static contract、local quality gate を確認する。
- Exit Criteria:
  - 全 remote `uses:` と pin 対象 SHA / official source / advisory 確認結果が記録されている。
  - Cloudflare / write-capable principal / Security findings の確認済み・未確認境界が明示されている。
  - Repository file と CI の差分が SSOT の DoD に対応し、local validation と self-review が完了している。

## Approach

1. Run を strict で初期化し、SSOT と既存規約を Run Artifact に固定する。
2. Phase 1 inventory を完了し、確認不能な外部境界を推測せず記録する。
3. Repository files と既存 `ci.yml` を最小差分で実装する。
4. official Action release / advisory 根拠を残し、全 workflow の remote Action を SHA pin する。
5. static contract、format / markdown、`pnpm run verify`、diff、Run Artifact sanitizer を順に実行する。
6. diff ベースの self-review と PR-ready DoD を確認する。
7. main 反映が必要な Phase 4 は実行せず、Settings / Ruleset / PVR / CodeQL / Cloudflare trust の未完了項目を明示する。

## Definition of Done

- SSOT の Repository files / CI / Action pinning / permission / Preview / validate contract が PR-ready 条件を満たす。
- Hardening 差分による未対応 finding がなく、既存 finding は確認可能な範囲で inventory / triage される。
- `pnpm run verify` と `git diff --check` が成功し、Run Artifact が sanitization check を通る。
- main merge 前に変更してはいけない Settings / Ruleset は変更せず、Repository Hardening Complete とは判定しない。

## Risks / Unknowns

- GitHub connector の権限不足により Security alerts、Repository secrets、Deploy keys、Actions defaults、CodeQL 状態が取得不能。UI / Owner の確認が必要。
- Cloudflare provider 側 Token permission / resource scope / project sharing は repository workflow だけでは確定できない。trust boundary を未完了とする。
- Dependency Review の advisory / license 判定により PR CI が block する可能性がある。実測 finding は scope どおり triage する。
- Action SHA の誤固定は workflow 実行を壊すため、official repository の release tag と commit SHA を照合してから変更する。

## Thinking Log

- 2026-08-17: `HEAD` と `origin/main` はともに `fc9e497817e6c3cff8d89ebd7b37244e759e9484`。Plan の旧 baseline はそのまま使わず、最新 main を採用した。
- 2026-08-17: Open PR #27 は存在するが、この branch の rebaseline には差分がない。PR #27 の古い base は current main の状態判定へ流用しない。
- 2026-08-17: direct collaborator は `sella-roum` が Write、repository owner が Admin。trust classification は role / account 情報から推定しない。
- 2026-08-17: Ruleset `main-protection` は active、required context は現時点で `verify` / GitHub Actions integration `15368`。修正版 `validate` が main で成功するまで変更しない。
- 2026-08-17: `actions/setup-java` の既存v4はupstreamでdeprecatedと確認したため、support終了を理由にv5.7.0へ更新した。他のpackage versionは更新していない。
- 2026-08-17: fork / Dependabot PRはCloudflare Secretを使わずPreviewをskippedとし、normal same-repo PRだけPreview successを要求する方針へ変更した。旧Project Contextのfork unsupported記述はhistoryを残して更新した。
- 2026-08-17: 初回verifyでCI contract testの旧期待値2件を検出した。新しいevent contractとfull SHA pinを検証するため、`tests/contracts/ci-workflow.test.ts`だけを最小修正し、全contract 392/392とverify PASSを確認した。
- 2026-08-17: GitHub Settings / Ruleset、main反映、Cloudflare trustは外部依存のため変更せず、未確認境界としてhandoffへ残した。
