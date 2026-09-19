# Issue #163 Renovate / OpenCode Security修正自動化 Plan

## 0. 依頼概要

- 対象Issue: #163 `feat: RenovateでDependabot Alertを自動修正しOpenCode fallbackを整備する`
- 対象branch: `issue-163-renovate-opencode-security-fallback`
- base: `main@8772d191ff3fbe4d17bf91082aafbd92fffc0c4c`
- 依頼内容: Dependabot Alertsを脆弱性検知の正本として維持し、RenovateをSecurity修正の第一経路、OpenCodeを人間が起動する限定fallbackとして追加する。
- 今回の作業範囲: Planの修正と保存のみ。実装、外部App導入、GitHub Settings変更、Secret変更は行わない。
- 期待成果: Issue #163の目的から外れず、実装時に追加判断が必要な箇所を明示し、安全性に必要な境界だけを残した実装Planにする。

## 1. ゴール / 完了条件

### ゴール

依存関係のSecurity修正を次の2段階で扱う。

1. Dependabot Alertsを脆弱性検知の正本として維持し、RenovateがSecurity修正PRを作成する。
2. Renovateが対象Alertを正常に認識・処理したが安全な修正PRを作成できなかった場合だけ、人間がfallback条件を確認し、`workflow_dispatch`でOpenCodeを1回実行する。

OpenCodeは脆弱性scanner、Git操作主体、独自のdependency updaterとして使わない。OpenCodeが作成するのは、workflowが許可した範囲内の1つの修正候補だけとし、採用可否はworkflow側の機械検証で決める。

### 完了条件（DoD）

