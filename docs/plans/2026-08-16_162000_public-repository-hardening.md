# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として、安全かつ継続的に運用できる状態へ整備する。

Application 機能や教材内容は変更せず、Public Repository の運用に直接必要な次の領域だけを対象とする。

- Dependency / Supply Chain Security
- Vulnerability / Malware / Secret Reporting
- Pull Request / Issue の標準化
- GitHub Actions の最小権限と Supply Chain Hardening
- Cloudflare Deployment Credential の trust boundary
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

実装開始時には最新 `main`、Open PR、GitHub Settings、Collaborator 権限、Security Alerts を再取得する。

既に安全側へ設定済みの項目を後退させない。

この Plan は Repository 変更と GitHub Settings 変更を含むが、実装ブランチ上で勝手に `main` へ merge することを要求しない。

Repository Settings の変更権限がない実装者は、設定項目を完了扱いにせず Owner Checklist へ残す。

Owner Checklist は次の2種類を明確に区別する。

- Open Action Item: 未完了なら Repository Hardening DoD を満たさない
- Accepted Platform Limitation: GitHub Plan / UI / provider 制約等で実施不能だが、理由・影響・fallback が記録済みなら DoD を妨げない

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
- Dependabot / Fork PR と Cloudflare Preview Deployment の安全な共存
- same-repo PR と Cloudflare Credential の trust boundary 明文化
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

### 3.3 Contribution / Collaborator Trust Boundary

現在の Pull Request creation policy は `collaborators_only`。

現時点の通常運用:

- Issue: Public contributor の入口
- Pull Request: Collaborator 中心
- Security vulnerability: Private Vulnerability Reporting

2026-08-16 の確認では Owner 以外にも Write 権限を持つ direct collaborator が存在し、GitHub Environments は未作成である。

現行 `ci.yml` は Preview と Production の Cloudflare Deployment で Repository Secrets を利用している。

したがって、次を暗黙前提にしてはならない。

```text
same-repo PR == 自動的に Secret を渡してよい trusted code
```

Repository への Write 権限を持つ主体は Workflow 自体を変更できるため、Cloudflare Credential を渡してよい trusted maintainer かどうかを明示的に確認する。

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

### 4.4 Package Security と Version Update を分離する

今回の方針:

- Dependency graph: ON / 維持
- Dependabot Alerts: ON / 維持
- Dependabot Malware Alerts: ON / 維持
- Repository-wide Dependabot Security Updates: OFF
- Dependabot Version Updates: OFF
- `.github/dependabot.yml`: 追加しない
- GitHub preset Auto-triage Rules: Current State を確認し、low-impact development dependency 用 preset は原則維持
- Custom Auto-triage Rule: preset 等で先に dismiss されていない Moderate / High / Critical かつ fix available の Package vulnerability を Security PR 化

重要なのは Dependency Review と Auto-triage の役割を混同しないことである。

```text
新規 Dependency 導入
→ Dependency Review
→ Moderate 以上を Required Gate で block

既存 Dependency Alert
→ GitHub preset / Custom Auto-triage
→ low-impact development finding は preset の判断を尊重
→ 残る Moderate / High / Critical + fix available を Security PR 候補化
```

したがって「全 Moderate 以上の既存 Alert が必ず PR 化される」とは定義しない。

Custom Auto-triage Rule の PR 作成 Action が利用不能な場合は Repository-wide Security Updates を一括 ON に戻さない。

その場合:

- Alerts / Malware Alerts は ON
- Moderate 以上の fix available finding を manual triage
- 必要なものだけ Security Update PR を作成
- 制約は Accepted Platform Limitation として理由・fallback を記録する

### 4.5 Deployment Secret の trust boundary を明示する

Dependabot PR / Fork PR のためだけに Cloudflare Credential を追加・複製しない。

同時に、same-repo PR も無条件には trust しない。

実装開始時に Write / Maintain / Admin 権限を持つ Collaborator を Inventory し、次を判断する。

#### 全 Write-capable Collaborator を trusted maintainer とみなせる場合

- same-repo normal PR の Preview Deployment を継続可能
- その trust decision を作業記録へ残す
- Cloudflare Token は provider 側で必要最小権限にする
- Preview / Production Credential の分離が実用的なら分離する
- Repository-level Secret を使い続ける場合も、その Secret を参照できる主体と blast radius を理解したうえで採用する

