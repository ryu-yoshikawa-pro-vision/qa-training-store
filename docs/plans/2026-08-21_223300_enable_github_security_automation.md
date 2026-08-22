# GitHub Security Automation 実行・検証計画

## 1. 目的

`qa-training-store` で、既存の Public Repository Hardening 方針に従い、GitHub 標準 Security 機能の未完了設定を有効化・検証する。

今回のゴール:

- 既知脆弱性がある依存関係は Dependabot Security Updates の対象とし、修正可能なら Security PR を自動作成する
- 脆弱性のない通常 Version Update PR は自動作成しない
- Dependency Review で新しい脆弱な依存関係の混入を防ぐ
- Secret scanning / Push protection / CodeQL / PVR を有効化・確認する
- Security PR を自動 approve / merge しない
- `main-protection` を既存 Hardening 方針どおりの最終状態にする

独自 Security Bot、独自 scanner、Renovate、独自 auto-merge workflow は追加しない。

---

## 2. SSOT / Scope

Security 方針の正本は次とする。

- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

本 Plan は SSOT のうち、Repository Settings、Ruleset、初回 scan / alert / Security PR の確認を実行するための Follow-up Plan である。

SSOT と矛盾する場合は SSOT を優先する。

### 今回変更しないもの

- `.github/dependabot.yml` は追加しない
- Dependabot Version Updates は有効化しない
- Grouped security updates は今回の必須設定としない
- CodeQL Advanced Setup / 独自 CodeQL Workflow は追加しない
- Application code / package dependency は原則変更しない
- 既存 finding の remediation は原則別 Security fix PR で扱う

### GitHub Actions の扱い

Repository の remote Actions は SSOT に従って full SHA pin を維持する。

SHA-pinned GitHub Actions では Dependabot Alert / Security PR を監視手段として期待しない。Action の脆弱性確認は SSOT P-09 の Advisory Review 方針に従う。

---

## 3. Plan Status

- Status: Completed
- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Baseline Branch: `main`
- Baseline Commit: `314a8f958072f19e672e3bc37089558d74e42feb`
- Implementation Branch: `chore/enable-github-security-automation`
- Reviewed Date: 2026-08-22
- Repository Visibility: Public

Dependabot / CodeQL / Secret scanning / Push protection / PVR / Ruleset は Repository 全体へ即時反映される。

PR #39 の merge は Repository Settings 変更の前提条件とはしない。GitHub Repository Settings は Repository 全体へ即時反映されるため、本 Run では Target State の実設定と検証完了をもって `Completed` を判定する。PR #39 はその方針・実施結果・Evidence を `main` へ反映するための記録 PR として扱う。

Admin 専用設定は Owner/Admin のブラウザ確認を一次証跡とし、現 CLI／Chrome の Write 認証で一部 API を再取得できないこと自体は設定失敗と扱わない。必要な設定が実際に未実施で残る場合のみ `Blocked` とする。

---

## 4. Current State

現在の `main` には次が実装済みである。

- `SECURITY.md`
- PVR への報告導線
- `.github/workflows/ci.yml` の Dependency Review
- top-level `permissions: contents: read`
- remote Actions の full SHA pin
- Dependabot PR / fork PR では Cloudflare Preview deploy を実行しない contract
- `verify` / `validate` の aggregate 判定

`.github/dependabot.yml` は存在しない。この状態を維持する。

Dependabot Security Updates は `.github/dependabot.yml` なしで Repository Settings から有効化する。

2026-08-22 のレビュー時点では open Dependabot PR は 0 件だった。実装開始時に再確認する。

---

## 5. Target State / Implementation Record

この表を今回の設定一覧と実施記録に使う。

