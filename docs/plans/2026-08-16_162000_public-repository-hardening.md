# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として、安全かつ継続的に運用できる状態へ整備する。

この計画では Application 機能や教材内容を変更せず、Public Repository の運用に直接必要な次の領域だけを対象とする。

- Dependency / Supply Chain Security
- Vulnerability Reporting
- Pull Request / Issue の標準化
- GitHub Actions の最小権限と Supply Chain Hardening
- Dependabot Security Update と CI の整合
- `main` の保護と Required CI の維持
- GitHub Security Settings
- README / CONTRIBUTING からの運用導線

GitHub が提供する Community Health File を網羅することや、依存 Package / GitHub Actions を常に最新版へ追従させることは目的としない。

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

実装開始時には最新 `main` と GitHub Settings を再取得する。

この Plan 作成後に設定が変更されている可能性があるため、既に安全側へ設定済みの項目を後退させない。

## 3. 現状認識

### 3.1 Repository 内

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

不足または未整備なのは次である。

- `SECURITY.md`
- Private Vulnerability Reporting との導線
- Pull Request Template
- Bug / Feature Issue Forms
- Dependency Review の CI enforcement
- Dependabot Security Update PR と Cloudflare Preview Deployment の安全な共存
- GitHub Actions の full-length commit SHA pinning
- GitHub Security Settings の最終確認
- README / CONTRIBUTING から Security / Contribution Flow への導線

`.github/dependabot.yml` は存在しない前提で進め、通常の Version Update を目的に追加しない。

### 3.2 GitHub Settings の確認済み状態

2026-08-16 時点で `main-protection` Ruleset は既に Active である。

確認済みの内容:

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

Repository merge settings も次の状態になっている。

- Squash merge: ON
- Merge commit: OFF
- Rebase merge: OFF
- Automatically delete head branches: ON
- Web commit sign-off: OFF
- Auto-merge: OFF

したがって、今回これらを「新規設定」することを前提にしない。

実装時には Current State を再取得し、安全設定が維持されていることを確認し、不足分だけ補完する。

### 3.3 Contribution Policy

現在の Repository は Public だが、Pull Request creation policy は `collaborators_only` である。

したがって現時点の通常運用は次とする。

- Issue: Public contributor の入口として利用可能
- Pull Request: Collaborator 中心
- Security vulnerability: Private Vulnerability Reporting

Fork PR の安全性は現時点の主運用ではなく、将来 policy を変更しても危険にならない Defense-in-depth として扱う。

## 4. 設計原則

### 4.1 Simple-first

GitHub 標準機能を優先し、独自 Bot、独自 Security Dashboard、Renovate、独自 Dependency 管理基盤を追加しない。

### 4.2 CI を品質判定の SSOT にする

自動判定できる品質条件を PR Template に重複記載しない。

Required CI は既存 aggregate job `verify` を中心に維持する。

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

今回の方針:

- Dependency graph: 有効化 / 維持
- Dependabot alerts: 有効化 / 維持
- Dependabot security updates: 有効化するが、CI 対応が `main` に反映された後に実施する
- Dependabot version updates: 有効化しない
- `.github/dependabot.yml`: 追加しない

Dependabot Security Updates は `dependabot.yml` がなくても利用できるため、通常 Version Update PR を発生させる設定ファイルを先回りして追加しない。

### 4.5 Secret を増やさない

Dependabot PR や外部 PR の Preview Deploy のためだけに Cloudflare Credential を Dependabot Secrets 等へ複製しない。

Secret を利用できない信頼境界では、Secret を必要とする処理だけを実行対象外とする。

コード品質、テスト、Build、Dependency Review 自体は維持する。

### 4.6 Preview eligibility と Secret availability を分離する

Preview Deployment の対象判定と Secret の存在確認を混同しない。

Preview eligible の基本契約:

```text
pull_request
AND head repository == current repository
AND actor != dependabot[bot]
```

Preview eligible である通常 PR では Cloudflare Credentials を必須とし、Secret が欠落していれば Fail させる。

つまり次を禁止する。

```text
通常 PR
→ Cloudflare Secret がない
→ Preview を黙って Skip
→ CI Success
```

