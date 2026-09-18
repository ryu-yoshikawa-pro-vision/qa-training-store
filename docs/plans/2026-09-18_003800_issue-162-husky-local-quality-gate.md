# Issue #162 Huskyローカル品質ゲート導入 Plan

## 0. 依頼概要

- 対象Issue: #162 `chore: Huskyを導入してローカル品質ゲートを追加する`
- 対象branch: `issue-162-husky-local-quality-gate`
- base branch: `main`
- 依頼内容: Huskyを導入し、commit前に既存の軽量な品質確認を実行するローカルGit hookを追加する。
- 背景: `pnpm run verify`はcommitごとに実行するには重いため、CIを置き換えず、commit前に価値の高い既存scriptだけを実行する。
- 期待成果: 通常の`pnpm install`後にHuskyの`pre-commit`が有効になり、品質ゲート失敗時はcommitを止める。既存CIや依存更新workflowを壊さない。

## 1. ゴール / 完了条件

### ゴール

既存のpnpm構成と品質scriptを再利用して、Windows / macOSの開発環境で利用できるHusky `pre-commit`を追加する。GitHub ActionsではHuskyを無効化し、CIの代替にはしない。

### 完了条件（DoD）

- HuskyがdevDependencyとして追加され、`pnpm-lock.yaml`がpnpm 9.10.0で整合している。
- `package.json`に`"prepare": "husky"`が追加され、clone後の通常の`pnpm install`でHookが有効になる。
- 初期候補として次の3 scriptを実測し、commit前の品質ゲートとして実用上問題がないか確認する。
  1. `pnpm run format:check`
  2. `pnpm run lint`
  3. `pnpm run security:check`
- 実測で明確な待ち時間の問題が確認されなければ、`.husky/pre-commit`で上記3 scriptをこの順で実行する。
- 実測で通常のcommit操作を阻害する負荷が確認された場合は、scriptを勝手に削除せず、実測結果を提示して最終構成を再判断する。
- `pnpm run verify`全体を`pre-commit`から実行しない。
- `lint-staged`など、Issueで必要性が確認されていない追加依存を導入しない。
- 実際の`git commit`経路で、品質ゲート失敗時にcommitが作成されず、成功時にはcommitできることを一時cloneで確認する。
- HookはWindows / macOSで解釈できるPOSIX互換の記述にし、改行はRepositoryの`.gitattributes`どおりLFを維持する。
- GitHub Actionsで`prepare`が実行されるinstall経路は`HUSKY=0`でHuskyを無効化する。
- `--ignore-scripts`を使用している既存GitHub Actions installはそのまま維持する。
- Husky設定と変更したGitHub Actionsの契約を既存のcontract test構成に沿って検証する。
- `pnpm run verify`と対象CIが退行しない。

## 2. 現状理解と前提

### 現状理解