| Setting / Check | Target | Before | After / Evidence |
| --- | --- | --- | --- |
| Dependency graph | root dependencies が認識される | 未確認 | Completed — SBOM APIが成功し、`package.json` / `pnpm-lock.yaml`のnpm依存とGitHub Actions依存を認識 |
| Dependabot Alerts | ON | 未確認 | Completed — GraphQL `hasVulnerabilityAlertsEnabled=true`、UI `8 Open / 0 Closed` |
| Dependabot Security Updates | ON | 未確認 | Completed — Owner/Adminブラウザ確認、security-onlyのdynamic Dependabot workflowを再確認 |
| Dependabot Version Updates | 導入しない | 未確認 | Completed — `.github/dependabot.yml`なし、通常Version Update workflowなし、dynamic workflowはsecurity-only |
| `.github/dependabot.yml` | 存在しない | なし | Completed — `Test-Path .github/dependabot.yml` は `False` |
| Low-impact development auto-dismiss preset | OFF | 未確認 | Completed — Owner/AdminブラウザでOFFを確認。現open alertのdismiss metadataもnullで、機械的Reopenは未実施 |
| Dependabot Malware Alerts | ON | 未確認 | Completed — Owner/Adminブラウザ確認、Malware UI `0 Open / 0 Closed` |
| `Dismiss package malware alerts` preset | OFF | 未確認 | Completed — Owner/AdminブラウザでOFFを確認 |
| Dependabot auto-approve / auto-merge | なし | 未確認 | Completed — workflow検索で該当実装なし、open Dependabot PR 0件、Owner/Admin設定確認 |
| Secret scanning / Secret Protection | ON | 未確認 | Completed — Owner/AdminブラウザでONを確認。credential commit／pushの破壊的テストは未実施 |
| Push protection | ON | 未確認 | Completed — Owner/AdminブラウザでONを確認。実credentialを使ったテストは未実施 |
| CodeQL Default Setup | ON、JS/TS と Actions の初回解析成功 | 未確認 | Completed — 既存dynamic Default Setupを維持し、PR #39のJS/TS・Actions解析successを確認。独自workflow/SARIF/Advancedは追加・変更なし |
| Private Vulnerability Reporting | ON、Reporter 視点の導線確認 | 未確認 | Completed — API `enabled=true`、Security OverviewにEnabled、通常Reporter視点で`Report a vulnerability`導線を確認 |
| PVR notification | Owner / Admin が受信可能 | 未確認 | Completed — Owner/Adminブラウザで通知経路を確認。ダミー脆弱性レポートは送信していない |
| Actions permissions | default read-only、Actions の PR create / approve OFF | 未確認 | Completed — Owner/Adminブラウザで確認。既存top-level `contents: read`とCI実行時read-onlyも維持。現Write tokenではAdmin API再取得のみ不可 |
| `main-protection` | SSOT P-14 と一致 | 未確認 | Completed — active、`validate`のみ（GitHub Actions integration 15368）、PR/conversation resolution/linear history、deletion/non-fast-forward block、squash only、strict=false、bypassなし |

Low-impact development dependency を自動 dismiss する GitHub preset は、patch 可能な脆弱性を Security PR 対象から意図せず外さないため OFF とする。

過去にこの preset で auto-dismiss された alert があれば、未解消かつ現在も該当するものだけ再評価する。人間が根拠付きで dismiss したものや Fixed / false positive は機械的に Reopen しない。

---

## 6. 実装手順

### Phase 1: Preflight

設定変更前に次を確認する。

1. Implementation Branch と最新 `main` の差分。
2. `.github/dependabot.yml` が存在しない。
3. Dependency graph が `package.json` / `pnpm-lock.yaml` を認識している。
4. open Dependabot PR の有無と、存在する場合は Security / Version Update の別。
5. Dependency Review が SSOT P-04 の設定を維持している。
   - `vulnerability-check: true`
   - `fail-on-severity: moderate`
   - `fail-on-scopes: runtime, development, unknown`
   - `license-check: false`
   - `show-openssf-scorecard: false`
   - `comment-summary-in-pr: never`
6. Dependabot / fork PR で Cloudflare Preview が skipped になる contract が維持されている。
7. Dependabot向け auto-approve / auto-merge workflow がない。
8. `main-protection` の現在値を確認する。

Repository file に drift がなければ変更しない。

### Phase 2: Dependabot

1. Dependabot Alerts を ON。
2. `Dismiss low impact issues for development-scoped dependencies` preset を OFF。
3. 既存の auto-dismissed alert があれば必要なものだけ再評価する。
4. Dependabot Security Updates を ON。
5. Dependabot Malware Alerts を ON。
6. `Dismiss package malware alerts` preset が OFF であることを確認する。
7. `.github/dependabot.yml` を追加していないこと、Version Updates を有効化していないことを再確認する。
8. auto-approve / auto-merge がないことを確認する。

Security Updates 有効化後に Security PR が生成されても自動 merge しない。

Alert があっても patched version 不在や dependency conflict 等で Security PR が作成されない場合があるため、`Alert 数 = PR 数` は完了条件にしない。

Security Updates が ON なのに Security PR が想定どおり生成されない場合だけ、GitHub 側の paused 状態などをトラブルシュートする。

### Phase 3: Secret Protection