- Dependabot Alertsは有効のまま維持する。
- Dependabot Version Updatesは無効のまま維持する。
- Dependabot Security UpdatesはRepository側変更がmergeされるまで維持し、Renovateを有効化する直前に無効化する。Renovate有効化に失敗した場合は直ちに再度有効化する。
- `renovate.json`はSecurity修正だけを有効化し、通常のdependency update、OSV vulnerability alerts、Dependency Dashboard、auto-mergeを無効化する。
- Renovateの対象managerは`npm`に限定し、Repositoryのpackage managerは`pnpm@9.10.0`のまま維持する。
- `vulnerabilityAlerts.prConcurrentLimit`はOwnerが現在のopen Dependabot Alert件数を確認し、具体的な正の有限整数を決めてPlanへ追記してから`renovate.json`へ実装する。この未確定値がblockするのは`renovate.json`と対応contract testだけとし、他のRepository変更は先行できる。
- Renovate Security PRへ公開する情報は、dependency名、変更前後version、`Security Update`、CI確認に必要な最小情報だけにする。Alert番号、severity、actual exposure、private triage、Advisory本文は公開しない。
- Renovateのbranch prefixを`renovate/`へ固定する。
- OpenCode publish branchを`security/<dependency>/<run_id>`形式へ固定し、Alert番号を含めない。
- Cloudflare Preview除外はIssue #163の対象へ限定する。同一Repository PRのうち、既存Dependabot、`user.type == Bot`かつ`renovate/` branch、`user.type == Bot`かつ`security/` branchをPreview対象外にする。Expo Dependency Maintenanceの既存`github-actions[bot]` PRは従来のPreview契約を維持する。
- Humanの同一Repository PRは従来どおりCloudflare Preview必須とし、fork PRも従来どおりPreviewをskipする。
- OpenCode fallbackは`workflow_dispatch`だけで起動し、`alert_number`を必須の`number` inputとして1件受け取る。`schedule`は追加しない。
- `alert_number`はpublic出力へ転記しない運用識別子として扱う。GitHub Secret相当の機密値とは扱わないため、Issue #163の`workflow_dispatch`契約を維持する。
- main以外のref、`github.run_attempt != 1`、同一修正のopen PR、同じdependency用の残存`security/` branchがある場合は自動修正を開始しない。
- fallback全体は固定`concurrency.group: security-dependency-fallback`で直列化し、`cancel-in-progress: false`とする。Alert番号はgroup名へ含めない。
- GitHub Actionsは`preflight`、`read-alert`、`repair-and-validate`、`publish`へ分離する。
- `repair-and-validate` jobは`id-token: write`と`vulnerability-alerts: read`を持たず、raw Dependabot Alertを受け取らない。
- `publish` jobだけが`id-token: write`を持ち、OpenCode GitHub App installation tokenを取得する。
- OpenCodeへ渡すSecurity情報は、公開Repositoryと公開Security Advisoryから再構成できる構造化情報だけにする。Alert番号、Alert state、actual exposure、private triage、raw Alert JSONを渡さない。
- Public Global Security Advisoryの`vulnerabilities[]`は`ecosystem == npm`かつ`package.name == Alert dependency名`で一意に一致するentryだけを使用する。0件または複数件なら`needs_human`で停止する。
- OpenCodeは固定Releaseの公式binaryをRepository側へ固定したSHA-256で検証してから実行する。stock `anomalyco/opencode/github` Actionと`opencode github run`は使わない。
- OpenCode ZenはGitHub Secret `OPENCODE_API_KEY`を使い、実行時のmodel一覧からID末尾が`-free`のmodelだけを決定的に選ぶ。有料modelや匿名利用へfallbackしない。
- `OPENCODE_API_KEY`はOpenCode processだけへ渡し、検証jobの他processとpublish jobへ渡さない。
- OpenCode processは環境変数allowlistで起動し、`GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数、Cloudflare credentialを継承しない。
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`、`OPENCODE_DISABLE_SHARE=1`を設定する。
- OpenCode permissionはdeny-by-defaultとし、`bash`、`grep`、`webfetch`、`websearch`、`external_directory`、`task`、`skill`、`question`、`lsp`をdenyする。
- OpenCodeが編集できるのは`package.json`だけとする。`pnpm-lock.yaml`はOpenCodeへ編集させず、workflowが固定`pnpm@9.10.0`で生成する。
- OpenCodeへRepository文書を読むよう要求することは補助情報とし、Security保証やDoDには使わない。重要な制約はworkflow、permission、validatorで機械的に固定する。
- OpenCodeはworkflowから渡された許可範囲の中から、1回だけ修正候補を作る。validator failureをpromptへ返して自動再修正しない。
- direct dependency、限定したroot parent update、互換性を確認済みのparent-scoped overrideだけを初期fallback対象にする。安全に限定できない場合は`needs_human`へ停止する。
- vulnerable range判定は`semver@7.8.5`へ委譲する。npm vulnerable rangeの`,`区切りは空白へ置換する以外の独自変換を行わず、`semver.validRange()`で解釈不能なら停止する。
- `pnpm list --json --depth Infinity`は「現在のrunnerへinstallされたdependency graph」の確認に使う。「lockfile内の全platformを含む完全なdependency graph」とは扱わない。Alert対象が現在runnerのinstall graphに存在しない場合は`needs_human`へ停止する。
- OpenCode変更後はsemantic diff guard、lockfile生成、`pnpm install --frozen-lockfile --ignore-scripts`、installed dependency graph確認、`pnpm run verify`、`git diff --check`を行う。
- lockfile内部fieldを独自に全面deep-equalするvalidatorは作らない。package.jsonの許可差分、pnpmが生成したlockfileの再現性、installed graph、既存Dependency ReviewとRepository標準検証を組み合わせる。
- publish直前に対象Dependabot Alertを再取得し、まだ`open`で、開始時と同じGHSA ID / dependencyを指すことを確認する。`fixed`、`dismissed`、`auto_dismissed`、別Alertへ変化した場合はPRを作成しない。
- publish直前に開始時の`BASE_SHA`と最新`origin/main`を比較し、異なる場合は自動rebaseせず`needs_human`へ停止する。
- publish stepだけでOpenCode GitHub App installation tokenを取得し、workflow側が固定形式でbranch、commit、push、PR作成を行う。model出力をGit metadataへ使用しない。
- Re-run jobsによる再修正を禁止する。push後にPR作成だけ失敗した場合はbranchを残して`needs_human`とし、新しいOpenCode実行を自動開始しない。
- fallbackのpublic結果は成功時のPR URLまたは`needs_human`だけとし、private failure reason、Alert番号、prompt、model logをSummaryへ出さない。
- `SECURITY.md`には公開可能情報の境界だけを追加する。fallbackの処理順序、Cloudflare Preview分類、activation手順などのworkflow詳細は他の正本へ置く。
- 自動Security fallback runtimeでtracked Run Artifactを作ると、Security修正PRへ`.codex/runs/**`という無関係な変更を混ぜるか、別のwrite経路が必要になる。これは「最小のSecurity修正PR」と両立しないため、Issue #163の条件に基づく狭い例外として`docs/reference/run-artifacts.md`へ明記する。通常のIssue実装・レビューtaskは従来どおりRun Artifactを残す。
- Renovate / OpenCode GitHub App導入、要求権限、Repository scope、Production trust判断はRepository変更と分離し、Ownerの明示承認後にだけ有効化する。
- 関連contract test、validator test、`pnpm run verify`、`git diff --check`、PR CIがPASSする。

## 2. 現状理解と前提

### 現状理解

