# Issue #163 Renovate / OpenCode Security修正自動化 Plan

## 0. 依頼概要

- 対象Issue: #163 `feat: RenovateでDependabot Alertを自動修正しOpenCode fallbackを整備する`
- 対象branch: `issue-163-renovate-opencode-security-fallback`
- base: `main@8772d191ff3fbe4d17bf91082aafbd92fffc0c4c`
- 依頼内容: Dependabot Alertsを脆弱性検知の正本として維持し、RenovateをSecurity修正の第一経路、OpenCodeを人間が起動する限定fallbackとして追加する。
- 今回の作業範囲: Planの修正と保存のみ。実装、外部App導入、GitHub Settings変更、Secret変更は行わない。
- Repository実装はPR #167を唯一の実装PRとして継続し、同じbranchへcommitを追加して完了させる。Issue #163のRepository変更用に別PRを作成しない。外部App installation、Secret登録、Repository Settings変更、activationはPRへ含められないためmerge後に実施する。
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
- GitHub Actionsは`preflight`、`read-alert`、`opencode-edit`、`validate-exec`、`finalize`、`publish`の6 jobへ分離する。
- `opencode-edit` jobだけが`OPENCODE_API_KEY`をOpenCode processへ渡す。`validate-exec`、`finalize`、`publish`はZen credentialを持たず、すべて別runnerで実行する。
- `validate-exec`は`pnpm run verify`を含む任意Repository / dependency codeの実行だけを担当し、publish用fileやhash manifestを生成しない。
- `finalize`はfresh runnerで、OpenCode実行前に確定したauthorizationとcandidateからpublish対象を再構成する。package lifecycle script、test、build、`pnpm run verify`は実行しない。
- `opencode-edit` / `validate-exec` / `finalize`は`id-token: write`と`vulnerability-alerts: read`を持たず、raw Dependabot Alertを受け取らない。
- `publish` jobだけが`id-token: write`を持ち、OpenCode GitHub App installation tokenを取得する。
- OpenCodeへ渡すSecurity情報は、公開Repositoryと公開Security Advisoryから再構成できる構造化情報だけにする。Alert番号、Alert state、actual exposure、private triage、raw Alert JSONを渡さない。
- Public Global Security Advisoryの`vulnerabilities[]`は`ecosystem == npm`かつ`package.name == Alert dependency名`で一意に一致するentryだけを使用する。0件または複数件なら`needs_human`で停止する。
- OpenCodeは固定Releaseの公式binaryをRepository側へ固定したSHA-256で検証してから実行する。stock `anomalyco/opencode/github` Actionと`opencode github run`は使わない。
- OpenCode ZenはGitHub Secret `OPENCODE_API_KEY`を使い、実行時のmodel一覧からID末尾が`-free`のmodelだけを決定的に選ぶ。有料modelや匿名利用へfallbackしない。
- `OPENCODE_API_KEY`はOpenCode processだけへ渡し、検証jobの他processとpublish jobへ渡さない。
- OpenCode processは環境変数allowlistで起動し、`GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数、Cloudflare credentialを継承しない。
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`、`OPENCODE_DISABLE_SHARE=1`を設定する。
- OpenCode permissionはtop-levelの`"*": "deny"`を先頭に置いてdeny-by-defaultを成立させ、その後に必要な`read` / `edit`だけを限定allowする。OpenCode `v1.18.31`のlast-match仕様に合わせ、rule順序をcontract testで固定する。`bash`、`glob`、`list`、`grep`、`webfetch`、`websearch`、`external_directory`、`task`、`skill`、`question`、`lsp`はallowしない。
- OpenCodeが編集できるのは`package.json`だけとする。`pnpm-lock.yaml`はOpenCodeへ編集させず、workflowが固定`pnpm@9.10.0`で生成する。
- OpenCode promptでは`AGENTS.md`、`.agents/skills/repair-loop/SKILL.md`、`.agents/skills/repair-loop/references/repair-workflow.md`、`docs/plans/2026-08-16_162000_public-repository-hardening.md`のP-13を明示的に読ませる。文書参照は判断補助でありSecurity保証やDoDには使わず、重要な制約はworkflow、permission、validatorで機械的に固定する。Issue #163が許容するread-only shell / lockfile更新よりもPlan側を狭め、OpenCodeにはshellを許可せず`package.json`だけを編集させる。
- OpenCodeはworkflowから渡された許可範囲の中から、1回だけ修正候補を作る。validator failureをpromptへ返して自動再修正しない。
- direct dependency、`root direct dependency -> vulnerable target`の1 edgeで表せるroot parent update、互換性を確認済みのparent-scoped overrideだけを初期fallback対象にする。`root -> A -> target`のような深いpathをroot parent updateとして自動探索せず、parent-scoped overrideの条件を満たさなければ`needs_human`へ停止する。
- vulnerable range判定は`semver@7.8.5`へ委譲する。npm vulnerable rangeの`,`区切りは空白へ置換する以外の独自変換を行わず、`semver.validRange()`で解釈不能なら停止する。
- `pnpm list --json --depth Infinity`は「現在のrunnerへinstallされたdependency graph」の確認に使う。「lockfile内の全platformを含む完全なdependency graph」とは扱わない。Alert対象が現在runnerのinstall graphに存在しない場合は`needs_human`へ停止する。
- OpenCode実行前にworkflow自身が`fix-authorization.json`を確定し、OpenCodeには編集させない。`validate-exec`はこのauthorizationに対してcandidateを検証したうえでlockfile生成、installed dependency graph確認、`pnpm run verify`、`git diff --check`を実行する。成功後はfresh runnerの`finalize`が元のcandidateとauthorizationからlockfile、dependency graph、tracked Run Artifact、hash manifestを再構成し、publish対象を確定する。
- lockfile内部fieldを独自に全面deep-equalするvalidatorは作らない。package.jsonの許可差分、pnpmが生成したlockfileの再現性、installed graph、既存Dependency ReviewとRepository標準検証を組み合わせる。
- publish直前に対象Dependabot AlertとPublic Global Security Advisoryを再取得する。Alertが`open`で、開始時と同じdependency / ecosystem / GHSA IDを指し、Advisoryのnormalized vulnerable rangeと`first_patched_version`が`fix-authorization.json`と一致する場合だけpublishする。`fixed`、`dismissed`、`auto_dismissed`、別Alert、Advisory条件変更のいずれかなら再計算せず`needs_human`へ停止する。
- publish直前に開始時の`BASE_SHA`と最新`origin/main`を比較し、異なる場合は自動rebaseせず`needs_human`へ停止する。
- publish stepだけでOpenCode GitHub App installation tokenを取得し、workflow側が固定形式でbranch、commit、push、PR作成を行う。model出力をGit metadataへ使用しない。
- Re-run jobsによる再修正を禁止する。push後にPR作成だけ失敗した場合はbranchを残して`needs_human`とし、新しいOpenCode実行を自動開始しない。
- fallbackのpublic結果は成功時のPR URLまたは`needs_human`だけとし、private failure reason、Alert番号、prompt、model logをSummaryへ出さない。
- `SECURITY.md`には公開可能情報の境界だけを追加する。fallbackの処理順序、Cloudflare Preview分類、activation手順などのworkflow詳細は他の正本へ置く。
- 自動Security fallbackも既存Repository契約どおりtracked Run Artifactを残す。fresh runnerの`finalize` jobで`standard` Runを作成し、Public PRへ出してよい情報だけで`PLAN.md` / `TASKS.md` / `REPORT.md`を構成してsanitizationする。完全にsanitizationしたtracked Run Artifactを作成できない場合は例外を新設せず`needs_human`で停止し、Security PRを作成しない。
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
- PR #167の現head `496e694ca8a4e3b0de2d49fb99b7ed2a38ce215c`では、Web CI / Mobile App CIはいずれも成功している。

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
  - 6 job構成の手動fallback。
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

### 方針3: fallbackを6 jobへ分離する

job間の引き渡しにはRepository既存のfull-SHA固定Actionを再利用する。

- upload: `actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0`
- download: `actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0`
- `retention-days: 1`
- `overwrite: false`
- upload時はfile欠落をfailureにする。
- upload stepの出力は`artifact-id` / `artifact-digest`をjob outputへ渡す。
- download側の入力名は`artifact-ids`を使用し、上流job outputの`artifact-id`を値として渡す。Artifact名やpatternで探索しない。
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
- Public Global Security Advisoryから`ecosystem == npm`かつ`package.name == dependency名`の`vulnerabilities[]` entryを1件だけ選ぶ。0件または複数件なら`needs_human`。
- vulnerable rangeは限定正規化後に`semver.validRange()`で検証する。`first_patched_version`が存在する場合はstable exact SemVerであることを確認する。
- public structured fieldだけから`sanitized-security-context.json`を生成する。package、ecosystem、GHSA ID、normalized vulnerable range、first patched versionだけを含め、Alert番号、Alert state、raw JSON、actual exposure、private triageを含めない。
- この段階の重複判定はtarget dependency名だけを対象にする。open PRの`package.json` / `pnpm-lock.yaml` patchにtarget dependencyの修正が明確に存在する場合は停止する。patchを取得できず判定不能な場合もfail-closedとする。
- `sanitized-security-context.json`のSHA-256を計算し、`security-context-${{ github.run_id }}`へuploadする。
- `timeout-minutes: 5`。

related root dependencyやoverride selectorはこのjobではまだ確定していないため判定しない。

#### `opencode-edit`

- `contents: read`と`pull-requests: read`だけを必要範囲で付与し、`id-token: write`と`vulnerability-alerts: read`を付けない。
- exact `BASE_SHA`を`persist-credentials: false`でcheckoutする。
- `security-context` Artifactを`artifact-ids`指定でdownloadし、file setとSHA-256を検証する。
- Node 24、pnpm 9.10.0を使う。
- OpenCodeへSecretを渡す前に`pnpm install --frozen-lockfile --ignore-scripts`と`pnpm list --json --depth Infinity`を実行し、現在runnerへinstallされたdependency graphを取得する。
- 上記pnpm / Node処理は`env -i`相当のpublic-safe環境で起動する。基本allowlistは`PATH`、runner temp配下の専用`HOME` / `TMPDIR`、`CI=true`、`GITHUB_ACTIONS=true`、`RUNNER_OS`、`RUNNER_ARCH`、`BASE_SHA`、sanitized contextのpath / hashだけとする。`GITHUB_EVENT_PATH`を含むその他`GITHUB_*`、credential、Secretを継承しない。
- target dependencyが0件なら`needs_human`。
- installed targetの各resolved versionをnormalized vulnerable rangeへ照合し、`semver.satisfies(resolvedVersion, vulnerableRange)`となるpathだけをaffected pathとする。affected pathが0件なら既に安全な状態として自動修正せず`needs_human`。
- root dependency、immediate parent、affected resolved versionを構造化する。safeなtarget pathが同時に存在してもaffected pathへ含めない。
- root dependency / parent-scoped override候補が確定した後、open PRのpatchを再確認する。target dependency、選択可能なroot dependency、または同じparent-scoped override selectorを変更するPRがあれば停止する。patchを取得できず判定不能な場合もfail-closedとする。

OpenCodeへ許可する初期方式は次の3種類とする。

1. **direct dependency update**
   - targetがroot direct dependency。
   - affected resolved versionが実際にvulnerable range内である。
   - `first_patched_version`がstable exact SemVer。
   - current resolved versionと同一major。
   - `semver.gte(first_patched_version, currentResolvedVersion)`を満たし、version downgradeにならない。
   - package.jsonの既存specifierがexact、`^`、`~`。
   - 既存operator形式を維持して`first_patched_version`へ変更する。

2. **root parent dependency update**
   - targetがtransitive dependency。
   - affected pathがすべて同一のroot direct dependencyに属する。
   - 各affected pathが`root direct dependency -> target`の1 edgeであり、途中に別packageを挟まない。
   - root dependencyの既存specifierがexact、`^`、`~`。
   - `pnpm view`からstable versionを取得し、currentより大きい同一majorだけを候補にする。
   - `^` / `~`では既存rangeを満たすversionだけ、exactでは同一majorのversionだけを候補にする。
   - 各candidateの`dependencies`でtarget dependencyの宣言rangeを取得し、`first_patched_version`を許容するcandidateだけを残す。
   - 条件を満たすcandidateを昇順で最大10件まで許可candidateにする。
   - candidateごとのinstallは事前実行しない。
   - `root -> A -> target`のような深いpath、候補0件、major updateが必要な場合はこの方式を使わない。

3. **parent-scoped override**
   - direct / root parent updateを安全に選べない場合だけ候補にする。
   - targetの`first_patched_version`がstable exact SemVer。
   - `first_patched_version`が各affected target resolved version以上であり、version downgradeにならない。
   - affected immediate parentごとに、baseline installed graphで確認したexact parent versionを使って`<parent-name>@<baseline-resolved-version>><target-name>`形式のselectorを1つずつ作る。
   - `pnpm view <parent>@<baseline-resolved-version> dependencies --json`からtargetへの宣言rangeを取得し、`first_patched_version`がそのrangeを満たす場合だけ許可する。
   - parent version range、global override、別target dependency、別Alertだけが根拠のselectorは許可しない。

上記いずれでも安全な候補を作れない場合は`needs_human`。

OpenCodeへSecretを渡す前に、workflow自身がrunner tempへ`fix-authorization.json`を生成する。OpenCodeのworking directory外へ置き、OpenCode実行前後でSHA-256が一致することを確認する。`fix-authorization.json`は少なくとも次を保持する。

- schema version
- `BASE_SHA`
- dependency名 / ecosystem / GHSA ID
- normalized vulnerable range / first patched version
- affected pathごとのbaseline resolved version、root dependency、immediate parent
- 許可するstrategy
- strategyごとのexactな許可変更
  - direct: old / new specifier
  - root parent: root dependency名、old specifier、許可candidate specifier一覧
  - override: exact selectorと許可value
- authorization JSON自体のSHA-256

OpenCode promptへ渡すのはsanitized contextと`fix-authorization.json`の許可内容だけとする。OpenCodeはauthorizationを変更できず、許可された変更から1つだけ選んで`package.json`を編集する。

OpenCode promptでは次のRepository文書を明示的に読ませる。

- `package.json`
- `AGENTS.md`
- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`のP-13

Security fallback専用OpenCode configは次を固定する。

- `model: "opencode/<selected-free-model-id>"`
- `small_model: "opencode/<selected-free-model-id>"`
- `formatter: false`
- `lsp: false`
- permission ruleの先頭を`"*": "deny"`とし、その後に必要なallowだけを書く。
- `read`: default deny。上記5 pathだけallow。
- `edit`: default deny。`package.json`だけallow。
- `glob` / `list` / `grep` / `bash` / `webfetch` / `websearch` / `external_directory` / `task` / `skill` / `question` / `lsp`: allowしない。
- `.git/**`、`.env`、`.env.*`、credential / Secretを保持し得るpathはread / edit allowlistへ入れない。

OpenCode実行時は次を固定する。

- Release: `v1.18.31`
- asset: `opencode-linux-x64.tar.gz`
- SHA-256: `e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`
- `RUNNER_ARCH == X64`以外は`needs_human`
- model ID末尾`-free`だけを辞書順で選び、main modelと`small_model`の両方へ同じmodelを設定する。
- `opencode run --title security-dependency-fallback --model opencode/<selected-free-model-id> ...`のように固定titleを指定し、自動title生成を発生させない。
- OpenCode processのtimeoutは10分。
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`、`OPENCODE_DISABLE_SHARE=1`
- process環境変数は`PATH`、runner temp配下の専用`HOME` / `TMPDIR`、`CI=true`、`OPENCODE_API_KEY`、`OPENCODE_CONFIG`、`OPENCODE_PERMISSION`、上記`OPENCODE_DISABLE_*`だけをallowlistとする。
- `GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数、Cloudflare credential、通常runnerの`HOME`を継承しない。
- stdout / stderr、session、cacheは専用`HOME` / `TMPDIR`へ閉じ、Public logやArtifactへ含めない。

OpenCodeは1回だけ`package.json`を編集する。任意versionの発明、候補外version、複数strategy混在を許可しない。validator failureをOpenCodeへ返してretryしない。

OpenCode process終了後、このjobではRepository script、pnpm、Node dependencyを実行しない。固定shell / Git操作だけで変更fileが`package.json`だけであること、`fix-authorization.json`のSHA-256がOpenCode実行前と一致することを確認する。専用`HOME` / `TMPDIR` / model logを削除する。

`security-candidate-${{ github.run_id }}`へuploadするfileは`package.json`と`fix-authorization.json`だけを完全列挙する。upload後の`artifact-id` / `artifact-digest`と両fileのSHA-256をjob outputへ渡す。

`opencode-edit` job全体は`timeout-minutes: 20`とする。

#### `validate-exec`

- Zen credential、GitHub App credential、OIDC、`vulnerability-alerts: read`を持たない別runnerで実行する。
- exact `BASE_SHA`を`persist-credentials: false`でcheckoutする。
- `security-context`と`security-candidate`を`artifact-ids`指定でdownloadし、file set、Artifact digest、個別SHA-256を確認する。
- candidate `package.json`と`fix-authorization.json`を配置し、semantic diffがauthorization内の許可変更1件だけと一致することを検証する。
- `scripts`、`packageManager`、metadata、`pnpm.packageExtensions`、無関係なdependency / override変更を拒否する。
- workflowが`pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`でlockfileを生成する。
- 続けて`pnpm install --frozen-lockfile --ignore-scripts`を行う。
- package selectorなしの`pnpm list --json --depth Infinity`で、authorizationのaffected pathに対応するtarget dependencyがすべてnormalized vulnerable range外であることを確認する。
- root parent updateでは選択したroot dependency配下以外の予期しないdependency edge / resolved version変更を拒否する。parent-scoped overrideでは許可したexact selector以外の変更を拒否する。
- Repository / dependency processは`env -i`相当のpublic-safe環境で起動し、`GITHUB_EVENT_PATH`、credential、Secretを渡さない。
- `pnpm run verify`と`git diff --check`を実行する。
- このjobからpublish対象file、lockfile、Run Artifact、hash manifestをArtifactとして出力しない。jobのsuccess / failureだけを後続`finalize`の条件にする。
- failure時は`needs_human`で停止する。
- `timeout-minutes: 45`。

#### `finalize`

- `validate-exec`成功後にfresh runnerで実行する。
- Zen credential、GitHub App credential、OIDC、`vulnerability-alerts: read`を持たない。
- exact `BASE_SHA`を`persist-credentials: false`でcheckoutする。
- `security-context`と、`opencode-edit`が生成した元の`security-candidate`を`artifact-ids`指定で再取得する。`validate-exec`からworkspaceや生成fileを受け取らない。
- candidate / authorizationのfile set、Artifact digest、個別SHA-256を再確認する。
- semantic diffがauthorization内の許可変更1件だけと一致することを再検証する。
- package lifecycle script、test、build、`pnpm run verify`は実行しない。
- `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`でlockfileを再生成する。
- `pnpm install --frozen-lockfile --ignore-scripts`とpackage selectorなしの`pnpm list --json --depth Infinity`でdependency graphを再確認する。
- targetの最終resolved versionがnormalized vulnerable range外であること、authorization外の変更がないことを確認する。
- 同じlockfile-only commandを再実行して追加diffがないことを要求する。

tracked Run Artifactはこのjobで作成する。

1. exact `BASE_SHA`から取得したRepository既存の`scripts/new-run.sh`を使い、`bash scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`でstandard Runを作る。
2. `PLAN.md` / `TASKS.md` / `REPORT.md`にはPublic PRへ出してよい情報だけを書く。dependency名、変更前後version、選択strategy、検証成功は記録してよい。Alert番号、GHSA ID、raw Alert、actual exposure、private triage、prompt、model response、model log、credential、ローカル絶対pathは記録しない。
3. exact `BASE_SHA`の`scripts/sanitize-codex-artifacts.ps1`を使い、`-Write -Check`を通す。
4. sanitizationに失敗した場合は`needs_human`で停止する。

最終guardでは次を行う。

1. semantic validatorとauthorization照合を再実行する。
2. lockfile再生成がno-opであることを確認する。
3. installed graphがnormalized vulnerable range外であることを確認する。
4. `git diff --name-only`と`git ls-files --others --exclude-standard`から最終file setを取得し、`package.json`、`pnpm-lock.yaml`、今回生成した`.codex/runs/<run_id>/PLAN.md` / `TASKS.md` / `REPORT.md`以外を拒否する。
5. `git diff --check`を実行する。
6. `validated-fix.json`へ`BASE_SHA`、dependency、ecosystem、GHSA ID、normalized vulnerable range、first patched version、選択strategy、publish対象5 fileのSHA-256、authorization SHA-256を記録する。`validated-fix.json`自体はGitへ追加しない。

最終guard通過後はRepository script、package manager、Node dependency、test、buildを一切実行しない。残りは固定shellによるfile / hash確認とArtifact uploadだけに限定する。

`validated-security-fix-${{ github.run_id }}`のuploadでは`include-hidden-files: true`を必須にする。ただしupload pathをdirectoryやglobへ広げず、次の6 fileを完全列挙する。

- `package.json`
- `pnpm-lock.yaml`
- `.codex/runs/<run_id>/PLAN.md`
- `.codex/runs/<run_id>/TASKS.md`
- `.codex/runs/<run_id>/REPORT.md`
- `validated-fix.json`

`overwrite: false`、`retention-days: 1`を固定し、upload後の`artifact-id` / `artifact-digest`をjob outputへ渡す。

`finalize` job全体は`timeout-minutes: 20`とする。

#### `publish`

- `contents: read`、`pull-requests: read`、`vulnerability-alerts: read`、`id-token: write`だけを必要範囲で付与する。
- dependency install、OpenCode、Repository script、package manager、test、buildを実行しない。
- `validated-security-fix`を`artifact-ids`指定でdownloadし、期待する6 fileだけであること、Artifact digest、`validated-fix.json`に記録されたSHA-256を再確認する。
- exact `BASE_SHA`をcheckoutし、validated `package.json`、`pnpm-lock.yaml`、3つのRun Artifactだけを配置する。
- Dependabot AlertとPublic Global Security Advisoryを再取得する。
- Alertが`open`で、dependency / ecosystem / GHSA IDがauthorizationと一致することを確認する。
- Advisoryのnpm + package名entryを再度一意選択し、normalized vulnerable rangeと`first_patched_version`が`validated-fix.json` / authorizationと完全一致することを確認する。
- 条件が変化していた場合は再計算やOpenCode再実行をせず`needs_human`へ停止する。
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
- fresh runnerの`finalize` jobで`scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`を使い、`PLAN.md` / `TASKS.md` / `REPORT.md`を作る。
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
- [ ] 6. `scripts/validate-security-dependency-fix.mjs`とvalidator contract testを追加し、authorization照合、baseline vulnerable確認、downgrade拒否を実装する。
- [ ] 7. `.github/opencode/security-fallback.json`を追加し、top-level deny、read / edit allowlist、`formatter: false`、`lsp: false`、main / small modelのFree固定を実装する。
- [ ] 8. `.github/workflows/security-dependency-fallback.yml`を6 job構成で追加する。
- [ ] 9. `read-alert`でraw Alertを隔離し、target dependencyだけの初期重複判定とsanitized context Artifactを実装する。
- [ ] 10. `opencode-edit`でbaseline vulnerable path抽出、bounded strategy、`fix-authorization.json`生成、related root / override重複判定、OpenCode one-shot edit、candidate Artifactを実装する。
- [ ] 11. `validate-exec`で別runner上のsemantic検証、lockfile / installed graph検証、`pnpm run verify`、`git diff --check`を実行し、publish用Artifactを作らない。
- [ ] 12. `finalize`でfresh runnerからcandidate / authorizationを再取得し、scriptsなしでpublish差分を再構成、sanitized tracked Run Artifactとvalidated Artifactを生成する。
- [ ] 13. `publish`でArtifact hash、Alert / Advisory条件、base SHA、duplicate / orphan branchを再確認してからOIDC publishする。
- [ ] 14. `SECURITY.md`を公開情報境界だけ修正する。
- [ ] 15. contract test、Repository標準検証、CIを通す。
- [ ] 16. PR #167だけでRepository実装を完了し、別のRepository実装PRを作成しない。
- [ ] 17. PR #167 merge後にOwner承認を得てRenovate / OpenCodeを段階的にactivationし、実地確認完了後にIssue #163をcloseする。

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
- job構成が`preflight -> read-alert -> opencode-edit -> validate-exec -> finalize -> publish`である。
- `opencode-edit`だけが`OPENCODE_API_KEY`をOpenCode processへ渡し、以降のjobは別runnerかつZen credentialなし。
- `opencode-edit` / `validate-exec` / `finalize`に`id-token: write`と`vulnerability-alerts: read`がない。
- `publish` jobだけに`id-token: write`がある。
- raw Alertを`opencode-edit`以降のArtifactやjob outputへ渡さない。
- Repository / dependency / OpenCode processが通常のGitHub Actions環境を継承せず、`GITHUB_EVENT_PATH`とworkflow_dispatch inputへ到達できない。
- read-alertの重複判定はtarget dependencyだけで、related root / override判定はgraph取得後へ分離されている。
- baseline installed graphでtargetのvulnerable pathを`semver.satisfies`により抽出し、0件なら修正しない。
- direct / overrideでversion downgradeを許可しない。
- `fix-authorization.json`がOpenCode実行前にworkflow自身によって生成され、OpenCode実行前後でSHA-256不変である。
- authorizationがdependency / ecosystem / GHSA / range / first patched / baseline path / allowed strategy / exact allowed mutationを保持する。
- Advisory vulnerability entryをnpm + package名で一意選択する。
- OpenCode binary version / asset / digestを固定する。
- stock Action / `opencode github run`を使わない。
- modelは`-free`だけを選び、`model`と`small_model`の両方へ同じFree modelを設定する。
- `opencode run`へ固定`--title security-dependency-fallback`を渡し、自動title生成を発生させない。
- OpenCode configで`formatter: false`と`lsp: false`を明示する。
- permission ruleの先頭が`"*": "deny"`で、必要なread / editだけが後続ruleでallowされる。
- OpenCode read allowlistが`package.json`、`AGENTS.md`、repair-loop Skill / reference、Public Repository Hardening Planだけである。
- OpenCode edit allowlistが`package.json`だけで、glob / list / grep / bash / web / external_directory / task / skill / question / lspがallowされない。
- root parent candidateは`root -> target`の1 edge、同一major、target宣言range互換、最大10件。
- parent-scoped override selectorがbaseline exact parent version固定。
- candidateごとの事前install loopがない。
- upload Actionの出力`artifact-id`をjob outputへ渡し、download Actionは入力`artifact-ids`でそのIDを指定する。
- Artifactは`retention-days: 1`、`overwrite: false`。
- `validated-security-fix` uploadは`include-hidden-files: true`で、許可6 fileを完全列挙する。
- 下流jobでArtifact digest、file set、個別SHA-256を検証する。
- OpenCode timeoutは10分。job timeoutはpreflight 2分、read-alert 5分、opencode-edit 20分、validate-exec 45分、finalize 20分、publish 10分。
- `validate-exec`は`pnpm run verify`を実行するが、publish対象file / hash manifestを出力しない。
- `finalize`はfresh runnerで元candidate / authorizationからlockfile、installed graph、standard tracked Run Artifact、validated Artifactを再構成する。
- Run Artifactを完全sanitizationできない場合にpublishへ進まない。
- `finalize`の最終guard後にRepository script、package manager、Node dependency、test、buildを実行しない。
- publish前にvalidated Artifactのfile hash、Alert state / dependency / ecosystem / GHSA、Advisoryのnormalized range / first patched、base SHA、duplicate PR、orphan branchを再確認する。
- Advisory条件がauthorizationから変化した場合は再計算せず`needs_human`。
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
- 実fallbackで`validate-exec` runnerと`finalize` runnerが別であり、publish Artifactがfresh runnerで再構成される。
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
   - main modelと`small_model`を同じFree modelへ固定し、固定titleで補助modelの自動選択を避ける。

7. **publish途中でbranchだけ残る**
   - 自動retryしない。
   - 次回dispatchでは同じ`dependency-key` prefixの残存branchを検出して停止する。

8. **sanitized tracked Run Artifactを生成できない**
   - Repository契約を緩和して回避しない。
   - `needs_human`で停止し、Security PRを作成しない。

9. **Alert / Advisory条件が実行中に変化する**
   - publish直前にauthorizationと再照合する。
   - 差異があればそのrun内で再計算せず`needs_human`へ停止する。

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
- PR #167 head `496e694ca8a4e3b0de2d49fb99b7ed2a38ce215c`のWeb CI / Mobile App CIは成功済みである。
- Repository実装はPR #167へ継続してcommitし、別の実装PRを作成しない。PR #167 merge時点では外部activationが未完了のためIssue #163を自動closeせず、activation・実地確認完了後にcloseする。

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
