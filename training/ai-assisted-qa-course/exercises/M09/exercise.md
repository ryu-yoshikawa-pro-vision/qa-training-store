# M09 実技：CI workflow案の修正と証拠の読解

## 入力

workspace/M09/public-sample/handoff.mdの合成branch/commit/PR履歴か、契約を満たす本人のM08成果物、安全な完成見本、未完成のworkspace案、workspace/M09/failure-cases.mdの合成ログを使います。合成handoffと合成ログは実際のGitHub/CI実行証拠ではありません。前工程成果物がないときに、公開handoffをM08修了の証明として扱いません。

## 手順

1. 本人のM08成果物を使うか、合成handoffを前工程契約の代替入力として使うかを記録します。`TRAINING-*`を実在IDや修了記録と読み替えません。
2. course/templates/phase3/course-e2e.workflow.yml.disabledを読み、Trigger、権限、PR HEAD、事前ビルド済みShopのServe、Browser、Test、Artifactを特定します。
3. workspace/M09/course-e2e.workflow.yml.disabledを完成見本と比較します。github.shaによるcheckoutがPR HEADを保証しないこと、Browser導入と対象SHA/結果Artifactの対応が欠けていることを説明します。受講者workflowに`build:web`を追加しないことも確認します。
4. workspace内の案を修正し、PRのhead SHAをcheckout・記録し、必要なBrowserと`PLAYWRIGHT_TEST_ROOT: workspace/M07`の新課程専用specを実行し、同じRunの証拠をArtifactにします。
5. permissions: contents: readを基本にし、Secret不要、deployなし、対象spec限定の理由を記録します。
6. 修正後のworkflow案は.disabledを保ち、.github/workflows/へ移動・有効化しません。Templateにも自動配置しません。
7. PR HEAD、Run、Check、Artifact、Artifact内のtarget-sha.txtを対応付けます。未実行ならその証拠は未確認と記録します。
8. 合成ログのBuild失敗、Test失敗、Artifact未生成を区別し、最初に調べるstepを選びます。Runner条件・料金の未確認事項も分けます。
9. 本人の非公開repoを想定し、PR更新の回数、選択するRunner、対象spec、利用枠の確認先を記録します。手動triggerへ変更した場合の費用と未検証期間を比較し、失敗時に停止または再実行する条件を説明します。
10. 提案されたworkflowに書込権限やSecretがある場合、それぞれの必要性を確認して不要な権限を除きます。別のCIを同時に起動する変更条件でも、対象と権限を再確認します。

## 提出物

workspace/M09/submission.mdにworkflowの読解、最小権限、証拠対応、ログ分類、未確認事項を記録します。修正した.disabled workflow案はworkspace/M09/course-e2e.workflow.yml.disabledに残し、M10への独立した成果物として引き継ぎます。実際にRunがないときは、Run/Check/Artifactを実行済みと報告しません。

## 理解ノード別の確認

既存のworkflow設計・実Runの証拠を利用して次の能力を個別に確認し、本人が未実行の場合は未確認として記録してください。

- **K-M09-06**：event・job・step・Runnerと対象specの関係を読み、workflowを修正できる
- **K-M09-07**：trigger頻度、検証範囲、費用、未検証期間の関係から安全な実行方針を選べる

## 反復実践：条件を変えたworkflow案を安全に設計する（P01〜P06）

元の`course-e2e.workflow.yml.disabled`はM10へ渡す基準案として保全します。以下では**別条件のworkflow案を個人workspace内の別名`.disabled`ファイルとして作り、差分・理由・未実行を残す**演習です。M09では`.github/workflows/`に配置せず、CIも起動しません。

1. **P01 別の起動条件を設計（M09-01・04）**：基準案のtrigger、job、steps、permissionsを読んだ後、`workspace/M09/trigger-review.yml.disabled`に「手動起動だけ」とする別案を作ります。Pushごとの実行案と比較して、検証されない期間・不要なRun・学習者が必要とする操作を記録します。**証拠**：両YAMLのdiffと選択理由。
2. **P02 PR HEADとmerge SHAの混同を修正（M09-02）**：架空提案「PRで`github.sha`をそのままcheckoutし、これを現在のPR HEADと記録する」をレビューします。`pull_request.head.sha`等の対象コミット指定とcheckout結果の記録、Artifact内`target-sha.txt`の対応を基準workflowで確かめます。**証拠**：誤った対象と正しい対象の図、影響する証拠。
3. **P03 初見ログの原因箇所を特定（M09-03）**：合成ログとは別に、架空ケースA「Browserインストール失敗でtest未起動」、B「test PASSだがArtifact upload失敗」、C「checkoutが別SHA」を検討し、最初に見るstep、残っている証拠、再実行前の確認を整理します。**証拠**：3行の診断表（失敗step・Run・未確認・次の操作）。
4. **P04 CI費用の条件変更（M09-04）**：架空条件「1日3回のpush」「通常は週2回だけ変更」「GitHub-hosted Runnerの残量不明」について、push連動と手動起動のリスクを比較します。無料枠を数値で推測せず、Run分数・保存量・支払主体の実画面の確認先とBLOCKED条件を明記します。**証拠**：頻度変更前後の判断・利用条件。
5. **P05 権限を増やすAI提案を拒否（M09-05）**：架空提案「Artifact保存のため`permissions: write-all`とdeploy用Secretを追加」を、専用workflowの実際の責務と照合します。必要な権限を1件ずつ説明し、不要な権限・Secret・第三者Action変更を拒否します。**証拠**：採否、修正後の権限YAML、理由。
6. **P06 M10で検証可能な引継ぎを作る（M09-01〜05）**：基準の`.disabled`案に戻り、M07の実spec path、固定Shop Serve、Browser、対象SHA、test JSON、Artifact名、権限、起動・停止条件を再確認します。上の別条件案をそのまま有効化せず、**M10本人repoで実行する前に必要な確認事項**を提出します。**証拠**：基準workflowの最終diffと未確認一覧。

**完了条件**：別条件のYAMLを1件以上作って差分を説明し、M10へ渡す基準案は引き続き`.disabled`です。合成ログ・YAML設計を実CI成功として報告しません。
