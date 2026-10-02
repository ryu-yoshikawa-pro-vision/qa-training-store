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

### 完了条件

以下をすべて満たす。

1. 実装開始時に latest `main`、branch 差分、Repository 契約、current 公式仕様を再確認する。
2. Phase B の plain Codespace と canonical Fresh Create は、どちらも Personal dotfiles の自動installを無効にした状態から新規作成する。
3. `.devcontainer` 導入前の plain Codespace で OpenCode / Codex CLI を個別に疎通確認する。
4. OpenCode は stable channel の exact version を再インストール可能な install form で固定し、自動更新を無効化する。
5. OpenCode Zen への認証を Personal `OPENCODE_API_KEY` から再現できる exact mechanism を Phase B で確定する。
6. OpenCode の model 選択はユーザーに委ねる。Free / paid、model ID、provider内のmodel選択を Repository / devcontainer / harness の合否条件にしない。
7. OpenCode の標準利用で Repository を読め、tracked fileを変更しないread-only smokeと、ignored artifactだけを書けるbounded development smokeが成功する。
8. `qa-training-store` は public Repository として扱い、OpenCodeへRepository内容を送信することを許容する。
9. Secret の保護境界は「OpenCode process から技術的に不可視にする」ことではなく、Secret 値を prompt / completion / log / Run Artifact / PR 本文へ意図的に含めないこととする。
10. `OPENCODE_API_KEY` は Personal Codespaces Secret とし、`qa-training-store` だけへ access を許可する。
11. Codex CLI は ChatGPT 認証を使用し、API key / access token / WIF を代替認証として使っていないことを確認する。
12. Codespaces のような remote / headless 環境では device-code authentication を正規経路とし、`codex login --device-auth` で認証できない場合は API key へ fallback せず停止する。
13. Codex は既存 `.codex/config.toml`、project trust、Hook trust、`diagnose:hooks`、`test:hooks`、Linux `codex-safe.sh`、`ci_wait` MCP、bounded subagentを含む Repository 固有の既存契約が Codespaces 上でも実Runtimeで成立する。
14. Dev Container image は `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm` を使用する。実装開始時に tag が current supported major であることを再確認し、存在しない場合だけ同じ固定方針で Plan を更新する。
15. `remoteUser` は公式 image の非 root `node` user とし、`whoami` と `id -u` で確認する。
16. `forwardPorts` は 8081 だけとする。Training Runtime 8082 の外部 forwarding は今回の対象外。
17. `.devcontainer` / README実装と事前Repository検証後、環境再現性に影響する全変更を含む candidate commit を通常pushし、candidate SHAを固定する。
18. canonical Full Rebuild と canonical Fresh Create は同じ candidate SHAを検証対象にする。
19. canonical Full Rebuild は `gh codespace rebuild --full` を使用し、通常 Rebuild を代替として認めない。
20. candidate SHA の Full Rebuild 後に Node / pnpm / OpenCode / Codex / Repository integration / Web Runtime が成立する。
21. candidate SHA から Personal dotfiles を適用しない完全新規 Codespace を作成し、手動 CLI install や home directory / auth cache のコピーなしで再現する。
22. Fresh Create でも OpenCode / Codex / Repository integration / Web Runtime を再確認する。
23. OpenCode / Codex は Repository 固有情報を読んで成果物を生成し、shell command で検証する bounded development smoke を成功させる。
24. Fresh Create 後に `.devcontainer/**`、OpenCode authentication / install helper、Codespaces helper、`.codex/**`、`AGENTS.md`、`package.json` / lockfile、install script等の環境・agent動作へ影響するファイルを変更した場合は、新candidate SHAを通常pushし、Full Rebuild / Fresh Createを両方やり直す。
25. Fresh Create後の変更が canonical Plan、Run Artifact、PR本文など検証結果の記録だけの場合はFresh Createをやり直さず、final headとcandidate SHAの差分に環境再現性へ影響する変更がないことを確認する。
26. `pnpm run verify` と `git diff --check` が成功する。
27. Native 経路、Security fallback、application source、test、workflowへ目的外の変更を入れない。
28. 実測で今回のゴール達成に必須と判明した最小変更は canonical Plan を更新して同じ PR #188 で対応する。
29. 最新 PR head で Repository 契約上の必須 CI が成功する。

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
- Codespace作成前に Secret を登録し、Repository access を `qa-training-store` に限定する。
- Codespace作成後に Secret を追加・変更した場合は stop → restart してから検証する。
- `devcontainer.json#secrets` は recommended secret の案内であり、Secret value を保存する機能ではない。
- Codespaces の `GITHUB_TOKEN` は Repository 操作や `ci_wait` MCP に利用できるが、値を prompt / log / Artifact へ出さない。

