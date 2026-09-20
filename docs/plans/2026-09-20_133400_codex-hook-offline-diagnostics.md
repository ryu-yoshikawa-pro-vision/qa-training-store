# Codex Hookオフライン診断・契約テスト拡張 実装計画

## 0. 依頼概要

- 依頼内容: Codexを起動せずにHookを検証し、`Hook · Codex text quality hook: quality check unavailable (baseline_state)` を含むHookエラーを切り分けられるようにする。
- 実装branch: `feat/codex-hook-offline-diagnostics`
- Plan作成時base: `main` / `1213adc9513409cc176c090f9df4c1c408142b9c`
- このPlanでは実装しない。実装、commit、push、PR作成は別タスクで行う。

目的は、Repository側のHook本体・launcher・設定・状態ファイルの問題をCodex Hostから切り離して検証できるようにすることである。

新しいHook frameworkや独自runtimeは作らない。既存の `tests/contracts/codex-hook-contract.test.ts`、`tests/contracts/codex-text-quality.test.ts`、Vitest、`smol-toml`、Node.js標準機能を再利用する。

## 1. ゴール / 完了条件

### ゴール

次の2経路を用意する。

1. `pnpm run test:hooks`
   - Codexを起動せず、Repository所有Hookの外部から観測可能な正常系・異常系契約をtemp fixture上で検証する。
2. `pnpm run diagnose:hooks`
   - 現在のRepositoryを変更せず、project Hook設定と存在するtext quality stateを読み取り専用で診断する。

### 完了条件

- `pnpm run test:hooks` でHook contractをfocused実行できる。
- `pnpm run diagnose:hooks` で現在RepositoryのHook設定と既存stateを読み取り専用で診断できる。
- `.codex/config.toml` に登録されたRepository所有Hookをevent / handler / launcher単位で確認できる。
- 現在Repositoryでは `.codex/hooks.json` を使用しない契約とし、存在した場合にdoctorが見落とさない。
- `PreToolUse`、`SessionStart`、logging Hook、text quality Hookを対象にする。
- 「全Hookエラー」は、Repositoryが所有し外部から観測可能なfailure契約を意味する。内部の全`throw`やHost / plugin / user / system Hookまでは対象にしない。
- text quality Hookについて、`QualityUnavailable`、`TextQualityConfigurationError`、`internal`、configured launcher fallback、inactive Stopのgeneric blockを含む外部failure契約を棚卸しし、既存または追加contract testとの対応を明確にする。
- `baseline_state` の詳細原因を安全なcodeへ分け、active Stopでstateがcleanupされた後でも再発時の原因分類がHook出力から分かる。
- 詳細codeにはstate本文、prompt、Hook payload、token、secret、raw session ID、absolute user pathを含めない。
- state fileが存在しない場合のevent別挙動を維持する。
  - `UserPromptSubmit`: stateが無ければbaselineを作成する。
  - `PostToolUse`: state欠落はquality check不能としてfail-open診断になる。
  - inactive `Stop`: state欠落はcompletion確認不能としてblockする。
  - active `Stop`: state欠落は既存契約どおり正常allowとし、`baseline_state`診断を出さない。
- `diagnose:hooks` は存在するstateだけを検査する。state 0件は正常であり、「特定sessionのstate欠落」と推測しない。
- `diagnose:hooks` はraw session IDやlogging recordとの照合を行わない。
- Hookとdoctorが同じstate validationを使い、判定ずれを起こさない。
- diagnostic commandはworktree、Git index、`.codex/logs`、`.artifacts/codex-text-quality`を変更しない。
- diagnostic commandは現在Repository上でHook / configured launcherを実行しない。
- doctor CLI自体の正常state・異常stateをtemp fixtureのprocess contractで検証する。
- Ubuntu / Windowsの既存Hook CI経路で `test:hooks` / `diagnose:hooks` を検証する。
- Hostが実際にどのproject / `.codex/config.toml` をsessionへ紐付けたかはCodex実起動が必要な別境界として残す。
- 新規runtime dependencyを追加しない。
- 既存Hookのfail-open / fail-close、active Stop cleanup、文章品質rule、baseline生成方式、baseline schema v2、Git rename判定を今回の診断機能だけを理由に変更しない。

## 2. 現状理解

### 2.1 現在のRepository所有Hook

現在の `.codex/config.toml` には次がある。

