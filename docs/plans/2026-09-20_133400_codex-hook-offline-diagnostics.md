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

1. Codexを起動せず、全project Hookの正常系・異常系をprocess境界で再現するcontract test。
2. 現在のRepository設定・launcher・text quality baseline stateを変更せず調べる読み取り専用diagnostic command。

### 完了条件

- `pnpm run test:hooks` でCodexを起動せずにHook contractをfocused実行できる。
- `pnpm run diagnose:hooks` で現在のRepositoryを読み取り専用で診断できる。
- `.codex/config.toml` に登録された各Hook eventと実装scriptの対応を検証する。
- Unix / Windowsのconfigured launcher契約は既存process-boundary testを再利用する。
- `PreToolUse`、`SessionStart`、logging Hook、text quality Hookを対象にする。
- text quality Hookが公開するquality-unavailable診断コードについて、各コードが既存または追加contract testのどこで再現されるかを明示できる。
- 特に `baseline_state` について、少なくとも次をCodexなしで識別できる。
  - state file欠落
  - JSON破損
  - schema不一致
  - repository root identity不一致
  - session identity不一致を確認可能な場合の不一致
  - `status` / `start_head` / manifest不正
  - unsafe path
- diagnostic commandはworktree、Git index、`.codex/logs`、`.artifacts/codex-text-quality` を変更しない。
- diagnostic commandはprompt本文、Hook payload、token、secret、raw session ID、状態ファイル本文を出力しない。
- Repository側で再現しないHost / Codex sessionのproject binding問題を、Repository Hookの成功と混同しない。
- Hostが実際にどの`.codex/config.toml`を読み込んだかの確認はCodex実起動が必要な別境界として残す。
- 新規runtime dependencyを追加しない。
- 既存Hookのfail-open / fail-close semantics、文章品質ルール、baseline schemaを診断機能追加だけの理由で変更しない。
- 現在の `baseline_state` がRepository側の再現可能な不具合だと確認された場合だけ、同じbranchで原因箇所を最小修正し回帰testを追加する。原因未確認のままHook挙動を変更しない。

## 2. 現状理解

### 2.1 既存contract test

現在の `tests/contracts/codex-hook-contract.test.ts` は既にprocess境界で広い契約を検証している。

主な対象:

- `pre_tool_use_policy.mjs`
  - stdin / stdout / stderr / exit code
  - malformed input
  - allow / deny
  - Git command policy
  - Windows launcher
  - repository root / Node Hook解決失敗
  - timeout
- `session_start_context.mjs`
  - compact時のroot `AGENTS.md`再注入
  - compact以外
  - malformed input
  - repository root解決失敗
  - `AGENTS.md`欠落 / read失敗
  - Unix / Windows configured launcher
  - launcher failure
- `log_event.mjs`
  - 5種類のlogging event
  - malformed JSON / event mismatch
  - bounded preview
  - credential redaction
  - fallback log path
  - concurrent append
  - Unix / Windows configured launcher

既存テストを別directoryへ複製しない。

### 2.2 text quality Hook

`tests/contracts/codex-text-quality.test.ts` は既に次をCodexなしで検証している。

- `UserPromptSubmit` baseline作成
- `PostToolUse`
- `Stop`
- configured Unix / Windows launcher
- state lifecycle
- corrupt state
- root / session identity mismatch
- baseline unavailable
- rename / worktree / start HEAD契約
- launcher failure
- active Stop cleanup
- secret / payload非漏えい

現在の `text_quality_gate.mjs` には少なくとも次のquality-unavailable診断コードがある。

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

今回の実装では、この一覧とcontract testの対応表を作り、既存testで再現済みのものを重複追加しない。未検証のコードだけ回帰testを追加する。

### 2.3 CI

`.github/workflows/ci.yml` には既にWindows専用jobがある。

```text
Codex Hook contract (Windows)
```

このjobは次を実行している。

```text
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts
```

