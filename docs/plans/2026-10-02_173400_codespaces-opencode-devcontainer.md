# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

- 依頼内容:
  - GitHub Codespaces 上で OpenCode の無料モデルを使って `qa-training-store` を開発できることを実環境で検証する。
  - 同じ Codespace へ Codex CLI も導入し、ChatGPT アカウントでサインインして ChatGPT プランの Codex 利用枠を使えることを検証する。
  - 検証が成立した場合、OpenCode / Codex CLI を含む再現可能な Codespaces 開発環境として最小限の `.devcontainer` 設定を導入する。
  - この Plan は `plan/codespaces-opencode-devcontainer` branch で後続実装する前提とする。
- 作成基準:
  - `main@84ce165493649550832731a60cf436f8ae29c56b`
  - 初回調査日: 2026-10-02 JST
  - Codex CLI 追加更新: 2026-10-02 JST
- 期待成果:
  - Codespaces 内の公式 OpenCode CLI から OpenCode Zen の `-free` model を明示選択し、Repository read / write を行えることを確認できる。
  - Codespaces 内の Codex CLI へ ChatGPT アカウントでサインインし、API key 課金ではなく ChatGPT プランの Codex 利用枠で Repository を扱えることを確認できる。
  - Node / pnpm / OpenCode / Codex CLI の実行環境が Codespace 再作成・Rebuild 後も再現できる。
  - Secret、ChatGPT認証、Native 開発、既存 Security fallback の責務を混ぜない。

## 1. ゴール / 完了条件

### ゴール

Codespaces を Web / TypeScript / Repository 検証と OpenCode / Codex CLI 開発に利用できる状態にし、ローカル Windows / macOS の Native 実機開発経路を維持する。

### 完了条件（DoD）

以下をすべて満たす。

1. 実装開始時の `origin/main` と本 branch の差分を確認し、古い前提のまま実装しない。
2. `.devcontainer` 導入前に、現在の branch を使った Codespace で OpenCode CLI + Zen Free model と Codex CLI + ChatGPT サインインを個別に疎通確認する。
3. OpenCode の疎通確認では、使用 model を `opencode/<model-id>` で明示し、`-free` model 以外へ fallback していないことを確認する。
4. private Repository の source を OpenCode へ送信する前に、選択する Free model の最新データ利用条件を確認する。prompt / completion を学習利用すると明示される model しか選べない場合は OpenCode 導入を進めず、ユーザー判断へ戻す。
5. `OPENCODE_API_KEY` はユーザーアカウント単位の GitHub Codespaces development environment secret とし、`qa-training-store` だけへ access を許可する。Repository、`devcontainer.json`、ログ、Run Artifact、PR本文へ値を保存しない。
6. Codex CLI は `Sign in with ChatGPT` を使用する。通常の開発経路では `OPENAI_API_KEY` や API key ベースの Codex 認証へ自動切替しない。
7. Codex の認証情報は Repository や Codespaces Secret へコピーしない。Codespace 新規作成・削除後の再作成では、必要に応じて ChatGPT へ再サインインする。
8. `.devcontainer/devcontainer.json` は Node 24 と pnpm 10.34.5 を現行 Repository 契約に合わせる。
9. OpenCode CLI と Codex CLI は、事前疎通で成功した stable version を exact version でインストールする。実装時点で公式情報を再確認し、未検証の `latest` を固定値として使わない。
10. Codespace の Rebuild 後に次が成立する。
   - Node major が 24。
   - pnpm が 10.34.5。
   - `pnpm install --frozen-lockfile` が成功する。
   - OpenCode が Plan で確定した version で起動する。
   - Codex が Plan で確定した version で起動する。
   - `opencode models --refresh` で利用可能な `opencode/*-free` を確認できる。
   - 指定 Free model で OpenCode read-only smoke が成功する。
   - 指定 Free model で Git 管理外の `.artifacts/` に限定した OpenCode write smoke が成功する。
   - `codex login status` で ChatGPT サインイン状態を確認できる。未ログインなら再サインインしてから続行できる。
   - ChatGPT サインイン済み Codex で read-only smoke が成功する。
   - ChatGPT サインイン済み Codex で `.artifacts/` に限定した write smoke が成功する。
   - Web 起動と Codespaces の port forwarding を確認できる。
