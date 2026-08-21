# GitHub Security Automation 実行・検証計画

## 1. 目的

`qa-training-store` で、既存の Public Repository Hardening 方針に従い、GitHub 標準 Security 機能の未完了設定を有効化・検証する。

今回のゴール:

- 既知脆弱性がある依存関係だけ Dependabot Security Updates の対象とする
- 通常の Version Update PR は自動作成しない
- 既存 Dependency Review で新しい脆弱な依存関係の混入を防ぐ
- CodeQL Default Setup で JavaScript / TypeScript / GitHub Actions を解析する
- Secret Protection / Push protection で credential 漏えいを検出・予防する
- Dependabot Malware Alerts を有効化し、malware finding を自動 dismiss しない
- Private Vulnerability Reporting (PVR) と通知経路を有効化・確認する
- Security PR を自動 approve / merge せず、既存 CI と人間確認を通して判断する
- `main-protection` Ruleset を既存 Hardening 方針どおりの最終状態にする

独自 Security Bot、独自 scanner、Renovate、Dependabot auto-merge workflow は追加しない。

---

## 2. 位置付け / SSOT

Security 方針の正本は次とする。

- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

本 Plan はその方針を再定義しない。

Public Repository Hardening が `main` に反映された後に残った Repository Settings の有効化、Ruleset の最終確認、初回 scan / alert / Security PR の確認、実施結果の記録を行うフォローアップ実行計画とする。

SSOT と本 Plan が矛盾する場合は SSOT を優先し、矛盾を記録して本 Plan を必要最小限に修正する。

### 2.1 本Plan固有の初期運用選択

`Grouped security updates` は SSOT に定義されていないため、Security Policy の追加要件として扱わない。

本導入時は、個々の Security PR の advisory / diff / CI / rollback を確認しやすくするため **OFF を初期値**とする。

- 通常 Version Update を有効化するものではない
- 将来 Security PR 数が実運用上の問題になった場合のみ、別タスクで ON を再検討する
- この選択は SSOT より優先しない

GitHub が Public Repository に対して既定有効化する Dependabot preset は、今回の方針と衝突しない限り機械的に無効化しない。特に低影響な development-scoped dependency を自動 dismiss する既定 preset は現状を記録し、Finding Inventory では dismissed alert も確認対象に含める。

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

この Branch は実装・検証・実施記録用に使用する。

Dependabot / CodeQL / Secret Protection / Push protection / PVR / Ruleset などの Settings は Branch 単位ではなく Repository 全体へ即時反映される。

設定変更前に最新 `main` の Security PR 向け CI contract が維持されていることを確認する。

Repository Admin 権限が必要な設定を変更できない場合は、代替実装や推測で済ませない。未実施 Setting、必要操作、影響、再開条件を記録し、`Blocked - Repository Admin action required` とする。

---

## 4. Current State / 変更しないもの

現在の `main` には次が実装済みである。

- `SECURITY.md`
- PVR への報告導線
- `.github/workflows/ci.yml` の Dependency Review
  - `vulnerability-check: true`
  - `fail-on-severity: moderate`
  - `fail-on-scopes: runtime, development, unknown`
- top-level `permissions: contents: read`
- remote Actions の full SHA pin
- Dependabot PR / fork PR では Cloudflare Preview deploy を実行しない contract
- `verify` / `validate` の CI aggregate 判定

既存実装が正常なら再実装しない。

### 4.1 Version Updates

`.github/dependabot.yml` は存在しない。この状態を維持する。

- `.github/dependabot.yml` を追加しない
- GitHub UI の Version Updates `Enable` 操作を行わない
- 通常 Version Update 用の設定を導入しない

今回の目的は「Version Updates の OFF トグルを探して切る」ことではなく、通常 Version Update 自動化を導入しないことである。

### 4.2 Dependency graph

Public Repository の Dependency graph は GitHub 標準の有効状態を前提とし、今回 ON にする操作対象とはしない。

実装時に `package.json` / `pnpm-lock.yaml` の root dependencies が Dependency graph で認識されていることを確認する。

### 4.3 Dependabot PR

2026-08-22 のレビュー時点では open Dependabot PR は 0 件だった。

実装開始時に再取得し、既存 PR があれば次に分類する。

- Security Update PR
- Version Update PR
- 判別不能 / その他

過去の通常 Version Update PR が残っていても、それだけで現在設定を誤りと判断しない。生成元と作成時点を確認する。

### 4.4 Settings の確認制約

