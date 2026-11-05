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

## M10-02 有効化前・後片付けの確認

- Private repo、本人権限、信頼済みbase commit、承認済み配布元SHA、Shop/manifest追跡・SHA-256、対象PR HEAD：
- M07本人成果物の`TODO`除去と同一specのローカルRun、またはM10 fallbackの`course:load M10`・Reset import：
- 対象workflowの`pull_request`、`contents: read`、`persist-credentials: false`、prebuilt Serve、Browser、対象1 spec、2ファイルのArtifact：
- Billing・Runner・支払主体・利用枠/予算・外部PRの扱い・有効化承認（未確認なら`BLOCKED`）：
- 実行後の不要trigger停止、Run/Artifactの保存確認、課金確認、学習成果物を残す方法：

## M10-04 原因分類と再実行判断

ログから観測できない内容を補わず、同じ失敗Run内の後続Artifactエラーを初因と取り違えないでください。以下の条件は、本人の実Run IDがなければ架空例として記録します。

<!-- prettier-ignore -->
| 条件 | 最初の失敗step・観測された状態 | spec実行済み/未実行 | Artifact・SHAの証拠と不足 | 原因調査先・再実行の採否 |
| --- | --- | --- | --- | --- |
| Install失敗 | 未確認 | 未確認 | 未確認 | 未確認 |
| 配布検証失敗 | 未確認 | 未確認 | 未確認 | 未確認 |
| Shop Serve失敗 | 未確認 | 未確認 | 未確認 | 未確認 |
| Browser導入失敗 | 未確認 | 未確認 | 未確認 | 未確認 |
| Assertion期待不一致 | 未確認 | 未確認 | 未確認 | 未確認 |
| Artifact保存失敗 | 未確認 | 未確認 | 未確認 | 未確認 |
| 旧SHAの成功Run | 未確認 | 未確認 | 未確認 | 未確認 |

## M10-05 AI提案の採否と最終報告

- Case/仕様ID、対象specとその依存ファイル、ローカル実行結果（未実行は未実行）：
- PR base/head・差分・実行したworkflowのSHA・対象Run ID/attempt・job Check：
- Artifactの`target-sha.txt`とPlaywright JSON、対象1 spec、PASS/FAIL/SKIP、検証範囲：
- 提案された変更と採否（根拠のないTimeout延長、権限拡大、Checkのみで成功扱いする提案は拒否）：
- 本人が独立確認した事実、残るリスク・未確認事項、次に必要なRunまたは停止条件：
- GitHub API照合が取得不能・失敗の場合の結論（`BLOCKED`/`未確認`、成功への読み替え禁止）：

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
