# Plan（計画）

## Objective（目的）

- PR #179で確定した[Issue #177実装Plan](../../../docs/plans/2026-09-23_132000_issue-177-windows-crlf-prettier.md)を正本として、Phase 1〜9の調査・選択・実装・検証を完了する。
- EOL、Husky、Codex文章品質Hook、`diagnose:hooks`を個別のEvidenceで判断し、Issue #177の完了条件を満たす。

## Scope（対象範囲）

- In: PlanのCase A〜F選択、必要な最小実装修正、contract test、実linked worktree受入、Windows受入、Repository標準検証、Run Artifact、既存PRへのcommit / push / CI確認。
- Out: Planの対象外に列挙されたProduct変更、無関係な`app/**`整形、global/system Git設定変更、新規dependency、共通Hook framework、Plan本文の書換え。

## Assumptions（仮定）

- 作業branchは`plan/issue-177-windows-crlf-prettier`、実装開始時のPR headは`b9a21033ccdf912390e234c07e33674a73fd0112`。
- `origin/main`は`01cd8ab15078d479e821d373445af1e16a469519`で、作業開始時点でPRのbaseと一致する。
- 実装開始時点のworktreeにはIssue #177と無関係な変更がなく、Phase 1時点の`app/**`はindex / worktreeともLF。
- Case A〜Fは先に固定せず、保存PlanのPhaseごとのEvidenceで選ぶ。

## Questions / Ambiguity（質問・曖昧性）

- ユーザー判断待ちの質問: なし。
- Evidenceにより決める事項: EOL Case A/B/C、Husky Case Dおよび`security:check`の責務、Codex Hook Case E、doctor Case F。

## Hypotheses（仮説）

- H1: system scopeの`core.autocrlf=true`は確認されたが、`.gitattributes`の`eol=lf`が対象78 filesに適用され、現在はindex / worktreeともLF。CRLF再発源はcheckout後のwriter等にある可能性が残る。
- H2: Husky全体検査、linked worktree固有のdependency不足、doctor bootstrapは別のfailure経路であり、個別に検証する必要がある。

## Research Plan（調査計画）

- Phase 1 read-only観測は完了。現在状態を修復せず、EOL / config / attributes / Prettier結果をRun Artifactへ記録する。
- Phase 2で同じGit metadataのdetached linked worktreeと独立fresh cloneを同一main SHAで比較する。
- Phase 3で許可された操作を独立Repository上で順番に試し、最初にCRLFへ変える操作を再現できる場合だけ原因とする。
- Phase 4〜8でCase A〜Fを各Evidenceから選び、採用案と比較案をRun Artifactへ残す。
- Phase 9でfocused test、actual linked worktree / 実`git commit`受入、Repository標準検証、Windows受入、最新PR headのWeb CI / Mobile App CIを確認する。

## Approach（進め方）

- 保存済みPlanのPhase順、変更範囲、安全条件、全回帰条件、完了条件を維持する。
- 現在worktreeの修復は必要性が確認された場合だけ再度status / staged diff / unstaged diff / untrackedを確認し、CRLF-onlyと実証したpathだけを対象とする。
- Prettier / ESLintのstaged checkを採用する場合はindex stage 0 contentと既存config / ignore意味を使い、4設定fileのindex / worktree不一致をfail-closeする。
- `security:check`はworktree検査、index snapshot、pre-commit外の候補から現在の実装保証に基づき選ぶ。
- push前後のbranch / refspec / PR状態はGit branch safetyとimplementation harnessに従う。

## Definition of Done（完了条件）

- 保存Planの「## 10. 完了条件」を全項目評価し、各項目に実装・test・受入・Evidenceを対応づける。
- EOL Case A/B/C、Husky Case Dとsecurity責務、Codex Hook Case E、diagnostics Case Fの採否と比較案の不採用理由を記録する。
- Plan指定のfocused / contract / verify / sanitizer / `git diff --check`、Windows・actual linked worktree・実commit受入を実施する。
- 最新PR headのWeb CIとMobile App CIがsuccessで、PR本文に必要結果を記録する。
- Issue #177と無関係な変更がなく、追跡対象のRun Artifactをfinal commit前状態まで確定する。

## Risks / Unknowns（リスク・未知点）

- 現状のWindows worktreeではCRLFが再現していないため、再現操作を独立Repositoryで特定できるかは未確定。
- `pnpm`コマンドshimがPATH上にない。Corepack経由の`pnpm`は利用可能で、Phase 1の`format:check`は実行済み。
- current Repositoryは別worktreeとGit metadataを共有する。Planで許可されたPhase 2 probe以外では共通metadataを変更しない。

## Thinking Log（判断記録）

- 2026-09-23: PR #179のREST API headを確認して`origin`をfetchし、cleanな作業branchをfast-forward-onlyで最新headへ揃えた。`origin/main`はPR baseと同じSHAでmain-only commitなし。
- Phase 1: system `core.autocrlf=true`、`core.eol` / `core.safecrlf` / `core.attributesFile` / `extensions.worktreeConfig`未設定。worktree configとinfo attributesなし。`app/**`78件すべて`i/lf w/lf`, `text=auto eol=lf`; Git diff 0; Corepack経由`format:check` PASS。現状の78件CRLF failureは未再現のためCase選択を保留する。
- Phase 2/3: 共有metadata linked worktree、独立fresh clone、mainの1つ前のcommitへのcheckout/back、`pnpm install --ignore-scripts`、分離した`pnpm run prepare`、`format:check`、global `format`、代表`apply_patch`はいずれもCRLFを発生させなかった。`app/**`を直接書き換えるRepository scriptは見つからなかった。
- Phase 3 trigger: Windows PowerShellの`Get-Content app/index.tsx | Set-Content app/index.tsx -Encoding utf8`相当操作を2つの独立cloneで再現。各cloneで`git ls-files --eol`は`i/lf w/crlf attr/text=auto eol=lf`、Git content diffは0。strict Prettier checkはCRLFだけでFAILし、`--end-of-line auto`は正しいstyleでPASS・実format違反でFAIL、`git add`後のindex blobはLF、Prettier write後はworktree LFとなった。
- EOL decision: Case Cを採用する。Case AはRepository-owned app writerがなく不採用。Case BはCursorの実Editor保存をこのsessionのUI surfaceで実行できず、原因として確認できないため採用しない（.editorconfigを維持しEditor固有設定を追加しない）。外部Windows writerがCRLFを書ける再現Evidenceと過去IssueのCRLF報告があるため、local `format:check` / `verify`はstyle違反を維持しつつEOL差を許容し、CIにはstrict LF entry pointを明示する。元の78-file事象を生んだ具体的ツールは未確認と区別する。
- Phase 5: 現在worktreeはPhase 1で`app/**`78件すべてLF・Git diff 0・無関係変更なしを確認した。CRLF-only対象pathがないため、現在worktree修復は行わない。
