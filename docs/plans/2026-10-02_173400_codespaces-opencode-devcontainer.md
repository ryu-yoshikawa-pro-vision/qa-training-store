# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

- GitHub Codespaces 上で `qa-training-store` を開発できる環境を導入する。
- OpenCode は OpenCode Zen の Free model のみを利用する。
- Codex CLI は `Sign in with ChatGPT` を使い、ChatGPT プランの Codex 利用枠を利用する。
- OpenCode / Codex CLI の疎通を素の Codespace で確認してから `.devcontainer` を実装する。
- 同じ PR #188 で Plan、実装、Codespaces 実機検証、Repository検証、CI確認まで完了する。
- Native の Windows / macOS ローカル開発経路は維持し、Codespacesへ移さない。

作成基準:
- 初回 base: `main@84ce165493649550832731a60cf436f8ae29c56b`
- branch: `plan/codespaces-opencode-devcontainer`
- PR: `#188`
- 初回作成: 2026-10-02 JST
- 複数レビュー反映: 2026-10-02 JST

## 1. ゴール / 完了条件

### ゴール

Codespaces を Web / TypeScript / Repository 検証と OpenCode / Codex CLI 開発に利用でき、`.devcontainer` から同等の環境を Full Rebuild と完全新規 Codespace の両方で再現できる状態にする。

### 完了条件

以下をすべて満たす。

1. 実装開始時に latest `main`、branch差分、Repository契約、公式仕様を再確認する。
2. `.devcontainer` 導入前の素の Codespace で OpenCode / Codex CLI を個別に疎通確認する。
3. OpenCode は stable channel だけを対象とし、beta / `next` は使用しない。
4. OpenCode は利用可能な `opencode/*-free` のうち少なくとも1つで read-only / write smoke が成功する。
5. OpenCode の main model と `small_model` を同じ選定済み Free model に固定し、選定済み Free model 以外へのLLM requestを発生させない。
6. OpenCode の自動更新を無効化し、起動後も Phase B で確定した exact version が維持される。
7. `qa-training-store` は public Repository として扱い、OpenCode Free modelによるRepository内容や prompt / completion の学習利用を許容する。ただし Repository に含まれない Secret / token / 認証情報は送信しない。
8. `OPENCODE_API_KEY` はユーザーアカウント単位の Codespaces development environment secret とし、`qa-training-store` だけへaccessを許可する。
9. `OPENCODE_API_KEY` は原則として Codespace 作成前に設定する。作成後に追加・変更した場合は Codespace を stop → restart してから検証する。
10. Codex CLI は `Sign in with ChatGPT` を通常経路とし、API key / access token / WIF を代替認証として使っていないことを確認する。
11. Codex は既存 `.codex/config.toml`、Hook trust、`diagnose:hooks`、Linux `codex-safe.sh` を含む Repository 固有の既存契約が Codespaces 上でも成立する。
12. `.devcontainer/devcontainer.json` は Node 24、pnpm 10.34.5、OpenCode CLI、Codex CLI、8081 forwarding、推奨 `OPENCODE_API_KEY` Secret を再現する。
13. Dev Container image は公式 `mcr.microsoft.com/devcontainers/typescript-node` の Node 24 / Bookworm 系を使い、実装時に確認した supported image major を固定する。
14. `remoteUser` は公式 image の非root `node` userを明示し、`whoami` と `id -u` で非rootを確認する。
15. `.devcontainer` 適用後に既存 Codespaceで Full Rebuild を行い、必要な環境と検証が成立する。
16. Phase Bで使用した Codespaceとは別に、branch最新headから完全に新しい Codespace を作成し、手動installによる補正なしで環境を再現できる。
17. Fresh Codespaceでも OpenCode / Codex / Repository integration / Web Runtime を再確認する。
18. `pnpm run start:web` が8081で起動し、Codespaces forwarded portから画面へアクセスできる。
19. `pnpm run verify` と `git diff --check` が成功する。
20. Native経路、Security fallback、application source、test、workflowへ目的外の変更を入れない。
21. 実測で今回のゴール達成に必須と判明した最小変更は、canonical Planを更新して同じPR #188で対応する。単なる改善や将来拡張だけを別課題へ送る。
22. 最新PR headでRepository契約上の必須CIが成功する。

## 2. 現状理解と確定前提

### Repository