- rootの`package.json`は`packageManager: pnpm@9.10.0`を使用している。
- root以外の`package.json` / `pnpm-lock.yaml`はなく、今回のnpm manager対象はrootだけである。
- `package.json`には既存の`pnpm.overrides`があり、PR #58では複数のparent-scoped overrideを用いたtransitive dependency修正実績がある。
- `scripts/security-static-check.ts`はRepository固有の静的検査であり、依存脆弱性scannerではない。
- 現在の`.github/workflows/ci.yml`はsame-repo PRをCloudflare Preview対象とし、`dependabot[bot]`だけを特別扱いしている。
- Expo Dependency Maintenanceは`github-actions[bot]`としてsame-repo PRを作成し、現行ではCloudflare Previewを実行している。
- Issue #163の対象はRenovate / OpenCode Security PRのPreview除外であり、Expo Dependency MaintenanceのPreview契約変更までは要求していない。
- `main-protection` RulesetはRequired checkとして`validate`を要求する一方、`required_approving_review_count`は0である。
- `deploy-production`は`main` push後にCloudflare Production credentialを使うため、Bot PRのPreview除外だけではwrite-capable AppとのProduction trust boundaryは成立しない。
- OpenCode公式Release `v1.18.31`とLinux x64 assetの固定SHA-256は既存Planで確認済みである。
- OpenCode `v1.18.31`では`OPENCODE_PURE`とdefault plugin無効化は別設定である。初期実装では追加flagをSecurity保証へ増やさず、固定binary、project config無効化、external plugin無効化、permission、activation fixtureを主要境界とする。追加flagが必要と判明した場合だけPlanを更新する。
- pnpm `v9.10.0`のpackage selector付き`pnpm why` / `pnpm list <package>`は結果をtruncateし得る。package selectorなしの`pnpm list --json --depth Infinity`は対象packageの全path確認に使えるが、現在runnerへinstallされたpackageが対象である。
- GitHub Dependabot Alertのnpm `vulnerable_version_range`は`,`区切りを含み得るため、`semver`へ渡す前に限定的な正規化が必要である。
- 現在のGitHub connectorではopen Dependabot Alert件数を取得できないため、`prConcurrentLimit`具体値は未確認である。
- PR #167の現head `c11e3fb8470ccf60edd3ad6f0992b856f79a4ce8`では、Plan末尾のbare URLによりWeb CIのMarkdown Lintが失敗している。

### 前提

- OpenCode fallbackはRenovateの代替ではなく、Renovateが正常処理したがPRを作れない実Alertの補完である。
- 人間がfallback起動前にRenovate job log等を確認し、認証・権限・設定・service障害ではないことを確認する。
- 初期版は安全に処理できる範囲を狭くし、処理できないケースを`needs_human`へ止める。fallback対応率を上げるための探索やretryは別タスクとする。
- GitHub AppをProductionまでtrustedとできない場合、このIssueでRulesetを暗黙変更せずactivationを停止する。
- OpenCodeのFree model一覧は変化し得るため、利用modelを固定しない。

### 対象外

- 通常のdependency update。
- auto-merge。
- OpenCode fallbackのschedule実行。
- 脆弱性scannerの追加。
- Malware Alert、Secret scanning Alert、CodeQL findingの自動修正。
- Dependabot Alertの自動dismiss。
- patched versionがないdependencyへの根拠のないversion固定。
- major versionをまたぐdirect / root parent updateの自動修正。
- 既存specifierで安全に限定できないroot parent update。
- global override。
- lockfile内だけに存在し、現在runnerのinstalled graphで検証できないdependencyの自動修正。
- 全versionを列挙してcandidateごとにinstallする探索。
- 独自lockfile resolver。
- lockfile内部fieldの全面deep comparison。
- 自動retry、queue、branch recovery。
- 全same-repo Botを一律Cloudflare Preview対象外にするpolicy変更。

## 3. 質問 / 曖昧性

### 実装前blocker

1. **`vulnerabilityAlerts.prConcurrentLimit`**
   - Owner権限で現在のopen Dependabot Alert件数を確認する。
   - 件数とRepository運用を根拠に具体的な正の有限整数を決め、このPlanへ記録する。
   - 未確定の間は`renovate.json`と`tests/contracts/renovate-config.test.ts`だけ実装しない。
   - CI分類、OpenCode fallback、文書、validator等の他変更は先行できる。

### activation前blocker

- Mend Renovate App / OpenCode Appの実際の要求権限とRepository scope。
- 各Appを現在のRuleset下でProductionまでtrustedとするかのOwner判断。
- 実`OPENCODE_API_KEY`と`-free` modelの非対話実行。
- OpenCode GitHub App + OIDC token exchangeの疎通。

上記activation前blockerはRepository変更PRの作成・mergeを止めないが、外部App activationを止める。

## 4. 影響範囲

### 変更予定ファイル

- `renovate.json`
  - Security-only Renovate設定。
  - `branchPrefix: "renovate/"`。
  - 公開PR metadata制限。
  - `prConcurrentLimit`はOwner確定値。
