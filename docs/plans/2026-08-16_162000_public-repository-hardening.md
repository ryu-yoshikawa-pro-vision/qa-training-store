# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として、安全かつ継続的に運用できる状態へ整備する。

Application 機能や教材内容は変更せず、Public Repository の運用に直接必要な次の領域だけを対象とする。

- Dependency / Supply Chain Security
- Vulnerability / Malware / Secret Reporting
- Pull Request / Issue の標準化
- GitHub Actions の最小権限と Supply Chain Hardening
- Dependabot が生成する Security PR と CI の整合
- `main` の保護と Required CI の維持
- GitHub Security Settings
- README / CONTRIBUTING からの運用導線

Community Health File を網羅することや、依存 Package / GitHub Actions を常に最新版へ追従させることは目的としない。

## 2. Plan Status

- Status: Implementation-ready plan
- Plan-only: Yes
- Application Code Change: No
- PR Creation: この Plan 作成時点では行わない
- Baseline Branch: `main`
- Baseline Commit: `40a5042cb758370cbba643ee0341efc0042212a1`
- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Package Manager: `pnpm@9.10.0`
- Node.js Baseline: 24
- Reviewed GitHub State: 2026-08-16

実装開始時には最新 `main`、Open PR、GitHub Settings、Security Alerts を再取得する。

既に安全側へ設定済みの項目を後退させない。

この Plan は Repository 変更と GitHub Settings 変更を含むが、実装ブランチ上で勝手に `main` へ merge することを要求しない。

Repository Settings の変更権限がない実装者は、設定項目を完了扱いにせず、Owner Checklist として明示的に残す。

## 3. 現状認識

### 3.1 Repository 内

既存の主な運用ファイル:

- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `CODE_REVIEW.md`
- `AGENTS.md`
- `QA_AGENT.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

`package.json` には既に次が存在する。

- `packageManager: pnpm@9.10.0`
- `security:check`
- `verify`

今回の主な不足:

- `SECURITY.md`
- Private Vulnerability Reporting への明確な導線
- Pull Request Template
- Bug / Feature Issue Forms
- Issue chooser から Security Reporting への非公開導線
- Dependency Review の CI enforcement
- Dependabot Security PR と Cloudflare Preview Deployment の安全な共存
- GitHub Actions の full-length commit SHA pinning
- SHA-pinned GitHub Actions の Security Advisory 監視方針
- Dependabot Malware Alerts の確認
- GitHub Security Settings の最終確認
- README / CONTRIBUTING から Security / Contribution Flow への導線

`.github/dependabot.yml` は通常 Version Update を目的に追加しない。

### 3.2 GitHub Settings の確認済み状態

2026-08-16 時点で `main-protection` Ruleset は Active。

確認済み:

- Target: Default branch
- Restrict deletions: ON
- Block force pushes: ON
- Require linear history: ON
- Require pull request before merging: ON
- Required approvals: 0
- Require review thread resolution: ON
- Allowed merge method: Squash only
- Required status check: `verify`
- Require branches to be up to date: OFF
- Bypass: なし

Repository merge settings:

- Squash merge: ON
- Merge commit: OFF
- Rebase merge: OFF
- Automatically delete head branches: ON
- Web commit sign-off: OFF
- Auto-merge: OFF

今回これらを新規作成しない。実装時に Current State を再確認し、不足分だけ補完する。

### 3.3 Contribution Policy

現在の Pull Request creation policy は `collaborators_only`。

現時点の通常運用:

- Issue: Public contributor の入口
- Pull Request: Collaborator 中心
- Security vulnerability: Private Vulnerability Reporting

Fork PR の安全性は現在の主運用ではないが、将来 policy を変更しても Secret が露出しない Defense-in-depth として扱う。

## 4. 設計原則

### 4.1 Simple-first

GitHub 標準機能を優先し、独自 Bot、独自 Security Dashboard、Renovate、独自 Dependency 管理基盤を追加しない。

### 4.2 CI を品質判定の SSOT にする

自動判定できる品質条件を PR Template に重複記載しない。

Required CI は既存 aggregate job `verify` を中心に維持する。

### 4.3 Dependency は「必要だから更新する」

Version が新しいという理由だけでは更新しない。

Dependency Update を行う正当な理由:

1. 既知の脆弱性の修正
2. 利用中 Version の EOL / Support 終了
3. 実際に発生している Bug / Compatibility 問題
4. Expo / React Native / Playwright / Node.js 等の計画的な基盤更新
5. 新機能実装に必要な Dependency Requirement

Patch / Minor / Major のいずれでも、理由がなければ自動更新しない。

### 4.4 Security Update と Version Update を分離する

今回の方針:

- Dependency graph: ON / 維持
- Dependabot alerts: ON / 維持
- Dependabot Malware Alerts: ON / 維持
- Dependabot Security Updates の Repository-wide toggle: OFF
- Custom Auto-triage Rule: Moderate / High / Critical かつ修正版が利用可能な Package vulnerability だけ Security PR 化
- Dependabot version updates: OFF
- `.github/dependabot.yml`: 追加しない

Low severity は Alert として可視化するが、自動 PR 化しない。

これにより、Dependency Review の Required Gate と Security PR 自動生成の閾値を `moderate` 以上で揃える。

Custom Auto-triage Rule の「Pull Requestを開く」Actionが実装時点の Repository / Plan で利用できない場合は、Dependabot Security Updates を一括 ON に戻さない。

その場合は次とする。

- Alerts / Malware Alerts は ON
- Moderate 以上の fix available finding を手動 Triage
- 必要なものだけ Security Update PR を作成
- 利用不能理由を Owner Checklist に記録

### 4.5 Secret を増やさない

Dependabot PR や Fork PR の Preview Deploy のためだけに Cloudflare Credential を Dependabot Secrets 等へ複製しない。

Secret を利用できない信頼境界では、Secret を必要とする処理だけを実行対象外とする。

コード品質、テスト、Build、Dependency Review は維持する。

### 4.6 Preview eligibility と Secret availability を分離する

Preview eligibility は PR 自体の属性で判定する。

Primary condition:

```text
pull_request
AND pull_request.head.repo.full_name == github.repository
AND pull_request.user.login != dependabot[bot]
```

追加防御として `github.actor != 'dependabot[bot]'` も併用する。

概念上の条件:

```yaml
${{
  github.event_name == 'pull_request' &&
  github.event.pull_request.head.repo.full_name == github.repository &&
  github.event.pull_request.user.login != 'dependabot[bot]' &&
  github.actor != 'dependabot[bot]'
}}
```

PR author を Primary trust classification とし、`github.actor` 単独では判定しない。

Preview eligible な通常 same-repo PR では Cloudflare Credentials を必須とし、欠落時は Fail する。

Preview ineligible:

- Dependabot PR
- Fork PR
- Pull Request 以外の Event

これらでは `deploy-preview` の Skip を正常状態とする。

### 4.7 Public Repository の外部入力を信頼しない

PR / Issue / Dependabot / Fork 由来の値を shell script 本文へ直接埋め込まない。

必要な context は `env` 経由で渡す。

`pull_request_target` と untrusted head code を組み合わせて Secret を利用しない。

### 4.8 GitHub Actions は immutable reference を優先する

`.github/workflows/**` の remote `uses:` は full-length commit SHA へ pin する。

対象例:

- `actions/checkout`
- `actions/setup-node`
- `actions/upload-artifact`
- `actions/download-artifact`
- `actions/setup-java`
- `pnpm/action-setup`
- `cloudflare/wrangler-action`
- 実装時 Inventory で確認されたその他 remote Action / reusable workflow

SHA pinning は Version Update ではない。

既存 Action は、現在参照している tag が実装時点で指している commit を確認し、その commit を固定する。

勝手に Major / Minor / Patch を上げない。

Human-readable comment は可能な限り exact release tag を残す。

```yaml
uses: actions/checkout@<full-commit-sha> # v4.2.2
```

exact release tag を一意に特定できない場合は、解決元 tag と解決日など、後から追跡できる根拠を残す。

新規 Dependency Review Action だけは、実装時点の official supported major を選び、full SHA へ pin する。

### 4.9 SHA-pinned Actions は Package Dependencies と別に監視する

GitHub Actionsをfull SHAへpinすると、GitHub標準のDependabot AlertだけをAction脆弱性監視のSSOTとして期待できない。

そのため監視経路を分離する。

Package dependency:

```text
Dependency graph
→ Dependabot Alerts / Malware Alerts
→ Moderate以上かつfix availableのみSecurity PR
→ Dependency Review
```

GitHub Actions:

```text
full SHA pin
→ 採用時 / 変更時にGitHub Advisory Database・公式Security情報を確認
→ Security-only定期確認
→ 該当Advisoryがあればminimum patched releaseのSHAへ更新
```

Action の更新理由は Security Advisory、Runtime / Runner deprecation、Compatibility issue 等に限定し、最新版追従は行わない。

Security-only 定期確認は少なくとも月1回を目安とし、GitHub Actionsを更新するための定期作業ではなく、現在pinしているSHAに既知の問題がないかを確認する作業とする。

今回、独自 scheduled scanner workflow は追加しない。

### 4.10 Security Scanner の結果を同じ尺度で扱わない

- Dependabot / CodeQL: vulnerability severity で判断
- Malware Alert: 悪意あるPackageの利用有無で判断
- Secret scanning: credential の有効性と漏えい影響で判断

有効または有効性不明の credential leak は Severity に関係なく優先対応する。

### 4.11 不要な Community File を増やさない

対象外:

- `LICENSE`
- `CODEOWNERS`
- `CODE_OF_CONDUCT.md`
- `SUPPORT.md`
- `GOVERNANCE.md`
- `CITATION.cff`
- `.github/FUNDING.yml`
- Renovate
- 独立した CodeQL Workflow
- 独立した Dependency Review Workflow

## 5. Target State

```text
.github/
├── pull_request_template.md
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── feature_request.yml
│   └── config.yml
└── workflows/
    ├── ci.yml
    ├── native-ci.yml
    └── native-ios-ci.yml

SECURITY.md
README.md
CONTRIBUTING.md
CODE_REVIEW.md              # 既存記載と矛盾する場合だけ最小修正
```

`.github/dependabot.yml` は追加しない。

## 6. Canonical Decisions

### D-01: Dependabot Security Updates の一括ONは使用しない

Repository-wide `Dependabot security updates` toggle は OFF を維持する。

理由:

- fix可能なLow severityまで自動PR化する可能性を避ける
- 「必要な更新だけ行う」方針を維持する
- Dependency Reviewの`moderate` thresholdと整合させる

Package vulnerabilityのSecurity PR自動化はCustom Auto-triage Ruleを使用する。

Rule intent:

```text
severity in [moderate, high, critical]
AND patched version / fix available
→ open Dependabot security pull request
```

Rule作成時は、既存Alertに対してどのように適用されるかを確認してからActiveにする。

### D-02: Version Updates は自動化しない

実施しない:

- npm / pnpm weekly updates
- GitHub Actions weekly updates
- Major / Minor / Patch の無条件更新
- Dependabot auto-merge
- 自動 Approve

### D-03: 計画的Dependency Updateは通常変更として扱う

Security以外の更新時に確認する。

- 更新理由
- Release Notes / Breaking Changes
- Lockfile差分
- Expo / React Native compatibility
- Build
- Unit / Integration / Component / Contract Test
- Web E2E
- 必要に応じNative Build / Runtime Test

### D-04: Security ReportはPrivate Vulnerability ReportingをPrimaryにする

`SECURITY.md`:

- current `main` / latest deployment を基本supported scopeとする
- Public Issue / PRにvulnerabilityを投稿しない
- Private Vulnerability Reportingを案内
- 個人メールアドレスを公開しない
- 固定SLAを約束しない
- Summary / reproduction / impact / environment / evidence を案内

PVRがSettings側で無効なままなのに、文書だけで利用可能に見せない。

### D-05: PVRの通知経路まで確認する

Owner operational checkとして次を確認する。

- Private Vulnerability Reporting: ON
- Repository / Security alert notifications が受信可能
- Web / Email等、実際に確認できる通知経路がある

通知経路の確認不能をPVR有効化済みだけで完了扱いにしない。

### D-06: Issue chooserからSecurity Reportingへ直接誘導する

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability
    url: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/security/advisories/new
    about: Do not report security vulnerabilities in a public issue.
```

実装時およびdefault branch反映後に、PVRの実際の入口URLとして機能することを確認する。

利用不能なら誤ったリンクを残さず、GitHub UIで正しいRepository-scoped entry pointを確認して修正する。

### D-07: Dependency Reviewは既存`ci.yml`へ統合する

新規Workflowを増やさず、`.github/workflows/ci.yml`に`dependency-review` jobを追加する。

実装時にcurrent supported major / Runner requirementを再確認し、full SHAへpinする。

Policy:

```yaml
with:
  vulnerability-check: true
  fail-on-severity: moderate
  fail-on-scopes: runtime, development, unknown
  license-check: false
  show-openssf-scorecard: false
```

意図:

- Moderate / High / Criticalの新規導入をblock
- runtime / development / unknownを対象
- LowはRequired Gateではblockしない
- License policyは今回対象外
- OpenSSF Scorecardは今回対象外

### D-08: Dependency ReviewはPR EventだけRequired

`dependency-review`は`pull_request`のみ実行。

`verify` contract:

```text
pull_request
→ dependency-review == success

push / schedule / workflow_dispatch
→ dependency-review == skipped
```

`success OR skipped`の曖昧判定にしない。

### D-09: `verify`をRequired Quality Gateのaggregateとして維持

Ruleset Required checkは`verify`のみを維持する。

Dependency Reviewを`verify.needs`と結果判定へ追加する。

Preview Deploymentは`verify`後段のままにする。

### D-10: Preview trust classificationはPR authorをPrimaryにする

`deploy-preview` eligible:

- event == pull_request
- `github.event.pull_request.head.repo.full_name == github.repository`
- `github.event.pull_request.user.login != 'dependabot[bot]'`
- defense-in-depthとして`github.actor != 'dependabot[bot]'`
- `needs.verify.result == 'success'`
- `needs.build-automation.result == 'success'`

Secret存在はeligibilityに含めない。

### D-11: `validate` contractを明示する

```text
same-repo normal PR
→ deploy-preview success

Dependabot PR
→ deploy-preview skipped

fork PR
→ deploy-preview skipped

push / schedule / workflow_dispatch
→ deploy-preview skipped
```

通常PRの意図しないSkipをSuccess扱いしない。

### D-12: Dependabot PRへSecretを複製しない

Dependabot Security PRでも次は維持する。

- Format / Markdown lint
- Specification validation
- Lint
- Typecheck
- Static security check
- Unit / Integration / Repository / Component / Contract Test
- Build
- Required Playwright E2E
- Dependency Review
- `verify`

Cloudflare PreviewだけSkipする。

### D-13: `pull_request_target`でSecret制約を回避しない

Secret利用のためだけに`pull_request_target`でuntrusted head codeをCheckout / Executeしない。

### D-14: Pull Request Templateは説明標準化に限定

含める:

- 概要
- 変更内容
- Scope
- Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CIコマンドの巨大Checkboxリストは作らない。

### D-15: Bug Issue FormはQA再利用可能な形式

最低限:

- Summary
- Platform
- Environment / Browser
- Preconditions
- Reproduction Steps
- Expected Result
- Actual Result
- Reproducibility
- Evidence
- Additional Context

Platform:

- Web / Chromium
- Web / Firefox
- Web / WebKit
- Android
- iOS
- Other

Security vulnerability用ではないことを明記する。

### D-16: Feature RequestはProblem-first

最低限:

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

### D-17: CodeQLはDefault Setup

GitHub SettingsからDefault Setupを有効化する。

custom workflowは追加しない。

最低1回successful analysisを確認する。

### D-18: GitHub Actionsはfull SHAへpin

全remote `uses:`をInventoryしてfull SHAへpinする。

確認:

- expected owner / repository
- unused / unknown Actionがない
- `persist-credentials: false`を維持
- Secret Jobへ不要write permissionを追加しない
- exact release tagが特定できる場合はcommentへ記録
- 特定できない場合は解決元tag / 日付等の根拠を記録
- pinningだけを理由にAction Versionを変更しない

### D-19: SHA-pinned Actions向けSecurity Reviewを補完する

ActionをSHA pinしたことでDependabot Alertだけに依存できない前提とする。

実装時:

- 採用中の全remote Actionについて既知Security Advisoryを確認
- 現在pin予定のSHA / releaseが既知脆弱Versionに該当しないことを確認

継続運用:

- 少なくとも月1回security-only review
- WorkflowでActionを追加・変更するPRでは必ずadvisory review
- Security Advisory該当時だけminimum patched releaseのSHAへ更新

通常の最新版確認は目的にしない。

### D-20: Action SHA enforcementはdefault branch反映後

Repository Settingsにfull-length SHA requirementが利用可能なら、全Workflow pinningが`main`へ入った後にON。

利用不能でもworkflow file自体のSHA pinningは必須。

### D-21: Dependabot Malware Alertsを有効化する

npm / pnpm supply chain向けにMalware AlertsをON / 維持する。

Malware Alert発生時:

- 使用中Packageか確認
- 使用中なら除去または安全な代替へ変更
- 既に除去済みなら根拠を確認
- false positive扱いする場合は根拠を記録
- 自動Version Updateへ拡大しない

### D-22: Self-hosted runnerはPublic PR Workflowで使用しない

`.github/workflows/**`に`self-hosted` runnerがないことをInventoryで確認する。

### D-23: `main-protection`は既存設定を維持

維持期待値:

- PR required
- approvals 0
- conversation resolution required
- `verify` required
- strict branch update OFF
- linear history required
- deletion restricted
- force push blocked
- squash only
- bypassなし

### D-24: Actions default permissionはread-only

確認:

- Workflow permissions: Read repository contents and packages
- Allow GitHub Actions to create and approve pull requests: OFF

write権限が必要な場合は該当Workflow / Jobだけへ最小権限を明示する。

### D-25: Existing vulnerability findings

今回差分が原因:

- 今回修正

Existing Critical / High:

- 必ずTriage
- actual exposure / fix availability /対応判断を記録
- 未評価のままRepository Hardening完了にしない

Existing Moderate / Low:

- Triage
- 一括最新版化しない
- actual exposureと更新riskを比較

### D-26: Existing Secret scanning alerts

Active / validity unknown:

- 即時revoke / rotate
- GitHub Secrets等の正規参照先を更新
- 影響範囲確認
- 必要に応じaudit / access log確認

Revoked / expired:

- 無効である根拠を確認
- 適切な理由でresolve

False positive / test value:

- 根拠を確認してresolve

Git history rewriteはrevoke / rotateより優先しない。

### D-27: Existing Malware Alerts

Alertがある場合:

- Package / Version
- direct / transitive
- 実際の利用有無
- 除去 / 代替方針
- resolution reason

を確認する。

使用中のmalicious dependencyを未評価のまま完了扱いにしない。

## 7. Implementation Waves

### Wave 0: Rebaseline / Inventory

実施:

1. 最新`main` HEAD取得
2. Open PR /競合確認
3. Repository files再確認
4. `.github/workflows/**`全`uses:` Inventory
5. self-hosted runner不在確認
6. Settings Current State確認
   - Ruleset / merge settings
   - PR creation policy
   - Actions permissions
   - Actions SHA enforcement availability
   - Dependency graph
   - Dependabot Alerts
   - Dependabot Malware Alerts
   - Dependabot Security Updates toggle
   - Custom Auto-triage Rules availability / current rules
   - Private Vulnerability Reporting
   - Secret scanning / Push protection
   - CodeQL
7. Existing Dependabot Alerts記録
8. Existing Malware Alerts記録
9. Existing Secret scanning alerts記録
10. PVR notification state確認可能性を確認

Exit:

- Repository変更とSettings変更のGapが確定
- Current Rulesetを再作成しないことを確認
- Version Update非自動化を維持
- Action pinning対象を列挙
- vulnerability / malware / secret findingsの初期状態を記録

### Wave 1: Security Reporting / Contribution Entry Point

追加:

- `SECURITY.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

`config.yml`:

- `blank_issues_enabled: false`
- PVRへの`contact_links`

Security vulnerabilityをPublic Issueへ誘導しない。

Exit:

- Security / Bug / Feature入口が分離
- Security contact linkがRepository-scoped PVR URLを指す
- PR Templateが既存レビュー運用と矛盾しない

### Wave 2: GitHub Actions / Supply Chain Hardening

1. 全remote Action Inventory
2. Existing Actionをcurrent effective commitのfull SHAへpin
3. exact release tagまたは解決根拠を記録
4. 採用ActionのSecurity Advisory確認
5. `dependency-review`を`ci.yml`へ追加
6. Dependency Reviewを`verify`へ統合

Dependency Review:

```yaml
with:
  vulnerability-check: true
  fail-on-severity: moderate
  fail-on-scopes: runtime, development, unknown
  license-check: false
  show-openssf-scorecard: false
```

Exit:

- 全remote Actionがfull SHA
- 不要なAction Version Updateなし
- pinning根拠が追跡可能
- pin時点の既知Action Advisory確認済み
- Dependency Reviewが`verify`に集約

### Wave 3: CI Trust Boundary / Preview Contract

`deploy-preview` eligibilityを修正する。

Primary:

- same repository PR
- PR author != `dependabot[bot]`

Defense-in-depth:

- actor != `dependabot[bot]`

Dependabot / forkではPreview Skip。

通常same-repo PRではCloudflare Secrets必須。欠落はFail。

`validate`:

```text
normal same-repo PR → preview success
Dependabot PR → preview skipped
fork PR → preview skipped
non-PR → preview skipped
```

Untrusted contextはshellへ直接埋め込まない。

Exit:

- Dependabot PRがSecret不足だけで失敗しない
- normal PRのPreview regressionを検出
- `pull_request_target`未導入
- Required Quality Gate維持

### Wave 4: Documentation Alignment

README:

- `CONTRIBUTING.md`
- `SECURITY.md`
- Security vulnerabilityをPublic Issueへ投稿しない旨

CONTRIBUTING:

- PR Template利用
- Bug / Feature Forms利用
- Securityは`SECURITY.md`
- Dependency Updateは理由必須
- PR policyは`collaborators_only`
- GitHub Actionsはfull SHA pin
- Action変更時はSecurity Advisory確認
- Security理由以外の定期最新版追従をしない

CODE_REVIEW:

- 既存記載と矛盾する場合だけ最小修正

Exit:

- README / CONTRIBUTING / Template / Security Policyが整合
- Action security review policyのSSOTが明確

### Wave 5: Pre-merge Settings Hardening

default branch反映前でも安全に有効化できるものだけ扱う。

確認 / 有効化:

- Dependency graph
- Dependabot Alerts
- Dependabot Malware Alerts
- Private Vulnerability Reporting
- Secret scanning
- Push protection
- CodeQL Default Setup
- Actions default permission read-only
- Actions create / approve PR OFF

このWaveでは次を実施しない。

- Repository-wide Dependabot Security Updates ON
- Moderate以上Security PRを生成するCustom Auto-triage RuleのActive化
- Action SHA enforcement ON

理由: Dependabot PRを生成する設定は、Dependabot-safe CIがdefault branchへ反映された後に有効化する。

Security validation:

- CodeQL最低1回successful
- vulnerability findings Triage
- Malware Alerts Triage
- Secret scanning alerts Triage
- Active / unknown credentialはrevoke / rotate
- PVR通知経路を確認、またはOwner Checklistへ残す

Exit:

- Pre-merge可能なSecurity Settingsが安全側
- PR生成系の設定はまだ未Active
- 未評価Secret / malicious packageを放置しない

### Wave 6: Pre-merge Validation

Local:

```bash
pnpm run verify
git diff --check
```

必要に応じWorkflow YAML / Issue Form YAMLの構文検証。

GitHub Actions実測:

Normal same-repo PR:

- Dependency Review success
- required CI success
- Preview success
- `verify` success
- `validate` success

Dependabot / untrusted相当:

- Preview skipped
- Dependency Review実行
- required tests / build実行
- `verify` contract確認
- `validate` contract確認

実際のDependabot PRを作るために脆弱Dependencyを導入しない。

Action pinning:

- tag-only remote `uses:`なし
- 40-char SHA
- exact tagまたは解決根拠あり
- workflow regressionなし
- 採用Actionの既知Advisory確認済み

Exit:

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- normal Preview PASS
- Dependabot / forkがSecretを要求しない契約確認
- Repository変更はPR-ready

この時点で実装者がDoD達成のため勝手にmergeしない。

### Wave 7: Default Branch反映後のActivation

Repository変更が正規手順で`main`へ反映された後だけ実施する。

#### 7.1 Default branch state check

確認:

- Dependabot-safe Preview condition
- PR author based classification
- updated `validate`
- Dependency Review → `verify`
- Action full SHA pinning
- `SECURITY.md` / Issue Forms / PR Template

#### 7.2 Package Security PR policyをActive化

Repository-wide Dependabot Security Updates toggleはOFFのまま。

Custom Auto-triage Ruleを作成 / Active化:

```text
Moderate / High / Critical
AND fix available
→ Dependabot Security PR
```

Active化直前にExisting Alerts件数と適用影響を確認する。

Rule機能が利用不能なら:

- Security Updates一括ONへフォールバックしない
- Moderate以上をmanual triage
- Owner Checklistへ制約記録

#### 7.3 Dependabot PR validation

Security PRが生成された場合:

- PR authorが`dependabot[bot]`
- Preview skipped
- Dependency Review / Required CI実行
- auto-mergeされない

生成されない場合:

- PR不在を失敗扱いしない
- PR author / actor conditionをStatic Review
- `validate` contractをStatic Review
- Required quality jobsをDependabot向けに無効化していないことを確認

#### 7.4 Action SHA enforcement

利用可能なら`main`の全Action pinning確認後にON。

#### 7.5 Repository UI / Security validation

確認:

- Issue Forms表示
- PR Template自動挿入
- Security tabから`SECURITY.md`
- Issue chooserのSecurity contact link
- Private Vulnerability Reporting利用可能
- PVR通知経路確認済み
- Dependabot Alerts ON
- Dependabot Malware Alerts ON
- Repository-wide Dependabot Security Updates OFF
- Custom Auto-triage Ruleが想定policy、または利用不能理由記録
- `.github/dependabot.yml`なし
- CodeQL successful
- Secret scanning / Push protection ON
- Ruleset active
- SHA enforcement ON、または利用不能理由記録

Exit:

- Package Security PR policyが`moderate`以上に限定
- Low severityの不要な自動PRを発生させない
- Dependabot PRが安全なCI contractで処理可能
- Settingsとdefault branchが整合

## 8. Finding Triage

### 8.1 Dependency / Code Vulnerability

Critical / High:

- Finding / Advisory ID
- affected Dependency / Code
- actual exposure
- fix availability
-対応判断

未評価のままRepository Hardening完了にしない。

Moderate:

- Custom Auto-triage Rule対象
- fix availableならSecurity PR候補
- 実利用 / regression riskを確認してmerge判断

Low:

- Alertとして確認
- 自動PR化しない
- actual exposure / fix riskで個別判断

### 8.2 Malware Alerts

確認:

- Package / Version
- direct / transitive
-実利用
- 除去 / 代替
- resolution reason

使用中のmalicious packageを未評価のまま残さない。

### 8.3 Secret scanning Alerts

Active / validity unknown:

- revoke / rotate
- GitHub Secrets等を更新
- 影響範囲確認
- 必要に応じaudit log

Revoked / expired:

- 根拠確認
- resolve

False positive / test value:

- 根拠確認
- resolve

Git history rewriteは第一選択にしない。

### 8.4 GitHub Actions Security Advisory

Actionごとに次を確認する。

- owner / repository
- pinned SHA
- exact release tag /解決根拠
- known advisory有無
- minimum patched release
-対応要否

該当時はminimum patched releaseのSHAへ更新し、通常のCIを完走する。

最新版へ一括更新しない。

## 9. Rollback / Failure Handling

### Dependency Reviewが不適切にblock

Rulesetを解除しない。

Severity / Scope / actual dependency / Advisoryを確認し、実測根拠がある場合だけ最小調整。

### Preview条件変更でnormal PRがDeployされない

Eligibilityを修正する。

Dependabot / forkへSecretを広げない。

normal PRのSecret不足をSkipへ弱体化しない。

### Action SHA pinningでWorkflow破損

SHA / owner / path / resolved tagを再確認。

安易にmovable tagへ戻さない。

### Auto-triage Ruleが想定外PRを大量生成

一括mergeしない。

Rule条件 / severity / fix availabilityを再確認。

必要ならRuleを一時停止して条件を修正する。

Repository-wide Security Updatesを代替としてONにしない。

### PVR contact linkが無効

GitHub UIで正しいRepository-scoped reporting entry pointを確認し修正する。

Public IssueへのSecurity報告をfallbackにしない。

### Secret leak

Alert closeよりcredential revoke / rotateを優先。

履歴改変は影響とGit safety policyを確認せず実施しない。

## 10. Non-goals

- `LICENSE`追加 /選定
- Dependency定期Version Update
- Dependency一括最新版化
- Dependabot Version Update PR
- Repository-wide Dependabot Security Updates ON
- Low severity vulnerabilityの自動PR化
- Dependabot auto-merge
- Renovate
- CODEOWNERS
- Code of Conduct
- Governance
- Support
- Funding
- 独自Security Dashboard
- 独自Dependency Bot
- GitHub Actions用独自scheduled advisory scanner
- Merge Queue
- Signed Commit強制
- CodeQL Advanced Setup
- Application Feature変更
- Native Feature変更
- OpenSSF Scorecards
- License policy enforcement
- テスト目的の既知脆弱Dependency導入
- Secret除去だけを目的とする無条件Git history rewrite

## 11. Definition of Done

PR-ready DoDとRepository Hardening DoDを分離する。

### 11.1 PR-ready Definition of Done

#### Repository Files

- `SECURITY.md`
- PR Template
- Bug / Feature Issue Forms
- Issue Template config
- Security contact link
- `.github/dependabot.yml`を不要に追加していない
- README / CONTRIBUTING整合
- CONTRIBUTINGが`collaborators_only`と整合
- Action security review policyが文書化

#### Dependency / Supply Chain

- Dependency ReviewがPR CIへ統合
- Moderate以上のruntime / development / unknownをblock
- License / OpenSSFはRequired Gate外
- Dependabot Version Updates設定なし
- Repository-wide Dependabot Security UpdatesをONにする変更なし

#### GitHub Actions

- 全remote `uses:` full SHA
- pinning理由だけのVersion Updateなし
- exact release tagまたは解決根拠あり
- 既知Action Advisory確認済み
- Public PRでself-hosted runnerなし
- `persist-credentials: false`維持

#### CI

- Dependency Review → `verify`
- PRでDependency Review success
- non-PRでskipped
- normal same-repo Preview success
- missing Cloudflare Secretはnormal PRでFail
- Dependabot / fork Preview skip
- PR author based Dependabot classification
- `validate`が正常 / ineligibleを区別
- `pull_request_target`未追加

#### Pre-merge Security Settings

権限がある場合:

- Dependency graph ON
- Dependabot Alerts ON
- Malware Alerts ON
- PVR ON
- Secret scanning ON
- Push protection ON
- CodeQL Default Setup ON
- Actions default permission read-only
- Actions create / approve PR OFF

この段階では:

- Repository-wide Security Updates OFF
- Auto-triage Security PR Rule未Active
- SHA enforcement未Active

Security findings:

- Critical / High vulnerability Triage済み
- Malware Alerts Triage済み
- Secret Alerts Triage済み
- Active / unknown credential revoke / rotate済み

権限不足はOwner Checklistへ残す。

#### Branch Protection

- `main-protection` Active
- PR required
- `verify` required
- force push blocked
- deletion restricted
- conversation resolution required
- linear history
- squash only
- strict OFF
- bypass追加なし

#### Quality

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- normal Preview PASS
- Action pinning regressionなし

ここまででRepository変更はレビュー / merge判断可能。

### 11.2 Repository Hardening Definition of Done

Default branch反映後に評価する。

#### Repository UI

- `SECURITY.md`をSecurity tabから参照可能
- Issue Forms表示
- PR Template自動挿入
- Security contact linkがPVRへ到達
- README / CONTRIBUTING整合

#### Package Supply Chain

- Dependency graph ON
- Dependabot Alerts ON
- Malware Alerts ON
- Repository-wide Dependabot Security Updates OFF
- Moderate / High / Critical + fix availableだけSecurity PR化するCustom Auto-triage RuleがActive
  - または機能利用不能理由とmanual fallbackがOwner Checklistに明示
- Version Updates設定なし
- Low severityの不要な自動PRなし

Security PRが生成された場合:

- PR author `dependabot[bot]`
- Preview skipped
- Dependency Review / Required CI実行
- auto-mergeなし

Security PRが生成されない場合:

- PR不在を失敗扱いしない
- Dependabot PR pathをStatic Review済み

#### GitHub Actions Supply Chain

- `main`上で全remote Action full SHA
- 全採用Actionの初回Advisory Review済み
- Security-only定期確認の運用方針が文書化
- SHA enforcement ON、または利用不能理由記録

#### Security

- PVR ON
- PVR通知経路確認済み
- Secret scanning ON
- Push protection ON
- CodeQL successful
- 未評価Critical / Highなし
- 未評価Malware Alertなし
- 未評価Secret Alertなし
- Active / unknown leaked credentialなし

#### Branch / Merge Protection

- `main-protection` Active
- PR required
- `verify` required
- force push blocked
- deletion restricted
- conversation resolution required
- linear history
- squash only
- strict OFF
- bypass追加なし

#### Final Consistency

- GitHub Settingsとdefault branchが整合
- 既存Application / QA behaviorに回帰なし
- 未完了Owner Checklistなし

## 12. 実装順序

1. 最新`main` / Open PR / Settings / AlertsをRebaseline
2. `SECURITY.md`
3. PR Template
4. Bug / Feature Issue Forms + config + PVR contact link
5. 全remote Action Inventory
6. 現在のeffective commitへfull SHA pin
7. exact release tag /解決根拠記録
8. 採用ActionのSecurity Advisory確認
9. Dependency Review追加
10. Dependency Review → `verify`
11. Preview eligibilityをPR author基準へ修正
12. `validate` contract修正
13. README / CONTRIBUTING /必要なCODE_REVIEW整合
14. Pre-merge Security Settings確認 /有効化
15. CodeQL / vulnerability / malware / secret findings Triage
16. PVR通知経路を確認、またはOwner Checklist化
17. `pnpm run verify` / `git diff --check` / PR CI完走
18. PR-ready DoD確認
19. 正規運用でdefault branchへ反映
20. default branchのDependabot-safe / SHA-pinned状態再確認
21. Repository-wide Dependabot Security UpdatesがOFFであることを確認
22. Moderate以上 + fix availableのCustom Auto-triage RuleをActive化
23. Security PRが生成された場合はCI contractを実測、なければStatic Review
24. 利用可能ならAction SHA enforcementをON
25. Issue Forms / PR Template / PVR contact link / Security Settings実状態確認
26. PVR通知経路最終確認
27. Critical / High / Malware / Secret findingsの未評価なしを確認
28. Repository Hardening DoDを満たして完了

この順序により、不要なVersion Updateを導入せず、Package vulnerabilityは必要なseverityだけ自動PR化し、GitHub ActionsはimmutableなSHA pinningを維持しながらSecurity Advisoryを別経路で監視する。