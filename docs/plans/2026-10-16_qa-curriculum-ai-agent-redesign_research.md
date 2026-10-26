# 調査結果と既存課程からの分離

## 2026-10-26の後続判断について

本書は2026-10-16時点の調査履歴。後日の確定要件である「講師なし・AIによる本人の正式評価」を反映した現行判断は`_decisions.md`・`_assessment.md`・2026-10-25改善Planに定義する。本文中の「評価担当者が本人を採点する」「提出先の指定待ち」は**歴史上の案**であり、現在の実装要件ではない。現行のAI正式評価は個人Codespace内に閉じ、独立したモデルの校正・決定論的証拠検証と学習者本人の再評価を要求する。

## 調査当時の記録と現行の採用方針

本書の調査記録（2026-10-16頃）にある「未確認」「未実装」「モデル検証不要」「本人がBuild」等は当時の状況を示す。現在の採用仕様や実装を上書きしない。既存の`scripts/training/ai-assisted-qa-course.mjs`、`ai-assisted-qa-course-core.mjs`、`training/course-sync/manifest.json`を再利用し、現時点の決定事項は`_decisions.md`・`_design.md`・`_target.md`・`_assessment.md`・2026-10-25改善Planと実コードで確認する。過去の実績を今回HEADの受入成功と混同しない。

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

## 3フェーズへの変更理由と新たな境界

- AIエージェント未経験者は、ファイル参照・ツール実行・権限・Skillの発見や必要な依頼形式を、Playwrightの設定やGitHubの操作より前に学ぶ必要がある。このため**Phase 1（M00〜M04）をAIの基本操作と自動化に必要なテスト分析・設計で完結**させる。
- Phase 1の設計成果物を使って、Phase 2（M05〜M07）でNode.js/Playwrightの導入・最小構成・E2E実装・ローカル実行・保守を学ぶ。これを終えることで**Playwright自動化を単独で構築・実行する能力**を評価できる。
- GitHubを業務上使わない現場や学習工数の制約を考慮し、Phase 3（M08〜M10）は**選択**とする。Codespaces利用のための**GitHubアカウント・作成権限は全フェーズ共通の環境前提**とし、Git・PR・Actions・CIの**操作学習はPhase 3だけ**で要求する。
- Phase 1・2は**Codespaces上のVS Code・ターミナル**で教材を開き、手動のclone・branch作成・PR操作なしで作業できるようにする。Git操作なしで作業成果をダウンロード・保存する手順と、必要なSkill一式の参照方法は実装時に確認する。
- **全フェーズ横断の最終課題1つでは足りない**。Phase 1終了時は初見条件の設計、Phase 2終了時はローカルE2E・診断、Phase 3終了時は既存specのCI化としてそれぞれ実技と修了を設ける。

## Codespaces・無料枠の確認結果（2026-10-16）

| 項目 | リポジトリ／公式情報で確認した事実 | Planでの扱い |
| --- | --- | --- |
| `.devcontainer/devcontainer.json` | TypeScript/Node 24 image、pnpmの依存導入、Chromium、OpenCode CLI `@opencode/cli@2.0.22`、Codex CLI `@openai/codex@0.160.0`、desktop-lite、8081/6080転送を定義 | **新規環境を一から構築しない**。Phase 2でPlaywright設定・環境の意味を教える |
| マシン | `hostRequirements`は未設定。リポジトリで2コアに固定していない | **作成時に2コアを選び確認**する。最小必要コア指定は上限固定でないため本設計では追加しない |
| Codespaces無料枠 | GitHub Freeの**個人**アカウントは120コア時間/月、15 GB-month/月。組織のプランにはCodespaces無料枠がない | 受講者本人の所有・支払主体と残量・予算設定を開始前に確認する。2コアなら理論上最大約60時間/月だが個人の残量は未確認 |
| `docs/guides/codespaces.md` | 初回作成、個人Codespaces Secret、OpenCode CLI、Playwright codegen・6080画面転送、停止方法を記載 | 既存手順を参照し、初心者向けの**講義導線だけ**新設する |
| OpenCode Zen | **2026-10-16時点の調査記録**：無料モデルの利用実績があり、個人`OPENCODE_API_KEY`をCodespaces Secretで扱う想定だった | **現在の実装指示としては採用しない**。OpenCode CLIの個人認証・無料モデルと必要Skillは受講者初回起動時に実確認し、失敗時はBLOCKED。有料への無断切替・Secret記録は禁止 |
| `qa-workflow-skills` | 独立リポジトリ。SkillにPython helper等の実行依存がある | 使用するrevisionと必要なSkill/補助ファイルをCodespaceで認識・実行できるか検証 |
| Playwright Training | `playwright.training.config.ts`は8082専用、出力は`output/training/playwright/`。通常Web表示は8081、noVNCは6080 | 新課程specと結果先を旧Trainingから分離し、誤接続を防ぐ |
| GitHub Actions | 公開リポジトリの標準GitHub-hosted runnerは無料。private repositoryの無料枠・保存容量は別条件 | Phase 3は公開の書込可能なTraining Copyと標準Runnerを第一候補にする。権限と支払主体は実機確認 |

