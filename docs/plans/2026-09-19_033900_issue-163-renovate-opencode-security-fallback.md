# Issue #163 Renovate / OpenCode Security修正自動化 Plan

## 0. 依頼概要

- 対象Issue: #163 `feat: RenovateでDependabot Alertを自動修正しOpenCode fallbackを整備する`
- 対象branch: `issue-163-renovate-opencode-security-fallback`
- base: `main@8772d191ff3fbe4d17bf91082aafbd92fffc0c4c`
- 依頼内容: Dependabot Alertsを脆弱性検知の正本として維持しつつ、RenovateをSecurity修正の第一経路、OpenCodeを限定的なfallbackとして追加する。
- 今回の作業範囲: Planの作成と保存のみ。実装、外部Appの導入、設定変更、PR作成は行わない。
- 期待成果: 実装時に、公開情報の境界、GitHub ActionsのSecret境界、外部Appの権限、RenovateとOpenCodeの責務、停止条件、ロールバックを追加判断なく追えるPlanを用意する。

## 1. ゴール / 完了条件

### ゴール

Dependabot Alertsを脆弱性検知の正本として残し、次の2段階で依存関係のSecurity修正を扱う。

1. Renovateが対象Alertに対して、通常の依存更新を行わず、修正可能な最小versionのSecurity修正PRを作成する。
2. Renovateが対象Alertを正常に認識・処理したものの安全な修正PRを作成できなかった場合に限り、人間が`workflow_dispatch`でOpenCode fallbackを起動する。

どちらの経路でもauto-mergeせず、未解決の脆弱性情報やmodel出力を公開しない。OpenCodeは脆弱性scannerやGit操作主体にせず、Repositoryの既存契約に従って限定された依存修正だけを行う。

### 完了条件（DoD）

- Dependabot Alertsは有効のまま維持する。
- Dependabot Security UpdatesはRepository側の変更がmergeされるまで維持し、Renovateを有効化する直前に無効化する。Renovate有効化に失敗した場合は直ちに再度有効化できる。
- `renovate.json`でSecurity修正だけを有効化し、通常の依存更新、OSV vulnerability alerts、Dependency Dashboard、auto-mergeを無効化する。
- Renovateの対象managerを`npm`に限定し、rootの`package.json` / `pnpm-lock.yaml`と`pnpm@9.10.0`を維持する。
- `vulnerabilityAlerts.prConcurrentLimit`は0以外の有限値にし、live activation前にOwner権限でopen Dependabot Alert件数を確認して具体値を確定する。件数を取得できない場合は有効化しない。
- Renovateの公開PR情報はdependency名、version差分、`Security Update`、CI確認に必要な最小情報へ限定し、Alert番号、severity、actual exposure、private triage、Advisory本文を展開しない。
- `.github/workflows/ci.yml`では同一Repository由来の全Bot PRをCloudflare Preview対象外とする。本Planではこれを新しいtrust policyとして採用し、既存Expo Dependency Maintenanceの`github-actions[bot]` PRもPreviewをskipする。
- Humanの同一Repository PRは従来どおりCloudflare Previewを必須とし、fork PRも従来どおりPreviewをskipする。
- OpenCode fallbackは`workflow_dispatch`のみで起動し、Alert番号を`number` inputとして1件受け取る。`schedule`は追加しない。
- `workflow_dispatch`の実行refが`refs/heads/main`でない場合は、Secret参照、checkout、dependency install、OpenCode実行より前のpreflightでfailureとして停止する。
- 同じAlert番号のfallbackを同時実行しないよう`concurrency`を設定し、`cancel-in-progress: false`とする。
- OpenCodeへ渡すSecurity情報は、公開Repositoryと公開Security Advisoryから再構成できる構造化情報だけにする。Alert番号、Alert state、actual exposure、private triage、raw Alert JSONは渡さない。
- OpenCode promptではAdvisoryの自由文を原則渡さず、GHSA ID、dependency名、ecosystem、vulnerable range、patched version等の構造化fieldだけを利用する。
- OpenCodeは実行前に`AGENTS.md`、`.agents/skills/repair-loop/SKILL.md`、Public Repository Hardening P-13をRepository fileとして読む契約にする。
- OpenCodeは固定Releaseの公式binaryをRepository側へ固定したSHA-256で検証後に実行する。stock `anomalyco/opencode/github` Actionと`opencode github run`は使用しない。
- OpenCode ZenはGitHub Secretで管理する`OPENCODE_API_KEY`を正式な認証経路とし、実行時のmodel一覧からID末尾が`-free`のmodelだけを選ぶ。有料modelや匿名利用へfallbackしない。
- `OPENCODE_API_KEY`はOpenCode実行processだけへ渡し、検証step、publish step、Cloudflare処理へ渡さない。
- OpenCode processは環境変数allowlistで起動し、`GITHUB_TOKEN`、`ACTIONS_ID_TOKEN_REQUEST_URL`、`ACTIONS_ID_TOKEN_REQUEST_TOKEN`、その他のGitHub credentialを継承しない。固定ReleaseのSecurity境界として`OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`、`OPENCODE_DISABLE_SHARE=1`を設定し、Repository側OpenCode config / plugin、自動更新、LSP download、session shareを無効化する。
- OpenCodeのpermissionはdeny-by-defaultとし、`bash`、`webfetch`、`websearch`、`external_directory`、`task`、`skill`、`question`をdenyする。
- OpenCode自身が編集できるのは`package.json`だけとする。`pnpm-lock.yaml`はOpenCodeへ直接編集させず、OpenCode終了後にworkflowが固定した`pnpm@9.10.0`で生成する。
- `package.json`の変更はdependency修正に必要なfieldだけへ限定し、`scripts`、`packageManager`、無関係なdependency、`pnpm.packageExtensions`、既存の無関係な`pnpm.overrides`を変更できない。
- vulnerable range判定にはnpm SemVerを自作せず、`semver@7.8.5`をexactなdevDependencyとして追加して使用する。`semver`はISC License、runtime dependency 0件であることを実装時にも再確認する。
- workflowはOpenCode実行前のbaseline `package.json` / `pnpm-lock.yaml`をprivate tempへ保存し、既存の`yaml@2.9.0`でlockfile graphを完全走査する。対象dependencyへ到達するroot direct dependency、対象dependencyのimmediate parent selector、baseline resolved versionを公開Repository由来の`dependency_context`として生成し、OpenCode promptとvalidatorで同じgraph結果を使う。`pnpm why`は10 end leavesへtruncateされるため正本にしない。
- workflowがlockfileを再生成した後、変更された`packages` / `snapshots`が選択した修正対象のbaseline / current dependency closure内だけに収まることを検証し、無関係なlockfile変更を拒否する。さらに対象dependencyの全resolved versionがDependabot Alertのvulnerable range外であることを`semver`で確認する。graph reference、version、rangeを安全に解釈できない場合は`needs_human`で停止する。
- model実行後は`git diff --check`、semantic diff guard、lockfile整合、`pnpm run verify`をwrite-capable GitHub App token取得前に実行する。
- OpenCode実行時のstdout/stderr、prompt、raw Alert、baseline lockfile、`dependency_context`は`RUNNER_TEMP`だけに保存し、Actions log、Step Summary、GitHub Artifact、tracked Run Artifactへ保存しない。
- GitHub ActionsのOIDC permissionはjob単位でしか付与できないため、fallback jobが`id-token: write`を持つこと自体は許容する。ただしOpenCode processからOIDC request環境変数を除外し、OIDC取得コードは検証成功後のpublish処理でだけ実行する。
- publish直前にworkflow開始時の`BASE_SHA`と最新`origin/main`を比較する。異なる場合は自動rebaseや検証結果の再利用をせず`needs_human`で停止する。
- publish stepだけでOpenCode GitHub App installation tokenを取得し、workflow側が固定形式でbranch、commit、push、PR作成を行う。モデル出力をGit metadataへ利用しない。
- publish用branch名、commit message、PR title/bodyにAlert番号を含めない。
- fallbackの公開結果は成功時の`fix PR created: <public PR URL>`または失敗時の`needs_human`だけとする。`needs_human`はworkflow failureとして終了し、詳細なprivate failure reasonを公開Summaryへ出さない。
- Security修正PRをmergeする前に対象dependencyがvulnerable range外であることを確認し、merge後に元のDependabot Alertが`fixed`になったことを確認する。`dismissed` / `auto_dismissed`を成功扱いしない。
- `SECURITY.md`へSecurity修正PRの公開情報境界、fallback起動条件、Bot Preview除外、merge後Alert確認を記載する。
- 自動Security fallback runtimeはprivate Alertを扱うため、tracked Run Artifactを生成しない狭い例外を`docs/reference/run-artifacts.md`へ明記する。Issue #163の通常の実装作業自体は既存Run Artifact契約に従う。
- Renovate / OpenCode GitHub Appの導入と権限承認はRepository変更と分離し、OwnerがInstall画面、要求権限、Repository scope、rollback planを確認して明示承認した場合だけ有効化する。
- 現在の`main-protection`は`required_approving_review_count: 0`であるため、write-capable Appは構造上`main`経由のProduction deployまで到達し得る。Ownerが各AppをProductionまでtrustedと判断できない場合、このIssue内でRulesetを暗黙変更せず、別L3変更で追加境界を用意するまでApp activationを止める。
- 関連contract test、validator test、`pnpm run verify`、`git diff --check`、PR CIがPASSする。

## 2. 現状理解と前提

### 現状理解

- `package.json`は`packageManager: pnpm@9.10.0`を使用している。
- root以外の`package.json` / `pnpm-lock.yaml`は存在せず、今回のnpm manager対象はrootだけである。
- `package.json`には既存の`pnpm.overrides`があり、過去のtransitive dependency修正でも使用している。
- `scripts/security-static-check.ts`はcredentialやruntime上の禁止パターンを確認するRepository固有の静的検査であり、依存脆弱性scannerではない。Issue #163の脆弱性検知をこのscriptへ移さない。
- 現在の`.github/workflows/ci.yml`は`deploy-preview`と`validate`で`dependabot[bot]`だけを特別扱いしている。同一Repository由来の他Bot PRはCloudflare Preview経路へ進める。
- `.github/workflows/expo-dependency-maintenance.yml`は同一Repositoryにautomation branchを作り、`github-actions[bot]`としてPRを作成する。全Bot Preview除外後はこのPRもPreviewをskipする。
- `tests/contracts/ci-workflow.test.ts`はCloudflare credential境界、Preview/validate分類、remote Actionのfull SHA pinningを契約として検証している。
- `main-protection` RulesetはRequired checkとしてGitHub Actionsの`validate`を要求する一方、`required_approving_review_count`は0である。PR作成は必須だが、人間approval自体はRulesetで強制していない。
- `deploy-production`は`main`へのpush後に`validate`成功を条件としてCloudflare Production credentialを使用する。このためwrite-capable AppをPreviewから外すだけではProductionまでのtrust boundaryは成立しない。
- `SECURITY.md`は現在、疑わしい脆弱性をpublicへ投稿しない方針を持つ。Issue #163では未解決情報を非公開に保ちつつ、Security修正PRに必要な最小情報だけを公開可能とする。
- Public Repository Hardening P-01の「Renovateを導入しない」は、Issue #163のSecurity-only Renovate導入に限って更新する。P-05のCloudflare Deployment Credential trust boundaryとP-13のFinding Triage契約は継続する。
- OpenCode公式Release `v1.18.31`は2026-09-14公開で、tagはcommit `014614d35b397775e5d397a490fc72368c894ec2`を指す。
- `v1.18.31` Linux x64 asset `opencode-linux-x64.tar.gz`の固定SHA-256は`e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`。
- OpenCode PR #44776のimmutable OIDC subject対応は`v1.18.31`に含まれる。
- `v1.18.31`のV1 permissionはlast matching ruleを採用し、wildcardはcommand文字列全体へ一致する。このため`bash`を`pnpm why *`等のwildcardでallowするとcommand chainingまで許可し得る。今回のfallbackではOpenCodeの`bash`自体をdenyする。
- `v1.18.31`の`edit` / `write` permissionはファイル単位であり、`package.json`のJSON key単位では制限できない。workflow側のsemantic diff guardが必要である。
- 固定Release `v1.18.31`では`OPENCODE_CONFIG`の後にprojectの`opencode.json` / `.opencode`が読み込まれ、`.opencode` pluginも探索される。`OPENCODE_PERMISSION`はpermission mergeの後段に適用される。Security fallbackでは`OPENCODE_DISABLE_PROJECT_CONFIG=1`と`OPENCODE_PURE=1`を使い、permissionを`OPENCODE_PERMISSION`でも最終固定する。
- OpenCode ZenのFree modelだけを使う場合でも、Issue #163の正式運用では`OPENCODE_API_KEY`をGitHub SecretからOpenCode実行processへ渡す。固定Release内部の匿名`public`挙動を運用契約にしない。
- OpenCode Zenのmodel一覧は`https://opencode.ai/zen/v1/models`から取得し、ID末尾が`-free`のものだけを候補にできる。
- `v1.18.31`のGitHub token exchangeはaudience `opencode-github-action`でOIDC tokenを取得し、`https://api.opencode.ai/exchange_github_app_token`へBearer tokenとしてPOSTし、responseの`token`をinstallation tokenとして利用する。
- pnpm `v9.10.0`の`pnpm why`は`--json --depth Infinity`でも内部的にdependency treeを10 end leavesへtruncateするため、完全なdependency pathの正本には使わない。
- Repositoryには`yaml@2.9.0`が直接dependencyとして存在する。`pnpm-lock.yaml` v9のgraph解析はこの既存dependencyを使い、新しいYAML parser dependencyを追加しない。
- npm `semver@7.8.5`は2026-09-19時点の現行versionで、ISC License、runtime dependency 0件である。vulnerable range評価のための小さい専用devDependencyとして採用する。
- 接続中のGitHub操作ではDependabot Alerts APIを直接取得できなかったため、現在のopen Alert件数は未確認である。
- Mend Renovate Community Cloud GitHub Appはcontents、checks、statuses、issues、pull requests、workflows等へのwrite権限を要求するため、単なる設定ファイル追加ではなくL3相当のtrust decisionとして扱う。

### 本Planで確定する判断

- Cloudflare Previewは同一Repository由来の全Bot PRでskipする。Expo Dependency Maintenanceも対象になることを意図した仕様変更として受け入れる。
- Rulesetのapproval数はIssue #163のRepository変更へ含めない。Ownerが外部AppをProductionまでtrustedと判断できない場合はactivationを停止し、別L3タスクで追加境界を設計する。
- OpenCode agentにはshellを一切許可しない。依存install、lockfile graph解析、lockfile生成、検証、Git操作はworkflow側で行う。
- dependency pathの正本はbaseline / current `pnpm-lock.yaml`のgraph解析とし、OpenCodeへ渡す`dependency_context`とvalidatorの許可判定で同じ解析結果を使う。
- Zen model endpointの`data[].id`はmodel IDであり、OpenCode CLIの`--model`へはproviderを付けた`opencode/<selected_model_id>`として渡す。
- OpenCode agentが編集できるのは`package.json`だけにする。`pnpm-lock.yaml`はworkflowが固定pnpm versionで再生成する。
- vulnerable range判定は`semver@7.8.5`へ委譲し、自前のSemVer parserを作らない。
- 自動Security fallback runtimeはtracked Run Artifact対象外とする狭い例外をRepository契約へ追加する。
- Renovateのpublish前検証はRepository側config/contract testとMend側config validationまでとし、Hosted runtimeの完全なPR renderをpublish前必須条件にはしない。最初の実Security PRをruntime監査し、違反時に停止・rollbackする。

### 対象外

- Dependabot Alertsの停止。
- Renovateによる通常のdependency update。
- Renovate Dependency Dashboard。
- Renovate / OpenCodeによるauto-merge。
- OpenCode fallbackのschedule実行。
- OSVを別scannerとして追加すること。
- Secret scanning、Malware Alert、CodeQL findingを同じworkflowで修正すること。
- Dependabot Alertの自動dismissやstate変更。
- OpenCodeにGit操作、branch作成、commit、push、PR作成を任せること。
- OpenCodeのmodel responseをPR本文やGitHub Actions Artifactとして公開すること。
- 脆弱なdependencyを意図的に追加して本番相当Alertを発生させる検証。
- 自動queue、長期retry、branch recovery自動化。
- Ruleset approval数やGitHub Environment等のProduction境界をIssue #163内で暗黙に変更すること。
- `scripts/security-static-check.ts`を依存脆弱性scannerへ変更すること。

## 3. 質問 / activation前の停止条件

Repository側の実装Planを止める未回答質問はない。以下はlive activation前に必ず解消する。

1. **open Dependabot Alert件数**
   - Owner権限でopen件数を取得し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を確定する。
   - 件数を確認できない場合はRenovateをlive activationしない。

2. **外部GitHub Appの実際の要求権限とRepository scope**
   - Mend Renovate App、OpenCode GitHub Appとも、導入時点のInstall画面と公式権限一覧をOwnerが確認する。
   - Repository selectionは`qa-training-store`だけに限定する。
   - 想定より広い権限が必要な場合はinstallせず、Planを更新する。

3. **P-05に基づくProduction trust classification**
   - 現在のRulesetはhuman approvalを必須にしていないため、write-capable Appを導入すると構造上`main`とProduction deployまで到達可能である。
   - Ownerが各AppをProductionまでtrustedと明示判断した場合だけactivationできる。
   - trustedと判断できない場合、Bot Preview除外だけで代替せず、別L3変更でRuleset / Environment / credential境界等を設計するまでactivationを止める。

4. **OpenCode GitHub App + OIDCとZen API keyの疎通**
   - 実Alertを処理する前に、固定ReleaseのOIDC exchange contractと`OPENCODE_API_KEY` + 選択した`-free` modelの非対話実行を確認する。
   - 認証、Free model利用、OIDC token exchangeのいずれかが成立しない場合はfallbackを有効化しない。

5. **Mend Renovate側のconfig validation**
   - Repository側contract testに加え、導入時点のMend Renovate Community Cloudが提供するconfig validation / job logで設定が受理されていることを確認する。
   - Hosted runtimeのPR文字列をpublish前に完全再現できないこと自体はactivation blockerにしない。
   - 最初の実Security PRでtitle、branch、commit message、PR bodyを監査し、公開情報境界に違反した場合はRenovateを停止してDependabot Security UpdatesをONへ戻す。

## 4. 影響範囲

### 変更予定ファイル

- `renovate.json`
  - Security-only Renovate設定、最小公開metadata、auto-merge無効を追加する。
- `.github/workflows/security-dependency-fallback.yml`
  - 手動OpenCode fallback workflowを追加する。
- `.github/opencode/security-fallback.json`
  - OpenCode `v1.18.31`向けdeny-by-default permissionを追加する。OpenCodeの`bash`は全面deny、editは`package.json`だけ許可する。
- `.github/workflows/ci.yml`
  - Preview / validateをHuman / Bot / fork分類へ変更し、同一Repository BotをPreview対象外とする。
- `SECURITY.md`
  - 未解決脆弱性情報、Security修正PRの公開情報、fallback運用、merge後確認を記載する。
- `docs/reference/run-artifacts.md`
  - 自動`security-dependency-fallback` runtimeだけをtracked Run Artifact対象外とする狭い例外を追加する。
- `scripts/validate-security-dependency-fix.mjs`
  - 既存`yaml@2.9.0`でbaseline / current `pnpm-lock.yaml`を解析し、`dependency_context`生成、`package.json`のsemantic diff、lockfile change closure、対象dependencyのresolved versionとvulnerable rangeを検証する。
- `package.json` / `pnpm-lock.yaml`
  - `semver@7.8.5`をexactなdevDependencyとして追加する。OpenCode fallbackの実Alert修正とは別に、Issue #163のvalidator dependencyとして追加する。
- `tests/contracts/ci-workflow.test.ts`
  - Human / Bot / forkのPreview分類を更新する。
- `tests/contracts/renovate-config.test.ts`
  - Security-only Renovate設定を固定する。
- `tests/contracts/security-dependency-fallback-workflow.test.ts`
  - trigger、concurrency、permission、credential、OpenCode pinning、公開情報境界、publish条件を固定する。
- `tests/contracts/security-dependency-fix-validator.test.ts`
  - package.json semantic diffとvulnerable range判定の失敗系を固定する。

### 確認対象だが原則変更しないファイル

- `.github/workflows/expo-dependency-maintenance.yml`
  - Bot Preview除外の既存影響を確認するが、このworkflow自体は変更しない。
- `scripts/security-static-check.ts`
  - 依存脆弱性scannerへ拡張しない。
- `AGENTS.md`
  - OpenCodeが読むRepository契約として参照する。Run Artifactの詳細例外は正本の`docs/reference/run-artifacts.md`へ置くため原則変更しない。
- `.agents/skills/repair-loop/SKILL.md`
  - OpenCode promptからreadするが変更しない。
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`
  - 過去Planは書き換えず、P-05 / P-13を参照する。

### 外部設定

- GitHub Dependabot Security Updates。
- Mend Renovate Community Cloud GitHub App。
- OpenCode GitHub App。
- GitHub Secret `OPENCODE_API_KEY`。
- GitHub AppのRepository selectionとpermissions。
- P-05に基づくProduction trust classification。

Repository側実装と外部App activationを同じ操作として扱わない。

## 5. 変更方針

### 方針1: Cloudflare Previewは同一Repository Botを一律で対象外にする

`.github/workflows/ci.yml`の`deploy-preview`は次をすべて満たす場合だけ実行する。

- eventが`pull_request`。
- head Repositoryが同一Repository。
- `pull_request.user.type != "Bot"`。
- `verify`と`build-automation`が成功している。

`validate`も同じ分類を使用する。

- 同一Repository + Human: `deploy-preview == success`。
- 同一Repository + Bot: `deploy-preview == skipped`。
- fork: `deploy-preview == skipped`。
- push / schedule / workflow_dispatch: `deploy-preview == skipped`。

これはDependabot、Expo Dependency Maintenance、Renovate、OpenCode等を同じautomation trust boundaryとして扱う意図したpolicy変更である。Bot loginのallowlistを増やす方式は採用しない。

`tests/contracts/ci-workflow.test.ts`では`PR_AUTHOR_TYPE`を使うこと、`dependabot[bot]`固有判定をSecret境界から削除すること、Expo maintenance相当BotもPreview skipになることを固定する。

### 方針2: RenovateはSecurity-onlyをRepository設定で固定する

`renovate.json`は公式`security:only-security-updates` presetを基準にし、Issue #163で禁止する機能を明示的に上書きする。

- `extends: ["security:only-security-updates"]`。
- `enabledManagers: ["npm"]`。
- `osvVulnerabilityAlerts: false`。
- `dependencyDashboard: false`。
- global `automerge: false`。
- 通常updateは`matchPackageNames: ["*"]` + `enabled: false`で無効化する。
- `vulnerabilityAlerts.enabled: true`。
- `vulnerabilityAlerts.automerge: false`。
- `vulnerabilityAlerts.vulnerabilityFixStrategy: "lowest"`。
- `vulnerabilityAlerts.prConcurrentLimit`はOwner確認済みのopen Alert件数を基に0以外の有限値へ固定する。

公開metadataはdependency名、old/new version、`Security Update`、CI / manual review要求だけにする。Advisory本文、severity、Alert番号、actual exposure、private triage、Changelog自動展開をPR bodyへ含めない。

Repository側contract testでconfig shapeを固定し、Mend側config validationで受理を確認する。完全なHosted PR renderをpublish前に必須にはしない。最初の実Security PRで公開情報を監査する。

### 方針3: fallback triggerとprivate Alert境界をworkflow側で固定する

`.github/workflows/security-dependency-fallback.yml`は`workflow_dispatch`だけを持つ。

- input名は`alert_number`。
- `required: true`。
- `type: number`。
- `concurrency.group`は`security-dependency-fallback-${{ inputs.alert_number }}`。
- `cancel-in-progress: false`。

Secretを参照しない`preflight` jobを最初に置き、`github.ref == 'refs/heads/main'`を必須とする。main以外のrefならfailureとして終了し、checkout、dependency install、Dependabot Alert取得、OpenCode実行へ進めない。preflightは`id-token: write`やRepository write permissionを持たない。

preflight成功後のfallback jobは`ref: ${{ github.sha }}`を明示してcheckoutし、`HEAD == GITHUB_SHA`を確認して`BASE_SHA=$GITHUB_SHA`を保存する。

指定Alertは`GITHUB_TOKEN`の`vulnerability-alerts: read`だけで取得し、raw responseを`$RUNNER_TEMP/dependabot-alert.json`へ保存する。`set -x`を使用せず、response、Alert番号、temp pathをstdout / Step Summaryへ出さない。

OpenCode実行前に次をworkflow側で検証する。

- Alertが存在する。
- stateが`open`。
- ecosystemが`npm`。
- manifestがroot `package.json` / `pnpm-lock.yaml`経路である。
- dependency名、GHSA ID、vulnerable rangeが取得できる。
- 同じSecurity修正を行うopen PRがない。

対象Alertが`fixed`、`dismissed`、`auto_dismissed`、または対象外状態なら新しいOpenCode実行を開始しない。

### 方針4: modelへ渡すSecurity情報は構造化された公開情報だけにする

private AlertからGHSA IDとdependency名を取り出し、GitHub Global Security Advisoryの公開APIから必要な公開fieldを取得する。

model promptへ渡してよいfieldは次に限定する。

- GHSA ID。
- dependency名。
- ecosystem。
- vulnerable version range。
- patched version / first patched version。
- Repository内の公開ファイル。
- baseline lockfile graphから生成した`dependency_context`。内容は対象dependencyのbaseline resolved version、対象dependencyへ到達するroot direct dependency、対象dependencyのimmediate parent selector、必要な代表pathに限定し、Alert番号やprivate stateを含めない。

Advisoryのdescription、summary等の自由文は初期実装ではpromptへ渡さない。修正判断に必要な情報が構造化fieldだけでは不足する場合は`needs_human`で停止する。

promptには最初に次をRepository fileとして読むよう明記する。

- `AGENTS.md`。
- `.agents/skills/repair-loop/SKILL.md`。
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`のP-13。

修正方針はdirect dependency更新を優先し、次に対象dependencyへ到達するdirect parent dependency更新、最後に必要性を確認した`pnpm.overrides`を検討する。無関係なdependency update、refactor、Security Alertのdismissは行わせない。

### 方針5: OpenCode runtime、認証、permissionを分離する

#### runner準備

既存Web CIと同じfull SHAの`actions/checkout`、`pnpm/action-setup`、`actions/setup-node`を使用する。

- checkoutは`persist-credentials: false`かつ`ref: ${{ github.sha }}`。preflightでmain refを確認済みであることをfallback jobの前提にする。
- checkout直後に`HEAD == GITHUB_SHA`を確認し、`BASE_SHA=$GITHUB_SHA`を保存する。
- Nodeは24。
- pnpmは9.10.0。
- 初期installは`pnpm install --frozen-lockfile --ignore-scripts`。
- OpenCode実行前にbaseline `package.json` / `pnpm-lock.yaml`を`RUNNER_TEMP`へcopyする。
- `scripts/validate-security-dependency-fix.mjs --context`相当のread-only modeでbaseline lockfile graphを解析し、`$RUNNER_TEMP/dependency-context.json`を生成する。parserはroot `importers['.']`、`packages`、`snapshots`を辿り、対象dependencyへ到達するroot direct dependencyとimmediate parent selectorを列挙する。lockfile referenceを一意に解決できなければ`needs_human`とする。
- `dependency-context.json`は公開Repository由来の情報だけを含み、OpenCode promptへ必要な部分だけを埋め込む。Actions logやArtifactへ出力しない。

#### OpenCode binary

- Release: `v1.18.31`。
- asset: `opencode-linux-x64.tar.gz`。
- SHA-256: `e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`。
- `RUNNER_ARCH == X64`以外は`needs_human`。
- 固定Release URLから`RUNNER_TEMP`へdownloadし、extract前にSHA-256を完全一致で検証する。
- install script、`latest` URL、stock GitHub Actionは使用しない。

#### Zen model / API key

- `https://opencode.ai/zen/v1/models`を実行直前にworkflow側で取得する。
- `data[].id`のうち文字列かつ`-free`で終わるIDだけをsortし、辞書順先頭を`selected_model_id`として1件選ぶ。
- OpenCode CLIの`--model`には必ず`opencode/${selected_model_id}`を渡す。`data[].id`をprovider名として扱わない。
- 候補0件は`needs_human`。
- `OPENCODE_API_KEY`はGitHub Secretとして管理し、OpenCode実行stepだけで参照する。
- API keyなしの匿名`public`挙動へfallbackしない。
- 選択modelがprovider / rate limit / model errorで失敗しても別modelや有料modelへfallbackしない。

#### OpenCode processの環境

fallback jobはGitHub Actionsの制約上`id-token: write`を持つが、OpenCode processは`env -i`相当の環境allowlistで起動する。

OpenCode processへ渡す環境は原則として次だけに限定する。

- `PATH`。
- `HOME`。値は`RUNNER_TEMP`配下の専用directory。
- `TMPDIR`。値は`RUNNER_TEMP`配下。
- `CI=true`。
- `OPENCODE_API_KEY`。
- `OPENCODE_CONFIG`。
- `OPENCODE_PERMISSION`。`.github/opencode/security-fallback.json`の`permission`をcompact JSONとして読み込み、固定Releaseのpermission merge後段でdeny-by-defaultを再適用する。
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`。
- `OPENCODE_PURE=1`。
- `OPENCODE_DISABLE_AUTOUPDATE=1`。
- `OPENCODE_DISABLE_LSP_DOWNLOAD=1`。
- `OPENCODE_DISABLE_SHARE=1`。

`GITHUB_TOKEN`、`GH_TOKEN`、`ACTIONS_ID_TOKEN_REQUEST_URL`、`ACTIONS_ID_TOKEN_REQUEST_TOKEN`、Cloudflare Secret、その他GitHub Actions credentialを継承させない。`OPENCODE_DISABLE_PROJECT_CONFIG=1`によりRepositoryの`opencode.json` / `.opencode`を読み込まず、`OPENCODE_PURE=1`により外部pluginを実行しない。固定binaryの自動更新も無効化する。

OpenCode stdout/stderrは`$RUNNER_TEMP/opencode.log`へredirectし、`cat`、Artifact upload、Step Summary転記を行わない。session sharingは`--share=false`と`OPENCODE_DISABLE_SHARE=1`の両方で無効化する。

#### permission

`.github/opencode/security-fallback.json`はV1 schemaを使い、wildcard denyを基点とする。

- Repository内read / glob / grepは許可するが`.git/**`と`.env*`はdenyする。
- editは`package.json`だけallowする。
- `pnpm-lock.yaml`のeditはallowしない。
- `bash`は全面denyする。command wildcard allowは一切作らない。
- `external_directory`、`webfetch`、`websearch`、`task`、`skill`、`question`、不要な機能はdenyする。

OpenCodeにdependency install、lockfile graph解析、lockfile生成、Git操作を行わせない。

### 方針6: package.jsonをsemantic diffで制限し、lockfileはworkflowが生成する

OpenCode終了直後、lockfile更新前に次を確認する。

1. working treeに変更がある。
2. この時点の変更ファイルは`package.json`だけである。
3. baseline `package.json`とcurrent `package.json`を`scripts/validate-security-dependency-fix.mjs`で比較する。

validatorは次をfail-closedで判定する。

- `scripts`、`packageManager`、name/version等のmetadata、`pnpm.packageExtensions`は変更不可。
- 無関係なdependencies / devDependencies / overridesは変更不可。
- 既存の無関係なoverrideを削除、変更、広域化できない。
- 変更方式は1回の実行につき次のいずれか1方式だけ。
  - 対象dependencyがroot direct dependencyなら、そのdependency specifierの更新。
  - baseline lockfile graphで対象dependencyへ到達するroot direct dependency 1件のversion更新。
  - 対象dependency自身、またはbaseline graphで確認できる`<immediate parent selector>><target dependency>`だけを対象にした`pnpm.overrides` 1件の追加 / 更新。
- graphでroot dependency、immediate parent、lockfile referenceを一意に確認できない差分は`needs_human`。

semantic guard通過後だけworkflow側で次を実行する。

- `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`。
- `pnpm install --frozen-lockfile --ignore-scripts`。

OpenCodeにlockfileを編集させないため、`pnpm-lock.yaml`の差分は固定pnpm resolverの出力として扱う。ただしresolver出力であることだけを理由に無関係なlockfile変更を許可しない。

validatorはbaseline / current lockfile graphを比較し、選択した修正方式ごとに変更可能なclosureを決める。

- 対象direct dependency更新: baseline / currentの対象dependency subtreeのunionだけを許可する。
- root direct parent更新: baseline / currentの選択したroot direct dependency subtreeのunionだけを許可する。
- parent-scoped override: baseline / currentの選択したimmediate parent subtreeとtarget dependency subtreeのunionだけを許可する。
- `importers['.']`の変更は、先にsemantic guardで許可したdependency specifier / overrideだけに限定する。
- 上記closure外の`packages` / `snapshots`追加・削除・version変更が1件でもあれば`needs_human`。peer suffix等を含むreferenceを安全に正規化できない場合も`needs_human`。

その後validatorはcurrent lockfile graphから対象dependencyのresolved versionをすべて抽出する。npm SemVer rangeの評価はexact devDependency `semver@7.8.5`の`satisfies()`へ委譲する。

- 対象dependencyのresolved versionが0件なら`needs_human`。
- versionまたはvulnerable rangeを`semver`が解釈できなければ`needs_human`。
- vulnerable rangeを満たすresolved versionが1件でも残れば`needs_human`。
- patched versionが存在しないAdvisoryを根拠なくoverrideで回避しない。

最後に`git diff --check`と`pnpm run verify`を実行する。model responseは成功判定に使用しない。

### 方針7: publish直前にbaseの陳腐化を確認し、OIDC tokenはpublish処理だけで使う

全検証PASS後、publish直前に`git fetch origin main`を行い、workflow開始時の`BASE_SHA`と`origin/main`を比較する。

- 同一ならpublishへ進む。
- 異なる場合は自動rebase / merge / OpenCode再実行を行わず`needs_human`。

GitHub App token取得は固定Releaseで確認した契約に合わせる。

1. audience `opencode-github-action`でOIDC ID tokenを取得する。
2. `https://api.opencode.ai/exchange_github_app_token`へBearer tokenとしてPOSTする。
3. responseの`token`だけをpublish処理の一時環境変数へ保持する。
4. tokenをlog、Summary、Artifact、OpenCode processへ出さない。
5. PATやwrite-enabled `GITHUB_TOKEN`へfallbackしない。

publish処理は次だけを行う。

- `security/<sanitized-dependency>/<github.run_id>`形式のbranchを作る。Alert番号はbranch名に使わない。
- Git identityを固定する。
- stage対象を`package.json`と`pnpm-lock.yaml`だけにする。
- commit messageを`[SECURITY] <dependency> <old> -> <new>`相当の固定形式から生成する。
- installation tokenを一時Git credentialとして使いpushする。tokenをremote URLへ埋め込まず、成功 / 失敗のどちらでもcredential設定を解除する。
- PR title / bodyをworkflow固定形式から生成して作成する。
- auto-mergeを設定しない。

PR bodyは`Security Update`、dependency名、old/new version、`pnpm run verify` PASS、manual review / merge要求だけを含める。

### 方針8: needs_human、publish失敗、再実行をfail-closedにする

正常終了は`fix PR created: <public PR URL>`だけとする。

既知の停止条件ではpublic outputを`needs_human`だけにし、workflowはfailureで終了する。private failure reason、Alert番号、prompt、model logはSummaryへ出さない。job logにはprivate payloadを含まない固定error code / step名だけを残してよい。

publish途中の失敗は次のように扱う。

- branch push前に失敗: `needs_human`。OpenCodeを自動再実行しない。
- push成功後にPR作成だけ失敗: remote branch / commitを残したまま`needs_human`。再dispatchして新しい修正を作らない。
- 人が再開する場合は既存branch、現在の`main`、Alert state、重複PRを確認し、安全なら既存branchからPRを作成する。
- Alertが`fixed` / `dismissed` / `auto_dismissed`なら新しいOpenCode実行を開始しない。
- OpenCode / provider errorがコード変更前に発生した場合だけ、人がfallback条件を再確認したうえで同じAlertを再dispatchできる。

初期実装では自動branch recovery、queue、自動retryを追加しない。

### 方針9: SECURITY.mdとRun Artifact契約を更新する

`SECURITY.md`へ次を追加する。

- Dependabot Alertsが脆弱性検知の正本であること。
- 未解決Alert番号、raw payload、actual exposure、private triageは公開しないこと。
- Security修正PRで公開してよい情報のallowlist。
- Renovate PRはauto-mergeしないこと。
- OpenCode fallbackは人がRenovateの正常処理とPR作成不能を確認した場合だけ起動すること。
- Alert番号をmodel / public PRへ転記しないこと。
- Bot PRではCloudflare Previewを実行しないこと。
- merge前にvulnerable range外を確認し、merge後にDependabot Alert `fixed`を確認すること。
- `dismissed` / `auto_dismissed`を修正成功扱いしないこと。

`docs/reference/run-artifacts.md`へ、自動`security-dependency-fallback.yml` runtimeだけの狭い例外を追加する。

- private Alert、prompt、model transcript、tokenを扱うためtracked Run Artifactを生成しない。
- `RUNNER_TEMP`のraw Security dataはGit管理しない。
- workflowの公開結果はPR URLまたは`needs_human`だけ。
- Issue #163の実装・レビュー・通常のRepository taskは従来どおりRun Artifact契約へ従う。

### 方針10: 外部App activationはRepository変更merge後に段階的に行う

#### Renovate activation

1. Repository側変更とcontract testをmergeする。
2. Owner権限でopen Dependabot Alert件数を取得し、`prConcurrentLimit`を確定する。値が未確定ならactivationしない。
3. Mend Renovate Appの要求権限、Repository scope、rollback planを確認する。
4. P-05に従い、現在のRuleset approval 0件を踏まえてAppをProductionまでtrustedとするかOwnerが明示判断する。
5. trustedでない場合はinstallせず、別L3変更で追加境界を実装するまで停止する。
6. Repository accessを`qa-training-store`だけに限定する。
7. Dependabot AlertsはONのまま、Dependabot Security UpdatesだけをOFFにする。
8. 直後にRenovateを有効化し、Mend側config validation / job logで設定受理とDependabot Alert読取を確認する。
9. 最初の実Security PRでnormal update混入、公開metadata、auto-merge、Bot Preview skip、`validate`を監査する。
10. 違反やservice/auth/config問題があればRenovateを停止し、Dependabot Security UpdatesをONへ戻す。

#### OpenCode App activation

1. OpenCode Appの要求権限、Repository scope、rollback planを確認する。
2. P-05に従い、ProductionまでtrustedとするかOwnerが明示判断する。trustedでなければ別L3境界ができるまでinstallしない。
3. Repository accessを`qa-training-store`だけに限定する。
4. `OPENCODE_API_KEY`をGitHub Secretへ登録し、Repositoryへ保存しない。
5. 固定Release `v1.18.31`、asset SHA-256、permission schema、OIDC audience / endpointを再確認する。
6. 実Alertを処理する前にGitHub App + OIDC token exchangeを実行し、取得したinstallation tokenで`GET /installation/repositories`を呼び、`qa-training-store`がaccess可能Repositoryとして含まれることを確認する。activation smokeではbranch、commit、PRを作成しない。
7. `OPENCODE_API_KEY` + 選択`-free` modelを`opencode/<selected_model_id>`形式で指定し、非対話実行できることを確認する。
8. fallback workflowは`workflow_dispatch`だけのままにする。
9. Renovateが正常処理したが安全なPRを作成できない実Alertが発生した場合だけfallbackを実行する。
10. 検証目的で脆弱dependencyを追加しない。

### 実行タスク

- [ ] 1. 実装開始時の`main`、Issue #163、CI、Ruleset、Security設定を再確認する。
- [ ] 2. `semver@7.8.5`のversion、ISC License、保守状況、既知脆弱性を再確認し、exact devDependencyとして追加する。
- [ ] 3. 既存`yaml@2.9.0`を使ってbaseline / current lockfile graph、`dependency_context`、package.json semantic diff、lockfile change closure、vulnerable rangeを扱う`scripts/validate-security-dependency-fix.mjs`とvalidator contract testを追加する。`pnpm why`は使用しない。
- [ ] 4. `.github/workflows/ci.yml`を`pull_request.user.type`基準のHuman / Bot / fork分類へ変更する。
- [ ] 5. `tests/contracts/ci-workflow.test.ts`を更新し、Expo maintenanceを含む全Bot PRでPreview skipを固定する。
- [ ] 6. Owner権限でopen Dependabot Alert件数を取得し、`prConcurrentLimit`を確定する。取得できない場合はRenovate live activationを止める。
- [ ] 7. `renovate.json`と`tests/contracts/renovate-config.test.ts`を追加する。
- [ ] 8. `docs/reference/run-artifacts.md`へSecurity fallback runtimeだけのtracked Run Artifact例外を追加する。
- [ ] 9. OpenCode `v1.18.31`のbinary digest、permission matcher、OIDC exchangeを再確認する。
- [ ] 10. `.github/opencode/security-fallback.json`を追加し、bash全面deny、editは`package.json`だけにする。
- [ ] 11. `.github/workflows/security-dependency-fallback.yml`を追加し、number input、concurrency、main-ref preflight、`github.sha`固定checkout、private Alert隔離、structured Advisory、重複PR確認を実装する。
- [ ] 12. baseline lockfileから`dependency_context`を生成し、公開Repository由来のdependency graph情報だけをOpenCode promptへ渡す。
- [ ] 13. fixed OpenCode binary、`OPENCODE_API_KEY`、`opencode/<selected_model_id>`形式のFree model、`env -i`相当の環境隔離、project config / external plugin / auto-update / LSP download / session share無効化、stdout/stderr隔離を実装する。
- [ ] 14. OpenCode実行後にsemantic package.json guard、workflow側lockfile生成、lockfile change closure、vulnerable range validator、`git diff --check`、`pnpm run verify`を実行する。
- [ ] 15. publish前に`BASE_SHA == origin/main`を確認する。
- [ ] 16. 検証成功後だけOIDCからOpenCode App tokenを取得し、固定branch / commit / PR metadataでpublishする。
- [ ] 17. `tests/contracts/security-dependency-fallback-workflow.test.ts`へtrigger、main-ref preflight、concurrency、permission、OpenCode config隔離、model引数、token境界、公開情報、failure契約を追加する。
- [ ] 18. `SECURITY.md`を更新する。
- [ ] 19. 対象contract test、validator test、`pnpm run verify`、`git diff --check`を実行する。
- [ ] 20. PR CIでsame-repo Human Preview success、same-repo Bot Preview skipped、fork Preview skippedを確認する。
- [ ] 21. Repository変更merge後、OwnerがApp権限、rollback plan、P-05 Production trustを承認した場合だけ外部App activationへ進む。
- [ ] 22. Renovateの最初の実Security PRを監査し、違反時は停止してDependabot Security UpdatesをONへ戻す。
- [ ] 23. OpenCode activation smokeでOIDC exchange + `GET /installation/repositories`、Zen Free model非対話実行を確認し、branch / PRを作らない。
- [ ] 24. 実fallback対象が発生した場合だけruntime確認する。
- [ ] 25. Security PR merge後に対象Dependabot Alertが`fixed`になったことを確認する。

## 6. 検証方法

### CI trust boundary

`tests/contracts/ci-workflow.test.ts`で次を確認する。

- same-repo Human PR: Preview successを要求する。
- same-repo Bot PR: login名に関係なくPreview skippedを要求する。
- Expo Dependency Maintenance相当の`github-actions[bot]`もBot分類へ入る。
- fork PR: Preview skipped。
- push / schedule / workflow_dispatch: Preview skipped。
- Cloudflare credential参照先が既存Preview / Production jobから増えていない。

### Renovate config

`tests/contracts/renovate-config.test.ts`で次を確認する。

- JSONとしてparse可能。
- Security-only presetを使う。
- `enabledManagers == ["npm"]`。
- `osvVulnerabilityAlerts == false`。
- `dependencyDashboard == false`。
- global / vulnerability alertのauto-mergeがfalse。
- normal package updateがdisabled。
- `vulnerabilityAlerts.enabled == true`。
- `vulnerabilityFixStrategy == "lowest"`。
- `prConcurrentLimit`が正の有限整数。
- PR metadata templateにAlert番号、severity、Advisory本文等を展開するfieldがない。

Mend側ではconfig validation / job logで設定受理を確認する。完全なpublish前PR renderは必須にしない。

### validator

`tests/contracts/security-dependency-fix-validator.test.ts`で少なくとも次を確認する。

- 対象direct dependency 1件のversion変更を許可する。
- baseline lockfile graphで対象dependencyへ到達するroot direct dependency 1件のversion変更を許可する。
- baseline graphで確認できるimmediate parent selectorを使ったparent-scoped override追加 / 更新を許可する。
- 10経路を超えて対象dependencyへ到達するfixtureでも全root parent / immediate parentを列挙でき、`pnpm why`のようにtruncateしない。
- 選択したbaseline / current dependency closure外の`packages` / `snapshots`変更を拒否する。
- peer suffix等のlockfile referenceを安全に解決できない場合は拒否する。
- `scripts`変更を拒否する。
- `packageManager`変更を拒否する。
- 無関係なdependency変更を拒否する。
- 既存の無関係なoverride削除 / 変更を拒否する。
- 複数方式を同時に使う差分を拒否する。
- 対象dependency resolved version 0件を拒否する。
- invalid SemVer / invalid vulnerable rangeを拒否する。
- vulnerable rangeに残るversionが1件でもあれば拒否する。
- 全resolved versionがrange外ならPASSする。

fixtureは公開情報だけで構成し、実Alert payloadをcommitしない。

### OpenCode workflow contract

`tests/contracts/security-dependency-fallback-workflow.test.ts`で次を固定する。

- triggerが`workflow_dispatch`だけ。
- `alert_number`がrequired number input。
- Secretを参照しないpreflightが`github.ref == 'refs/heads/main'`を検証し、main以外ではfallback jobへ進まない。
- Alert番号を含む`concurrency.group`があり`cancel-in-progress: false`。
- preflight jobは`id-token: write`を持たず、fallback jobのpermissionsは`contents: read`、`pull-requests: read`、`vulnerability-alerts: read`、`id-token: write`以外の不要なwrite permissionを持たない。
- checkoutが`persist-credentials: false`かつ`ref: ${{ github.sha }}`で、`BASE_SHA=$GITHUB_SHA`を固定する。
- Node 24 / pnpm 9.10.0を使い、初期installが`--frozen-lockfile --ignore-scripts`。
- stock OpenCode Actionと`opencode github run`を使用しない。
- fixed Release URL、version、asset、SHA-256がある。
- checksum検証前にbinaryを実行しない。
- `OPENCODE_API_KEY`をOpenCode stepだけで参照する。
- Free model判定が`-free` suffixだけ。
- 選択model IDを`opencode/<selected_model_id>`として`--model`へ渡す。
- model候補0件でpublishへ進まない。
- `--share=false`と`OPENCODE_DISABLE_SHARE=1`。
- OpenCode processが環境allowlistで起動され、`GITHUB_TOKEN` / `GH_TOKEN` / OIDC request envを継承しない。
- `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_DISABLE_AUTOUPDATE=1`、`OPENCODE_DISABLE_LSP_DOWNLOAD=1`を設定し、`OPENCODE_PERMISSION`でdeny-by-default permissionを最終固定する。
- OpenCode stdout/stderrをtempへredirectし、cat / artifact uploadしない。
- Alert番号、raw Alert JSON、Advisory自由文をmodel promptへ渡さない。
- promptで`AGENTS.md`、repair-loop Skill、P-13をreadするよう要求する。
- OpenCode permissionでbashが全面deny。
- edit allowは`package.json`だけ。
- `pnpm-lock.yaml`はworkflow側が生成する。
- baseline lockfile graphから`dependency_context`を生成し、`pnpm why`を使用しない。
- publish前にsemantic validator、lockfile change closure、vulnerable range validator、`pnpm run verify`、`git diff --check`を要求する。
- publish前に`BASE_SHA`と`origin/main`を比較する。
- OIDC audience / exchange endpointが固定Release契約と一致する。
- PAT / write-enabled `GITHUB_TOKEN` fallbackがない。
- branch / commit / PR metadataがworkflow固定でAlert番号やmodel outputを参照しない。
- auto-merge設定がない。
- `needs_human`経路がfailureで終了し、private dataをSummaryへ書かない。

### fallback失敗系

実脆弱dependencyを追加せずsynthetic fixtureまたは安全なruntime条件で確認する。

- Alert not found / closed / non-npm / 対象外manifest -> `needs_human`。
- duplicate / ambiguous PR -> `needs_human`。
- Free model 0件 -> `needs_human`。
- missing / invalid Zen API key -> fallbackを有効化しない、またはruntimeでは`needs_human`。
- non-main refでmanual dispatch -> Secret参照 / checkout / dependency install / OpenCode実行前にpreflight failure。
- OpenCode checksum mismatch -> `needs_human`。
- OpenCodeが`package.json`以外を変更しようとする -> permissionでdeny。
- package.json semantic guard failure -> publishしない。
- lockfile生成 failure -> publishしない。
- lockfile change closure外の変更 -> publishしない。
- lockfile graph referenceを安全に解決できない -> publishしない。
- vulnerable version残存 -> publishしない。
- `pnpm run verify` failure -> publishしない。
- `origin/main`更新 -> auto-rebaseせずpublishしない。
- OIDC exchange failure -> PAT / GITHUB_TOKENへfallbackしない。
- push後PR作成失敗 -> existing branchを残して`needs_human`、OpenCode自動再実行なし。

### Repository標準検証

- `pnpm exec vitest run tests/contracts/ci-workflow.test.ts tests/contracts/renovate-config.test.ts tests/contracts/security-dependency-fallback-workflow.test.ts tests/contracts/security-dependency-fix-validator.test.ts --no-file-parallelism --maxWorkers=1`。
- `pnpm run test:contracts`。
- `pnpm run verify`。
- `git diff --check`。

### activation後の実地確認

- Human PRでPreviewが従来どおり成功する。
- Bot PRでPreviewがskipされる。
- Renovateがnormal dependency updateを作成しない。
- 最初のRenovate Security PRが公開情報allowlist、auto-merge off、CI契約を満たす。
- OpenCode activation smokeでOIDC exchange後のinstallation tokenが`GET /installation/repositories`で`qa-training-store`へアクセスでき、`opencode/<selected_model_id>`指定のZen Free model非対話実行が成立する。activation smokeではbranch / PRを作成しない。
- fallbackは人間がRenovate job log等で条件を確認した実Alertだけに対して手動実行する。
- fallback PRが`package.json` / `pnpm-lock.yaml`以外を変更しない。
- fallback PR本文、branch、commitにAlert番号やmodel responseがない。
- merge前に対象dependencyがvulnerable range外。
- merge後に元Alertが`fixed`。`dismissed` / `auto_dismissed`なら未完了。

## 7. リスクと未解決論点

### リスク

1. **全Bot Preview除外でExpo maintenance PRもPreviewされなくなる**
   - 本PlanではSecret境界をlogin固有判定から外すための意図したpolicy変更として採用する。
   - CI本体、Dependency Review、`verify`、`validate`は維持する。

2. **write-capable GitHub Appは現在のRulesetではProductionまで到達し得る**
   - `required_approving_review_count: 0`のため、Preview skipだけではProduction trust boundaryにならない。
   - OwnerがProductionまでtrustedと判断できないAppはactivationしない。Issue #163内でapproval数等を勝手に変更しない。

3. **Mend Renovate Community Cloud Appの権限が広い**
   - OwnerがInstall画面、Repository scope、rollback planを確認する。

4. **Hosted Renovateの最終PR renderはRepository testだけでは完全再現できない**
   - 完全なpublish前renderを要求せず、config validationと最初の実Security PR監査で補う。

5. **OpenCode jobが`id-token: write`を持つ**
   - GitHub Actionsはstep単位permissionを提供しないため、OpenCode processを`env -i`相当で隔離しOIDC request envを渡さない。

6. **OpenCodeのファイルpermissionだけではpackage.json内部の不正変更を防げない**
   - workflow側semantic validatorでdependency修正に必要なfield以外を拒否する。

7. **OpenCode bash permissionのwildcardはshell chainingへ広がり得る**
   - agentのbashを全面denyし、必要commandはworkflow側だけで実行する。

8. **Free model一覧と外部providerは変化する**
   - 実行時に`-free`だけを選び、0件 / provider errorでは有料modelへfallbackしない。

9. **private Alert情報のlog漏えい**
   - raw Alert、prompt、baseline lockfile、`dependency_context`、model logは`RUNNER_TEMP`だけに置き、Summary / Artifact / tracked Runへ出さない。

10. **main更新後に古いbaseの検証結果でpublishする可能性**
    - publish直前に`BASE_SHA == origin/main`を要求し、違えば`needs_human`。

11. **Security Advisory自由文によるprompt injection**
    - 初期実装では自由文をpromptへ渡さず、構造化fieldだけを利用する。

12. **package managerによるlockfile差分が想定より広い**
    - OpenCodeにlockfileを直接編集させず固定pnpmで生成する。baseline / current graphの選択対象closure外の`packages` / `snapshots`差分はvalidatorで拒否し、referenceを安全に解決できない場合は`needs_human`とする。

13. **Repository側OpenCode設定やpluginがSecurity runtimeへ混入する**
    - `OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_PURE=1`、`OPENCODE_PERMISSION`でRepository側config / pluginによるpermission拡張を防ぐ。auto-update、LSP download、session shareも無効化する。

14. **main以外のrefからmanual dispatchされる**
    - Secretを参照しないpreflightで`refs/heads/main`以外をfailureにし、checkout / OpenCode実行前に停止する。

15. **publish途中失敗でremote branchだけ残る**
    - 自動retryせず`needs_human`。人が既存branchを確認して再利用する。

### activation前に残る確認

- open Dependabot Alert件数と`prConcurrentLimit`の具体値。
- 導入時点のMend Renovate App / OpenCode Appの要求権限。
- 各Appを現在のRuleset下でProductionまでtrustedとできるかのOwner判断。
- 実`OPENCODE_API_KEY` + Free modelの疎通。
- OpenCode App OIDC exchangeの疎通。

これらはRepository側実装を止めないが、live activationを止める条件である。

## 8. 成果物

### 今回作成する成果物

- branch: `issue-163-renovate-opencode-security-fallback`。
- Plan: `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`。

### 実装時の変更予定ファイル

- `renovate.json`。
- `.github/workflows/security-dependency-fallback.yml`。
- `.github/opencode/security-fallback.json`。
- `.github/workflows/ci.yml`。
- `SECURITY.md`。
- `docs/reference/run-artifacts.md`。
- `scripts/validate-security-dependency-fix.mjs`。
- `package.json`。
- `pnpm-lock.yaml`。
- `tests/contracts/ci-workflow.test.ts`。
- `tests/contracts/renovate-config.test.ts`。
- `tests/contracts/security-dependency-fallback-workflow.test.ts`。
- `tests/contracts/security-dependency-fix-validator.test.ts`。

新規runtime dependencyは追加しない。validator用devDependencyとして`semver@7.8.5`だけを追加する。

### Run Artifact

Issue #163の通常の実装作業は既存のRun Artifact契約に従う。

一方、実Alertを処理する自動`security-dependency-fallback.yml` runtimeは、private Alert情報をtracked artifactへ保存しないための狭い例外としてRun Artifactを生成しない。この例外を`docs/reference/run-artifacts.md`へ明記し、実装者判断で黙って省略しない。

## 9. 備考

- Dependabot Alertsを停止しない。
- Dependabot Security UpdatesをOFFにするのはRepository変更がmergeされ、Renovate activation直前のOwner操作時だけ。
- Renovate / OpenCode App installとGitHub Secret登録はRepository実装とは別のL3 / credential操作として扱う。
- Bot Preview除外だけでwrite-capable AppとProduction credentialが分離されたとは扱わない。
- 外部App有効化後に公開情報、permission、Secret境界の違反を確認した場合は対象Appを停止する。Renovate停止時はDependabot Security UpdatesをONへ戻す。
- 実装中にIssueの前提と異なる公式仕様、App権限、OpenCode Release契約が確認された場合は互換性を推測で埋めずactivationを止めてPlanを更新する。

### 実装時に再確認する公式資料

- Renovate Security Preset: https://docs.renovatebot.com/presets-security/
- Renovate `vulnerabilityAlerts`: https://docs.renovatebot.com/configuration-options/#vulnerabilityalerts
- Renovate Security and Permissions: https://docs.renovatebot.com/security-and-permissions/
- Mend Renovate Community Cloud: https://docs.renovatebot.com/mend-hosted/overview/
- Renovate npm manager: https://docs.renovatebot.com/modules/manager/npm/
- GitHub Dependabot Alerts REST API: https://docs.github.com/en/rest/dependabot/alerts
- GitHub Actions OIDC: https://docs.github.com/en/actions/concepts/security/openid-connect
- pnpm why 9.x: https://pnpm.io/9.x/cli/why
- npm semver: https://www.npmjs.com/package/semver
- OpenCode Zen: https://opencode.ai/docs/zen
- OpenCode Release `v1.18.31`: https://github.com/anomalyco/opencode/releases/tag/v1.18.31
- OpenCode immutable OIDC subject fix: https://github.com/anomalyco/opencode/pull/44776