- `.github/workflows/security-dependency-fallback.yml`
  - 4 job構成の手動fallback。
- `.github/opencode/security-fallback.json`
  - OpenCode `v1.18.31`用deny-by-default permission。
- `.github/workflows/ci.yml`
  - Dependabot、Renovate branch、OpenCode Security branchだけをPreview対象外にする。
- `SECURITY.md`
  - 未修正脆弱性とSecurity修正PRの公開情報境界。
- `docs/reference/run-artifacts.md`
  - 自動Security fallback runtimeだけの狭いRun Artifact例外。
- `scripts/validate-security-dependency-fix.mjs`
  - sanitized context検証、package.json semantic diff、installed graph検証。
- `package.json` / `pnpm-lock.yaml`
  - validator用`semver@7.8.5`をexact devDependencyとして追加。
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/renovate-config.test.ts`
- `tests/contracts/security-dependency-fallback-workflow.test.ts`
- `tests/contracts/security-dependency-fix-validator.test.ts`

### 確認対象だが原則変更しないファイル

- `.github/workflows/expo-dependency-maintenance.yml`
- `scripts/security-static-check.ts`
- `AGENTS.md`
- `.agents/skills/repair-loop/SKILL.md`
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`

## 5. 変更方針

### 方針1: RenovateをSecurity-onlyへ限定する

`renovate.json`はRenovate公式Security presetを基準に、Issue #163で禁止する機能を明示的に無効化する。

- `extends: ["security:only-security-updates"]`
- `enabledManagers: ["npm"]`
- `osvVulnerabilityAlerts: false`
- `dependencyDashboard: false`
- global `automerge: false`
- `semanticCommits: "disabled"`
- 通常updateを無効化
- `vulnerabilityAlerts.enabled: true`
- `vulnerabilityAlerts.automerge: false`
- `vulnerabilityAlerts.vulnerabilityFixStrategy: "lowest"`
- `vulnerabilityAlerts.prConcurrentLimit: <OWNER_CONFIRMED_VALUE>`
- `branchPrefix: "renovate/"`

PR title / body / branch / commit messageはdependency名、version差分、`Security Update`、CI確認に必要な情報へ限定する。severity、Alert番号、Advisory本文、actual exposure等をtemplateへ含めない。

### 方針2: Cloudflare Preview除外をIssue #163の対象へ限定する

`.github/workflows/ci.yml`のPreview分類は次を契約とする。

- same-repo Human PR: Preview required。
- fork PR: Preview skipped。
- Dependabot PR: Preview skipped。
- same-repo Botかつhead branchが`renovate/`で始まるPR: Preview skipped。
- same-repo Botかつhead branchが`security/`で始まるPR: Preview skipped。
- Expo Dependency Maintenance等、上記に該当しないsame-repo Bot PR: 現行どおりPreview required。
- push / schedule / workflow_dispatch: Preview skipped。

`validate`も同じ分類を使い、Preview不要PRでは`deploy-preview == skipped`を正常として扱う。Bot loginの推測値を追加しない。

### 方針3: fallbackを4 jobへ分離する

#### `preflight`

- Secretを参照しない。
- `github.ref == refs/heads/main`を要求する。
- `github.run_attempt == 1`を要求し、Re-run jobsを自動修正経路にしない。
- `concurrency.group`は固定`security-dependency-fallback`。
- `timeout-minutes: 2`。
- failure時は後続jobを開始しない。

#### `read-alert`

- `vulnerability-alerts: read`と`pull-requests: read`だけを必要範囲で付与する。
- Repository checkout、dependency install、OpenCode、Repository scriptを実行しない。
- Dependabot Alertを取得し、`open`、`npm`、対象manifest、dependency名、GHSA ID、vulnerable rangeを確認する。
- raw responseはrunner tempへ一時保存し、sanitized context生成後に削除する。
- Public Global Security Advisoryから`ecosystem == npm`かつ`package.name == dependency名`の`vulnerabilities[]` entryを1件だけ選ぶ。
- public structured fieldだけから`sanitized-security-context.json`を生成する。
- 同じdependencyまたは関連root dependencyを修正するopen PRが明確に存在する場合は停止する。patchを取得できず判定不能な場合もfail-closedとする。
- `timeout-minutes: 5`。
- 後続jobへ渡すのはpublicに再構成できるsanitized contextだけとし、Alert番号、state、raw JSONを渡さない。

#### `repair-and-validate`