## 3. 実装中の判断ルール

### Phase B で確定する値

Phase B で次を実測し、Phase C 前に canonical Plan と active Run Artifact へ確定値を追記する。

1. OpenCode stable の package spec、exact version、exact-version reinstall command、binary name。
2. OpenCode の `command -v` 結果、install先、実行 user、PATH 成立条件。
3. OpenCode Zen authentication exact mechanism。
4. Codex CLI stable の package spec、exact version、exact-version reinstall command。
5. Codex の `command -v` 結果、install先、実行 user、PATH 成立条件。
6. Codex device-code authentication の exact 手順と `codex login status` の期待結果。
7. Codex Hook runtime / subagent evidenceとして確認するsession IDとJSONL path。
8. Dev Container image tag が `5-24-bookworm` で利用可能であること。
9. Section 6 の smoke で実際に成功した exact command / prompt / expected result。

OpenCodeのmodel ID、Free / paid、pricing、usage evidenceはcheckpoint対象にしない。

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
7. GitHub Codespaces Personal Settingsでdotfiles自動installを無効にする。Phase Bのplain Codespace作成前からこの状態を維持する。
8. active Run はこの PR の実装 scope を継続する。

### Phase B: dotfilesなし plain Codespace で事前検証

#### B-0: Secretとbaseline

1. Codespace作成前にPersonal Codespaces Secret `OPENCODE_API_KEY` を登録し、Repository accessを `qa-training-store` に限定する。
2. Secretを作成後に変更した場合はCodespaceをstop → restartする。
3. Personal dotfilesが無効なことを再確認する。
4. current branchから新しいplain Codespaceを作成する。既存Codespaceからdotfilesを削除した環境では代替しない。
5. dotfiles repository / setup scriptが適用されていないことを確認する。
6. `node --version`、`corepack --version`、`git --version`、`whoami`、`id -u`を記録する。
7. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode

1. 公式stable docs / releaseからstable channelを確認する。beta / `next` は使用しない。
2. exact versionを指定して再インストールできる install command を選ぶ。`latest` しか指定できない経路は採用しない。
3. `node` userで実行可能か確認し、必要なら install 時だけ `sudo` を使う。その要否をcheckpointへ記録する。
4. `opencode --version`、`command -v opencode`、実体pathを記録する。
5. Fresh shellでも同じbinaryを解決できることを確認する。
6. `OPENCODE_DISABLE_AUTOUPDATE=true` を設定し、起動前後でversionが変わらないことを確認する。
7. `~/.local/share/opencode/auth.json` が存在しない状態で Personal Secret `OPENCODE_API_KEY` を使い、OpenCode Zenへ認証できるか確認する。
8. environment variableだけで成立しない場合は、current stableのofficial env substitutionでprovider `options.apiKey` に `{env:OPENCODE_API_KEY}` 相当を渡せるか確認する。Secret値そのものをconfigへ埋め込まない。
9. `opencode debug config` 等がSecretの展開値を出力し得る場合、raw outputをRun Artifactへ保存しない。
10. environment authenticationまたはofficial env substitutionでFresh Create再現可能な認証が成立した方式を正規経路として確定する。
11. `/connect`で生成されるauth cacheをFresh Create再現性の前提にしない。`/connect`しか成立しない場合は現在方針と不整合なのでPhase Cへ進まずPlanを更新する。
12. 使用するmodelはユーザーが選択する。Free / paid、model ID、価格をPASS / FAIL条件にしない。
13. Section 6のOpenCode read-only / development write smokeを実行する。

