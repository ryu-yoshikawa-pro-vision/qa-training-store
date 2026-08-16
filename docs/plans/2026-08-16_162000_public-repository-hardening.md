# Public Repository Hardening 実装計画

## 1. 目的

`qa-training-store` を GitHub Free の Public Repository として安全かつ継続的に運用できる状態へ整備する。

この計画では、Application 機能を変更せず、次の領域を対象とする。

- Supply Chain Security
- Vulnerability Reporting
- Pull Request / Issue の標準化
- Dependency Review
- Public Repository 向け Community Health
- GitHub Security Settings
- GitHub Actions と Dependabot の整合
- README / CONTRIBUTING 等の導線整備
- Repository License の意思決定

単に GitHub が提供する全ファイルを追加することは目的としない。現在の個人管理・学習用 Public Repository に実効性があるものだけを追加する。

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

実装開始時には `main` の HEAD と GitHub Settings を再取得し、Baseline との差分を確認する。既にユーザーが GitHub UI で設定済みの項目を上書き・後退させない。

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

一方、Public Repository の外周として次が不足している。

- Dependabot version update 設定
- Security Policy
- Pull Request Template
- Issue Forms
- Dependency Review の CI enforcement
- License の明示的な意思決定
- GitHub Security Settings と Repository 内文書の整合

`package.json` には既に `packageManager: pnpm@9.10.0` が存在するため、別の package manager SSOT を追加しない。

## 4. 設計原則

### 4.1 Simple-first

初期導入では GitHub 標準機能を優先し、独自 Bot、独自 Security Dashboard、Renovate、複雑な自動承認 Workflow を追加しない。

### 4.2 CI を SSOT にする

自動判定可能な品質条件を PR Template のチェックボックスへ大量に重複記載しない。

Required CI の最終集約は既存 `verify` を維持し、新しい Required Gate も可能な限り `verify` へ統合する。

### 4.3 Secrets を増やさない

Dependabot PR を Cloudflare Preview へ Deploy する目的だけで Cloudflare Credential を Dependabot Secrets へ複製しない。

Dependabot や将来の fork PR のように Actions Secrets が利用できない PR では、Secret を必要とする Preview Deployment を安全に Skip し、それ以外の Required Quality Gate は実行する。

### 4.4 Public と Open Source を混同しない

Repository が Public であることと、第三者へ再利用・改変・再配布を許可することは別の意思決定とする。

`LICENSE` は実装者が推測で追加しない。

### 4.5 Community File を増やしすぎない

GitHub が認識する Community Health File であっても、現在の運用に不要なものは追加しない。

## 5. Target State

最終的に次の構成を目指す。

```text
.github/
├── dependabot.yml
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
LICENSE                     # License Decision が確定した場合のみ
README.md
CONTRIBUTING.md
CODE_REVIEW.md              # 必要な最小整合のみ
```

初期導入では次を追加しない。

```text
CODEOWNERS
CODE_OF_CONDUCT.md
SUPPORT.md
GOVERNANCE.md
CITATION.cff
.github/FUNDING.yml
renovate.json
.github/dependency-review-config.yml
独立した dependency-review.yml workflow
独自 CodeQL workflow
```

## 6. Canonical Decisions

### D-01: Dependabot は `npm` と `github-actions` の 2 ecosystem を監視する

`pnpm` Project でも Dependabot の `package-ecosystem` は `npm` を使用する。

初期設定:

- `npm`
  - directory: `/`
  - interval: `weekly`
- `github-actions`
  - directory: `/`
  - interval: `weekly`

初期段階では次を追加しない。

- 自動 Merge
- 自動 Approve
- Major Update の Blanket Ignore
- Dependency Group の複雑な分類
- Private Registry
- Custom Registry Secret

Dependabot PR が多すぎることが実測された場合だけ grouping や open PR limit を追加する。

### D-02: Dependabot Security Updates と Version Updates を分離して考える

- Dependabot Alerts: GitHub Settings
- Dependabot Security Updates: GitHub Settings
- Dependabot Version Updates: `.github/dependabot.yml`

`dependabot.yml` があるだけで Dependabot Alerts が有効になると誤解しない。

### D-03: Security Report は GitHub Private Vulnerability Reporting を Primary とする

`SECURITY.md` に個人メールアドレスを公開しない。