- current visibility は public。
- `package.json#packageManager` は `pnpm@10.34.5`。
- CI は Node 24 / pnpm 10.34.5 を使用する。
- Web の通常起動は `pnpm run start:web`。
- Playwright通常Runtimeは8081、Training Runtimeは8082。
- 今回、人間がCodespacesから直接利用するWeb Runtimeは通常Runtimeだけを対象とするため、`forwardPorts` は8081だけにする。
- Training testは必要に応じてCodespace内部から8082へ接続でき、外部forwardingを完了条件にしない。
- Native BuildはWindows / macOSローカルが正式経路であり、Codespacesで置き換えない。
- `.artifacts/` は `.gitignore` 対象。

### OpenCode

- RepositoryにはSecurity Dependency Fallback向けOpenCode設定があるが、通常開発向けには再利用しない。
- current stable docsでは `model` と `small_model` を別々に設定できる。
- `small_model` 未指定時は軽量処理で別modelを選択する可能性があるため、main modelだけをFree modelにしてもFree-onlyを保証できない。
- OpenCodeは起動時に自動更新するため、exact version installだけではversion固定にならない。
- `OPENCODE_CONFIG_CONTENT` でruntime overrideを設定できる。
- `OPENCODE_DISABLE_AUTOUPDATE` で自動更新チェックを無効化できる。
- current stableとV2 betaは別channelとして公開されている。今回の対象はstable channelのみとする。

### Codex

- Repositoryには `.codex/config.toml`、Hook、rules、Run Artifact、Linux / Windows wrapperが既に存在する。
- `.codex/config.toml` はproject trust後に読み込まれ、`features.hooks = true` を使う。
- RepositoryのHook trustはproject trustと別に確認する必要があり、既存正本は `docs/reference/codex-safety-harness.md`。
- `pnpm run diagnose:hooks` がRepository側のread-only診断経路として存在する。
- Linux wrapperは `scripts/codex-safe.sh`。`--preset readonly --preflight-only` でCodex Hostを起動せず既存policy preflightを確認できる。
- Codex CLIのChatGPT sign-in状態はCodespaces SecretではなくCodex側の認証状態であり、新規Codespaceでは再ログインが必要になり得る。

### Secret / データ

- `OPENCODE_API_KEY` はRepository固有資格情報ではなくユーザー固有資格情報として扱う。
- GitHubのrecommended secretsはSecret値を保存する機能ではなく、`New with options` で未設定Secretを案内する機能。
- 通常経路はPersonal Codespaces Secretへ事前登録する。
- public Repositoryの内容はOpenCode Free modelへ送信してよい。
- `OPENCODE_API_KEY`、ChatGPT token、Codex auth file、その他Repositoryに存在しないcredentialはprompt / log / Run Artifact / PR本文へ出さない。

## 3. 実装中の判断ルール

### 実測で確定する値

Phase Bで次を実測して確定する。

1. OpenCode stable の package spec、exact version、install command、binary name。
2. Codex CLI stable の package spec、exact version、install command。
3. Dev Container image の supported major + `24-bookworm` tag。
4. 利用可能な `opencode/*-free` model。
5. OpenCodeで main model / `small_model` を同じFree modelへ固定する exact runtime command。
6. OpenCodeで選定Free model以外の利用がないことを確認する exact verification method。
7. Codex `Sign in with ChatGPT` の手順と `codex login status` の成功表示。
8. OpenCode / Codex smoke のexact command、prompt、期待結果。

これらを推測で実装へ持ち込まない。

### 同一PRで対応する条件

Phase B〜Eの実測で、Dockerfile、`AGENTS.md`、既存 `.codex/**`、helper script、その他ファイルへの変更がないと今回のゴールを達成できないことが確認された場合:

- 原因と必要性を確認する。
- canonical Planとactive Run Artifactを先に更新する。
- 目的達成に必要な最小変更だけを同じPR #188で実装する。
- 将来拡張や利便性改善だけを理由に変更範囲を広げない。

次の場合だけ実装を停止してユーザー判断へ戻す。

- 目的そのものを変更する必要がある。
- destructive / irreversible operationが必要。
- Secret / credentialの取り扱いを変更する必要がある。
- 外部サービスの契約・課金に新たなユーザー判断が必要。
- 必要な権限や認証を取得できず実行不能。

## 4. 影響範囲

