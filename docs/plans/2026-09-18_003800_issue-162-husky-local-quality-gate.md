# Issue #162 Huskyローカル品質ゲート導入 Plan

## 0. 依頼概要

- 対象Issue: #162 `chore: Huskyを導入してローカル品質ゲートを追加する`
- 対象branch: `issue-162-husky-local-quality-gate`
- base branch: `main`
- 依頼内容: Huskyを導入し、commit前に既存の軽量な品質確認を実行するローカルGit hookを追加するための実装Planを作成する。
- 背景: `pnpm run verify`はcommitごとに実行するには重いため、CIを置き換えず、commit前に価値の高い既存scriptだけを実行する。
- 期待成果: 通常の`pnpm install`後にHuskyの`pre-commit`が有効になり、品質ゲート失敗時はcommitを止める。既存CIや依存更新workflowには副作用を持ち込まない。

## 1. ゴール / 完了条件

### ゴール

既存のpnpm構成と品質scriptを再利用して、Windows / macOSの開発環境で利用できるHusky `pre-commit`を追加する。GitHub ActionsではHuskyを実行せず、既存CIの責務と実行時間を変えない。

### 完了条件（DoD）

- HuskyがdevDependencyとして追加され、`pnpm-lock.yaml`がpnpm 9.10.0で整合している。
- `package.json`に`"prepare": "husky"`が追加され、clone後の通常の`pnpm install`でHookが有効になる。
- `.husky/pre-commit`が次の既存scriptをこの順で実行する。
  1. `pnpm run format:check`
  2. `pnpm run lint`
  3. `pnpm run security:check`
- `pnpm run verify`全体を`pre-commit`から実行しない。
- `lint-staged`などの追加依存を導入しない。
- Hook内のいずれかの品質ゲートが失敗した場合、Hookが非0で終了しcommitが停止する。
- Hook成功時はcommitを阻害しない。
- Windows / macOSで解釈できるPOSIX互換のHookにし、改行はRepositoryの`.gitattributes`どおりLFを維持する。
- GitHub Actionsで`prepare`を実行するinstall経路は`HUSKY=0`でHook設定を無効化する。
- `--ignore-scripts`を使用している既存CI installは、そのまま維持する。
- 関連するcontract testがHusky設定とCI境界を検証する。
- `pnpm run verify`と対象CIが退行しない。

## 2. 現状理解と前提

### 現状理解

- `package.json`は`packageManager: pnpm@9.10.0`で、`prepare`と`husky`は未定義。
- `package.json`には`format:check`、`lint`、`security:check`、およびそれらを含む`verify`が既に存在する。新しい品質処理を実装する必要はない。
- Repository rootに`.husky/`は存在しない。
- `.gitattributes`は`* text=auto eol=lf`を指定している。
- `scripts/security-static-check.ts`は`src`、`app`、`config`、`public`、`scripts`、`.github`、存在する場合は`dist`を走査するRepository-wide checkである。
- `.github/workflows/ci.yml`と`.github/workflows/cross-browser-smoke.yml`の依存installは`pnpm install --frozen-lockfile --ignore-scripts`を使用しており、`prepare`は実行されない。
- `.github/workflows/native-ci.yml`には`--ignore-scripts`なしの`pnpm install --frozen-lockfile`が複数ある。
- `.github/workflows/native-ios-ci.yml`には`--ignore-scripts`なしの`pnpm install --frozen-lockfile`がある。
- `.github/workflows/expo-dependency-maintenance.yml`は`--ignore-scripts`なしでinstallし、その後automation branchで`git commit`も実行する。このworkflowでHuskyを有効にすると、依存更新botのcommit時にも`pre-commit`が実行される。
- Husky公式手順ではpnpm利用時に`prepare: husky`を設定でき、CIでHookをインストールしない場合は`HUSKY=0`を使用する。HookはWindows互換性を保つためPOSIX互換のshell記述にする。
- 2026-09-18時点のnpm `latest`はHusky 9.1.7。

### 前提

- 初期実装ではIssue #162に記載された3 scriptをそのまま採用する。
- 3 scriptの実行時間は実装時に実測するが、数値基準がIssueで定義されていないため、このPlanでは実測前に任意のscriptを削らない。
- 実測でcommit操作への明確な支障が確認された場合は、scriptを黙って外さず、実測結果と見直し理由を記録して再判断する。
- Husky専用wrapperや独自runnerは追加しない。既存pnpm scriptをHookから直接呼ぶ。

### 対象外

