# Official Black-box Scored E2E Review Repair Plan

## Goal

PR #23のCodeRabbit 23件と追加レビューを、Artifact／Runner／Host evidence／Source-free／Runtime／Initial State／Freeze／Evaluationの一貫したMachine Contractとして修正する。

## Current understanding

- Linux CIのpreparation failureは、disposable copy内の`pnpm install --offline --ignore-scripts --config.node-linker=hoisted`によるpnpm/tsx topology変更が主因候補である。
- 旧WriterはChallenge単位の隠しsubroot、readerはRun Root直下を使い、Artifact Layoutが分裂している。
- Runner ProfileがoptionalでEvaluator fallback reconstructionが可能、Runtime readinessが別URLへ流用され、resource probe/source-free/initial-stateの実証が不完全である。
- 現Hostにtrusted Capability Receiptはなく、Official scoreは引き続きBLOCKEDにする必要がある。

## Assumptions / Non-goals

- Official v1は1 run_id = 1 challenge、canonical rootは`.artifacts/agentic-qa/<run_id>/{input,trusted,runner,evaluation}/`。
- Repository deterministic contractはHostなしで実装・検証するが、Host証跡を自己申告で補わない。
- Custom Runner、LLM/API wrapper、Session Manager、MCP Proxy、Remote Sandbox、Product/Native変更は行わない。

## Change strategy

1. Shared schemas／parsers／comparatorsを修正する。
2. Canonical artifact rootとpreparation sequenceをwriter、verifier、docs、testsへ一括反映する。
3. Trusted Runner Profile、Runtime Handoff、Initial State、source-free freeze、resource probeを相互bindする。
4. Official evaluatorをintrinsic fail-closeへし、valid fixtureとmutation matrixを追加する。
5. Targeted → preparation → full quality gatesの順で検証し、失敗をPASSへ繰り上げない。

## Validation

- `pnpm exec vitest run tests/contracts/official-black-box-contracts.test.ts tests/contracts/serve-web-dist.test.ts tests/runtime/agentic-qa-preparation.test.ts --reporter=dot`
- `pnpm run test:agentic-qa:preparation`
- `pnpm exec tsx scripts/agentic-qa/validate-contracts.ts`
- `pnpm run format:check`、`lint:markdown`、`validate:spec`、`build:spec`、`lint`、`typecheck`、`test:contracts`、`verify`
- `git diff --check`、artifact sanitizer Write/Check

## Completion rule

Repository deterministic contractsがPASSし、必要な失敗は事実どおり記録され、Host evidence不足は`Official execution: BLOCKED`、`Official score: NOT EXECUTED`として明示されること。