### 予定する変更

- `.devcontainer/devcontainer.json`
  - Dev Container image。
  - `remoteUser: "node"`。
  - Node / pnpm / OpenCode / Codex CLI setup。
  - `OPENCODE_DISABLE_AUTOUPDATE=true`。
  - recommended secret `OPENCODE_API_KEY`。
  - `forwardPorts: [8081]`。
- `README.md`
  - Codespaces作成前のPersonal Secret設定。
  - OpenCode Free-only起動手順。
  - Codex ChatGPT sign-in / trust / Hook初回手順。
  - Full Rebuild / Fresh Createで再ログインが必要な場合の扱い。
  - Native対象外。
- canonical Plan / active Run Artifact。

### 必要性を確認してから変更するもの

- `AGENTS.md`
- `.codex/**`
- `.devcontainer/Dockerfile`
- helper script
- その他、Phase B〜Eでゴール達成に必須と確認されたファイル

### 原則として変更しない

- `package.json` / `pnpm-lock.yaml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/security-dependency-fallback.yml`
- application source / test
- Cloudflare / Expo / Playwright config
- `docs/native/**`

上記も実測で今回のゴール達成に必須と確認された場合は、Section 3のルールに従いPlan更新後に最小修正する。

## 5. 実装手順

### Phase A: 実装開始時の再基準化

1. branchが `plan/codespaces-opencode-devcontainer`、対象PRが #188 であることを確認する。
2. `git fetch origin` 後、latest `origin/main` とbranchのahead / behind、working tree、upstreamを確認する。
3. main更新がある場合はGit safety契約に従って最新baseを取り込む。force pushしない。
4. `package.json`、README、CI、`.codex/config.toml`、`scripts/codex-safe.sh`、Hook関連正本がPlan前提から変わっていないか確認する。
5. OpenCode / GitHub Codespaces / Dev Containers / Codexの公式仕様を実装日基準で再確認する。
6. Repository visibilityがpublicのままであることを確認する。privateへ変更されていた場合はOpenCodeへsourceを送る前に停止する。
7. active RunはこのPRの実装scopeへ更新済みのものを継続する。同一taskを別sessionで実装する場合はRepositoryのRun lifecycleに従う。

### Phase B: 素の Codespace で事前検証

#### B-0: Secretとbaseline

1. Codespace作成前にPersonal Codespaces Secret `OPENCODE_API_KEY` を登録し、Repository accessを `qa-training-store` に限定する。
2. Secretを作成後に変更した場合はCodespaceをstop → restartする。
3. current branchから`.devcontainer`なしのCodespaceを作成する。
4. `node --version`、`corepack --version`、`git --version`を記録する。
5. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode

1. 公式stable docs / releaseからstable channelを確認する。beta / `next` は使用しない。
2. stableの `{package spec, exact version, install command, binary name}` を記録する。
3. exact versionを一時installし、`opencode --version` を確認する。
4. `OPENCODE_DISABLE_AUTOUPDATE=true` を設定する。
5. `opencode models --refresh` で `opencode/*-free` を列挙する。
6. Free modelが複数ある場合、性能ランキングは行わず1件ずつ疎通する。少なくとも1件成功すれば継続し、全候補が失敗した場合だけ停止する。
7. 選定modelを `model` と `small_model` の両方へ設定した `OPENCODE_CONFIG_CONTENT` を使う。
8. `opencode --version` を起動前後で確認し、自動更新されていないことを確認する。
9. read-only smokeを実行する。
10. write smokeを実行する。
11. OpenCode Zenのcurrent usage / activity確認方法で、選定Free model以外の課金model利用が発生していないことを確認する。

OpenCode停止条件:

- stable channelをCodespaceへinstallできない。
- `OPENCODE_API_KEY` 認証が成立しない。
- `opencode/*-free` が0件。
- 全Free model候補で疎通に失敗する。
- `model` / `small_model` を同じFree modelへ閉じられない。
- 選定Free model以外の課金model requestが発生する。
- auto updateを無効化できずexact versionを維持できない。

#### B-2: Codex CLI

1. 公式stable install経路から `{package spec, exact version, install command}` を記録する。
2. exact versionを一時installし、`codex --version` を確認する。
3. 次の環境変数について、値を出力せず set / unset だけを確認する。
   - `OPENAI_API_KEY`
   - `CODEX_API_KEY`
   - `CODEX_ACCESS_TOKEN`
   - `OPENAI_FEDERATION_RULE_ID`
   - `OPENAI_IDENTITY_TOKEN_FILE`
