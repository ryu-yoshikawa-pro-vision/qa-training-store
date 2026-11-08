# Plan（計画）

## 目的

- PR #199の統合受入Planの作業3について、同一HEADの配布Artifactと既存CIを用いて根拠を確認し、不足するタブレット幅の教材E2Eを補完する。

## 対象範囲

- 対象：`e2e/web/ai-assisted-qa-course.spec.ts`、対象SHAの配布ZIP、既存の配布/バックアップ契約とWeb CI。
- 対象外：製品SUT、正式製品仕様、既存製品テスト、外部Skill、PR #210、main、マージ・公開・課金。

## 進め方

- 継続作業手順・統合受入Planの作業3と実コード/既存テストを照合。
- 同一HEADの2つのZIPから教材revision/クイズ/状態登録を実測。
- 既存E2Eの各M00〜M10について、desktop/mobileに加えて768pxの教材・クイズを確認。
- 新HEADの必須CIと実Artifactを確認し、残る未受入条件を判定。

## 完了条件

- 同一HEAD配布ZIPの教材HTMLとクイズJSON・manifestの検証結果を特定可能。
- 11モジュールに対して、768px教材/クイズの横幅とWCAG 2.1 AA自動チェックがCIで検証される。
- 未実施の実画面読み上げ・本人復元等は実施済みとしない。PR本文に必須CI結果を記録する。

## 未確定・制約

- 本実行環境のChromiumは`ERR_BLOCKED_BY_ADMINISTRATOR`でローカルWeb URLとfile URLを開けない。画面の実動作判定はGitHub Actionsの正式E2E結果を使う。
- Web ZIPと配布ZIPは同じGit SHAでも別CI jobのビルドなので、生成JSハッシュまで同一とみなさない。
