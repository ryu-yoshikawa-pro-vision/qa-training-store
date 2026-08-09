# Part 2-7: Quality GateとCI/CD

## 学習目標

- CIとCDの違いを説明できる。
- Required Check / Quality Gateの役割を理解できる。
- PR、main、Nightly、ManualへTest Suiteを配置できる。
- Build Artifact、Preview Deploy、Production Deploy、Deploy後Smokeの関係を理解できる。
- 「すべてのTestを毎回実行する」以外の設計を、Risk・Feedback速度・Costから考えられる。
- Job並列化、Artifact再利用、変更判定などのCI最適化を品質Gateを弱めずに考えられる。
- Scenario Shopの現在のCI/CD構成を設計判断として説明できる。

## 教材

**このモジュールでは、このリポジトリのWeb / Native CI/CD構成を使用します。**

主な参照先:

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- Cloudflare Pages Preview / Production経路

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

## Lesson 2: Required Checkを選ぶ

すべてのTestをRequiredにすれば安全とは限りません。

Requiredへ向くもの:

- 高い信頼性がある。
- 重要なRegressionを確認する。
- 実行時間が許容できる。
- Failure時に修正すべき対象が明確。

Requiredへ置く前に改善すべきもの:

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

## Lesson 4: CIとCD

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

## Lesson 5: Preview Environment

Pull RequestごとのPreviewは、Merge前に実際のDeploy環境で確認できる利点があります。

ただしPreviewには次の課題があります。

- Secret
- Hosting Cost
- Environment差
- Cleanup
- Fork PRのSecurity

Scenario ShopではCloudflare PreviewをRequired経路へ組み込んでいます。

なぜLocal BuildのTestだけではなくPreview Smokeも実行するか考えます。

## Lesson 6: Deploy後Smoke

Deploy Commandが成功しても、公開URLが正常に動作する保証にはなりません。

Deploy後Smokeでは最低限のCritical状態を確認します。

SmokeへRegression全件を入れるのではなく、公開成功を素早く判断するTestを選びます。

## Lesson 7: Artifactの一貫性

「TestしたArtifact」と「DeployしたArtifact」が違うと、Test結果の意味が弱くなります。

Scenario ShopではBuildした`dist/`をArtifactとして後続Jobへ渡します。

次を考えます。

- E2EしたArtifactは何か。
- PreviewへDeployしたArtifactは何か。
- Production SmokeしたArtifactは何か。

## Lesson 8: Fail-closed

上流Jobが失敗・想定外Skipしたとき、最終Gateが誤ってSuccessにならない設計が必要です。

Scenario Shopの`verify` / `validate`ではJob Resultを明示的に確認します。

「Workflowが最後まで走った」ことと「必要条件がすべて成功した」ことを区別します。

## Lesson 9: 並列化

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

## Lesson 10: Failure時の再実行Cost

大きな1Jobにすべて詰めると、後半だけ失敗しても最初から再実行する場合があります。

Scenario ShopのAndroid Build / Runtime分離は、この問題への一つの解決例です。

「成功済みの高コスト工程を再利用できるか」という観点を持ちます。

## Lesson 11: Quality Gateを弱める最適化を避ける

CIを速くするために次を安易に行いません。

- TestをSkipする。
- `continue-on-error`へする。
- Requiredを外す。
- Assertionを弱くする。
- Timeoutを無意味に伸ばす。

最適化は「必要な保証を維持したまま」行います。

## Lesson 12: Workflow自体をTestする

Scenario ShopにはCI WorkflowのContract Testがあります。

WorkflowもCodeであり、変更によって次が壊れる可能性があります。

- Required Job依存
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

## ハンズオン3: CI/CD Diagram

Scenario Shopの現在のWeb CI/CDを図示します。

最低限次を含めます。

- Quality
- Tests
- Automation Build
- Production Build
- Playwright
- verify
- Preview
- Smoke
- validate
- Production

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

## 完了条件

- PR / main / Nightly / ManualのTest配置案を作成している。
- Required Quality Gateを理由付きで設計できる。
- Scenario ShopのWeb CI/CD経路を図示・説明できる。
- Build Artifact、Preview、Production、Smokeの関係を説明できる。
- 品質Gateを弱めないCI改善案を1件以上説明できる。
