# Tasks

## Now

- [x] 1. 開始状態、PR #127、branch、既存Run、必須repo docsを確認する
- [x] 2. current evaluator、Hook logger、dataset、Result / comparison、validator、fixture、既存evidenceを調査する
- [x] 3. Candidate C、PR2 / PR6境界、selector / observation / lifecycle / schema方針を確定する
- [x] 4. 修正版Planを再読し、escaped fence、旧threshold、未確定表現、scope上の矛盾を修正する
- [x] 5. Run Artifactを日本語で更新し、Plan-onlyの判断・残作業・Progressを記録する
- [x] 6. Plan / RunのMarkdown、Prettier、diff、scopeを検証する
- [x] 7. Plan / Runをsanitizerとcollectorで確認し、PR本文の状態を再確認する
- [ ] 8. branch safety確認、対象branchへnon-force push、remote / PR / working treeを最終確認する

## Discovered

- D1. 前回Plan生成時にコードフェンスがエスケープされていたため、実Markdown fenceへ修正した
- D2. 非Bash `PostToolUse`は現行bounded parserでno-readを証明できないため、absenceを許可しない契約を明記した

## Blocked

- なし
