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

依存 Package / GitHub Actions を常に最新版へ追従させることや、Community Health File を網羅することは目的としない。

---

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

実装開始時には、最新 `main`、Open PR、GitHub Settings、Collaborator 権限、GitHub Environments、Security Alerts を再取得する。

既に安全側へ設定済みの項目を後退させない。

この Plan は Repository 変更と GitHub Settings 変更を含むが、実装ブランチ上で勝手に `main` へ merge することを要求しない。

Repository Settings の変更権限がない実装者は、設定項目を完了扱いにせず Owner Checklist へ残す。

Owner Checklist は次の2種類を区別する。

- **Open Action Item**: 未完了なら Repository Hardening DoD を満たさない
- **Accepted Platform Limitation**: GitHub Plan / UI / provider 制約等で実施不能だが、理由・影響・fallback・確認日が記録済みなら DoD を妨げない

Security boundary 自体を成立させるために必要な制御は、単なる Accepted Platform Limitation として無視しない。

---

## 3. Current State

### 3.1 Repository

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
- Issue chooser から Security Reporting への導線
- Dependency Review の CI enforcement
- Dependabot / Fork PR と Cloudflare Preview Deployment の安全な共存
- same-repo PR と Cloudflare Credential の trust boundary
- GitHub Actions の full-length commit SHA pinning
- SHA-pinned GitHub Actions の Security Advisory 監視方針
- Dependabot Malware Alerts / Auto-triage policy の明確化
- CodeQL で Application code と GitHub Actions workflow の双方を解析する確認
- GitHub Security Settings の最終確認
- README / CONTRIBUTING から Security / Contribution Flow への導線

`.github/dependabot.yml` は通常 Version Update を目的に追加しない。

### 3.2 Existing Repository Settings

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

これらは新規作成せず、実装時に Current State を再確認して不足分だけ補完する。

### 3.3 Contribution / Collaborator State

現在の Pull Request creation policy は `collaborators_only`。

通常運用:

- Issue: Public contributor の入口
- Pull Request: Collaborator 中心
- Security vulnerability: Private Vulnerability Reporting

2026-08-16 の確認では Owner 以外にも Write 権限を持つ direct collaborator が存在する。

GitHub Environments は未作成で、現行 `ci.yml` は Preview と Production の Cloudflare Deployment で Repository Secrets を利用している。

したがって、次を暗黙前提にしない。

```text
same-repo PR == 自動的に Secret を渡してよい trusted code
```

---

## 4. Scope / Non-goals

### 4.1 In Scope

- `SECURITY.md`
- PR Template
- Bug / Feature Issue Forms
- PVR 導線
- Dependency Review
- Dependabot Alerts / Malware Alerts / Auto-triage policy
- Secret scanning / Push protection
- CodeQL Default Setup
- GitHub Actions full SHA pinning
- Cloudflare Preview / Production trust boundary
- Ruleset / Actions permissions の確認
- README / CONTRIBUTING / 必要最小限の CODE_REVIEW 整合

### 4.2 Non-goals

- `LICENSE` 追加 / 選定
- Dependency 定期 Version Update
- Dependency 一括最新版化
- Dependabot Version Update PR
- Repository-wide Dependabot Security Updates ON
- Low severity vulnerability の一律自動 PR 化
- Existing Moderate / Low Alert の全件解消
- Dependabot auto-merge / auto-approve
- Renovate
- CODEOWNERS
- Code of Conduct
- Governance / Support / Funding
- 独自 Security Dashboard / 独自 Dependency Bot
- GitHub Actions 用独自 scheduled advisory scanner
- 固定月次 Action Update / Review SLA
- Merge Queue
- Signed Commit 強制
- CodeQL Advanced Setup
- Application / Native Feature 変更
- OpenSSF Scorecards
- License policy enforcement
- テスト目的の既知脆弱 Dependency 導入
- Secret 除去だけを目的とする無条件 Git history rewrite
- Collaborator trust 未確認のまま Secret 利用を拡大すること

---

## 5. Canonical Decisions — SSOT

この章を本 Plan の詳細仕様の **Single Source of Truth** とする。

Implementation Waves と Definition of Done は、ここに定義した Decision ID を参照する。

同じ policy を別セクションへ再定義しない。

### D-01: Simple-first

GitHub 標準機能を優先し、独自 Bot、独自 Security Dashboard、Renovate、独自 Dependency 管理基盤を追加しない。

必要性が実測されない機能は追加しない。

