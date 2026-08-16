# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として、安全かつ継続的に運用できる状態へ整備する。

この Repository は学習・検証用の模擬 EC であり、実販売・実決済・本番ユーザーデータを扱わない。

そのため、Public Repository として効果の大きい標準的な Hardening に絞り、将来の例外ケースを先回りして複雑な運用を作らない。

対象:

- Dependency / Supply Chain Security
- Vulnerability / Malware / Secret Reporting
- Pull Request / Issue の標準化
- GitHub Actions の最小権限と SHA pinning
- Cloudflare Deployment Credential の trust boundary
- Dependabot Security PR と CI の整合
- GitHub Security Settings
- README / CONTRIBUTING の運用導線

Application / Native 機能や教材内容は変更しない。

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

実装開始時には最新 `main`、Open PR、GitHub Settings、Collaborator、Security Alerts を再取得する。

既に安全側へ設定済みの項目を後退させない。

実装者は、この Plan の完了目的だけで勝手に `main` へ merge しない。

Repository Settings を変更できない場合は、未実施項目・理由・影響・代替策を作業記録へ残す。

Security boundary 自体が成立していない項目は、単に「権限不足」と記録して完了扱いにしない。

---

## 3. Current State

### 3.1 Repository

主な既存ファイル:

- `README.md`
- `CONTRIBUTING.md`
- `CODE_REVIEW.md`
- `AGENTS.md`
- `QA_AGENT.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

既存 CI では次が安全側に設定済みである。

- top-level `permissions: contents: read`
- `actions/checkout` の `persist-credentials: false`
- aggregate required job `verify`
- `verify.if: always()`
- `validate.if: always()`
- Production deploy は `main` push のみ

これらは維持する。

### 3.2 GitHub Ruleset

2026-08-16 時点の `main-protection`:

- Active
- Default branch 対象
- PR required
- Required approvals: 0
- Review thread resolution required
- Required status check: `verify`
- Strict branch update: OFF
- Linear history required
- Deletion blocked
- Force push blocked
- Squash only
- Bypass なし

今回、Ruleset を作り直さない。

実装時に Current State を確認し、意図せず弱体化していないことだけ確認する。

### 3.3 Collaborator / Cloudflare

現時点では Owner 以外にも Write 権限を持つ direct collaborator が存在する。

現行 `ci.yml` は same-repo PR の Preview と `main` の Production Deployment で Cloudflare Repository Secrets を利用している。

今回の trust policy は次とする。

> **Write 権限を持つ主体は、Repository code だけでなく Cloudflare Deployment Credential を利用できる範囲まで trusted とみなせる主体に限定する。**

Deployment Credential まで信頼できない主体には Write を維持しない。

この Plan では GitHub Environment を使った中間 trust model は導入しない。

将来「code contribution は許可したいが Deployment Credential は渡したくない」という具体的な要求が発生した場合だけ、別タスクで Environment / Required Reviewer を検討する。

---

## 4. Canonical Policy

この章を本 Plan の詳細仕様の SSOT とする。

### P-01: Simple-first

GitHub 標準機能を優先する。

今回追加しない:

- 独自 Security Bot
- 独自 Dependency Dashboard
- Renovate
- 独自 scheduled advisory scanner
- GitHub Environment
- Merge Queue
- CODEOWNERS
- CodeQL Advanced Setup

将来必要性が実測された場合だけ別対応する。

### P-02: Dependency は理由がある場合だけ更新する

Version が新しいだけでは更新しない。

正当な更新理由:

1. 既知脆弱性の修正
2. 利用中 Version の EOL / Support 終了
3. 実際の Bug / Compatibility 問題
4. 計画的な基盤更新
5. 新機能実装に必要

Dependabot Version Updates は有効化しない。

`.github/dependabot.yml` は追加しない。

### P-03: Dependabot Security は標準機能をそのまま使う

最終状態:

- Dependency graph: ON
- Dependabot Alerts: ON
- Dependabot Security Updates: ON
- Dependabot Malware Alerts: ON
- Dependabot Version Updates: OFF
- Dependabot auto-merge: OFF
- Dependabot auto-approve: OFF

Security Updates は、Dependabot-safe CI が `main` へ反映された後に ON にする。

Security PR は通常の PR と同様に CI を通し、人間が merge 要否を判断する。

Low severity を含む Security PR の量が実際に運用問題になった場合のみ、別タスクで selective auto-triage を検討する。

今回、その問題を先回りして Custom Auto-triage Rule は作らない。

`Dismiss package malware alerts` preset は OFF を維持する。

### P-04: Dependency Review を既存 `ci.yml` へ統合する

新規 Workflow は作らない。

`dependency-review` job を `.github/workflows/ci.yml` に追加し、`verify` の `needs` と結果判定へ組み込む。

実装時点の official supported major / runner requirement を確認し、Action 自体は full SHA へ pin する。

初期設定:

```yaml
with:
  vulnerability-check: true
  fail-on-severity: moderate
  fail-on-scopes: runtime, development, unknown
  license-check: false
  show-openssf-scorecard: false
  comment-summary-in-pr: never
