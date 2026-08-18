# Plan

## Objective

- PR #31 の pre-merge 残課題として、P-13 に従う open High Dependabot finding の全件 triage と、修正済み CodeRabbit review thread の状態整理を完了する。
- 既存の Public Repository Hardening 実装、Application / Native / 教材、CI構造、GitHub Settingsを変更しない。

## Scope

- In:
  - branch / PR / check / review state の同期確認
  - GitHub Dependabot Alerts APIから取得できる open High のFinding / Advisory ID、対象、露出、fix availability、対応判断の記録
  - CodeRabbitの最新reviewとinline threadのresolved / outdated / actionable状態の確認
  - 修正済みであることを確認した古いCodeRabbit threadのresolve整理
  - Run Artifactへのtriage evidence、未確認境界、最終評価の記録
- Out:
  - dependencyの一括更新、Dependabot Version Updates、Dependabot Security Updatesの有効化
  - `.github/dependabot.yml`、Renovate、独自Security基盤の追加
  - Application / Native / 教材 / workflow / GitHub Settings / Rulesetの変更
  - Cloudflare token、collaborator、GitHub App、Deploy Keyの権限変更
  - mainへのpush / merge、force push、rebase

## Assumptions

- `5f6c906b211aec419db3cd17352e27b97a8151a1`を実装基準とし、remoteが進んでいればそのHEADを優先する。
- GitHub CLIが利用できない場合はconnectorでPR / Alert / review stateを取得し、取得不能項目は未確認として扱う。
- High alertのfixは、実際のfindingの影響・対象・利用状況を確認してから判断し、今回のPRでの変更が必要でないものはfollow-upへ分離する。

## Questions / Ambiguity

- 必ず質問する不透明点: Dependabot Alert APIの権限不足でfinding詳細が取得できない場合のtriage完了判定、CodeRabbit threadのresolve mutation権限不足。
- 仮定してよい細部: 修正済みthreadのresolve理由は、対応commitと検証結果を短く記録する。
- 未回答の重要質問: open Highの実件数・ID・対象依存、CodeRabbit最新reviewの未解決thread数。

## Hypotheses

- H1: 既存PR差分で導入されたopen Highがなければ、High alertは個別triage evidenceをRun Artifactに記録し、不要なdependency更新なしでpre-merge判断を成立できる。
- H2: CodeRabbitの最新threadは、前回3件の修正済みコメントがoutdatedまたは未resolveとして残っている可能性があり、現行HEADへの妥当性確認後にresolveできる。

## Research Plan

- Round 1 Query: PR / branch / check / review / threadの最新状態とDependabot open High一覧を取得する。
- Round 2 Query: 各Highのmetadata、affected dependency、manifest / lockfile exposure、fixed version、既存PR差分との関係を確認し、CodeRabbit threadをcurrent HEADへ照合する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

1. sync / rule / existing Run確認後、strict Runへ判断と証拠を追記する。
2. Dependabot APIをread-onlyで取得し、High alertごとにP-13 triageする。
3. CodeRabbitの最新reviewとGraphQL thread stateを取得し、current HEADに対する妥当性を確認する。
4. ユーザーが明示した範囲で、修正済みthreadだけをresolveする。新規reviewや無関係な返信は作成しない。
5. diff、status、sanitizer、schema/evaluationを確認し、PR-ready pre-merge残課題を報告する。

## Definition of Done

- branchが想定remote HEADと同期し、mainへ変更していない。
- P-13の全open HighがFinding ID / 対象 / actual exposure / fix availability / 対応判断付きでtriage済み、または取得不能理由と具体的なowner actionが記録されている。
- CodeRabbit最新reviewを取得し、修正済み古いthreadがcurrent HEADでresolvedになっている。
- Application / Native / 教材 / workflow / settingsの意図しない差分がない。
- Run Artifactがsanitizerを通り、最終評価と未完了事項が記録されている。

## Risks / Unknowns