4. 上記が設定されている場合はChatGPT sign-in検証前に原因を確認し、今回のCodex processから除外する。値は表示・記録しない。
5. Repository rootで `codex` を起動し `Sign in with ChatGPT` を実施する。
6. `codex login status` が肯定的にChatGPT sign-inを示すことを確認する。
7. `/status` でsession / model / usageを確認し、API key / access token / WIF経路へ切り替わっていないことを確認する。
8. `pnpm run diagnose:hooks` を実行する。
9. `bash scripts/codex-safe.sh --preset readonly --preflight-only` を実行する。
10. Repository rootからdirect `codex` を起動する。
11. `/hooks` で `.codex/config.toml` がdefinition sourceであること、必要Hookの定義内容、trust状態を確認する。必要なHookだけを内容確認後にtrustする。
12. trust確認と実行で同じ `CODEX_HOME` を使用する。
13. direct Codexでread-only smokeを実行する。
14. direct Codexでbounded write smokeを実行する。

Codex停止条件:

- stable Codex CLIをCodespaceへinstallできない。
- `Sign in with ChatGPT` が完了しない。
- `codex login status` がChatGPT sign-inを肯定的に示さない。
- 代替認証変数を今回のCodex processから除外できない。
- `diagnose:hooks` またはreadonly preflightのfailureが今回のCodespaces導入に起因し、解消できない。
- project / Hook trustを成立させられない。
- direct Codexのread-only smokeが成立しない。

### Phase B→C: 確定事項のPlan反映

Phase Bが成功したら `.devcontainer` を編集する前に、canonical Planとactive Run Artifactへ次を追記して固定する。

- OpenCode stable package spec / exact version / install command / binary name。
- Codex CLI package spec / exact version / install command。
- selected `opencode/*-free` model ID。
- OpenCode `OPENCODE_CONFIG_CONTENT` のexact command / JSON。
- OpenCodeのFree-only利用確認方法。
- Dev Container image tag。
- Codex ChatGPT sign-inのexact手順と `codex login status` の期待結果。
- `/hooks` の確認手順。
- Section 6のsmokeで実際に成功したexact command / prompt / expected result。

このcheckpointが未更新のままPhase Cへ進まない。

### Phase C: `.devcontainer/devcontainer.json` 実装

Phase B→C checkpoint確定後に実装する。

1. `image` は公式 `mcr.microsoft.com/devcontainers/typescript-node` のPhase Bで確定したNode 24 / Bookworm tag。
2. `remoteUser` は `node`。
3. `containerEnv` で `OPENCODE_DISABLE_AUTOUPDATE=true` を設定する。
4. `postCreateCommand` で次を実行する。
   - `corepack enable`
   - `pnpm install --frozen-lockfile`
   - Phase Bで確定したOpenCode exact install command
   - Phase Bで確定したCodex CLI exact install command
5. `secrets` には `OPENCODE_API_KEY` をrecommended secretとして宣言する。値やdefault tokenは書かない。
6. `forwardPorts` は `[8081]`。
7. root `opencode.json` は追加しない。Free modelはREADME記載のruntime `OPENCODE_CONFIG_CONTENT` で選択する。
8. Codex auth file / ChatGPT tokenをcopy / mountしない。
9. Android / iOS toolchain、Docker-in-Docker、browser一式、CI専用依存、不要なVS Code extensionは追加しない。
10. Phase Bで必須と判明していない限りDockerfileやhelper scriptを増やさない。

### Phase D: README更新

READMEへ次だけを追加する。

