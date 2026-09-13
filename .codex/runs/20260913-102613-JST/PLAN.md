# Plan

## Objective

Issue #134を、保存済みPlan `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md` に従って実装し、PR #146へ反映する。既存Hookのprocess契約を拡張し、決定論的な文章品質scanner、作業開始baseline、local/CI Git比較、Hook contract opt-in、Windows focused contractを既存Harnessへ接続する。

## Scope

- In:
  - `tests/contracts/**` をHook契約テストの正本とした不足分の追加
  - 具体的なproduction文章ruleを推測しない汎用scannerと、明示ruleを置く正本ファイル
  - session baselineを本文・raw matchなしの最小manifestで保持するPostToolUse / Stop品質Hook
  - `HEAD -> current worktree` とcommit/PR/push/scheduleの明示比較を行うRepository-level gate
  - `scripts/verify` / `scripts/verify.ps1`のHook contract opt-in
  - Ubuntu Style Qualityの文章品質gateとWindows focused Hook contract CI
  - Harness reference、Run Artifact、PR #146本文の現行実装・検証結果への更新
- Out:
  - #135がmainへ未mergeのため、compact後のroot `AGENTS.md` 再注入、`SessionStart`、root AGENTSのコピー/marker
  - Product code、Skill routing、subagent orchestration、既存PreToolUse/log_eventの意味変更
  - markdownlintの構造責務の再実装、AI Judge、broad dictionary、形態素解析
  - similarity rename、filename推測、edit distance、独自session/diff/Git履歴framework
  - `--strict-harness` / `-StrictHarness`の意味変更、mainへの直接操作、merge/close/force push

## Assumptions

- 現在の正本は作業treeのsource/test/CIであり、Issue/Plan作成時点との差分は実装開始時に再評価する。
- #135はIssueページとbranch状態の双方で未完了と扱い、#135 branchへ直接依存しない。
- 現在利用できるCodex CLIは `codex-cli 0.147.0`。SessionStartの停止契約は実装しないため、今回のHook契約は0.147.0で利用可能なPostToolUse/Stop payloadと既存config形式に限定する。
- リポジトリ内・Issue #134に具体的に明文化された禁止語、置換表、allowlist、英語混在条件は確認できないため、production ruleは空の正本として明示し、scannerをテスト用・将来rule追加用に成立させる。空ruleを品質違反のPASS根拠へ偽装しない。
- `pnpm`はPATHになく、プロジェクトのpackageManager契約に従い `corepack pnpm` を使用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。#135状態、対象branch/PR、Plan、変更境界、検証方針は確認済み。
- 仮定してよい細部: 既存Node/Vitestと標準Node APIで実装し、TOML全仕様parserは作らず設定契約は既存テスト内の限定parserで検証する。
- 未回答の重要質問: production文章ruleの具体値。Repository/Issue/関連文書に根拠がないため、今回の実装では未確定として残す。

## Hypotheses

- H1: 既存 `tests/contracts/codex-hook-contract.test.ts`へprocess境界の文章品質・config契約を追加すれば、新しいHook test frameworkなしでstdin/stdout/stderr/exit/side effectを固定できる。
- H2: scannerを本文評価、Git比較をsnapshot/identity評価、Hookをfail-open/Stop境界へ分離すれば、baseline空への誤fallbackと既存違反の新規誤認を防げる。
- H3: Git mappingを先に使い、local pure moveだけHEAD blobと現在候補のexact SHA-256一意一致へfallbackすれば、similarity推定なしでrename境界を満たせる。
- H4: workflow側でeventごとのbase refを明示し、gate内で一つのcomparison treeを変更path・baseline本文・rename mappingへ共通利用すれば、PR merge checkoutのbase既存違反誤検出を防げる。

## Research Plan

- Round 1 Query: branch/PR/Issue/#135、Plan、current Hook/config/test/verify/CI、Codex CLI version、既存text ruleの有無を確認する。
- Round 2 Query: 実装後のfocused contract、scanner/fixture、local Git edge cases、verify/CI wiring、formatter/lint/typecheck、sanitizer、PR最新head CIを確認する。
- Exit Criteria:
  - H1〜H4を対応するcontract testと実行結果で支持する。
  - #135未完了境界、production rule未確定、未実施検証をRun/PRへ事実どおり記録する。
  - local/CI比較不能を違反0件へ落とさず、Hook failureとlint violationを分離する。
  - tracked Run Artifactをsanitizerで確認し、branch/PR head一致、commit/push、最新headの必須CI成功、PR本文更新を完了する。

## Approach

1. 現在のsource差分・CLI・既存契約を再確認し、変更対象をTASKSへ固定する。
2. scanner/rule schemaと、scanner単体の決定論的出力・失敗契約を実装する。
3. baseline/state resolverとPostToolUse/Stop Hookを、同じscanner結果のfingerprint multisetで接続する。
4. Repository-level Git比較CLIでworking-tree/commit/PR event境界、rename fallback、comparison failureを実装する。
5. 既存verify/CIへ薄く接続し、contractと回帰テストを追加する。#135のcompact再注入は実装しない。
6. 指定検証、sanitizer、scopeを実行し、FAIL時は最初の異常を分類して安全な最小修正後に再実行する。
7. tracked Run Artifactをfinal commit前状態へ確定し、branch safetyに従ってcommit/push、PR本文更新、最新head CI確認を行う。

## Definition of Done

- Planで指定された独立範囲の実装・契約テスト・verify/CI接続・Harness文書が現行sourceへ整合している。
- #135未完了のためcompact再注入を実装していないこと、production rule未確定を推測していないことが明記されている。
- focused/既存lint/typecheck/contracts、必要なverify opt-in、Windows focused契約を実行し、結果と未実施理由を記録している。
- Run Artifactのscope/sanitizer/schemaを確認し、対象branchへcommit/push済み、PR #146がOPEN、最新headの `Web CI` / `Mobile App CI` がsuccessである。

## Risks / Unknowns

- production ruleの具体値が未確定なため、lint:textはrule正本が空であることを明示する実装となり、実際の文章違反をblockする完成状態とは区別して報告する。
- Windows実行環境やCodex Hook runnerがローカルで利用できない場合は、focused contractの未実行理由と代替静的確認を記録し、PASSへ補完しない。
- 実装Hookのstate fileは本文を保存しない。path/HEAD SHA/fingerprint/countだけに限定し、壊れたstate・Git取得不能・rename不能はStopで一度block、PostToolUseはfail-openとする。
- `pnpm run verify`は変更に無関係な既存環境差で失敗する可能性があるため、最初の異常と派生停止を分離する。

## Thinking Log

- 2026-09-13: branch `issue-134-codex-hook-quality-gates`のHEAD `c11324c`とorigin追跡先は一致し、treeはclean。PR #146はOPENで同branch、#135はOPENでmainへ未merge。
- 2026-09-13: installed Codex CLIは `codex-cli 0.147.0`。Planが参照する最新sourceのSessionStart契約は確認材料として扱うが、#135未完了のためSessionStart実装へ進まない。
- 2026-09-13: repository/Issue/Planを検索した結果、productionでblockする具体的禁止語・置換・allowlist等は確定できなかった。独自ruleは追加せず、空rule正本とrule-engine contractを用意する。
