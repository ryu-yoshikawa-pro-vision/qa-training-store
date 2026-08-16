# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として、安全かつ継続的に運用できる状態へ整備する。

この計画では Application 機能や教材内容を変更せず、Public Repository の運用に直接必要な次の領域だけを対象とする。

- Dependency / Supply Chain Security
- Vulnerability Reporting
- Pull Request / Issue の標準化
- GitHub Actions の最小権限と外部入力への安全性
- `main` の保護と Required CI
- GitHub Security Settings
- README / CONTRIBUTING からの運用導線

GitHub が提供する Community Health File を網羅することや、依存 Package を常に最新版へ追従させることは目的としない。

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

実装開始時には最新 `main` と GitHub Settings を再取得し、既に安全側へ設定済みの項目を後退させない。

## 3. 現状認識

現在の Repository には、開発・QA 運用向けの文書と CI が既に存在する。

主な既存ファイル:

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

一方、Public Repository の運用として次が不足または未確定である。

- Security Policy
- Private Vulnerability Reporting との導線
- Pull Request Template
- Issue Forms
- Dependency Review の CI enforcement
- Dependabot Security Updates と Cloudflare Preview Deployment の安全な共存
- GitHub Security Settings の確認・有効化
- `main` Ruleset / Required CI の最終整合
- README / CONTRIBUTING から Security / Contribution Flow への導線

## 4. 設計原則

### 4.1 Simple-first

GitHub 標準機能を優先し、独自 Bot、独自 Security Dashboard、Renovate、独自 Dependency 管理基盤を追加しない。

### 4.2 CI を品質判定の SSOT にする

自動判定できる品質条件を PR Template に重複記載しない。

Required CI は既存の aggregate job `verify` を中心に維持する。

### 4.3 Dependency は「必要だから更新する」

Version が新しいという理由だけでは更新しない。

Dependency Update を行う正当な理由は次に限定する。

1. 既知の脆弱性の修正
2. 利用中 Version の EOL / Support 終了への対応
3. Repository で実際に発生している Bug / Compatibility 問題の解消
4. Expo / React Native / Playwright / Node.js 等の計画的な基盤更新
5. 新機能実装に必要な Dependency Requirement

Patch / Minor / Major のいずれであっても、理由がなければ自動更新しない。

### 4.4 Security Update と Version Update を分離する

- Dependabot Alerts: 有効化する
- Dependabot Security Updates: 有効化する
- Dependabot Version Updates: 今回は有効化しない

`.github/dependabot.yml` は今回追加しない。

GitHub の Dependabot Security Updates は `dependabot.yml` がなくても利用できるため、不要な Version Update PR を発生させるための設定ファイルを先回りして追加しない。

将来 Version Updates が必要になった場合は、その時点で更新対象・頻度・許容範囲を再設計する。

### 4.5 Secret を増やさない

Dependabot PR や外部 PR の Preview Deploy のためだけに Cloudflare Credential を別 Secret Store へ複製しない。

Secret が利用できない PR では Secret を必要とする処理だけを安全に Skip し、コード品質・テスト・Dependency Review は実行する。

### 4.6 Public Repository の外部入力を信頼しない

PR、Issue、Dependabot、Fork 由来の入力は Repository Owner が作成した内容と同じ信頼境界で扱わない。

`pull_request_target` と untrusted head code を組み合わせて Secret を利用する設計は採用しない。

### 4.7 不要な Community File を増やさない

次は現時点では対象外とする。

- `LICENSE`
- `CODEOWNERS`
- `CODE_OF_CONDUCT.md`
- `SUPPORT.md`
- `GOVERNANCE.md`
- `CITATION.cff`
- `.github/FUNDING.yml`
- Renovate 設定
- 独立した CodeQL Workflow
- 独立した Dependency Review Workflow

## 5. Target State