Security Issue は Public Issue / PR に投稿しないよう案内し、GitHub Private Vulnerability Reporting を正式な報告経路とする。

### D-04: Security SLA を約束しない

個人運用で保証できない `24 hours`、`7 days` 等の固定 SLA は記載しない。

次の流れだけを明示する。

1. Private Report を受領
2. 内容を確認
3. 影響を評価
4. 必要に応じて修正・Advisory 対応
5. 安全に公開可能になった時点で情報を公開

### D-05: Dependency Review は既存 `ci.yml` へ統合する

新規 Workflow を増やさず、`.github/workflows/ci.yml` に `dependency-review` Job を追加する。

Public Repository で利用可能な GitHub 標準 Dependency Review Action を使用する。

実装時点の公式 supported major を再確認する。2026-08-16 時点では公式 Action Repository の current installation example は `actions/dependency-review-action@v5` を示している。

### D-06: Dependency Review は PR のみ実行する

`dependency-review` Job は `pull_request` Event のみ Required とする。

`push`、`schedule`、`workflow_dispatch` では Skip を正常状態として扱う。

既存 `verify` に Job を追加する場合、Event に応じて次を判定する。

- `pull_request`: `dependency-review == success` 必須
- その他: `dependency-review == skipped` を許可

### D-07: Dependabot PR では Cloudflare Preview を Required にしない

GitHub 公式仕様では Dependabot が起点の `pull_request` Workflow は GitHub Actions Secrets を利用できず、Dependabot Secrets のみ利用できる。

現在の Preview Deployment は Cloudflare Credential を必要とするため、Dependabot PR へ Actions Secret をそのまま渡す前提にしない。

より一般化し、Preview Deploy eligibility を次のように定義する。

- PR Head Repository が Current Repository と同一
- `github.actor != 'dependabot[bot]'`
- 必要な Cloudflare Credentials が利用可能

Preview 非対象 PR では Deploy を Skip し、`validate` はその Skip が意図されたものかを検証する。

Dependabot PR でも次は必須とする。

- Format / Markdown lint
- Specification validation
- Code lint
- Typecheck
- Static security check
- Unit / Integration / Repository / Component / Contract test
- Build
- Playwright E2E
- Dependency Review
- `verify`

### D-08: `pull_request_target` で Dependabot を回避しない

Secret を利用するためだけに untrusted PR Code と `pull_request_target` を組み合わせる設計は採用しない。

Preview を Skip する方が目的に対して単純かつ安全である。

### D-09: Pull Request Template は「説明の標準化」に限定する

PR Template は次を収集する。

- 概要
- 変更内容
- Scope
- Non-goals
- Validation / Evidence
- 影響範囲
- Security / Dependency Impact
- Related Issue / Plan

CI で判定するコマンドを大量の Checkbox として重複しない。

### D-10: Bug Issue は QA 再利用可能な形式にする

`bug_report.yml` は最低限次を要求する。

- 概要
- 対象 Platform
- Environment / Browser 等
- Preconditions
- Reproduction Steps
- Expected Result
- Actual Result
- Reproducibility
- Evidence
- Additional Context

Platform 候補には少なくとも次を含める。

- Web / Chromium
- Web / Firefox
- Web / WebKit
- Android
- iOS
- Other

### D-11: Feature Request は Problem-first にする

`feature_request.yml` は単なる「欲しい機能」ではなく次を収集する。

- Problem / Background
- Expected Behavior
- QA / Training Value
- Alternatives
- Scope / Constraints
- Additional Context

### D-12: Blank Issue は外部 Contributor 向けには無効化する

`.github/ISSUE_TEMPLATE/config.yml` で `blank_issues_enabled: false` とする。

Security Report は Private Vulnerability Reporting へ誘導する Contact Link を設定できる場合は設定する。

Issue Form が default branch へ Merge されるまでは GitHub UI 上で正式に利用可能にならないことを Acceptance に含める。

### D-13: LICENSE は明示的 Decision Gate にする

推奨候補は MIT だが、自動的には確定しない。

実装開始時に Repository Owner の意思が既に明示されている場合のみ `LICENSE` を追加する。

選択肢:

1. MIT
   - Code / Documentation を広く再利用可能にしたい場合の Default Recommendation
