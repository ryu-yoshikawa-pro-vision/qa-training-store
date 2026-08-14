# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. PLANを確定する
- [x] 2. repo docs / remote PR / local entry pointsを調査し、STATE Aを判定する
- [x] 3. CLIのRegistry list、batch manifest validation、all-or-nothing applyを実装する
- [x] 4. Native CIのsingle/all captureとbatch artifact uploadを実装する
- [x] 5. contract testsとpackage scriptを追加・修正する
- [x] 6. format/lint/typecheck/spec/native/contract validationを実行する
- [x] 7. Run artifactを更新し、sanitizerを実行する
- [x] 8. HANDOFF_A_PUSH_REQUIREDを出す、またはremote push済みならSTATE Bへ進む

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. push後にremote workflow gate、Actions dispatch/watch、artifact download、apply、materialize、Final validationを実行する。
- D2. 実capture後に代表6画面のPNG/WebPを目視確認し、canonical profile以外の画像はpromotionしない。

## Blocked

- B1. なし（現時点では実装を継続可能）。

Progress: 100% (8/8)
