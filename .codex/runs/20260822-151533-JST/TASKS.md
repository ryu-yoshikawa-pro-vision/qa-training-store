# Tasks

## Now

- [x] 1. 指定Plan、Project Context、ADR、直近Run、AGENTS、最新main/PR #38を確認する
- [x] 2. G2/G5/G6のrepo mapping、Root Cause、既存Boundary/Test、React Aria契約を確認する
- [x] 3. G2のWeb/Native persisted state判定と4ケースRegressionを実装する
- [x] 4. G5の通常typing後open state修正とComponent Regressionを実装する
- [x] 5. G6のCart ownership guardとforeign update/delete Repository Regressionを実装する
- [x] 6. Focused Testを実行し、失敗時はRoot Causeを修正して再検証する
- [x] 7. 変更面に必要なRepository gate、Web/Native runtime Before/After確認を実行する
- [x] 8. scope/Git確認、Run Artifact Sanitizer、REPORT/run manifestを更新する
- [x] 9. normal commit/pushを実施し、PRをmergeせず結果を報告する

## Discovered

- D1. Native Cart adapterは`WHERE id = ? AND cart_id = ?`で既にownershipを絞っているため、G6の変更対象はDexie repositoryに限定する。
- D2. G2のOrder detail DTOは`orderStatus`と`paymentAttempts`を既に持つため、Payment State Machineの追加は不要。
- D3. React Aria公式契約では`allowsEmptyCollection`がempty結果でもPopoverを開くために必要で、`onOpenChange`がopen state変更を受け取る。

## Blocked

- なし（Native runtime capabilityは検証時に実行可否を記録する）