現在の GitHub connector では Repository Settings の ON / OFF を確実に取得できず、Repository metadata 上も `admin: false` である。

- read-only で確認可能な情報は AI / 実装者が確認する
- Settings / Ruleset の変更は Repository Admin が行う
- connector / API で取得不能な値を推測で埋めない

---

## 5. Target / Implementation Record

この表を Settings / Ruleset の **唯一の Target 一覧兼 Implementation Record** とする。
別章で同じ Target 一覧を複製しない。

`Source`:

- `SSOT`: Public Repository Hardening の要件
- `Operational`: 本Plan固有の初期運用選択
- `Verification`: 設定そのものではなく確認項目

| ID | Setting / Check | Target | Source | Before | After / Evidence |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Dependency graph | root dependencies 認識 | SSOT | 未確認 | 未実施 |
| SEC-02 | Dependabot alerts | ON | SSOT | 未確認 | 未実施 |
| SEC-03 | Dependabot security updates | ON | SSOT | 未確認 | 未実施 |
| SEC-04 | Grouped security updates | OFF initially | Operational | 未確認 | 未実施 |
| SEC-05 | Dependabot malware alerts | ON | SSOT | 未確認 | 未実施 |
| SEC-06 | `Dismiss package malware alerts` preset | OFF | SSOT | 未確認 | 未実施 |
| SEC-07 | `.github/dependabot.yml` | 存在しない | SSOT | なし | 再確認待ち |
| SEC-08 | Version Updates `Enable` | 行わない | SSOT | 未実施 | 再確認待ち |
| SEC-09 | Dependabot auto-merge / auto-approve | なし | SSOT | 未確認 | 未実施 |
| SEC-10 | Secret Protection | ON | SSOT | 未確認 | 未実施 |
| SEC-11 | Secret scanning alerts | 有効 | SSOT | 未確認 | 未実施 |
| SEC-12 | Push protection | ON | SSOT | 未確認 | 未実施 |
| SEC-13 | CodeQL existing configuration | 評価済み・競合解決済み | Verification | 未確認 | 未実施 |
| SEC-14 | CodeQL Default Setup | ON | SSOT | 未確認 | 未実施 |
| SEC-15 | CodeQL JavaScript / TypeScript | initial analysis success | SSOT | 未確認 | 未実施 |
| SEC-16 | CodeQL GitHub Actions | initial analysis success | SSOT | 未確認 | 未実施 |
| SEC-17 | Private Vulnerability Reporting | ON | SSOT | 未確認 | 未実施 |
| SEC-18 | PVR notification path | Repository Owner / Admin が受信可能 | SSOT | 未確認 | 未実施 |
| SEC-19 | Actions default workflow permission | Read repository contents | SSOT | 未確認 | 未実施 |
| SEC-20 | Actions create / approve PR | OFF | SSOT | 未確認 | 未実施 |
| SEC-21 | Repository `allow_auto_merge` | `false` | Verification | `false` | 再確認待ち |
| SEC-22 | Default low-impact development Dependabot preset | 現状確認・変更しない | Verification | 未確認 | 未実施 |
| SEC-23 | PVR Reporter-view entry point | 非Admin / Reporter視点で表示確認 | SSOT | 未確認 | 未実施 |
| RULE-01 | `main-protection` PR required | ON | SSOT | 未確認 | 未実施 |
| RULE-02 | Required status check | `validate` のみ | SSOT | 未確認 | 未実施 |
| RULE-03 | `verify` required | NO | SSOT | 未確認 | 未実施 |
| RULE-04 | Required check expected source | GitHub Actions | SSOT | 未確認 | 未実施 |
| RULE-05 | Review thread resolution | required | SSOT | 未確認 | 未実施 |
| RULE-06 | Linear history | required | SSOT | 未確認 | 未実施 |
| RULE-07 | Force push | blocked | SSOT | 未確認 | 未実施 |
| RULE-08 | Deletion | blocked | SSOT | 未確認 | 未実施 |
| RULE-09 | Merge method | squash only | SSOT | 未確認 | 未実施 |
| RULE-10 | Strict branch update | OFF | SSOT | 未確認 | 未実施 |
| RULE-11 | Bypass | なし | SSOT | 未確認 | 未実施 |
| RULE-12 | `validate` merge-gate runtime verification | 通常PRで merge block / release を実動作確認 | SSOT | 未確認 | 未実施 |

`SEC-04` は本Planの初期運用選択であり、SSOT の Security Policy を追加・変更するものではない。