- `id-token: write`と`vulnerability-alerts: read`を付けない。
- checkoutは`persist-credentials: false`、開始時SHAを`BASE_SHA`として保持する。
- Node 24、pnpm 9.10.0を使う。
- 初期installは`pnpm install --frozen-lockfile --ignore-scripts`。
- `pnpm list --json --depth Infinity`から、現在runnerへinstallされた対象dependencyのpathを抽出する。対象が0件なら`needs_human`。
- root dependency、immediate parent、resolved versionをpublic `dependency_context`へ生成する。
- OpenCodeへ渡す前にworkflow側で「許可可能な修正方式」だけを構造化する。修正方法を1つに決め切らない。

OpenCodeへ許可できる初期方式は次の3種類とする。

1. **direct dependency update**
   - targetがroot direct dependency。
   - `first_patched_version`がstable exact SemVer。
   - current resolved versionと同一major。
   - package.jsonの既存specifierがexact、`^`、`~`。
   - OpenCodeは既存operator形式を維持して`first_patched_version`へ変更できる。

2. **root parent dependency update**
   - targetがtransitive dependency。
   - vulnerable pathが1つのroot direct dependency配下へ限定できる。
   - root dependencyの既存specifierがexact、`^`、`~`。
   - workflowは`pnpm view`からstable versionを取得し、currentより大きい同一majorだけを候補にする。
   - `^` / `~`では既存rangeを満たすversionだけ、exactでは同一majorのversionだけを候補にする。
   - candidateは昇順の先頭10件までをOpenCodeへ渡す。
   - workflowはcandidateごとのinstallを事前実行しない。OpenCodeは候補から1件だけ選び、後段validatorで実際にAlert解消を確認する。
   - 候補0件、10件以内で判断不能、major updateが必要な場合は`needs_human`。

3. **parent-scoped override**
   - direct / root parent updateを安全に選べない場合だけ候補にする。
   - targetの`first_patched_version`がstable exact SemVer。
   - 各affected immediate parentについて、`pnpm view <parent>@<version> dependencies --json`からtargetへの宣言rangeを取得する。
   - `first_patched_version`が全affected parentの宣言rangeを満たす場合だけparent-scoped overrideを許可する。
   - global override、別target dependency、別Alertだけが根拠のselectorは許可しない。

OpenCodeは上記allowed strategyと候補値だけを受け取り、1回だけ`package.json`を編集する。OpenCodeが任意versionを発明すること、候補外versionを選ぶこと、複数方式を混在させることをvalidatorで拒否する。

OpenCode実行時は次を固定する。

- Release: `v1.18.31`
- asset: `opencode-linux-x64.tar.gz`
- SHA-256: `e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`
- `RUNNER_ARCH == X64`以外は`needs_human`
- model ID末尾`-free`だけを辞書順で選び、`opencode/<selected_model_id>`として指定
- OpenCode実行は最大10分。timeout時は`needs_human`
- `bash`、`grep`、外部web、skill、task、question、lspをdeny
- readはRepository内の必要fileだけ、editは`package.json`だけ
- stdout/stderrはrunner tempへredirectし、SummaryやArtifactへ転記しない

OpenCode終了後は次を検証する。

1. 変更ファイルが`package.json`だけである。
2. semantic diffがallowed strategy 1件だけと一致する。
3. `scripts`、`packageManager`、metadata、`pnpm.packageExtensions`、無関係なdependency / overrideが不変。
4. workflowが`pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`でlockfileを生成する。
5. 続けて`pnpm install --frozen-lockfile --ignore-scripts`を行い、node_modulesを更新後のlockfileと一致させる。
6. package selectorなしの`pnpm list --json --depth Infinity`を再実行する。
7. target dependencyのinstalled resolved versionがすべてvulnerable range外である。
8. 選択したroot dependency配下以外に予期しないresolved version / dependency edge変更がない。parent-scoped overrideでは許可したparent→target edge以外の変更を拒否する。
9. 同じ`pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`をもう1回実行して追加diffがない。
10. `pnpm run verify`と`git diff --check`が成功する。

lockfile YAMLの全fieldを独自deep-equalする処理は追加しない。`pnpm`の再現性、installed graph、package.json semantic guard、Dependency Review、Repository標準CIを組み合わせる。

検証成功後、公開予定の`package.json` / `pnpm-lock.yaml`とbase SHA、dependency名、GHSA ID、検証済みであることだけをjob artifactへ保存する。artifactへAlert番号、raw Alert、prompt、model response、private failure reasonを含めない。artifactはSecurity PRで公開予定の内容だけなのでjob間受け渡しに利用できる。

`repair-and-validate` job全体は`timeout-minutes: 45`とする。

#### `publish`

