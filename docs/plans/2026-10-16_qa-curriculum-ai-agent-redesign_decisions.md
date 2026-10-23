# AI協働テスト自動化カリキュラム：決定事項・残確認事項

## この文書の扱い

[文書インデックス](./2026-10-16_qa-curriculum-ai-agent-redesign_index.md)から参照する、PR #199の**設計判断と未完了の確認事項の管理表**。内容はこのPRのPlanと確認済みの既存実装に基づく。ここに書かれた概要だけで仕様・実装を決めず、各項目の参照先を正本とする。

次を混同しない。

- **ユーザーが明示した方針**：会話で指定・合意された制約。変更には別途確認が必要。
- **Planで採用した設計**：現行Planに明記した実装方針。ユーザーが個別にすべて承認したという意味ではない。
- **既存実装で確認した事実**：参照したファイル・commit時点の挙動。新課程での動作成功を保証しない。
- **運営上の指定待ち**：実際の名称・担当者・保存先など、運営する人による選定を要する事項。
- **開発工程での実装・検証待ち**：教材・機能・データ・評価基準の未作成、必須の自動/静的/契約検証など、実装完了に必要な未達事項。
- **実装完了後の実地検証・運用判断待ち**：全量実装後に実際の受講者・評価担当者・実環境で確認する事項と、運営担当者による指定を要する事項。未実施だけでは実装未完了や実装工程のBLOCKEDとしない。

確認事項を解消したら、**証拠とともに該当するPlanを更新してから、この表の状態を更新**する。未実行をPASSにしない。

## ユーザーが明示した方針

