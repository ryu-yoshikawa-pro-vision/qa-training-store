# PR #151 日本語表現再修正計画

## 0. 依頼概要

- 依頼内容: PR #151の同一branch・同一PRを使い、カリキュラム・仕様文書を文書単位で読み直し、不自然な英語混じりの一般語を自然な日本語へ書き直す。
- 背景: 前回差分は助詞・語順などの軽微な変更が中心で、`Rubric`、`Native specialization`、`Common route`、`Minimum Evidence`など受講者が読む一般語が残っている。
- 期待成果: 技術用語・正式名称・機械契約を壊さず、教材・技術文書として意味を保った自然な日本語にする。前回差分のうち読みやすさへの寄与が乏しい変更は戻す。

## 1. ゴール / 完了条件

- ゴール: `docs/curriculum/test-automation/`を優先し、PR #151の対象文書全体で一般語の英語混じり表現を文脈に応じた日本語へ改める。
- 完了条件（DoD）:
  - `Rubric`は本文・リンク表示を「評価基準」または文脈に応じた「習熟度評価基準」とし、テストが直接要求する固定文字列だけは機械契約として保持する。
  - `Native specialization`は、MaestroによるモバイルアプリUIテスト自動化を学ぶ選択課程であることが分かる日本語へ改める。
  - `Common Core`、`Learner Required`、`learner-facing`、`Common route`、`Minimum Evidence`、`Completion contract`、`bounded Level 2`、`Native evidence`、`Common completion`、`rationale`、`review record`、`Failure Evidence`、`Environment block`などの一般語を人間向け文脈で日本語化する。
  - 要件、条件、例外、必須・推奨・任意の強さ、順序、数値、単位、範囲、ID、相互参照、コード、path、URL、UI正式名称、固定値を変更しない。
  - 前回の助詞だけ・同義語だけ・語順だけの変更など、元の文章が自然で差分価値のない変更を原則として戻す。
  - 変更前後の見出し、リンク先、コードブロック、インラインコード、表、BR / AC、形式上の固定値を比較し、対象外ファイルに差分を作らない。
  - 同一branch `fix/2026-09-14-2`へcommit・明示refspec pushし、既存PR #151を更新する。新規PR作成・Mergeは行わない。
  - 最新headの`Web CI`と`Mobile App CI`がsuccessとなり、実結果をPR本文へ記録する。

## 2. 現状理解と前提

- Current understanding:
  - 対象は前回PRの83文書（カリキュラム25、中核仕様37、`docs/spec`のtemplate除外21）である。
  - 現在のPR headは`672e3499ee89e61a3cc70bb7bf498ce97a68e429`、PR #151はopen、baseは`main`である。
  - 前回は77文書を変更したが、変更の多くは助詞・語順・列挙導入であり、指定された英語混じり表現が本文に残っている。
  - `tests/contracts/training-curriculum.test.ts`は`C08: Native specialization / Common non-required`と`C08 Minimum Evidence: learner-authored Native exercise diff + successful Maestro execution artifact`を直接検査する。これらは本文内の機械契約として保持し、周辺の説明を日本語化する。
  - `scripts/validate-curriculum.ts`はrubricのファイル、C01〜C12、Level 0〜3、Instructor Referenceの固定項目を検査する。仕様validatorはFeature heading、BR / AC grammar、IDを検査する。
- Assumptions:
  - `Common`、`Extension`、`Reference`などは、コード・validator・ファイル形式・UI正式名称として直接参照されない人間向け分類なら、日本語の説明へ置き換える。
  - `API`、`SDK`、`CI`、`PR`、`workflow`、`runtime`、`lint`、`typecheck`、framework名、package名などは通常の技術用語として必要に応じて残す。
  - ファイル名、ディレクトリ名、関数名、クラス名、変数名、型名、コマンド、path、URL、コード、設定値、Test Case ID、BR / AC ID、validatorが直接参照する固定文字列は変更しない。
  - 安全に意味を保てない箇所は英語を機械的に置換せず、文脈を保つ日本語への文単位の書き直しを優先する。
- Non-goals:
  - Product Code、Test、Training実装、設定、依存関係、workflow、CSV列・ID、仕様要件、学習範囲、既存のformal contractの変更。
  - ADR、履歴、一般のreference / guide、future / experiments、前回Runの書き換え。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象、保持条件、同一PR、commit・push・CIの完了条件が明記されている。
- 仮定してよい細部: 固定値の直接参照をコード・validator・テスト・ファイル形式で確認し、人間向け説明だけを日本語化する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 受講者向けカリキュラム本文、評価基準、運営向け補助説明、番号付き中核仕様、`docs/spec`の人間向け説明。
  - PR #151本文、Run Artifact、今回のRepository plan。
