# PR #199：反復実践の増強

対象はM00〜M10全11モジュール、51学習目標。手順付き例題を残し、P01〜P06の独立課題66件を追加した。受講者が「予測→操作→観測→原因分析→修正→再確認」を繰り返す。演習を読んだだけで実施済みとはしない。

## モジュールと実践の接続

| 範囲 | 独立実践 |
| --- | --- |
| M00〜M01 | 安全な環境操作、実観測、欠陥報告、手法・テスト層の選択 |
| M02〜M04 | Cart/Storefront仕様、リスク比較、4技法、レビュー・自動化採否 |
| M05〜M07 | TypeScript、非同期処理、Locator、本人CaseからのE2E、失敗分析・保守 |
| M08〜M10 | Gitの安全な差分選択、条件を変えたworkflow、本人の実PR・CI証拠 |

M02分析→M03設計→M04レビュー→M06本人Case実装→M07保守の引継ぎを重視する。M06の追加Caseは許可済みの`new-case.spec.ts`へ別testを追加し、固定3 Case・既定Runは残す。既存の公開fallbackは別IDとrevisionのまま維持する。

## 証拠と安全性

全66課題を`exercise.md`に記載し、`submission-template.md`にID別の記録欄を持たせる。予測、本人の操作、観測値・証拠パス/Run/SHA、修正、未実行・未決を区別する。M03の固定Skill検証、M05〜M07の専用Playwright証拠、M10のGitHub API照合は維持する。合成ログとAI自己申告は実行証拠にしない。Secretは記録しない。追加CIは権限・費用の確認後のみ行う。

## 検証と残受入

`tests/contracts/ai-assisted-qa-practical-exercises.test.mjs`で11章のP01〜P06、提出欄、配布manifest、end-stateを確認する。構造PASSは受講者の習熟を証明しない。`course:check`は構造、`course:tutor`はヒント、`course:assess`は正式評価である。追加実践の意味的な正しさは既存のルーブリックと本人の証拠で確認し、未実行・BLOCKED・不合格を区別する。

実Template→本人Private repo→2コアCodespaces、OpenCode実モデルの校正と再評価、実受講者の学習効果は、この文書では成功とみなさず既存PRの受入条件を維持する。
