# PR #199：M00〜M10学習目標・知識ノード意味的レビュー引継ぎ（2026-11-03）

## 結論と判定範囲

**M00〜M10の11モジュール、51学習目標の`level2`、82知識ノードの`can_do`に対する教材・実技・採点基準の静的対応レビューを全件実施した。** 各ノードが示す具体的行動を、各モジュールREADME、`training/ai-assisted-qa-course/exercises/Mxx/exercise.md`、提出記録、`assessment/scoring-tests/Mxx.json`の該当目標・知識ID・証拠/合否条件に照合した。**静的レビューの対象消化51/51・82/82であり、実行・学習評価・正式承認のPASSではない。**

最終静的レビュー時のHEAD：`adc73d2a9509c841b62af604d42092289f91cd30`。このHEADの`knowledge-graph.json`の実数は学習目標51、知識ノード82、全ノード339、辺796、参照不能辺0。**知識ノード82件すべての`status`は`draft_requires_content_review`のまま**である。本文の静的照合だけでは実受講者のLevel 2/3達成、公開モデル校正、教材の最終内容承認を認めない。過去の[構造監査](./2026-11-03_pr199-learning-objective-knowledge-trace-audit.md)では採点基準51件、公開校正106 Caseを確認しているが、実モデル実行は未受入。

## モジュール別の監査結果

| モジュール | 対象学習目標 | 対象知識ノード | 静的に照合した主な条件 | 引継ぎ先に残る独立の確認 |
| --- | ---: | ---: | --- | --- |
| M00 | 4 | 8 | 保存・相対パス、OpenCode/固定Skill起動、Secret/Ports、再ロード保護 | 実Codespace・Skill・競合拒否・本人の許可判断 |
| M01 | 4 | 5 | 期待/観測、探索/回帰/自動化、テスト層、AI責任 | P01実画面、M01-04のComponentを含む理解の独立判定 |
| M02 | 5 | 8 | BR/AC、Role/State/Data、Seed/Reset、Risk・未決 | Seed/Reset保証の実装値と本人が行う観測の区別 |
| M03 | 5 | 8 | 同値・境界・デシジョンテーブル・遷移・Traceability | 新条件の表/Caseと`valid`でも誤期待を拒否する評価 |
| M04 | 4 | 4 | AI Caseレビュー、四層採否、Automation選択、引継ぎ | Componentの証拠、M06へ渡す独立Caseの実行可能性 |
| M05 | 5 | 16 | Node/TypeScript、Locator、Assertion、型/実行時診断、Config | `tsc`/ `tsx`実出力、before/after spec、8082と結果SHA |
| M06 | 5 | 7 | 固定3 Case、削除004、数量更新005、再読込、独立Reset | 追加2 Caseの初回/再実行、本人別Caseとfallbackの区別 |
| M07 | 5 | 7 | 失敗分類、Trace、Retry、before/after、Page Object/fixture | 診断AとTODOの別Run、保守演習2→3件以上の実Run |
| M08 | 4 | 5 | Git working tree/stage/commit、PR草稿、過剰抽象化拒否 | 本人の2commit、対象差分のみstage、push/PR未実行管理 |
| M09 | 5 | 7 | workflow・SHA・失敗ログ・料金・最小権限 | 手動triggerとPR eventの別SHA、費用・Secret・信頼境界 |
| M10 | 5 | 7 | 専用CI、現行HEADとRun/Check/Artifact、停止判断 | 本人repoで許可された実RunとGitHub API照合、同SHAの証拠 |

### 詳細根拠

- [M00の4目標・8知識ノード](./2026-11-03_pr199-m00-learning-objective-semantic-review.md)
- [M01の4目標・5知識ノード](./2026-11-03_pr199-m01-learning-objective-semantic-review.md)
- [M02〜M04の14目標・20知識ノード](./2026-11-03_pr199-m02-m04-learning-objective-semantic-review.md)
- [M05〜M07の15目標・30知識ノード](./2026-11-03_pr199-m05-m07-learning-objective-semantic-review.md)
- [M08〜M10の14目標・19知識ノード](./2026-11-03_pr199-m08-m10-learning-objective-semantic-review.md)
- [四択へ直接対応しない8知識ノード](./2026-11-03_pr199-eight-unquizzed-knowledge-semantic-review.md)は上記のM00〜M10報告と重複するため追加件数では数えない

