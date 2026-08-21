# GitHub Security Automation 実行・検証計画

## 1. 目的

`qa-training-store` で、既存の Public Repository Hardening 方針に従い、GitHub 標準 Security 機能の未完了設定を有効化・検証する。

今回のゴールは次のとおり。

- 既知脆弱性がある依存関係だけ Dependabot Security Updates で修正 PR を作成する
- 脆弱性のない通常 Version Update PR は自動作成しない
- 既存 Dependency Review で新しい脆弱な依存関係の混入を防ぐ
- CodeQL Default Setup で JavaScript / TypeScript / GitHub Actions を解析する
- Secret Protection / Push protection で credential 漏えいを検出・予防する
- Dependabot Malware Alerts を有効化し、malware finding を自動 dismiss しない
- Private Vulnerability Reporting と通知経路を有効化・確認する
- Security PR を自動 approve / merge せず、既存 CI と人間確認を通して判断する

独自 Security Bot、独自 scanner、Renovate、Dependabot auto-merge workflow は追加しない。

---

## 2. 位置付け / SSOT

Security 方針の正本は次とする。

- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

本 Plan はその方針を再定義しない。

Public Repository Hardening が `main` に反映された後に残った Repository Settings の有効化、Ruleset の最終確認、初回 scan / alert / Security PR の確認、実施結果の記録を行うフォローアップ実行計画とする。

SSOT と本 Plan が矛盾する場合は SSOT を優先し、矛盾を記録して本 Plan を必要最小限に修正する。

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

ただし、Dependabot / CodeQL / Secret Protection / Push protection / Private Vulnerability Reporting / Ruleset などの Settings は Branch 単位ではなく Repository 全体へ即時反映される。

設定変更前に最新 `main` の Security PR 向け CI contract が維持されていることを確認する。

Repository Admin 権限が必要な設定を実装セッションで変更できない場合は、代替実装や推測で済ませない。

その場合は Plan Status を `Blocked - Repository Admin action required` とし、未実施 Setting、必要操作、影響、再開条件を Implementation Record に残す。Configuration DoD を満たした扱いにはしない。

---

## 4. 現状

### 4.1 Repository 側で実装済み

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

### 4.2 Dependabot Version Updates

`.github/dependabot.yml` は存在しない。

この状態を維持し、通常 Version Updates 用の設定は追加しない。

### 4.3 Dependency graph

Public Repository の Dependency graph は GitHub 標準の有効状態を前提とし、今回 ON にする操作対象とはしない。

実装時に `package.json` / `pnpm-lock.yaml` の root dependencies が Dependency graph で認識されていることを確認する。

### 4.4 Dependabot PR

2026-08-22 のレビュー時点では open Dependabot PR は 0 件だった。

ただし実装開始時に再取得し、既存 Dependabot PR がある場合は次に分類する。

- Security Update PR
- Version Update PR
- 判別不能 / その他

過去の通常 Version Update PR が残っていても、それだけで今回の Security Updates 設定が誤っているとは判断しない。生成元と作成時点を確認する。

### 4.5 未確認の Settings

現在の GitHub connector では Repository Settings の ON / OFF を確実に取得できず、Repository metadata 上も `admin: false` である。

次は Repository Admin が GitHub UI で確認・変更する。

- Dependabot alerts / security updates / grouped security updates / malware alerts
- `Dismiss package malware alerts` preset
- Secret Protection / Secret scanning alerts / Push protection
- CodeQL configuration
- Private Vulnerability Reporting
- Private Vulnerability Reporting の通知経路
- Actions default workflow permission
- GitHub Actions による PR create / approve permission
- `main-protection` Ruleset / Required status check

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
| `Dismiss package malware alerts` preset | OFF |
| Dependabot version updates | OFF |
| `.github/dependabot.yml` | 追加しない |
| Dependabot auto-merge / auto-approve | なし |
| Secret Protection | ON |
| Secret scanning alerts for users | 有効 |
| Push protection | ON |
| CodeQL | Default Setup |
| CodeQL JavaScript / TypeScript | initial analysis success |
| CodeQL GitHub Actions | initial analysis success |
| Private Vulnerability Reporting | ON |
| PVR notification path | Repository Owner / Admin が受信可能な状態を確認 |
| Actions default workflow permission | Read repository contents |
| Actions create / approve PR | OFF |
| `main-protection` Required status check | `validate` |
| Required check expected source | GitHub Actions |

GitHub UI の名称が変わっている場合は、同等機能か確認してから操作する。

---

## 6. 実施主体

