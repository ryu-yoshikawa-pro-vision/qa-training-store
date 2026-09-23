# ADR-0027: Repository Portのcanonical ownership

- Status: Accepted
- Date: 2026-09-23
- Issue: #132
- Plan: `docs/plans/2026-09-23_103200_issue-132-domain-application-type-dependency.md`
- Supersedes: `docs/adr/0003-platform-route-composition-root.md#Decision` Decision 3のうち、「Application層はDomain Repository Portだけに依存する」というRepository Port ownership要件のみ。Platform Composition Root、Dexie / SQLite Adapter分離、その他のDecisionは維持する。

## Context

Current architecture authorityは`NFR-MA-001`、`docs/CODING_STANDARDS.md §7.1`、`docs/02_architecture/repository_structure.md §4`でDomainからApplicationへの依存を禁止している。この禁止はruntime importとtype-only importの両方に適用する。

D-026はTypeScript type / interfaceを実装code上のSSOTとし、Markdownを意味・責務・理由の説明に位置付ける。Current code上のtype参照や`docs/04_data/repository_interfaces.md`のmethod contract記述は、禁止された依存方向を許可するarchitecture authorityではない。

Current `src/domain/repositories/contracts.ts`はApplication DTO / query / commandを参照し、Domain policyはApplication `ProductViewer`を参照している。Application contractのownershipとADR-0003 Decision 3のDomain Repository Port ownershipを両立するRepository Port ownership ruleが必要である。

Application DTO / query / commandおよび`ProductViewer`のcanonical ownerはApplicationである。Current repository signatureやimport locationはPort ownershipを確定する根拠にせず、責務とconsumerを確認する。

## Decision

1. DomainからApplicationへの依存はruntime / type-onlyを問わず禁止する。Application DTO / query / commandをDomainへ移して依存を解消しない。
2. Application DTO / query / commandおよび`ProductViewer`はApplication ownershipを維持する。Domain policyはApplication `ProductViewer`に依存せず、必要なDomain-owned input（現在は`MembershipRank | null`相当）だけを受け取る。
3. Repository Portのcanonical ownerはPortごとの責務とconsumerから決める。Application / Infrastructureだけから利用され、Application contractを境界として使うPortはApplication ownershipを第一候補とする。Domain behavior contractとして残す具体的理由があるPortだけDomain ownershipを維持する。
4. 24 Repository interfaceを一律に移動しない。別のfollow-up implementation Planで、全interfaceの責務、Application / Domain consumer、transaction boundary、入出力contractを確認し、個別に維持 / 移動 / 削除を決める。Application typeをsignatureに使う17 interfaceは少なくとも整理対象とし、未使用の可能性がある3 interfaceは移動前に削除可否を確認する。Application typeを使わない7 interfaceもDomain ownershipを自動確定しない。
5. §4.16のfollow-up classificationは`refactor_now`とする。Product source / testの変更、Port移動、`ProductViewer`依存除去、architecture contractの実装はこのdecision-only作業に含めず、別Plan / 実装PRで行う。

## Follow-up architecture contract specification

Domain → Application禁止のstatic contractは、source remediationと同じfollow-up implementation PRで既存の`tests/contracts/architecture.test.ts`へ追加する。

- `src/domain/**`から`src/application/**`へ到達するimport / re-export / literal `require()`を全面禁止する。
- `import ... from`, `import type ... from`, side-effect import、TypeScript `import("...").Type` type query、runtime dynamic `import("...")`、各種`export ... from` / `export type ... from` / `export type * from` / `export type * as <name> from` / `export * from`、literal `require("...")`を検査する。
- `@/application/**`、`baseUrl: "."`で解決できる`src/application/**`、Domain source fileから解決したrelative pathが`src/application/**`へ到達するspecifierを検査する。
- Application module allowlist、Repository contract例外、computed `require(variable)`対応、完全なTypeScript module resolver、generic scanner、AST dependencyは導入しない。
- 検査はsource textとsource pathを受け取る小さいhelperに閉じ、同architecture contract内のsynthetic sourceによるtable-driven self-testで禁止構文 / path familyとDomain内許可例を検証する。fixture directoryと新しいtest frameworkは作らない。
- Current sourceが違反している間はcontractを先行追加しない。

## Consequences

- ADR-0003本文は変更せず、Decision 3のRepository Port ownership要件だけをこのADRで限定的に置き換える。
- `NFR-MA-010`は変更せず、Phase 1 Core Use CaseとRepositoryがApplication contractのDTO / Input / Result / Errorに従うGateを維持する。
- `docs/04_data/repository_interfaces.md`はRepository methodの意味・責務・transaction boundaryを説明し、module ownershipは本Decisionに従う。
- Follow-upでは`@/domain/repositories`のconsumer inventoryを再取得し、signature / export pathが変わるconsumerだけを更新する。interface分割やcompatibility re-exportは具体的必要がある場合に限る。既存`src/application/ports.ts`の再利用を先に検討する。
- `ProductViewer`はApplicationに残す。Follow-upでCurrent Infrastructure callerがviewerからrankまたは`null`を導出し、Domain policyへ渡す。
- Issue #132完了後、latest `main`へrebaselineした別Planで対象file、順序、focused validationを確定する。別Plan / 実装PRが完了するまでCurrent sourceの違反とarchitecture contract gapは残る。