1. Personal Codespaces Secret `OPENCODE_API_KEY` をCodespace作成前に登録し、`qa-training-store`へaccessを許可する手順。
2. 作成後にSecretを追加・変更した場合はstop → restartが必要であること。
3. `devcontainer.json#secrets` はrecommended secretの案内であり、通常のクイック作成では事前Secret登録を正規手順とすること。
4. `node --version` / `pnpm --version` / `opencode --version` / `codex --version` の確認。
5. `opencode models --refresh` でcurrent Free modelを確認すること。
6. selected Free modelを main model / `small_model` の両方へ設定するruntime `OPENCODE_CONFIG_CONTENT` 起動手順。
7. OpenCode auto updateが無効であること。
8. OpenCode Free modelの学習利用を許容する一方、Secret / token /認証情報をpromptへ含めないこと。
9. Codexは `Sign in with ChatGPT` を使い、API key / access token / WIFを通常経路にしないこと。
10. `codex login status`、project trust、`/hooks`、Hook trustの初回確認。
11. Codespace新規作成時にCodexが未ログインなら再サインインすること。
12. root `AGENTS.md` を上書きしないこと。
13. CodespacesはWeb / Repository validation用で、Windows Android / macOS iOSの正式経路を置き換えないこと。

Free model一覧や可変versionはREADMEへ固定しない。

### Phase E: Dev Container実機検証

#### E-1: Full Rebuild

1. `.devcontainer` 反映済みCodespaceで `Codespaces: Full Rebuild Container` または `gh codespace rebuild --full` を実行する。
2. cacheに依存せずpostCreateが成功することを確認する。
3. `whoami` が `node`、`id -u` が0以外であることを確認する。
4. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exactを確認する。
5. `pnpm install --frozen-lockfile` を再実行してlockfile差分0を確認する。
6. OpenCode read-only / write smokeとFree-only利用確認を再実行する。
7. Codex認証監査、ChatGPT sign-in、Repository integration、read-only / write smokeを再実行する。
8. `pnpm run start:web` を起動し8081 forwarded portから表示する。

#### E-2: 完全新規 Codespace

1. Phase B / E-1で使用したCodespaceとは別に、branch最新headから新しいCodespaceを作成する。
2. 事前登録済みPersonal `OPENCODE_API_KEY` が利用できることを確認する。
3. manual CLI installやhome directoryのコピーをせず、devcontainer作成処理だけでNode / pnpm / OpenCode / Codex CLIが揃うことを確認する。
4. `whoami` / `id -u`、version、dependency installを確認する。
5. OpenCode runtime Free model設定後、read-only / write smokeとFree-only利用確認を行う。
6. Codexは必要に応じてChatGPTへ再サインインし、認証監査、project / Hook trust、Repository integration、read-only / write smokeを行う。
7. `pnpm run start:web` を8081 forwarded portから確認する。

Fresh Createは「再作成可能」を証明するための必須検証であり、Full Rebuildの代替にはしない。

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

Phase BでCLI versionに合わせてexact commandを確定するが、prompt、対象file、PASS/FAIL条件は以下を正本とする。

### OpenCode read-only

prompt:

> root `AGENTS.md` で、すべてのユーザー向け返答に含めるよう求められている4項目だけを列挙してください。ファイルは変更しないでください。

PASS:
- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- source / tracked file変更0件。
- main model / `small_model` は同一のselected `opencode/*-free`。
- selected Free model以外の課金model利用0件。

### OpenCode write

- path: `.artifacts/codespaces-smoke/opencode.txt`
- exact content: `opencode-codespaces-smoke`
- `git check-ignore -q .artifacts/codespaces-smoke/opencode.txt` が成功する。
- 指定file以外のsource変更を発生させない。
- smoke artifactの削除は完了条件にしない。

### Codex read-only

direct CodexでOpenCode read-onlyと同じpromptを実行する。

PASS:
- responseに `Summary`、`Progress`、`Next`、`Evidence` の4項目が含まれる。
- tracked file変更0件。
- project config / Hook trust確認済み。
- ChatGPT sign-in経路で実行される。

### Codex write

- path: `.artifacts/codespaces-smoke/codex.txt`
- exact content: `codex-codespaces-smoke`
- `git check-ignore -q .artifacts/codespaces-smoke/codex.txt` が成功する。
- 指定file以外のsource変更を発生させない。
- smoke artifactの削除は完了条件にしない。