2. Apache-2.0
   - Patent Grant を明確に含めたい場合
3. License なしを継続
   - Public 閲覧は許可するが、一般的な再利用許諾を付与しない場合

明示がない場合:

- `LICENSE` は追加しない
- 他の Public Repository Hardening 作業は継続する
- Final Report で `LICENSE Decision Pending` と明記する

### D-14: CodeQL は Default Setup を優先する

GitHub Settings で CodeQL Default Setup を利用し、初期段階では独自 `.github/workflows/codeql.yml` や CodeQL Config を追加しない。

Custom Query、特殊 Path Filter、独自 Build が必要になった場合だけ Advanced Setup を検討する。

### D-15: Automatic Dependency Submission を先回りして追加しない

まず Dependency Graph を有効化し、GitHub が取得できる dependency data を確認する。

不足が実測された場合だけ Automatic Dependency Submission を検討する。

## 7. Implementation Waves

## Wave 0: Rebaseline と Settings Inventory

### 目的

実装開始時の Current State を確定する。

### 実施内容

1. 最新 `main` を取得する。
2. Open PR との競合可能性を確認する。
3. 次のファイルの存在と内容を再確認する。
   - `.github/dependabot.yml`
   - `SECURITY.md`
   - `.github/pull_request_template.md`
   - `.github/ISSUE_TEMPLATE/**`
   - `LICENSE`
   - `.github/workflows/ci.yml`
   - `README.md`
   - `CONTRIBUTING.md`
   - `CODE_REVIEW.md`
4. GitHub Settings の Current State を確認する。
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates
   - Private vulnerability reporting
   - Secret scanning
   - Push protection
   - CodeQL / Code scanning
   - Actions default workflow permissions
   - Actions create / approve PR permission
   - Main Ruleset / Branch Protection
5. 既に設定済みの安全設定を OFF にしない。

### Exit Criteria

- Code 変更と GitHub Settings 変更の Current Gap が一覧化されている。
- Dependency Review の prerequisite である Dependency Graph の状態が判明している。

## Wave 1: Supply Chain 基盤

### 1. `.github/dependabot.yml`

追加する。

Minimum Contract:

```yaml
version: 2

updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

実装時に YAML quoting / formatting は Repository の Prettier 規約へ合わせる。

### 2. Dependency Review Job

`.github/workflows/ci.yml` へ追加する。

Conceptual Contract:

```yaml
dependency-review:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@<repository-compatible-version>
      with:
        persist-credentials: false
    - uses: actions/dependency-review-action@<current-supported-major>
```

既存 Workflow の top-level `permissions: contents: read` を維持し、不要な write permission は付与しない。

### 3. `verify` への統合

`verify.needs` に `dependency-review` を追加する。

Validation Script へ Dependency Review Result を渡し、Event ごとの期待値を判定する。

### 4. Preview Deployment の Trust Boundary 修正

Dependabot PR と Secret-less PR で Cloudflare Credential を要求しないようにする。

実装では「Dependabot だけ特別扱い」よりも、「Trusted Preview Eligibility」を明示する。

候補条件:

```text
pull_request
AND head.repo.full_name == github.repository
AND actor != dependabot[bot]
```

`validate` は次を区別する。

- Preview Eligible PR: `deploy-preview == success` 必須
- Preview Non-eligible PR: `deploy-preview == skipped` 必須
- push / schedule 等: `deploy-preview == skipped` 必須

これにより Dependabot PR のためだけに Cloudflare Token を Dependabot Secrets へ複製しない。

### Wave 1 Validation

最低限:

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run security:check
pnpm run test:contracts
pnpm run verify
```

Workflow 変更について可能な範囲で YAML / GitHub Actions syntax を確認する。

PR Event では Dependency Review Job が実行されることを CI で確認する。

## Wave 2: Security Policy

### 1. `SECURITY.md`

Root に追加する。

Required Sections:

```text
Security Policy
├── Supported Versions / Scope
├── Reporting a Vulnerability
├── What to Include
├── What Not to Do
└── Disclosure / Handling
```

### Reporting Policy

- Public Issue へ脆弱性詳細を書かない。
- Public PR で Exploit Detail を投稿しない。
- GitHub Private Vulnerability Reporting を使用する。
- 個人 Email を公開しない。

### Report Content