1. Secret scanning / Secret Protection を ON。
2. 既存 Secret alerts を確認する。
3. active / validity unknown の credential があれば revoke / rotate を最優先する。
4. Push protection を ON。

実 credential を commit / push するテストは行わない。

Git history rewrite は revoke / rotate より優先しない。

### Phase 4: CodeQL

1. 既存の Default Setup / Advanced Setup / SARIF upload の有無を確認する。
2. 競合がなければ CodeQL Default Setup を ON。
3. JavaScript / TypeScript と GitHub Actions (`actions`) の初回解析成功を確認する。
4. 既存設定と競合し、安全に移行できない場合は勝手に削除せず `Blocked` として理由を記録する。

今回の CodeQL は detect / alert / triage を目的とし、CodeQL check を Ruleset の Required status check に追加しない。

独自 `.github/workflows/codeql.yml` は追加しない。

### Phase 5: PVR / Actions

1. Private Vulnerability Reporting を ON。
2. 非Admin / 通常Reporter視点で `Report a vulnerability` 導線が表示されることを確認する。
3. `SECURITY.md` と実 UI の整合を確認する。
4. Repository Owner / Admin が PVR notification を受信できる設定を確認する。
5. Actions default workflow permission が read-only であることを確認する。
6. Actions による PR create / approve が OFF であることを確認する。

PVR確認のためだけにダミー脆弱性レポートを送信しない。

### Phase 6: Ruleset

`main-protection` は SSOT P-14 の最終状態へ合わせる。

特に次を確認する。

- PR required
- Required status check は `validate` のみ
- expected source は GitHub Actions
- `verify` は Required にしない
- conversation resolution / linear history を維持
- force push / deletion を block
- squash only
- strict branch update OFF
- bypass なし

`validate` が `main` で正常に成功し、発行元が GitHub Actions であることを確認してから Ruleset を変更する。

変更後は通常の same-repo PR で、`validate` が pending / failure の間は merge が block され、success 後にその block が解除されることを一度確認する。

---

## 7. Validation / Finding Handling

### Dependabot Security PR

Security PR が生成された場合は次を確認する。

- author が `dependabot[bot]`
- Security Update であり通常 Version Update ではない
- 対応する alert / advisory がある
- Dependency Review と既存 CI が実行される
- Cloudflare Preview は skipped
- `verify` / `validate` が想定どおり
- 自動 approve / merge されない

生成済みの Dependabot Security PR がある場合は、その PR を dependency remediation の原則経路とし、本 Branch で同じ dependency を重複更新しない。

### Findings

Finding の扱いは SSOT P-13 に従う。

最低限、次を未評価のまま完了にしない。

- Critical / High dependency / CodeQL finding
- Malware Alert
- active / validity unknown Secret Alert

既存 Application code / dependency の remediation は原則別 Security fix PR とする。

この Branch 自身の変更が新しい finding を発生させた場合だけ、今回変更した範囲で修正する。

### Existing Dependabot High Triage（SSOT P-13）

2026-08-22 に Dependabot Alert API、`pnpm-lock.yaml`、`package.json`、`pnpm why` の結果を突合した。API の `dependency.scope` は8件とも `runtime` だが、lockfile の実際の root 経路では全件が package.json の直接依存ではなく、Jest／Expo／Metro／PostCSS 等の transitive tooling である。Alert の dismiss metadata は8件すべて `null` で、機械的な dismiss／reopen は行っていない。

