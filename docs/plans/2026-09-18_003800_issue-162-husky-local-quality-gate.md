# Issue #162 Huskyローカル品質ゲート導入 Plan

## 0. 依頼概要

- 対象Issue: #162 `chore: Huskyを導入してローカル品質ゲートを追加する`
- 対象branch: `issue-162-husky-local-quality-gate`
- base branch: `main`
- 依頼内容: Huskyを導入し、commit前に既存の軽量な品質確認を実行するローカルGit hookを追加するための実装Planを作成する。
- 背景: `pnpm run verify`はcommitごとに実行するには重いため、CIを置き換えず、commit前に価値の高い既存scriptだけを実行する。
- 期待成果: 通常の`pnpm install`後にHuskyの`pre-commit`が有効になり、品質ゲート失敗時はcommitを止める。既存のGitHub Actions、EAS Build、依存更新workflowへ副作用を持ち込まない。

## 1. ゴール / 完了条件

### ゴール

既存のpnpm構成と品質scriptを再利用して、Windows / macOSの開発環境で利用できるHusky `pre-commit`を追加する。GitHub ActionsとEAS BuildではHuskyを実行せず、既存CIの責務と実行時間を変えない。

### 完了条件（DoD）

- HuskyがdevDependencyとして追加され、`pnpm-lock.yaml`がpnpm 9.10.0で整合している。
- `package.json`に`"prepare": "husky"`が追加され、clone後の通常の`pnpm install`でHookが有効になる。
- `format:check`、`lint`、`security:check`を候補として実測し、下記の実行時間判定に従って最終的な`pre-commit`構成が確定している。
- 初期候補を採用する場合、`.husky/pre-commit`が次の順で実行する。
  1. `pnpm run format:check`
  2. `pnpm run lint`
  3. `pnpm run security:check`
- `pnpm run verify`全体を`pre-commit`から実行しない。
- `lint-staged`などの追加依存を導入しない。
- 実際の`git commit`経路で、Hook内の品質ゲートが失敗した場合にcommitが作成されず、成功時にはcommitできることを一時cloneで確認する。
- Windows / macOSで解釈できるPOSIX互換のHookにし、改行はRepositoryの`.gitattributes`どおりLFを維持する。
- GitHub Actionsで`prepare`を実行するinstall経路は`HUSKY=0`でHook設定を無効化する。
- `--ignore-scripts`を使用している既存GitHub Actions installは、そのまま維持する。
- EAS Buildの全build profileで`HUSKY=0`を設定し、remote builder上の依存installでもHuskyを無効化する。
- 関連するcontract testとEAS config validatorがHusky設定とCI境界を検証する。
- `pnpm run verify`と対象CIが退行していない。

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
- `.eas/workflows/phase2-native-foundation.yml`には`preview`と`production-validation`のAndroid / iOS Buildがあり、`eas.json`のbuild profileを使用する。
- `eas.json`には`development`、`preview`、`production-validation`があり、各profileの`env`はEAS Build builderへ設定される。EAS Buildは依存関係installを行うため、`prepare`追加の影響対象である。
- `tests/contracts/eas-static-config.test.ts`と`scripts/validate-eas-static-config.ts`がEAS build profileの既存契約を検証している。
- Husky公式手順ではpnpm利用時に`prepare: husky`を設定でき、CIでHookをインストールしない場合は`HUSKY=0`を使用する。HookはWindows互換性を保つためPOSIX互換にする。
- Husky公式はHookの失敗確認として、実際の`git commit`を実行し、Hookを非0終了させてcommitが作成されないことを確認する方法を示している。
- 2026-09-18時点のnpm `latest`はHusky 9.1.7。

### 前提

- 初期候補はIssue #162に記載された`format:check`、`lint`、`security:check`とする。
- 実行時間の許容値はIssueやRepositoryに定義されていないため、Plan上の判定基準として、warm-up後3回の連続実行の中央値が15秒以内、かつ各scriptの中央値が10秒以内なら初期候補3つを採用する。
- 上記基準はIssueの仕様ではなく、`pre-commit`を軽量に保つための実装判断用基準である。基準を超えた場合はscriptを黙って削除せず、実測値を提示して最終構成を再判断する。
- Husky専用wrapperや独自runnerは追加しない。既存pnpm scriptをHookから直接呼ぶ。
- EAS Buildでは`eas.json`の各build profileへ`HUSKY: "0"`を設定する。`.eas/workflows/phase2-native-foundation.yml`はprofileを参照するだけなので、直接変更しない。

### 対象外

