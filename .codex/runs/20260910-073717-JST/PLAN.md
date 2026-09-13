# Plan

## Objective

- PR #127 / Issue #117のQualification blockerについて、raw Hook evidenceと現行bounded selectorの不一致を根拠に、実装前の新しいremediation Planを作成する。
- 実測されたcompound PowerShell shapeだけを案A（exact-shape限定）で安全に認識する方針と、detached Target / routing SHA / answer key相当path / Evaluator artifact / 他Codex processのpreflight責務を確定する。
- 今回はPlan-onlyとし、実装・Probe・Qualification・canonical `all`を行わない。

## Repository Plan

- 正本Plan: `docs/plans/2026-09-10_073717_issue-117-pr2-qualification-blocker-remediation.md`
- 参照する旧Plan: `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`（意味を変更しない）
- 既存実装Run: `.codex/runs/20260909-225950-JST/`（履歴として保持し再利用しない）

## Scope

### In

- 開始branch / PR / source / tests / ADR / 既存Runの再確認
- `.artifacts/trigger-eval-qualification-20260910/negative-trusted/` raw evidenceの完全command確認
- 案A exact-shape限定と案B bounded recognizerの比較・採否
- `assertTargetPreflight`の現状と、detached HEAD・期待routing SHA・answer key相当path・Evaluator artifact・他Codex processの責務整理
- 実装対象、必須tests、Qualification / canonical preconditions、停止条件のPlan化
- 新規strict Plan Run Artifact、Plan-only validation、PR本文の最小更新、sanitizer / collector、commit / non-force push

### Out

- source、tests、ADR、preflightコード、dataset、query、Skill、Hook、timeout、dependencyの変更
- Observation Probe、Environment Qualification再実行、canonical `all`、retry、query tuning、別Target交換、PR merge

## Confirmed facts

- 開始HEAD / PR headは`a56472e01baab3584123a01c78416b4550db3d81`、branchは`refactor/117-pr2-trigger-eval-baseline`、PR #127はOPENである。
- negative raw eventは`PostToolUse` / `Bash` / `truncated=false`で、command全文は`$pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name`である。
- eventは`turn.completed`、exit 0、Hook correlation / parse PASSだが、現行selectorはpipe・semicolon・variable/propertyを含む未承認compoundとして`unreliable`を返す。
- 現行`assertTargetPreflight`はroot containment、common-dir、alternates、clean、6 Skill readable、Trigger dataset不存在等を検査するが、detached HEADと期待SHA一致を強制しない。

## Decisions

- 案Aを採用する。複数shapeの実測evidenceがないため、案Bへ一般化しない。
- `safe_no_read`はfilesystem readなしではなく、canonical Skill direct readなしを安全に証明できる意味に限定する。
- detached HEADはrunner preflightへ追加する。
- expected routing SHAは新CLI optionを増やさず、Run preflightの明示比較とResult provenance再確認で保証する。
- answer key相当は6 Skill配下の12 Trigger YAML（`train` / `validation`）と`expected_skill`であり、Target内のgeneric artifact全体は禁止しない。
- Qualification positive / negativeが同一Target・同一Codex・同一SHA条件でPASSした場合だけcanonical `all`へ進む。

## Validation / Definition of Done

- 正本Plan、Run Artifact、PR本文に実測command全文、selector案比較、preflight責務表、必須tests、次RunのQualification / canonical条件、対象外が記載される。
- Plan / Run Prettier、Markdown lint、`git diff --check`、sanitizer Write / Check、strict collectorがPASSする。
- source / tests / dataset / Skill / Hook / timeoutへ差分がないことを確認する。
- Plan-onlyのためfull test / verify、Probe、Qualification、canonical `all`は未実行として記録する。

## Risks / Unknowns

- exact-shapeを広げるとfalse trusted absenceになる。近接caseをunreliableへ倒す。
- exact-shapeが狭い場合は新shapeを別evidence / 別Planで扱う。
- detached / expected SHA / Target artifact / process条件の未確認はcanonicalを停止する。