可能な範囲で次を含めるよう案内する。

- Vulnerability Summary
- Affected Feature / Component
- Preconditions
- Reproduction Steps
- Expected Security Impact
- Environment
- Supporting Evidence

### Supported Scope

この Project は学習用 Application であり、real payment / real commerce ではない点を明示しつつ、Repository / Deployment / CI / Application に関する有効な Security Report は受け付ける。

固定 Response SLA は記載しない。

### 2. README / CONTRIBUTING からの導線

- README に Security Policy へのリンクを追加する。
- CONTRIBUTING に Security Issue は通常 Issue ではなく `SECURITY.md` の経路を使うことを記載する。

## Wave 3: PR / Issue Intake Standardization

### 1. `.github/pull_request_template.md`

追加する。

Recommended Structure:

```text
## 概要
## 変更内容
## Scope
## Non-goals
## Validation / Evidence
## 影響範囲
## Security / Dependency Impact
## Related Issue / Plan
```

テンプレートは説明を支援するものであり、形式を埋めること自体を目的にしない。

該当しない Section は `N/A` を許容する。

### 2. `.github/ISSUE_TEMPLATE/bug_report.yml`

Issue Form として追加する。

Required Field と Optional Field を分離する。

Required:

- Summary
- Platform
- Preconditions
- Steps to Reproduce
- Expected
- Actual
- Reproducibility

Optional:

- Environment detail
- Commit / Version
- Screenshot / Trace / Video / Log
- Additional Context

Secret、Credential、個人情報を Evidence に含めない注意書きを入れる。

### 3. `.github/ISSUE_TEMPLATE/feature_request.yml`

Required:

- Problem / Background
- Expected Behavior
- QA / Training Value

Optional:

- Alternatives
- Scope / Constraints
- Additional Context

### 4. `.github/ISSUE_TEMPLATE/config.yml`

- `blank_issues_enabled: false`
- Security Report 用 Contact Link を Private Vulnerability Reporting へ向ける

### Wave 3 Validation

- YAML Parse が成功する。
- Markdown lint / Format が成功する。
- Field ID が重複していない。
- Required / Optional が意図通りである。
- default branch 反映後、GitHub の New Issue 画面で Form が表示されることを Post-merge Acceptance にする。
- default branch 反映後、新規 PR 画面で PR Template が表示されることを Post-merge Acceptance にする。

## Wave 4: Documentation / Review Policy 整合

### README.md

Public Repository の入口として最低限次へリンクする。

- `CONTRIBUTING.md`
- `SECURITY.md`
- `LICENSE` が存在する場合は `LICENSE`

既存の Setup / Curriculum / Specification の説明を壊さない。

### CONTRIBUTING.md

次を追記・整理する。

- Bug Report は Issue Form を使用する。
- Feature Request は専用 Form を使用する。
- Security Report は Public Issue を使用しない。
- PR は Pull Request Template に沿って必要事項を記載する。
- Required CI を通す。
- Dependency 変更時は Dependency Review 結果を確認する。

### CODE_REVIEW.md

現在の Review Guide と重複しない範囲で、Dependency 変更時の確認観点を追加する。

最低限:

- New Dependency の必要性
- Known Vulnerability
- Lockfile の意図しない変更
- Dependency Review Result

License allowlist / denylist は Project License Policy が固まる前に導入しない。

### CHANGELOG.md

Repository の現行 CHANGELOG 方針を確認し、Developer Workflow / Security Infrastructure の変更も記録対象なら追記する。

対象外なら無理に追加しない。

## Wave 5: GitHub Security Settings

この Wave は Repository File だけでは完結しない。

実装者が Settings 変更権限を持たない場合も、他 Wave は止めずに進め、未完了項目を Final Report へ明示する。

### Required Settings

#### Dependency Graph

- ON

Dependency Review の prerequisite とする。

#### Dependabot Alerts

- ON

#### Dependabot Security Updates

- ON

#### Dependabot Version Updates

- `.github/dependabot.yml` が default branch に入った後に有効動作を確認する。

#### Private Vulnerability Reporting

- ON

`SECURITY.md` の案内先と一致させる。

#### Secret Scanning

- ON

#### Push Protection

- ON

#### CodeQL / Code Scanning

- Default Setup を ON

最初から custom CodeQL workflow を作らない。

