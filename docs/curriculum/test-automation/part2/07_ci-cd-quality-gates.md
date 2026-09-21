# Part 2-7: Quality GateとCI/CD

## 学習目標

- 対象範囲を限定したWeb CIのQuality Gate、Artifact、失敗時の記録、fail-closed条件を説明できる。
- CIとCDの違いを説明できる（CDの詳細は発展課題・参考資料）。
- 必須Check / Quality Gateの役割を理解できる。
- PR、main、Nightly、ManualへTest Suiteを配置できる。
- Web Build / Test Artifactと失敗時の記録の関係を理解できる。
- Preview Deploy、Production Deploy、Deploy後Smokeは発展課題・参考資料として比較できる。
- 「すべてのTestを毎回実行する」以外の設計を、Risk・Feedback速度・Costから考えられる。
- Job並列化、Artifact再利用、変更判定などのCI最適化を品質Gateを弱めずに考えられる。
- Scenario Shopの対象範囲を限定したWeb CI構成を設計判断として説明できる。

## 教材

**このモジュールでは、このリポジトリのWeb / Native CI/CD構成を使用します。**

主な参照先:

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `scripts/validate-curriculum.ts`
- `training/github-actions/`
- Cloudflare Pages Preview / Production経路

## 共通課程の必須範囲

共通経路では、対象範囲を限定したWeb CIについて、Mergeを止めるQuality Gate、確認対象のBuild / Test Artifact、失敗または想定外SkipをSuccessにしないfail-closedの判断を行います。Preview / Production delivery、Native CI、vendor固有の運用、Level 3の改善設計は発展課題・参考資料またはモバイルアプリ自動化の選択課程です。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-5のTraining Copy上のWeb CI Run／Check／Artifact／Execution Receipt、P2-4のWorkflow境界、P1からのCase／コード／Evidence、Native選択時はP2-6の別枠記録 |
| Activity | 必須Check、Gate、Artifact、Failure／Skip、PR／main／Nightly／Manualの配置を比較し、Risk・Feedback速度・CostからWeb CIの範囲を設計する |
| Observation | どの条件でMergeを止めるか、Failureと想定外Skipをどう扱うか、Artifactが原因調査へどうつながるか、Web CommonとNative／CDの境界 |
| Output | `handoff-root/self-check/P2-07.md`へQuality Gate設計、対象Test／Trigger／Artifact／Failure時の対応表、P2-8へ渡すRun／Check／Artifact／Case参照を記録する。Mermaid等の図や補足Evidenceが必要なら既存`handoff-root/evidence/`へ置き、P2-07.mdから参照する |
| Self-check | GateとTest、BuildとArtifact、SkipとSuccess、PR／main／Nightly／Manualの違い、最小権限とfail-closedの理由を説明する |
| Completion | 対象範囲を限定したWeb CIのGateを理由付きで設計し、P2-5の実行記録と対応付けられる。Native／Preview／ProductionをCommonの必須条件へ混ぜない |
| Recovery | Gateの理解不足はP2-4／P2-5のRunとWorkflowへ戻る。GitHub外部状態を確認できない場合はEvidence不足／環境として記録し、APIや追加Tokenを前提にしない |
| Handoff | `handoff-root/self-check/P2-07.md`を設計資料とSelf-checkの正本としてP2-8へ渡す。対象Case／code Path、Trigger、Run／Check／Artifact、Failure対応を含め、Native選択記録は別枠で示す |

## Lesson 1: Quality Gate

Quality Gateは、次の工程へ進むために満たすべき条件です。

例:

```text
Pull Request
↓
Lint / Typecheck / Test / Build
↓
Required Gate
↓
Merge可能
```

Testを実行するだけではなく、Failure時に先へ進ませないことが重要です。

## Lesson 2: 必須Checkを選ぶ

すべてのTestを必須にすれば安全とは限りません。

必須に向くもの:

- 高い信頼性がある。
- 重要なRegressionを確認する。
- 実行時間が許容できる。
- Failure時に修正すべき対象が明確。

必須にする前に改善すべきもの:

- 頻繁にFlakyになる。
- 外部依存で不安定。
- 数時間かかる。
- FailureがActionableでない。

Quality Gateは厳しさだけでなく信頼性が重要です。

## Lesson 3: PR / main / Nightly / Manual

実行タイミングごとに目的を整理します。

### PR

早いFeedbackとMerge前のRegression検出。

### main

統合後のより広い確認やProductionへつながるGate。

### Nightly

長時間・多Browser・広いRegressionなど、PR Feedbackを遅くしたくない検証。

### Manual

高コスト、調査目的、Release前など人間が意図的に起動する検証。

案件によって最適配置は異なります。

## Lesson 4: CIとCD（発展課題・参考資料）

CIは変更統合時のBuild / Testなどの自動検証を中心に扱います。

CDでは、検証済みArtifactを環境へDelivery / Deployする流れまで扱います。

Scenario ShopのWebでは概念的に次の経路があります。

```text
Build / Test
↓
verify
↓
Preview Deploy
↓
Preview Smoke
↓
validate
↓
mainではProduction Deploy
↓
Production Smoke
```

## Lesson 5: Preview Environment（発展課題・参考資料）

Pull RequestごとのPreviewは、Merge前に実際のDeploy環境で確認できる利点があります。

ただしPreviewには次の課題があります。

- Secret
- Hosting Cost
- Environment差
- Cleanup
- Fork PRのSecurity

Scenario Shopの既存CIにはCloudflare Previewの経路がありますが、これは共通課程の必須範囲ではなく、Preview環境を比較する発展課題・参考資料の題材です。

なぜLocal BuildのTestだけではなくPreview Smokeも実行するか考えます。

## Lesson 6: Deploy後Smoke（発展課題・参考資料）

Deploy Commandが成功しても、公開URLが正常に動作する保証にはなりません。

Deploy後Smokeでは最低限のCritical状態を確認します。

SmokeへRegression全件を入れるのではなく、公開成功を素早く判断するTestを選びます。

## Lesson 7: Web Artifactと失敗時の記録（共通課程の必須範囲）

「TestしたWeb Artifact」と、後続工程で確認するArtifactの関係を明確にすると、Test結果の意味を追跡しやすくなります。

Scenario ShopではBuildした`dist/`をArtifactとして後続Jobへ渡します。

次を考えます。

- E2EしたArtifactは何か。
- E2E Failure時に確認するArtifactは何か。
- Preview / ProductionへDeployするArtifactは何か（発展課題・参考資料）。

## Lesson 8: Fail-closed

上流Jobが失敗・想定外Skipしたとき、最終Gateが誤ってSuccessにならない設計が必要です。

Scenario Shopの`verify` / `validate`ではJob Resultを明示的に確認します。

「Workflowが最後まで走った」ことと「必要条件がすべて成功した」ことを区別します。

Curriculum側でも `validate:curriculum` とTraining Web baselineを共通課程の確認対象へ接続します。Training Maestro baselineはモバイルアプリ自動化の選択課程・支援の確認対象であり、共通課程の必須範囲へ逆流させません。Intentional FailureはManual / Instructor向けの実際のFAILを確認するためのもので、通常の必須PASSへ混在させません。

## Lesson 9: 並列化（発展課題・参考資料）

独立した処理は並列化するとWall-clockを短縮できます。

例:

- Style Quality
- Code Quality
- Unit / Integration
- Build

ただし次は考慮します。

- Runner起動Cost
- Dependency Install重複
- Artifact Transfer
- Job依存

Job数を増やすこと自体を最適化と呼びません。

## Lesson 10: Failure時の再実行Cost（発展課題・参考資料）

大きな1Jobにすべて詰めると、後半だけ失敗しても最初から再実行する場合があります。

Scenario ShopのAndroid Build / Runtime分離は、この問題への一つの解決例です。

「成功済みの高コスト工程を再利用できるか」という観点を持ちます。

## Lesson 11: Quality Gateを弱める最適化を避ける

CIを速くするために次を安易に行いません。

