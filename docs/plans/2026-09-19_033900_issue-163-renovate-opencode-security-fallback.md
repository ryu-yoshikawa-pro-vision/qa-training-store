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

Dependabot Alertsを脆弱性検知の正本として残し、次の2段階だけで依存関係のSecurity修正を扱う。

1. Renovateが対象Alertに対して、通常の依存更新を行わず、最小の安全な依存更新PRを作成する。
2. RenovateがAlertを処理したものの安全なPRを作成できなかった場合に限り、人間が`workflow_dispatch`でOpenCode fallbackを起動する。

どちらの経路でもauto-mergeせず、Cloudflare SecretへBot PRを到達させず、未解決の脆弱性情報やモデル出力を公開しない。

### 完了条件（DoD）

- Dependabot Alertsは有効のまま維持する。
- Dependabot Security UpdatesはRepository側の変更がmergeされるまで維持し、Renovateを有効化する直前に無効化する。
- `renovate.json`でSecurity修正だけを有効化し、通常の依存更新、OSV vulnerability alerts、Dependency Dashboard、auto-mergeを無効化する。
- Renovateの対象managerを`npm`に限定し、rootの`package.json` / `pnpm-lock.yaml`とpnpm 9.10.0の既存契約を維持する。
- `vulnerabilityAlerts.prConcurrentLimit`は0以外の有限値にし、実装開始時のopen Dependabot Alert件数をOwner権限で確認してから具体値を決める。件数を取得できない場合は値を推測して有効化しない。
- Renovateの公開PR情報は、依存名、version差分、`Security Update`、CI確認に必要な最小情報へ限定する。Alert番号、非公開の影響評価、実環境での露出状況、private triage情報を含めない。
- `.github/workflows/ci.yml`のPreview判定を特定Bot login依存から`pull_request.user.type == 'Bot'`を基準とする判定へ変更し、同一Repository由来の全Bot PRで`deploy-preview`をskipする。
- Humanの同一Repository PRは従来どおりCloudflare Previewを必須とし、fork PRも従来どおりPreviewをskipする。
- 既存のExpo Dependency Maintenanceが作る`github-actions[bot]` PRも新しいBot判定の対象となり、Previewをskipした上で`validate`が成功できる。
- OpenCode fallbackは`workflow_dispatch`のみで起動し、scheduleを追加しない。
- OpenCodeには、公開Repositoryの内容と公開Security Advisoryから再構成できる情報だけを渡す。Dependabot Alert番号、Alert状態、private triage、実環境での影響判断、Secretは渡さない。
- OpenCodeは固定Releaseの公式binaryをSHA-256検証後に実行する。stockの`anomalyco/opencode/github` Actionと`opencode github run`は使用しない。
- OpenCodeは`opencode run`でworktreeだけを編集し、branch作成、commit、push、PR作成を行わない。
- OpenCodeのpermissionはdeny-by-defaultとし、編集可能なファイルを`package.json`と`pnpm-lock.yaml`だけに限定する。Git操作、`gh`、環境変数列挙、任意shell、不要なWebアクセスを禁止する。
- OpenCode実行時のstdout/stderrは`RUNNER_TEMP`配下だけに保存し、Actions log、Step Summary、Artifact、PR本文へ転記しない。
- OpenCodeのsession sharingを無効化する。
- OpenCode実行前にはGitHub書き込みtokenを渡さない。変更検証が完了した最終publish stepだけでOIDCをOpenCode GitHub App installation tokenへ交換する。
- publish stepで作るbranch、commit、PRタイトル、PR本文はworkflow側の固定形式とし、モデル出力を使用しない。
- workflow最上位のGitHub権限はread中心とし、`contents: read`、`pull-requests: read`、`vulnerability-alerts: read`、`id-token: write`を超える権限を常時付与しない。
- fallbackの結果は「fix PR created」または`needs_human`の2種類に限定する。自動queue、複雑なretry、branch recoveryは追加しない。
- `SECURITY.md`で、未解決の脆弱性詳細はprivateに扱う一方、修正PRに必要な依存名、version差分、Security Updateであること、CI結果は公開可能であることを明記する。
- Renovate / OpenCode GitHub Appの導入と権限承認はRepository変更と分離し、Ownerが実際のInstall画面・要求権限・対象Repositoryを確認して承認した場合だけ有効化する。
- 外部App有効化後に公開情報またはSecret境界の違反を確認した場合は、対象Appを停止し、Dependabot Security Updatesを再度有効にできる。
- 関連contract test、`pnpm run verify`、`git diff --check`、PR CIがPASSする。

## 2. 現状理解と前提

### 現状理解

- `package.json`は`packageManager: pnpm@9.10.0`を使用している。
- `package.json`には既存の`pnpm.overrides`があり、依存関係のSecurity修正で必要な場合は既存の仕組みとして更新対象になり得る。新しい独自override機構は不要。
- `scripts/security-static-check.ts`はcredentialやruntime上の禁止パターンを確認するRepository固有の静的検査であり、依存脆弱性scannerではない。Issue #163の脆弱性検知をこのscriptへ移さない。
- 現在の`.github/workflows/ci.yml`は、`deploy-preview`で`dependabot[bot]`だけを除外している。同一Repository由来の他Bot PRは`verify`成功後にCloudflare Secretを使用するPreview経路へ進める。
- 現在の`validate`も`dependabot[bot]`だけを特別扱いしており、Bot全体のSecret境界とは一致していない。
- `.github/workflows/expo-dependency-maintenance.yml`は同一Repositoryにautomation branchを作り、`github-actions[bot]`としてPRを作成する。Bot全体をPreview対象外にすると、この既存PRもPreviewをskipする動作へ変わる。
- `tests/contracts/ci-workflow.test.ts`はCloudflare credential境界、Preview/validate分類、remote Actionのfull SHA pinningを契約として検証している。新しいBot分類はこのtestを更新して固定する。
- `SECURITY.md`は現在、疑わしい脆弱性をpublicに投稿しない方針を持つ。Issue #163では未解決情報を非公開に保ちつつ、修正PRの最小情報だけを公開できるよう境界を具体化する必要がある。
- 既存Plan `docs/plans/2026-08-16_162000_public-repository-hardening.md`の「Renovateを導入しない」というP-01判断は、Issue #163のSecurity-only Renovate導入に限って更新される。他の公開Repository hardening方針は維持する。
- 同PlanのDependabot Security Updates継続方針は、Renovate有効化直前まで維持する。
- OpenCode公式Release `v1.18.31`は2026-09-14公開で、tagはcommit `014614d35b397775e5d397a490fc72368c894ec2`を指す。
- `v1.18.31`のLinux x64 asset `opencode-linux-x64.tar.gz`のRelease digestは`sha256:e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`。
- OpenCode PR #44776 `fix(github): support immutable OIDC subjects`は2026-08-24に`dev`へmergeされ、merge commit `f4019cab3eb832108f337caaf55d51a9ab7dd860`は`v1.18.31` tagの祖先である。固定候補ReleaseはIssueのimmutable OIDC subject要件を満たす。
- `v1.18.31`のV1 permission schemaは`permission`配下で`read`、`edit`、`glob`、`grep`、`bash`、`external_directory`、`webfetch`、`websearch`などを制御する。現行V2ドキュメントの別名をそのまま使わない。
- `v1.18.31`の`opencode run`は`--model`、`--share`を受け取り、stdinからpromptを渡せる。
- `v1.18.31`の`opencode` providerは認証情報がない場合に有料modelを除外し、cost 0のmodelだけをpublic accessで利用する実装を持つ。fallbackで推論用API Secretを追加しない。
- OpenCode Zenは公開model一覧を`https://opencode.ai/zen/v1/models`から取得できる。fallbackでは実行時にID末尾が`-free`のmodelだけを候補にする。
- OpenCode `v1.18.31`のGitHub Action実装は、audience `opencode-github-action`でGitHub OIDC tokenを取得し、`https://api.opencode.ai/exchange_github_app_token`へBearer tokenとしてPOSTし、`{ "token": "..." }`を受け取る。fallbackのpublish stepはこの固定Releaseの契約だけを再利用する。
- 接続中のGitHub操作ではDependabot Alerts APIを直接取得できなかったため、現時点のopen Alert件数は未確認。Plan上で数値を推測しない。
- Mend Renovate Community Cloud GitHub AppはRepository contentsだけでなく、checks、statuses、issues、pull requests、workflowsなどへのwrite権限を要求するため、単なる設定ファイル追加より大きなtrust decisionになる。

### 前提

- Dependabot Alertsが脆弱性検知の正本であり続ける。
- RenovateはSecurity修正だけを行い、通常のversion update機能としては使用しない。
- Renovateの`security:only-security-updates` presetは`config:recommended`を継承し、OSV vulnerability alertsも有効にするため、Issue #163で禁止する機能はRepository側設定で明示的に上書きする。
- OpenCode fallbackを起動する前に、「Renovateが対象Alertを処理したが、安全なPRを作成できなかった」ことを人間が確認する。Community Cloud内部状態をworkflowから推測して自動判定しない。
- OpenCode modelの選択は実行時の公開model一覧を使い、`-free` suffixだけを候補にして辞書順で1件選ぶ。候補がない場合は`needs_human`で終了する。
- GitHub ActionsのBot判定はlogin名ではなくevent payloadの`pull_request.user.type`を使用する。特定のRenovate/OpenCode login名を推測してhardcodeしない。
- fallbackで扱うDependabot Alertのprivate JSONは`RUNNER_TEMP`だけに置き、必要な公開情報へ変換後はモデルpromptや公開出力へ渡さない。
- 実装作業中の通常のRun Artifactには、設定差分、synthetic fixture、公開情報を使った検証結果だけを記録し、実Alert番号やprivate Alert payloadを保存しない。

### 対象外

- Dependabot Alertsの停止。
- Renovateによる通常のdependency update。
- Renovate Dependency Dashboard。
- Renovate / OpenCodeによるauto-merge。
- OpenCode fallbackのschedule実行。
- OSVを別scannerとして追加すること。
- Secret scan、malware scan、CodeQL Alert修正まで同じworkflowへ拡張すること。
- Alertの自動dismissやstate変更。
- OpenCodeにGit操作、branch作成、commit、push、PR作成を任せること。
- OpenCodeのmodel responseをPR本文やGitHub Actions Artifactとして公開すること。
- 脆弱なdependencyを意図的に追加して本番相当Alertを発生させる検証。
- 自動queue、長期retry、複雑なbranch recovery。
- 既存`scripts/security-static-check.ts`を依存脆弱性scannerへ変更すること。

## 3. 質問 / 曖昧性

### Plan作成を止める質問

- なし。Repository変更のPlanは作成できる。
- 外部AppのinstallやRenovate有効化はOwner承認が必要なため、実装後のactivation段階で停止条件を設ける。

### 実装時に解消必須の不透明点

1. **open Dependabot Alert件数**
   - 現時点では取得できていない。
   - 実装開始時にOwner権限でDependabot Alertsのopen件数を取得する。
   - 取得した件数を基に、`vulnerabilityAlerts.prConcurrentLimit`へ0以外の有限値を設定する。
   - 件数を確認できなければRenovateのlive activationへ進まない。

2. **Mend Renovate Community Cloudが最終的に公開するPR文字列**
   - Repository側で`prBodyTemplate`、branch、commit/PR titleに使用する要素を最小化してcontract testで固定する。
   - それでもHosted runtimeによる最終renderをRepository testだけで完全には保証できない。
   - Mend側にpublishなしで確認できるvalidation / dry-run手段があれば、activation前に実Alertを公開せずrender結果を確認する。
   - publish前確認手段がない場合は、Issueの「公開文字列を事前確認する」条件を満たせないため、その時点でOwnerへ事実を提示し、Renovateの有効化を止める。公開PRを試験目的で作って条件を回避しない。

3. **外部GitHub Appの実際の要求権限**
   - Mend Renovate App、OpenCode GitHub Appとも、導入時点のInstall画面と公式権限一覧をOwnerが確認する。
   - Repository選択は`qa-training-store`だけに限定する。
   - 想定より広い権限が必要になった場合はinstallせず、Plan更新または別方式の検討へ戻る。

### 仮定してよい細部

- OpenCode binaryは実装時点で`v1.18.31`を固定候補とする。Issue実装までに重大なSecurity問題が判明した場合だけ、immutable OIDC subject fixを含む別の固定Releaseへ更新し、asset digestも同時に固定する。
- `ubuntu-latest`の`RUNNER_ARCH`が`X64`のときだけ上記assetを使う。それ以外は別assetを推測せず`needs_human`にする。
- OpenCode GitHub App token交換は`v1.18.31`で確認したOIDC audience / endpoint / response contractを使用する。upstream contractが変わった場合はPATや`GITHUB_TOKEN` write権限へfallbackせず`needs_human`にする。

## 4. 影響範囲

### 変更予定ファイル

- `renovate.json`
  - Security-only Renovate設定を追加する。
- `.github/workflows/security-dependency-fallback.yml`
  - 手動OpenCode fallback workflowを追加する。
- `.github/opencode/security-fallback.json`
  - OpenCode `v1.18.31`用のdeny-by-default permission設定を追加する。
- `.github/workflows/ci.yml`
  - Preview / validateのBot trust boundaryをlogin固有判定からuser type判定へ変更する。
- `SECURITY.md`
  - 未解決脆弱性情報とSecurity修正PRで公開可能な最小情報の境界を追記する。
- `tests/contracts/ci-workflow.test.ts`
  - Human / Bot / forkのPreview分類を新しい契約へ更新する。
- `tests/contracts/renovate-config.test.ts`
  - Security-only Renovate設定と禁止事項を固定する。
- `tests/contracts/security-dependency-fallback-workflow.test.ts`
  - fallback workflow、OpenCode pinning、permission、Secret/output境界を固定する。

### 確認対象だが原則変更しないファイル

- `package.json`
  - pnpm 9.10.0と既存script / overridesの確認だけに使用する。
- `pnpm-lock.yaml`
  - Issue #163の仕組み導入自体では更新しない。実際のSecurity fix PRだけが更新対象になり得る。
- `scripts/security-static-check.ts`
  - scannerへ拡張しない。
- `.github/workflows/expo-dependency-maintenance.yml`
  - PR authorがBotである既存経路としてCI分類の影響を確認する。Previewをskipするためのworkflow側変更は不要。
- `docs/plans/2026-08-16_162000_public-repository-hardening.md`
  - 過去Planを書き換えない。Issue #163のPlanがRenovate Security-only導入の新しい判断として残る。

### 外部設定

- GitHub Dependabot Security Updates。
- Mend Renovate Community Cloud GitHub App。
- OpenCode GitHub App。
- GitHub AppのRepository selectionとpermissions。

Repository側の実装と外部App activationを同じ操作として扱わない。

## 5. 変更方針

### 方針1: Cloudflare Previewのtrust boundaryを全Botへ広げる

`.github/workflows/ci.yml`の`deploy-preview`は、次をすべて満たす場合だけ実行する。

- eventが`pull_request`。
- head Repositoryが同一Repository。
- PR authorの`user.type`が`Bot`ではない。
- `verify`と`build-automation`が成功している。

`validate`も同じ分類基準を使用する。

- 同一Repository + Human: `deploy-preview == success`を要求する。
- 同一Repository + Bot: `deploy-preview == skipped`を要求する。
- fork: `deploy-preview == skipped`を要求する。
- push / schedule / workflow_dispatch: 従来どおり`deploy-preview == skipped`を要求する。

これによりDependabot、Expo Dependency Maintenance、Renovate、OpenCodeなどのBot PRをCloudflare credential境界の外へ置く。特定login名を増やす方式は採用しない。

`tests/contracts/ci-workflow.test.ts`では少なくとも次を固定する。

- `PR_AUTHOR_TYPE: ${{ github.event.pull_request.user.type }}`を判定へ使用する。
- `dependabot[bot]`という文字列へのSecret境界依存を削除する。
- 同一Repository HumanだけがPreview必須である。
- 同一Repository Botはlogin名に関係なくPreview skipで`validate`成功条件に入る。
- forkはPreview skipを維持する。
- Cloudflare Secretが`deploy-preview` / `deploy-production`以外へ増えていない。

### 方針2: Renovateは明示的なSecurity-only設定にする

`renovate.json`は`security:only-security-updates`を基準にするが、presetの継承へ重要な禁止事項を任せない。

設定する契約は次とする。

- `extends: ["security:only-security-updates"]`
- `enabledManagers: ["npm"]`
- `osvVulnerabilityAlerts: false`
- `dependencyDashboard: false`
- global `automerge: false`
- 通常updateを明示的に無効化する`packageRules`
- `vulnerabilityAlerts.enabled: true`
- `vulnerabilityAlerts.automerge: false`
- `vulnerabilityAlerts.vulnerabilityFixStrategy: "lowest"`
- `vulnerabilityAlerts.prConcurrentLimit: <実装時に確定する有限値>`

通常update無効化はpreset任せにせず、`matchPackageNames: ["*"]`と`enabled: false`を持つpackage ruleでも固定する。Security alert側は`vulnerabilityAlerts.enabled: true`で再度有効化する。

公開PR metadataは設定で最小化する。

- branch topicはdependency名とSecurity修正であることだけで構成する。
- commit / PR titleはdependency名、version update、`[SECURITY]`程度に限定する。
- `prBodyTemplate`は固定文面と次の情報だけを使う。
  - `Security Update`
  - dependency名
  - 更新前version
  - 更新後version
  - CIを確認して手動mergeすること
- Advisory本文、severity、Alert番号、actual exposure、private triage、Renovate内部解析結果をPR本文へ展開しない。
- Changelogなど追加の公開情報を自動で本文へ展開しない。

`tests/contracts/renovate-config.test.ts`では、次を検証する。

- `npm`以外のmanagerが有効化されていない。
- OSV、Dashboard、auto-merge、通常updateが無効。
- `vulnerabilityAlerts`だけが有効。
- fix strategyが`lowest`。
- `prConcurrentLimit`が0ではなく正の有限整数。
- 公開templateにAlert番号やprivate triageを出力するfieldがない。
- Repositoryのpackage manager契約を変更する設定がない。

### 方針3: OpenCode fallbackはAlertのprivate情報をモデル入力へ持ち込まない

新規workflow `.github/workflows/security-dependency-fallback.yml`は`workflow_dispatch`だけを持ち、必須inputとしてDependabot Alert番号を受ける。

workflow最上位permissionsは次に限定する。

- `contents: read`
- `pull-requests: read`
- `vulnerability-alerts: read`
- `id-token: write`

初期stepではwrite tokenを取得しない。

#### 3-1. Alertをprivate tempへ取得して対象を検証する

- `github.token`のread権限で指定Alertを取得し、responseは`$RUNNER_TEMP/dependabot-alert.json`へ直接保存する。
- response bodyをstdoutへ出さない。
- `set -x`を使用しない。
- 次を満たさない場合は`needs_human`で終了する。
  - Alertが存在する。
  - stateが`open`。
  - ecosystemが`npm`。
  - manifestがIssue #163の対象範囲内。
  - dependency名が取得できる。
- Alert番号、state、private payload pathを後続model stepのenvへ渡さない。

#### 3-2. 公開Advisoryだけをmodel contextへ変換する

- private Alertから公開GHSA identifierとdependency名だけを取り出す。
- GHSA identifierを使ってGitHub Global Security Advisoryの公開情報を別temp fileへ取得する。
- model promptには、公開Advisoryから取得した説明・影響version・patched version等と、公開Repositoryを読んで修正する指示だけを含める。
- 「このRepositoryが実際に影響を受けている」「本番で露出している」などprivate Alert由来の評価をpromptへ含めない。
- prompt file自体も`RUNNER_TEMP`に置き、Artifactへuploadしない。

#### 3-3. 重複PRをfail-closedで確認する

OpenCode実行前にopen PRをread-onlyで確認する。

- 対象dependencyのSecurity修正と明確に判断できるopen PRがある場合は`needs_human`。
- `package.json` / `pnpm-lock.yaml`を変更しているPRとの重複が曖昧な場合も`needs_human`。
- 「重複でない」と安全に判断できる場合だけmodel実行へ進む。

Renovateが処理に失敗した事実はworkflow内で推測しない。dispatchする人が事前確認する運用契約として`SECURITY.md`またはworkflowのinput descriptionに明記する。

### 方針4: OpenCode binaryとmodelを実行時にfail-closedで決める

#### 4-1. binary

初期固定値は次とする。

- Release: `v1.18.31`
- asset: `opencode-linux-x64.tar.gz`
- SHA-256: `e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4`

実行条件:

- `RUNNER_ARCH == X64`を確認する。
- GitHub Releaseの固定version URLからassetを`RUNNER_TEMP`へdownloadする。
- extract前にSHA-256を完全一致で検証する。
- checksum不一致、download失敗、arch不一致では`needs_human`。
- install script、`latest` URL、stock GitHub Actionを使用しない。
- 実行前にbinary versionが期待値と一致することを確認する。

#### 4-2. model

- `https://opencode.ai/zen/v1/models`をmodel実行直前に取得する。
- JSONの`data[].id`から文字列かつ`-free`で終わるIDだけを抽出する。
- 候補を辞書順でsortし、先頭1件を選択する。
- 0件なら`needs_human`。
- 公開logへ出してよいmodel情報は選択したmodel IDだけとする。
- API key、Zen tokenなど推論用Secretを追加しない。

### 方針5: OpenCode permissionをV1 schemaでdeny-by-defaultにする

`.github/opencode/security-fallback.json`は`v1.18.31`のV1 `permission` schemaに合わせる。

原則:

- 最初にwildcard denyを置く。
- Repository内のread / glob / grepは許可するが、`.git/**`と`.env*`はread禁止にする。
- editは`package.json`と`pnpm-lock.yaml`だけallowする。
- `external_directory`はdeny。
- `webfetch` / `websearch`はdeny。
- `question`、`task`、`skill`などfallbackに不要な機能はdeny。
- `bash`はwildcard denyを基本にし、dependency調査・lockfile更新に必要なコマンドだけallowする。
- `git`、`gh`、`env`、`printenv`、`curl`、任意`node`実行をallowしない。
- lifecycle scriptを実行するdependency installをallowしない。

初期のallow候補は次の範囲にする。

- `pnpm why <dependency>`
- `pnpm list <dependency> ...`
- `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`

実装時はOpenCode permission matcherの実際のpattern評価を`v1.18.31` source / local smokeで確認し、上記より広いpatternへ緩和しない。必要commandが安全に表現できない場合は`needs_human`として停止する。

OpenCodeの起動は概念上次の経路にする。

`OPENCODE_CONFIG=.github/opencode/security-fallback.json opencode run --share=false --model "opencode/<selected-free-model>" < "$RUNNER_TEMP/prompt.txt" > "$RUNNER_TEMP/opencode.log" 2>&1`

workflow側は`opencode.log`を`cat`せず、Artifactにもuploadしない。

### 方針6: model実行後にwrite tokenなしで差分を検証する

OpenCodeが終了した後、GitHub App tokenを取得する前に次を検証する。

1. tracked / untracked変更が存在する。
2. 変更ファイルが`package.json`と`pnpm-lock.yaml`だけである。
3. `git diff --check`がPASSする。
4. lifecycle scriptを無効にした状態でdependency install / lockfile整合を確認する。
5. 対象dependencyの更新前後versionをRepository情報から取得できる。
6. `pnpm run verify`がPASSする。
7. 変更後もOpenCodeのpermission/config/workflow自身が書き換えられていない。
8. Secret、Alert番号、private payloadがdiffへ入っていない。

どれか1つでも満たさなければ変更をpublishせず`needs_human`で終了する。

OpenCodeのresponse内容は成功判定に使わない。信頼するのはdiffとRepositoryの検証結果だけにする。

### 方針7: 最終publish stepだけOIDCからOpenCode GitHub App tokenを取得する

全検証PASS後だけpublish stepへ進む。

token取得は固定Release `v1.18.31`で確認した契約に合わせる。

1. GitHub OIDC tokenをaudience `opencode-github-action`で取得する。
2. `https://api.opencode.ai/exchange_github_app_token`へBearer tokenとしてPOSTする。
3. responseの`token`だけをstep内の一時変数へ保持する。
4. tokenをlog、Step Summary、Artifact、model envへ出さない。
5. PATやwrite権限付き`GITHUB_TOKEN`へfallbackしない。

publish stepが行う操作は固定する。

- `main`を基点に一意なautomation branchを作る。
- Git identityは固定値にする。
- stage対象は`package.json`と`pnpm-lock.yaml`だけ。
- commit messageはworkflow側で固定形式から生成する。
- pushする。
- PR title / bodyはworkflow側で固定形式から生成する。
- auto-mergeを設定しない。

PR本文に含める情報は次だけにする。

- `Security Update`
- dependency名
- 更新前version
- 更新後version
- `pnpm run verify` PASS
- 手動review / mergeが必要であること

含めないもの:

- Dependabot Alert番号
- private Alert payload
- severityや実環境でのexposure評価
- Renovate失敗の内部情報
- OpenCode response / transcript
- OIDC token / App token
- workflow temp path

### 方針8: fallbackの公開結果を2値に限定する

workflowの最終出力は次のどちらかだけにする。

- `fix PR created: <public PR URL>`
- `needs_human`

個別のprivate failure reasonをStep Summaryへ詳述しない。必要な技術的failureはjob logでもprivate payload自体を出さず、一般化したerror code / step名で識別する。

独自queue、複数branch回復、継続session、長期retryを追加しない。必要なら人間が原因を確認して再dispatchする。

### 方針9: SECURITY.mdへ運用境界とactivation手順を書く

`SECURITY.md`へ次を追記する。

- Dependabot Alertsが正本。
- 未解決Alertの番号、private payload、actual exposure、private triageは公開しない。
- Security修正PRではdependency名、version差分、Security Updateであること、CI結果だけを公開できる。
- Renovate PRはauto-mergeしない。
- OpenCode fallbackは「Renovateが処理したが安全なPRを作れなかった」ことを人間が確認した場合だけ手動起動する。
- fallbackはAlert番号をinputに取るが、その値を公開PRやモデルpromptへ転記しない。
- Bot PRではCloudflare Previewを実行しない。
- Security fixは通常のCIとmanual review後にmergeする。
- 実Alert payloadやmodel transcriptをRun Artifact / GitHub Artifactへ保存しない。

### 方針10: 外部App activationはRepository変更merge後に段階的に行う

Repository側の実装がmergeされ、CIが新しいBot境界を保護してから外部Appを有効化する。

#### Renovate activation

1. open Dependabot Alert件数をOwner権限で取得し、`prConcurrentLimit`の具体値を最終確認する。
2. Mend Renovate Appの現在の要求権限をOwnerが確認する。
3. AppのRepository accessを`qa-training-store`だけに限定する。
4. Repository設定と公開PR templateのrenderをpublishなしで確認できる手段があるか確認する。
5. 事前確認できない場合は、Issueの公開文字列確認条件が未達としてactivationを停止する。
6. activation可能と判断した場合、Dependabot AlertsはONのまま、Dependabot Security UpdatesだけをOFFにする。
7. Renovateを有効化する。
8. 最初のSecurity PRで次を確認する。
   - 通常dependency updateではない。
   - 公開情報が許容範囲内。
   - auto-mergeされない。
   - `deploy-preview`がskip。
   - `validate`が成功。
9. 境界違反を確認した場合はRenovateを停止し、Dependabot Security UpdatesをONへ戻す。

#### OpenCode App activation

1. OpenCode GitHub Appの現在の要求権限をOwnerが確認する。
2. Repository accessを`qa-training-store`だけに限定する。
3. fallback workflowは引き続き`workflow_dispatch`のみとする。
4. 実際にfallbackが必要なopen Alertが発生するまで、脆弱dependencyを意図的に追加してpublish経路を試さない。
5. App token交換やpublish contractが変わっている場合はwrite権限の代替経路を追加せず、workflowを`needs_human`で止める。

### 実行タスク

- [ ] 1. 実装開始時の`main`、Issue #163、既存CI / Security設定との差分を再確認する。
- [ ] 2. Owner権限でopen Dependabot Alert件数を取得し、`prConcurrentLimit`候補を確定する。取得できなければRenovate設定の最終確定を止める。
- [ ] 3. `.github/workflows/ci.yml`を`pull_request.user.type`基準のHuman / Bot / fork分類へ変更する。
- [ ] 4. `tests/contracts/ci-workflow.test.ts`を更新し、全Bot PRでPreviewがskipされる契約を固定する。
- [ ] 5. `renovate.json`を追加し、Security-only、OSV off、Dashboard off、normal update off、auto-merge off、lowest fix、有限`prConcurrentLimit`、最小公開templateを設定する。
- [ ] 6. `tests/contracts/renovate-config.test.ts`を追加する。
- [ ] 7. OpenCode `v1.18.31`のpermission matcher、OIDC交換、binary asset / digestを実装時点でもう一度確認する。
- [ ] 8. `.github/opencode/security-fallback.json`をV1 schemaで追加し、deny-by-defaultと2ファイルだけのeditを固定する。
- [ ] 9. `.github/workflows/security-dependency-fallback.yml`を追加し、dispatch-only、read中心permissions、private Alert隔離、公開Advisory変換、重複PR確認を実装する。
- [ ] 10. fixed OpenCode binaryのdownload / SHA-256検証、`-free` modelの決定的選択、session sharing off、stdout/stderr隔離を実装する。
- [ ] 11. model実行後のchanged-file allowlist、lockfile整合、version差分、`pnpm run verify`をpublish前に検証する。
- [ ] 12. 最終publish stepだけでOIDCからOpenCode App tokenを取得し、workflow固定のbranch / commit / PR metadataでPRを作成する。
- [ ] 13. `tests/contracts/security-dependency-fallback-workflow.test.ts`を追加し、trigger、permissions、pinning、checksum、model selection、permission、token境界、log/artifact禁止、固定PR metadataを検証する。
- [ ] 14. `SECURITY.md`を更新する。
- [ ] 15. `git diff --check`、対象contract test、`pnpm run verify`を実行する。
- [ ] 16. PR CIでHuman同一Repository PRのPreviewが従来どおり成功することを確認する。
- [ ] 17. contract testと実際のBot PRで、Botの`deploy-preview`がskipし`validate`が成功することを確認する。
- [ ] 18. Repository変更をmergeした後、Owner承認を得て初めて外部App activationへ進む。
- [ ] 19. Mend Renovate Appの権限・Repository selection・公開render確認条件を満たした場合だけ、Dependabot Security UpdatesをOFFにしてRenovateを有効化する。
- [ ] 20. 最初のRenovate Security PRを監査し、条件違反時は即停止してDependabot Security UpdatesをONへ戻す。
- [ ] 21. OpenCode AppもOwner権限確認後だけ導入し、fallbackが実際に必要になるまで脆弱dependencyを作って試験しない。

## 6. 検証方法

### CI trust boundary

`tests/contracts/ci-workflow.test.ts`で次を確認する。

- same-repo Human PR:
  - `deploy-preview`実行条件を満たす。
  - `validate`はPreview successを要求する。
- same-repo Bot PR:
  - login名に関係なく`deploy-preview`をskipする。
  - `validate`はPreview skippedを受け入れる。
- fork PR:
  - Previewをskipする。
- push / schedule / workflow_dispatch:
  - Previewをskipする。
- Cloudflare credentialはPreview / Production deploymentの既存境界から増えていない。

既存のExpo Dependency Maintenance PRも`user.type == Bot`でPreview skipになることを、実PRまたはevent fixtureで確認する。

### Renovate config

`tests/contracts/renovate-config.test.ts`で少なくとも次を確認する。

- JSONとしてparseできる。
- Security-only presetを使っている。
- `enabledManagers == ["npm"]`。
- `osvVulnerabilityAlerts == false`。
- `dependencyDashboard == false`。
- global / vulnerability alertのauto-mergeがfalse。
- 通常package updateがdisabled。
- `vulnerabilityAlerts.enabled == true`。
- `vulnerabilityFixStrategy == "lowest"`。
- `prConcurrentLimit`が正の有限整数。
- PR本文templateに許可した情報以外を広げるfieldがない。
- scheduleをSecurity fixの条件として追加していない。

Hosted Renovate側でpublish前renderを確認できる場合は、実Alertのprivate情報を公開せず次を確認する。

- branch名。
- commit message。
- PR title。
- PR body。
- logやDependency Dashboardに想定外の公開情報が出ないこと。

確認不能ならlive activationを止める。

### OpenCode workflow contract

`tests/contracts/security-dependency-fallback-workflow.test.ts`で次を固定する。

- triggerが`workflow_dispatch`だけでscheduleがない。
- inputはAlert番号1件を受ける。
- top-level permissionsがread中心で、常時`contents: write` / `pull-requests: write`を持たない。
- stock `anomalyco/opencode/github` Actionを使用しない。
- `opencode github run`を使用しない。
- fixed Release URL、version、asset、SHA-256を持つ。
- checksum検証前にbinaryを実行しない。
- `-free` suffixだけをmodel候補にする。
- model候補0件でpublishへ進まない。
- `--share=false`を指定する。
- OpenCode stdout/stderrをtemp fileへredirectし、そのfileを`cat` / uploadしない。
- OpenCodeへwrite tokenを渡さない。
- Alert private JSONをmodel promptへ渡さない。
- changed-file allowlistが`package.json` / `pnpm-lock.yaml`だけ。
- publish前に`pnpm run verify`を要求する。
- OIDC audienceが`opencode-github-action`。
- OIDC exchange endpointが固定Releaseの契約と一致する。
- PAT / write-enabled `GITHUB_TOKEN` fallbackがない。
- PR本文がworkflow固定で、model outputを参照しない。
- auto-merge設定がない。
- `actions/upload-artifact`などmodel transcriptを公開する経路がない。

`.github/opencode/security-fallback.json`について次を確認する。

- V1 `permission` keyを使用する。
- wildcard denyがある。
- edit allowは`package.json`と`pnpm-lock.yaml`だけ。
- `.git/**` / `.env*` readをdenyする。
- `external_directory`をdenyする。
- web accessをdenyする。
- arbitrary bashをdenyする。
- git / gh / env / printenv / curlのallow ruleがない。
- lifecycle script有効のinstall commandをallowしない。

### fallbackの失敗系

Repositoryへ脆弱dependencyを追加せず、synthetic fixtureや存在しないAlert番号で次を確認する。

- Alert not found -> `needs_human`。
- closed Alert -> `needs_human`。
- npm以外 -> `needs_human`。
- 対象外manifest -> `needs_human`。
- duplicate PR -> `needs_human`。
- free model 0件 -> `needs_human`。
- OpenCode checksum mismatch -> `needs_human`。
- OpenCodeがallowlist外fileを変更 -> publishしない。
- `pnpm run verify`失敗 -> publishしない。
- OIDC exchange失敗 -> PAT / GITHUB_TOKENへfallbackしない。

private Alertを含むfixtureはRepositoryへcommitしない。contract test用fixtureは公開情報だけで構成する。

### Repository標準検証

- `pnpm exec vitest run tests/contracts/ci-workflow.test.ts tests/contracts/renovate-config.test.ts tests/contracts/security-dependency-fallback-workflow.test.ts --no-file-parallelism --maxWorkers=1`
- `pnpm run test:contracts`
- `pnpm run verify`
- `git diff --check`

### activation後の実地確認

- Human PRでPreviewが従来どおり作成される。
- Bot PRでPreviewがskipされ、Cloudflare credentialを要求しない。
- Renovateの最初のSecurity PRがnormal updateを含まない。
- Renovate PRの公開情報が許容範囲内。
- auto-mergeされない。
- fallbackは人間が必要と判断した実Alertに対してだけ手動実行する。
- fallback PRは2ファイル以外を変更しない。
- fallback PR本文にAlert番号やmodel responseがない。

## 7. リスクと未解決論点

### リスク

1. **全Bot Preview除外による既存Expo maintenance PRの動作変更**
   - 現在のExpo automation PRは同一Repository由来のBot PRなので、変更後はCloudflare Previewを作らない。
   - これはSecret境界を一貫させるための意図した変更。
   - `validate`がBot Preview skipを正しく受け入れるcontract testを先に追加する。

2. **Mend Renovate Community Cloud Appの広いRepository権限**
   - Hosted AppはPR作成だけではなく複数のwrite権限を要求する。
   - Repository設定だけでは権限を狭められない可能性がある。
   - Ownerが実際のInstall画面で承認するまでAppを導入しない。

3. **Hosted Renovateの最終renderを事前に保証できない可能性**
   - Repository側template testだけではHosted runtimeの最終出力を完全には証明できない。
   - publish前の確認手段がない場合はactivationを止める。公開trial PRで代替しない。

4. **open Dependabot Alert件数を現時点で取得できていない**
   - `prConcurrentLimit`を推測するとIssueのfinite bound要件を形だけ満たす危険がある。
   - Owner権限で実数を確認するまで具体値を確定しない。

5. **OpenCode free model一覧は外部状態で変わる**
   - 特定modelを将来も存在すると仮定しない。
   - 実行時に`-free`だけを決定的に選択し、0件なら`needs_human`。

6. **LLM出力による予期しない変更**
   - model response自体を信頼せず、permission、changed-file allowlist、lockfile整合、`pnpm run verify`、manual reviewで防ぐ。
   - package lifecycle scriptを実行させない。

7. **OIDC exchange serviceはRepository管理外**
   - OpenCode upstreamのexchange contractが変わる可能性がある。
   - 固定Releaseで確認したcontractから外れた場合はfail closedにし、PATやwrite-enabled GITHUB_TOKENへ迂回しない。

8. **private Alert情報のlog漏えい**
   - GitHub API responseやmodel transcriptをstdoutへ出すとpublic RepositoryのActions logから漏れる可能性がある。
   - response、prompt、model logを`RUNNER_TEMP`へredirectし、summary / artifactへ転記しない。

9. **重複PR判定の誤り**
   - PR titleだけの曖昧な一致で自動判定すると同じdependencyの別更新と衝突し得る。
   - 判断できない場合は重複なしとみなさず`needs_human`へ倒す。

### 未解決の質問

- open Dependabot Alert件数。
- Mend Renovate Community Cloudで公開せず最終renderを確認できる手段があるか。
- 導入時点のMend Renovate App / OpenCode GitHub Appの実際の要求権限。

これらはRepository側Planの作成を止めないが、live activation前の停止条件とする。

## 8. 成果物

### 今回作成する成果物

- branch: `issue-163-renovate-opencode-security-fallback`
- Plan: `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`

### 実装時の変更予定ファイル

- `renovate.json`
- `.github/workflows/security-dependency-fallback.yml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/ci.yml`
- `SECURITY.md`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/renovate-config.test.ts`
- `tests/contracts/security-dependency-fallback-workflow.test.ts`

package dependency追加は予定しない。

### Run Artifact

今回の依頼はPlan-onlyなので`.codex/runs/**`は作成しない。

実装時にRun Artifactを使用する場合も、実Dependabot Alert番号、private Alert payload、model prompt、model transcript、tokenを保存しない。記録するのはpublic / synthetic情報、設定差分、検証結果だけとする。

## 9. 備考

- Dependabot Alertsを停止しない。
- Dependabot Security UpdatesをOFFにするのはRepository側変更がmergeされ、Renovate activation直前のOwner操作時だけ。
- Renovate / OpenCodeの外部App installはこのPlanのRepository実装とは別の承認操作として扱う。
- 外部App有効化後に公開情報またはSecret境界の違反を確認した場合、対象Appを停止し、Dependabot Security UpdatesをONへ戻す。
- 既存の公開Repository hardening Plan全体を書き換えず、Issue #163がSecurity-only Renovate導入に限った新しい判断として残る。
- 実装中にIssueの前提と異なる公式仕様、App権限、OpenCode Release契約が確認された場合は、互換性を推測で埋めずactivationを止めてPlanを更新する。

### 実装時に再確認する公式資料

- Renovate Security Preset: https://docs.renovatebot.com/presets-security/
- Renovate `vulnerabilityAlerts`: https://docs.renovatebot.com/configuration-options/#vulnerabilityalerts
- Renovate Security and Permissions: https://docs.renovatebot.com/security-and-permissions/
- Renovate npm manager: https://docs.renovatebot.com/modules/manager/npm/
- GitHub Dependabot Alerts REST API: https://docs.github.com/en/rest/dependabot/alerts
- OpenCode Zen: https://opencode.ai/docs/zen
- OpenCode Release `v1.18.31`: https://github.com/anomalyco/opencode/releases/tag/v1.18.31
- OpenCode immutable OIDC subject fix: https://github.com/anomalyco/opencode/pull/44776