- OpenCode Zenの導入。
- Dependabot Security Alertの調査・修正自動化。
- GitHub Actionsによるセキュリティ修正自動化。
- `pnpm run verify`全体の`pre-commit`実行。
- `lint-staged`など、必要性が実証されていない追加依存。
- staged fileだけに品質確認範囲を変更すること。
- 既存`format:check`、`lint`、`security:check`自体の高速化や仕様変更。
- GUI Git clientやNode version manager固有のPATH対策。実際の不具合が確認された場合に別途扱う。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- 現時点でblockingな質問はない。Issue #162で初期候補、対象外、CIとの責務分離まで定義されている。

### 仮定してよい細部

- Huskyは現行latestの9.1.7を使用する。
- Hookは追加のshell制御を書かず、3つの`pnpm run`を順番に記述する。
- CIではRepository全体の共通`prepare`を複雑化せず、通常installを行うworkflow側で`HUSKY=0`を設定する。

### 未回答の重要質問

- なし。

## 4. 影響範囲

### 変更対象

- `package.json`
  - `devDependencies`へHuskyを追加する。
  - `scripts.prepare`へ`husky`を追加する。
- `pnpm-lock.yaml`
  - Husky追加をpnpm 9.10.0で反映する。
- `.husky/pre-commit`
  - 3つの既存品質scriptを順番に実行する。
- `.github/workflows/native-ci.yml`
  - `--ignore-scripts`なしのinstallでHuskyを有効化しないよう`HUSKY=0`を設定する。
- `.github/workflows/native-ios-ci.yml`
  - 同上。
- `.github/workflows/expo-dependency-maintenance.yml`
  - 同上。特にworkflow内の`git commit`でlocal `pre-commit`が発火しないことを保証する。
- `tests/contracts/husky-config.test.ts`
  - Husky設定、Hook内容、CI境界をRepository contractとして検証する。

### 確認対象だが原則変更しないファイル

- `.github/workflows/ci.yml`
  - `--ignore-scripts`を維持する。
- `.github/workflows/cross-browser-smoke.yml`
  - `--ignore-scripts`を維持する。
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `scripts/security-static-check.ts`
- `.gitattributes`

## 5. 変更方針

### 方針1: Huskyだけを追加し、既存品質scriptを再利用する

- `pnpm add --save-dev husky@9.1.7`相当で依存関係を追加する。
- `package.json`へ`"prepare": "husky"`を追加する。
- `pnpm exec husky init`で生成される構成を参考にするが、最終的な`.husky/pre-commit`はIssue #162の3 scriptだけにする。
- Husky v9で不要な旧形式の`husky.sh`読み込みや独自wrapperを追加しない。

### 方針2: `pre-commit`は単純な直列実行にする

`.husky/pre-commit`は次の責務だけを持つ。

```sh
pnpm run format:check
pnpm run lint
pnpm run security:check
```

- `verify`、test、build、typecheckは追加しない。
- staged file選別や独自の差分解析は追加しない。
- HuskyのHook実行側が非0終了をcommitへ返す契約を利用し、独自のエラー集約処理は追加しない。

### 方針3: CIではHuskyを明示的に無効化する

