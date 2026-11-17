# Run Plan: AI協働QAカリキュラムv08品質ゲート

## Goal
指定されたv08の17ファイルを検証し、ローカルで修正可能な品質問題を必要最小限で修正する。ユーザーの2026-10-29の追加指示に従い、Run記録を確定した後に対象差分をcommitしてPR branchへ通常pushする。詳細な保存計画は[Repository Plan](../../../docs/plans/2026-10-29_084631_ai-assisted-qa-v08-quality-gates.md)を正本とする。

## Current understanding
- Branch: docs/plan-ai-agent-qa-curriculum-redesign
- Start HEAD: dcfbe70c787092302cafd0c752ccbb02614c8767
- Start scope: 11章、SVG 3件、無効化されたPhase 3 workflow見本、Web builder、progression planの17ファイル。
- Initial git diff --check exit 1: M09のログ例とM10のMarkdown hard breakに末尾空白。

## Scope and constraints
- Allowed: 指定ファイルと必要な関連Contractの最小修正、必須ローカル検証、ローカルWeb表示確認、現在のPR branchへのcommitと通常push。
- Prohibited: PR本文更新、merge、force push、GitHub Actions起動。
- Preserve: 11章、51学習目標、53 quiz review path、既存26図解、Phase別正式評価、意図的な教材failure。

## Validation
必須: pnpm.cmd validate:ai-assisted-qa、pnpm.cmd run build:docs、pnpm.cmd run lint:markdown、git diff --check。
追加: builder typecheck / ESLint / Prettier、curriculum/distribution/assessment/tutor/GitHub Run evidence Contract、必要ならローカルChromium、最終status/stat。
すべて実際の終了コードとログでPASS/FAIL/BLOCKEDを記録する。

## Completion
必須ゲートと関連するContract/型/lint/formatが終了コード0、対象契約の整合確認済み、差分範囲を報告する。ユーザー追加指示のcommit/pushでは現在のPR branchとorigin上のheadを確認する。実画面とGitHub Actionsは未実行なら未確認として明示する。