#### trusted maintainer とみなせない Write-capable Collaborator がいる場合

同じ Secret model のまま進めない。

まず次のいずれかを行う。

1. Repository 権限を必要最小限へ下げる
2. GitHub Environment + Required Reviewer 等で Secret 利用前の承認境界を設ける
3. Secret を使う PR Preview 自体をその主体には実行しない構成へ変更する

Environment は untrusted Write 権限そのものを安全にする代替ではない。Repository の code / merge 権限まで信頼できない主体に Write を残す場合は、その Repository governance 自体を先に見直す。

現在 Environments が0件であることから、Environment 導入は自動的な前提ではなく、Collaborator trust review の結果に応じた必要最小限の対策として扱う。

### 4.6 Preview eligibility と Secret availability を分離する

Cloudflare Credential を渡してよい Collaborator trust boundary が成立した後で、Preview eligibility を PR 属性から判定する。

Primary condition:

```text
pull_request
AND pull_request.head.repo.full_name == github.repository
AND pull_request.user.login != dependabot[bot]
```

追加防御:

```text
github.actor != dependabot[bot]
```

概念上:

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
- trust boundary 上 Preview を許可しない PR
- Pull Request 以外の Event

これらでは `deploy-preview` の Skip を正常状態とする。

GitHub Environment の Required Reviewer 方式を採用した場合は、対象 job が approval pending になることを別契約として扱い、`validate` が誤って success / skip と解釈しないよう設計する。

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
- その他 remote Action / reusable workflow

SHA pinning は Version Update ではない。

既存 Action は、現在参照している tag が実装時点で指している commit を確認し、その commit を固定する。

勝手に Major / Minor / Patch を上げない。

Human-readable comment は可能な限り exact release tag を残す。

```yaml
uses: actions/checkout@<full-commit-sha> # v4.2.2
```

exact release tag を一意に特定できない場合は、解決元 tag と解決日等の根拠を残す。

新規 Dependency Review Action だけは、実装時点の official supported major を選び full SHA へ pin する。

### 4.9 SHA-pinned Actions は Package Dependencies と別に監視する

GitHub Actions を full SHA へ pin した後は Dependabot Alert だけを Action 脆弱性監視の SSOT として期待しない。

監視経路:

```text
Package dependency
→ Dependency graph
→ Dependabot Alerts / Malware Alerts
→ Auto-triage / Dependency Review

GitHub Actions
→ full SHA pin
→ Action 採用時 / 変更時に Advisory Review
→ Repository の通常 Security Review の一部として定期確認
→ 該当 Advisory があれば minimum patched release の SHA へ更新
```

Action の更新理由は Security Advisory、Runtime / Runner deprecation、Compatibility issue 等に限定し、最新版追従を目的にしない。

固定の「月1回」SLAは設けない。

必須なのは次である。

- Hardening 実装時の初回確認
- Action 追加 / 変更 PR 時の確認
- Security Advisory / Incident を把握した際の確認
- 既存の Repository Security Review cadence がある場合、その中へ含める

今回、独自 scheduled advisory scanner workflow は追加しない。

### 4.10 Security Finding を同じ尺度で扱わない

- Dependabot / CodeQL: vulnerability severity と exposure で判断
- Malware Alert: malicious package の利用有無で判断
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

GitHub Environment は Collaborator trust review の結果、必要な場合だけ追加する。

## 6. Canonical Decisions

### D-01: Repository-wide Dependabot Security Updates は OFF を保証する

Repository-wide `Dependabot security updates` toggle は OFF とする。

実装開始時点で ON だった場合:

1. Current State を記録
2. 既に作成済みの Dependabot Security PR を Inventory
3. Repository-wide toggle を OFF に変更
4. 既存 Security PR は自動 close / merge せず個別 Triage
5. Custom Auto-triage Rule を Active にする前に OFF 状態を再確認

「ONにしない」だけではなく、「OFFであることを保証する」。

### D-02: GitHub preset Auto-triage Rule を尊重する

Public Repository で有効になっている GitHub preset / Custom Auto-triage Rules を Wave 0 で Inventory する。

low-impact development-scoped dependency 用の GitHub preset は、具体的な不都合が確認されない限り維持する。

Custom Security PR Rule は preset 等で先に dismiss されていない Alert に対して適用する。

想定 policy:

```text
GitHub preset により low-impact development finding として dismiss
→ 自動PR化しない

それ以外の Moderate / High / Critical
AND fix available
→ Dependabot Security PR
```

新規 Dependency 導入時は Auto-triage の dismiss policy に関係なく Dependency Review の `moderate` gate を維持する。

### D-03: Version Updates は自動化しない

実施しない:

- npm / pnpm weekly updates
- GitHub Actions weekly updates
- Major / Minor / Patch の無条件更新
- Dependabot auto-merge
- 自動 Approve

### D-04: 計画的 Dependency Update は通常変更として扱う

Security 以外の更新時に確認する。

- 更新理由
- Release Notes / Breaking Changes
- Lockfile 差分
- Expo / React Native compatibility
- Build
- Unit / Integration / Component / Contract Test
- Web E2E
- 必要に応じ Native Build / Runtime Test

### D-05: Security Report は Private Vulnerability Reporting を Primary にする

`SECURITY.md`:

- current `main` / latest deployment を基本 supported scope とする
- Public Issue / PR に vulnerability を投稿しない
- Private Vulnerability Reporting を案内
- 個人メールアドレスを公開しない
- 固定 SLA を約束しない
- Summary / reproduction / impact / environment / evidence を案内

PVR が Settings 側で無効なままなのに、文書だけで利用可能に見せない。

### D-06: PVR の通知経路まで確認する

Owner operational check:

- Private Vulnerability Reporting: ON
- Repository / Security notifications が受信可能
- Web / Email 等、実際に確認できる通知経路がある

通知確認不能なら Open Action Item とする。

### D-07: Issue chooser の Security link は Reporter 向け入口へ誘導する

`.github/ISSUE_TEMPLATE/config.yml` は次を基本とする。

```yaml
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability
    url: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/security
    about: Do not report security vulnerabilities in a public issue. Use "Report a vulnerability" from the Security page.
```

`/security/advisories/new` を Reporter 向けの固定入口として使用しない。

PVR 有効化後に、maintainer ではなく通常 Reporter 視点で `Report a vulnerability` 導線が利用できることを確認する。

GitHub がより安定した Repository-scoped Reporter URL を提供していることを実装時に確認できた場合のみ、そのURLへ置き換える。

### D-08: Dependency Review は既存 `ci.yml` へ統合する

新規 Workflow を増やさず `.github/workflows/ci.yml` に `dependency-review` job を追加する。

実装時に current supported major / Runner requirement を再確認し full SHA へ pin する。

```yaml
with:
  vulnerability-check: true
  fail-on-severity: moderate
  fail-on-scopes: runtime, development, unknown
  license-check: false
  show-openssf-scorecard: false
```

意図:

- Moderate / High / Critical の新規導入を block
- runtime / development / unknown を対象
- Low は Required Gate では block しない
- License / OpenSSF は今回の Required Gate 外

### D-09: Dependency Review は PR Event だけ Required

`dependency-review` は `pull_request` のみ実行する。

`verify` contract:

```text
pull_request
→ dependency-review == success

push / schedule / workflow_dispatch
→ dependency-review == skipped
```

`success OR skipped` の曖昧判定にしない。

### D-10: `verify` を Required Quality Gate の aggregate として維持

Ruleset Required check は `verify` のみを維持する。

Dependency Review を `verify.needs` と結果判定へ追加する。

Preview Deployment は `verify` 後段のままにする。

### D-11: Cloudflare Credential trust decision を先に行う

Preview condition 実装より先に Collaborator trust review を完了する。

記録する:

- Write / Maintain / Admin collaborator
- 各主体を Deployment Credential まで渡してよい trusted maintainer とみなすか
- 現在の Cloudflare Secret scope
- Preview / Production が同一 Credential を共有しているか
- Environment 採用要否
- Provider 側 least privilege の確認結果

全 Write-capable collaborator を trusted とみなせない場合は、現行 same-repo Secret model のまま Wave 3 を完了させない。

### D-12: Preview trust classification は PR author を Primary にする

Collaborator trust boundary が成立した場合の `deploy-preview` eligible:

- event == `pull_request`
- `github.event.pull_request.head.repo.full_name == github.repository`
- `github.event.pull_request.user.login != 'dependabot[bot]'`
- defense-in-depth として `github.actor != 'dependabot[bot]'`
- `needs.verify.result == 'success'`
- `needs.build-automation.result == 'success'`

