# GitHub Security Automation 実行・検証計画

## 1. 目的

`qa-training-store` で、既存の Public Repository Hardening 方針に従い、GitHub 標準 Security 機能の未完了設定を有効化・検証する。

今回のゴールは次のとおり。

- 既知脆弱性がある依存関係だけ Dependabot Security Updates で修正 PR を作成する
- 脆弱性のない通常 Version Update PR は自動作成しない
- 既存 Dependency Review で新しい脆弱な依存関係の混入を防ぐ
- CodeQL Default Setup で JavaScript / TypeScript / GitHub Actions を解析する
- Secret Protection / Push protection で credential 漏えいを検出・予防する
- Security PR を自動 approve / merge せず、既存 CI と人間確認を通して判断する

独自 Security Bot、独自 scanner、Renovate、Dependabot auto-merge workflow は追加しない。

---

## 2. 位置付け / SSOT

Security 方針の正本は次とする。

- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

本 Plan はその方針を再定義しない。

Public Repository Hardening が `main` に反映された後に残った Repository Settings の有効化、初回 scan / alert / Security PR の確認、実施結果の記録を行うフォローアップ実行計画とする。

---

## 3. Plan Status

- Status: Implementation-ready
- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Baseline Branch: `main`
- Baseline Commit: `314a8f958072f19e672e3bc37089558d74e42feb`
- Implementation Branch: `chore/enable-github-security-automation`
- Reviewed Date: 2026-08-22
- Package Manager: `pnpm@9.10.0`
- Repository Visibility: Public

この Branch を実装・検証・実施記録用 Branch として使用する。

ただし、Dependabot / CodeQL / Secret Protection / Push protection / Private Vulnerability Reporting などの Settings は Branch 単位ではなく Repository 全体へ即時反映される。

設定変更前に最新 `main` の Security PR 向け CI contract が維持されていることを確認する。

---

## 4. 現状

### Repository 側で実装済み

現在の `main` には次が実装済みである。

- `SECURITY.md`
- Private Vulnerability Reporting への報告導線
- `.github/workflows/ci.yml` の Dependency Review
- `vulnerability-check: true`
- `fail-on-severity: moderate`
- `fail-on-scopes: runtime, development, unknown`
- top-level `permissions: contents: read`
- remote Actions の full SHA pin
- Dependabot PR / fork PR では Cloudflare Preview deploy を実行しない contract
- `verify` / `validate` の CI aggregate 判定

既存実装が正常なら再実装しない。

### Dependabot Version Updates

`.github/dependabot.yml` は存在しない。

この状態を維持し、通常 Version Updates 用の設定は追加しない。

### Dependency graph

Public Repository の Dependency graph は GitHub 標準の有効状態を前提とし、今回 ON にする操作対象とはしない。

実装時に `package.json` / `pnpm-lock.yaml` の root dependencies が Dependency graph で認識されていることだけ確認する。

### 未確認の Settings

現在の GitHub connector では Repository Settings の ON / OFF を確実に取得できず、Repository metadata 上も `admin: false` である。

次は Repository Admin が GitHub UI で確認・変更する。

- Dependabot alerts / security updates / grouped security updates / malware alerts
- Secret Protection / Secret scanning alerts / Push protection
- CodeQL configuration
- Private Vulnerability Reporting
- Actions default workflow permission
- GitHub Actions による PR create / approve permission

推測で完了扱いにしない。

---

## 5. Target State

| 項目 | Target |
| --- | --- |
| Dependency graph | root dependencies を認識 |
| Dependabot alerts | ON |
| Dependabot security updates | ON |
| Grouped security updates | OFF |
| Dependabot malware alerts | ON |
| Dependabot version updates | OFF |
| `.github/dependabot.yml` | 追加しない |
| Dependabot auto-merge / auto-approve | なし |
| Secret Protection | ON |
| Secret scanning alerts for users | 有効 |
| Push protection | ON |
| CodeQL | Default Setup |
| Private Vulnerability Reporting | ON |
| Actions default workflow permission | Read repository contents |
| Actions create / approve PR | OFF |

GitHub UI の名称が変わっている場合は、同等機能か確認してから操作する。

---

## 6. 実施主体

| 作業 | 主体 |
| --- | --- |
| `main` / Branch / CI contract 確認 | AI / 実装者 |
| Repository Settings の実値確認・変更 | Repository Admin |
| 初回 scan / alert / PR の確認 | AI / 実装者 + Repository Admin |
| 実施結果の記録 | AI / 実装者 |

