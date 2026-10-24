# 公開評価資料

模範解答、採点テスト、完成状態データ、Phase別ルーブリックはpublicなqa-training-storeに通常のMarkdown/JSONファイルとして保存します。Git差分とPull Requestで内容をレビューできます。これらは秘密ではありません。

- reference-solutions/M00.md〜M10.md: 各モジュールの根拠付き標準例。文面一致ではなく意味・出典・判断・証拠を評価します。
- playwright/M05〜M07/: M05の修正版リンクspec、M06の3つのCart Case、M07の意図的失敗specと修正版spec。公開評価用の完成コードです。
- scoring-tests/M00.json〜M10.json: 学習目標/知識ノード別基準と正答/誤答/部分/許容別解/評価不能の校正fixture。自動validatorは構造・参照を確認し、意味上の妥当性や受講者の能力を自動合格にしません。
- completed-states/M00.json〜M10.json: end-state契約に対応する完成参照データ。reference_onlyであり、人間評価や実行成功の記録ではありません。

学習用Template、同期、module load、Web build/public artifactからは配布許可リストで除外します。この除外は秘密保持・アクセス制御ではありません。開発者は既存の`training:ai-assisted-qa:test`と専用Configでこれらの完成specをローカル実行できます。M07の意図的失敗と修正版は別々のtest rootで実行し、前者の期待失敗を通常のPASSと混同しません。M04/M07/M10の本人判断課題では評価時に新しい条件を提示し、具体的な条件・値・失敗資料を公開資料へ事前記録しません。人間の最終承認、評価担当者の採点、実受講者の試行は後工程です。

各moduleのSkill一覧はqa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324の固定revisionに照合しています。受講者の提出物・氏名・成績・Secretはここへ保存しません。個人記録の保存先・権限・管理担当、正式評価担当者は未指定のままです。
