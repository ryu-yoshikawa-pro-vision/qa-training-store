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
8. 合成ログA〜FのBuild失敗、Test失敗、Artifact保存失敗、Install失敗、配布物検証失敗、Serve失敗をstep conclusionと`if-no-files-found`条件から分類します。Test失敗後の`if: always()` uploadを未実行と誤認せず、実Runで確認すべき証拠を記録します。Runner条件・料金の未確認事項も分けます。
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

1. **P01 別の起動条件を設計（M09-01・04）**：基準案のtrigger、job、steps、runner、permissionsを読んだ後、`workspace/M09/trigger-review.yml.disabled`に「手動起動だけ」とする別案を作ります。`workflow_dispatch`では`github.event.pull_request.head.sha`を取得できないため、**PR用のSHA照合式を残したままtriggerだけ置換しない**でください。手動実行で選ぶref、checkout対象SHA、そのSHAがPR HEADと一致すると主張できる条件・確認先を明記し、PR HEADを確認できなければ未確認とします。Pushごとの実行案と比較して、検証されない期間・不要なRun・学習者が必要とする操作を記録します。**証拠**：両YAMLのdiff、trigger/job/step/runnerの役割、SHAの由来と選択理由。
2. **P02 PR HEADとmerge SHAの混同を修正（M09-02）**：架空提案「PRで`github.sha`をそのままcheckoutし、これを現在のPR HEADと記録する」をレビューします。基準workflowの`pull_request.head.sha`、checkout後`git rev-parse HEAD`、`EXPECTED_HEAD_SHA`照合、同じRunの`target-sha.txt`を追跡します。PR HEAD更新後の旧成功Run、Run画面のmerge SHA、別Run/再実行attemptのArtifact、test失敗時に残るArtifactを**別条件**として、Run ID/attempt・job Check・checkout SHA・Artifact内SHA・対象spec・採否を記録します。M09では実CIを起動せず、公開Runで観測できない項目は未確認とします。**証拠**：誤/正の対象図、提出欄の照合表、旧成功・別Run・欠落Artifactを不採用にする理由。
3. **P03 初見ログの原因箇所を特定（M09-03）**：まず`workspace/M09/failure-cases.md`の合成A〜Fについて、最初の失敗step・実行済み/skipped/不明・根拠行を6行で記録します。次に別条件の架空X「Browser導入失敗でtest未起動」、Y「test PASSだがArtifact upload失敗」、Z「checkoutが別SHA」を検討します。Zはcheckout成功でもSHA不一致で証拠不採用となり得るため、失敗stepを断定しません。**証拠**：合成6行＋別条件3行の診断表（step/conclusion・未実行・根拠・次に確認するRun/設定/操作）。実Run成功の証拠には使いません。
4. **P04 CI費用の条件変更（M09-04）**：A「同じPRを1日3回更新（7日間）」とB「同じPRを週2回だけ更新（7日間）」を**独立した架空シナリオ**として比較します。どちらも「PR更新1回につき対象workflowが1回起動、再実行・重複イベントなし」と仮定し、自動案のRun数を計算します。手動案は本人が選んだ実行回数とタイミングを明示し、0回なら未検証とします。**各条件で**Runner OS、対象の1件のspecと除外テスト、必要な品質ゲート、未検証期間、job分数・Artifact保存量の確認先、非公開repoのBilling・支払主体・無料枠残量を記録します。料金をRun数だけで断定せず、費用/権限が未確認なら有効化せずBLOCKED、失敗時やPR HEAD更新時の再検証条件も示します。**証拠**：A/B×自動/手動の4行比較、判断変更の理由、未確認と停止条件。M09では実Runを作りません。
5. **P05 権限を増やすAI提案を拒否（M09-05）**：架空提案「Artifact保存のため`permissions: write-all`とdeploy用Secretを追加」を拒否するか判断します。完成見本の`checkout`、依存導入・Browser・対象spec、`upload-artifact`を**step別に**確認し、必要な`contents: read`と不要なwrite/Secret/deployを区別します。`persist-credentials: false`は認証情報の保持を減らす設定であり、Runnerの外部通信や依存スクリプトの安全を保証しないことも説明します。さらに別条件「外部PRのコードを`pull_request_target`でcheckoutして実行し、deploy Secretを渡す」というAI提案を検討し、信頼境界・拒否理由・有効化を止める条件を記録します。第三者Actionの版変更も根拠なしに採用しません。**証拠**：2提案の採否、step→権限/Secretの対応表、修正後の権限YAML、未確認事項。
6. **P06 M10で検証可能な引継ぎを作る（M09-01〜05）**：基準の`.disabled`案に戻り、M07の実spec path、固定Shop Serve、Browser、対象SHA、test JSON、Artifact名、権限、起動・停止条件を再確認します。**対象specが新課程専用であること、既存Web/Mobile CIやdeployを起動・変更しないこと、Secretが環境変数・ログ・Artifactへ入らない設計であること**を既存workflow/提出物と区別して点検します。別条件案を有効化せず、M10本人repoのイベント・fork入力・外部Action/依存・Billing/権限が未確認ならBLOCKEDを残します。**証拠**：基準workflowの最終diff、step別の権限・出力先、他CIとの境界、未確認一覧。

**完了条件**：別条件のYAMLを1件以上作って差分を説明し、M10へ渡す基準案は引き続き`.disabled`です。合成ログ・YAML設計を実CI成功として報告しません。