最終的な Repository 内構成は次を目標とする。

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
CODE_REVIEW.md              # 必要な場合のみ最小整合
```

`.github/dependabot.yml` は追加しない。

## 6. Canonical Decisions

### D-01: Dependabot は Security Update のみに使用する

Repository Settings で次を有効化する。

- Dependency graph
- Dependabot alerts
- Dependabot security updates

通常の Version Update は自動化しない。

Dependabot Security Update PR が作成された場合も、通常 PR と同じ Required CI を通す。

### D-02: 定期 Version Update PR は作らない

次は実施しない。

- npm / pnpm Dependency の weekly update
- GitHub Actions の weekly update
- Major / Minor / Patch の無条件更新
- 自動 Merge
- 自動 Approve

GitHub Actions も「新しい Major が出たから」という理由では更新しない。

Security Alert、Runtime Compatibility、Runner deprecation 等の具体的理由がある場合に個別対応する。

### D-03: Dependency の計画更新は通常変更として扱う

Security 以外の Dependency 更新が必要になった場合は、専用または関連 Feature PR で次を確認する。

- 更新理由
- Release Notes / Breaking Changes
- Lockfile 差分
- Expo / React Native compatibility
- Build
- Unit / Integration / Component / Contract Test
- Web E2E
- 必要に応じて Native Build / Runtime Test

「Dependency を最新化する」こと自体を Goal にしない。

### D-04: Security Report は GitHub Private Vulnerability Reporting を Primary とする

`SECURITY.md` に個人メールアドレスを公開しない。

Security Issue は Public Issue / PR に投稿しないよう案内し、GitHub Private Vulnerability Reporting を正式な報告経路とする。

### D-05: Security SLA を約束しない

個人運用で保証できない固定 SLA は記載しない。

次の流れだけを明示する。

1. Private Report を受領
2. 内容を確認
3. 影響を評価
4. 必要に応じて修正・Security Advisory 対応
5. 安全に公開可能になった時点で情報を公開

### D-06: Dependency Review は既存 `ci.yml` へ統合する

新規 Workflow を増やさず、`.github/workflows/ci.yml` に `dependency-review` job を追加する。

実装時点の GitHub 公式 supported major を再確認して使用する。

2026-08-16 時点では `actions/dependency-review-action@v5` が current major である。

Dependency Review は新規・変更 Dependency に既知の脆弱性が入ることを PR 時点で検出するために使用し、Version Update の自動化とは分離する。

### D-07: Dependency Review は PR Event だけで Required とする

`dependency-review` は `pull_request` で実行する。

`push`、`schedule`、`workflow_dispatch` では実行しないか Skip を正常状態として扱う。

既存 `verify` へ統合する場合は Event に応じて次を判定する。

- `pull_request`: Dependency Review success 必須
- その他: Dependency Review skipped を許可

### D-08: Dependabot Security PR では Cloudflare Preview を Required にしない

Dependabot 由来の Workflow では通常の Actions Secrets を利用できないため、Cloudflare Credential を Dependabot Secrets へ複製しない。

Preview Deploy eligibility は少なくとも次を満たす場合だけ true とする。

- PR Head Repository が current repository と同一
- Actor が `dependabot[bot]` ではない
- 必要な Cloudflare Credentials が利用可能

Preview 非対象 PR では Preview Deploy の Skip を意図した正常状態として扱う。

ただし次は実行する。

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

### D-09: `pull_request_target` で Secret 制約を回避しない

Secret を利用するためだけに `pull_request_target` で PR head code を Checkout / Execute しない。

Preview Deploy を Skip する方を採用する。

### D-10: Pull Request Template は説明の標準化に限定する

`.github/pull_request_template.md` は次を含める。

- 概要
- 変更内容
- Scope
- Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CI が判定するコマンドを大量の Checkbox として重複させない。

### D-11: Bug Issue Form は QA 再利用可能な形式にする

`.github/ISSUE_TEMPLATE/bug_report.yml` は最低限次を収集する。

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

Platform 候補:

- Web / Chromium
- Web / Firefox
- Web / WebKit
- Android
- iOS
- Other

Security vulnerability を入力する場所ではないことも明記する。

### D-12: Feature Request は Problem-first にする

`.github/ISSUE_TEMPLATE/feature_request.yml` は次を収集する。

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

### D-13: Blank Issue は外部向けには無効化する

`.github/ISSUE_TEMPLATE/config.yml` で `blank_issues_enabled: false` とする。

Security Report は `SECURITY.md` / Private Vulnerability Reporting へ誘導する。

### D-14: CodeQL は Default Setup を使用する

GitHub Settings から CodeQL Default Setup を有効化する。

初期段階では `.github/workflows/codeql.yml` や custom CodeQL config を追加しない。

Default Setup が Repository 構成に対応できないことが実測された場合だけ Advanced Setup を検討する。

### D-15: `main` の Required Check は aggregate job を優先する

Ruleset の Required status check は既存 `verify` を中心にする。

Matrix job や個別 job を多数 Ruleset に列挙しない。

Dependency Review は `verify` に集約して required 判定へ反映する。

### D-16: Branch up-to-date requirement は初期状態で OFF

CI が重く、複数 PR が並行するため、`Require branches to be up to date before merging` は初期状態では OFF とする。

競合・高リスク変更では必要に応じて明示的に branch update を行う。

### D-17: Pull Request は必須、Approval は 0

個人運用を前提として次とする。

- Require a pull request before merging: ON
- Required approvals: 0
- Require conversation resolution: ON
- Block force pushes: ON
- Restrict deletions: ON
- Require linear history: ON

Bypass を用意する場合は Administrator の `For pull requests only` とし、通常の direct push bypass にしない。

### D-18: Merge は Squash を基本とする

Repository Settings:

- Squash merge: ON
- Merge commit: OFF
- Rebase merge: OFF
- Automatically delete head branches: ON

Auto-merge は運用上必要なら ON とするが、Security Update を自動 Merge する仕組みは作らない。

### D-19: Actions default permission は read-only

Repository Settings > Actions > General で次を確認する。

- Workflow permissions: Read repository contents and packages
- Allow GitHub Actions to create and approve pull requests: OFF

Workflow が write permission を必要とする場合は、その Workflow / Job の最小範囲だけ明示する。

### D-20: Security Settings をコードと同じ完了対象として扱う

次を確認・有効化する。

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Private vulnerability reporting
- Secret scanning
- Push protection
- CodeQL Default Setup

設定変更不能な場合は推測で完了扱いせず、未完了項目として報告する。

## 7. Implementation Waves

## Wave 0: Rebaseline / Inventory

### 実施内容

1. 最新 `main` HEAD を確認する。
2. Open PR と変更競合を確認する。
3. 次の存在・内容を再確認する。
   - `SECURITY.md`
   - `.github/pull_request_template.md`
   - `.github/ISSUE_TEMPLATE/**`
   - `.github/dependabot.yml`
   - `.github/workflows/ci.yml`
   - `README.md`
   - `CONTRIBUTING.md`
4. GitHub Settings の Current State を確認する。
5. `.github/dependabot.yml` が既に追加されていた場合は目的を確認し、通常 Version Update が不要なら削除または無効化を検討する。

### Exit Criteria

- Repository 内変更と GitHub Settings 変更の Gap が確定している。
- Version Update を自動化しない方針が維持されている。

## Wave 1: Security Reporting / Contribution Entry Point

### 1. `SECURITY.md`

追加する。

Minimum Contract:

- Supported scope は current `main` / latest deployment を基本とする
- Public Issue / PR に vulnerability を投稿しない
- Private Vulnerability Reporting を利用する
- 個人メールアドレスを公開しない
- 固定 SLA を約束しない
- 再現手順、影響範囲、環境、Evidence 等の報告情報を案内する

### 2. `.github/pull_request_template.md`

追加する。

過剰な CI Checkbox を避け、変更意図・Scope・Evidence・Security / Dependency Impact を記録する。

### 3. Issue Forms

追加する。

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

YAML syntax と GitHub Issue Form schema を検証する。

### Exit Criteria

- Security / Bug / Feature の入口が分離されている。
- Security 問題が Public Issue へ誘導されない。
- PR の説明項目が既存運用と整合している。

## Wave 2: Dependency Review / CI Trust Boundary

### 1. Dependency Review job

`.github/workflows/ci.yml` に追加する。

条件:

- `pull_request` のみ実行
- `permissions: contents: read`
- official `actions/dependency-review-action` を使用
- 実装時点の current supported major を確認

### 2. `verify` 統合

PR では Dependency Review success を必須にする。

非 PR Event では skipped を許容する。

### 3. Preview Deploy 条件

Dependabot Security Update PR / fork PR 等で Secret 前提の Deploy が失敗しないようにする。

重要:

- Quality Gate 自体は Skip しない
- Secret を Dependabot 用へ複製しない
- `pull_request_target` で回避しない

### Exit Criteria

- 脆弱な Dependency を新規導入する PR を Dependency Review が検出できる。
- Dependabot Security PR でも Required CI が実行できる。
- Preview 非対象 PR が Cloudflare Secret 不在だけで失敗しない。

## Wave 3: Documentation Alignment

### README

必要な範囲だけ追加する。

- `CONTRIBUTING.md` へのリンク
- `SECURITY.md` へのリンク
- Security vulnerability は Public Issue へ投稿しない旨

### CONTRIBUTING

必要な範囲だけ整合する。

- PR Template を利用する
- Bug / Feature Issue Form を利用する
- Security issue は `SECURITY.md` に従う
- Dependency Update は明確な理由がある場合だけ行う

### CODE_REVIEW

既存記載と矛盾する場合のみ最小修正する。

### Exit Criteria

- README / CONTRIBUTING / Template / Security Policy が矛盾しない。
- 不要な運用文書を新設していない。

## Wave 4: GitHub Settings Hardening

Repository UI で次を確認・設定する。

### Ruleset

`main-protection`:

- Enforcement: Active
- Target: Default branch
- Require pull request: ON
- Required approvals: 0
- Require conversation resolution: ON
- Require status checks: ON
- Required check: `verify`
- Require branches up to date: OFF
- Require linear history: ON
- Restrict deletions: ON
- Block force pushes: ON
- Signed commits: OFF
- Merge queue: OFF
- Bypass を設定する場合: Repository administrator / For pull requests only

### Pull Requests

- Squash merge: ON
- Merge commit: OFF
- Rebase merge: OFF
- Delete head branches: ON
- Web commit sign-off: DCO 等を採用していなければ OFF

### Actions

- Default workflow permission: read-only
- Actions create / approve PR: OFF
- 外部 Contributor workflow approval は安全側の設定を維持

### Security

- Dependency graph: ON
- Dependabot alerts: ON
- Dependabot security updates: ON
- Dependabot version updates: OFF / 未設定
- Private vulnerability reporting: ON
- Secret scanning: ON
- Push protection: ON
- CodeQL: Default Setup ON

### Exit Criteria

- `main` direct update の通常経路が閉じられている。
- Required CI が `verify` に集約されている。
- Version Update の自動 PR が発生する設定になっていない。
- Security Alert / Security Update / Secret Detection / Code Scanning が有効である。

## Wave 5: Validation

### Static Validation

最低限:

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run security:check
pnpm run test:contracts
```

Workflow / YAML 変更について既存 Repository validation がある場合はそれも実行する。

### CI Validation

通常 PR 相当:

- Dependency Review が success
- Existing required CI が success
- Preview Deploy が eligible PR で既存通り動作
- `verify` が success

Dependabot / untrusted PR 相当:

- Secret-dependent Preview は安全に skip
- Dependency Review は実行
- Required test / build は実行
- `verify` が正しく success / failure を判定

### GitHub UI Validation

Default branch 反映後に確認する。

- Issue Forms が表示される
- PR Template が自動挿入される
- Security Policy が Security tab から参照できる
- Private Vulnerability Reporting が利用できる
- Dependabot Alerts / Security Updates が有効
- 不要な Version Update PR が作られない
- Ruleset が `main` に適用される

## 8. Rollback Strategy

### Dependency Review が誤検知する場合

Ruleset を無効化して回避するのではなく、まず Dependency Review job の検出内容を確認する。

必要なら action configuration を最小限調整する。

### Preview Deploy 条件変更で通常 PR が Deploy されない場合

Eligibility 条件を修正する。

Dependabot / fork へ Secret を拡張する方向では直さない。

### Issue Form が壊れた場合

対象 YAML を修正する。

Blank Issue を恒久的な回避策として再度有効化しない。

### CodeQL Default Setup が適合しない場合

Required Gate 化せず一旦 Default Setup の結果を確認する。

Advanced Setup は必要性が実測された場合だけ別途検討する。

## 9. Non-goals

この Plan では次を行わない。

- `LICENSE` の追加・選定
- Dependency の定期 Version Update
- Dependency の一括最新版化
- Dependabot Version Update PR
- Dependabot auto-merge
- Renovate 導入
- CODEOWNERS
- Code of Conduct
- Governance 文書
- Support 文書
- Funding 設定
- 独自 Security Dashboard
- 独自 Dependency Bot
- Merge Queue
- Signed Commit 強制
- CodeQL Advanced Setup
- Application Feature 変更
- Native Feature 変更

## 10. Definition of Done

次をすべて満たした時点で完了とする。

### Repository Files

- `SECURITY.md` が存在する
- PR Template が存在する
- Bug / Feature Issue Form が存在する
- Issue Template config が存在する
- `.github/dependabot.yml` を不要に追加していない
- README / CONTRIBUTING の導線が整合している

### Dependency / Supply Chain

- Dependency graph が有効
- Dependabot alerts が有効
- Dependabot security updates が有効
- Dependabot version updates は無効 / 未設定
- Dependency Review が PR CI に統合されている
- 不要な定期 Version Update PR が発生しない

### Security

- Private vulnerability reporting が有効
- Secret scanning が有効
- Push protection が有効
- CodeQL Default Setup が有効

### CI / GitHub Actions

- Dependency Review が `verify` に反映されている
- Dependabot Security PR が Secret 不在だけで失敗しない
- 通常 PR の既存 Preview Deployment を壊していない
- Actions default permission が read-only
- Actions create / approve PR が OFF

### Branch / Merge Protection

- `main` が Ruleset で保護されている
- PR が必須
- `verify` が Required
- Force Push が block
- Branch deletion が restricted
- Conversation resolution が required
- Squash merge を基本とする

### Quality

- Required validation が PASS
- Public Repository の既存 Application / QA behavior に回帰がない
- GitHub Settings と Repository 文書に矛盾がない

## 11. 実装順序

実装時は次の順で進める。

1. 最新 `main` / Settings を Rebaseline
2. `SECURITY.md`
3. PR Template
4. Bug / Feature Issue Forms + config
5. Dependency Review を `ci.yml` へ統合
6. Dependabot / fork の Preview Deploy eligibility を修正
7. `verify` を更新
8. README / CONTRIBUTING / 必要な CODE_REVIEW 整合
9. Static / CI Validation
10. GitHub Security Settings を設定
11. Ruleset / Merge / Actions Settings を設定
12. Default branch 反映後の UI / Security / Dependabot 状態を確認

この順序により、不要な Dependency Version Update を導入せず、Public Repository として必要な Security・Contribution・CI・Branch Protection のみを整備する。
