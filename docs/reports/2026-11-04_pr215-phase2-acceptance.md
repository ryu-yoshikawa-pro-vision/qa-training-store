# PR #215：Phase 2教材・実技の受入確認

## 対象と実施方法

- 作業PR：[#215](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/215)（Draft、baseは`docs/plan-ai-agent-qa-curriculum-redesign`）
- 内容確認の対象HEAD：`268d06236e5b068b924f1d71e296a6ad6b0bb4f1`。本レポート追加前のHEADであり、教材・演習・クイズの静的確認に使用した。
- 方法：GitHub上の当該HEADのファイル・Blob SHA・関連する製品仕様・公開ルーブリック・既存テストを読み取り、15学習目標、M05〜M07のP01〜P06、各クイズ、start/endの入出力契約を照合した。クイズは設問・正答・選択肢の誤答理由・復習先・objective ID・knowledge IDの対応を確認した。
- 実行環境：GitHub接続経由の静的確認。リポジトリをローカルに取得できない環境のため、`pnpm`・TypeScript型検査・Playwright Chromium・配布Shop/Resetの実行は**未実施**。実際の受講者による判断・修了認定も実施していない。既存CIの別HEADの成功を、今回の実Runとして流用しない。

## 完了した静的確認（実Runの代替ではない）

1. **M07-03**：教材の「RetryとTimeout」節、P03の合成C、M07-Q03、Phase 2公開ルーブリックを照合。固定待機・再試行だけで原因修正にしないこと、最初の失敗・Reset・Locator・ネットワークを根拠に仮説を切り分ける受入基準が一致することを確認。合成ログを実Runとは扱わない。
2. **クイズ内容の照合**：M05 12問（Blob `f3683f4aa9b634e23d6e2f42daadd5f5cf375da1`）、M06 8問（`3128bdb33196042fbe09b1377bef25e5f1e4b533`）、M07 7問（`2615f72e1deabc7b89046e924bc1a14cc3a61e99`）、計27問を確認。15の全学習目標に設問があり、正答値は各設問で一意、全選択肢に理由、全問に復習先・出典・存在する知識ノードIDがある。クイズ正解はTypeScript実装・独立Case実行・本人の原因切分け・正式AI評価の証拠に数えない。
3. M05〜M07の教本・演習・提出テンプレート・開始/終了状態・公開ルーブリックを読み取り、P01〜P06の記入欄を確認。ただし実行済みではなく、15目標すべての受入は未完了。
4. M04 endの`M04-result-01/02`とM05 startのID/revision、M07 endの`M07-result-01〜04`とM08 startの引継ぎ定義を照合。M08 startが`M07-result-04`（保守後spec）を受け取る定義はない。本人の修了証拠がない場合は公開fallbackを利用するが、本人の完了実績を補わない。

## このPR内での修正

- `docs/curriculum/ai-assisted-qa/modules/M05/README.md`：Cartの数量や表示と注文DB保存を区別。Locatorのタイムアウト・strict mode violation・操作可能状態の違いを明示。
- `docs/curriculum/ai-assisted-qa/modules/M06/README.md`：Playwrightの失敗結果と、業務受入の環境BLOCKEDを区別。終了コードとreceipt/report・対象Caseの照合方法を記載。
- `docs/curriculum/ai-assisted-qa/modules/M07/README.md`、`training/ai-assisted-qa-course/exercises/M07/exercise.md`：Cartを別ページから開き直す条件と、単なる`reload()`を区別。
- `training/ai-assisted-qa-course/exercises/M07/handoff-template.md`：`M07-result-04`を含む4種類のbefore/after Run、spec SHA・report・Exit code、Git/PRに依存しない安全な保全の記録欄を追加。完成回答や架空PASSは記載していない。

## 未完了と再開条件

| 対象 | 現在の状態 | 完了に必要な証拠・依存 |
| --- | --- | --- |
| M05-01〜05 | 未完了 | P03誤型と修正後の`tsc`非0/0、M05 Locatorの修正前後、P05二明細の専用8082 Chromium Run、Run ID/対象spec/report |
| M06-01〜05 | 未完了 | 固定3 Caseと別Case 004/005の実装を分け、004/005各2件以上の`initial`/`repeat`独立Run、Reset/Context・期待/観測・receiptの一致 |
| M07-01〜02、04〜05 | 未完了 | 実失敗AのTrace・標準出力・Screenshot・report、修正前後別Run、保守前2件と後3件の独立Run・仕様Assertion |
| 実行・横断確認の6項目 | 未完了 | M05 P03/P05、M06 004/005、M07 before/after、8082配布Shopと証拠/Reset隔離、15目標の提出・状態照合、変更HEADの検証ログ |
| 知識グラフの意味レビュー | 未完了 | M05〜M07の30理解ノードは共有Graphで`draft_requires_content_review`。教材節、実技・評価の観測、前提順序を#199で内容確認・調停 |
| M04→M05、M07→M08の実引継ぎ | 未完了 | 本人のID/revision/Run・配布元SHAを実ファイルで確認し、M08側の`M07-result-04`受領の要否を#199/#216で判断 |
| 通常AI学習・Gitを使わないエクスポート | 未完了 | 実モデルによる通常チューター動作、個人データ・秘密情報を除いた保全/復元、#217の正式評価・#218の配布との境界を実証 |

## CI・他ブランチへの引継ぎ

- 変更前HEAD `dd0d2398e101a1ae4a644eb40b38928308322a17` の[Web CI Run 41782026755](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41782026755)：`Style Quality`でMarkdown lint失敗。原因は **#199が所有する** `docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md:3` のMD039（`[ #199 ]` の余計な空白）。他のジョブの成功をこのPR固有のM05〜M07実Runの成功とはみなさない。共有ファイルは#215から変更しない。
- #217/#199へ：`training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts` の3件目は`page.reload()`のみ。教材P05の「別ページへ移動→Cartへ再訪」と一致しない。正式評価用の参照specは#215から修正しない。
- #216/#199へ：`training/ai-assisted-qa-course/states/M08/start.json`に、M07 end出力`M07-result-04`（`maintenance.spec.ts`）の入力宣言がない。引継ぎに必須かを確認し、必要なら統合側で変更する。
- #199へ：M05〜M07の30理解ノードは現状すべて`draft_requires_content_review`。このレビュー結果は自動的に人間承認へ変更しない。Graph本体と共通テスト、製品SUTはこのPRから編集しない。

## 進捗

**Progress: 8% (2/25)**。上記2件は静的基準のみを完了。追加の実行証拠が必要な23件は未完了のまま保持する。

**Next**：専用8082の配布Shop、依存導入済み環境とChromiumを使い、M05の型検査とLocator Run、続けてM06独立Case、M07 before/afterを実行する。各Runの実際のID・report・spec SHAを記録し、成功した項目だけチェックする。CIの完了待ちは行わない。
