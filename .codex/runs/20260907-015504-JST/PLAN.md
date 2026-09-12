# 教材品質 Repository-wide Audit 計画

## Objective

- 仕様理解からTest Analysis / Design、自動化、Failure診断、保守、CI、Native、AI活用までの学習効果を監査し、根拠付きFindingと具体的な改善Roadmapを提示する。

## Scope

- In: 現行Repository全体の教材・仕様・Product・Test・CI・関連履歴の読み取り、必要最小限の診断、監査文書・標準Run Artifactの作成。
- Out: Product / 教材 / workflowの修正、外部レビュー起動、Git mutation、外部投稿、Deploy、Native Build / Install / 端末操作。監査Findingを実装へ自動移行しない。

## Assumptions

- 対象SHAは `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`。2026-09-07 01:54 JST時点でremote main / HEADと一致、開始時worktree clean。
- 利用者実験がないため学習効果・所要時間の実測は主張しない。構成上の評価、実行で確認した事実、未検証事項を区別する。
- Standard investigation。複数ソースを横断し後続改善へ使う監査のため、durable reportを `docs/reports/` に保存する。

## Questions / Ambiguity

- 必ず質問する不透明点: 現時点なし。目的・評価領域・成果粒度は依頼に明示済み。
- 仮定してよい細部: 現行mainを対象とし、独学初学者から実務導入まで評価する。既存のentry-level bounded completionと依頼の高度な到達像の差も明示する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Product / Specificationの学習素材は豊富だが、実行演習と評価Evidenceへの接続に不足がある。
- H2: 現行Common routeは段階構成を備える一方、プログラミング未経験者の前提やFailure診断の実践量に飛躍が残る。
- H3: Formal test / CIの成熟度と、学習者が自力で設計・実装・判断できる教材の成熟度は異なる。
- H4: Native / AIは価値のある選択肢だが、Host / Toolchain依存や高度なHarnessが導入負荷になる可能性がある。

## Research Plan

- Round 1 Query: README、Required 22文書、Workbook、Training assets、Normative spec、Formal tests / CIの対応を追う。
- Round 2 Query: Finding候補の反証、current source / validator / 実行結果 / 最近の修正との差を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- AGENTS.md §10.1の許可に基づき、3つのread-only調査を分担する。子はArtifactを変更せず、再委譲しない。親が最終評価、検証、成果物作成を担当する。
- 分担: Curriculum / Exercise / Evaluation、Product / Specification、Native / AI。親はPlaywright / Flaky / Debug / CIと全体統合を担当する。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 重点16領域と最終18問を網羅する。
- Findingには優先度、現状、位置・根拠、教材への影響、具体的演習または変更、達成判定、confidence / 未確認点を記す。
- 強み、追加不要の複雑性、統合・削減案を含め、改善を依存関係・成果・受入条件付きRoadmapへ整理する。
- 対象SHA、調査範囲、実行検証、未実施検証を記録する。
- Markdown品質、参照整合性、差分、Run Artifact sanitizer Write / Checkを確認する。

## Risks / Unknowns

- 古いAudit / Runの未完了を現状と誤認しない。PR #103 / #116 / #124等の現行本文・コードを優先する。
- Stock baseline PASSやvalidator PASSを学習者のcompetency PASSと混同しない。
- セキュリティ実装の本番適性と、意図されたlocal simulatorの教材適性を区別する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

## 終了指示による計画変更

- ユーザーの「現時点での調査結果をレポートにまとめて終了」を優先し、追加のRepository調査・Runtime診断を停止する。
- 現在の完了条件は、回収済みEvidenceに基づく中間Report、16領域の監査状況、18問への暫定回答、未検証事項、具体的な改善Roadmapを保存し、文書検証とSanitizerを完了すること。
- 当初の全面監査DoDは未達。TASKSに当初計画を保存し、終了作業4項目を現在の進捗分母とする。Product / Curriculum / Harnessの変更は行わない。

## 2026-09-08・監査再開

- ユーザーの継続指示により当初8項目を再開する。前回の中間終了記録は保持する。
- HEAD `a6eded198cc3307f7c07f3b740daaae8ad9e67e8` と前回対象SHAの差分は監査成果物6ファイルのみ。Product / Curriculumの基準は同じで、既存の静的所見と検証を再利用する。
- Product / Spec代表境界、未読Lesson / Workbook、Native / AIの根拠を補完し、8件の既存Findingを反証する。検証は実行契約の安全な診断を優先し、既存Evidence削除やTraining CopyのGit mutationを含む経路を起動しない。
- 中間レポートを履歴として保持し、同じファイルへ再開後の確認・訂正・統合判断を追記する。候補は提案のままとし、実装修正・外部レビュー・Git mutation・Native端末操作へ進まない。
- Native / iOS実機・学習者pilotは当初の非目標を維持する。すべての業務仕様をRuntime検証済みとすることは完了条件ではなく、確認範囲と限界を明記した16領域・18問の監査報告を完成させる。

- Living Documentation: AGENTS.mdの引継ぎ契約に従い、PROJECT_CONTEXTへ監査結果への短い参照を追記し、`docs/history/2026-09-08_080155_teaching-quality-audit.md` に更新履歴を残す。設計の採用判断はしていないためADRは追加しない。

- 2026-09-08の追加指示「いったん中断してプッシュして」により、追加調査を停止する。Git mutationの非目標は今回の文書のcommit・pushに限って解除し、OPEN PR #129のhead `report/2026-09-07` へ明示refspecで保存する。mainへの反映・merge・外部レビュー起動は行わない。
