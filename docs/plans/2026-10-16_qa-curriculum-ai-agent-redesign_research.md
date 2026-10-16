# 調査結果と既存課程からの分離

## 調査対象と確認済みの事実

調査時点：2026-10-16。旧課程の基準はPR #198 HEAD `36803c29efd1df8f09ef7b7d533759f79dc9893f`。新課程の実装前には差分・現行コードを再確認する。

| 対象 | 確認した現状 | 新課程への判断 |
| --- | --- | --- |
| `docs/curriculum/test-automation/` | Part 1は9レッスン、Part 2は8レッスン。既存の学習目標と教材本文がある | **残す**。新課程の上書きや置換はしない |
| 同じ17レッスンの確認問題 | 15レッスンに記述式104問。P1-09/P2-08は総合演習と自己確認 | 必要な知識・説明は参照するが、新課程の問題数・構成の正本にはしない |
| `02_competency-rubric.md` | C01〜C12、Level 0〜3、Web共通・Native選択の評価・修了条件 | **旧課程にのみ適用**。C13を追加しない。新課程は別の到達目標と基準を定義する |
| `scripts/validate-curriculum.ts` | `REQUIRED_CURRICULUM_FILES`が旧17レッスンのファイル名を固定 | 旧validatorを改造しない。新課程を別コマンドで検証する |
| `scripts/training/check-completion.ts` | `COMMON_SELF_CHECK_LESSONS`、`PART2_SELF_CHECK_LESSONS`が旧課程のLesson IDを使用。`validateSelfChecks()`はファイルの存在と非空を検査、`semantic_understanding`は`NOT_EVALUATED` | 新課程の学習効果や合否を旧Completion Receiptへ混在させない |
| `training/workbook/` | 4 CSVによるTarget/Risk/TC/Automation/Executionの記録 | データの表現例として再利用できるが、旧提出物の作成を新課程で強制しない。必要な項目から提出形式を選ぶ |
| `training/playwright/` | baseline、exercises、diagnostic-exercises、failure-exercises、maintenance-exercises、`support/reset-scenario.ts` | 既存教材を破壊せず、helper・演習を参考にして新課程専用の課題を作る |
| `training/agentic-qa/` | 探索的QAのChallengeと採点に関する素材 | 本件の新カリキュラムと責務が異なる。名前を類似させて再利用済みだと扱わない |
| Scenario Shop | Cart・Checkout・PaymentのBR/ACとSeedがあり、初期状態Reset経路が用意されている | 同一製品を題材として共用。仕様・製品コードは旧課程と共通の正本 |
| `qa-workflow-skills` | 調査時の`main`: `dcabbb218cf79f6920f5c8303e60140ab9c15f23`。分析・設計・実装・実行・結果分析などをSkillに分割 | 使用するSkillの選定・実行確認は新課程で独立して行う。PR #16/#17の未マージ内容は必須としない |

参考： [旧課程](../curriculum/test-automation/README.md)、[旧評価](../curriculum/test-automation/02_competency-rubric.md)、[旧validator](../../scripts/validate-curriculum.ts)、[旧修了確認](../../scripts/training/check-completion.ts)、[Training workbook](../../training/workbook/README.md)、[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)。

## 以前のPlanを修正する理由

以前のPlanは、既存17レッスンとC01〜C12を維持し、C13を追加してAI利用を強化する「旧課程の改訂案」だった。しかし今回の目的は**別の新カリキュラム**を作ることなので、その改訂案は不適切。

旧課程の17という数字、既存の分割、旧Completion Receiptの構造を継承する必要はない。一方、Scenario Shop、正式仕様、Seed/ResetやPlaywright helperを複製する理由もない。**教材と評価の正本を分け、製品の正本は共有する**。

## 既存課程との比較で採用するもの・しないもの

- **採用する**：仕様・テスト技法・Playwright・証拠・PR・CIの実務的な知識、Seedを使った再現性のある実習、正式仕様のBR/ACを期待結果の根拠とする姿勢、失敗/未実施/環境障害の区別。
- **変更して採用する**：AIが提案したテスト分析、設計、コード、原因仮説を人間が採否判断する学習を最初から入れる。問題は正答・誤答解説・復習先まで完成させる。
- **採用しない**：17レッスンの固定、C13を旧rubricへ追加、旧104問の一括四択変換、65学習項目/65問の件数固定、初回80%を根拠なく全課程へ一律適用、旧check-completion.tsへの新課程の合否追加。
- **まだ未確認**：OpenCodeとSkillの実行、既存Reset helperを新課程の専用configから呼べるか、最終課題に使える未演習条件、受講者の実際の所要時間と問題の難易度。

## 新旧の独立性を確認する具体的方法

1. 新課程の教材・問題・評価基準を`docs/curriculum/ai-assisted-qa/`に作り、旧 `docs/curriculum/test-automation/` の既存ファイル差分を0件にする。
2. 旧 `validate:curriculum`、`training:completion:check`の公開入力・出力契約を変更しない。新しい合否ロジックは別に作るか、最小構成では受講者向けの公開ルーブリックによる確認とする。
3. `training/ai-assisted-qa-course/`の新spec・演習が旧 `training:web:exercise` / `training:web:diagnostic` / 正式 `e2e/web/` に混入しないことを対象列挙で確かめる。
4. Product Code、Seed、Specを共有する場合、旧課程と正式回帰の期待結果が引き続き成立することを確認する。必要性がない限り変更しない。
5. 新旧どちらのREADMEを開いても、それぞれの学習経路・評価・成果物の所在が一意に分かるようにする。新課程から旧課程へ参照リンクを張るのはよいが、旧課程を新課程の必修入口にしない。

## 調査の限界

本調査はGitHub上の文書・ソース契約の確認に基づく。実際のOpenCode CLI、SkillのPython helper、Playwright、GitHub Actionsの新課程向け実行はしていない。**設計上実現できる見込みと、実行して確認したことは区別する**。動作検証はCodexの実装工程で必要なものだけ行う。