11. `pnpm run verify` と `git diff --check` が成功する。
12. Native の Windows / macOS ローカル経路、`.github/opencode/security-fallback.json`、`.github/workflows/security-dependency-fallback.yml` の Security fallback 契約を変更しない。
13. 実装差分に Dockerfile、Android SDK、iOS toolchain、追加CI、root `opencode.json`、Codex用の新規認証ファイルを理由なく追加しない。
14. 実装後に対象 branch へ通常 push し、PRを作成した場合は最新headの必須CIを Repository 契約どおり確認する。

## 2. 現状理解と前提

### 現状理解

- 現在の `main` には `.devcontainer/` / `devcontainer.json` がない。
- `package.json#packageManager` は `pnpm@10.34.5`。
- `.github/workflows/ci.yml` は `NODE_VERSION: "24"` / `PNPM_VERSION: "10.34.5"` を使用する。
- README のローカルセットアップも Node.js 24 / pnpm 10.34.5 と `corepack enable` → `pnpm install --frozen-lockfile` を正本としている。
- Web の通常起動は `pnpm run start:web`。
- Playwright の通常 Runtime は 8081、Training Runtime は 8082 を既定値として持つ。
- Native Build はローカル Windows / macOS を正式な主経路としている。Windows Android には PowerShell 固有の helper があるため、Linux Codespace で置き換えない。
- Repository には既に OpenCode を使う Security Dependency Fallback があるが、これは Dependabot Alert 修正専用である。
- `.github/opencode/security-fallback.json` は deny-first、限定read、`package.json` だけの edit 許可を持つため、通常開発向け設定として再利用しない。
- Security fallback workflow は `OPENCODE_API_KEY`、`opencode models`、`opencode run --model opencode/<id>` を使用している。
- Repository には既に Codex 用の `.codex/**`、Run Artifact、wrapper、Hook、`AGENTS.md` がある。Codespaces 向けに別の Codex 設定体系を新設しない。
- OpenCode は project root の `AGENTS.md` を project instruction として読み込む。
- Codex CLI も既存 `AGENTS.md` と Repository の `.codex/**` を通常の開発経路で使用する。
- GitHub は Node.js project で project 固有の `devcontainer.json` を用意することで Codespaces 環境を再現可能にする方法を案内している。
- GitHub Codespaces は `devcontainer.json#secrets` で推奨 development environment secret を宣言できる。
- OpenCode 公式仕様では `npm install -g opencode-ai` がサポートされ、Zen は API key を設定後に `/models` または `opencode models` から model を確認できる。
- OpenCode の Free model 一覧は固定契約ではなく変更される。model は `opencode/<model-id>` 形式で明示指定できる。
- OpenAI 公式仕様では Codex CLI は Linux で利用でき、初回起動時に `Sign in with ChatGPT` を選択できる。ChatGPT アカウントでサインインした Codex CLI は ChatGPT プランの Codex 利用枠を使用する。
- Codex の認証情報ストアは Repository 設定とは別のユーザー / runtime 状態である。`CODEX_HOME/auth.json` を使う構成も存在するが、今回の導入では auth file を Repository や Secret へコピーして永続化しない。

### 前提

- Codespaces の主用途は Web / TypeScript / Repository test / OpenCode / Codex CLI 開発とする。
- Native の実機 Build / Runtime validation は既存ローカル経路を使う。
- `OPENCODE_API_KEY` はユーザーアカウント単位の Codespaces Secret とし、`qa-training-store` に限定して許可する。
- OpenCode Free model は Repository に固定しない。availability とデータ利用条件が外部サービス側で変化するため、実行時に明示選択する。
- Codex は ChatGPT サインインを通常経路とし、個人の ChatGPT プランに含まれる Codex 利用枠を使う。
- `OPENAI_API_KEY`、`CODEX_ACCESS_TOKEN`、Codex workload identity federation は今回の個人向け interactive Codespaces 開発には導入しない。
- OpenCode / Codex CLI version は環境再現性のため devcontainer では exact pin するが、Security fallback workflow の OpenCode version と同一にすること自体は要件にしない。用途と更新周期が異なるため、無理にSSOT化しない。

