# NFR-MA-020 / NFR-MA-021 Current Decision Investigation Plan

## 1. Purpose

PR #78 (`docs: Formal Test Strategy / Traceability を Current contract に整合する`) の `CT-BOUNDARY-001 = stop` を解消する前提として、`NFR-MA-020` と `NFR-MA-021` の Current decision を確定するために必要な事実を収集する。

この作業の目的は、Current implementation をそのまま正当化することでも、Requirement を文字どおり実装することでもない。

以下を明確に分離する。

- Repository / Git history から確認できる事実
- Current implementation の実態
- Requirement を Literal に適用した場合の影響
- Owner が最終判断すべき事項

最終的な Requirement / Architecture の判断は Owner が行う。Codex は判断材料の収集と整理までを担当する。

## 2. Background

PR #78 の Current audit では、`CT-BOUNDARY-001` 配下の Requirement のうち、少なくとも以下が implementation / Formal coverage gap として残っている。

- `NFR-MA-020`: 対象 Form 全体の React Hook Form + Zod 整合
- `NFR-MA-021`: Web Admin / Layout の `.web.tsx` + CSS Modules 整合
- `NFR-MA-023`: Code / Markdown の SSOT 責務整合

一方、Decision Log には少なくとも以下の既存判断があるため、Current implementation との不一致だけを理由に Requirement を変更してはならない。

- `D-020`: React Hook Form + Zod
- `D-021`: `.web.tsx` + CSS Modules
- `D-026`: Type / Enum / Dexie Schema は Code を SSOT とし、Markdown は意味・理由を担う

したがって、まず既存 Decision が Current decision として有効か、後続 Decision / Plan / Architecture change で supersede されているかを Git history まで含めて確認する。

## 3. Scope

### 3.1 Primary scope

- `NFR-MA-020`
- `D-020`
- Current Form implementation
- React Hook Form / Zod / `zodResolver` の利用実態
- Form validation の ownership
- `NFR-MA-021`
- `D-021`
- Current Web / Native styling architecture
- `.web.tsx` / CSS Modules / `global.css` / shared tokens / React Native `StyleSheet` の利用実態
- 上記に関する Git history / Decision / Plan / ADR / Project Context

### 3.2 Reference-only scope

`NFR-MA-023` / `D-026` は、別の Requirement decision が必要か、それとも documentation remediation として扱えるかを判断する材料だけ確認する。

### 3.3 Out of scope

この調査では以下を行わない。

- Production code の変更
- Test code の変更
- Requirement 本文の変更
- Decision Log の変更
- Traceability の変更
- `CT-BOUNDARY-001` の disposition 変更
- PR #78 の変更
- React Hook Form / Zod migration
- CSS Modules / `.web.tsx` migration
- `global.css` の整理
- Formal test の追加
- validator の追加
- 無関係な refactor / cleanup

## 4. Investigation Principles

1. 最新 `origin/main` を Current source とする。
2. 最新ファイルだけではなく Git history を確認する。
3. Current implementation と Requirement / Decision の不一致を、そのまま Requirement 変更の根拠にしない。
4. 実装量だけではなく、validation ownership・platform boundary・regression risk まで確認する。
5. 推測は事実と分離する。
6. Repository 内の証拠で判断できない事項は `Unknown` とする。
7. Codex 自身が最終方針を確定しない。

## 5. Investigation Tasks

### Task 1: NFR-MA-020 / D-020 の Decision history を確定する

以下を時系列で確認する。

- `NFR-MA-020` が導入された commit
- `D-020` が導入された commit
- React Hook Form / Zod 方針に関する後続変更
- 適用対象を限定・変更・撤回した Decision / ADR / Plan / Project Context の有無
- Current architecture として別方式を正式採用した証拠の有無

必要に応じて以下を利用する。

- `git log`
- `git log -S`
- `git log -G`
- `git blame`
- repository 全文検索

#### Stop condition

後続の正式な superseding decision が見つかった場合も、その内容を事実として記録するだけで Requirement を変更しない。

### Task 2: Current Form inventory を作成する

Current implementation 上のユーザー入力を伴う UI を洗い出す。

最低限、以下に分類する。

- Web Authentication
- Web User / Profile
- Web Checkout
- Web Review 等の業務入力
- Web Admin CRUD
- Web Search / Filter
- Native Authentication
- Native 業務入力
- その他

各対象について以下を記録する。

| 項目 | 内容 |
| --- | --- |
| File | 実装ファイル |
| Screen / Purpose | 画面・用途 |
| Platform | Web / Native |
| Mutation | Mutation を伴うか |
| Search / Filter | Search / Filter か |
| Input type | `<form>` / React Native input 等 |
| RHF | 使用有無 |
| Zod | 使用有無 |
| zodResolver | 使用有無 |
| UI validation | UI 側 validation 方式 |
| Application validation | Application 側 validation 方式 |
| Literal gap | Literal 適用時に変更が必要か |

単純な `<form>` タグ件数だけで `Form` の対象範囲を決めない。

### Task 3: NFR-MA-020 Literal remediation の影響を算出する

`NFR-MA-020` を「ユーザー入力を持つ対象 Form で React Hook Form + Zod を使用する」と Literal に適用した場合の影響を整理する。

少なくとも以下を区別する。

- 小規模な置換で済む対象
- validation ownership に影響する対象
- Application contract に影響する対象
- Native dependency / architecture へ影響する対象
- Search / Filter に RHF + Zod を導入する場合の追加複雑性

以下を可能な範囲で数値化する。

- 対象 Form 数
- 現在 RHF 対応済みの数
- 現在 Zod 対応済みの数
- migration 対象数
- 主な変更ファイル数