OpenCode停止条件:

- stable OpenCode CLIをexact version指定で再インストールできない。
- Fresh shellで同じbinaryを解決できない。
- Personal SecretからFresh Createで再現可能なZen認証経路を構成できない。
- read-only smokeまたはdevelopment write smokeがFAILする。
- OpenCodeが起動時にexact versionから自動更新される。

#### B-2: Codex CLI / ChatGPT authentication

1. 公式stable install経路から exact versionを再インストール可能なcommandを選ぶ。
2. `node` userで実行可能か確認し、必要ならinstall時だけ`sudo`を使う。
3. `codex --version`、`command -v codex`、実体pathを記録する。
4. Fresh shellでも同じbinaryを解決できることを確認する。
5. `OPENAI_API_KEY`、`CODEX_API_KEY`、`CODEX_ACCESS_TOKEN`、`OPENAI_FEDERATION_RULE_ID`、`OPENAI_IDENTITY_TOKEN_FILE` は値を出力せずset / unsetだけを確認する。
6. 上記が設定されている場合はChatGPT認証前に原因を確認し、今回のCodex processから除外する。
7. `codex login --device-auth` を正規認証経路にする。
8. device-code login がChatGPT側で無効なら有効化して再実行する。利用不可または失敗する場合はAPI keyやauth file copyへfallbackせず停止する。
9. `codex login status` がChatGPT認証を肯定的に示すことを確認する。
10. `/status` でsession / model / usageを確認する。

#### B-3: Codex Repository integration

1. `pnpm run test:hooks` を実行する。
2. `pnpm run diagnose:hooks` を実行する。
3. `bash scripts/codex-safe.sh --preset readonly --preflight-only` を実行する。
4. Repository rootからdirect `codex` を起動する。
5. project trustを成立させる。
6. `/hooks` で `.codex/config.toml` がdefinition sourceであること、必要Hookの定義内容、trust状態を確認する。
7. 必要なHookだけを内容確認後にtrustする。
8. trust確認と実行で同じ `CODEX_HOME` を使用する。
9. `ci_wait` MCP がstartupすることを確認する。
10. `ci_wait` からPR #188のcurrent CI statusをread-onlyで取得できることを確認する。Codespaces標準の `GITHUB_TOKEN` を使い、値は出力しない。
11. Section 6のCodex read-only / development smokeを同一sessionで実行し、そのsession IDを記録する。
12. 同一sessionの `hooks-<session_id>.jsonl` または既存loggerのfallback pathだけを確認し、`UserPromptSubmit`、`PostToolUse`、`Stop` が実Runtimeで記録されたことを確認する。
13. 同じCodex sessionから、Repositoryの `packageManager` を読むだけのbounded read-only subagentを1回だけ起動する。
14. 同一session logで `SubagentStart` / `SubagentStop` が同じagent IDに対して記録され、subagentが正常終了したことを確認する。
15. Hook contract PASS、Hook trust、実Runtime event、subagent eventを別のevidenceとして記録する。

Codex停止条件:

- stable Codex CLIをexact version指定で再インストールできない。
- `codex login --device-auth` が利用できない、またはChatGPT認証が完了しない。
- `codex login status` がChatGPT認証を肯定的に示さない。
- 代替認証変数を今回のCodex processから除外できない。
- `test:hooks`、`diagnose:hooks`、readonly preflightのfailureが今回のCodespaces導入に起因し、解消できない。
- project / Hook trustを成立させられない。
- `ci_wait` MCP がstartupしない、またはcurrent PRのread-only CI取得ができない。
- same-session Hook runtime evidenceまたはbounded subagent evidenceを取得できない。
- read-only smokeまたはdevelopment write smokeがFAILする。

### Phase B→C: 確定事項のPlan反映

Phase Bが成功したら `.devcontainer` を編集する前に、canonical Planとactive Run Artifactへ次を追記する。