### 対象外

- Android SDK / Emulator / Maestro / JDK の Codespace 導入。
- iOS / Xcode の Codespace 対応。
- Cloudflare deploy 構成変更。
- `.github/workflows/security-dependency-fallback.yml` の変更。
- `.github/opencode/security-fallback.json` の変更。
- root `opencode.json` の追加。
- 既存 `.codex/config.toml`、Codex wrapper、Hook、Run Artifact契約の再設計。
- `AGENTS.md` の Codex 固有記述の整理。
- Codespaces 課金設定、Organization billing policy の変更。
- OpenCode Free model 自体の性能比較・ランキング。
- Codex model の性能比較・ランキング。
- Codex のAPI key認証、自動化用access token、workload identity federationの導入。
- Dockerfile / Docker Compose の追加。既存 image + `devcontainer.json` だけで要件を満たせない実測が出た場合にだけ別Planで再評価する。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で実装開始を止める未回答質問はない。

ただし、以下は実装時の実測値として確定する。推測で固定しない。

1. OpenCode の current stable version。
2. Codex CLI の current stable versionと、Linuxで exact version を導入できる公式supported install経路。
3. `opencode models --refresh` が返す current `opencode/*-free` 一覧。
4. private Repository の source を扱う前提で受容可能なデータ利用条件を満たす OpenCode Free model。
5. ChatGPT サインインが Codespace から正常に完了するか。
6. Codespace Rebuild 後に Codex のログイン状態が保持されるか。保持を前提にせず `codex login status` で実測する。
7. current Dev Container image の supported major tag。

### 仮定してよい細部

- Dev Container image は公式 `mcr.microsoft.com/devcontainers/typescript-node` の Node 24 / Debian Bookworm 系を第一候補にする。
- image は Node majorだけの無制限 floating tagより、実装時に確認した supported image major + Node 24 + Bookworm の tagを使う。
- 8081 / 8082 は current Repository config に対応するため `forwardPorts` の候補とする。
- VS Code extension はこの導入目的に必須でないため追加しない。
- Codex のログイン状態がRebuild後も残った場合でも、それを再現性の要件にはしない。CLIの再インストールと再ログイン可能性を要件にする。

### 未回答の重要質問

なし。上記の実測値が条件を満たさない場合は、その時点で実装を止めてユーザー判断へ戻す。

## 4. 影響範囲

### 導入時に変更する候補

- `.devcontainer/devcontainer.json`
  - Codespaces の image、初期化、OpenCode向け推奨Secret、OpenCode / Codex CLI install、必要portを定義する。
- `README.md`
  - Codespaces + OpenCode / Codex CLI の最小利用手順、認証の違い、Free model明示選択、Native対象外を追記する。
- 実装時の active Run Artifact
  - Repository規約に従う。

### 確認対象

- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `.codex/config.toml`
- `scripts/codex-safe.sh` / `scripts/codex-safe.ps1`
- `playwright.config.ts`
- `playwright.training.config.ts`
- `.github/workflows/ci.yml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/security-dependency-fallback.yml`
- `docs/native/**`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/git-branch-safety.md`

### 原則として変更しない

- `package.json`
- `pnpm-lock.yaml`
- `AGENTS.md`
- `.codex/**` の既存契約
- `.github/**`
- `docs/native/**`
- application source / test
- Cloudflare / Expo / Playwright config

既存依存やCodex harness自体の変更が必要だと判明した場合は、このPlanの想定を超えているため先に原因を確認する。

## 5. 変更方針

### Phase A: 実装開始時の再基準化

1. `plan/codespaces-opencode-devcontainer` が作業branchであることを確認する。
2. `git fetch origin` 後に `origin/main` と branch の ahead / behind、working tree、upstream を確認する。
3. branch 作成後に main が更新されている場合は、`docs/reference/git-branch-safety.md` に従い、force pushを使わず最新baseを反映してから以降を実施する。
4. `package.json`、README、CIの Node / pnpm 値と、既存 `.codex/**` / Codex harness が本Planの前提から変わっていないか確認する。
5. OpenCode / GitHub Codespaces / Dev Containers / Codex CLI / ChatGPT plan authentication の公式仕様を再確認する。特に install command、stable version、Free model、Secret、image tag、Codex authentication は実装日基準で確認する。

### Phase B: `.devcontainer` 追加前の Codespaces + OpenCode / Codex 実疎通

目的は、Dev Container設定の問題、OpenCode / Zen 側の問題、Codex / ChatGPT authentication 側の問題を分離すること。

1. 本 branch の現状から Codespace を作成する。
2. 次を確認する。
   - `node --version`
   - `corepack --version`
   - `git --version`
3. README の既存手順で `corepack enable` と `pnpm install --frozen-lockfile` を実行し、依存導入が成立することを確認する。

#### Phase B-1: OpenCode

4. OpenCode の current stable versionを公式Release / install documentationで確認する。
5. その exact versionを公式の Node.js install経路で一時導入し、`opencode --version` が一致することを確認する。
6. `OPENCODE_API_KEY` はユーザーアカウント単位の Codespaces development environment secret から渡す。Secret access は `qa-training-store` に限定する。値をshell historyへ直接貼り付ける手順を正規手順にしない。
7. `opencode models --refresh` を実行し、`opencode/*-free` が1件以上存在することを確認する。
8. 候補 Free model の最新データ利用条件を公式情報で確認する。private sourceのprompt / completionを学習利用すると明示されるmodelは選ばない。
9. 選定した model を明示して read-only smoke を実行する。
10. OpenCodeの成功条件:
   - `403 Forbidden: free tier can only be used from within OpenCode` が発生しない。
   - paid modelへfallbackしない。
   - Repositoryを読める。
   - ファイル変更が発生しない。
   - `AGENTS.md` が project instruction として認識される。

#### Phase B-2: Codex CLI

11. Codex CLI の current stable versionと公式supported install経路を確認する。
12. exact versionで一時導入し、`codex --version` が一致することを確認する。
13. Codex用に `OPENAI_API_KEY`、`CODEX_ACCESS_TOKEN`、認証ファイルのコピーを用意しない。
14. Repository rootで `codex` を起動し、`Sign in with ChatGPT` を選択して対象ChatGPTアカウントへサインインする。
15. `codex login status` でログイン状態を確認する。
16. `/status` または同等の現行CLI表示で、利用中のsession / model / usage情報を確認する。
17. 既存Repository harnessのread-only経路、または現行Codex CLIのread-only sandboxを使って、Repository概要を読むだけのsmall smokeを実行する。
18. Codexの成功条件:
   - ChatGPT サインインが完了する。
   - `codex login status` が未ログインや API key 認証を示さない。
   - Codex CLIから1 turn以上の推論が成功する。
   - Repositoryを読める。
   - read-only smokeでsource変更が発生しない。

#### Phase B 停止条件

次のいずれかなら `.devcontainer` 実装へ進まない。

- 公式 OpenCode CLI からでも Free tier 403 が再現する。
- OpenCode Free modelが0件。
- 受容可能なデータ利用条件のOpenCode Free modelを選べない。
- Codespaces自体から OpenCode / Zen endpointへ接続できない。
- `OPENCODE_API_KEY` 認証が成立しない。
- Codex CLI の公式supported install経路がCodespaceで成立しない。
- `Sign in with ChatGPT` がCodespaceで完了できない。
- `codex login status` が意図しない認証方式を示す。
- ChatGPTサインイン済みでもCodex CLIのsmall smokeが成立しない。

失敗時はDev Container設定で隠さず、OpenCode / Zen / Codex / ChatGPT authentication / account / network のどこで失敗したかを分けて記録する。

### Phase C: 最小の `.devcontainer/devcontainer.json` を追加

Phase B がOpenCode / Codexの両方で成功した場合だけ実施する。

1. image:
   - 公式 `mcr.microsoft.com/devcontainers/typescript-node` を使用する。
   - Node 24 + Bookworm を選ぶ。
   - 実装時の supported image major を確認し、その major + `24-bookworm` でpinする。
   - 独自 Dockerfile は作らない。
2. `remoteUser`:
   - image標準の非root userを維持する。root常用へ切り替えない。
3. `postCreateCommand`:
   - `corepack enable`
   - `pnpm install --frozen-lockfile`
   - Phase B で検証した exact OpenCode version の `opencode-ai` を公式supported経路でinstall
   - Phase B で検証した exact Codex CLI version を公式supported経路でinstall
   - これらだけで十分なら shell scriptを新設しない。
4. `secrets`:
   - `OPENCODE_API_KEY` だけを推奨Secretとして宣言する。
   - Secret value、default value、example tokenは書かない。
   - Codex ChatGPT サインイン用token / auth fileは `secrets` へ追加しない。
5. `forwardPorts`:
   - current configとの整合を確認した上で 8081 / 8082 を設定する。
6. 次は追加しない。
   - model固定
   - OpenCode providerの独自設定
   - root `opencode.json`
   - Codex用の新規project config
   - Codex auth fileのcopy / bind mount
   - `OPENAI_API_KEY`
   - `CODEX_ACCESS_TOKEN`
   - Android / iOS toolchain
   - Docker-in-Docker
   - browser一式の事前install
   - CI専用依存
   - VS Code extensionの大量追加

### Phase D: README に最小利用手順を追加

README のセットアップ付近へ、Codespaces利用者が迷わない範囲だけ追記する。

記載する内容:

1. Codespace 作成前または作成時に、ユーザーアカウントの Codespaces Secretとして `OPENCODE_API_KEY` を設定し、`qa-training-store` へだけaccessを許可する。
2. Rebuild / 新規作成後に `node --version`、`pnpm --version`、`opencode --version`、`codex --version` を確認する。
3. OpenCodeは `opencode models --refresh` で current Free model を確認し、`opencode/<model-id>` を明示選択する。
4. OpenCode Free modelのデータ利用条件は利用時点で確認する。
5. Codexは `codex` を起動して `Sign in with ChatGPT` を選び、ChatGPTプランのCodex利用枠を使う。
6. Codexでは `OPENAI_API_KEY` を設定してAPI課金へ切り替える手順を通常開発手順に含めない。
7. Codexのログイン状態は `codex login status` で確認する。新しいCodespaceで未ログインなら再サインインする。
8. OpenCode / Codexとも既存root `AGENTS.md` を使用するため、`/init` 等で既存 `AGENTS.md` を上書きしない。
9. Codespaces は Web / Repository validation 用であり、Windows Android / macOS iOS の正式ローカル経路を置き換えない。

長い一般ガイド、OpenCode Free model一覧、Codex model一覧はREADMEへ固定しない。変動する情報は公式ドキュメント参照に留める。

### Phase E: Rebuild 後の統合検証

1. `.devcontainer` 適用後に Codespace を Rebuild する。既存shellで設定を継ぎ足しただけの状態を合格にしない。
2. version確認:
   - `node --version` → major 24
   - `pnpm --version` → 10.34.5
   - `opencode --version` → Phase Bでpinしたversion
   - `codex --version` → Phase Bでpinしたversion
3. dependency:
   - `pnpm install --frozen-lockfile` が再実行可能で、`package.json` / `pnpm-lock.yaml` に差分を出さない。
4. OpenCode:
   - `opencode models --refresh`
   - 選択対象が `opencode/*-free` であることを再確認する。
   - Phase B と同等の read-only smoke を explicit `--model` で実行する。
   - Git管理外の `.artifacts/codespaces-opencode-smoke.txt` だけを作成するwrite smokeを行う。
5. Codex:
   - `codex login status` を確認する。
   - Rebuild後に未ログインなら `Sign in with ChatGPT` で再サインインする。認証状態が保持されること自体はDoDにしない。
   - `OPENAI_API_KEY` を今回のCodex経路へ設定していないことを確認する。
   - 既存Repository harnessのread-only経路、または現行CLIのread-only sandboxでsmall smokeを行う。
   - Git管理外の `.artifacts/codespaces-codex-smoke.txt` だけを作成するbounded write smokeを行う。
6. OpenCode / Codex write smoke後:
   - 期待した内容だけが作成されたことを確認する。
   - smoke用一時ファイルを削除する。
   - `git status --short` で意図しないsource変更が0件であることを確認する。
7. Web Runtime:
   - `pnpm run start:web`
   - Expo Web が起動し、Codespaces forwarded portから画面へアクセスできることを確認する。
   - 8081以外が実際に選ばれた場合は、原因を確認してから `forwardPorts` の前提を修正する。
8. Repository validation:
   - `pnpm run verify`
   - `git diff --check`
9. Native:
   - Codespace上で Android / iOS build を成功条件にしない。
   - Native関連ファイル・scriptに差分がないことを確認する。

### Phase F: 最終差分とGitHub検証

1. 最終差分を確認し、原則として次だけに限定する。
   - `.devcontainer/devcontainer.json`
   - `README.md`
   - canonical Plan
   - active Run Artifact
2. dependency / lockfile / workflow / application source / `.codex/**` に意図しない変更がないことを確認する。
3. Secret、OpenCode auth情報、Codex auth file / token、`.artifacts`、browser binaries、`node_modules` をcommitしない。
4. RepositoryのGit safety契約に従い commit /通常pushする。
5. PRを作成する場合は Codespaces 実測結果を簡潔に記録する。
   - Codespace rebuild: PASS / FAIL
   - Node / pnpm / OpenCode / Codex version
   - 使用した OpenCode Free model ID
   - OpenCode Free modelのデータ利用条件を確認した日付
   - Codex auth: ChatGPT sign-in / FAIL
   - OpenCode read-only / write smoke
   - Codex read-only / write smoke
   - Web Runtime
   - `pnpm run verify`
   - Secret値、ChatGPT token、Codex auth file内容は記載しない。
6. 最新PR headで Repository 契約上の必須CIを確認する。

## 6. 検証方法

### 必須検証

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| Codespace baseline | devcontainer導入前に新規Codespace | Repository clone / installが成立 |
| OpenCode install | exact stable versionを公式supported経路で導入 | `opencode --version`一致 |
| OpenCode Free model discovery | `opencode models --refresh` | `opencode/*-free` が存在 |
| OpenCode auth | explicit `--model` の read-only run | 403なし、paid fallbackなし |
| Codex install | exact stable versionを公式supported経路で導入 | `codex --version`一致 |
| Codex auth | `Sign in with ChatGPT` → `codex login status` | ChatGPTサインイン済みで利用可能 |
| Codex billing path | `OPENAI_API_KEY`を通常経路へ設定せずsmall smoke | ChatGPTプランのCodex経路で推論成功 |
| project instruction | OpenCode / Codex read-only smoke | 既存root `AGENTS.md` を認識 |
| Dev Container | Rebuild Container | postCreate完了、shell利用可能 |
| Node | `node --version` | major 24 |
| pnpm | `pnpm --version` | 10.34.5 |
| dependency | `pnpm install --frozen-lockfile` | PASS、lockfile差分なし |
| OpenCode write | `.artifacts/` 限定smoke | 指定fileだけ作成可能 |
| Codex write | `.artifacts/` 限定smoke | 指定fileだけ作成可能 |
| Web | `pnpm run start:web` | forwarded portから表示可能 |
| Repository | `pnpm run verify` | PASS |
| diff | `git diff --check` / `git status --short` | 意図した差分のみ |

### 失敗時の扱い

- OpenCode / Zen、Codex / ChatGPT authentication、Dev Container 構成の失敗を同じ原因として扱わない。
- `postCreateCommand` の失敗は、Node / Corepack / pnpm / OpenCode install / Codex install / network の最初の失敗点を確認する。
- OpenCode Free model availability / policy failureはRepository codeで回避しない。
- Codex ChatGPT sign-inが失敗した場合、API keyへ自動fallbackして合格扱いにしない。
- Codexのログイン状態がRebuildで失われても、再サインインで正常利用できるなら環境再現性のfailureとはしない。
- `verify` failureは差分起因か既存問題かを分類し、差分起因なら最小修正する。
- CodespacesだけでNative検証できないことは failure にしない。

## 7. リスクと未解決論点

### OpenCode Free modelのavailability変更

Free modelは外部サービス側で追加・削除されるため、model IDをRepository defaultへ固定すると陳腐化しやすい。

対策:
- devcontainerではmodelを固定しない。
- 実行時に `opencode models --refresh` で確認する。
- smokeでは explicit `--model` を必須にする。

### OpenCode Free modelのデータ利用条件

無料提供の条件とsource codeの取り扱いはmodel / providerごとに変わり得る。

対策:
- private sourceを送る前に公式条件を確認する。
- prompt / completion の学習利用が明記されるmodelしかない場合は自動選択しない。

### OpenCode / Codex version drift

`latest` を使うと Codespace rebuildでCLI挙動が変わる。

対策:
- Phase Bで成功した exact stable version を devcontainerでpinする。
- version更新は意図した保守変更として別途行う。

### Codex認証と課金経路

Codespaceへ `OPENAI_API_KEY` を入れると、ChatGPTプランではなくAPI課金の経路を意図せず使う可能性がある。

対策:
- 今回のCodex通常経路では `Sign in with ChatGPT` を使う。
- `OPENAI_API_KEY` をdevcontainerのSecretとして宣言しない。
- `codex login status` とsmall smokeで実際の認証成立を確認する。
- ChatGPTサインインが失敗してもAPI keyへfallbackして検証を通さない。

### Codexログイン状態の寿命

Codex CLIの認証はCodespaces Secretとは別のruntime stateであり、Codespace削除後までの保持を前提にできない。

対策:
- auth file / tokenをRepositoryやGitHub Secretへコピーしない。
- 新規Codespace / Rebuild後に `codex login status` を確認する。
- 未ログインなら再サインインする手順をREADMEへ明記する。

### Dev Container image drift

完全なfloating tagではNode 24以外の周辺toolingが変わり得る。一方でdigest完全固定はsecurity update取り込みを重くする。

対策:
- 公式imageのsupported major + Node 24 + Bookwormをpinし、同major内の修正は取得する。
- 独自Dockerfileを持たない。

### `AGENTS.md` のCodex固有記述

OpenCodeはroot `AGENTS.md` を読むため、Codex固有のworkflowを自分向け必須手順と誤解する可能性がある。一方、Codexは既存契約としてその内容を使用する。

対策:
- 今回は先回りして `AGENTS.md` を変更しない。
- OpenCode smokeで実害を確認する。
- 実害がある場合は今回のdevcontainer変更へ無条件に混ぜず、必要な互換性整理を明示して再評価する。

### CodespacesとNativeの境界

Linux CodespaceへWindows Android helperやiOS toolchainを持ち込むと、既存の正式検証経路と責務が重複する。

対策:
- Nativeは明示的に対象外とする。
- Web / TypeScript / Repository validationに限定する。

## 8. 成果物

### このPlan更新時

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- plan-only Run Artifact

### 後続実装で予定する変更

- `.devcontainer/devcontainer.json`
- `README.md`
- 実装Run Artifact

### 現時点で追加しないもの

- `.devcontainer/Dockerfile`
- `.devcontainer/docker-compose.yml`
- root `opencode.json`
- OpenCode専用の新規Agent設定
- Codex用の新規project config / auth file
- `OPENAI_API_KEY` / `CODEX_ACCESS_TOKEN` のCodespaces Secret
- 新規package dependency
- 新規CI workflow
- Native toolchain設定

## 9. 公式資料

実装時には下記を再確認し、2026-10-02時点の内容を固定事実として扱わない。

- GitHub Codespaces / Node.js dev container:
  - https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/setting-up-your-nodejs-project-for-codespaces
- GitHub Codespaces / recommended secrets:
  - https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/specifying-recommended-secrets-for-a-repository
- GitHub Codespaces / account-specific secrets:
  - https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces
- Dev Containers Node / TypeScript image:
  - https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md
- OpenCode installation:
  - https://dev.opencode.ai/docs
- OpenCode CLI:
  - https://dev.opencode.ai/docs/cli/
- OpenCode rules / `AGENTS.md`:
  - https://dev.opencode.ai/docs/rules/
- OpenCode Zen / model一覧:
  - https://opencode.ai/docs/zen/
- Codex CLI:
  - https://developers.openai.com/codex/cli
- ChatGPT planでCodexを使う:
  - https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- Codex configuration / credential store:
  - https://developers.openai.com/ja-JP/docs/config-file/config-reference

## 10. 実行タスク

- [ ] 1. 実装開始時に branch / latest main / toolchain / existing Codex harness / official specification を再確認する。
- [ ] 2. devcontainer導入前のCodespaceでOpenCode exact stable versionを導入する。
- [ ] 3. ユーザーアカウントの `OPENCODE_API_KEY` Codespaces Secretを `qa-training-store` に限定し、`opencode models --refresh` を実行する。
- [ ] 4. データ利用条件を確認した `opencode/*-free` modelで OpenCode read-only smokeを行う。
- [ ] 5. devcontainer導入前のCodespaceでCodex CLI exact stable versionを導入する。
- [ ] 6. `Sign in with ChatGPT` でCodexへログインし、`codex login status` とsmall read-only smokeでChatGPTプラン経路を確認する。
- [ ] 7. OpenCode / CodexのPhase B停止条件がないことを確認する。
- [ ] 8. 最小の `.devcontainer/devcontainer.json` を追加し、OpenCode / Codex CLIをexact versionで導入する。
- [ ] 9. READMEへCodespaces + OpenCode / Codex利用手順、認証の違い、Native対象外を追記する。
- [ ] 10. CodespaceをRebuildし、Node / pnpm / OpenCode / Codex / dependency installを再検証する。
- [ ] 11. OpenCodeでexplicit Free modelのread-only / `.artifacts`限定write smokeを行う。
- [ ] 12. CodexでChatGPTサインイン状態を確認し、read-only / `.artifacts`限定write smokeを行う。
- [ ] 13. `pnpm run start:web` と forwarded port を確認する。
- [ ] 14. `pnpm run verify`、`git diff --check`、最終scope確認を行う。
- [ ] 15. Run Artifactを確定し、通常commit / pushを行う。
- [ ] 16. PRを作成する場合は最新headの必須CIとCodespaces実測結果を確認する。



- [ ] 1. 実装開始時に branch / latest main / toolchain / official specification を再確認する。
- [ ] 2. devcontainer導入前のCodespaceでOpenCode exact stable versionを導入する。
- [ ] 3. `OPENCODE_API_KEY` を Codespaces secretから受け取り、`opencode models --refresh` を実行する。
- [ ] 4. データ利用条件を確認した `opencode/*-free` modelで read-only smokeを行う。
- [ ] 5. Phase Bの停止条件がないことを確認する。
- [ ] 6. 最小の `.devcontainer/devcontainer.json` を追加する。
- [ ] 7. READMEへCodespaces + OpenCode利用手順とNative対象外を追記する。
- [ ] 8. CodespaceをRebuildし、Node / pnpm / OpenCode / dependency installを再検証する。
- [ ] 9. explicit Free modelでread-only / `.artifacts`限定write smokeを行う。
- [ ] 10. `pnpm run start:web` と forwarded port を確認する。
- [ ] 11. `pnpm run verify`、`git diff --check`、最終scope確認を行う。
- [ ] 12. Run Artifactを確定し、通常commit / pushを行う。
- [ ] 13. PRを作成する場合は最新headの必須CIとCodespaces実測結果を確認する。