## 7. 検証一覧

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| baseline | plain Codespace | clone / frozen install成功 |
| OpenCode stable | Phase B確定install | exact version一致、beta/next不使用 |
| OpenCode Free-only | `model` + `small_model` runtime固定 | 同一Free model、課金model利用0 |
| OpenCode version | auto update無効 + 起動前後version | exact version維持 |
| OpenCode smoke | Section 6 | read / write PASS |
| Codex stable | Phase B確定install | exact version一致 |
| Codex auth | env audit → ChatGPT sign-in → `codex login status` | ChatGPT経路を肯定確認 |
| Codex Repository integration | `diagnose:hooks` / readonly preflight / `/hooks` / direct Codex | project config・Hook・trust成立 |
| Codex smoke | Section 6 | read / write PASS |
| nonroot | `whoami` / `id -u` | `node` / UID != 0 |
| Full Rebuild | cache消去Rebuild | devcontainerだけで再構築成功 |
| Fresh Create | 別Codespaceをbranch最新headから新規作成 | manual installなしで再現 |
| dependency | frozen install | PASS、lockfile差分0 |
| Web | `pnpm run start:web` | 8081 forwardから表示 |
| Repository | `pnpm run verify` | PASS |
| diff | `git diff --check` / `git status --short` | 意図した差分のみ |
| PR | latest head CI | 必須CI成功 |

## 8. リスクと扱い

### Free model availability

- model IDはRepository defaultへ固定しない。
- 実行時に `opencode models --refresh` で確認する。
- 1件失敗しても他Free modelを試せる。全候補失敗時だけ停止する。

### OpenCodeの別model利用

- `--model`だけでは不十分。
- runtime configで main model / `small_model` を同じFree modelへ固定する。
- usage確認で課金model利用0を確認する。

### CLI version drift

- OpenCode / CodexともPhase Bで成功したexact versionをdevcontainerへ固定する。
- OpenCodeはauto updateを無効化する。
- version更新は意図した保守変更として行う。

### Codespace cache依存

- 通常Rebuildだけを再現性の証拠にしない。
- Full Rebuild + Fresh Createを両方必須にする。

### Codex認証経路

- ChatGPT sign-in前に代替認証環境変数を値非表示で監査する。
- ChatGPT sign-in失敗をAPI key fallbackで通さない。

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

ファイル分割は行わない。このPlanは単一の検証→確定→実装→再現性検証の順序を共有しており、現時点で分割すると共通の停止条件・確定事項が重複するため。

## 10. 公式資料

実装時にcurrent内容を再確認する。

- GitHub Codespaces / rebuild:
  - https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace
- GitHub Codespaces / account-specific secrets:
  - https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces
- GitHub Codespaces / recommended secrets:
  - https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/specifying-recommended-secrets-for-a-repository
- Dev Containers TypeScript / Node image:
  - https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md
- OpenCode stable install:
  - https://dev.opencode.ai/docs
- OpenCode config:
  - https://dev.opencode.ai/docs/config
- OpenCode CLI / environment variables:
  - https://dev.opencode.ai/docs/cli/
- OpenCode V2 beta:
  - https://dev.opencode.ai/v2/docs/
- OpenCode rules / `AGENTS.md`:
  - https://dev.opencode.ai/docs/rules/
- OpenCode Zen:
  - https://opencode.ai/docs/zen/
- Codex configuration:
  - https://developers.openai.com/ja-JP/docs/config-file/config-reference
- Codex workload identity federation:
  - https://developers.openai.com/api/docs/guides/workload-identity-federation
- ChatGPT planでCodexを使う:
  - https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan

## 11. 実行タスク

- [ ] 1. Phase A: latest main / branch / Repository契約 / current公式仕様を再確認する。
- [ ] 2. Personal `OPENCODE_API_KEY` Codespaces Secretを作成前に確認する。
- [ ] 3. plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 4. OpenCode stable exact install、Free model discovery、main / small model固定、auto update無効を検証する。
- [ ] 5. OpenCode read-only / write smokeとFree-only利用を確認する。
- [ ] 6. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 7. Codex ChatGPT sign-in / login status / Repository trust / Hook trust / harnessを検証する。
- [ ] 8. Codex read-only / write smokeを行う。
- [ ] 9. Phase B→C checkpointをcanonical Plan / active Runへ確定記録する。
- [ ] 10. `.devcontainer/devcontainer.json` を実装する。
- [ ] 11. READMEを更新する。
- [ ] 12. Full Rebuild後の統合検証を行う。
- [ ] 13. 完全新規CodespaceのFresh Create検証を行う。
- [ ] 14. Web 8081 forwarded portを確認する。
- [ ] 15. `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 16. active Run ArtifactとPR #188本文を最終結果へ更新する。
- [ ] 17. 通常commit / push後、latest headの必須CIを確認する。
