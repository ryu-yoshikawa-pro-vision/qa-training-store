# GitHub Security Automation 実行・検証計画

## 1. 目的

`qa-training-store` で、既存の Public Repository Hardening 方針に従い、GitHub 標準 Security 機能のうち未完了の Repository Settings を有効化・検証する。

今回の主目的は次のとおり。

- 既知脆弱性がある依存関係だけ Dependabot Security Updates で修正 PR を作成する
- 脆弱性のない通常の Version Update PR は自動作成しない
- 既存 Dependency Review で新しい脆弱な依存関係の混入を防ぐ
- CodeQL Default Setup で JavaScript / TypeScript / GitHub Actions を解析する
- Secret Protection / Push protection で credential 漏えいを検出・予防する
- Security PR を自動 approve / 自動 merge せず、既存 CI と人間確認を通して判断する

独自 Security Bot、独自 scanner、Renovate、Dependabot auto-merge workflow などは追加しない。

---

## 2. 位置付け / SSOT

Security 方針の正本は次の既存 Plan とする。

- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

本 Plan はその方針を再定義しない。

Public Repository Hardening 実装が `main` に反映された後に残っている GitHub Repository Settings の有効化、初回 scan / alert / Security PR の確認、実施結果の記録を行うためのフォローアップ実行計画とする。

既存 Plan と本 Plan の記述が矛盾する場合は、実装開始前に差分を確認し、勝手に新しい Security policy を作らない。

---

## 3. Plan Status

- Status: Implementation-ready after review fixes
- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Baseline Branch: `main`
- Baseline Commit: `314a8f958072f19e672e3bc37089558d74e42feb`
- Implementation Branch: `chore/enable-github-security-automation`
- Reviewed Date: 2026-08-22
- Package Manager: `pnpm@9.10.0`
- Repository Visibility: Public

この Branch をそのまま実装・検証・実施記録用 Branch として使用する。

ただし、Dependabot / CodeQL / Secret Protection / Push protection / Private Vulnerability Reporting などの Repository Settings は Branch 単位ではなく Repository 全体へ反映される。

そのため、Settings 変更は Branch に隔離された変更ではない。

設定変更前に最新 `main` の Security PR 向け CI contract が維持されていることを確認する。

---

## 4. 現状

### 4.1 Repository 側で実装済み

現在の `main` には、Public Repository Hardening により次が実装済みである。

- `SECURITY.md`
- Private Vulnerability Reporting への報告導線
- `.github/workflows/ci.yml` の `dependency-review` job
- `vulnerability-check: true`
- `fail-on-severity: moderate`
- `fail-on-scopes: runtime, development, unknown`
- Dependency Review の PR コメント無効化
- top-level `permissions: contents: read`
- remote GitHub Actions の full SHA pin
- Dependabot PR / fork PR で Cloudflare Preview deploy を実行しない contract
- `verify` / `validate` による CI aggregate 判定

今回これらを再実装しない。

既存設定が Target State を満たしている限り、`.github/workflows/ci.yml` を変更しない。

### 4.2 Dependabot Version Updates

`.github/dependabot.yml` は存在しない。

この状態を維持する。

通常の Version Updates を目的とした `.github/dependabot.yml` は追加しない。

### 4.3 Public Repository の Dependency graph

Public Repository の Dependency graph は GitHub 標準機能として有効な状態を前提とし、今回 ON にする操作対象とはしない。

実装時には Dependency graph 上で root の `package.json` / `pnpm-lock.yaml` に基づく依存関係が認識されていることを確認する。

### 4.4 未確認の Repository Settings

現在の GitHub connector では Repository Settings の ON / OFF を確実に取得できず、Repository metadata 上も `admin: false` である。

したがって次は実装時に Repository Admin 権限を持つ利用者が GitHub UI で実値を確認・変更する。

- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Dependabot malware alerts
- Private vulnerability reporting
- Secret Protection / user-facing secret scanning alerts
- Push protection
- CodeQL configuration
- Actions default workflow permission
- GitHub Actions による PR create / approve permission

推測で完了扱いにしない。

---

## 5. Target State

既存 Public Repository Hardening 方針に従い、最終状態を次にする。