```

PR comment は使用しない。

Dependency Review のために `pull-requests: write` を追加しない。

既存 top-level `permissions: contents: read` を維持し、write permission は今回増やさない。

Event contract:

```text
pull_request
→ dependency-review == success

push / schedule / workflow_dispatch
→ dependency-review == skipped
```

`verify` は既存の `if: always()` を必ず維持する。

`dependency-review` が non-PR event で `skipped` でも、`verify` 自体は実行して結果を明示判定する。

`verify` の結果判定:

```text
pull_request
→ dependency-review == success を要求

push / schedule / workflow_dispatch
→ dependency-review == skipped を要求
```

`success OR skipped` のような曖昧な判定にはしない。

Ruleset の Required check は引き続き `verify` のみとする。

### P-05: Cloudflare Deployment Credential の trust boundary を単純化する

実装開始時に Write / Maintain / Admin collaborator を確認する。

各主体について、Cloudflare Deployment Credential を利用できる範囲まで trust できるか判断する。

```text
Deploymentまでtrustできる
→ Write維持可

Deploymentまでtrustできない
→ Writeを維持しない
```

中間モデルは作らない。

Cloudflare Token は provider 側で可能な限り必要最小権限にする。

Preview / Production が同一 Token を共有している場合は記録するが、分離の必要性が具体的に確認されない限り、今回必須で分離しない。

### P-06: Preview は normal same-repo PR のみ

`deploy-preview` の実装条件は次を基本とする。

```yaml
if: >-
  always() &&
  github.event_name == 'pull_request' &&
  github.event.pull_request.head.repo.full_name == github.repository &&
  github.event.pull_request.user.login != 'dependabot[bot]' &&
  needs.verify.result == 'success' &&
  needs.build-automation.result == 'success'
```

PR author を Dependabot 判定の基準にする。

`github.actor` 単独で Dependabot 判定しない。

`github.event.pull_request.head.repo.full_name == github.repository` により fork PR を Preview 対象外にする。

Cloudflare Secret の存在を eligibility 条件にはしない。

結果契約:

```text
normal same-repo PR
→ deploy-preview success

Dependabot PR
→ deploy-preview skipped

fork PR
→ deploy-preview skipped

push / schedule / workflow_dispatch
→ deploy-preview skipped
```

normal same-repo PR で Cloudflare Secret が欠落している場合は Fail する。

`validate` は既存の `if: always()` を必ず維持する。

`deploy-preview` が Dependabot / fork / non-PR event で `skipped` でも、`validate` 自体は実行して expected result を判定する。

`validate` の結果判定:

```text
normal same-repo PR
→ verify == success
→ deploy-preview == success

Dependabot PR / fork PR
→ verify == success
→ deploy-preview == skipped