これは設定事故を隠すため採用しない。

Preview ineligible:

- Dependabot PR
- Fork PR
- Pull Request 以外の Event

これらでは `deploy-preview` の Skip を正常状態として扱う。

### 4.7 Public Repository の外部入力を信頼しない

PR、Issue、Dependabot、Fork 由来の値を trusted input として shell script へ直接展開しない。

`pull_request_target` と untrusted head code を組み合わせて Secret を利用する設計は採用しない。

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
- その他、実装時 Inventory で確認された remote Action / reusable workflow

これは Version Update ではない。

既存 Action については、実装時点で現在参照している tag が指す commit を確認し、その commit を固定して現在の有効実装を freeze する。

勝手に次の Major / Minor へ更新しない。

Human-readable な Version を comment で残す。

例:

```yaml
uses: actions/checkout@<full-commit-sha> # v4
```

新規追加する Dependency Review Action だけは、実装時点の公式 supported major を選び、同様に full SHA へ pin する。

### 4.9 不要な Community File を増やさない

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
CODE_REVIEW.md              # 既存記載と矛盾する場合だけ最小修正
```

`.github/dependabot.yml` は追加しない。

## 6. Canonical Decisions

### D-01: Dependabot は Security Update のみに使用する

通常 Version Update を自動化しない。

Dependabot Security Update PR が作成された場合も、通常の Required Quality CI を通す。

Dependabot Security Updates 自体は、Dependabot-safe CI が default branch に反映された後に有効化する。

### D-02: 定期 Version Update PR は作らない

次は実施しない。

- npm / pnpm Dependency の weekly update
- GitHub Actions の weekly update
- Major / Minor / Patch の無条件更新
- Dependabot auto-merge
- 自動 Approve

GitHub Actions も「新しい Major が出たから」という理由では更新しない。

Security Advisory、Runner / Runtime deprecation、実際の互換性問題等の具体的理由がある場合だけ個別更新する。

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

### D-04: Security Report は Private Vulnerability Reporting を Primary とする

`SECURITY.md` に個人メールアドレスを公開しない。

Security vulnerability は Public Issue / PR に投稿しないよう案内し、GitHub Private Vulnerability Reporting を正式な報告経路とする。

Private Vulnerability Reporting が利用不能な状態を `SECURITY.md` だけで隠さない。

GitHub Settings 側の有効化も Definition of Done に含める。

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

2026-08-16 時点の current major は `actions/dependency-review-action@v5` である。

実装時に公式 current supported major と Runner requirement を再確認し、full-length commit SHA に pin する。

### D-07: Dependency Review policy を明示する

Action default に暗黙依存しない。

初期 policy は次とする。

```yaml
with:
  vulnerability-check: true
  fail-on-severity: moderate
  fail-on-scopes: runtime, development
  license-check: false
  show-openssf-scorecard: false
```

意図:

- Moderate / High / Critical vulnerability の新規導入を block
- Application dependency だけでなく CI / Test / Build に利用される development dependency も対象
- Low severity は初期 Required Gate では block しない
- 今回 License policy は対象外なので license check も Required Gate にしない
- OpenSSF Scorecard は今回の目的に不要なので Dependency Review の出力を広げない

`unknown` scope は初期状態では block 対象に加えない。

実際の pnpm dependency classification で見逃しが確認された場合だけ追加検討する。

### D-08: Dependency Review は PR Event だけで Required とする

`dependency-review` は `pull_request` のみ実行する。

`push`、`schedule`、`workflow_dispatch` では Skip を正常状態として扱う。

`verify` では次を明示的に判定する。

```text
pull_request
→ dependency-review == success 必須

other events
→ dependency-review == skipped 必須
```

`success OR skipped` のような曖昧な条件にはしない。

### D-09: `verify` は Required Quality Gate の aggregate とする

Ruleset の Required status check は既存 `verify` を維持する。

Matrix job や個別 job を Ruleset に大量追加しない。

Dependency Review を `verify.needs` と結果判定へ組み込む。

Cloudflare Preview Deployment は `verify` より後段であるため、Ruleset の merge-required check とは分離したままにする。

### D-10: Preview Deploy の契約を明示する

現在の `validate` は PR で `deploy-preview == success` を要求しているため、Preview eligibility 変更と `validate` 契約変更は同一変更として扱う。

Expected result:

```text
same-repo normal PR
→ deploy-preview == success 必須