### D-02: CI を品質判定の SSOT にする

Required CI は既存 aggregate job `verify` を中心に維持する。

自動判定できる品質条件を PR Template へ重複記載しない。

### D-03: Dependency は理由がある場合だけ更新する

Version が新しいだけでは更新しない。

正当な更新理由:

1. 既知脆弱性の修正
2. 利用中 Version の EOL / Support 終了
3. 実際の Bug / Compatibility 問題
4. Expo / React Native / Playwright / Node.js 等の計画的基盤更新
5. 新機能実装に必要な Dependency Requirement

Patch / Minor / Major のいずれでも、理由がなければ自動更新しない。

### D-04: Repository-wide Dependabot Security Updates は OFF を保証する

Repository-wide `Dependabot security updates` toggle は OFF とする。

実装開始時点で ON の場合:

1. Current State を記録
2. 既存 Dependabot Security PR を Inventory
3. toggle を OFF
4. 既存 PR は自動 close / merge せず個別 Triage
5. Custom Auto-triage Rule Active 化前に OFF を再確認

Dependabot Version Updates も有効化しない。

`.github/dependabot.yml` は通常 Version Update を目的に追加しない。

### D-05: GitHub preset Auto-triage と Custom Rule の責務を分ける

実装時に GitHub preset / Custom Auto-triage Rules を Inventory する。

`Dismiss low impact issues for development-scoped dependencies` 相当の low-impact development dependency preset は、具体的不都合がない限り維持する。

Custom Security PR Rule は、preset 等で先に dismiss されていない Alert に対して適用する。

想定 policy:

```text
GitHub preset で low-impact development finding として dismiss
→ 自動 PR 化しない

それ以外の Moderate / High / Critical
AND fix available
→ Dependabot Security PR
```

新規 Dependency 導入時は Auto-triage の dismiss policy に関係なく D-09 の Dependency Review gate を適用する。

### D-06: Malware Alert を自動 dismiss しない

Dependabot Malware Alerts は ON / 維持する。

`Dismiss package malware alerts` preset は **OFF を維持する**。

理由:

- malicious dependency を自動 dismiss して未評価のまま見逃すことを避ける
- 現時点で internal package name collision 等の明確な false-positive requirement がない

将来具体的な false positive が発生した場合だけ再検討する。

Malware Alert 発生時は D-27 に従って Triage する。

### D-07: Custom Auto-triage PR Action が利用不能でも Security Updates 一括 ON へ戻さない

利用不能時:

- Dependabot Alerts: ON
- Malware Alerts: ON
- Repository-wide Security Updates: OFF
- Moderate 以上かつ fix available の finding を manual triage
- 必要なものだけ Security Update PR を作成
- 制約を Accepted Platform Limitation として記録

### D-08: Dependency Review は既存 `ci.yml` へ統合する

新規 Workflow を増やさず `.github/workflows/ci.yml` に `dependency-review` job を追加する。

実装時点の official supported major / Runner requirement を再確認し、full SHA へ pin する。

初期 policy:

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

### D-09: Dependency Review の event contract を固定する

`dependency-review` は `pull_request` のみ実行する。

`verify` contract:

```text
pull_request
→ dependency-review == success

push / schedule / workflow_dispatch
→ dependency-review == skipped
```

`success OR skipped` のような曖昧な判定にしない。

### D-10: `verify` を Required Quality Gate の aggregate として維持する

Ruleset Required check は既存 `verify` を維持する。

Dependency Review を `verify.needs` と結果判定へ追加する。

Cloudflare Preview Deployment は `verify` 後段のままにする。

### D-11: Cloudflare Credential trust model を3段階で固定する

Preview condition 実装より先に Write / Maintain / Admin collaborator を Inventory し、各主体を次のどれに分類するか決定する。

#### Model A: Code も Deployment Credential も trusted

適用条件:

- Repository へ code を投入する権限を与えてよい
- Cloudflare Credential を利用できる範囲まで信頼できる

対応:

- Write 維持可
- same-repo normal PR の Preview Deployment 利用可
- trust decision を記録
- Cloudflare Token を provider 側で必要最小権限化
- Preview / Production credential の分離が実用的なら分離

#### Model B: Code contribution は trusted、Deployment Credential までは渡したくない

適用条件:

- Write 権限は維持してよい
- Repository code contribution は許可する
- ただし Secret-bearing Preview / Production Deployment は Model A 主体の追加承認なしに実行させない

Model B を採用する場合、Secret-bearing deployment path を **Preview / Production の双方で Environment 境界内へ移す**。

