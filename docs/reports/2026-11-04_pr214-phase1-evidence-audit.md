# PR #214 Phase 1教材と評価証拠の照合（2026-11-04）

## 対象と実施方法

対象ブランチ：`work/pr199-curriculum-phase1`。照合基準HEAD：`7ec8e6f92da31ac25516cce62794b7ae8e4f1964`。GitHubから各原本を直接取得し、ID、必要課題、提出欄、採点条件、復習先、状態契約をJavaScriptで静的に確認した。検証対象はM00〜M04の22学習目標である。

**実行したもの**：GitHub上のJSON/Markdownの値と参照先の直接照合。**実行していないもの**：Vitest、Codespacesの手動操作、モデルによるSkill実行、本人採点、GitHub Actions完了判定。静的確認は学習者のLevel 2修了を証明しない。

## 22目標の対応

以下のP番号は、各モジュール`assessment/scoring-tests/<module>.json`の`required_evidence[0]`から取得した。全P番号について、`exercises/<module>/exercise.md`のP見出しと`submission-template.md`の同じ番号の提出行を確認した。

| 学習目標 | 採点条件 | 必須P課題 |
| --- | --- | --- |
| M00-01 | M00-CR-01 | P01 / P02 / P05 |
| M00-02 | M00-CR-02 | P03 / P06 |
| M00-03 | M00-CR-03 | P04 |
| M00-04 | M00-CR-04 | P05 / P06 |
| M01-01 | M01-CR-01 | P01 / P02 / P03 |
| M01-02 | M01-CR-02 | P04 |
| M01-03 | M01-CR-03 | P06 |
| M01-04 | M01-CR-04 | P05 |
| M02-01 | M02-CR-01 | P01 / P02 / P03 |
| M02-02 | M02-CR-02 | P01 / P02 / P03 |
| M02-03 | M02-CR-03 | P06 |
| M02-04 | M02-CR-04 | P04 |
| M02-05 | M02-CR-05 | P05 |
| M03-01 | M03-CR-01 | P01 |
| M03-02 | M03-CR-02 | P02 |
| M03-03 | M03-CR-03 | P03 |
| M03-04 | M03-CR-04 | P04 |
| M03-05 | M03-CR-05 | P05 / P06 |
| M04-01 | M04-CR-01 | P01 / P02 / P03 |
| M04-02 | M04-CR-02 | P04 |
| M04-03 | M04-CR-03 | P05 |
| M04-04 | M04-CR-04 | P06 |

**結果**：採点対象22/22、対応P見出しと提出欄22/22。M00-04の実操作が未完了であることと、P番号・提出欄の存在は別の判定である。

## 復習先と開始・終了状態

| モジュール | 学習目標数 | クイズ数 | 開始・終了契約 |
| --- | ---: | ---: | --- |
| M00 | 4 | 6 | ai-assisted-qa-course-v3 / 一致 |
| M01 | 4 | 5 | ai-assisted-qa-course-v3 / 一致 |
| M02 | 5 | 8 | ai-assisted-qa-course-v3 / 一致 |
| M03 | 5 | 9 | ai-assisted-qa-course-v3 / 一致 |
| M04 | 4 | 4 | ai-assisted-qa-course-v3 / 一致 |

22/22目標は各教材本文とクイズから参照できる。32問すべての`review_path`に指定された見出しは、既存`scripts/spec/slug-heading.ts`のNFKC正規化・連続ハイフン圧縮と同じ規則で再計算して照合し、32/32一致した。各モジュールの`states/<module>/start.json`と`end.json`について、22/22の`expected.objective_ids`が一致し、差分なし。クイズの正答は実技の合格判定に換算しない。

追加した固有の回帰テストは`tests/contracts/ai-assisted-qa-phase1-objective-evidence.test.mjs`。22目標・P番号・P見出し・提出欄・採点条件・クイズ・教材目標ID・開始/終了stateの関係をテスト時に検査する。**テストソース追加と本記録の静的検証は実施済みだが、Vitestの実行結果は未取得。**

## 固定Skillのソース照合と実行できなかった範囲

`training/course-sync/manifest.json`は`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`を指定。GitHubの指定commitにおけるGitツリー（`truncated=false`）と配布定義の**104ファイル**を`source_path`・Git Blob SHA・byte sizeで直接照合した結果、104/104一致、欠落0。内訳：SKILL.md 13、scripts 43、assets 28、references 20。M02/M03に必要なspec-analysis、test-analysis、test-requirement-design、test-condition-design、test-case-design、coverage-analysisのSKILL.mdも存在した。

これは**配布元ソースの整合**であり、受講者の`.agents/skills/`への実コピー、Python 3.11でのhelper実行、モデル依存Skill runtime、出力envelope・fingerprint・current参照のPASSではない。環境へ配置済みとは判断していない。M02→M03の統合受入とSkill-localの実行項目は未チェックで残す。

