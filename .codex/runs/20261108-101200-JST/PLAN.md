# Plan（計画）

## 目的

- PR #199の新規セッションで、同じ調査・修正・CI更新を繰り返さず受入条件へ進める。

## 対象範囲

- 継続手順の追加、既存統合受入PlanとAGENTS.mdからのリンク、Runの標準記録。
- 製品SUT、正式製品仕様、既存製品テスト、PR #210、外部Skill、main、merge・公開は対象外。

## 進め方

- 最新PR HEAD/CI、既存Plan/AGENTS、RepositoryのRun・Git契約を確認した。
- 受入条件を複写せず、再開順・証拠の再利用・BLOCKED時の動きと引継ぎを独立文書で明示する。
- GitHub Connector経由で関連文書とRunを一度に反映し、新HEADのCI結果をPR本文で確認する。

## 完了条件

- 新規セッションの必読入口と最初の実検証が明確。
- 元の44条件、8作業、6後続条件と変更禁止範囲が維持される。
- 最新HEADのWeb/Mobile必須CIを確認し、PR本文へ結果を反映する。

## リスク

- 過去のCIやレポートの結果を最新HEADへ転用しない。
- ローカル`new-run`/formatterを実行できないGitHub接続環境のため、Runのエージェント管理Markdownを手動作成し、CIで書式/契約を確認する。
