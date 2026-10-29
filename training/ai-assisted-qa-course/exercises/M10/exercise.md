# M10 実技：対象SHAに結び付くCI証拠

## 入力

M07のテスト、M09から引き継いだ修正済みworkflow案（ない場合はM10公開fallback）、PR上の練習差分を使います。M09の案をそのまま有効化せず、対象、権限、変更範囲を確認してからM10の実行案を作ります。Templateへの自動配置・有効化は行いません。

## 手順

1. workspace外の変更、Secret、不要ファイルを含まない差分を選びます。
2. 対象specだけを動かすworkflow案を作り、permissions: contents: read、Secretなし、deployなしを確かめます。
3. ローカルとCIで異なるNode、Browser、環境変数、並列性を記録します。
4. Artifact内のtarget-sha.txtが現在のPR HEADと完全一致すること、CheckとArtifactが同じRunに属することを確認します。
5. CI-only failureとspec failureをログで分け、再実行の理由と採否を報告します。
6. AI提案の変更と人が確認した範囲、未確認事項を記録します。
7. 失敗時に何を確認するまで再実行しないか、費用・権限・trigger条件が変わった場合に何を停止または見直すかを記録します。不要になったworkflowのtriggerを止める手順も、本人のrepoで行える範囲に限定して説明します。

## 提出物

`workspace/M10/submission.md`にdiff、workflow、対象SHA、Run/Check/Artifact、失敗分析、判断と未確認事項をまとめます。実際の照合には`workspace/M10/ci-run-evidence.json`を使います。Templateから作成されたJSONの`OWNER/REPOSITORY`、PR番号、PR headの40桁SHA、Run IDを本人が記入してください。`check_name`、`artifact_name`、`workflow_path`は有効化した専用workflowと一致させます。SecretやTokenはこのJSON・提出物へ記録せず、読取り権限を持つ`GH_TOKEN`または`GITHUB_TOKEN`環境変数として扱います。

`pnpm course:check M10 --state end`は入力の存在と構造だけを確認します。正式評価の`pnpm course:assess M10 --model provider/model-id`はGitHub APIから現在のPR head、対象workflowのRun、Check、ArtifactとそのSHA/Playwright結果を照合します。M10の証拠が古い、失敗、取得不能、または対象SHAが違う場合は修了になりません。API tokenはAIへ送信しません。fine-grained tokenを使う場合は対象の本人repoに限定し、Contents: read、Actions: read、Checks: read、Pull requests: readだけを付与してください。書込み権限・Secret参照権限は不要です。

## 理解ノード別の確認

既存のworkflow設計・実Runの証拠を利用して次の能力を個別に確認し、本人が未実行の場合は未確認として記録してください。

- **K-M10-06**：同一RunのSHA・実行対象spec・PASS/FAIL/SKIP・Artifactを照合できる
- **K-M10-07**：失敗原因・費用・権限・後続影響に基づきtrigger停止と再実行を判断できる

## 反復実践 P01〜P06：実CIと変更条件を結び付ける

本人の非公開repoだけで操作し、課金・Runner・権限・手動実行条件を確認します。未承認の追加Runや他のCI有効化を行いません。

1. **P01** M07の本人specとM09の無効workflowから、PRへ含める安全な変更を選び、差分とCase/BR/ACを照合する（M10-01）。
2. **P02** 必要最小の専用workflowを明示的に有効化し、対象specの実Runを取得する。実行前に利用枠、Secret不要、read権限、手動停止条件を確認する（M10-02）。
3. **P03** 実PR HEAD・Run・Check・Artifact・Playwright JSON・target SHAを同じ実行として照合し、最新でない証拠を不採用とする（M10-03）。
4. **P04** 新しいcommitが加わった場合、古い成功Runで現在のHEADを承認できない理由を確認する。追加実Runは本人が費用と権限を確認して許可した場合に限る（M10-03）。
5. **P05** CI環境失敗とspec Assertion失敗の実ログまたは明示した学習用資料を比較し、原因仮説・追加証拠・再実行可否を判断する（M10-04）。
6. **P06** モデルやAIからの修正提案を採否し、確認範囲・未実行・費用・権限・不要trigger停止を含む最終報告を作る（M10-04・05）。

`ci-run-evidence.json`には本人が実際に照合した値のみ記入します。合成ログ、別SHA、失敗・未実行を成功と記録しないでください。
