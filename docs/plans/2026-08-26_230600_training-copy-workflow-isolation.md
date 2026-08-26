# Training Copy workflow isolation 修正計画

## 0. 依頼概要

- 依頼内容: Training Copy生成時にSource Repository側の通常workflowが残り、`training:copy:validate` が失敗する既存不具合を修正する。
- 背景: `scripts/training/prepare-training-copy.ts` は `ci.yml` / `native-ci.yml` / `native-ios-ci.yml` だけを退避する。一方、現在のSource Repositoryには `cross-browser-smoke.yml` も存在するため、生成後の `.github/workflows` に残る。`scripts/training/validate-training-copy.ts` はactive workflowを `training-ci.yml` / `training-native-ci.yml` の2本だけに限定しているため、現状のTraining Copy生成・検証経路がFAILする。
- 期待成果: Source Repository側のworkflow追加・変更に依存せず、Training CopyではTraining用workflow 2本だけがactiveになる状態を既存契約どおり生成できるようにする。

## 1. ゴール / 完了条件

- ゴール:
  - Training Copy生成時にSource Repository側の通常workflowをすべてactive directoryから退避する。
  - `validate-training-copy.ts` の「active workflowはTraining 2本だけ」という既存契約を維持する。
  - `cross-browser-smoke.yml`のような後追加workflowがあってもTraining Copy validationが失敗しないようにする。
- 完了条件（DoD）:
  - `.github/workflows` 内の `.yml` / `.yaml` workflowが、Training Copy生成時にすべて `.github/training-copy-source-workflows/` へ退避される。
  - 退避後、`.github/workflows` にはRepository-owned templateから配置した `training-ci.yml` / `training-native-ci.yml` だけがactive workflowとして存在する。
  - 既存のSource workflowは削除せず、archive directoryに保持する。
  - `scripts/training/validate-training-copy.ts` は変更せず、既存の厳格なallowlist契約を維持する。
  - 追加workflowが存在する状態を再現する回帰テストがPASSする。
  - 実Repositoryの最終HEADからTraining Copyを生成し、`training:copy:validate` がPASSする。

## 2. 現状理解と前提

- `scripts/training/prepare-training-copy.ts` は現在、退避対象workflow名を3ファイルに固定している。
- `main` には `.github/workflows/cross-browser-smoke.yml` があり、現在の固定リストには含まれていない。
- `scripts/training/validate-training-copy.ts` は `.github/workflows` 内の `.yml` / `.yaml` を列挙し、`training-ci.yml` / `training-native-ci.yml` 以外が1件でもあればFAILする。
- validator側の厳格な契約はTraining Copyで意図しないschedule / manual workflowをactiveにしないために必要であり、緩和しない。
- `cross-browser-smoke.yml` だけを固定リストへ追加する修正では、将来別workflowが追加された際に同じ不具合が再発するため採用しない。

### Non-goals

- `scripts/training/validate-training-copy.ts` のallowlist緩和。
- `cross-browser-smoke.yml` 自体の変更・削除・無効化。
- Source Repositoryの通常CI / Native CI / scheduled workflowの動作変更。
- Training workflow templateの内容変更。
- 新しいTraining Copy方式や別Repositoryの導入。
- Issue #46 / PR #70のsetup-java変更を本ブランチへ取り込むこと。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: workflowファイルとして退避対象にするのは `.github/workflows` 直下の `.yml` / `.yaml` ファイルとする。
- 未回答の重要質問: なし。

## 4. 影響範囲

### 変更対象

- `scripts/training/prepare-training-copy.ts`
- Training Copy生成動作を直接確認する最小限のcontract test

### 参照のみ

- `scripts/training/validate-training-copy.ts`
- `.github/workflows/`
- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `package.json`

Product code、既存workflow本体、Training workflow template、依存ファイル、lockfileは変更しない。

## 5. 変更方針