| 項目 | Target |
| --- | --- |
| Dependency graph | Public Repository 標準の有効状態を確認 |
| Dependabot alerts | ON |
| Dependabot security updates | ON |
| Grouped security updates | OFF |
| Dependabot malware alerts | ON |
| Dependabot version updates | OFF |
| `.github/dependabot.yml` | 追加しない |
| Dependabot auto-merge | なし |
| Dependabot auto-approve | なし |
| Secret Protection | ON |
| Secret scanning alerts for users | ON / UI 上の有効状態を確認 |
| Push protection | ON |
| CodeQL | Default Setup |
| Private Vulnerability Reporting | ON |
| Actions default workflow permission | Read repository contents |
| Actions create / approve PR | OFF |

設定名称が GitHub UI で変更されている場合は、同等機能かを確認してから操作する。

---

## 6. 実施主体

| 作業 | 主体 |
| --- | --- |
| Branch / `main` drift 確認 | AI / 実装者 |
| Repository file / CI contract 確認 | AI / 実装者 |
| Repository Settings の実値確認 | Repository Admin |
| Dependabot 設定変更 | Repository Admin |
| Secret Protection / Push protection 設定変更 | Repository Admin |
| CodeQL Default Setup 設定変更 | Repository Admin |
| Private Vulnerability Reporting 設定変更 | Repository Admin |
| Actions permission 確認 | Repository Admin |
| 初回 scan / alert / PR の結果確認 | AI / 実装者 + Repository Admin |
| 実施結果の Plan への記録 | AI / 実装者 |

AI / connector に Admin 権限がない場合、Settings 操作を推測や代替実装で済ませない。

---

## 7. 実装フェーズ

### Phase 1: Preflight / Drift Check

設定変更前に次を確認する。

1. Implementation Branch と最新 `main` の差分を確認する。
2. `main` が先行している場合は Security 関連差分を再確認してから続行する。
3. `.github/dependabot.yml` が存在しないことを確認する。
4. `package.json` / `pnpm-lock.yaml` が存在し、Dependency graph で root dependencies が認識されていることを確認する。
5. `.github/workflows/ci.yml` の Dependency Review が次を維持していることを確認する。
   - `vulnerability-check: true`
   - `fail-on-severity: moderate`
   - `fail-on-scopes: runtime, development, unknown`
6. Dependabot PR / fork PR で Cloudflare Preview が skipped になることを確認する。
7. `verify` / `validate` の aggregate 判定が維持されていることを確認する。
8. Repository の `allow_auto_merge` が false であることを確認する。
9. Dependabot 向け auto-approve / auto-merge 実装が Workflow に存在しないことを確認する。

既存実装が正常なら Repository file を変更しない。

### Phase 2: Repository Settings Inventory

Settings を変更する前に Before 状態を記録する。

最低限、次を確認する。

- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Dependabot malware alerts
- Secret Protection
- Secret scanning alerts for users
- Push protection
- Code scanning / CodeQL configurations
- Private Vulnerability Reporting
- Actions default workflow permissions
- Allow GitHub Actions to create and approve pull requests

実値が Target State と同じ場合は再操作しない。

### Phase 3: Dependabot Security Updates

実施順序:

1. Dependabot alerts を ON にする。
2. 現在の Dependabot alerts を確認する。
3. Grouped security updates を OFF にする。
4. Dependabot security updates を ON にする。
5. Dependabot malware alerts を ON にする。
6. Dependabot version updates 用の `.github/dependabot.yml` が存在しないことを再確認する。
7. Dependabot 向け auto-approve / auto-merge を追加しない。

Security Updates 有効化直後に Security PR が生成されても自動 merge しない。

Alert 数と Security PR 数が一致することは DoD にしない。

Security PR が作成されない代表例:

- patched version が存在しない
- manifest / lockfile 制約で安全な Version に解決できない
- dependency conflict により update PR を生成できない

### Phase 4: Secret Protection / Push Protection

1. Secret Protection の現在値を確認する。
2. user-facing Secret scanning alerts が利用可能・有効であることを確認する。
3. 既存 Secret alerts を確認する。
4. active credential が検出された場合は通常実装より rotate / revoke を優先する。
5. Push protection を ON にする。
6. bypass を通常運用にしない。

Push protection の確認のために実 credential を commit / push する破壊的テストは行わない。

### Phase 5: CodeQL Default Setup

Default Setup を有効化する前に、Code scanning の既存 configuration を確認する。

確認対象:

- 既存 Default Setup
- Advanced Setup
- CodeQL workflow
- SARIF upload / 外部 code scanning configuration

既存の Advanced Setup や外部 upload がある場合は、Default Setup へ切り替えてよいかを先に評価する。無条件に上書きしない。

競合する既存 configuration がない場合:

1. `Security -> Code scanning -> Set up -> Default` を開く。
2. 解析対象に JavaScript / TypeScript が含まれることを確認する。
3. GitHub Actions (`actions`) が解析対象に含まれることを確認する。
4. 必要なら Default Setup の設定画面で対象を調整する。
5. Default Setup を有効化する。
6. 初回 CodeQL run / analysis を確認する。
7. terminal state まで確認する。

判定:

- success: Configuration DoD を満たす
- failure: 原因を調査し、成功扱いにしない
- 実装セッション内に terminal state にならない: Pending と記録し、成功扱いにしない

独自 `.github/workflows/codeql.yml` は追加しない。

### Phase 6: Private Vulnerability Reporting

1. Private Vulnerability Reporting を ON にする。
2. Security tab の Advisories に `Report a vulnerability` 導線があることを確認する。
3. 既存 `SECURITY.md` の案内と Repository UI が一致することを確認する。

### Phase 7: Actions Permission / Auto-merge Guard

次を確認する。

- Default workflow permissions: read-only
- Allow GitHub Actions to create and approve pull requests: OFF
- Repository `allow_auto_merge`: false
- Dependabot 用 auto-merge Workflow がない
- Dependabot 用 auto-approve Workflow がない

Workflow 内で Dependabot に対して次のような自動化が追加されていないことを確認する。

- `gh pr merge`
- `gh pr review --approve`
- Dependabot PR を対象にした過剰な `pull-requests: write`

無関係な Workflow 権限を機械的に削除せず、Dependabot auto-merge / auto-approve の有無を目的に確認する。

### Phase 8: End-to-End Verification

Dependabot Security PR が生成された場合は次を確認する。

- author が `dependabot[bot]`
- 通常 Version Update ではなく Security Update である
- 対応する Dependabot Alert / advisory が確認できる
- package update が脆弱性修正に必要な範囲である
- Dependency Review が実行される
- 既存 CI が実行される
- Cloudflare Preview deploy が skipped
- `verify` / `validate` が想定 contract どおり判定する
- 自動 approve / 自動 merge されない

Security PR が生成されない場合は次を確認する。

- Dependabot Alert の有無
- patched version の有無
- dependency conflict 等の生成不能理由

PR が存在しないこと自体は失敗扱いにしない。

CodeQL は Phase 5 の初回 analysis status を確認する。

Secret Protection / Push protection は Settings の enabled 状態と既存 alerts を確認する。

---

## 8. Repository File Change Policy

原則として、今回の Repository file 実装差分は増やさない。

Current State と Target State の drift が見つかった場合のみ、必要最小限の修正を行う。

変更候補:

- `.github/workflows/ci.yml`: Security PR / Dependency Review contract に drift がある場合のみ
- CI contract tests: Workflow contract を変更した場合のみ
- `SECURITY.md`: PVR の実 UI と不一致がある場合のみ
- 本 Plan: Settings の Before / After / Verification 結果を記録する

追加しない:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- Renovate
- 独自 vulnerability scanner
- 独自 dependency update bot
- Dependabot auto-merge workflow
- Dependabot auto-approve workflow
- Custom Auto-triage Rule
- 独自 Security Dashboard

---

## 9. Validation

### 9.1 Repository / CI

- `.github/dependabot.yml` が存在しない
- Dependency Review job が存在する
- `fail-on-severity: moderate` が維持されている
- top-level Workflow permission が read-only のまま
- Dependabot PR の Preview deploy skip contract が維持されている
- Dependabot auto-merge / auto-approve 実装が存在しない

Repository file を変更した場合:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- CI contract tests
- 変更内容に応じた targeted tests
- `git diff --check`
- 必要性がある場合のみ `pnpm run verify`

### 9.2 Repository Settings

- Dependabot alerts: ON
- Dependabot security updates: ON
- Grouped security updates: OFF
- Dependabot malware alerts: ON
- Dependabot version updates: OFF
- Secret Protection: ON
- Secret scanning alerts: 有効状態確認
- Push protection: ON
- CodeQL Default Setup: ON
- PVR: ON
- Actions default permission: read-only
- Actions create / approve PR: OFF

---

## 10. Definition of Done

Configuration と Finding 対応を分離して判定する。

### 10.1 Configuration DoD

次をすべて満たす。

