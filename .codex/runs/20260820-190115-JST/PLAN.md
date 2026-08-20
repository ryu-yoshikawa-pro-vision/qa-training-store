# Plan

## Objective

- PR #37「ci: split Firefox and WebKit smoke from required Chromium CI」のレビュー修正として、Cross Browser Smokeが将来matrixまたはstrategyで複製されないことをraw string contractへ固定する。

## Scope

- In:
  - `tests/contracts/ci-workflow.test.ts` の既存focused contractへ `strategy:` と `matrix:` の不存在assertionを各1件追加する。
  - 新規Run ArtifactへFinding、非対応指摘、変更境界、検証結果、GitHub Actions未確認事項を記録する。
- Out:
  - `.github/workflows/cross-browser-smoke.yml`、`.github/workflows/ci.yml`、package、lockfile、Playwright設定、smoke test body、docs、ADR、application codeの変更。
  - 既存完了Run `20260820-164230-JST` の変更。
  - Git操作、PR操作、workflow dispatch、CodeRabbit再レビュー。

## Assumptions

- 現在のPR実装は既に要求どおりで、今回の不足はCross Browser Smokeのmatrix/strategy禁止contractだけである。
- raw string assertion方式を維持し、新helper・YAML parser・validator frameworkを追加しない。
- 変更前のworktreeは既存実装を含めてcleanであり、今回のproduction差分はcontract test 1ファイルに限定できる。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーが対象、assertion、非対応範囲、完了条件を明示している。
- 仮定してよい細部: assertionは既存focused contractのworkflow-level assertion群の近くへ追加する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `expect(crossBrowserWorkflow).not.toContain("strategy:")` と `expect(crossBrowserWorkflow).not.toContain("matrix:")` により、YAML記述回数だけでは検出できないjob複製リスクをcontractで検出できる。
- H2: 2 assertionの追加はworkflow実装・既存required gate・package/test定義へ影響せず、指定quality checksを維持する。

## Research Plan

- Round 1 Query: AGENTS、PROJECT_CONTEXT、最新ADR、既存Run、repair-loop手順、対象contract、Cross Browser Smoke workflowを確認する。
- Round 2 Query: Findingをtriageし、対象assertionの不存在を確認してから1ファイルへ最小編集する。差分、保護対象、YAML、contracts、repository checksを確認する。
- Exit Criteria:
  - H1/H2を既存workflowとcontractの事実で支持できる。
  - `strategy:` / `matrix:` 禁止assertionが存在し、contractおよび指定quality checksがsuccessになる。
  - GitHub Actions未実行事項をfollow-upとして明記する。

## Approach

- Findingを `must_fix` 1件、非対応CodeRabbit指摘を `defer/reject` として分類する。
- allowed filesを対象contract 1ファイルと新Run Artifactへ固定する。
- 既存focused contractへassertionを直接追加し、workflow本体や周辺実装を変更しない。
- YAML parse、contract、format、markdown、lint、typecheck、verify、diff checkを順に実行する。
- self-review後に新Runのみをsanitizeし、`evaluation.json`とREPORTで完了判定する。

## Definition of Done

- [x] Cross Browser Smoke contractに `not.toContain("strategy:")` と `not.toContain("matrix:")` が追加されている。
- [x] workflow本体、既存Run、保護対象ファイルに不要な変更がない。
- [x] `pnpm run test:contracts`、format、markdown、lint、typecheck、可能ならverify、YAML parse、`git diff --check` がsuccessである。
- [x] 新Run ArtifactのREPORTにFinding、非対応指摘、変更ファイル、validation、GitHub未確認事項が記録され、sanitizeのresidual findingsが0である。

## Risks / Unknowns

- リスク: raw stringの禁止assertionがworkflow全体を誤って検査する可能性。対策はユーザー指定どおりworkflow全体に対する2 assertionとし、既存の単一job契約・YAML内容と合わせて確認する。
- リスク: 既存Runを誤って変更する可能性。対策は対象Runを新Runだけに限定し、完了時に既存Runのhashを再確認する。
- 未確認事項: GitHub Actions実runner、feature branch workflow_dispatch、merge後のCross Browser Smoke manual runはローカルでは確認できない。

## Thinking Log

- 2026-08-20 19:02 JST: レビュー修正は1ファイルのfocused contract追加で安全な変更面が確定した。planning referenceの軽微修正ルールに従い、追加のdocs/plansは作成せずRun-local PLANへ記録する。
- 2026-08-20 19:02 JST: CodeRabbitのRun Artifact見出し翻訳はtemplate/AGENTS固定ラベルとの整合性を壊すため対応しない。container digest固定は今回のversion/tag contractと設計範囲外のため対応しない。
