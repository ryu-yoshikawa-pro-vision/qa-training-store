# カリキュラム妥当性レビュー計画

## Objective

- 前回のRepository全体調査Evidenceと今回確定されたQ1〜Q7を用い、qa-training-storeのカリキュラムが狙うTest Automation人材を育成できるかを、目的・対象者・Competency・順序・Practice・Assessment・Required境界から評価する。
- 改善は追加より統合・移動・Optional化・深さ調整を優先し、実装PlanではなくReview FindingとTarget Structureまでを確定する。

## Scope

- In: Required Curriculum 22文書、Optional/Legacy境界、Training assets、Workbook、Rubric、Validator、Formal Regressionとの教材上の接点、Current Documentation driftのCurriculum影響。
- Out: Product/Test/Curriculum/既存docs/CI/configの変更、Git操作、Issue/PR、外部review、Test Strategy全面レビュー、Refactoring、LMS/Framework導入。

## Assumptions

- 通常文書はCurrent Documentationであり、明示history/archive/legacy以外の古い記述はDocumentation Driftとして扱う。
- Learner EvidenceはLocal/Training Copy、Workbook、作成Test、Playwright/Maestro/CI Artifact、Part 2 Git履歴、Instructor Rubric評価で構成し、外部LMSを仮定しない。
- 正式な学習時間・講師支援量・実測時間は未定義であり、架空の時間は置かず、項目数・環境・Practice・Evidenceから構造的負荷だけを評価する。
- Native baselineは環境/Harness確認、exerciseはLocal Android実機+MaestroでLearnerが編集・実行する対象である。
- Repository外のScreen Reader/Security/Performance Evidenceを仮定しない。ただしCurriculum Required Outcomeでない欠落はFindingにしない。
- Formal/Trainingが同一CI Infrastructureを再利用すること自体は問題とせず、境界崩壊の具体的Evidenceがある場合だけFindingにする。
- Full Web/Native Pixel Parityは目標外で、Business Semantics・情報順・Product Rule・基本Design Conceptの整合を対象とする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示に従いRepository Evidence、確定前提、合理的ASSUMPTIONの順で最後まで完遂する。
- 仮定してよい細部: CompetencyとLessonの直接IDがない箇所はLearning Objective、Exercise、Completion Criteriaから対応を再構成する。
- 未回答の重要質問: 学習時間とpilot実測は存在しないため、Review結論の確信度を下げる制約として扱う。

## Hypotheses

- H1: North StarはPlaywright Operatorではなく、Spec/Risk/Layer/Automation判断から継続運用まで扱うTest Automation Engineerである。
- H2: 思想と大枠の順序は妥当だが、Part 1のC01〜C10 Level 2一括要求、Android Runtime Required、Evidence/C-ID mappingに過負荷または評価妥当性の問題がある。
- H3: Part 2はTest AutomationをDeliveryへ組み込む目的を維持する一方、Git/GitHub/Actionsの詳細と現行CI内部契約の一部はLearner Coreより深い可能性がある。
- H4: 新Lessonの大量追加は不要で、既存LessonのCore/Required/Optional/Advanced/Reference再分類とPractice深さ調整で主要問題を解ける。

## Review Approach

- Review Skillのfindings-first、severity、根拠、影響、推奨方向、confidenceを適用する。
- 差分Reviewではないためdiff triageをCurriculum scope triageへ置き換え、22 Required文書の全件確認後にdeep reviewする。
- North Star → Core Outcome → Competency → Lesson → Exercise → Evidenceの逆算と、Lesson順方向のPrerequisite確認を両方行う。

## Definition of Done

- North Star、Audience、Part 1/2、C01〜C12、全Required Lesson、Practice/Level、Assessment、Required/Optionalを評価する。
- FindingをSeverity/Category/Evidence/Why/Recommended direction付きで整理する。
- 維持すべき設計、Target Structure、P0/P1/P2/No Change候補、次のTest Strategy Review Inputを提示する。
- 重要Lesson読み飛ばし、好みFinding、追加偏重、North Starとの非接続を自己レビューする。
- Run Artifactをsanitizeし、標準4 Artifact以外を変更しない。

## Risks / Unknowns

- Learner実測データがないため、負荷評価は構造的評価であり実時間の断定はしない。
- Documentation DriftはCurriculum判断を誤らせる箇所だけFindingにし、Product Documentation全体の修正Scopeへ拡大しない。
- Formal Product Qualityの高度なcontractをLearner Requiredへ自動昇格させない。

## Thinking Log

- 2026-08-24 06:33 JST: 今回はReview-onlyであり、`code-review` Skillを適用する。実装差分がないため、Skillのdiff起因制約はCurrent Curriculum全体という明示scopeに読み替える。
- 2026-08-24 06:33 JST: 前回Runは完了済みで、ユーザーが別タスク開始を明示したため新規Runを使用する。
- 2026-08-24 06:52 JST: Required 22文書を全件再読した。North Starは一貫する一方、canonical Part 1 Capstoneが37行に圧縮され、P1-7のPhysical Android toolchainと大量EvidenceがC08のLevel 2判定へ直結している点、P1-8が14 Lesson/6 hands-onを持つ点、P2-2/P2-4/P2-6の運用詳細が厚い点をdeep review対象へ固定した。
- 2026-08-24 06:52 JST: Optional Agentic QAとLegacy Capstoneは境界が明示され、Requiredへ混入していない。Legacyはcanonicalより詳細だがRequired本数差があるため、内容を正本として評価しない。
- 2026-08-24 07:05 JST: Recommended North Starを「Normative SpecificationとBusiness Riskから代表条件、Layer、Automation可否を判断し、Web中心の再現可能なTestを実装・診断・保守し、安全なCIへ接続できるentry-level Test Automation Engineer」とした。Nativeとfull multi-platform deliveryはspecializationとする。この判断は、汎用的なTest Automation人材像を優先するASSUMPTIONに依存し、全卒業者をmobile automation担当へ配置する明示要件がある場合だけC08 Optional判断が変わる。
- 2026-08-24 07:05 JST: Part 1の大順序、Test DesignのSpec/Risk起点、Failure→Maintainabilityの順、Part 2のGit/CI境界は維持する。負荷問題はLesson追加でなく、P1-5/P1-8/P1 CapstoneのCore深度、C08必修、C04/C09/C10 Evidence、P2 operational detail、C12 scopeを調整する。
- 2026-08-24 07:05 JST: Curriculum validatorは意味的なCompetency mappingを保証しない。再実行は`node_modules`未導入により`tsx`が見つからず停止し、同条件で再試行しない。Source読解による構造確認と教育妥当性Reviewを継続する。
