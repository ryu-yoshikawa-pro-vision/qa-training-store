# Plan

## Objective
- 添付された「QA Training Store UI/UX Continuous Excellence Goal」を、既存の業務仕様・レイヤー境界・主要User Flowを維持したまま完遂する。

## Scope
- In:
  - Repository／仕様／全Route／Role／状態／既存Design Reference／Test Harnessの調査。
  - Desktop 1440×1000、Tablet 1024×900、Mobile 390×844を中心とするBaseline撮影と重大度別Visual Audit。
  - Wave 1〜5のPresentation層に限定した、効果が高く必要最小限のUI/UX改善。
  - 各WaveのComponent／E2E／Accessibility／Responsive／Build検証と一意StageでのVisual Review。
  - 全必須Regression、最終2回のVisual Review、完了基準評価、Run Artifact。
- Out:
  - Domain、Application Use Case、Database／Dexie責務、Seedの意味、Test Clock／Control、Route URL、認証・権限、価格・割引・送料・在庫・注文状態・Payment・Review集計の変更。
  - 架空Data／機能、外部API／決済、大規模UI Framework、Design System全面移行、Cloudflare Deploy、Git mutation。
  - UI改善と関係しないRefactor、既存Before Screenshotの上書き、削除・rename。

## Assumptions
- 添付指示は細部のUI判断を既存Design System、一貫性、Accessibility、操作性に基づいて自律判断する明示的な許可を含む。
- 現在のbranch先頭には直前のUI Review修正が含まれており、新Baselineはその状態を起点に一意Stageで保存する。
- AdminのMobile Boundary、Seed／Scenario、既存UI Review Harnessを正本として用い、業務仕様をPresentation側で再解釈しない。
- 反復はCritical／High／修正可能なMediumがなくなり、直近2回で新しい重要問題がなくなった時点で終了する。

## Questions / Ambiguity
- 必ず質問する不透明点: 現時点なし。Goalに対象、制約、優先順位、Wave、検証、完了判定が明示されている。
- 仮定してよい細部: 各Wave内の具体的な修正順、既存Componentへの局所統合、追加Screenshotの範囲。
- 未回答の重要質問: repo mappingとBaseline auditで仕様矛盾が判明した場合だけ、実装せず残存課題として記録する。

## Hypotheses
- H1: 直前のDesign System統合とUI Review修正により基盤の多くは整っており、全Route auditから残る共通問題を絞れば局所差分で高い改善効果を得られる。
- H2: 既存ScenarioとUI Review Harnessを拡張・再利用すれば、Role／Route／Viewportを揃えた比較を業務層へ触れずに実施できる。
- H3: WaveごとのVisual Reviewと対象テストを先に固定すれば、主観的な装飾変更を避け、完了基準を証拠で判定できる。

## Research Plan
- Round 1: Repository、docs、Route／Presentation／Token／CSS、Seed／Scenario／auth、Design Reference、Playwright／Test、直近差分をread-onlyでmappingする。
- Round 2: 現状Baselineを全対象Route・主要Role・3 Viewportで生成し、画像を実見してCritical／High／Mediumを抽出する。
- Round 3: 各Wave実装後の画像とテスト結果から仮説を再評価し、追加効果の高い問題だけを次Iterationへ送る。
- Exit Criteria:
  - 全Route、4 Role、主要状態、3 Viewportの確認表とVisual証跡がある。
  - Critical／High／修正可能なMediumが0件で、直近2回のVisual Reviewに新しい重要問題がない。
  - Goal指定の必須Regressionを実行し、未実行・失敗を成功扱いしていない。

## Approach
1. 必読資料と全repo surfaceをmappingし、実装前計画を`docs/plans/`へ保存する。
2. 一意StageのBaselineを生成・実見し、重大度と影響範囲で改善Backlogを確定する。
3. Wave 1〜5を順に、問題選択→最小実装→対象Test→一意Stage撮影→比較→次判断で進める。
4. 全Regressionと追加Browser Testを実行し、最終Visual Reviewを2回行う。
5. 差分・非変更領域・残存課題・完了基準を監査し、指定形式で最終報告する。

## Definition of Done
- 添付Goalの「27. 完了基準」「28. 終了判断」を証拠付きで満たす。
- 既存仕様・主要User Flow・禁止領域に変更がない。
- 全変更がPresentation／UI Test／Visual Harness／必要なRun Artifactに限定される。
- 実行結果、Visual Stage、変更ファイル、残存課題をRun Reportと最終回答へ正確に記録する。

## Risks / Unknowns
- 全Route×Role×Viewportの組合せは大きいため、同一Presentationを共有する状態は既存Scenarioで代表化し、Route／Role coverage表で漏れを防ぐ。
- 既存outputに多数のScreenshotがある可能性があるため、Stageは毎回一意化し、既存画像を削除・上書きしない。
- Browser binaryやOS依存で追加Browser Testが実行不能な場合は、導入済み範囲を確認し未実行として明示する。
- `scripts/verify`などCRLFの既存問題は、個別の実検証コマンドで代替し、結果を分離して記録する。

## Thinking Log
- 2026-07-28 11:58 JST: Goal全1,516行、AGENTS、Project Context、ADR、PLANS、feature-planとplanning reference、直近Runを確認した。
- 2026-07-28 11:59 JST: Workflow Levelは広範な複数Wave実装だが、permission／migration／外部連携を変更しないためStandardとした。
- 2026-07-28 12:00 JST: `new-run.sh`はCRLFで直接実行不能、変換パイプ実行は安全ポリシーに拒否されたため、テンプレート同等物を`apply_patch`で新規作成した。
- 2026-07-28 12:07 JST: 3つのproject-scoped read-only agentと1つのExplorerで、全Route、Presentation境界、Design／Visual Harness、Test／Scenario、docs／直近差分を並列調査した。
- 2026-07-28 12:08 JST: 現行基盤は局所polish段階と判断。全37Route coverage、320px、Keyboard、edge stateの証跡不足を先に埋め、Auditで有効な問題だけをWave実装する。
- 2026-07-28 12:08 JST: 実装前計画を`docs/plans/2026-07-28_120758_ui-ux-continuous-excellence.md`へ保存した。
- 2026-07-28 13:24 JST: H1/H2を支持。全37Routeと8 edge stateの正式Beforeを確認し、Design基盤全体ではなく、High 2件、Responsive 2系統、共通Navigation／状態／文言／操作Controlの局所差分へ絞り込んだ。
- 2026-07-28 13:24 JST: Mobile fixed navigationはfullPage画像だけでは判定不能だったため、6主要FlowのPage Endをviewport撮影した。Footerと最終ContentはNavigation上に到達でき、実Content遮蔽は再現しなかった。