- OpenCode Zenの導入。
- Dependabot Security Alertの調査・修正自動化。
- GitHub Actionsによるセキュリティ修正自動化。
- `pnpm run verify`全体の`pre-commit`実行。
- `lint-staged`など、必要性が実証されていない追加依存。
- staged fileだけに品質確認範囲を変更すること。
- 既存`format:check`、`lint`、`security:check`自体の高速化や仕様変更。
- GUI Git clientやNode version manager固有のPATH対策。実際の不具合が確認された場合に別途扱う。
- EAS Workflow自体の構成変更。Husky無効化は既存build profileの`env`で行う。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- 初期候補3 scriptの連続実行中央値が15秒を超える、またはいずれかのscript中央値が10秒を超えた場合は、Hook構成確定前に実測結果を提示して再判断する。

### 仮定してよい細部

- Huskyは現行latestの9.1.7を使用する。
- Hookは追加のshell制御を書かず、確定した`pnpm run`を順番に記述する。
- GitHub ActionsではRepository全体の共通`prepare`を複雑化せず、通常installを行うworkflow側で`HUSKY=0`を設定する。
- EAS Buildではbuild profileの`env`を正本とし、`.eas/workflows`へ重複設定を追加しない。

### 未回答の重要質問

- 現時点ではなし。実測がPlan上の判定基準を超えた場合だけ、最終Hook構成をblocking decisionとして扱う。

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
  - 同上。特にworkflow内の`git commit`でRepositoryのlocal `pre-commit`が発火しないことを保証する。
- `eas.json`
  - `development`、`preview`、`production-validation`の各build profileへ`HUSKY: "0"`を追加する。
- `tests/contracts/husky-config.test.ts`
  - Husky設定、Hook内容、GitHub ActionsのCI境界をRepository contractとして検証する。
- `tests/contracts/eas-static-config.test.ts`
  - 全EAS build profileで`HUSKY=0`が維持されることを検証する。
- `scripts/validate-eas-static-config.ts`
  - EAS静的設定検証でも`HUSKY=0`を必須とする。

### 確認対象だが原則変更しないファイル

- `.github/workflows/ci.yml`
  - `--ignore-scripts`を維持する。
- `.github/workflows/cross-browser-smoke.yml`
  - `--ignore-scripts`を維持する。
- `.eas/workflows/phase2-native-foundation.yml`
  - build profileの参照だけを維持し、Husky用envは重複定義しない。
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `scripts/security-static-check.ts`
- `.gitattributes`

## 5. 変更方針

### 方針1: Huskyだけを追加し、既存品質scriptを再利用する

- `pnpm add --save-dev husky@9.1.7`相当で依存関係を追加する。
- `package.json`へ`"prepare": "husky"`を追加する。
- `pnpm exec husky init`で生成される構成を参考にするが、最終的な`.husky/pre-commit`は実測後に確定した既存scriptだけにする。
- Husky v9で不要な旧形式の`husky.sh`読み込みや独自wrapperを追加しない。
- `.husky/_`配下などHuskyが生成する内部ファイルを意図せず変更対象へ含めず、追跡対象はRepositoryが管理すべきHook定義に限定する。

### 方針2: 候補scriptを先に実測してからHook構成を確定する

- 同一環境で各scriptを1回warm-upした後、各scriptと3 script連続実行を3回ずつ計測する。
- 判定には中央値を使用し、OS、Node、pnpm、`dist`有無を記録する。
- 連続実行中央値が15秒以内、かつ各script中央値が10秒以内なら、初期候補3つを採用する。
- 基準を超えた場合は実測値を提示し、Issueの「軽量なローカル品質ゲート」を満たす構成を再判断する。script削除、`lint-staged`追加、既存script変更を自動では行わない。

初期候補を採用する場合の`.husky/pre-commit`は次の責務だけを持つ。

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
- `prepare`を`husky || true`にして失敗を握りつぶす方法は採用しない。CIかローカルかを明確に分け、ローカル通常installでHusky設定失敗を見逃さない。

### 方針4: EAS BuildでもHuskyを明示的に無効化する

- `eas.json`の`development`、`preview`、`production-validation`の各`env`へ`HUSKY: "0"`を追加する。
- EAS Buildではbuild profileの`env`がbuilderへ設定されるため、依存install時の`prepare`からHuskyを無効化できる。
- `.eas/workflows/phase2-native-foundation.yml`には同じenvを重複記載しない。
- `tests/contracts/eas-static-config.test.ts`と`scripts/validate-eas-static-config.ts`でこの契約を固定する。

### 方針5: Repository contractで設定退行を検出する

`tests/contracts/husky-config.test.ts`を追加し、少なくとも次を検証する。

