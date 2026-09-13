# Plan

## Objective

PR #133の`assertEvidenceReference()` Path検証回避を、指定された2 sourceファイルだけで修正し、修正後HEADのTraining Copy、標準検証、Remote CI、PR本文を同期する。

## Scope

- In:
  - `scripts/validate-curriculum.ts`の`assertEvidenceReference()`局所修正
  - `tests/contracts/training-curriculum.test.ts`のEvidence contract回帰強化
  - 今回Runの計画・検証・評価・sanitization
  - 修正後HEADのTraining Copy、push、Web／Mobile／CodeQL CI、PR本文同期
- Out:
  - 教材、Workbook schema、Training Workflow、Playwright starter、Native CI、Expo dependency、Windows Hook timeout、Run Artifact基盤、Product Code、BR／AC、Seed Scenario、ja-JP Pixel Launcher ANR
  - 新dependency、Path parser、framework、共通化層、`existsSync`によるruntime Evidence実在確認
  - merge、PR close、branch削除、tag／release、force push、外部full review／再レビュー

## Confirmed facts

- branch: `refactor/test-automation-curriculum-learning-experience`
- PR #133 current head: `b323e06a6d5bce5253cad9dc342f72475b054c65`
- base: `main` / `3c5e35ed42712574eb9d89051820c9e27f137a16`
- prior Run `20260911-232344-JST`は過去記録として変更しない。

## Hypotheses

- H1: valid `http://`／`https://` URL部分を先に除外し、残りの文字列をPath形状で走査すれば、前文字の境界集合にない`[]`、backtick、hyphen等を一律に許さない検査へできる。
- H2: relative Artifact／output／Run表現は、absolute／UNC／drive／parentの形状に一致しないためpositive contractを維持できる。
- H3: validatorとcontractの2ファイルだけのsource commitでTraining CopyとRemote CIのcurrent-head検証が成立する。

## Research / implementation plan

1. `b323e06`上の指定ケースを実測し、現行実装の通過ケースを確定する。
2. contractへ代表negative／positiveを追加し、修正前にnegativeが検出されないことを確認する。
3. `assertEvidenceReference()`だけを修正し、focused／standard gateを実行する。
4. scope／diff check後にsource commitを作り、修正後SHAを固定する。
5. 公式Training Copy CLI、non-force push、同一HEAD Remote CI、PR本文同期を行う。

## Definition of Done

- 指定された回避系統を修正前に1件以上再現し、代表例をRunへ記録する。
- 修正後negative／positive contract、`validate:curriculum`、`typecheck:training`、`test:contracts`、`verify`、`git diff --check`がPASSする。
- 修正後SHAとTraining Copy source／resolved SHAが一致し、prepare／validateがPASSする。
- 修正後HEADのWeb CI、Mobile App CI（指定Native job含む）、CodeQLがsuccessする。
- PR本文が日本語でHEAD、base、Training Copy、CI、Evidence validator説明をcurrent状態へ同期する。
- source commitは1つ、non-force push済み、worktree clean、mergeなし。

## Repair-loop boundary

- iteration_number: 1 bounded iteration
- input finding: `assertEvidenceReference()`がPath直前の特定境界文字へ依存し、別wrapperで危険Path検証を回避できる。
- classification: `must_fix`
- allowed_files: `scripts/validate-curriculum.ts`, `tests/contracts/training-curriculum.test.ts`
- expected_changed_files: 同上（Run／plan／PR本文はworkflow artifactまたは外部同期）
- stop conditions: 同一failureの反復、同一stage 3回失敗、新情報なし、scope超過、unsafe／needs_human。
