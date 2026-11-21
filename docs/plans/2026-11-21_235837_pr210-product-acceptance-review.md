# PR #210 製品レビュー・受入計画

## 目的

`product/scenario-shop-maintenance` のPR #210について、最新HEADの全差分、正式仕様、独立レビュー、既存CI、Web/Nativeの実行証拠を照合し、未受入条件とマージ可否を根拠付きで判定する。

## 現在の理解

- 作業開始時のHEADは`7b0eaae1494afeef97f63048fb30cf9e50bbb4ed`。作業branchは`product/scenario-shop-maintenance`で、作業ツリーはclean。
- `origin/main`はPR merge元の`581fac744cd8fe575e36cb070114f406d8b91288`から`ddc451a7079bbc75cd1d6623f5ae1e4647caf635`へPR #227で進んでいる。追加差分はPR #210と`AGENTS.md`の1パスだけ重なる。今回、main取り込みやPR mergeは行わない。
- PR #210の指定HEADに対し、既存Web CI #44911578084とMobile App CI #44911578122はいずれも成功。これは仕様受入・実機受入の代替ではない。
- Checkout仕様にはWebの登録済み住所選択とNativeの住所直接入力の差がある。2026-11-22、ユーザーがNativeの未保存住所直接入力を正式に許可。仕様へ反映し、任意の住所2行目の入力・保存snapshot・確認表示をテストで確認する。Webは登録済み住所選択を維持する。
- 住所2行目を含む更新後Native画面のcanonical Android screenshotが古く、視覚受入は未完了。Checkout税額の独立明細を表示しないという仕様追記はユーザー判断待ち。

## 前提・非目標

- 実課金、実データ、個人情報、秘密情報は使わず、既存のtest fixture・seed・ローカルモックを使用する。
- レビュー中は実装を変更しない。指摘を確定した後、仕様が確定済みで安全に直せる不具合だけ、repair-loopへ切り替えて対象を限定する。
- main、PR #199、他PR、PowerShell互換コード・テスト、セキュリティ保護、既存assertionは変更しない。
- 新しいテスト基盤や重複仕様・受入正本は作らない。必要な結果は既存follow-up計画とRun Artifactへ記録する。
- 実機・シミュレーターを利用できない場合、CI emulator/build evidenceと区別して未実施として残す。

## 対象範囲

- PR #210の49ファイル全差分を製品実装、正式仕様、製品テスト、共通ツール・安全性、設定・運用文書、計画・Run Artifactへ分類する。
- 認証・認可失効、Checkout Session / Cart version、支払・冪等性、金額・在庫、管理更新、Web/Nativeの共通契約をコード・テスト・BR/ACで照合する。
- GitHubのPR metadata、レビュー状態、最新HEADのWeb/Mobile jobとjob stepsを取得し、CI coverageと限界を整理する。
- 指定されたChromium E2E、cross-role、accessibility、mobile-boundaryをWSL2/Bashで実行し、実行環境・build kind・mode・seed・base URLを記録する。必要なら既存artifactとtraceを確認する。
- Nativeは既存component、Android Runtime/Maestro、Android/iOS build evidenceを評価し、利用できる実行環境で不足する既存検証だけ追加する。CI buildやemulatorを実機確認とは扱わない。

## 進め方

1. Git branch/HEAD/main/PR差分/レビューとRun状態を再確認し、この計画と今回のreview Runを初期化する。
2. PR差分と正式仕様、呼び出し元・Repository・transaction・Web/Native画面・回帰テストを確認し、独立read-onlyレビューを完了する。
3. 最新HEADのWeb/Mobile CI job、step、テスト範囲および既存Playwright/Maestro/visual artifactsを確認する。
4. WSL2/Bashの既存E2Eを順次実行し、失敗は最初の原因から追跡する。外部決済・製品データを使わない。
5. Native runtime/deviceの利用可否を確認し、既存手順で検証可能な範囲を実施する。利用不可は具体的な未実施範囲・必要環境を残す。
6. レビューfindingを確定し、必要な場合だけrepair-loopのbounded iterationを実施して独立再レビューと影響範囲テストを行う。
7. Checkout仕様差と他の未決事項を受入済み項目から分離し、既存follow-up記録・Run REPORTを更新する。sanitizer/security checks後にGitとCI証拠を最終確認する。

## 検証計画

- PR head / CI / review metadata: GitHub read-only API。対象SHAとrun IDを各結果に記録する。
- Local E2E: `pnpm run test:e2e:chromium`、`pnpm run test:e2e:cross-role`、`pnpm run test:a11y`、`pnpm run test:e2e:mobile-boundary`。WSL2 Ubuntu/Bashと実際のPlaywright build/test settingsを記録する。
- Native evidence: `pnpm run test:component`の既存HEAD結果、Android Runtime/Maestro job artifacts、Android/iOS automation・production-validation builds。実端末検証は環境を確認して個別に判定する。
- コード変更が発生した場合は、変更範囲に対応するtypecheck、integration、component、repository、E2E、security、format/buildを再実行する。
- Run Artifact更新後は既存sanitizerと`pnpm run security:check`を実行し、差分検査・unmerged path確認を行う。

## リスク・未決事項

- Nativeの直接入力ポリシーはユーザー承認済みで、住所2行目の任意入力と確認表示を追加済み。既存Android正本画面参照は住所2行目を表示していないため、更新後のcanonical captureを視覚確認する必要がある。
- PR #210のHEADは現在の`origin/main`から#227分遅れている可能性がある。#227は主に共通Hook/runtime変更で、今回の受入中に自動で取り込まない。最新base上のCI証拠と混同しない。
- Commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd`のWeb required CI #44925761465は`e2e/web/ui-ux-improvements.spec.ts:98`のrole=status strict-mode衝突で失敗した。Cart transfer toastと新Checkout開始通知の2件を同じlocatorが選んだため、製品表示は維持し、該当通知を個別に識別するtest selectorへ修正。別のread-only reviewerが2 assertion維持とlocatorの明確さを確認し、追加findingなし。新HEAD CIは未完了。
- Linux/CI環境でiOS simulator、物理Android/iOS端末が得られない場合、画面・視覚・実機の実証は未完了となる。
- GitHub CLIの保存認証は無効で、通常shellからのGitHub API接続はsandbox DNS/network制限を受ける。GitHub connectorにworkflow dispatch機能がない場合、canonical visual captureは未取得として記録する。Windows/WSL設定・権限・sandboxは変更しない。
- 同時更新の状態不変は、既存integration testのinterleavingが実際に証明する範囲と、単なる連続呼出しを区別する。

## 完了判定

- 独立レビューfindings、仕様照合、CI coverage、実行済みWeb/Native範囲、状態不変の証拠、未検証と人間判断を個別に報告する。
- 未検証・未決の項目をPASS扱いしない。
- PR #210をmainへmergeしない。作業branchへの通常commit/pushは、既存のGit safety規約とユーザーの明示承認に従う。