`SEC-22` は既定 preset を新たなPolicyとして採用する項目ではない。GitHub既定状態を把握し、Finding Inventory の見落としを防ぐための確認項目である。

---

## 6. 実施主体

| 作業 | 主体 |
| --- | --- |
| `main` / Branch / CI contract 確認 | AI / 実装者 |
| Settings / Ruleset の read-only 確認 | AI / 実装者 / Repository Reader |
| Repository Settings の変更 | Repository Admin |
| Ruleset の変更 | Repository Admin |
| 初回 scan / alert / PR の確認 | AI / 実装者 + Repository Admin |
| Security finding の技術調査 | AI / 実装者 |
| Credential rotate / revoke | Credential Owner / Repository Admin |
| 実施結果の記録 | AI / 実装者 |

read-only で確認できる情報まで Admin 専用とは扱わない。
一方、Admin 権限が必要な変更を代替実装や推測で済ませない。

---

## 7. 実装手順

### Phase 1: Preflight

設定変更前に次を確認する。

1. Implementation Branch と最新 `main` の差分。
2. `SEC-07` / `SEC-08` が維持されている。
3. `SEC-01` が成立している。
4. open Dependabot PR を Security / Version Update / その他へ分類。
5. Dependency Review が次を維持している。
   - `vulnerability-check: true`
   - `fail-on-severity: moderate`
   - `fail-on-scopes: runtime, development, unknown`
6. Dependabot PR / fork PR で Cloudflare Preview が skipped。
7. `verify` / `validate` contract が維持されている。
8. `SEC-21` が `false`。
9. Dependabot 向け auto-approve / auto-merge Workflow がない。
10. `RULE-01` 〜 `RULE-11` を read-only で確認できる範囲まで確認する。

`RULE-02` がまだ `verify` の場合は SSOT P-14 に従う。

- `validate` が `main` で正常に成功している
- check-run の発行元が GitHub Actions
- 上記確認後に `validate` のみへ切り替える
- `verify` と `validate` の両方を Required にしない

Target と一致していれば Ruleset の Admin 操作は不要。
変更が必要で Admin 操作ができない場合のみ Blocked とする。

Repository file に drift がなければ変更しない。

### Phase 2: Settings Inventory

Target / Implementation Record 表の `Before` を更新する。

対象は `SEC-01` 〜 `SEC-23` と `RULE-01` 〜 `RULE-12`。
既に Target と一致する項目は再操作しない。

### Phase 3: Dependabot

1. `SEC-02` Dependabot alerts を ON。
2. 既存 Dependabot alerts を確認する。Openだけでなく dismissed alerts も確認対象に含める。
3. `SEC-22` の GitHub既定 low-impact development preset の現在値を記録し、今回変更しない。
4. `SEC-04` Grouped security updates を初期運用として OFF。
5. `SEC-03` Dependabot security updates を ON。
6. `SEC-05` Dependabot malware alerts を ON。
7. `SEC-06` が OFF であることを確認。
8. `SEC-07` / `SEC-08` を再確認。
9. `SEC-09` を維持。

Security Updates 有効化直後に Security PR が生成されても自動 merge しない。

Alert があっても次の場合は PR が作成されない可能性がある。

- patched version がない
- manifest / lockfile 制約で安全な Version に解決できない
- dependency conflict で生成できない

「Alert 数 = PR 数」は DoD にしない。

Malware Alert は Security Update PR の自動生成を前提としない。

### Phase 4: Secret Protection

1. `SEC-10` Secret Protection を ON。
2. `SEC-11` Secret scanning alerts の有効状態を確認。
3. 既存 Secret alerts を確認。
4. active / validity unknown の credential があれば revoke / rotate を最優先。
5. 必要なら正規 Secret 参照先と影響範囲を確認。
6. `SEC-12` Push protection を ON。
7. bypass を通常運用にしない。

実 credential を commit / push する破壊的テストは行わない。
Git history rewrite は rotate / revoke より優先しない。

### Phase 5: CodeQL Default Setup

最初に `SEC-13` として既存 Code scanning configuration を確認する。

確認対象:

- Default Setup
- Advanced Setup / CodeQL workflow
- SARIF upload / 外部 code scanning

分岐:

1. **競合なし / 未設定**
   - `SEC-14` Default Setup を ON
   - JavaScript / TypeScript と GitHub Actions (`actions`) が解析対象であることを確認
   - 初回 analysis を terminal state まで確認
2. **Default Setup が既に ON**
   - 再設定せず、`SEC-15` / `SEC-16` の analysis 状態を確認