| 作業 | 主体 |
| --- | --- |
| `main` / Branch / CI contract 確認 | AI / 実装者 |
| Repository Settings の実値確認・変更 | Repository Admin |
| Ruleset の実値確認・必要な変更 | Repository Admin |
| 初回 scan / alert / PR の確認 | AI / 実装者 + Repository Admin |
| Security finding の技術調査 | AI / 実装者 |
| Credential rotate / revoke | Credential Owner / Repository Admin |
| 実施結果の記録 | AI / 実装者 |

Admin 権限がない実行環境では、Settings 操作を代替実装や推測で済ませない。

---

## 7. 実装手順

### Phase 1: Preflight

設定変更前に次を確認する。

1. Implementation Branch と最新 `main` の差分を確認する。
2. `.github/dependabot.yml` が存在しない。
3. Dependency graph で root dependencies が認識されている。
4. open Dependabot PR を取得し、Security / Version Update / その他に分類する。
5. Dependency Review が次を維持している。
   - `vulnerability-check: true`
   - `fail-on-severity: moderate`
   - `fail-on-scopes: runtime, development, unknown`
6. Dependabot PR / fork PR で Cloudflare Preview が skipped になる。
7. `verify` / `validate` contract が維持されている。
8. Repository `allow_auto_merge` が false。
9. Dependabot 向け auto-approve / auto-merge Workflow がない。
10. `main-protection` Ruleset を確認する。
    - PR required
    - Required status check が `validate`
    - Required check expected source が GitHub Actions
    - force push blocked
    - deletion blocked
    - linear history required
    - review thread resolution required

`main-protection` の Required status check がまだ `verify` の場合は、SSOT の P-14 に従う。

`validate` が `main` で正常に成功していることと、check-run の発行元が GitHub Actions であることを確認してから `validate` へ切り替える。

Admin 権限不足で Ruleset を変更できない場合は Blocked として記録する。

問題がなければ Repository file を変更しない。

### Phase 2: Settings Inventory

変更前の実値を Implementation Record に記録する。

対象:

- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Dependabot malware alerts
- `Dismiss package malware alerts` preset
- Dependabot version updates
- Secret Protection / Secret scanning alerts
- Push protection
- CodeQL configuration
- Private Vulnerability Reporting
- PVR notification path
- Actions default workflow permission
- Actions create / approve PR
- `main-protection` Required status check / expected source

既に Target State と同じ項目は再操作しない。

### Phase 3: Dependabot

1. Dependabot alerts を ON。
2. 既存 Dependabot alerts を確認。
3. Grouped security updates を OFF。
4. Dependabot security updates を ON。
5. Dependabot malware alerts を ON。
6. `Dismiss package malware alerts` preset が OFF であることを確認する。
7. Dependabot version updates が有効化されていないことを確認する。
8. `.github/dependabot.yml` がないことを再確認する。
9. auto-approve / auto-merge は追加しない。

Security Updates 有効化直後に Security PR が生成されても自動 merge しない。

Alert があっても次の場合は PR が作成されない可能性がある。

- patched version がない
- manifest / lockfile 制約で安全な Version に解決できない
- dependency conflict で生成できない

「Alert 数 = PR 数」は DoD にしない。

Malware Alert は Security Update PR の自動生成を前提としない。Finding Triage の malware 手順に従う。

### Phase 4: Secret Protection

1. Secret Protection を ON。
2. user-facing Secret scanning alerts の有効状態を確認。
3. 既存 Secret alerts を確認。
4. active または validity unknown の credential があれば通常作業より rotate / revoke を優先。
5. 必要に応じて正規 Secret 参照先を更新し、影響範囲を確認する。
6. Push protection を ON。
7. bypass を通常運用にしない。

実 credential を commit / push する破壊的テストは行わない。

Git history rewrite は rotate / revoke より優先しない。

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

- success: Configuration DoD の CodeQL 項目を満たす
- failure: 原因調査。成功扱いにしない
- 実装セッション内に完了しない: `Pending external verification` と記録し、Plan 全体を Completed にしない

独自 `.github/workflows/codeql.yml` は追加しない。

### Phase 6: Private Vulnerability Reporting / Actions

1. Private Vulnerability Reporting を ON。
2. Security > Advisories に `Report a vulnerability` 導線があることを確認。
3. `SECURITY.md` と実 UI が一致することを確認。
4. Repository Owner / Admin が PVR notification を受信可能な通知設定になっていることを確認。
5. 通知経路を Implementation Record に記録する。
6. Actions default workflow permission が read-only であることを確認。
7. Actions create / approve PR が OFF であることを確認。

PVR の確認のためだけにダミー脆弱性レポートを送信しない。通知設定と Security / Advisories の利用可能状態を確認する。

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

