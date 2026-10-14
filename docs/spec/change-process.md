# 仕様変更の手順

この文書は、仕様を保守・変更する担当者向けの手順書です。機能の仕様を学習する受講者は、まず [`README.md`](./README.md) の「学習者向けの読み始め」から対象機能を確認してください。受講にあたって本変更手順を前提とする必要はありません。

## 通常の機能変更

```text
Change Request
  ↓
Normative Spec
  ↓
BR / AC
  ↓
Risk / Test Design
  ↓
Implementation
  ↓
Deterministic Automation
  ↓
Risk-based Agentic QA / Human QA
  ↓
Review / Merge
```

ユーザー向け新規機能（User-facing Feature）、UI/UX・レスポンシブ・アクセシビリティの変更、ロールや権限（Role/Permission）の変更、状態や状態遷移（State/Transition）の変更、エラー処理や境界値（Error/Boundary）の変更、および高リスクなリグレッションは、Agentic QAの対象候補となります。一方で、低リスクな内部限定の変更や、既存のリグレッションテストで十分担保できる変更については、対象候補から除外できます。ただし、除外したことを「テスト実施済み」の代替とみなすことはできません。

## 既存仕様への違反

実装が既存の正式な仕様に違反している場合、仕様側を実装に合わせて変更してはなりません。不具合（Defect）の修正、リグレッションテストの更新、必要に応じた有効な既知の乖離（Active Known Deviation）の削除を行い、仕様書の修正は誤記の訂正や説明の補足のみにとどめます。

## 仕様変更

期待される挙動を変更する場合は、Spec → BR/AC → Risk/Test → Implementation を同一の変更単位で同期させます。緊急の修正対応であっても、マージ前に必ず同期を完了させます。

## 既知の乖離（Known Deviation）と未解決事項（Unresolved）

Known Deviation として管理するのは、現在有効なもの（Active のみ）に限定します。実装の修正とリグレッションテストの追加が完了した段階で、該当エントリを削除します。Unresolved（未解決事項）は、プロダクトの意思決定（Product Decision）が完了した段階で正式仕様（Normative Spec）、BR/AC、テストへと反映します。未確定の間は、検出事項（Finding）を不具合（Defect）として確定させません。

## レビューとCI

BR/AC や直接参照している正式仕様ファイル（Normative File）が変更された場合、それを参照している Challenge の影響サマリー（Affected Summary）を生成します。生成される HTML は Markdown から再生成するものとし、HTML を直接編集してはなりません。また、AI Agentic QA は初期導入時点では必須の CI ゲート（Required CI Gate）には設定しません。

影響サマリーは次の CLI コマンドで生成し、CI 上では既存の Style Quality Job の Review Summary へ出力します。

```text
pnpm run summarize:spec-impact
```