Secret 存在は eligibility に含めない。

### D-13: `validate` contract を明示する

基本契約:

```text
trusted normal same-repo PR
→ deploy-preview success

Dependabot PR
→ deploy-preview skipped

fork PR
→ deploy-preview skipped

trust boundary 上 Preview 非許可の PR
→ deploy-preview skipped

push / schedule / workflow_dispatch
→ deploy-preview skipped
```

通常 trusted PR の意図しない Skip を Success 扱いしない。

Environment Required Reviewer を採用した場合は approval pending を別状態として設計し、上記 contract をそのまま流用しない。

### D-14: Dependabot / Fork PR へ Secret を複製しない

Dependabot Security PR でも次は維持する。

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

Cloudflare Preview だけ Skip する。

### D-15: `pull_request_target` で Secret 制約を回避しない

Secret 利用のためだけに `pull_request_target` で untrusted head code を Checkout / Execute しない。

### D-16: Pull Request Template は説明標準化に限定

含める:

- 概要
- 変更内容
- Scope
- Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CI コマンドの巨大 Checkbox リストは作らない。

### D-17: Bug Issue Form は QA 再利用可能な形式

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

Security vulnerability 用ではないことを明記する。

### D-18: Feature Request は Problem-first

最低限:

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

### D-19: CodeQL は Default Setup

GitHub Settings から Default Setup を有効化する。

custom workflow は追加しない。

最低1回 successful analysis を確認する。

### D-20: GitHub Actions は full SHA へ pin

全 remote `uses:` を Inventory して full SHA へ pin する。

確認:

- expected owner / repository
- unused / unknown Action がない
- `persist-credentials: false` を維持
- Secret Job へ不要 write permission を追加しない
- exact release tag が特定できる場合は comment へ記録
- 特定できない場合は解決元 tag / 日付等の根拠を記録
- pinning だけを理由に Action Version を変更しない

### D-21: SHA-pinned Actions 向け Security Review を補完する

実装時:

- 採用中の全 remote Action の既知 Security Advisory を確認
- pin 予定 SHA / release が既知脆弱 Version に該当しないことを確認

継続運用:

- Action 追加 / 変更 PR で advisory review
- Security Advisory / Incident 把握時に review
- Repository の通常 Security Review cadence に含める
- 該当時のみ minimum patched release の SHA へ更新

固定月次 SLA は設けない。

### D-22: Action SHA enforcement は default branch 反映後

Repository Settings に full-length SHA requirement が利用可能なら、全 Workflow pinning が `main` へ入った後に ON。

利用不能でも Workflow file 自体の SHA pinning は必須。

### D-23: Dependabot Malware Alerts を有効化する

npm / pnpm supply chain 向けに Malware Alerts を ON / 維持する。

Malware Alert 発生時:

- 使用中 Package か確認
- 使用中なら除去または安全な代替へ変更
- 既に除去済みなら根拠を確認
- false positive 扱いする場合は根拠を記録
- 自動 Version Update へ拡大しない

### D-24: Self-hosted runner は Public PR Workflow で使用しない

`.github/workflows/**` に `self-hosted` runner がないことを Inventory で確認する。

### D-25: `main-protection` は既存設定を維持

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
- bypass なし

Collaborator trust review の結果、Write 権限自体を信頼できない主体が存在する場合は approvals 0 を機械的に維持せず、Repository governance の別問題として見直す。

### D-26: Actions default permission は read-only

確認:

- Workflow permissions: Read repository contents and packages
- Allow GitHub Actions to create and approve pull requests: OFF

write 権限が必要な場合は該当 Workflow / Job だけへ最小権限を明示する。

### D-27: Existing vulnerability findings

今回差分が原因:

- 今回修正

Existing Critical / High:

- 必ず Triage
- actual exposure / fix availability / 対応判断を記録
- 未評価のまま Repository Hardening 完了にしない

Existing Moderate / Low:

- Triage
- preset / custom rule の適用結果を確認
- 一括最新版化しない
- actual exposure と更新 risk を比較

### D-28: Existing Secret scanning alerts

Active / validity unknown:

- 即時 revoke / rotate
- GitHub Secrets 等の正規参照先を更新
- 影響範囲確認
- 必要に応じ audit / access log 確認

Revoked / expired:

- 無効である根拠を確認
- 適切な理由で resolve

False positive / test value:

- 根拠を確認して resolve