Preview Environment:

- Cloudflare Preview Credential を Environment Secret として保持
- Required Reviewer は Model A に分類した主体を指定
- Model B の PR author / deployment initiator 自身を承認者として成立させない
- `Prevent self-review` を ON
- approval 前に Secret が Job へ渡らないことを実測

Production Environment:

- Cloudflare Production Credential を Environment Secret として保持
- Required Reviewer は Model A に分類した主体を指定
- Model B の deployment initiator 自身を承認者として成立させない
- `Prevent self-review` を ON
- Deployment branch / tag rule は `main` のみに制限
- approval 前に Secret が Job へ渡らないことを実測

共通:

- Preview / Production Secret を Repository-level Secret へ複製して回避しない
- Model B 本人を唯一の Required Reviewer にしない
- Environment protection を回避する別の Secret-bearing job を残さない
- `validate` / production deployment contract は approval pending を明示的に扱う

必要な Required Reviewer / Prevent self-review / Environment Secret 境界を利用できない場合、**Model B を成立した扱いにしない**。

その場合は次のいずれかへ変更する。

1. Credential 利用まで信頼できるなら Model A
2. Write 自体を見直すなら Model C
3. Secret-bearing deployment を無効化して Open Action Item とする

Security boundary の欠落を Accepted Platform Limitation だけで完了扱いにしない。

#### Model C: Code を `main` へ入れる判断自体を任せられない

適用条件:

- Repository code / workflow を変更できる Write 権限自体を trust できない

対応:

- Write を維持しない
- Read / Triage 等の必要最小権限へ下げる
- Environment を「untrusted Write を安全にする代替」として使わない
- Repository governance を先に修正する

**Model C の主体を Write のまま残し、Environment だけで安全化したことにはしない。**

### D-12: Cloudflare Credential の blast radius を確認する

記録する:

- Preview / Production が同一 Credential を共有しているか
- Cloudflare Token の provider 側権限
- Repository Secret / Environment Secret の配置
- Credential がアクセス可能な Cloudflare resource 範囲
- Preview / Production credential 分離要否

可能な範囲で provider 側 least privilege を優先する。

Model B の場合は Preview / Production の Secret-bearing path が D-11 の各 Environment 境界外に残っていないことも確認する。

### D-13: Preview trust classification は PR author を Primary にする

Model A、または Model B の approval boundary が成立した後で Preview eligibility を定義する。

Model A の基本条件:

```text
pull_request
AND pull_request.head.repo.full_name == github.repository
AND pull_request.user.login != dependabot[bot]
AND github.actor != dependabot[bot]
AND verify == success
AND build-automation == success
```

PR author を Primary trust classification とし、`github.actor` 単独では判定しない。

Secret の存在は eligibility に含めない。

Model B では PR eligibility と Environment approval を別概念として扱い、PR が eligible でも Secret-bearing deployment は D-11 の承認前に開始しない。

### D-14: Preview / `validate` contract を trust modelごとに明示する

Model A の基本契約:

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

trusted normal PR で Cloudflare Secret が欠落した場合は Fail する。

意図しない Preview Skip を Success 扱いにしない。

Model B:

- Preview / Production の Secret-bearing job は Environment approval を必要とする
- approval pending を `success` / `skipped` と誤認しない
- approval後にのみ Secret-bearing step が実行される
- deployment initiator が自己承認できないことを実測する

### D-15: Dependabot / Fork PR へ Secret を複製しない

Cloudflare Credential を Dependabot Secrets 等へ複製しない。

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

Secret-dependent Preview だけを Skip する。

### D-16: `pull_request_target` で Secret 制約を回避しない

Secret 利用のためだけに `pull_request_target` で untrusted head code を Checkout / Execute しない。

### D-17: Public PR Workflow で self-hosted runner を使わない

`.github/workflows/**` に `self-hosted` runner がないことを Inventory する。

将来導入する場合は別途 trust boundary を設計する。

### D-18: GitHub Actions は full SHA へ pin する

`.github/workflows/**` の全 remote `uses:` を full-length commit SHA へ pin する。

対象:

- `actions/checkout`
- `actions/setup-node`
- `actions/upload-artifact`
- `actions/download-artifact`
- `actions/setup-java`
- `pnpm/action-setup`
- `cloudflare/wrangler-action`
- その他 remote Action / reusable workflow

既存 Action は、実装時点で現在参照 tag が指す commit を固定する。

