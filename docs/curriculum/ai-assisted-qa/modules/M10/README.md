# M10：Phase 3総合演習

## このモジュールで学ぶこと

M10ではPhase 2で動作確認した同じspecを使い、Git差分からPull Request、専用CI、現在のHEADに一致するRun/Check/Artifactまでつなぎます。テストケース一式を作り直す課題ではありません。Phase 3を受講しない場合、Phase 1・2の修了状態は変わりません。

## 通し演習の流れ

1. M07から保全したspec、Config、依存、Reset、コマンド、直近Runを確認する。specがない場合はM10公開fallbackを選び、選択した入力のpathとrevisionを記録する。
2. Git差分を見て必要なコード・設定だけを選び、ログ・Secret・不要な生成物を除外する。
3. 学習用リポジトリに変更をcommitし、PRにCase/仕様ID、ローカル実行結果、残る制約を書く。
4. Phase 3用workflowが同じspecを対象にすること、権限が最小でdeploy/Secretがないことをレビューする。
5. PR HEADとworkflow runの対象SHAを照合し、実際の結果とArtifactを確かめる。未実行なら未実行と報告する。
6. CIだけの失敗、テストの問題、製品の問題を最初のログから区別し、必要なら別Runで調べる。

公開サンプルはworkflowの構成と期待契約を検査します。外部Templateから作成した学習者リポジトリの実際のRunはfixtureで代替せず、実地検証として別記録に残します。

## Phase 3修了評価

[`assessment/phase-3-rubric.md`](../../../../../training/ai-assisted-qa-course/assessment/phase-3-rubric.md)の公開観点で、差分の選択、安全なworkflow、同一SHAの証拠、失敗分類、未確認事項を確認します。本人はCIが確認した内容と保証しない内容を分けます。未提示条件で、別SHAの成功Runを現在の合格証拠にできるかも判断します。

M07の本人成果物があれば`workspace/M07/repaired-assertion.spec.ts`をそのまま使い、`PLAYWRIGHT_TEST_ROOT: workspace/M07`を指定します。本人の過去のファイルは修正・上書きしません。M07成果物がない場合はM10専用fallbackを選び、`PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample`を指定します。fallbackにはM07相当の安全なspec・Config・依存/Reset参照・実行結果と、M09の無効化workflow見本を同梱します。いずれの経路も同期済み`course/shop/`をServeし、学習者側で`build:web`を実行しません。workflowは`workspace/M10/public-sample/`内に置き、`.github/workflows/`へ自動配置・有効化しません。M10ロードはM10の成果物だけを配置します。

## 確認と復習

[M10の確認クイズ](../../quizzes/M10.json)を回答します。SHA・Run・Artifactのいずれかが一致しない場合は、その組を証拠として採用せず、現在のHEADで検証を再実行します。

## 参考

- [M10の学習項目](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 3評価基準](../../../../../training/ai-assisted-qa-course/assessment/phase-3-rubric.md)
- [開始・終了状態契約](../../../../../training/ai-assisted-qa-course/states/M10/start.json)
