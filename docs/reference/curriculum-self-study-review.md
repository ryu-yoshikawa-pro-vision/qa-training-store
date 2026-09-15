# Curriculumの自主学習レビュー確認項目

この文書はCurriculumの自主学習品質を確認するための基準だけのchecklistです。個別のレビュー結果、reviewer、日付、PASS履歴、Finding、Evidence、progressを保存する記録欄は持ちません。

## 対象者 / 前提知識の深さ

- 対象Learner、entry condition、前提知識、利用するRepository / Toolが受講者向けmaterialだけで分かる。
- 共通課程の必須範囲、モバイルアプリ自動化の選択課程、Extension、Reference、Advancedの前提を明示し、選択しない内容を共通課程の修了の隠れた前提にしていない。
- リポジトリ必須の支援asset、講師支援、受講者必須の責務が分かれている。

## ナビゲーション / スキップ / 分岐 / 合流

- Shared entryから各Lessonへ進む順序が一意である。
- 共通課程の次の対応、モバイルアプリ自動化の選択課程の分岐、スキップ条件、合流先が受講者必須の教材だけで分かる。
- 次の行動は演習、自己確認、復旧、修了より前に置かれていない。
- 任意、Legacy、講師用資材へのリンクが必須経路に見えない。

## 目標 → 説明 → 演習 → 成果物 → 自己確認 → 修了

- 学習目標と説明が、実際の演習 / Practiceで確認する判断へつながっている。
- 演習の対象、操作または設計作業、期待する成果物が具体的である。
- 自己確認は知識問題の最低回答要素、またはTrade-off問題の最低考慮事項と許容理由を示している。
- 修了は件数、Technique数、Baseline / stock PASSだけでなく、判断の質と成果物の対応を確認する。
- 受講者が自己確認から修了へ進む条件と、次に行う行動を自分で判断できる。

## Instructorの非公開知識に依存しない回答可能性

- 確認問題の回答に必要なSpec、BR / AC、Repository asset、用語、期待する判断範囲が公開資料から追える。
- 一意の模範解答を要求するTrade-offでは、最低考慮事項と許容される理由の範囲が分かる。
- Answer Key、講師だけが知る判断、未公開の環境状態をCompletionの判定根拠にしていない。

## 復旧

- 学習上の未理解と、コマンド、Permission、Account、Device、Toolchain、Workflowなどの環境上の問題を切り分ける入口がある。
- 失敗時に戻る最初の確認箇所、再確認するEvidence、再開するLessonまたはExerciseが有限に示されている。
- Baselineの再実行、Retry、既存成果物の存在だけを受講者が作成した成果物による修了の代替にしていない。

## 共通課程 / 発展課題 / 参考資料 / 選択課程の境界

- 共通課程だけで定義されたCompetencyと最低限必要な成果物を満たせる。
- モバイルアプリ自動化の選択課程、Platform固有、Repository固有、Cross-role、Accessibility execution、Preview / Production、Advanced内容が共通課程の必須範囲へ逆流していない。
- Nativeを選択しない場合のskipと、選択した場合の追加Evidence・rejoinが明示されている。
- Referenceは現行値や運用支援への導線として扱い、受講者向けの学習 / 自己確認 / 修了の第三SSOTになっていない。

## コマンド / 成果物 / 環境上の問題

- コマンド、Test、成果物ごとに、成功、学習上の失敗、環境上の問題の意味が区別されている。
- Artifactは対象、操作、事象、取得元が対応し、Baselineとlearner-authored exerciseを混同しない。
- 現在のCommand、Workflow、Seed、Clock、Address、Platform値を教材へ複製せず、既存SSOTへ戻る参照経路がある。
- 外部Service、Secret、Quota、Physical deviceなどが必要な場合、受講者必須か講師支援かが明示されている。

## 用語

- 一般説明は日本語中心で、Tool / Product / API / command / path / identifierは公式literalを維持している。
- 共通課程、モバイルアプリ自動化の選択課程、Extension、Referenceなどの分類用の識別値が一貫している。
- BR / AC / ID grammar、machine-consumed heading、UI copyを不用意に翻訳または別表記にしていない。

## Spec参照の安全性

- Normative Specification、Supporting Source、Executable Canonical Sourceの責務を区別している。
- Specの曖昧さやProduct Decisionが必要な箇所を、教材側の推測やObserved Behaviorで埋めていない。
- Spec参照は該当Feature、BR / AC、State / Scenario sectionへ到達でき、値の第三SSOTを作っていない。

## 専門的なFindingの成立条件とEvidence

- 専門的な指摘は、対象File、heading / section、観察した問題と影響、最小修正、Disposition、resolvedを確認するValidationが一意に特定できる。
- 指摘のSeverityや優先度は、対象となる契約、学習経路、ユーザーへの影響と対応付けられている。
- 結果分類: 観測した事象をBug / UX / Suggestion / 未確定へ区別する。Bugは現行のNormative SpecificationのBR / ACに反することを再現条件とEvidenceで確認できる場合、仕様違反と断定できない利用上の懸念はUX、現行仕様違反ではなく新しい挙動・能力を求めるものはSuggestion、再現条件・仕様根拠・Evidenceが不足する場合は未確定として扱う。
- resolvedの根拠は、該当LessonのSelf-check、Completion、Navigation、Spec参照、または実行Artifactなど、対象に適したEvidenceで確認できる。
- 過去のCandidate、別PR、Baselineの状態だけで現在のリポジトリの指摘を確定していない。
- 追加のFinding DB、Evidence台帳、Scoring system、個別結果の保存欄を作らず、既存のRun Artifactまたは対象文書の責務を使う。

## 確認項目の境界

- このchecklistは基準の再利用に限定し、特定Runの結果や個別Learnerの判定を記録しない。
- 実際の確認手順では、この基準を使って共通課程の共通区間を1回確認し、Native / Advancedの差分だけを追加確認する。
