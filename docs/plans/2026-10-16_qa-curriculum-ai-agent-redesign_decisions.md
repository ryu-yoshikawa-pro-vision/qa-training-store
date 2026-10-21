# AI協働テスト自動化カリキュラム：決定事項・残確認事項

## この文書の扱い

[文書インデックス](./2026-10-16_qa-curriculum-ai-agent-redesign_index.md)から参照する、PR #199の**設計判断と未完了の確認事項の管理表**。内容はこのPRのPlanと確認済みの既存実装に基づく。ここに書かれた概要だけで仕様・実装を決めず、各項目の参照先を正本とする。

次を混同しない。

- **ユーザーが明示した方針**：会話で指定・合意された制約。変更には別途確認が必要。
- **Planで採用した設計**：現行Planに明記した実装方針。ユーザーが個別にすべて承認したという意味ではない。
- **既存実装で確認した事実**：参照したファイル・commit時点の挙動。新課程での動作成功を保証しない。
- **運営上の指定待ち**：実際の名称・担当者・保存先など、運営する人による選定を要する事項。
- **実装・実機での確認待ち**：完成仕様は定義したが、ファイル・教材・実行証拠がまだない事項。

確認事項を解消したら、**証拠とともに該当するPlanを更新してから、この表の状態を更新**する。未実行をPASSにしない。

## ユーザーが明示した方針

