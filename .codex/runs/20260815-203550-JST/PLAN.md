# Plan

## Objective

- PRのコンフリクトをローカルで安全に解消する手順を、現在のブランチ状態に合わせて案内する。

## Scope

- In: 現在のブランチ、基準ブランチ、作業ツリー状態の確認、merge／rebase手順の整理
- Out: Git操作、ファイル編集、コミット、push、PR更新

## Assumptions

- PRの基準ブランチは `main` とする。
- 履歴を書き換えないmerge方式を推奨する。

## Definition of Done

- 現在のローカル状態を根拠付きで示す。
- コンフリクト解消、検証、push、abortの手順を提示する。
- Run Artifactをサニタイズして保存する。

## Thinking Log

- 現在のブランチは `feat/implement-test-automation-curriculum-remediation`、作業ツリーはclean、remoteは `origin` と確認した。
- PRの通常の競合解消には、まず `origin/main` をfeature branchへmergeする方式が安全と判断した。
