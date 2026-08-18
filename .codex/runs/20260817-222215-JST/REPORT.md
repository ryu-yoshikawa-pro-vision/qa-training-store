# Report (append-only)

## 2026-08-17 22:22 (JST)

- Summary: Public Repository Hardening の strict Run を開始し、SSOT と必須入口文書を確認した。
- Completed: Run `20260817-222215-JST` を `scripts/new-run.ps1` で初期化。`HEAD` / `origin/main` の rebaseline と既存 workflow の初期確認を完了。
- Changes: Run Artifact の `PLAN.md` / `TASKS.md` / `REPORT.md` を SSOT に合わせて更新した。Product code、Application、Native、教材は未変更。
- Commands:
  - `powershell -ExecutionPolicy Bypass -File scripts\new-run.ps1 -TaskType implementation -WorkflowLevel strict` => Run 初期化成功。
  - `git fetch origin main` => `origin/main` を取得。
  - `git rev-parse HEAD; git rev-parse origin/main` => 両方 `fc9e497817e6c3cff8d89ebd7b37244e759e9484`。
  - `git status --short --branch` => branch `feat/implement-public-repository-hardening`、Run Artifact のみ未追跡。
  - `rg -n "uses:|permissions:|persist-credentials|deploy-preview|dependency-review|verify:|validate:|pull_request_target|self-hosted|cloudflare|secrets\\." .github/workflows` => 3 workflow、既存 read-only / credential invariant、Preview / Production の Cloudflare Secret 利用を確認。