| event | Repository所有handler | matcher |
| --- | --- | --- |
| `PreToolUse` | `pre_tool_use_policy.mjs` | `^Bash$` |
| `UserPromptSubmit` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `PostToolUse` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `SubagentStart` | `log_event.mjs` | なし |
| `SubagentStop` | `log_event.mjs` | なし |
| `Stop` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `SessionStart` | `session_start_context.mjs` | `^compact$` |

現在の `main` には `.codex/hooks.json` は存在しない。

Codex公式仕様では、同一project layerに `.codex/hooks.json` と `.codex/config.toml` のinline Hookが両方存在すると両方を読み込み、警告する。今回のRepository doctorは両形式を統合する汎用実装にはせず、現在契約どおり `config.toml` をRepository所有Hookの正本として扱う。`.codex/hooks.json` が追加された場合は、無視して成功せずRepository設定エラーとして扱う。

参照:

- https://developers.openai.com/ja-JP/docs/hooks
- https://developers.openai.com/ja-JP/docs/config-file/config-advanced

user / system / plugin Hook、project trust、Hook trust、Host / session project bindingはRepository offline testの対象外とする。

### 2.2 既存contract test

`tests/contracts/codex-hook-contract.test.ts` は既に `PreToolUse`、`SessionStart`、logging Hookのstdin / stdout / stderr / exit code、主要なfail-open / fail-close、Unix / Windows configured launcherをprocess境界で検証している。

`tests/contracts/codex-text-quality.test.ts` は既に `UserPromptSubmit`、`PostToolUse`、`Stop`、state lifecycle、corrupt state、root / session identity mismatch、baseline unavailable、missing state、active Stop cleanup、Unix / Windows configured launcher、secret非漏えいを検証している。

既存testを別directoryへ複製しない。不足する外部failure契約だけを追加する。

### 2.3 text qualityの現在のfailure契約

`text_quality_gate.mjs` の `QualityUnavailable` には少なくとも次がある。

```text
baseline_blob
baseline_cleanup
baseline_manifest
baseline_state
baseline_unavailable
baseline_write
current_content
event_mismatch
git_changed_path
git_rename_mapping
git_unavailable
input_json
input_shape
repository_root
session_id
session_rename_mapping
start_head
stop_hook_active
unsafe_path
```

さらに `scripts/lint-text-quality.mjs` 由来の `TextQualityConfigurationError` がHookまで伝播する。少なくとも次を棚卸し対象とする。

```text
rule_id_collision
textlint_config_invalid
textlint_config_load
textlint_config_unavailable
textlint_message_match
textlint_message_range
textlint_message_shape
textlint_result
textlint_rule_load
textlint_rule_set_invalid
textlint_scan
```

加えて、unexpected exception時の `internal`、configured launcherの固定fallback、inactive `Stop` のgeneric block、他Hookの外部failure結果も対象にする。

全ての内部例外やproduction inputから到達不能な分岐を、test-only APIで公開してまで網羅しない。

### 2.4 `baseline_state` の現状

現行 `readState()` は、state読込から構造検証までの異常を最終的に `QualityUnavailable("baseline_state")` へ集約する。

現在少なくとも次が同じ `baseline_state` になり得る。

- state file read失敗
- JSON parse失敗
- schema / required field不正
- `root_id` / `session_id_hash` の形式不正
- repository root identity不一致
- session identity不一致
- `status` 不正
- statusごとの許可field不正
- `start_head` 不正
- `files` / entry不正
- path不正・重複
- `content_sha256` 不正
- violation fingerprint / count不正

active `Stop` でstate file自体が存在しない場合は、現行実装が明示的にallowするため `baseline_state`診断は出ない。

一方、corrupt stateやidentity mismatchではactive `Stop`が `baseline_state` を出した後、既存cleanup契約によりstateを削除する。既存contract testもこの挙動を固定している。

そのため、`diagnose:hooks` で後からstateを読むだけでは、実際に発生したactive Stopの `baseline_state` 原因を特定できない。

### 2.5 `baseline_state` 詳細化方針

新しいevidence fileは保存しない。既存stateをcleanupしないようにも変更しない。

state validationで判明した安全な原因分類をHookのdiagnostic codeへ反映してから、既存どおりcleanupする。

詳細codeは次の6種類に限定する。

```text
baseline_state_missing
baseline_state_read
baseline_state_json
baseline_state_schema
baseline_state_identity
baseline_state_manifest
```

