# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

GitHub Codespaces 上で `qa-training-store` を開発できる環境を導入する。OpenCode は OpenCode Zen を利用し、使用する model はユーザーがその都度選択する。Free / paid のどちらを使うかは Repository / harness 側では制御しない。Codex CLI は ChatGPT アカウントで認証して ChatGPT プランの Codex 利用枠を使用する。

この Plan は PR #188 で Plan、実装、Codespaces 実機検証、Repository 検証、CI 確認まで完了するための正本とする。

IDE拡張とPlaywright GUI録画の追加要件は、[`2026-10-04_160000_codespaces-ide-playwright-recording.md`](./2026-10-04_160000_codespaces-ide-playwright-recording.md)を正本とする。
同Planが扱う`desktop-lite`、VS Code拡張、6080 forwarding、Playwright Chromium導入、GUI smokeはこのPlanのdevcontainer要件へ加算し、それ以外のOpenCode / Codex CLI、Full Rebuild / Fresh Create、CI、cleanup契約はこのPlanを維持する。

作成基準:

- 初回 base: `main@84ce165493649550832731a60cf436f8ae29c56b`
- branch: `plan/codespaces-opencode-devcontainer`
- PR: `#188`
- 初回作成: 2026-10-02 JST
- 複数レビュー最終反映: 2026-10-03 JST

## 1. ゴール / 完了条件

### ゴール

Codespaces を Web / TypeScript / Repository 検証と OpenCode / Codex CLI 開発に利用でき、Repository にコミットした設定から Full Rebuild と完全新規 Codespace の両方で同等の環境を再現できる状態にする。

ここでの「同等」はcontainer image digestの完全一致ではなく、Node major、pnpm / OpenCode / Codex exact version、実行user、CLI path、認証方式、Codex Hook / MCP、Web Runtimeなど、このPlanで定義するRepository開発契約が一致することを指す。

### 完了条件

以下をすべて満たす。

