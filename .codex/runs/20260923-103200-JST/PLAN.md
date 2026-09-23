# Plan（計画）

## 目的

- Issue #132のPlanレビューで見つかったarchitecture authorityの見落としを修正する。
- Current Repositoryの明示方針に基づき、Domain → Application type-only dependencyの扱いとcanonical ownershipを確定できるPlanへ更新する。
- 今回はPlan-onlyとし、Product source、test、ADR、Issue metadataは変更しない。

## 追加確認

- `docs/CODING_STANDARDS.md §7.1`
- `docs/02_architecture/repository_structure.md §4`
- `docs/01_requirements/non_functional_requirements.md`の`NFR-MA-001`
- ADR-0003
- `src/application/ports.ts`
- `src/domain/repositories/contracts.ts`のinterface単位のApplication type利用
- `src/domain/policies/permissions.ts`で`ProductViewer`から実際に使うfield
- `@/domain/repositories`のCurrent consumer

## 修正後の判断

- Current architectureはDomain → Applicationをtype-onlyを含め禁止している。
- Current codeと一部Repository contract説明がarchitecture ruleへ整合していない。
- Application DTO / query / commandと`ProductViewer`はApplication ownershipを維持する。
- Repository Port ownershipはADR-0003との整合が必要なため、案A / Bをarchitecture ownerへ提示するDecision Pointとして残す。
- Plan上の推奨は、Repository Portのownerを責務とconsumerで決める案A。17 interfaceはCurrent違反を直接持つ最低限の整理対象とし、維持 / 移動 / 削除を確認する。残る7 interfaceもDomain ownershipと自動確定しない。
- `canViewerSeeProduct()`はApplication `ProductViewer`へ依存せず、必要最小限のDomain-owned valueを受け取る。
- 案A / BでCurrent policyを維持する場合、§4.16は`refactor_now`とし、実装は別Plan / PRへ切り出す。

## 再レビュー反映

- `NFR-MA-010`をRepository ownership Decisionの制約へ追加した。
- 17 / 7分類はownershipの結論ではなくCurrent違反のEvidenceとして扱う。
- 案BはCurrent `NFR-MA-010`と両立しないため、案B選択時に同Gateの文言更新が必須になることを明記した。
- Domain → Application例外はCurrent policy変更になるため、Repository Port ownershipのDecision候補から外した。
- `ProductViewer`からDomain policy inputへの変換主体をCurrent callerであるInfrastructure adapterへ修正した。
- static contractは通常import、`import type`、TypeScript import type query、runtime dynamic import、relative pathを具体的に検査する。
- decision-only検証へ`pnpm run lint:text`を追加し、follow-up実装はfocused test後に`pnpm run verify`を標準gateとして実行する。

## 最終レビュー反映

- `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`はCurrent sourceで定義以外のconsumer / implementationが確認できないため、17 interfaceを一律に移動せず、維持 / 移動 / 削除を確認する方針へ修正した。
- import系に加えて`export ... from`、`export type ... from`、`export * from`をstatic architecture contractとCurrent violation再確認の両方へ追加した。
- static architecture contractはDomain → Applicationのimport / re-exportを例外なく禁止する。

## 最終整合修正

- Domain → Application禁止はCurrent policyとして既に確定しているため、type-only例外案をarchitecture ownerのDecision候補から外した。
- Repository Port ownershipのDecision Pointは案A / Bの2案に限定した。
- §4.16は案A / Bのどちらでも`refactor_now`へ再分類する。
- Task 3のCurrent violation再確認をTask 6と同じdependency surfaceへ揃え、side-effect import、re-export、alias / relative pathを含めた。

## 実装分岐・完了証跡の修正

- `tsconfig.json`の`baseUrl: "."`を考慮し、`@/application/**`とrelative pathだけでなく`src/application/**`のbare specifierをCurrent violation再確認とstatic contractの対象へ追加した。
- Current Repositoryでliteral `require()`が使用されるため、literal `require("...")`もDomain → Application禁止contractへ追加した。computed specifier解析までは広げない。
- follow-up Refactorのscopeを共通 / 案A / 案Bへ分けて記録する。18 direct consumerはimpact inventoryとして扱い、全18件を固定更新しない。実際のimplementation Plan作成はIssue #132完了後へ分離する。
- 案BではDomain-owned repository input / output、Application boundary mapping、`NFR-MA-010`の必須更新を明示した。
- §4.16の最終`refactor_now`はPhase 6 durable reportへfollow-up resolutionとして追記し、元の`needs_more_evidence`は履歴として保持する。
- Planは1つのarchitecture Decisionとfollow-up分岐を扱うため、ファイル分割は行わない。

## 最終実行順・検証修正

- Repository Port ownershipのDecisionは案A / Bの1件だけとし、ADR-0003 Decision 3の扱いは選択結果から固定した。
  - 案A: new ADRでDecision 3のRepository Port ownership部分を明示的にsupersedeする。
  - 案B: Decision 3を維持する。