Dependabot PR
→ deploy-preview == skipped 必須

fork PR
→ deploy-preview == skipped 必須

push / schedule / workflow_dispatch
→ deploy-preview == skipped 必須
```

通常 PR で Preview が意図せず Skip されても Success 扱いにしない。

Preview eligible な通常 PR では Cloudflare Secret の欠落を Fail とする。

### D-11: Dependabot Security PR へ Secret を複製しない

Dependabot 由来の Workflow では通常の Actions Secrets を利用できない前提とする。

Cloudflare Credential を Dependabot Secrets へ複製して Preview Deployment を実行しない。

Dependabot PR でも次は実行する。

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

### D-12: `pull_request_target` で Secret 制約を回避しない

Secret を利用するためだけに `pull_request_target` で PR head code を Checkout / Execute しない。

### D-13: Pull Request Template は説明の標準化に限定する

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

### D-14: Bug Issue Form は QA 再利用可能な形式にする

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

### D-15: Feature Request は Problem-first にする

`.github/ISSUE_TEMPLATE/feature_request.yml` は次を収集する。

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

### D-16: Blank Issue は外部向けには無効化する

`.github/ISSUE_TEMPLATE/config.yml` で `blank_issues_enabled: false` とする。

Write / Maintain / Admin の Maintainers-only Blank Issue は GitHub 標準挙動として残る前提とする。

Security Report は `SECURITY.md` / Private Vulnerability Reporting へ誘導する。

### D-17: CodeQL は Default Setup を使用する

GitHub Settings から CodeQL Default Setup を有効化する。

初期段階では `.github/workflows/codeql.yml` や custom CodeQL config を追加しない。

Enable しただけで完了にせず、少なくとも1回 successful analysis を確認する。

Default Setup が Repository 構成に対応できないことが実測された場合だけ Advanced Setup を別対応として検討する。

### D-18: GitHub Actions の remote references は full SHA に固定する

`.github/workflows/**` の remote `uses:` を Inventory し、全て full-length commit SHA へ pin する。

既存 tag reference を別 Version へ更新することは目的ではない。

既存 tag の現在の effective commit を確認し、その commit を固定する。

新規 Dependency Review Action も full SHA へ pin する。

同時に次を確認する。

- Action source が expected owner / repository である
- unknown / unused remote Action を残していない
- `persist-credentials: false` を既存通り維持する
- Secret を使う Job で不要な write permission を追加しない

### D-19: Action SHA enforcement は default branch 反映後に有効化する

GitHub Settings に full-length SHA pinning requirement が利用可能な場合、全 Workflow の pinning が `main` に反映された後に有効化する。

既存 Workflow が tag reference のままの段階で先に enforcement を有効化して CI を破壊しない。

Settings が利用不能な場合も、Workflow file 自体の full SHA pinning は Definition of Done とする。

### D-20: Self-hosted runner は Public PR Workflow で使用しない

実装時 Inventory で `.github/workflows/**` に `self-hosted` runner がないことを確認する。

将来導入する場合は、この Hardening 方針とは別に trust boundary を設計する。

### D-21: `main-protection` は既存設定を維持する

現在すでに Active であるため、再作成しない。

期待する維持状態:

- Require pull request: ON
- Required approvals: 0
- Require conversation resolution: ON
- Required status checks: ON
- Required check: `verify`
- Require branches up to date: OFF
- Require linear history: ON
- Restrict deletions: ON
- Block force pushes: ON
- Allowed merge method: Squash
- Bypass: なしを維持

運用上の具体的な必要性がない限り bypass を追加しない。

### D-22: Actions default permission は read-only

Repository Settings > Actions > General で次を確認する。

- Workflow permissions: Read repository contents and packages
- Allow GitHub Actions to create and approve pull requests: OFF

Workflow が write permission を必要とする場合は、その Workflow / Job だけへ最小権限を明示する。

### D-23: Existing security findings の扱いを定義する

Security feature を有効化すると既存問題が初めて可視化される可能性がある。

扱い:

#### 今回の差分が原因

今回の実装内で修正する。

#### Existing Critical / High

- 必ず Triage する
- 修正版があり、安全に切り分け可能なら Security Update として対応する
- 修正版がない、誤検知、利用経路上影響しない等の場合は根拠を記録する
- 未評価のまま Hardening 完了としない

#### Existing Moderate / Low

- Triage する
- 無条件の一括 Version Update は行わない
- 利用経路、fix availability、影響を基に別対応の要否を判断する

「scanner を有効化したので完了」ではなく、結果を確認するところまでを今回の作業に含める。

## 7. Implementation Waves

## Wave 0: Rebaseline / Inventory

### 目的

実装時点の Repository と GitHub Settings を確定する。

### 実施内容

1. 最新 `main` HEAD を取得する。
2. Open PR と変更競合を確認する。
3. 次の存在・内容を確認する。
   - `SECURITY.md`
   - `.github/pull_request_template.md`
   - `.github/ISSUE_TEMPLATE/**`
   - `.github/dependabot.yml`
   - `.github/workflows/ci.yml`
   - `.github/workflows/native-ci.yml`
   - `.github/workflows/native-ios-ci.yml`
   - `README.md`
   - `CONTRIBUTING.md`
   - `CODE_REVIEW.md`
4. `.github/workflows/**` の全 `uses:` を Inventory する。
5. self-hosted runner 利用がないことを確認する。
6. GitHub Settings の Current State を確認する。
   - Ruleset
   - Merge settings
   - Pull Request creation policy
   - Actions workflow permissions
   - Actions create / approve PR permission
   - Actions policy / SHA enforcement availability
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates
   - Private vulnerability reporting
   - Secret scanning
   - Push protection
   - CodeQL
7. 既存 Dependabot Alerts がある場合、件数・Severity・fix availability を記録する。

### Exit Criteria

- Repository 内変更と Settings 変更の Gap が確定している。
- 現在の Ruleset を再作成する必要がないことを確認している。
- Version Update を自動化しない方針が維持されている。
- Action pinning 対象が列挙できている。

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

変更意図、Scope、Evidence、Security / Dependency Impact を記録する。

自動検証項目の羅列は避ける。

### 3. Issue Forms

追加する。

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

GitHub Issue Form schema に従う。

Security vulnerability を Public Issue へ誘導しない。

### Exit Criteria

- Security / Bug / Feature の入口が分離されている。
- PR Template が既存のレビュー運用と矛盾しない。
- Blank Issue の外部利用を抑制している。

## Wave 2: GitHub Actions / Supply Chain Hardening

### 1. Remote Action Inventory

`.github/workflows/**` の remote `uses:` を列挙する。

同一 Action が複数箇所に存在しても、採用 commit を統一する。

### 2. Existing Action pinning

現在の effective tag commit を確認し、full-length commit SHA へ pin する。

Version を意図的に上げない。

例:

```yaml
uses: actions/setup-node@<full-commit-sha> # v4
```

### 3. Dependency Review job

`.github/workflows/ci.yml` に追加する。

条件:

- `pull_request` のみ実行
- `permissions: contents: read`
- official `actions/dependency-review-action`
- current supported major
- full-length commit SHA pin
- vulnerability-check: true
- fail-on-severity: moderate
- fail-on-scopes: runtime, development
- license-check: false
- show-openssf-scorecard: false

PR comment を書き込むための `pull-requests: write` は追加しない。

### 4. `verify` integration

`dependency-review` を `needs` に追加する。

Event contract:

- PR: success 必須
- non-PR: skipped 必須

### Exit Criteria

- 全 remote GitHub Action / reusable workflow が full SHA で固定されている。
- 不要な Action Version Update を行っていない。
- Dependency Review policy が明示されている。
- Dependency Review が `verify` に集約されている。

## Wave 3: CI Trust Boundary / Preview Contract

### 1. Preview eligibility

`deploy-preview` の実行条件を明確化する。

Eligible:

- `pull_request`
- PR head repository == current repository
- actor != `dependabot[bot]`

Cloudflare Secret の有無は eligibility の条件にしない。

### 2. Eligible PR の Secret validation

通常 same-repo PR が eligible なら Cloudflare Credentials を必須とする。

欠落時は Fail する。

### 3. Ineligible PR

Dependabot / fork PR では `deploy-preview` を Skip する。

Secret を複製しない。

### 4. `validate` contract

次を厳密に判定する。

```text
same-repo normal PR
→ deploy-preview success

Dependabot / fork PR
→ deploy-preview skipped

non-PR
→ deploy-preview skipped
```

通常 PR の意図しない Skip を許可しない。

### 5. Untrusted input review

今回変更する Workflow condition / shell script について、PR actor、branch、repository name 等の untrusted context を script 本文へ直接埋め込んでいないか確認する。

必要な値は `env` 経由で渡す。

### Exit Criteria

- Dependabot PR が Cloudflare Secret 不在だけで失敗しない。
- 通常 PR の Preview regression を Fail として検出できる。
- `pull_request_target` を追加していない。
- Required Quality Gate は Dependabot PR でも維持される。

## Wave 4: Documentation Alignment

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
- 現在の PR policy は `collaborators_only`

外部 contributor に利用不能な PR 手順を主導線として案内しない。

### CODE_REVIEW

既存記載と矛盾する場合のみ最小修正する。

### Exit Criteria

- README / CONTRIBUTING / Template / Security Policy が矛盾しない。
- Contribution policy が実際の GitHub Settings と一致している。
- 不要な運用文書を新設していない。

## Wave 5: Pre-merge GitHub Settings Hardening

この Wave では、default branch へコード変更を反映する前でも安全に有効化できる Settings のみ扱う。

### Ruleset / Merge Settings

現在の `main-protection` と merge settings を再確認する。

既存の安全設定を維持し、再作成しない。

### Actions

確認する。

- Default workflow permission: read-only
- Actions create / approve PR: OFF
- Public fork workflow approval: 現在の policy と矛盾しない安全側設定

SHA enforcement はこの Wave ではまだ有効化しない。

### Security

有効化 / 確認する。

- Dependency graph
- Dependabot alerts
- Private vulnerability reporting
- Secret scanning
- Push protection
- CodeQL Default Setup

**Dependabot security updates はまだ有効化しない。**

CI の Dependabot-safe 変更が default branch へ入る前に Security Update PR を生成させない。

### CodeQL validation

Default Setup を有効化した場合は、最低1回の successful analysis を確認する。

Alert が発生した場合は D-23 に従って Triage する。

### Exit Criteria

- Security reporting と Secret detection が有効である。
- CodeQL が実際に解析成功している。
- Dependabot Security Updates は意図的に未有効化のままである。
- Ruleset の既存安全設定を壊していない。

## Wave 6: Pre-merge Validation

### Local / Static Validation

最低限次を実行する。

```bash
pnpm run verify
git diff --check
```

`pnpm run verify` で Repository 標準の Format、Markdown lint、Spec validation、Curriculum validation、Lint、Typecheck、Security static check、Test、Build を通す。

必要に応じて Workflow YAML / Issue Form YAML の構文検証も実行する。

### GitHub Actions Validation

実際の PR 相当 Run で確認する。

通常 same-repo PR:

- Dependency Review success
- Existing required CI success
- Preview Deploy success
- `verify` success
- `validate` success

Dependabot / untrusted 相当:

- Secret-dependent Preview skipped
- Dependency Review 実行
- Required test / build 実行
- `verify` が正しく success / failure を判定
- `validate` が意図した Skip のみ許可

実際の Dependabot PR をこの段階で無理に生成する必要はない。

Condition の Unit-like 検証または安全な event simulation が既存手段で可能なら利用する。

### Action pinning validation

- `.github/workflows/**` に tag-only remote `uses:` が残っていない
- full-length SHA が40桁である
- comment で採用 Version が確認できる
- 全 Workflow が GitHub Actions 上で正常に解決する

### Exit Criteria

- `pnpm run verify` PASS
- `git diff --check` PASS
- Required PR CI PASS
- normal Preview PASS
- Dependabot / fork で Secret を要求しない契約が確認できる
- Action SHA pinning による Workflow regression がない

## Wave 7: Default Branch 反映後の Activation

この Wave は、Wave 1-6 の Repository 変更が `main` / default branch に反映されたことを確認してから実施する。

### 1. Default branch state check

次を `main` で確認する。

- Dependabot-safe Preview condition が存在する
- updated `validate` contract が存在する
- Dependency Review が `verify` に接続されている
- Action refs が full SHA pin 済み
- `SECURITY.md` / Issue Forms / PR Template が default branch 上に存在する

### 2. Dependabot Security Updates ON

この時点で初めて Dependabot Security Updates を有効化する。

有効化直前に既存 Alert を再確認する。

有効化後に Security Update PR が生成された場合:

- Preview が skipped
- Dependency Review / Required CI が実行
- 自動 Merge されない
- 内容を Triage して必要な更新だけ採用

### 3. Action SHA enforcement

Repository Settings に full-length commit SHA requirement が利用可能なら、この時点で有効化する。

既に `main` 上の Workflow が full SHA であることを先に確認する。

### 4. UI / Security validation

Default branch 反映後に確認する。

- Issue Forms が表示される
- PR Template が自動挿入される
- Security Policy が Security tab から参照できる
- Private Vulnerability Reporting が利用できる
- Dependabot Alerts が有効
- Dependabot Security Updates が有効
- Dependabot Version Updates 用 `dependabot.yml` が存在しない
- CodeQL Default Setup が successful
- Secret scanning / Push protection が有効
- Ruleset が `main` に適用されている
- Actions SHA enforcement が有効、または利用不能理由が記録されている

### Exit Criteria

- Security Update PR が安全な CI contract で処理できる。
- 不要な Version Update PR は自動生成されない。
- Repository Settings と default branch の実装が整合している。

## 8. Existing Finding Triage

Security feature 有効化後に検出された finding を無視しない。

### Critical / High

次を記録する。

- Finding / Advisory ID
- 影響する Dependency / Code
- 実際の利用経路
- Fix availability
- 対応判断

修正版があり、現在利用中の脆弱性へ該当する場合は「不要な Version Update」ではなく Security Update として扱う。

ただし、依存関係全体の最新版化へ拡大しない。

### Moderate / Low

Triage するが、一括更新しない。

修正の必要性は actual exposure と更新 risk を比較して判断する。

### Definition

未評価の Critical / High Finding を残したまま今回の Hardening を完了扱いにしない。

## 9. Rollback Strategy

### Dependency Review が不適切に block する場合

Ruleset を解除して回避しない。

まず次を確認する。

- Severity
- Scope classification
- Actual introduced dependency
- GitHub Advisory

必要なら `fail-on-severity` / scope を、実測根拠に基づいて最小調整する。

### Preview Deploy 条件変更で通常 PR が Deploy されない場合

Eligibility 条件を修正する。

Dependabot / fork へ Secret を拡張する方向では直さない。

通常 same-repo PR の Secret 不在を Skip 扱いへ弱体化しない。

### Action SHA pinning で Workflow が壊れた場合

該当 Action の tag と pin した commit の対応を再確認する。

安易に tag reference へ戻す前に、誤った SHA / owner / Action path でないか確認する。

### Issue Form が壊れた場合

対象 YAML を修正する。

Blank Issue を恒久的な回避策として再度有効化しない。

### CodeQL Default Setup が適合しない場合

Required Gate 化せず、一旦 Default Setup の結果と failure reason を確認する。

Advanced Setup は必要性が実測された場合だけ別対応として検討する。

### Dependabot Security Updates が大量 PR を生成した場合

一括 Merge しない。

Severity、direct / transitive dependency、fix risk を Triage する。

Security Update を止めることを最初の回避策にせず、必要なら PR を順番に処理する。

## 10. Non-goals

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
- OpenSSF Scorecards 導入
- License policy enforcement

## 11. Definition of Done

次をすべて満たした時点で完了とする。

### Repository Files

- `SECURITY.md` が存在する
- PR Template が存在する
- Bug / Feature Issue Form が存在する
- Issue Template config が存在する
- `.github/dependabot.yml` を不要に追加していない
- README / CONTRIBUTING の導線が整合している
- CONTRIBUTING が `collaborators_only` の実運用と矛盾しない

### Dependency / Supply Chain

- Dependency graph が有効
- Dependabot alerts が有効
- Dependabot security updates が default branch の CI 対策反映後に有効化されている
- Dependabot version updates 用設定を追加していない
- Dependency Review が PR CI に統合されている
- Dependency Review が Moderate 以上の runtime / development vulnerability を block する
- License / OpenSSF Scorecard を今回の Required Gate にしていない
- 不要な定期 Version Update PR が発生しない

### GitHub Actions Supply Chain

- `.github/workflows/**` の remote `uses:` が full-length commit SHA に pin されている
- pinning のためだけに Action major / minor version を更新していない
- Action Version の human-readable comment が残っている
- Public PR Workflow が self-hosted runner を利用していない
- `persist-credentials: false` を既存方針通り維持している
- GitHub Settings の SHA enforcement が利用可能なら、default branch pinning 後に有効化されている

### Security

- Private vulnerability reporting が有効
- Secret scanning が有効
- Push protection が有効
- CodeQL Default Setup が有効
- CodeQL が最低1回 successful analysis を完了している
- 未評価の Critical / High Finding がない

### CI / GitHub Actions

- Dependency Review が `verify` に反映されている
- PR では Dependency Review success が必要
- non-PR では Dependency Review skipped が期待値になっている
- Dependabot Security PR が Secret 不在だけで失敗しない
- 通常 same-repo PR の Preview Deployment を壊していない
- 通常 PR の Cloudflare Secret 欠落は Fail する
- Dependabot / fork PR の Preview は Skip する
- `validate` が正常 PR と ineligible PR を区別している
- Actions default permission が read-only
- Actions create / approve PR が OFF

### Branch / Merge Protection

- 既存 `main-protection` Ruleset が Active
- PR が必須
- `verify` が Required
- Force Push が block
- Branch deletion が restricted
- Conversation resolution が required
- Linear history が required
- Squash only
- Strict branch update requirement は OFF
- 不要な bypass を追加していない

### Quality

- `pnpm run verify` PASS
- `git diff --check` PASS
- GitHub Actions Required CI PASS
- Issue Forms が default branch 上で表示される
- PR Template が default branch 上で動作する
- Security Policy / Private Vulnerability Reporting が利用可能
- Public Repository の既存 Application / QA behavior に回帰がない
- GitHub Settings と Repository 文書に矛盾がない

## 12. 実装順序

実装時は次の順で進める。

1. 最新 `main` / Settings / existing alerts を Rebaseline
2. `SECURITY.md`
3. PR Template
4. Bug / Feature Issue Forms + config
5. 全 GitHub Actions remote `uses:` を Inventory
6. 既存 Action を current effective commit の full SHA へ pin
7. Dependency Review を `ci.yml` へ追加し policy を明示
8. Dependency Review を `verify` に統合
9. Preview eligibility を修正
10. `validate` の expected-result contract を修正
11. README / CONTRIBUTING / 必要な CODE_REVIEW 整合
12. Pre-merge Security Settings を設定
13. CodeQL successful analysis を確認し finding を Triage
14. `pnpm run verify` / `git diff --check` / PR CI を完走
15. Repository 変更を default branch へ反映
16. default branch が Dependabot-safe / SHA-pinned であることを再確認
17. Dependabot Security Updates を有効化
18. 利用可能なら GitHub Actions full SHA enforcement を有効化
19. Security Update PR / Alerts / Issue Forms / PR Template / Ruleset の実状態を確認
20. Critical / High finding の未評価がないことを確認して完了

この順序により、Security 機能の有効化で先に CI を壊すことを避けつつ、不要な Version Update を導入せず、Public Repository として必要な Security・Contribution・CI・Supply Chain・Branch Protection のみを整備する。