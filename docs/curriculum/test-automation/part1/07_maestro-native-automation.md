# Part 1-7: MaestroによるNative UI自動化

## 学習目標

- Web UI自動化とNative UI自動化の違いを説明できる。
- MaestroのFlow、Action、Assertionの基本を理解できる。
- Scenario Shop Nativeアプリを対象に最小のMaestro Flowを作成できる。
- Stable Test ID、Deep Link、Test Controlを利用して再現可能なNative Testを作れる。
- Android / iOSで共通化できるBusiness FlowとPlatform差分を区別できる。
- PlaywrightとMaestroを「どちらが優れているか」ではなく、対象Platformと目的から使い分けられる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Nativeアプリと `maestro/` 配下の既存Flowを使用します。**

主な参照先:

- `maestro/native-storefront.yaml`
- `maestro/native-cart.yaml`
- `maestro/native-search.yaml`
- `maestro/native-test-control.yaml`
- `maestro/native-restart-persistence.yaml`
- `src/presentation/native/`
- Native Stable Test ID
- `scenario-shop://` Deep Link

## Part 1での標準実行環境

Part 1のMaestroハンズオンは、全受講者が同じ手順を再現しやすいように**Android Emulatorを標準経路**とします。

Mac環境を利用できる受講者は同じBusiness FlowをiOS Simulatorでも確認できますが、Part 1の完了条件としてiOS実行を必須にしません。

理由は次です。

- iOS SimulatorにはmacOS / Xcode環境が必要で、受講環境の制約が大きい。
- Part 1の目的はNative UI自動化の基本概念を理解することであり、OS環境構築差分を主目的にしない。
- Android / iOS両PlatformのCI設計とRunner CostはPart 2で扱う。

教材提供時には、Android Build / Install / Emulator / Maestroの開始確認手順を別途用意します。この文書整備では環境構築ScriptやMaestro設定を追加しません。

## Lesson 1: Maestroとは

MaestroはMobile UIを操作するための自動化Toolです。

PlaywrightがBrowser PageとDOMを中心に扱うのに対し、MaestroではNativeアプリの画面とUI要素を操作します。

基本的なFlowはYAMLで記述します。

```yaml
appId: com.ryuyoshikawa.scenarioshop
---
- launchApp
- assertVisible: "Scenario Shop"
```

## Lesson 2: ActionとAssertion

代表的な操作:

- `launchApp`
- `tapOn`
- `inputText`
- `scrollUntilVisible`
- `openLink`

代表的な確認:

- `assertVisible`
- `assertNotVisible`

PlaywrightとSyntaxは異なりますが、前提状態 → 操作 → 期待結果というテスト構造は同じです。

## Lesson 3: Nativeの要素識別

NativeではDOM Locatorをそのまま使えません。

Scenario Shopではstable Test IDを利用します。

例:

```yaml
- tapOn:
    id: "native-nav-products"
```

Test IDは、自動化のためだけに無秩序に追加するのではなく、UIの意味と安定性を考えて設計します。

## Lesson 4: Deep Link

Nativeでは画面遷移やTest ControlにDeep Linkを利用できます。

例:

```text
scenario-shop://products/product-basic-shirt
```

また、Test Control ResetにもDeep Linkを使用します。

Deep Linkにより、長い前段操作を毎回通らず、意図した状態や画面へ決定的に到達できます。

ただし、本来検証したいJourneyまでDeep Linkで飛ばしてしまわないようにします。

## Lesson 5: Test ControlとScenario Reset

既存Maestro Flowでは、Test Controlを使って初期状態をResetします。

例:

```text
scenario-shop://test-control/reset?version=1&scenario=default&...
```

その後、Ready Signalを待ってから操作します。

Native Testでも、前回実行の状態へ依存しないことが重要です。

## Lesson 6: 最初のMaestro Flow

Android Emulator上で次を実装します。

1. Appを起動する。
2. Test Controlで`default`へResetする。
3. 商品一覧へ移動する。
4. 商品詳細を開く。
5. Variationを選ぶ。
6. Cartへ追加する。
7. 成功状態を確認する。

最初は既存 `native-storefront.yaml` をコピーせず、自分で最小Flowを作ります。

完成後に既存Flowと比較します。

## Lesson 7: ScrollとNative UI

Mobile UIではViewportが狭いため、対象要素が画面外にあることがあります。

`scrollUntilVisible`などを使い、「何回Swipeするか」ではなく「目的の要素が見えるまで」を基準に操作します。

これはPlaywrightで固定待機を避ける考え方と似ています。

## Lesson 8: Persistence

NativeアプリではApp Restart後の状態復元も重要です。

既存の `native-restart-persistence.yaml` を教材にし、次を考えます。

- Guest Identityは維持されるか。
- Cartは復元されるか。
- App再起動がTest Caseへ与える意味は何か。

## Lesson 9: Android / iOS

同じBusiness FlowをAndroid / iOSで確認する場合、可能なら同じMaestro Flowを利用します。

一方で、Platform固有のUIやIME、OS挙動がある場合は必要な差分だけ分けます。

「Android用とiOS用を最初から全件複製する」ことは避けます。

Part 1ではAndroidで実際に手を動かし、iOSは差分を理解するところまでを標準とします。Part 2ではGitHub Actions上のAndroid Emulator / iOS Simulator実行を比較します。

## Lesson 10: Playwright vs Maestro

比較観点:

| 観点 | Playwright | Maestro |
| --- | --- | --- |
| 主対象 | Web Browser | Native Mobile |
| 記述 | TypeScript | YAML |
| 要素指定 | Role / Label / Locatorなど | Text / IDなど |
| 初期化 | Test API / Fixture | Deep Link / Test Control |
| Evidence | Trace / Screenshot / Video | Screenshot / JUnitなど |
| 実行環境 | Browser | Emulator / Simulator / Device |

どちらかへ統一することではなく、対象に適したToolを選びます。

## ハンズオン1: Native Cart Flow

Playwrightで作成したCart Testのうち1件をAndroid上のMaestroへ実装します。

WebとNativeで、共通するテスト条件と異なる操作を記録します。

## ハンズオン2: Boundary Flow

在庫切れ、低在庫、購入上限のいずれかをNativeで確認します。

既存 `maestro/` のFlowと比較します。

## ハンズオン3: Restart

Cartへ商品を追加した後にAppを再起動し、状態復元を確認します。

## 発展ハンズオン: iOS Simulator

Mac環境がある場合、Androidで実装したFlowをiOS Simulatorでも実行し、次を記録します。

- Flowを共用できた箇所
- Platform差が出た箇所
- iOS固有対応が本当に必要だった箇所

## 確認問題

1. PlaywrightのLocatorをそのままNativeへ使えない理由は何か。
2. Stable Test IDのメリットと乱用Riskは何か。
3. Deep Linkを使うとテストが速くなる一方、何を飛ばしすぎないよう注意すべきか。
4. Android / iOSでFlowを機械的に複製しない理由は何か。
5. PlaywrightとMaestroの共通概念を3つ挙げる。
6. Part 1でAndroidを標準経路にする理由は何か。

## 完了条件

- Android Emulator上でMaestro Flowを2本以上作成している。
- Test IDを利用した操作を含む。
- Test ControlまたはDeep Linkを利用している。
- PlaywrightとMaestroで同じBusiness Flowを1件以上比較している。
- Native固有のテスト観点を1件以上説明できる。
- Android / iOSで共用できるFlowとPlatform差分の考え方を説明できる。