- follow-up Refactorのscope / next action記録を§4.16 durable report更新より先へ置き、実際のimplementation Plan作成はIssue #132完了後の別作業へ分離した。
- static contractはCurrent source検査だけでなく、`architecture.test.ts`内のsynthetic sourceによるtable-driven scanner self-testを必須にした。
- decision-only検証へ`pnpm run format:check`を追加した。
- PlanはDecision、ADR、follow-up、再分類が一続きのため分割しない。

## NFR / TypeScript構文 / rebaseline最終修正

- 案BはCurrent `NFR-MA-010`と両立しないため、案B選択時は同Gateの文言を新しいRepository ownership ruleへ合わせて更新することを必須化した。更新要否を第二のDecisionにはしない。
- Task 3 / Task 6のre-export対象へTypeScriptの`export type * from`と`export type * as <name> from`を明示し、synthetic source self-testでも両構文を個別に固定する。
- Task 1のlatest `main` rebaseline対象へ`tsconfig.json`の`baseUrl` / `paths`を追加し、material driftがある場合だけspecifier判定をCurrent設定へ更新する。
- 汎用module resolver、AST dependency、新しいscanner基盤は追加しない。

## NFR更新方式の最終確定

- Repositoryの既存運用に合わせ、NFR自体を`supersede`する表現をやめた。
- 案Bでは`docs/01_requirements/non_functional_requirements.md`の`NFR-MA-010`文言をCurrent Repository ownership ruleへ必ず更新する。
- new ADRには、案Bに伴う`NFR-MA-010`更新をDecision consequenceとして記録する。
- 過去の判断経緯は`REPORT.md`へ保持し、Current `PLAN.md`内では旧「可能性」「判断」表現を残さない。

## Issue #132 scope / Run Artifact contract最終修正

- Task 7はfollow-up implementation Plan作成ではなく、別Planへ切り出すためのscope / next action記録へ縮小した。
- §4.16 durable reportはnew ADRとfollow-up scope / next actionを参照し、未作成のimplementation Planを必須参照にしない。
- Issue #132の完了条件は「別Plan / 実装PRへ切り出せる状態」に戻した。
- Current Runの`TASKS.md`は`## Now（現在）` / `## Discovered（発見事項）` / `## Blocked（ブロック中）`形式へ揃える。
- decision-only検証へRun Artifact sanitizerの`Write` / `Check`を追加し、residual findings 0を完了条件にする。

## Current execution status（2026-09-23 21:09 JST）

- PR #178のheadは`a1977fae9515a104a293558757fa75599d5245ed`、latest `origin/main`は`2f5353b63414ace7278155d525e0e2cf074d630b`。PR headにはlatest `main`を取り込んだmerge commitが含まれる。
- Task 1 rebaselineでは、branch作成時の`01cd8ab15078d479e821d373445af1e16a469519`からlatest `main`までPlan指定pathにmaterial driftは確認されなかった。
- Task 2でCurrent policyを再確認した。`NFR-MA-001`、Coding Standards §7.1、Repository Structure §4はDomainからApplicationへの依存を禁止する。ADR-0003 Decision 3、D-026、NFR-MA-010、Current TypeScript、architecture contractとの関係をTask 2 / 3のEvidenceに記録した。
- Task 3でDomain → Applicationのtype-only edge、Repository contract 24件のownership surface（Application type使用17件 / 未使用7件）、18 direct consumer、`ProductViewer`、policy caller、関連testを再確認した。
- Task 4の案A / Bを選択したarchitecture owner DecisionはIssue / PRおよび確認したdecision記録に存在しないため、後続Taskを保留してownerの判断を待つ。Domain → Application禁止の再Decisionは求めない。
- このcheckpointではProduct source / test、ADR、Normative documentation、Phase 6 reportを変更していない。Task 5〜8とPlan指定の最終検証はDecision後に行う。

## Issue #132 Decision / documentation checkpoint（2026-09-23 21:43 JST）

- GitHub recheck: PR #178はopenでhead `a1977fae9515a104a293558757fa75599d5245ed`、latest `origin/main`は`2f5353b63414ace7278155d525e0e2cf074d630b`。対象authority / dependency surfaceにmaterial driftはない。
- Task 4: architecture ownerが案Aを採用。案A / B以外のDecisionは追加していない。
- Task 5: ADR-0027を追加し、ADR-0003 Decision 3のRepository Port ownership要件だけを限定的にsupersedeした。`NFR-MA-010`を維持し、Repository Port ownershipを責務 / consumerから決める説明を`repository_interfaces.md`へ、`ProductViewer`のApplication ownershipを`application_contracts.md`へ同期した。
- Task 6: Domain → Application static contractのspecifier / path coverage、synthetic source table-driven self-test、実装をsource remediationと同じPRへ置く方針をADR-0027へ記録した。
- Task 7: 24 interfaceすべてを責務、consumer、transaction boundary、入出力contractで再評価し、個別に維持 / 移動 / 削除を決めるscopeとnext actionをIssue #132へ記録した。Issue comment IDは`5794888964`。implementation Planは作成していない。
- Task 8: Phase 6 §4.16へIssue #132 follow-up resolutionとして`refactor_now`を追記。元の`needs_more_evidence`を履歴として保持した。
- Product source / test、Repository interface、architecture contract実装、dependency、Product behavior、schema、Native / Web featureは変更していない。
- Preliminary validation: `lint:markdown` / `lint:text` / `git diff --check`は成功。全体`format:check`は78個の既存未変更ファイルを報告して失敗した。変更したADR / 設計文書は個別Prettier確認で差分なし。pnpmはsession-localにCorepack `10.34.5`経由で起動した。Run Artifact最終同期後に指定validationを再実行し、sanitizer Write / Checkを行う。
- Remaining: Plan指定validation / sanitizerの最終確認、Plan completion criteria照合、commit / normal push、最新PR headと必須CI確認。

