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

## 反復実践：実CI証拠と変更条件を判断する（P01〜P06）

M10の基礎手順では**本人所有の非公開repoで1回の実CI**を通し、現HEAD・Run・Check・Artifact・Playwright JSONを照合します。その実Runを出発点に、次の別条件を検証します。新しい課金やCI実行が必要な操作は本人が利用枠・権限・対象を確認し許可してから行い、架空例は実行証拠と区別します。

1. **P01 別の変更を安全にPRへ含める（M10-01）**：M07で追加した3番目の回帰testと、M09の専用workflowの依存ファイルをそれぞれ確認します。提出候補のdiffを読み、学習外の生成物、Secret、旧カリキュラムのspecが含まれていないことを示します。**証拠**：Case→spec→依存→workflow対象の対応、除外した差分。
2. **P02 実Runnerで再現できる条件を確認（M10-02）**：最初のCI RunのNode版、Browser導入、`PLAYWRIGHT_TEST_ROOT`、Shop Serve、標準Runner、権限を手元の実行条件と比較します。値が違う項目だけ「なぜ変えても妥当か/何が壊れ得るか」を説明し、必要のない依存追加・deployをしません。**証拠**：ローカルと実CIの条件差と採否。
3. **P03 実Runの証拠を自分で辿る（M10-03）**：GitHub APIによる正式照合に加えて、本人がWeb画面でPR HEAD→Run→Check→Artifact→`target-sha.txt`→Playwright test数を追います。Runの成功・全testのPASS・SKIP・対象SHAを区別します。**証拠**：実在するIDと結果、API照合が否定した場合の理由。
4. **P04 新しいcommitで旧Runが無効になる条件（M10-03）**：**架空の変更後HEAD B**（実HEAD Aとは異なる40桁SHA）を使って、旧Runのtarget SHA=Aのときに承認できない理由、必要な新Runと費用確認を述べます。実際の追加commit/CI実行は任意ではなく、本人の明示的な料金・権限確認が必要です。**証拠**：A/Bの対応表、実行した操作と仮定の区別。
5. **P05 CI失敗時の調査順（M10-04）**：実Runのログ、または「Browser未導入」「Assertion期待不一致」「Artifactがない」という**明示した学習用シナリオ**で、最初に失敗したstep、test実行の有無、修正してよい範囲、再実行の要否を検討します。Timeout延長や再Runだけで原因修正としません。**証拠**：失敗ごとの仮説と不足証拠。
6. **P06 安全な運用判断と最終報告（M10-04・05）**：もしチームから「毎push自動で回したい」という追加要望が来たら、現在の手動起動、利用枠、権限、対象spec、不要trigger停止の条件を比較します。AIに報告案を作らせても、本人が実Run/Case/費用の根拠を照合して採否します。**証拠**：採用/保留/停止の条件と、実際の確認済み範囲を明示した報告。

**完了条件**：P03の実Run証拠は必須ですが、P04/P05の架空事例から追加の有料Runを勝手に起動しません。旧SHAの成功、合成ログ、未実行の診断を修了証拠として扱わないでください。

### 固定Skillとの協働

`e2e-test-reporting`・`adversarial-review`で本人の実Runに基づく報告の不足を点検します。確認するのは実PR HEAD・Check・Artifact・Playwright JSON・未検証範囲です。GitHub tokenやSecretをモデルへ渡さず、Skillの成功報告もGitHub APIの独立照合で検証してください。モデル/Skillが使えない場合は状態と理由を残し、CI未実行を実行済みにしません。
