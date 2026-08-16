# PR #23 rebase後統合不備修復計画

## 0. 依頼概要

- 依頼内容: PR #23 の rebase 後に `docs/PROJECT_CONTEXT.md` へ再導入された競合マーカーを、main 側と PR #23 側の有効な履歴を保持してsemantic mergeする。
- 背景: `20260816-065624-JST` Runではworking tree時点のmarker scanとMarkdown lintがPASSしていたが、rebase継続後の最終HEADで後続commitによりmarkerが再導入された。
- 期待成果: 現最終HEADを基準に文書とRun Artifactを整合させ、指定品質ゲートとOfficial contractを再確認したMerge Ready判定を残す。

## 1. ゴール / 完了条件

- ゴール: mainのPR #24/#25履歴とPR #23 Official Artifact Chain履歴を重複なく保持し、Git conflict markerを除去する。
- 完了条件（DoD）:
  - 現HEAD `035440c1a12b9de88f36384ca9cb98f2a3459283` とmain `600b5ca2a04a060d5be802fcd5a876538bf65fc4` を基準に修正・検証する。
  - `docs/PROJECT_CONTEXT.md` に `<<<<<<<` / `=======` / `>>>>>>>` のGit conflict markerが残らない。
  - Curriculum、PR #24の4履歴、PR #25、PR #24 Android batch、PR #23 Official履歴を各1回保持する。
  - Official ADRは0015、main側ADR-0013/0014は維持し、旧Official ADR pathをcurrent referenceとして残さない。
  - Official Trust Boundary実装・Product code・CI・指定テストは変更しない。
  - 指定validationの結果、環境依存の残差、Official Host capability不足によるBLOCKED/NOT EXECUTEDを事実どおり記録する。
  - 新Run Artifactをsanitizer Write/Checkに通し、過去Runのappend-only記録を変更しない。

## 2. 現状理解と前提

- Current understanding: remote PR branchは現HEAD `035440c1…` と一致し、mainは `600b5ca2…`。sourceの直接blockerは `PROJECT_CONTEXT.md` の3本のmarkerである。
- Assumptions: main側を正本として既存履歴を保持し、PR #23側のOfficial sectionを末尾に統合する。rebase、commit、push、PR操作は行わず、作業ツリーとRun Artifactを検証する。
- Non-goals: Official Black-box Scored E2Eの設計変更、Trust Boundaryの再設計、Visual/Curriculum/Product/CI変更、過去Runの改変。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象ファイルとsemantic mergeの保持条件が明確である。
- 仮定してよい細部: PR #23 sectionはmain側の関連履歴の後ろに一度だけ置き、見出し前後の空行をMarkdown契約に合わせる。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: `docs/PROJECT_CONTEXT.md`、新規 `.codex/runs/20260816-103345-JST/`、規約上必要な本計画書。
- Files to inspect: Official ADR、`scripts/agentic-qa/`のidentity/isolation/verifier/manifest関連、Official contract tests、package scripts、直近Run。

## 5. 変更方針

- Change strategy:
  - [ ] 1. 現HEAD/main、marker、ADR path、既存Runを再確認し、allowed scopeを固定する。
  - [ ] 2. PROJECT_CONTEXTのmarkerを除去し、両系統の有効なsectionと見出し境界を保持する。
  - [ ] 3. Trust Boundary、fully-rebound negative tests、ADR参照を現HEADで確認する。
  - [ ] 4. markdown、format、typecheck、lint、spec、security、Official focused tests、contractsを実行する。
  - [ ] 5. Run Artifactを最終HEADとvalidation結果へ更新し、sanitizer後にMerge Ready判定を確定する。

## 6. 検証方法

- Validation plan: marker scan、ADR/path scan、`pnpm run lint:markdown`、`format:check`、`typecheck`、`lint`、`validate:spec`、`security:check`、Official 2-file focused Vitest、`test:contracts`、`test:agentic-qa:preparation`、`verify`、`test:e2e:chromium`を実行する。必要に応じてbaseline/環境差を調査する。
- 成功判定: 直接blockerが消え、必須ゲートはPASSまたは根拠付きの環境状態として明示され、Official Host Receiptなしの実行・採点をPASSへ昇格しない。

## 7. リスクと未解決論点

- Risks: Windowsの既存baseline差、全体format baseline、Official Host capability不足が検証結果へ影響する可能性がある。
- Open questions: remote branchへpushされていない作業ツリー修正は、最終handoffで明示する。

## 8. 成果物

- 変更ファイル: `docs/PROJECT_CONTEXT.md`、本計画書、新規Run Artifact。
- 付随ドキュメント: 新RunのPLAN/TASKS/REPORT/run.json/evaluation.json。

## 9. 備考

- 旧Run `20260816-065624-JST` は当時のworking treeでPASSしていた事実を含むappend-only証跡として保持する。