- OpenCode stable package spec / exact version / reinstall command / binary name。
- OpenCode `command -v`、install先、実行user、PATH成立条件。
- OpenCode Zen authentication exact mechanism。
- Codex CLI package spec / exact version / reinstall command。
- Codex `command -v`、install先、実行user、PATH成立条件。
- Dev Container image tag `5-24-bookworm` の利用可否確認結果。
- Codex device-code loginのexact手順と `codex login status` の期待結果。
- `/hooks` / `ci_wait` / same-session Hook runtime / bounded subagentの確認手順。
- Section 6のsmokeで実際に成功したexact command / prompt / expected result。

OpenCodeのmodel ID、Free / paid、価格、model利用実績は固定しない。このcheckpointが未更新のままPhase Cへ進まない。

### Phase C: `.devcontainer/devcontainer.json` 実装

1. `image` は `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`。
2. `remoteUser` は `node`。
3. `containerEnv` または current Dev Container specで同等のcontainer-wide設定として `OPENCODE_DISABLE_AUTOUPDATE=true` を入れる。
4. `postCreateCommand` は `corepack enable`、`pnpm install --frozen-lockfile`、Phase Bで確定したOpenCode / Codex exact reinstall commandだけを基本とする。
5. `secrets` には `OPENCODE_API_KEY` をrecommended secretとして宣言する。値やdefault tokenは書かない。
6. `forwardPorts` は `[8081]`。
7. OpenCodeのmodelは固定しない。root `opencode.json`、model-specific `OPENCODE_CONFIG_CONTENT`、provider whitelist、Model access、model制御launcherは追加しない。
8. OpenCode認証でofficial env substitutionが必要とPhase Bで確定した場合だけ、Secret値を含まない最小configをdevcontainerの既定環境へ反映する。
9. Codex auth file / ChatGPT tokenをcopy / mountしない。
10. Android / iOS toolchain、Docker-in-Docker、browser一式、CI専用依存、不要なVS Code extensionは追加しない。
11. Phase Bで必須と判明していない限りDockerfileやhelper scriptを増やさない。

### Phase D: README更新

READMEへ次を追加する。

1. Personal Codespaces Secret `OPENCODE_API_KEY` をCodespace作成前に登録し、`qa-training-store`へaccessを許可する手順。
2. Phase B / canonical Fresh CreateではPersonal dotfilesを無効にした新規Codespaceを使うこと。
3. 作成後にSecretを追加・変更した場合はstop → restartが必要であること。
4. `devcontainer.json#secrets` はrecommended secretの案内であり、通常のクイック作成では事前Secret登録を正規手順とすること。
5. `node --version` / `pnpm --version` / `opencode --version` / `codex --version` の確認。
6. OpenCodeのmodelはユーザーがOpenCode上で選択すること。Repository / devcontainerはFree / paidを制限しないこと。
7. OpenCode Zen authentication exact mechanism。
8. Repositoryがpublicであることを前提にOpenCodeへsourceを送信できる一方、Secret値をprompt / completion / log等へ意図的に含めないこと。
9. Codexはremote環境で `codex login --device-auth` を使うこと。
10. CodexではAPI key / access token / WIFやauth file copyへfallbackしないこと。
11. `codex login status`、project trust、`/hooks`、Hook trust、`ci_wait` の初回確認。
12. Full Rebuild / Fresh Create後はCodexを再認証することを正規手順とする。
13. root `AGENTS.md` を上書きしないこと。
14. CodespacesはWeb / Repository validation用で、Windows Android / macOS iOSの正式経路を置き換えないこと。

### Phase E: candidate SHAの作成と実機検証

#### E-0: candidate作成前のRepository検証

1. `.devcontainer` / README /必要なhelper等の実装を完了する。
2. `pnpm run verify` を実行する。
3. `git diff --check`、`git status --short`、PR差分を確認する。
4. Native、Security fallback、application source / test / workflowに目的外差分がないことを確認する。
5. Secret、Codex auth file / token、OpenCode auth情報、`.artifacts`、`node_modules` をcommit対象にしない。

#### E-1: candidate commit / push