pinning だけを理由に Major / Minor / Patch を上げない。

Human-readable comment は可能な限り exact release tag を残す。

```yaml
uses: actions/checkout@<full-commit-sha> # v4.2.2
```

exact tag を一意に特定できない場合は、解決元 tag / 解決日等の根拠を残す。

### D-19: SHA-pinned Actions を別経路で Security Review する

full SHA pin 後は Dependabot Alert だけを Action 脆弱性監視の SSOT として期待しない。

必須確認:

- Hardening 実装時の初回 Advisory Review
- Action 追加 / 変更 PR 時の Advisory Review
- Security Advisory / Incident 把握時の Review
- 既存 Repository Security Review cadence がある場合はその中へ含める

該当 Advisory がある場合のみ minimum patched release の SHA へ更新する。

固定月次 SLA は設けない。

独自 scheduled advisory scanner workflow は追加しない。

### D-20: Action SHA enforcement は default branch 反映後に有効化する

GitHub Settings に full-length SHA requirement が利用可能なら、全 Workflow pinning が `main` へ入った後に ON。

先に enforcement を有効化して tag-based Workflow を壊さない。

利用不能でも Workflow file 自体の SHA pinning は必須。

利用不能理由は Accepted Platform Limitation として記録する。

### D-21: CodeQL は Default Setup を使用し、対象 language を確認する

CodeQL Default Setup を使用し、Advanced Setup は初期導入しない。

Default Setup configuration で最低限次を解析対象として確認する。

- JavaScript / TypeScript
- GitHub Actions workflows (`actions`)

GitHub Actions workflow が auto-detect されない場合は Default Setup の language selection で `actions` を追加する。

完了条件:

- JavaScript / TypeScript analysis successful
- GitHub Actions analysis successful

「CodeQL が1回成功した」だけでは完了にしない。

Default Setup が Repository 構成に適合しないことが実測された場合だけ、Advanced Setup を別対応として検討する。

### D-22: PVR を Security Reporting の Primary とする

`SECURITY.md`:

- current `main` / latest deployment を基本 supported scope とする
- Public Issue / PR へ vulnerability を投稿しない
- Private Vulnerability Reporting を案内
- 個人メールアドレスを公開しない
- 固定 SLA を約束しない
- Summary / reproduction / impact / environment / evidence を案内

PVR が Settings 側で無効なままなのに、文書だけで利用可能に見せない。

### D-23: Issue chooser は Repository Security page へ誘導する

`.github/ISSUE_TEMPLATE/config.yml` は次を基本とする。

```yaml
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability
    url: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/security
    about: Do not report security vulnerabilities in a public issue. Open the Security page, go to Advisories, then select "Report a vulnerability".
```

`/security/advisories/new` を Reporter 向け固定入口として使用しない。

PVR 有効化後に通常 Reporter 視点で実際の導線を確認する。

より安定した Repository-scoped Reporter URL を実装時に確認できた場合のみ置き換える。

### D-24: PVR の通知経路まで確認する

Owner operational check:

- Private Vulnerability Reporting: ON
- Repository / Security notifications を受信可能
- Web / Email 等の実際の確認経路あり

通知経路を確認できない場合は Open Action Item とする。

### D-25: PR / Issue Template は用途を限定する

Pull Request Template は次を含める。

- 概要
- 変更内容
- Scope
- Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CI コマンドの巨大 Checkbox リストは作らない。

Bug Issue Form は最低限次を収集する。

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

Feature Request は Problem-first とし、最低限次を収集する。

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

Bug / Feature Form には Security vulnerability 用ではないことを明記する。

### D-26: Existing vulnerability / CodeQL findings は severity と変更起因を分けて扱う

#### 今回の Hardening 差分が新規導入した finding

Severity に関係なく今回の変更として対応する。

新規 finding を「既存問題」として先送りしない。

#### Existing Critical / High

Pre-merge で必須 Triage とする。

最低限記録する。

- Finding / Advisory ID
- affected Dependency / Code
- actual exposure
- fix availability
- 対応判断

未評価のまま PR-ready / Hardening 完了にしない。

安全に同時修正できる場合は修正する。

大きな基盤更新や別Scopeが必要な場合は、影響・暫定判断・follow-up を明示して Open Action Item とする。

#### Existing Moderate / Low

Pre-merge で全件詳細 Triage を要求しない。

必須なのは Inventory とする。

- 件数
- Alert / Finding ID
- severity
- affected dependency / code の概要
- fix availability が取得できる場合はその状態