- `package.json`は`packageManager: pnpm@9.10.0`で、`prepare`と`husky`は未定義。
- `package.json`には`format:check`、`lint`、`security:check`、およびそれらを含む`verify`が既に存在する。Hook専用の品質処理を新規実装する必要はない。
- Repository rootに`.husky/`は存在しない。
- `.gitattributes`は`* text=auto eol=lf`を指定している。
- `scripts/security-static-check.ts`はRepository-wide checkであり、`dist`が存在する場合は走査対象に含む。
- `.github/workflows/ci.yml`と`.github/workflows/cross-browser-smoke.yml`の依存installは`pnpm install --frozen-lockfile --ignore-scripts`を使用しており、`prepare`は実行されない。
- `.github/workflows/native-ci.yml`には`--ignore-scripts`なしの`pnpm install --frozen-lockfile`が複数ある。
- `.github/workflows/native-ios-ci.yml`にも`--ignore-scripts`なしの`pnpm install --frozen-lockfile`がある。
- `.github/workflows/expo-dependency-maintenance.yml`は`--ignore-scripts`なしでinstallし、その後automation branchで`git commit`も実行する。Huskyを有効にしたままにするとautomation commitへ`pre-commit`が割り込む。
- `tests/contracts/native-ci-workflow.test.ts`はNative CIとiOS CIのworkflow契約を検証している。
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`はExpo Dependency Maintenanceのworkflow契約を検証している。
- Husky公式手順ではpnpm利用時に`prepare: husky`を設定でき、CIでHookをインストールしない場合は`HUSKY=0`を使用する。
- 2026-09-18時点のnpm `latest`はHusky 9.1.7。

### 前提

- 初期候補はIssue #162に記載された`format:check`、`lint`、`security:check`とする。
- IssueやRepositoryには許容時間の数値基準がないため、Plan独自の秒数閾値は設けない。
- 実行時間は複数回計測し、各scriptと合計の待ち時間を記録する。通常のcommitごとに待つには実用上問題がある結果が出た場合だけ、最終Hook構成を再判断する。
- Husky専用wrapperや独自runnerは追加しない。既存pnpm scriptをHookから直接呼ぶ。
- EAS Buildは確認対象には含めるが、Husky起因の具体的な問題が確認されない限り、このIssueでは`eas.json`やEAS contractを変更しない。

### 対象外

- OpenCode Zenの導入。
- Dependabot Security Alertの調査・修正自動化。
- GitHub Actionsによるセキュリティ修正自動化。
- `pnpm run verify`全体の`pre-commit`実行。
- `lint-staged`など、必要性が実証されていない追加依存。
- staged fileだけに品質確認範囲を変更すること。
- 既存`format:check`、`lint`、`security:check`自体の高速化や仕様変更。
- GUI Git clientやNode version manager固有のPATH対策。実際に不具合が確認された場合に別途扱う。
- Husky起因の問題が確認されていないEAS Build設定の変更。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- 現時点でblockingな質問はない。
- 実測でcommit操作への明確な支障が確認された場合だけ、Hookから何を外すかを決める前に実測結果を提示して再判断する。

### 仮定してよい細部

- Huskyは現行latestの9.1.7を使用する。
- Hookは追加のshell制御を書かず、確定した`pnpm run`を順番に記述する。
- GitHub ActionsではRepository全体の`prepare`を複雑化せず、通常installを行うworkflow側で`HUSKY=0`を設定する。

### 未回答の重要質問

- なし。実行時間は実装時に確認する観測事項であり、現時点ではPlanを止めない。

## 4. 影響範囲

### 変更対象

- `package.json`
  - `devDependencies`へHuskyを追加する。
  - `scripts.prepare`へ`husky`を追加する。
- `pnpm-lock.yaml`
  - Husky追加をpnpm 9.10.0で反映する。
- `.husky/pre-commit`
  - 実測後に確定した既存品質scriptを順番に実行する。
- `.github/workflows/native-ci.yml`
  - `--ignore-scripts`なしのinstallでHuskyを有効化しないよう`HUSKY=0`を設定する。
- `.github/workflows/native-ios-ci.yml`
  - 同上。
- `.github/workflows/expo-dependency-maintenance.yml`
  - 同上。workflow内のautomation commitでRepositoryのlocal `pre-commit`を実行しないようにする。
- `tests/contracts/husky-config.test.ts`
  - `package.json`と`.husky/pre-commit`のHusky契約を検証する。
- `tests/contracts/native-ci-workflow.test.ts`
  - Native CI / iOS CIで`HUSKY=0`が維持されることを検証する。
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
  - Expo Dependency Maintenanceで`HUSKY=0`が維持されることを検証する。

### 確認対象だが原則変更しないファイル

- `.github/workflows/ci.yml`
  - `--ignore-scripts`を維持する。
- `.github/workflows/cross-browser-smoke.yml`
  - `--ignore-scripts`を維持する。
- `eas.json`
- `.eas/workflows/phase2-native-foundation.yml`
  - Husky導入による具体的な問題がないことだけ確認し、問題がなければ変更しない。
- `tests/contracts/ci-workflow.test.ts`
- `scripts/security-static-check.ts`
- `.gitattributes`

## 5. 変更方針

### 方針1: Huskyだけを追加し、既存品質scriptを再利用する

- `pnpm add --save-dev husky@9.1.7`相当で依存関係を追加する。
- `package.json`へ`"prepare": "husky"`を追加する。
- `pnpm exec husky init`で生成される構成を参考にするが、最終的な`.husky/pre-commit`はIssue #162の品質scriptだけにする。
- Husky v9で不要な旧形式の`husky.sh`読み込みや独自wrapperを追加しない。
- `.husky/_`配下などHuskyが生成する内部ファイルを意図せず変更対象へ含めない。

### 方針2: 初期候補3 scriptの実行時間を確認する

- `format:check`、`lint`、`security:check`を同一環境で複数回計測する。
- 各scriptと3 script連続実行の時間を記録する。
- `security:check`は`dist`有無で走査範囲が変わるため、計測時のRepository状態も記録する。
- Plan独自の秒数閾値は設けない。
- 明確な待ち時間の問題が確認されなければ、Issueの初期候補3つをそのまま採用する。
- 通常のcommitごとに待つには実用上問題がある結果が出た場合は、script削除、`lint-staged`追加、既存script変更を自動で行わず、実測結果を提示して再判断する。

初期候補を採用する場合の`.husky/pre-commit`は次の3行だけにする。

```sh
pnpm run format:check
pnpm run lint
pnpm run security:check
```

- `verify`、test、build、typecheckは追加しない。
- staged file選別や独自の差分解析は追加しない。
- HuskyとGitの非0終了伝播を利用し、独自のエラー集約処理は追加しない。

### 方針3: GitHub ActionsではHuskyを明示的に無効化する

- `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`.github/workflows/expo-dependency-maintenance.yml`のworkflow-level `env`へ`HUSKY: "0"`を追加する。
- `.github/workflows/ci.yml`と`.github/workflows/cross-browser-smoke.yml`は`--ignore-scripts`を使用しているため変更しない。
- `prepare`を`husky || true`にして失敗を握りつぶす方法は採用しない。ローカル通常installでHusky設定失敗を見逃さず、CI側だけを明示的に無効化する。