1. 環境再現性に影響する全変更を含むcandidate commitを作成する。
2. 通常pushする。force pushしない。
3. remote branch headとlocal HEADが一致することを確認し、candidate SHAをRun Artifactへ記録する。
4. Full Rebuild / Fresh Createはこのcandidate SHAを検証対象とする。

#### E-2: candidate SHAのFull Rebuild

1. candidate SHAをcheckoutしたCodespaceで `gh codespace rebuild --full` を実行する。通常 Rebuild は代替として認めない。
2. Run Artifactへ使用したexact command / operationとcandidate SHAを記録する。
3. postCreateが成功することを確認する。
4. `whoami` が `node`、`id -u` が0以外であることを確認する。
5. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exactを確認する。
6. Fresh shellで `command -v opencode` / `command -v codex` がPhase Bの期待pathを返すことを確認する。
7. `pnpm install --frozen-lockfile` を再実行し、lockfile差分0を確認する。
8. selected modelがcurrent Zen metadata / pricingでもzero-costであることを再確認する。
9. OpenCode auth、version、read-only / development smokeを再検証する。使用するmodelはユーザーが選択し、Free / paidを合否条件にしない。
10. Codexはdevice-code authを再実行し、認証監査、`test:hooks`、Repository integration、same-session Hook runtime、bounded subagent、read-only / development smokeを再検証する。
11. `ci_wait` からPR #188のCIをread-only取得する。
12. `pnpm run start:web` を起動し8081 forwarded portから表示する。

#### E-3: candidate SHAのcanonical Fresh Create

1. GitHub Codespaces Personal Settingsでdotfilesの自動installが無効であることを確認する。
2. Phase B / E-2で使用したCodespaceとは別に、candidate SHAをremote branch headとして新しいCodespaceを作成する。
3. 作成後にcheckout SHAがcandidate SHAと一致することを確認する。
4. dotfiles repositoryやsetup scriptが適用されていないことを確認する。適用されていた場合はcanonical Fresh Create証拠としてFAILとする。
5. manual CLI install、home directory copy、auth cache copyを行わない。
6. devcontainer作成処理だけでNode / pnpm / OpenCode / Codex CLIが揃うことを確認する。
7. `whoami` / `id -u`、version、`command -v`、dependency installを確認する。
8. OpenCodeはPersonal `OPENCODE_API_KEY` だけからPhase Bで確定した認証方式を再現する。
9. OpenCode version、read-only / development smokeを再検証する。使用するmodelはユーザーが選択し、Free / paidを合否条件にしない。
11. Codexは `codex login --device-auth` で新規認証し、認証監査、`test:hooks`、project / Hook trust、`ci_wait`、same-session Hook runtime、bounded subagent、read-only / development smokeを再検証する。
12. `pnpm run start:web` を8081 forwarded portから確認する。

#### E-4: candidate SHAの無効化条件

Fresh Create後に次のいずれかを変更した場合、candidate evidenceは無効とする。

- `.devcontainer/**`
- OpenCode runtime config / launcher / Codespaces helper
- `.codex/**`
- `AGENTS.md`
- `package.json` / lockfile
- install / setup script
- その他、OpenCode / Codex / Node / pnpm / PATH / trust / Hook / MCP / Web起動に影響するファイル

修正後は E-0 → E-1 で新candidate SHAを作成し、E-2 Full RebuildとE-3 Fresh Createを両方やり直す。

canonical Plan、Run Artifact、PR本文など検証結果の記録だけを更新した場合はFresh Createをやり直さない。ただしfinal headとcandidate SHAの差分を確認し、上記の環境再現性へ影響するファイルが含まれないことを証明する。

### Phase F: 最終記録とGitHub検証

1. candidate SHA、Full Rebuild、Fresh Create、OpenCode / Codex evidenceをactive Run Artifactへ記録する。
2. canonical PlanのPhase B→C確定値と実測結果を最終状態へ更新する。
3. PR #188本文へcandidate SHAと検証結果を反映する。
4. `pnpm run verify` と `git diff --check` をfinal working treeで再実行する。
5. Run Artifact / Plan等の最終記録を通常commit /通常pushする。
6. final PR headとcandidate SHAを比較し、Fresh Create後の差分にE-4対象ファイルが0件であることを確認する。含まれる場合はE-0へ戻る。
7. latest PR headの必須CIを確認する。