3. **不要な旧 Advanced Setup / SARIF configuration があり、安全に Default Setup へ移行できる**
   - coverage が低下しないことを確認
   - 不要 configuration を整理して Default Setup へ移行
   - 移行根拠を記録
4. **必要な Advanced Setup / SARIF configuration がある、または安全な移行判断ができない**
   - 無条件に削除・切替しない
   - SSOT の Default Setup 要件との conflict、現状 coverage、必要な判断を記録
   - `Blocked - CodeQL configuration decision required`

analysis 判定:

- success: `SEC-15` / `SEC-16` を満たす
- failure: 原因調査し、成功扱いにしない
- 実装セッション内に完了しない: `Pending external verification`

今回の CodeQL は **detect / alert / triage** を目的とする。CodeQL check を `main-protection` の Required status check へ追加することは本PlanのScope外とし、merge-block policy を強化する場合は SSOT を更新する別タスクで判断する。

独自 `.github/workflows/codeql.yml` は追加しない。

### Phase 6: PVR / Actions

1. `SEC-17` PVR を ON。
2. Repository Admin 側で Security > Advisories の状態を確認。
3. `SEC-23` として、非Admin / 通常Reporter視点で `Report a vulnerability` 導線が表示され利用開始できることを確認する。
4. 確認のためだけにダミー脆弱性レポートを送信しない。ボタン / 導線の表示確認までとする。
5. `SECURITY.md` と実 UI の整合を確認。
6. Repository Owner / Admin の Repository Watch を確認。
   - `All Activity`
   - または `Custom` で `Security alerts`
7. Account notification settings で Watching 通知が有効であることを確認。
8. Email 等で受信する場合は通知先が有効であることを確認。
9. 実際の通知経路を `SEC-18` の Evidence に記録。
10. `SEC-19` / `SEC-20` を確認。

Admin / Security権限を持つアカウントの画面だけを Reporter-view 確認の代替にしない。

Dependabot auto-merge / auto-approve の確認では Workflow 内の次も確認する。

- `gh pr merge`
- `gh pr review --approve`
- Dependabot PR 向けの過剰な `pull-requests: write`

無関係な Workflow 権限は機械的に削除しない。

### Phase 7: End-to-End Verification

#### Ruleset / 通常PR

`RULE-02` を `validate` のみへ切り替えた後、通常の same-repo PR で `RULE-12` を確認する。

- `validate` が Required check として表示される
- `validate` が pending / failure の間は merge が block される
- `validate` success 後に、その Required check による block が解除される
- `verify` が Required check として二重登録されていない
- expected source が GitHub Actions のまま維持される

実動作確認が未完了なら `Pending external verification` とし、Configuration DoD を満たした扱いにしない。

#### Dependabot Security PR

Dependabot Security PR が生成された場合:

- author が `dependabot[bot]`
- Security Update であり通常 Version Update ではない
- 対応する alert / advisory が確認できる
- update 範囲が脆弱性修正に必要な範囲
- Dependency Review と既存 CI が実行
- Cloudflare Preview deploy が skipped
- `verify` / `validate` が想定どおり
- 自動 approve / merge されない

Security PR が生成済みの場合は、その PR を dependency 修正の原則経路とする。
本 Branch で同じ dependency を重複更新しない。

Security PR がない場合は次を確認し、PR がないこと自体は失敗扱いにしない。

- alert の有無
- patched version の有無
- dependency conflict 等の生成不能理由

CodeQL は初回 analysis success を確認する。
Push protection は Settings の enabled 状態で確認し、実 Secret を使ったテストは行わない。

---

## 8. Finding Triage

Security automation の設定完了と、検出 finding の修正完了を混同しない。

**この Branch の原則Scopeは Security Settings / verification / record であり、既存 Application code や dependency の修正ではない。**

### 8.1 Dependency vulnerability

Dependabot Alert は open だけでなく dismissed も確認し、既定 auto-triage preset によって自動 dismiss された finding を Inventory から落とさない。

Dependabot Security PR が生成済み:

- その Security PR を修正経路とする
- 本 Branch では dependency を更新しない
- advisory / diff / CI を確認して merge 判断する

Security PR が生成不能:

Critical / High:

- affected dependency
- actual exposure
- patched version / safe remediation
- 生成不能理由
- remediation 方針

を確認し、原則として **別 Security fix PR** を作るか follow-up を定義する。
本 Branch で dependency を直接更新しない。

Moderate / Low:

- ID / severity / 対象 / 概要を記録
- Backlog / follow-up 要否を判断
- 本 Branch では修正しない

### 8.2 CodeQL vulnerability

Critical / High:

- affected code
- actual exposure
- safe remediation
- 対応優先度
- 別 Security fix PR / follow-up

を記録し、未評価のまま完了にしない。

Moderate / Low:

- ID / severity / 対象 / 概要を記録
- Backlog / follow-up 要否を判断

**既存 CodeQL finding は本 Branch で Application code を変更して修正しない。**

例外は、本 Branch 自身の Repository file 変更が新しい finding を発生させた場合のみ。その場合は今回変更した範囲内で修正する。

### 8.3 Malware Alert

Malware Alert がある場合:

- 対象 package が実際に使用中か確認
- 使用中なら緊急度を評価し、安全な除去 / 代替の別 Security remediation を定義
- false positive / non-applicable は根拠を記録
- `Dismiss package malware alerts` preset で機械的に隠さない
- 未評価のまま完了にしない

継続利用が危険な active malware が確認された場合は `Blocked - Security remediation required` とする。

### 8.4 Secret Scanning Alert

Active / validity unknown:

1. credential を revoke / rotate
2. 正規 Secret 参照先を更新
3. 影響範囲を確認
4. alert の解消条件を確認

credential 無効化は本Planのスコープ制約より優先する。

Repository file の修正が必要な場合は、原則として別 Security remediation PR とし、本 Branch の設定変更と混在させない。

Revoked / expired / false positive:

- 根拠を確認してから resolve

Git history rewrite は revoke / rotate より優先しない。

---

## 9. Repository File Change Policy / Validation

原則として Repository file の実装差分は増やさない。

Current State と Target の drift がある場合だけ必要最小限に修正する。

変更候補:

- `.github/workflows/ci.yml`: Security PR / Dependency Review contract に drift がある場合のみ
- CI contract tests: Workflow contract を変更した場合のみ
- `SECURITY.md`: PVR の実 UI と不一致がある場合のみ
- 本 Plan: Before / After / Evidence / Finding / Status の記録

追加しない:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- Renovate
- 独自 vulnerability scanner / dependency bot
- Dependabot auto-merge / auto-approve workflow
- Custom Auto-triage Rule
- 独自 Security Dashboard

Application code / package dependency は本 Branch で変更しない。
例外は、本 Branch 自身の変更が新しい finding を発生させ、その変更範囲内で修正する場合のみ。

Validation:

Plan / docs のみ変更:

- `pnpm run lint:markdown`
- `git diff --check`

`.github/workflows/**` を変更:

- 上記
- CI contract tests
- workflow 変更に対応する targeted tests
- 必要に応じて `pnpm run format:check`

`pnpm run verify` は影響範囲が広い変更を行った場合、または既存 Repository 方針上必要な場合だけ実行する。

---

## 10. Definition of Done

### 10.1 Configuration DoD

Target / Implementation Record の次を確認済みにする。

- SSOT required: `SEC-01` 〜 `SEC-03`, `SEC-05` 〜 `SEC-12`, `SEC-14` 〜 `SEC-20`, `SEC-23`
- Verification: `SEC-13`, `SEC-21`, `SEC-22`
- Ruleset: `RULE-01` 〜 `RULE-12`
- Initial operational choice: `SEC-04` は OFF で記録

さらに:

- Dependency Review の `moderate` gate が維持されている
- Dependabot PR で Cloudflare Preview Secret を利用しない
- `SECURITY.md` と PVR 実 UI が一致
- 必要な After / Evidence が記録済み

次の場合は Configuration DoD 未達:

- CodeQL initial analysis が Pending / failure
- Required Setting を確認・変更できない
- CodeQL configuration conflict が未解決
- Ruleset の Target drift が残る
- `validate` の通常PR merge-gate runtime verification が未完了
- Reporter視点の PVR 導線確認が未完了

### 10.2 Finding Triage DoD

有効化時点の findings を種類別に確認する。

- Dependabot vulnerability alerts（open / dismissed）
- Dependabot malware alerts
- Secret scanning alerts
- CodeQL alerts

完了条件:

- Dependency Critical / High: Security PR、または生成不能理由・Exposure・remediation 経路を記録済み
- Dependency Moderate / Low: dismissed を含め triage 済み
- CodeQL Critical / High: Exposure・remediation 経路・follow-up を記録済み
- CodeQL Moderate / Low: triage 済み
- Malware: 使用状況と対応方針を評価済み
- Secret: Active / validity unknown は revoke / rotate 優先で処理、その他は根拠付きで triage 済み