CodeQL は初回 analysis success を確認する。

Push protection は Settings の enabled 状態で確認し、実 Secret を使ったテストは行わない。

---

## 8. Finding Triage

Security automation の設定完了と、検出された finding の修正完了を混同しない。

finding は種類ごとに扱う。

### 8.1 Dependency / CodeQL Vulnerability

Critical / High:

- affected dependency / code を確認
- actual exposure を確認
- patched version / safe remediation の有無を確認
- 小さく安全に修正可能なら本作業で修正
- 大きな別 Scope が必要なら、理由、影響、対応方針、follow-up を記録
- 未評価のまま完了にしない

Moderate / Low:

- ID / severity / 対象 / 概要を記録して triage
- 本 Plan で全件修正することは要求しない
- 高 Exposure または小さく安全に修正できるものは対応してよい
- その他は Backlog / follow-up とする

### 8.2 Malware Alert

Malware Alert がある場合:

- 対象 package が実際に使用中か確認
- 使用中なら除去または安全な代替へ移行
- false positive / non-applicable と判断する場合は根拠を確認して記録
- `Dismiss package malware alerts` preset で機械的に隠さない
- 未評価のまま完了にしない

### 8.3 Secret Scanning Alert

Active / validity unknown:

1. credential を revoke / rotate
2. 正規 Secret 参照先を更新
3. 影響範囲を確認
4. alert を根拠付きで resolve

Revoked / expired / false positive:

- 根拠を確認してから resolve

Git history rewrite は revoke / rotate より優先しない。

---

## 9. Repository File Change Policy / Validation

原則として Repository file の実装差分は増やさない。

Current State と Target State の drift がある場合だけ必要最小限に修正する。

変更候補:

- `.github/workflows/ci.yml`: Security PR / Dependency Review contract に drift がある場合のみ
- CI contract tests: Workflow contract を変更した場合のみ
- `SECURITY.md`: PVR の実 UI と不一致がある場合のみ
- 本 Plan: Settings の Before / After / Verification / Blocked / Pending 結果を記録

追加しない:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- Renovate
- 独自 vulnerability scanner / dependency bot
- Dependabot auto-merge / auto-approve workflow
- Custom Auto-triage Rule
- 独自 Security Dashboard

Validation は変更範囲に応じて実行する。

### Plan / docs のみ変更

- `pnpm run lint:markdown`
- `git diff --check`

### `.github/workflows/**` を変更

上記に加えて:

- CI contract tests
- workflow 変更に対応する targeted tests
- 必要に応じて `pnpm run format:check`

### Application / package dependency を変更

今回の原則 Scope 外。

finding 修正として必要になった場合だけ、変更内容に応じた targeted tests と既存 quality gate を実行する。

`pnpm run verify` は影響範囲が広い変更を行った場合、または既存 Repository 方針上必要な場合に実行する。Plan 記録だけのために機械的に実行しない。

---

## 10. Definition of Done

Configuration と Security finding の対応を分離する。

### 10.1 Configuration DoD

次をすべて満たした場合のみ Configuration 完了とする。

- 通常 Version Update 自動化がない
- `.github/dependabot.yml` がない
- Dependency graph が root dependencies を認識
- Dependabot alerts: ON
- Dependabot security updates: ON
- Grouped security updates: OFF
- Dependabot malware alerts: ON
- `Dismiss package malware alerts` preset: OFF
- Dependabot auto-merge / auto-approve: なし
- Dependency Review: 有効、`moderate` gate 維持
- Dependabot PR で Cloudflare Preview Secret を利用しない
- Secret Protection: ON
- Secret scanning alerts: 有効
- Push protection: ON
- CodeQL Default Setup: ON
- CodeQL JavaScript / TypeScript initial analysis: success
- CodeQL GitHub Actions initial analysis: success
- Private Vulnerability Reporting: ON
- `SECURITY.md` と実 UI が一致
- PVR notification path: 確認済み
- Actions permissions が安全側を維持
- `main-protection` Required status check: `validate`
- Required check expected source: GitHub Actions

CodeQL が Pending の場合、または Admin 権限不足で Required Setting を変更・確認できない場合は Configuration DoD 未達である。

### 10.2 Finding Triage DoD

有効化時点の findings を種類別に確認する。

- Dependabot vulnerability alerts
- Dependabot malware alerts
- Secret scanning alerts
- CodeQL alerts

完了条件:

- Dependency / CodeQL Critical / High: 修正済み、または理由・Exposure・対応方針・follow-up を記録済み
- Dependency / CodeQL Moderate / Low: triage 済み
- Malware: 使用状況と対応方針を確認済み。未評価なし
- Secret: Active / validity unknown を rotate / revoke 優先で処理済み。その他は根拠付きで triage 済み

