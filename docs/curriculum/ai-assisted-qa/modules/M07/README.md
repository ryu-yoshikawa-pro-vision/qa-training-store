# M07：失敗分析と保守

## このモジュールで学ぶこと

- **目的と必要な理由：** テスト失敗を見てすぐに製品の不具合やAIの誤りと断定せず、証拠から原因を絞ります。原因に合わない修正は、同じ失敗を残したり別の問題を作ったりするためです。
- **到達点：** 最初に失敗した確認、ログやTraceが示す範囲、追加で必要な証拠を整理し、最小修正の前後を別の実行として記録できます。
- **前提と前章とのつながり：** M06で作ったテストと実行結果が基礎です。未経験の人は[M06の実行手順](../M06/README.md)から確認してください。Git操作は必要ありません。
- **準備するもの：** 公開された失敗ケース、画面、ログを使います。課題では指定されたテストファイルだけを扱い、ログがない場合は推測で成功と判定しません。

> **任意の補助：** 本文と演習だけで学べます。AIチューターを使わなくても進められます。利用する場合はCodespacesでM07をロードした後に `pnpm course:tutor M07 --model provider/model-id` を実行できます。利用条件を確認して起動し、質問にはToken・API key・個人情報を含めないでください。チューターはM07の公開資料と本人の成果物を読み取り専用で使い、正式評価やファイル変更は行いません。

## 図で全体の流れをつかむ

図の番号を左から追い、各段階で「何を根拠に決めるか」「何を見て確認するか」を本文の説明と結び付けてください。図は要約です。具体的な条件・例外・手順は続く節と演習で確認します。

![失敗の切り分けと保守しやすい構造](../../assets/figures/M07/01-failure-triage.svg)

*図：最初の異常から原因候補を絞り、後続エラーと分けます。*

![失敗の切り分けと保守しやすい構造：実践の手順](../../assets/figures/M07/02-maintainable-test.svg)

*図：共通処理にまとめても、ケースの期待と失敗箇所を追える構造にします。*

M06で作成したspecの失敗を、実行証拠から切り分けます。原因はテストコードだけとは限りません。製品挙動、Seedや環境、タイミング・不安定性を分け、確認済み事実と仮説を区別します。演習のために製品本体へ故意の不具合を追加しません。

## 失敗を追う手順

1. 同じ対象spec・Reset・環境で再現するか記録します。
2. Runの最初の失敗箇所、Locator/Action/Assertion、標準出力、Trace、必要ならスクリーンショットを見ます。
3. Caseと正式仕様、Seedが保証する状態を照合します。
4. 原因仮説を分け、仮説を識別できる追加確認を決めます。
5. 変更が必要なら最小差分にし、修正前と別のRunで再確認します。

Traceは一回の実行で観測した画面・操作の証拠で、全データや仕様を保証しません。スクリーンショットも保存状態や別画面の遷移を必ず示すわけではありません。コマンド、config、spec、Run ID、ログ/Traceが同じ実行を指すかを確かめます。

## 3種類の診断素材

- **テストコード側**：公開specのLocatorが存在しない見出し「存在しない商品」を指定し、Assertionがその見出しの表示を期待しています。LocatorとAssertionのどこで失敗したかを実行証拠から確認し、Caseに必要な業務結果を観測する修正案を作ります。
- **Seed/環境側**：必要なscenario Resetが呼ばれず、カートに前のデータが残っている。まずResetの実行結果と対象scenarioを確かめ、製品不具合と決めつけません。
- **タイミング/Flaky側**：UI更新を待つ固定時間が環境によって足りない。web-first assertionや対象イベントを確認し、再現性とログを調べます。Timeoutを延ばすだけでは原因修正としません。

`training/ai-assisted-qa-course/exercises/M07/failure-cases.md`の公開診断素材は課題用の仮説です。提示ログから分かることと、環境で追加確認が必要なことを分けます。修正可能な素材は失敗Runと修正後Runを別々に記録します。受講者の`repaired-assertion.spec.ts`は`pnpm course:run M07 repaired-assertion.spec.ts --label before`と`--label after`で実行し、失敗結果、Trace、修正前後のspecの写しとJSON reportを保存します。

## 保守性の判断

Helper、Fixture、Page Object Modelは再利用や変更集中に役立つ場合があります。一件だけの操作に抽象化を足すと読むファイルと間接参照が増えることもあります。実際の重複、変更頻度、読みやすさを見て必要性を説明します。