- `baseline_state_missing`: expected state pathにfileが存在しない。`PostToolUse`ではfail-open診断、inactive `Stop`ではgeneric block、active `Stop`では既存どおりallowする。
- `baseline_state_read`: state fileは存在するがreadできない。
- `baseline_state_json`: JSON parseできない。
- `baseline_state_schema`: schema version、required field、status、`start_head`形式、status固有field集合などtop-level構造が不正。
- `baseline_state_identity`: `root_id` / `session_id_hash` の形式または期待値との一致が不正。
- `baseline_state_manifest`: `files`、path、source、SHA-256、violations、fingerprint、count等のmanifest entryが不正。

既存のgeneric `baseline_state` は新規に生成せず、実装後は上記詳細codeへ置き換える。

この変更はdiagnostic granularityだけを変える。inactive Stopのblock semantics、active Stopのfail-open、active Stop cleanup、state schema v2、baseline生成内容、saved state field、launcher fallbackは変更しない。

### 2.6 state validation共有方針

doctor側でstate schemaを別実装しない。

`readState()` のうちI/OとHook固有exception変換を除くpure validationを `.codex/hooks/text_quality_state.mjs` へ抽出し、Hookとdoctorの両方から使う。

共有moduleはstate JSON値のschema / identity / manifest検証と安全な詳細reason codeだけを担当する。baseline生成、Git差分取得、file read / write / delete、Hook stdout、cleanup、textlint、launcher処理は移動しない。

### 2.7 CIの現状

`.github/workflows/ci.yml` には既にUbuntuの `Vitest (contracts)`、Windowsの `Codex Hook contract (Windows)` があり、aggregate `verify` は両jobの成功を要求する。

新しいCI jobは追加せず、既存required job名も変更しない。

## 3. 実装範囲

### 3.1 変更候補

```text
package.json
.github/workflows/ci.yml
.codex/hooks/text_quality_gate.mjs
.codex/hooks/text_quality_state.mjs
scripts/diagnose-codex-hooks.ts
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-diagnostics.test.ts
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts
docs/reference/codex-safety-harness.md
```

必要なファイルだけ変更する。

`codex-hook-diagnostics.test.ts` はdoctor CLIのprocess contractを分離するため作成する。既存Hook contractをここへ移さない。

### 3.2 原則変更しない範囲

- Product code
- Playwright / application test
- Skill / Agent routing
- `.codex/config.toml` のHook semantics
- `pre_tool_use_policy.mjs` のpolicy
- `log_event.mjs` のlogging semantics
- `session_start_context.mjs` のcompact契約
- text quality rule構成
- baseline schema v2
- baseline state保存field
- active Stop cleanup
- Git rename判定
- CI比較基準
- Host / Codex本体
- user / system / plugin Hook
- project trust / Hook trust設定
- 新しいHook framework
- 新しいstate manager
- 新しいdependency
- state自動修復
- corrupt state保持
- 診断用evidence file
- loggingからのsession逆引き

## 4. 変更方針

### Task 0: 実装開始時の状態を固定する

実装開始時にlatest `origin/main`、branch HEAD / merge base / working tree、`package.json`、CI、`.codex/config.toml`、`.codex/hooks.json` の有無、Hook実装、contract test、`scripts/verify --hook-contracts`、`scripts/verify.ps1 -HookContracts`を再確認する。

Plan作成後にmainへHook / CI / package manager関連変更が入っていた場合は現行mainを優先して差分を確認する。ローカル作業を破棄するreset / restore / force pushは行わない。

### Task 1: Repository所有Hookの外部failure契約を棚卸しする

`.codex/config.toml` を既存 `smol-toml` でparseし、event、matcher、handler数、`command`、`command_windows`、timeout、参照scriptを確認する。

外部failure契約ごとにevent、handler、failure layer、外部code / message / decision、exit code、fail-open / fail-close、副作用、既存test、追加test要否を対応付ける。

棚卸し結果だけの新規文書は作らない。

`.codex/hooks.json` が存在する場合は、今回のdoctorがproject Hook全体を正しく診断できないため実装を続行せず、現行Repository契約との不整合として扱う。汎用hooks.json parserを追加して範囲を広げない。

### Task 2: state validationを共有する

`text_quality_gate.mjs` の現在の `readState()` を、state file I/O、JSON parse、pure state validation、Hook用diagnostic code変換の境界へ分ける。

