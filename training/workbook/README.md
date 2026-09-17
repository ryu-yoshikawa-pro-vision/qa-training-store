# トレーニング用Workbook

このWorkbookは、Google SheetsへCSVをImportして使うCanonical Templateです。Google Sheetsの機能や書式は正本にせず、4つのCSVをRepository上の入力形式として扱います。

## 学習時のInput / Outputと評価への引き渡し

この4 CSVは、受講者が考えた内容を記録するための既存の正本形式です。RepositoryのCSVはsample／templateとして配布され、受講者の完成回答をあらかじめ入れません。受講者はGoogle Sheets、ローカルの表計算ソフト、テキストエディタなど任意の場所で編集できます。

LessonでWorkbookを使うときは、本文に示された前の成果物、仕様・BR・AC、Risk、Test Case IDをInputとして準備します。P1-2では対象とRisk、P1-3ではTest Caseと自動化対象を作り、P1-4以降では対応するTest Caseをコードと実行結果へ結び付けます。Playwrightを実装する前にTest Caseが必要な場合は、`test_condition`、`precondition`、`expected_result`、Reset方法、対象のTest Case IDを準備済みInputとして扱います。

配布される`Automate`のsample行は、`implementation_path`が空欄でも不備ではありません。受講者が自分のCaseを実装したときだけ、別のspecのRepository相対Pathを入力します。Starter、baseline、expected-failure用specは完成答案として記録せず、受講者が作成した代表specと区別します。Helper、POM、Component Object、Fixtureなどの受講者support codeは`training/playwright/`配下へ置けばmaterializeできますが、Workbookの`implementation_path`へすべてを列挙する必要はありません。

Part 1からPart 2の最終確認へ渡すときは、編集場所に関係なく次の固定rootへ集約します。

```text
handoff-root/
  workbook/       # このREADMEで説明する4 CSV
  code/            # Repository相対Pathを保った受講者コード
  evidence/        # Trace、Screenshot、Video、HTML Reportなど
  receipts/        # 実行ごとのExecution Receipt
  self-check/      # 既存Lesson IDごとの自己確認
```

`implementation_path`は`code/`の下でRepository相対Pathを保ちます。例えば`training/playwright/exercises/my-cart.spec.ts`は`code/training/playwright/exercises/my-cart.spec.ts`です。Completion Receiptは`handoff-root/completion-receipt.json`へ置き、Execution Receiptのある`receipts/`へは置きません。Training CopyへPart 1のEvidence、Receipt、self-checkを複製して、別の評価正本を作ることはしません。

P1-8のC10では、実在する保守上の問題、原因、Action、最小改善を記録し、改善後の別runを`run_context=c10-improved`として追加します。設計案だけ、または改善前のReceiptだけではC10完了になりません。Part 2のC12では、CI Receiptの自動`ci.md`とは別に、受講者がGitHub画面で確認したRun／Check／Artifact／Result／Caseを人間可読Evidenceへ残します。

各LessonのOutputには、作成したCSV行、コード、Evidence、自己確認のどれを残すかと、次のLessonへどのID・ファイル・実行記録を渡すかを記載します。意味のあるRiskやAssertionかどうかは、機械的なCSV検証だけで採点せず、本文のSelf-checkと評価基準に沿って自分の理由を説明します。

## トレーサビリティ

標準の流れは `spec_ref` → `br_ids` / `ac_ids` → `risk_id` → `test_case_id` → `implementation_path` → `evidence` です。BR / ACなど複数IDは`;`で区切り、区切り前後の空白と同一Field内の重複を禁止します。`spec_ref`、`risk_id`、`test_case_id`などTraceをつなぐIDは、対応する対象がある行では必須です。BR / ACのように直接対応しないIDだけは空欄を許可します。

代表ケースは、Cartの2つの独立したRiskを別のTarget / Risk / Test Caseとして扱います。

| Test Case | Spec / Risk | 前提と確認 |
| --- | --- | --- |
| `TC-CART-001` | `BR-CART-001` / `AC-CART-001` / `RISK-CART-001` | `default`で購入上限が先に効くSKUを同一Cartへ追加し、上限超過の追加拒否と既存数量を確認する |
| `TC-CART-002` | `BR-CART-003` / `AC-CART-003` / `RISK-CART-002` | `cart-with-invalid-items`へResetし`regular@example.com`でLoginした後、購入不可明細がCheckoutを阻止することを確認する |

P1-4の単純なCart追加や`out-of-stock`の商品追加拒否は導入・追加練習であり、上記のTest Case IDを流用しません。

## Test Case IDの形式

`test_case_id`は`TC-<DOMAIN>-NNN`をCanonical形式とします。`<DOMAIN>`は1文字以上の大文字ASCII英数字、`NNN`はちょうど3桁の数字です。例: `TC-CART-001`、`TC-PRODUCT-001`。

この形式は`test_case_id`の識別子にだけ適用します。Risk ID、AC ID、UI Test ID / `testId`の形式とは別の契約です。ValidatorのCanonical patternは`^TC-[A-Z0-9]+-\d{3}$`です。

## 段階的な情報開示

最初から全列を埋めません。

1. `01_target-risk.csv` で対象、Spec、Riskを整理する。
2. `02_test-cases.csv` で条件、前提、期待結果、設計技法を整理する。
3. `03_automation-mapping.csv` で `automation_decision` の `Automate` / `Later` / `Do not automate` とLayer・Toolを決める。
4. `04_execution-improvement.csv` でEvidence、原因、改善を記録する。

## 空欄の条件

- ID列は、対応する対象IDがない場合だけ空欄にします。対象、Risk、Test Caseの主IDは空欄にしません。
- `implementation_path` は未実装、または `Do not automate` と判断して実装Pathが存在しない場合に空欄にします。入力するPathはRepository上に実在するものだけにします。`Later`では空欄にし、`Automate`でも受講者がまだ実装していない段階で配布元の演習Fileを完成答案として記録しません。`Automate`のsample行も未実装段階では空欄のままです。
- `evidence` は未実行（`result=Not run`）の間は空欄にします。予定する出力先を実Evidenceとして記録しません。実行後はTrace、Screenshot、Video、Report、GitHub Actions Artifactなど、人が後から追える参照を記録します。これらの実行時Artifactは静的ValidatorがGit管理対象Fileとして存在することを要求しません。
- `failure_category` は `Pass` / `Not run` では空欄にできます。Failureが発生した場合は、観測できたFailure分類を段階的に追加します。
- `cause`、`action`、`improvement` は、結果と調査の進捗に応じて後から追加します。空欄を埋めるための架空の原因、Action、改善、Path、Evidenceは作成しません。
- `04_execution-improvement.csv`の`run_context`は前後空白を除いて空にせず、同じ`test_case_id`でも異なる実行Contextなら複数行で記録できます。同じIDとContextの組み合わせは重複させません。`result`は`Pass`、`Fail`、`Not run`のいずれかだけを使います。

サンプル行は完成答案ではありません。Normative Specificationを読み、理由とEvidenceを自分で追加します。
