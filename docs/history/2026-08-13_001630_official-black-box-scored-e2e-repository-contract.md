# PR #21 Official Black-box Scored E2E Repository Contract

日付: 2026-08-13 JST

## 概要

Planning PR #21のRepository実装として、Official Black-box Scored E2Eへ接続するdeterministicな契約・準備・Artifact検証基盤を追加した。ワークツリー分離は前提条件にせず、現在のfresh branchへ実装した。

## 実装

- Shared Canonical JSON、Artifact Manifest、Runtime Variant、Protected Patchを追加。
- Learner-safe Scored Skill、Runner Input／Output Contract、hash sensitivity、source-free Prepared Targetを追加。
- Basic／Intermediate／AdvancedのGeneric Initial State導出、Bootstrap／Runtime Control log、Execution Summary、Evidence Mapping、Frozen Artifactを追加。
- Official VerificationでHost Capability Receipt、Tool Profile、Origin／Output／Skill／Variant／Session identityを相互検証し、未実証値をPASSへ補完しないようにした。
- Windows Disposable buildのdependency topologyを、root `node_modules` junctionからoffline hoisted installへ変更した。
- Web dist serverは直接navigationによるJS／CSS／manifest等の取得を拒否し、subresource requestだけを許可する。

## 検証結果

- Official contract 34 tests、served-dist contract 23 tests、Preparation 1/1、Spec validation／build、Unit／Integration／Web Component、Security／Image ManifestをPASS。
- Full typecheckは既存の6件の`/guide` route型エラー、Full Contractは環境による`node:sqlite` bundling failureを検出した。
- Host-trusted Capability Receipt、Fresh Coding Agent、実配信Resource BoundaryのPASS証跡は現Hostに無いため、Official E2E／scoreは未実行・未採点とした。

## 残作業

Host-nativeまたは明示Workflowで、同じRunner Input／Prepared Targetに対してtrusted Receipt、Fresh Session、Bootstrap、実探索、bounded finalization、Freeze、Deterministic Evaluatorを実行し、Host側証跡を保存する。
