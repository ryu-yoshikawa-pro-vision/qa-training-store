# Plan

## Objective

- PR #23 rebase後の最終HEADを基準に、`docs/PROJECT_CONTEXT.md`の競合マーカーをsemantic mergeし、Run Artifactと品質ゲートを最終HEADへ整合させる。

## Scope

- In: `docs/PROJECT_CONTEXT.md`、新規Run `20260816-103345-JST`、規約上必要な計画書、現HEADのADR/Trust Boundary/Official test確認。
- Out: Official Scored E2Eの設計変更、Product/Native/Visual/Curriculum/CI変更、過去Runの改変、rebase/commit/push/PR操作。

## Assumptions

- current HEADは`035440c1a12b9de88f36384ca9cb98f2a3459283`、mainは`600b5ca2a04a060d5be802fcd5a876538bf65fc4`で、remote branchも同じ先端を指す。
- main側のCurriculum、PR #24/#25履歴と、PR #23側のOfficial sectionを同じ文書へ一度ずつ保持する。
- Official Host capabilityがないため、Official execution/scoreは引き続きBLOCKED / NOT EXECUTEDとする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、保持条件、検証項目が明示されている。
- 仮定してよい細部: PR #23 Official sectionはmain側の最新履歴の後ろへ置き、見出し前後にMarkdown lintが要求する空行を置く。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現在の不備は通常ファイル内の3本のmarkerと見出し境界だけであり、両系統のsectionを保持してmarkerを除去すれば修復できる。
- H2: 現HEADにOfficial ADR-0015、identity binding、exact file set/freeze、trusted evidence、Host fail-close、fully-rebound 3ケースが既に含まれており、source変更なしで再確認できる。
- H3: 必須ゲートの失敗が出た場合はbaseline・差分・環境を比較し、今回の文書修正に起因するものだけをboundedに扱う。

## Research Plan

- Round 1 Query: HEAD/main/remote SHA、current marker、main/PR側文書、直近Run、ADR pathを確認する。
- Round 2 Query: Official implementation、contract tests、identity binding、fully-rebound tests、package scriptsを現HEADで確認する。
- Round 3 Query: semantic merge後のmarker/Markdown/ADR/差分を確認し、指定ゲートを実行する。
- Exit Criteria:
  - mainとPR #23の有効sectionが重複なく残り、Git conflict markerが0件である。
  - Trust Boundaryとfully-rebound testsが変更されず、期待する契約を満たす。
  - 必須validation、残差、Official BLOCKED状態、Run Artifact sanitationを記録する。

## Approach

- current HEADとmainを読み取り、`PROJECT_CONTEXT.md`のmarker行だけを意味統合する。
- `allowed_files`はsourceでは`docs/PROJECT_CONTEXT.md`だけとし、Run Artifact/planは監査成果物として扱う。
- repair loopは1 iterationで修正し、validation結果を同Runへ追記する。反復失敗時は同じ条件のblind retryをしない。

## Definition of Done

- `docs/PROJECT_CONTEXT.md`のmarkerがなく、指定されたmain/PR #23履歴が全て保持される。
- Official ADRは0015、main ADR-0013/0014は維持され、旧Official ADR pathはcurrent referenceとして残らない。
- 指定品質ゲートとOfficial focused testsの結果が最終HEADに対して記録される。
- 新Runの5標準Artifactがsanitizer Write/Checkを通過し、過去Runは未改変である。

## Risks / Unknowns

- Markdown lintはmarker除去後の見出し境界を検出する可能性があるため、空行を明示する。
- Windows環境の既存baseline failureやOfficial Host Receipt不足は、修正とは分離して事実どおり報告する。

## Thinking Log

- 2026-08-16: remote PR branchとlocal HEADが一致し、`PROJECT_CONTEXT.md`だけにmarkerがあることを確認した。
- 2026-08-16: main側のPR #24/#25履歴とPR #23 Official sectionを片側採用せず、両方を保持する方針を確定した。
