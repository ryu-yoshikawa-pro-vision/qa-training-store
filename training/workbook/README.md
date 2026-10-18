# トレーニング用Workbook

このWorkbookは、GoogleスプレッドシートにCSVをインポートして使用する標準テンプレートです。Googleスプレッドシート固有の機能や書式を正本（マスター）とはせず、リポジトリ上の4つのCSVを入力用の正本データとして扱います。

## 学習時のインプット／アウトプットと評価への引き渡し

これら4つのCSVは、受講者が検討した内容を記録するための正本形式です。リポジトリ内のCSVはサンプル／テンプレートとして配布されており、受講者の完成した回答はあらかじめ含まれていません。受講者はGoogleスプレッドシートやローカルの表計算ソフト、テキストエディターなど、任意のツールで編集できます。

レッスンでWorkbookを使用する際は、本文で指定された前ステップの成果物、仕様・BR（ビジネスルール）・AC（受け入れ条件）、リスク、テストケースIDを入力情報（インプット）として準備します。P1-2で対象とリスク、P1-3でテストケースと自動化対象を整理し、P1-4以降では対応するテストケースをコードおよび実行結果と紐付けます。Playwrightの実装に着手する前にテストケースが必要となる場合は、`test_condition`、`precondition`、`expected_result`、リセット手順、および対象のテストケースIDを準備済みのインプットとして扱います。

配布される`Automate`のサンプル行は、`implementation_path`が空欄であっても不備ではありません。受講者が自身のケースを実装した段階で、該当するspecファイルのリポジトリルートからの相対パスを入力します。スターター用、ベースライン用、および意図的失敗（expected-failure）用の各specは完成答案としては記録せず、受講者が作成した代表specと明確に区別します。ヘルパー、POM（Page Object Model）、コンポーネントオブジェクト、フィクスチャなどの受講者サポートコードは、`training/playwright/`配下に配置すれば反映（materialize）されますが、Workbookの`implementation_path`にすべてを列挙する必要はありません。教材として提供済みの`training/playwright/support/reset-scenario.ts`はトレーニング環境のコピーや実行時ハーネスから利用されるため、受講者の成果物である`handoff-root/code/`配下にはコピーしません。

Part 1からPart 2の最終確認へ成果物を引き渡す際は、編集場所にかかわらず、以下の固定ルートディレクトリに集約します。

```text
handoff-root/
  workbook/       # このREADMEで説明する4 CSV
  code/            # Repository相対Pathを保った受講者コード
  evidence/        # Trace、Screenshot、Video、HTML Reportなど
  receipts/        # 実行ごとのExecution Receipt
  self-check/      # 既存Lesson IDごとの自己確認
```

`implementation_path`は、`code/`配下においてもリポジトリの相対パス構造を維持します。例えば、`training/playwright/exercises/my-cart.spec.ts`は`code/training/playwright/exercises/my-cart.spec.ts`となります。修了レシート（Completion Receipt）は`handoff-root/completion-receipt.json`に配置し、実行レシート（Execution Receipt）が格納される`receipts/`ディレクトリには配置しません。トレーニング環境のコピーにPart 1のエビデンス、レシート、セルフチェック結果を複製して、評価用の正本を別途作成することは避けてください。

P1-8のC10では、コード内に実在する保守上の問題があればそれを題材とします。問題が見つからない場合は、[`c10-locator-maintenance.spec.ts`](../playwright/maintenance-exercises/c10-locator-maintenance.spec.ts)を`training/playwright/exercises/c10-cart-900.spec.ts`へコピーし、受講者が作成したケースとは別の`TC-CART-900`として、教材の決定的な演習課題に使用します。提供元のファイルをそのまま受講者コードとして登録するのではなく、必ず`training/playwright/exercises/`配下にコピーしてから改善作業を行います。演習用に提供された`TC-CART-900`は、製品仕様上のTARGETやRISK、既存の受講者ケースには紐付けません。ロケーターの重複はテストコード自体の保守性に関わる問題であり、製品側の新たなリスクとして扱うべきものではないためです。正式な製品リスク／テストケースに紐付ける実在問題のルート、または`TC-CART-900`を用いた提供演習ルートのいずれかで、問題・原因・対応方針（Action）・最小限の改善内容を記録し、改善後の再実行結果を別の実行記録として`run_context=c10-improved`で追加します。設計案のみの提出や、改善前のレシートのみでは、C10完了とはみなされません。Part 2のC12では、CIレシートとして自動生成される`ci.md`とは別に、受講者がGitHubの画面上で確認した実行（Run）、チェック項目（Check）、成果物（Artifact）、結果（Result）、ケース情報（Case）を、人間が読める形式のエビデンスとして記録します。

C10において、specファイルではなくヘルパーやPOMなどを改善対象とする場合も、既存の`improvement`列に以下の形式で受講者の記録を記載します。新たなマニフェストファイルや依存関係表を個別に作成する必要はありません。改善前後のダイジェスト値はテストランナーによってレシートへ自動記録されるため、受講者が手動で入力する必要はありません。

```text
Improvement Target: training/playwright/support/<learner-owned-helper>.ts
Problem: <何が保守上の問題か>
Why: <なぜ問題か>
Action: <選択した改善>
Improvement: <実施した最小変更と再実行結果>
```

`Improvement Target`には受講者が所有・管理するコードのみを指定し、あらかじめ提供されている`training/playwright/support/reset-scenario.ts`は指定しないでください。

各レッスンの成果物（Output）には、作成したCSV行、コード、エビデンス、自己確認結果のうちどれを記録として残すのか、また次のレッスンへどのID・ファイル・実行記録を引き渡すのかを明記します。なお、特定のリスクやアサーションが有意義なものであるかどうかは、CSVの形式的な自動検証のみで機械的に評価されるわけではありません。本文に示されたセルフチェック項目と評価基準に基づき、自身の判断理由を論理的に説明できるようにしてください。