| 決定内容 | 内容と境界 | 参照先 |
| --- | --- | --- |
| カリキュラムの目標 | AIと協働してテスト分析・設計・自動化・実行・改善し、AIの結果を根拠で判断できるようにする。対象者は開発未経験者も含むQA担当者 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |
| 3フェーズ・学習順序 | Phase 1は分析・設計、Phase 2はPlaywright、Phase 3はGitHub・CI。フェーズごとに独立して修了でき、Phase 3は選択 | [3フェーズ構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 学習用リポジトリへの分離 | `qa-training-store`は公開の教材正本として維持。受講者の課題作業用に別リポジトリを設け、正解の先読みを防ぐため公開範囲を分ける | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| Web公開とインタラクティブな確認クイズ | **これから新規制作する新課程M00〜M10の教材Markdownと四択問題・正答・公開解説を格納したモジュール別JSONからWebを生成し、各モジュールで一問ずつ回答→全問終了後の結果・正誤解説・復習**を実装する。既存から再利用するのは静的Web公開処理であり、旧課程の教材・104問ではない。公開Web閲覧・クイズはGitHubログインを必須にしない。実技は従来どおり本人のCodespacesで行う | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) |
| 受講者によるモジュール単位ロード | **ロードするのは学習者本人**。M00〜M10から指定した1モジュールだけをロードし、他モジュールへ自動で進まない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| QA workflow Skillの参照先 | **`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**を対象とする。このリポジトリ内の別用途のSkillを混同しない | [実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Planの到達点 | **完成形まで設計する**。一部の機能や評価だけを完成条件として扱わない。実装済みでないことは実装状態として正しく記録する | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| OpenCode Zen | **無料モデルが利用可能なことは確認済み**。利用可否・認証可否の再検証を作業に含めない。Secretの保護や意図しない有料モデルへの切替防止は維持 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |
| 各モジュールの正解状態 | M00〜M10の各開始・終了の**実データと照合条件を作る**。先行成果物が失われても、後続モジュールが必要とする正しい入力で着手できる設計とする | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 復旧機能は作らない | 本人ファイルの自動復元、復旧コマンド、他モジュールの無断ロードは対象外。基準データ・判定契約は作る | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |

## 現在のPlanで採用している設計

| 採用事項 | 設計済みの内容 | 参照先 |
| --- | --- | --- |
| 教材の配布境界 | 管理者が固定SHAと許可リストで公開Templateへ同期。学習者はそこから作成した個人リポジトリのCodespacesで作業。公開履歴に修了模範や採点用テストを置かない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 前工程の成果物がない場合 | 各モジュールに**先行修了課題と異なる条件の検証済み公開開始入力**を同梱。本人成果物とサンプルは**同じ入力契約・別の成果物ID/revision**。復旧や先行修了の認定はしない | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 基準状態の公開・非公開 | 11モジュール×開始/終了の22状態。公開の`start.json`/`end.json`は契約、非公開保存先には模範実データを置く。公開の正解サンプルと非公開の採点用模範を区別 | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 状態判定 | ロード後の開始判定と読取り専用`course:check Mxx --state start`または`course:check Mxx --state end`を設計。状態が整合しても本人のLevel 2は自動認定しない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 提出と修了 | `workspace/Mxx/submission.md`、必要な`evidence/`・コードを提出。自己確認と、評価担当者による正式修了判定を分け、正しい別解を許容する。受講者の成績は公開しない | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 教材更新 | 公開Templateの後続更新は、受講中の個人リポジトリへ自動反映しない。配布元revisionを保持し、明示的に更新した場合だけ差分を適用 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 実行環境 | 個人所有・2コアCodespacesを標準とする。Phase 1・2でGit/PR/CI操作を要求しない。Phase 2は同期先だけでBuild/Serve/Reset/Playwrightを成立させる | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Skillの使用順 | 学習目標に必要なSkill Packageだけを使う。M06は`e2e-test-inspection`→`e2e-test-implementation`→`e2e-test-execution`の前提を確認。全Skillの習熟やworkflow全工程の実行を強制しない | [実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| M02→M03の入力とSkill経路 | M02の**人間可読の検証責務本文**と、M03で用意する厳密なruntime JSONを分離。条件設計の入口は`condition_structure(direct)`、技法runtime後のCI生成は**`materialize_coverage(artifact)`必須**。Caseはcurrent TR Entityの有無に合うmodeを固定commitの通し実行で検証する。directは上流参照欠落を許容し得るため、Authority/Risk/Scope・TCNへの継承を別途照合する | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 直接の本人判断評価 | M04・M07・M10の正式修了で、評価担当者が未提示の条件変更・誤りを1件示し、AI生成回答に依存せず本人が根拠と判断を説明したことを確認する。通常演習はAI利用可 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 22状態の実データ共有 | 11モジュール×開始/終了の22個の論理状態は維持。共通する公開可能な設定・Seed等は同一ID/revisionで参照し、公開サンプルと非公開模範の実体は分離。前後の本人成果物と公開サンプルは同じ入力契約に適合する別IDを許す | [状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 対応関係の正本 | 学習目標・習熟の説明はPlan、教材・問題・評価の本文は各実ファイル、**ID間の関係はJSONグラフ**。Markdown対応表は生成物とし、二重の手動更新を防ぐ | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 新旧カリキュラムの分離 | 旧17レッスン・104問・旧validator・正式回帰の契約は維持。新課程の同期/Playwright/CIは専用経路に分離する | [調査](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) |
| クイズと評価 | **モジュール別JSONをクイズの唯一の正本**とする。四択は原則正解1つ、A〜Dの意味・正誤理由・根拠・復習先を同じJSON内に記載。Webでは一問ずつ回答し、全問終了後に集計・解説・復習。全必須観点Level 2以上でフェーズ修了。クイズ得点・AIの自己申告だけでは合格にしない | [クイズ](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 知識グラフ | JSONと読取り専用CLIを採用。51学習項目、教材・問題・実技・22状態・仕様・Skill・評価を結び、仕様やSkill改訂時の影響を追う。未登録変更を「影響なし」にしない | [知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| Phase 3 | Phase 2の既存specを再利用。専用workflowを選択者が明示的に有効化し、対象SHA・Run・Check・Artifactと権限を確認する | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |

### 教材品質について追加した採用事項

| 採用事項 | 設計済みの内容 | 詳細の正本 |
| --- | --- | --- |
| WebとCodespacesの役割分担 | 既存の静的Docs生成を使い、学習者用`start-here.md`からモジュール・JSON生成クイズ・復習を閲覧する。既存`README.md`は知識グラフ管理用のまま保持。途中回答は版付きで本人のブラウザ内にのみ保存し、公開履歴・評価記録へ自動送信しない。正式な実技・採点資料は分離 | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) |
| 教材の内容品質 | 必要な前提、具体的な導出過程、誤りと理由、誘導演習、別条件での独立適用、観測・復習を内容で確認。ページ数・問題数を一律に固定しない | [3フェーズ構成・教材品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 技法ごとの演習対象 | Cartだけに固定せず、既存の在庫分類・検索条件・ロール・注文等を候補から選ぶ。正式仕様、Seed、観測・Resetの成立を確認してから採用。製品の新機能は不足が証明された場合のみ検討 | [演習対象](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 実技模範と採点 | 完成成果物に加えて判断・導出過程、必須条件、誤答・部分的正答・正しい別解、評価不能を判定できる資料を作る。公開の学習例と非公開修了模範は区別 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 代表教材の先行検証 | M02→M03とM05→M06で教材・独立演習・模範・採点基準を先行制作し、正式仕様との照合、コード/教材レビュー、自動・契約検証の結果を反映してから全11モジュールへ展開する。初心者試行・実受講者・実際のCodespacesによる実地検証は全量実装後に行い、展開開始条件にしない | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |

上記は**Planで採用した設計**であり、教材の制作や実地検証の実施済みを示すものではない。開発時のレビューと自動検証、実装完了後の実地検証、運用開始判断を区別する。

**Plan上の採用事項は実装済みという意味ではない。** 特に公開開始入力、22基準状態、評価用の実技、同期・ロード、専用CI、知識グラフの完成契約は、実ファイルと受入検証を必要とする。

## 既存のコード・設定で確認済みの事項

| 確認事項 | 根拠 | 新課程での扱い |
| --- | --- | --- |
| Node.js・pnpm・Chromium | `.devcontainer/devcontainer.json`、`package.json` | 既存の構成を必要な範囲で再利用し、学習用Templateで起動確認する |
| WebのBuild/Serve | `package.json`の`build:web`、`scripts/serve-web-dist.ts` | フォント/画像manifest/Expo出力と静的サーバー依存を調べ、許可リストへ必要なファイルだけ入れる |
| TrainingのPlaywright | `playwright.training.config.ts` | 既存の8082・`PLAYWRIGHT_TEST_ROOT`・`webServer`を参考に、新課程のspecと出力先を分離する |
| Seed/Reset | `training/playwright/support/reset-scenario.ts` | `window.__TEST_API__`のResetとmetadata照合を必要な範囲で再利用する |
| 旧Training Copy | `scripts/training/prepare-training-copy.ts` | 全体clone・旧workflowの有効化という別責務なので、新課程の許可リスト同期へ流用しない |
| 外部Skill | `qa-workflow-skills`の参照commit `7cc6cba7772de549841a39d71694cbafbc783324` | 同commitに22 Skillがある。学習対象のSkillと補助ファイルだけを選定・検証する |

**ここでの確認済みは「既存ソースの確認」であり、別の2コアCodespacesで実行してPASSした意味ではない。**

## 固定Skillの追加確認結果と未実行範囲

- **確認済みコード契約**（Skill commit `7cc6cba7772de549841a39d71694cbafbc783324`）：`condition_structure.py`の`direct`はcurrent TR Entityなしでも利用できるが、`require_all=False`により上流Authority/Risk依存が欠落しても処理が進み得る。`materialize_coverage.py`は`artifact`のみ受け付ける。
- **入力形式**：`condition_structure`の`metadata`は17キー、`input`は15キー、`test_requirements[]`の1行は5キー。`test_requirements[]`へ検証責務本文の独自フィールドを追加しない。current TR Entityを持たない`requirement_dispositions[]`を有効な処理として扱わない。
- **拒否・成功の区別**：`run_cli()`は一部の`invalid_input`で終了コード0を返す。返されたenvelope、参照の完全性、current Entity、必要な技法結果・Case、最終evidence gateと意味上の仕様整合を確認する。
- **既存CI**：[Validate Deterministic Output Evalsの実行](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/actions/runs/38994981607)は当該固定commitで`success`（2026-10-17 UTC）と確認した。ただし**今回のCartのM02成果物からの混合modeの通し受入を実施した証拠ではない**。テスト総数の細部や教材固有のPASSは断定しない。
- **部分実行（2026-10-23）**：`qa-training-store` HEAD `55f41bb8a111939aac59fd9b92b3903cdd7fca34`にあるCart仕様とRisk資料から正規化した入力を用い、固定Skillの`authority_entities.py`→`risk_matrix.py`→`analysis_entities.py`→`condition_structure(direct)`まで実行した。Authority/Risk EntityとScope参照の正規契約、envelope、fingerprintを[実行記録](../../training/ai-assisted-qa-course/integrations/M02-M03-contract.md#2026-10-23-source-backed-deterministic-smoke)に記載した。正規化は手作業であり、fixture・OpenCode出力・技法選択ではない。
- **未実行**：OpenCode CLIがないため、モデル依存の意味分析・技法選択とそのruntime、`materialize_coverage(artifact)`、`case_structure`、同じartifact群の最終`verify_runtime_evidence(valid=true)`は未確認。今回確認できた決定論的な部分経路をM02→M03全体の受入PASSとして扱わない。
- **採用判断**：初心者の学習では`direct`を**条件設計の入口のみ**に採用。途中で`artifact`を使う必要があることは既知。新しいモジュールやSkill内部のruntimeを追加せず、通し受入で契約が成立しない場合に理由と最小の対応を判断する。

## 残確認事項：運営開始までに指定する内容

| 対象 | 必要な指定 | 状態・扱い |
| --- | --- | --- |
| 学習用Templateの実体 | 公開リポジトリ名、作成するアカウント、管理・更新権限 | **未指定**。設計では「別の公開Template」で確定。作成自体は別作業 |
| 非公開模範・採点資料の保管 | アクセス制限された実際の保存先、更新権限、教材revisionとの対応を管理する担当者 | **未指定**。新しい非公開GitHubリポジトリを必須としない。保存先やアクセス方法を公開Planへ書かない |
| 正式修了の評価担当 | 評価担当者の割当、提出物を受け取る経路、判定記録の実際の保存先 | **未指定**。評価責任・提出形式・Level 2基準は[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)で設計済み |
| 各受講者のCodespaces運用 | 本人の所有/支払主体、2コア選択、無料枠の残量、課金停止条件 | **受講開始時の確認**。無断課金でBLOCKEDを解消しない |

これらは運営に必要な値の指定であり、**カリキュラム全体の設計を未確定に戻すものではない**。権限・保存先が未指定のまま公開版へ非公開模範を追加したり、運用が完了したと宣言したりしない。

## 残確認事項：開発工程の実装・検証で完了に必要な内容

| 対象 | 実装完了に必要な証拠 | 対応するPlan |
| --- | --- | --- |
| 代表教材の開発受入 | M02→M03/M05→M06を正式仕様・学習順序・教材/評価基準と照合し、コード/教材レビューと自動・契約検証の指摘を反映。M02の固定Skill入力契約・統合経路を開発環境で検証 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 全11モジュールの教材・評価 | 51学習項目を説明する教材、クイズ/正誤解説、初見実技、評価基準、非公開模範/採点用テスト、正答・誤答・部分的正答・正しい別解・評価不能の判定条件。正式仕様との意味上の照合と開発時レビューを行い、非公開資料を公開履歴へ含めない | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 11モジュールの開始・終了状態 | **22状態**の実データ・契約・公開可能な入力サンプルを作成し、入力欠落・版違い・意図的FAILと正常開始を自動/契約テストで区別する。非公開模範は公開物へ含めない | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 公開Webとクイズ機能 | 全11モジュールのページとクイズ、一問ずつの回答、結果/復習、中断/再開、壊れたデータの拒否、公開/非公開分離を自動ブラウザ/E2E・静的検証・ビルド・旧課程回帰で確認 | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) |
| 同期manifest・管理者同期・ロード | 依存閉包から許可ファイルを導出し、固定SHA、機密混入の拒否、途中失敗・再ロード・symlink・衝突時の非破壊性、指定1モジュールだけのロードをfixture/契約テストで検証 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| Phase 2のE2E | 専用Playwright Config/spec、Seed/Reset、複数RunとTrace/Report、結果保存先、旧Trainingとの出力分離を開発環境とCIで検証 | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Phase 3の専用CI | 明示有効化、最小権限、対象SHAとRun/Check/Artifactの一致、正式/旧workflowの非発火をworkflow契約とPR CIで検証 | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 知識グラフ | 全51項目と知識・教材・実技・評価・22状態の参照網羅、未登録変更検出、正式仕様との意味的な対応を検証 | [知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 旧課程・正式仕様・CI | 必須lint/typecheck/test/build/verifyと必要なCIを実行し、既存の旧課程・製品・正式回帰を壊していないこと、教材と正式仕様の整合を確認する | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、関連する詳細Plan |

上記の未作成成果物、未実装機能、失敗中/未実施の必須開発テストを実地検証待ちへ移してはならない。これらは実装未完了として扱う。OpenCode Zen無料モデルの利用可否・認証可否はユーザー確認済み前提であり、再検証しない。

## 実装完了後の実地検証

実地検証は全11モジュールと関連機能の実装完了後に行う。実施方法と期待結果は次のとおりで、未実施・不合格を実装未完了や実装工程のBLOCKED理由にしない。

| 対象 | 方法・期待結果 | 対応するPlan |
| --- | --- | --- |
| Web受講導線・教材理解 | Git/プログラミング未経験者が講師の補足なしにPhaseを選び、全11モジュールの本文・一問ずつのクイズ・結果/解説/復習を経て実技案内へ進む。迷子、未学習の前提、説明の飛躍を記録し、重大な誤りなく必要な行動・根拠・復習先を見つけられることを確認 | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)、[教材品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 学習用TemplateとCodespaces | 指定された実際のTemplateから個人リポジトリを作り、新規2コアCodespaceでBuild/Serve/Seed/Reset、外部Skill/Python helper、Playwright、1モジュールロード、上書き防止、成果物保全を実行する。計画した証拠が再現し、許可外データや非公開模範/Secretが混入しないことを確認 | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 実技・評価の運用 | 評価担当者が実際の提出物とM04/M07/M10の未提示条件を扱い、正答・誤答・部分的正答・正しい別解・評価不能を公開ルーブリックで一貫して判定し、本人の判断をLevel 2基準で確認する | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 費用・所要時間 | 2コアの起動時間、保存容量、学習所要時間、各受講者の無料枠を実測する。成立しない環境では課金へ自動切替せず、運用開始を保留 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |

## 運用開始判断に必要な未指定事項

学習用Templateのリポジトリ名・作成アカウント・管理権限、非公開模範/採点資料の実保存先・アクセス権・管理担当、正式評価担当者、受講者ごとの支払主体・費用条件は未指定のまま保持する。これらを推測して公開リポジトリや非公開保存先を作成せず、指定前の状態は運用開始判断の未確定事項として扱う。実装を進めることは妨げない。

## 当初のPlan策定時点で行っていなかったこと（履歴）

以下は当初のPlan策定時点での記録であり、PR #199の現在の実装状況を示すものではない。現状はPR本文とactive Runで確認し、ここにある未着手項目だけから現在の実装状態を推測しない。

- 新しい学習用Templateのリポジトリ作成、同期・ロードスクリプト実装・実行
- 教材・問題・実技、基準状態の実データ・非公開模範の作成
- 知識グラフJSONとCLIの完成仕様への追加実装
- 2コアCodespacesでの新課程の通し検証、Phase 3 CIの起動
- 既存の製品コード・正式CI・旧教材・外部Skill本体の変更
- PRのmerge、branch削除、PR #198の変更

この文書の項目を完了へ変更するときは、**対象の実在パス、revision、実行結果、確認した判断主体**を対応する詳細Planに記録する。Planがあるだけで「実装完了」としない。

## 2026-10-23 実装作業の検証結果

ここからはPR #199の実装作業で得た開発証拠であり、実地検証の合否を示さない。

| 対象 | 開発中に確認した結果 | 状態 |
| --- | --- | --- |
| M00〜M10の公開教材・クイズ | 全11 moduleを、51学習項目・58知識ノード、本文、設問/4選択肢/正答/解説/出典/復習先、実技/提出物、Phase rubricに沿ってsource-based二度目レビューした。Cart教材の低在庫上限とScope参照の食い違いを修正し、全objectiveが教材・knowledge・quiz・exercise・rubricへ対応することも確認 | 実装者による二度目レビューと修正は完了。独立した別レビュー担当者の確認と非公開評価資料は未完了。knowledge nodeは`draft_requires_content_review`を維持 |
| 22状態と参照グラフ | M00〜M10のstart/end JSON、公開入力、検証CLI・影響検索を追加。入力欠落・revision違い・参照不整合等をfixture契約テストで確認 | 構造検証PASS。意味レビューは未完了 |
| Web・旧課程非回帰 | 開始SHA `55f41bb8a111939aac59fd9b92b3903cdd7fca34`のWeb CI run `39858260489`とMobile App CI run `39858260599`はsuccess。CIのrequired Chromium job `120102478773`とcontract/runtime-contract jobsもsuccess。ローカル`verify`は755 passed /31 failed /2 skippedでFAIL。ローカルE2EはWindowsのPlaywright管理webServer終了時に最終summary/exitを返さないが、同じ17件を外部静的serverから実行すると17/17・exit 0 | hosted CI successとWindowsローカルverify/Playwright終了問題は別の証拠。verify failureを一律にPASSや無関係として扱わず、詳細はactive Run reportに記録 |
| 同期・単一moduleロード | 固定SHA・blob・許可範囲・機密拒否・部分失敗・再実行・上書き防止を契約テストで確認 | fixture PASS。外部Templateは未作成 |
| M02→M03固定Skill | commit `7cc6cba7772de549841a39d71694cbafbc783324`のAuthority helper、Risk matrix、analysis join、condition structureをsource-backed Cart入力で実行。Authority/Risk Entityを生成し、Scopeは`SCOPE-...`参照としてdirectへ渡した | 決定論的部分経路は実行済み。OpenCode CLIがないため意味分析・技法選択runtime以降、materialize/Case/最終evidence gateは未実行で、統合受入は未完了 |
| M05→M06 / Phase 2 runner | M05/M06教材と専用configを作成。M06の3つの公開specは学習者用TODO素材で、専用runnerの実行結果は3件FAIL。M07は修正前の意図したAssertion失敗を確認し、修正後scaffoldもTODOでFAIL | 完成版実技の開発受入は未達 |
| 非公開評価・グラフ内容 | 公開ルーブリックは追加。実装者の二度目レビューで既知のCart/Scope不整合を修正。非公開模範/採点テストの保存先・権限・管理担当は未指定。knowledge node 58件は`draft_requires_content_review` | 別レビュー担当者による意味レビューと非公開資料は未完了。未指定値やレビュー完了状態を推測で設定しない |
| 実地検証 | 初心者/受講者、評価担当者、Template由来の2コアCodespace、所要時間・容量・無料枠は未確認 | 全量実装後の独立工程。実装工程のBLOCKED理由ではない |