pure validationは `.codex/hooks/text_quality_state.mjs` へ抽出する。

validatorはschema version、required field、`root_id` / `session_id_hash`、expected identity、status、`start_head`、status固有field、`files`、Markdown relative path、path重複、source、`content_sha256`、violations、fingerprint、countを検証する。

Hookとdoctorで同じvalidatorを使う。共有化のためにbaseline生成、Git処理、Hook output、cleanupまで移動しない。

### Task 3: `baseline_state` を安全に詳細化する

2.5で定義した6種類の `baseline_state_*` codeへ詳細化する。

必須回帰条件:

- corrupt JSON -> `baseline_state_json`
- schema / top-level structure不正 -> `baseline_state_schema`
- root identity mismatch -> `baseline_state_identity`
- session identity mismatch -> `baseline_state_identity`
- manifest entry不正 -> `baseline_state_manifest`
- existing state read failure -> `baseline_state_read`
- missing stateのevent別挙動を維持する
- active Stopで詳細codeを出した後もstateを既存どおりcleanupする
- diagnosticへstate本文、path、session ID、secretを含めない

inactive Stopは現在どおりgeneric blockを返す。詳細codeを出すためにblock semanticsを変更しない。

### Task 4: `test:hooks` をHook contractの共通入口にする

`package.json` にfocused scriptを追加する。

```json
{
  "test:hooks": "vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts tests/contracts/codex-hook-diagnostics.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000"
}
```

次を `pnpm run test:hooks` の呼び出しへ統一する。

- `scripts/verify --hook-contracts`
- `scripts/verify.ps1 -HookContracts`
- Windows `Codex Hook contract (Windows)`

同じtest file一覧を複数箇所で管理しない。

Issue #159で確認したWindows launcher累積時間を考慮し、contract削減、skip、global timeout短縮で通さない。

### Task 5: 外部failure contractの不足testを追加する

既存contractを優先し、不足分だけ追加する。

- `PreToolUse`: malformed / out-of-contract input、safe / deny、root / Node / Hook解決失敗、Hook non-zero、timeout。
- `SessionStart`: malformed input、repository root失敗、root `AGENTS.md` missing / read failure、structured fail-close、Unix / Windows launcher failure。
- logging Hook: malformed input / event mismatch、session ID不正、secret redaction、output contract、logger / root failure、configured launcher failure。
- text quality Hook: process上到達可能な `QualityUnavailable`、`TextQualityConfigurationError`、`internal`、configured launcher fallback、inactive Stop generic block、active Stop詳細diagnostic + cleanup。

production codeへtest-only分岐を追加しない。外部から安定して到達できない内部exceptionを網羅するためだけにAPIを増やさない。source grepでcode数とtest数だけを合わせるcontractも追加しない。

### Task 6: 読み取り専用 `diagnose:hooks` を実装する

entry point:

```text
scripts/diagnose-codex-hooks.ts
pnpm run diagnose:hooks
```

現在Repository上では次だけ行う。

1. Git repository root解決
2. `.codex/config.toml` 読み取り・parse
3. `.codex/hooks.json` 不在確認
4. configured event / handler / script pathの静的確認
5. current platformで必要なruntime / executableの存在確認
6. `.artifacts/codex-text-quality` directoryの読み取り
7. 存在するstate filename形式確認
8. state file read / JSON parse
9. shared validatorによるstate構造検証
10. filenameのroot hashとstate `root_id` の整合確認
11. filenameのsession hashとstate `session_id_hash` の整合確認
12. current repository root hashとの一致確認
13. `start_head` が存在する場合のGit commit object存在確認
14. Host側でしか確認できない項目を `未確認` と表示

現在RepositoryではHook process、configured launcher、Hook payload投入、baseline生成、state変更、log追記、Git index変更、worktree変更、raw session ID取得、logging recordとの照合、Host / user / system / plugin Hook探索を行わない。

state fileが0件の場合は正常終了し、「特定sessionにstateが存在すべきだった」と推測しない。

### Task 7: doctorの出力・exit codeを固定する

結果区分:

- `OK`: Repository側の診断項目に異常なし。
- `WARN`: Host / session等offlineでは確認できない項目。
- `N/A`: current OSでは対象外のlauncher / runtime。
- `ERROR`: Repository所有設定・script・stateの不整合。