Ubuntu側の `test:contracts` にも既存contractが含まれる。

今回、同じテストを別CI jobとして重複実行することは目的にしない。新しいcontract testを追加した場合は既存のHook focused jobと通常contractsのどちらへ含めるかを確認し、必要最小限の変更だけ行う。

### 2.4 `baseline_state` の問題

現行Hookでは複数のstate読込・整合性エラーが `baseline_state` に集約されるため、Codex UI上の次の表示だけでは原因を特定できない。

```text
Codex text quality hook: quality check unavailable (baseline_state)
```

production Hookの表示を細分化することを先に行わない。

まずRepository外部から次を確認できるdiagnostic commandを追加する。

- state directoryの存在
- state file名の形式
- JSON parse可否
- schema version
- repository root identity
- status
- start HEAD
- manifest構造
- path安全性
- 必要な場合のsession hash照合可否

診断で十分に原因を特定できない場合のみ、production出力を変えずに共有validatorを抽出するなど、重複検証を避ける最小refactorを検討する。

### 2.5 Host / session bindingとの境界

Repositoryだけでは、Codex Hostがsession開始時にどのproject / `.codex/config.toml`を読み込んだかを完全には確認できない。

したがって次を分離する。

Codexなしで確認する範囲:

```text
Repository config
  -> configured launcher
  -> Hook process
  -> synthetic stdin
  -> state / side effect
  -> structured output
```

Codex実起動が必要な範囲:

```text
Host / session
  -> project binding
  -> 実際に選択された .codex/config.toml
  -> Host timeout / UI表示
```

`diagnose:hooks` が成功してもHost bindingの正しさを証明したとは扱わない。

## 3. 実装範囲

### 3.1 変更候補

```text
package.json
scripts/diagnose-codex-hooks.ts
tests/contracts/codex-hook-diagnostics.test.ts
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts
docs/reference/codex-safety-harness.md
```

必要なファイルだけ変更する。

`tests/contracts/codex-hook-contract.test.ts` と `tests/contracts/codex-text-quality.test.ts` で十分な場合、診断専用contract fileを無理に作らない。

### 3.2 原則変更しない範囲

- Product code
- Playwright / application test
- Skill / Agent routing
- `.codex/config.toml` のHook semantics
- `pre_tool_use_policy.mjs` のpolicy
- `log_event.mjs` のlogging semantics
- `session_start_context.mjs` のcompact契約
- `text_quality_gate.mjs` のfail-open / fail-close契約
- text quality rule構成
- baseline schema v2
- Git rename判定
- CI比較基準
- Host / Codex本体
- 新しいHook framework
- 新しいstate manager
- 新しいTOML parser
- 新しい依存関係

Repository側の再現可能な不具合を確認した場合は、上記Hook本体のうち原因箇所だけを変更対象へ昇格させる。

## 4. 変更方針

### Task 1: 現在のHook契約を棚卸しする

- [ ] `.codex/config.toml` を `smol-toml` でparseし、登録event、matcher、`command`、`command_windows`、timeoutを一覧化する。
- [ ] 各configured commandが指すHook scriptと既存contract testを対応付ける。
- [ ] `codex-hook-contract.test.ts` と `codex-text-quality.test.ts` の既存caseを、Hook event / launcher / failure path単位で整理する。
- [ ] 既に検証済みのcaseを追加し直さない。

### Task 2: `test:hooks` のfocused入口を追加する

`package.json` にCodex Hookだけを実行する明示commandを追加する。

想定:

```json
{
  "test:hooks": "vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts tests/contracts/codex-hook-diagnostics.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000"
}
```

実装時にdiagnostic専用test fileが不要なら、そのfileはcommandへ含めない。

このscriptは既存contractの別実装ではなく、focused実行の入口だけを提供する。

### Task 3: 全Hookの異常系contract不足を埋める