## 内容レビュー後も残る確認事項（重複を除く）

### 採点・本人の実証拠（他セッション担当）

- **M00**：Skillを読むだけの回答に誤PASSしない。固定revision/依存の実確認、OpenCodeの読み込み証拠、制約付き依頼、変更範囲照合、編集済み`submission.md`の再ロード拒否・本文不変、Ports/費用・モデルの実設定確認。
- **M01**：未実行のUIを観測済みと書かない。探索と自動化を対立概念にしない。`M01-04`の4層（Componentを含む）の本人判断を確認。
- **M02**：数量追加と更新の別期待、Seedの保証と未保証、Reset実装値・実観測、測定なしのLikelihoodの扱い、未決仕様によるCase保留。
- **M03**：新条件から同値/境界/表/遷移を本人が作る。8ルール検索表と4ルールCart再検証を区別、論理到達不能とデータ不足を混同しない。固定Skillの`valid`を意味的PASSとしない。
- **M04**：根拠のある正しいAI Caseは採用し誤りを捏造しない。P04のComponentの役割、新CaseのRole/State/Data/Seed、M06へ持ち込むCase ID・BR/AC・未決を確かめる。
- **M05**：短コードの予測→編集→`tsx`実出力と、対象workspaceファイルを指定した`tsc`の診断、`import/export`/async、別要素のLocator件数、実`course:run`のbefore/afterを分離。
- **M06**：固定3件だけの実行を合格にしない。削除004、更新005を別testとし、初回/再実行で双方PASS、数量2の再読込保持とReset/Context独立性を確認。
- **M07**：診断A・合成B/C・TODO before/after・POM/fixture before/afterを区別。before 2件とafter 3件以上の実Run、各testでReset、業務Assertionの維持が必要。
- **M08**：未追跡ファイルの通常diffの限界、cached diff、1件のみstage、2回目commitの単独差分とPR全差分の別判断、未push/未PRの明記。
- **M09**：`.disabled`設計を実CI受入にしない。手動triggerのSHA特定、旧SHA/Run/attempt/Artifactの混同、Runner/費用/保存量、write-all/Secret/`pull_request_target`外部PR実行の禁止を確認。
- **M10**：本人repoの費用・権限の確認を経た専用workflow実有効化、現PR HEAD・Run/Check/Artifact・Playwright JSONと対象specの一致、PASS/FAIL/SKIP、後続commit・停止条件を実証。

### 受入と公開・CI（引き続き別担当）

- 公開校正106 Caseを実モデルで実行し、正答・部分正答・拒否・再評価の誤PASSを検証する。
- 採点基準51件の文言が実際の`course:assess`判定経路と一致するか確認する。本文に書かれているだけでは認定できない。
- M00〜M10のP01〜P06と本人提出物、模範解答、`completed-states`の版、固定Skillと配布/教材Web UIを別に受入する。
- 学習用配布manifest・source hash、Secret除外、第三者NOTICEを検証する。
- Scenario Shop分析台帳の操作・非default状態・分母の再集計と根拠検証は共通定期実行の担当とする。
- 最終HEADでのWeb/Mobile必須CI、独立レビュー、製品側PR #210との変更境界を確認する。製品SUT・正式仕様・既存製品テストをPR #199で修正してCIを装わない。
- 本人のPublic Template公開はPRマージ後、Private 2-core Codespaces実受入は他作業後の決定を維持する。未実施はPASS扱いしない。

## このレビューの完了/未完了の定義

**今回終了**：学習目標51件と知識ノード82件の静的な意味・対応関係の照合および相互の明確な矛盾/欠落の有無の調査。関連報告書を全モジュールに残した。

**未完**：知識グラフの82件の正式内容承認、採点実装の独立検証、実際の本人Level 2/3評価、実モデル校正、実Playwright・実Web/Native・実GitHub Actions・Codespaces、配布、最終CI。今回のレビューでこれらを完了・成功と表示しない。

**変更範囲**：追加のレビュー文書のみ。製品実装、正式仕様、Seed/Reset、教材・評価実装、分析台帳・共通Plan、CI・workflow、PRの状態は変更していない。
