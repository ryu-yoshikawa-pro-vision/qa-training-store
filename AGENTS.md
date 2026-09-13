# Codex Working Agreement

Codex は、このリポジトリで作業するとき、ユーザーの明示指示と対象範囲を優先し、この文書と必要時に指定された正本へ従うこと。

## 1. 基本原則と常駐契約

- 関係のない変更を行わない。ただし、品質ゲートfailureに対してRepository-wide repair policyが適用される場合は、その契約に従う。
- Repositoryの既存Skill、Harness、validator、rules、Hookを優先し、同じ契約を別文書へコピーしてSSOTを増やさない。
- default branch（`main` / `master`）へ直接commit / pushしない。force push、未承認の破壊的操作、command-based deletionは行わない。
- delete / rename / move、Git mutation、外部副作用、権限・credentialを伴う操作は、既存のSafety / Git safety契約と必要な承認に従う。
- `apply_patch`は通常のファイル編集に使えるが、削除・rename・moveを許可するものではない。
- 品質ゲートFAILを原因未確認のまま完了扱いにしない。
- ユーザー向け出力とRun Artifactは原則日本語で記録する。

## 2. Skill / Workflow routing

- 複雑なtask、明示的な計画、Plan Modeでは [`feature-plan Skill`](.agents/skills/feature-plan/SKILL.md) を使う。Repository固有の保存先、filename、active Run lifecycleは [`PLANS.md`](PLANS.md) を参照する。
- reviewまたは`/review`では [`code-review Skill`](.agents/skills/code-review/SKILL.md) を使い、Repository固有のcoding / review persistenceは [`CODE_REVIEW.md`](CODE_REVIEW.md) を参照する。
- review findingまたはvalidation failureの修正では [`repair-loop Skill`](.agents/skills/repair-loop/SKILL.md) と [`docs/reference/repair-loop.md`](docs/reference/repair-loop.md) を使う。bounded workflowを無制限に再試行しない。
- harness自体の改善候補では [`harness-improvement Skill`](.agents/skills/harness-improvement/SKILL.md) と [`docs/reference/harness-improvement-loop.md`](docs/reference/harness-improvement-loop.md) を使い、実装修正と分離する。
- Agentic QA / 実Runtime操作では [`exploratory-qa Skill`](.agents/skills/exploratory-qa/SKILL.md)、`QA_AGENT.md`、`docs/reference/agentic-qa-workflow.md`を参照し、QA探索中にProduct Codeを変更しない。
- Windows Android tooling、Release APK、physical device、Maestro、Native failureでは [`android-native-local-validation Skill`](.agents/skills/android-native-local-validation/SKILL.md) と`docs/native/**`を参照する。Android / Nativeの詳細をrootへ戻さない。
- チャットで合意したPlanを実装へ移す前に、`docs/plans/`へ保存する。

## 3. 必要時参照とRun入口

通常taskの開始時に、root以外の文書を一律で読み込まない。必要性がある場合だけ次を参照する。

- Product / architecture / repository contextが変更判断に必要な場合: `docs/PROJECT_CONTEXT.md`。
- 対象領域の既存設計判断を変更・依存する場合: `docs/adr/`。
- active Runの継続、過去Runのevidence、Run運用やProgress詳細が必要な場合: `.codex/runs/`、[`docs/reference/run-artifacts.md`](docs/reference/run-artifacts.md)、[`docs/reference/codex-implementation-harness.md`](docs/reference/codex-implementation-harness.md)。
- Safety Harness詳細、破壊的操作、`docs/reports/`作成判断が必要な場合: [`docs/reference/codex-safety-harness.md`](docs/reference/codex-safety-harness.md)。
- Git branch / refspec / recoveryが必要な場合: [`docs/reference/git-branch-safety.md`](docs/reference/git-branch-safety.md)。