- [ ] `PreToolUse` の既存failure contractを確認する。
- [ ] `SessionStart` の既存failure contractを確認する。
- [ ] logging Hookの既存failure contractを確認する。
- [ ] text quality Hookの19診断コードについて「既存test / 追加test / process上到達不能」を分類する。
- [ ] 到達可能で未検証の診断コードだけfixtureを追加する。
- [ ] public Hook出力、exit code、state lifecycle、secret非漏えいをassertする。
- [ ] source文字列をgrepしてテスト数だけを合わせるような脆いcoverage判定は追加しない。

diagnostic codeを無理に発生させるためproduction codeへtest-only分岐を追加しない。

### Task 4: 読み取り専用 `diagnose:hooks` を追加する

想定entry point:

```text
scripts/diagnose-codex-hooks.ts
pnpm run diagnose:hooks
```

診断内容:

1. Git repository root解決
2. `.codex/config.toml` parse
3. configured Hook event一覧
4. configured script path存在確認
5. 現在platformで必要なlauncher / runtime確認
6. `.artifacts/codex-text-quality` state directory確認
7. 各state fileの構造検証
8. repository root identity照合
9. start HEAD形式とGit object存在確認
10. manifest / relative path安全性確認
11. logging recordからsession identityを安全に照合できる場合だけhash比較
12. Host側でのみ確認可能な項目を「未確認」として明示

出力例:

```text
Codex Hook diagnosis

config.toml              OK
configured hooks         OK
Unix launcher            OK
Windows launcher         N/A

text quality state
  state files            1
  JSON                   OK
  schema_version         2
  root identity          OK
  session identity       未確認
  start HEAD             OK
  manifest               OK

Host project binding     未確認（Codex実起動が必要）
```

### Task 5: diagnostic commandを読み取り専用に固定する

- [ ] Git indexを変更しない。
- [ ] worktreeを変更しない。
- [ ] state fileを作成・更新・削除しない。
- [ ] logging fileへ追記しない。
- [ ] production Hookへ `UserPromptSubmit` / active `Stop` payloadを現在Repository上で直接流さない。
- [ ] subprocessが必要な検証はtemp fixtureまたは既存contract testへ委譲する。
- [ ] diagnostic command実行前後のtracked / untracked差分が変わらないことをcontract testで確認する。

### Task 6: state検証ロジックの重複を避ける

`diagnose:hooks` がtext quality state schemaを独自に再実装すると、Hook本体と診断結果がずれる。

実装時は次の順で判断する。

1. 現行Hookから変更せず、安全に再利用できるpure validatorが既にあるか確認する。
2. 無ければ、診断に必要な最小validationだけで十分か確認する。
3. Hookと完全に同じschema判定が必要な場合だけ、state parse / validationのpure部分を共有moduleへ抽出する。

共有module化する場合も、baseline生成、Git差分取得、Hook output、cleanup、launcher処理までは移動しない。

### Task 7: 現在の `baseline_state` を切り分ける

実装後、問題が発生した同一PC / RepositoryでCodexを起動せず次を実行する。

```bash
pnpm run diagnose:hooks
pnpm run test:hooks
```

判断:

- state破損やschema不一致等を検出した場合:
  - 再現fixtureを追加する。
  - 最初に不正stateが作られた処理経路を確認する。
  - Repository実装の不具合なら原因箇所だけ修正する。
- `diagnose:hooks` / `test:hooks` が全PASSし、Codex実行時だけ別Repository configを参照する場合:
  - Repository側を変更しない。
  - Host / session project binding問題として分離する。

### Task 8: 運用ドキュメントを更新する

`docs/reference/codex-safety-harness.md` へ必要最小限を追記する。

記載内容:

- Hook contractだけ確認するcommand
- 現在Repositoryを診断するcommand
- `baseline_state` 発生時の実行順
- offline診断で確認できる範囲
- Host / session bindingはoffline診断対象外であること

## 5. 検証方法

### focused

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

### 既存contract

```bash
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000
```

diagnostic専用testを追加した場合は同時に実行する。

### Repository標準検証

