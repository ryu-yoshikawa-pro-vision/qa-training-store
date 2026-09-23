# Plan（計画）

## 目的

- Issue #130の責務境界を、PR #176の保存Planどおり実装する。
- Native CIの主要責務のownerと検証範囲を明確にし、job dependency、Artifact handoff、partial diagnostics、final fail-closed semantics、製品挙動、Formal / Trainingの保証境界を維持する。

## 正本と開始時状態

- 実装Plan: `docs/plans/2026-09-22_182300_issue-130-native-ci-responsibility-boundary.md`
- PR #176はopen。head `166f65c4ab6cecad2c059f3b72232905611ab44c`とlocal HEADが一致した。
- Issue #130はopen。
- 実装開始時の`origin/main`は`01cd8ab15078d479e821d373445af1e16a469519`で、Plan基準と一致する。
- Plan基準から現在の`main`およびPR headまでに、Plan対象のNative CI file差分はない。
- ユーザー指示により現在の`plan/issue-130-native-ci-responsibility-boundary` branchを維持し、PR #176を実装PRとして更新する。
- 先行した誤ったbranch作成操作で`feat/issue-130-native-ci-responsibility-boundary`がremoteに作成された。今回は使用せず、ユーザー指示に従い削除しない。

## 対象範囲

- Android build caller / reusable workflow、Production Bundle Guard adapter、Runtime helper 4本、change detection、責務owner別contract test、指定documentationをPlan §5〜8どおり実装する。
- Run Artifact、PR、Remote CI、visual caseの確認を含む。

## 対象外

- Product code、Maestro Flow、Native保証レベル、iOS実装、runner / timeout / dependency / Action versionの変更。
- Planでworkflow ownerと定義したlauncher stabilization、APK install / launch、Maestro各step、Artifact Actionのhelper移動。
- Visual専用change detection、共通CI framework、Composite Action、汎用CLI、将来用input。

## 進め方

1. Plan §9の順で、まず既存contractを固定し、既存ownerから新しいownerへassertionを移してから実装する。
2. 既存workflow本文を正確にhelperへ移し、環境変数、生成物、step ID / if、Artifact、非対称build契約をPlan §4〜7で照合する。
3. shell syntax、focused contract、既存validator contract、全contracts、verify、diff checkを実行する。
4. Run Artifactをsanitizationし、変更範囲とIssue成功状態を照合した後にcurrent branchへcommit / pushし、既存PR #176を更新する。
5. 最新PR headでnative_changed=trueのCI経路とvisual 1 caseを確認する。native_changed=falseは静的contractだけで確認する。

## 完了条件

- Plan §11とIssue #130成功状態の全項目を確認する。
- Plan §10のローカル、Remote CI、manual visual検証がPASSする。実行不能の場合は証跡・原因・未確認項目を区別し、PASS扱いしない。
- Run Artifactをsanitizationし、PR本文にIssue対応、責務境界、維持contract、検証結果を記録する。
- merge、Issue close、force push、branch削除は行わない。

## 判断記録

- 初期にPR #176をPlan-onlyと扱う判断をしたが、ユーザー確認により現在のbranchのまま実装し、同PRを更新する方針へ修正した。
- branch切替は行わない。Git mutation前後でPR head、current branch、remote refを確認する。
