# Report (append-only)

- TASK完了、blocker、重要判断、計画変更、Run完了のcheckpointだけ追記する。
- 過去checkpointは削除・置換・並べ替えず、Summary / Progressも新checkpointとして追記する。
- Hook JSONLやrunnerが取得するmachine factをREPORTへ逐次転記しない。
- REPORTにはAIが残す意味情報だけを記録する。

## YYYY-MM-DD HH:MM (JST)

- Summary:
- Changes:
- Decision / Rationale:
- Validation:
- Blocker / Remaining:
- Subagents:
  - Delegation:
  - Result:
  - Parent decision:
- Progress: NN% (done/total)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-09-14 18:13 (JST)

- Summary:
  - PR #151の再修正指示、既存PR状態、同一branch、最近のRun / ADR、対象文書を確認し、再修正の計画を保存した。
- Changes:
  - `docs/plans/2026-09-14_180617_pr151-japanese-wording-rerevision.md`を追加し、Run-localの`PLAN.md`と`TASKS.md`を今回の再修正向けに更新した。
- Decision / Rationale:
  - 前回対象の83文書を再確認し、`Rubric`、`Native specialization`などの一般語は人間向け文脈で日本語化する。`tests/contracts/training-curriculum.test.ts`が直接検査する2つのrubric固定文字列、ファイル名、formal heading、BR / AC、コード、path、URL、ID、設定値は保持する。
  - 前回の助詞・同義語・語順だけの差分は`origin/main`との比較で戻し、意味のある文脈単位の修正だけを再適用する。
- Validation:
  - current branchは`fix/2026-09-14-2`、PR #151はopen・未merge、PR headは`672e3499ee89e61a3cc70bb7bf498ce97a68e429`であることを確認した。
  - `scripts/validate-curriculum.ts`と契約テストの固定参照、最近のADR-0023〜0025、Git branch safetyを確認した。
- Blocker / Remaining:
  - blockerなし。対象文書の復元・再修正、横断確認、diffレビュー、検証、Run sanitizer、commit / push / PR本文更新 / 最新CI確認が残る。
- Subagents:
  - Delegation: なし。
  - Result: なし。
  - Parent decision: 同一PR・同一branchを維持するstrict implementationとして進める。
- Progress: 14% (1/7)

## 2026-09-14 19:24 (JST)

- Summary:
  - カリキュラムと関連仕様文書の一般語を文脈単位で日本語化し、前回の助詞・同義語・語順だけの差分を整理した。
  - `Rubric`の表示を`習熟度評価基準`、`Native specialization`の表示を`モバイルアプリ自動化の選択課程`へ統一した。
- Changes:
  - 最終差分は`origin/main`比較で34文書に整理し、旧PRで変更されていた文書のうち46文書を`origin/main`の内容へ戻した。戻した旧PR差分は概算で追加326行・削除215行、合計541行。
  - 機械契約の固定文字列はHTMLコメント内に保持し、説明用コードブロック内のラベルは形式保持のため原文へ戻した。
- Decision / Rationale:
  - 一般語は本文・見出しで日本語化し、Playwright、Maestro、GitHub Actions、コード、path、URL、ID、formal spec heading / table schema、validatorが直接参照する文字列は保持した。
  - `tests/contracts/training-curriculum.test.ts`のREADME経路4件、評価基準固定値6件、Native演習固定値4件、および`validate-curriculum.ts`の固定値4件を確認した。
- Validation:
  - 指定一般語の残存は機械契約固定値2行のみだった。
  - `origin/main`との不変条件確認はPASS。リンク、fenced code block、BR / AC ID、見出し階層、表の行列数は一致し、人間向けinline codeの差分5文書は一般語の日本語化または機械契約コメント分離による意図的差分である。
  - HEADとの差分scopeは旧PR対象文書、今回の対象文書、今回のRun / PlanのみでPASS。`git diff --check`もPASS。
- Blocker / Remaining:
  - blockerなし。Markdown、spec / curriculum validator、docs build、標準verify、sanitizer、commit / push、PR本文更新、最新CI確認が残る。
- Subagents:
  - Delegation: なし。
  - Result: なし。
  - Parent decision: 不変条件を崩すコードブロックの表現変更を戻し、本文の日本語化だけを採用する。
- Progress: 57% (4/7)

## 2026-09-14 19:40 (JST)

- Summary:
  - 文書変更に関係する整形、lint、spec / curriculum validator、build、契約テストを検証した。
  - 依存関係のリンク欠落を1回のbounded repairで復旧し、関連する契約テストをPASSさせた。
- Changes:
  - `corepack pnpm install --offline --frozen-lockfile`で`node_modules/yaml`の欠落リンクを復旧した。`package.json`と`pnpm-lock.yaml`に差分はなく、リポジトリ追跡対象の変更はない。
- Decision / Rationale:
  - repair-loop iteration 1: input findingは`training-curriculum.test.ts`の`yaml`解決失敗、分類は`must_fix`。allowed scopeは依存関係のローカルインストール状態のみとし、変更対象文書を広げずにオフライン再構成を実施した。`training-curriculum` 19/19、spec / visual / curriculum関連3ファイル58/58のPASSを確認し、`stop_success`とした。
  - 契約テスト全体は依存復旧後も5分上限で完了しなかったため、同じ条件の再試行は行わない。個別関連テストがPASSしており、残る原因は既存Hook Harnessの長時間実行と判断した。