- `contents: read`、`pull-requests: read`、`vulnerability-alerts: read`、`id-token: write`だけを必要範囲で付与する。
- dependency install、OpenCode、Repository script、`pnpm run verify`を実行しない。
- exact base SHAをcheckoutし、repair artifactから検証済み`package.json` / `pnpm-lock.yaml`を配置する。
- `git diff --check`等の固定Git操作だけを実行する。
- Dependabot Alertを再取得し、`open`かつ開始時と同じGHSA ID / dependencyであることを確認する。
- `origin/main`が`BASE_SHA`から進んでいないことを確認する。
- 同じ修正のopen PRと、同じdependency用の残存`security/` branchがないことを再確認する。
- 上記確認後だけOIDC tokenを取得し、固定Releaseで確認したOpenCode GitHub App token exchange経路からinstallation tokenを取得する。
- branch、commit message、PR title/bodyはworkflow固定値から生成し、model responseを使わない。
- branch名、commit message、PR title/bodyにAlert番号を含めない。
- push後にPR作成だけ失敗した場合はremote branchを残し、`needs_human`で停止する。自動retryやOpenCode再実行を行わない。
- `timeout-minutes: 10`。

### 方針4: vulnerable rangeとAdvisoryの扱いを固定する

- npm vulnerable rangeは`,`を空白へ置換した後、`semver.validRange()`で検証する。
- `semver.validRange()`が失敗する入力は独自に補正せず`needs_human`。
- `first_patched_version`がない場合はdirect update / overrideの根拠にしない。
- Advisoryのsummary / description等の自由文はOpenCode promptへ渡さない。
- GHSA ID、package名、ecosystem、vulnerable range、first patched version等のstructured fieldだけを使う。

### 方針5: Run Artifact例外を狭くする

通常のIssue #163実装・レビューtaskは既存Run Artifact契約に従う。

自動`security-dependency-fallback.yml` runtimeは、tracked Run Artifactを作ると次のいずれかが必要になる。

- Security修正PRへ`.codex/runs/**`を追加して、package / lockfileだけの最小修正契約を破る。
- Security PRとは別のwrite経路でRepositoryへ記録する。

どちらも初期fallbackの目的に不要である。このため自動runtimeだけはIssue #163の条件に基づく狭い例外としてtracked Run Artifactを作らない。raw Alert、prompt、model logはrunner tempだけで扱い、public結果はPR URLまたは`needs_human`だけとする。

この例外はCodexによる通常task、Issue実装、レビュー、手動調査には適用しない。

### 方針6: `SECURITY.md`は公開情報境界へ限定する

`SECURITY.md`へ追加するのは次だけとする。

- 未修正Alert番号、raw payload、actual exposure、攻撃経路、private triageをPublic Issue / PRへ投稿しない。
- Security修正PRではdependency名、変更前後version、Security Updateであること、CI / 検証結果の最小情報だけ公開できる。
- Alertを自動dismissしない。

fallback trigger、job構成、Cloudflare Preview分類、activation手順、Run Artifact例外の詳細は各正本へ置き、`SECURITY.md`へ重複定義しない。

### 方針7: 外部App activationをRepository変更と分離する

Repository変更をmergeした後に、Owner承認のもとで段階的に有効化する。

#### Renovate

1. `prConcurrentLimit`具体値をPlan / config / contract testへ反映する。
2. Mend Renovate Appの要求権限、Repository scope、rollback planをOwnerが確認する。
3. P-05に従いProductionまでtrustedとするか判断する。
4. trustedでなければactivationを止める。
5. Dependabot Security UpdatesをOFFにする。
6. Renovate Appを`qa-training-store`だけへ有効化する。
7. 設定受理とSecurity Alert読取を確認する。
8. 問題があればRenovateを停止し、Dependabot Security UpdatesをONへ戻す。

#### OpenCode

1. OpenCode Appの要求権限、Repository scope、rollback planをOwnerが確認する。
2. Production trust判断を確定する。
3. fixed Release / digest / permission契約を再確認する。
4. OIDC exchangeをbranch / PR作成なしで確認する。
5. `OPENCODE_API_KEY` + Free modelを使ったfixture実行でpermissionを確認する。
6. Renovateが正常処理したが修正できない実Alertが存在する場合だけfallbackを実行する。
7. 検証目的の脆弱dependencyは追加しない。

### 実行タスク

