# GitHub Security Automation 実装計画

## 1. 目的

`qa-training-store` の GitHub 標準 Security 機能を、不要な通常バージョンアップを発生させずに有効化する。

主目的は次のとおり。

- 既知脆弱性が検出された依存関係だけ Dependabot に修正 PR を作成させる
- 脆弱性のない通常の依存 Version Update PR は作成させない
- 新しい脆弱な依存関係の混入を既存 Dependency Review で防止する
- CodeQL で Repository 内の JavaScript / TypeScript / GitHub Actions を継続解析する
- Secret scanning / Push protection で credential の漏えいを検出・予防する
- Security PR は自動 merge / 自動 approve せず、既存 CI と人間確認を通して merge する

過剰な独自 Security Automation は追加せず、GitHub 標準機能を優先する。

---

## 2. Plan Status

- Status: Implementation-ready
- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Baseline Branch: `main`
- Baseline Commit: `314a8f958072f19e672e3bc37089558d74e42feb`
- Implementation Branch: `chore/enable-github-security-automation`
- Reviewed Date: 2026-08-21
- Package Manager: `pnpm@9.10.0`
- Repository Visibility: Public

この Branch をそのまま実装・検証用 Branch として使用する。

ただし、Dependabot / CodeQL Default Setup / Push protection などの GitHub Repository Settings は **Branch 単位ではなく Repository 全体へ即時反映される**。

したがって、Repository Settings の変更は Branch 上だけへ隔離できない。設定変更前に既存 CI / Dependabot PR contract が成立していることを確認してから実施する。

---

## 3. 現状確認

### 3.1 既に実装済みのもの

2026-08-21 時点の `main` では、過去の Public Repository Hardening 実装により次が既に存在する。

- `SECURITY.md`
- GitHub Private Vulnerability Reporting への報告導線
- `.github/workflows/ci.yml` の `dependency-review` job
- Dependency Review の `vulnerability-check: true`
- Dependency Review の `fail-on-severity: moderate`
- Dependency Review の `fail-on-scopes: runtime, development, unknown`
- Dependency Review の PR コメント無効化
- GitHub Actions の基本 read-only permission
- remote GitHub Actions の full SHA pin
- Dependabot PR / fork PR では Cloudflare Preview deploy を実行しない event contract
- `verify` / `validate` による CI aggregate 判定

既存 Dependency Review は `high` より厳しい `moderate` 以上を block する設定である。

今回これを弱めない。

### 3.2 Dependabot Version Updates

`.github/dependabot.yml` は存在しない。

この状態を維持する。

GitHub の仕様上、`dependabot.yml` がなくても Repository Settings で Dependabot Security Updates を有効化すれば、既知脆弱性に対する Security Update PR は作成可能である。

一方、通常の Version Updates は `dependabot.yml` を追加しない限り有効化しない。

### 3.3 現時点で未確認の Repository Settings

現在利用可能な GitHub connector 権限では、次の ON / OFF を確実に取得できない。

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Dependabot malware alerts
- Private vulnerability reporting
- Secret scanning
- Push protection
- CodeQL Default Setup
- Actions default workflow permission
- GitHub Actions による PR create / approve permission

実装時に GitHub UI で実値を確認し、推測で完了扱いにしない。

---

## 4. Target State

### 4.1 Dependency / Dependabot

最終状態を次にする。

| 設定 | Target |
| --- | --- |
| Dependency graph | ON |
| Dependabot alerts | ON |
| Dependabot security updates | ON |
| Grouped security updates | OFF |
| Dependabot malware alerts | ON（利用可能な場合） |
| Dependabot version updates | OFF |
| `.github/dependabot.yml` | 追加しない |
| Dependabot auto-merge | OFF |
| Dependabot auto-approve | OFF |

Dependabot Security Updates を有効化した直後、既存 Alert に修正可能 Version が存在する場合は PR が生成される可能性がある。

次の場合は Alert があっても Security PR が作成されないことがある。

- 修正版がまだ存在しない
- manifest / lockfile の制約上、安全な Version へ解決できない
- update が dependency conflict 等で生成不能

そのため「Alert 数 = PR 数」とは扱わない。

### 4.2 Dependency Review

現在の `.github/workflows/ci.yml` の Dependency Review を維持する。

```yaml
vulnerability-check: true
fail-on-severity: moderate
fail-on-scopes: runtime, development, unknown
license-check: false
show-openssf-scorecard: false
comment-summary-in-pr: never
```

目的は Dependabot と異なる。