次の場合のみ今回個別対応する。

- Hardening差分が新規導入した
- 実測上、高い exposure / exploitability があり、Hardening完了を妨げる合理的根拠がある
- 小さく安全な修正で解消でき、Scope拡大にならない

それ以外は Post-merge の GitHub preset / Custom Auto-triage、または通常 Backlog へ回す。

Moderate / Low をゼロ件にすること、全件手動Triageすること、全依存を最新版へ上げることを PR-ready / Hardening DoD にしない。

### D-27: Existing Malware Alerts を Triage する

Alert がある場合:

- Package / Version
- direct / transitive
- 実利用有無
- 除去 / 代替方針
- resolution reason

使用中 malicious dependency を未評価のまま残さない。

D-06 により `Dismiss package malware alerts` preset は OFF を維持する。

### D-28: Existing Secret scanning alerts を credential state で Triage する

Active / validity unknown:

- 即時 revoke / rotate
- GitHub Secrets 等の正規参照先を更新
- 影響範囲確認
- 必要に応じ audit / access log 確認

Revoked / expired:

- 無効根拠確認
- 適切な理由で resolve

False positive / test value:

- 根拠確認
- resolve

Git history rewrite は revoke / rotate より優先しない。

### D-29: Actions default permission は read-only

Repository Settings > Actions > General で確認する。

- Workflow permissions: Read repository contents and packages
- Allow GitHub Actions to create and approve pull requests: OFF

write 権限が必要な場合は該当 Workflow / Job のみに最小権限を明示する。

### D-30: `main-protection` は既存設定を維持する

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

ただし D-11 で Model C に該当する主体が存在する場合、approvals 0 を機械的に維持せず Repository governance の別問題として見直す。

### D-31: Owner Checklist の扱いを固定する

#### Open Action Item

例:

- PVR 通知確認未実施
- Active Secret Alert 未対応
- Collaborator trust decision 未確定
- Security Updates toggle を OFF にできていない
- Model C の Write collaborator governance 未解決
- Model B に必要な Environment / Required Reviewer / Prevent self-review 境界が未成立

未完了なら Repository Hardening DoD は NG。

#### Accepted Platform Limitation

例:

- GitHub Plan 上 Auto-triage PR Action が利用不能
- SHA enforcement UI が利用不能

次を記録する。

- 制約
- Security / Operation への影響
- fallback
- 確認日

記録済みなら DoD を妨げない。

ただし Model B の Credential boundary のように、機能がなければ trust model 自体が成立しない項目は Accepted Platform Limitation だけで完了扱いにしない。

---