Git history rewrite は revoke / rotate より優先しない。

### D-29: Existing Malware Alerts

Alert がある場合:

- Package / Version
- direct / transitive
- 実際の利用有無
- 除去 / 代替方針
- resolution reason

使用中の malicious dependency を未評価のまま完了扱いにしない。

### D-30: Owner Checklist の扱いを明確化する

#### Open Action Item

例:

- PVR通知確認未実施
- Active Secret Alert未対応
- Collaborator trust decision未確定
- Security Updates toggleをOFFにできていない

未完了なら Repository Hardening DoD は NG。

#### Accepted Platform Limitation

例:

- GitHub Plan上 Auto-triage PR Actionが利用不能
- SHA enforcement UIが利用不能

次が記録されていれば DoD を妨げない。

- 制約
- Security / Operation への影響
- fallback
- 確認日

## 7. Implementation Waves

### Wave 0: Rebaseline / Trust Inventory

実施:

1. 最新 `main` HEAD取得
2. Open PR / 競合確認
3. Repository files再確認
4. `.github/workflows/**` 全 `uses:` Inventory
5. self-hosted runner不在確認
6. Write / Maintain / Admin CollaboratorをInventory
7. Cloudflare Secret利用箇所とPreview / Production credential共有状態をInventory
8. GitHub Environments Current State確認
9. Settings Current State確認
   - Ruleset / merge settings
   - PR creation policy
   - Actions permissions
   - Actions SHA enforcement availability
   - Dependency graph
   - Dependabot Alerts
   - Dependabot Malware Alerts
   - Dependabot Security Updates toggle
   - GitHub preset Auto-triage Rules
   - Custom Auto-triage Rules
   - Private Vulnerability Reporting
   - Secret scanning / Push protection
   - CodeQL
10. Existing Dependabot Alerts記録
11. Existing Malware Alerts記録
12. Existing Secret scanning alerts記録
13. PVR notification state確認可能性を確認

Exit:

- Repository変更とSettings変更のGapが確定
- Current Rulesetを再作成しないことを確認
- Version Update非自動化を維持
- Action pinning対象を列挙
- vulnerability / malware / secret findingsの初期状態を記録
- Collaborator trust boundaryが確定、またはOpen Action Itemとして明示
- Cloudflare Credentialのblast radiusが把握できている

### Wave 1: Security Reporting / Contribution Entry Point

追加:

