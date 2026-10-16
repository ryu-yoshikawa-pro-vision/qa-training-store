# 新規AI協働テスト自動化カリキュラム構築Plan

## 目的と採用方針

**目的は、AIエージェントと協働してテスト自動化を構築・検証・改善できる人材を育成すること。** QA活動全体やGitHubの一般的な運用を網羅することではない。受講者は手動テスト経験者を想定し、AIエージェント・プログラミング・GitHubの未経験者も対象にする。

学習期間・業務環境に応じて次の**3フェーズで受講を終了できる**構成とする。各フェーズに独立した学習目標・確認クイズ・実技・修了判定を用意する。

| フェーズ | 対象モジュール | 目的 | 修了したらできること | 受講上の位置 |
| --- | --- | --- | --- | --- |
| **Phase 1：AIエージェントとテスト分析・設計** | M00〜M04 | AI初心者が安全な操作・Skill利用を覚え、自動化に必要な仕様分析・テスト設計を行う | AIと協働して、根拠を示せるテスト条件・ケース・自動化候補を設計し、生成結果をレビューできる | 単独受講・修了可能。Phase 2の前提 |
| **Phase 2：Playwright構築・実装・実行・改善** | M05〜M07 | Phase 1の成果物から、ローカルで実行できる自動テストを構築する | 環境設定、実装、Seed/Reset、実行、失敗分析、保守改善ができる | Phase 1修了後に受講。ここまででPlaywright自動化の修了 |
| **Phase 3：GitHub・CIによる継続実行** | M08〜M10 | Phase 2のテスト資産をGitHubで管理し、CIへ組み込む | PRレビュー、対象SHAのCI実行・Artifact・失敗対応と品質ゲートを扱える | **選択**。Phase 1・2の修了要件には含めない |

- Phase 1とPhase 2は**GitHubアカウント、PR、GitHub Actions、CIを必要としない**。教材・課題は配布済みローカルファイルと利用可能なAI環境だけで進められるようにする。Phase 2で使うNode.js・Playwright等の導入は別途必要。
- Phase 1の学習対象はテスト自動化に必要なテスト分析・設計に限る。広範なQA管理・全テスト技法の習熟を目的にしない。
- Phase 3ではPhase 2で作成したテストを再利用し、分析・実装のやり直しを必須にしない。
- **各フェーズの最後に独立した修了課題**を置く。Phase 1は設計、Phase 2はローカルE2E、Phase 3はGitHub・CI。従来のM10はPhase 3の総合演習として扱い、Phase 1・2の必修に含めない。
- 11モジュール／51学習項目は現時点の設計案。目標と評価に照らして必要な追加・整理は認めるが、数合わせで増やさない。

## 既存カリキュラムとは独立して作る

- 旧教材：`docs/curriculum/test-automation/`の17レッスン、104問、C01〜C12、旧修了判定は**変更しない**。
- 新教材：`docs/curriculum/ai-assisted-qa/`に独立した入口、フェーズ別導線、説明、クイズと解答、実技、修了基準を作成する。
- 新実技：必要な場合は`training/ai-assisted-qa-course/`に配置する。既存`training/playwright/`、`training/agentic-qa/`、旧Training Copyの契約を壊さない。
- 仕様・テスト対象はScenario Shopの`docs/spec/`等を参照し、製品の正式な仕様・Seed・回帰テストを不用意に変更しない。
- **本PR #199ではPlanのMarkdownだけを変更**する。教材・コード・CI実装はCodexに引き継ぐ。PR #198に変更しない。

## 設計文書の読み順