実装は行わない。

### Task 4: NFR-MA-021 / D-021 の Decision history を確定する

以下を時系列で確認する。

- `NFR-MA-021` が導入された commit
- `D-021` が導入された commit
- `.web.tsx` / CSS Modules の採用理由
- `global.css` / shared tokens / React Native `StyleSheet` に関する後続変更
- CSS Modules 方針を意図的に置き換えた Decision / Plan / Architecture change の有無

Current implementation が `global.css` を使用しているという事実だけで `D-021` が失効したと判断しない。

### Task 5: Current styling inventory を作成する

最低限、以下を整理する。

- `.module.css` ファイル数
- `.web.tsx` ファイル数
- Web Admin component 数
- Web Layout component 数
- `global.css` の規模と責務
- `global.css` を利用している Admin / Layout
- shared token の定義・利用箇所
- Native shared UI の `StyleSheet` 利用状況
- Web / Native shared component の platform boundary

以下の3種類は明確に分離する。

- Web 専用 Admin
- Web 専用 Layout
- shared UI

### Task 6: NFR-MA-021 Literal remediation の影響を算出する

`NFR-MA-021` を Literal に維持する場合に必要な変更を整理する。

- `.web.tsx` 化対象
- CSS Modules 化対象
- `global.css` から移動する必要がある style
- shared tokens を維持できる範囲
- class 名変更による regression risk
- Playwright / selector / snapshot 等への影響
- migration 対象 component 数
- 主な変更ファイル数

実装は行わない。

### Task 7: NFR-MA-023 / D-026 の conflict を参考確認する

Current 方針が以下であることを repository evidence から確認する。

- TypeScript Type / Enum / Dexie Schema: Code が SSOT
- Markdown: 意味・理由を説明する文書

`domain_types.md`、`application_contracts.md`、その他関連 Markdown から、Markdown 自体が型契約の正本であるように読める記述を列挙する。

ここでは修正しない。

## 6. Required Output

Codex の最終報告は以下の構成にする。

### A. Executive Summary

最大10行程度で以下をまとめる。

- `NFR-MA-020`: Current decision の明確さ / superseding decision の有無 / Current implementation gap / Literal remediation 規模
- `NFR-MA-021`: Current decision の明確さ / superseding decision の有無 / Current implementation gap / Literal remediation 規模
- `NFR-MA-023`: 別 decision が必要か documentation remediation で扱えそうか

### B. Decision History

Requirement / Decision / 後続 Decision / Plan / Architecture change / commit を時系列で整理する。

### C. NFR-MA-020 Current Inventory

Form 単位の inventory table を提示する。

### D. NFR-MA-020 Impact Comparison

以下の3ケースを比較する。

1. Literal 維持
2. 適用対象を限定
3. Requirement を Current architecture へ更新

採用案は決めない。

### E. NFR-MA-021 Current Inventory

Styling architecture の inventory を提示する。

### F. NFR-MA-021 Impact Comparison

以下の2ケースを比較する。

1. Literal 維持して `.web.tsx` + CSS Modules へ migration
2. Current `global.css` + shared tokens を正式 architecture とする

採用案は決めない。

### G. NFR-MA-023 Documentation Conflict

矛盾する Markdown、該当箇所、Current code / D-026 との関係を列挙する。

### H. Unknowns

Repository 内の証拠だけでは判断できない項目を列挙する。

## 7. Decision Gate

調査完了後はそこで停止する。

Owner が調査結果を確認し、以下を決定するまで remediation implementation へ進まない。

### NFR-MA-020

- Literal 維持
- 適用対象を明文化して限定
- 新しい Decision で Current architecture へ変更

### NFR-MA-021

- Literal 維持
- 新しい Decision で Current styling architecture へ変更

既存 `D-020` / `D-021` を無言で書き換えず、方針変更する場合は superseding decision として履歴を残す。

## 8. Completion Criteria

以下をすべて満たしたら本調査を完了とする。

- [ ] `NFR-MA-020` / `D-020` の Git history を確認した
- [ ] Current Form inventory を作成した
- [ ] RHF / Zod / `zodResolver` の利用実態を数値化した
- [ ] `NFR-MA-020` Literal remediation の影響を整理した
- [ ] `NFR-MA-021` / `D-021` の Git history を確認した
- [ ] Current styling inventory を作成した
- [ ] `.module.css` / `.web.tsx` / Admin / Layout / shared UI の実態を数値化した
- [ ] `NFR-MA-021` Literal remediation の影響を整理した
- [ ] `NFR-MA-023` / `D-026` の documentation conflict を参考確認した
- [ ] superseding decision の有無を明示した
- [ ] Repository だけでは判断できない事項を `Unknown` として明示した
- [ ] Production / Test / Requirement / Decision / Traceability を変更していない
- [ ] PR #78 を変更していない
- [ ] Codex 自身で最終 Requirement decision を確定していない

## 9. Validation

調査開始前と終了時に、意図しない変更がないことを確認する。

最低限、以下を確認する。

```bash
git status --short
git diff --check
```

本 Plan 自体を除き、調査による repository change が発生していないこと。

## 10. Follow-up

調査結果を Owner がレビューした後、Owner 側で `NFR-MA-020` / `NFR-MA-021` の Current decision を確定する。

その判断を前提として、`CT-BOUNDARY-001` の残 remediation (`FR-AR-001`, `FR-AR-002`, `FR-AR-004`, `NFR-MA-020`, `NFR-MA-021`, `NFR-MA-022`, `NFR-MA-023`) を Requirement 単位で閉じる implementation plan を別途作成する。

PR #78 は remediation 完了まで merge しない。
