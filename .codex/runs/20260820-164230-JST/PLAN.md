# Plan

## Objective

Phase 1 CIのrequired browser guaranteeをChromium系へ限定し、Firefox / WebKit smokeを`Cross Browser Smoke`のschedule/manual-only workflowへ分離する。既存の`verify` / `validate`、artifact pipeline、Firefox / WebKit test資産は維持する。

## Scope

- In: `.github/workflows/ci.yml`、新規`.github/workflows/cross-browser-smoke.yml`、CI contract、PROJECT_CONTEXT/history、新規ADR、実装Run Artifact。
- Out: application code、E2E test body、Playwright project定義、`package.json`、既存ADR-0002、Git公開操作。

## Current understanding

- 指定planは現在のworktreeには存在しないが、`origin/main`のcommit `da62eea`に保存されている1064行を全文確認し、今回の実装根拠とする。
- 現行`ci.yml`はNode 24 / pnpm 9.10.0をworkflow-level envに持ち、`extended-e2e`はmobile-chromium / firefox / webkitのmatrixである。
- 現行`extended-e2e`はChromiumのみbrowser-only install、Firefox / WebKitは`playwright install --with-deps`を実行している。
- `verify`はPRで`extended-e2e=success|skipped`、非PRでsuccessを要求し、`validate`はこれを参照する。
- package/config/test資産はplanの期待値と一致し、ADR-0019は未使用である。

## Assumptions

- exact official imageは`mcr.microsoft.com/playwright:v1.62.0-noble`を使用する。
- 既存workflowのcheckout / pnpm setup / Node setup / artifact actionのfull SHAをそのまま再利用する。
- 新workflowはcontainer内の同一jobでbuildを1回、Firefox / WebKitを1 invocationで実行する。
- GitHub上のPR CI、feature branch dispatch、merge後manual smokeはローカル実装後の運用確認として残す。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。planの指定と現行repo状態から局所的に確定できる。
- 仮定してよい細部: history timestamp、ADRの文面、contract test名は既存conventionに合わせる。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `extended-e2e`を単一のmobile Chromium jobへ変更しても、job idを維持すれば既存`verify` / `validate`契約は変更不要である。
- H2: official Playwright container内でbuild済みdistを共有し、Firefox / WebKitを同一Playwright invocationで実行すれば、追加matrixやartifact workflowなしにsmokeを継続できる。

## Research Plan

- Round 1: plan、AGENTS、PLANS、PROJECT_CONTEXT、ADR、run、workflow、contract、package/config/test bodyを確認する。
- Round 2: 実装差分、静的contract、YAML parse、repository checksを確認する。
- Exit Criteria:
  - H1/H2をworkflowとcontractの実体で確認する。
  - protected fileに差分がなく、未実行のGitHub実機確認を明示する。

## Approach

1. active runを初期化し、現在の前提と変更禁止境界を記録する。
2. `extended-e2e`をmatrixなしのmobile Chromium単一jobへ変更する。
3. exact containerを使う`Cross Browser Smoke`を追加する。
4. raw string-based CI contractを最小更新し、toolchain/version/env境界を固定する。
5. history保存後にPROJECT_CONTEXTを更新し、新規ADRへ判断を記録する。
6. YAML parse、contract、format/markdown/lint/typecheck/可能ならverifyを実行し、差分を再読してsanitizeする。

## Definition of Done

- `extended-e2e`のjob idと`verify` / `validate`構造を維持したままmobile Chromium専用になる。
- Phase 1 CIからFirefox / WebKitおよび`--with-deps`が除去される。
- `Cross Browser Smoke`がschedule + workflow_dispatch only、1 job、exact container、build 1回、Firefox/WebKit 1 invocationになる。
- `pnpm run test:contracts`、YAML parse、指定repository checksの結果を記録する。
- PROJECT_CONTEXT/history/ADR/Run Artifactが実装と一致し、Run Artifact sanitizeが成功する。
- GitHub実機確認は未実施の場合、検証済みと報告せずfollow-upに残す。

## Risks / Unknowns

- 新workflowはmerge前にGitHub runnerでmanual実行できないため、local static/contract checksとpost-merge follow-upを分離する。
- container pullやbrowser runtimeの実機状態はローカルYAML parseでは保証できない。
- plan fileがworktreeにないため、実装branchへ1064行のplanをコピーすることはせず、Git履歴のplanとこのRun PLANを根拠にする。

## Thinking Log

- 2026-08-20 16:42 JST: active runなしを確認し、CI workflow/public contract変更のためstrict runを初期化した。
- 2026-08-20 16:44 JST: 現行package/config/CI/contractとGit履歴上の対象planを照合し、指定protected fileを変更しない方針を確定した。
