# M09 実技：CIの権限と証拠を読む

## 入力

無効化されたworkflow教材を読み、GitHub ActionsのTrigger、Job、Runner、Step、Build、Test、Artifactを特定します。`workspace/M09/failure-cases.md`の合成ログを使い、実際の実行証拠と区別します。

## 手順

1. `course/templates/phase3/course-e2e.workflow.yml.disabled`を開き、起動条件が対象PRに合うか読みます。無効化された教材なので有効化しません。
2. permissionsはcontents: readを基本に必要性を説明します。
3. Secret不要、deployなし、テスト対象をM06/M07に限定した案を検討します。
4. PR HEAD、Run、Check、Artifact、Artifact内のtarget-sha.txtの対応を表にし、記録された対象SHAがPR HEADと一致するか確認します。
5. 合成ログのBuild失敗、Test失敗、Artifact未生成を区別し、調査するstep logを選びます。これらを実行済みCI結果として報告しません。
6. public標準Runnerとprivate/larger runnerの利用条件を公式情報で照合し、料金を推測しません。

## 提出物

`workspace/M09/submission.md`にworkflowの読み取り、最小権限案、証拠の対応、料金や組織設定で未確認の事項を残します。