Admin 権限がない実行環境では、Settings 操作を代替実装や推測で済ませない。

---

## 7. 実装手順

### Phase 1: Preflight

設定変更前に次を確認する。

1. Implementation Branch と最新 `main` の差分を確認する。
2. `.github/dependabot.yml` が存在しない。
3. Dependency graph で root dependencies が認識されている。
4. Dependency Review が次を維持している。
   - `vulnerability-check: true`
   - `fail-on-severity: moderate`
   - `fail-on-scopes: runtime, development, unknown`
5. Dependabot PR / fork PR で Cloudflare Preview が skipped になる。
6. `verify` / `validate` contract が維持されている。
7. Repository `allow_auto_merge` が false。
8. Dependabot 向け auto-approve / auto-merge Workflow がない。

問題がなければ Repository file を変更しない。

### Phase 2: Settings Inventory

変更前の実値を Implementation Record に記録する。

対象:

- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Dependabot malware alerts
- Secret Protection / Secret scanning alerts
- Push protection
- CodeQL configuration
- Private Vulnerability Reporting
- Actions default workflow permission
- Actions create / approve PR

既に Target State と同じ項目は再操作しない。

### Phase 3: Dependabot

1. Dependabot alerts を ON。
2. 既存 Dependabot alerts を確認。
3. Grouped security updates を OFF。
4. Dependabot security updates を ON。
5. Dependabot malware alerts を ON。
6. `.github/dependabot.yml` がないことを再確認。
7. auto-approve / auto-merge は追加しない。

Security Updates 有効化直後に Security PR が生成されても自動 merge しない。

Alert があっても次の場合は PR が作成されない可能性がある。

- patched version がない
- manifest / lockfile 制約で安全な Version に解決できない
- dependency conflict で生成できない

「Alert 数 = PR 数」は DoD にしない。

### Phase 4: Secret Protection

1. Secret Protection を ON。
2. user-facing Secret scanning alerts の有効状態を確認。
3. 既存 Secret alerts を確認。
4. active credential があれば通常作業より rotate / revoke を優先。
5. Push protection を ON。
6. bypass を通常運用にしない。

実 credential を commit / push する破壊的テストは行わない。

### Phase 5: CodeQL Default Setup

有効化前に既存 Code scanning configuration を確認する。

- Default Setup
- Advanced Setup / CodeQL workflow
- SARIF upload / 外部 code scanning

既存 Advanced Setup や外部 upload がある場合は無条件に切り替えない。

競合がなければ次を行う。

1. CodeQL Default Setup を開く。
2. JavaScript / TypeScript が解析対象であることを確認。
3. GitHub Actions (`actions`) が解析対象であることを確認。
4. Default Setup を有効化。
5. 初回 analysis を terminal state まで確認。

判定:

- success: 完了
- failure: 原因調査。成功扱いにしない
- 実装セッション内に完了しない: Pending と記録し、成功扱いにしない

独自 `.github/workflows/codeql.yml` は追加しない。

### Phase 6: Private Vulnerability Reporting / Actions

1. Private Vulnerability Reporting を ON。
2. Security > Advisories に `Report a vulnerability` 導線があることを確認。
3. `SECURITY.md` と実 UI が一致することを確認。
4. Actions default workflow permission が read-only であることを確認。
5. Actions create / approve PR が OFF であることを確認。

Dependabot auto-merge / auto-approve の確認では、Workflow 内の次も確認する。

- `gh pr merge`
- `gh pr review --approve`
- Dependabot PR 向けの過剰な `pull-requests: write`

無関係な Workflow 権限は機械的に削除しない。

### Phase 7: End-to-End Verification

Dependabot Security PR が生成された場合:

- author が `dependabot[bot]`
- Security Update であり通常 Version Update ではない
- 対応する alert / advisory が確認できる
- update 範囲が脆弱性修正に必要な範囲である
- Dependency Review と既存 CI が実行される
- Cloudflare Preview deploy が skipped
- `verify` / `validate` が想定どおり
- 自動 approve / merge されない

Security PR がない場合:

- alert の有無
- patched version の有無
- dependency conflict 等の生成不能理由

を確認し、PR がないこと自体は失敗扱いにしない。

---

## 8. Repository File Change Policy

原則として Repository file の実装差分は増やさない。

Current State と Target State の drift がある場合だけ必要最小限に修正する。

変更候補:

- `.github/workflows/ci.yml`: Security PR / Dependency Review contract に drift がある場合のみ
- CI contract tests: Workflow contract を変更した場合のみ
- `SECURITY.md`: PVR の実 UI と不一致がある場合のみ
- 本 Plan: Settings の Before / After / Verification 結果を記録

追加しない:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- Renovate
- 独自 vulnerability scanner / dependency bot
- Dependabot auto-merge / auto-approve workflow
- Custom Auto-triage Rule
- 独自 Security Dashboard

Repository file を変更した場合は、変更範囲に応じて次を実行する。

- `pnpm run format:check`
- `pnpm run lint:markdown`
- CI contract tests
- targeted tests
- `git diff --check`
- 必要性がある場合のみ `pnpm run verify`

---

## 9. Definition of Done

Configuration と Security finding の対応を分離する。

### Configuration DoD

- 通常 Version Update 自動化がない
- `.github/dependabot.yml` がない
- Dependabot alerts: ON
- Dependabot security updates: ON
- Grouped security updates: OFF
- Dependabot malware alerts: ON
- Dependabot auto-merge / auto-approve: なし
- Dependency Review: 有効、`moderate` gate 維持
- Dependabot PR で Cloudflare Preview Secret を利用しない
- Secret Protection: ON
- Secret scanning alerts: 有効
- Push protection: ON
- CodeQL Default Setup: ON
- CodeQL 初回 analysis: success、または未完了なら Pending と明記
- Private Vulnerability Reporting: ON
- `SECURITY.md` と実 UI が一致
- Actions permissions が安全側を維持

CodeQL が Pending の場合は Plan 全体を完全完了とは記録しない。

### Finding Triage DoD

有効化時点の findings を確認する。

- Dependabot alerts
- Secret scanning alerts
- CodeQL alerts（初回 scan 完了後）

Critical / High:

- 修正済み
- または patched version 不在、false positive 等の理由と対応方針を記録済み

Moderate / Low:

- triage 済み
- 本 Plan で全件修正することは要求しない

Security finding が残っていることと Security automation 設定失敗を混同しない。

---

## 10. Implementation Record

実装時に更新する。

| Setting / Check | Before | Target | After / Result |
| --- | --- | --- | --- |
| Dependency graph / pnpm recognition | 未確認 | root dependencies 認識 | 未実施 |
| Dependabot alerts | 未確認 | ON | 未実施 |
| Dependabot security updates | 未確認 | ON | 未実施 |
| Grouped security updates | 未確認 | OFF | 未実施 |
| Dependabot malware alerts | 未確認 | ON | 未実施 |
| Dependabot version updates | 未確認 | OFF | 未実施 |
| Secret Protection | 未確認 | ON | 未実施 |
| Secret scanning alerts | 未確認 | 有効 | 未実施 |
| Push protection | 未確認 | ON | 未実施 |
| CodeQL existing configuration | 未確認 | 競合なし / 評価済み | 未実施 |
| CodeQL Default Setup | 未確認 | ON | 未実施 |
| CodeQL JS/TS / Actions | 未確認 | success | 未実施 |
| Private Vulnerability Reporting | 未確認 | ON | 未実施 |
| Actions default permission | 未確認 | read-only | 未実施 |
| Actions create / approve PR | 未確認 | OFF | 未実施 |
| Repository allow_auto_merge | `false` | `false` | 再確認待ち |
| Dependabot auto-approve / merge workflow | 未確認 | なし | 未実施 |

---

## 11. リスク / 注意点

- Settings は Branch に隔離できず、変更時点で Repository 全体へ反映される。
- Security Updates 有効化直後に既存脆弱性の PR が作成される可能性がある。
- Alert があっても patched version 不在等で PR が作成されない場合がある。
- CodeQL Default Setup は既存 Advanced Setup / SARIF upload を確認してから有効化する。
- active secret を検出した場合は rotate / revoke を最優先する。
- GitHub UI の名称変更時は名前だけで判断せず同等機能か確認する。

---

## 12. 実装優先順位

1. 最新 `main` / CI contract / auto-merge guard の確認
2. Settings Before inventory
3. Dependabot alerts / security updates / malware alerts
4. Secret Protection / Push protection
5. CodeQL existing configuration 確認 → Default Setup
6. Private Vulnerability Reporting / Actions permission
7. 初回 Alert / Security PR / CodeQL scan の検証
8. Implementation Record / Finding Triage の更新

最優先は、不要な通常 Version Update を発生させず、既知脆弱性を検出し、修正可能な場合だけ Security PR を生成する状態を成立させることである。
