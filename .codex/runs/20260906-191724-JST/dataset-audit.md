# Trigger Eval dataset execution audit

監査日: 2026-09-07 JST  
対象: 12 YAML / 24 case  
目的: routing labelを変えず、query単体で依頼を理解でき、routing以外の長時間実作業を要求せず、single-intentで自然な依頼になっているかを確認する。

## 判定基準

- A / Self-contained: 対象、入力、前提がqueryまたはRepositoryの一意なpathから解決できる。
- B / Execution-bounded: routing確認に必要な最小の確認範囲が明示され、full workflow・physical-device E2E・repository全体探索を要求しない。
- C / Single-intent: 一つのSkill boundaryに属する主目的で、別の修正・調査・報告を混在させない。
- D / Natural: Skill名やexpected labelを露出せず、実際の利用者依頼として読める。

## 全件レビュー

| case | A/B/C/D | 変更 | 欠陥と判断 | 修正の要点 |
|---|---|---|---|---|
| android-native-local-validation-train-001 | pass/pass/pass/pass | 変更 | 旧queryはbuild/installと物理端末操作を一度に要求し、Native E2Eが長い | Windows、SDK、接続端末、Repositoryを明示し、build/install前提と最初の不足へbounded化 |
| android-native-local-validation-train-002 | pass/pass/pass/pass | 変更 | 旧queryは認証済み顧客と購入対象が未特定で、購入フロー全体を要求 | Guideの顧客シナリオ、商品詳細から注文確定まで1回、入力エラー1件に限定 |
| android-native-local-validation-validation-001 | pass/pass/pass/pass | 変更 | 旧queryは失敗ログ、tooling、APK、Maestroをまとめて要求 | SDK・端末・固定toolchainのDoctor/preflightと最初の不足だけに限定 |
| android-native-local-validation-validation-002 | pass/pass/pass/pass | 変更 | 旧queryは検索・filter・empty stateの対象と入力が曖昧 | 検索語を「存在しない商品」に固定し、1回の検索と解除後表示に限定 |
| code-review-train-001 | pass/pass/pass/pass | 変更 | 「このPull Request」の対象とレビュー差分が未提供 | `scripts/verify`、検証順序、終了条件、入力検証を対象化 |
| code-review-train-002 | pass/pass/pass/pass | 変更 | TypeScript errorの内容・対象・許可scopeが未提供 | `pnpm run lint:markdown`、`docs/PROJECT_CONTEXT.md`のリンク切れ、同gateを明示 |
| code-review-validation-001 | pass/pass/pass/pass | 変更 | 実装差分の対象が未提供 | `scripts/codex-task.ps1`を単一レビュー対象として明示 |
| code-review-validation-002 | pass/pass/pass/pass | 変更 | 品質gate、失敗箇所、再実行単位が未提供 | `pnpm run test:contracts`と具体的なcontract testを明示し同テストへ限定 |
| exploratory-qa-train-001 | pass/pass/pass/pass | 変更 | 商品検索から購入完了までが広く、仕様書と境界入力が未特定 | Guideの顧客シナリオ、一覧からカートまで1回、境界入力1件に限定 |
| exploratory-qa-train-002 | pass/pass/pass/pass | 変更 | APK build、physical install、Maestro smokeを一続きに要求 | Doctor結果と端末認識だけに限定し、Maestroを実行しない条件を明記 |
| exploratory-qa-validation-001 | pass/pass/pass/pass | 変更 | 状態遷移の正本と各経路の範囲が未提供 | `docs/spec/features/orders.md`、通常・拒否・再試行各1経路を明示 |
| exploratory-qa-validation-002 | pass/pass/pass/pass | 変更 | 指定Maestro suite、build、installの対象が未提供で長時間 | 端末DoctorとRelease APK install前提のみ、install/suiteは実行しない |
| feature-plan-train-001 | pass/pass/pass/pass | 変更 | 複数ファイルの機能と計画成果物が未特定 | runnerとrepository testを明示し、Hook read shape対応の計画へ限定 |
| feature-plan-train-002 | pass/pass/pass/pass | 変更 | 承認済み手順、指定file、受入条件が未提供 | `docs/spec/features/orders.md`の見出し変更とMarkdown検査だけを明示 |
| feature-plan-validation-001 | pass/pass/pass/pass | 変更 | 曖昧な改修対象と計画保存先が未提供 | cart / checkout仕様の境界と計画の必須項目を明示 |
| feature-plan-validation-002 | pass/pass/pass/pass | 変更 | 小さな修正の対象・受入条件・testが未提供 | 同じ具体的見出しとMarkdown検査だけを指定 |
| harness-improvement-train-001 | pass/pass/pass/pass | 変更 | 過去Run、失敗分類、改善対象が未提供 | quote差とslash差の2つの観測事実をquery内に含め、候補1件へ限定 |
| harness-improvement-train-002 | pass/pass/pass/pass | 変更 | blocking findingとscopeが未提供 | dataset query重複検知failureと最小修正・検証を明示 |
| harness-improvement-validation-001 | pass/pass/pass/pass | 変更 | Run群、反復条件、提案項目が未提供 | 8 boundary sidesのmissingが2回続いた事実と候補1件を明示 |
| harness-improvement-validation-002 | pass/pass/pass/pass | 変更 | 失敗testとfocused validationの対象が未提供 | `tests/repository-contract/skill-trigger-evals.test.ts`とfocused validationを明示 |
| repair-loop-train-001 | pass/pass/pass/pass | 変更 | review findingと修正scopeが未提供 | `scripts/verify`のblocking findingの内容、scope、関連testを明示 |
| repair-loop-train-002 | pass/pass/pass/pass | 変更 | timeout記録とharness対象が未提供 | 327秒terminal未到達とrunner pathを明示し改善候補1件へ限定 |
| repair-loop-validation-001 | pass/pass/pass/pass | 変更 | CI failureと上流/派生の境界が未提供 | `scripts/verify`のSummary判定を対象に同validationまで限定 |
| repair-loop-validation-002 | pass/pass/pass/pass | 変更 | 評価結果、準備不備、判定不備の対象が未提供 | `missing sides`を返したTrigger Evalと候補の必須項目を明示 |

## 監査結果

- 24/24 caseを再reviewした。
- 24/24 caseを変更した。変更理由は case ごとに上表へ記録し、単一Templateへの機械的変換は行っていない。
- unchanged: 0 case。
- `expected_skill`、`boundary`、case ID、12 file構成は変更していない。
- 旧fingerprint: `283cb4d73f841095f576d82708bc5adc1ee763a6df21756c24078a07c50226f3`
- 新fingerprint: `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`
- 旧canonical artifactは旧fingerprintのinvalid evidenceとして保持し、新datasetとのcomparison sourceには使用しない。
- 判定: query変更はrouting resultのgamingではなく、旧queryの不足文脈参照と長時間workflow混入を除去して、Trigger Evalのexecution contractを満たすためのdataset defect修正である。
