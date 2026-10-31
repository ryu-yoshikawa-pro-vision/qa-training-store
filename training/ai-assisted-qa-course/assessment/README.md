# 公開評価資料

模範解答、採点テスト、完成状態データ、Phase別ルーブリックはpublicなqa-training-storeに通常のMarkdown/JSONファイルとして保存します。Git差分とPull Requestで内容をレビューできます。これらは秘密ではありません。

- reference-solutions/M00.md〜M10.md: 各モジュールの根拠付き標準例。文面一致ではなく意味・出典・判断・証拠を評価します。
- playwright/M05〜M07/: M05の修正版リンクspec、M06の3つのCart Case、M07の意図的失敗specと修正版spec。公開評価用の完成コードです。
- scoring-tests/M00.json〜M10.json: 学習目標/知識ノード別基準と正答/誤答/部分/許容別解/評価不能の公開校正例。`expected_decision`は校正fixtureのラベルであり、受講者のLevel 0〜3へ変換しません。正式評価はM04/M07/M10で独立AI候補、実証拠・版のNode.js検証、全Phase目標の決定論的集計を行います。
- completed-states/M00.json〜M10.json: end-state契約に対応する完成参照データ。reference_onlyであり、受講者本人の評価結果や実行成功を記録したものではありません。

学習用Template、同期、module load、Web build/public artifactからは配布許可リストで除外します。この除外は秘密保持・アクセス制御ではありません。学習用CLIは配布元SHAへ固定した公開評価資料を必要なPhaseの分だけHTTPS取得し、パス・content SHA-256・schema・revisionを検証します。開発者は既存の`training:ai-assisted-qa:test`と専用Configで完成specをローカル実行できます。M07の意図的失敗と修正版は別々のtest rootで実行し、前者の期待失敗を通常のPASSと混同しません。M04/M07/M10の本人判断課題では評価時に出典と期待結果を検証できる条件変化を作り、条件・本人回答・証拠ハッシュは個人の非公開評価記録だけに保存します。人間の最終承認や評価担当者による採点は要求しません。実受講者の学習効果試行は後工程です。

各moduleのSkill一覧はqa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324の固定revisionに照合しています。受講者の提出物・氏名・評価結果・Secretはここへ保存しません。本人の評価記録は`workspace/.course-assessments/`でGit外に保管し、`workspace/.gitignore`で除外します。評価者や中央成績DBを必要としません。