| Advisory / Finding ID | Dependency | Direct / Transitive | Severity | Actual Exposure | Fix Availability | Dependabot Security PR | Decision / Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alert #2 — GHSA-mh99-v99m-4gvg / CVE-2026-14257 | `brace-expansion@1.1.16` | Transitive。`@react-native/jest-preset`／`@testing-library/react-native` → Jest／`test-exclude` → `minimatch`。package.jsonに直接記載なし | High | Development／test toolingのみ。悪意ある brace pattern による展開長増大・OOM が条件。アプリ実行時の直接 import／user input 経路は確認されない | 現在 `1.1.16`、vulnerable range `< 1.1.17`、first patched `1.1.17`。後発 #3 のため effective target は `>= 1.1.18` | `security_update_not_possible`。open PRなし | `Follow-up: dependency remediation用の別Security fix PR / Planを作成する`。今回のPRでは更新しない |
| Alert #3 — GHSA-rgw5-rvv9-x895 / CVE-2026-69152 | `brace-expansion@1.1.16` | Transitive。同じ Jest／`test-exclude` → `minimatch` の development chain | High | Development／test toolingのみ。unbounded intermediate arrays による DoS が条件。アプリ実行時の直接 import／user input 経路は確認されない | 現在 `1.1.16`、vulnerable range `< 1.1.18`、first patched `1.1.18` | `security_update_not_possible`。open PRなし | `Follow-up: dependency remediation用の別Security fix PR / Planを作成する`。今回のPRでは更新しない |
| Alert #4 — GHSA-rgw5-rvv9-x895 / CVE-2026-69152 | `brace-expansion@5.0.8` | Transitive。Expo CLI／config／glob → `minimatch`。root dependencyのExpoから参照されるbuild／prebuild chain | High | Dependabot metadataはruntimeだが、実利用はExpoのbuild／config tooling。悪意ある brace pattern がCLI／config処理へ入る場合のDoSが条件で、アプリruntimeの直接 import は確認されない | 現在 `5.0.8`、vulnerable range `>= 4.0.0, < 5.0.9`、first patched `5.0.9` | `security_update_not_possible`。open PRなし | `Follow-up: dependency remediation用の別Security fix PR / Planを作成する`。今回のPRでは更新しない |
| Alert #5 — GHSA-5p4m-2wfm-xmqj | `js-yaml@4.3.0` | Transitive。`@expo/xcpretty`／ESLint config chain。package.jsonに直接記載なし | High | Build／test toolingのみ。crafted `!!omap` YAMLによるquadratic CPUが条件。アプリruntimeの直接 import／user input 経路は確認されない | 現在 `4.3.0`、vulnerable range `>= 4.0.0, < 4.3.1`、first patched `4.3.1` | `security_update_not_possible`。open PRなし | `Follow-up: dependency remediation用の別Security fix PR / Planを作成する`。今回のPRでは更新しない |
| Alert #6 — GHSA-5p2g-fcmc-qvqq / CVE-2025-71329 | `image-size@1.2.1` | Transitive。Expo／React Native の Metro `0.84.4` → `image-size`。package.jsonに直接記載なし | High | Metroのbuild-time image parser。canonical product assetsはWebPで、repoの直接 import はない。JXL／HEIFのuntrusted inputが別のbuild経路へ到達する可能性は `Unknown / 要追加確認` とする | 現在 `1.2.1`、vulnerable range `<= 2.0.2`、first patched versionはAPI上 `null` | `no patched version`。open PRなし | `Follow-up: upstream／dependency-chainの修正版を追跡し、別Security fix PRで対応する`。今回override／更新はしない |
| Alert #7 — GHSA-w3rx-r6r6-pgpr / CVE-2025-71330 | `image-size@1.2.1` | Transitive。Expo／React Native の Metro `0.84.4` → `image-size`。package.jsonに直接記載なし | High | Metroのbuild-time image parser。canonical product assetsはWebPで、ICNSのrepo直接利用は確認されない。untrusted ICNS inputが別のbuild経路へ到達する可能性は `Unknown / 要追加確認` とする | 現在 `1.2.1`、vulnerable range `<= 2.0.2`、first patched versionはAPI上 `null` | `no patched version`。open PRなし | `Follow-up: upstream／dependency-chainの修正版を追跡し、別Security fix PRで対応する`。今回override／更新はしない |
| Alert #8 — GHSA-2v37-7h3g-55p8 / CVE-2026-67213 | `nanoid@3.3.16` | Transitive。Expo Metro config／PostCSS、およびVitest／Viteのdevelopment chain。package.jsonに直接記載なし | High | Build／development tooling。zero-size custom generatorの呼出しが無限loop条件。repoに直接 import／該当API呼出しは確認されない | 現在 `3.3.16`、vulnerable range `< 3.3.18`、first patched `3.3.18` | `security_update_not_possible`。open PRなし | `Follow-up: dependency remediation用の別Security fix PR / Planを作成する`。今回のPRでは更新しない |

### Existing Dependabot Moderate Inventory（SSOT P-13）

| Advisory / Finding ID | Dependency | Severity | 対象概要 |
| --- | --- | --- | --- |
| Alert #1 — GHSA-w5hq-g745-h8pq / CVE-2026-41907 | `uuid@7.0.3`（transitive、Expo config／`xcode` build／prebuild tooling） | Moderate | buf指定時のv3/v5/v6 bounds check不足。package.jsonに直接 importはなく、アプリruntimeではなくbuild／prebuild経路。first patched `11.1.1`、open PRなし。別Security fixで扱う |

