# Curriculum Self-study review checklist

この文書はCurriculumのSelf-study品質を確認するためのcriteria-only checklistです。個別のreview result、reviewer、日付、PASS履歴、Finding、Evidence、progressを保存する記録欄は持ちません。

## Audience / prerequisite depth

- 対象Learner、entry condition、前提知識、利用するRepository / Toolがlearner-facing materialだけで分かる。
- Common Required、Native specialization、Extension、Reference、Advancedの前提を明示し、選択しない内容をCommon completionの隠れた前提にしていない。
- Repository-required support asset、Instructor support、Learner Requiredの責務が分かれている。

## Navigation / skip / branch / rejoin

- Shared entryから各Lessonへ進む順序が一意である。
- Common routeのNext action、Native specializationのbranch、skip条件、rejoin先がLearner Required materialだけで分かる。
- Next actionはExercise、Self-check、Recovery、Completionより前に置かれていない。
- Optional、Legacy、Instructor assetへのリンクが必須経路に見えない。

## Goal → explanation → Exercise → Evidence → Self-check → Completion

- 学習目標と説明が、実際のExercise / Practiceで確認する判断へつながっている。
- Exerciseの対象、操作または設計作業、期待するEvidenceが具体的である。
- Self-checkは知識問題の最低回答要素、またはTrade-off問題の最低考慮事項と許容理由を示している。
- Completionは件数、Technique数、Baseline / stock PASSだけでなく、判断の質と成果物の対応を確認する。
- LearnerがSelf-checkからCompletionへ進む条件と、次に行う行動を自分で判断できる。

## Answerability without Instructor private knowledge

- 確認問題の回答に必要なSpec、BR / AC、Repository asset、用語、期待する判断範囲が公開資料から追える。
- 一意の模範解答を要求するTrade-offでは、最低考慮事項と許容される理由の範囲が分かる。
- Answer Key、講師だけが知る判断、未公開の環境状態をCompletionの判定根拠にしていない。

## Recovery

- 学習上の未理解と、Command、Permission、Account、Device、Toolchain、WorkflowなどのEnvironment blockを切り分ける入口がある。
- 失敗時に戻る最初の確認箇所、再確認するEvidence、再開するLessonまたはExerciseが有限に示されている。
- Baselineの再実行、Retry、既存成果物の存在だけをLearner-authored completionの代替にしていない。

## Common / Extension / Reference / specialization boundary

- Common routeだけで定義されたCompetencyとMinimum Evidenceを満たせる。
- Native specialization、Platform固有、Repository固有、Cross-role、Accessibility execution、Preview / Production、Advanced内容がCommon Requiredへ逆流していない。
- Nativeを選択しない場合のskipと、選択した場合の追加Evidence・rejoinが明示されている。
- ReferenceはCurrent値や運用支援への導線として扱い、Learner-facing learning / self-check / completionの第三SSOTになっていない。

## Command / Artifact / Environment block

- Command、Test、Artifactごとに、成功、学習上の失敗、Environment blockの意味が区別されている。
- Artifactは対象、操作、事象、取得元が対応し、Baselineとlearner-authored exerciseを混同しない。
- 現在のCommand、Workflow、Seed、Clock、Address、Platform値を教材へ複製せず、既存SSOTへ戻る参照経路がある。
- 外部Service、Secret、Quota、Physical deviceなどが必要な場合、Learner RequiredかInstructor supportかが明示されている。

## Terminology

- 一般説明は日本語中心で、Tool / Product / API / command / path / identifierは公式literalを維持している。
- Common Core、Native specialization、Extension、Referenceなどのclassification tokenが一貫している。
- BR / AC / ID grammar、machine-consumed heading、UI copyを不用意に翻訳または別表記にしていない。

## Spec reference safety

- Normative Specification、Supporting Source、Executable Canonical Sourceの責務を区別している。
- Specの曖昧さやProduct Decisionが必要な箇所を、教材側の推測やObserved Behaviorで埋めていない。
- Spec参照は該当Feature、BR / AC、State / Scenario sectionへ到達でき、値の第三SSOTを作っていない。

## 専門的なFindingの成立条件とEvidence

- 専門的な指摘は、対象File、heading / section、観察した問題と影響、最小修正、Disposition、resolvedを確認するValidationが一意に特定できる。
- 指摘のSeverityや優先度は、対象となる契約、学習経路、ユーザーへの影響と対応付けられている。
- resolvedの根拠は、該当LessonのSelf-check、Completion、Navigation、Spec参照、または実行Artifactなど、対象に適したEvidenceで確認できる。
- 過去のCandidate、別PR、Baselineの状態だけでCurrent Repositoryの指摘を確定していない。
- 追加のFinding DB、Evidence台帳、Scoring system、個別結果の保存欄を作らず、既存のRun Artifactまたは対象文書の責務を使う。

## Checklist boundary

- このchecklistはcriteriaの再利用に限定し、特定Runの結果や個別Learnerの判定を記録しない。
- 実際のwalkthroughでは、このcriteriaを使ってCommonの共通区間を1回確認し、Native / Advancedの差分だけを追加確認する。
