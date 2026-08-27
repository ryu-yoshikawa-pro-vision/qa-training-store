# Plan

## Objective

`docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` を実行可能な Master Plan として確定し、RA-M7 の Current State 確認（mismatch が残る場合だけ最小修正）、local validation、Master Plan publication PR のCI・reviewを完了して merge-ready にする。

## Fixed decisions

- 共通卒業像は entry-level の汎用 Test Automation Engineer とする。
- C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Product Formal Native Regression、Android Runtime Gate、iOS Build-only Gate は変更しない。
- `Repository-required curriculum asset` と `Learner Required path` を分離する。Validator上存在必須でも、受講者必修とは限らない。
- `03_instructor-reference.md` は Repository-required support asset として残してよいが、Learner Required path には含めない。
- Learner Required path は自己学習を標準とし、学習内容・演習・自己確認・学習上のRecovery・完了条件・次の行動を learner-facing material で完結させる。
- Instructor / 運営による環境準備、端末・アカウント・権限・演習Repository提供、Infrastructure / Toolchain障害の支援、最終評価・フィードバックは許容する。
- Instructor Reference は残すが、Learner Required learning content の唯一の正本にしない。Learner self-check と Instructor evaluation は同じ公開 Rubric / Minimum Evidence / Artifact を使う。
- Self-check は単なるReference提示ではなく、Learnerが自分の回答・成果物の充足を合理的に判定できる具体性を持たせる。
- Final Fresh Learner Review は、手動テスト経験は許容するがプログラミング / Playwright / Maestro / Git / CIの未説明知識を前提にしない Target learner profile で実施する。
- Final Fresh Learner Review は Common Core Required exercise が Environment block で未実行なら `PASS` にせず `not_validated` とする。
- 自己学習化のために新 LMS / scoring engine / AI grader を追加しない。
- RA-M7 は Master Plan branch 上で Current State を確認し、mismatch が残る場合だけ最小修正する。Current State が canonical なら source / contract test は変更しない。
- RA-M7 のために別 branch / 別 Run / 専用 child Plan は作らない。
- PR 1〜5 は Master Plan publication PR merge 後に開始する。
- Refactoring candidate は Evidence を確認してから実装要否を判断する。
- Master Plan は `Current understanding` と `Assumptions / Safe change surface / Unknowns` を分離する。
- PR 4 は Pre-change audit 後に reviewability / semantic safety を判定し、必要な場合だけ PR 4A / PR 4B に分割する。
- PR 4 child Plan で実際に揺れている用語だけの Terminology Decision Table を作り、新しい permanent glossary は作らない。
- Final Fresh Learner Review は fresh context で実施し、Environment / Toolchain support と learning-content support を分離して記録する。P0 / P1 があれば latest `main` から bounded repair して fresh context で再実行する。
- RA-M8 は `training/workbook/README.md` の learner-facing grammar と validator executable contract を一致させ、全Markdown解析の新基盤は作らない。
- RA-M7 は commit済みHEADで Current State を確認し、non-canonical literal が残る場合だけ最小修正する。既に canonical なら source / contract test は変更しない。
- `validated head` は、Run Artifact 最終化の直前に PR diff、required local validation、PR-triggered CI、review、mergeability、scope を確認したPR headとする。
- validated head の結果を Run Artifact に記録し、TASKS の最後の task と `run.json.status` を完了状態へ更新してから、その更新を含むcommitを finalization head とする。
- `finalization head` は Run Artifact finalization commit を含むPR headであり、そのCI / review / mergeabilityは GitHub PR metadata を最終的なSSOTとする。CI結果の記録だけを目的としたRun Artifactの再commitは行わない。
- finalization head でCI失敗または新しいreview findingが発生した場合だけ、Runを `pending` に戻してbounded repairを行い、同じfinalization flowを再実施する。
- 実際の merge 状態は GitHub PR を正本とし、merge 後に Run Artifact を追加更新しない。

## Scope

### In

- Master Plan の保存・更新
- active Run Artifact の更新
- Master Plan review finding の bounded repair
- RA-M7 の required curriculum path と contract literal の Current State確認（今回のsource／testはread-only）
- local validation
- Codex Run Artifact Sanitizer Write / Check
- PR #61 の diff / scope 確認
- 既存の Master Plan publication PR #61 の確認
- PR-triggered CI / review の確認
- 必要な bounded repair
- validated head の local / PR validation確認
- validated head の結果を反映した active Run Artifact の最終化
- finalization head のCI / review / mergeability確認

### Out

- Master Plan publication PR の merge 実行
- merge 後の Run Artifact 更新
- PR 1〜5 の実装
- Curriculum semantic change
- Product behavior / Formal Test / Product CI の変更
- Refactoring 実装

## Files allowed in Step 0

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `.codex/runs/20260824-201800-JST/PLAN.md`
- `.codex/runs/20260824-201800-JST/TASKS.md`
- `.codex/runs/20260824-201800-JST/REPORT.md`
- `.codex/runs/20260824-201800-JST/run.json`
- `scripts/validate-curriculum.ts` と `tests/contracts/training-curriculum.test.ts` は Current State確認のread-only対象であり、今回の修正対象には含めない。