exit code:

- `0`: `ERROR`なし。`WARN` / `N/A` / state 0件を含んでよい。
- `1`: Repository所有設定・script・stateの `ERROR` を1件以上検出。
- `2`: doctor自体がrepository contextを確立できず診断を開始できない。

`ERROR` の例:

- `.codex/config.toml` parse failure
- configured Repository script欠落
- `.codex/hooks.json` が存在する
- state filename不正
- state read / JSON / schema / identity / manifest不正
- valid `baseline_unavailable` state
- state `start_head` がcommit objectとして存在しない

Host project binding未確認は `WARN` としexit 0を維持する。current OSで不要なlauncherは `N/A` とする。

stateが存在する場合もfile名そのものやabsolute pathを表示せず、件数や連番で結果を示す。

### Task 8: doctor CLIのprocess contractを追加する

`tests/contracts/codex-hook-diagnostics.test.ts` を追加し、temp Git Repository上でdoctorそのものをchild processとして実行する。

最低限次を固定する。

- clean fixture / state 0件 -> exit 0
- valid ready state -> exit 0
- valid `baseline_unavailable` state -> exit 1
- JSON破損 -> exit 1
- schema不一致 -> exit 1
- root identity不一致 -> exit 1
- filename session hashとstateの不一致 -> exit 1
- invalid manifest -> exit 1
- invalid / missing `start_head` commit object -> exit 1
- configured script欠落 -> exit 1
- `.codex/hooks.json` 存在 -> exit 1
- Git repository外 -> exit 2
- outputへabsolute fixture path、raw session ID、state本文、secretを出さない

読み取り専用保証として実行前後のtracked file content、Git index、untracked file集合、state file content、Hook log contentを比較する。mtimeだけを成功条件にしない。

### Task 9: 現在の `baseline_state` を切り分ける

実装後、問題が発生する同一PC / RepositoryでCodexを起動せず次を実行する。

```bash
pnpm run diagnose:hooks
pnpm run test:hooks
```

- 既存stateに異常が残っている場合はdoctorの詳細結果を確認し、synthetic fixtureと同じ原因を再現できるか確認する。
- state 0件かつ `test:hooks` PASSの場合、Repositoryの現在stateから過去active Stopの原因は断定しない。次回再発時はHookが出す `baseline_state_*` codeで原因分類する。
- offline検証が全PASSし、Codex実行時だけ別Repository configを参照する場合はRepository側を変更せず、Host / session project binding問題として分離する。

### Task 10: CIへ組み込む

`.github/workflows/ci.yml` の既存jobを最小変更する。

Ubuntu:

- 既存 `Vitest (contracts)` は `pnpm run test:contracts` を実行し、新しいdiagnostic contractも `tests/contracts/**` として含む。
- Hook test専用jobは追加しない。
- `matrix.suite == 'contracts'` の場合だけ、contracts完了後に `pnpm run diagnose:hooks` を実行する。

Windows:

- 既存 `Codex Hook contract (Windows)` jobを維持する。
- 直接Vitest commandを `pnpm run test:hooks` へ置き換える。
- 続けて `pnpm run diagnose:hooks` を実行する。
- 既存job名を変更しないためaggregate `verify` のneeds / result判定は維持する。

CIではdoctorの異常分岐をtemp fixture contractで通す。clean checkoutのstate 0件は正常、Host binding未確認はfailureにしない。secret、payload、raw session ID、absolute user pathをCI logへ出さない。

### Task 11: 運用ドキュメントを更新する

`docs/reference/codex-safety-harness.md` へ `pnpm run test:hooks`、`pnpm run diagnose:hooks`、`baseline_state_*` の意味、確認順、state 0件の意味、offline診断の境界を必要最小限追記する。

## 5. 検証方法

### focused

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

### 既存verify wrapper

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

両方とも内部で `pnpm run test:hooks` を使用することを確認する。

### Repository標準検証

```bash
pnpm run test:contracts
pnpm run lint:text
pnpm run lint:text:all
pnpm run lint:markdown
pnpm run typecheck
git diff --check
```

Hook / shared module / script / CI / docsを変更するため、実装完了時は `pnpm run verify` も実行する。

### CI

PR最新headで `Vitest (contracts)`、`Codex Hook contract (Windows)`、aggregate `verify` を確認する。required job名を変更しない。

### Windows