push / schedule / workflow_dispatch
→ verify == success
→ deploy-preview == skipped
```

PRであれば常に Preview success を要求する現在の実装を修正する。

Cloudflare Credential を Dependabot Secrets や fork 用 Secret として複製しない。

### P-07: `pull_request_target` で Secret 制約を回避しない

Secret 利用のために `pull_request_target` で untrusted head code を checkout / execute しない。

Public PR Workflow で self-hosted runner を使用しない。

### P-08: GitHub Actions は full SHA へ pin する

`.github/workflows/**` の全 remote `uses:` を full-length commit SHA へ pin する。

対象例:

- `actions/checkout`
- `actions/setup-node`
- `actions/setup-java`
- `actions/upload-artifact`
- `actions/download-artifact`
- `pnpm/action-setup`
- `cloudflare/wrangler-action`
- Dependency Review Action
- その他 remote Action / reusable workflow

既存 Action は、実装時点で現在参照 tag が指す commit を固定する。

SHA pinning だけを理由に Major / Minor / Patch を上げない。

可能なら exact release tag を comment に残す。

```yaml
uses: actions/checkout@<40-char-sha> # v4.x.x
```

Repository-level の Action SHA enforcement は今回の Scope 外とする。

### P-09: SHA-pinned Actions は変更時に Security Review する

full SHA pin 後は Dependabot Alert だけを Action 脆弱性監視の SSOT にしない。

必須確認:

- 今回の Hardening 実装時
- Action 追加 / 変更 PR 時
- Security Advisory / Incident を把握した時

該当 Advisory がある場合だけ minimum patched release の SHA へ更新する。

固定月次 Review は設けない。

### P-10: Security Reporting は PVR を使う

`SECURITY.md` を追加する。

内容:

- current `main` / latest deployment を基本 supported scope とする
- vulnerability を Public Issue / PR へ投稿しない
- Private Vulnerability Reporting を案内
- 個人メールアドレスを公開しない
- 固定 SLA を約束しない
- Summary / reproduction / impact / environment / evidence を案内

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability
    url: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/security
    about: Do not report security vulnerabilities in a public issue. Open the Security page, go to Advisories, then select "Report a vulnerability".
```

PVR 有効化後、通常 Reporter 視点で実際に `Report a vulnerability` 導線が使えることを確認する。

PVR notification を実際に受信できる設定であることも確認する。

### P-11: PR / Issue Template は最小限にする

追加:

- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

PR Template:

- 概要
- 変更内容
- Scope / Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CI コマンドを大量の Checkbox として重複記載しない。

Bug Form:

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

Feature Request:

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

Bug / Feature Form には Security vulnerability 用ではないことを明記する。

### P-12: GitHub Security Settings は標準機能を有効化する

最終状態:

- Dependency graph: ON
- Dependabot Alerts: ON
- Dependabot Security Updates: ON
- Dependabot Malware Alerts: ON
- Private Vulnerability Reporting: ON
- Secret scanning: ON
- Push protection: ON
- CodeQL Default Setup: ON
- Actions default permission: read-only
- Actions create / approve PR: OFF

CodeQL Default Setup では次を確認する。

- JavaScript / TypeScript analysis successful
- GitHub Actions workflows (`actions`) analysis successful

Advanced Setup は今回追加しない。

### P-13: Existing Findings は Severity と種類で扱う

今回の Hardening 差分が新規導入した finding:

- Severity に関係なく今回修正

Existing Critical / High vulnerability:

- Pre-merge で必須 Triage
- Finding / Advisory ID
- affected dependency / code
- actual exposure
- fix availability
- 対応判断

大きな別 Scope が必要な場合は、影響と follow-up を明示する。

Existing Moderate / Low:

- 件数 / ID / severity / 対象の概要を Inventory
- 全件解消を Hardening DoD にしない
- 高 Exposure または小さく安全に直せるものだけ今回対応
- その他は通常 Backlog へ

Malware Alert:

- 使用中 Package か確認
- 使用中なら除去 / 安全な代替へ
- false positive は根拠を確認して resolve
- 未評価のまま完了にしない

Secret scanning Alert:

Active / validity unknown:

- revoke / rotate
- 正規 Secret 参照先を更新
- 影響範囲確認

Revoked / expired / false positive:

- 根拠確認後に resolve

Git history rewrite は revoke / rotate より優先しない。

### P-14: Ruleset と既存安全設定は維持する

`main-protection` の期待値:

- PR required
- `verify` required
- conversation resolution required
- linear history
- force push blocked
- deletion blocked
- squash only
- strict OFF
- bypass なし

既存 Workflow の次も維持する。

- top-level `permissions: contents: read`
- checkout `persist-credentials: false`
- `verify.if: always()`
- `validate.if: always()`

今回、approval 数や Merge Queue 等を追加で強化しない。

---

## 5. Target Repository Files

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

追加しない:

- `.github/dependabot.yml`
- GitHub Environment
- 独立した Dependency Review Workflow
- 独立した CodeQL Workflow

---

## 6. Implementation Phases

### Phase 1: Rebaseline / Inventory

実施:

1. 最新 `main` / Open PR を取得
2. `.github/workflows/**` を再確認
3. remote `uses:` を Inventory
4. self-hosted runner 不在確認
5. Write / Maintain / Admin collaborator 確認
6. 各 Write-capable主体を Deployment Credential まで trust できるか確認
7. Cloudflare Secret / Token scope 確認
8. GitHub Settings Current State 確認
9. Existing vulnerability / malware / secret findings を Inventory
10. `main-protection` Current State 確認
11. `verify.if: always()` / `validate.if: always()` の Current State を確認

Write-capable主体を Deployment まで trust できない場合は、Repository変更を進める前に権限を見直す。

Exit:

- 実装 Gap が確定
- Cloudflare trust boundary が確定
- remote Action pinning 対象が列挙済み
- Critical / High と Moderate / Low の Existing finding 件数が把握済み
- Malware / Secret Alert の状態が把握済み
- `always()` を維持すべき aggregate / validation job が確認済み

### Phase 2: Repository Changes

実施:

#### Security / Contribution files

- `SECURITY.md`
- PR Template
- Bug Issue Form
- Feature Request Form
- Issue Template config / Security contact link

#### CI

- Dependency Review job追加
- Dependency Review → `verify` integration
- Dependency Review PR commentは無効のまま
- `pull-requests: write` を追加しない
- `verify.if: always()` を維持
- `deploy-preview` を P-06 の実YAML条件へ変更
- Dependabot / fork PR は Preview skip
- `validate` を Preview eligibility と整合
- `validate.if: always()` を維持
- `pull_request_target` は追加しない

#### GitHub Actions

- 全 remote `uses:` を current effective commit の full SHA へ pin
- pinningだけを理由に Version を上げない
- 採用 Action の Advisory を初回確認

#### Documentation

README:

- `CONTRIBUTING.md`
- `SECURITY.md`
- vulnerability を Public Issue へ投稿しない旨

CONTRIBUTING:

- PR / Issue Template
- Security は `SECURITY.md`
- Dependency Update は理由必須
- PR policy は `collaborators_only`
- GitHub Actions は full SHA pin
- Action 変更時は Advisory Review
- 通常 Version Update は自動化しない

CODE_REVIEW:

- 既存記載と矛盾する場合だけ最小修正

Exit:

- Repository変更が完成
- Dependabot / forkがCloudflare Secret不足だけで失敗しない
- normal same-repo PR のPreviewは維持
- `verify` が Dependency Review を aggregate
- non-PRでも`verify`がskippedにならず結果判定する
- Dependabot / forkでも`validate`がskippedにならず結果判定する
- 全 remote Action が full SHA
- write permissionを不要に増やしていない

### Phase 3: Pre-merge Validation

Local:

```bash
pnpm run verify
git diff --check
```

PR CI:

normal same-repo PR:

- Dependency Review success
- Required CI success
- `verify` success
- Preview success
- `validate` success

Dependabot / fork 相当:

- Dependency Review実行
- Required CI実行
- `verify` success
- Preview skipped
- `validate` success

non-PR event contract:

- Dependency Review skipped
- `verify` 自体は実行
- `verify` が Dependency Review skipped を expected result として判定
- `validate` 自体は実行
- Preview skipped を expected result として判定

実際のDependabot PRを作るために脆弱Dependencyを導入しない。

Static validation でよい項目:

- `github.event.pull_request.user.login` による Dependabot 判定
- `github.event.pull_request.head.repo.full_name` による fork 判定
- Cloudflare SecretをDependabotへ複製していない
- Dependency Reviewに`pull-requests: write`を与えていない

Security findings:

- Hardening差分起因のfindingを修正
- Existing Critical / High をTriage
- Existing Moderate / Low をInventory
- Malware AlertをTriage
- Secret scanning AlertをTriage
- Active / validity unknown credentialはrevoke / rotate

Exit:

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- Preview contract PASS
- `verify.if: always()` / `validate.if: always()` 維持確認
- Repository変更は review / merge 判断可能

この時点で実装者が勝手に `main` へ merge しない。

### Phase 4: Post-merge Settings / Final Validation

Repository変更が正規手順で `main` へ反映された後に実施する。

Settings:

- Dependency graph ON
- Dependabot Alerts ON
- Dependabot Malware Alerts ON
- `Dismiss package malware alerts` preset OFF
- Dependabot Security Updates ON
- Dependabot Version Updates OFF
- PVR ON
- Secret scanning ON
- Push protection ON
- CodeQL Default Setup ON
- Actions default permission read-only
- Actions create / approve PR OFF

Security Updates は、この Phase で Dependabot-safe Preview / `validate` が `main` に存在することを確認してから ON にする。

UI / Runtime 確認:

- Issue Forms 表示
- PR Template 自動挿入
- Security tab から `SECURITY.md`
- Security contact link
- Reporter 視点で `Report a vulnerability`
- PVR notification 受信経路
- CodeQL JavaScript / TypeScript successful
- CodeQL `actions` successful
- `main-protection` 維持

Security PR が生成された場合:

- author が `dependabot[bot]`
- Preview skipped
- Dependency Review / Required CI 実行
- `verify` / `validate` が success
- auto-mergeされない

Security PR が生成されない場合は失敗扱いしない。

最後に、未実施項目があれば理由・影響・代替策を記録する。

Security boundaryを成立させる必須項目が未実施なら Hardening 完了にしない。

---

## 7. Failure Handling

### Dependency Review が想定外に block

Rulesetを外さない。

Advisory / scope / dependency を確認し、実測根拠がある場合だけ設定を最小調整する。

### `verify` が non-PR event で skipped

`dependency-review` を `needs` に追加したことで `verify.if: always()` が失われていないか確認する。

`verify` の event別結果判定を修正し、Required check自体を外さない。

### `validate` が Dependabot / fork PR で skipped

`deploy-preview` が skipped でも `validate.if: always()` により実行されることを確認する。

PreviewをDependabot / forkへ広げず、`validate` の expected-result判定を修正する。

### normal PR が Preview Deploy されない

P-06 の `github.event.pull_request` 条件、`needs`、`validate` を確認する。

Dependabot / fork へ Secret を広げない。

normal PR の Secret 不足を skip に弱体化しない。

### Write collaborator を Deployment まで trust できない

Write を維持したまま複雑な例外モデルを作らない。

必要最小権限へ下げる。

将来、中間 trust model が本当に必要になった場合だけ別タスクで Environment を検討する。

### Action SHA pinning で Workflow が壊れる

owner / repository / SHA / resolved tag を確認する。

安易に movable tag へ戻さない。

### Dependabot Security PR が多すぎる

一括mergeしない。

まず実際の件数と運用負荷を確認する。

継続的なノイズになった場合のみ、別タスクで selective auto-triage を検討する。

### Secret leak

Alert closeより revoke / rotateを優先する。

Git history rewrite は影響確認なしに実施しない。

---

## 8. Definition of Done

### 8.1 PR-ready

Repository files:

- `SECURITY.md`
- PR Template
- Bug / Feature Issue Forms
- Security contact link
- README / CONTRIBUTING 整合
- `.github/dependabot.yml` なし

Dependency / CI:

- Dependency Reviewが `ci.yml` へ統合
- `comment-summary-in-pr: never`
- Dependency Reviewのための`pull-requests: write`なし
- `verify` がDependency Review結果を判定
- `verify.if: always()` 維持
- PRでDependency Review success
- non-PRでDependency Review skipped
- non-PRでも`verify`自体は実行
- P-06の`github.event.pull_request...`条件を使用
- normal same-repo PRでPreview success
- Dependabot / forkでPreview skipped
- `validate.if: always()` 維持
- Dependabot / forkでも`validate`自体は実行
- `validate` がPreview契約と整合
- `pull_request_target` 未追加

Cloudflare trust:

- 全Write-capable主体を Deployment Credential まで trust できることを確認済み
- trustできない主体はWriteから外れている
- Cloudflare Token scope確認済み

GitHub Actions:

- 全remote `uses:` full SHA
- pinningだけを理由にVersion Updateしていない
- initial Advisory Review済み
- self-hosted runnerなし
- `permissions: contents: read`を後退させていない
- `persist-credentials: false`を維持

Security findings:

- Hardening差分起因の未対応findingなし
- Existing Critical / HighはTriage済み
- Existing Moderate / LowはInventory済み
- Malware Alert未評価なし
- Secret Alert未評価なし
- Active / validity unknown credentialなし

Quality:

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS

### 8.2 Repository Hardening Complete

Default branch反映後:

- Dependency graph ON
- Dependabot Alerts ON
- Dependabot Security Updates ON
- Dependabot Malware Alerts ON
- Dependabot Version Updates OFF
- Dependabot auto-merge / auto-approveなし
- `Dismiss package malware alerts` preset OFF
- PVR ON
- Reporter向けPVR導線確認済み
- PVR notification確認済み
- Secret scanning ON
- Push protection ON
- CodeQL JavaScript / TypeScript successful
- CodeQL `actions` successful
- Actions default permission read-only
- Actions create / approve PR OFF
- `main`上の全remote Action full SHA
- `main-protection`期待状態維持
- 既存Application / QA behaviorに回帰なし

未実施項目がある場合は理由・影響・代替策が記録されている。

Security boundary の必須条件が未成立なら完了扱いにしない。

---

## 9. Non-goals

今回実施しない:

- `LICENSE`追加 / 選定
- Dependabot Version Updates
- Dependency定期最新版化
- Custom Dependabot Auto-triage Rule
- Low severity Security PRの事前抑制最適化
- Dependabot auto-merge / auto-approve
- Renovate
- GitHub Environment
- CODEOWNERS
- CODE_OF_CONDUCT.md
- SUPPORT.md
- GOVERNANCE.md
- FUNDING
- Merge Queue
- Signed Commit強制
- Repository-level Action SHA enforcement
- CodeQL Advanced Setup
- OpenSSF Scorecards
- License policy enforcement
- 独自Security Dashboard
- 独自scheduled Action advisory scanner
- 固定月次Action Review
- Application / Native Feature変更
- テスト目的の既知脆弱Dependency導入
- Secret除去だけを目的とする無条件Git history rewrite

---

## 10. 実装順序

1. Phase 1 — Rebaseline / Inventory
2. Phase 2 — Repository Changes
3. Phase 3 — Pre-merge Validation
4. PR-ready DoD確認
5. Repository Owner / 通常運用で `main` へ反映
6. Phase 4 — Post-merge Settings / Final Validation
7. Repository Hardening DoD確認

この Plan では、将来起こるか分からない問題を先回りして複雑な仕組みを作らない。

まず GitHub 標準機能と単純な trust rule で運用し、実際に不足や運用負荷が発生した場合だけ次の Hardening を追加する。
