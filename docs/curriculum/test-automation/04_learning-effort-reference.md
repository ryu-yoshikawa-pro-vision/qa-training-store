# 学習工数参考

## 目的

この文書は、テスト自動化カリキュラムの学習計画を立てる際に参照する工数の目安をまとめたものです。

対象は、手動テストの実務経験はある一方で、プログラミング、JavaScript / TypeScript、Playwright、CLI、Git、GitHub、CIの経験がない受講者を想定します。

工数はCurrent Repositoryの教材、演習、Workbook、Training Asset、自己確認、完了条件、Competency Rubricのbounded Level 2を基準にした現時点の想定です。受講実績から算出した統計値ではありません。

各Sectionの「標準工数の想定」は、指定した受講者が通常の範囲で学習する場合の計画用の幅です。「全体の想定範囲」は、初学者ごとの試行錯誤や復習量の差を広く含めた参考範囲であり、通常の学習計画の下限・上限としてそのまま使うことは想定していません。

Dependency download、Build、GitHub Actionsの待機など、本人が操作していない時間は学習工数に含めません。初回環境準備は別に記載します。

## 学習経路

Commonの標準経路は次のLessonです。

- Part 1: P1-1〜P1-6、P1-8、P1-9
- Part 2: P2-1〜P2-5、P2-7、P2-8

Native specializationはCommonから分離し、次を追加工数として扱います。

- P1-7 Maestro
- P2-6 Native CI

`part1/09_specification-agentic-qa.md`、`part1/10_part1-capstone.md`、各Lesson内のAdvanced / Extensionは標準Common工数に含めません。

## Part 1 Common

| Section | 主な内容 | 教材理解 | 演習・実装 | 試行錯誤・復習 | 標準工数の想定 | 全体の想定範囲 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| P1-1 テスト自動化の基礎 | Scenario Shopの手動操作、自動化候補・非候補の判断、理由説明 | 0.5〜1.0h | 0.5〜1.0h | 0.25〜0.5h | 2.0〜2.5h | 1.5〜3.5h |
| P1-2 Scenario Shopの探索とテスト対象分析 | Role、State、Journey、Cart、Checkout、Spec / Seedの確認 | 1.0〜1.5h | 1.5〜2.0h | 0.5〜1.0h | 3.5〜4.5h | 2.5〜6.0h |
| P1-3 テスト設計と自動化対象選定 | Risk、同値分割、境界値、Decision Table、Test Layer、自動化判断 | 1.5〜2.5h | 2.0〜3.5h | 1.0〜1.5h | 5.0〜7.0h | 3.5〜9.5h |
| P1-4 Playwright基礎 | CLI、Node.js、pnpm、最小限のJavaScript / TypeScript、Locator、Assertion、Auto-wait | 2.0〜2.5h | 3.0〜4.0h | 1.5〜2.5h | 7.0〜9.0h | 5.0〜12.0h |
| P1-5 Playwright E2E実践 | Cart、境界条件、Checkout阻止、Reset、Desktop / Mobile、WorkbookとのTraceability | 1.5〜2.0h | 3.5〜6.0h | 1.5〜3.0h | 6.5〜11.0h | 4.5〜15.0h |
| P1-6 テスト実行・結果分析・改善 | Trace、Screenshot、Video、Failure分類、cause / action / re-run Evidence | 1.0〜2.0h | 2.0〜3.5h | 1.0〜2.0h | 4.5〜7.0h | 3.5〜9.5h |
| P1-8 テスト管理と保守性改善 | Helper、POM、Fixture、Seed、実在する保守問題の診断と最小改善 | 2.0〜2.5h | 2.5〜3.5h | 1.5〜2.0h | 6.5〜8.0h | 4.5〜10.5h |
| P1-9 Part 1総合演習 | Spec → Risk → Test Case → Playwright → Evidenceの統合、既存成果物の再利用 | 0.5〜1.0h | 2.0〜3.5h | 0.5〜1.5h | 3.5〜6.0h | 2.5〜8.0h |

### Part 1 Common合計

- 標準工数の想定: **38.5〜55時間**
- 全体の想定範囲: **27.5〜74時間**

P1-4〜P1-8は、コード作成、失敗分析、既存コード読解、保守改善が連続するため、Part 1の中でも工数差が出やすい区間です。

## Part 2 Common