### 方針4: 既存contract testの責務に沿って回帰を検出する

`tests/contracts/husky-config.test.ts`はHusky自体の設定だけを検証する。

- `package.json`の`prepare`が`husky`である。
- `devDependencies.husky`が期待する9.1.7を指す。
- `.husky/pre-commit`に確定した品質scriptが指定順で存在する。
- `pre-commit`に`pnpm run verify`が存在しない。
- `lint-staged`が追加されていない。

GitHub Actionsの`HUSKY=0`は既存のworkflow contract testへ追加する。

- `tests/contracts/native-ci-workflow.test.ts`
  - `.github/workflows/native-ci.yml`と`.github/workflows/native-ios-ci.yml`で`HUSKY=0`を確認する。
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
  - `.github/workflows/expo-dependency-maintenance.yml`で`HUSKY=0`を確認する。

`.github/workflows/`全体を列挙して将来の全workflowへHusky固有ルールを強制する新しい共通契約は作らない。

### 方針5: Hookの実動作は一時cloneで実際の`git commit`を使って確認する

- Repository本体の履歴を検証用commitで汚さないため、一時directoryへ対象branchをcloneして確認する。
- clone後に通常の`pnpm install --frozen-lockfile`を行い、`prepare`によってHuskyが設定されることを確認する。
- 正常系では`git commit --allow-empty`を実行し、commit成功とHEAD更新を確認する。
- 異常系では一時clone内だけで品質scriptを失敗させ、`git commit`が非0となりHEADが変わらないことを確認する。
- `git hook run pre-commit`は補助診断には使えるが、Issueのcommit停止条件の主証跡にはしない。