- `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`.github/workflows/expo-dependency-maintenance.yml`のworkflow-level `env`へ`HUSKY: "0"`を追加する。
- `.github/workflows/ci.yml`と`.github/workflows/cross-browser-smoke.yml`は`--ignore-scripts`を使用しているため変更しない。
- `prepare`を`husky || true`にして失敗を握りつぶす方法は採用しない。CIかローカルかを明確に分け、ローカル通常installでHusky設定失敗を見逃さない。

### 方針4: Repository contractで設定退行を検出する

`tests/contracts/husky-config.test.ts`を追加し、少なくとも次を検証する。

- `package.json`の`prepare`が`husky`である。
- `devDependencies.husky`が期待する9.1.7系を指す。
- `.husky/pre-commit`に3 scriptが指定順で存在する。
- `pre-commit`に`pnpm run verify`が存在しない。
- `lint-staged`を要求する設定が追加されていない。
- `.github/workflows/`を列挙し、`pnpm install`を含み`--ignore-scripts`を使わないworkflowは`HUSKY: "0"`を持つ。
- `--ignore-scripts`を使用するworkflowへ不要な変更を要求しない。

新しいYAML parserやテスト専用依存は追加せず、既存Node標準ライブラリとVitestで実装する。

### 実行タスク

- [ ] 1. 作業開始時にIssue #162、`package.json`、`pnpm-lock.yaml`、`.github/workflows/*.yml`、既存contract testを再確認し、mainとの差分が増えていないことを確認する。
- [ ] 2. Husky 9.1.7をdevDependencyへ追加し、pnpm 9.10.0でlockfileを更新する。
- [ ] 3. `package.json`へ`prepare: husky`を追加する。
- [ ] 4. `.husky/pre-commit`へ`format:check`、`lint`、`security:check`を指定順で追加する。
- [ ] 5. `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`で`HUSKY=0`を設定し、CI installやautomation commitからHook実行を切り離す。
- [ ] 6. `tests/contracts/husky-config.test.ts`を追加して設定とCI境界を固定する。
- [ ] 7. 3つの候補scriptを個別・連続で実測し、Run Artifactへ結果を記録する。実測前にscriptを削らない。
- [ ] 8. 通常install後にHuskyが有効化され、成功Hookが非0にならないことを確認する。
- [ ] 9. Hook内コマンドの失敗がHookの非0終了として伝播し、commitを許可しないことを安全な一時環境で確認する。
- [ ] 10. contract test、品質script、`pnpm run verify`を実行する。
- [ ] 11. PR CIでWeb CI / Mobile App CIおよび関連workflow contractが退行していないことを確認する。

## 6. 検証方法

### 依存・設定

- `pnpm install --frozen-lockfile`
  - 通常installで`prepare`が成功する。
  - install後にHuskyのGit Hook pathが設定される。
- `pnpm run prepare`
  - ローカルGit Repository上で正常終了する。
- `git config --get core.hooksPath`
  - Huskyが設定したHook pathを確認する。

### Hook内容

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run security:check`
- `git hook run pre-commit`
  - cleanな状態で成功する。
  - 3 scriptが指定順で実行されることを出力で確認する。

失敗伝播の確認ではRepositoryの既存ファイルを意図的に壊してcommitしない。必要なら一時PATH上の`pnpm` shimなど、Repository差分を残さない方法でHookコマンドを非0にし、`git hook run pre-commit`が非0を返すことを確認する。

### 実行時間

- `format:check`、`lint`、`security:check`を同一環境で複数回計測する。
- 3 script連続実行の実測時間も記録する。
- `security:check`は存在する`dist`も走査対象に含むため、計測時のRepository状態を記録する。
- 実測結果だけを理由に新しい依存やstaged-file処理を追加しない。

### contract test

- `pnpm exec vitest run tests/contracts/husky-config.test.ts --no-file-parallelism --maxWorkers=1`
- `pnpm run test:contracts`

### Repository標準ゲート

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run security:check`
- `pnpm run verify`

### CI

- Web CIで`--ignore-scripts` installが従来どおり動く。
- Mobile App CI / iOS CIで通常install時に`HUSKY=0`が有効になり、Husky Hook設定がCIへ持ち込まれない。
- Expo Dependency Maintenanceのcontract testで、Husky導入後もautomation branchの`git commit`がRepositoryのlocal `pre-commit`に依存しない構成を確認する。

### 成功判定

- 上記検証がすべてPASSする。
- Hook失敗時の非0伝播を確認できる。
- CIで`prepare`由来の失敗や意図しない`pre-commit`実行がない。
- 追加依存はHuskyだけで、Issue対象外の変更がない。

## 7. リスクと未解決論点

### リスク

1. **CIで`prepare`が実行される**
   - `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`は`--ignore-scripts`を使用していない。
   - 対応: workflow-level `HUSKY=0`で明示的に無効化する。

2. **Expo Dependency Maintenanceのautomation commitにHookが割り込む**
   - workflow内で`git commit`を行うため、Husky有効化後はlocal Hookが実行されうる。
   - 対応: 同workflowでも`HUSKY=0`を設定する。

3. **Repository-wide checkによるcommit待ち時間増加**
   - 3 scriptはstaged file限定ではなくRepository全体を確認する。
   - 対応: 実装時に個別・合計時間を実測する。現時点ではIssueの初期候補を維持し、計測前に`lint-staged`等へ広げない。

4. **Windowsでshell固有記法が壊れる**
   - 対応: Hookは3行の`pnpm run`だけにし、Bash固有構文を使用しない。LFを維持する。

5. **ローカルNode / pnpmがPATHにないGUI client**
   - Husky公式にもNode version managerとGUI clientのPATH差が記載されている。
   - 対応: Issue #162では個別環境のinit scriptまで追加しない。実際に再現した場合に別途扱う。

### 未解決の質問

- なし。3 scriptの実行時間は実装時の観測事項であり、現時点のPlanを止める質問ではない。

## 8. 成果物

### 実装時の変更予定ファイル

- `package.json`
- `pnpm-lock.yaml`
- `.husky/pre-commit`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/husky-config.test.ts`

### 付随ドキュメント

- 追加の永続レポートは作成しない。
- 実測値、検証結果、実装中に判明した事実はactive Run Artifactへ記録する。

## 9. 備考

- このPlanはIssue #162だけを対象とし、OpenCode / Dependabot対応は別Issueとして扱う。
- `package.json`の既存品質scriptを正本とし、Hook専用の重複scriptや共通wrapperは作らない。
- 実装中にIssueの前提と異なる既存変更が見つかった場合は、変更範囲を広げる前に原因と影響を確認する。
