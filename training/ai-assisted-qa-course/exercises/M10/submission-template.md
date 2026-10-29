# M10 CI統合提出

- 変更範囲・PR・対象spec:
- workflow差分 / permissions / Secret / deploy確認:
- ローカル結果とCI環境差:
- 対象PR HEADの完全SHA:
- Run / Check / Artifactの識別情報。PR head SHA、Run/Check SHA、Artifact target SHAの違い:
- `workspace/M10/ci-run-evidence.json`に記録したPR・Run参照:
- PASS / FAIL / 未実行と根拠:
- CI-only failure / spec failureの調査:
- 変更条件での停止・再実行・不要trigger停止の判断:
- AI提案の採否と未確認事項:

Run evidence JSONへToken、Secret、個人評価記録を書かない。Tokenはローカル環境変数`GH_TOKEN`または`GITHUB_TOKEN`から読ませる。

## 理解ノード別の確認記録

| 理解ノード | 本人の判断・操作 | 証拠パス／Run | 未確認・要復習 |
| --- | --- | --- | --- |
| K-M10-06 | 未記入 | 未記入 | 未確認 |
| K-M10-07 | 未記入 | 未記入 | 未確認 |


## 反復実践 P01〜P06 の記録

この欄は演習の転記ではなく、**本人の予測・実操作/実判断・観測・再確認**を記録する場所です。結果が未確認なら「未確認」、実行できなければ「未実行/BLOCKED」と理由を書いてください。実行していない内容を成功と報告しません。

<!-- prettier-ignore -->
| 課題 | 提出すべき具体的な証拠 | 予測・判断と根拠 | 本人の操作・AI/Skill案の採否 | 実結果・証拠（Run/SHA/パス）・修正/未決 |
| --- | --- | --- | --- | --- |
| P01 | M07追加testとworkflowの差分/依存確認 | 未記入 | 未記入 | 未確認 |
| P02 | 実CIとローカルの条件差・最小権限 | 未記入 | 未記入 | 未確認 |
| P03 | 実PR HEAD/Run/Check/Artifact/JSONの照合 | 未記入 | 未記入 | 未確認 |
| P04 | 架空変更後SHAと古い成功Runの不一致 | 未記入 | 未記入 | 未確認 |
| P05 | CI失敗3類型の調査順と再実行可否 | 未記入 | 未記入 | 未確認 |
| P06 | 継続運用のtrigger/費用判断と本人の最終報告 | 未記入 | 未記入 | 未確認 |

必要な証拠は関連する既存の必須提出物にも反映し、同じ内容を二重に作らないでください。学習用の架空データ・合成ログ・AI自己申告と、実行したspec/Runを区別してください。
