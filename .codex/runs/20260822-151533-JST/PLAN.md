# 計画

## 目的

- Repository Audit Remediation PlanのG2、G5、G6だけを、最新main相当の既存構造へ最小差分で実装・検証する。

## スコープ

- In:
  - G2 Checkout result state integrity（Web/Native、Order ownership/state、Payment state、指定Regression）
  - G5 Web Search Suggestion（通常typing、React Aria open contract、既存keyboard/stale/no-result維持）
  - G6 Cart ownership invariant（Dexie update/delete、foreign item negative repository test）
  - 対象Focused Test、必要Repository gate、可能なWeb/Native runtime確認、Run Artifact
- Out:
  - G1/G3/G4/G7/G8/G9、Follow-up/Deferred、既存仕様外UX、Framework/依存/CIの追加変更

## 前提

- PR #38はmainへmerge済みで、`origin/main`と作業ブランチが一致していることを実測済み。
- 既存`StatePanel kind="not-found"` / Native `NativeStatePanel`をmissing/unauthorized boundaryとして再利用する。
- G2の結果種別はOrder statusとlatest Payment statusの両方から導出し、route kindは表示の正本にしない。
- G5はReact Aria Components 1.19.0の`isOpen` / `onOpenChange` / `allowsEmptyCollection`を使う。

## 不明点

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 不整合/processingの結果routeは成功・失敗を断定せず既存not-found boundaryへ送る。
- 未回答の重要質問: なし。Native runtime capabilityの有無は検証結果として記録する。

## 仮説

- H1: Web/Native result画面のfalse stateはroute presentationをstate-aware resolverへ置換すれば解消できる。
- H2: Web Searchのasync result到着時にComboBox open stateをcontrolled更新すればArrowDown依存なしに候補/no-resultを表示できる。
- H3: Dexieのitem取得直後にcart ownershipを検証すれば、既存mutation contractを壊さずforeign update/deleteを拒否できる。

## 調査計画

- Round 1 Query: audit report/spec、最新main/PR、G2/G5/G6実装と既存testを確認する。
- Round 2 Query: focused testでRoot Causeを再現し、最小修正後に同じ操作・repository contractを確認する。
- Exit Criteria:
  - H1〜H3の支持/反証根拠がREPORTにある。
  - 指定Regressionと必要gateがPASSし、runtime未実行はPASS扱いしない。
  - G2/G5/G6以外の変更がない。

## 実装方針

1. repo mappingとplan保存を完了する。
2. G2をWeb/Nativeの既存Boundaryへ最小実装し、component Regressionを追加する。
3. G5のcontrolled open stateとno-result contractを実装し、normal typing/stale/keyboard Regressionを追加する。
4. G6のDexie ownership guardとforeign update/delete repository testを追加する。
5. Focused Test、必要gate、runtime、artifact sanitizer、scope/Git確認を順に実行する。

## 完了条件

- G2: paid→failed、failed→complete、missing orderId、unauthorizedをWeb/Nativeの適切なboundaryとstate表示で固定する。
- G5: 通常typing後にasync候補が開き、no-result、2文字未満、Enter、Arrow、stale protectionが維持される。
- G6: foreign item update/deleteがNOT_FOUNDで拒否され、item/cartが変更されず、valid mutation regressionがPASSする。
- Focused Test、変更面に必要なRepository gate、可能なWeb/Native Before/After、sanitizerがPASSする。
- normal commit/pushまで実施可能なら行い、PRはmergeしない。

## リスク・不明点

- React Ariaのempty collectionが閉じる場合は`allowsEmptyCollection`を使う。
- Order/Payment不整合を成功/失敗に誤分類しないよう、両方のpersisted stateを条件にする。
- Native runtimeが利用できない場合はBlocked/未実行をREPORTへ明記し、repository/component evidenceを代替PASSにしない。

## 判断ログ

- 2026-08-22 15:15 JST: `origin/main=a3a58ae...`、作業ブランチ同一、PR #38 MERGEDを確認した。rebaseは不要。
- 2026-08-22 15:20 JST: G2はWebのroute kind依存とNative Completeのorder lookup欠落、G5はasync後のopen state欠落、G6はDexie ownership比較欠落を確認した。
- 2026-08-22 15:25 JST: React Aria公式契約で`onOpenChange`、`allowsEmptyCollection`、`menuTrigger=input`を確認し、controlled `isOpen`を採用する。
