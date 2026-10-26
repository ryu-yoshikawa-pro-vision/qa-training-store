# AI協働テスト自動化カリキュラム：決定事項・残確認事項

## 現行判断の優先事項（2026-10-26）

M06の新規E2EとM07のPage Object/fixture実装、M10でのCI手動有効化・Run実証を本人のLevel 2条件とする。機能棚卸しはWeb/Nativeを含む公式製品スコープに基づき、分類済みと設計済みを別々に判定する。既存評価JSON/グラフと校正例を利用し、新しい採点基盤は作らない。実Template・2コアCodespace受入は今回PR必須で、実受講者の試行と個人認証は後続。

## 2026-10-25のユーザー確定事項

68問と最終確認2問から確定した対象・到達能力・評価方法・配布方法・PR完了範囲は[2026-10-25改善Plan](./2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md)と各詳細Planに反映する。テスト実施・設計経験者の日本語自習、全11モジュールの演習・質疑・操作証拠、M04/M07/M10でのまとめての正式評価、Page Object/fixtureの本人設計、業務CIの設計・最小権限判断を必須とする。

公開Templateから本人の非公開リポジトリを作り、無料の2コアCodespacesと非公開Actionsの消費・課金防止を確認する。今回PRでTemplate作成とPlaywright技術受入を行い、受講者個人のOpenCodeモデル統合は初回確認でBLOCKED可。教材のAI内容評価には根拠・校正例・不合格/判定不能を設ける。公開の評価条件を認め、秘匿を前提にした合否は廃止する。実受講者試行は今回PR外。正式担当者の実名、個人の提出先、保存先・権限は運用開始前の未指定事項であり、架空の値を記載しない。

## この文書の扱い

[文書インデックス](./2026-10-16_qa-curriculum-ai-agent-redesign_index.md)から参照する、PR #199の**設計判断と未完了の確認事項の管理表**。内容はこのPRのPlanと確認済みの既存実装に基づく。ここに書かれた概要だけで仕様・実装を決めず、各項目の参照先を正本とする。

次を混同しない。

- **ユーザーが明示した方針**：会話で指定・合意された制約。変更には別途確認が必要。
- **Planで採用した設計**：現行Planに明記した実装方針。ユーザーが個別にすべて承認したという意味ではない。
- **既存実装で確認した事実**：参照したファイル・commit時点の挙動。新課程での動作成功を保証しない。
- **運営上の指定待ち**：実際の名称・担当者・保存先など、運営する人による選定を要する事項。
- **開発工程での実装・検証待ち**：教材・機能・データ・評価基準の未作成、必須の自動/静的/契約検証など、実装完了に必要な未達事項。
- **実装完了後の実地検証・運用判断待ち**：受講者・評価担当者による実地試行と運営上の指定事項。実Template由来の2コアCodespaceでのPlaywright技術受入は今回PR必須であり、ここに含めない。

確認事項を解消したら、**証拠とともに該当するPlanを更新してから、この表の状態を更新**する。未実行をPASSにしない。

## ユーザーが明示した方針