## トレーサビリティ

トレーサビリティの標準的な流れは、`spec_ref` → `br_ids` / `ac_ids` → `risk_id` → `test_case_id` → `implementation_path` → `evidence` です。BRやACなどの複数IDを記載する場合はセミコロン（`;`）で区切り、区切り文字の前後に空白を入れることや、同一フィールド内でのIDの重複は禁止します。`spec_ref`、`risk_id`、`test_case_id`のようにトレース関係を結ぶ主要なIDは、対応する対象が存在する行では入力が必須です。直接対応するものが存在しないBRやACに限り、空欄での登録が認められます。

代表的なテストケースとして、カート（Cart）に関する2つの独立したリスクを、それぞれ個別の対象（Target）・リスク（Risk）・テストケース（Test Case）として切り分けて扱います。

| Test Case | Spec / Risk | 前提と確認 |
| --- | --- | --- |
| `TC-CART-001` | `BR-CART-001` / `AC-CART-001` / `RISK-CART-001` | `default`状態において、購入上限が先に適用されるSKUを同一カートに追加し、上限超過時の追加拒否と既存数量が維持されることを確認する |
| `TC-CART-002` | `BR-CART-003` / `AC-CART-003` / `RISK-CART-002` | `cart-with-invalid-items`の状態へリセットし、`regular@example.com`でログインした後、購入不可の明細が存在することでチェックアウトが阻止されることを確認する |

P1-4で扱う単純なカート追加や、在庫切れ（`out-of-stock`）商品の追加拒否といったケースは導入および追加の基礎練習用であるため、上記のテストケースIDを流用しないでください。

上記の`TC-CART-001`および`TC-CART-002`は、配布サンプルに記載された説明用のIDであり、受講者が提出すべき完成ケースではありません。受講者は`TC-CART-101`や`TC-CART-102`のように自身で採番した未使用のIDを割り当て、Workbook、テストタイトル、実行結果のすべてを同一のIDで一貫して紐付けてください。

## Test Case IDの形式

`test_case_id`は、`TC-<DOMAIN>-NNN`を標準（Canonical）形式とします。`<DOMAIN>`には1文字以上の大文字ASCII英数字、`NNN`には3桁固定の数字を指定します（例: `TC-CART-001`、`TC-PRODUCT-001`）。

この命名規則は`test_case_id`の識別子にのみ適用され、リスクIDやAC ID、UIテスト用のID（`testId`）の形式規則とは別の規約です。バリデーターによる正規表現パターンは`^TC-[A-Z0-9]+-\d{3}$`となります。

## 段階的な情報開示

最初からすべての列を埋める必要はありません。学習の進行に合わせて段階的に入力していきます。

1. `01_target-risk.csv`：テスト対象、仕様（Spec）、およびリスク（Risk）を整理します。
2. `02_test-cases.csv`：テスト条件、前提条件、期待結果、および適用したテスト設計技法を整理します。
3. `03_automation-mapping.csv`：自動化の判定（`automation_decision`）として `Automate`（自動化する）/ `Later`（後で自動化）/ `Do not automate`（自動化しない）を判断し、テスト層（Layer）や使用ツール（Tool）を決定します。
4. `04_execution-improvement.csv`：実行エビデンス、失敗の原因、および改善内容を記録します。

## 空欄の条件

- ID列は、対応する対象IDが存在しない場合に限り空欄とします。対象ID、リスクID、テストケースIDなどの主キーとなるIDは空欄にしてはなりません。
- `implementation_path` は、未実装の場合、または `Do not automate`（自動化しない）と判断して実装パスが存在しない場合に空欄とします。入力するパスは、リポジトリ上に実在するものに限定してください。`Later`（後で自動化）の場合は空欄のままとし、`Automate`（自動化する）であっても受講者が実装を終えていない段階で配布元の演習ファイルを完成答案として記録することは禁止します。配布されている`Automate`のサンプル行も、実装前の段階では空欄のままで問題ありません。
- `evidence` 列は、テストが未実行（`result=Not run`）の間は空欄のままとします。将来出力される予定のパスを事前に実エビデンスとして記録してはなりません。実行後は、トレースファイル、スクリーンショット、動画、レポート、GitHub Actionsのアーティファクトなど、第三者が後から追跡・確認できる参照情報を記録します。なお、これら実行時に生成されるアーティファクトについては、静的バリデーターがGitの管理対象ファイルとしてリポジトリ上に存在することまでを要求するものではありません。
- `failure_category` は、テスト結果が `Pass` または `Not run` の場合は空欄にして構いません。失敗（Failure）が発生した際に、確認できた失敗分類を段階的に記録します。
- `cause`（原因）、`action`（対応策）、`improvement`（改善内容）の各列は、テスト結果や原因調査の進捗に応じて後から段階的に追記します。単に空欄を埋めるためだけに、架空の原因や対応策、改善内容、存在しないパス、捏造したエビデンスを記載することは厳禁です。
- `04_execution-improvement.csv` の `run_context` は、前後の空白を除いて空文字にしてはなりません。同じ `test_case_id` であっても、実行環境や実行契機（コンテキスト）が異なる場合は複数行に分けて記録できます。ただし、同一のテストケースIDと実行コンテキストの組み合わせを重複して登録することはできません。また、`result` 列に使用できる値は `Pass`、`Fail`、`Not run` の3種類のみです。

配布されるサンプル行は完成答案ではありません。正式な仕様書（Normative Specification）を熟読したうえで、自分自身の判断理由と実際のエビデンスを追記してください。
