# PR #25 Required DoD scope decision

- 日付: 2026-08-14 JST
- 対象: PR #25「テスト自動化カリキュラムとTraining Environmentの完成」

## Owner Decision

PR #25のRequired Definition of Doneを、Curriculum、Workbook / Training assets、Formal / Training境界、Curriculum validator、Training Playwright desktop / mobile、learner exercise、expected-failure lifecycle、Windows Local Physical AndroidのTraining Maestro baseline、GitHub Native CI API34 EmulatorのTraining baseline、`pnpm run verify`、Current PR HEADのPhase 1 / Native CI、Critical / High Source findingの解消へ限定する。

Windows LocalのPhysical Android CanonicalとGitHub Native CIのAPI34 / `google_apis` / `x86_64` Emulator契約は維持する。Training Copyのprepare / validateも安全な教材Copyを作るRequired Assetとして維持する。

一方、Instructor管理remote Training Copy repositoryの作成・publish、remote Web / Android / expected-failureの3 runs、`FINAL_CANDIDATE_SHA` freeze、Delivery start / end PR HEAD equality、Training Copy resolved SHA equality、Final Delivery Recordは、Production-gradeなTraining Delivery Platformの将来運用検証に分類する。これらを今回のMerge blocker、Task、Progress denominator、Required DoD、failureへ含めない。

## 履歴の扱い

過去Plan、REPORT、Run Artifactに残るFinal Delivery計画、未実施、AVD ANR、Physical Device補助証跡は変更せず、今回のOwner Decisionによるcurrent scope reconciliationを新しい記録として追加する。将来remote運用が必要になった時点で、別のOperational Validationとして実行条件とEvidence保存を定義する。