Full RebuildとFresh Createは異なる失敗を検出するため、どちらも同じcandidate SHAに対して必須とする。

## 6. Smoke契約

Phase BでCLI versionに合わせてexact commandを確定する。各write smokeは実行ごとに一意なartifact pathを使い、開始前に対象pathが存在しないことをpreconditionとして確認する。

### artifact path規則

- OpenCode Phase B: `.artifacts/codespaces-smoke/opencode/phase-b/attempt-<N>.txt`
- OpenCode Full Rebuild: `.artifacts/codespaces-smoke/opencode/full-rebuild/attempt-<N>.txt`
- OpenCode Fresh Create: `.artifacts/codespaces-smoke/opencode/fresh-create/attempt-<N>.txt`
- Codex Phase B: `.artifacts/codespaces-smoke/codex/phase-b/attempt-<N>.txt`
- Codex Full Rebuild: `.artifacts/codespaces-smoke/codex/full-rebuild/attempt-<N>.txt`
- Codex Fresh Create: `.artifacts/codespaces-smoke/codex/fresh-create/attempt-<N>.txt`

同じphaseを再試行する場合はattempt番号を増やし、既存artifactを再利用しない。smoke artifactの削除は完了条件にしない。

### OpenCode read-only

使用するmodelはユーザーが選択する。Free / paid、model IDはPASS / FAIL条件にしない。

prompt:

> root `AGENTS.md` で、すべてのユーザー向け返答に含めるよう求められている4項目だけを列挙してください。ファイルは変更しないでください。

PASS:

- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- tracked file変更0件。

### OpenCode development write

promptの出力先は実行phaseに対応する一意なartifact pathへ置換する。

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、指定されたartifact pathに `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- 実行前に対象artifact pathが存在しない。
- 今回割り当てたartifactだけがsmoke成果物として新規作成される。
- `git check-ignore -q <artifact-path>` が成功する。
- `packageManager` がcurrent `package.json` の実値と一致する。
- `hooks=true` がcurrent `.codex/config.toml` と一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。

### Codex read-only

OpenCode read-onlyと同じpromptをdirect Codexで実行する。

PASS:

- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- tracked file変更0件。
- project config / Hook trust確認済み。
- ChatGPT認証で実行される。
- same-session Hook logで `UserPromptSubmit` と `Stop` を確認できる。

### Codex development write

promptの出力先は実行phaseに対応する一意なartifact pathへ置換する。

> `package.json` の `packageManager` と `.codex/config.toml` の `[features].hooks` を読み、指定されたartifact pathに `packageManager=<実値>` と `hooks=<実値>` の2行だけを書いてください。その後、shell commandで内容を検証してください。tracked fileは変更しないでください。

PASS:

- 実行前に対象artifact pathが存在しない。
- 今回割り当てたartifactだけがsmoke成果物として新規作成される。
- `git check-ignore -q <artifact-path>` が成功する。
- current Repository値と成果物が一致する。
- agent自身がshell commandで内容を検証してPASSを報告する。
- tracked file変更0件。
- same-session Hook logで `UserPromptSubmit`、`PostToolUse`、`Stop` を確認できる。

### Codex bounded subagent

- direct Codexの同一sessionで、read-only subagentを1回だけ起動し、`package.json#packageManager` を読ませる。
- subagentはfile変更、network、追加subagent delegationを行わない。
- main sessionへcurrent `packageManager` を返して正常終了する。
- same-session Hook logで同じagent IDの `SubagentStart` / `SubagentStop` を確認する。
- `.codex/config.toml` の `max_depth = 1` を越えるdelegationが発生しない。