1. [調査と既存課程の境界](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md)：旧契約と3フェーズ化にあたっての再利用範囲・未確認事項。
2. [学習目的・3フェーズの構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)：受講者像、モジュール、フェーズ間の引継ぎ、段階別の修了目標。
3. [学習項目と理解水準](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)：M00〜M10の学ぶ内容・評価手段、フェーズごとの必須範囲。
4. [確認クイズ・正答・解説](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)：初心者から段階的に確認する問題、正答・誤答説明・復習先。
5. [評価・各フェーズの修了条件](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)：知識・実技・判断、未達・BLOCKED、フェーズ別の合否。
6. [Scenario Shop・実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)：ローカル配布と成果物の引継ぎ、Playwright、選択Phase 3のCI、旧実装との分離。

## 実装作業の順序（Codex引継ぎ）

1. PR #199のHEADとPR #198、`docs/spec/`、既存教材・Training・validator・CIの最新状態を確認する。Planと現行実装の食い違いを報告する。
2. 新教材ディレクトリを作り、トップREADMEで**Phase 1のみ／Phase 1〜2／全3フェーズ**の受講経路と修了の違いを示す。Phase 1・2にGitHub操作やCIを要求しない。
3. [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)から、各モジュールの必要な説明・最小例・確認クイズ・正答解説・復習先・実技評価を作る。前提を教えずに専門知識を使わせない。
4. Phase 1の**誘導付きのAI操作→自分で依頼→初見の仕様分析・設計**の流れを作る。実在するSkillの発見・使用条件・依存と、AIの誤った推論の見抜き方を教材にする。失敗を伴う環境制約はBLOCKEDと区別する。
5. Phase 1の成果物（仕様根拠・Risk/Condition/Case・採否理由）をローカルで保存し、Phase 2へ引き継げる形にする。Phase 1修了時にPlaywrightやGitHubの実行を要求しない。
6. Phase 2の**Node.js/TypeScript/Playwrightの導入・最小設定→実装・Reset→実行→失敗分析・保守**を独立して作る。新課程専用のspecと結果パスを設定し、ローカル完結の総合演習を用意する。
7. Phase 3のGit/GitHub/PR、専用Training Copy、GitHub Actionsの構築・実行・Artifact、CI失敗時の切り分けを**選択課程**として実装する。Phase 1・2の合否には参照させない。
8. フェーズ単位で学習項目↔教材↔クイズと正解解説↔実技↔修了条件を照合する。旧課程の検証を回帰として実行し、別フェーズの証拠・実績を流用しない。

## 安全・互換性の境界

| 対象 | 変更方針 |
| --- | --- |
| `docs/curriculum/test-automation/**` | 参照のみ。編集・移動・削除しない |
| 旧`scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts` | 旧課程の判定と出力の意味を維持。新課程と共用しない |
| `training/playwright/**`、`training/workbook/**` | 必要な読み取り・再利用は可。旧課程の提出物・実行入口は変更しない |
| `training/agentic-qa/**` | 別の探索QA Challenge。新カリキュラムに置換しない |
| 正式製品・仕様・Seed・`e2e/web/**` | テスト対象として使い、教材のために故意の不具合を入れない |
| 新課程の`docs/curriculum/ai-assisted-qa/**`・`training/ai-assisted-qa-course/**` | 学習目標・教材・演習・評価を独立して管理 |
| 共有`package.json`／workflow | 新課程の追加に必須なものだけ加え、既存コマンド・旧コピーの許可リストを壊さない |

## 完了の定義

**Planの完成**：3フェーズそれぞれの目的・必須範囲・初心者向け教材の学習順序・確認クイズ・正答解説の作成規則・フェーズごとの実技評価・引継ぎ・ローカル／GitHubの境界を明文化している。

**教材実装の完成**：各フェーズを**その到達点だけで修了**でき、Phase 1にはGitHub・Playwrightの必須条件がなく、Phase 2にはGitHub・CIの必須条件がない。Phase 3だけがGitHub・CIを必要とする。実際のSkill利用、Playwright実行、CIは実行証拠で検証する。

**今回の変更範囲**：Planのみ。教材実装・merge・PR #198の変更・PR #199のcloseは行わない。