High 7件とModerate 1件は本Runの記録修正前から存在し、今回のPlan／Run Artifact変更が新たなfindingを発生させたものではない。`security_update_not_possible` は設定失敗ではなく、依存制約による別Security fix PR／Planの対象として扱う。依存関係、lockfile、application codeは今回変更しない。

### Validation command

Plan / docs のみ変更した場合:

- `pnpm run lint:markdown`
- `git diff --check`

Workflow を変更した場合のみ、該当する CI contract test / targeted test を追加実行する。

`pnpm run verify` は影響範囲が広い変更、または既存Repository方針上必要な場合だけ実行する。

---

## 8. Definition of Done / Result Record

### Configuration

次をすべて満たす。

- Section 5 の Target State が確認済み
- `.github/dependabot.yml` なし
- Dependabot Security Updates ON
- 通常 Version Updates は未導入
- low-impact development auto-dismiss preset OFF
- Malware Alerts ON / malware auto-dismiss OFF
- Security PR の auto-approve / auto-merge なし
- Secret scanning / Push protection ON
- CodeQL Default Setup の JS/TS / Actions 初回解析成功
- PVR ON、Reporter導線と通知経路確認済み
- Actions permission が安全側
- `main-protection` が SSOT P-14 と一致
- 通常 PR で `validate` の merge gate を実動作確認済み

### Findings

- 初回の Dependabot / Malware / Secret / CodeQL findings を確認済み
- SSOT P-13 に従って必要な triage / follow-up を記録済み
- active secret / malware 等、先に止めるべき問題を未評価のまま完了にしていない

### Final Status

次の3種類だけを使用する。

- `Completed`: 本 Plan の DoD を満たす
- `Pending`: 外部解析や実動作確認が未完了
- `Blocked`: Admin権限、CodeQL競合、重大Security finding等で続行できない

理由は別途 `Reason` に記録する。

`Completed` は本 Security Automation Plan の完了だけを意味し、SSOT の `Repository Hardening Complete` を自動的に意味しない。

### Final Record

| Item | Result / Evidence |
| --- | --- |
| Settings | Completed — Owner/Admin設定をブラウザで確認。現在のCLI／Chrome認証主体はWriteのため、Admin専用APIの再取得結果は403/404となる項目があるが、PVRはAPI/UI双方で`enabled`を再確認 |
| Dependabot Security PR | Completed — open PR 0件。High 7件は個別にP-13 triage済み。brace-expansion／js-yaml／nanoidは`security_update_not_possible`、image-size 2件は`no patched version`。設定失敗ではなく、依存制約またはupstream未修正による別Security fix PR / follow-upとして記録 |
| Security findings | Completed — Dependabot 8件（High 7、Moderate 1、open、dismiss metadataなし）をSection 7の表で個別整理。Malware 0 Open / 0 Closed、CodeQLは既存Medium 1件、Secret Protection設定と既存Alert確認をOwner/Adminブラウザで実施 |
| CodeQL initial analysis | Completed — PR #39の`Analyze (javascript-typescript)`、`Analyze (actions)`がsuccess。CodeQLをRuleset Requiredには追加していない |
| PVR / notification | Completed — `private-vulnerability-reporting.enabled=true`、Security OverviewのEnabled表示、通常Reporterの`Report a vulnerability`導線、Owner/Adminの通知経路を確認 |
| Ruleset / `validate` | Completed — PR #38で再実行を1回実施。実行中は`mergeStateStatus=BLOCKED`、`validate` success後は`CLEAN`。失敗履歴でも通常same-repo PRの`validate` failureを確認。`verify`はRequiredでない |
| Final Status | Completed |
| Reason / Follow-up | 設定・gate検証とP-13 triageは完了。既存Dependabot High 7件（patchedあり／なしを区別）、Moderate 1件、CodeQL findingは別Security fix / follow-upで扱う。PR #39のmergeは設定完了の前提条件としない |

---

## 9. 実装順序

1. 最新 `main` / CI / Settings / Ruleset を確認
2. Dependabot Security Settings を有効化
3. Secret scanning / Push protection を有効化
4. CodeQL Default Setup を有効化・初回解析確認
5. PVR / Actions permissions を確認
6. `main-protection` を SSOT P-14 へ合わせて実動作確認
7. 初回 Security PR / alerts / findings を確認・triage
8. Result Record を更新

最優先は、**通常 Version Update を発生させず、修正可能な既知脆弱性に対して Dependabot Security PR が自動生成される状態を成立させること**である。
