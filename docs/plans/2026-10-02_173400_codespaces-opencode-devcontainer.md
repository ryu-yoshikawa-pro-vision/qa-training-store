# GitHub Codespaces + OpenCode / Codex CLI 開発環境導入計画

## 0. 依頼概要

GitHub Codespaces 上で `qa-training-store` を開発できる環境を導入する。OpenCode は OpenCode Zenを利用し、本RunではOpenCode Zen公式catalogでFreeと確認したmodelのみを使用する。paid modelは呼び出さない。現在のPhase B smoke modelは`muse-spark-1.3-contributor-free`であり、model IDはRepository / devcontainer設定へ固定しない。Codex CLI は ChatGPT アカウントで認証して ChatGPT プランの Codex 利用枠を使用する。

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
8. canonical OpenCode smokeは公式catalogでFreeと確認したOpenCode Zen modelを使い、`OPENCODE_API_KEY`をprocess環境から除外して成功することを確認する。Personal Secretの受理は本Runの成功条件に含めず、受理したと主張しない。
9. paid modelを呼び出さない。model IDをRepository / devcontainer設定に固定せず、smoke前に公式catalog上のFree分類を確認する。分類が変わっていた場合は呼び出し前に別のFree modelを選ぶ。
10. OpenCodeはRepository rootから起動した新規sessionでroot `AGENTS.md`をproject ruleとして自動適用し、`.agents/skills/feature-plan/SKILL.md`をnative `skill` toolからdiscover / loadできることをPhase B / E-2 / E-3で確認する。
11. root `AGENTS.md`はRepository-wide規約をOpenCodeにも適用できるよう最小修正し、Codex固有のHook / wrapper / native delegation / `ci_wait`等はCodexだけに適用される境界を明示する。
12. OpenCodeはupstream default permissionで利用し、Codex Safety Harness相当のpermission / sandbox / Hook制御は今回の対象外とする。
13. model能力不足とenvironment / integration failureの分類規則を固定し、能力不足へ再分類する場合は環境/configを変えず、公式catalogでFreeと確認した別のtool対応Zen modelだけで同一smokeを1回再実行する。paid modelは代替にしない。
14. Codex CLIはbetaのdevice-code authenticationを今回のremote/headless正規経路とし、Phase Bで利用可能性を確定する。利用不能時にAPI key / access token / auth cache copy等の公式fallbackへ進まないのは今回の意図的なscope境界とする。
15. effective `CODEX_HOME` のset / unsetと解決後pathを記録し、login、project trust、Hook trust、smoke、subagent、`ci_wait`で同じ`CODEX_HOME`を使う。
16. Codexは既存`.codex/config.toml`、project trust、Hook trust、`test:hooks`、`diagnose:hooks`、Linux `codex-safe.sh`、same-session Hook runtime、bounded subagent、`ci_wait` MCPをCodespaces上で確認する。
17. target devcontainerはGitHub CLIを提供し、`command -v gh` / `gh --version`が成功する。Phase B / E-2 / E-3では`GH_TOKEN`を対象processから除外し、Codespaces標準`GITHUB_TOKEN`で`ci_wait`が実際に使用するPR / workflow runs APIへread-only接続できることを確認する。
18. Phase B / Full Rebuild / Fresh Createでは`ci_wait` server startupと`wait_for_required_ci` tool discoveryまでをintegration evidenceとし、tool自体は呼ばない。
19. `.devcontainer/devcontainer.json`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`、`remoteUser: "node"`、`ghcr.io/devcontainers/features/github-cli:1`、`ghcr.io/devcontainers/features/desktop-lite:1`、`waitFor: "postCreateCommand"`、`forwardPorts: [8081, 6080]`を持つ。VS Code拡張とPlaywright Chromiumの追加要件はIDE / Playwright追加Planに従う。
20. `postCreateCommand`はworkspace rootから逐次・fail-fastで、dependency install → Playwright Chromium + Linux dependencies → OpenCode exact install → Codex exact installを実行する。postCreate完了前をReady扱いしない。
21. candidate SHA確定後からFull Rebuild / Fresh Createのevidence取得完了までbranchへpushしない。両方を同じcandidate SHAで検証する。
22. Phase B plain CodespaceはPhase A / Bのbaseline evidenceとして保持し、candidateへfast-forwardせず、canonical Fresh Create / Full Rebuild validationには使用しない。plain Codespaceからcandidate devcontainerへ切り替えるmigrationはRequired DoDではない。
23. candidate branchから新しいCodespaceを作り、`--devcontainer-path .devcontainer/devcontainer.json`を明示する。Fresh Createでrepository / branch / candidate SHA / canonical machine / exact `devcontainerPath`とtarget Runtimeを確認する。Creation Logはtarget Runtimeだけでは失敗箇所を判定できない場合の補足診断であり、Runtimeがtarget contractを満たせば追加取得しない。fail-fastの`postCreateCommand`では最後のCodex installまで到達していることをexact versionの実測から推定できるため、これはRunへ推論として記録する。
24. Fresh Createでtarget contractを確認した同一Codespaceについて、tracked worktree / index clean、environment-affecting untracked fileなし、HEAD == candidate SHAをFull Rebuild直前に確認し、`gh codespace rebuild --full`を一度実行する。Rebuild後はcanonical machineとtarget Runtimeを確認する。Creation LogはRuntime失敗の最初の原因を識別する必要がある場合に取得する。Full Rebuild後の空`devcontainerPath`だけをFAILにしない。
25. Fresh CreateとFull Rebuildの両方で必要なtarget CLI / authentication / integration / `pnpm run verify` / Web / tracked-clean validationを行い、同じcandidate SHAのdevcontainer再現性を確認する。
26. Fresh CreateはPersonal dotfilesが元々OFFなら変更せず、ONなら作成直前だけ一時OFFにする。canonical machine、candidate branch、`.devcontainer/devcontainer.json`、`--status`を明示し、作成・dotfiles未適用確認後は直ちに元設定へ戻す。
27. Fresh CreateのCodex未認証判定は`codex login status`を正本とし、`auth.json`不在と代替認証env不在は補助evidenceとする。
28. Fresh Createでもtarget CLI contract、effective `CODEX_HOME`、OpenCode / Codex integration、Git identity / remote / `git push --dry-run`、`pnpm run verify`、Web Runtimeを成功させ、検証終了時にtracked / index差分0と`git diff --check`を確認する。
29. Web smokeでは手動のport追加を行わず、`.devcontainer/devcontainer.json`の`forwardPorts: [8081, 6080]`を確認したうえで、`gh codespace ports`の8081 browse URL / visibilityを確認する。forwarded URLではStorefront heading「決定的なシナリオで、確かなテストを。」を確認し、GitHub / Expo / Reactのエラー画面ならFAILとする。確認後はWeb processを停止し8081を解放する。6080の検証はIDE / Playwright追加Planに従う。
30. validation-only CodespaceでCodex認証を行った場合、最終利用後に`codex logout` → `codex login status`で未認証を確認してからstopする。canonical Fresh Codespaceはfinal CI / PR本文更新後までrunning状態を維持する。
31. Personal dotfilesの一時変更中にsuccess / failure / blocker / user stopへ至った場合は、次工程へ進む前に元状態へ復元する。Phase B plain Codespaceはbaseline evidenceを記録して不要になった時点でstopする。Codespaceは削除しない。
32. cleanup自体を実行できない場合は、その未復元 / 未停止 / 未logout状態をBlockerとしてREPORTとユーザー報告へ明記する。
33. Fresh Create後に環境影響ファイルを変更した場合は新candidate SHAでFull Rebuild / Fresh Createを両方やり直す。Plan / Run Artifact / PR本文だけの記録更新は再実行理由にしない。
34. Repository-wide quality gate / CI failureは`docs/reference/repair-loop.md`へ従う。独立した既存問題でもsafe minimal repairがRepository契約上必要なら同PRで修復する。修復がE-4対象ファイルならcandidateを作り直し、非環境影響なら関連verify / CIを再実行する。
35. Phase A時点のlatest mainをbaselineとして固定する。candidate freeze後にmainが進んだだけでは再検証しない。main由来変更をbranchへ取り込んだ場合、またはRepository契約上同期が必要になった場合はcandidate変更として再検証する。
36. final working treeで`pnpm run verify`と`git diff --check`が成功する。
37. canonical Fresh Codespaceをfinal push → exact HEADの`wait_for_required_ci` success → PR本文更新までrunning状態で維持する。final push後はそのCodespaceを`--ff-only`でfinal HEADへ同期し、candidate→final差分が記録系のみであることを確認する。
38. final exact HEADに対してRepository既存の`wait_for_required_ci`を1回だけ呼び、`Web CI` / `Mobile App CI`がsuccessする。Agent自身でCI pollingしない。
39. final CIとPR本文更新後にcanonical Fresh CodespaceのCodex credential cleanupとstopを行う。不要Codespaceはdelete候補としてREPORTへ記録し、deleteはユーザー判断とする。
40. Native経路、Security fallback、application source、test、workflowへ機能scopeとして目的外の変更を追加しない。ただしSection 34のRepository-wide repair契約は例外とする。
41. 実測で今回の目的達成に必須と判明した最小変更はcanonical Planを更新して同じPR #188で対応する。

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

- 本RunのOpenCode smokeでは、既存疎通に使用した`muse-spark-1.3-contributor-free`を使い、各呼び出し前に公式catalogでFree分類を確認する。別modelへ切り替える場合もFreeに限定し、paid modelを呼び出さない。model IDはRepository設定へ固定しない。
- root `opencode.json` やdevcontainer環境変数でmodelを固定しない。
- `model` / `small_model`、provider whitelist、`enabled_providers`、Model access、fail-closed launcher等を今回の目的のために追加しない。
- OpenCode CLI自体は再現性のためstable exact versionを固定し、自動更新を無効化する。
- Free modelのOpenCode Zen呼び出しはAPI keyなしで再現する。OpenCode smoke processでは`OPENCODE_API_KEY`をunsetし、`/connect`やcredential保存を行わない。
- Free-only利用のためOpenCode authentication config / env substitutionは追加しない。keyless呼び出しが成立しない場合はpaid modelやcredential保存へfallbackせず停止する。
- root `AGENTS.md`はOpenCodeのproject ruleとして自動適用される。Repository-wide規約をOpenCodeにも適用し、Codex固有のHook / wrapper / native delegation / `ci_wait`等だけをCodex専用として区別する。
- `.agents/skills/**`はOpenCodeのnative Agent Skills discovery対象とする。代表として`feature-plan`をnative `skill` toolでloadできることを確認する。
- OpenCodeは今回upstream default permissionで利用する。Codex Safety Harness相当のpermission / sandbox / Hook制御をOpenCodeへ追加することは今回の対象外とする。
- model選択に依存しないRepository instructions / Skill discovery / bounded development smokeで、このRepositoryの開発エージェントとして利用できることを確認する。
- smoke前にOpenCode Zen公式catalog上で使用modelがFreeであることを確認する。paid modelの呼び出しやusage監査は行わない。

#### Free-only model decision (2026-10-04 JST)

- ユーザー方針により、本RunのOpenCode利用をFree modelに限定する。model選択はTask停止条件にせず、Agentは公式catalogでFreeと確認できるmodelを使う。
- 現在のPhase B modelは`muse-spark-1.3-contributor-free`。同一modelがFreeとして掲載され続ける限りsmokeに使用し、利用前に分類を再確認する。Freeでなくなった場合は別のFree modelへ切り替え、Free modelが確認できない場合だけ呼び出しを停止する。
- Personal `OPENCODE_API_KEY`の受理証明はこのFree-only契約のDoD外とする。既存Codespaces Secretは変更せず、OpenCode smoke processからkeyを除外してkeyless利用を証明する。

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

- Free-onlyのOpenCode利用に`OPENCODE_API_KEY`は不要であり、Personal Codespaces Secretの作成 / 変更 / Repository access変更を行わない。
- 既存Secretはユーザー設定のまま維持する。Codespacesからenvironment variableとして注入される場合も、canonical OpenCode smoke processでは`OPENCODE_API_KEY`をunsetする。
- `devcontainer.json`で`OPENCODE_API_KEY`をrecommended secretとして宣言せず、OpenCode authentication configにも接続しない。
- 今回はprocess単位のSecret broker / isolationを追加しない。利用可能なcredential値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しないことを境界とする。
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
2. OpenCode Zen Free modelのkeyless invocation exact commandと、実行前の公式catalog Free確認方法。
3. OpenCode authentication configを作らず、`OPENCODE_API_KEY`をsmoke processから除外する方法。
4. OpenCode Repository instructions自動適用 / native Skill discovery / development smokeのexact command / prompt / expected result。
5. Codex package spec、exact version、binary name。
6. Codex device-code authenticationがbetaであることを前提にしたexact手順と`codex login status`の期待結果。
7. effective `CODEX_HOME` のset / unsetと解決後path、およびlogin / trust / smoke / subagent / `ci_wait`で同じ値を使う手順。
8. Codex Hook runtime / bounded subagent evidenceのsession ID / JSONL確認方法。
9. `ci_wait` server startup / tool discoveryと、同じtoken条件で必須確認するGitHub API endpoint。
10. Dev Container image tag `5-24-bookworm` の利用可否。
11. GitHub CLI Feature `ghcr.io/devcontainers/features/github-cli:1` の利用可否。
12. target `node` userで使用するOpenCode exact install command、install先の方針、PATH反映、sudo使用有無。
13. target `node` userで使用するCodex exact install command、install先の方針、PATH反映、sudo使用有無。
14. `corepack enable`と`postCreateCommand`のexact command / 実行順 / fail-fast条件。
15. Phase Aで決めたcanonical machine name。

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

OpenCode model IDはRepository設定に固定しない。本Runの実行では公式catalogでFreeと確認したmodelだけを使用し、paid modelは呼び出さない。

### 終了時cleanup契約

- dotfilesは各新規Codespace作成のため一時OFFにした直後、作成・未適用確認が終わり次第元状態へ戻す。create failure / blocker / user stopで通常手順を抜ける場合も、次工程へ進む前に元状態へ復元する。
- validation-only CodespaceでCodexへloginした場合、最終利用後に`codex logout` → `codex login status`で未認証を確認してからstopする。
- Phase B plain CodespaceはFresh Create成功とbaseline evidence記録後、不要になった時点でstopする。これはcandidate validation対象ではない。
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
  - `forwardPorts: [8081, 6080]`
- `AGENTS.md`
  - title / introductionをRepository Agent向けに最小修正
  - Repository-wide規約がOpenCodeにも適用されることを明示
  - Codex固有のHook / wrapper / native delegation / `ci_wait`等はCodex専用と明示
  - 既存の詳細契約や正本参照を重複コピーしない
- `README.md`
  - Codespaceを通常利用するための作成手順
  - OpenCode Zen Free modelの選び方とupstream default permission。Free-only利用にAPI key setupは不要
  - Codex device-code authenticationがbetaであることとlogin / logout
  - version確認、Web 8081、Native対象外
  - canonical validationの詳細はPlan /既存referenceへのリンクに留める
- canonical Plan / active Run Artifact

### 条件付きで変更するもの

- OpenCode auth configはFree-only利用では追加しない。Free modelのkeyless invocationが成立しない場合はfallback configを追加せず停止する。
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
15. dotfiles設定変更、ChatGPT側device-code有効化、one-time code入力、Agentがbrowserを利用できない場合のforwarded URL表示確認はユーザー操作とする。Free-only OpenCode利用のためのPersonal Secret設定は求めない。
16. Codespace create / rebuild / stop操作は対象Codespace外のcontrol shellまたはGitHub UIから行い、環境内検証は対象Codespace内で行う。
17. active RunはこのPRの実装scopeを継続する。

#### Phase A stable version baseline (2026-10-03 JST)

- OpenCode: `@opencode/cli@2.0.22`。現行の[公式V2 install docs](https://opencode.ai/v2/docs/)が`@opencode/cli`を案内し、npm `dist-tags.latest` / `version` は`2.0.22`。exact install commandは`npm install --global @opencode/cli@2.0.22`。
- OpenCode distribution差: 非versionedのV1 docs / latest GitHub releaseは別packageの`opencode-ai@1.18.34`を示す。今回はV2 docsで指定されたpackageのlatest distributionを採用する。beta docsの`@opencode-ai/cli@next`は別package / channelなので採用しない。
- Codex: `@openai/codex@0.160.0`。npm `dist-tags.latest` / `version` は`0.160.0`。exact install commandは`npm install --global @openai/codex@0.160.0`。
- 上記はinstall versionの基準であり、Phase Bでinstall、実行version、Free modelのkeyless動作、AGENTS / Skill smokeを検証する。

### Phase B: dotfilesなし plain Codespace で事前検証

#### B-0: baseline Codespace

1. Free-only利用にPersonal Secretの確認 / 作成 / 変更は不要。既存設定も変更しない。
2. Phase Aで記録したdotfiles設定がONなら、Phase B Codespace作成直前だけ一時的にOFFにする。元状態がOFFなら変更しない。
3. canonical machine nameを使い、control shellから`gh codespace create -R ryu-yoshikawa-pro-vision/qa-training-store -b plan/codespaces-opencode-devcontainer -m <canonical-machine-name> --status`でplain Codespaceを作成する。`.devcontainer/devcontainer.json`はまだ存在しないため`--devcontainer-path`は指定しない。
4. create commandが失敗した場合も、dotfilesを変更していたなら次工程へ進む前に元状態へ復元する。
5. 作成したCodespace名と`gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName,location`をevidenceへ記録し、machineName == canonical machine nameを確認する。
6. `--status`出力をprimary evidenceとし、必要な場合だけ`/workspaces/.codespaces/.persistedshare/dotfiles`とcreation logを補助evidenceとして確認してdotfiles未適用を確定する。
7. dotfiles未適用を確認した直後に、Phase Aで記録した元のdotfiles設定へ復元する。元々OFFなら変更しない。
8. Codespace内で`git rev-parse HEAD` == baseline PR head SHAを確認する。不一致ならPhase Bを開始しない。
9. `node --version`、`corepack --version`、`git --version`、`gh --version`、`whoami`、`id -u`、`command -v node`、`command -v gh`をbaseline evidenceとして記録する。
10. plain Codespaceに`gh`が存在しない場合は、Phase Bの`ci_wait`検証に必要な一時prerequisiteとしてcurrent official GitHub CLI install経路で導入し、その事実をbaseline evidenceへ記録する。target devcontainerの提供方法には流用しない。
11. `corepack enable` → `pnpm install --frozen-lockfile` を実行する。

#### B-1: OpenCode

1. Phase Aで確定したOpenCode exact versionをexact-version install command候補でinstallする。V2 npm packageはpostinstallでplatform native binaryを選択する。npmがlifecycle scriptを保留した場合はpackage scriptを確認し、Phase Bでは対象packageだけ一時許可してnative binaryを選択させる。全package scriptを一括許可しない。
2. `opencode --version` がPhase A確定versionと一致することを確認する。
3. plain Codespace上の`command -v opencode`、install path、user、sudo要否、PATH、Fresh shell解決をbaseline evidenceとして記録する。target devcontainerの期待値にはしない。
4. `OPENCODE_DISABLE_AUTOUPDATE=true`を設定し、起動前後でversionが変わらないことを確認する。
5. 実行前にOpenCode Zen公式catalogで`muse-spark-1.3-contributor-free`がFreeと掲載されていることを確認する。paid modelは呼び出さない。
6. persisted credentialがないことを確認する。現在のexact `@opencode/cli@2.0.22` Runtimeで確認したdefault storeは`~/.local/share/opencode/opencode.db`である。`OPENCODE_DB` overrideはunset、legacy `~/.local/share/opencode/auth.json`もabsentであることを確認する。raw database / credential exportは読まず、databaseが存在する場合はexact-versionのsecret-safe statusがsaved credentialの有無を明確に区別できる場合だけ使う。区別できない場合はzero-stateと判定せず停止する。
7. Repository / project configに別のZen credential sourceがないことを確認する。Secret値は探索・出力しない。
8. credential-specific Personal Secret acceptanceは本Runのsuccess criterionではない。過去の同一操作でSecretあり / なしがともに成功した結果を、Secret利用の証拠へ読み替えない。
9. auth store・alternate credential sourceなしの状態で、同一model・同一commandを`OPENCODE_API_KEY`なしで実行し、Free modelの応答が得られることを確認する。実行環境にSecretが存在してもOpenCode processへ渡さない。
10. keyless invocationが認証errorとなる場合は停止し、`/connect` / auth config / paid modelへfallbackしない。
11. Free-only利用ではOpenCode auth config / env substitutionを作成せず、config sourceは「なし」に固定する。
12. V2 `/connect`でcredentialを保存しない。
13. canonical OpenCode smokeは公式catalogでFreeと確認したOpenCode Zen modelを用いる。現行Runでは既存疎通modelを使い、model IDはRepository / devcontainer設定へ固定しない。
14. `OPENCODE_DISABLE_PROJECT_CONFIG`がcanonical sessionで有効になっていないことを確認する。
15. `~/.config/opencode/AGENTS.md`、`~/.claude/CLAUDE.md`、global `.agents/skills/feature-plan`等、Repository instructions / representative Skill smokeを曖昧にするglobal sourceがないことを確認する。存在する場合は内容を読んで同一契約の由来を曖昧にしない方法を確定するまでsmokeを実行しない。
16. Section 6のOpenCode Repository instructions自動適用smoke、native Skill discovery smoke、development write smokeを実行する。

OpenCode停止条件:

- exact versionをinstallできない、またはversionが一致しない。
- Free modelが`OPENCODE_API_KEY`なしで応答しない。
- 利用可能なFree modelを公式catalogで確認できない。
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
- Freeと公式確認したOpenCode Zen modelを`OPENCODE_API_KEY`なしで使うexact commandと実行結果。
- OpenCode auth config sourceは「なし」に固定し、Free-onlyのkeyless動作をFull Rebuild / Fresh Createで再現する。
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

OpenCode model IDはRepository設定に固定しない。本Runの実行では公式catalogでFreeと確認したmodelだけを使用し、paid modelは呼び出さない。このcheckpointが未更新のままPhase Cへ進まない。

#### Phase B→C確定値（2026-10-05）

- OpenCode distributionは`@opencode/cli@2.0.22`、binaryは`opencode`。install commandは`npm install --global @opencode/cli@2.0.22`。公式V2 docsはnpm packageとnative binaryを選ぶpostinstallを案内する（[OpenCode V2 installation](https://opencode.ai/v2/docs)）。
- Codex distributionは`@openai/codex@0.160.0`、binaryは`codex`。install commandは`npm install --global @openai/codex@0.160.0`（[OpenAI Codex CLI](https://github.com/openai/codex)）。
- OpenCode auth config sourceは「なし」。Free-only実行では`/connect`、auth config、Secret、`OPENCODE_API_KEY`を使わない。公式Zen catalogでFreeと確認したmodel IDを実行時に選び、Repository / devcontainerへ固定しない。Phase B attempt-5では`opencode/muse-spark-1.3-contributor-free`を使用した。
- OpenCode smoke command shapeは`/usr/bin/env -i HOME="$HOME" PATH="$PATH" LANG=C.UTF-8 OPENCODE_DISABLE_AUTOUPDATE=true opencode run --format json --model <runtime-selected-free-zen-model-id> "$prompt"`。OpenCode JSON stdout / stderrは別々にcaptureし、どちらもmodel artifactへredirectしない。`OPENCODE_API_KEY`はprocess environmentへ渡さない。raw event streamはRun Artifactへコピーしない。
- attempt-5はexit 0、JSON event 13件、non-JSON 0件、stderr 0件、tool event 4件（`read=2`、`write=1`、`shell=1`）、tool error 0件。新規ignored `attempt-5.txt`をshell検証し、tracked / indexはcleanだった。attempt-4の原因はevent streamとmodel artifactの同一fileへのredirectで、permission rejectやFree modelのtext-only応答ではなかった。
- OpenCode v2.0.22 default databaseは`~/.local/share/opencode/opencode.db`。`OPENCODE_DB` overrideはunset、legacy `~/.local/share/opencode/auth.json`はabsent、safe database分類ではcredential / account rowは0件。Full Rebuild / Fresh Createでもcredential-free状態を確認する。
- Codex device-code loginは`codex login --device-auth`を使用し、認証確認の正本は`codex login status`。Task 19/20のeffective `CODEX_HOME`は未設定時の`<USER_HOME>/.codex`。targetでは`CODEX_HOME`を設定せず、login / trust / smoke / subagent / `ci_wait`全工程でdefault `<USER_HOME>/.codex`を使う。
- Task 20の同一App Server threadでread-only / development smoke / bounded read-only subagentがPASSした。詳しいsession IDとHook event countsはactive Run REPORTを参照する。`ci_wait` MCP serverはconnectedで`wait_for_required_ci`をdiscoverした。Phase Bではwait toolを呼び出さない。Codex / `ci_wait` processでは`GH_TOKEN`を除外し、Codespaces標準`GITHUB_TOKEN`を使う。PR #188、`ci.yml` / `native-ci.yml` runsと取得したworkflow run detailへのread-only GETは成功した。
- Target image `mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`は公式image tagとして利用可能で、non-root `node` userとsudo accessを備える。`ghcr.io/devcontainers/features/github-cli:1`はDebian / Ubuntu系をサポートする。出典: [TypeScript Node image](https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md)、[GitHub CLI Feature](https://github.com/devcontainers/features/tree/main/src/github-cli)。
- `postCreateCommand`はworkspace rootで次を順番にfail-fast実行し、完了を`waitFor: "postCreateCommand"`で待つ。実行userは`node`。`corepack enable`のshim作成とglobal npm package installは`/usr/local`へのsystem-wide writeとなるため、その3 commandだけを`sudo`で実行する。Repository dependency installとPlaywright install commandは`node`のまま実行する。
  1. `sudo corepack enable`
  2. `pnpm install --frozen-lockfile`
  3. `pnpm exec playwright install --with-deps chromium`
  4. `sudo npm install --global @opencode/cli@2.0.22`
  5. `sudo npm install --global @openai/codex@0.160.0`
- Dev Containerのcommand文字列は`bash -lc 'set -e; sudo corepack enable; pnpm install --frozen-lockfile; pnpm exec playwright install --with-deps chromium; sudo npm install --global @opencode/cli@2.0.22; sudo npm install --global @openai/codex@0.160.0'`とする。E-2で`npm prefix -g`、binary path、fresh-shell PATH解決を実測する。Phase B plain Codespaceのuser / path / PATHはtarget contractへ昇格させない。
- 公式command根拠: [Node Corepack](https://nodejs.org/api/corepack.html)は`corepack enable`によるpackage manager shim作成を説明し、[Playwright browser installation](https://playwright.dev/docs/browsers)は`playwright install --with-deps chromium`を案内する。
- GitHub Codespacesのforwarded portsは既定でprivate。devcontainerではvisibilityを変更せず、E-2 / E-3で6080がprivateであることを確認する（[Forwarding ports in your codespace](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)、[Codespaces security](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces)）。

### Phase C: `.devcontainer/devcontainer.json` / `AGENTS.md` 実装

#### `.devcontainer/devcontainer.json`

1. `image`は`mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm`。
2. `remoteUser`は`node`。
3. `features`へ`ghcr.io/devcontainers/features/github-cli:1`と`ghcr.io/devcontainers/features/desktop-lite:1`を追加し、target devcontainer自身でGitHub CLIとGUI基盤を保証する。`customizations.vscode.extensions`には`OpenAI.chatgpt`、`sst-dev.opencode`、`ms-playwright.playwright`を追加する。
4. `waitFor`は`postCreateCommand`。postCreate完了前をReady扱いしない。
5. `containerEnv`またはcurrent Dev Container specで同等のcontainer-wide設定として`OPENCODE_DISABLE_AUTOUPDATE=true`を入れる。
6. `postCreateCommand`はPhase B→C checkpointで確定したexact command / sudo方針 / PATH反映をそのまま使い、workspace rootで逐次・fail-fastに実行する。実装時にinstall方式を選び直さない。
7. Free-only利用では`secrets`に`OPENCODE_API_KEY`を宣言せず、OpenCode auth configにも接続しない。
8. `forwardPorts`は`[8081, 6080]`。5901はforwardしない。6080はprivate visibilityを維持する。
9. OpenCodeのmodel IDは固定しない。model-specific config、provider whitelist、model制御launcherは追加しない。Smokeは公式catalogでFreeと確認したmodelに限定する。
10. OpenCode permissionはupstream defaultを使用する。Codex Safety Harness相当のpermission / sandbox / Hook設定をOpenCodeへ追加しない。
11. OpenCode Free modelのsmoke processからは`OPENCODE_API_KEY`をunsetし、Free modelのkeyless invocationを確認する。
12. Free-only利用にOpenCode auth config / env substitutionは追加しない。keyless invocationが成立しない場合は実装へ進まず停止する。
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

1. Codespaceの作成入口と、OpenCode Zen Free modelを選択する手順。Free-only利用にPersonal Secret設定は不要であること。
2. Free modelの利用確認。Paid modelは今回の利用条件外とする。
3. 既存Codespaces Secretが別用途で存在しても本Planでは変更せず、OpenCode smoke processから`OPENCODE_API_KEY`を除外すること。値を出力・保存しないこと。
4. process単位のSecret分離は行わず、利用可能なcredential値を出力・保存しないこと。
5. `node --version` / `pnpm --version` / `gh --version` / `opencode --version` / `codex --version` の確認。
6. OpenCode smokeは公式catalogでFreeと確認したZen modelを使い、paid modelを呼び出さないこと。model IDはRepository / devcontainerへ固定しない。
7. OpenCodeはRepository root `AGENTS.md`と`.agents/skills/**`を利用し、permissionはupstream defaultであること。
8. OpenCode Free modelは`OPENCODE_API_KEY`なしで利用し、auth config / `/connect` credential保存を使わないこと。
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
4. candidate SHA確定後からE-3 Fresh CreateとE-2 Full Rebuildのevidence取得完了までbranchへ追加pushしない。
5. candidate freeze後にmainが進んだだけではcandidateを更新しない。main由来変更をbranchへ実際に取り込んだ場合、またはRepository契約上同期が必要になった場合だけ新candidateとして扱う。
6. Phase Bで作成したplain Codespaceはcandidateへ同期せず、E-2 / E-3のcanonical devcontainer validationから除外する。既存plain container再利用時の起動failureはFresh Create failureと混同しない。
7. E-3でcandidateから新しいCodespaceを作成し、target Runtime contractがPASSした同一CodespaceをE-2 Full Rebuild対象として使う。
8. E-2 Full RebuildとE-3 Fresh Createが完了するまでcandidate SHAを維持し、environment-affecting fileを変更した場合のみE-4に従ってnew candidateを作る。

#### E-2: candidate SHAのFull Rebuild

Full RebuildはE-3でcandidate branchから新規作成し、target contractを確認した同じCodespaceに対して行う。plain Phase B Codespaceからcandidate devcontainerへ移行できることはこのPRのDoDに含めない。GitHub Codespacesでは`/workspaces`に加えて`/tmp`もFull Rebuildをまたいで残り得るため、「Full Rebuildしたから無条件に認証zero-state」とは判定しない。

`gh codespace view`は`devcontainerPath`をCodespace metadataとして返し、E-3 Fresh Createでは`gh codespace create --devcontainer-path`でconfiguration pathを明示する。Fresh Createではexact path一致を必須とする。同じCodespaceのE-2 Full Rebuildはcanonical machineとtarget RuntimeをPASS根拠とし、empty `devcontainerPath`単独ではFAILにしない。Creation Logはtarget Runtimeだけでは最初のfailure stageを識別できない場合の補足診断であり、Runtime PASS時に必須取得しない（[GitHub CLI `codespace create`](https://cli.github.com/manual/gh_codespace_create)、[GitHub CLI `codespace view`](https://cli.github.com/manual/gh_codespace_view)、[GitHub REST Codespaces API](https://docs.github.com/en/rest/codespaces/codespaces?apiVersion=2026-03-10)）。

1. E-3 Fresh Createでtarget contractがPASSした同じcandidate-created Codespace名を対象として確定し、Run Artifactへ記録する。Phase B plain Codespaceは対象にしない。
2. 対象Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。
3. tracked working tree / indexがcleanであることを確認する。
4. `.devcontainer/**`、OpenCode authentication / install helper、Codespaces helper、`.codex/**`、`AGENTS.md`、`package.json` / lockfile、install / setup scriptにcandidate SHAと異なる未commit差分がないことを確認する。
5. candidateに含まれない環境影響untracked fileがある場合はRebuildを開始せずE-0へ戻る。
6. control shellから`gh codespace rebuild --full -c <codespace-name>`を実行する。通常Rebuildは代替にしない。
7. Rebuild後、control shellから`gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName`を確認し、machineNameがcanonical machine nameであることをevidence化する。`devcontainerPath`は返却値を記録するが、空値単独ではFAILにしない。target Runtimeへの接続とB→C checkpoint契約の実測値をE-2 PASSの根拠とする。target Runtime failureの原因特定が必要な場合だけCreation Logで`.devcontainer/devcontainer.json`の使用、target container、最初のfailed stepを確認する。
8. Run Artifactへexact command、Codespace名、candidate SHA、返却された`devcontainerPath`（空値を含む）、machineName、target Runtime結果を記録する。Creation Logを診断に使用した場合のみ、その安全な分類も記録する。raw全文・Secret値・credential値は表示・保存しない。
9. postCreate完了後に環境をReady扱いする。
10. `whoami == node`、`id -u != 0`を確認する。
11. Node 24 / pnpm 10.34.5 / OpenCode exact / Codex exact、`gh --version`を確認する。
12. target container上で`command -v opencode` / `command -v codex` / `command -v gh`、実install path、effective PATH、sudo方針、`corepack enable`、Fresh shellでのbinary解決を記録し、Phase B→Cで確定したinstall戦略どおりであることを確認する。
13. effective `CODEX_HOME`を記録し、Phase B→C契約と一致することを確認する。
14. install戦略、GitHub CLI提供方法、`CODEX_HOME`契約の変更が必要なら、その場で修正せずPhase B→C checkpoint / Phase Cを更新して新candidateを作る。
15. OpenCodeはV2 database / `OPENCODE_DB` override / legacy `auth.json`を対象にpersisted credentialがないことをsecret-safeに確認する。予期せず認証状態が残っている場合は`/workspaces`へのsymlink、`/tmp` / `TMPDIR`、alternate credential source等を調査し、raw databaseやcredential値を読まず、原因未確認のまま認証済み扱いにしない。
16. Codexは`codex login status`を認証状態の正本として実行する。予期せず認証済みならeffective `CODEX_HOME`、credential store、symlink、`/tmp` / `TMPDIR`等のpersisted sourceを調査する。
17. zero-state確認後にOpenCodeのFree model smokeを`OPENCODE_API_KEY`なしで実行し、betaのCodex device-code authを行う。
18. Section 6のOpenCode Repository instructions / Skill discovery / development smokeを再検証する。
19. Codexは同じeffective `CODEX_HOME`で認証監査、`test:hooks`、Repository integration、same-session Hook runtime、bounded subagent、read-only / development smokeを再検証する。
20. `GH_TOKEN`を対象processから除外し、`ci_wait` server startupと`wait_for_required_ci` tool discoveryを確認する。ここではtoolを呼ばない。
21. 同じtoken条件でSection B-3と同じPR / workflow runs APIへ`gh api`でread-only接続できることを必須確認する。
22. `pnpm run verify`をCodespace内で実行しPASSする。`postCreateCommand`で既に成功した`pnpm install --frozen-lockfile`は冪等性検証のために再実行しない。
23. Web smoke契約に従って8081を確認する。
24. 最後に`git diff --quiet`、`git diff --cached --quiet`、`git diff --check`、`git status --short`を確認し、tracked / index差分0とする。Section 6の`.artifacts/**`はignoredのため許容する。
25. canonical Fresh Codespaceはfinal exact-head CI / PR本文更新までrunning状態を維持し、その後Phase Fのcleanup契約に従ってlogout / stopする。

##### Task 27 execution status — 2026-10-05 19:16 JST

- L2 correction applied: `devcontainerPath` empty after Full Rebuild is not a standalone failure; E-2 evidence is Creation Log + target Runtime. E-3 still requires exact `.devcontainer/devcontainer.json` because creation explicitly passes `--devcontainer-path`.
- Candidate, local HEAD, remote PR branch, and PR #188 head remain `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`; latest `origin/main` is `813699a57a8b8f114fb7419b74fddba49b5dd908`. PR is OPEN against `main`. The candidate remains frozen; current edits are Plan / Run records only.
- `gh codespace view` returned `Shutdown`, machine `basicLinux32gb`, and empty `devcontainerPath` for `stunning-space-goggles-977gqrjrrwx6hxxp7`.
- `gh codespace logs --codespace <target>` was attempted through an in-memory classifier. It did not complete within the bounded window; captured stdout and stderr were both 0 lines / 0 bytes. No raw Creation Log was displayed or saved, and no conclusion about its contents or credentials is possible.
- The authenticated-user Codespaces start request was rejected by automatic approval review before execution. No start request was sent. Therefore Creation Log classification and target Runtime verification remain pending; the earlier SSH-shell markers are not treated as target-container evidence. Task 27 remains incomplete and Task 28 has not started.
- Resume when the same Codespace is `Available`, then retrieve and safely classify its Creation Log and continue E-2 target Runtime validation. No rebuild was repeated.

##### Task 27 follow-up — 2026-10-05 19:41 JST

- The same Codespace later reported `Available` on `basicLinux32gb`; `devcontainerPath` remained empty. No conclusion about the current devcontainer or Creation Log follows from that field.
- A second `gh codespace logs --codespace <target>` attempt while Available timed out after the bounded 120-second window. Captured stdout / stderr were 0 lines / 0 bytes; log fields remain unclassified, no raw log was displayed or saved, and no rebuild was repeated.
- Correction at 2026-10-05 19:50 JST: the earlier interpretation of `ssh-add -l` exit 2 as “0 loaded identities” was incorrect. The classified result is `agent_unavailable=true`, `agent_empty=false`; the Windows `ssh-agent` service is present but `Stopped` / `Disabled`, so the loaded identity count is unknown. The standard Codespaces SSH key file exists. The key-unlock prompt remains a plausible explanation for the bounded `gh codespace logs` timeout, not a confirmed cause. No key, passphrase, fingerprint, or raw Creation Log was emitted.
- Historical handoff withdrawn by the user's 2026-10-05 correction: do not start Windows `ssh-agent`, run `ssh-add`, or make SSH key/config changes for Task 27. The prior local agent diagnosis is historical evidence only; SSH is not a Task 27 prerequisite or blocker.

##### Task 27 transport clarification — 2026-10-05 22:33 JST

- The user clarified that SSH is not the purpose or a canonical completion condition. Do not start Windows `ssh-agent`, run `ssh-add`, create or change SSH keys, edit `.ssh/config`, or build another remote-access mechanism for this task. No specific transport is a new Plan requirement.
- Existing Task 27 evidence: `gh codespace rebuild --full -c stunning-space-goggles-977gqrjrrwx6hxxp7` exited 0 and reported rebuilding; afterward the Codespace returned to `Available` on `basicLinux32gb`. This establishes the control-plane rebuild result, but not devcontainer selection, image/container creation, `postCreateCommand`, or target Runtime success. Earlier SSH-shell markers are not target Runtime evidence.
- Current read-only checks show PR #188 and local HEAD at candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`; the candidate contains `.devcontainer/devcontainer.json`. The Codespace is `Available`, `basicLinux32gb`, on the expected branch with no uncommitted or unpushed changes. Its empty `devcontainerPath` is informational for this existing plain Codespace and is not a Full Rebuild failure condition.
- The user reports that the IDE appears to be in a recovery mode. Control-plane metadata does not distinguish a devcontainer build failure from IDE/runtime access state. Creation Log retrieval previously timed out without captured bytes, so there is no evidence identifying a failed build stage. Do not repeat Full Rebuild without such failure evidence.
- Control-shell metadata does not expose the requested target Runtime values. `gh api user/codespaces/<name>` was rejected by automatic approval review before execution; no API request was sent. The user requested no browser operations, so AI-side Web IDE inspection is not part of this continuation.
- If no existing safe target-runtime route is available to the AI, the only human check for Task 27 is to run `whoami`, `node --version`, `pnpm --version`, `opencode --version`, `codex --version`, and `gh --version` in the Codespaces normal IDE terminal. Task 27 remains incomplete until the required target evidence is available; Task 28 has not started.

##### 2026-10-06 Task 27 Fresh Create failure / repair checkpoint

- User-provided Creation Log for candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`, Codespace `probable-spoon-wrrq9pgppxvp36rq`, confirms `.devcontainer/devcontainer.json` was selected; the base image build and target container start succeeded; connection as `User: node` succeeded; then `postCreateCommand` began and its first command `corepack enable` failed with `EACCES` while creating `/usr/local/bin/pnpm` symlink. `postCreateCommand` exited 1 and Codespaces fell back to a recovery container. The later recovery shell user was `vscode`, where the target CLIs were unavailable. This is a configuration failure after successful image build/start, not a base image build failure.
- Root cause: `corepack enable` writes a system-wide shim under `/usr/local/bin` but ran as non-root `node`. Global npm installs use the same system-wide locations, so those exact installs need the same privilege correction before they can be reached. Keep image and `remoteUser: "node"` unchanged.
- Safe minimal repair: add `sudo` only to `corepack enable` and the two exact global npm installs for OpenCode / Codex. Keep `pnpm install --frozen-lockfile` and `pnpm exec playwright install --with-deps chromium` outside a whole-command `sudo` shell.
- Candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3` remains preserved as failed evidence and is no longer the validation candidate after the environment-affecting repair. Validate, commit, and normally push a new candidate; then perform a new explicit-path Fresh Create and, after target contract PASS, a Full Rebuild of that same new candidate-created Codespace.
- Do not repair or reuse the failed recovery Codespace. No SSH transport, agent, key, or config issue is implicated.

##### 2026-10-06 08:26 JST — New candidate freeze

- New candidate `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3` contains the bounded permission repair and Run / Plan corrections. It was committed and normally pushed to `plan/codespaces-opencode-devcontainer`; PR #188 remains OPEN and its head matches this SHA.
- The old candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3` remains historical failed evidence. The new SHA is the sole candidate for the next validation. Keep it frozen until Fresh Create and Full Rebuild evidence for this same SHA is complete.
- Task 27 / 28 Fresh Create and target contract are pending. After they PASS, Full Rebuild the same candidate-created Codespace once; do not use the old recovery Codespace.

##### Historical checkpoint — 2026-10-06 08:40 JST (superseded by the 09:30 JST result below)

- Codespace `expert-chainsaw-r445rqpqqqqwh566v` was created once from candidate `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3` using the canonical repository, branch, `basicLinux32gb`, and explicit `.devcontainer/devcontainer.json` path. It is now `Available`; repository / branch / machine / path metadata match.
- The create command's `--status` wait exited 1 with a startup timeout, while follow-up control-plane state is `Available`. Creation Log evidence and target Runtime values are not yet available, so this is neither Fresh Create PASS nor evidence of a specific devcontainer failure.
- The existing AI-side Runtime route could not start an SSH server. Do not alter the candidate to add SSH support or make that transport a validation requirement. Human confirmation in the normal Codespaces IDE is required before Task 28 can PASS. Full Rebuild has not started.

##### Historical checkpoint — 2026-10-06 09:30 JST (Runtime provenance corrected at 12:15 JST)

- At the time of this checkpoint the user-provided Runtime output was provisionally attributed to `expert-chainsaw-r445rqpqqqqwh566v`; the user later clarified that the values came from a newly started Codespace. See the 12:15 JST correction below.
- Codex is the last fail-fast install step in `postCreateCommand`; its exact Runtime version supports inferring that preceding install commands completed. Record this as inference. The user requests no additional Creation Log for this PASS, so it is not required.
- Fresh Create metadata and runtime attribution were later corrected; preserve this checkpoint only as historical transition evidence.

##### 2026-10-06 12:15 JST — Runtime provenance correction / retarget to `turbo-umbrella`

- The user clarified the Runtime output followed launching a new Codespace. The only currently listed Available Codespace is `turbo-umbrella-7vvjr6p66jvgcgg4`; metadata matches candidate branch, repository, `basicLinux32gb`, exact devcontainer path, and clean state. Attribute the supplied Runtime values to this Fresh Create.
- `expert-chainsaw-r445rqpqqqqwh566v` now returns HTTP 404. Its Full Rebuild command / control-plane transition is not target Runtime evidence; do not mark its Full Rebuild gate PASS.
- Fresh Create target Runtime and Task 18 are PASS for `turbo-umbrella`. The same Codespace passed preflight; `gh codespace rebuild --full -c turbo-umbrella-7vvjr6p66jvgcgg4` was issued once, exited 0 with `is rebuilding`, and currently reports `Rebuilding` with expected metadata.
- Task 21 remains open until `turbo-umbrella` is Available and its post-Rebuild target Runtime is verified. Do not repeat this Full Rebuild.

##### 2026-10-06 12:25 JST — Full Rebuild control-plane completion

- A fresh `gh codespace view` now reports `turbo-umbrella-7vvjr6p66jvgcgg4` as `Available`; repository, candidate branch, `basicLinux32gb`, explicit `.devcontainer/devcontainer.json`, and clean / no-unpushed metadata match.
- The one Full Rebuild command has completed its control-plane transition from `Rebuilding` to `Available`. This alone is not target Runtime PASS; do not repeat the Rebuild.
- Task 21 remains open pending target Runtime values from the same Codespace after Rebuild. Creation Log is only needed if Runtime failure requires root-cause diagnosis; it is not required when the target contract passes.

##### 2026-10-06 13:09 JST — Full Rebuild target Runtime PASS

- The user confirmed the IDE Runtime values were collected after Full Rebuild in the same candidate-created Codespace `turbo-umbrella-7vvjr6p66jvgcgg4`. Candidate SHA matches; `git status --short` is empty; `whoami=node`, UID `1000`; Node `v24.21.0`; pnpm `10.34.5`; OpenCode `2.0.22`; Codex `0.160.0`; GitHub CLI `2.102.0`; command paths match the Fresh Create; effective CODEX_HOME is recorded as `<USER_HOME>/.codex` in Run artifacts.
- Control-plane metadata remains `Available`, `basicLinux32gb`, correct repository / branch, exact `.devcontainer/devcontainer.json`, and clean / no-unpushed. The single Full Rebuild completed; no retry or Creation Log retrieval was needed.
- Task 21 is complete. Tasks 19 and 22 remain open for Fresh Create and Full Rebuild authentication / integration / API / Git / verify / Web / clean-state checks.

#### E-3: candidate SHAのcanonical Fresh Create（E-2より先に実行）

Fresh Createは新規Codespace、repository workspace、create-time devcontainer selection、dotfiles未適用、認証zero-stateを含む完全新規環境の正本とする。実行順序はE-3でFresh Createとtarget Runtime contractをPASS → 同じCodespaceでE-2 Full Rebuild → E-2 / E-3の残りのvalidationであり、plain Phase B Codespaceをcandidate devcontainerへmigrationするgateはない。

1. Fresh Create直前にremote branch head == candidate SHAを再確認する。不一致なら作成せずE-0へ戻る。
2. Phase Aで記録したdotfiles設定がONなら、Fresh Create直前だけ一時的にOFFにする。元状態がOFFなら変更しない。
3. control shellから`gh codespace create -R ryu-yoshikawa-pro-vision/qa-training-store -b plan/codespaces-opencode-devcontainer -m <canonical-machine-name> --devcontainer-path .devcontainer/devcontainer.json --status`で新しいCodespaceを作成する。
4. create commandが失敗した場合も、dotfilesを変更していたなら次工程へ進む前に元状態へ復元する。
5. `gh codespace view -c <codespace-name> --json devcontainerPath,machineName,machineDisplayName,location`で`devcontainerPath == .devcontainer/devcontainer.json`とcanonical machine nameが使用されたことを記録する。Fresh Createはstep 3で`--devcontainer-path .devcontainer/devcontainer.json`を明示するため、このpath一致を必須とする。locationはevidenceとして記録してよいがPASS / FAIL条件にしない。
6. `--status`出力をprimary evidenceとし、必要な場合だけpersistedshare / creation logを補助evidenceとして確認してdotfiles未適用を確定する。
7. dotfiles未適用を確認した直後に、Phase Aで記録した元のdotfiles設定へ復元する。元々OFFなら変更しない。
8. 新Codespace内で`git rev-parse HEAD` == candidate SHAを確認する。不一致ならFAIL。
9. manual CLI install、home directory copy、auth cache copyを行わない。
10. `command -v gh` / `gh --version`を含め、devcontainer作成処理だけでNode / pnpm / GitHub CLI / OpenCode / Codex CLIが揃うことを確認する。
11. OpenCodeはV2 persisted credentialがないこと（`OPENCODE_DB` unset、V2 databaseにsaved credentialなし、legacy `auth.json`にsaved credentialなし）、Repository側にOpenCode auth configがないことをsecret-safeに確認する。raw database / credential値を出力しない。
12. effective `CODEX_HOME`のset / unsetと解決後pathを記録する。
13. Codexのzero-state判定は`codex login status`を正本とする。`$CODEX_HOME/auth.json`等の不在とAPI key / access token / WIF env不在は補助evidenceとし、file不在だけで未認証と判定しない。
14. `whoami` / `id -u`、version、`command -v`、実install path、effective PATH、dependency install、effective `CODEX_HOME`を確認し、E-2 target contractと一致することを確認する。
15. OpenCodeはSection 6のFree Zen modelを`OPENCODE_API_KEY`なしで実行し、Repository instructions / Skill discovery / development smokeを行う。paid modelやcredential保存へfallbackしない。
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

修正後はE-0 → E-1で新candidate SHAを作成し、E-3 Fresh Create → 同じCodespaceのE-2 Full Rebuildを両方やり直す。

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

canonical OpenCode smokeにはOpenCode Zen providerのFree modelだけを使用する。各callの前に公式catalogでFree分類を確認し、paid modelは呼び出さない。model IDはRepository設定へ固定しない。

- OpenCode / provider metadataまたは明示errorが必要なtool capability非対応を示した場合だけ、直接model capability failureと分類する。
- 明示されない失敗は直ちにmodel要因へ分類せず、environment / OpenCode / auth / permission / tool integration failureとして調査する。
- model capability failureへ再分類する場合は、環境/configを変更せず、必要能力を持つ別のFree Zen modelだけへ変更して同一smokeを1回再実行し、PASSすることをevidenceにする。Free classificationを確認できないmodelは呼び出さない。
- 別modelでもFAILする場合はenvironment / integration failureとして扱う。
- model ID自体は環境契約へ固定しない。

### artifact path規則

- OpenCode Phase B: `.artifacts/codespaces-smoke/opencode/phase-b/attempt-<N>.txt`
- Codespace remote script: `.artifacts/codespaces-smoke/<phase>/control-command-attempt-<N>.sh`
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

`opencode run --format json`のstdout / stderrは別々に捕捉し、modelに書かせるartifact pathへredirect / appendしてはならない。event streamはmodelの出力先artifactと分離して扱い、raw streamをRun Artifactへ記録しない。

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
| dotfiles | 作成直前OFF / `--status` / 即復元 | dotfiles未適用、元設定へ復元。Free-only利用ではPersonal Secret access不要 |
| Phase B Codespace | canonical machine + plain create | HEAD == baseline PR head |
| OpenCode baseline | version / Free catalog / keyless smoke | exact version、Free model分類、`OPENCODE_API_KEY`なしの応答 |
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
| Main Codespace baseline | main branch startup | GitHub Codespaces / Repository access / account / machine are not broadly unavailable; not proof of PR devcontainer success |
| Phase B plain migration | existing-container reuse Creation Log | baseline diagnostic only; migration is not Required DoD |
| Fresh Create provenance | explicit devcontainer path + post-view | candidate HEAD / canonical machine / exact devcontainerPath / target Runtime; Creation Log only for failure diagnosis |
| Full Rebuild provenance | same candidate-created Codespace + full rebuild | target Runtime + canonical machine; empty devcontainerPath alone is not FAIL; Creation Log only for failure diagnosis |
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

- Phase B plain Codespaceのuser / path / PATHはbaseline evidenceでありtarget contractではない。既存containerをreuseしたmigration failureはFresh Createの判定へ流用しない。
- main Codespaceの正常起動はCodespaces / Repository access / account / machine全体のfailure可能性を下げるbaselineであり、PR candidate devcontainerの成功証明にはしない。
- Phase CでpostCreateを実装するため、exact install command、target `node` userでのinstall先方針、sudo使用有無、PATH反映、GitHub CLI提供方法はPhase B→Cまでに決める。
- E-2はその実装方式を検証する場所であり、方式を初めて決める場所ではない。
- E-2で変更が必要ならcheckpoint / Phase Cへ戻りnew candidateを作る。

### OpenCode Zen authentication / config

- 本RunではPersonal Secret acceptanceを検証・主張しない。ユーザーのFree-only方針に従い、公式catalogでFreeと確認したmodelのkeyless responseをDoDとする。
- Phase B / Full Rebuild / Fresh CreateのOpenCode smoke processから`OPENCODE_API_KEY`をunsetし、persisted credentialやalternate credential sourceがなくてもFree modelが動作することを確認する。
- OpenCode auth config / env substitution / `/connect` credential保存を使用しない。keyless Free invocationが成立しない場合はpaid modelへfallbackせず停止する。
- Free catalogの分類が変わった場合は呼び出し前に別のFree modelへ切り替える。model IDをRepository設定へ固定しない。

### OpenCode permission

- OpenCodeはupstream default permissionを使用する。
- Codex Safety Harness相当のpermission / sandbox / Hook制御を今回追加しない。
- current default permissionが変更された場合はPhase Aで確認し、今回の境界に影響する変更だけPlanへ反映する。

### Secret境界

- Codespaces SecretはCodespace-wide environment variableとして他processから参照可能である。本RunのFree-only OpenCode smokeでは`OPENCODE_API_KEY`をprocessからunsetする。
- 今回process単位のSecret brokerは追加しない。
- Secret値をprompt / completion / command output / terminal output / log / Run Artifact / REPORT / PR本文へ意図的に出力・保存しない。
- このPlanではPersonal `OPENCODE_API_KEY`の作成 / 変更 / Repository access変更を行わない。

### Codespace remote command transport

- 以下の`gh codespace ssh`に関する記述は、過去のPhase B shell smokeで使ったscript安全性の記録である。Task 27 / E-2の目的・必須transport・完了条件ではなく、Full RebuildやFresh CreateでSSHを成立させる必要もない。Task 27では、現在安全に利用できるGitHub Codespacesの既存経路を使う。AI側からtarget Runtimeへ到達する経路がなければ、SSHの修復へ進まず、Codespacesの通常IDEで人間が必要最小限のruntime値を確認する。
- Windows `ssh-agent`の起動、`ssh-add`、SSH鍵の作成・変更、`.ssh/config`変更、新規remote access機構はTask 27 / E-2の前提・成果にしない。以前のSSH利用結果は、その時点の診断Evidenceとしてだけ扱う。
- Codespace内で複数行scriptを実行するとき、PowerShell here-string等のscript本文を`gh codespace ssh ... -- bash -lc <script>`のremote command argumentへ直接渡さない。PowerShell、GitHub CLI、SSH remote shellをまたぐ引数再解釈でscript境界が失われ、shell variable dumpを起こした実例がある。
- reviewed scriptはSecret値を含めず、ignoredな`.artifacts/codespaces-smoke/<phase>/control-command-attempt-<N>.sh`へ保存する。`git check-ignore -q`が成功することを確認後、`Get-Content -Raw -LiteralPath $scriptPath | gh codespace ssh -c $codespaceName -- bash -s`で内容をstdinとして渡す。remote command argumentは固定の`bash -s`だけにし、script bodyをargumentへ展開しない。
- scriptは`set -Eeuo pipefail`を明示し、bare `set`、`env`、`printenv`、`set -x` / `set -v`、全environment / shell state dumpを禁止する。環境変数確認は名前ごとのset / unset booleanのみとし、Secret値を出さない。
- OpenCode Free smoke processには`OPENCODE_API_KEY`やその他credentialを引き継がない。command stdoutはversion、SHA、状態、明示したPASS / FAIL marker等のallowlisted factsに限定する。unexpected raw stdout / stderrをtool output、Run Artifact、REPORTへ流さず、安全なfailure summaryだけを記録する。
- stdin transportまたはfixed `bash -s` commandが失敗した場合の停止条件は、そのtransportで実行するPhase B smokeに限る。Task 27 / E-2のdevcontainer成否へ読み替えず、SSH固有の修復・再試行条件として使わない。

### Codespaces personalization

- dotfilesはaccount-wide設定だが新規Codespace作成時に適用されるため、Run全体でOFFにしない。
- Phase B / Fresh Createそれぞれの作成直前だけ一時OFFにし、`--status`等で未適用を確認後すぐ元状態へ戻す。
- create failure / blocker / user stop時もdotfiles復元を優先する。

### machine / resource

- canonical validation machineはPhase Aで利用可能な最小Linux machineを選び、Phase B baseline / E-3 Fresh Createで同じmachine nameを使用する。
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
- [GitHub CLI: `gh codespace ssh`](https://cli.github.com/manual/gh_codespace_ssh)
- [GitHub CLI: `gh codespace view`](https://cli.github.com/manual/gh_codespace_view)
- [Dev Containers TypeScript / Node image](https://github.com/devcontainers/images/blob/main/src/typescript-node/README.md)
- [Dev Container Features](https://github.com/devcontainers/features)
- [OpenCode rules](https://opencode.ai/docs/ja/rules/)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [OpenCode configuration](https://dev.opencode.ai/docs/config/)
- [OpenCode CLI](https://dev.opencode.ai/docs/cli/)
- [OpenCode providers](https://opencode.ai/docs/providers/)
- [OpenCode V2 providers](https://dev.opencode.ai/v2/docs/providers/)
- [OpenCode V2 troubleshooting and data paths](https://dev.opencode.ai/v2/docs/troubleshooting/)
- [OpenCode V2 installation](https://opencode.ai/v2/docs/)
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
- [ ] 5. Personal dotfilesの元状態 / repositoryを確認する。Free-only利用ではPersonal `OPENCODE_API_KEY` accessは不要。
- [ ] 6. dotfilesを作成直前だけOFFにし、canonical machine + `--status`でplain Codespaceを作成後、未適用確認と即時復元を行う。
- [ ] 7. OpenCode exact install、baseline provenance、公式Free catalog / keyless model invocationを検証する。
- [ ] 8. OpenCodeのroot `AGENTS.md`自動適用、native `feature-plan` Skill discovery、development smokeを検証する。
- [ ] 9. Codex exact install、baseline provenance、effective `CODEX_HOME`、beta device-code authenticationを検証する。
- [ ] 10. Codex `test:hooks` / trust / preflight / same-session Hook runtime / bounded subagentを同じ`CODEX_HOME`で検証する。
- [ ] 11. `GH_TOKEN`を除外し、`ci_wait` server / tool discoveryと必須GitHub API read-only connectivityを検証する。wait toolは呼ばない。
- [ ] 12. Phase B→C checkpointへFree-only OpenCode model policy / keyless invocation、target node install戦略、GitHub CLI Feature、CODEX_HOME、postCreate、smoke契約を固定する。
- [ ] 13. `.devcontainer/devcontainer.json`と`AGENTS.md`の最小修正を実装する。OpenCode auth configは追加しない。
- [ ] 14. READMEを通常利用者向け情報と正本リンクに絞って更新する。
- [ ] 15. candidate作成前に`pnpm run verify` / `git diff --check` / scope / repair-loop確認を行う。
- [ ] 16. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [x] 17. remote head == candidate SHAを確認し、dotfiles元状態を確認したうえでcanonical machine / explicit devcontainer / `--status`によるFresh Createを1回行い、dotfiles未適用を確認して直ちに元状態へ戻す。
- [x] 18. Fresh Createでrepository / branch / HEAD / machine / exact devcontainerPath / target user / CLI versions / PATH / effective CODEX_HOMEを確認する。Creation LogはRuntimeだけでは失敗箇所を判定できない場合に取得し、Runtime contract PASS時の必須条件にしない。
- [ ] 19. Fresh Createのauth zero-state、OpenCode / Codex integration、required GitHub API、Git identity / remote / push dry-run、`pnpm run verify`、Web smoke、tracked cleanを確認する。Fresh Createではtarget metadata / Runtime / 作成直後のtracked clean以外を未確認とする。PostToolUse / Stop timeout修正のCodespaces実測は独立した後続sessionのevidenceであり、Fresh CreateのHook確認へ流用しない。
- [x] 20. Full Rebuild直前に同一candidate-created CodespaceのHEAD / tracked・index clean / environment-impacting untracked fileなしを確認し、`gh codespace rebuild --full`を1回行う。
- [x] 21. 同じCodespaceのFull Rebuild後にcanonical machine / target Runtimeを確認する。`turbo-umbrella-7vvjr6p66jvgcgg4`でcandidate HEAD、clean status、`basicLinux32gb`、`node` / UID 1000、Node 24.21.0、pnpm 10.34.5、OpenCode 2.0.22、Codex 0.160.0、gh 2.102.0、expected PATH、effective CODEX_HOMEを確認。Creation LogはRuntime failureの原因特定に必要な場合だけ取得し、`devcontainerPath`の空値だけではFAILにしない。
- [ ] 22. Full Rebuild後のauth zero-state、target CLI / gh / CODEX_HOME、OpenCode / Codex integration、required GitHub API、`pnpm run verify`、Web smoke、tracked cleanを確認する。Full Rebuild Runtime contract PASSと、HEAD=`3c243f38b627c282fc779e7c13b98dbae08f1c74`での過去Linux verify / clean報告は履歴として保持する。ユーザーは後続の確認項目（auth zero-state / integration / Hook / subagent / `ci_wait` / GitHub API / Git / Web）を実行していないと訂正したため、Task 22のPASSへ流用しない。後続Codespaces verify 2回はESLint開始後にexit 143で終了しておりPASSではない。PostToolUse / Stop timeout修正のHook固有runtime・test evidenceは別sessionの結果として記録し、Full Rebuild phaseへ帰属させない。auth zero-state / integrations / GitHub API / Git / Web等は未確認のため継続する。
- [ ] 23. Phase B plain Codespaceをbaseline evidenceとして記録し、不要になった時点でstopする。deleteしない。
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

## Post-candidate Hook timeout修正 evidence（2026-10-07）

- PR #188 headは`17e612b1b5fadf8736de9b99d6f437a94ef397a4`。ユーザーが指定した`176e612b1b5fadf8736de9b99d6f437a94ef397a4`はGitHub上に存在せず、remote PR head / commit APIで確認した正確なSHAは`17e612b1b5fadf8736de9b99d6f437a94ef397a4`。
- commitの親は`8275e8574c6c43830f25375a35aa7d60e05545b3`。実diffは`.codex/hooks/text_quality_gate.mjs`、`tests/contracts/codex-text-quality.test.ts`、`docs/adr/0026-codex-text-quality-gate.md`の3ファイルだけ。環境影響ファイル、dependency、lockfile、認証、Node / pnpm / OpenCode / Codex設定は変更していない。したがってFresh Create / Full Rebuildは再実行しない。
- PostToolUseは安全に取得できた明示Markdown pathだけを即時scanし、pathを得られないtoolやintersection 0件では他の変更Markdownへfallbackしない。Stopは従来どおり全変更Markdownを最終scanする。ユーザー実測のpathなしBash 5回は217 / 284 / 251 / 283 / 222 msで、10秒timeout再発なし。
- Stopはcurrent本文を先にscanし、違反0件ならbaseline本文をread / scanしない。違反がある場合のみ従来のbaseline fingerprint比較を行う。Stop(false) block、quality check不能時のfail-close、Stop(true) allow / cleanup、rename / move、全変更Markdown最終検査を維持したというユーザー提供の実装・検証説明。
- Hook固有validation（ユーザー報告）: `tests/contracts/codex-text-quality.test.ts` 60/60、`tests/contracts/codex-hook-contract.test.ts` 154/154、`pnpm run test:hooks` 230/230、`pnpm run diagnose:hooks` WARN 0 / ERROR 0、ESLint 0 errors（既存65 warnings）、typecheck、security、web build、spec build、format、Markdown lint、text lint、`git diff --check` PASS。修正Hookは同じ実Codex sessionで発火し、Hook JSONL記録も継続。effective `CODEX_HOME=<USER_HOME>/.codex`（sanitizer token）。
- Codespacesの標準`pnpm run verify`は2回ともESLint開始後にexit 143。PASSとして扱わず、Hook修正原因とは断定しない。localでの最終標準verifyは別途1回実行し結果を記録する。
- このHook修正runtime sessionをFresh Create / Full Rebuildのどちらかへ推測で帰属しない。既存Task 19 / 22の環境別auth・integration・GitHub API・Git・Web検証も代替しない。

## 最終検証状態（2026-10-07）

- PR #188はopen / non-draft。actual headは`17e612b1b5fadf8736de9b99d6f437a94ef397a4`。`176e612b1b5fadf8736de9b99d6f437a94ef397a4`はGitHubに存在せず、指定SHAの誤記。
- local標準`pnpm run verify`はPR headで1回実行しexit 1。48 files中43 passed / 5 failed、827 tests中779 passed / 44 failed / 4 skipped。format / lint / validation / typecheck / security / unit / integration / repository / component stagesはpass、test failureのためweb / spec buildは未到達。全失敗test fileと環境観測はactive Run REPORTに記録する。これはPASSではなく、Hook変更に起因すると確定したものでもない。
- Windows `pwsh.exe`起動のAccess deniedに伴うcontract launcher失敗と、原因未確定の`ci-wait-mcp` child process `Connection closed`を分けて記録する。Windows権限・toolchainを変更せず、verifyを再実行しない。
- candidateからPR headまでのcompareは6 commits / 8 pathsで、devcontainer、dependency / lockfile、CLI / install契約など環境影響pathは0件。よってFresh Create / Full Rebuildを再実行しない。
- Task 35の標準verifyは未完了。Required CIとPR本文更新、およびCodespaces上のTask 28 / 30 broader integration / Web validationは未完了であり、PR完了とは扱わない。

## Required Mobile App CI repair（2026-10-07）

- Exact-head `wait_for_required_ci` on `92852d6be3db09c2d7df60718bc42538f2a2dfa4` returned `ci_failure`: `Web CI` passed and `Mobile App CI` failed. The failed `Native Static / Run Expo Doctor` step reports five direct Expo SDK patch mismatches: `expo` 57.0.26→57.0.27, `expo-constants` 57.0.20→57.0.21, `expo-linking` 57.0.11→57.0.12, `expo-router` 57.0.24→57.0.25, and `expo-sqlite` 57.0.3→57.0.4.
- These five current versions match `origin/main`; the Hook commit does not modify them. The required CI failure is real and predates the Hook-only change. Repair only those package versions and their lockfile resolutions, using the observed Expo Doctor expected versions. Do not skip or weaken the CI gate.
- A `package.json` / lockfile repair is environment-impacting under this Plan. The current candidate freeze is reopened for the limited repair; after repository validation and a new candidate commit, repeat explicit-path Fresh Create and Full Rebuild on a candidate-created Codespace. Do not reuse b05 runtime evidence for the new SHA.
- PR remains incomplete until the repair candidate's target contracts and exact-head required CI pass. The Hook-only evidence remains separately recorded and needs no additional Fresh Create / Full Rebuild by itself.

## Hook evidence integration and dependency repair validation（2026-10-07）

- GitHub PR metadata confirmed head `92852d6be3db09c2d7df60718bc42538f2a2dfa4`, open / non-draft. The user-provided SHA `176e612b1b5fadf8736de9b99d6f437a94ef397a4` does not exist; the actual pushed Hook commit is `17e612b1b5fadf8736de9b99d6f437a94ef397a4`, an ancestor of the PR head. Its actual diff contains only `.codex/hooks/text_quality_gate.mjs`, `tests/contracts/codex-text-quality.test.ts`, and `docs/adr/0026-codex-text-quality-gate.md`; no environment-impacting files changed in that Hook commit.
- Preserve the Codespaces Hook-session evidence separately: safe explicit Markdown path-only PostToolUse scans; no fallback for pathless Bash or empty path intersection; Stop scans all changed Markdown; current-clean Stop skips baseline read / scan and scans baseline only when current violations exist. The supplied five pathless Bash timings are 217 / 284 / 251 / 283 / 222 ms. Hook contract / focused tests and same-session Hook JSONL evidence remain attributed to that Hook session, not to Fresh Create or Full Rebuild.
- Required Mobile App CI on `92852d6...` failed only the pinned Expo Doctor package-version check (16/17 checks passed): `expo` 57.0.26→57.0.27, `expo-constants` 57.0.20→57.0.21, `expo-linking` 57.0.11→57.0.12, `expo-router` 57.0.24→57.0.25, and `expo-sqlite` 57.0.3→57.0.4. Repair is limited to those five direct dependency patches, the matching `pnpm.overrides.expo-constants` value, and lockfile resolution. No workflow, source, test, devcontainer, install method, CLI version, or authentication change is included.
- After correcting the stale `expo-constants` override, `pnpm install --frozen-lockfile --ignore-scripts` passed and the exact CI check `pnpm dlx expo-doctor@1.17.6` passed 17/17. Standard `pnpm run verify` under the default sandbox reproduced host process restrictions (44 contract failures across 5 files); the same standard command in the approved elevated execution context passed with exit 0: 48/48 test files, 823 passed / 4 skipped, ESLint 65 warnings / 0 errors, and Web / spec builds completed. The successful elevated standard verify is the canonical local repository gate.
- The package / lock repair remains environment-impacting and therefore requires a new candidate SHA, explicit-devcontainer Fresh Create, and Full Rebuild on that candidate-created Codespace. The Hook-only fix does not independently require either rebuild. Existing b05 Runtime evidence is historical and cannot be reused for the dependency candidate. Exact-head required CI and PR body synchronization remain pending.