## Phase A — Step 0

1. `run.json.task_type` を `plan` として維持する。
2. Repository Audit 時点のRA-M7 filename mismatch Findingを前提に、`scripts/validate-curriculum.ts` の required curriculum path が canonical `00_learning-design.md` を指していることをcommit済みHEADで確認する。canonical なら変更せず、誤 literal が残る場合だけ修正する。
3. `tests/contracts/training-curriculum.test.ts` が同じ誤 literal を直接保持する場合だけ最小修正する。direct wrong literal がなければ変更しない。
4. `run.json.changed_files` を実変更と一致させる。
5. local validation を実行する。
6. Validation結果を `run.json.validation` と `REPORT.md` に記録する。
7. Sanitizer Write / Check を実行する。
8. 最終diffを確認し、Step 0 scope 外の変更がないことを確認する。
9. TASKS の Step 0 task を完了し、既存PR #61の次工程へ進める状態を記録する。

## Step 0 current-state note

- Repository Audit 時点ではRA-M7をfilename mismatch Findingとして記録していたが、2026-08-27 のcommit済みHEAD / PR head `3dfdf9eb5a61ceb127541a461fe3da1dc977eaeb` を確認した時点で、`scripts/validate-curriculum.ts` の required path は既に canonical `00_learning-design.md` であり、underscore literal は存在しなかった。
- `tests/contracts/training-curriculum.test.ts` にも underscore literal は直接保持されていなかった。
- そのため、RA-M7 の source / contract test は no-op diff を作らず、既存状態を確認したうえで local validation と Run Artifact 更新を行う。mismatch が再確認された場合だけboundedなsingle-literal修正を行う。

### Local validation

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check`

### Step 0 completion

- RA-M7 の Current State として required curriculum path が canonical `00_learning-design.md` を指していることを確認し、必要時のみ最小修正されている。
- mismatch が存在しなかった場合、source / contract test diff がないこと自体を正常状態として扱う。
- local validation が PASS している。
- Sanitizer Check の residual finding が0件である。
- diff が Step 0 allowed files / scope 内に限定されている。
- Master Plan publication PR を作成できる状態である。

## Phase B — Master Plan publication

1. Step 0完了後、既存の Master Plan publication PR #61 のPR diffがStep 0 scope内であることを確認する。
2. validated head で required local validation、PR-triggered CI、review、mergeability、scopeを確認する。review findingがある場合は今回のdiffに起因するものだけbounded repairする。
3. validated head の確認結果を Run Artifact へ記録する。
4. TASKS の最後の task を完了状態へ更新し、`run.json.status` を `complete` へ変更する。
5. 上記のRun Artifact finalizationをcommit・pushし、そのcommitを含むPR headを finalization head とする。
6. finalization head のPR-triggered CI / review / mergeabilityはGitHub PR metadataを最終的なSSOTとして確認する。greenかつmergeableならmerge-readyと判定する。
7. finalization headのCI結果を記録するためだけのRun Artifact再commitは作成しない。
8. finalization headでCI失敗または新しいreview findingが発生した場合だけ、Runを `pending` としてbounded repairへ戻し、同じfinalization flowを実施する。

PR の merge はこの Run の完了後、ユーザーの明示承認を受けて実施する。merge 後は GitHub PR を merge 状態の正本とし、Run Artifact を追加更新しない。

## Stop conditions

次の場合は scope を広げず停止する。

- RA-M7 が Current State確認、またはmismatch時のpath literal最小修正だけで解消できない。
- Curriculum semantic change や file rename が必要になる。
- Product behavior / Formal Test / Product CI の変更が必要になる。
- Validation failure が今回の filename mismatch と無関係で、既存失敗との境界を分離できない。
- contract test 修正が単一 literal / direct contract correction を超える。
- active Run の履歴を削除・並べ替え・意味変更しないと整合できない。
- PR review / CI failure の修正が Step 0 scope を大きく超える。

## Completion criteria

- 既存の Master Plan publication PR #61 が対象として確認されている。
- validated headのCurrent StateでRA-M7が解消済みである（Current Stateがcanonicalの場合はsource diffなしを含む）。
- validated headでlocal validation、PR-triggered CI、review、mergeability、scopeがPASS／正常である。
- validated headの結果がRun Artifactへ記録され、TASKSの最後のtaskが完了、`run.json.status` が `complete` へ更新されたうえで、その更新を含むcommitがfinalization headとなっている。
- finalization headのCI / review / mergeabilityがGitHub PR metadataで確認され、PRがmerge-readyである。
- finalization headのCI結果を記録するためだけの追加commitが作成されていない。失敗または新規finding時だけ `pending` に戻してbounded repairする。
- PR 1〜5 / Phase 6 の実装をこのRunに混ぜていない。