## 7. 検証一覧

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| Phase B環境 | dotfiles無効の新規plain Codespace | dotfiles未適用、clone / frozen install成功 |
| OpenCode stable | exact-version reinstall command | exact version一致、beta / next不使用 |
| OpenCode install provenance | `command -v` / path / user / fresh shell | 同じbinaryを再現 |
| OpenCode auth | Personal `OPENCODE_API_KEY` | auth cacheなしでPhase B確定方式によりZen認証成功 |
| OpenCode model selection | ユーザー操作 | Repository / harnessはFree / paidを制限しない |
| OpenCode smoke | Section 6 | read-only / development write PASS |
| OpenCode version | auto update無効 + 起動前後version | exact version維持 |
| Codex stable | exact-version reinstall command | exact version一致 |
| Codex install provenance | `command -v` / path / user / fresh shell | 同じbinaryを再現 |
| Codex auth | env audit → device auth → `codex login status` | ChatGPT認証を肯定確認 |
| Codex Hook contract | `pnpm run test:hooks` / `diagnose:hooks` / readonly preflight / `/hooks` | contract・definition・trust成立 |
| Codex Hook runtime | same-session JSONL | UserPromptSubmit / PostToolUse / Stop記録 |
| Codex subagent | bounded read-only delegation | SubagentStart / SubagentStop記録、正常終了 |
| Codex MCP | `ci_wait` | PR #188 CIをread-only取得 |
| Codex smoke | Section 6 | read-only / development write PASS |
| non-root | `whoami` / `id -u` | `node` / UID != 0 |
| candidate checkpoint | commit /通常push / SHA記録 | remote headとcandidate SHA一致 |
| Full Rebuild | candidate SHAで `gh codespace rebuild --full` | devcontainerから再構築成功 |
| Fresh Create | dotfilesなしでcandidate SHAから別Codespace | manual install / auth copyなしで再現 |
| dependency | frozen install | PASS、lockfile差分0 |
| Web | `pnpm run start:web` | 8081 forwardから表示 |
| Repository | candidate前とfinal headで `pnpm run verify` | PASS |
| diff | `git diff --check` / `git status --short` | 意図した差分のみ |
| evidence revision | final head vs candidate SHA | Fresh Create後に環境影響差分0 |
| PR | latest head CI | 必須CI成功 |

## 8. リスクと扱い

### OpenCode model選択

- 使用modelはユーザーが選択する。
- Free / paid、model価格、特定model IDをRepository側で制御しない。
- devcontainerやharnessにmodel固定、provider whitelist、Free-only guard、negative control、usage証拠の仕組みを追加しない。
- 将来OpenCode側のmodel availabilityや価格が変わっても、CLI環境自体が正常なら今回の環境再現性failureとはしない。

### OpenCode Zen authentication

- 既存Security fallbackのenvironment authenticationをinteractive stable CLIへ無条件に外挿しない。
- auth cacheなしでPersonal Secretの直接認識を試し、成立しない場合はofficial env substitutionを検証する。
- `opencode debug config` 等がSecretを展開し得る場合、raw outputを保存しない。
- `/connect`で作成されるauth cacheをFresh Create前提にしない。

### Secret境界

- Secretを同一container / userのagent processから技術的に不可視にすることは今回の要件にしない。
- Secret値をprompt / completion / log / Run Artifact / PR本文へ意図的に露出させない。
- Secret値を表示する確認commandは使わない。

### Codespaces personalization

- Phase Bとcanonical Fresh Createの両方からPersonal dotfilesを除外する。
- dotfiles有効時の利便性・互換性は今回の再現性DoDに含めない。

### CLI version / PATH drift

- exact-version reinstall可能なinstall commandだけを採用する。
- install先、実行user、PATHをcheckpointへ固定する。
- Fresh shell / Full Rebuild / Fresh Createで`command -v`を再確認する。

### Codex認証 / Repository integration

- Codespacesではdevice-code authenticationを正規経路とする。
- API key / access token / WIF / auth cache copyへfallbackしない。
- Hook contract / trustだけでなくsame-session実Runtime eventを確認する。
- bounded subagentを1回実行し、既存delegation設定がCodespacesでも成立することを確認する。
- `ci_wait` MCPを既存 `GITHUB_TOKEN` でread-only検証する。