```bash
pnpm run test:contracts
pnpm run lint:text
pnpm run lint:text:all
pnpm run lint:markdown
pnpm run typecheck
git diff --check
```

変更範囲に応じて `pnpm run verify` も実行する。

### Windows

既存 `Codex Hook contract (Windows)` と同条件でfocused contractを確認する。

Issue #159で確認済みのlauncher累積時間問題を再導入しない。単純にtimeoutを短くしたり、test caseを削減したりしない。

### 読み取り専用保証

fixture Repositoryで `diagnose:hooks` 実行前後を比較し、少なくとも次が不変であることを確認する。

- tracked file content
- Git index
- untracked file一覧
- state file content / mtime
- Hook log content / mtime

時刻精度差があるfilesystemではmtimeだけに依存せず、内容とfile集合も比較する。

## 6. 成功判定

実装完了は次をすべて満たした場合とする。

- Codex未起動で `pnpm run test:hooks` がHook process契約を検証できる。
- Codex未起動で `pnpm run diagnose:hooks` がRepositoryのHook設定・stateを診断できる。
- `baseline_state` の代表原因をsynthetic fixtureで再現できる。
- text quality Hookの19診断コードに対するcontract coverage状況が明確になっている。
- 既存Hookのsemanticsを不要に変更していない。
- diagnostic commandがRepositoryを変更しない。
- secret / prompt / raw payload / raw session IDを診断出力へ出さない。
- Ubuntu / Windowsの既存Hook contractが成功する。
- Host project bindingはRepository診断と分離されている。

## 7. リスクと未解決論点

### リスク

- state validationをdiagnostic scriptへ複製すると、将来Hook本体と判定がずれる。
- current Repository上でHookを直接実行するとbaseline作成やcleanup等の副作用が起きる。
- session IDやHook payloadを診断表示すると情報漏えいになる。
- Windows launcherを全caseで追加実行するとIssue #159と同様にcontract時間が増える。
- 「全Hookエラー」をsource上の例外すべてと解釈すると、内部例外や到達不能pathまでtest-only API化する過剰実装になり得る。

### 方針

- 外部から観測可能なHook契約とstable diagnostic codeを優先する。
- 内部exceptionを網羅するためだけのproduction APIは追加しない。
- 既存contractで同じ故障を検出できる場合は追加testを作らない。
- Host / Codex本体のproject bindingはRepository testで成功扱いにしない。

### 未解決論点

- state schema validationのpure部分を共有moduleへ抽出する必要があるかは実装時に現行関数境界を確認して決める。
- session identity照合は、既存logging recordから安全に対応付けられる場合だけ実装する。対応付け不能をfailureにはしない。
- 現在発生している `baseline_state` の直接原因は、local stateを `diagnose:hooks` で確認するまで確定しない。

## 8. 成果物

実装時の想定成果物:

```text
package.json
scripts/diagnose-codex-hooks.ts
tests/contracts/codex-hook-diagnostics.test.ts  # 必要な場合
tests/contracts/codex-hook-contract.test.ts      # coverage不足分のみ
tests/contracts/codex-text-quality.test.ts       # coverage不足分のみ
docs/reference/codex-safety-harness.md
```

Repository側の実不具合が確認された場合のみ、原因となるHook実装を追加変更する。

## 9. 対象外

- Codex Hostの修正
- Codex sessionのproject binding実装
- Hook UIの変更
- Hookの新規retry
- state recoveryの自動修復
- corrupt stateの自動削除
- logging拡張
- 新しいHook event
- Hook policy変更
- text quality rule追加
- CI jobの不要な新設
- 新規dependency
- Hook test専用framework

## 10. 備考

- このPlan作成ではbranch作成とPlan追加だけを行う。
- 実装、PR作成、merge、Issue作成・close、force push、branch削除は行わない。
- 既存Issue #134 / PR #146で確立したHook contractを正本として扱い、今回の診断機能のために同じ責務を作り直さない。