- 通常 Version Update を自動作成する設定が存在しない
- `.github/dependabot.yml` が存在しない
- Dependabot alerts が有効
- Dependabot security updates が有効
- Grouped security updates が無効
- Dependabot malware alerts が有効
- Security PR の auto-merge / auto-approve が存在しない
- Dependency Review が既存 CI で有効
- `moderate` gate を維持
- Dependabot PR で Cloudflare Preview Secret を利用しない
- Secret Protection が有効
- Push protection が有効
- CodeQL Default Setup が有効
- CodeQL 初回 analysis が success、または未完了なら Pending と明記されている
- Private Vulnerability Reporting が有効
- `SECURITY.md` と実 UI の報告導線が一致
- Actions permissions が安全側の状態を維持

CodeQL が Pending の場合は Configuration 全体を「完全完了」とは記録せず、残タスクとして明示する。

### 10.2 Finding Triage DoD

設定有効化時点で存在する Security findings を確認する。

- Dependabot alerts: 確認済み
- Secret scanning alerts: 確認済み
- CodeQL alerts: 初回 scan 完了後に確認済み

Critical / High finding:

- 修正済み
- または patched version / 実行環境 / false positive 等を確認し、修正不能・別対応とする理由を記録済み

Moderate / Low finding:

- 少なくとも triage 済み
- 本 Plan で必ず全件修正することは要求しない

Security finding が残っていることと Security automation 設定が失敗していることを混同しない。

---

## 11. Implementation Record

実装時にこの表を更新する。

| Setting / Check | Before | Target | After | Evidence / Result |
| --- | --- | --- | --- | --- |
| Dependency graph / pnpm recognition | 未確認 | root dependencies 認識 | 未実施 | 未実施 |
| Dependabot alerts | 未確認 | ON | 未実施 | 未実施 |
| Dependabot security updates | 未確認 | ON | 未実施 | 未実施 |
| Grouped security updates | 未確認 | OFF | 未実施 | 未実施 |
| Dependabot malware alerts | 未確認 | ON | 未実施 | 未実施 |
| Dependabot version updates | 未確認 | OFF | 未実施 | 未実施 |
| Secret Protection | 未確認 | ON | 未実施 | 未実施 |
| Secret scanning alerts | 未確認 | 有効 | 未実施 | 未実施 |
| Push protection | 未確認 | ON | 未実施 | 未実施 |
| CodeQL existing configuration | 未確認 | 競合なし / 評価済み | 未実施 | 未実施 |
| CodeQL Default Setup | 未確認 | ON | 未実施 | 未実施 |
| CodeQL JS/TS | 未確認 | success | 未実施 | 未実施 |
| CodeQL Actions | 未確認 | success | 未実施 | 未実施 |
| Private Vulnerability Reporting | 未確認 | ON | 未実施 | 未実施 |
| Actions default permission | 未確認 | read-only | 未実施 | 未実施 |
| Actions create / approve PR | 未確認 | OFF | 未実施 | 未実施 |
| Repository allow_auto_merge | `false` | `false` | 未実施 | Repository metadata で再確認 |
| Dependabot auto-approve / merge workflow | 未確認 | なし | 未実施 | Workflow scan |

---

## 12. リスク / 注意点

### R-01: Settings は Branch に隔離できない

Repository Settings は変更時点で Repository 全体へ反映される。

Phase 1 を完了してから変更する。

### R-02: Security Updates 有効化直後に PR が作成される可能性

既存 Alert に patched version がある場合は正常な期待動作である。

自動 merge しない。

### R-03: Alert があっても Security PR が作成されない場合がある

patched version 不在や dependency conflict を確認する。

### R-04: CodeQL Default Setup と既存 configuration の競合

既存 Advanced Setup / SARIF upload 等を確認せずに切り替えない。

### R-05: Active Secret を検出した場合は優先順位が変わる

実 credential が漏えいしている場合、Plan の通常手順より rotate / revoke を優先する。

### R-06: GitHub UI / product naming の変更

GitHub の設定名や画面構成が変わっている場合、名称だけで判断せず同等機能か確認する。

---

## 13. 実装優先順位

1. 最新 `main` / CI contract / auto-merge guard の再確認
2. Repository Settings の Before inventory
3. Dependabot alerts / security updates / malware alerts
4. Secret Protection / Push protection
5. CodeQL existing configuration 確認 → Default Setup
6. Private Vulnerability Reporting
7. Actions permission 最終確認
8. 初回 Alert / Security PR / CodeQL scan の検証
9. Implementation Record / Finding Triage の記録

最優先は、不要な通常 Version Update を発生させずに、既知脆弱性を検出し、修正可能な場合だけ Security PR を生成する状態を成立させることである。