| Section | 主な内容 | 教材理解 | 演習・実装 | 試行錯誤・復習 | 標準工数の想定 | 全体の想定範囲 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| P2-1 ソフトウェア開発プロセスと変更管理 | Review、Test、Build、Deploy、Smokeと自動テストの位置付け | 1.0〜1.5h | 0.5〜1.5h | 0.5h | 2.0〜3.0h | 1.5〜4.0h |
| P2-2 Gitによるバージョン管理 | Working Tree、Staging、Commit、Branch、Diff、History | 1.5〜2.0h | 2.0〜3.5h | 1.0〜2.0h | 4.5〜7.0h | 3.0〜9.5h |
| P2-3 GitHub・Pull Request・Review | Remote、Fork、Push、PR、self-review、review record | 1.0〜1.5h | 2.0〜3.0h | 1.0〜1.5h | 4.0〜6.0h | 2.5〜8.0h |
| P2-4 CIとGitHub Actions | YAML、Trigger、Job、Step、Runner、Context、Permission、prepared workflowの読解 | 1.5〜2.5h | 1.5〜2.5h | 1.0〜1.5h | 4.5〜6.0h | 3.0〜8.5h |
| P2-5 PlaywrightをCIで実行する | learner-authored TestのPR実行、Artifact、Expected Failure、Failure stage | 1.5〜2.0h | 2.0〜4.0h | 1.0〜2.0h | 5.0〜7.5h | 3.5〜10.0h |
| P2-7 Quality GateとCI/CD | Required Gate、Artifact、fail-closed、bounded Web CI設計 | 1.5〜2.0h | 1.5〜2.5h | 1.0h | 4.0〜5.5h | 3.0〜7.5h |
| P2-8 Part 2導入設計演習 | Current State、Risk、Web CI、Gate、Artifact、Failure reasoningの統合 | 1.0〜2.0h | 3.0〜4.0h | 1.0〜2.0h | 5.0〜8.0h | 3.5〜10.5h |

### Part 2 Common合計

- 標準工数の想定: **29〜43時間**
- 全体の想定範囲: **20〜58時間**

Git、GitHub、CIはPart 2で初めて扱う領域です。特にP2-2は、Working Tree、Staging、Commit、Branchという状態モデルへの習熟量によって工数差が出やすい区間です。

## Common合計

| 範囲 | 標準工数の想定 | 全体の想定範囲 |
| --- | ---: | ---: |
| Part 1 Common | 38.5〜55h | 27.5〜74h |
| Part 2 Common | 29〜43h | 20〜58h |
| **Part 1 + Part 2 Common** | **67.5〜98h** | **47.5〜132h** |

通常の学習計画では、Common全体を**約80〜85時間**を中心値として置き、**67.5〜98時間**を標準工数の想定として扱います。

`47.5〜132時間`は、各Sectionの個人差を広く含めた参考範囲です。全Lessonを一貫して最短または最長で進むことを前提とした通常の計画範囲ではありません。

## Native specialization

Native specializationはCommon修了条件とは分離し、追加工数として扱います。

| Section | 主な内容 | 教材理解 | 演習・実装 | 試行錯誤・復習 | 標準工数の想定 | 全体の想定範囲 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| P1-7 MaestroによるNative UI自動化 | YAML、UI Test ID、Deep Link、Test Control、Cart Flow、Physical Android Evidence | 1.5〜3.0h | 3.0〜4.5h | 1.5〜2.5h | 6.0〜9.5h | 4.0〜13.0h |
| P2-6 Native CIとMaestro | Android Build、Emulator、Install、Maestro、Artifact、Failure分析、iOS Build-only比較 | 1.5〜3.0h | 2.5〜4.5h | 1.5〜2.0h | 5.5〜9.0h | 4.0〜12.5h |

### Native specialization合計

- 標準工数の想定: **11.5〜18.5時間**
- 全体の想定範囲: **8〜25.5時間**

CommonとNative specializationをすべて受講する場合、標準工数の想定は**79〜116.5時間**です。学習計画では、Common約80〜85時間にNative約15時間を追加する想定を基準にします。

## 初回環境準備

初回環境準備は学習工数と分けて扱います。

| 環境 | 主な作業 | 標準工数の想定 | 全体の想定範囲 |
| --- | --- | ---: | ---: |
| Web / Playwright | Node.js、pnpm、Dependency、Playwright Browser、Repository / Copy、`PLAYWRIGHT_BASE_URL`、baseline確認 | 2.0〜4.0h | 1.0〜6.0h |
| Git / GitHub | Git、GitHub Account、認証、Fork / Training Copy、Remote、Actions利用確認 | 1.5〜3.0h | 1.0〜5.0h |
| Native | JDK、Android SDK、Platform Tools、ADB、Physical Android Device、Maestro、Build / Install、baseline確認 | 5.0〜7.5h | 3.0〜11.0h |

### 環境準備の合計

- Common環境準備: 標準 **3.5〜7時間**、全体の想定範囲 **2〜11時間**
- Native環境準備追加: 標準 **5〜7.5時間**、全体の想定範囲 **3〜11時間**
- Common + Native環境準備: 標準 **8.5〜14.5時間**、全体の想定範囲 **5〜22時間**

Download、Build、GitHub Actions queue / runなど、本人が操作していない待機時間はこの表に含めません。

## 参照時の扱い

この工数はカリキュラム内容を固定する仕様ではなく、学習計画を作成するための参考値です。

通常の計画では「標準工数の想定」を使用し、「全体の想定範囲」は受講者ごとの個人差を広く確認するための参考値として扱います。

教材、演習、完了条件、Training Assetが変更された場合は、変更後の内容を基準に見直します。
