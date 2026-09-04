# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. Issue #94、必須文書、開発設定、現在のAdmin実装・テスト構成を確認する。
- [x] 2. 変更前Web Buildと1024px Browser再現を実行し、原因仮説を確定する。
- [x] 3. 計画を`docs/plans/`とRun Artifactへ保存する。
- [x] 4. Label側の最小CSS修正を実装する。
- [x] 5. 必要最小限のComponent/UI回帰テストを追加または更新する。
- [x] 6. targeted test、静的検証、Build、Browser確認を実行する。
- [x] 7. Issue再読・self-review・diff確認を行う。
- [x] 8. commit、push、OPEN PR作成・URL確認を行う。
- [x] 9. REPORTへRun完了checkpointを追記し、Artifactをsanitize/checkする。
- [x] F1. PR #108修正の開始時点でbranch、作業ツリー、Issue #94、PR #108、head一致を再確認する。
- [x] F2. PR #108の現状差分とAdmin Labelのoverflow原因を再確認する。
- [x] F3. `overflow-wrap: anywhere`を外した状態で1024px/1280pxの実ブラウザ計測を行い、成立可否を判定する。
- [x] F4. Issue #94直結のassertionだけにE2Eを整理し、対象testを実行する。
- [x] F5. verify、関連E2E、a11y、必要なUI確認、最終diffレビューを完了する。
- [x] F6. PR本文を実装事実へ更新し、既存PRのOPEN状態と最新headを確認する。
- [x] F7. 修正commitを作成してpushし、Run Artifactをsanitize/checkして完了報告する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. CSSには初期`248px`に加え、後段で`256px`および1024〜1100pxで`232px`を指定する既存宣言がある。本Issueでは幅変更を行わず、差分レビューで不変を確認する。

## Blocked

- （なし）