Issue #159で確認済みのlauncher累積時間問題を再導入しない。timeout短縮、case削除、skipで成功させない。doctor fixtureではconfigured Hook launcherを重複実行しない。

## 6. 成功判定

実装完了は次をすべて満たした場合とする。

- Codex未起動で `pnpm run test:hooks` がRepository所有Hookの外部failure契約を検証できる。
- Codex未起動で `pnpm run diagnose:hooks` がRepository設定と存在するstateを読み取り専用で診断できる。
- active Stopのcorrupt / identity / schema / manifest異常が安全な `baseline_state_*` codeとして残り、cleanup契約は維持される。
- missing stateのevent別契約が維持される。
- Hookとdoctorが同じstate validatorを使う。
- doctorの主要正常・異常分岐がprocess contractで固定される。
- doctorが現在RepositoryでHook / launcherを実行しない。
- doctorがRepositoryを変更しない。
- valid `baseline_unavailable` stateを診断エラーとして検出できる。
- state 0件を正常扱いし、特定sessionの欠落と推測しない。
- raw session IDやloggingとの照合を行わない。
- `.codex/hooks.json` を黙って無視しない。
- Repository所有Hookの外部failure契約について既存 / 追加testの対応が確認できる。
- `test:hooks` がverify wrapperとWindows CIの共通入口になる。
- Ubuntu / Windowsの既存Hook CI経路が成功する。
- Host / session bindingはRepository診断と分離されている。
- 新規dependency、Hook framework、state repair、diagnostic evidence fileを追加していない。

## 7. リスクと対策

### state validation共有によるproduction影響

`text_quality_gate.mjs` の既存state判定をshared moduleへ移すため、意図せず受理 / 拒否条件を変える可能性がある。

対策:

- 現行 `readState()` のvalidation条件を維持する。
- 既存state lifecycle / corrupt / identity mismatch testを先に維持する。
- 詳細code以外のHook decision / cleanup差分を許容しない。

### diagnostic code詳細化による既存contract変更

`baseline_state` の文字列を詳細codeへ変えるため、既存test / 運用文書が更新対象になる。

対策:

- decision、continue、cleanupは変更しない。
- 詳細codeは6種類に限定する。
- state本文や環境情報をcodeへ埋め込まない。

### doctorが副作用を起こすリスク

Hook / launcherをcurrent Repositoryで実行するとbaselineやlogを変更し得る。

対策:

- doctor実装からHook実行経路を持たせない。
- executable / scriptは静的確認だけにする。
- process実行はtemp fixtureのcontract testだけで行う。

### Windows CI時間

既存Hook contractはWindowsでlauncher起動回数が多い。

対策:

- doctorのfixture testはdoctor processだけを対象にし、configured Hook launcherを重複実行しない。
- Issue #159で確立したtimeoutを維持する。
- test削減やskipで回避しない。

## 8. 対象外

- Codex Hostの修正
- Codex sessionのproject binding実装
- user / system / plugin Hookのoffline再現
- project trust / Hook trustの自動判定
- `.codex/hooks.json` の汎用対応
- Hook UIの変更
- Hook retry
- state recovery
- corrupt stateの自動削除・保持
- 新しいdiagnostic state / evidence file
- loggingからのsession逆引き
- 新しいHook event
- Hook policy変更
- text quality rule追加
- baseline schema変更
- CI job新設
- 新規dependency
- 新しいHook test framework

## 9. 成果物

実装時の想定成果物:

```text
package.json
.github/workflows/ci.yml
.codex/hooks/text_quality_gate.mjs
.codex/hooks/text_quality_state.mjs
scripts/diagnose-codex-hooks.ts
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-diagnostics.test.ts
tests/contracts/codex-hook-contract.test.ts       # 不足契約がある場合のみ
tests/contracts/codex-text-quality.test.ts
docs/reference/codex-safety-harness.md
```

既存実装の確認結果により不要なファイルは変更しない。

## 10. 備考

- このPlanの目的はRepository所有Hookの検証・診断であり、Codex Host全体のHook解決を再実装することではない。
- 現在切り分け済みのHost / session project binding問題は別境界として扱う。
- 実装時にRepository側の別の再現可能な不具合が確認された場合は、このPlanの目的に直接必要な原因箇所だけを修正し、別機能へ変更範囲を広げない。
- merge、force push、branch削除、Issue / PR close、release、tag作成は明示依頼なしに行わない。