- Dependabot Security Updates: 既に存在する脆弱な依存関係を修正する
- Dependency Review: PR が新しく脆弱な依存関係を持ち込むことを防ぐ

独立した Dependency Review Workflow は追加しない。

### 4.3 CodeQL

GitHub **CodeQL Default Setup** を有効化する。

Advanced Setup 用の `.github/workflows/codeql.yml` は追加しない。

最低限、次の解析成功を確認する。

- JavaScript / TypeScript
- GitHub Actions workflows (`actions`)

CodeQL Default Setup で十分なため、Custom query pack や独自 workflow は今回導入しない。

### 4.4 Secret Protection

最終状態を次にする。

- Secret scanning: ON / Public Repository の有効状態を確認
- Push protection: ON
- 既存 Secret scanning alert: 確認
- active credential が検出された場合: merge や通常実装より先に rotate / revoke を優先

Push protection bypass を通常運用にはしない。

誤検知等で bypass が必要な場合も、理由を確認してから明示的に実施する。

### 4.5 Vulnerability Reporting

Private Vulnerability Reporting を ON にする。

既存 `SECURITY.md` は GitHub Security Advisory の `Report a vulnerability` 導線を案内しているため、実際の Repository Settings と一致させる。

### 4.6 GitHub Actions Permissions

Public Repository Hardening で定義した安全設定が後退していないことを確認する。

- Default workflow permissions: Read repository contents permission
- Allow GitHub Actions to create and approve pull requests: OFF

今回これらを緩和しない。

---

## 5. 実装方針

### Phase 1: Preflight / Drift Check

1. Implementation Branch を最新 `main` と比較する。
2. `.github/dependabot.yml` が存在しないことを再確認する。
3. `.github/workflows/ci.yml` の Dependency Review 設定を確認する。
4. Dependabot PR / fork PR で Cloudflare Preview が skipped になる contract を確認する。
5. `verify` / `validate` の aggregate 判定が維持されていることを確認する。
6. Public Repository Hardening 後に Security 関連設定が後退していないか確認する。

既存実装が Target State を満たしている箇所は変更しない。

### Phase 2: Repository Settings Inventory

GitHub UI の次を実値で記録する。

`Settings -> Security -> Advanced Security`

確認対象:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Private vulnerability reporting
- Secret scanning / Secret Protection
- Push protection
- CodeQL analysis

Actions Settings では次を確認する。

- Default workflow permissions
- GitHub Actions の PR create / approve permission

実値が既に Target State と同じなら再操作しない。

### Phase 3: Dependabot Security Automation

実施順序:

1. Dependency graph を ON
2. Dependabot alerts を ON
3. 現在の Dependabot alerts を確認
4. Grouped security updates を OFF
5. Dependabot security updates を ON
6. Dependabot malware alerts が利用可能なら ON
7. Dependabot version updates が有効でないことを確認
8. `.github/dependabot.yml` を作成しない
9. auto-merge / auto-approve を追加しない

Security Updates を ON にした後、新規 Dependabot PR が作成された場合は自動 merge しない。

### Phase 4: Secret Protection

1. Secret scanning の状態を確認する。
2. 既存 Alert を確認する。
3. active credential が存在する場合は rotate / revoke を最優先する。
4. Push protection を ON にする。
5. bypass policy を追加で複雑化しない。

### Phase 5: CodeQL Default Setup

1. CodeQL analysis の `Set up -> Default` を選択する。
2. Default Setup を有効化する。
3. 初回解析完了を待つ。
4. JavaScript / TypeScript の解析結果を確認する。
5. GitHub Actions workflow (`actions`) の解析結果を確認する。
6. Alert が出た場合は Severity / reachability / 実害を確認して別途修正する。

独立した CodeQL Workflow は追加しない。

### Phase 6: Private Vulnerability Reporting

1. Private Vulnerability Reporting を ON にする。
2. Security tab の Advisories から `Report a vulnerability` 導線を確認する。
3. `SECURITY.md` の案内と Repository UI が一致することを確認する。

### Phase 7: End-to-End Verification

Dependabot Security PR が生成された場合、最低限次を確認する。

- PR author が `dependabot[bot]`
- PR が通常 Version Update ではなく Security Update である
- 対応する Dependabot Alert / advisory を確認できる
- package update が脆弱性修正に必要な範囲である
- Dependency Review が実行される
- 既存 CI が実行される
- Cloudflare Preview deploy が skipped
- `verify` / `validate` が想定 contract どおり判定する
- 自動 merge されない

Security PR が生成されない場合は、既存 Alert の有無と patched version の有無を確認し、PR がないこと自体を失敗扱いにしない。