- TestをSkipする。
- `continue-on-error`へする。
- 必須指定を外す。
- Assertionを弱くする。
- Timeoutを無意味に伸ばす。

最適化は「必要な保証を維持したまま」行います。

## Lesson 12: Workflow自体をTestする（発展課題・参考資料）

Scenario ShopにはCI WorkflowのContract Testがあります。

WorkflowもCodeであり、変更によって次が壊れる可能性があります。

- 必須Job依存
- Artifact Upload / Download
- Skip条件
- Fail-closed
- Secret Scope

高度なCIではWorkflowの構造を自動Testする考え方も学びます。

## ハンズオン1: Test実行タイミング設計

Part 1で作成したTestを次へ配置します。

- PR
- main
- Nightly
- Manual

各Testについて理由を記録します。

## ハンズオン2: Quality Gate設計

PR Merge前に必須とするJobを選びます。

次をBalanceします。

- Risk
- Execution Time
- Flakiness
- Runner Cost
- Failure時のActionability

## ハンズオン3: 対象範囲を限定したWeb CIの図（共通課程）

Scenario Shopの現在のWeb CIを、共通課程の必須範囲で図示します。Preview / Production / Smokeを含める場合は発展課題・参考資料と明記します。

最低限次を含めます。

- Quality
- Tests
- Automation Build
- Playwright
- verify
- validate
- Artifact
- Final Gate

Preview、Production、Deploy後Smokeは別の発展課題・参考資料の図として比較できます。

## ハンズオン4: 改善案を考える

現在のCIへ対して、品質を弱めずに改善可能な点を1件以上考えます。

実際に変更する必要はありません。

例:

- Job境界
- Cache
- Artifact
- Test Suite配置
- Change detection

## 確認問題

1. Quality GateへすべてのTestを入れない理由は何か。
2. Preview SmokeとLocal Production Artifact Smokeの違いは何か。
3. TestしたArtifactとDeploy Artifactを一致させる価値は何か。
4. `continue-on-error`でCIを通しやすくすることが危険なのはなぜか。
5. Job並列化が必ず高速化につながるわけではない理由は何か。
6. Workflow Contract Testにはどんな価値があるか。

## 自己確認

次を自分の対象範囲を限定したWeb CI設計、Gate条件、Artifact、失敗時の記録で確認できれば、共通課程の修了を自己判定できます。

- どのWeb Build / Testを必須Gateへ置くかをRisk、信頼性、Feedback速度、Cost、Actionabilityの理由付きで選べる。
- TestしたArtifactと後続で確認するArtifactを対応付け、Failure時に確認するArtifactを説明できる。
- 上流JobのFailureまたは想定外Skipを最終GateがSuccessにしない条件を説明できる。
- `continue-on-error`、必須指定の解除、Assertion弱体化でGateを通しやすくする設計を採用していない。
- Preview / Production、Native、vendor detail、Level 3改善は発展課題・参考資料または選択課程として分類し、共通課程の必須範囲へ混ぜていない。

### Recovery

Gate設計が曖昧な場合は、まず「止めるFailure」「残すArtifact」「失敗時の確認先」の3点へ戻します。CIが動かない場合はWorkflow、Job、Artifact、Environmentを切り分け、想定外Skipなら条件とJob Resultを確認します。Preview / ProductionやNativeの詳細へ進みすぎた場合は、対象範囲を限定したWeb Gateへ戻って共通課程の最小条件を確定します。

## 完了条件

- 対象範囲を限定したWeb CIについて、必須のQuality Gate、Build / Test Artifact、失敗時の記録、fail-closed条件を理由付きで設計できる。
- Test配置やQuality Gateの判断をRisk、Feedback速度、Cost、Flakiness、Actionabilityで説明できる。
- Preview / Production、Native、vendor固有の詳細、Level 3改善は共通課程の修了の必須条件にしていない。

## 次の行動

対象範囲を限定したWeb CIの設計を最終Integration設計へ接続するため、[P2-8: 導入設計演習](08_integration-design-capstone.md)へ進みます。Preview / Production deliveryやNative差分は必要な場合だけ発展課題・参考資料として比較します。
