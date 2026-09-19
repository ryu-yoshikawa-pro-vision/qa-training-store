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
- OpenCode publish branchは`security/<dependency-key>/<github.run_id>`形式へ固定する。`dependency-key`はnpm package名を小文字化し、先頭`@`を除去、`/`を`--`へ変換、`[a-z0-9._-]`以外を`-`へ変換して連続`-`を1つへ畳み、末尾へ元package名のSHA-256先頭8桁を付与する。残存branch判定は`security/<dependency-key>/` prefixで行い、Alert番号を含めない。
- Cloudflare Preview除外はIssue #163の対象へ限定する。同一Repository PRのうち、既存Dependabot、`user.type == Bot`かつ`renovate/` branch、`user.type == Bot`かつ`security/` branchをPreview対象外にする。Expo Dependency Maintenanceの既存`github-actions[bot]` PRは従来のPreview契約を維持する。
- Humanの同一Repository PRは従来どおりCloudflare Preview必須とし、fork PRも従来どおりPreviewをskipする。
- OpenCode fallbackは`workflow_dispatch`だけで起動し、`alert_number`を必須の`number` inputとして1件受け取る。`schedule`は追加しない。
- `alert_number`はpublic出力へ転記しない運用識別子として扱う。GitHub Secret相当の機密値とは扱わないため、Issue #163の`workflow_dispatch`契約を維持する。
- `workflow_dispatch` inputは`github.event.inputs`とイベントpayloadへ存在するため、Repository / dependency / OpenCode processへ通常のGitHub Actions環境を継承させない。これらのprocessは`env -i`相当で起動し、public-safe allowlistだけを渡す。`GITHUB_EVENT_PATH`、`GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数を渡さない。
- main以外のref、`github.run_attempt != 1`、同一修正のopen PR、同じdependency用の残存`security/` branchがある場合は自動修正を開始しない。
- fallback全体は固定`concurrency.group: security-dependency-fallback`で直列化し、`cancel-in-progress: false`とする。Alert番号はgroup名へ含めない。
- GitHub Actionsは`preflight`、`read-alert`、`opencode-edit`、`validate`、`publish`の5 jobへ分離する。
- `opencode-edit` jobだけが`OPENCODE_API_KEY`をOpenCode processへ渡す。`validate`と`publish`はZen credentialを持たず、`opencode-edit`とは別runnerで実行する。
- `opencode-edit` / `validate`は`id-token: write`と`vulnerability-alerts: read`を持たず、raw Dependabot Alertを受け取らない。
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
- OpenCode promptでは`AGENTS.md`、`.agents/skills/repair-loop/SKILL.md`、`.agents/skills/repair-loop/references/repair-workflow.md`、`docs/plans/2026-08-16_162000_public-repository-hardening.md`のP-13を明示的に読ませる。文書参照は判断補助でありSecurity保証やDoDには使わず、重要な制約はworkflow、permission、validatorで機械的に固定する。Issue #163が許容するread-only shell / lockfile更新よりもPlan側を狭め、OpenCodeにはshellを許可せず`package.json`だけを編集させる。
- OpenCodeはworkflowから渡された許可範囲の中から、1回だけ修正候補を作る。validator failureをpromptへ返して自動再修正しない。
- direct dependency、`root direct dependency -> vulnerable target`の1 edgeで表せるroot parent update、互換性を確認済みのparent-scoped overrideだけを初期fallback対象にする。`root -> A -> target`のような深いpathをroot parent updateとして自動探索せず、parent-scoped overrideの条件を満たさなければ`needs_human`へ停止する。
- vulnerable range判定は`semver@7.8.5`へ委譲する。npm vulnerable rangeの`,`区切りは空白へ置換する以外の独自変換を行わず、`semver.validRange()`で解釈不能なら停止する。
- `pnpm list --json --depth Infinity`は「現在のrunnerへinstallされたdependency graph」の確認に使う。「lockfile内の全platformを含む完全なdependency graph」とは扱わない。Alert対象が現在runnerのinstall graphに存在しない場合は`needs_human`へ停止する。
- OpenCodeが作成した`package.json`候補は別runnerの`validate` jobでsemantic diff guard、lockfile生成、`pnpm install --frozen-lockfile --ignore-scripts`、installed dependency graph確認、`pnpm run verify`、`git diff --check`を行う。`pnpm run verify`とRun Artifact生成・sanitization後にsemantic guardとfile allowlistを再確認し、最終guard通過後はRepository code / dependency codeを一切実行せず、そのままvalidated Artifactをuploadする。
- lockfile内部fieldを独自に全面deep-equalするvalidatorは作らない。package.jsonの許可差分、pnpmが生成したlockfileの再現性、installed graph、既存Dependency ReviewとRepository標準検証を組み合わせる。
- publish直前に対象Dependabot Alertを再取得し、まだ`open`で、開始時と同じGHSA ID / dependencyを指すことを確認する。`fixed`、`dismissed`、`auto_dismissed`、別Alertへ変化した場合はPRを作成しない。
- publish直前に開始時の`BASE_SHA`と最新`origin/main`を比較し、異なる場合は自動rebaseせず`needs_human`へ停止する。
- publish stepだけでOpenCode GitHub App installation tokenを取得し、workflow側が固定形式でbranch、commit、push、PR作成を行う。model出力をGit metadataへ使用しない。
- Re-run jobsによる再修正を禁止する。push後にPR作成だけ失敗した場合はbranchを残して`needs_human`とし、新しいOpenCode実行を自動開始しない。
- fallbackのpublic結果は成功時のPR URLまたは`needs_human`だけとし、private failure reason、Alert番号、prompt、model logをSummaryへ出さない。
- `SECURITY.md`には公開可能情報の境界だけを追加する。fallbackの処理順序、Cloudflare Preview分類、activation手順などのworkflow詳細は他の正本へ置く。
- 自動Security fallbackも既存Repository契約どおりtracked Run Artifactを残す。`validate` jobで`standard` Runを作成し、Public PRへ出してよい情報だけで`PLAN.md` / `TASKS.md` / `REPORT.md`を構成してsanitizationする。完全にsanitizationしたtracked Run Artifactを作成できない場合は例外を新設せず`needs_human`で停止し、Security PRを作成しない。
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
- PR #167の現head `0f47f5e05a55c7a18943fee4b6f3e7d21302061f`では、Web CI / Mobile App CIはいずれも成功しており、以前のbare URLによるMarkdown Lint failureは解消済みである。

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
  - 5 job構成の手動fallback。
- `.github/opencode/security-fallback.json`
  - OpenCode `v1.18.31`用deny-by-default permission。
- `.github/workflows/ci.yml`
  - Dependabot、Renovate branch、OpenCode Security branchだけをPreview対象外にする。
- `SECURITY.md`
  - 未修正脆弱性とSecurity修正PRの公開情報境界。
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

`renovate.json`はRenovate公式Security presetを基準に、Issue #163で禁止する機能とPublic PRの公開情報境界を明示的に固定する。

- `extends: ["security:only-security-updates"]`
- `enabledManagers: ["npm"]`
- `osvVulnerabilityAlerts: false`
- `dependencyDashboard: false`
- global `automerge: false`
- `semanticCommits: "disabled"`
- 通常updateを明示的に無効化する`packageRules`
- `vulnerabilityAlerts.enabled: true`
- `vulnerabilityAlerts.automerge: false`
- `vulnerabilityAlerts.vulnerabilityFixStrategy: "lowest"`
- `vulnerabilityAlerts.prConcurrentLimit: <OWNER_CONFIRMED_VALUE>`
- `branchPrefix: "renovate/"`
- `branchTopic: "{{{depNameSanitized}}}-security"`
- `commitMessageAction: "Security Update"`
- `commitMessageTopic: "dependency {{depName}}"`
- `prBodyTemplate: "{{{header}}}{{{table}}}"`
- `prHeader: "Security Update\n\nCI and human review are required before merge.\n\n"`
- `prBodyColumns: ["Package", "Change"]`
- `prBodyDefinitions.Package: "`{{{depName}}}`"`

`prBodyTemplate`から`warnings`、`changelogs`、`configDescription`、`controls`、`footer`を外し、default linked package definitionも上記へ置き換える。PR title / commit messageは`Security Update dependency <name> <version change>`の範囲に限定し、branch名はdependency名だけを基にする。severity、Alert番号、Advisory本文、actual exposure、private triage、release note本文をtemplateへ含めない。

Repository側contract testでは上記設定値を固定する。activation前にはresolved Renovate configと、可能なら最初の実Security PRでtitle / body / branch / commit messageを確認する。Renovateの仕様上この公開境界を守れない場合はvulnerability fixを有効化しない。

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

### 方針3: fallbackを5 jobへ分離する

job間の引き渡しにはRepository既存のfull-SHA固定Actionを再利用する。

- upload: `actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0`
- download: `actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0`
- `retention-days: 1`
- `overwrite: false`
- upload時はfile欠落をfailureにする。
- downloadはArtifact名ではなくupload stepが返した`artifact-id`をjob output経由で指定する。
- upload stepの`artifact-id` / `artifact-digest`と、workflow側で計算した個別file SHA-256だけをjob outputへ渡す。private Alert情報はoutputへ含めない。
- 下流jobはdownload後に期待file setと個別SHA-256を検証する。不一致時は`needs_human`で停止する。

Artifact名は同一workflow run内で次へ固定する。

- `security-context-${{ github.run_id }}`
- `security-candidate-${{ github.run_id }}`
- `validated-security-fix-${{ github.run_id }}`

#### `preflight`

- Secretを参照しない。
- `github.ref == refs/heads/main`を要求する。
- `github.run_attempt == 1`を要求し、Re-run jobsを自動修正経路にしない。
- `concurrency.group`は固定`security-dependency-fallback`。
- `cancel-in-progress: false`。
- `timeout-minutes: 2`。
- failure時は後続jobを開始しない。

#### `read-alert`

- `vulnerability-alerts: read`と`pull-requests: read`だけを必要範囲で付与する。
- Repository checkout、dependency install、OpenCode、Repository scriptを実行しない。
- Dependabot Alertを取得し、`open`、`npm`、対象manifest、dependency名、GHSA ID、vulnerable rangeを確認する。
- raw responseはrunner tempへ一時保存し、sanitized context生成後に削除する。
- Public Global Security Advisoryから`ecosystem == npm`かつ`package.name == dependency名`の`vulnerabilities[]` entryを1件だけ選ぶ。
- public structured fieldだけから`sanitized-security-context.json`を生成する。Alert番号、Alert state、raw JSON、actual exposure、private triageを含めない。
- この段階の重複判定はtarget dependency名だけを対象にする。open PRの`package.json` / `pnpm-lock.yaml` patchにtarget dependencyの修正が明確に存在する場合は停止する。patchを取得できず判定不能な場合もfail-closedとする。
- `sanitized-security-context.json`のSHA-256を計算し、`security-context-${{ github.run_id }}`へuploadする。
- `timeout-minutes: 5`。

related root dependencyやoverride selectorはこのjobではまだ確定していないため判定しない。

#### `opencode-edit`

- `contents: read`と`pull-requests: read`だけを必要範囲で付与し、`id-token: write`と`vulnerability-alerts: read`を付けない。
- exact `BASE_SHA`を`persist-credentials: false`でcheckoutする。
- `security-context` ArtifactをID指定でdownloadし、file setとSHA-256を検証する。
- Node 24、pnpm 9.10.0を使う。
- OpenCodeへSecretを渡す前に`pnpm install --frozen-lockfile --ignore-scripts`と`pnpm list --json --depth Infinity`を実行し、現在runnerへinstallされたdependency graphを取得する。
- 上記pnpm / Node処理は`env -i`相当のpublic-safe環境で起動する。基本allowlistは`PATH`、runner temp配下の専用`HOME` / `TMPDIR`、`CI=true`、`GITHUB_ACTIONS=true`、`RUNNER_OS`、`RUNNER_ARCH`、`BASE_SHA`、sanitized contextのpath / hashだけとする。`GITHUB_EVENT_PATH`を含むその他`GITHUB_*`、credential、Secretを継承しない。追加envが必要になった場合はpublic-safeであることをcontract testで固定する。
- target dependencyが0件なら`needs_human`。
- target pathからroot direct dependency、immediate parent、resolved versionを構造化する。
- root dependency / parent-scoped override候補が確定した後、open PRのpatchを再確認する。target dependency、選択可能なroot dependency、または同じparent-scoped override selectorを変更するPRがあれば停止する。patchを取得できず判定不能な場合もfail-closedとする。

OpenCodeへ許可する初期方式は次の3種類とする。

1. **direct dependency update**
   - targetがroot direct dependency。
   - `first_patched_version`がstable exact SemVer。
   - current resolved versionと同一major。
   - package.jsonの既存specifierがexact、`^`、`~`。
   - 既存operator形式を維持して`first_patched_version`へ変更する。

2. **root parent dependency update**
   - targetがtransitive dependency。
   - installed graph上のaffected pathがすべて同一のroot direct dependencyに属する。
   - 各affected pathが`root direct dependency -> target`の1 edgeであり、途中に別packageを挟まない。
   - root dependencyの既存specifierがexact、`^`、`~`。
   - `pnpm view`からstable versionを取得し、currentより大きい同一majorだけを候補にする。
   - `^` / `~`では既存rangeを満たすversionだけ、exactでは同一majorのversionだけを候補にする。
   - 各candidateの`dependencies`でtarget dependencyの宣言rangeを取得し、`first_patched_version`を許容するcandidateだけを残す。
   - 条件を満たすcandidateを昇順で最大10件までOpenCodeへ渡す。
   - candidateごとのinstallは事前実行しない。OpenCodeは候補から1件だけ選び、別runnerの`validate`で実際の解決結果を検証する。
   - `root -> A -> target`のような深いpath、候補0件、major updateが必要な場合はこの方式を使わない。

3. **parent-scoped override**
   - direct / root parent updateを安全に選べない場合だけ候補にする。
   - targetの`first_patched_version`がstable exact SemVer。
   - affected immediate parentごとに、baseline installed graphで確認したexact parent versionを使って`<parent-name>@<baseline-resolved-version>><target-name>`形式のselectorを1つずつ作る。
   - `pnpm view <parent>@<baseline-resolved-version> dependencies --json`からtargetへの宣言rangeを取得し、`first_patched_version`がそのrangeを満たす場合だけ許可する。
   - parent version range、global override、別target dependency、別Alertだけが根拠のselectorは許可しない。

上記いずれでも安全な候補を作れない場合は`needs_human`。

OpenCode promptにはsanitized contextとallowed strategy / candidateだけを埋め込み、さらに次のRepository文書を明示的に読ませる。

- `package.json`
- `AGENTS.md`
- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`のP-13