| 決定内容 | 内容と境界 | 参照先 |
| --- | --- | --- |
| カリキュラムの目標 | AIと協働してテスト分析・設計・自動化・実行・改善し、AIの結果を根拠で判断できるようにする。対象者は開発未経験者も含むQA担当者 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |
| 3フェーズ・学習順序 | Phase 1は分析・設計、Phase 2はPlaywright、Phase 3はGitHub・CI。フェーズごとに独立して修了でき、Phase 3は選択 | [3フェーズ構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 学習用リポジトリへの分離 | `qa-training-store`は公開の教材正本として維持。受講者の課題作業用に別リポジトリを設け、正解の先読みを防ぐため公開範囲を分ける | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
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
| 状態判定 | ロード後の開始判定と読取り専用`course:check Mxx --state start|end`を設計。状態が整合しても本人のLevel 2は自動認定しない | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 提出と修了 | `workspace/Mxx/submission.md`、必要な`evidence/`・コードを提出。自己確認と、評価担当者による正式修了判定を分け、正しい別解を許容する。受講者の成績は公開しない | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 教材更新 | 公開Templateの後続更新は、受講中の個人リポジトリへ自動反映しない。配布元revisionを保持し、明示的に更新した場合だけ差分を適用 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 実行環境 | 個人所有・2コアCodespacesを標準とする。Phase 1・2でGit/PR/CI操作を要求しない。Phase 2は同期先だけでBuild/Serve/Reset/Playwrightを成立させる | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Skillの使用順 | 学習目標に必要なSkill Packageだけを使う。M06は`e2e-test-inspection`→`e2e-test-implementation`→`e2e-test-execution`の前提を確認。全Skillの習熟やworkflow全工程の実行を強制しない | [実行環境とSkill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| M02→M03の入力とSkill経路 | M02の**人間可読の検証責務本文**と、M03で用意する厳密なruntime JSONを分離。条件設計の入口は`condition_structure(direct)`、技法runtime後のCI生成は**`materialize_coverage(artifact)`必須**。Caseはcurrent TR Entityの有無に合うmodeを固定commitの通し実行で検証する。directは上流参照欠落を許容し得るため、Authority/Risk/Scope・TCNへの継承を別途照合する | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 直接の本人判断評価 | M04・M07・M10の正式修了で、評価担当者が未提示の条件変更・誤りを1件示し、AI生成回答に依存せず本人が根拠と判断を説明したことを確認する。通常演習はAI利用可 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 22状態の実データ共有 | 11モジュール×開始/終了の22個の論理状態は維持。共通する公開可能な設定・Seed等は同一ID/revisionで参照し、公開サンプルと非公開模範の実体は分離。前後の本人成果物と公開サンプルは同じ入力契約に適合する別IDを許す | [状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 対応関係の正本 | 学習目標・習熟の説明はPlan、教材・問題・評価の本文は各実ファイル、**ID間の関係はJSONグラフ**。Markdown対応表は生成物とし、二重の手動更新を防ぐ | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 新旧カリキュラムの分離 | 旧17レッスン・104問・旧validator・正式回帰の契約は維持。新課程の同期/Playwright/CIは専用経路に分離する | [調査](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) |
| クイズと評価 | 四択は原則正解1つ、A〜Dの意味・正誤理由・根拠・復習先を記載。全必須観点Level 2以上でフェーズ修了。クイズ得点・AIの自己申告だけでは合格にしない | [クイズ](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 知識グラフ | JSONと読取り専用CLIを採用。51学習項目、教材・問題・実技・22状態・仕様・Skill・評価を結び、仕様やSkill改訂時の影響を追う。未登録変更を「影響なし」にしない | [知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| Phase 3 | Phase 2の既存specを再利用。専用workflowを選択者が明示的に有効化し、対象SHA・Run・Check・Artifactと権限を確認する | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |

### 教材品質について追加した採用事項

| 採用事項 | 設計済みの内容 | 詳細の正本 |
| --- | --- | --- |
| 教材の内容品質 | 必要な前提、具体的な導出過程、誤りと理由、誘導演習、別条件での独立適用、観測・復習を内容で確認。ページ数・問題数を一律に固定しない | [3フェーズ構成・教材品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) |
| 技法ごとの演習対象 | Cartだけに固定せず、既存の在庫分類・検索条件・ロール・注文等を候補から選ぶ。正式仕様、Seed、観測・Resetの成立を確認してから採用。製品の新機能は不足が証明された場合のみ検討 | [演習対象](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 実技模範と採点 | 完成成果物に加えて判断・導出過程、必須条件、誤答・部分的正答・正しい別解、評価不能を判定できる資料を作る。公開の学習例と非公開修了模範は区別 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 代表教材の先行検証 | M02→M03とM05→M06で教材・独立演習・模範・採点基準を制作し、内容レビューと初心者試行を経てから全11モジュールの教材制作へ展開。技術経路の最小検証は先行・並行可能 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |

上記は**Planで採用した設計**であって、教材の制作・初心者試行・第三者採点が完了したという意味ではない。

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
- **未実行**：固定SkillでCartの具体的な仕様・Risk・Scopeを使った`condition_structure(direct)`→`materialize_coverage(artifact)`→`case_structure`の受け渡し、および最終証拠検証は未確認。各スクリプトの実装を確認した事実と、新しい入力で成功した事実を区別する。
- **採用判断**：初心者の学習では`direct`を**条件設計の入口のみ**に採用。途中で`artifact`を使う必要があることは既知。新しいモジュールやSkill内部のruntimeを追加せず、通し受入で契約が成立しない場合に理由と最小の対応を判断する。

## 残確認事項：運営開始までに指定する内容

| 対象 | 必要な指定 | 状態・扱い |
| --- | --- | --- |
| 学習用Templateの実体 | 公開リポジトリ名、作成するアカウント、管理・更新権限 | **未指定**。設計では「別の公開Template」で確定。作成自体は別作業 |
| 非公開模範・採点資料の保管 | アクセス制限された実際の保存先、更新権限、教材revisionとの対応を管理する担当者 | **未指定**。新しい非公開GitHubリポジトリを必須としない。保存先やアクセス方法を公開Planへ書かない |
| 正式修了の評価担当 | 評価担当者の割当、提出物を受け取る経路、判定記録の実際の保存先 | **未指定**。評価責任・提出形式・Level 2基準は[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)で設計済み |
| 各受講者のCodespaces運用 | 本人の所有/支払主体、2コア選択、無料枠の残量、課金停止条件 | **受講開始時の確認**。無断課金でBLOCKEDを解消しない |

これらは運営に必要な値の指定であり、**カリキュラム全体の設計を未確定に戻すものではない**。権限・保存先が未指定のまま公開版へ非公開模範を追加したり、運用が完了したと宣言したりしない。

## 残確認事項：実装・実機で検証する内容

| 対象 | 完了と判断するための証拠 | 対応するPlan |
| --- | --- | --- |
| 同期manifestの最終ファイル一覧 | `build:web`のimport/asset/起動依存を辿り、各許可パスの必要性を記録。学習用リポジトリ単体でBuild/Serve/TestをPASS | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 管理者同期とモジュールロード | 固定SHA、機密データ混入の拒否、途中失敗・再ロード・シンボリックリンク・衝突時の非破壊性、指定1モジュールだけのロードをテスト | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) |
| 11モジュールの開始・終了基準状態 | **22状態**の実データ・契約・公開可能な入力サンプル・非公開模範を揃える。入力欠落・版違い・意図的FAILと正常開始を区別 | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 初見課題・教材・問題の妥当性 | 51学習項目を説明できる教材、正しい問題と全選択肢の解説、別条件を使ったM04/M07/M10の実技とLevel 2の証拠 | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| M02→M03の固定Skill受入検証 | **固定commitの既存CIは成功を確認済みだが、M02のCart実データからCaseへのdirect起点の通し実行は未実施**。実在Authority/Risk/ScopeとTR相当1件を用い、TCN(direct)→技法→CI(artifact)→Case(適切なmode)→evidence gateの`valid=true`を確認する。上流参照欠落、Caseに必要なCI/TCN/TR不一致、current TRなしのDisposition、誤mode、`invalid_input`の終了コード0を成功扱いしない | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 外部SkillとPython helper | 採用Skill Packageの参照・呼出し・入力/出力・検証と、2コアCodespacesでの実行結果。未実行を「使用済み」としない | [実行環境・Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Phase 2のE2E実行 | 新課程専用Playwright Config、対象spec、Seed/Reset、複数RunとTrace/Report、旧Trainingとの出力分離の証拠 | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| Phase 3の専用CI | 受講者の明示的な有効化、最小権限、対象SHAとRun/Check/Artifactの一致、正式/旧workflowの非発火 | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 知識グラフの完成契約 | 全51項目と知識・教材・実技・評価・22状態の参照網羅、改訂時の未登録変更検出、意味的なレビュー | [知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 費用と受講所要時間 | 2コアの実測起動時間、保存容量、受講者の無料枠条件。成立しない環境はBLOCKEDとし課金へ自動切替しない | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) |

**再検証不要**：OpenCode Zen無料モデルの利用可否・認証可否。これはユーザーの確認済み前提とし、上表の未確認事項へ戻さない。

## 今回の更新時点で行っていないこと

- 新しい学習用Templateのリポジトリ作成、同期・ロードスクリプト実装・実行
- 教材・問題・実技、基準状態の実データ・非公開模範の作成
- 知識グラフJSONとCLIの完成仕様への追加実装
- 2コアCodespacesでの新課程の通し検証、Phase 3 CIの起動
- 既存の製品コード・正式CI・旧教材・外部Skill本体の変更
- PRのmerge、branch削除、PR #198の変更

この文書の項目を完了へ変更するときは、**対象の実在パス、revision、実行結果、確認した判断主体**を対応する詳細Planに記録する。Planがあるだけで「実装完了」としない。