参考：[GitHub利用枠](https://docs.github.com/ja/billing/reference/product-usage-included)、[Codespaces課金](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)、[GitHub Codespacesガイド](../guides/codespaces.md)、[OpenCode Zen](https://opencode.ai/docs/zen/)、[GitHub Actions課金](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

**未確認**：2コアの新規CodespaceでPlaywright/Chromiumと外部`qa-workflow-skills`を含む教材の全工程が成立するか、受講者本人のCodespaces料金の支払主体・残量・演習所要時間、停止・再開後の成果物引継ぎ。**OpenCode Zen無料モデルが使えることは確認済みであり、この項目の検証対象に含めない。**

## 教材の正本と学習者の作業場所の分離（設計決定）

- 公開`qa-training-store`を教材・Scenario Shopの**正本**とし、学習者は**別の公開学習用Templateから作成した個人リポジトリ**のCodespacesで作業する。
- 現在の新課程Planは学習クイズの正答・解説を公開する想定である。学習目的の公開解説を維持し、修了課題・実技の模範解答・採点用テスト・完成状態データもpublicなリポジトリに通常ファイルとして保存する。学習者向けTemplate、同期/ロード、Web Build、公開Artifactからは配布除外し、秘密保持とは説明しない。評価時に初めて提示する具体的条件は事前に公開しない。
- 教材管理者が配布許可リストから同期する処理と、**受講者が`M00`〜`M10`を1つずつ指定してロードする処理**を分離する。ロードは閲覧制限・採点・自動解答ではなく、課題の作業領域への準備である。
- 既存の`scripts/training/prepare-training-copy.ts`は元リポジトリを全体cloneし、旧`training-ci.yml`と`training-native-ci.yml`を有効にする。`scripts/training/validate-training-copy.ts`はその2件だけを許可する。今回の**許可リスト同期・教材ロードの用途にそのまま再利用しない**。旧契約も変更しない。
- 同期された別リポジトリからScenario Shopを実行する方法は**未検証**。Phase 2でアプリを起動し、Seed/Reset・新課程Playwrightを実行できる最小依存関係を確認してから同期対象を確定する。製品コードの別正本は作らない。
- 詳細な処理経路・除外対象・再ロード時の保護・受入試験は[教材同期・ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)に記載する。

## 学習知識の分解と改訂対象の追跡

**51学習項目→必要な理解事項→教材・問題・実技・修了評価**を過不足なく接続し、教材の網羅と評価内容の妥当性を別々に確認する。完成時のデータ契約と受入条件は[知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に定義する。既存JSONに登録済みの58理解事項は、全教材・評価との対応から精査する。他の教育課程の問題・シラバス・監査データを複製せず、この課程の学習目標に必要な知識だけを扱う。

[知識グラフ](../curriculum/ai-assisted-qa/README.md)は正式なBR/AC等を上書きするデータベースではなく、**変更された製品仕様・使用Skillから影響のありそうな学習目標を探すための参照関係**である。Skillは`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`が正本であり、`qa-training-store/.agents/skills/`は参照候補に混ぜない。登録済みの参照関係について認知的な妥当性と実際の学習成果はまだ検証していない。実装の完成には[完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)の全対応・変更影響・受入試験が必要。

## 以前のPlanを修正する理由

以前のPlanは、既存17レッスンとC01〜C12を維持し、C13を追加してAI利用を強化する「旧課程の改訂案」だった。しかし今回の目的は**別の新カリキュラム**を作ることなので、その改訂案は不適切。

旧課程の17という数字、既存の分割、旧Completion Receiptの構造を継承する必要はない。新課程は独立した3フェーズを持ち、Phase 3を受講しなくてもPhase 1/2の修了を妨げない。一方、Scenario Shop、正式仕様、Seed/ResetやPlaywright helperを複製する理由もない。**教材と評価の正本を分け、製品の正本は共有する**。

## 確認できた実装と解消した設計事項

- **別リポジトリの製品実行経路**：既存`package.json`は`pnpm@10.34.5`を使用。`build:web`はフォント・画像manifest・`expo export --platform web`・文書生成を実行する。`playwright.training.config.ts`は8082のloopback、`PLAYWRIGHT_TEST_ROOT`、`webServer`、旧結果先を使用する。`scripts/serve-web-dist.ts`はloopbackのみ許可し、`training/playwright/support/reset-scenario.ts`は`window.__TEST_API__`のリセット後にmetadataを照合する。**この依存経路に基づいてmanifestと新課程Configを定義**し、実機で依存閉包を確認する。
- **Skillの実行順**：外部`qa-workflow-skills`の確定commit（`7cc6cba7772de549841a39d71694cbafbc783324`）には**22 Skill**が存在するが、すべてを配布・習得する必要はない。`e2e-test-implementation`は対象確認結果を要求するため、M06は**`e2e-test-inspection`→`e2e-test-implementation`→`e2e-test-execution`**を使用する。詳細は[実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)に定義する。
- **前成果物の欠落**：**各モジュールに同梱する別条件の公開可能な正しい開始入力**で進める。本人の先行成果物と公開サンプルは**同じ入力契約・異なるID**で扱う。公開模範は学習者配布に含めず、復旧機能や無断上書きは設けない。
- **評価**：各モジュールの`workspace/Mxx/submission.md`と必要な`evidence/`を提出とし、自己確認と担当者による正式な修了判定を分離する。模範との文字列一致だけでなく、別解と根拠を許容する。
- **Template更新**：GitHub Templateは個人リポジトリの作成時点のファイルを複製するが、元Templateの後続変更は既存学習者リポジトリへ自動反映しない。学習中は配布元SHAを維持し、新版は明示的な更新・差分確認後に適用する。
- **CI**：Phase 3の専用workflowはTemplateの標準有効workflowには置かず、教材テンプレートから受講者が明示的に有効化する。旧Trainerと正式回帰workflowの発火を避ける。
- **実装で確定すること**：manifestで許可する最終ファイルとimport閉包、実公開Templateからの2コアCodespace技術受入。受講者個人の無料枠・OpenCodeモデル/認証/必要Skillは本人初回起動時に確認する。2026-10-16のモデル動作実績を現在の接続保証にはしない。
- **当時の運営案（現行では採用しない部分あり）**：学習用Templateの作成先・管理権限は外部作成前に確認する。人間の正式評価担当者や外部提出先を必須にする旧案は2026-10-26の自己学習/AI評価要件により撤回。本人の非公開workspace/エクスポートで評価・再評価履歴を保全する。

## 既存課程との比較で採用するもの・しないもの

- **採用する**：仕様・テスト技法・Playwright・証拠・PR・CIの実務的な知識、Seedを使った再現性のある実習、正式仕様のBR/ACを期待結果の根拠とする姿勢、失敗/未実施/環境障害の区別。
- **変更して採用する**：AIが提案したテスト分析、設計、コード、原因仮説を人間が採否判断する学習を最初から入れる。問題は正答・誤答解説・復習先まで完成させる。
- **採用しない**：17レッスンの固定、C13を旧rubricへ追加、旧104問の一括四択変換、65学習項目/65問の件数固定、初回80%を根拠なく全課程へ一律適用、旧check-completion.tsへの新課程の合否追加。
- **まだ未確認**：学習用リポジトリに必要な最小製品ランタイムと依存、同期・ロードスクリプトの安全性、今回のCodespacesにおける`qa-workflow-skills`の実行、既存Reset helperの再利用、フェーズ別の未演習課題、受講者の実際の所要時間・ストレージ消費・問題の難易度。

## 新旧の独立性を確認する具体的方法

1. 新課程の教材・問題・評価基準を`docs/curriculum/ai-assisted-qa/`に作り、旧 `docs/curriculum/test-automation/` の既存ファイル差分を0件にする。
2. 旧 `validate:curriculum`、`training:completion:check`の公開入力・出力契約を変更しない。新しい合否ロジックは別に作るか、最小構成では受講者向けの公開ルーブリックによる確認とする。
3. `training/ai-assisted-qa-course/`の新spec・演習が旧 `training:web:exercise` / `training:web:diagnostic` / 正式 `e2e/web/` に混入しないことを対象列挙で確かめる。また、同期後の**学習者リポジトリへ模範解答・不要な正式specが配布されない**ことを検証する。
4. Product Code、Seed、Specの正本を維持する。管理者が固定SHAからBuild・検証・同期し、学習者用の配布済み`course/shop/`を**本人の非公開repo内でServe/Reset/Playwright実行できること**を確認する。旧課程・製品回帰の期待結果も維持する。
5. **Codespaces作成にGitHubログインは必要**だが、Phase 1ではPlaywrightとGit操作を、Phase 2ではGit/PR/CI操作を修了条件にしないことを、起動・教材・採点まで確認する。Phase 3の追加資産をPhase 1/2の必須前提へ混ぜない。
6. 新旧どちらのREADMEを開いても、それぞれの学習経路・評価・成果物の所在が一意に分かるようにする。新課程から旧課程へ参照リンクを張るのはよいが、旧課程を新課程の必修入口にしない。

## 調査の限界

本調査はGitHub上の文書・ソース契約の確認に基づく。新課程の外部SkillのPython helper、Playwright、GitHub Actionsの通し実行はしていない。**OpenCode Zen無料モデルの利用可否は確認済み**だが、Skill・Playwright・CIによる教材の実行成功とは区別する。実装に伴う動作検証は後者の必要な経路に限定する。
