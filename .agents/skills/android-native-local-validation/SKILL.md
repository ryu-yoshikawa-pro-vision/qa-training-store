---
name: android-native-local-validation
description: Use when setting up Windows Android tooling, building a local Release APK, installing it on a physical device, running Maestro flows, or investigating a Native physical-device failure.
---

# Android Nativeローカル検証Skill

## 目的と適用範囲

このSkillは、Windows + PowerShellでAndroid実機上のローカルRelease APKを検証するときに使います。ツールのセットアップ、Build、Install、Maestro Flow、Native実機の失敗調査を対象にします。リポジトリ固有のrunbookやコマンド補助ツールを置き換えるものではありません。

## 入力

- retry、停止、失敗、Evidence、完了の意味を定義する、このSkillの[Windows Android Workflow](references/windows-android-workflow.md)。
- リポジトリのNative runbookとトラブルシューティングガイドを、リポジトリから提供される情報として扱います。
- リポジトリのコマンド補助ツール、固定toolchain契約、端末 / アプリ契約、Run Artifactの契約、現在の変更内容とdiffの状況。

## 実行の概要

1. このWorkflowとリポジトリの入力対応を読む。
2. Prepare、新しいBuild、Install、Test、Maestroの前に、リポジトリが提供するDoctor / preflightを実行する。
3. 初回セットアップまたはNative Projectの再生成が必要な場合だけPrepareを実行し、それ以外は有効な準備済み状態を再利用する。
4. 現在の変更を含む有効なAPKを再利用するか、現在のAPKがない、または現在の変更を含まない場合にBuildを実行して、現在のRelease APKを用意する。
5. APKを検査し、直前のgateが成功した場合だけInstall、Smoke、単体Flow、後続Suiteを実行する。
6. 一意な実行識別子を使い、未加工の証跡をリポジトリのartifact保存先へ保持し、active Runにはリポジトリ相対の概要を記録する。
7. 最初の失敗を分類し、許可された対象範囲内で最小限の修復だけを適用し、後続段階の前に同じ単位を再検証する。
8. 各段階を分けて報告し、現在のRelease APKが確立され、必要なgateとEvidenceがすべて満たされた場合だけ完了とする。毎回Buildを実行すること自体は完了条件ではない。

## ガードレール

- リポジトリの指示なしにコマンド補助ツールを独自実装し直したり、固定バージョンを更新したりしない。
- 上流の失敗後に後続段階を実行しない。未実行の段階をPASSと記録せず、新しい仮説やEvidenceなしにretryしない。
- Assertionの削除、Flowのskip、timeoutだけの延長によって失敗したFlowを回避しない。
- cacheの自動削除、ファイル移動、任意の依存関係のInstall、Git操作を行わない。
- 生成されたNativeディレクトリ、APK、未加工の証跡、ローカル設定、端末固有のpathをリポジトリへ追加しない。