CodeQL については初回 Default Setup scan の成功を確認する。

Push protection については Settings の enabled 状態を確認し、実 Secret を使った破壊的なテストは行わない。

---

## 6. Repository File Change Policy

今回、現状確認の結果からは **新しい Security Workflow / Dependabot config の追加は不要** と判断する。

原則として Repository file の実装差分は増やさない。

実装中に Current State と Target State の drift が見つかった場合のみ、必要最小限のファイル修正を行う。

変更候補は次に限定する。

- `.github/workflows/ci.yml`: Dependency Review / Dependabot event contract の drift がある場合のみ
- CI contract tests: workflow contract を修正した場合のみ
- `SECURITY.md`: GitHub UI の実際の PVR 導線と不一致がある場合のみ
- 関連運用ドキュメント: 実際に不整合があり、既存 SSOT の修正が必要な場合のみ

追加しないもの:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- Renovate
- 独自 vulnerability scanner
- 独自 dependency update bot
- Dependabot auto-merge workflow
- Dependabot auto-approve workflow
- Security Dashboard
- Custom Auto-triage Rule（実測上の必要性が出るまで）

---

## 7. Validation

Repository file に変更がない場合でも、最低限次を確認する。

### Static / Repository

- `.github/dependabot.yml` が存在しない
- Dependency Review job が存在する
- `fail-on-severity: moderate` が維持されている
- Workflow permission が read-only のまま
- Dependabot PR の Preview deploy skip contract が維持されている

Repository file を変更した場合:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- CI contract tests
- 変更内容に応じた targeted tests
- `git diff --check`
- 必要に応じて `pnpm run verify`

### GitHub Settings

- Dependency graph: ON
- Dependabot alerts: ON
- Dependabot security updates: ON
- Grouped security updates: OFF
- Dependabot version updates: OFF
- PVR: ON
- Secret scanning: ON / Public Repository の有効状態を確認
- Push protection: ON
- CodeQL Default Setup: ON / first scan successful
- Actions default permission: read-only
- Actions create / approve PR: OFF

---

## 8. Definition of Done

以下をすべて満たしたら完了とする。

- 脆弱性のない通常 Version Update を自動作成する設定が存在しない
- `.github/dependabot.yml` が存在しない
- Dependabot alerts が有効
- Dependabot security updates が有効
- Grouped security updates が無効
- Security PR の auto-merge / auto-approve が存在しない
- Dependency Review が既存 CI で有効
- Dependency Review の `moderate` gate を維持
- Dependabot PR で Cloudflare Preview Secret を利用しない
- Secret scanning が有効状態
- Push protection が有効
- CodeQL Default Setup が有効
- CodeQL の初回解析が成功
- Private Vulnerability Reporting が有効
- `SECURITY.md` の報告導線と GitHub UI が一致
- Actions permissions が安全側の状態を維持
- 新規 Security Alert が存在する場合、その対応要否を確認済み
- Security Update PR が存在する場合、CI と人間確認を経て merge 判断する運用になっている

---

## 9. リスク / 注意点

### R-01: Settings は Branch に隔離できない

Dependabot / CodeQL / Push protection の設定変更は Repository 全体へ即時反映される。

この Branch の merge 前でも `main` に影響するため、Phase 1 の preflight を完了してから設定する。

### R-02: Dependabot Security Updates 有効化直後に PR が作成される可能性

既存脆弱性に patched version がある場合、有効化直後に Dependabot PR が生成される可能性がある。

これは期待動作であり、自動 merge せず CI を確認する。

### R-03: Security Alert があっても PR がない場合がある

patched version 不在や dependency conflict のため PR を作れない場合がある。

Alert を放置せず、原因を確認する。

### R-04: CodeQL Alert は Dependabot Alert と別物

CodeQL は Application / workflow code の問題を検出する。

Dependabot と同じ dependency update として処理しない。

### R-05: Push protection は bypass 可能

Repository の write 権限を持つ contributor が理由付きで bypass できる場合がある。

bypass を通常運用にせず、発生時に理由と Alert を確認する。

---

## 10. 実装優先順位

1. Current State / CI contract の再確認
2. Dependabot alerts + security updates
3. Push protection / Secret scanning
4. CodeQL Default Setup
5. Private Vulnerability Reporting
6. Actions permission の最終確認
7. 初回 Alert / Security PR / CodeQL scan の検証

最優先は **「既存脆弱性を検出し、修正可能なら Security PR を生成する状態」** の確立とする。

通常の依存 Version Update 自動化は導入しない。