- [ ] 1. 実装開始時の`main`、Issue #163、PR #167、CI、Ruleset、Security設定を再確認する。
- [ ] 2. `semver@7.8.5`のversion、License、既知脆弱性を再確認し、validator用exact devDependencyとして追加する。
- [ ] 3. `.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`を更新し、Dependabot / `renovate/` Bot / `security/` BotだけPreview skipにする。
- [ ] 4. Owner権限でopen Dependabot Alert件数を取得し、`prConcurrentLimit`の具体値と根拠をPlanへ追記する。
- [ ] 5. 4完了後に`renovate.json`と`tests/contracts/renovate-config.test.ts`を追加する。
- [ ] 6. `scripts/validate-security-dependency-fix.mjs`とvalidator contract testを追加する。
- [ ] 7. `.github/opencode/security-fallback.json`を追加し、bash全面deny、editは`package.json`だけにする。
- [ ] 8. `.github/workflows/security-dependency-fallback.yml`を4 job構成で追加する。
- [ ] 9. read-alertでraw Alertを隔離し、sanitized public contextだけをrepair jobへ渡す。
- [ ] 10. repair jobでbounded candidate list、OpenCode one-shot edit、semantic guard、lockfile生成、installed graph、`pnpm run verify`を実装する。
- [ ] 11. publish jobでAlert再確認、base SHA再確認、duplicate / orphan branch確認、OIDC publishを実装する。
- [ ] 12. `SECURITY.md`を公開情報境界だけ修正する。
- [ ] 13. `docs/reference/run-artifacts.md`へ自動fallback runtimeだけの狭い例外と理由を追加する。
- [ ] 14. contract test、Repository標準検証、CIを通す。
- [ ] 15. Repository変更merge後にOwner承認を得てRenovate / OpenCodeを段階的にactivationする。

## 6. 検証方法

### CI分類

`tests/contracts/ci-workflow.test.ts`で少なくとも次を固定する。

- same-repo Human PR: Preview required。
- fork PR: Preview skipped。
- Dependabot: Preview skipped。
- `user.type == Bot` + `renovate/` branch: Preview skipped。
- `user.type == Bot` + `security/` branch: Preview skipped。
- Expo Dependency Maintenance相当の`github-actions[bot]` PR: Preview required。
- `validate`が同じ分類を使う。
- Cloudflare credential参照jobが増えていない。

### Renovate config

`tests/contracts/renovate-config.test.ts`で少なくとも次を確認する。

- Security-only preset。
- npm managerだけ。
- OSV無効。
- Dependency Dashboard無効。
- normal update無効。
- auto-merge無効。
- `vulnerabilityFixStrategy == "lowest"`。
- `branchPrefix == "renovate/"`。
- `prConcurrentLimit`がPlanのOwner確定値と一致する。
- 公開templateへAlert番号、severity、Advisory本文を含めない。

### validator

synthetic fixtureは公開情報だけで構成し、実Alert payloadをcommitしない。

- direct dependencyの同一major `first_patched_version`変更を許可する。
- major updateを拒否する。
- exact / `^` / `~`以外のspecifierを自動修正対象外にする。
- root parent candidate外versionを拒否する。
- root parentのmajor updateを拒否する。
- override valueがaffected parentの宣言rangeを満たさない場合を拒否する。
- global overrideを拒否する。
- 無関係なdependency / scripts / packageManager / packageExtensions変更を拒否する。
- target dependencyがinstalled graphに存在しない場合を`needs_human`にする。
- vulnerable rangeに残るresolved versionがある場合を拒否する。
- selected root path外の予期しないgraph変更を拒否する。
- 2回目lockfile生成で追加diffがあれば拒否する。
- GitHub形式の`,`区切りrangeを限定正規化できる。
- `semver.validRange()`が失敗するrangeを拒否する。

### OpenCode workflow contract

- triggerは`workflow_dispatch`だけ。
- `alert_number`はrequired number。
- fixed concurrencyでAlert番号を含めない。
- preflightはmain refと`run_attempt == 1`を検証する。
- `repair-and-validate` jobに`id-token: write`と`vulnerability-alerts: read`がない。
- `publish` jobだけに`id-token: write`がある。
- raw Alertをrepair job artifact / outputへ渡さない。
- Advisory vulnerability entryをnpm + package名で一意選択する。
- OpenCode binary version / asset / digestを固定する。
- stock Action / `opencode github run`を使わない。
- modelは`-free`だけで、有料fallbackがない。
- OpenCode processがGitHub credential / OIDC envを継承しない。
- bash全面deny、editは`package.json`だけ。
- candidate parent versionは同一majorかつ最大10件。
- candidateごとの事前install loopがない。
- OpenCode timeoutは10分。
- job timeoutはpreflight 2分、read-alert 5分、repair 45分、publish 10分。
- publish前にAlert state / GHSA / dependencyを再確認する。
- publish前にbase SHA、duplicate PR、orphan branchを再確認する。
- Re-run jobsで自動修正へ進まない。
- PAT / write-enabled `GITHUB_TOKEN` fallbackがない。
- auto-mergeがない。
- public metadataへAlert番号 / model responseを含めない。

### Repository標準検証

- 関連contract test。
- `pnpm run test:contracts`。
- `pnpm run verify`。
- `git diff --check`。
- PR CI。

### activation後の実地確認