### 実行タスク

- [ ] 1. 作業開始時にIssue #162、`package.json`、`pnpm-lock.yaml`、`.github/workflows/*.yml`、既存contract testを再確認し、mainとの差分が増えていないことを確認する。
- [ ] 2. 初期候補3 scriptと連続実行の時間を複数回計測し、commit前の品質ゲートとして実用上問題がないか確認する。
- [ ] 3. 明確な待ち時間の問題が確認された場合だけ実測結果を提示し、Hook構成を再判断する。問題がなければ3 script採用で続行する。
- [ ] 4. Husky 9.1.7をdevDependencyへ追加し、pnpm 9.10.0でlockfileを更新する。
- [ ] 5. `package.json`へ`prepare: husky`を追加する。
- [ ] 6. `.husky/pre-commit`へ確定した品質scriptを指定順で追加する。
- [ ] 7. `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`へ`HUSKY=0`を追加する。
- [ ] 8. `tests/contracts/husky-config.test.ts`を追加し、Husky自体の設定を固定する。
- [ ] 9. `tests/contracts/native-ci-workflow.test.ts`と`tests/contracts/expo-dependency-maintenance-workflow.test.ts`へ、変更したworkflowの`HUSKY=0`契約を追加する。
- [ ] 10. EAS Build設定を確認し、Husky起因の具体的な問題がない場合は変更しない。
- [ ] 11. 一時cloneで通常install後にHuskyが有効化されることを確認する。
- [ ] 12. 一時cloneで正常な`git commit --allow-empty`が成功し、HEADが更新されることを確認する。
- [ ] 13. 一時cloneで品質script失敗時に`git commit`が失敗し、HEADが変わらないことを確認する。
- [ ] 14. contract test、品質script、`pnpm run verify`を実行する。
- [ ] 15. PR CIでWeb CI / Mobile App CIおよび関連workflow contractが退行していないことを確認する。

## 6. 検証方法

### 依存・設定

- `pnpm install --frozen-lockfile`
  - 通常installで`prepare`が成功する。
  - install後にHuskyのGit Hook pathが設定される。
- `pnpm run prepare`
  - ローカルGit Repository上で正常終了する。
- `git config --get core.hooksPath`
  - Huskyが設定したHook pathを確認する。
- `git status --short`
  - `.husky/_`など意図しない生成物が追跡対象へ増えていないことを確認する。

### 実行時間

- `format:check`、`lint`、`security:check`を同一環境で複数回計測する。
- 3 script連続実行も複数回計測する。
- 各scriptと合計時間、OS、Node、pnpm、`dist`有無をRun Artifactへ記録する。
- 数値閾値だけで自動判定せず、commitごとの待ち時間として実用上問題がないかを確認する。
- 問題が確認された場合は、最終Hook構成を変更する前に実測結果を提示する。

### Hook内容

初期候補3つを採用した場合は次を個別に実行する。

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run security:check`

Hook定義について次を確認する。

- 確定したscriptが指定順で記載されている。
- `pnpm run verify`、test、build、typecheckを含まない。
- Bash固有構文を使用しない。
- LFで保存されている。

### 実際のcommit経路

Repository本体では検証用commitを作成しない。一時cloneで次を確認する。

#### 正常系

1. 対象branchを一時directoryへcloneする。
2. `pnpm install --frozen-lockfile`を実行する。
3. Gitのtest用`user.name` / `user.email`を一時clone内だけに設定する。
4. 事前HEADを記録する。
5. `git commit --allow-empty -m "test: verify husky pre-commit success"`を実行する。
6. exit codeが0で、HEADが1 commit進んだことを確認する。

#### 異常系

1. 一時clone内だけで、確定した品質scriptのうち1つが非0になる最小の差分を作成してstageする。
2. 事前HEADを記録する。
3. `git commit -m "test: verify husky pre-commit failure"`を実行する。
4. 品質scriptと`git commit`が非0になることを確認する。
5. commit後もHEADが変わっていないことを確認する。

これにより、`git commit -> Husky pre-commit -> pnpm script -> nonzero -> commit abort`の実経路を確認する。

### GitHub Actions境界

- `.github/workflows/ci.yml`、`.github/workflows/cross-browser-smoke.yml`
  - `--ignore-scripts`を維持している。
- `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`.github/workflows/expo-dependency-maintenance.yml`
  - workflow-level `HUSKY: "0"`が存在する。