- gh CLIが未インストールで、connector権限ではDependabot Alert詳細またはGraphQL thread mutationが取得できない可能性がある。推測でtriage完了にしない。
- High alertのfixがmanifest更新を要求する場合、今回のPR scope外となる可能性がある。影響・follow-up・ownerを記録し、無断更新しない。
- CodeRabbitの最新reviewがまだ生成されていない場合、既存threadのresolveだけを先行せず、取得できたreview stateを記録する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

## Decision Update

- 2026-08-18: `gh` CLIを導入・認証後、Dependabot APIからopen Highを7件取得した。全件のalert作成日はPR作成日より前で、Hardening差分起因ではない。P-13のtriageは、依存経路・実行時到達性・fix availability・今回PRでの対応判断を記録し、依存関係の無断更新は行わない。
- 2026-08-18: CodeRabbit最新reviewは `CHANGES_REQUESTED` の1件。3件のinline threadはすべてcurrent HEADで修正済みかつoutdatedだったため、指定された3 threadだけをresolveした。新しいレビュー指摘への返信・再レビュー依頼は行わない。

## Continuation / Decision Update

- 2026-08-18: 最新のRepository Dependabot Alert APIを再取得した結果、open Highは7件で変化なし。`nanoid` は `Current 3.3.16`、vulnerable range `< 3.3.18`、Dependabot first patched `3.3.18`、effective remediation target `>= 3.3.18` と記録する。v3.3.17はadvisory referenceに留め、patched versionとは扱わない。
- 2026-08-18: #2/#3の `brace-expansion` 1.1.x chainは、#2単体のfirst patched `1.1.17`ではなく、後発#3を含むeffective target `>= 1.1.18`を採用する。#7/#6の`image-size`はpatched version未提供としてupstream / dependency-chain follow-upと記録する。
- 2026-08-18: 証跡更新の変更対象は `docs/history/2026-08-17_224000_public-repository-hardening.md` と既存Run Artifactだけ。package / lockfile / workflow / application / native / 教材 / settingsは変更しない。
- 2026-08-18: 最新CodeRabbit full reviewのうち、現Run / historyに対する評価整合性の指摘は最小修正する。過去Run `20260818-080338-JST` の書き換え要求は、Working Agreementと今回指示の過去Run immutable方針に反するため採用せず、現Runへ境界と理由を記録する。full reviewは今回1回のみとし、再実行しない。

## Final Evidence Update

- 2026-08-18: 修正後HEAD `03a8d3f9f7edd27ec520d2852cb6eefcaf4673cb` の Phase 1 CI run `32104879897` は Dependency Review、verify、deploy-preview、validate が成功し、PRのため deploy-production は skipped だった。
- 2026-08-18: 同HEADの Native CI run `32104880047` は Native Static、Expo Doctor、Android / iOS build、Android Runtime / Maestro、native-ci / verify を含む全ジョブが成功した。
- 2026-08-18: CodeRabbitの最新full reviewは1回実行済み。3件の追加threadは2件を修正し、過去Runの1件はimmutable boundaryを返信したうえでscope外としてresolveした。最新thread取得時点のunresolvedは0件である。
- 2026-08-18: `gh pr view` では `reviewDecision=CHANGES_REQUESTED`、`mergeStateStatus=BLOCKED` が残る。inline thread解決とは別の旧CodeRabbit submission状態であり、Codexはdismissせず、Owner判断待ちとする。
- 2026-08-18: P-13 triage、証跡保存、CI確認は完了したが、旧review submissionが実際のmerge blockerであるため `PR #31 merge-ready = NO`、`Repository Hardening Complete = NO` と判定する。

## User Policy Update

- 2026-08-18: ユーザーの訂正に基づき、CodeRabbitなど外部レビューサービスは明示的な指示または承認があれば再レビューできるが、レビュー完了後は結果報告で停止し、指摘の修正・thread操作・再レビューをユーザー判断なしに続けないルールを `AGENTS.md`、`CODE_REVIEW.md`、`docs/reference/repair-loop.md` に追記する。既存review結果・thread状態のread-only確認は許可する。