- Human PRのPreview契約が維持される。
- Expo Dependency Maintenance PRのPreview契約が維持される。
- Renovate / OpenCode Security PRだけPreview skipになる。
- Renovateがnormal dependency updateを作成しない。
- 最初のRenovate Security PRが公開情報境界とauto-merge禁止を満たす。
- OpenCode activation fixtureで`package.json` editだけが許可され、Git操作、bash、別file edit、credential readが拒否される。
- 実fallback PRが`package.json` / `pnpm-lock.yaml`以外を変更しない。
- merge前に対象dependencyがvulnerable range外である。
- merge後に元Alertが`fixed`になる。`dismissed` / `auto_dismissed`は成功扱いしない。

## 7. リスクと未解決論点

### リスク

1. **Security fallback対応率を狭くする**
   - 初期版はmajor update、installed graphで確認できないdependency、複雑なspecifierを`needs_human`へ止める。
   - 対応率より誤修正防止を優先する。実運用で頻出したケースだけ別Issueで拡張する。

2. **root parent candidateをOpenCodeが1回で選べない**
   - 候補は同一major・最大10件に限定する。
   - validator failureをmodelへ返してretryせず`needs_human`。

3. **runner platformにinstallされないdependencyを検証できない**
   - `pnpm list`を完全lockfile graphとは扱わない。
   - targetがinstalled graphにない場合は自動修正しない。

4. **write-capable GitHub AppはProductionへ到達し得る**
   - Preview skipだけをtrust boundaryと扱わない。
   - OwnerがProductionまでtrustedと判断できない場合はactivationしない。

5. **Hosted Renovateの最終PR renderはRepository testだけでは完全再現できない**
   - config validationと最初の実Security PR監査で確認し、違反時はRenovateを停止してDependabot Security Updatesへ戻す。

6. **Free model / OpenCode外部サービスは変化する**
   - Free候補0件、provider error、rate limitでは有料modelや別modelへ自動fallbackしない。

7. **publish途中でbranchだけ残る**
   - 自動retryしない。
   - 次回dispatchでは同じdependency用の残存branchを検出して停止する。

### 未解決事項

- `prConcurrentLimit`具体値。
- 外部Appの実権限とProduction trust。
- Zen / OIDC実疎通。

これらを未確認のままlive activationしない。

## 8. 成果物

### 今回のPlan成果物

- `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`
- `.codex/runs/20260919-051528-JST/PLAN.md`
- `.codex/runs/20260919-051528-JST/TASKS.md`
- `.codex/runs/20260919-051528-JST/REPORT.md`

### 実装時の変更予定ファイル

- `renovate.json`
- `.github/workflows/security-dependency-fallback.yml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/ci.yml`
- `SECURITY.md`
- `docs/reference/run-artifacts.md`
- `scripts/validate-security-dependency-fix.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/renovate-config.test.ts`
- `tests/contracts/security-dependency-fallback-workflow.test.ts`
- `tests/contracts/security-dependency-fix-validator.test.ts`

新規runtime dependencyは追加しない。validator用devDependencyとして`semver@7.8.5`だけを追加する。

## 9. 備考

- Dependabot Alertsを停止しない。
- Dependabot Security UpdatesをOFFにするのはRepository変更merge後、Renovate activation直前だけとする。
- 既存open Dependabot Security PRがある場合は自動closeせずactivationを停止する。
- Renovate / OpenCode App installとGitHub Secret登録はRepository実装と分離する。
- 実装中に公式仕様、App権限、固定OpenCode Release契約がPlan前提と異なることを確認した場合は、互換性を推測で埋めずactivationを止めてPlanを更新する。
- PR #167の現在のMarkdown Lint failureは参考リンクのbare URLが原因なので、本修正ではすべてMarkdown linkへ変更する。

### 実装時に再確認する公式資料

- [Renovate Security Preset](https://docs.renovatebot.com/presets-security/)
- [Renovate vulnerabilityAlerts](https://docs.renovatebot.com/configuration-options/#vulnerabilityalerts)
- [Renovate Security and Permissions](https://docs.renovatebot.com/security-and-permissions/)
- [Mend Renovate Community Cloud](https://docs.renovatebot.com/mend-hosted/overview/)
- [Renovate npm manager](https://docs.renovatebot.com/modules/manager/npm/)
- [GitHub Dependabot Alerts REST API](https://docs.github.com/en/rest/dependabot/alerts)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [pnpm list 9.x](https://pnpm.io/9.x/cli/list)
- [pnpm install 9.x](https://pnpm.io/9.x/cli/install)
- [npm semver](https://www.npmjs.com/package/semver)
- [OpenCode Zen](https://opencode.ai/docs/zen)
- [OpenCode Release v1.18.31](https://github.com/anomalyco/opencode/releases/tag/v1.18.31)
- [OpenCode immutable OIDC subject fix](https://github.com/anomalyco/opencode/pull/44776)
