# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

GitHub Codespaces 上で `qa-training-store` を開発できる環境を導入する。OpenCode は OpenCode Zen を利用し、使用する model はユーザーがその都度選択する。Free / paid のどちらを使うかは Repository / harness 側では制御しない。Codex CLI は ChatGPT アカウントで認証して ChatGPT プランの Codex 利用枠を使用する。

この Plan は PR #188 で Plan、実装、Codespaces 実機検証、Repository 検証、CI 確認まで完了するための正本とする。

作成基準:

- 初回 base: `main@84ce165493649550832731a60cf436f8ae29c56b`
- branch: `plan/codespaces-opencode-devcontainer`
- PR: `#188`
- 初回作成: 2026-10-02 JST
- 複数レビュー最終反映: 2026-10-02 JST

## 1. ゴール / 完了条件

### ゴール

Codespaces を Web / TypeScript / Repository 検証と OpenCode / Codex CLI 開発に利用でき、Repository にコミットした設定から Full Rebuild と完全新規 Codespace の両方で同等の環境を再現できる状態にする。

ここでの「同等」はcontainer image digestの完全一致ではなく、Node major、pnpm / OpenCode / Codex exact version、実行user、CLI path、認証方式、Codex Hook / MCP、Web Runtimeなど、このPlanで定義するRepository開発契約が一致することを指す。

### 完了条件

以下をすべて満たす。

1. Phase A開始時にlatest `main`、PR branch、Repository契約、current公式仕様を再確認し、baseline main SHAとbaseline PR head SHAを記録する。
2. OpenCode / Codexのstable versionは、実際にinstallへ使用する正規distributionのofficial package / release metadataで確認できるlatest non-prerelease stableを正本とする。補助的なofficial sourceとの不一致だけでは停止せず、採用versionとinstall sourceを一意に確定できない場合だけ停止する。
3. Phase Bのplain CodespaceはPersonal dotfilesを無効にした新規Codespaceとし、working tree clean、local HEAD == remote PR head、Codespace HEAD == baseline PR headを確認する。
4. Phase Bではpackage spec、exact version、認証方式、smoke契約など環境非依存部分を確認する。plain Codespaceのuser / install path / PATHはbaseline evidenceでありtarget devcontainerの期待値にしない。
5. Phase B→C checkpointまでに、targetの`node` userで使うOpenCode / Codex exact install command、install先の方針、PATH反映、sudo使用有無、`corepack enable`、`postCreateCommand`のexact順序を確定する。E-2では方式を決め直さず実測値を検証する。
6. OpenCode ZenはPersonal `OPENCODE_API_KEY` をcredentialとして実際に認識したことをSecret非露出で確認する。smoke成功だけを認証成功の証拠にしない。
7. canonical OpenCode smokeにはOpenCode Zen providerのmodelを使用する。model ID、Free / paid、価格はユーザーが選択し、Repository / harnessでは制限しない。
8. OpenCodeはupstream default permissionで利用し、Codex Safety Harness相当のpermission / sandbox / Hook制御は今回の対象外とする。これは設定漏れではなく明示的な境界とする。
9. model能力不足とenvironment / integration failureの分類規則を固定し、能力不足へ再分類する場合は環境/config/認証を変えず別のtool対応Zen modelだけに変更して同一smokeがPASSすることを確認する。
10. Codex CLIはChatGPT device-code authenticationを使用し、API key / access token / WIFへfallbackしない。
11. effective `CODEX_HOME` のset / unsetと解決後pathを記録し、login、project trust、Hook trust、smoke、subagent、`ci_wait`で同じ`CODEX_HOME`を使う。
12. Codexは既存`.codex/config.toml`、project trust、Hook trust、`test:hooks`、`diagnose:hooks`、Linux `codex-safe.sh`、same-session Hook runtime、bounded subagent、`ci_wait` MCPをCodespaces上で確認する。
13. canonical Codespaces検証では`GH_TOKEN`を対象processから除外し、Codespaces標準`GITHUB_TOKEN`を利用する。`.codex/config.toml`の`GH_TOKEN` support自体は変更しない。
14. Phase B / Full Rebuild / Fresh Createでは`ci_wait` serverのstartupと`wait_for_required_ci` tool discoveryまでをintegration evidenceとし、tool自体は呼ばない。必要なGitHub read-only疎通は`gh api`等で別確認する。
15. `.devcontainer/devcontainer.json`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`、`remoteUser: "node"`、`waitFor: "postCreateCommand"`、8081 forwardingを持つ。
16. `postCreateCommand`はworkspace rootから逐次・fail-fastで、dependency install → OpenCode exact install → Codex exact installを実行する。postCreate完了前をReady扱いしない。
17. candidate SHA確定後からFull Rebuild / Fresh Createのevidence取得完了までbranchへpushしない。両方を同じcandidate SHAで検証する。
18. E-2ではPhase B Codespaceを再利用し、clean確認 → `git fetch origin` → expected branch確認 → `git merge --ff-only origin/plan/codespaces-opencode-devcontainer`でcandidate SHAへ同期する。fast-forwardできない場合は停止する。
19. Full Rebuild直前にHEAD == candidate SHA、tracked worktree / index clean、環境影響差分0、対象Codespace名を確認し、control shellから`gh codespace rebuild --full -c <codespace-name>`を実行する。Rebuild後にactive `devcontainerPath`が`.devcontainer/devcontainer.json`であることを確認する。
20. Full Rebuildではcontainer / lifecycle / target CLI contract、認証zero-state、OpenCode / Codex integrationを検証し、Codespace内で`pnpm run verify`を成功させる。
21. Fresh Createはcontrol shellからcandidate branchと`.devcontainer/devcontainer.json`を明示して作成し、`gh codespace view`で実際の`devcontainerPath`をevidence化する。
22. Fresh CreateのCodex未認証判定は`codex login status`を正本とし、`auth.json`不在と代替認証env不在は補助evidenceとする。
23. Fresh Createでもtarget CLI contract、effective `CODEX_HOME`、OpenCode / Codex integration、`pnpm run verify`、Web Runtimeを成功させる。
24. Web smokeでは手動のport追加を行わず、`.devcontainer/devcontainer.json`の`forwardPorts: [8081]`と`gh codespace ports`の8081 browse URL / visibilityを確認し、visibilityを変更せずforwarded URLを確認する。確認後はWeb processを停止し8081を解放する。
25. Phase A前のPersonal dotfiles enabled/disabled状態と選択Repositoryを記録し、success / failure / blocker / user stopを問わずRun終了前に元の状態へ復元する。
26. validation-only Codespaceを作成済みならsuccess / failure / blocker / user stopを問わずRun終了前にstopする。deleteは行わず、不要CodespaceをREPORTへdelete候補として記録する。
27. cleanup自体を実行できない場合は、その未復元 / 未停止状態をBlockerとしてREPORTとユーザー報告へ明記する。再開時はdotfiles状態とCodespace状態を再確認する。
28. Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。Plan / Run Artifact / PR本文だけの記録更新は再実行理由にしない。
29. Phase A時点のlatest mainをbaselineとして固定する。candidate freeze後にmainが進んだだけでは再検証しない。main由来変更をbranchへ取り込んだ場合、またはRepository契約上同期が必要になった場合はcandidate変更として再検証する。
30. final working treeで`pnpm run verify`と`git diff --check`が成功する。
31. canonical Fresh Codespaceをfinal push → exact HEADの`wait_for_required_ci` success → PR本文更新までrunning状態で維持する。final push後はそのCodespaceを`--ff-only`でfinal HEADへ同期し、candidate→final差分が記録系のみであることを確認する。
32. final exact HEADに対してRepository既存の`wait_for_required_ci`を1回だけ呼び、`Web CI` / `Mobile App CI`がsuccessする。Agent自身でCI pollingしない。
33. final CIとPR本文更新後にPersonal dotfilesを元状態へ復元し、validation-only Codespaceとcanonical Fresh Codespaceをstopする。deleteはユーザー判断とする。
34. Native経路、Security fallback、application source、test、workflowへ目的外の変更を入れない。
35. 実測で今回の目的達成に必須と判明した最小変更はcanonical Planを更新して同じPR #188で対応する。

## 2. 現状理解と確定前提

### Repository

- current visibility は public。
- `package.json#packageManager` は `pnpm@10.34.5`。
- CI は Node 24 / pnpm 10.34.5 を使用する。
- Web の通常起動は `pnpm run start:web`。
- Playwright 通常 Runtime は 8081、Training Runtime は 8082。
- 今回、人間が Codespaces から直接利用する Web Runtime は通常 Runtime だけを対象とする。
- Native Build は Windows / macOS ローカルが正式経路であり、Codespaces で置き換えない。
- `.artifacts/` は `.gitignore` 対象。
- Repository には root `opencode.json` / `.opencode/**` の通常開発設定は存在しない。
- Repository には Security Dependency Fallback 専用の OpenCode 設定があり、`OPENCODE_API_KEY` を環境変数として OpenCode CLI へ渡す既存実績がある。通常開発設定としては流用しない。

### OpenCode

- OpenCodeのmodel選択はユーザー操作として扱う。Free / paid、特定model ID、model価格、provider内のmodel制限をRepository契約にしない。
- root `opencode.json` やdevcontainer環境変数でmodelを固定しない。
- `model` / `small_model`、provider whitelist、`enabled_providers`、Model access、fail-closed launcher等を今回の目的のために追加しない。
- OpenCode CLI自体は再現性のためstable exact versionを固定し、自動更新を無効化する。
- OpenCode Zenの認証方式は、Personal `OPENCODE_API_KEY` を利用してFresh Createでも再現できることを確認する。
- OpenCodeは今回upstream default permissionで利用する。current stableでは多くのpermissionが`allow`、`doom_loop`と`external_directory`が`ask`、`.env` readはdefault denyである。Codex Safety Harness相当のpermission / sandbox / Hook制御をOpenCodeへ追加することは今回の対象外とする。
- model選択に依存しないread-only / bounded development smokeで、Repository開発に必要なCLI動作を確認する。
- OpenCodeが実際に利用したmodelのFree / paid判定やusage集計は今回の検証対象にしない。

### Codex

- Repository には `.codex/config.toml`、Hook、rules、Run Artifact、Linux / Windows wrapper が既に存在する。
- `.codex/config.toml` は project trust 後に読み込まれ、`features.hooks = true` を使う。
- Hook trust は project trust と別条件で、既存正本は `docs/reference/codex-safety-harness.md`。
- `pnpm run diagnose:hooks` が Repository 側の read-only 診断経路として存在する。
- Linux wrapper は `scripts/codex-safe.sh`。readonly preflight で既存 policy を確認できる。
- `.codex/config.toml` には `ci_wait` MCP server があり、`GH_TOKEN` / `GITHUB_TOKEN` を利用する。
- GitHub Codespaces は `GITHUB_TOKEN` を既定環境変数として提供する。
- remote / headless 環境の ChatGPT 認証では device code authentication が公式の推奨経路。
- Codex auth file を Repository や Codespaces Secret へコピー・永続化しない。

### Codespaces personalization

- Personal dotfiles を有効にしている場合、新規 Codespace に dotfiles repository と setup script が自動適用され得る。
- dotfiles は CLI install、PATH、global config、Git config 等を変更できるため、Phase Bで確定するinstall provenanceとFresh Createの再現性証拠の両方から分離する。
- Phase B の plain Codespace と canonical Fresh Create は、どちらも「Automatically install dotfiles」を無効にした状態から新規作成する。
- 既存Codespaceからdotfilesを手作業で除去する方法はcanonical検証の代替にしない。
- Settings Sync は今回の CLI / shell 再現性判定の主対象にしない。

### Secret / credential

- `OPENCODE_API_KEY` はユーザー固有の Personal Codespaces Secret とする。
- 既存の`OPENCODE_API_KEY` Secretを使う場合、既存Repository accessを削除せず`qa-training-store`を追加する。新規の専用Secretを作成する場合だけ`qa-training-store`限定でよい。
- Codespace作成後にSecretを追加・変更した場合はstop → restartしてから検証する。
- `devcontainer.json#secrets`はrecommended secretの案内であり、Secret valueを保存する機能ではない。
- Secret非露出とは、値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しないことを指す。OpenCode processへcredentialとしてenvironment variableを提供しないことまでは意味しない。
- Codespacesの`GITHUB_TOKEN`はRepository操作や`ci_wait` MCPに利用できるが、値を出力・保存しない。

## 3. 実装中の判断ルール

### stable versionの決定規則

Phase A時点で、OpenCodeとCodexそれぞれについて実際にinstallへ使用する正規distributionのofficial package / release metadataからlatest non-prerelease stableを確定する。

- prerelease / beta / nextは対象外。
- install sourceとexact versionを一意に確定できることを必須とする。
- 別のofficial page / sourceは整合確認に使うが、公開タイミング差だけを理由に停止しない。
- 正規distribution側でstable / prereleaseの判別ができない、または同じinstall source内でversionが矛盾する場合は停止する。
- exact versionとexact-version install command候補をcanonical Plan / active Runへ記録してからPhase Bへ進む。
- Phase A後に新versionが公開されても自動追従せず、今回のRunではPhase Aで固定したversionを使用する。

### Phase B で確定する値

Phase Bでは環境非依存の契約と、Phase Cで使うtarget install戦略を確定する。

1. OpenCode package spec、exact version、binary name。
2. OpenCode Zen authentication exact mechanism。
3. OpenCode Personal Secret利用をSecret非露出で確認するcredential-specific evidence method。
4. OpenCode read-only / development smokeのexact command / prompt / expected result。
5. Codex package spec、exact version、binary name。
6. Codex device-code authenticationのexact手順と`codex login status`の期待結果。
7. effective `CODEX_HOME` のset / unsetと解決後path、およびlogin / trust / smoke / subagent / `ci_wait`で同じ値を使う手順。
8. Codex Hook runtime / bounded subagent evidenceのsession ID / JSONL確認方法。
9. `ci_wait` server startup / tool discovery / GitHub read-only connectivityの確認方法。
10. Dev Container image tag `5-24-bookworm` の利用可否。
11. target `node` userで使用するOpenCode exact install command、install先の方針、PATH反映、sudo使用有無。
12. target `node` userで使用するCodex exact install command、install先の方針、PATH反映、sudo使用有無。
13. `corepack enable`と`postCreateCommand`のexact command / 実行順 / fail-fast条件。

plain Codespaceの`command -v`、実install path、実行user、PATH、Fresh shellでのbinary解決はbaseline evidenceとして記録するがtarget contractにはしない。

### target devcontainerで検証する値

E-2 Full RebuildではPhase B→Cで確定済みのinstall戦略を変更せず実行し、次をtarget contractの実測値として記録する。

- `remoteUser == node`
- `command -v opencode` / `command -v codex`
- OpenCode / Codexの実install path
- effective PATH
- Phase B→Cで決めたsudo方針どおりにinstallされたこと
- `corepack enable` の成立
- Fresh shellでのbinary解決
- Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exact
- effective `CODEX_HOME`

E-2でinstall戦略の変更が必要と判明した場合、その場で変更せずPhase B→C checkpoint / Phase Cを更新して新candidate SHAを作る。

OpenCodeのmodel ID、Free / paid、価格、model利用実績は固定しない。

### 終了時cleanup契約

Phase AでPersonal dotfilesを変更した後は、success / failure / blocker / user stopのいずれでもRun終了前に次を実施する。

1. Personal dotfilesをPhase Aで記録した元状態へ戻す。元々OFFなら変更しない。
2. validation-only Codespaceを作成済みならstopする。
3. 不要Codespaceはdelete候補としてREPORTへ記録するが、自動deleteしない。
4. cleanup自体を実行できない場合は、未復元 / 未停止の対象と理由をBlockerとしてREPORTとユーザー報告へ記録する。
5. Run再開時はdotfiles状態と既存Codespace状態を再確認し、必要な場合だけ再度dotfilesを一時OFFにする。

final CIをcanonical Fresh Codespaceから実行する正常経路では、waiterとPR本文更新が終わるまでそのCodespaceをstopしない。

### 同一 PR で対応する条件

Phase B〜E の実測で、Dockerfile、`AGENTS.md`、既存 `.codex/**`、helper script、その他ファイルへの変更がないと今回のゴールを達成できないことが確認された場合:

- 原因と必要性を確認する。
- canonical Plan と active Run Artifact を先に更新する。
- 目的達成に必要な最小変更だけを同じ PR #188 で実装する。
- 将来拡張や利便性改善だけを理由に変更範囲を広げない。

次の場合だけ実装を停止してユーザー判断へ戻す。

- 目的そのものを変更する必要がある。
- destructive / irreversible operation が必要。
- Secret / credential の取り扱い境界を変更する必要がある。
- 外部サービスの契約・課金に新たなユーザー判断が必要。
- 必要な権限や認証を取得できず実行不能。

## 4. 予定する変更

### 通常経路で変更するもの

- `.devcontainer/devcontainer.json`
  - image: `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`
  - `remoteUser: "node"`
  - Node / pnpm / OpenCode / Codex CLI setup
  - `OPENCODE_DISABLE_AUTOUPDATE=true`
  - 必要な場合だけ、Secret値を含まないOpenCode Zen認証用config
  - recommended secret `OPENCODE_API_KEY`
  - `forwardPorts: [8081]`
- `README.md`
  - Codespaces 作成前の Personal Secret 設定
  - dotfiles を無効にした canonical Fresh Create 検証
  - OpenCodeのmodelはユーザーが選択し、Repository側でFree / paidを制限しないこと
  - OpenCode Zen 認証方式
  - Codex device-code login / project trust / Hook trust / `ci_wait`
  - Native 対象外
- canonical Plan / active Run Artifact

### 必要性を確認してから変更するもの

- `AGENTS.md`
- `.codex/**`
- `.devcontainer/Dockerfile`
- helper script
- その他、Phase B〜E でゴール達成に必須と確認されたファイル

### 原則として変更しないもの

- `package.json` / `pnpm-lock.yaml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/security-dependency-fallback.yml`
- application source / test
- Cloudflare / Expo / Playwright config
- `docs/native/**`

上記も実測で今回のゴール達成に必須と確認された場合は Section 3 のルールに従う。

## 5. 実装手順

### Phase A: 実装開始時の再基準化

1. branchが`plan/codespaces-opencode-devcontainer`、対象PRが#188であることを確認する。
2. `git fetch origin`後、latest`origin/main`、remote PR head、local HEAD、working tree、upstreamを確認する。
3. Phase A時点のlatest main SHAをbaseline main SHAとして記録する。Phase A後にmainが進んだだけではbaselineを更新しない。
4. main更新をbranchへ取り込む必要がある場合はGit safety契約に従ってPhase B前に行う。force pushは使わない。
5. Phase B開始前にworking tree clean、local HEAD == remote PR headを確認し、baseline PR head SHAを記録する。
6. `package.json`、README、CI、`.codex/config.toml`、`scripts/codex-safe.sh`、Hook関連正本がPlan前提から変わっていないか確認する。
7. OpenCode / GitHub Codespaces / Dev Containers / Codexの公式仕様を実装日基準で再確認する。
8. stable version決定規則に従いOpenCode / Codexのexact versionを確定し、canonical Plan / active Runへ記録する。
9. Repository visibilityがpublicのままであることを確認する。privateへ変更されていた場合はOpenCodeへsourceを送る前に停止する。
10. GitHub Codespaces Personal Settingsのdotfiles enabled/disabled状態と選択dotfiles Repositoryを変更前evidenceとして記録する。
11. Phase B用Codespace作成前にPersonal dotfilesを一時的に無効化する。元状態がOFFなら変更しない。
12. Personal Secret設定、dotfiles設定変更、ChatGPT側device-code有効化、one-time code入力はユーザー操作とする。Agentは必要な手順と検証結果を案内・記録する。
13. Codespace create / rebuild / stop操作は対象Codespace外のcontrol shellまたはGitHub UIから行い、環境内検証は対象Codespace内で行う。
14. active RunはこのPRの実装scopeを継続する。

### Phase B: dotfilesなし plain Codespace で事前検証

#### B-0: Secret / baseline Codespace

1. Codespace作成前にPersonal Codespaces Secret `OPENCODE_API_KEY` を確認する。既存Secretの場合は既存Repository accessを保持したまま`qa-training-store`を追加し、新規専用Secretの場合だけ`qa-training-store`限定で作成する。
2. Secretを作成後に変更した場合はCodespaceをstop → restartしてから使用する。
3. Personal dotfilesが無効であることを再確認する。
4. control shellからbaseline PR branchを指定して新しいplain Codespaceを作成する。`.devcontainer/devcontainer.json`はまだ存在しないため`--devcontainer-path`を指定しない。
5. 作成したCodespace名、`gh codespace view --json devcontainerPath`の結果、baseline PR head SHAをevidenceへ記録する。
6. Codespace内で`git rev-parse HEAD` == baseline PR head SHAを確認する。不一致ならPhase Bを開始しない。
7. `/workspaces/.codespaces/.persistedshare/dotfiles`とcreation log等を確認し、dotfilesが適用されていないことを確認する。
8. `node --version`、`corepack --version`、`git --version`、`whoami`、`id -u`、`command -v node`をbaseline evidenceとして記録する。
9. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode

1. Phase Aで確定したOpenCode exact versionをexact-version install command候補でinstallする。
2. `opencode --version` がPhase A確定versionと一致することを確認する。
3. plain Codespace上の`command -v opencode`、install path、user、sudo要否、PATH、Fresh shell解決をbaseline evidenceとして記録する。target devcontainerの期待値にはしない。
4. `OPENCODE_DISABLE_AUTOUPDATE=true`を設定し、起動前後でversionが変わらないことを確認する。
5. `OPENCODE_API_KEY` は値を出力せずnon-emptyだけ確認する。
6. `~/.local/share/opencode/auth.json` が存在しないことを確認する。
7. Repository / project configに別のZen credential sourceがないことを確認する。Secret値は探索・出力しない。
8. Phase Aで確定したexact versionについて、official docsまたはupstream implementation / testで`OPENCODE_API_KEY`がOpenCode Zen credentialとして認識されることを確認する。
9. current stableにSecret非露出のcredential-status API / CLIがある場合はそれを優先する。ない場合はone-shot evidenceとして、auth cache・他credential sourceなし、同一command・同一configで変更するのは`OPENCODE_API_KEY`の有無だけという条件を作る。SecretありではZen credentialが成立し、Secretなしでは同じ認証必須操作がcredential failureになるというcredential-specificな差分を要求する。単なるmodel一覧差分だけでは認証証拠にしない。
10. smoke成功だけをZen認証成功の証拠にしない。
11. direct env credentialがexact versionで利用できない場合だけofficial env substitutionを検証する。その場合、exact config source、配置場所、provider ID、apiKey表現、precedence、Fresh Createでの注入方法をPhase B→C checkpointへ確定するまでPhase Cへ進まない。
12. `/connect`で生成されるauth cacheをFresh Create再現性の前提にしない。
13. canonical OpenCode smokeにはOpenCode Zen providerのmodelを使用する。model ID、Free / paidはユーザーが選択する。
14. Section 6のOpenCode read-only / development write smokeを実行する。

OpenCode停止条件:

- exact versionをinstallできない、またはversionが一致しない。
- Personal SecretがZen credential pathへ入ったことをSecret非露出で証明できない。
- Fresh Createで再現可能なZen認証方式を確定できない。
- read-only smokeまたはdevelopment write smokeがenvironment / integration failureでFAILする。
- OpenCodeが起動時にexact versionから自動更新される。

#### B-2: Codex CLI / ChatGPT authentication

1. Phase Aで確定したCodex exact versionをexact-version install command候補でinstallする。
2. `codex --version` がPhase A確定versionと一致することを確認する。
3. plain Codespace上の`command -v codex`、install path、user、PATH、Fresh shell解決をbaseline evidenceとして記録する。target devcontainerの期待値にはしない。
4. effective `CODEX_HOME` のset / unsetを確認し、未設定ならcurrent公式defaultに従って解決後pathを記録する。
5. `OPENAI_API_KEY`、`CODEX_API_KEY`、`CODEX_ACCESS_TOKEN`、`OPENAI_FEDERATION_RULE_ID`、`OPENAI_IDENTITY_TOKEN_FILE`は値を出力せずset / unsetだけを確認する。
6. 上記が設定されている場合はChatGPT認証前に原因を確認し、今回のCodex processから除外する。
7. `codex login status`を認証有無の正本として実行する。
8. `codex login --device-auth`を正規認証経路にする。
9. device-code loginがChatGPT側で無効ならユーザー操作で有効化して再実行する。利用不可または失敗する場合はAPI keyやauth file copyへfallbackせず停止する。
10. 認証後の`codex login status`がChatGPT認証を肯定的に示すことを確認する。
11. `/status`でsession / model / usageを確認する。
12. login、project trust、Hook trust、smoke、subagent、`ci_wait`で同じeffective `CODEX_HOME`を使用する。

#### B-3: Codex Repository integration

1. `GH_TOKEN` / `GITHUB_TOKEN` は値を出力せずset / unsetだけを確認する。
2. canonical Codespaces検証ではCodex / `ci_wait`を起動するprocessから`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を利用する。`.codex/config.toml`の`GH_TOKEN` supportは変更しない。
3. `pnpm run test:hooks` を実行する。
4. `pnpm run diagnose:hooks` を実行する。
5. `bash scripts/codex-safe.sh --preset readonly --preflight-only` を実行する。
6. Repository rootからdirect `codex` を起動する。
7. project trustを成立させる。
8. `/hooks`で`.codex/config.toml`がdefinition sourceであること、必要Hookの定義内容、trust状態を確認する。
9. 必要なHookだけを内容確認後にtrustする。
10. trust確認と実行でB-2に記録した同じeffective `CODEX_HOME`を使用し、値が変わっていないことを確認する。
11. `ci_wait` MCP serverがstartupし、`wait_for_required_ci` toolをdiscoverできることを確認する。Phase Bではtoolを呼ばない。
12. GitHub read-only connectivityが必要なら、`GH_TOKEN`を除外した同じprocess条件で`gh api`等を使いRepository / PRへアクセスできることを確認する。
13. Section 6のCodex read-only / development smokeを同一sessionで実行し、そのsession IDを記録する。
14. 同一sessionの`hooks-<session_id>.jsonl`または既存loggerのfallback pathだけを確認し、`UserPromptSubmit`、`PostToolUse`、`Stop`が実Runtimeで記録されたことを確認する。
15. 同じCodex sessionからRepositoryの`packageManager`を読むだけのbounded read-only subagentを1回だけ起動する。
16. 同一session logで`SubagentStart` / `SubagentStop`が同じagent IDに対して記録され、subagentが正常終了したことを確認する。
17. Hook contract PASS、Hook trust、実Runtime event、subagent eventを別のevidenceとして記録する。

Codex停止条件:

- exact versionをinstallできない、またはversionが一致しない。
- `codex login --device-auth`が利用できない、またはChatGPT認証が完了しない。
- `codex login status`がChatGPT認証を肯定的に示さない。
- 代替認証変数を今回のCodex processから除外できない。
- `test:hooks`、`diagnose:hooks`、readonly preflightのfailureが今回のCodespaces導入に起因し、解消できない。
- project / Hook trustを成立させられない。
- `ci_wait` MCP serverまたは`wait_for_required_ci` tool discoveryが成立しない。
- same-session Hook runtime evidenceまたはbounded subagent evidenceを取得できない。
- read-only smokeまたはdevelopment write smokeがFAILする。

### Phase B→C: 確定事項のPlan反映

Phase Bが成功したら`.devcontainer`を編集する前に、canonical Planとactive Run Artifactへ次を追記する。

- OpenCode package spec / exact version / binary name。
- OpenCode Zen authentication exact mechanismとcredential-specificなPersonal Secret利用evidence。
- official env substitution fallbackを使う場合は、exact config source、配置場所、provider ID、apiKey表現、precedence、Fresh Createでの注入方法。
- OpenCode smokeのexact command / prompt / expected result。
- Codex package spec / exact version / binary name。
- Codex device-code loginのexact手順と`codex login status`の期待結果。
- effective `CODEX_HOME` とlogin / trust / smoke / subagent / `ci_wait`で同じ値を使う手順。
- `/hooks`、same-session Hook runtime、bounded subagentの確認手順。
- `ci_wait` server startup / tool discovery / `GH_TOKEN`除外 / `GITHUB_TOKEN`利用の確認手順。
- Dev Container image tag `5-24-bookworm` の利用可否確認結果。
- target `node` userで使用するOpenCode / Codex exact install command、install先の方針、PATH反映、sudo使用有無。
- `corepack enable`と`postCreateCommand`のexact command / 実行順 / fail-fast条件。

plain Codespaceの`command -v`、実install path、user、PATHはbaseline evidenceのままとし、target contractへ昇格させない。

OpenCodeのmodel ID、Free / paid、価格、model利用実績は固定しない。このcheckpointが未更新のままPhase Cへ進まない。

### Phase C: `.devcontainer/devcontainer.json` 実装

1. `image`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`。
2. `remoteUser`は`node`。
3. `waitFor`は`postCreateCommand`。postCreate完了前をReady扱いしない。
4. `containerEnv`またはcurrent Dev Container specで同等のcontainer-wide設定として`OPENCODE_DISABLE_AUTOUPDATE=true`を入れる。
5. `postCreateCommand`はPhase B→C checkpointで確定したexact command / sudo方針 / PATH反映をそのまま使い、workspace rootで逐次・fail-fastに実行する。実装時にinstall方式を選び直さない。
6. `secrets`には`OPENCODE_API_KEY`をrecommended secretとして宣言する。値やdefault tokenは書かない。
7. `forwardPorts`は`[8081]`。
8. OpenCodeのmodelは固定しない。root`opencode.json`、model-specific config、provider whitelist、model制御launcherは追加しない。
9. OpenCode permissionはupstream defaultを使用する。Codex Safety Harness相当のpermission / sandbox / Hook設定をOpenCodeへ追加しない。
10. Personal `OPENCODE_API_KEY`の直接認識で認証できる場合はOpenCode用configを追加しない。
11. official env substitution fallbackが必要とPhase Bで確定した場合だけ、Phase B→C checkpointで確定したexact source / provider / precedence / injection methodに従ってSecret値を含まない最小configを反映する。実装時にconfig sourceを選び直さない。
12. Codex auth file / ChatGPT tokenをcopy / mountしない。
13. Android / iOS toolchain、Docker-in-Docker、browser一式、CI専用依存、不要なVS Code extensionは追加しない。
14. Phase Bで必須と判明していない限りDockerfileやhelper scriptを増やさない。

### Phase D: README更新

READMEへ次を追加する。

1. Personal Codespaces Secret `OPENCODE_API_KEY` をCodespace作成前に確認する手順。既存Secretの場合は既存Repository accessを保持したまま`qa-training-store`を追加し、新規専用Secretの場合だけRepository限定で作成する。
2. Phase B / canonical Fresh CreateではPersonal dotfilesを一時的に無効化し、success / failure / blocker / user stopを問わずRun終了前に元設定へ復元すること。
3. SecretをCodespace作成後に追加・変更した場合はstop → restartが必要であること。
4. `devcontainer.json#secrets`はrecommended secretの案内であり、Secret valueを保存しないこと。
5. Secret非露出は値をprompt / completion / command output / terminal output / log / Artifact / REPORT / PR本文へ意図的に出さない意味であり、OpenCodeへcredential envを提供しない意味ではないこと。
6. `node --version` / `pnpm --version` / `opencode --version` / `codex --version` の確認。
7. OpenCodeのmodelはユーザーがOpenCode Zen上で選択すること。Repository / devcontainerはFree / paidを制限しないこと。
8. OpenCodeはupstream default permissionを利用し、Codex Safety Harness相当の制御は今回導入しないこと。
9. OpenCode Zen authentication exact mechanism。fallback configを使う場合は配置場所とSecretを保存しないこと。
10. Codexはremote環境で`codex login --device-auth`を使い、`codex login status`を認証状態の正本とすること。
11. CodexではAPI key / access token / WIFやauth file copyへfallbackしないこと。
12. effective `CODEX_HOME`をlogin / project trust / Hook trust / smoke / subagent / `ci_wait`で統一すること。
13. `codex login status`、project trust、`/hooks`、Hook trust、`ci_wait`の初回確認。
14. canonical Codespaces検証では`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を利用すること。
15. Full Rebuildでは通常`/workspaces`外のcontainer stateが再生成されるため認証zero-stateを期待すること。予期せず認証済みならsymlinkやalternate credential storeを調査すること。
16. Fresh Createはさらに新規Codespace、workspace clone、create-time devcontainer selection、dotfiles未適用を含む完全新規環境の正本であること。
17. Personal dotfilesを復元した後の個人環境はcanonical Repository再現性契約の対象外であること。
18. root`AGENTS.md`を上書きしないこと。
19. CodespacesはWeb / Repository validation用で、Windows Android / macOS iOSの正式経路を置き換えないこと。

### Phase E: candidate SHAの作成と実機検証

#### E-0: candidate作成前のRepository検証

1. `.devcontainer` / README /必要なhelper等の実装を完了する。
2. `pnpm run verify`を実行する。
3. `git diff --check`、`git status --short`、PR差分を確認する。
4. Native、Security fallback、application source / test / workflowに目的外差分がないことを確認する。
5. Secret、Codex auth file / token、OpenCode auth情報、`.artifacts`、`node_modules`をcommit対象にしない。

#### E-1: candidate commit / push

1. 環境再現性に影響する全変更を含むcandidate commitを作成する。
2. 通常pushする。force pushしない。
3. remote branch headとlocal HEADが一致することを確認し、candidate SHAをRun Artifactへ記録する。
4. candidate SHA確定後からE-2 Full RebuildとE-3 Fresh Createのevidence取得完了までbranchへ追加pushしない。
5. candidate freeze後にmainが進んだだけではcandidateを更新しない。main由来変更をbranchへ実際に取り込んだ場合、またはRepository契約上同期が必要になった場合だけ新candidateとして扱う。
6. E-2対象はPhase Bで作成したplain Codespaceを再利用する。対象Codespace内でworking tree / indexがcleanであることを確認したうえで、`git fetch origin` → expected branch確認 → `git merge --ff-only origin/plan/codespaces-opencode-devcontainer`でcandidate SHAへ同期する。
7. fast-forwardできない、別branchである、または既存変更がある場合はreset / rebase / forceで解決せず停止し、Git safety契約に従う。
8. 同期後にHEAD == candidate SHA、`.devcontainer/devcontainer.json`がcandidate内容であることを確認してからE-2へ進む。

#### E-2: candidate SHAのFull Rebuild

Full Rebuildは既存Phase B Codespaceへcandidateのdevcontainer変更を適用し、container image / lifecycle setup / target CLI contractを確認する。GitHub Codespacesでは`/workspaces`は保持されるが通常それ以外のcontainer stateは再生成されるため、認証も原則zero-stateを期待する。

1. control shellからPhase B Codespace名を対象として確定し、Run Artifactへ記録する。
2. 対象Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。
3. tracked working tree / indexがcleanであることを確認する。
4. `.devcontainer/**`、OpenCode authentication / install helper、Codespaces helper、`.codex/**`、`AGENTS.md`、`package.json` / lockfile、install / setup scriptにcandidate SHAと異なる未commit差分がないことを確認する。
5. candidateに含まれない環境影響untracked fileがある場合はRebuildを開始せずE-0へ戻る。
6. control shellから`gh codespace rebuild --full -c <codespace-name>`を実行する。通常Rebuildは代替にしない。
7. Rebuild後、control shellから`gh codespace view -c <codespace-name> --json devcontainerPath`を確認し、active `devcontainerPath`が`.devcontainer/devcontainer.json`であることをevidence化する。不一致ならFAIL。
8. Run Artifactへexact command、Codespace名、candidate SHA、devcontainerPathを記録する。
9. postCreate完了後に環境をReady扱いする。
10. `whoami == node`、`id -u != 0`を確認する。
11. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exactを確認する。
12. target container上で`command -v opencode` / `command -v codex`、実install path、effective PATH、sudo方針、`corepack enable`、Fresh shellでのbinary解決を記録し、Phase B→Cで確定したinstall戦略どおりであることを確認する。
13. effective `CODEX_HOME`を記録し、Phase B→C契約と一致することを確認する。
14. install戦略または`CODEX_HOME`契約の変更が必要なら、その場で修正せずPhase B→C checkpoint / Phase Cを更新して新candidateを作る。
15. `pnpm install --frozen-lockfile`を再実行し、lockfile差分0を確認する。
16. OpenCodeは通常のhome auth cacheがないことを確認する。予期せず残っている場合は`/workspaces`へのsymlink等を調査し、原因未確認のまま認証済み扱いにしない。
17. Codexは`codex login status`を認証状態の正本として実行する。予期せず認証済みならeffective `CODEX_HOME`、credential store、symlink等を調査する。
18. zero-state確認後にOpenCode Personal Secret認証とCodex device-code authを実行する。
19. OpenCode Zen providerのread-only / development smokeを再検証する。
20. Codexは同じeffective `CODEX_HOME`で認証監査、`test:hooks`、Repository integration、same-session Hook runtime、bounded subagent、read-only / development smokeを再検証する。
21. `GH_TOKEN`を対象processから除外し、`ci_wait` server startupと`wait_for_required_ci` tool discoveryを確認する。ここではtoolを呼ばない。
22. 必要なら同じtoken条件で`gh api`等を使いGitHub read-only connectivityを確認する。
23. `pnpm run verify`をCodespace内で実行しPASSする。
24. Web smoke契約に従って8081を確認する。

#### E-3: candidate SHAのcanonical Fresh Create

Fresh Createは新規Codespace、repository workspace、create-time devcontainer selection、dotfiles未適用、認証zero-stateを含む完全新規環境の正本とする。

1. GitHub Codespaces Personal Settingsでdotfilesの自動installが無効であることを確認する。
2. Fresh Create直前にremote branch head == candidate SHAを再確認する。不一致なら作成せずE-0へ戻る。
3. control shellからcandidate branchと`.devcontainer/devcontainer.json`を明示して新しいCodespaceを作成する。正規経路は`gh codespace create -R ryu-yoshikawa-pro-vision/qa-training-store -b plan/codespaces-opencode-devcontainer --devcontainer-path .devcontainer/devcontainer.json`とする。
4. `gh codespace view -c <codespace-name> --json devcontainerPath`で`.devcontainer/devcontainer.json`が使用されたことを記録する。
5. 新Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。不一致ならFAIL。
6. `/workspaces/.codespaces/.persistedshare/dotfiles`とcreation log等でdotfiles未適用を確認する。適用されていた場合はFAIL。
7. manual CLI install、home directory copy、auth cache copyを行わない。
8. OpenCodeは通常のauth cacheが存在しないこと、`OPENCODE_API_KEY`がCodespaces Secretとしてnon-emptyであること、Repository側に別credential sourceがないことをSecret非露出で確認する。
9. effective `CODEX_HOME`のset / unsetと解決後pathを記録する。
10. Codexのzero-state判定は`codex login status`を正本とする。`$CODEX_HOME/auth.json`等の不在とAPI key / access token / WIF env不在は補助evidenceとし、file不在だけで未認証と判定しない。
11. devcontainer作成処理だけでNode / pnpm / OpenCode / Codex CLIが揃うことを確認する。
12. `whoami` / `id -u`、version、`command -v`、実install path、effective PATH、dependency install、effective `CODEX_HOME`を確認し、E-2 target contractと一致することを確認する。
13. OpenCodeはPhase Bで確定したPersonal Secret認証方式をzero-stateから再現し、Zen providerのread-only / development smokeを実行する。
14. Codexは同じeffective `CODEX_HOME`で`codex login --device-auth`を実行し、認証後`codex login status`がChatGPT認証を示すことを確認する。
15. Codexの`test:hooks`、project / Hook trust、same-session Hook runtime、bounded subagent、read-only / development smokeを同じeffective `CODEX_HOME`で再検証する。
16. `GH_TOKEN`を対象processから除外し、`ci_wait` server startupと`wait_for_required_ci` tool discoveryを確認する。ここではtoolを呼ばない。
17. 必要なら同じtoken条件で`gh api`等を使いGitHub read-only connectivityを確認する。
18. `pnpm run verify`をCodespace内で実行しPASSする。
19. Web smoke契約に従って8081を確認する。

#### E-4: candidate SHAの無効化条件

Fresh Create後に次のいずれかを変更した場合、candidate evidenceは無効とする。

- `.devcontainer/**`
- OpenCode authentication config / install helper / Codespaces helper
- `.codex/**`
- `AGENTS.md`
- `package.json` / lockfile
- install / setup script
- その他、OpenCode / Codex / Node / pnpm / PATH / trust / Hook / MCP / Web起動に影響するファイル

修正後はE-0 → E-1で新candidate SHAを作成し、E-2 Full RebuildとE-3 Fresh Createを両方やり直す。

canonical Plan、Run Artifact、PR本文など検証結果の記録だけを更新した場合はFresh Createをやり直さない。ただしfinal headとcandidate SHAの差分を確認し、環境再現性へ影響するファイルが含まれないことを証明する。

### Phase F: 最終記録とGitHub検証

1. candidate SHA、Full Rebuild、Fresh Create、OpenCode / Codex evidenceをactive Run Artifactへ記録する。
2. canonical PlanのPhase B→C確定値、E-2 target contract、実測結果を最終状態へ更新する。
3. PR #188本文へcandidate SHAと実機検証結果を反映する。
4. `pnpm run verify`と`git diff --check`をfinal working treeで再実行する。
5. tracked Run Artifact / PlanをCI待機前の最終状態まで確定し、通常commit /通常pushする。
6. final PR headとcandidate SHAを比較し、Fresh Create後の差分がPlan / Run Artifact等の記録系だけで、E-4対象ファイルが0件であることを確認する。含まれる場合はE-0へ戻る。
7. canonical Fresh Codespaceはstopせずrunning状態を維持し、working tree / index cleanを確認する。
8. canonical Fresh Codespace内で`git fetch origin` → expected branch確認 → `git merge --ff-only origin/plan/codespaces-opencode-devcontainer`を実行し、HEAD == final PR headを確認する。fast-forwardできない場合は停止する。
9. final HEADへのfast-forwardでcandidate→final間の記録系差分だけが入ったことを確認し、Fresh Create evidenceを無効化するE-4対象変更がないことを再確認する。
10. final CI用processでも`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を使用する。
11. `docs/reference/codex-implementation-harness.md`と`ci_wait` contractを必須CIの正本とする。exact final HEADの`Web CI`と`Mobile App CI`だけを対象とする。
12. canonical Fresh Codespaceの同じeffective `CODEX_HOME`から、pushしたfinal HEAD SHAを指定して`wait_for_required_ci`を1回だけ呼び、その結果を待つ。Agent自身でGitHub Actionsをpollingしない。
13. waiter利用不能はCI未確認blockerとし、別手段のpollingへfallbackしない。
14. Phase Fだけは`wait_for_required_ci`の`result=success`を必須とする。Phase B / E-2 / E-3のMCP integration evidenceはCI conclusionと分離する。
15. `Web CI` / `Mobile App CI`がともにsuccessした後、PR #188本文へfinal exact-head CI結果を記録する。
16. CI結果を記録するだけの理由で`TASKS.md`、`REPORT.md`、`PLAN.md`等を再commit /再pushしない。
17. PR本文更新後にPhase Aで記録したPersonal dotfiles設定を元状態へ復元する。元々OFFなら変更しない。
18. Phase B / Full Rebuildに使用したvalidation-only Codespaceとcanonical Fresh Codespaceをcontrol shellからstopする。
19. canonical Fresh Codespaceを継続利用候補としてREPORTへ記録する。不要Codespaceもdelete候補として記録するが、自動deleteしない。
20. cleanupを実行できない場合は終了時cleanup契約に従ってBlockerとして報告する。

Full RebuildとFresh Createは異なる失敗を検出するため、どちらも同じcandidate SHAに対して必須とする。

## 6. Smoke契約

各write smokeは実行ごとに一意なartifact pathを使い、開始前に対象pathが存在しないことをpreconditionとして確認する。

### OpenCode model capabilityの分類

canonical OpenCode smokeにはOpenCode Zen providerのmodelを使用する。model ID、Free / paidはユーザーが選択する。

- OpenCode / provider metadataまたは明示errorが必要なtool capability非対応を示した場合だけ、直接model capability failureと分類する。
- 明示されない失敗は直ちにmodel要因へ分類せず、environment / OpenCode / auth / permission / tool integration failureとして調査する。
- model capability failureへ再分類する場合は、環境/config/認証を変更せず、必要能力を持つ別のユーザー選択Zen modelだけへ変更して同一smokeを1回再実行し、PASSすることをevidenceにする。
- 別modelでもFAILする場合はenvironment / integration failureとして扱う。
- model ID自体は環境契約へ固定しない。

### artifact path規則

- OpenCode Phase B: `.artifacts/codespaces-smoke/opencode/phase-b/attempt-<N>.txt`
- OpenCode Full Rebuild: `.artifacts/codespaces-smoke/opencode/full-rebuild/attempt-<N>.txt`
- OpenCode Fresh Create: `.artifacts/codespaces-smoke/opencode/fresh-create/attempt-<N>.txt`
- Codex Phase B: `.artifacts/codespaces-smoke/codex/phase-b/attempt-<N>.txt`
- Codex Full Rebuild: `.artifacts/codespaces-smoke/codex/full-rebuild/attempt-<N>.txt`
- Codex Fresh Create: `.artifacts/codespaces-smoke/codex/fresh-create/attempt-<N>.txt`

同じphaseを再試行する場合はattempt番号を増やし、既存artifactを再利用しない。smoke artifactの削除は完了条件にしない。

### OpenCode / Codex read-only

OpenCodeはZen providerのmodel、Codexはdirect Codexで同じpromptを実行する。

prompt:

> root `AGENTS.md` がユーザー向け返答に求める報告要素を列挙し、`Next` が必要な場合だけ求められる条件付き要素であることも説明してください。ファイルは変更しないでください。

PASS:

- `Summary`、`Progress`、`Evidence`を回答する。
- `Next`は「必要な場合」に含める条件付き要素として説明される。
- tracked file変更0件。
- Codexではproject config / Hook trust確認済みで、ChatGPT認証を使用し、same-session Hook logに`UserPromptSubmit`と`Stop`が記録される。

### OpenCode development write

Zen providerのfile read/writeとshell / tool利用に対応するmodelを使用する。

promptの出力先は実行phaseに対応する一意なartifact pathへ置換する。

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、指定されたartifact pathに `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- 実行前に対象artifact pathが存在しない。
- 今回割り当てたartifactだけがsmoke成果物として新規作成される。
- `git check-ignore -q <artifact-path>`が成功する。
- `packageManager`がcurrent`package.json`の実値と一致する。
- `hooks=true`がcurrent`.codex/config.toml`と一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。

### Codex development write

promptの出力先は実行phaseに対応する一意なartifact pathへ置換する。

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、指定されたartifact pathに `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- 実行前に対象artifact pathが存在しない。
- 今回割り当てたartifactだけがsmoke成果物として新規作成される。
- `git check-ignore -q <artifact-path>`が成功する。
- current Repository値と成果物が一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。
- same-session Hook logで`UserPromptSubmit`、`PostToolUse`、`Stop`を確認できる。

### Codex bounded subagent

- direct Codexの同一sessionでread-only subagentを1回だけ起動し、`package.json#packageManager`を読ませる。
- subagentはfile変更、network、追加subagent delegationを行わない。
- main sessionへcurrent`packageManager`を返して正常終了する。
- same-session Hook logで同じagent IDの`SubagentStart` / `SubagentStop`を確認する。
- `.codex/config.toml`の`max_depth = 1`を越えるdelegationが発生しない。

### Web smoke

Full Rebuild / Fresh Createの各環境で次を行う。

1. `.devcontainer/devcontainer.json`に`forwardPorts: [8081]`が定義されていることを確認する。
2. canonical smoke中は手動の「Add Port」や`gh codespace ports visibility`等でportを追加・変更しない。
3. `pnpm run start:web`を別processで起動し、PIDまたはprocess handleを記録する。
4. 8081がlisten状態になることを確認する。
5. Codespace内からlocalhost:8081へのHTTP応答を確認する。
6. control shellから`gh codespace ports -c <codespace-name>`等で8081のbrowse URLとvisibilityを確認する。
7. visibilityを変更せず、GitHubへサインイン済みのブラウザでforwarded URLの画面表示を確認する。
8. 起動したWeb processだけを停止する。
9. 8081が解放されたことを確認してから次工程へ進む。

## 7. 検証一覧

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| Phase A baseline | git / PR / main確認 | baseline main SHA / PR head SHA固定 |
| stable version | installに使うofficial distribution metadata | latest non-prerelease stableを一意に確定 |
| dotfiles / Secret |変更前状態・Repository access確認 | 既存accessを破壊せずqa-training-store利用可 |
| Phase B Codespace | plain Codespace + SHA確認 | dotfiles未適用、HEAD == baseline PR head |
| OpenCode baseline | version / auth evidence / Zen smoke | exact version、credential-specific Secret利用証明、smoke PASS |
| OpenCode permission | current upstream default | 追加permission configなし、今回の境界として明記 |
| Codex baseline | version / device auth / CODEX_HOME | exact version、ChatGPT認証PASS、effective CODEX_HOME記録 |
| Codex Hook contract | `test:hooks` / `diagnose:hooks` / preflight / `/hooks` | contract・definition・trust成立 |
| Codex Hook runtime | same-session JSONL | UserPromptSubmit / PostToolUse / Stop記録 |
| Codex subagent | bounded read-only delegation | SubagentStart / SubagentStop記録、正常終了 |
| Codex MCP integration | server startup / tool discovery / `gh api` | `wait_for_required_ci`を呼ばずread-only接続成立 |
| B→C install戦略 | exact postCreate command / node user方針 | sudo / install / PATH / corepackを実装前に確定 |
| devcontainer Ready | `waitFor: "postCreateCommand"` | postCreate完了後にReady |
| candidate checkpoint | commit / push / SHA記録 | remote head == candidate SHA、branch freeze |
| Phase B→candidate同期 | fetch + `merge --ff-only` | Phase B Codespace HEAD == candidate SHA |
| Full Rebuild provenance | full rebuild + post-view | active devcontainerPath == `.devcontainer/devcontainer.json` |
| Full Rebuild auth | login status / auth cache確認 | zero-state確認後に認証 |
| Full Rebuild target | user / path / version / PATH / CODEX_HOME | B→C install戦略どおりの実測値 |
| Full Rebuild verify | Codespace内`pnpm run verify` | PASS |
| Fresh Create config | explicit branch / devcontainer path + `gh codespace view` | HEAD == candidate SHA、devcontainerPath一致 |
| Fresh auth zero-state | `codex login status` +補助evidence | Codex未認証、OpenCode cacheなしから開始 |
| Fresh target contract | user / path / version / PATH / CODEX_HOME | E-2 target contractと一致 |
| Fresh verify | Codespace内`pnpm run verify` | PASS |
| OpenCode smoke | Zen provider + Section 6 | read-only / development write PASS |
| Codex smoke | Section 6 | read-only / development write PASS |
| Web | Section 6 Web smoke | configured 8081 / local / forwarded表示PASS、process停止、port解放 |
| final Fresh environment | final HEADへ`merge --ff-only` | 記録系差分のみ、E-4対象変更0 |
| final Repository | `pnpm run verify` / `git diff --check` | PASS |
| final CI | canonical Fresh Codespaceからexact final HEADでwaiter1回 | `Web CI` / `Mobile App CI` success |
| cleanup | dotfiles restore / Codespace stop / REPORT | success・failureを問わず外部状態を戻す |

## 8. リスクと扱い

### Phase Bとtarget devcontainerの差

- Phase B plain Codespaceのuser / path / PATHはbaseline evidenceでありtarget contractではない。
- 一方、Phase CでpostCreateを実装するため、exact install command、target `node` userでのinstall先方針、sudo使用有無、PATH反映はPhase B→Cまでに決める。
- E-2はその実装方式を検証する場所であり、方式を初めて決める場所ではない。
- E-2で変更が必要ならcheckpoint / Phase Cへ戻り新candidateを作る。

### OpenCode Zen authentication

- smoke成功だけをPersonal Secret利用の証明にしない。
- auth cacheと別credential sourceを排除し、同一操作で変えるのは`OPENCODE_API_KEY`の有無だけというcredential-specific evidenceを要求する。
- 単なるmodel一覧差分だけを認証証拠にしない。
- direct env credentialが使えない場合だけofficial env substitutionへ進み、config source / provider / precedence / Fresh Create注入方法をcheckpointで固定する。
- `/connect` auth cacheをFresh Create前提にしない。

### OpenCode permission

- OpenCodeはupstream default permissionを使用する。
- Codex Safety Harness相当のpermission / sandbox / Hook制御を今回追加しない。
- current default permissionが変更された場合はPhase Aで確認し、今回の境界に影響する変更だけPlanへ反映する。

### Secret非露出

- Secret値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しない。
- OpenCode processへcredentialとしてenvironment variableを渡すこと自体は禁止しない。
- Personal SecretのRepository access変更で既存accessを削除しない。

### Codespaces personalization / cleanup

- dotfilesはaccount-wide設定なので変更前状態と選択Repositoryを記録する。
- success / failure / blocker / user stopを問わずRun終了前に元状態へ戻す。
- validation-only Codespaceも終了前にstopする。
- cleanup自体が失敗した場合はBlockerとして外部状態を明記する。
- 不要Codespaceはdelete候補として報告するが自動deleteしない。

### Full Rebuildと認証状態

- Full Rebuildでは`/workspaces`は保持されるが、通常それ以外のcontainer stateは再生成される。
- E-2でも認証zero-stateを期待し、予期せず認証済みならsymlink / alternate credential store / effective `CODEX_HOME`を調査する。
- Fresh Createはさらに新規Codespace / workspace clone / create-time devcontainer selection / dotfiles未適用を含む完全新規環境の正本とする。

### CODEX_HOME

- effective `CODEX_HOME`を記録し、login / project trust / Hook trust / smoke / subagent / `ci_wait`で同じ値を使う。
- Fresh Createの未認証判定は`codex login status`を正本にし、auth file不在だけで判定しない。
- credential storeの種類を今回のために強制変更しない。

### Codex token / CI integration

- `GH_TOKEN`は`GITHUB_TOKEN`より優先されるためcanonical検証processから除外する。
- Phase B / E-2 / E-3では`ci_wait` server startup / tool discoveryだけをintegration PASSとし、CI conclusionと分離する。
- `wait_for_required_ci`はcanonical Fresh Codespaceをfinal HEADへfast-forwardした後、Phase Fで1回だけ呼ぶ。
- waiter / PR本文更新が完了するまでcanonical Fresh Codespaceをstopしない。

### candidate SHA / main進行

- Phase B CodespaceはGit safety契約に従う`merge --ff-only`だけでcandidateへ同期する。
- reset / rebase / forceで同期問題を隠さない。
- Phase A時点のlatest mainをbaselineとして固定する。
- candidate freeze後にmainが進んだだけではFull Rebuild / Fresh Createを再実行しない。
- branchへmain由来変更を取り込んだ場合、またはRepository契約上同期が必要な場合はcandidate変更として扱う。
- Fresh Create後に環境影響ファイルを変更した場合は新candidateで両方やり直す。

### CodespacesとNative

- CodespacesはWeb / Repository用途。
- Android / iOSの正式検証は既存ローカル経路を維持する。

## 9. 成果物

予定成果物:

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `.devcontainer/devcontainer.json`
- `README.md`
- active Run Artifact

現時点では追加しない:

- root `opencode.json`
- 新しいCodex project config / auth file
- `OPENAI_API_KEY` / `CODEX_API_KEY` / `CODEX_ACCESS_TOKEN` / WIF用Secret
- Docker Compose
- Native toolchain
- 新規CI workflow

ファイル分割は行わない。このPlanはplain Codespaceでの検証、確定値の固定、devcontainer実装、Full Rebuild、Fresh Createが一続きであり、分割すると同じ停止条件と確定事項が複数ファイルへ重複するため。

## 10. 公式資料

実装時にcurrent内容を再確認する。

- [GitHub Codespaces: Rebuilding the container](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace)
- [GitHub Codespaces: Personalizing with dotfiles](https://docs.github.com/en/codespaces/setting-your-user-preferences/personalizing-github-codespaces-for-your-account)
- [GitHub Codespaces: Account-specific secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)
- [GitHub Codespaces: Recommended secrets](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/specifying-recommended-secrets-for-a-repository)
- [GitHub Codespaces: Default environment variables](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
- [Dev Containers TypeScript / Node image](https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md)
- [OpenCode stable installation](https://dev.opencode.ai/docs)
- [OpenCode configuration](https://dev.opencode.ai/docs/config/)
- [OpenCode CLI](https://dev.opencode.ai/docs/cli/)
- [OpenCode agents](https://dev.opencode.ai/docs/agents/)
- [OpenCode commands](https://dev.opencode.ai/docs/commands/)
- [OpenCode providers](https://opencode.ai/docs/providers/)
- [OpenCode permissions](https://dev.opencode.ai/docs/permissions/)
- [OpenCode Zen](https://opencode.ai/docs/zen/)
- [OpenCode V2 beta](https://dev.opencode.ai/v2/docs/)
- [Codex authentication](https://developers.openai.com/codex/auth/)
- [Codex configuration reference](https://developers.openai.com/ja-JP/docs/config-file/config-reference)
- [Codex workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation)
- [Using Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

## 11. 実行タスク

- [ ] 1. Phase A: baseline main / PR head、Repository契約、current公式仕様を再確認する。
- [ ] 2. OpenCode / Codexの正規distributionからlatest non-prerelease stableとexact install sourceを固定する。
- [ ] 3. Personal dotfilesの元状態 / repositoryを記録し、一時的に無効化する。
- [ ] 4. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、既存Repository accessを破壊せず`qa-training-store`を利用可能にする。
- [ ] 5. baseline PR headからdotfilesなしplain Codespaceを作成し、HEAD / default config / frozen installを確認する。
- [ ] 6. OpenCode exact install、baseline provenance、credential-specificなPersonal Secret利用、Zen smokeを検証する。
- [ ] 7. Codex exact install、baseline provenance、effective `CODEX_HOME`、device-code authenticationを検証する。
- [ ] 8. Codex `test:hooks` / trust / preflight / same-session Hook runtime / bounded subagentを同じ`CODEX_HOME`で検証する。
- [ ] 9. `GH_TOKEN`を除外し、`ci_wait` server startup / tool discovery / GitHub read-only connectivityを検証する。wait toolは呼ばない。
- [ ] 10. Phase B→C checkpointへexact version / auth / target node install戦略 / CODEX_HOME / postCreate / smoke契約を固定する。
- [ ] 11. `waitFor: "postCreateCommand"`とcheckpointどおりの逐次・fail-fastな`.devcontainer/devcontainer.json`を実装する。OpenCode permissionはupstream defaultのままとする。
- [ ] 12. READMEを更新する。
- [ ] 13. candidate作成前に`pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 14. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [ ] 15. Phase B Codespaceをclean確認後に`fetch` + `merge --ff-only`でcandidate SHAへ同期する。
- [ ] 16. candidate SHA / clean worktreeを確認し、control shellからFull Rebuildする。Rebuild後の`devcontainerPath`を確認する。
- [ ] 17. Full Rebuild内で認証zero-state、target CLI contract / CODEX_HOME、OpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 18. remote head == candidate SHAを確認し、explicit devcontainer pathでdotfilesなしFresh Codespaceを作成する。
- [ ] 19. Fresh CreateでHEAD / devcontainerPath / dotfiles未適用 / Codex login status zero-state / target contractを確認する。
- [ ] 20. Fresh CreateでOpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 21. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 22. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 23. final working treeで`pnpm run verify` / `git diff --check`を再実行する。
- [ ] 24. tracked Run Artifact / Planを最終状態へ更新して通常commit / pushする。
- [ ] 25. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 26. canonical Fresh Codespaceを`merge --ff-only`でfinal HEADへ同期し、同じeffective `CODEX_HOME`とCodespaces`GITHUB_TOKEN`で`wait_for_required_ci`を1回実行する。
- [ ] 27. `Web CI` / `Mobile App CI` success後にPR本文を更新する。
- [ ] 28. Personal dotfiles設定を元状態へ復元し、validation-only / canonical Fresh Codespaceをstopする。delete候補をREPORTへ記録する。

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressでは、上記checkbox総数にCI確認1件を加算する。
- Task 26でfinal exact HEADに対する`wait_for_required_ci`を1回だけ呼ぶ。Agent自身のpollingへfallbackしない。
- Task 27で`Web CI` / `Mobile App CI`のsuccessとPR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- waiter利用不能時はBlockerとし、終了時cleanup契約を実行してから報告する。
- CI結果記録だけを理由にこのfileを再commitしない。