| 決定内容 | 内容と境界 | 参照先 |
| --- | --- | --- |
| カリキュラムの目標 | AIと協働してテスト分析・設計・自動化・実行・改善し、AIの結果を根拠で判断できるようにする。対象者は開発未経験者も含むQA担当者 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |
| 3フェーズ・学習順序 | Phase 1は分析・設計、Phase 2はPlaywright、Phase 3はGitHub・CI。フェーズごとに独立して修了でき、Phase 3は選択 | [3フェーズ構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 学習用リポジトリへの分離 | `qa-training-store`は公開の教材・評価資料正本として維持。受講者の作業用Templateには許可リストで必要な学習素材だけを同期する。正本の公開ファイルを秘密・アクセス制御と扱わず、修了評価は公開模範にない条件と本人の判断で確認する | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 模範・採点・完成状態資料の保存方式 | publicな当リポジトリの`training/ai-assisted-qa-course/assessment/`へ、内容に適した通常のMarkdown/JSON/TypeScript等で保存し、通常のGit差分・PRレビューを可能にする。暗号化、age、復号処理、鍵管理、暗号化専用CIは実装しない | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)、[状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 知識ノードの人間最終承認 | 実装完了後の独立工程とし、未承認や担当者未指定を実装完了のブロッカーにしない。開発時レビューと自動検証は引き続き行い、未承認ノードの状態は明示する | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| Web公開とインタラクティブな確認クイズ | **これから新規制作する新課程M00〜M10の教材Markdownと四択問題・正答・公開解説を格納したモジュール別JSONからWebを生成し、各モジュールで一問ずつ回答→全問終了後の結果・正誤解説・復習**を実装する。既存から再利用するのは静的Web公開処理であり、旧課程の教材・104問ではない。公開Web閲覧・クイズはGitHubログインを必須にしない。実技は従来どおり本人のCodespacesで行う | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) |
| 受講者によるモジュール単位ロード | **ロードするのは学習者本人**。M00〜M10から指定した1モジュールだけをロードし、他モジュールへ自動で進まない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| QA workflow Skillの参照先 | **`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**を対象とする。このリポジトリ内の別用途のSkillを混同しない | [実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Planの到達点 | **完成形まで設計する**。一部の機能や評価だけを完成条件として扱わない。実装済みでないことは実装状態として正しく記録する | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| OpenCode Zen | 以前の無料モデル利用実績を現在の保証としない。受講者初回起動時にモデル・個人認証・必要Skillを確認し、不成立はBLOCKEDとする。Secretの保護や意図しない有料モデルへの切替防止は維持 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |
| 各モジュールの正解状態 | M00〜M10の各開始・終了の**実データと照合条件を作る**。先行成果物が失われても、後続モジュールが必要とする正しい入力で着手できる設計とする | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 復旧機能は作らない | 本人ファイルの自動復元、復旧コマンド、他モジュールの無断ロードは対象外。基準データ・判定契約は作る | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |

## 現在のPlanで採用している設計

| 採用事項 | 設計済みの内容 | 参照先 |
| --- | --- | --- |
| 教材の配布境界 | 管理者が固定SHAと許可リストで公開Templateへ同期。模範・採点・完成状態資料は公開正本に通常ファイルで保存するが、学習者用Template・同期・ロード・Web Buildには含めない。この配布除外は秘密保持や閲覧防止ではない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 前工程の成果物がない場合 | 各モジュールに**先行修了課題と異なる条件の検証済み公開開始入力**を同梱。本人成果物とサンプルは**同じ入力契約・別の成果物ID/revision**。復旧や先行修了の認定はしない | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 基準状態と評価資料 | 11モジュール×開始/終了の22状態。模範・採点用テスト・完成状態は公開リポジトリの通常ファイルとし、`start.json`/`end.json`は契約、開始サンプルは学習素材として別管理。学習用Template/Web等への配布除外は秘密保持ではない | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 状態判定 | ロード後の開始判定と読取り専用`course:check Mxx --state start`または`course:check Mxx --state end`を設計。状態が整合しても本人のLevel 2は自動認定しない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 提出と修了 | `workspace/Mxx/submission.md`、必要な`evidence/`・コードを提出。自己確認と、評価担当者による正式修了判定を分け、正しい別解を許容する。受講者の成績は公開しない | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 教材更新 | 公開Templateの後続更新は、受講中の個人リポジトリへ自動反映しない。配布元revisionを保持し、明示的に更新した場合だけ差分を適用 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 実行環境 | 本人所有の非公開repo・2コアCodespacesを標準とする。Phase 1/2でGit/PR/CI操作は不要。**管理者がBuildして`course/shop/`へ同期し、本人はServe/Reset/Playwrightを行う**。M09は無効workflowの学習、M10で初めて実CIを有効化する | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| M05〜M07の評価用完成spec | 実行可能な完成specをpublicな`assessment/playwright/M05`〜`M07`へ置き、既存の新課程専用Playwright Configで開発実行する。M07の意図的失敗と修正版は別test root・別Run。学習者の未完成workspace素材、同期・ロード・Web配布とは分ける | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)、[同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Skillの使用順 | 学習目標に必要なSkill Packageだけを使う。M06は`e2e-test-inspection`→`e2e-test-implementation`→`e2e-test-execution`の前提を確認。全Skillの習熟やworkflow全工程の実行を強制しない | [実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| M02→M03の入力とSkill経路 | M02の**人間可読の検証責務本文**と、M03で用意する厳密なruntime JSONを分離。条件設計の入口は`condition_structure(direct)`、技法runtime後のCI生成は**`materialize_coverage(artifact)`必須**。Caseはcurrent TR Entityの有無に合うmodeを固定commitの通し実行で検証する。directは上流参照欠落を許容し得るため、Authority/Risk/Scope・TCNへの継承を別途照合する | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 直接の本人判断評価 | M04・M07・M10の正式修了で、評価担当者が公開課題について新しい条件変更・誤りを1件示し、AI生成回答に依存せず本人が根拠と判断を説明したことを確認する。通常演習はAI利用可 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 22状態の実データ共有 | 11モジュール×開始/終了の22個の論理状態は維持。共通する公開可能な設定・Seed等は同一ID/revisionで参照し、学習用開始サンプルと公開完成状態資料は用途別に管理する。前後の本人成果物と公開サンプルは同じ入力契約に適合する別IDを許す | [状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
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
| 実技模範と採点 | 完成成果物に加えて判断・導出過程、必須条件、誤答・部分的正答・正しい別解、評価不能を判定できる公開資料を作る。学習用開始例と完成資料は配布境界で区別する。評価条件を公開可能とし当日の追加質問・条件変更で本人判断を測る | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 代表教材の先行検証 | M02→M03とM05→M06で教材・独立演習・模範・採点基準を先行制作し、正式仕様との照合、コード/教材レビュー、自動・契約検証の結果を反映してから全11モジュールへ展開する。初心者試行・実受講者・実際の受講者による学習効果試行はPR後に行い、展開開始条件にしない | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |

上記は**Planで採用した設計**であり、教材の制作や実地検証の実施済みを示すものではない。開発時のレビューと自動検証、今回PRのTemplate技術受入、後続の実受講者試行と運用開始判断を区別する。

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
- **source-backed deterministic開発実行（2026-10-23）**：PR開始HEAD `b8f8642c45c6622b227c5c08f8756129eb037d00`の正式Cart/Risk入力と固定Skill commitを用い、Authority/Risk生成、`condition_structure(direct)`、BVA runtime、TDR、`materialize_coverage(artifact)`、Case生成、condition-design/case-design両runtime verifierまで実行した。2つのverifierは`valid=true`で、fingerprintとEntity数は[実行記録](../../training/ai-assisted-qa-course/integrations/M02-M03-contract.md#2026-10-23-source-backed-deterministic-downstream-run)に記録した。意味判断とBVA選択はsourceに基づく人手入力であり、OpenCode出力ではない。
- **未実行**：OpenCode CLIのモデル依存意味分析・技法選択を実行していない。したがって、それらのモデル出力に続く一貫したSkill経路としてのM02→M03受入は未完了である。人が与えたsource-backed意味判断を使った決定論的runtime成功だけでM02→M03全体の受入PASSとしない。
- **採用判断**：AI・開発未経験者の学習では`direct`を**条件設計の入口のみ**に採用。途中で`artifact`を使う必要があることは既知。新しいモジュールやSkill内部のruntimeを追加せず、通し受入で契約が成立しない場合に理由と最小の対応を判断する。

## 残確認事項：運営開始までに指定する内容

| 対象 | 必要な指定 | 状態・扱い |
| --- | --- | --- |
| 学習用Templateの実体 | 公開リポジトリ名、作成するアカウント、管理・更新権限 | **今回PRで作成**。具体的なリポジトリ名・所有アカウントと管理権限は作成時に確定する |
| 学習者の提出・評価記録 | 実際の保存先、アクセス権、管理担当 | **未指定**。公開教材・評価資料とは分離し、運用開始まで指定を待つ |
| 正式修了の評価担当 | 評価担当者の割当、提出物を受け取る経路、判定記録の実際の保存先 | **未指定**。評価責任・提出形式・Level 2基準は[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)で設計済み |
| 各受講者のCodespaces運用 | 本人の所有/支払主体、2コア選択、無料枠の残量、課金停止条件 | **受講開始時の確認**。無断課金でBLOCKEDを解消しない |

これらは運営に必要な値の指定であり、**カリキュラム全体の設計を未確定に戻すものではない**。公開する模範解答・採点用テスト・完成状態データの制作と検証は、正式評価担当者やTemplateの指定を待たずに進める。学習者個人の提出・評価記録の実際の保存先と管理者は、運用開始まで未指定のまま保持する。

## 残確認事項：開発工程の実装・検証で完了に必要な内容

| 対象 | 実装完了に必要な証拠 | 対応するPlan |
| --- | --- | --- |
| 代表教材の開発受入 | M02→M03/M05→M06を正式仕様・学習順序・教材/評価基準と照合し、コード/教材レビューと自動・契約検証の指摘を反映。M02の固定Skill入力契約・統合経路を開発環境で検証 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 全11モジュールの教材・評価 | 51学習項目を説明する教材、クイズ/正誤解説、初見実技、公開評価基準、公開の模範解答・採点用テスト・完成状態、正答・誤答・部分的正答・正しい別解・評価不能の判定条件。固定Skill revisionの責務に従って成果物を制作し、正式仕様との意味上の照合と開発時レビューを行う | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 11モジュールの開始・終了状態 | **22状態**の実データ・契約・公開可能な入力サンプルと、評価用の完成状態データを作成し、入力欠落・版違い・意図的FAILと正常開始を自動/契約テストで区別する。評価データは通常ファイルで公開し、学習用配布物には含めない | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 公開Webとクイズ機能 | 全11モジュールのページとクイズ、一問ずつの回答、結果/復習、中断/再開、壊れたデータの拒否、公開の模範/採点資料がWeb Buildから除外される契約を自動ブラウザ/E2E・静的検証・ビルド・旧課程回帰で確認 | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) |
| 同期manifest・管理者同期・ロード | 依存閉包から許可ファイルを導出し、固定SHA、評価資料の配布除外、Secret混入の拒否、途中失敗・再ロード・symlink・衝突時の非破壊性、指定1モジュールだけのロードをfixture/契約テストで検証 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| Phase 2のE2E | 専用Playwright Config/spec、Seed/Reset、複数RunとTrace/Report、結果保存先、旧Trainingとの出力分離を開発環境とCIで検証 | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Phase 3の専用CI | 明示有効化、最小権限、対象SHAとRun/Check/Artifactの一致、正式/旧workflowの非発火をworkflow契約とPR CIで検証 | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 知識グラフ | 全51項目と知識・教材・実技・評価・22状態の参照網羅、未登録変更検出、正式仕様との意味的な対応を検証 | [知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 旧課程・正式仕様・CI | 必須lint/typecheck/test/build/verifyと必要なCIを実行し、既存の旧課程・製品・正式回帰を壊していないこと、教材と正式仕様の整合を確認する | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、関連する詳細Plan |

上記の未作成成果物、未実装機能、失敗中/未実施の必須開発テストを実地検証待ちへ移してはならない。これらは実装未完了として扱う。OpenCode CLIの個人認証と無料モデルの接続・Skill動作は各受講者の初回起動で確認し、失敗はBLOCKEDとする。

人間による教材・評価内容・知識ノードの最終承認は、全11モジュールと関連機能の実装完了後に行う独立工程であり、実装完了条件や実装工程のBLOCKED理由にはしない。実装工程では正式仕様・固定Skillとの照合、開発レビュー、別AIレビュー、必要な自動/契約テストを完了させる。人間の承認前は`draft_requires_content_review`等の状態を維持し、未承認を承認済みと表示しない。正式な評価担当者の指定は運用開始までの未指定事項として残す。

## 今回PRで行う技術受入と後続の試行

| 区分 | 実施内容 | 完了判定 |
| --- | --- | --- |
| **今回PR**：実Template・Codespaces | 公開Templateから個人の非公開リポジトリを新規作成し、2コアCodespacesで配布SHA、Skill用資産、1モジュールロード、非破壊性、8082 Serve/Reset、Playwright実行・結果保全を確認する | 成功Run/実行環境/変更対象SHAの記録がある |
| **今回PR**：教材・評価 | 全目標の教材節・演習・条件変更・質疑・操作証拠・公開ルーブリック・復習が対応。契約テストと校正例を使った根拠付きAIレビューを行う | 不合格・判定不能を解消し、未実行を成功としない |
| **受講開始時**：OpenCode | 本人のAPIキー・無料モデル接続と必要Skillの利用を確認する | 成功かBLOCKEDを記録 |
| **PR後**：実受講者試行 | テスト経験者の完全自習、実評価担当者のPhase末採点、費用・容量・所要時間を検証する | 今回PRの完了条件にしない。結果は継続改善に利用 |

正式評価担当者の実名・提出物の非公開保存先・権限・再提出窓口は運用まで未指定とし、仮のURLを作らない。

## 運用開始判断に必要な未指定事項

学習用Templateのリポジトリ名・作成アカウント・管理権限、正式評価担当者、学習者個人の提出・評価記録の保存先と管理者、受講者ごとの支払主体・費用条件は未指定のまま保持する。模範解答・採点用テスト・完成状態データの保存場所はpublicな当リポジトリ内の`training/ai-assisted-qa-course/assessment/`に確定している。未指定事項を理由に資料制作を止めず、Templateは今回PRの実装工程で作成し、作成先・管理権限をその時点で確認する。

## 当初のPlan策定時点で行っていなかったこと（履歴）

以下は当初のPlan策定時点での記録であり、PR #199の現在の実装状況を示すものではない。現状はPR本文とactive Runで確認し、ここにある未着手項目だけから現在の実装状態を推測しない。

- 新しい学習用Templateのリポジトリ作成、同期・ロードスクリプト実装・実行
- 教材・問題・実技、基準状態の実データ・公開模範と採点資料の作成
- 知識グラフJSONとCLIの完成仕様への追加実装
- 2コアCodespacesでの新課程の通し検証、Phase 3 CIの起動
- 既存の製品コード・正式CI・旧教材・外部Skill本体の変更
- PRのmerge、branch削除、PR #198の変更

この文書の項目を完了へ変更するときは、**対象の実在パス、revision、実行結果、確認した判断主体**を対応する詳細Planに記録する。Planがあるだけで「実装完了」としない。

## 2026-10-23 実装作業の検証結果

ここからはPR #199の実装作業で得た開発証拠であり、実地検証の合否を示さない。

| 対象 | 開発中に確認した結果 | 状態 |
| --- | --- | --- |
| M00〜M10の公開教材・クイズ | 全11 moduleを、51学習項目・58知識ノード、本文、設問/4選択肢/正答/解説/出典/復習先、実技/提出物、Phase rubricに沿ってsource-based二度目レビューした。Cart教材の低在庫上限とScope参照の食い違いを修正し、全objectiveが教材・knowledge・quiz・exercise・rubricへ対応することも確認 | 独立AIレビューでM04公開review入力不足とM07 README/実specの不一致を指摘。M04へ承認済みCaseと未レビュー候補の公開fixtureを追加して単一module配布・状態・グラフ・契約テストへ接続し、M07説明を実際の不正Locatorへ整合。レビュー指摘を回帰テストに固定した。AIレビューは人間のドメイン担当者による承認や実地評価ではない。58 knowledge nodeは正式担当者の確認を表さない`draft_requires_content_review`を維持 |
| 22状態と参照グラフ | M00〜M10のstart/end JSON、公開入力、検証CLI・影響検索を実装。M09開始状態へ合成PR履歴handoff、M04開始状態へレビューCase fallbackを追加し、それぞれ異なるartifact ID/revision、既存handoff contract、許可list、単一module load、知識グラフへ接続。全start stateの必須入力をmanifestの同期元・単一module load先・artifact node・`module_state requires artifact` edgeへ接続し、M10 Reset入力も追加。workflow starterは別入力として保護 | 22状態・286 nodes・611 edges・51 objectives・58 knowledge・47 artifact nodesの構造検証PASS。distribution/course/graph focused contracts 29/29 PASS。構造検証を教材の意味上の妥当性とは扱わない |
| Web・旧課程非回帰 | PR開始SHA `b8f8642c45c6622b227c5c08f8756129eb037d00`のWeb CI run `39880421985`とMobile App CI run `39880422052`は同一SHAでsuccess。現作業ツリーの`pnpm run test`は767 passed /31 failed /2 skipped、5件の既存Codex Hook・artifact sanitizer・task wrapper・MCP contract filesでfailure、うち1 fileはWindows `bash` spawnの`stdout`未定義で0 tests。いずれの対象ファイルも今回のdiff外。`verify`は`workspace/M06/acceptance-probe.spec.ts`の整形で最初の`format:check`が止まるため、tracked変更はPrettier済みでも全`verify`はPASSしていない | Chromium 51件の外部静的server runは4 workersでM01/M05の初問表示assertion 2件と300秒後のworker強制終了を観測。両assertionは同一SHA/build・Chrome・serverで単独実行すると各1/1 PASSし、新課程17件は1 workerで17/17・exit 0。51件の1 worker runは51完了dot・error context 0の後に300秒worker強制終了となり、summary/exitを得られず中断したためPASSとはしない。CI・標準`verify`・各Playwright経路は別の証拠として扱う |
| 同期・単一moduleロード | 固定SHA・blob・許可範囲・機密拒否・部分失敗・再実行・上書き防止を契約テストで確認 | fixture PASS。外部Templateは未作成 |
| M02→M03固定Skill | commit `7cc6cba7772de549841a39d71694cbafbc783324`の主要scriptのGit blobを固定commit treeと照合。source-backed `SCOPE-001`低在庫系列と公開fallback `SCOPE-101`系列の両方でAuthority/Risk/Scope参照をcurrent TCNへ継承し、技法runtime、TDR、materialize、Case、condition-design/case-design最終evidence gateまで同一入力系列で実行 | 両系列の決定論的runtimeと最終gateは`valid=true`。`SCOPE-001`の上限3に2/3/4、`SCOPE-101`の上限5に4/5/6を照合した。意味分析と技法選択は正式sourceに基づく人手入力で、OpenCode出力ではない。CLIがないためモデル依存の意味分析・技法選択は未実施であり、M02→M03のAI統合受入全体は未完了 |
| M05→M06 / Phase 2 runner | M05教材の修正済みLocator specをローカル開発probe 1/1、M06のSeed/Reset・追加・上限拒否・数量保持・low-stock在庫3 specを独立したローカル開発probe 3/3で実行。Chromeを明示し、既存の外部静的serverを利用。user-provided ignored probe filesは作業ツリーに保持してcommit対象外 | 開発用の代表specはPASS。公開M06 TODO specは学習者が完成させるscaffoldであり、probeのPASSを完成済み公開spec・受講者受入とは扱わない |
| assessment完成specのローカル実行 (2026-10-24 JST) | 新課程専用Config、Build済みdist、loopback 8082、既存Chromeを明示して実行。M05完成spec 1/1 exit 0。M06 3 Caseを別々のResetで2 Run実行し、各3/3 exit 0。M07の誤ったheading Assertionは別rootでmarker付き1件FAIL/exit 1となり、Trace・Screenshot・Videoを記録。修正版は別root・別Runで1/1 exit 0。結果はignoredな`output/training/ai-assisted-qa-local-20261024/`に保存。標準E2E 51件は4 workerと1 workerの両方で全ケースの`ok`表示に達したが、最終summary/exit codeを返さず、終了処理のidle後に停止したためsuite PASSとは扱わない | M05/M06/M07の完成specの開発実行は確認済み。M07前後は別Runで期待した結果を確認した。標準51件E2Eはケース表示とプロセス終了が未完了のためPASSではなく、実装後の人間受入・Codespaces確認とも区別する |
| 評価資料・グラフ内容 | 公開ルーブリックを追加。実装者の二度目レビューに加え、独立AI reviewerが全11モジュールの意味上の対応を静的確認。M04のreview input不足、M07 READMEとLocator/assertionの不一致、全11開始状態のfallback artifact edge不足を指摘し、教材・テスト・graphへ反映。M03 default fallbackと低在庫演習の違いは両方の入力条件が本文に明記された意図的な区別と判断 | 58 knowledge nodeは人間の正式承認まで`draft_requires_content_review`を維持。AI reviewは人間の正式ドメイン確認・採点・実地受入ではない。2026-10-24のユーザー指示で模範・採点・完成状態データはpublicな通常ファイルとし、学習用Template/同期/ロード/Web Build/Artifactから除外する方針へ訂正した。評価条件の公開を認め、当日の追加質問・条件変更で本人判断を確認する。 |
| 技術受入と実受講者試行 | 今回PRでTemplate由来2コアCodespaceのPlaywright受入。実受講者と評価者による学習・採点試行、個人利用量の実測は後続 | 技術受入の未実施はPR完了を妨げる |

### 2026-10-23 独立AI開発レビューの追加記録

- **レビュー主体と範囲**：別のAI reviewerによる読み取り専用の内容・契約レビュー。M00〜M10全11モジュール、51学習項目、58知識ノード、53設問の全選択肢・正答・解説・出典・復習先、教材本文、演習、22状態、公開rubricを対象にした。正式仕様、参照されたSeed/Reset、固定Skill revision、状態・同期manifestを照合した。人間のドメイン担当者による承認や受講者による評価とは区別する。
- **発見と反映**：

| 対象 | 指摘と根拠 | 修正・開発確認 |
| --- | --- | --- |
| `M03-01` / `M03-02` | 知識グラフは同値分割の目標`M03-01`を、境界値だけを説明する教材節へ結び付けていた。 | `M03-01`を同値分割の教材節へ変更し、境界値の`M03-02`は境界値節に接続した。知識グラフvalidatorと契約テストを再実行。 |
| M03 Cart数量 | `docs/spec/features/cart.md`のBR-CART-001と`src/application/use-cases/cart-use-cases.ts`の追加経路を照らすと、既存数量への追加分と、絶対値の数量更新を教材が混同し得た。 | M03 READMEに追加要求量と加算後合計の関係、絶対値更新、0の削除、上限超過の拒否を分けて説明した。 |
| M10開始状態 | Reset入力は単一module manifestで配布・loadされていたが、M10 startの`expected.required_paths`に含まれていなかった。 | `inputs/M10/public-sample-reset.md`を必須入力に追加し、知識グラフの公開artifact nodeと`STATE-M10-START requires` edgeを追加した。 |
| 状態参照照合 | `course:check`はsource pathまたは一部aliasのみを実在ファイルとして見ており、M03のmanifest remap済みRisk CSVと固定Skill revision参照を解決できなかった。 | distribution manifestのsource→target mappingと配布hashを照合するよう修正。Skill参照はpin一致、対象moduleへ割り当てられた各`SKILL.md`配布entry、同期済みhashを検証する。M03の正例、別revision拒否、Skill改変拒否をcontract testへ追加した。 |
| 知識グラフのMarkdown表エスケープ | CodeQLの既存PR注記は、セル値に含まれるバックスラッシュと表区切りの未処理を指摘していた。 | 現在の`markdownCell`は先にバックスラッシュを二重化してから表区切りと改行を変換する。Windows形式パス、表区切り、CRLFの回帰testを追加して出力を固定した。 |

- **開発検証**：distribution/curriculum/knowledge-graph contracts 30/30 PASS、M00〜M10/53問の課程validator PASS、22状態を含むknowledge graph validate PASS（286 nodes/611 edges/51 objectives/58 knowledge/47 artifacts）、curriculum validator PASS、M03ページを含むWeb build PASS、新課程Web Chromium E2E 17/17 PASS（外部静的server、exit 0）。
- **判定境界**：開発中の独立レビューは人間による最終承認ではない。58 knowledge nodeは人間承認後の状態を維持する。模範・採点資料は公開リポジトリ内の通常ファイルとして作成し、個人別評価記録の保存先・権限や評価担当者は指定待ちとする。レビューで実施していない人間受講・採点・Codespaces実地検証をPASSとは扱わない。
