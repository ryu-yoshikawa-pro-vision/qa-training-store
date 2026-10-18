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
| M02→M03の入力とSkill経路 | M02に検証責務ID、BR/AC、関連リスク、期待する成立条件・不変条件を明記し、M03で`test-condition-design`の**`direct` mode**に接続する。`artifact` modeはcurrent TR Entityを要する別経路として区別し、入力不足をAIが補完しない | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Skill](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |
| 直接の本人判断評価 | M04・M07・M10の正式修了で、評価担当者が未提示の条件変更・誤りを1件示し、AI生成回答に依存せず本人が根拠と判断を説明したことを確認する。通常演習はAI利用可 | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 22状態の実データ共有 | 11モジュール×開始/終了の22個の論理状態は維持。共通する公開可能な設定・Seed等は同一ID/revisionで参照し、公開サンプルと非公開模範の実体は分離。前後の本人成果物と公開サンプルは同じ入力契約に適合する別IDを許す | [状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 対応関係の正本 | 学習目標・習熟の説明はPlan、教材・問題・評価の本文は各実ファイル、**ID間の関係はJSONグラフ**。Markdown対応表は生成物とし、二重の手動更新を防ぐ | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| 新旧カリキュラムの分離 | 旧17レッスン・104問・旧validator・正式回帰の契約は維持。新課程の同期/Playwright/CIは専用経路に分離する | [調査](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) |
| クイズと評価 | 四択は原則正解1つ、A〜Dの意味・正誤理由・根拠・復習先を記載。全必須観点Level 2以上でフェーズ修了。クイズ得点・AIの自己申告だけでは合格にしない | [クイズ](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 知識グラフ | JSONと読取り専用CLIを採用。51学習項目、教材・問題・実技・22状態・仕様・Skill・評価を結び、仕様やSkill改訂時の影響を追う。未登録変更を「影響なし」にしない | [知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| Phase 3 | Phase 2の既存specを再利用。専用workflowを選択者が明示的に有効化し、対象SHA・Run・Check・Artifactと権限を確認する | [実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) |

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
| M02→M03の`direct` mode受入検証 | 固定commitでM02の検証責務を`test_requirements[]`へ接続し、Authority/Risk/Scopeのcurrent参照、TCN/CI→Case、誤モード・不足入力の停止を確かめる。**設計上はdirectを選択済み、実行成功は未確認** | [学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md) |
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