1. Phase A開始時にlatest `main`、PR branch、Repository契約、current公式仕様を再確認し、baseline main SHAとbaseline PR head SHAを記録する。
2. OpenCode / Codexのstable versionは、実際にinstallへ使用する正規distributionのofficial package / release metadataで確認できるlatest non-prerelease stableを正本とする。補助official sourceとの公開タイミング差だけでは停止せず、採用versionとinstall sourceを一意に確定できない場合だけ停止する。
3. control shellで`gh --version`、token値を表示しない`gh auth status --active --hostname github.com`、`gh codespace list -R ryu-yoshikawa-pro-vision/qa-training-store`が成功し、Codespaces control planeを操作できることをPhase B前に確認する。
4. Repositoryで利用可能なCodespaces machineを確認し、CPU → memory → storageの順で最小の有効Linux machineをcanonical validation machineとして記録する。locationは今回の同等性契約に含めない。
5. Phase Bのplain CodespaceはPersonal dotfilesを一時的に無効にしてcanonical machineから新規作成し、`gh codespace create --status`、working tree clean、local HEAD == remote PR head、Codespace HEAD == baseline PR headを確認する。作成・dotfiles未適用確認後は直ちにdotfiles設定を元へ戻す。
6. Phase Bではpackage spec、exact version、認証方式、smoke契約など環境非依存部分を確認する。plain Codespaceのuser / install path / PATHはbaseline evidenceでありtarget devcontainerの期待値にしない。
7. Phase B→C checkpointまでに、targetの`node` userで使うOpenCode / Codex exact install command、install先の方針、PATH反映、sudo使用有無、`corepack enable`、`postCreateCommand`のexact順序、GitHub CLIの提供方法を確定する。E-2では方式を決め直さず実測値を検証する。
8. OpenCode ZenはPersonal `OPENCODE_API_KEY` をcredentialとして実際に認識したことをSecret非露出で確認する。smoke成功だけを認証成功の証拠にしない。
9. canonical OpenCode smokeにはOpenCode Zen providerのmodelを使用する。model ID、Free / paid、価格はユーザーが選択し、Repository / harnessでは制限しない。
10. OpenCodeはRepository rootから起動した新規sessionでroot `AGENTS.md`をproject ruleとして自動適用し、`.agents/skills/feature-plan/SKILL.md`をnative `skill` toolからdiscover / loadできることをPhase B / E-2 / E-3で確認する。
11. root `AGENTS.md`はRepository-wide規約をOpenCodeにも適用できるよう最小修正し、Codex固有のHook / wrapper / native delegation / `ci_wait`等はCodexだけに適用される境界を明示する。
12. OpenCodeはupstream default permissionで利用し、Codex Safety Harness相当のpermission / sandbox / Hook制御は今回の対象外とする。
13. model能力不足とenvironment / integration failureの分類規則を固定し、能力不足へ再分類する場合は環境/config/認証を変えず別のtool対応Zen modelだけに変更して同一smokeがPASSすることを確認する。
14. Codex CLIはbetaのdevice-code authenticationを今回のremote/headless正規経路とし、Phase Bで利用可能性を確定する。利用不能時にAPI key / access token / auth cache copy等の公式fallbackへ進まないのは今回の意図的なscope境界とする。
15. effective `CODEX_HOME` のset / unsetと解決後pathを記録し、login、project trust、Hook trust、smoke、subagent、`ci_wait`で同じ`CODEX_HOME`を使う。
16. Codexは既存`.codex/config.toml`、project trust、Hook trust、`test:hooks`、`diagnose:hooks`、Linux `codex-safe.sh`、same-session Hook runtime、bounded subagent、`ci_wait` MCPをCodespaces上で確認する。
17. target devcontainerはGitHub CLIを提供し、`command -v gh` / `gh --version`が成功する。Phase B / E-2 / E-3では`GH_TOKEN`を対象processから除外し、Codespaces標準`GITHUB_TOKEN`で`ci_wait`が実際に使用するPR / workflow runs APIへread-only接続できることを確認する。
18. Phase B / Full Rebuild / Fresh Createでは`ci_wait` server startupと`wait_for_required_ci` tool discoveryまでをintegration evidenceとし、tool自体は呼ばない。
19. `.devcontainer/devcontainer.json`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`、`remoteUser: "node"`、`ghcr.io/devcontainers/features/github-cli:1`、`ghcr.io/devcontainers/features/desktop-lite:1`、`waitFor: "postCreateCommand"`、`forwardPorts: [8081, 6080]`を持つ。VS Code拡張とPlaywright Chromiumの追加要件はIDE / Playwright追加Planに従う。
20. `postCreateCommand`はworkspace rootから逐次・fail-fastで、dependency install → Playwright Chromium + Linux dependencies → OpenCode exact install → Codex exact installを実行する。postCreate完了前をReady扱いしない。
21. candidate SHA確定後からFull Rebuild / Fresh Createのevidence取得完了までbranchへpushしない。両方を同じcandidate SHAで検証する。
22. E-2ではPhase B Codespaceを再利用し、clean確認 → `git fetch origin` → expected branch確認 → `git merge --ff-only origin/plan/codespaces-opencode-devcontainer`でcandidate SHAへ同期する。fast-forwardできない場合は停止する。
23. Full Rebuild直前にHEAD == candidate SHA、tracked worktree / index clean、環境影響差分0、対象Codespace名を確認し、control shellから`gh codespace rebuild --full -c <codespace-name>`を実行する。Rebuild後にactive `devcontainerPath`が`.devcontainer/devcontainer.json`であることを確認する。
24. Full Rebuildではcontainer / lifecycle / target CLI contract、認証zero-state、OpenCode / Codex integrationを検証し、Codespace内で`pnpm run verify`を成功させる。検証終了時にtracked / index差分0と`git diff --check`を確認する。
25. Fresh CreateはPersonal dotfilesを作成直前だけ一時OFFにし、canonical machine、candidate branch、`.devcontainer/devcontainer.json`、`--status`を明示して作成する。作成・dotfiles未適用確認後は直ちにdotfiles設定を元へ戻す。
26. Fresh CreateのCodex未認証判定は`codex login status`を正本とし、`auth.json`不在と代替認証env不在は補助evidenceとする。
27. Fresh Createでもtarget CLI contract、effective `CODEX_HOME`、OpenCode / Codex integration、Git identity / remote / `git push --dry-run`、`pnpm run verify`、Web Runtimeを成功させ、検証終了時にtracked / index差分0と`git diff --check`を確認する。
28. Web smokeでは手動のport追加を行わず、`.devcontainer/devcontainer.json`の`forwardPorts: [8081, 6080]`を確認したうえで、`gh codespace ports`の8081 browse URL / visibilityを確認する。forwarded URLではStorefront heading「決定的なシナリオで、確かなテストを。」を確認し、GitHub / Expo / Reactのエラー画面ならFAILとする。確認後はWeb processを停止し8081を解放する。6080の検証はIDE / Playwright追加Planに従う。
29. validation-only CodespaceでCodex認証を行った場合、最終利用後に`codex logout` → `codex login status`で未認証を確認してからstopする。canonical Fresh Codespaceもユーザーが継続利用を明示しない限りfinal CI / PR本文更新後に同じcleanupを行う。
30. Personal dotfilesの一時変更中にsuccess / failure / blocker / user stopへ至った場合は、次工程へ進む前に元状態へ復元する。validation-only Codespaceを作成済みならRun終了前にstopする。
31. cleanup自体を実行できない場合は、その未復元 / 未停止 / 未logout状態をBlockerとしてREPORTとユーザー報告へ明記する。
32. Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。Plan / Run Artifact / PR本文だけの記録更新は再実行理由にしない。
33. Repository-wide quality gate / CI failureは`docs/reference/repair-loop.md`へ従う。独立した既存問題でもsafe minimal repairがRepository契約上必要なら同PRで修復する。修復がE-4対象ファイルならcandidateを作り直し、非環境影響なら関連verify / CIを再実行する。
34. Phase A時点のlatest mainをbaselineとして固定する。candidate freeze後にmainが進んだだけでは再検証しない。main由来変更をbranchへ取り込んだ場合、またはRepository契約上同期が必要になった場合はcandidate変更として再検証する。
35. final working treeで`pnpm run verify`と`git diff --check`が成功する。
36. canonical Fresh Codespaceをfinal push → exact HEADの`wait_for_required_ci` success → PR本文更新までrunning状態で維持する。final push後はそのCodespaceを`--ff-only`でfinal HEADへ同期し、candidate→final差分が記録系のみであることを確認する。
37. final exact HEADに対してRepository既存の`wait_for_required_ci`を1回だけ呼び、`Web CI` / `Mobile App CI`がsuccessする。Agent自身でCI pollingしない。
38. final CIとPR本文更新後にcanonical Fresh CodespaceのCodex credential cleanupとstopを行う。不要Codespaceはdelete候補としてREPORTへ記録し、deleteはユーザー判断とする。
39. Native経路、Security fallback、application source、test、workflowへ機能scopeとして目的外の変更を追加しない。ただしSection 33のRepository-wide repair契約は例外とする。
40. 実測で今回の目的達成に必須と判明した最小変更はcanonical Planを更新して同じPR #188で対応する。

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
- direct env credentialが利用できない場合はofficial env substitutionを使う最小configを許容する。configなし / root `opencode.json` / 別config sourceのどれを採用するかはPhase B→C checkpointで一意に固定する。
- root `AGENTS.md`はOpenCodeのproject ruleとして自動適用される。Repository-wide規約をOpenCodeにも適用し、Codex固有のHook / wrapper / native delegation / `ci_wait`等だけをCodex専用として区別する。
- `.agents/skills/**`はOpenCodeのnative Agent Skills discovery対象とする。代表として`feature-plan`をnative `skill` toolでloadできることを確認する。
- OpenCodeは今回upstream default permissionで利用する。Codex Safety Harness相当のpermission / sandbox / Hook制御をOpenCodeへ追加することは今回の対象外とする。
- model選択に依存しないRepository instructions / Skill discovery / bounded development smokeで、このRepositoryの開発エージェントとして利用できることを確認する。
- OpenCodeが実際に利用したmodelのFree / paid判定やusage集計は今回の検証対象にしない。

### Codex

- Repository には `.codex/config.toml`、Hook、rules、Run Artifact、Linux / Windows wrapper が既に存在する。
- `.codex/config.toml` は project trust 後に読み込まれ、`features.hooks = true` を使う。
- Hook trust は project trust と別条件で、既存正本は `docs/reference/codex-safety-harness.md`。
- `pnpm run diagnose:hooks` が Repository 側の read-only 診断経路として存在する。
- Linux wrapper は `scripts/codex-safe.sh`。readonly preflight で既存 policy を確認できる。
- `.codex/config.toml` には `ci_wait` MCP server があり、`GH_TOKEN` / `GITHUB_TOKEN` を利用する。
- GitHub Codespaces は `GITHUB_TOKEN` を既定環境変数として提供する。
- remote / headless 環境のChatGPT認証ではdevice code authenticationが公式のpreferred pathだがbetaである。今回のPlanでは`codex login --device-auth`を正規経路とし、利用不能時に公式fallbackへ進まない。
- `codex login status`をactive auth確認の正本、`codex logout`をvalidation credential cleanupの正規経路とする。
- Codex auth file を Repository や Codespaces Secret へコピー・永続化しない。

### Codespaces personalization

- Personal dotfiles を有効にしている場合、新規 Codespace に dotfiles repository と setup script が自動適用され得る。
- dotfiles は CLI install、PATH、global config、Git config 等を変更できるため、Phase BとFresh Createの作成時だけ一時的に無効化する。
- dotfiles設定は新規Codespace作成時にだけ影響するため、Run全体でOFFにし続けない。
- Phase Aで元のenabled/disabled状態と選択Repositoryを記録する。
- Phase B / Fresh Createそれぞれで「作成直前にOFF → `gh codespace create --status` → dotfiles未適用確認 → 直ちに元状態へ復元」を行う。
- 一時OFF中にcreate failure / blocker / user stopへ至った場合はfinally相当のcleanupとして元状態へ戻す。
- 既存Codespaceからdotfilesを手作業で除去する方法はcanonical検証の代替にしない。
- Settings Sync は今回の CLI / shell 再現性判定の主対象にしない。

### Secret / credential

- `OPENCODE_API_KEY` はユーザー固有の Personal Codespaces Secret とする。
- 既存の`OPENCODE_API_KEY` Secretを使う場合、既存Repository accessを削除せず`qa-training-store`を追加する。新規の専用Secretを作成する場合だけ`qa-training-store`限定でよい。
- Codespace作成後にSecretを追加・変更した場合はstop → restartしてから検証する。
- `devcontainer.json#secrets`はrecommended secretの案内であり、Secret valueを保存する機能ではない。
- Codespaces development secretはCodespace環境へenvironment variableとして注入されるため、`OPENCODE_API_KEY`はOpenCode専用の秘密領域ではなくCodespace内の他processからも参照可能である。
- 今回はprocess単位のSecret broker / isolationを追加しない。Codex / OpenCode / shell / Hookを含む各processがSecret値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しないことを境界とする。
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

Phase Bでは環境非依存の契約と、Phase Cで使うtarget install戦略を確定する。`desktop-lite`、VS Code拡張、Playwright Chromium導入についてはIDE / Playwright追加Planのcheckpointも同時に確定する。

1. OpenCode package spec、exact version、binary name。
2. OpenCode Zen authentication exact mechanism。
3. OpenCode Personal Secret利用をSecret非露出で確認するcredential-specific evidence method。
4. OpenCode auth fallbackが必要な場合のconfig source。configなし / root `opencode.json` / 別config sourceのいずれか1つへ固定する。
5. OpenCode Repository instructions自動適用 / native Skill discovery / development smokeのexact command / prompt / expected result。
6. Codex package spec、exact version、binary name。
7. Codex device-code authenticationがbetaであることを前提にしたexact手順と`codex login status`の期待結果。
8. effective `CODEX_HOME` のset / unsetと解決後path、およびlogin / trust / smoke / subagent / `ci_wait`で同じ値を使う手順。
9. Codex Hook runtime / bounded subagent evidenceのsession ID / JSONL確認方法。
10. `ci_wait` server startup / tool discoveryと、同じtoken条件で必須確認するGitHub API endpoint。
11. Dev Container image tag `5-24-bookworm` の利用可否。
12. GitHub CLI Feature `ghcr.io/devcontainers/features/github-cli:1` の利用可否。
13. target `node` userで使用するOpenCode exact install command、install先の方針、PATH反映、sudo使用有無。
14. target `node` userで使用するCodex exact install command、install先の方針、PATH反映、sudo使用有無。
15. `corepack enable`と`postCreateCommand`のexact command / 実行順 / fail-fast条件。
16. Phase Aで決めたcanonical machine name。

plain Codespaceの`command -v`、実install path、実行user、PATH、Fresh shellでのbinary解決はbaseline evidenceとして記録するがtarget contractにはしない。

### target devcontainerで検証する値

E-2 Full RebuildではPhase B→Cで確定済みのinstall戦略を変更せず実行し、次をtarget contractの実測値として記録する。

- `remoteUser == node`
- `command -v opencode` / `command -v codex` / `command -v gh`
- OpenCode / Codexの実install path
- `gh --version`と`ci_wait`に必要なGitHub API capability
- effective PATH
- Phase B→Cで決めたsudo方針どおりにinstallされたこと
- `corepack enable` の成立
- Fresh shellでのbinary解決
- Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exact
- effective `CODEX_HOME`

E-2でinstall戦略またはGitHub CLI提供方法の変更が必要と判明した場合、その場で変更せずPhase B→C checkpoint / Phase Cを更新して新candidate SHAを作る。

OpenCodeのmodel ID、Free / paid、価格、model利用実績は固定しない。

### 終了時cleanup契約

- dotfilesは各新規Codespace作成のため一時OFFにした直後、作成・未適用確認が終わり次第元状態へ戻す。create failure / blocker / user stopで通常手順を抜ける場合も、次工程へ進む前に元状態へ復元する。
- validation-only CodespaceでCodexへloginした場合、最終利用後に`codex logout` → `codex login status`で未認証を確認してからstopする。
- Phase B CodespaceはE-2 Full Rebuildの最終evidence取得後にcredential cleanupしてstopする。
- canonical Fresh Codespaceはfinal HEADのCI waiterとPR本文更新が終わるまでrunning状態を維持し、その後、ユーザーが継続利用を明示しない限りcredential cleanupしてstopする。
- 不要Codespaceはdelete候補としてREPORTへ記録するが、自動deleteしない。
- cleanup自体を実行できない場合は、未復元 / 未logout / 未停止の対象と理由をBlockerとしてREPORTとユーザー報告へ記録する。
- Run再開時はdotfiles設定、Codespace state、Codex login statusを再確認してから継続する。

### 同一 PR で対応する条件

Phase B〜F の実測またはRepository-wide quality gateで、今回のゴール達成や既存Repository governanceを満たすために追加変更が必要と確認された場合:

- 原因と必要性を確認する。
- canonical Plan と active Run Artifact を先に更新する。
- 目的達成または`docs/reference/repair-loop.md`が要求するsafe minimal repairだけを同じ PR #188 で実装する。
- 修復がE-4の環境影響ファイルに該当する場合はcandidateを作り直し、Full Rebuild / Fresh Createを両方やり直す。
- 非環境影響のrepairは関連する`pnpm run verify` / CIを再実行し、不要なFresh Createは増やさない。
- 将来拡張や利便性改善だけを理由に変更範囲を広げない。

次の場合だけ実装を停止してユーザー判断へ戻す。

- 目的そのものを変更する必要がある。
- destructive / irreversible operation が必要。
- Secret / credential の取り扱い境界を変更する必要がある。
- 外部サービスの契約・課金に新たなユーザー判断が必要。
- 必要な権限や認証を取得できず実行不能。
- repair-loopの停止条件に該当する。

## 4. 予定する変更

### 通常経路で変更するもの

- `.devcontainer/devcontainer.json`
  - image: `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`
  - `remoteUser: "node"`
  - GitHub CLI Feature: `ghcr.io/devcontainers/features/github-cli:1`
  - Desktop Feature: `ghcr.io/devcontainers/features/desktop-lite:1`
  - VS Code extensions: `OpenAI.chatgpt` / `sst-dev.opencode` / `ms-playwright.playwright`
  - Node / pnpm / Playwright Chromium / OpenCode / Codex CLI setup
  - `OPENCODE_DISABLE_AUTOUPDATE=true`
  - `waitFor: "postCreateCommand"`
  - recommended secret `OPENCODE_API_KEY`
  - `forwardPorts: [8081, 6080]`
- `AGENTS.md`
  - title / introductionをRepository Agent向けに最小修正
  - Repository-wide規約がOpenCodeにも適用されることを明示
  - Codex固有のHook / wrapper / native delegation / `ci_wait`等はCodex専用と明示
  - 既存の詳細契約や正本参照を重複コピーしない
- `README.md`
  - Codespaceを通常利用するための作成手順とPersonal Secret
  - OpenCode Zen認証、ユーザーによるmodel選択、upstream default permission
  - Codex device-code authenticationがbetaであることとlogin / logout
  - version確認、Web 8081、Native対象外
  - canonical validationの詳細はPlan /既存referenceへのリンクに留める
- canonical Plan / active Run Artifact

### 条件付きで変更するもの

- root `opencode.json` または別のOpenCode auth config
  - direct `OPENCODE_API_KEY`認識が成立せず、Phase B→C checkpointでofficial env substitution fallbackが必要と確定した場合だけ追加
  - Secret値、model固定、permission変更は含めない
  - config sourceはcheckpointで1つへ固定する
- `.codex/**`
- `.devcontainer/Dockerfile`
- helper script
- `hostRequirements`
  - canonical最小machineで明確なresource exhaustionが再現し、必要最小machineをRepository設定で保証する必要がある場合だけ検討
- その他、Phase B〜F またはrepair-loopでゴール達成に必須と確認されたファイル

### 原則として変更しないもの

- `package.json` / `pnpm-lock.yaml`
- `.github/opencode/security-fallback.json`
- `.github/workflows/security-dependency-fallback.yml`
- application source / test
- Cloudflare / Expo / Playwright config
- `docs/native/**`

上記もRepository-wide repair-loopでsafe minimal repairが必要と判定された場合はSection 3のルールに従う。

## 5. 実装手順

### Phase A: 実装開始時の再基準化

1. branchが`plan/codespaces-opencode-devcontainer`、対象PRが#188であることを確認する。
2. `git fetch origin`後、latest`origin/main`、remote PR head、local HEAD、working tree、upstreamを確認する。
3. Phase A時点のlatest main SHAをbaseline main SHAとして記録する。Phase A後にmainが進んだだけではbaselineを更新しない。
4. main更新をbranchへ取り込む必要がある場合はGit safety契約に従ってPhase B前に行う。force pushは使わない。
5. Phase B開始前にworking tree clean、local HEAD == remote PR headを確認し、baseline PR head SHAを記録する。
6. `package.json`、README、CI、`.codex/config.toml`、`scripts/codex-safe.sh`、Hook関連正本、`docs/reference/repair-loop.md`がPlan前提から変わっていないか確認する。
7. OpenCode / GitHub Codespaces / Dev Containers / Codexの公式仕様を実装日基準で再確認する。
8. stable version決定規則に従いOpenCode / Codexのexact versionを確定し、canonical Plan / active Runへ記録する。
9. Repository visibilityがpublicのままであることを確認する。privateへ変更されていた場合はOpenCodeへsourceを送る前に停止する。
10. control shellで`gh --version`を確認する。
11. token値を表示しない`gh auth status --active --hostname github.com`を実行し、active accountがCodespaces操作可能であることを確認する。
12. `gh codespace list -R ryu-yoshikawa-pro-vision/qa-training-store`を実行し、control shellからCodespaces control planeへアクセスできることを確認する。
13. `gh api --method GET repos/ryu-yoshikawa-pro-vision/qa-training-store/codespaces/machines -f ref=plan/codespaces-opencode-devcontainer`等のofficial APIで利用可能machineを取得し、CPU → memory → storageの順で最小の有効Linux machineをcanonical validation machineとして記録する。locationは未指定の自動選択とし、今回の同等性契約に含めない。
14. GitHub Codespaces Personal Settingsのdotfiles enabled/disabled状態と選択dotfiles Repositoryを変更前evidenceとして記録する。この時点では設定を変更しない。
15. Personal Secret設定、dotfiles設定変更、ChatGPT側device-code有効化、one-time code入力、Agentがbrowserを利用できない場合のforwarded URL表示確認はユーザー操作とする。Agentは必要な手順と検証結果を案内・記録する。
16. Codespace create / rebuild / stop操作は対象Codespace外のcontrol shellまたはGitHub UIから行い、環境内検証は対象Codespace内で行う。
17. active RunはこのPRの実装scopeを継続する。

#### Phase A stable version baseline (2026-10-03 JST)

- OpenCode: `@opencode/cli@2.0.22`。現行の[公式V2 install docs](https://opencode.ai/v2/docs/)が`@opencode/cli`を案内し、npm `dist-tags.latest` / `version` は`2.0.22`。exact install commandは`npm install --global @opencode/cli@2.0.22`。
- OpenCode distribution差: 非versionedのV1 docs / latest GitHub releaseは別packageの`opencode-ai@1.18.34`を示す。今回はV2 docsで指定されたpackageのlatest distributionを採用する。beta docsの`@opencode-ai/cli@next`は別package / channelなので採用しない。
- Codex: `@openai/codex@0.160.0`。npm `dist-tags.latest` / `version` は`0.160.0`。exact install commandは`npm install --global @openai/codex@0.160.0`。
- 上記はinstall versionの基準であり、Phase Bでinstall、実行version、Secret認識、AGENTS / Skill smokeを検証する。

### Phase B: dotfilesなし plain Codespace で事前検証

#### B-0: Secret / baseline Codespace

1. Codespace作成前にPersonal Codespaces Secret `OPENCODE_API_KEY` を確認する。既存Secretの場合は既存Repository accessを保持したまま`qa-training-store`を追加し、新規専用Secretの場合だけ`qa-training-store`限定で作成する。
2. Secretを作成後に変更した場合はCodespaceをstop → restartしてから使用する。
3. Phase Aで記録したdotfiles設定がONなら、Phase B Codespace作成直前だけ一時的にOFFにする。元状態がOFFなら変更しない。
4. canonical machine nameを使い、control shellから`gh codespace create -R ryu-yoshikawa-pro-vision/qa-training-store -b plan/codespaces-opencode-devcontainer -m <canonical-machine-name> --status`でplain Codespaceを作成する。`.devcontainer/devcontainer.json`はまだ存在しないため`--devcontainer-path`は指定しない。
5. create commandが失敗した場合も、dotfilesを変更していたなら次工程へ進む前に元状態へ復元する。
6. 作成したCodespace名と`gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName,location`をevidenceへ記録し、machineName == canonical machine nameを確認する。
7. `--status`出力をprimary evidenceとし、必要な場合だけ`/workspaces/.codespaces/.persistedshare/dotfiles`とcreation logを補助evidenceとして確認してdotfiles未適用を確定する。
8. dotfiles未適用を確認した直後に、Phase Aで記録した元のdotfiles設定へ復元する。元々OFFなら変更しない。
9. Codespace内で`git rev-parse HEAD` == baseline PR head SHAを確認する。不一致ならPhase Bを開始しない。
10. `node --version`、`corepack --version`、`git --version`、`gh --version`、`whoami`、`id -u`、`command -v node`、`command -v gh`をbaseline evidenceとして記録する。
11. plain Codespaceに`gh`が存在しない場合は、Phase Bの`ci_wait`検証に必要な一時prerequisiteとしてcurrent official GitHub CLI install経路で導入し、その事実をbaseline evidenceへ記録する。target devcontainerの提供方法には流用しない。
12. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode

1. Phase Aで確定したOpenCode exact versionをexact-version install command候補でinstallする。
2. `opencode --version` がPhase A確定versionと一致することを確認する。
3. plain Codespace上の`command -v opencode`、install path、user、sudo要否、PATH、Fresh shell解決をbaseline evidenceとして記録する。target devcontainerの期待値にはしない。
4. `OPENCODE_DISABLE_AUTOUPDATE=true`を設定し、起動前後でversionが変わらないことを確認する。
5. `OPENCODE_API_KEY` は値を出力せずnon-emptyだけ確認する。
6. `~/.local/share/opencode/auth.json` が存在しないことを確認する。
7. Repository / project configに別のZen credential sourceがないことを確認する。Secret値は探索・出力しない。
8. Phase Aで確定したexact versionについて、official docsまたはupstream implementation / testで`OPENCODE_API_KEY`がOpenCode Zen credentialとして認識されることを確認する。
9. current stableにSecret非露出のcredential-status API / CLIがある場合はそれを優先する。ない場合はauth cache・他credential sourceなし、同一command・同一configで変更するのは`OPENCODE_API_KEY`の有無だけという条件を作り、SecretありではZen credentialが成立し、Secretなしでは同じ認証必須操作がcredential failureになるcredential-specific evidenceを要求する。単なるmodel一覧差分だけでは認証証拠にしない。
10. direct env credentialがexact versionで利用できない場合だけofficial env substitutionを検証する。config sourceは「configなし / root `opencode.json` / 別config source」のいずれか1つへPhase B→C checkpointで固定し、配置場所、provider ID、apiKey表現、precedence、Fresh Createでの注入方法まで確定する。
11. root `opencode.json`をfallbackとして採用する場合はSecret値、model、permissionを含めず、Zen credentialの`{env:...}`接続だけを目的とする最小configにする。
12. `/connect`で生成されるauth cacheをFresh Create再現性の前提にしない。
13. canonical OpenCode smokeにはOpenCode Zen providerのmodelを使用する。model ID、Free / paidはユーザーが選択する。
14. `OPENCODE_DISABLE_PROJECT_CONFIG`がcanonical sessionで有効になっていないことを確認する。
15. `~/.config/opencode/AGENTS.md`、`~/.claude/CLAUDE.md`、global `.agents/skills/feature-plan`等、Repository instructions / representative Skill smokeを曖昧にするglobal sourceがないことを確認する。存在する場合は内容を読んで同一契約の由来を曖昧にしない方法を確定するまでsmokeを実行しない。
16. Section 6のOpenCode Repository instructions自動適用smoke、native Skill discovery smoke、development write smokeを実行する。

OpenCode停止条件:

- exact versionをinstallできない、またはversionが一致しない。
- Personal SecretがZen credential pathへ入ったことをSecret非露出で証明できない。
- Fresh Createで再現可能なZen認証方式を確定できない。
- root `AGENTS.md`の自動適用または`.agents/skills/feature-plan`のnative discovery / loadが成立しない。
- smokeがenvironment / integration failureでFAILする。
- OpenCodeが起動時にexact versionから自動更新される。

#### B-2: Codex CLI / ChatGPT authentication

1. Phase Aで確定したCodex exact versionをexact-version install command候補でinstallする。
2. `codex --version` がPhase A確定versionと一致することを確認する。
3. plain Codespace上の`command -v codex`、install path、user、PATH、Fresh shell解決をbaseline evidenceとして記録する。target devcontainerの期待値にはしない。
4. effective `CODEX_HOME` のset / unsetを確認し、未設定ならcurrent公式defaultに従って解決後pathを記録する。
5. `OPENAI_API_KEY`、`CODEX_API_KEY`、`CODEX_ACCESS_TOKEN`、`OPENAI_FEDERATION_RULE_ID`、`OPENAI_IDENTITY_TOKEN_FILE`は値を出力せずset / unsetだけを確認する。
6. 上記が設定されている場合はChatGPT認証前に原因を確認し、今回のCodex processから除外する。
7. `codex login status`を認証有無の正本として実行する。
8. remote / headless向けdevice-code authenticationはcurrent公式仕様上betaであることをevidenceへ記録する。
9. `codex login --device-auth`を今回の正規認証経路にする。
10. device-code loginがChatGPT側で無効ならユーザー操作で有効化して再実行する。利用不可または失敗する場合はAPI key、access token、auth cache copy、SSH callback等の公式fallbackへ進まずBlockerとする。
11. 認証後の`codex login status`がChatGPT認証を肯定的に示すことを確認する。
12. `/status`でsession / model / usageを確認する。
13. login、project trust、Hook trust、smoke、subagent、`ci_wait`で同じeffective `CODEX_HOME`を使用する。

#### B-3: Codex Repository integration

1. `GH_TOKEN` / `GITHUB_TOKEN` は値を出力せずset / unsetだけを確認する。
2. canonical Codespaces検証ではCodex / `ci_wait`を起動するprocessから`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を利用する。`.codex/config.toml`の`GH_TOKEN` supportは変更しない。
3. `command -v gh`と`gh --version`を確認する。
4. `pnpm run test:hooks` を実行する。
5. `pnpm run diagnose:hooks` を実行する。
6. `bash scripts/codex-safe.sh --preset readonly --preflight-only` を実行する。
7. Repository rootからdirect `codex` を起動する。
8. project trustを成立させる。
9. `/hooks`で`.codex/config.toml`がdefinition sourceであること、必要Hookの定義内容、trust状態を確認する。
10. 必要なHookだけを内容確認後にtrustする。
11. trust確認と実行でB-2に記録した同じeffective `CODEX_HOME`を使用し、値が変わっていないことを確認する。
12. `ci_wait` MCP serverがstartupし、`wait_for_required_ci` toolをdiscoverできることを確認する。Phase Bではtoolを呼ばない。
13. `GH_TOKEN`を除外した同じtoken条件で、少なくとも次のAPI種別へ`gh api`でread-only接続できることを必須確認する。
    - `repos/ryu-yoshikawa-pro-vision/qa-training-store/pulls/188`
    - `repos/ryu-yoshikawa-pro-vision/qa-training-store/actions/workflows/ci.yml/runs`
    - `repos/ryu-yoshikawa-pro-vision/qa-training-store/actions/workflows/native-ci.yml/runs`
    - workflow run IDを取得できた場合は`repos/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/<run-id>`
14. Section 6のCodex read-only / development smokeを同一sessionで実行し、そのsession IDを記録する。
15. 同一sessionの`hooks-<session_id>.jsonl`または既存loggerのfallback pathだけを確認し、`UserPromptSubmit`、`PostToolUse`、`Stop`が実Runtimeで記録されたことを確認する。
16. 同じCodex sessionからRepositoryの`packageManager`を読むだけのbounded read-only subagentを1回だけ起動する。
17. 同一session logで`SubagentStart` / `SubagentStop`が同じagent IDに対して記録され、subagentが正常終了したことを確認する。
18. Hook contract PASS、Hook trust、実Runtime event、subagent eventを別のevidenceとして記録する。

Codex停止条件:

- exact versionをinstallできない、またはversionが一致しない。
- betaの`codex login --device-auth`が利用できない、またはChatGPT認証が完了しない。
- `codex login status`がChatGPT認証を肯定的に示さない。
- 代替認証変数を今回のCodex processから除外できない。
- `test:hooks`、`diagnose:hooks`、readonly preflightのfailureが今回のCodespaces導入に起因し、解消できない。
- project / Hook trustを成立させられない。
- `ci_wait` MCP server、`wait_for_required_ci` tool discovery、または必須GitHub API read-only connectivityが成立しない。
- same-session Hook runtime evidenceまたはbounded subagent evidenceを取得できない。
- read-only smokeまたはdevelopment write smokeがFAILする。

### Phase B→C: 確定事項のPlan反映

Phase Bが成功したら`.devcontainer`を編集する前に、canonical Planとactive Run Artifactへ次を追記する。

- OpenCode package spec / exact version / binary name。
- OpenCode Zen authentication exact mechanismとcredential-specificなPersonal Secret利用evidence。
- OpenCode auth config source。direct envで成立する場合はconfigなし、fallbackの場合はroot `opencode.json`または別sourceの1つへ固定し、配置場所、provider ID、apiKey表現、precedence、Fresh Createでの注入方法を記録する。
- OpenCode Repository instructions自動適用 / native Skill discovery / development smokeのexact command / prompt / expected result。
- Codex package spec / exact version / binary name。
- betaのdevice-code loginを今回採用するexact手順と`codex login status`の期待結果。
- effective `CODEX_HOME` とlogin / trust / smoke / subagent / `ci_wait`で同じ値を使う手順。
- `/hooks`、same-session Hook runtime、bounded subagentの確認手順。
- `ci_wait` server startup / tool discovery / `GH_TOKEN`除外 / `GITHUB_TOKEN`利用と必須GitHub API endpointの確認手順。
- Dev Container image tag `5-24-bookworm` の利用可否確認結果。
- GitHub CLI Feature `ghcr.io/devcontainers/features/github-cli:1` の利用可否確認結果。
- target `node` userで使用するOpenCode / Codex exact install command、install先の方針、PATH反映、sudo使用有無。
- `corepack enable`と`postCreateCommand`のexact command / 実行順 / fail-fast条件。
- canonical machine name。

plain Codespaceの`command -v`、実install path、user、PATHはbaseline evidenceのままとし、target contractへ昇格させない。

OpenCodeのmodel ID、Free / paid、価格、model利用実績は固定しない。このcheckpointが未更新のままPhase Cへ進まない。

### Phase C: `.devcontainer/devcontainer.json` / `AGENTS.md` 実装

#### `.devcontainer/devcontainer.json`

1. `image`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`。
2. `remoteUser`は`node`。
3. `features`へ`ghcr.io/devcontainers/features/github-cli:1`と`ghcr.io/devcontainers/features/desktop-lite:1`を追加し、target devcontainer自身でGitHub CLIとGUI基盤を保証する。`customizations.vscode.extensions`には`OpenAI.chatgpt`、`sst-dev.opencode`、`ms-playwright.playwright`を追加する。
4. `waitFor`は`postCreateCommand`。postCreate完了前をReady扱いしない。
5. `containerEnv`またはcurrent Dev Container specで同等のcontainer-wide設定として`OPENCODE_DISABLE_AUTOUPDATE=true`を入れる。
6. `postCreateCommand`はPhase B→C checkpointで確定したexact command / sudo方針 / PATH反映をそのまま使い、workspace rootで逐次・fail-fastに実行する。実装時にinstall方式を選び直さない。
7. `secrets`には`OPENCODE_API_KEY`をrecommended secretとして宣言する。値やdefault tokenは書かない。
8. `forwardPorts`は`[8081, 6080]`。5901はforwardしない。6080はprivate visibilityを維持する。
9. OpenCodeのmodelは固定しない。model-specific config、provider whitelist、model制御launcherは追加しない。
10. OpenCode permissionはupstream defaultを使用する。Codex Safety Harness相当のpermission / sandbox / Hook設定をOpenCodeへ追加しない。
11. Personal `OPENCODE_API_KEY`のdirect recognitionで認証できる場合はOpenCode用configを追加しない。
12. official env substitution fallbackが必要とPhase Bで確定した場合だけ、Phase B→C checkpointで固定したconfig sourceへSecret値を含まない最小configを反映する。root `opencode.json`を採用した場合はmodel / permissionを含めない。
13. Codex auth file / ChatGPT tokenをcopy / mountしない。
14. Android / iOS toolchain、Docker-in-Docker、Firefox / WebKitのCodespaces用browser、CI専用依存、追加の不要なVS Code extensionは追加しない。Chromiumと3つのVS Code拡張はIDE / Playwright追加Planで要求された範囲だけ導入する。
15. Phase Bで必須と判明していない限りDockerfileやhelper scriptを増やさない。
16. canonical最小machineで明確なresource exhaustionが再現しない限り`hostRequirements`を追加しない。必要な場合は最小要件だけを追加してnew candidateから再検証する。

#### `AGENTS.md`

1. title / introductionだけを中心に最小修正し、このRepositoryで作業するCodex / OpenCode等のAgentへRepository-wide規約が適用されることを明示する。
2. `.codex/**`、Hook trust、Codex wrapper、native delegation、`ci_wait`など明示的にCodex固有の項目はCodexだけに適用されると明示する。
3. 既存のSkill / Harness / validator / rulesを正本とする構造は維持し、OpenCode向けに同じ契約を複製しない。
4. `.agents/skills/**`のroutingはOpenCode native Skill discoveryでも利用する。

### Phase D: README更新

READMEは通常利用者がCodespaceを使い始めるために必要な情報だけを追加し、canonical validation内部の手順を重複させない。

1. Codespaceの作成入口と`OPENCODE_API_KEY` Personal Codespaces Secretの設定。既存Secretの場合は既存Repository accessを保持したまま`qa-training-store`を追加する。
2. SecretをCodespace作成後に追加・変更した場合はstop → restartが必要であること。
3. `devcontainer.json#secrets`はrecommended secretの案内であり、Secret valueを保存しないこと。
4. `OPENCODE_API_KEY`はCodespace-wide environment variableとして他processからも参照可能で、今回process単位のSecret分離は行わないこと。値を出力・保存しないこと。
5. `node --version` / `pnpm --version` / `gh --version` / `opencode --version` / `codex --version` の確認。
6. OpenCodeのmodelはユーザーがOpenCode Zen上で選択し、Repository / devcontainerはFree / paidを制限しないこと。
7. OpenCodeはRepository root `AGENTS.md`と`.agents/skills/**`を利用し、permissionはupstream defaultであること。
8. OpenCode Zen authentication exact mechanism。fallback configを使う場合は配置場所とSecret値を保存しないこと。
9. Codexはremote/headless環境でbetaの`codex login --device-auth`を今回の経路として使い、`codex login status` / `codex logout`で状態を確認・解除すること。今回API key / token / auth cache copyへfallbackしないこと。
10. Webは8081を利用すること。
11. CodespacesはWeb / Repository validation用で、Windows Android / macOS iOSの正式経路を置き換えないこと。
12. Full Rebuild / Fresh Create / dotfiles一時OFF / `ci_wait` phase差 / Hook evidence等の検証詳細はcanonical Planと`docs/reference/**`へリンクし、READMEへ再定義しない。

### Phase E: candidate SHAの作成と実機検証

#### E-0: candidate作成前のRepository検証

1. `.devcontainer` / `AGENTS.md` / README /条件付きOpenCode auth config /必要なhelper等の実装を完了する。
2. `pnpm run verify`を実行する。
3. `git diff --check`、`git status --short`、PR差分を確認する。
4. Native、Security fallback、application source / test / workflowへ機能scopeとして目的外差分がないことを確認する。
5. quality gateがFAILした場合は原因をcurrent change / verification requirement /独立した既存問題へ分類し、`docs/reference/repair-loop.md`がsafe minimal repairを要求する場合は同PRで修復する。「今回の機能scope外」だけを理由に保留しない。
6. repairが`.devcontainer/**`、OpenCode auth config、`.codex/**`、`AGENTS.md`、package / lockfile、install / setup script等の環境影響ファイルへ及ぶ場合は修復をcandidateへ含める。非環境影響なら関連gateを再実行する。
7. Secret、Codex auth file / token、OpenCode auth情報、`.artifacts`、`node_modules`をcommit対象にしない。

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

Full Rebuildは既存Phase B Codespaceへcandidateのdevcontainer変更を適用し、container image / lifecycle setup / target CLI contractを確認する。GitHub Codespacesでは`/workspaces`に加えて`/tmp`もFull Rebuildをまたいで残り得るため、「Full Rebuildしたから無条件に認証zero-state」とは判定しない。

1. control shellからPhase B Codespace名を対象として確定し、Run Artifactへ記録する。
2. 対象Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。
3. tracked working tree / indexがcleanであることを確認する。
4. `.devcontainer/**`、OpenCode authentication / install helper、Codespaces helper、`.codex/**`、`AGENTS.md`、`package.json` / lockfile、install / setup scriptにcandidate SHAと異なる未commit差分がないことを確認する。
5. candidateに含まれない環境影響untracked fileがある場合はRebuildを開始せずE-0へ戻る。
6. control shellから`gh codespace rebuild --full -c <codespace-name>`を実行する。通常Rebuildは代替にしない。
7. Rebuild後、control shellから`gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName`を確認し、active `devcontainerPath`が`.devcontainer/devcontainer.json`、machineNameがcanonical machine nameであることをevidence化する。不一致ならFAIL。
8. Run Artifactへexact command、Codespace名、candidate SHA、devcontainerPath、machineNameを記録する。
9. postCreate完了後に環境をReady扱いする。
10. `whoami == node`、`id -u != 0`を確認する。
11. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exact、`gh --version`を確認する。
12. target container上で`command -v opencode` / `command -v codex` / `command -v gh`、実install path、effective PATH、sudo方針、`corepack enable`、Fresh shellでのbinary解決を記録し、Phase B→Cで確定したinstall戦略どおりであることを確認する。
13. effective `CODEX_HOME`を記録し、Phase B→C契約と一致することを確認する。
14. install戦略、GitHub CLI提供方法、`CODEX_HOME`契約の変更が必要なら、その場で修正せずPhase B→C checkpoint / Phase Cを更新して新candidateを作る。
15. OpenCodeは通常のhome auth cacheがないことを確認する。予期せず認証状態が残っている場合は`/workspaces`へのsymlink、`/tmp` / `TMPDIR`、alternate credential source等を調査し、原因未確認のまま認証済み扱いにしない。
16. Codexは`codex login status`を認証状態の正本として実行する。予期せず認証済みならeffective `CODEX_HOME`、credential store、symlink、`/tmp` / `TMPDIR`等のpersisted sourceを調査する。
17. zero-state確認後にOpenCode Personal Secret認証とbetaのCodex device-code authを実行する。
18. Section 6のOpenCode Repository instructions / Skill discovery / development smokeを再検証する。
19. Codexは同じeffective `CODEX_HOME`で認証監査、`test:hooks`、Repository integration、same-session Hook runtime、bounded subagent、read-only / development smokeを再検証する。
20. `GH_TOKEN`を対象processから除外し、`ci_wait` server startupと`wait_for_required_ci` tool discoveryを確認する。ここではtoolを呼ばない。
21. 同じtoken条件でSection B-3と同じPR / workflow runs APIへ`gh api`でread-only接続できることを必須確認する。
22. `pnpm run verify`をCodespace内で実行しPASSする。`postCreateCommand`で既に成功した`pnpm install --frozen-lockfile`は冪等性検証のために再実行しない。
23. Web smoke契約に従って8081を確認する。
24. 最後に`git diff --quiet`、`git diff --cached --quiet`、`git diff --check`、`git status --short`を確認し、tracked / index差分0とする。Section 6の`.artifacts/**`はignoredのため許容する。
25. E-2での最終利用後に`codex logout`を実行し、`codex login status`が未認証を示すことを確認する。
26. control shellからPhase B / Full Rebuild Codespaceをstopする。stopできない場合は終了時cleanup契約に従ってBlockerとして記録する。

#### E-3: candidate SHAのcanonical Fresh Create

Fresh Createは新規Codespace、repository workspace、create-time devcontainer selection、dotfiles未適用、認証zero-stateを含む完全新規環境の正本とする。

1. Fresh Create直前にremote branch head == candidate SHAを再確認する。不一致なら作成せずE-0へ戻る。
2. Phase Aで記録したdotfiles設定がONなら、Fresh Create直前だけ一時的にOFFにする。元状態がOFFなら変更しない。
3. control shellから`gh codespace create -R ryu-yoshikawa-pro-vision/qa-training-store -b plan/codespaces-opencode-devcontainer -m <canonical-machine-name> --devcontainer-path .devcontainer/devcontainer.json --status`で新しいCodespaceを作成する。
4. create commandが失敗した場合も、dotfilesを変更していたなら次工程へ進む前に元状態へ復元する。
5. `gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName,location`で`.devcontainer/devcontainer.json`とcanonical machine nameが使用されたことを記録する。locationはevidenceとして記録してよいがPASS / FAIL条件にしない。
6. `--status`出力をprimary evidenceとし、必要な場合だけpersistedshare / creation logを補助evidenceとして確認してdotfiles未適用を確定する。
7. dotfiles未適用を確認した直後に、Phase Aで記録した元のdotfiles設定へ復元する。元々OFFなら変更しない。
8. 新Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。不一致ならFAIL。
9. manual CLI install、home directory copy、auth cache copyを行わない。
10. `command -v gh` / `gh --version`を含め、devcontainer作成処理だけでNode / pnpm / GitHub CLI / OpenCode / Codex CLIが揃うことを確認する。
11. OpenCodeは通常のauth cacheが存在しないこと、`OPENCODE_API_KEY`がCodespaces Secretとしてnon-emptyであること、Repository側に別credential sourceがないことをSecret非露出で確認する。
12. effective `CODEX_HOME`のset / unsetと解決後pathを記録する。
13. Codexのzero-state判定は`codex login status`を正本とする。`$CODEX_HOME/auth.json`等の不在とAPI key / access token / WIF env不在は補助evidenceとし、file不在だけで未認証と判定しない。
14. `whoami` / `id -u`、version、`command -v`、実install path、effective PATH、dependency install、effective `CODEX_HOME`を確認し、E-2 target contractと一致することを確認する。
15. OpenCodeはPhase Bで確定したPersonal Secret認証方式をzero-stateから再現し、Section 6のRepository instructions / Skill discovery / development smokeを実行する。
16. Codexは同じeffective `CODEX_HOME`でbetaの`codex login --device-auth`を実行し、認証後`codex login status`がChatGPT認証を示すことを確認する。
17. Codexの`test:hooks`、project / Hook trust、same-session Hook runtime、bounded subagent、read-only / development smokeを同じeffective `CODEX_HOME`で再検証する。
18. `GH_TOKEN`を対象processから除外し、`ci_wait` server startupと`wait_for_required_ci` tool discoveryを確認する。ここではtoolを呼ばない。
19. 同じtoken条件でSection B-3と同じPR / workflow runs APIへ`gh api`でread-only接続できることを必須確認する。
20. `git var GIT_AUTHOR_IDENT`、`git var GIT_COMMITTER_IDENT`、`git remote -v`を確認し、Codespaces内でGit identityとremoteが成立していることを確認する。
21. `git push --dry-run origin HEAD:refs/heads/plan/codespaces-opencode-devcontainer`を実行し、実際のpushを発生させずcurrent branchへのwrite credential / permissionが成立することを確認する。
22. `pnpm run verify`をCodespace内で実行しPASSする。
23. Web smoke契約に従って8081を確認する。
24. 最後に`git diff --quiet`、`git diff --cached --quiet`、`git diff --check`、`git status --short`を確認し、tracked / index差分0とする。Section 6の`.artifacts/**`はignoredのため許容する。
25. canonical Fresh Codespaceはfinal HEADのCI waiter / PR本文更新までrunning状態を維持する。

#### E-4: candidate SHAの無効化条件

Fresh Create後に次のいずれかを変更した場合、candidate evidenceは無効とする。

- `.devcontainer/**`
- OpenCode authentication config / install helper / Codespaces helper
- `.codex/**`
- `AGENTS.md`
- `package.json` / lockfile
- install / setup script
- `hostRequirements`
- その他、OpenCode / Codex / GitHub CLI / Node / pnpm / PATH / trust / Hook / MCP / Web起動に影響するファイル

修正後はE-0 → E-1で新candidate SHAを作成し、E-2 Full RebuildとE-3 Fresh Createを両方やり直す。

Repository-wide quality gate / CI failureに対するrepair-loopで上記ファイルを変更した場合も同じ扱いとする。上記に該当しないsafe minimal repairだけならFresh Createを再実行せず、影響を受ける`pnpm run verify` / CIを再実行する。

canonical Plan、Run Artifact、PR本文など検証結果の記録だけを更新した場合はFresh Createをやり直さない。ただしfinal headとcandidate SHAの差分を確認し、環境再現性へ影響するファイルが含まれないことを証明する。

### Phase F: 最終記録とGitHub検証

1. candidate SHA、Full Rebuild、Fresh Create、OpenCode / Codex / GitHub CLI / Git write evidenceをactive Run Artifactへ記録する。
2. canonical PlanのPhase B→C確定値、E-2 target contract、実測結果を最終状態へ更新する。
3. PR #188本文へcandidate SHAと実機検証結果を反映する。
4. `pnpm run verify`と`git diff --check`をfinal working treeで再実行する。
5. quality gateがFAILした場合はrepair-loopへ従う。safe minimal repairがE-4対象ならnew candidateからE-2 / E-3を再実行し、それ以外なら関連verifyを再実行する。
6. tracked Run Artifact / PlanをCI待機前の最終状態まで確定し、通常commit /通常pushする。
7. final PR headとcandidate SHAを比較し、Fresh Create後の差分がPlan / Run Artifact等の記録系だけで、E-4対象ファイルが0件であることを確認する。含まれる場合はE-0へ戻る。
8. canonical Fresh Codespaceはstopせずrunning状態を維持し、working tree / index cleanを確認する。
9. canonical Fresh Codespace内で`git fetch origin` → expected branch確認 → `git merge --ff-only origin/plan/codespaces-opencode-devcontainer`を実行し、HEAD == final PR headを確認する。fast-forwardできない場合は停止する。
10. final HEADへのfast-forwardでcandidate→final間の記録系差分だけが入ったことを確認し、Fresh Create evidenceを無効化するE-4対象変更がないことを再確認する。
11. final CI用processでも`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を使用する。
12. `docs/reference/codex-implementation-harness.md`と`ci_wait` contractを必須CIの正本とする。exact final HEADの`Web CI`と`Mobile App CI`だけを対象とする。
13. canonical Fresh Codespaceの同じeffective `CODEX_HOME`から、pushしたfinal HEAD SHAを指定して`wait_for_required_ci`を1回だけ呼び、その結果を待つ。Agent自身でGitHub Actionsをpollingしない。
14. waiter利用不能はCI未確認blockerとし、別手段のpollingへfallbackしない。
15. `wait_for_required_ci`がfailureを返した場合はimplementation harnessとrepair-loopに従い原因を分類する。safe minimal repair後にnew final HEADをpushした場合、その新exact HEADに対してのみwaiterを1回実行する。
16. `Web CI` / `Mobile App CI`がともにsuccessした後、PR #188本文へfinal exact-head CI結果を記録する。
17. CI結果を記録するだけの理由で`TASKS.md`、`REPORT.md`、`PLAN.md`等を再commit /再pushしない。
18. PR本文更新後、canonical Fresh Codespaceで`codex logout`を実行し、`codex login status`が未認証を示すことを確認する。ユーザーが継続利用を明示した場合だけこのlogoutを省略できる。
19. control shellからcanonical Fresh Codespaceをstopする。継続利用をユーザーが明示した場合はstopの扱いもその指示へ従う。
20. 不要Codespaceをdelete候補としてREPORTへ記録するが、自動deleteしない。
21. Phase Aで記録したdotfiles設定と現在設定が一致していることを最終確認する。不一致なら元状態へ復元する。
22. cleanupを実行できない場合は終了時cleanup契約に従ってBlockerとして報告する。

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

### OpenCode Repository instructions自動適用

Repository rootから新規OpenCode sessionを開始する。

precondition:

- canonical sessionで`OPENCODE_DISABLE_PROJECT_CONFIG`が有効でない。
- `~/.config/opencode/AGENTS.md`、`~/.claude/CLAUDE.md`等に、このRepository固有の報告契約を偶然満たすglobal instructionがない。
- このsmokeではRepository fileを読むtoolを使用しない。

prompt:

> このRepositoryでユーザー向け返答に必須の報告要素と、`Next`を含める条件を答えてください。この質問ではRepository fileを読むtoolを使わず、session開始時に適用済みのinstructionsだけを使ってください。ファイルは変更しないでください。

PASS:

- `Summary`、`Progress`、`Evidence`を回答する。
- `Next`は未完了時など必要な場合だけ含める条件付き要素として説明される。
- Repository file read toolを使用していない。
- tracked file変更0件。

このsmokeはroot `AGENTS.md`のproject rule自動適用を確認するもので、promptから`AGENTS.md`を直接読ませない。

### OpenCode native Skill discovery

同じRepository rootから新規またはcleanなOpenCode sessionで、native `skill` toolを使う。

prompt:

> native `skill` toolで `feature-plan` をロードし、Skillの `name` と `description`、このRepositoryでどのような依頼に使うかを短く答えてください。SKILL.mdをshellやfile read toolで直接読まないでください。ファイルは変更しないでください。

PASS:

- native `skill` toolから`feature-plan`をdiscover / loadできる。
- `name=feature-plan`とcurrent frontmatterのdescriptionに整合する内容を回答する。
- `.agents/skills/feature-plan/SKILL.md`をshell / direct file readで代替していない。
- tracked file変更0件。

### Codex read-only

direct Codexで次を実行する。

prompt:

> root `AGENTS.md` がユーザー向け返答に求める報告要素を列挙し、`Next` が必要な場合だけ求められる条件付き要素であることも説明してください。ファイルは変更しないでください。

PASS:

- `Summary`、`Progress`、`Evidence`を回答する。
- `Next`は「必要な場合」に含める条件付き要素として説明される。
- tracked file変更0件。
- project config / Hook trust確認済みで、ChatGPT認証を使用し、same-session Hook logに`UserPromptSubmit`と`Stop`が記録される。

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

1. `.devcontainer/devcontainer.json`に`forwardPorts: [8081, 6080]`が定義されていることを確認する。このWeb smokeでは8081だけを対象とし、6080はIDE / Playwright追加Planで検証する。
2. canonical smoke中は手動の「Add Port」や`gh codespace ports visibility`等でportを追加・変更しない。
3. `pnpm run start:web`を別processで起動し、PIDまたはprocess handleを記録する。
4. 8081がlisten状態になることを確認する。
5. Codespace内からlocalhost:8081へのHTTP応答を確認する。
6. control shellから`gh codespace ports -c <codespace-name>`等で8081のbrowse URLとvisibilityを確認する。
7. visibilityを変更せず、GitHubへサインイン済みのブラウザでforwarded URLを開く。
8. Storefrontが表示され、heading「決定的なシナリオで、確かなテストを。」が表示されることを確認する。GitHub / Expo / Reactのエラー画面が表示される場合はFAILとする。
9. Agentが利用可能なbrowserで確認できる場合はAgentが実施する。利用できない場合はユーザーが画面表示を確認し、Agentはその結果をevidenceへ記録する。このWeb smokeのためだけにbrowser依存を追加せず、IDE / Playwright追加Planで導入するChromiumを超えて依存を増やさない。
10. 起動したWeb processだけを停止する。
11. 8081が解放されたことを確認してから次工程へ進む。

## 7. 検証一覧

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| Phase A baseline | git / PR / main確認 | baseline main SHA / PR head SHA固定 |
| control shell | `gh --version` / auth status / codespace list | Codespaces control plane操作可 |
| stable version | installに使うofficial distribution metadata | latest non-prerelease stableを一意に確定 |
| canonical machine | Codespaces machines API | 最小有効Linux machineを記録 |
| dotfiles / Secret | 作成直前OFF / `--status` / 即復元 | dotfiles未適用、元設定へ復元 |
| Phase B Codespace | canonical machine + plain create | HEAD == baseline PR head |
| OpenCode baseline | version / auth evidence | exact version、credential-specific Secret利用証明 |
| OpenCode AGENTS | file readなしinstruction smoke | root AGENTS自動適用PASS |
| OpenCode Skill | native `skill` tool | `feature-plan` discover / load PASS |
| OpenCode permission | current upstream default | 追加permission configなし |
| Codex baseline | version / device auth / CODEX_HOME | beta device auth PASS、effective CODEX_HOME記録 |
| Codex Hook contract | `test:hooks` / `diagnose:hooks` / preflight / `/hooks` | contract・definition・trust成立 |
| Codex Hook runtime | same-session JSONL | UserPromptSubmit / PostToolUse / Stop記録 |
| Codex subagent | bounded read-only delegation | SubagentStart / SubagentStop記録、正常終了 |
| GitHub CLI | Feature / `command -v gh` / version | target devcontainerで利用可 |
| Codex MCP integration | server startup / tool discovery / required `gh api` | waiterを呼ばず実API認証PASS |
| B→C install戦略 | exact postCreate / node user方針 | sudo / install / PATH / corepack / gh提供方法を実装前に確定 |
| devcontainer Ready | `waitFor: "postCreateCommand"` | postCreate完了後にReady |
| candidate checkpoint | commit / push / SHA記録 | remote head == candidate SHA、branch freeze |
| Phase B→candidate同期 | fetch + `merge --ff-only` | Phase B Codespace HEAD == candidate SHA |
| Full Rebuild provenance | full rebuild + post-view | active devcontainerPath一致 |
| Full Rebuild auth | login status / auth source確認 | persisted sourceを考慮してzero-state確認後に認証 |
| Full Rebuild target | user / path / version / PATH / gh / CODEX_HOME | B→C戦略どおりの実測値 |
| Full Rebuild verify | `pnpm run verify` + tracked clean | PASS、tracked / index差分0 |
| Fresh Create config | machine / branch / devcontainer / `--status` | HEAD / machine / devcontainerPath一致、dotfiles未適用 |
| Fresh auth zero-state | `codex login status` +補助evidence | Codex未認証、OpenCode cacheなしから開始 |
| Fresh target contract | user / path / version / PATH / gh / CODEX_HOME | E-2 target contractと一致 |
| Fresh Git development | Git ident / remote / push dry-run | commit identityとwrite credential成立 |
| Fresh verify | `pnpm run verify` + tracked clean | PASS、tracked / index差分0 |
| OpenCode smoke | Zen provider + Section 6 | instructions / Skill / development write PASS |
| Codex smoke | Section 6 | read-only / development write PASS |
| Web | Section 6 Web smoke | heading表示、エラー画面なし、process停止、port解放 |
| validation credential cleanup | `codex logout` / login status | validation Codespace未認証化 |
| final Fresh environment | final HEADへ`merge --ff-only` | 記録系差分のみ、E-4対象変更0 |
| final Repository | `pnpm run verify` / `git diff --check` | PASS |
| final CI | canonical Fresh Codespaceからexact final HEADでwaiter1回 | `Web CI` / `Mobile App CI` success |
| cleanup | dotfiles state / logout / Codespace stop / REPORT | 外部状態を既定どおり戻す |

## 8. リスクと扱い

### OpenCode Repository instructions / Skill

- OpenCodeはroot `AGENTS.md`をproject ruleとして自動読込し、`.agents/skills/**`をnative Skillとしてdiscoverできる。
- canonical smokeではproject config discoveryを無効化する設定を使わず、global instructions /同名Skillによる偽陽性を排除する。
- `AGENTS.md`はRepository-wide規約とCodex固有規約の境界だけを最小修正し、OpenCode向けに同じ契約を別文書へ複製しない。

### Phase Bとtarget devcontainerの差

- Phase B plain Codespaceのuser / path / PATHはbaseline evidenceでありtarget contractではない。
- Phase CでpostCreateを実装するため、exact install command、target `node` userでのinstall先方針、sudo使用有無、PATH反映、GitHub CLI提供方法はPhase B→Cまでに決める。
- E-2はその実装方式を検証する場所であり、方式を初めて決める場所ではない。
- E-2で変更が必要ならcheckpoint / Phase Cへ戻りnew candidateを作る。

### OpenCode Zen authentication / config

- smoke成功だけをPersonal Secret利用の証明にしない。
- auth cacheと別credential sourceを排除し、同一操作で変えるのは`OPENCODE_API_KEY`の有無だけというcredential-specific evidenceを要求する。
- direct env credentialが使えない場合だけofficial env substitutionへ進む。
- fallback時はconfig sourceをB→C checkpointで「root `opencode.json` / 別source」の1つへ固定する。root configを採用した場合はSecret値、model、permissionを入れない。
- `/connect` auth cacheをFresh Create前提にしない。

### OpenCode permission

- OpenCodeはupstream default permissionを使用する。
- Codex Safety Harness相当のpermission / sandbox / Hook制御を今回追加しない。
- current default permissionが変更された場合はPhase Aで確認し、今回の境界に影響する変更だけPlanへ反映する。

### Secret境界

- `OPENCODE_API_KEY`はCodespace-wide environment variableであり、OpenCode以外のprocessからも参照可能である。
- 今回process単位のSecret brokerは追加しない。
- Secret値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しない。
- Personal SecretのRepository access変更で既存accessを削除しない。

### Codespaces personalization

- dotfilesはaccount-wide設定だが新規Codespace作成時に適用されるため、Run全体でOFFにしない。
- Phase B / Fresh Createそれぞれの作成直前だけ一時OFFにし、`--status`等で未適用を確認後すぐ元状態へ戻す。
- create failure / blocker / user stop時もdotfiles復元を優先する。

### machine / resource

- canonical validation machineはPhase Aで利用可能な最小Linux machineを選び、Phase B / E-3で同じmachine nameを使用する。
- locationは自動選択のままとし同等性契約外。
- 明確なresource exhaustionが最小machineだけで再現する場合に限り、次の有効machineまたは最小`hostRequirements`を検討し、Plan更新後にnew candidateから再検証する。

### Full Rebuildと認証状態

- Full Rebuildでは`/workspaces`に加えて`/tmp`も保持され得るため、Rebuild自体をzero-stateの証明にしない。
- E-2で予期せず認証済みならsymlink / alternate credential store / effective `CODEX_HOME` / `TMPDIR`等を調査する。
- Fresh Createは新規Codespace / workspace clone / create-time devcontainer selection / dotfiles未適用を含む完全新規環境の正本とする。

### Codex device-code / CODEX_HOME

- device-code authenticationはcurrent公式仕様上betaである。
- 今回はremote/headlessの正規経路として採用し、利用不能時にAPI key / auth cache copy等へfallbackしない。
- effective `CODEX_HOME`をlogin / project trust / Hook trust / smoke / subagent / `ci_wait`で同じ値にする。
- Fresh Createの未認証判定は`codex login status`を正本にし、auth file不在だけで判定しない。
- validation-only Codespaceの最終利用後は`codex logout`でcredentialを消してからstopする。

### GitHub CLI / ci_wait

- target devcontainerへofficial GitHub CLI Featureを追加し、`gh`をRuntime依存として扱う。
- `GH_TOKEN`は`GITHUB_TOKEN`より優先されるためcanonical検証processから除外する。
- Phase B / E-2 / E-3ではserver startup / tool discoveryだけでなく、`ci_wait`が使用するPR / workflow runs APIへのread-only connectivityを必須確認する。
- `wait_for_required_ci`はcanonical Fresh Codespaceをfinal HEADへfast-forwardした後、Phase Fで1回だけ呼ぶ。
- waiter / PR本文更新が完了するまでcanonical Fresh Codespaceをstopしない。

### Git開発経路

- Fresh CreateでGit author / committer identity、remote、current branchへの`git push --dry-run`を確認する。
- 実pushを検証専用に発生させない。
- Phase B Codespace / canonical Fresh Codespaceをremoteへ同期するときはGit safety契約に従う`merge --ff-only`だけを使い、reset / rebase / forceで問題を隠さない。

### Repository-wide repair

- 機能scopeとして目的外変更を追加しない。
- ただしRepository-wide quality gate / CI failureは`docs/reference/repair-loop.md`を優先し、独立した既存問題でもsafe minimal repairが要求される場合は同PRで修復する。
- repairがE-4対象ファイルならcandidateを作り直す。非環境影響なら関連verify / CIだけを再実行する。

### candidate SHA / main進行

- Phase A時点のlatest mainをbaselineとして固定する。
- candidate freeze後にmainが進んだだけではFull Rebuild / Fresh Createを再実行しない。
- branchへmain由来変更を取り込んだ場合、またはRepository契約上同期が必要な場合はcandidate変更として扱う。
- Fresh Create後に環境影響ファイルを変更した場合はnew candidateで両方やり直す。

### CodespacesとNative

- CodespacesはWeb / Repository用途。
- Android / iOSの正式検証は既存ローカル経路を維持する。

## 9. 成果物

予定成果物:

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `.devcontainer/devcontainer.json`
- `AGENTS.md` のRepository Agent適用境界を明確化する最小修正
- `README.md`
- active Run Artifact

条件付き成果物:

- root `opencode.json` または別のOpenCode auth config
  - direct env credentialが成立せず、Phase B→C checkpointでofficial env substitution fallbackが必要と確定した場合だけ
  - Secret値、model、permissionを含めない
- `hostRequirements`
  - canonical最小machineで明確なresource exhaustionが再現し、必要最小値をRepositoryで保証する必要がある場合だけ

現時点では追加しない:

- 新しいCodex project config / auth file
- `OPENAI_API_KEY` / `CODEX_API_KEY` / `CODEX_ACCESS_TOKEN` / WIF用Secret
- Docker Compose
- Native toolchain
- 新規CI workflow
- OpenCode用の追加permission / sandbox / Hook framework
- process単位のSecret broker
- Chromium以外のCodespaces用browser一式

ファイル分割は行わない。このPlanはplain Codespace、B→C checkpoint、candidate、Full Rebuild、Fresh Create、final CI、cleanupが一続きであり、分割すると同じ停止条件と確定事項が複数ファイルへ重複するため。

## 10. 公式資料

実装時にcurrent内容を再確認する。

- [GitHub Codespaces: Rebuilding the container](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace)
- [GitHub Codespaces: Persisting environment variables and temporary files](https://docs.github.com/en/codespaces/developing-in-a-codespace/persisting-environment-variables-and-temporary-files)
- [GitHub Codespaces: Personalizing with dotfiles](https://docs.github.com/en/codespaces/setting-your-user-preferences/personalizing-github-codespaces-for-your-account)
- [GitHub Codespaces: Account-specific secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)
- [GitHub Codespaces: Default environment variables](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
- [GitHub Codespaces: Machine types API](https://docs.github.com/en/rest/codespaces/machines)
- [GitHub CLI: `gh codespace create`](https://cli.github.com/manual/gh_codespace_create)
- [GitHub CLI: `gh codespace view`](https://cli.github.com/manual/gh_codespace_view)
- [Dev Containers TypeScript / Node image](https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md)
- [Dev Container Features](https://github.com/devcontainers/features)
- [OpenCode rules](https://opencode.ai/docs/ja/rules/)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [OpenCode configuration](https://dev.opencode.ai/docs/config/)
- [OpenCode CLI](https://dev.opencode.ai/docs/cli/)
- [OpenCode providers](https://opencode.ai/docs/providers/)
- [OpenCode permissions](https://dev.opencode.ai/docs/permissions/)
- [OpenCode Zen](https://opencode.ai/docs/zen/)
- [Codex authentication](https://developers.openai.com/codex/auth/)
- [Codex configuration reference](https://developers.openai.com/ja-JP/docs/config-file/config-reference)
- [Codex workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation)
- [Using Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

## 11. 実行タスク

- [ ] 1. Phase A: baseline main / PR head、Repository契約、current公式仕様を再確認する。
- [ ] 2. control shellのGitHub CLI認証 / Codespaces accessをpreflightする。
- [ ] 3. OpenCode / Codexの正規distributionからlatest non-prerelease stableとexact install sourceを固定する。
- [ ] 4. 利用可能machineからcanonical validation machineを固定する。
- [ ] 5. Personal dotfilesの元状態 / repositoryとPersonal `OPENCODE_API_KEY` accessを確認する。
- [ ] 6. dotfilesを作成直前だけOFFにし、canonical machine + `--status`でplain Codespaceを作成後、未適用確認と即時復元を行う。
- [ ] 7. OpenCode exact install、baseline provenance、credential-specificなPersonal Secret利用を検証する。
- [ ] 8. OpenCodeのroot `AGENTS.md`自動適用、native `feature-plan` Skill discovery、development smokeを検証する。
- [ ] 9. Codex exact install、baseline provenance、effective `CODEX_HOME`、beta device-code authenticationを検証する。
- [ ] 10. Codex `test:hooks` / trust / preflight / same-session Hook runtime / bounded subagentを同じ`CODEX_HOME`で検証する。
- [ ] 11. `GH_TOKEN`を除外し、`ci_wait` server / tool discoveryと必須GitHub API read-only connectivityを検証する。wait toolは呼ばない。
- [ ] 12. Phase B→C checkpointへOpenCode auth config source、target node install戦略、GitHub CLI Feature、CODEX_HOME、postCreate、smoke契約を固定する。
- [ ] 13. `.devcontainer/devcontainer.json`、`AGENTS.md`の最小修正、条件付きOpenCode auth configを実装する。
- [ ] 14. READMEを通常利用者向け情報と正本リンクに絞って更新する。
- [ ] 15. candidate作成前に`pnpm run verify` / `git diff --check` / scope / repair-loop確認を行う。
- [ ] 16. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [ ] 17. Phase B Codespaceをclean確認後に`fetch` + `merge --ff-only`でcandidate SHAへ同期する。
- [ ] 18. control shellからFull Rebuildし、active devcontainerPath / canonical machineを確認する。
- [ ] 19. Full Rebuild内で認証zero-state、target CLI / gh / CODEX_HOME、OpenCode / Codex integration、required GitHub API、`pnpm run verify`、Web smoke、tracked cleanを確認する。
- [ ] 20. Full Rebuild Codespaceで`codex logout` /未認証確認後にstopする。
- [ ] 21. remote head == candidate SHAを確認し、dotfiles一時OFF、canonical machine、explicit devcontainer、`--status`でFresh Codespaceを作成して即時dotfiles復元する。
- [ ] 22. Fresh CreateでHEAD / machine / devcontainerPath / dotfiles未適用 / Codex login status zero-state / target contractを確認する。
- [ ] 23. Fresh CreateでOpenCode Repository integration、Codex integration、required GitHub API、Git identity / remote / push dry-run、`pnpm run verify`、Web smoke、tracked cleanを確認する。
- [ ] 24. Fresh Create後に環境影響repair /変更が出た場合はnew candidateを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 25. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 26. final working treeで`pnpm run verify` / `git diff --check`を再実行し、failureはrepair-loopへ従う。
- [ ] 27. tracked Run Artifact / Planを最終状態へ更新して通常commit / pushする。
- [ ] 28. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 29. canonical Fresh Codespaceを`merge --ff-only`でfinal HEADへ同期し、同じeffective `CODEX_HOME`とCodespaces`GITHUB_TOKEN`で`wait_for_required_ci`を1回実行する。
- [ ] 30. `Web CI` / `Mobile App CI` success後にPR本文を更新する。failureはimplementation harness / repair-loopへ従う。
- [ ] 31. canonical Fresh Codespaceで`codex logout` /未認証確認後にstopし、不要Codespaceをdelete候補としてREPORTへ記録する。
- [ ] 32. Personal dotfiles設定がPhase Aの元状態と一致することを最終確認する。

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressでは、上記checkbox総数にCI確認1件を加算する。
- Task 29でfinal exact HEADに対する`wait_for_required_ci`を1回だけ呼ぶ。Agent自身のpollingへfallbackしない。
- Task 30で`Web CI` / `Mobile App CI`のsuccessとPR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- CI failureでsafe minimal repairを行いnew final HEADをpushした場合は、その新exact HEADに対してのみwaiterを1回実行する。
- waiter利用不能時はBlockerとし、終了時cleanup契約を実行してから報告する。
- CI結果記録だけを理由にこのfileを再commitしない。
