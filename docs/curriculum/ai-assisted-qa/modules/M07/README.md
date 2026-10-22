# M07：失敗分析と保守

## このモジュールで学ぶこと

M06で作成したspecの失敗を、実行証拠から切り分けます。原因はテストコードだけとは限りません。製品挙動、Seedや環境、タイミング・不安定性を分け、確認済み事実と仮説を区別します。演習のために製品本体へ故意の不具合を追加しません。

## 失敗を追う手順

1. 同じ対象spec・Reset・環境で再現するか記録します。
2. Runの最初の失敗箇所、Locator/Action/Assertion、標準出力、Trace、必要ならスクリーンショットを見ます。
3. Caseと正式仕様、Seedが保証する状態を照合します。
4. 原因仮説を分け、仮説を識別できる追加確認を決めます。
5. 変更が必要なら最小差分にし、修正前と別のRunで再確認します。

Traceは一回の実行で観測した画面・操作の証拠で、全データや仕様を保証しません。スクリーンショットも保存状態や別画面の遷移を必ず示すわけではありません。コマンド、config、spec、Run ID、ログ/Traceが同じ実行を指すかを確かめます。

## 3種類の診断素材

- **テストコード側**：Locatorは合っているがAssertionが案内文だけを確認している。Caseの業務結果を観測していない点を指摘し、テスト側の修正案を作ります。
- **Seed/環境側**：必要なscenario Resetが呼ばれず、カートに前のデータが残っている。まずResetの実行結果と対象scenarioを確かめ、製品不具合と決めつけません。
- **タイミング/Flaky側**：UI更新を待つ固定時間が環境によって足りない。web-first assertionや対象イベントを確認し、再現性とログを調べます。Timeoutを延ばすだけでは原因修正としません。

`training/ai-assisted-qa-course/exercises/M07/failure-cases.md`の公開診断素材は課題用の仮説です。提示ログから分かることと、環境で追加確認が必要なことを分けます。修正可能な素材は失敗Runと修正後Runを別々に記録します。

## 保守性の判断

Helper、Fixture、Page Object Modelは再利用や変更集中に役立つ場合があります。一件だけの操作に抽象化を足すと読むファイルと間接参照が増えることもあります。実際の重複、変更頻度、読みやすさを見て必要性を説明します。

## Phase 2総合演習・評価

Phase 2ルーブリックは [`assessment/phase-2-rubric.md`](../../../../../training/ai-assisted-qa-course/assessment/phase-2-rubric.md) です。M06のspecを再利用し、Case→spec→Assertion→Run→根拠を対応させ、少なくとも3種類の原因構造を診断します。未提示断片に対する本人確認を含めます。修正前後のRunがそろわない課題は修正済みにしません。

## 確認と復習

[M07の確認クイズ](../../quizzes/M07.json)で原因分類を確認します。誤答した場合、failure-casesを再読し、事実・仮説・追加確認を別の欄に書き分けます。

## 参考

- [M07の学習項目](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 2評価基準](../../../../../training/ai-assisted-qa-course/assessment/phase-2-rubric.md)
- [開始・終了状態契約](../../../../../training/ai-assisted-qa-course/states/M07/start.json)