- Notes/Decisions:
  - 最新 main は Plan の旧 baseline より新しい `fc9e497`。Plan 後の main 先行差分はないため、この commit を実装基準とする。
  - Open PR は #27 の1件。PR #27 はこの作業の変更対象ではなく、main の current state 判定へ古い base SHA を流用しない。
  - 現行 Ruleset `main-protection` は required context `verify`、expected source は GitHub Actions integration `15368`。`validate` が main で成功する前の切替は禁止。
  - GitHub connector で direct collaborator は `sella-roum` Write、repository owner は Admin、team は空。Deploy Key、Repository Secret、Security alerts、CodeQL、Actions permission は connector scope の 403 / 未確認として扱う。
  - Cloudflare workflow は Preview / Production とも `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を参照し、Pages project `ec-test-automation-store` を使う。実 Token の scope / resource / sharing / blast radius と Owner trust は未確認であり、推測しない。
- New tasks: Task 2 / 3 を開始する。
- Remaining: official Action release / SHA / advisory inventory、Repository file / CI 実装、local validation、Phase 4 の外部確認。
- Progress: 8% (1/12)

## Evidence Record

- Record ID: R-001
- Round: Phase 1 rebaseline
- Query: 最新 main、Open PR、workflow、Ruleset、collaborator、外部 Security boundary の read-only 状態確認
- Source: `git fetch origin main`、`git rev-parse`、GitHub connector API、`.github/workflows/**`、SSOT
- Supports/Refutes: 最新 main の採用、既存安全設定の維持、外部境界の未確認状態を支持
- Confidence: 高（Git / workflow / Ruleset / collaborator）、低（Secret / Cloudflare / Security settings は未確認）
- Decision: Repository Hardening は継続し、外部 trust boundary は未完了として保持する。
- Rationale: Plan は Owner trust を AI が推測することを禁止しているため。
- Open Issues: Owner trust、Cloudflare token scope / sharing、Security alerts、PVR / CodeQL / Actions settings。
- Next Action: official Action metadata を取得し、Phase 2 の最小差分を実装する。

## 2026-08-17 22:45 (JST)

- Summary: Phase 1 inventory と Phase 2 の Repository / CI 実装を完了し、PR-ready 検証へ移行した。
- Completed:
  - 最新 `main`、Open PR、Ruleset、collaborator、workflow、remote Action、official release / advisory を再確認した。
  - `SECURITY.md`、PR Template、Bug / Feature Issue Form、Security contact link を追加した。
  - `README.md` / `CONTRIBUTING.md` に Issue Form、PR Template、PVR の導線を最小追加した。
  - 既存 `.github/workflows/ci.yml` へ `actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294`（v5.0.0）を統合した。PRではsuccess、非PRではskippedを `verify` が明示判定する。
  - `deploy-preview` は同一リポジトリの通常PRかつ非Dependabot authorのみを対象とし、fork / DependabotではSecretを参照せずskippedとする条件へ変更した。
  - `validate` は `always()` を維持し、event / head repository / PR authorごとにPreviewのsuccessまたはskippedを明示判定する。
  - `.github/workflows/**` のremote `uses:` 91件をfull-length commit SHAへ固定した。local reusable workflowはremote Action inventoryから除外した。
  - `actions/setup-java` は既存v4がupstreamでdeprecatedと確認できたため、Planのsupport終了例外に基づきv5.7.0へ更新した。その他のdependency package versionは更新していない。
  - `docs/PROJECT_CONTEXT.md` と `docs/history/2026-08-17_224000_public-repository-hardening.md` を、fork / Dependabot-safe CIの新しい運用境界に合わせて更新した。Application / Native / 教材は未変更。
- Inventory:
  - Cloudflare workflowはPreview / Productionとも `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` とPages project `ec-test-automation-store`を参照する。
  - Token permission、resource scope、Preview / Production token sharing、blast radius、secret実在性、write-enabled App / Deploy Key、Security alertsはGitHub connectorの403またはprovider / Owner側確認不能のため未確認とした。
  - direct collaboratorは `sella-roum` Write、repository ownerはAdmin、teamsは確認なし。roleやaccount情報からtrust classificationは推定していない。
  - upstream advisoryは `actions/download-artifact` のGHSA-cxww-7g56-2vh6を確認したが、修正版v4.3.0へ固定済み。対象repositoryのAlerts件数は権限不足で未確認であり、ゼロとは扱わない。
- Commands:
  - `git fetch origin main; git rev-parse HEAD; git rev-parse origin/main` => `fc9e497817e6c3cff8d89ebd7b37244e759e9484`で一致。
  - `rg` によるworkflow inventory => remote uses 91件、unpinned 0件、`pull_request_target` / `self-hosted`なし。
  - official GitHub repositoryのtag / release / advisory確認 => 9 Action系列のpin根拠を確定。`dependency-review-action` v5.0.0のinputsとread-only permissionsを確認。
  - GitHub connector read-only query => Ruleset / collaboratorは確認、Security / Secret / Deploy Key / Actions settings / CodeQLは403で未確認。
- Notes/Decisions:
  - `docs/PROJECT_CONTEXT.md` の旧「fork PRはサポート対象外」記述は、今回のSSOTが要求するfork-safe skipped contractと矛盾するため、履歴ファイルを残して最小更新した。
  - Phase 4のSettings / Ruleset変更、mainへの反映、PVR実動作、CodeQL / Dependabot設定、Cloudflare trust判定は今回実行しない。
- Next Action: static contract、format / markdown、正式 `pnpm run verify`、diff self-reviewを実行する。
- Progress: 67% (8/12)

## Evidence Record

- Record ID: R-002
- Round: Phase 1 inventory / Phase 2 implementation
- Query: SSOTのPR-ready DoDを満たすRepository file、CI event contract、Action pin、外部境界の確認状態
- Source: `.github/workflows/**`、`SECURITY.md`、Issue / PR template、`README.md`、`CONTRIBUTING.md`、`docs/PROJECT_CONTEXT.md`、GitHub official repositories / releases / advisories、GitHub connector API
- Supports/Refutes: PR-ready実装範囲と外部境界の未完了状態を支持。Repository Hardening Completeは支持しない。
- Confidence: 高（local diff / YAML / Action SHA / existing Ruleset / collaborator）、低（GitHub Security settings / repository alerts / Cloudflare provider state）
- Decision: Phase 2はSSOTの最小範囲で実装し、Phase 4とtrust boundaryは未完了として保持する。
- Rationale: main merge前のSettings変更とOwner trust推定は禁止されているため。
- Open Issues: static / formal quality gate、main反映、Ruleset validate切替、PVR notification、CodeQL、Dependabot Security Updates、Cloudflare token scope / sharing / Owner trust。
- Next Action: quality gate実行後、self-reviewとRun Artifact sanitizationを行う。

## 2026-08-17 23:00 (JST)

- Summary: 正式 `verify` の初回実行で、今回変更したCI contractに追随していない既存契約テスト2件を検出し、最小修正した。
- Initial result:
  - `pnpm run verify` は format / markdown / spec / curriculum / lint / typecheck / image manifest / security check、unit / integration / repository / web component / native component まで進行した。
  - `tests/contracts/ci-workflow.test.ts` の2件が、旧Preview skipped判定と `actions/checkout@v4` 文字列検出を期待して失敗した。
  - Application / Nativeのテスト失敗、型エラー、lint errorはなかった。lintは既存warning 64件のみ。
- Repair:
  - `tests/contracts/ci-workflow.test.ts` のCI contract期待値を、normal same-repo / Dependabot / fork / non-PRの明示判定へ更新した。
  - checkout検証をtag形式からfull SHA形式へ更新し、`dependency-review`をverify dependency期待値へ追加した。
  - 変更はworkflow contract testのみ。Application / Native / 教材は変更していない。
- Validation:
  - `pnpm exec vitest run tests/contracts/ci-workflow.test.ts --no-file-parallelism --maxWorkers=1` => 13/13 PASS。
  - `pnpm run test:contracts` => 30 files / 392 tests PASS。
- Decision: 失敗原因は今回のworkflow契約変更に直接起因し、正式gateを成立させるため必要な回帰テスト修正として今回の範囲へ含めた。同一条件の `pnpm run verify` を再実行する。
- Progress: 67% (8/12)

## 2026-08-17 23:09 (JST)

- Summary: static contract、正式 quality gate、diff checkを完了した。PR-ready self-reviewへ進む。
- Static validation:
  - YAML parse: `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` の3件がPASS。
  - Remote `uses:` は91件、unpinned 0件。local reusable workflow `./.github/workflows/native-ios-ci.yml` はremote Actionとして数えていない。
  - 全workflowのtop-level `permissions` は `contents: read` のみ。`pull_request_target`、`self-hosted`、不要な `contents: write` / `pull-requests: write` / `issues: write` はなし。
  - 全Checkoutの `persist-credentials: false`、`verify.if: always()`、`validate.if: always()`、Productionの `push` + `refs/heads/main`、`.github/dependabot.yml` 不在を確認。
  - Dependency Reviewの6 inputs、PR success / non-PR skipped判定、Preview eligibility、validateのPR / non-PR分岐を確認。
- Official Action inventory:

  | Action | 現在のref / version | pin SHA | official source | advisory |
  |---|---|---|---|---|
  | `actions/checkout` | `v4.4.0` | `11d5960a326750d5838078e36cf38b85af677262` | `https://github.com/actions/checkout` | 公開advisoryなしを確認 |
  | `pnpm/action-setup` | `v4` | `b906affcce14559ad1aafd4ab0e942779e9f58b1` | `https://github.com/pnpm/action-setup` | 公開advisoryなしを確認 |
  | `actions/setup-node` | `v4.4.0` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | `https://github.com/actions/setup-node` | 公開advisoryなしを確認 |
  | `actions/setup-java` | `v5.7.0` | `b6effb05e454b25005698d916606bdc6ffcbf961` | `https://github.com/actions/setup-java` | 公開advisoryなし。旧v4はupstreamでdeprecatedのためsupport終了例外を適用 |
  | `actions/upload-artifact` | `v4.6.2` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | `https://github.com/actions/upload-artifact` | 公開advisoryなしを確認 |
  | `actions/download-artifact` | `v4.3.0` | `d3f86a106a0bac45b974a628896c90dbdf5c8093` | `https://github.com/actions/download-artifact` | `GHSA-cxww-7g56-2vh6` / CVE-2024-42471を確認。v4.3.0はpatched範囲 |
  | `actions/cache` | `v4.3.0` | `0057852bfaa89a56745cba8c7296529d2fc39830` | `https://github.com/actions/cache` | 公開advisoryなしを確認 |
  | `cloudflare/wrangler-action` | `v3` | `9acf94ace14e7dc412b076f2c5c20b8ce93c79cd` | `https://github.com/cloudflare/wrangler-action` | 公開advisoryなしを確認 |
  | `gradle/actions/setup-gradle` | `v4.4.3` | `ed408507eac070d1f99cc633dbcf757c94c7933a` | `https://github.com/gradle/actions` | 公開advisoryなしを確認 |
  | `actions/dependency-review-action` | `v5.0.0` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `https://github.com/actions/dependency-review-action` | 公開advisoryなしを確認 |

- Cloudflare / principal boundary:
  - Preview jobは`pull_request`、head repositoryが本Repository、authorが`dependabot[bot]`以外、`verify` / `build-automation` successの場合だけ起動する。fork / Dependabotはjob-level skippedでSecretを利用しない。同一Repositoryの通常PRでSecret不足ならcredential checkでfailする。
  - Production jobは`push`かつ`refs/heads/main`、`validate` / `build-production` successの場合だけ起動する。schedule / workflow_dispatchではProductionを起動しない。
  - Preview / Productionはいずれも `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、Pages project `ec-test-automation-store` を参照する。Token permission、resource scope、Token / project sharing、Preview credentialからProduction resourceへの影響、blast radiusはprovider / Owner側未確認。
  - direct collaboratorは `sella-roum` Write、repository ownerはAdmin。teamsは確認なし。write-enabled GitHub App installationとDeploy Keyはconnector 403で未確認。これらの情報からtrust classificationを推定していない。
- Security findings inventory:
  - Hardening差分起因: local diff / static review上、新規finding 0件。
  - RepositoryのCritical / High、Moderate / Low、Malware Alert、Secret scanning Alert: GitHub connector 403のため件数・ID・active状態を取得できず、0件とは判定していない。
  - upstream `download-artifact` advisoryはpatched SHAへ固定済み。activeまたはvalidity unknownのSecretを確認できていないため、revoke / rotateの完了も未確認。
- Formal quality gate:
  - `pnpm install --frozen-lockfile --ignore-scripts` => lockfile変更なし、依存をローカル解決。
  - `pnpm run format:check` => PASS。
  - `pnpm run lint:markdown` => PASS（287 files / 0 issues）。
  - `pnpm run verify` => PASS（format、markdown、spec、curriculum、lint error 0、typecheck、image manifest、security check、unit/integration/repository/web component/native component/contract tests、Web build、spec build）。Native componentは49/49、contractは392/392。lintの既存warningは64件、error 0。
  - `git diff --check` => PASS。
- Review note: 初回verifyで検出したCI contract test 2件は、今回変更したSHA pin / Preview event contractを旧期待値が参照していたため、`tests/contracts/ci-workflow.test.ts`を更新した。修正後の対象13/13および全contract 392/392を確認した。
- Next Action: diffベースself-review、PR-ready DoD判定、Run Artifact sanitizationを実施する。
- Progress: 75% (9/12)

## 2026-08-17 23:11 (JST)

- Summary: diffベースself-reviewを完了し、PR-ready条件と外部未完了境界を再確認した。
- Self-review result:
  1. SSOTにない機能（Renovate、Dependabot Version Updates、独自bot / dashboard / scanner、Environment、Merge Queue、CODEOWNERS、CodeQL Advanced / 独立workflow、独立Dependency Review workflow、auto-merge / auto-approve）は追加していない。
  2. `src/`、Native product code、教材、package manifest / lockfileは変更していない。変更はSecurity / contribution docs、既存workflow、CI contract test、Project Context / Run Artifactに限定した。
  3. dependency versionは更新していない。Actionはfull SHA pinのみで、`setup-java`だけupstream deprecatedによるsupport終了理由でv5へ更新した。
  4. top-level `permissions: contents: read`、Checkout `persist-credentials: false`、`verify.if: always()`、`validate.if: always()`を維持した。
  5. remote Action 91件はfull SHA、unpinned 0件。local reusable workflowはremote Actionと混同していない。
  6. Preview eligibilityは`github.event.pull_request.user.login`とhead repositoryで判定し、`github.actor`を使っていない。fork / DependabotはSecret不使用でskipped、normal same-repo PRはPreview successをvalidateが要求する。
  7. `validate`はskippedをsuccessと同一視せず、PR種別とpush / schedule / workflow_dispatchを別分岐で判定する。
  8. main前のGitHub Settings / Ruleset変更、commit / push / merge / PR作成、権限変更は実施していない。
  9. collaborator / App / Deploy Key / Cloudflare credential trustはroleやaccount名から推定していない。
- Command:
  - workflow / scope invariant static self-review => PASS（workflow 3件、remote uses 91件、unpinned 0件）。
  - `git diff --check` => PASS。
  - `git diff --name-only` と `git status --short` => Application / Native / 教材 / dependency manifestの変更なし。想定範囲外の変更なし。
- DoD classification:
  - PR-ready: Repository files、CI contract、SHA pin、permission invariant、local quality gate、Hardening差分起因finding 0件を確認済み。
  - Repository Hardening Complete: 未達。main反映後のSettings / Ruleset / PVR実動作 / CodeQL / Dependabot Security Updates / Cloudflare trust boundaryが未完了。
- Next Action: Run Artifactのsanitizer Write / Check、`run.json` / `evaluation.json`の最終化、最終報告を行う。
- Progress: 83% (10/12)

## 2026-08-17 23:13 (JST)

- Summary: Strict Run Artifactの最終構成とsanitizationを完了した。
- Completed:
  - `run.json` を `passed_with_warnings` / `completed`、validation command、warning、changed files、evaluation path付きへ更新した。
  - `evaluation.json` をschema準拠で追加し、PR-ready実装は成立、Phase 4 / Cloudflare trustは未完了という評価を記録した。
  - `scripts/validate-output-schema.py .codex/templates/evaluation.schema.json .codex/runs/20260817-222215-JST/evaluation.json` => PASS。
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260817-222215-JST -Write` => files_scanned 5、residual_findings 0。
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260817-222215-JST -Check` => residual_findings 0。
- Remaining:
  - B1: 修正版workflowがmainへ正規反映されるまで、Ruleset required check、Security settings、PVR、CodeQL、Dependabot Security Updatesは変更・完了判定しない。
  - B2: Cloudflare token permission / resource scope / sharing / blast radiusとwrite-capable principalのtrust classificationは未確認。Ownerの明示判断が必要。
- Next Action: ユーザー向け最終報告を行い、PR-readyとRepository Hardening Completeを分離して明示する。
- Progress: 92% (11/12)

## 2026-08-17 23:14 (JST)

- Summary: Public Repository Hardening のRepository変更をPR-readyとして確定した。
- Final classification:
  - PR-ready: 達成。
  - Repository Hardening Complete: 未達。main反映後にのみ実施するPhase 4と、Owner判断が必要なCloudflare trust boundaryを保留している。
- Final evidence:
  - `git diff --check` => PASS。
  - `python scripts/validate-output-schema.py .codex/templates/evaluation.schema.json .codex/runs/20260817-222215-JST/evaluation.json` => PASS。
  - `run.json` JSON parse => PASS。
  - `.github/dependabot.yml` => absent。
  - forbidden workflow tokens (`pull_request_target` / `self-hosted` / `github.actor` / unnecessary write permission) => absent。
- No external write: commit、push、merge、PR creation、GitHub Settings / Ruleset変更、collaborator / App / Deploy Key権限変更は行っていない。
- Required handoff:
  - 修正版workflowを正規手順でmainへ反映し、main上の `validate` を成功させる。
  - その後、実発行check-runのApp / integrationを確認し、`main-protection` required contextを `verify` から `validate`へ変更する。
  - GitHub Security / Actions / CodeQL / PVR / Dependabot Security Updatesの状態を権限付きで確認し、PVR reporter導線とnotificationを実動作確認する。
  - Cloudflare providerのToken permission / resource scope / sharing / blast radiusとwrite-capable principalを確認し、Ownerがtrust classificationとToken共有継続を明示判断する。
- Clarification: ここでの「PR-ready」はRepository file / CI差分がレビュー可能な状態を指す。GitHub Security Alertsを取得できないため、DoD Aの既存Critical / High、Moderate / Low、Malware、Secretの全件triage済みまでは証明できず、Security部分を含むDoD A全体は未確認とする。
- Progress: 100% (12/12)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 現時点で削除候補なし。

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |
