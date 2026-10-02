# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

GitHub Codespaces 上で `qa-training-store` を開発できる環境を導入する。OpenCode は OpenCode Zen の Free model だけを利用し、Codex CLI は ChatGPT アカウントで認証して ChatGPT プランの Codex 利用枠を使用する。

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

### 完了条件

以下をすべて満たす。

1. 実装開始時に latest `main`、branch 差分、Repository 契約、current 公式仕様を再確認する。
2. `.devcontainer` 導入前の plain Codespace で OpenCode / Codex CLI を個別に疎通確認する。
3. OpenCode は stable channel だけを対象とし、beta / `next` は使用しない。
4. OpenCode stable の exact version を再インストール可能な install form で固定し、自動更新を無効化する。
5. OpenCode は利用可能な `opencode/*-free` のうち決定論的な順序で候補を検証し、read-only / development write / Free-only / version 固定をすべて満たした最初の model を採用する。
6. OpenCode は selected Free model 以外の LLM request を通常利用で発生させない。main model、`small_model`、title / summary / compaction、利用する primary agent / subagent、command の model override、provider 選択を確認する。
7. OpenCode の Free-only 設定は README の手動設定に依存させず、`.devcontainer` から起動した通常 shell の既定状態へ反映する。
8. Free-only を current stable OpenCode で技術的に構成できない、または実利用 model を証明できない場合は Phase C へ進まない。
9. `qa-training-store` は public Repository として扱い、OpenCode Free model による Repository 内容や prompt / completion の学習利用を許容する。
10. Secret の保護境界は「OpenCode process から技術的に不可視にする」ことではなく、Secret 値を prompt / completion / log / Run Artifact / PR 本文へ意図的に含めないこととする。
11. `OPENCODE_API_KEY` は Personal Codespaces Secret とし、`qa-training-store` だけへ access を許可する。
12. OpenCode Zen の認証は Personal `OPENCODE_API_KEY` から current stable OpenCode CLI へ接続できる exact mechanism を Phase B で確定する。
13. Codex CLI は ChatGPT 認証を使用し、API key / access token / WIF を代替認証として使っていないことを確認する。
14. Codespaces のような remote / headless 環境では device-code authentication を正規経路とし、`codex login --device-auth` で認証できない場合は API key へ fallback せず停止する。
15. Codex は既存 `.codex/config.toml`、project trust、Hook trust、`diagnose:hooks`、Linux `codex-safe.sh`、`ci_wait` MCP を含む Repository 固有の既存契約が Codespaces 上でも成立する。
16. Dev Container image は `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm` を使用する。実装開始時に tag が current supported major であることを再確認し、存在しない場合だけ同じ固定方針で Plan を更新する。
17. `remoteUser` は公式 image の非 root `node` user とし、`whoami` と `id -u` で確認する。
18. `forwardPorts` は 8081 だけとする。Training Runtime 8082 の外部 forwarding は今回の対象外。
19. Full Rebuild 後に Node / pnpm / OpenCode / Codex / Repository integration / Web Runtime が成立する。
20. Phase B / Full Rebuild で使用した Codespace とは別に、personal dotfiles を適用しない完全新規 Codespace を branch 最新 head から作成し、手動 CLI install や home directory のコピーなしで再現する。
21. Fresh Create でも OpenCode / Codex / Repository integration / Web Runtime を再確認する。
22. OpenCode / Codex は Repository 固有情報を読んで成果物を生成し、shell command で検証する bounded development smoke を成功させる。
23. `pnpm run verify` と `git diff --check` が成功する。
24. Native 経路、Security fallback、application source、test、workflowへ目的外の変更を入れない。
25. 実測で今回のゴール達成に必須と判明した最小変更は canonical Plan を更新して同じ PR #188 で対応する。単なる改善や将来拡張だけを別課題へ送る。
26. 最新 PR head で Repository 契約上の必須 CI が成功する。

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

- OpenCode config は置換ではなく merge され、`OPENCODE_CONFIG_CONTENT` は通常の user / project 設定より後で適用される runtime override である。
- `model` と `small_model` は別設定で、`small_model` は title 等の軽量処理に使われる。
- built-in agent には Build / Plan、subagent の General / Explore / Scout、hidden agent の Compaction / Title / Summary がある。
- agent / command は個別に model を override できる。
- `enabled_providers` は provider allowlistとして利用できる。
- provider `whitelist` は picker 上の model を絞るが、それ単体を hard guard とみなさない。
- `opencode debug config` で resolved config を確認できる。
- OpenCode は既定で自動更新するため、exact version installだけではversion固定にならない。
- `OPENCODE_DISABLE_AUTOUPDATE` で自動更新チェックを無効化できる。
- current stable と V2 beta は別 channel。今回の対象は stable のみ。

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
- dotfiles は CLI install、PATH、global config、Git config 等を変更できるため、Fresh Create の再現性証拠から分離する。
- canonical Fresh Create は「Automatically install dotfiles」を無効にした状態で実施する。
- Settings Sync は今回の CLI / shell 再現性判定の主対象にしない。

### Secret / credential

- `OPENCODE_API_KEY` はユーザー固有の Personal Codespaces Secret とする。
- Codespace作成前に Secret を登録し、Repository access を `qa-training-store` に限定する。
- Codespace作成後に Secret を追加・変更した場合は stop → restart してから検証する。
- `devcontainer.json#secrets` は recommended secret の案内であり、Secret value を保存する機能ではない。
- Codespaces の `GITHUB_TOKEN` は Repository 操作や `ci_wait` MCP に利用できるが、値を prompt / log / Artifact へ出さない。

## 3. 実装中の判断ルール

### Phase B で確定する値

Phase B で次を実測し、Phase C 前に canonical Plan と active Run Artifact へ確定値を追記する。

1. OpenCode stable の package spec、exact version、exact-version reinstall command、binary name。
2. OpenCode の `command -v` 結果、install先、実行 user、PATH 成立条件。
3. Codex CLI stable の package spec、exact version、exact-version reinstall command。
4. Codex の `command -v` 結果、install先、実行 user、PATH 成立条件。
5. 利用可能な `opencode/*-free` model 一覧。
6. 決定論的な候補順で最初に全条件を満たした selected Free model ID。
7. OpenCode Free-only の exact `OPENCODE_CONFIG_CONTENT`。
8. OpenCode Zen authentication exact mechanism。
9. OpenCode の resolved config / model usage を確認する exact command。
10. Codex device-code authentication の exact 手順と `codex login status` の期待結果。
11. Dev Container image tag が `5-24-bookworm` で利用可能であること。
12. Section 6 の smoke で実際に成功した exact command / prompt / expected result。

これらを推測で Phase C へ持ち込まない。

### Free model の選定規則

`opencode models --refresh` または current stable の同等公式 command から `opencode/*-free` を抽出する。

1. model ID を ASCII 昇順で sort する。
2. 先頭から Section 6 の read-only / development write / Free-only / version 固定を実行する。
3. すべて PASS した最初の model を selected Free model とする。
4. 1件の失敗では停止せず次候補へ進む。
5. 全候補が失敗した場合は Phase C へ進まない。

性能比較・ランキングは行わない。

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
  - Phase B で確定した Free-only `OPENCODE_CONFIG_CONTENT`
  - recommended secret `OPENCODE_API_KEY`
  - `forwardPorts: [8081]`
- `README.md`
  - Codespaces 作成前の Personal Secret 設定
  - dotfiles を無効にした canonical Fresh Create 検証
  - OpenCode Free-only の通常起動
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

1. branch が `plan/codespaces-opencode-devcontainer`、対象 PR が #188 であることを確認する。
2. `git fetch origin` 後、latest `origin/main` と branch の ahead / behind、working tree、upstream を確認する。
3. main 更新がある場合は Git safety 契約に従って最新 base を取り込む。force push は使わない。
4. `package.json`、README、CI、`.codex/config.toml`、`scripts/codex-safe.sh`、Hook関連正本がPlan前提から変わっていないか確認する。
5. OpenCode / GitHub Codespaces / Dev Containers / Codex の公式仕様を実装日基準で再確認する。
6. Repository visibility が public のままであることを確認する。privateへ変更されていた場合はOpenCodeへsourceを送る前に停止する。
7. GitHub Codespaces の Personal Settings で dotfiles 自動installの状態を確認する。canonical Fresh Create前には無効化する。
8. active Run はこの PR の実装 scope を継続する。同一 task を別 session で実装する場合は Repository の Run lifecycle に従う。

### Phase B: plain Codespace で事前検証

#### B-0: Secretとbaseline

1. Codespace作成前にPersonal Codespaces Secret `OPENCODE_API_KEY` を登録し、Repository accessを `qa-training-store` に限定する。
2. Secretを作成後に変更した場合はCodespaceをstop → restartする。
3. current branchからplain Codespaceを作成する。
4. `node --version`、`corepack --version`、`git --version`、`whoami`、`id -u`を記録する。
5. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode install / authentication

1. 公式stable docs / releaseからstable channelを確認する。beta / `next` は使用しない。
2. exact versionを指定して再インストールできる install command を選ぶ。`latest` しか指定できない経路は採用しない。
3. `node` userで実行可能か確認し、必要なら install 時だけ `sudo` を使う。その要否をcheckpointへ記録する。
4. `opencode --version`、`command -v opencode`、実体pathを記録する。
5. Fresh shellでも同じbinaryを解決できることを確認する。
6. `OPENCODE_DISABLE_AUTOUPDATE=true` を設定する。
7. `~/.local/share/opencode/auth.json` が存在しない状態で Personal Secret `OPENCODE_API_KEY` を環境変数として渡し、`opencode models` と最小 `opencode run` がZen認証に成功するか確認する。
8. 7が成功した場合、Codespacesの正規Zen認証方式を `OPENCODE_API_KEY` environment authentication として確定する。
9. 7が失敗した場合、current stable公式仕様と既存Repository automationとの差分を確認する。`/connect`でしか認証できずPersonal Secretを通常起動から利用できない場合は、誤ったSecret前提のままPhase Cへ進まずPlanを更新する。
10. `/connect`で生成される `~/.local/share/opencode/auth.json` をFresh Create再現性の前提にはしない。

#### B-2: OpenCode Free-only

1. `opencode models` の出力から `opencode/*-free` を取得し、Section 3の選定規則で候補順を確定する。
2. 候補ごとに runtime config を作成する。最低限、次を含める。
   - `model`: selected candidate
   - `small_model`: selected candidate
   - `enabled_providers: ["opencode"]`
   - provider `opencode` の model `whitelist`: selected candidate のmodel部分
   - current stableでmodel override可能なbuilt-in agentのうち、通常利用で発火し得るものをselected candidateへ固定
3. provider `whitelist` は picker 制限として扱い、単独の hard guard とはみなさない。
4. `OPENCODE_CONFIG_CONTENT` を使い、`opencode debug config` で resolved config を確認する。
5. global / project / `.opencode` / agent / command由来でselected candidate以外のmodel指定が残っていないか確認する。
6. Title / Summary / Compaction と利用する primary / subagent のeffective modelを確認する。
7. Section 6のread-only smoke、development smokeを実行する。
8. current Zen usage / activity等、実際に利用modelを確認できる公式またはOpenCode提供手段で、発生したLLM requestがselected candidateだけであることを確認する。
9. usage evidenceを取得できない、または別model requestを除外できない場合、その候補はFAILとする。
10. `opencode --version` を起動前後で確認し、自動更新されていないことを確認する。
11. 全候補FAILならPhase Cへ進まない。

#### B-3: Codex CLI / ChatGPT authentication

1. 公式stable install経路から exact versionを再インストール可能なcommandを選ぶ。
2. `node` userで実行可能か確認し、必要ならinstall時だけ`sudo`を使う。
3. `codex --version`、`command -v codex`、実体pathを記録する。
4. Fresh shellでも同じbinaryを解決できることを確認する。
5. 次の環境変数について、値を出力せず set / unset だけを確認する。
   - `OPENAI_API_KEY`
   - `CODEX_API_KEY`
   - `CODEX_ACCESS_TOKEN`
   - `OPENAI_FEDERATION_RULE_ID`
   - `OPENAI_IDENTITY_TOKEN_FILE`
6. 上記が設定されている場合はChatGPT認証前に原因を確認し、今回のCodex processから除外する。値は表示・記録しない。
7. Codespacesはremote環境として、`codex login --device-auth` を正規認証経路にする。
8. device-code login がChatGPT側で無効なら有効化して再実行する。利用不可または失敗する場合はAPI keyやauth file copyへfallbackせず停止する。
9. `codex login status` がChatGPT認証を肯定的に示すことを確認する。
10. `/status` でsession / model / usageを確認する。

#### B-4: Codex Repository integration

1. `pnpm run diagnose:hooks` を実行する。
2. `bash scripts/codex-safe.sh --preset readonly --preflight-only` を実行する。
3. Repository rootからdirect `codex` を起動する。
4. project trustを成立させる。
5. `/hooks` で `.codex/config.toml` がdefinition sourceであること、必要Hookの定義内容、trust状態を確認する。
6. 必要なHookだけを内容確認後にtrustする。
7. trust確認と実行で同じ `CODEX_HOME` を使用する。
8. `ci_wait` MCP がstartupすることを確認する。
9. `ci_wait` からPR #188のcurrent CI statusをread-onlyで取得できることを確認する。Codespaces標準の `GITHUB_TOKEN` を使い、値は出力しない。
10. Section 6のCodex read-only / development smokeを実行する。

Codex停止条件:

- stable Codex CLIをexact version指定で再インストールできない。
- `codex login --device-auth` が利用できない、またはChatGPT認証が完了しない。
- `codex login status` がChatGPT認証を肯定的に示さない。
- 代替認証変数を今回のCodex processから除外できない。
- `diagnose:hooks` またはreadonly preflightのfailureが今回のCodespaces導入に起因し、解消できない。
- project / Hook trustを成立させられない。
- `ci_wait` MCP がstartupしない、またはcurrent PRのread-only CI取得ができない。
- read-only smokeまたはdevelopment write smokeがFAILする。

### Phase B→C: 確定事項のPlan反映

Phase Bが成功したら `.devcontainer` を編集する前に、canonical Planとactive Run Artifactへ次を追記する。

- OpenCode stable package spec / exact version / reinstall command / binary name。
- OpenCode `command -v`、install先、実行user、PATH成立条件。
- Codex CLI package spec / exact version / reinstall command。
- Codex `command -v`、install先、実行user、PATH成立条件。
- selected `opencode/*-free` model ID。
- selected modelの候補順での位置と、それ以前の候補がFAILした理由。
- Free-only `OPENCODE_CONFIG_CONTENT` のexact JSON。
- `opencode debug config` の確認項目。
- selected model以外のLLM requestが0件であることを確認したexact method。
- OpenCode Zen authentication exact mechanism。
- Dev Container image tag `5-24-bookworm` の利用可否確認結果。
- Codex device-code loginのexact手順と `codex login status` の期待結果。
- `/hooks` / `ci_wait` の確認手順。
- Section 6のsmokeで実際に成功したexact command / prompt / expected result。

このcheckpointが未更新のままPhase Cへ進まない。

### Phase C: `.devcontainer/devcontainer.json` 実装

1. `image` は `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`。
2. `remoteUser` は `node`。
3. `containerEnv` または current Dev Container specで同等のcontainer-wide設定として次を入れる。
   - `OPENCODE_DISABLE_AUTOUPDATE=true`
   - Phase Bで確定したFree-only `OPENCODE_CONFIG_CONTENT`
4. `postCreateCommand` は次だけを実行する。
   - `corepack enable`
   - `pnpm install --frozen-lockfile`
   - Phase Bで確定したOpenCode exact reinstall command
   - Phase Bで確定したCodex exact reinstall command
5. `secrets` には `OPENCODE_API_KEY` をrecommended secretとして宣言する。値やdefault tokenは書かない。
6. `forwardPorts` は `[8081]`。
7. root `opencode.json` は追加しない。Free-onlyはinline runtime configをdevcontainerの既定環境として注入する。
8. Codex auth file / ChatGPT tokenをcopy / mountしない。
9. Android / iOS toolchain、Docker-in-Docker、browser一式、CI専用依存、不要なVS Code extensionは追加しない。
10. Phase Bで必須と判明していない限りDockerfileやhelper scriptを増やさない。

### Phase D: README更新

READMEへ次を追加する。

1. Personal Codespaces Secret `OPENCODE_API_KEY` をCodespace作成前に登録し、`qa-training-store`へaccessを許可する手順。
2. 作成後にSecretを追加・変更した場合はstop → restartが必要であること。
3. `devcontainer.json#secrets` はrecommended secretの案内であり、通常のクイック作成では事前Secret登録を正規手順とすること。
4. canonical Fresh Create検証ではPersonal dotfilesの自動installを無効にすること。
5. `node --version` / `pnpm --version` / `opencode --version` / `codex --version` の確認。
6. OpenCode Free-only設定はdevcontainerから既定で渡されるため、通常利用者がmodel設定を手入力しないこと。
7. Free model一覧やcurrent latest versionは固定しないが、このdevcontainerで採用したselected model IDは再現性のため固定されること。利用不能になった場合は意図した保守変更で更新すること。
8. OpenCode Zen authentication exact mechanism。
9. OpenCode Free modelの学習利用を許容する一方、Secret値をprompt / completion / log等へ意図的に含めないこと。
10. Codexはremote環境で `codex login --device-auth` を使うこと。
11. CodexではAPI key / access token / WIFやauth file copyへfallbackしないこと。
12. `codex login status`、project trust、`/hooks`、Hook trust、`ci_wait` の初回確認。
13. Full Rebuild / Fresh Create後はCodexを再認証することを正規手順とする。保持されていた場合も認証状態を再確認する。
14. root `AGENTS.md` を上書きしないこと。
15. CodespacesはWeb / Repository validation用で、Windows Android / macOS iOSの正式経路を置き換えないこと。

### Phase E: Dev Container実機検証

#### E-1: Full Rebuild

1. `.devcontainer` 反映済みCodespaceでFull Rebuildを実行する。
2. cacheに依存せずpostCreateが成功することを確認する。
3. `whoami` が `node`、`id -u` が0以外であることを確認する。
4. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exactを確認する。
5. Fresh shellで `command -v opencode` / `command -v codex` がPhase Bの期待pathを返すことを確認する。
6. `pnpm install --frozen-lockfile` を再実行し、lockfile差分0を確認する。
7. OpenCode auth、resolved Free-only config、read-only / development smoke、usage evidenceを再検証する。
8. Codexは必ずdevice-code authを再実行し、認証監査、Repository integration、read-only / development smokeを再検証する。
9. `ci_wait` からPR #188のCIをread-only取得する。
10. `pnpm run start:web` を起動し8081 forwarded portから表示する。

#### E-2: canonical Fresh Create

1. GitHub Codespaces Personal Settingsでdotfilesの自動installが無効であることを確認する。
2. Phase B / E-1で使用したCodespaceとは別に、branch最新headから新しいCodespaceを作成する。
3. dotfiles repositoryやsetup scriptが適用されていないことを確認する。適用されていた場合はcanonical Fresh Create証拠としてFAILとする。
4. manual CLI install、home directory copy、auth cache copyを行わない。
5. devcontainer作成処理だけでNode / pnpm / OpenCode / Codex CLIが揃うことを確認する。
6. `whoami` / `id -u`、version、`command -v`、dependency installを確認する。
7. OpenCodeはPersonal `OPENCODE_API_KEY` だけからPhase Bで確定した認証方式を再現する。
8. OpenCode resolved Free-only config、read-only / development smoke、usage evidenceを再検証する。
9. Codexは `codex login --device-auth` で新規認証し、認証監査、project / Hook trust、`ci_wait`、read-only / development smokeを再検証する。
10. `pnpm run start:web` を8081 forwarded portから確認する。

Full RebuildとFresh Createは異なる失敗を検出するため、どちらも必須とする。

### Phase F: Repository / GitHub検証

1. `pnpm run verify`。
2. `git diff --check`。
3. `git status --short` とPR差分を確認する。
4. Native、Security fallback、application source / test / workflowに目的外差分がないことを確認する。
5. Secret、Codex auth file / token、OpenCode auth情報、`.artifacts`、`node_modules` をcommitしない。
6. active Run Artifactを確定する。
7. 通常commit /通常push。force pushしない。
8. PR #188本文へ実測結果を反映する。
9. latest PR headの必須CIを確認する。

## 6. Smoke契約

Phase BでCLI versionに合わせてexact commandを確定するが、prompt、対象file、PASS / FAIL条件は以下を正本とする。

### OpenCode read-only

prompt:

> root `AGENTS.md` で、すべてのユーザー向け返答に含めるよう求められている4項目だけを列挙してください。ファイルは変更しないでください。

PASS:

- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- tracked file変更0件。
- resolved configでselected Free model以外のmodel overrideが残っていない。
- usage evidenceでselected Free model以外のLLM requestが0件。

### OpenCode development write

prompt:

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、`.artifacts/codespaces-smoke/opencode-repo.txt` に `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- `.artifacts/codespaces-smoke/opencode-repo.txt` だけがsmoke成果物として作成される。
- `git check-ignore -q .artifacts/codespaces-smoke/opencode-repo.txt` が成功する。
- `packageManager` がcurrent `package.json` の実値と一致する。
- `hooks=true` がcurrent `.codex/config.toml` と一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。
- usage evidenceでselected Free model以外のLLM requestが0件。
- smoke artifactの削除は完了条件にしない。

### Codex read-only

OpenCode read-onlyと同じpromptをdirect Codexで実行する。

PASS:

- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- tracked file変更0件。
- project config / Hook trust確認済み。
- ChatGPT認証で実行される。

### Codex development write

prompt:

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、`.artifacts/codespaces-smoke/codex-repo.txt` に `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- `.artifacts/codespaces-smoke/codex-repo.txt` だけがsmoke成果物として作成される。
- `git check-ignore -q .artifacts/codespaces-smoke/codex-repo.txt` が成功する。
- current Repository値と成果物が一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。
- smoke artifactの削除は完了条件にしない。

## 7. 検証一覧

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| baseline | plain Codespace | clone / frozen install成功 |
| dotfiles境界 | Personal Settings + Fresh Create | canonical Fresh Createでdotfiles未適用 |
| OpenCode stable | exact-version reinstall command | exact version一致、beta / next不使用 |
| OpenCode install provenance | `command -v` / path / user / fresh shell | 同じbinaryを再現 |
| OpenCode auth | Personal `OPENCODE_API_KEY` | Phase B確定方式でZen認証成功 |
| OpenCode Free-only | resolved config + usage evidence | selected Free model以外0件 |
| OpenCode version | auto update無効 + 起動前後version | exact version維持 |
| OpenCode smoke | Section 6 | read-only / development write PASS |
| Codex stable | exact-version reinstall command | exact version一致 |
| Codex install provenance | `command -v` / path / user / fresh shell | 同じbinaryを再現 |
| Codex auth | env audit → device auth → `codex login status` | ChatGPT認証を肯定確認 |
| Codex Hooks | `diagnose:hooks` / readonly preflight / `/hooks` | project config・Hook・trust成立 |
| Codex MCP | `ci_wait` | PR #188 CIをread-only取得 |
| Codex smoke | Section 6 | read-only / development write PASS |
| non-root | `whoami` / `id -u` | `node` / UID != 0 |
| Full Rebuild | cache消去Rebuild | devcontainerから再構築成功 |
| Fresh Create | dotfilesなしの別Codespace | manual install / auth copyなしで再現 |
| dependency | frozen install | PASS、lockfile差分0 |
| Web | `pnpm run start:web` | 8081 forwardから表示 |
| Repository | `pnpm run verify` | PASS |
| diff | `git diff --check` / `git status --short` | 意図した差分のみ |
| PR | latest head CI | 必須CI成功 |

## 8. リスクと扱い

### Free model availability

- Free model一覧は固定しない。
- selected model IDはdevcontainerの再現性契約として固定する。
- selected modelが利用不能になった場合は意図した保守変更で再選定する。
- Phase Bの候補選定はASCII昇順とし、実装者判断を残さない。

### Free-only制約

- `--model` や `small_model` だけで完了扱いにしない。
- `enabled_providers`、picker whitelist、resolved config、agent / command override確認、usage evidenceを組み合わせる。
- picker whitelist単独をhard guardとみなさない。
- selected Free model以外を技術的に排除・検証できない場合は停止する。

### OpenCode Zen authentication

- 既存Security fallbackでは`OPENCODE_API_KEY`環境変数を使っているが、interactive stable CLIで同一挙動を推測しない。
- auth cacheがないplain CodespaceでPersonal Secretだけから認証可能か実測する。
- `/connect`しか利用できない場合はPersonal Secret前提との不整合をPlanへ戻して解消してから進む。

### Secret境界

- Secretを同一container / userのagent processから技術的に不可視にすることは今回の要件にしない。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に露出させない。
- Secret値を表示する確認commandは使わない。

### Codespaces personalization

- dotfilesはcanonical Fresh Createから除外する。
- dotfiles有効時の利便性・互換性は今回の再現性DoDに含めない。

### CLI version / PATH drift

- exact-version reinstall可能なinstall commandだけを採用する。
- install先、実行user、PATHをcheckpointへ固定する。
- Fresh shell / Full Rebuild / Fresh Createで`command -v`を再確認する。

### Codex認証

- Codespacesではdevice-code authenticationを正規経路とする。
- API key / access token / WIF / auth cache copyへfallbackしない。
- Full Rebuild / Fresh Createでは再認証を正規手順として実行する。

### `AGENTS.md` / Codex harness互換性

- 先回りして変更しない。
- OpenCode / Codex smokeで実害を確認する。
- 実害が今回のゴールを妨げる場合、Plan更新後に同じPRで最小修正する。

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
- [OpenCode Zen](https://opencode.ai/docs/zen/)
- [OpenCode V2 beta](https://dev.opencode.ai/v2/docs/)
- [Codex authentication](https://developers.openai.com/codex/auth/)
- [Codex configuration reference](https://developers.openai.com/ja-JP/docs/config-file/config-reference)
- [Codex workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation)
- [Using Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

## 11. 実行タスク

- [ ] 1. Phase A: latest main / branch / Repository契約 / current公式仕様を再確認する。
- [ ] 2. Personal `OPENCODE_API_KEY` Codespaces Secretとdotfiles設定を確認する。
- [ ] 3. plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 4. OpenCode stable exact install、install provenance、Zen認証を検証する。
- [ ] 5. Free model候補を決定論的に列挙し、Free-only effective configを検証する。
- [ ] 6. OpenCode read-only / development smoke、usage evidence、version固定を確認する。
- [ ] 7. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 8. Codex device-code authentication / login statusを確認する。
- [ ] 9. Codex project trust / Hook trust / existing harness / `ci_wait` を検証する。
- [ ] 10. Codex read-only / development smokeを行う。
- [ ] 11. Phase B→C checkpointをcanonical Plan / active Runへ固定する。
- [ ] 12. `.devcontainer/devcontainer.json` を実装する。
- [ ] 13. READMEを更新する。
- [ ] 14. Full Rebuild後の統合検証を行う。
- [ ] 15. dotfilesなしの完全新規CodespaceでFresh Create検証を行う。
- [ ] 16. Web 8081 forwarded portを確認する。
- [ ] 17. `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 18. active Run ArtifactとPR #188本文を最終結果へ更新する。
- [ ] 19. 通常commit / push後、latest head必須CIを確認する。