### candidate SHAとFresh Create

- Full Rebuild / Fresh Create前に環境影響ファイルをcandidate commitへ含めて通常pushする。
- Full Rebuild / Fresh Createは同じcandidate SHAで実施する。
- Fresh Create後に環境影響ファイルを変更した場合、旧evidenceを流用せず新candidate SHAで両方やり直す。
- Plan / Run Artifact / PR本文だけの最終記録は再実行理由にしないが、final headとのdiffで環境影響差分0を確認する。

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
- [ ] 2. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、Personal dotfilesを無効化する。
- [ ] 3. dotfilesなしの新規plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 4. OpenCode stable exact install、install provenance、Zen認証を検証する。
- [ ] 5. ユーザーが選択した任意のOpenCode modelでread-only / development smokeとversion固定を確認する。
- [ ] 6. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 7. Codex device-code authentication / login statusを確認する。
- [ ] 8. Codex `test:hooks` / project trust / Hook trust / readonly preflight / `ci_wait` を検証する。
- [ ] 9. Codex read-only / development smokeとsame-session Hook runtime evidenceを確認する。
- [ ] 10. bounded read-only subagentを1回実行しSubagentStart / SubagentStopを確認する。
- [ ] 11. Phase B→C checkpointをcanonical Plan / active Runへ固定する。
- [ ] 12. `.devcontainer/devcontainer.json` を実装する。
- [ ] 13. READMEを更新する。
- [ ] 14. candidate作成前に `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 15. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録する。
- [ ] 16. candidate SHAで `gh codespace rebuild --full` を実行し統合検証する。
- [ ] 17. 同じcandidate SHAからdotfilesなしFresh Codespaceを作成し統合検証する。
- [ ] 18. Web 8081 forwarded portをFull Rebuild / Fresh Createの両方で確認する。
- [ ] 19. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 20. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 21. final working treeで `pnpm run verify` / `git diff --check` を再実行する。
- [ ] 22. 最終記録を通常commit / pushする。
- [ ] 23. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 24. latest head必須CIを確認する。



- [ ] 1. Phase A: latest main / branch / Repository契約 / current公式仕様を再確認する。
- [ ] 2. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、Personal dotfilesを無効化する。
- [ ] 3. dotfilesなしの新規plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 4. OpenCode stable exact install、install provenance、Zen認証を検証する。
- [ ] 5. current Zen metadata / pricingからzero-cost候補を決定論的に列挙する。
- [ ] 6. current stableの全config sourceとFree-only effective configを検証する。
- [ ] 7. OpenCode candidateごとのread-only / development smoke、session-bound usage evidence、version固定を確認する。
- [ ] 8. selected modelに対するnon-selected zero-cost model negative controlを行う。
- [ ] 9. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 10. Codex device-code authentication / login statusを確認する。
- [ ] 11. Codex `test:hooks` / project trust / Hook trust / readonly preflight / `ci_wait` を検証する。
- [ ] 12. Codex read-only / development smokeとsame-session Hook runtime evidenceを確認する。
- [ ] 13. bounded read-only subagentを1回実行しSubagentStart / SubagentStopを確認する。
- [ ] 14. Phase B→C checkpointをcanonical Plan / active Runへ固定する。
- [ ] 15. `.devcontainer/devcontainer.json` を実装する。
- [ ] 16. READMEを更新する。
- [ ] 17. candidate作成前に `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 18. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録する。
- [ ] 19. candidate SHAで `gh codespace rebuild --full` を実行し統合検証する。
- [ ] 20. 同じcandidate SHAからdotfilesなしFresh Codespaceを作成し統合検証する。
- [ ] 21. Web 8081 forwarded portをFull Rebuild / Fresh Createの両方で確認する。
- [ ] 22. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 23. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 24. final working treeで `pnpm run verify` / `git diff --check` を再実行する。
- [ ] 25. 最終記録を通常commit / pushする。
- [ ] 26. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 27. latest head必須CIを確認する。