- `package.json`の`prepare`が`husky`である。
- `devDependencies.husky`が期待する9.1.7を指す。
- `.husky/pre-commit`に実測後に確定したscriptが指定順で存在する。
- `pre-commit`に`pnpm run verify`が存在しない。
- `lint-staged`を要求する設定が追加されていない。
- `.github/workflows/`を列挙し、`pnpm install`を含み`--ignore-scripts`を使わないworkflowは`HUSKY: "0"`を持つ。
- `--ignore-scripts`を使用するworkflowへ不要な変更を要求しない。

EAS Buildのprofile契約は既存の`eas-static-config` test / validatorへ追加し、`husky-config.test.ts`へEAS固有構造を重複定義しない。

新しいYAML parserやテスト専用依存は追加せず、既存Node標準ライブラリとVitestで実装する。

### 方針6: Hookの実動作は一時cloneで実際の`git commit`を使って確認する

- Repository本体の履歴を検証用commitで汚さないため、一時directoryへ対象branchをcloneして確認する。
- clone後に通常の`pnpm install --frozen-lockfile`を行い、`prepare`によってHuskyが設定されることを確認する。
- 正常系では`git commit --allow-empty`を実行し、commit成功とHEAD更新を確認する。
- 異常系では一時clone内にPrettier違反の小さなtest fixtureを作成してstageし、`format:check`を実際に失敗させる。`git commit`が非0となり、HEADが変わらないことを確認する。
- 異常系のfixtureとcommitは一時cloneだけに作成し、Repository branchへ差分を残さない。
- `git hook run pre-commit`は必要なら補助診断に使うが、Issueのcommit停止条件の主証跡にはしない。

### 実行タスク

- [ ] 1. 作業開始時にIssue #162、`package.json`、`pnpm-lock.yaml`、`.github/workflows/*.yml`、`eas.json`、`.eas/workflows/*`、既存contract testを再確認し、mainとの差分が増えていないことを確認する。
- [ ] 2. 初期候補3 scriptをwarm-up後に各3回、連続実行も3回計測し、Planの判定基準で初期候補を採用できるか判断する。
- [ ] 3. 判定基準を超えた場合は実測値を提示し、Hook構成を再判断する。基準内なら3 script採用で続行する。
- [ ] 4. Husky 9.1.7をdevDependencyへ追加し、pnpm 9.10.0でlockfileを更新する。
- [ ] 5. `package.json`へ`prepare: husky`を追加する。
- [ ] 6. `.husky/pre-commit`へ確定した品質scriptを指定順で追加する。
- [ ] 7. `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`で`HUSKY=0`を設定し、CI installやautomation commitからHook実行を切り離す。
- [ ] 8. `eas.json`の全build profileへ`HUSKY=0`を追加する。
- [ ] 9. `tests/contracts/husky-config.test.ts`を追加し、GitHub Actionsを含む設定境界を固定する。
- [ ] 10. `tests/contracts/eas-static-config.test.ts`と`scripts/validate-eas-static-config.ts`を更新し、EAS BuildのHusky無効化を契約化する。
- [ ] 11. 一時cloneで通常install後にHuskyが有効化されることを確認する。
- [ ] 12. 一時cloneで正常な`git commit --allow-empty`が成功し、HEADが更新されることを確認する。
- [ ] 13. 一時cloneで実際の品質scriptを失敗させ、`git commit`が失敗してHEADが変わらないことを確認する。
- [ ] 14. contract test、EAS config validator、品質script、`pnpm run verify`を実行する。
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

- `format:check`、`lint`、`security:check`を各1回warm-upする。
- その後、同一環境で各scriptを3回計測する。
- 3 script連続実行も同一環境で3回計測する。
- 各中央値、連続実行中央値、OS、Node、pnpm、`dist`有無をRun Artifactへ記録する。
- 連続実行中央値15秒以内、各script中央値10秒以内なら初期候補を採用する。
- 基準を超えた場合はHookを最終確定せず、実測値と各scriptの内訳を提示して再判断する。
- `security:check`は存在する`dist`も走査対象に含むため、計測時のRepository状態を記録する。

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
3. Gitのtest用user.name / user.emailを一時clone内だけに設定する。
4. 事前HEADを記録する。
5. `git commit --allow-empty -m "test: verify husky pre-commit success"`を実行する。
6. exit codeが0で、HEADが1 commit進んだことを確認する。

#### 異常系

1. 一時clone内にPrettier違反の小さなfixtureを作成してstageする。
2. 事前HEADを記録する。
3. `git commit -m "test: verify husky pre-commit failure"`を実行する。
4. `format:check`が非0となり、`git commit`も非0になることを確認する。
5. commit後もHEADが変わっていないことを確認する。

これにより、Hook単体ではなく`git commit -> Husky pre-commit -> pnpm script -> nonzero -> commit abort`の実経路を検証する。

### GitHub Actions / EAS Build境界

- `.github/workflows/ci.yml`、`.github/workflows/cross-browser-smoke.yml`
  - `--ignore-scripts`を維持している。