M00の`loadModule`は異なる既存学習者ファイルを検出すると`existing learner files differ; nothing was overwritten`で拒否する設計で、既存`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`にはM00の`submission.md`へ文字列を追記して再ロード拒否・内容保持を確認するテストがある。ただし**本作業でそのテストは実行していない**。Private 6080ポート、利用者の支払者/利用枠、実モデル料金画面の観測を代替できない。M00-04は未チェックのまま残す。

## 不一致・引継ぎ

- `M00-CR-03`：M00 P04の「架空の誤回答を実AI回答と区別して本人が独立訂正する」条件が、採点基準には独立した提出・合格要件として明示されていない。誤PASS防止の必要性をPR #217へ引き継いだ。
- `M01-CR-04` / `M04-CR-02`：4テスト層すべてに独立した採否/限界/費用を提出させる教材の条件と、採点側のLevel 2判定の粒度をPR #217で照合する必要がある。
- `M03-CR-04`：通常のゲスト→会員Cart統合と、P04の数量変更状態遷移を採点時に混同しないことをPR #217へ引継いだ。
- 共通知識グラフの復習先・Cartへの適用関係の修正候補は、別途PR #199へ引継ぎ済み。

関連実行方法：`pnpm test:contracts`で本リポジトリの契約テストを実行する。Codespaces本人によるP05/P06、固定Skill M02→M03、OpenCode AIチューター、正式M04評価は、それぞれ独立した実証拠が得られるまで未完了とする。

## 続行：実動作確認を除く修正と受入準備（2026-11-04）

実動作確認（Codespaces、ポート、請求、モデルによる対話、本人の学習効果）は人間の担当とする。以下はGitHub上の正本と固定Skillコードから確認・修正した範囲であり、**テストやモデルを実行したことを示さない**。

1. `training/ai-assisted-qa-course/exercises/M03/exercise.md`：`case-runtime-evidence.json`を誤って`test-condition-design` helperへ渡していた。Case専用`test-case-design/scripts/runtime_contract.py`へ修正。固定helperの`verify_runtime_evidence`は`valid=false`でも終了コード0を返すため、出力JSONに対して`valid=true`、`issues/missing/extra/incomplete_pairs/duplicates`、Entity不足・重複、`current_structure_state.runtime_results`の存在を検査するコマンドを追加。Case/Conditionのrequestと結果を別々に保存し、実モデル依存の技法生成を省略しない。
2. `training/ai-assisted-qa-course/inputs/M03/start.md`：正式`docs/spec/features/cart.md`の`BR-CART-001/AC-CART-001`をAuthority正規化helperへ渡す**未実行の入力候補**を追加。`SCOPE-101`、Source、実際のdistribution SHA、既存`RISK-CART-001`（Impact 4、Likelihood 2）の区別と、ScopeをMachine Entityとして生成しない条件を維持。`authority_entities.py`の入力フィールドは指定commitの固定helperと照合した。
3. `docs/curriculum/ai-assisted-qa/modules/M03/README.md`とM04 README：M03のシェルで特殊文字となる`--model <...>`を実行可能な`--model provider/model-id`例へ修正。M04の引数不足した`course:tutor M04`例にも必須`--model`を追加。
4. M00〜M04の`training/ai-assisted-qa-course/exercises/Mxx/exercise.md`：各章固有の題材で説明→段階ヒント→別条件練習→誤解別の復習→再挑戦を明示。本人が予測・原文照合・再判断を行う条件を付け、チューターの説明やAI回答を正式AI採点・本人Level 2に換算しない。
5. 新規`tests/contracts/ai-assisted-qa-phase1-pinned-skill-entry.test.mjs`：固定配布104件の一意性、M02/M03に必要なSkillとruntimeスクリプト、Riskの実CSV行、Scope分離、M03 Authority入力JSON、Condition/Case検証先と`valid`検査、M00〜M04のチューター起動コマンド・反復段階を回帰契約へ追加。前回追加の`ai-assisted-qa-phase1-objective-evidence.test.mjs`も維持。

**この作業中の直接照合結果**：GitHubから現行教材10ファイルを取得して44条件を直接照合し、全44件一致。固定manifest、Cart仕様、M02/M03開始サンプル、Risk CSV、2種類のruntime requestテンプレート、新テストを取得して13条件を照合し、全13件一致。これはJavaScriptによる文字列・JSON構造・参照の照合であり、`pnpm test:contracts`またはPython 3.11 helperの実行結果ではない。

**OpenCode V2仕様調査**：`mini --model ... --prompt ...`は正式なCLIコマンド。V2権限規則では`*`が`/`を含むため、入れ子ファイルを`*`だけを理由に読めないとは断定しない。V2の更新設定はglobalの`update: "disable"`であり、共有`tutor-core.mjs`の`autoupdate: false`だけで更新停止を保証できない。この確認をPR #199へ訂正して引継ぎ済み（issuecomment-6629143533）。共通runtime/manifest/評価エンジンは変更していない。