#### GitHub Actions Workflow Permissions

Repository default:

- Read repository contents and packages permissions
- Actions による Pull Request creation / approval は OFF

Workflow が必要な権限だけ個別 `permissions` で宣言する方針を維持する。

### Optional / Later

- Automatic Dependency Submission は Dependency Graph の不足が確認された場合のみ
- CodeQL Advanced Setup は Default Setup で不足した場合のみ

## Wave 6: LICENSE Decision

### Decision Gate

Repository Owner の意図を確認する。

質問:

> この Repository の Code と Documentation を第三者が再利用・改変・再配布できる Open Source として提供するか。

### 推奨

学習教材・サンプルとして広く利用させる意図がある場合は MIT を第一候補とする。

### 実装ルール

- Owner が MIT を明示: `LICENSE` を追加
- Owner が Apache-2.0 を明示: `LICENSE` を追加
- License なしを明示: 追加しない
- 未決定: 追加しない。Final Report へ Pending を残す

この Decision は他 Wave を Block しない。

## Wave 7: End-to-End Acceptance

### Repository File Acceptance

次が期待通り存在する。

```text
.github/dependabot.yml
.github/pull_request_template.md
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/feature_request.yml
.github/ISSUE_TEMPLATE/config.yml
SECURITY.md
```

License Decision が確定した場合のみ:

```text
LICENSE
```

### CI Acceptance

Pull Request Event:

- `dependency-review` が実行される。
- Vulnerable dependency introduction を検出できる。
- `verify` が dependency review を含めて判定する。
- Trusted same-repository PR では Preview Deploy が実行される。
- Preview Deploy 失敗は Eligible PR では Failure として扱われる。

Dependabot PR:

- Actions Secrets 不在によって Cloudflare Credential Check が赤くならない。
- Preview Deploy は意図した `skipped` になる。
- Dependency Review と通常 Quality Gate は実行される。
- Final validation は Preview Skip を正常状態として扱う。

Push / Schedule:

- Dependency Review は Skip される。
- `verify` はその Skip を正常状態として扱う。
- 既存 main / scheduled CI の Required Behavior を壊さない。

### Community UX Acceptance

Default branch 反映後:

- New Issue で Bug Report Form が表示される。
- New Issue で Feature Request Form が表示される。
- Blank Issue が一般 Contributor の標準導線にならない。
- Security Report が Private Vulnerability Reporting へ誘導される。
- New PR で Pull Request Template が読み込まれる。
- README から Contributing / Security / License 方針へ到達できる。

### Security Settings Acceptance

- Dependency Graph: enabled
- Dependabot Alerts: enabled
- Dependabot Security Updates: enabled
- Private Vulnerability Reporting: enabled
- Secret Scanning: enabled
- Push Protection: enabled
- CodeQL Default Setup: enabled
- Actions default permission: read-only
- Actions create / approve PR: disabled

## 8. Required Quality Gates