- `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`.github/workflows/expo-dependency-maintenance.yml`
  - workflow-level `HUSKY: "0"`が存在する。
- `eas.json`
  - `development`、`preview`、`production-validation`の全build profileに`HUSKY: "0"`が存在する。
- `.eas/workflows/phase2-native-foundation.yml`
  - 既存profile参照を維持し、Husky専用設定を重複追加していない。

### contract test / validator

- `pnpm exec vitest run tests/contracts/husky-config.test.ts tests/contracts/eas-static-config.test.ts --no-file-parallelism --maxWorkers=1`
- `pnpm run validate:eas:config`
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
- EAS静的contract / validatorで、全build profileがremote builder上でも`HUSKY=0`を受け取る構成を確認する。
- EAS cloud buildそのものはこのIssueで新規実行を必須にしない。既存のoptional EAS WorkflowをHusky確認だけのために起動しない。

### 成功判定

- 実行時間がPlanの判定基準内であるか、基準超過時に最終構成の再判断が完了している。
- 上記検証がすべてPASSする。
- 一時cloneの正常系commitが成功してHEADが進む。
- 一時cloneの異常系commitが失敗してHEADが変わらない。
- GitHub ActionsとEAS Buildで`prepare`由来の意図しないHook設定や`pre-commit`実行がない構成になっている。
- 追加依存はHuskyだけで、Issue対象外の変更がない。

## 7. リスクと未解決論点

### リスク

1. **GitHub Actionsで`prepare`が実行される**
   - `native-ci.yml`、`native-ios-ci.yml`、`expo-dependency-maintenance.yml`は`--ignore-scripts`を使用していない。
   - 対応: workflow-level `HUSKY=0`で明示的に無効化する。

2. **Expo Dependency Maintenanceのautomation commitにHookが割り込む**
   - workflow内で`git commit`を行うため、Husky有効化後はlocal Hookが実行されうる。
   - 対応: 同workflowでも`HUSKY=0`を設定する。

3. **EAS Buildの依存installで`prepare`が実行される**
   - `eas.json`のbuild profileはremote builderで依存installを伴う。
   - 対応: 全build profileの`env`へ`HUSKY=0`を追加し、既存EAS contract / validatorで固定する。

4. **Repository-wide checkによるcommit待ち時間増加**
   - 3 scriptはstaged file限定ではなくRepository全体を確認する。
   - 対応: warm-up後に各3回と連続3回を計測する。連続中央値15秒または各script中央値10秒を超えた場合は、最終Hook構成を自動決定しない。

5. **Hook単体確認だけでは実際のcommit停止を保証できない**
   - `git hook run pre-commit`はHookを実行するだけで、`git commit`経路そのものではない。
   - 対応: 一時cloneで正常commitと品質script失敗時commitを実行し、HEAD更新有無まで確認する。

6. **Windowsでshell固有記法が壊れる**
   - 対応: Hookは確定した`pnpm run`の直列実行だけにし、Bash固有構文を使用しない。LFを維持する。

7. **ローカルNode / pnpmがPATHにないGUI client**
   - Husky公式にもNode version managerとGUI clientのPATH差が記載されている。
   - 対応: Issue #162では個別環境のinit scriptまで追加しない。実際に再現した場合に別途扱う。

### 未解決の質問

- 現時点ではなし。
- 実測がPlanの判定基準を超えた場合のみ、どの候補scriptを残すかを再判断する。

## 8. 成果物

### 実装時の変更予定ファイル

- `package.json`
- `pnpm-lock.yaml`
- `.husky/pre-commit`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `.github/workflows/expo-dependency-maintenance.yml`
- `eas.json`
- `tests/contracts/husky-config.test.ts`
- `tests/contracts/eas-static-config.test.ts`
- `scripts/validate-eas-static-config.ts`

### 付随ドキュメント

- 追加の永続レポートは作成しない。
- 実測値、検証結果、実装中に判明した事実はactive Run Artifactへ記録する。

## 9. 備考

- このPlanはIssue #162だけを対象とし、OpenCode / Dependabot対応は別Issueとして扱う。
- `package.json`の既存品質scriptを正本とし、Hook専用の重複scriptや共通wrapperは作らない。
- GitHub Actionsではworkflow-level `HUSKY=0`、EAS Buildではbuild profile `env`の`HUSKY=0`をそれぞれ正本とする。
- EAS Buildの`env`はbuilderへ設定されることをExpo公式仕様で確認済み。
- 実際のcommit停止条件は`git hook run`ではなく一時clone内の`git commit`で確認する。
- 実装中にIssueの前提と異なる既存変更が見つかった場合は、変更範囲を広げる前に原因と影響を確認する。
