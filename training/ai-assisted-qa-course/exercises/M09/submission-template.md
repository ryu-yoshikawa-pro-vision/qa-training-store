# M09 CI読解・workflow修正の提出

- workflow / trigger / job / runner / step（P01の基準案と手動案の対応）:
- 手動trigger時の選択ref・checkout SHA・PR HEAD照合の可否（未確認は未確認）:
- 修正したworkflow案: workspace/M09/course-e2e.workflow.yml.disabled
- PR HEADの指定方法と対象SHAの確認方法:
- permissions / Secret / deploy / spec範囲:
- Build / Browser / Test / Artifactの役割:
- Run ID / attempt / job Check / head SHA / checkout SHA / Artifactの対応（M09-02）:
- Run未実行・合成資料・閲覧可能な公開Runの区別（M09ではCIを起動しない）:

## M09-02 証拠同一性の照合表

本人が確認した実在の証拠だけを記入します。架空条件・未観測項目は`未確認`、Runが存在しない場合は`未実行`とし、URL・SHA・成功を創作しません。

<!-- prettier-ignore -->
| 条件 | PR head SHA | Run URL/ID・attempt・event | job Check・Details・結果 | checkout SHA（ログ） | 同じRunのArtifact・target-sha.txt・spec/結果 | 採否と不足証拠 |
| --- | --- | --- | --- | --- | --- | --- |
| 対象HEAD | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 |
| PR更新後の旧成功Run | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 | 不採用理由を記録 |
| merge SHA/別Run/再実行・失敗時Artifact | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 |

- 合成ログの失敗段階と確認するstep:
- Runner種別 / 料金条件の公開情報上の根拠:
- 未確認の組織設定・支払条件:
- trigger別のRun数・対象spec・費用と未検証期間の比較:
- 権限や他CIが変わった場合の見直し、停止・再実行の判断:
- この案を有効化していないことの確認:

## 理解ノード別の確認記録

| 理解ノード | 本人の判断・操作 | 証拠パス／Run | 未確認・要復習 |
| --- | --- | --- | --- |
| K-M09-06 | 未記入 | 未記入 | 未確認 |
| K-M09-07 | 未記入 | 未記入 | 未確認 |

## 反復実践 P01〜P06 の記録

この欄は演習の転記ではなく、**本人の予測・実操作/実判断・観測・再確認**を記録する場所です。結果が未確認なら「未確認」、実行できなければ「未実行/BLOCKED」と理由を書いてください。実行していない内容を成功と報告しません。

<!-- prettier-ignore -->
| 課題 | 提出すべき具体的な証拠 | 予測・判断と根拠 | 本人の操作・AI/Skill案の採否 | 実結果・証拠（Run/SHA/パス）・修正/未決 |
| --- | --- | --- | --- | --- |
| P01 | 手動起動の別名disabled YAML、diff、対象ref/SHAの扱い | 未記入 | 未記入 | 未確認 |
| P02 | PR HEADとmerge SHAを区別した記録案 | 未記入 | 未記入 | 未確認 |
| P03 | Browser/Test/Artifact/SHAの失敗診断3件 | 未記入 | 未記入 | 未確認 |
| P04 | 実行頻度・Runner費用・停止条件 | 未記入 | 未記入 | 未確認 |
| P05 | write-all/Secret提案の拒否理由と権限差分 | 未記入 | 未記入 | 未確認 |
| P06 | M10へ渡す基準disabled workflowの依存・証拠 | 未記入 | 未記入 | 未確認 |

必要な証拠は関連する既存の必須提出物にも反映し、同じ内容を二重に作らないでください。学習用の架空データ・合成ログ・AI自己申告と、実行したspec/Runを区別してください。