**残る人間の実動作確認**：M00の個人Codespacesの支払者・Private Port・学習者ファイルの前後比較、固定SkillのM02→M03全runtime実行・Python 3.11の実在・fingerprint、OpenCode本人による段階ヒントと再挑戦。元の5件の受入項目にはこれらが含まれるため、関連する静的準備を完了しても項目全体のチェックは付けない。CIは完了待ちしていない。

## 2026-11-06 #214の品質修正・差分レビュー

### 対象と結果

PR #214の25変更ファイルについて、教材M00〜M04（README 5件）、M04クイズ、演習と提出・M03開始入力、追加専用契約テスト8件、タスクリスト・本レポートの変更差分を確認した。関連する正式`docs/spec/features/cart.md`の`BR-CART-001/003`・`AC-CART-001`、Web数量`select`、Use CaseとDexie保存、固定Skillの`verify_runtime_evidence`仕様、M04→M05のstate契約と照合した。

確認した範囲では、**本PR側に追加修正が必要な新たな仕様・安全性の不整合は確認していない**。確認済みの残課題は次の担当境界で維持する。

- **#199へ統合時調整**：#214の`training/course-sync/manifest.json`は固定Skill104ファイルを検査するが、#218の最新配布manifestは`test-requirement-design/scripts/runtime_v1_cutover.py`を追加した105ファイル。#214の`ai-assisted-qa-phase1-pinned-skill-entry.test.mjs`の件数断定を、最終配布manifestに合わせて#199側で調停する。#218所有manifestは本PRから編集しない。
- **#217/#199側の採点条件**：M00の架空誤回答と実AI応答の独立訂正、M01/M04の四層選定、M03のCart数量状態遷移について、採点器のLevel 2基準との意味上の突合を継続する。教材の静的契約PASSを正式採点成功へ換算しない。
- **#199の実受入**：本人Private Codespaces、料金・ポート・Agent権限、固定SkillとPython 3.11 helperの学習環境での実行、M02→M03通しRun、認証付きOpenCode対話・正式評価は[統合タスクリスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)で未完了として管理する。

### フォーマット・Markdown修正

[Web CI #41862809264](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41862809264)のStyle Qualityで失敗した契約テスト5ファイルを修正した。最終1ファイルはCI上のPrettier 3.8.1の生成結果を取得してそのまま反映し、一時診断テストは削除した。加えてM00〜M04の演習5ファイルとM03開始入力で、Markdownlintの`MD012`に抵触する連続空行6件を修正した。品質ゲートを緩和していない。

### 最新baseと差分確認

PR #214の変更前のbase `166412cf402f07ed3b4229eb6b3aeb6b5dd5cadf`から、確認時点の#199 HEAD `76344d6530876e6eddae4bc5b0eba21374d14036`への追加3コミットの変更対象は、#199所有の`docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md`のみ。#214の25変更ファイルと重複しないため、本PRではそのファイルを直接編集せず、最新baseを基準に差分と依存を確認した。#199へのPRマージやbranch削除は実施していない。

### CIとレビューの判定境界

[Web CI #42151829759](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42151829759)では契約テストが成功したが、フォーマット診断を含む途中HEADのため最終受入ではない。**CI全体の成功は最終HEADのRunで別途判定する**。本レビューはGitHub上の差分と関連ファイルを照合した作業であり、CodeRabbitの外部レビューを起動した結果ではない。CodeRabbitは非defaultのbaseに対する自動レビューをスキップしている。別実行者による追加レビューや#199統合差分のレビューは#199の最終受入と区別する。

### 2026-11-06 最終タスクリスト更新後のCIと#199側修正

- #214の`ca9d493fa0aee2464be65a9239bdb4a9e17e4cb7`に対する[Web CI #42153146071](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42153146071)は**全体Success**。Style Quality（format・Markdownlint・仕様/教材検証）、Code Quality、Vitest (contracts)、Training runtime contracts、必須Chromium E2E、Cloudflare Preview、verify/validateを含む結果である。
- タスクリスト更新後HEAD `e0b9b0e91b3efb415ae624b4172ce3287793ae00`の[Web CI #42153862213](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42153862213)では、#199のbaseへ新たに追加された`tests/contracts/web-public-build.test.ts`のフォーマット違反でStyle Qualityが失敗。**#214の25変更ファイルではない**ため、本PR側で共通テストを編集しない。
- #199の担当ブランチで、[commit `87b841cd7ad0670093062def4031f6d4fa36986e`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/87b841cd7ad0670093062def4031f6d4fa36986e)により当該テストのPrettier修正が反映された。#214と#199が並行更新中のため、過去の成功Runを移動後baseの成功と混同せず、再検証する。