## 6. Target Repository Files

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
CODE_REVIEW.md              # 既存記載と矛盾する場合のみ最小修正
```

`.github/dependabot.yml` は追加しない。

GitHub Environment は D-11 の Model B が必要な場合だけ追加する。

---

## 7. Implementation Waves

この章では詳細仕様を再定義しない。

各 Wave は Section 5 の Decision ID を実装・検証する。

### Wave 0: Rebaseline / Inventory

対象 Decisions:

- D-04〜D-07
- D-11〜D-12
- D-17〜D-21
- D-24
- D-26〜D-31

実施:

1. 最新 `main` / Open PR を再取得
2. Repository files / workflows を再確認
3. Collaborator / Environment / Cloudflare Secret state を Inventory
4. Dependabot / Auto-triage / Malware / PVR / Secret scanning / CodeQL / Actions settings を Inventory
5. Existing vulnerability / malware / secret findings を Inventory
6. `main-protection` Current State を確認

Existing vulnerability inventory では Critical / High と Moderate / Low を分けて件数・IDを記録する。

Exit:

- 変更 Gap が確定
- D-11 の trust model を決定できる情報が揃っている
- Security Updates / Auto-triage / Malware preset の Current State が記録済み
- Action pinning対象が列挙済み
- Existing Moderate / Low は少なくとも Inventory 済み

### Wave 1: Security / Contribution Entry Point

対象 Decisions:

- D-22〜D-25

実施:

- `SECURITY.md`
- PR Template
- Bug / Feature Issue Forms
- Issue Template config / Security contact link

Exit:

- Security / Bug / Feature の入口が分離
- Public Issue へ vulnerability を誘導しない
- PVR Reporter 導線のPost-merge検証方法が明確

### Wave 2: GitHub Actions / Dependency Supply Chain

対象 Decisions:

- D-08〜D-10
- D-17〜D-21

実施:

- remote Action Inventory
- full SHA pinning
- Action Advisory Review
- Dependency Review job追加
- Dependency Review → `verify` integration
- CodeQL Default Setup の対象 language確認準備

Exit:

- 全 remote Action が full SHA
- 不要な Action Version Updateなし
- Dependency Review contractが `verify` に統合
- Actionの初回Advisory Review完了

### Wave 3: Cloudflare / CI Trust Boundary

対象 Decisions:

- D-11〜D-16

実施:

- Collaboratorを Model A / B / C に分類
- 必要に応じ権限変更またはEnvironment導入
- Preview eligibility変更
- `validate` contract変更
- Cloudflare provider側least privilege確認

Model B の場合は Preview / Production の双方について次を実測する。

- Secret-bearing job が Environment を使用
- Required Reviewer が Model A 主体
- `Prevent self-review` ON
- Model B の initiator は自己承認不可
- approval 前に Secret-bearing job が実行されない
- Production は `main` のみ deployment 可

Exit:

- Model C の主体を Write のままEnvironmentだけで誤魔化していない
- Model B の Preview / Production credential boundary が成立
- Secretを受け取れる主体が明確
- Dependabot / fork / trust boundary外PRがSecretを要求しない
- trusted Preview regressionを検出できる

### Wave 4: Documentation Alignment

対象 Decisions:

- D-03
- D-18〜D-19
- D-22〜D-25

実施:

README:

- `CONTRIBUTING.md`
- `SECURITY.md`
- Public IssueへSecurity vulnerabilityを投稿しない旨

CONTRIBUTING:

- PR / Issue Template利用
- Securityは`SECURITY.md`
- Dependency Updateは理由必須
- PR policyは`collaborators_only`
- Actionsはfull SHA pin
- Action変更時はAdvisory Review
- 通常Version Updateを定期自動化しない

CODE_REVIEW:

- 既存記載と矛盾する場合のみ最小修正

### Wave 5: Pre-merge Settings Hardening

対象 Decisions:

- D-04〜D-07
- D-20〜D-24
- D-26〜D-31

実施:

- Dependency graph ON
- Dependabot Alerts ON
- Malware Alerts ON
- `Dismiss package malware alerts` preset OFF
- Repository-wide Security Updates OFF
- low-impact development preset Current State確認
- Custom Security PR RuleはまだActive化しない
- PVR ON
- Secret scanning ON
- Push protection ON
- CodeQL Default Setup ON
- CodeQL targetに JavaScript / TypeScript + `actions` を含める
- Actions default permission read-only
- Actions create / approve PR OFF
- SHA enforcementはまだONにしない
- Findings Triage / Inventory
- PVR notification確認

Finding handling:

- Hardening差分起因の新規finding: 今回対応
- Existing Critical / High: 必須Triage
- Existing Moderate / Low: Inventory必須、全件手動Triage不要
- Malware / Secret: D-27 / D-28に従う

Exit:

- D-04 / D-06 のOFF条件が保証済み
- JavaScript / TypeScript analysis successful
- GitHub Actions analysis successful
- Critical / High は未評価のまま残っていない
- Existing Moderate / Low は Inventory 済み
- Active / unknown credential放置なし
- malicious dependency未評価なし

### Wave 6: Pre-merge Validation

対象 Decisions:

- D-08〜D-21
- D-25〜D-30

Local:

```bash
pnpm run verify
git diff --check
```

GitHub Actions:

- Dependency Review event contract
- `verify` contract
- selected trust model の Preview / `validate` contract
- Action SHA resolution
- Required PR CI

Model B の場合:

- Preview / Production Environment protection設定を確認
- self-review不可を確認
- approval前にSecret-bearing executionが進まないことを確認

Issue Forms / workflow YAML は必要に応じ構文確認する。

実際のDependabot PRを作るために脆弱Dependencyを導入しない。

Exit:

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- selected trust model のPreview契約PASS
- Model Bの場合はCredential approval boundary PASS
- Repository変更はPR-ready

この時点で実装者がDoD達成目的で勝手にmergeしない。

### Wave 7: Default Branch反映後のActivation

対象 Decisions:

- D-04〜D-07
- D-20〜D-24
- D-26〜D-31

前提:

- Wave 1〜6 のRepository変更が正規手順で`main`へ反映済み

実施:

1. `main` 上の Dependabot-safe / SHA-pinned / deployment-trust状態再確認
2. Repository-wide Security Updates OFF再確認
3. low-impact development preset維持状態確認
4. `Dismiss package malware alerts` preset OFF再確認
5. Custom Security PR RuleをActive化
6. Security PRがあればCI契約実測、なければStatic Review
7. 利用可能ならAction SHA enforcement ON
8. Issue Forms / PR Template / PVR Reporter導線をUI確認
9. PVR notification確認
10. CodeQL JavaScript / TypeScript + `actions` successfulを再確認
11. Critical / High / Malware / Secret findings と Owner Checklist を最終確認
12. Moderate / Low Inventory を通常Backlog / Auto-triageへ引き継ぐ

Custom Rule:

```text
preset等で先にdismissされていない
AND severity in [moderate, high, critical]
AND fix available
→ Dependabot Security PR
```

利用不能ならD-07 / D-31のAccepted Platform Limitationを使用する。

---

## 8. Failure Handling

### Dependency Review が不適切に block

Ruleset を解除しない。

Severity / Scope / actual dependency / Advisory を確認し、実測根拠がある場合だけ最小調整する。

### Trusted normal PR が Preview Deploy されない

D-11〜D-14 の trust / eligibility / validate contract を修正する。

Dependabot / fork へ Secret を広げない。

trusted PR の Secret 不足を Skip へ弱体化しない。

### Model B の Environment boundary が成立しない

Required Reviewer / Prevent self-review / Environment Secret / branch restriction を確認する。

Model B の initiator が自己承認できる状態を許容しない。

PreviewだけEnvironment化してProductionをRepository Secretのまま残さない。

必要な保護を構成できない場合は Model A / C への再分類、または Secret-bearing deployment停止を選ぶ。

### Model C の Write collaborator が見つかった

Environment だけで解決したことにしない。

Write権限を必要最小限へ下げ、Repository governanceを先に修正する。

### Action SHA pinningでWorkflow破損

SHA / owner / path / resolved tag を再確認する。

安易に movable tag へ戻さない。

### Auto-triage Rule が想定外PRを大量生成

一括mergeしない。

preset / Custom Ruleの優先順位、severity、fix availabilityを再確認する。

必要ならCustom Ruleを一時停止して条件を修正する。

Repository-wide Security Updatesを代替としてONにしない。

### Moderate / Low finding が多数存在する

Hardening完了のためだけに全件解消しない。

Inventoryを保持し、GitHub preset / Custom Auto-triage / 通常Backlogへ引き継ぐ。

Critical / High相当の実Exposureが判明した項目だけ優先度を上げる。

### Malware Alert が想定外にdismissされる

`Dismiss package malware alerts` preset がOFFか確認する。

Custom Rule / manual dismissal の履歴を確認し、根拠なくdismissしない。

### PVR contact linkが無効

Repository Security page → Advisories → `Report a vulnerability` のReporter導線を確認する。

`/security/advisories/new`へ安易に置き換えない。

Public Issueをfallbackにしない。

### Secret leak

Alert closeよりcredential revoke / rotateを優先する。

履歴改変は影響とGit safety policyを確認せず実施しない。

---

## 9. Definition of Done

### 9.1 PR-ready DoD

Repository変更をレビュー / merge判断可能にするDoD。

#### Repository Files

- D-22〜D-25が実装済み
- `SECURITY.md`
- PR Template
- Bug / Feature Forms
- Security contact link
- README / CONTRIBUTING整合
- `.github/dependabot.yml`を不要に追加していない

#### Package / Supply Chain

- D-04〜D-10を満たす
- Repository-wide Security Updates OFF
- Malware Alerts ON
- `Dismiss package malware alerts` preset OFF
- Dependency Reviewが`verify`へ統合
- Custom Security PR Ruleはまだ未Active
- Existing Moderate / Low は Inventory 済みで、全件解消を要求しない

#### Deployment Trust

- D-11〜D-16を満たす
- 全Write-capable主体をModel A / B / Cへ分類済み
- Model C の主体がWriteのまま残っていない
- Cloudflare blast radius記録済み
- selected trust modelに対応したPreview / Production credential boundary実装済み

Model B の場合:

- Preview Environment使用
- Production Environment使用
- Required ReviewerはModel A主体
- `Prevent self-review` ON
- Model B initiatorは自己承認不可
- Production deployment branchは`main`のみ
- Preview / ProductionのSecret-bearing pathがEnvironment外に残っていない

#### GitHub Actions / CodeQL

- D-17〜D-21を満たす
- remote `uses:`はfull SHA
- initial Advisory Review済み
- CodeQL JavaScript / TypeScript successful
- CodeQL GitHub Actions (`actions`) successful
- self-hosted runnerなし

#### Security / Settings

- D-24 / D-26〜D-31を満たす
- PVR ON
- Secret scanning / Push protection ON
- Actions default permission read-only
- Actions create / approve PR OFF
- Hardening差分起因のfindingを未対応のまま残していない
- Existing Critical / High / Malware / Secret findingsを未評価のまま残していない
- Existing Moderate / LowはInventory済み
- Active / validity unknown credentialはrevoke / rotate済み

#### Branch / Quality

- D-30を満たす
- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- selected trust modelのPreview契約PASS
- Model Bの場合はEnvironment approval boundary PASS
- merge前解決必須のOpen Action Itemなし

ここまででRepository変更はPR-ready。

実装者はPost-merge DoD達成目的で勝手に`main`へmergeしない。

### 9.2 Repository Hardening DoD

default branch反映後に評価する。

#### Repository UI / Reporting

- D-22〜D-25をdefault branch / UIで実測
- Security tabから`SECURITY.md`参照可
- Issue Forms表示
- PR Template自動挿入
- Security contact linkからRepository Security pageへ到達
- Reporter視点で Advisories → `Report a vulnerability` が利用可能
- PVR notification受信経路確認済み

#### Package Security

- D-04〜D-10を満たす
- Repository-wide Security Updates OFF
- Malware Alerts ON
- `Dismiss package malware alerts` preset OFF
- low-impact development preset採用状態記録済み
- Custom Security PR Rule Active、またはAccepted Platform Limitation記録済み
- Version Updates設定なし
- Existing Moderate / Low はInventory済みで、Auto-triage / Backlogへの引継ぎ方針が明確

Security PRが生成された場合:

- PR author `dependabot[bot]`
- Secret-dependent PreviewはD-14に従う
- Dependency Review / Required CI実行
- auto-mergeなし

Security PRが生成されない場合:

- PR不在を失敗扱いしない
- Dependabot pathをStatic Review済み

#### Deployment / Actions

- D-11〜D-21を満たす
- Deployment Credential trust boundary記録済み
- Model CのWrite主体なし
- Model B採用時はPreview / Production Environment protectionが実測済み
- Model B採用時はself-review不可
- `main`上でremote Action full SHA
- Action SHA enforcement ON、またはAccepted Platform Limitation記録
- CodeQL JavaScript / TypeScript successful
- CodeQL GitHub Actions (`actions`) successful

#### Findings / Governance

- D-26〜D-31を満たす
- Hardening差分起因の未対応findingなし
- 未評価Critical / Highなし
- 未評価Malware Alertなし
- 未評価Secret Alertなし
- Active / validity unknown leaked credentialなし
- Moderate / Lowゼロ件は要求しない
- `main-protection`期待状態維持
- 未完了Open Action Itemなし
- Accepted Platform Limitationは制約 / 影響 / fallback / 確認日を記録済み

#### Final Consistency

- GitHub Settingsとdefault branchが整合
- 既存Application / QA behaviorに回帰なし

---

## 10. 実装順序

詳細仕様は Section 5 を参照する。

1. Wave 0 — Rebaseline / Inventory
2. Wave 1 — Security / Contribution Entry Point
3. Wave 2 — GitHub Actions / Dependency Supply Chain
4. Wave 3 — Cloudflare / CI Trust Boundary
5. Wave 4 — Documentation Alignment
6. Wave 5 — Pre-merge Settings Hardening
7. Wave 6 — Pre-merge Validation
8. PR-ready DoD確認
9. Repository Owner / 通常運用によりdefault branchへ反映
10. Wave 7 — Default Branch反映後のActivation
11. Repository Hardening DoD確認

この順序により、不要なVersion Updateを導入せず、Package vulnerabilityは必要なものだけSecurity PR化し、GitHub ActionsはimmutableなSHA pinningを維持する。

Fork / Dependabotだけでなくsame-repo collaboratorまで含めてCloudflare Credentialのtrust boundaryを明示する。

Model BではPreview / Production双方をEnvironment境界へ入れ、Model A主体の承認とself-review禁止を要求する。

Existing Moderate / LowはHardeningのために全件手作業で解消せず、InventoryしたうえでPost-merge Auto-triage / Backlogへ引き継ぐ。

Plan内の詳細policyはSection 5のCanonical DecisionsのみをSSOTとし、Waves / DoD / 実装順序ではDecision IDを参照する。
