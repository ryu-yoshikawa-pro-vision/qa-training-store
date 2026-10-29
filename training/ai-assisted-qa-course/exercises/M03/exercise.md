# M03 実技：検証責務から条件・Caseへ

## 入力

M02提出物またはこのモジュールの別ID公開サンプル、Cart仕様、商品検索仕様、固定Skill revision `7cc6cba7772de549841a39d71694cbafbc783324`を使います。

## 手順

1. 固定Skillのhelper/runtimeからcurrent Authority / Product Risk Entityを生成し、出力された参照とfingerprintを記録します。Scopeは別のEntityではないため、M02で意味・出典・revisionを定義した`SCOPE-...`参照と各行の整合を確認します。`TARGET-CART-001`をScopeとして流用しません。
2. 固定Skillの入力契約で `condition_structure(direct)` を実行し、未知キー、誤mode、未解決参照の失敗を区別します。
3. 一つの条件を選び、`condition_structure(direct)`から選択技法runtimeを実行します。公開開始サンプルでは在庫20・購入上限5から上限5と6の境界を導きます。実行時の数量はReset後に観測し、未確認値を前提にしません。
4. 統合実行とは別に、次の4技法をそれぞれ例題と異なる条件へ適用します。各行に条件、選んだ値/ルール/遷移、期待結果の根拠、適用限界、対応Case IDを記録します。

   | 技法 | 別条件の練習テーマ | 必ず示す判断 |
   | --- | --- | --- |
   | 同値分割 | `BR-CART-002`のゲストカート統合対象と除外候補 | 同じ結果になる入力群をまとめ、除外理由が異なる候補を同じ群へ混ぜない |
   | 境界値 | `BR-CART-001`の`variant-basic-shirt-02`（在庫3、購入上限5）の有効上限 | 事前数量2から上限3と超過4を比較し、4の拒否と変更前数量2の維持を確認する |
   | デシジョンテーブル | `BR-STOREFRONT-002`の商品検索。異なるブランドX/Yと在庫あり。練習の前提は商品が一つのブランドに属すること | 同一facet内のORと異なるfacet間のANDから8ルールを導き、XとYが同時に成立する2列を前提上の到達不能として区別する。残りのCaseと実データの準備可能性を確認する |
   | 状態遷移 | `BR-CART-002`のゲストカートから会員カートへの統合 | 統合前後のカートとguest cartの状態を対応させ、除外理由を結果へ残す |

   製品データや条件組合せが確認できない行は値を作らず、必要な入力と確認方法を未決として記録します。4技法すべてを固定Skillのruntimeで実行する必要はありません。Skill統合の機械証拠は、同一artifact群で実行した一つの選択技法についてのみ記録します。
5. `materialize_coverage(artifact)`でcurrent CIを作り、Caseを生成してTR→TCN→CI→Case→BR/ACの参照を照合します。4技法の練習Caseも技法ごとの行から追跡できるようにします。
6. `verify_runtime_evidence` の入力は、`workspace/M03/condition-runtime-evidence.json`と`workspace/M03/case-runtime-evidence.json`へそれぞれ保存します。`artifact_markdown`は同じ行程で作った現在の`condition-design.md`または`cases.md`の全文と一致させ、`skill`、`normalized_skill_input`、`partial_rerun`、previous artifactも実際の実行に使った値を記録します。テンプレートのplaceholderや自己申告の出力は証拠になりません。

   保存したrequestを次の固定Skill helperへ直接渡して確認します。JSONの`valid=true`、issues/missing/extra/incomplete pairsが空であることも確認します。

   ```bash
   python3 .agents/skills/test-condition-design/scripts/runtime_contract.py < workspace/M03/condition-runtime-evidence.json
   python3 .agents/skills/test-condition-design/scripts/runtime_contract.py < workspace/M03/case-runtime-evidence.json
   ```

   `course:assess M04`は配布元の固定revisionから同じhelperをPython 3.11で再実行し、request内のartifactが現在の提出物と一致することを検証します。JSON内のvalid=trueという自己申告だけでは通りません。モデル/技法runtimeの生成を実行していない場合は、決定論的helperの成功と分けて報告します。

## 提出物

`workspace/M03/condition-design.md`、`workspace/M03/cases.md`、2つのruntime request JSON。condition-designには4技法の別条件worksheetを含め、casesにはそれぞれのCase参照を記録します。runtime証拠と意味上のレビューを分けます。必要Entityがない場合は、具体的欠落と停止点を記録し、fixture成功を統合PASSと報告しません。

## 理解ノード別の追加確認

既存の演習で得られた証拠を再利用できます。各理解ノードについて本人の判断・操作・結果を区別し、未実施は未実施として記録してください。

- **K-M03-06**：テスト条件とリスクから技法を選び、不採用の理由も説明できる
- **K-M03-07**：論理的な到達不能、データの未準備、未決仕様を区別できる
- **K-M03-08**：runtimeの成功と期待結果の根拠・設計の意味的な正しさを区別できる