- `SECURITY.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

`config.yml`:

- `blank_issues_enabled: false`
- Repository Security pageへの Reporter向け `contact_links`

Security vulnerabilityをPublic Issueへ誘導しない。

Exit:

- Security / Bug / Feature入口が分離
- Security contact linkがRepository Security pageへ到達
- PVR有効化後のReporter向け導線検証方法が明確
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

Wave 0のCollaborator trust decisionを前提とする。

#### Trusted same-repo modelを継続する場合

`deploy-preview` eligibility:

- same repository PR
- PR author != `dependabot[bot]`
- actor != `dependabot[bot]`
- `verify` / build success

Dependabot / fork / trust boundary外PRではPreview Skip。

通常trusted same-repo PRではCloudflare Secrets必須。欠落はFail。

#### Environment approval modelが必要な場合

- Preview SecretをEnvironmentへ移す
- Required Reviewer等の保護を設定
- approval pendingのCI contractを明示
- SecretをRepository-levelへ複製して回避しない

#### `validate`

採用したtrust modelに応じて明示的に判定する。

基本:

```text
trusted normal same-repo PR → preview success
Dependabot PR → preview skipped
fork PR → preview skipped
trust boundary外PR → preview skipped
non-PR → preview skipped
```

Untrusted contextはshellへ直接埋め込まない。

Exit:

- Cloudflare Secretを受け取れる主体が明確
- Dependabot / forkがSecret不足だけで失敗しない
- trusted normal PRのPreview regressionを検出
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
- 定期最新版追従をしない

CODE_REVIEW:

- 既存記載と矛盾する場合だけ最小修正

Exit:

- README / CONTRIBUTING / Template / Security Policyが整合
- Action security review policyのSSOTが明確
- Deployment trust policyが必要な範囲で文書化されている

### Wave 5: Pre-merge Settings Hardening

default branch反映前でも安全に設定できるものだけ扱う。

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

Dependabot Security Updates:

- Current StateがONなら、既存Security PRをInventoryしてからOFF
- 既存PRは自動close / mergeしない
- Wave終了時点でOFFを保証

Auto-triage:

- GitHub preset RulesをInventory
- low-impact development presetは原則維持
- Security PR Custom RuleはまだActive化しない

SHA enforcement:

- まだONにしない

Security validation:

- CodeQL最低1回successful
- vulnerability findings Triage
- Malware Alerts Triage
- Secret scanning alerts Triage
- Active / unknown credentialはrevoke / rotate
- PVR通知経路を確認、またはOpen Action Item化

Exit:

- Pre-merge可能なSecurity Settingsが安全側
- Repository-wide Security Updates OFF
- PR生成Custom Rule未Active
- preset RulesのCurrent State記録済み
- 未評価Secret / malicious packageを放置しない

### Wave 6: Pre-merge Validation

Local:

```bash
pnpm run verify
git diff --check
```

必要に応じWorkflow YAML / Issue Form YAMLの構文検証。

GitHub Actions実測:

Trusted normal same-repo PR:

- Dependency Review success
- required CI success
- Preview success
- `verify` success
- `validate` success

Dependabot / fork / trust boundary外PR相当:

- Preview skipped、またはEnvironment review modelに従う
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
- 採用trust modelに応じたPreview contract PASS
- Secretを受け取れる主体が意図通り
- Repository変更はPR-ready

この時点で実装者がDoD達成のため勝手にmergeしない。

### Wave 7: Default Branch反映後のActivation

Repository変更が正規手順で`main`へ反映された後だけ実施する。

#### 7.1 Default branch state check

確認:

- Dependabot-safe Preview condition
- Collaborator trust model
- updated `validate`
- Dependency Review → `verify`
- Action full SHA pinning
- `SECURITY.md` / Issue Forms / PR Template

#### 7.2 Package Security PR policyをActive化

Repository-wide Dependabot Security Updates toggleがOFFであることを再確認する。

GitHub preset Rulesを再確認する。

Custom Ruleを作成 / Active化:

```text
GitHub preset等で先にdismissされていない
AND severity in [moderate, high, critical]
AND fix available
→ Dependabot Security PR
```

Active化直前にExisting Alerts件数と適用影響を確認する。

Rule機能が利用不能なら:

- Security Updates一括ONへfallbackしない
- Moderate以上をmanual triage
- Accepted Platform Limitationとして理由 / fallbackを記録

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

利用不能ならAccepted Platform Limitationとして理由を記録する。

#### 7.5 Repository UI / Security validation

確認:

- Issue Forms表示
- PR Template自動挿入
- Security tabから`SECURITY.md`
- Issue chooserのSecurity contact link
- Reporter視点でPVR導線利用可能
- PVR通知経路確認済み
- Dependabot Alerts ON
- Dependabot Malware Alerts ON
- Repository-wide Dependabot Security Updates OFF
- GitHub preset Rulesが意図通り
- Custom Auto-triage Ruleが意図通り、またはAccepted Platform Limitation記録
- `.github/dependabot.yml`なし
- CodeQL successful
- Secret scanning / Push protection ON
- Ruleset active
- SHA enforcement ON、またはAccepted Platform Limitation記録

Exit:

- Package Security PR policyが不要なLow更新を増やさない
- GitHub presetとの優先関係を理解した設定になっている
- Dependabot PRが安全なCI contractで処理可能
- Deployment Secret trust boundaryが明確
- Settingsとdefault branchが整合

## 8. Finding Triage

### 8.1 Dependency / Code Vulnerability

Critical / High:

- Finding / Advisory ID
- affected Dependency / Code
- actual exposure
- fix availability
- 対応判断

未評価のままRepository Hardening完了にしない。

Moderate:

- GitHub preset / Custom Ruleの適用結果を確認
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
- 実利用
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

Actionごとに確認:

- owner / repository
- pinned SHA
- exact release tag / 解決根拠
- known advisory有無
- minimum patched release
- 対応要否

該当時はminimum patched releaseのSHAへ更新し、通常CIを完走する。

最新版へ一括更新しない。

## 9. Rollback / Failure Handling

### Dependency Reviewが不適切にblock

Rulesetを解除しない。

Severity / Scope / actual dependency / Advisoryを確認し、実測根拠がある場合だけ最小調整する。

### Preview条件変更でtrusted normal PRがDeployされない

Eligibility / trust configurationを修正する。

Dependabot / forkへSecretを広げない。

normal trusted PRのSecret不足をSkipへ弱体化しない。

### Collaborator trust reviewで問題が見つかった

同じSecret modelのまま進めない。

優先順位:

1. 不要なWrite権限を減らす
2. 必要ならEnvironment approvalを追加
3. Secret-dependent Preview対象を狭める

「same-repoだから安全」として無視しない。

### Action SHA pinningでWorkflow破損

SHA / owner / path / resolved tagを再確認する。

安易にmovable tagへ戻さない。

### Auto-triage Ruleが想定外PRを大量生成

一括mergeしない。

preset / Custom Ruleの優先順位、severity、fix availabilityを再確認する。

必要ならCustom Ruleを一時停止して条件を修正する。

Repository-wide Security Updatesを代替としてONにしない。

### PVR contact linkが無効

Repository Security pageのReporter導線を確認して修正する。

`/security/advisories/new`へ安易に置き換えない。

Public IssueへのSecurity報告をfallbackにしない。

### Secret leak

Alert closeよりcredential revoke / rotateを優先する。

履歴改変は影響とGit safety policyを確認せず実施しない。

## 10. Non-goals

- `LICENSE`追加 / 選定
- Dependency定期Version Update
- Dependency一括最新版化
- Dependabot Version Update PR
- Repository-wide Dependabot Security Updates ON
- Low severity vulnerabilityの一律自動PR化
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
- 固定月次Action Update / Review SLA
- Merge Queue
- Signed Commit強制
- CodeQL Advanced Setup
- Application Feature変更
- Native Feature変更
- OpenSSF Scorecards
- License policy enforcement
- テスト目的の既知脆弱Dependency導入
- Secret除去だけを目的とする無条件Git history rewrite
- Collaborator trust未確認のままSecret利用を拡大すること

## 11. Definition of Done

PR-ready DoDとRepository Hardening DoDを分離する。

### 11.1 PR-ready Definition of Done

#### Repository Files

- `SECURITY.md`
- PR Template
- Bug / Feature Issue Forms
- Issue Template config
- Security contact linkはRepository Security pageを基本とする
- `.github/dependabot.yml`を不要に追加していない
- README / CONTRIBUTING整合
- CONTRIBUTINGが`collaborators_only`と整合
- Action security review policyが文書化

#### Dependency / Supply Chain

- Dependency ReviewがPR CIへ統合
- Moderate以上のruntime / development / unknownをblock
- License / OpenSSFはRequired Gate外
- Dependabot Version Updates設定なし
- Repository-wide Security UpdatesがOFF
- GitHub preset Auto-triage RulesのCurrent Stateを把握
- Custom Security PR Ruleはまだ未Active

#### Deployment Trust Boundary

- Write / Maintain / Admin collaboratorをInventory済み
- Cloudflare Credentialを渡してよいtrusted maintainer範囲が明確
- 現在のPreview / Production credential共有状態を把握
- trustできないWrite-capable主体がいる場合、権限縮小 / Environment / Preview制限のいずれかを実施またはOpen Action Item化
- trust decision未確定のままPR-readyにしない

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
- trusted normal same-repo Preview success
- missing Cloudflare Secretはtrusted normal PRでFail
- Dependabot / fork / trust boundary外PRはPreview skip、または採用Environment modelに従う
- PR author based Dependabot classification
- `validate`が正常 / ineligibleを区別
- `pull_request_target`未追加

#### Pre-merge Security Settings

権限がある場合:

- Dependency graph ON
- Dependabot Alerts ON
- Malware Alerts ON
- Repository-wide Security Updates OFF
- PVR ON
- Secret scanning ON
- Push protection ON
- CodeQL Default Setup ON
- Actions default permission read-only
- Actions create / approve PR OFF

Security findings:

- Critical / High vulnerability Triage済み
- Malware Alerts Triage済み
- Secret Alerts Triage済み
- Active / unknown credential revoke / rotate済み

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

Collaborator trust reviewでWrite governance自体に問題が出た場合は、approvals 0の維持を自動的なDoDとせずOpen Action Itemとして扱う。

#### Quality

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- 採用trust modelに応じたPreview PASS
- Action pinning regressionなし
- Open Action Itemのうちmerge前に解決必須のものが残っていない

ここまででRepository変更はレビュー / merge判断可能。

### 11.2 Repository Hardening Definition of Done

Default branch反映後に評価する。

#### Repository UI

- `SECURITY.md`をSecurity tabから参照可能
- Issue Forms表示
- PR Template自動挿入
- Security contact linkがRepository Security pageへ到達
- Reporter視点で`Report a vulnerability`導線利用可能
- README / CONTRIBUTING整合

#### Package Supply Chain

- Dependency graph ON
- Dependabot Alerts ON
- Malware Alerts ON
- Repository-wide Dependabot Security Updates OFF
- GitHub preset Auto-triage Rulesの採用状態が記録済み
- Custom Ruleが「preset等でdismissされていない Moderate / High / Critical + fix available」をSecurity PR化
  - または機能利用不能がAccepted Platform Limitationとして記録済み
- Version Updates設定なし
- Low severityの不要な自動PRを増やしていない

Security PRが生成された場合:

- PR author `dependabot[bot]`
- Preview skipped
- Dependency Review / Required CI実行
- auto-mergeなし

Security PRが生成されない場合:

- PR不在を失敗扱いしない
- Dependabot PR pathをStatic Review済み

#### Deployment / GitHub Actions Supply Chain

- Deployment Credential trust boundaryが記録済み
- trustできないWrite-capable主体へRepository-level Secretを無条件に渡す構成になっていない
- `main`上で全remote Action full SHA
- 全採用Actionの初回Advisory Review済み
- Action追加 / 変更時のSecurity Review方針が文書化
- SHA enforcement ON、またはAccepted Platform Limitation記録

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

Write collaborator governanceを見直す必要があると判定した場合は、そのOpen Action Itemが解消済みである。

#### Final Consistency

- GitHub Settingsとdefault branchが整合
- 既存Application / QA behaviorに回帰なし
- 未完了のOpen Action Itemなし
- Accepted Platform Limitationは理由 / 影響 / fallback / 確認日が記録済み

## 12. 実装順序

1. 最新`main` / Open PR / Settings / AlertsをRebaseline
2. Write / Maintain / Admin collaboratorとCloudflare Secret trust boundaryをInventory
3. Preview / Production credential共有状態とEnvironment有無を確認
4. Repository-wide Dependabot Security UpdatesがONなら既存Security PRをInventory後OFF
5. GitHub preset / Custom Auto-triage RulesをInventory
6. `SECURITY.md`
7. PR Template
8. Bug / Feature Issue Forms + config + Repository Security contact link
9. 全remote Action Inventory
10. 現在のeffective commitへfull SHA pin
11. exact release tag / 解決根拠記録
12. 採用ActionのSecurity Advisory確認
13. Dependency Review追加
14. Dependency Review → `verify`
15. Collaborator trust decisionに基づきPreview eligibility / Environment modelを確定
16. `validate` contract修正
17. README / CONTRIBUTING / 必要なCODE_REVIEW整合
18. Pre-merge Security Settings確認 / 有効化
19. CodeQL / vulnerability / malware / secret findings Triage
20. PVR通知経路を確認、未確認ならOpen Action Item化
21. `pnpm run verify` / `git diff --check` / PR CI完走
22. PR-ready DoD確認
23. 正規運用でdefault branchへ反映
24. default branchのDependabot-safe / SHA-pinned / deployment-trust状態再確認
25. Repository-wide Dependabot Security UpdatesがOFFであることを再確認
26. presetの適用を確認しCustom Auto-triage RuleをActive化
27. Security PRが生成された場合はCI contractを実測、なければStatic Review
28. 利用可能ならAction SHA enforcementをON
29. Issue Forms / PR Template / Reporter向けPVR導線 / Security Settings実状態確認
30. PVR通知経路最終確認
31. Critical / High / Malware / Secret findingsの未評価なしを確認
32. Open Action Itemがなく、Accepted Platform Limitationが適切に記録されていることを確認
33. Repository Hardening DoDを満たして完了

この順序により、不要なVersion Updateを導入せず、Package vulnerabilityは必要なものだけ自動PR化し、GitHub ActionsはimmutableなSHA pinningを維持しながらSecurity Advisoryを別経路で監視する。また、Fork / Dependabotだけでなくsame-repo collaboratorを含むCloudflare Credentialのtrust boundaryを明示し、Public RepositoryとしてSecret利用の前提を曖昧にしない。