`maintenance.spec.ts`には、マグの追加とカートへの移動が2件に重複しています。ボタンの名前を完全一致で探す保守変更を各testへ繰り返すと、一方だけ修正し忘れる可能性があります。Page Objectは画面に対する共通操作をまとめる小さなクラスです。たとえば`CartPage`に`addMug()`を置き、画面遷移・追加・status確認を1か所にします。テストに固有の数量1・数量2のAssertionは各testに残します。

Playwrightの標準fixtureはtestごとに必要な資源を用意します。`base.extend<{ cart: CartPage }>({ cart: async ({ page }, runWithCart) => { ... } })`の中で`resetScenario(page, "default")`を呼び、`await runWithCart(new CartPage(page))`でそのtestへ渡します。第2引数はPlaywrightが渡す関数で、名前は自由に付けられます。各testは`async ({ page, cart }) => { ... }`で受け取り、`await cart.addMug()`を使います。Resetをsuiteの最初に一度だけ呼ぶと、前testの状態が次に残るため同じ保証にはなりません。

別題材で仕組みを読むと、次の`CatalogPage`はページ移動をまとめ、`catalog` fixtureはtestにそのオブジェクトを渡します。`runWithCatalog`の前が準備、後が必要なら後片付けの場所です。この例の可視性確認だけでは、カートの数量や購入結果は確認できません。

```ts
import { expect, test as base, type Page } from "@playwright/test";

class CatalogPage {
  constructor(private readonly page: Page) {}
  async open() {
    await this.page.goto("/products");
  }
}

const test = base.extend<{ catalog: CatalogPage }>({
  catalog: async ({ page }, runWithCatalog) => {
    await runWithCatalog(new CatalogPage(page));
  },
});

test("商品一覧を開く", async ({ page, catalog }) => {
  await catalog.open();
  await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
});
```

保守演習ではこの例にResetを機械的に足すのではなく、2つのCaseが必要とする開始状態と、共有する画面操作を選びます。fixtureがtestへ値を渡す前にResetが失敗したらtest本体は実行されません。実行結果の最初の失敗箇所から確認してください。

変更前に`pnpm course:run M07 maintenance.spec.ts --label before`で2件を実行し、Page Objectとfixtureを実装した後も`--label after`で別Runを作成します。差分から共通操作が1か所になったことと、個別の業務Assertionが残ったことを確認します。単発で再利用も保守変更もない操作では、クラスを増やさず直接書く選択も説明できます。Phase 2評価は、別々のRunが変更前後の結果を示し、どちらも同じ教材版・対象specで実行されたことを内部記録から照合します。

## 初めての診断と保守練習

失敗素材は次の順で扱います。最初は完成したログに「事実」と「まだ仮説」を分けて印を付け、次にReset漏れのケースで状態を確認し、最後に別のLocator失敗を自分で調べます。各回で「最初に失敗した行」「期待していたこと」「見えた事実」「原因を分ける次の確認」を短く記録します。

保守は先に2件の重複をそのまま読み、一方だけ直すと何が残るかを確認します。まず共通操作を1つのPage Objectへ移し、個別のAssertionがtestに残ることを確認してからfixtureを追加します。`base.extend`や型引数の括弧で止まった場合は、構文を丸ごと暗記せず、fixture名・受け取る値・testへ渡す値を一つずつ指で対応させます。再利用がない別ケースでは、抽象化を追加しない判断も練習します。

## Phase 2総合演習・評価

Phase 2ルーブリックは [`assessment/phase-2-rubric.md`](../../../../../training/ai-assisted-qa-course/assessment/phase-2-rubric.md) です。M06のspecを再利用し、Case→spec→Assertion→Run→根拠を対応させ、少なくとも3種類の原因構造を診断します。未提示断片に対する本人確認を含めます。修正前後のRunがそろわない課題は修正済みにしません。

## Phase 3への引継ぎ

修了時は`workspace/M07/phase2-handoff.md`に、動作確認したspec、Playwright Config、`package.json`とlockfile、既存Reset helper、実行コマンド、修正前後の別Runと結果を記録します。ロードされるのは未記入テンプレートです。M07終了状態は診断記録・修正spec・handoff記録の存在と、同じ配布版・対象specを使った実行かを内部で照合します。内容の妥当性は公開Phase 2 rubricで別に確認します。

## 確認と復習

[M07の確認クイズ](../../quizzes/M07.json)で原因分類を確認します。誤答した場合、failure-casesを再読し、事実・仮説・追加確認を別の欄に書き分けます。

## 参考

- [M07の学習項目](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 2評価基準](../../../../../training/ai-assisted-qa-course/assessment/phase-2-rubric.md)