- Files to inspect:
  - `docs/curriculum/test-automation/**/*.md`
  - `docs/00_overview/**/*.md`〜`docs/12_quality/**/*.md`
  - `docs/spec/**/*.md`（`_templates`を除く）
  - `tests/contracts/training-curriculum.test.ts`
  - `scripts/validate-curriculum.ts`
  - `scripts/spec/validate-all.ts`
  - `scripts/docs/build-docs.ts`
  - `package.json`、`.github/workflows/`

## 5. 変更方針

- Change strategy:
  1. PR #151の対象文書と現在差分を読み、一般語・技術用語・正式名称・固定値を分類する。
  2. 前回の対象文書差分を`origin/main`と比較し、意味のない軽微変更を戻す。その後、必要な箇所だけ文脈単位で日本語を書き直す。
  3. `docs/curriculum/test-automation/`を文書単位で先に修正し、`Rubric`と`Native specialization`を受講者が内容を理解できる表現へ統一する。
  4. 中核仕様と`docs/spec`では、一般語だけを日本語化し、Featureのformal heading、BR / AC、コード、リンク、固定値を維持する。
  5. diffを文書単位で再読し、意味・強さ・順序・不変条件・対象範囲を確認する。
  6. Markdown、spec、curriculum、docs build、diff check、Run sanitizerを実行する。
  7. branch safetyを確認してcommit・pushし、既存PR #151の本文を更新して最新headの必須CIを確認する。
- 実行タスク:
  - [ ] 1. 既存PR、branch、Run、ADR、対象83文書、固定値参照を調査し、計画を保存する
  - [ ] 2. 前回の意味のない文書差分を戻し、対象文書を文脈単位で再修正する
  - [ ] 3. 日本語化漏れと機械契約・正式名称の保持を横断確認する
  - [ ] 4. 文書diff、不変条件、scopeをレビューする
  - [ ] 5. Markdown、spec、curriculum、docs build、標準verifyを検証する
  - [ ] 6. Run Artifactを更新・サニタイズし、commit対象を確定する
  - [ ] 7. 同一branchへcommit・pushし、PR #151本文更新と最新CI確認を完了する

## 6. 検証方法

- Validation plan:
  - `corepack pnpm run format:check`または対象文書へのPrettier、`corepack pnpm run lint:markdown`。
  - `corepack pnpm run validate:curriculum`、`corepack pnpm run validate:spec`、必要な`--visuals-final`検証。
  - `corepack pnpm run build:docs`または`tsx scripts/docs/build-docs.ts`。
  - `git diff --check`、対象scope、見出し、リンク先、コードブロック、インラインコード、表、BR / AC ID、固定文字列のbefore/after比較。
  - 指定表現の全文検索を行い、残存箇所は固定値・正式名称・コード・validator/test契約として説明可能か確認する。
  - `scripts/sanitize-codex-artifacts.ps1 -Path '.codex/runs/20260914-180617-JST' -Write -Check`。
  - push後のPR #151最新headについて`Web CI`と`Mobile App CI`を確認し、PR本文のCI結果をreadbackする。
- 成功判定:
  - 対象文書の一般語が自然な日本語になり、受講者が課程・成果物・修了条件・評価観点を英語語彙の解読なしに理解できる。
  - 機械契約と仕様不変条件が維持され、targeted validator・docs build・lint・diff checkがPASSする。
  - 標準verifyが既存問題で失敗する場合は、最初の異常、今回の差分との因果関係、対象文書の代替検証を記録する。
  - commit、remote head、PR headが一致し、PRはopenかつ未merge、必須CIは最新headでsuccessである。

## 7. リスクと未解決論点

- Risks:
  - 日本語化で`Required`などの必須強度を弱めたり、`Common`とNative選択課程の境界を変えたりしない。
  - 固定文字列を残す場合と人間向け表現を変える場合を混同しない。
  - 一括置換でコード、リンク表示、見出し、UI正式名称、表の列意味を壊さない。
  - 前回差分の復元範囲が広いため、必要な自然な改善まで消さないよう、baseとの差分を再読してから再修正する。
- Open questions:
  - なし。

## 8. 成果物

- 変更ファイル: 上記対象文書のうち、意味のある日本語改善が必要なもの、今回のplan、Run Artifact。
- 付随ドキュメント: 同一PR #151本文の再修正内容・検証結果・CI結果。

## 9. 備考

- 前回PRのcommit・Run Artifactは履歴として保持し、今回の変更は新しいRunに記録する。
- Mergeはユーザーの指示により実施しない。