- Validation:
  - 対象文書のPrettier、Markdown lint（421ファイル・0 issue）、`validate:spec`、`validate:spec-visuals:final`、`validate:curriculum`、`build:spec`、`build:docs`、関連契約テストをPASSした。
  - `corepack pnpm run format:check`は今回未変更の`app/`既存78ファイルでFAIL。`origin/main`およびHEADとの`app/`差分はともに0件だった。
  - `corepack pnpm run verify`はWindows環境でpackage script内の子`pnpm`が解決できず、最初の`pnpm`呼び出し前にFAILした。これは今回の文書差分とは無関係で、標準verify全体のPASSは未確認。
  - `scripts/sanitize-codex-artifacts.ps1`のWrite / CheckはRun 4ファイル、Plan 1ファイルを走査し、`residual_findings: 0`でPASSした。
- Blocker / Remaining:
  - 文書・関連契約にblockerなし。標準verifyの既存環境FAILは残るが、appを一括整形する変更やシステムのpnpm設定変更は今回のscope外として実施しない。commit前scope確認、commit / push、PR本文更新、最新headの必須CI確認が残る。
- Subagents:
  - Delegation: なし。
  - Result: なし。
  - Parent decision: 環境依存の全体テストタイムアウトは`defer`し、変更に直接関係する最小テストと各validatorのPASSを採用する。
- Progress: 71% (5/7)

## 2026-09-14 19:42 (JST)

- Summary:
  - commit前のRun Artifact、Plan、変更scopeを確定した。
  - 文書の機械契約・不変条件・ローカル品質ゲートは、環境由来の標準verify残差を除いてPASSを確認した。
- Changes:
  - 最終対象は`origin/main`比較で34文書。旧PRの不要な表現差分を戻すため、HEADとの差分には旧PR対象文書の復元と今回の34文書、今回のPlan / Run Artifactだけを含める。
  - Run Artifactは`PLAN.md`、`TASKS.md`、`REPORT.md`、machine-managed `run.json`を保存し、旧Run Artifactは履歴保持のため変更・削除しない。
- Decision / Rationale:
  - commit対象は、旧PRからの不要差分復元、文脈単位の日本語表現改善、今回のPlan / Run Artifactに限定する。source、test、config、dependency、workflow、ADR、history、reportsは変更しない。
  - 日本語化対象外は製品名・技術名、コード・command・path・URL・ID、formal spec heading / table schema、機械契約固定文字列、validator直接参照文字列とする。
- Validation:
  - `git diff --check`、不変条件（リンク、fenced code block、BR / AC ID、見出し階層、表の行列数）、scope、README経路4件、評価基準6件、Native演習4件、curriculum validator固定値4件はPASS。
  - Run 4ファイルとPlan 1ファイルのsanitizer Write / Checkは`residual_findings: 0`でPASS。
  - `git status --short`でHEADとの差分79件（旧PR対象文書の復元を含む）と新規Plan / Run Artifactを確認した。ignored `.artifacts`の一時比較ログはcommit対象外。
- Blocker / Remaining:
  - blockerなし。branch safety再確認後のcommit、明示refspec push、PR #151本文更新、push後最新headの`Web CI` / `Mobile App CI`確認が残る。PRはmergeしない。
- Subagents:
  - Delegation: なし。
  - Result: なし。
  - Parent decision: commit前のtracked Run Artifactをこの状態で凍結し、push後CIの記録だけを理由に再commitしない。
- Progress: 86% (6/7)

## 2026-09-14 19:51 (JST)

- Summary:
  - push後の最新headで`Web CI #983`の最初の異常を確認し、既存E2Eが契約するUI formal nameを復元した。
  - `Mobile App CI #850`はsuccessのまま、Web CIは修正commitの再実行待ちである。
- Changes:
  - `docs/curriculum/test-automation/README.md`の見出しを`共通Referenceと運営支援`へ戻した。一般語の日本語化方針よりも、既存の`e2e/web/smoke.spec.ts`が直接検査するUI formal nameの保持を優先した。
- Decision / Rationale:
  - repair-loop iteration 2: input findingは`production-smoke`のUI期待値不一致、分類は`must_fix`。allowed fileはREADME 1件のみとし、テストや仕様の変更、一般語の再翻訳は行わない。
  - CIログで失敗箇所が`published docs smoke`のナビゲーション配列4番目と特定でき、今回のREADME差分が直接原因だったため、原文の正式UI名を戻す判断を採用した。
- Validation:
  - 対象READMEのPrettier、`validate-curriculum`、`build:docs`、`training-curriculum` 19/19、READMEと`e2e/web/smoke.spec.ts`のUI固定値一致はPASSした。
- Blocker / Remaining:
  - blockerなし。修正commitのbranch safety、push、最新headの`Web CI` / `Mobile App CI`再確認、PR本文のCI実結果更新が残る。PRはmergeしない。
- Subagents:
  - Delegation: なし。
  - Result: なし。
  - Parent decision: CI failureを既存問題として保留せず、直接原因の1行だけを修正して関連ゲートを再実行する。
- Progress: 86% (6/7)