- `prepare-training-copy.ts` の固定workflow名リストを廃止し、`.github/workflows` 直下を列挙する。
- `.yml` / `.yaml` のみをSource workflowとしてarchive directoryへ移動する。
- YAML以外のファイルが存在する場合は、この修正では移動対象にしない。
- Source workflow退避後に、既存どおりRepository-owned Training template 2本を `.github/workflows` へ配置する。
- validator側は変更せず、生成結果が既存contractを満たすことを確認する。
- 不具合の再発防止として、固定ファイル名ではなく追加workflowが存在するケースをcontract testで検証する。

### 実行タスク

- [ ] 1. `scripts/training/prepare-training-copy.ts` で `.github/workflows` 直下の `.yml` / `.yaml` を列挙し、すべて `.github/training-copy-source-workflows/` へ退避するよう変更する。
- [ ] 2. 既存の `training-ci.yml` / `training-native-ci.yml` 配置、Source SHA検証、manifest生成処理は変更しない。
- [ ] 3. Training Copy生成を直接検証するcontract testを追加する。temporary git fixtureに通常workflowと追加workflowを置き、prepare実行後に通常workflowがarchiveされ、active workflowがTraining 2本だけになることを確認する。
- [ ] 4. 同テストで `training:copy:validate` 相当の既存validatorがPASSすることを確認する。validatorの実装は変更しない。
- [ ] 5. 差分を確認し、Source workflowの内容、Training template、validator、Product codeに意図しない変更がないことを確認する。
- [ ] 6. focused test、全contract test、format / lint / typecheck / security checkを実行する。
- [ ] 7. 実装・テスト修正をすべてcommitした最終HEAD SHAから、working tree外へDisposable Training Copyを生成し、`training:copy:validate` がPASSすることを確認する。
- [ ] 8. `git diff --check main...HEAD` で最終差分を確認する。

## 6. 検証方法

### Automated validation

- 追加したTraining Copy regression contract test
- `pnpm run test:contracts`
- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run lint:markdown`
- `pnpm run security:check`

### Actual Training Copy validation

最終HEADの完全SHAを使用し、現在のworking tree外に生成する。

```bash
pnpm run training:copy:prepare -- --source-sha <final-head-sha> --target <temporary-directory-outside-current-working-tree>
pnpm run training:copy:validate -- --root <temporary-directory-outside-current-working-tree>
```

確認内容:

- validationがPASSする。
- active `.github/workflows` は `training-ci.yml` / `training-native-ci.yml` の2本だけである。
- `cross-browser-smoke.yml` を含むSource側workflowは `.github/training-copy-source-workflows/` に退避されている。
- validation後、一時Training Copyを削除する。

### Diff validation

```bash
git diff --check main...HEAD
```

## 7. リスクと未解決論点

- `.yml` / `.yaml` の片方だけを対象にすると将来再発するため両拡張子を対象にする。
- `cross-browser-smoke.yml`だけをハードコード追加するとSource workflow追加時に再発するため、workflow directoryの列挙を正本とする。
- validatorを緩めるとTraining Copy上で通常workflowが実行可能になるため変更しない。
- archiveではなく削除するとSource workflowの追跡性を失うため、既存どおりarchiveする。
- workflow以外のYAMLを`.github/workflows`へ置く運用はGitHub Actions上もworkflowとして解釈されるため、同directory直下の `.yml` / `.yaml` はすべて退避対象とする。

## 8. 成果物

- `scripts/training/prepare-training-copy.ts`
- Training Copy生成の回帰contract test
- 本計画書 `docs/plans/2026-08-26_230600_training-copy-workflow-isolation.md`

## 9. 備考

- 本対応はPR #70をブロックしている既存Training Copy不具合を独立して修正する。
- 本修正をmainへ反映後、PR #70側でmainを取り込み、PR #70の計画に従ってTraining Copy validation以降を再実行する。
- 実装は既存のTraining Copy生成・検証方式を維持し、必要最小限の変更に限定する。