Security finding が残っていることと Security automation 設定失敗を混同しない。

### 10.3 完了状態

最終 Status は次のいずれかを明記する。

- `Completed`: Configuration DoD と Finding Triage DoD を満たす
- `Pending external verification`: CodeQL 等の外部処理が terminal state に到達していない
- `Blocked - Repository Admin action required`: Required Setting を Admin 権限不足で変更・確認できない
- `Blocked - Security remediation required`: Active Secret / Malware 等、先に対応すべき finding があり通常実装を継続すべきでない

`Pending` / `Blocked` を `Completed` として記録しない。

---

## 11. Implementation Record

実装時に更新する。

| Setting / Check | Before | Target | After / Result |
| --- | --- | --- | --- |
| Dependency graph / pnpm recognition | 未確認 | root dependencies 認識 | 未実施 |
| Open Dependabot PR inventory | review時 0件 | 分類済み | 再確認待ち |
| Dependabot alerts | 未確認 | ON | 未実施 |
| Dependabot security updates | 未確認 | ON | 未実施 |
| Grouped security updates | 未確認 | OFF | 未実施 |
| Dependabot malware alerts | 未確認 | ON | 未実施 |
| Dismiss package malware alerts preset | 未確認 | OFF | 未実施 |
| Dependabot version updates | 未確認 | OFF | 未実施 |
| Secret Protection | 未確認 | ON | 未実施 |
| Secret scanning alerts | 未確認 | 有効 | 未実施 |
| Push protection | 未確認 | ON | 未実施 |
| CodeQL existing configuration | 未確認 | 競合なし / 評価済み | 未実施 |
| CodeQL Default Setup | 未確認 | ON | 未実施 |
| CodeQL JavaScript / TypeScript | 未確認 | success | 未実施 |
| CodeQL GitHub Actions | 未確認 | success | 未実施 |
| Private Vulnerability Reporting | 未確認 | ON | 未実施 |
| PVR notification path | 未確認 | 受信可能 | 未実施 |
| Actions default permission | 未確認 | read-only | 未実施 |
| Actions create / approve PR | 未確認 | OFF | 未実施 |
| Repository allow_auto_merge | `false` | `false` | 再確認待ち |
| Dependabot auto-approve / merge workflow | 未確認 | なし | 未実施 |
| main-protection required check | 未確認 | `validate` | 未実施 |
| main-protection expected source | 未確認 | GitHub Actions | 未実施 |
| Dependabot vulnerability findings | 未確認 | triage済み | 未実施 |
| Malware findings | 未確認 | triage済み | 未実施 |
| Secret findings | 未確認 | triage済み | 未実施 |
| CodeQL findings | 未確認 | triage済み | 初回scan待ち |
| Final Plan Status | Implementation-ready | Completed / Pending / Blocked | 未実施 |

---

## 12. リスク / 注意点

- Settings は Branch に隔離できず、変更時点で Repository 全体へ反映される。
- Security Updates 有効化直後に既存脆弱性の PR が作成される可能性がある。
- Alert があっても patched version 不在等で PR が作成されない場合がある。
- Malware Alert は Security Update PR が自動生成される前提で扱わない。
- `Dismiss package malware alerts` preset を ON にすると malware finding を見落とす可能性があるため OFF を維持する。
- CodeQL Default Setup は既存 Advanced Setup / SARIF upload を確認してから有効化する。
- active secret を検出した場合は rotate / revoke を最優先する。
- Git history rewrite は credential 無効化より優先しない。
- Ruleset は `validate` が `main` で正常に機能することを確認してから変更する。
- GitHub UI の名称変更時は名前だけで判断せず同等機能か確認する。
- Admin 権限不足を workaround で隠さず Blocked とする。

---

## 13. 実装優先順位

1. 最新 `main` / CI contract / auto-merge guard / open Dependabot PR の確認
2. `main-protection` Ruleset の実値確認
3. Settings Before inventory
4. Dependabot alerts / security updates / malware alerts / malware auto-dismiss preset
5. Secret Protection / Push protection / Secret finding triage
6. CodeQL existing configuration 確認 → Default Setup → initial analysis
7. Private Vulnerability Reporting / PVR notification / Actions permission
8. 初回 Alert / Security PR / CodeQL scan の検証
9. Finding Triage
10. Implementation Record / Final Plan Status の更新

最優先は、不要な通常 Version Update を発生させず、既知脆弱性を検出し、修正可能な場合だけ Security PR を生成する状態を成立させることである。
