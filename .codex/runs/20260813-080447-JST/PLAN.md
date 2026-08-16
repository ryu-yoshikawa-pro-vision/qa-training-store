# PR #23 Official Black-box Scored E2E Review Repair Plan

## Goal

- CodeRabbit 23件と追加レビューの有効な指摘を、個別の表面修正ではなく、Artifact identity、Runner identity、Trusted evidence、Source-free、Runtime、Initial State、Output freeze、Deterministic evaluationの一貫したMachine Contractとして修正する。
- Linux CIのdeterministic preparation regressionを解消し、Windowsの再現性を維持する。
- Official Host Capabilityが不足する環境では、Repository deterministic contractだけを検証し、Official execution／scoreを生成しない。

## Current understanding

- 対象worktreeは`feat/implement-official-black-box-scored-e2e`、HEADは`7044423bdb3db6f36edacf460657dfe0bd828171`、開始時Git statusはcleanだった。
- 現行`prepare-challenge.ts`は`.artifacts/agentic-qa/<run_id>/<challenge_id>/`へ書き込み、verification・runner input・evidence refは`<run_id>/`直下を前提にしている。
- `tsx`を含むdisposable dependency installを全OSへ適用したため、Linux CIのpnpm topologyを壊し得る。既存のroot dependency symlink方式と比較し、OS別の最小修正を選ぶ。
- `RunnerProfile`の必須identity項目がoptionalで、Evaluatorがmanifestから再構築できる。Runtime readinessも別URLへ流用されている。
- Host-trusted Fresh Session、Actual Tool Scope、Runtime handoff等は現Hostに存在しない。これらをRepository自己申告で補わない。

## Assumptions

- Official v1は「1 run_id = 1 challenge」とする。同一run_idで異なるchallengeを準備する場合はfail-fastする。
- Canonical layoutは`.artifacts/agentic-qa/<run_id>/{input,trusted,runner,evaluation}/`とし、challenge-specific hidden subrootは作らない。
- `runtime_url`はURLとして、`runtime_url_origin`／`allowed_origins`はbare originとして別々に検証する。Repository-side prepared artifactは、Host receiptが無い限りOfficial served runtimeには昇格しない。
- `execution_kind=official_model_backed`のEvaluatorはOfficial artifact verificationを必須とし、bypassは`contract_fixture`に限定する。

## Non-goals

- Custom Agent Runner、Model API wrapper、Session Manager、MCP Proxy／Gateway、Tool Router、Remote Sandbox、Job Queue、Leaderboardの追加。
- Product UI、Native、Android、Visual Catalog、Curriculum、無関係なCI／dependency upgradeの変更。
- Host Capabilityが不足する状態での偽のReceipt、Official PASS、Official Scoreの生成。
- Docstring coverage警告への大量対応。

## Impacted areas

- `scripts/agentic-qa/**`: contracts、canonical JSON、patch parser、preparation、runtime lifecycle、resource probe、runner input/output、verification、evaluation。
- `scripts/serve-web-dist.ts`: Sec-Fetch-Destをsecurity authorizationと扱わない説明・挙動。
- `tests/contracts/**`、`tests/runtime/agentic-qa-preparation.test.ts`: 正常系artifact chainとmutation matrix、Linux preparation regression。
- `QA_AGENT.md`、`docs/reference/agentic-qa-workflow.md`、`docs/reference/run-artifacts.md`、`training/agentic-qa/skills/scored-v1.md`、必要なPROJECT_CONTEXT/ADR。
- `.codex/runs/20260813-080447-JST/**` と指摘対象の既存Run Artifact。過去REPORTはappend-onlyで扱う。

## Change strategy

1. PR comments、追加要件、現行コード、直近Run、CI preparation failureを突合し、findingsをroot causeへ分類する。
2. Shared contractを先に直す。bare origin、plain object、tool isolation overlap、evidence 1:1、Runner Profile必須項目、resource probe Cartesian completeness、preparation orderをSSOT化する。
3. Canonical run rootを導入し、writer／reader／evidence refs／expected skill source／default pathsを同じrootへ移行する。同一runのchallenge identity guardも追加する。
4. Runtime handoffをHost receiptへbindし、AのreadinessをBのURLへ流用しない。Host receiptが無い場合はunproven／BLOCKEDのままにする。
5. source-free assertionをfreeze前後で実測し、resource discoveryはartifact manifestとHTMLのunion、probeは全resource×全capabilityを要求する。
6. Official artifact fixture builderを用意し、valid chainを先にPASSさせ、各identity・boundary・state・evidence・budget破壊をnegative mutation testで固定する。
7. preparationをcanonical sequenceへ並べ替え、Windows disposable install／Linux/macOS topologyをOS別に検証する。Product codeは触らない。
8. targeted testsから開始し、必要なquality gatesを順に実行する。失敗はPASSへ変換せず、原因別に記録する。

## Repair loop bound

- 最大3 iteration。各iterationでmust_fix／should_fix／defer／rejectを記録する。
- 同一failureが2回、同一工程が3回、または新情報なしで再発した場合は停止して原因を記録する。

## Validation plan

- Targeted: official contracts、served-dist contracts、preparation runtime、spec-agentic-qa contracts。
- Contract CLI: `pnpm exec tsx scripts/agentic-qa/validate-contracts.ts`。
- Required: format、markdown lint、spec validation/build、lint、typecheck、contract tests、preparation、verify、`git diff --check`。
- Runtime/server変更に対するChromium integrationは、worktree固有の準備RuntimeとHost条件を満たせる場合に実行する。代替URLや他worktreeは使わない。
- Run artifactは最後にSanitizer Write/Checkし、`evaluation.json`と`run.json`の関係を事実に合わせる。

## Risks

- pnpmのWindows/Linux topology差異。修正は`process.platform`に限定し、source-free runner rootへdependencyを公開しない。
- Layout移行で既存fixtureのrefが壊れる可能性。旧layoutの互換fallbackは追加せず、全fixtureをcanonical rootへ直す。
- Official valid fixtureがHost証跡を模倣してしまうリスク。fixtureは`contract_fixture`として明示し、Official scoringには昇格しない。
- Host integration不在。Missing/unproven/not_executedは必ずBLOCKED/invalidのまま保持する。

## Open questions

- Hostが発行するRuntime handoff receiptの実装主体は今回のRepository scope外。Repositoryは受け取り・検証するcontractまで実装する。

## Follow-up notes

- CodeRabbitのdocstring coverage警告はRequired CI gateでないため意図的に対象外とする。
- Git操作（index変更を含む）は行わない。

## Thinking Log

- 2026-08-13 08:04 JST: PR #23の未解決CodeRabbit thread 23件をGitHub connectorで取得。ユーザー提示のP0/P1/P2追加要件と重複・拡張関係を確認。
- 2026-08-13 08:05 JST: 現行コードを再読し、layout、Runner Profile fallback、readiness流用、probe incomplete、source_free caller claimを同一chainの根本原因として分類。