- EAS Build
  - 現行構成を確認し、Husky導入による具体的な問題が確認されない限り設定変更しない。

### contract test

- `pnpm exec vitest run tests/contracts/husky-config.test.ts tests/contracts/native-ci-workflow.test.ts tests/contracts/expo-dependency-maintenance-workflow.test.ts --no-file-parallelism --maxWorkers=1`
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
- Expo Dependency MaintenanceでHusky導入後もautomation branchの`git commit`がRepositoryのlocal `pre-commit`に依存しない。

### 成功判定

- 初期候補3 scriptの実行時間を確認し、実用上問題がないか判断できている。問題がある場合は最終構成を変更する前に再判断できている。
- 上記検証がすべてPASSする。
- 一時cloneの正常系commitが成功してHEADが進む。
- 一時cloneの異常系commitが失敗してHEADが変わらない。
- GitHub Actionsで`prepare`由来の意図しないHook設定や`pre-commit`実行がない。
- 追加依存はHuskyだけで、Issue対象外の変更がない。

## 7. リスクと未解決論点

### リスク

1. **GitHub Actionsで`prepare`が実行される**
   - `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`は`--ignore-scripts`を使用していない。
   - 対応: workflow-level `HUSKY=0`で明示的に無効化する。

2. **Expo Dependency Maintenanceのautomation commitにHookが割り込む**
   - workflow内で`git commit`を行うため、Husky有効化後はlocal Hookが実行されうる。
   - 対応: 同workflowでも`HUSKY=0`を設定する。

3. **Repository-wide checkによるcommit待ち時間増加**
   - 3 scriptはstaged file限定ではなくRepository全体を確認する。
   - 対応: 実装時に各scriptと合計時間を複数回計測する。実用上問題がある場合だけ、実測結果を基にHook構成を再判断する。

4. **Hook単体確認だけでは実際のcommit停止を保証できない**
   - 対応: 一時cloneで正常commitと品質script失敗時commitを実行し、HEAD更新有無まで確認する。

5. **Windowsでshell固有記法が壊れる**
   - 対応: Hookは確定した`pnpm run`の直列実行だけにし、Bash固有構文を使用しない。LFを維持する。

6. **ローカルNode / pnpmがPATHにないGUI client**
   - 対応: Issue #162では個別環境のinit scriptまで追加しない。実際に再現した場合に別途扱う。

### 未解決の質問

- 現時点ではなし。
- 実測で通常のcommit操作を阻害する負荷が確認された場合のみ、どの候補scriptを残すかを再判断する。

## 8. 成果物

### 実装時の変更予定ファイル

- `package.json`
- `pnpm-lock.yaml`
- `.husky/pre-commit`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/husky-config.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`

### 付随ドキュメント

- 追加の永続レポートは作成しない。
- 実測値、検証結果、実装中に判明した事実はactive Run Artifactへ記録する。

## 9. 備考

- このPlanはIssue #162だけを対象とし、OpenCode / Dependabot対応は別Issueとして扱う。
- `package.json`の既存品質scriptを正本とし、Hook専用の重複scriptや共通wrapperは作らない。
- EAS Buildは影響確認だけ行い、具体的なHusky起因の問題が確認されない限り変更対象へ広げない。
- 実装中にIssueの前提と異なる既存変更が見つかった場合は、変更範囲を広げる前に原因と影響を確認する。