実装後、変更範囲に応じて最低限次を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run validate:curriculum
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
pnpm run test
pnpm run build:web
pnpm run build:spec
```

最終的には Repository が定義する Required Validation を実行する。

```bash
pnpm run verify
```

GitHub Actions 変更は実際の PR Event の CI 結果を最終 Evidence とする。

## 9. Failure Handling

### Dependabot Config が Invalid

- Dependabot UI / Logs の parse error を確認する。
- YAML を最小構成へ戻す。
- Unsupported option を推測で追加しない。

### Dependency Review が 403 / unavailable

最初に次を確認する。

1. Repository が Public か
2. Dependency Graph が有効か
3. Workflow `permissions` が `contents: read` を持つか
4. Event が `pull_request` か

Feature を無効化して通すことを最初の対応にしない。

### Dependabot PR で Preview Deploy が失敗

Cloudflare Token を Dependabot Secret に複製する前に、Preview Eligibility 条件が正しいか確認する。

Primary Design は Dependabot PR の Preview Skip である。

### Issue Form が GitHub UI に表示されない

- default branch に存在するか
- `.github/ISSUE_TEMPLATE/` 配下か
- YAML schema / required top-level keys を確認する

### CodeQL が不安定

初期段階では Default Setup を使用する。

Repository 固有 Build が原因で Default Setup が成立しないことを確認した場合だけ Advanced Setup を別 Task として計画する。

## 10. Security Considerations

- Security Report 用に個人 Email を Repository へ公開しない。
- API Token / Cloudflare Credential / Signing Key を Issue Form、PR Template、example へ記載しない。
- Dependabot PR のためだけに Production / Preview Secret を追加配布しない。
- `pull_request_target` を Secret workaround として安易に採用しない。
- Dependency update を自動 Merge しない。
- CodeQL / Dependency Review を導入しただけで Application Security が保証されたと扱わない。

## 11. Explicit Non-goals

今回追加しないものと理由を明示する。

### `CODEOWNERS`

個人管理では Review Routing の実益が小さい。複数 Maintainer になった時点で再検討する。

### `CODE_OF_CONDUCT.md`

大規模な外部 Community を運営していない現在は導入を急がない。外部 Contributor が増えた時点で再評価する。

### `SUPPORT.md`

現在は README / CONTRIBUTING / Issue Forms で問い合わせ導線を表現できる。Support Channel が増えた場合に追加する。

### `GOVERNANCE.md`

個人管理 Repository では過剰。Maintainer / Committer Role が複数になった場合に検討する。

### `CITATION.cff`

論文・研究成果として Formal Citation を要求する段階ではない。

### `.github/FUNDING.yml`

Funding / Sponsor 募集が目的ではない。

### Renovate

Dependabot と責務が重複するため追加しない。

### `.github/dependency-review-config.yml`

初期導入では inline default behavior で十分。License Policy や詳細 Severity Policy が必要になった時だけ追加する。

### Custom CodeQL Workflow

Default Setup で十分な間は Repository 内 Workflow を増やさない。

## 12. Definition of Done

次をすべて満たした時点で Public Repository Hardening を完了とする。

1. Dependabot version updates が npm / GitHub Actions を weekly で監視する。
2. Dependabot Alerts / Security Updates が有効である。
3. Dependency Graph が有効である。
4. Dependency Review が PR Quality Gate に統合されている。
5. `verify` が Dependency Review を含めて正しく Event-aware に判定する。
6. Dependabot PR が Cloudflare Actions Secrets 不在を理由に不必要に Failure にならない。
7. Trusted PR の Preview Deployment Guarantee は維持されている。
8. `SECURITY.md` が Private Vulnerability Reporting を正式な報告経路として案内する。
9. Private Vulnerability Reporting が GitHub Settings で有効である。
10. Secret Scanning / Push Protection が有効である。
11. CodeQL Default Setup が有効である。
12. PR Template が存在する。
13. Bug / Feature Issue Forms が存在する。
14. Blank Issue の扱いが意図通りである。
15. README / CONTRIBUTING / CODE_REVIEW が新しい運用と矛盾しない。
16. License は Owner の明示的意思に従って設定または Pending として記録されている。
17. Required Repository Quality Gate が PASS する。
18. default branch 反映後の GitHub UI で Issue / PR / Security 導線を確認している。
19. 不要な Community File、独自 Bot、Secret duplication を追加していない。

## 13. 実装順序まとめ

```text
Wave 0  Rebaseline / Settings Inventory
  ↓
Wave 1  Dependabot + Dependency Review + Preview Trust Boundary
  ↓
Wave 2  SECURITY.md + Security Reporting Route
  ↓
Wave 3  PR Template + Issue Forms
  ↓
Wave 4  README / CONTRIBUTING / CODE_REVIEW 整合
  ↓
Wave 5  GitHub Security Settings
  ↓
Wave 6  LICENSE Decision
  ↓
Wave 7  CI / GitHub UI / Security End-to-End Acceptance
```

Settings 権限不足や License Decision Pending があっても、実行可能な Wave は止めずに最後まで進める。

## 14. 参照する GitHub 公式情報

実装時には current documentation を再確認する。

- Dependabot version updates:
  - https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates
- Dependabot for GitHub Actions:
  - https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions
- Dependabot on GitHub Actions restrictions:
  - https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions
- Dependency Review:
  - https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependency-review
- Dependency Review Action:
  - https://github.com/actions/dependency-review-action
- Issue / Pull Request Templates:
  - https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates
- Private Vulnerability Reporting:
  - https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately
- Repository Security and Analysis Settings:
  - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository
- Repository Licensing:
  - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