「finding が残っている」ことと「Security automation 設定失敗」を混同しない。

### 10.3 Final Status

最終 Status は次のいずれか。

- `Completed`: **本 Security Automation Plan** の Configuration DoD と Finding Triage DoD を満たす
- `Pending external verification`: CodeQL / Ruleset runtime verification 等の外部処理・実動作確認が完了していない
- `Blocked - Repository Admin action required`: Required Setting を Admin 権限不足で変更できない
- `Blocked - CodeQL configuration decision required`: 既存 CodeQL configuration と Default Setup の安全な移行判断が未解決
- `Blocked - Security remediation required`: Active Secret / Malware 等、先に対応すべき finding がある

`Completed` は本Planの完了だけを意味し、SSOT の `Repository Hardening Complete` を自動的に意味しない。Cloudflare trust boundary、write-capable principal の trust classification、Token scope / blast radius など、SSOT P-05 を含む他Hardening項目はSSOT側のDoDで別途判定する。

`Pending` / `Blocked` を `Completed` として記録しない。

---

## 11. Finding / Final Record

Settings / Ruleset の実績は Section 5 の Target / Implementation Record に直接記録する。

Finding は次の表へ記録する。

| Type | ID / Severity | Target | Exposure / Status | Remediation / Follow-up |
| --- | --- | --- | --- | --- |
| Dependency | 未確認 | 未確認 | 未実施 | 未実施 |
| Malware | 未確認 | 未確認 | 未実施 | 未実施 |
| Secret | 未確認 | 未確認 | 未実施 | 未実施 |
| CodeQL | 初回scan待ち | 未確認 | 未実施 | 未実施 |

Final:

- Final Plan Status: `Implementation-ready`
- Repository Hardening overall status: SSOT の DoD で別途判定
- Blocked / Pending reason: なし
- Required follow-up: 未確認

---

## 12. リスク / 注意点

- Settings は Branch に隔離できず、変更時点で Repository 全体へ反映される。
- Security Updates 有効化直後に既存脆弱性の PR が作成される可能性がある。
- Dependabot Security PR と本 Branch で同じ dependency を重複更新しない。
- Alert があっても patched version 不在等で PR が作成されない場合がある。
- Grouped security updates OFF は初期運用選択であり SSOT の追加Policyではない。
- GitHub既定 auto-triage preset の存在により、Open alerts だけでは Finding Inventory が不完全になる可能性がある。
- Malware Alert は Security Update PR が自動生成される前提で扱わない。
- `Dismiss package malware alerts` preset は OFF を維持する。
- CodeQL Default Setup は既存 Advanced Setup / SARIF upload を評価してから有効化する。
- CodeQL は今回 detect / alert / triage 用であり、Required merge gate の追加はScope外。
- 既存 CodeQL finding の修正を本 Branch へ混在させない。
- active secret は revoke / rotate を最優先する。
- Ruleset は read-only 確認と Admin による変更を分離する。
- `validate` が `main` で正常に機能することを確認してから Required check を変更する。
- Ruleset変更後は通常PRで `validate` のmerge blockを実動作確認する。
- `verify` と `validate` の両方を Required にしない。
- PVRはAdmin画面だけでなくReporter視点の導線も確認する。
- GitHub UI の名称変更時は名前だけで判断せず同等機能か確認する。
- Admin 権限不足や CodeQL conflict を workaround で隠さず Blocked とする。
- 本PlanのCompletedとRepository Hardening全体のCompleteを混同しない。

---

## 13. 実装優先順位

1. 最新 `main` / CI contract / auto-merge guard / open Dependabot PR を確認
2. Target / Implementation Record の Before inventory
3. `main-protection` を read-only 確認し、drift がある場合だけ Admin が修正
4. Dependabot alerts / dismissed alerts /既定auto-triage presetを確認し、security updates / malware alerts を有効化、Grouped security updates を初期 OFF
5. Secret Protection / Push protection / Secret finding triage
6. CodeQL existing configuration を評価し、競合がなければ Default Setup → initial analysis
7. PVR Reporter-view / notification / Actions permission を確認
8. Ruleset変更後の通常PR merge-gate runtime verification
9. 初回 Alert / Security PR / CodeQL scan を検証
10. Finding Triage
11. Section 5 / Section 11 / Final Status を更新

最優先は、不要な通常 Version Update を発生させず、既知脆弱性を検出し、修正可能な場合だけ Security PR を生成する状態を成立させることである。