Runを使うtaskでは `scripts/new-run.sh` または `scripts/new-run.ps1` を入口とし、同一会話・同一taskのactive Runを再利用する。Run Artifactの保存、machine-managed manifest、checkpoint、sanitizationの詳細は`run-artifacts`、implementation harness、Safety referenceへ委譲する。

## 4. 品質ゲートとrepairの高レベル契約

- failureは最初の異常と派生エラーを分け、baseline、current diff、shared dependency、test / CI contract、実行環境を確認して原因を分類する。
- 原因がcurrent change、verification requirement、独立した既存問題のいずれであっても、現在の権限内で安全な最小修正が可能なら、baseline・既存・今回のdiffとの無関係だけを理由に保留せず、現在のtaskで修正して関連ゲートを再実行する。
- destructive operation、permission不足、secret / credential操作、不可逆な外部副作用、要件判断、Repositoryのretry停止条件に該当する場合はrepairを停止する。
- 停止時は根拠、因果関係評価、未実行検証、次の対応をRun Artifactとユーザー向け報告へ記録する。詳細な原因分類・停止・記録は`docs/reference/repair-loop.md`とrepair-loop Skillの正本に従う。

## 5. file-changing task、Progress、報告

- repository fileを変更してcommit対象差分を作るfile-changing taskは、ユーザーがGit操作を明示禁止した場合を除き、local-onlyで完了扱いにしない。GitHub metadataのみ、review-only、plan-only、調査のみ、質問、状態確認、file変更を伴わない分析には適用しない。
- file-changing taskのcommit / push / PR / CI lifecycle、CI連動Progress、tracked Run Artifactのfinal commit前確定は [`docs/reference/codex-implementation-harness.md`](docs/reference/codex-implementation-harness.md) を正本とする。
- Progressは `Progress: <NN>% (<done>/<total>)` で報告し、未完了なら`Next`を示す。基本計算は [`docs/reference/run-artifacts.md`](docs/reference/run-artifacts.md) に従う。
- すべてのユーザー向け返答には5件以内の`Summary`、Progress、必要な`Next`、実行コマンド・結果と主要ファイルを含む`Evidence`を含める。
- `docs/reports/`のdurable report作成判断は [`docs/reference/codex-safety-harness.md`](docs/reference/codex-safety-harness.md)、review固有は`CODE_REVIEW.md`、Run-local `REPORT.md`は`run-artifacts`を参照する。

## 6. Living documentation、Git、PR

- プロジェクト理解が変わった場合だけ`docs/PROJECT_CONTEXT.md`を更新し、その履歴を`docs/history/`へ残す。重要な設計判断は`docs/adr/`へ記録する。
- Git mutationを行う前後のbranch、PR head、remote、stage、recovery確認はGit safety referenceへ従う。既存PRがあればそれを使い、PRがない場合の作成条件はimplementation harnessへ従う。
- Codexが作成・更新するPRのtitle / body / headingsは、明示指定がない限り日本語とする。技術識別子は原文を維持する。
- 検証は必要なformatter / lint / typecheck / test / build / `scripts/verify`を実行し、実行できない項目は理由と代替evidenceを記録する。

## 7. Codex native delegation

- Parentがrequirement interpretation、Plan、delegation、scope、validation、failure interpretation、completion decisionを担い、childはParent-defined scopeを越えない。
- childは独自Run Artifactを作らず、追加のsubagentを起動しない（No child subagent delegation）。詳細なRole、worker scope、validation-only境界は`.codex/agents/**`、`.codex/config.toml`、implementation harnessを参照する。
- Codex native delegationとAndroid / Native validationは別の責務として扱う。

## 8. 改善ガバナンス

- L1: wordingのみの文書改善は、`REPORT.md`に記録すれば自己承認でよい。
- L2: workflowやtemplate構造の変更は、実装前にユーザー承認が必要。
- L3: permission / sandbox / approval / wrapper behaviorの変更は、実装前に明示承認とrollback planが必要。