## Decision-only validation / completion criteria checkpoint（2026-09-23 21:53 JST）

- Plan §6 commandsを実行した。`pnpm run lint:markdown`（451 files / 0 issues）、`pnpm run lint:text`（7 changed Markdown files）、`git diff --check`、Run Artifact sanitizer `Write` / `Check`は成功し、いずれもsanitizer residual findingsは0。
- `pnpm run format:check`は78個の未変更ファイルを報告して失敗した。今回変更したADR / 設計文書4件に対するdiagnostic Prettier checkでは差分0。`TASKS.md` Blockedへ記録し、Product source / testの変更禁止に従って既存app fileをformatしない。
- Plan §8 completion criteriaを順に照合した。Current main / dependency evidence、Domain → Application禁止、NFR-MA-001 / Coding Standards / Repository Structure / ADR-0003 / D-026関係、repository_interfaces.mdが許可authorityでないこと、Application contract / `ProductViewer` ownership、Domain policy input方針、Port ownership rule、static contract仕様、Issue / ADR Decision記録、§4.16 resolutionと履歴保持、必要文書同期、follow-up scope / next action、Product behavior / schema / Native / Web無変更、generic graph / AST / dependencyなしを確認済み。
- Decision-only文書は完了。Task 50として明示scopeのcommit / pushと、最新PR headでの必須CI確認が残る。merge / Issue close / follow-up Refactorは行わない。

## Commit gate result（2026-09-23 22:00 JST）

- Git safety precheckは期待branch、upstream、PR #178 open state、latest `main`との関係が一致した。
- 明示した7文書だけをstageしcommitしたが、`.husky/pre-commit`の`pnpm run format:check`が既存78 `app/**` fileでfailureとなりcommitは拒否された。対象`app/**`と`src` / `tests` / dependency filesは`origin/main`と同一で、今回の差分に含まれない。
- Product source / test変更禁止に従い既存sourceをformatせず、configured Hookを迂回しない。7 document changesはstage状態、commit / pushは未完了。PR headは旧SHAのまま。
- Next action: このscopeで許可されていない既存app sourceのformat修正、またはHook bypassなしにcommit可能にするにはRepository側のformat baseline / Hook policyを別途解消する必要がある。現作業はここで停止する。

## Windows改行コードdiagnosis / formatter recovery（2026-09-23 22:45 JST）

- GitHub PR #178はopen、head `a1977fae9515a104a293558757fa75599d5245ed`、base / `origin/main`は`2f5353b63414ace7278155d525e0e2cf074d630b`のまま。branchは期待するPR head branchでupstreamも同branch。
- 初回`format:check`の78件はRepository baselineのPrettier違反ではなかった。`git ls-files --eol`で全78件が`i/lf w/crlf attr/text=auto eol=lf`、`git check-attr`は`text=auto` / `eol=lf`、`git config --show-origin --get core.autocrlf`はsystem設定の`true`だった。
- 全78件についてCRLFをLFへ置換したblob hashが`origin/main`とindexの双方に一致することを事前検証した後、working treeの改行コードだけをLFへ復元した。対象78 filesの370 CRLF pairsを置換し、他byteは変更していない。復元後は全件`i/lf w/lf`。Product sourceのnormalized content diff、cached diff、HEAD対`origin/main` diffはいずれも0で、index tree SHA `a2f4247c03dadcaf8deb0a9a523546032492e667`を保持した。
- CI workflowはUbuntu / Node 24 / pnpm 10.34.5を使用する。localはNode 22.20.0 / pnpm 10.34.5 / Prettier 3.8.1（lockfile固定）。version差ではなく、Windows checkoutのCRLFが失敗原因と判定した。通常checkout-indexもCRLFを再生成したため設定変更は行わず、Hookも迂回していない。
- LF復元後の`pnpm run format:check`はPASS（`All matched files use Prettier code style!`）。stage treeと7文書のstage内容は不変。Product source / testをstage / commit対象に含めない。
- Plan §6再実行: `format:check`、`lint:markdown`、`lint:text`、`git diff --check`、sanitizer `Write` / `Check`はすべてPASS、residual findings 0。次は明示scopeのcommit、通常push、PR #178最新headの`Web CI` / `Mobile App CI`を確認する。merge、Issue close、follow-up Refactorは行わない。