OpenCode permissionはlast-match仕様を前提にdeny-by-defaultで構成する。

- `read`: default deny。上記5 pathだけallow。
- `edit`: default deny。`package.json`だけallow。
- `glob` / `list` / `grep` / `bash` / `webfetch` / `websearch` / `external_directory` / `task` / `skill` / `question` / `lsp`: deny。
- `.git/**`、`.env`、`.env.*`、credential / Secretを保持し得るpathはread / edit allowlistへ入れない。

OpenCode実行時は次を固定する。

- Release: `v1.18.31`
- asset: `opencode-linux-x64.tar.gz`
- SHA-256: `e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`
- `RUNNER_ARCH == X64`以外は`needs_human`
- model ID末尾`-free`だけを辞書順で選び、`opencode/<selected_model_id>`として指定
- OpenCode processのtimeoutは10分
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`、`OPENCODE_DISABLE_SHARE=1`
- process環境変数は`PATH`、runner temp配下の専用`HOME` / `TMPDIR`、`CI=true`、`OPENCODE_API_KEY`、`OPENCODE_CONFIG`、`OPENCODE_PERMISSION`、上記`OPENCODE_DISABLE_*`だけをallowlistとする。
- `GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数、Cloudflare credential、通常runnerの`HOME`を継承しない。
- stdout / stderr、session、cacheは専用`HOME` / `TMPDIR`へ閉じ、Public logやArtifactへ含めない。

OpenCodeは1回だけ`package.json`を編集する。任意versionの発明、候補外version、複数strategy混在を許可しない。validator failureをOpenCodeへ返してretryしない。

OpenCode process終了後、このjobではRepository script、pnpm、Node dependencyを実行しない。固定shell / Git操作だけで変更fileが`package.json`だけであることを確認し、candidate packageのSHA-256を計算する。専用`HOME` / `TMPDIR` / model logを削除してから、`package.json`だけを`security-candidate-${{ github.run_id }}`へuploadする。

`opencode-edit` job全体は`timeout-minutes: 20`とする。

#### `validate`

- Zen credential、GitHub App credential、OIDC、`vulnerability-alerts: read`を持たない別runnerで実行する。
- Repository script、pnpm、Node dependency、test、buildは`env -i`相当のpublic-safe環境で実行する。基本allowlistは`PATH`、専用`HOME` / `TMPDIR`、`CI=true`、`GITHUB_ACTIONS=true`、`RUNNER_OS`、`RUNNER_ARCH`、`BASE_SHA`、sanitized context / candidateのpath・hashだけとし、`GITHUB_EVENT_PATH`を含むその他`GITHUB_*`とcredential / Secretを渡さない。
- exact `BASE_SHA`を`persist-credentials: false`でcheckoutする。
- `security-context`と`security-candidate`をArtifact ID指定でdownloadし、file setとSHA-256を確認する。
- candidate `package.json`を配置し、最初にsemantic diffがallowed strategy 1件だけと一致することを検証する。
- `scripts`、`packageManager`、metadata、`pnpm.packageExtensions`、無関係なdependency / override変更を拒否する。
- workflowが`pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`でlockfileを生成する。
- 続けて`pnpm install --frozen-lockfile --ignore-scripts`を行う。
- package selectorなしの`pnpm list --json --depth Infinity`でtarget dependencyがすべてvulnerable range外であることを確認する。
- root parent updateでは選択したroot dependency配下以外の予期しないdependency edge / resolved version変更を拒否する。parent-scoped overrideでは許可したexact selector以外の変更を拒否する。
- `pnpm run verify`と`git diff --check`を実行する。

Repositoryのtracked Run Artifact契約を維持するため、検証成功後に次を行う。

1. `bash scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`で新しいstandard Runを作成する。
2. `PLAN.md` / `TASKS.md` / `REPORT.md`にはPublic PRへ出してよい情報だけを書く。dependency名、変更前後version、選択strategy、実行した検証と結果は記録してよい。Alert番号、GHSA ID、raw Alert、actual exposure、private triage、prompt、model response、model log、credential、ローカル絶対pathは記録しない。
3. `pwsh -File scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write -Check`を実行する。
4. sanitizationに失敗した場合は`needs_human`で停止し、PRを作成しない。

`pnpm run verify`とRun Artifact生成・sanitizationの後に、publish対象を確定する最終検証を行う。

1. semantic validatorとvulnerable-range / dependency graph検証を再実行する。
2. `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`を再実行し、追加diffがないことを要求する。
3. `pnpm install --frozen-lockfile --ignore-scripts`とpackage selectorなしの`pnpm list --json --depth Infinity`を再実行する。
4. `git diff --name-only`と`git ls-files --others --exclude-standard`から最終file setを取得し、`package.json`、`pnpm-lock.yaml`、今回生成した`.codex/runs/<run_id>/PLAN.md` / `TASKS.md` / `REPORT.md`以外を拒否する。
5. `git diff --check`を再実行する。
6. `package.json`、`pnpm-lock.yaml`、3つのRun ArtifactそれぞれのSHA-256、`BASE_SHA`、dependency名、選択strategyを`validated-fix.json`へ記録する。`validated-fix.json`はjob Artifact専用でGitへ追加しない。

上記4以降を最終guardとし、通過後はRepository script、package manager、Node dependency、test、buildを一切実行しない。残りの処理は固定shellによるhash / file確認とfull-SHA固定`upload-artifact`だけに限定する。

`package.json`、`pnpm-lock.yaml`、3つのsanitized Run Artifact、`validated-fix.json`を`validated-security-fix-${{ github.run_id }}`へuploadする。

`validate` job全体は`timeout-minutes: 45`とする。

#### `publish`

- `contents: read`、`pull-requests: read`、`vulnerability-alerts: read`、`id-token: write`だけを必要範囲で付与する。
- dependency install、OpenCode、Repository script、`pnpm run verify`を実行しない。
- `validated-security-fix`をArtifact ID指定でdownloadし、`validated-fix.json`に記録されたSHA-256とfile allowlistを再確認する。
- exact `BASE_SHA`をcheckoutし、validated `package.json`、`pnpm-lock.yaml`、3つのRun Artifactだけを配置する。
- Dependabot Alertを再取得し、`open`かつ開始時と同じGHSA ID / dependencyであることを確認する。
- `origin/main`が`BASE_SHA`から進んでいないことを確認する。
- final diffを基に、target dependency、選択root dependency / override selectorと競合するopen PRがないことを再確認する。
- 同じdependency用の残存Security branchがないことを再確認する。
- `git diff --check`とpublish file allowlistを固定shellだけで確認する。

OpenCode Security branchは次の決定的な規則で生成する。

1. package名を小文字化する。
2. 先頭`@`を除去する。
3. `/`を`--`へ変換する。
4. `[a-z0-9._-]`以外を`-`へ変換し、連続`-`を1つへ畳み、先頭末尾の`-`を除去する。
5. 元package名のSHA-256先頭8桁をsuffixへ付けて`<dependency-key>`とする。
6. branchは`security/<dependency-key>/${{ github.run_id }}`、残存branch確認prefixは`security/<dependency-key>/`とする。

上記確認後だけOIDC tokenを取得し、固定Releaseで確認したOpenCode GitHub App token exchange経路からinstallation tokenを取得する。branch、commit message、PR title/bodyはworkflow固定値から生成し、Alert番号、GHSA ID、model responseを使わない。

Security PRのsource changeは`package.json` / `pnpm-lock.yaml`だけとし、これにRepository契約上必須のsanitized `.codex/runs/<run_id>/PLAN.md` / `TASKS.md` / `REPORT.md`を加える。その他のfileはpublishしない。

push後にPR作成だけ失敗した場合はremote branchを残し、`needs_human`で停止する。自動retryやOpenCode再実行を行わない。

`publish` job全体は`timeout-minutes: 10`とする。

### 方針4: vulnerable rangeとAdvisoryの扱いを固定する

- npm vulnerable rangeは`,`を空白へ置換した後、`semver.validRange()`で検証する。
- `semver.validRange()`が失敗する入力は独自に補正せず`needs_human`。
- `first_patched_version`がない場合はdirect update / overrideの根拠にしない。
- Advisoryのsummary / description等の自由文はOpenCode promptへ渡さない。
- GHSA ID、package名、ecosystem、vulnerable range、first patched version等のstructured fieldだけを使う。

### 方針5: tracked Run Artifact契約を維持する

自動`security-dependency-fallback.yml` runtimeにも既存`AGENTS.md` / `docs/reference/run-artifacts.md`の契約を適用し、例外を追加しない。

- Security fallbackは権限・Security影響を含むため`standard` workflow levelとして扱う。
- `validate` jobで`scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`を使い、`PLAN.md` / `TASKS.md` / `REPORT.md`を作る。
- Run Artifactへ記録するのはPublic PRへ出してよい情報だけとする。
- Alert番号、GHSA ID、raw Alert、actual exposure、private triage、prompt、model response、model log、credentialを記録しない。
- Repository既存sanitizerの`Write` / `Check`を通す。
- 完全にsanitizationしたtracked Run Artifactを作れない場合は`needs_human`で停止し、PRを作成しない。
- Security PRにはsource changeである`package.json` / `pnpm-lock.yaml`に加え、今回のsanitized Run Artifact 3 fileだけを含める。

このIssueでは`docs/reference/run-artifacts.md`を変更しない。既存契約をSecurity fallbackへ適用する。

### 方針6: `SECURITY.md`は公開情報境界へ限定する

`SECURITY.md`へ追加するのは次だけとする。

- 未修正Alert番号、raw payload、actual exposure、攻撃経路、private triageをPublic Issue / PRへ投稿しない。
- Security修正PRではdependency名、変更前後version、Security Updateであること、CI / 検証結果の最小情報だけ公開できる。
- Alertを自動dismissしない。

fallback trigger、job構成、Cloudflare Preview分類、activation手順、Run Artifact運用の詳細は各正本へ置き、`SECURITY.md`へ重複定義しない。

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
- [ ] 5. 4完了後にPublic metadata契約を含む`renovate.json`と`tests/contracts/renovate-config.test.ts`を追加する。
- [ ] 6. `scripts/validate-security-dependency-fix.mjs`とvalidator contract testを追加する。
- [ ] 7. `.github/opencode/security-fallback.json`を追加し、read / edit allowlistと全tool denyを固定する。
- [ ] 8. `.github/workflows/security-dependency-fallback.yml`を5 job構成で追加する。
- [ ] 9. `read-alert`でraw Alertを隔離し、target dependencyだけの初期重複判定とsanitized context Artifactを実装する。
- [ ] 10. `opencode-edit`でinstalled graph、bounded strategy、related root / override重複判定、OpenCode one-shot edit、Zen runner cleanup、candidate Artifactを実装する。
- [ ] 11. `validate`で別runner検証、lockfile生成、installed graph、`pnpm run verify`、sanitized tracked Run Artifact、最終guard、validated Artifactを実装する。
- [ ] 12. `publish`でArtifact hash確認、Alert / base SHA / duplicate / orphan branch再確認、OIDC publishを実装する。
- [ ] 13. `SECURITY.md`を公開情報境界だけ修正する。
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
- `branchTopic == "{{{depNameSanitized}}}-security"`。
- `commitMessageAction == "Security Update"`。
- `commitMessageTopic == "dependency {{depName}}"`。
- `prBodyTemplate == "{{{header}}}{{{table}}}"`。
- `prBodyColumns == ["Package", "Change"]`。
- Package columnがplain dependency名だけで、default linkを使わない。
- `prConcurrentLimit`がPlanのOwner確定値と一致する。
- 公開templateへAlert番号、severity、Advisory本文、warnings / changelogs / controlsを含めない。

### validator

synthetic fixtureは公開情報だけで構成し、実Alert payloadをcommitしない。

- direct dependencyの同一major `first_patched_version`変更を許可する。
- major updateを拒否する。
- exact / `^` / `~`以外のspecifierを自動修正対象外にする。
- root parent updateは`root -> target`の1 edgeだけを許可し、`root -> A -> target`を拒否する。
- root parent candidate外versionを拒否する。
- root parentのmajor updateを拒否する。
- root parent candidateのtarget宣言rangeが`first_patched_version`を許容しない場合を拒否する。
- parent-scoped overrideは`<parent>@<baseline-exact-version>><target>`形式だけを許可する。
- override valueがaffected parentの宣言rangeを満たさない場合を拒否する。
- parent version range / global overrideを拒否する。
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
- job構成が`preflight -> read-alert -> opencode-edit -> validate -> publish`である。
- `opencode-edit`だけが`OPENCODE_API_KEY`をOpenCode processへ渡し、`validate`は別runnerかつZen credentialなし。
- `opencode-edit` / `validate`に`id-token: write`と`vulnerability-alerts: read`がない。
- `publish` jobだけに`id-token: write`がある。
- raw Alertを`opencode-edit` / `validate` Artifactやjob outputへ渡さない。
- Repository / dependency / OpenCode processが通常のGitHub Actions環境を継承せず、`GITHUB_EVENT_PATH`とworkflow_dispatch inputへ到達できない。
- read-alertの重複判定はtarget dependencyだけで、related root / override判定はgraph取得後へ分離されている。
- Advisory vulnerability entryをnpm + package名で一意選択する。
- OpenCode binary version / asset / digestを固定する。
- stock Action / `opencode github run`を使わない。
- modelは`-free`だけで、有料fallbackがない。
- OpenCode processがGitHub credential / OIDC envを継承しない。
- OpenCode read allowlistが`package.json`、`AGENTS.md`、repair-loop Skill / reference、Public Repository Hardening Planだけである。
- OpenCode edit allowlistが`package.json`だけで、glob / list / grep / bash / web / external_directory / task / skill / question / lspがdeny。
- root parent candidateは`root -> target`の1 edge、同一major、target宣言range互換、最大10件。
- parent-scoped override selectorがbaseline exact parent version固定。
- candidateごとの事前install loopがない。
- Artifact名がrun ID固定で、upload / download ActionがRepository既存full SHAへpinされている。
- Artifactは`retention-days: 1`、`overwrite: false`、downloadは`artifact-id`指定。
- 下流jobでfile setとSHA-256を検証する。
- OpenCode timeoutは10分。job timeoutはpreflight 2分、read-alert 5分、opencode-edit 20分、validate 45分、publish 10分。
- `validate`でstandard tracked Run Artifactを作り、sanitizer Write / Checkを通す。
- Run Artifactを完全sanitizationできない場合にpublishへ進まない。
- `pnpm run verify`後にsemantic guard / graph / lockfile no-op / file allowlistを再検証する。
- 最終guard通過後にRepository script、package manager、Node dependency、test、buildを実行しない。
- publish前にvalidated Artifactのfile hash、Alert state / GHSA / dependency、base SHA、duplicate PR、orphan branchを再確認する。
- Security branchの`dependency-key`生成規則と`github.run_id`利用をcontract testで固定する。
- Re-run jobsで自動修正へ進まない。
- PAT / write-enabled `GITHUB_TOKEN` fallbackがない。
- auto-mergeがない。
- public metadataへAlert番号 / GHSA ID / model responseを含めない。

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
- 最初のRenovate Security PRが固定したtitle / body / branch / commit messageの公開情報境界とauto-merge禁止を満たす。
- OpenCode activation fixtureでread / edit allowlist外、Git操作、bash、credential readが拒否される。
- OpenCodeを実行したrunnerと`pnpm run verify`を実行するrunnerが別である。
- 実fallback PRのsource changeが`package.json` / `pnpm-lock.yaml`だけで、追加fileはsanitized Run Artifact 3 fileだけである。
- merge前に対象dependencyがvulnerable range外である。
- merge後に元Alertが`fixed`になる。`dismissed` / `auto_dismissed`は成功扱いしない。

## 7. リスクと未解決論点

### リスク

1. **Security fallback対応率を狭くする**
   - 初期版はmajor update、installed graphで確認できないdependency、複雑なspecifierを`needs_human`へ止める。
   - 対応率より誤修正防止を優先する。実運用で頻出したケースだけ別Issueで拡張する。

2. **root parent candidateをOpenCodeが1回で選べない**
   - 対象は`root -> target`の1 edge、同一major、最大10件に限定する。
   - validator failureをmodelへ返してretryせず`needs_human`。深いpathを自動探索しない。

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
   - 次回dispatchでは同じ`dependency-key` prefixの残存branchを検出して停止する。

8. **sanitized tracked Run Artifactを生成できない**
   - Repository契約を緩和して回避しない。
   - `needs_human`で停止し、Security PRを作成しない。

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
- PR #167 head `0f47f5e05a55c7a18943fee4b6f3e7d21302061f`のWeb CI / Mobile App CIは成功済みであり、bare URLによるMarkdown Lint failureは解消済みである。

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
