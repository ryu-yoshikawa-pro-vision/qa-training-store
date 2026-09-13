# PR #133 Evidence validator Path検証強化 計画

## 0. 依頼概要

- 依頼内容: `assertEvidenceReference()`のPath検証回避を修正し、contract、Training Copy、標準検証、修正後HEADのRemote CI、PR本文を同期する。
- 背景: PR #133の複数モデルレビューで、危険なローカルPath／repository外Pathの前に特定の境界文字がない場合、既存validatorを通過することが判明した。
- 期待成果: 正当な`http://`／`https://` URL、Artifact、`output/...`、Run参照を維持したまま、wrapperや説明文連結に依存しないPath拒否と回帰contractを確立する。

## 1. ゴール / 完了条件

- ゴール: valid HTTP(S) URL部分を保護し、それ以外の文字列からfile URI、絶対／drive-relative Path、UNC、parent traversalを検出する最小の既存validator修正を実装する。
- 完了条件（DoD）:
  - 修正前にb323e06の実装で新しい回避例を実測し、結果をRunへ記録する。
  - source変更は`scripts/validate-curriculum.ts`と`tests/contracts/training-curriculum.test.ts`だけに限定する。
  - wrapperの1文字追加ではなく、Path直前の境界文字に依存しない共通原因を修正する。
  - 指定negative／positive contract、focused test、標準コマンド、`git diff --check`、Training Copy prepare／validate、修正後HEADのWeb CI／Mobile App CI／CodeQLが成功する。
  - sourceを1 commitへまとめ、non-force push後にPR本文のHEAD、base、Training Copy、CI、validator説明を実状態へ同期し、worktreeをcleanにする。

## 2. 現状理解と前提

- Current understanding:
  - 対象branchは`refactor/test-automation-curriculum-learning-experience`、PR #133の実HEADは`b323e06a6d5bce5253cad9dc342f72475b054c65`、baseは`main`／`3c5e35ed42712574eb9d89051820c9e27f137a16`。
  - `validateCurriculum()`から`validateWorkbook()`を経て、Pass行の`evidence`を`assertEvidenceReference()`が検査する。
  - 現実装は`evidencePathBoundary`を使い、`file:`、absolute Path、`..` segmentを境界文字の直後として判定している。
  - 既存contractには一部のTrace形式、Artifact、output、Run、URLのpositiveと危険Pathのnegativeがあるが、`[]`、backtick、hyphen、壊れた`http:`／`https:`接頭辞の代表例が不足している。
- Assumptions:
  - 新しい汎用parser、dependency、共通化層、runtime file existence確認は不要で、既存関数の局所的な文字列判定で契約を満たせる。
  - 正当なHTTP(S) URLは`http://`／`https://`から非空白のURL範囲として判定対象から除外し、`http:`／`https:`だけや壊れた接頭辞は安全なURLとして扱わない。
  - Strict Run `20260912-223639-JST`を今回の作業Runとし、過去Run `20260911-232344-JST`は変更しない。
- Non-goals:
  - 教材の学習内容、Workbook schema、Training Workflow、Playwright starter、Native CI、Expo dependency、Windows Hook timeout、Run Artifact基盤、Product Code、BR／AC、Seed Scenario。
  - ja-JP Pixel Launcher ANR、runtime Evidenceの実在確認、merge、PR close、branch削除、tag／release、force push、外部full review／再レビュー。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象関数、許可／拒否例、検証コマンド、branch、PRが明確である。
- 仮定してよい細部: 既存のexecution contract test内へ代表wrapper群を追加し、validatorの公開APIを増やさない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Workbookのevidence文字列検証と、そのcontract test。
  - Training Copyはvalidator sourceの変更を含むため、修正後source SHAで再実行する。
  - Web／Mobile／CodeQLのRemote CIとPR本文のcurrent-head evidence。
- Files to inspect:
  - `scripts/validate-curriculum.ts`
  - `tests/contracts/training-curriculum.test.ts`
  - `package.json`
  - `scripts/training/prepare-training-copy.ts`
  - `scripts/training/validate-training-copy.ts`
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
  - `.github/workflows/codeql.yml`
  - 直近RunおよびPR #133の現在状態

## 5. 変更方針

- Change strategy:
  1. PR／branch／base／working treeを再確認し、修正前b323e06で指定入力をvalidatorへ流して通過例を保存する。
  2. valid HTTP(S) URL部分を先に除外し、正当URLでない`http:`／`https:`をPath検出へ戻す。正規化後の残りを、前文字の境界集合ではなくPathらしさで検査する。
  3. file URI、Windows absolute／drive-relative、Unix absolute、UNC、parent traversalを同一の境界回避不能な検査で拒否する。`existsSync`はEvidence検証へ追加しない。
  4. 指定されたwrapper群をnegativeとしてcontractへ追加し、同じtestでURL／Artifact／output／Run参照をpositiveとして維持する。test-firstで修正前failureを確認する。
  5. focused、標準検証、diff／scope確認を行い、sourceだけを1 commitへまとめる。
  6. package scriptの実際のCLIを確認してTraining Copyを修正後SHAでprepare／validateし、non-force push後に新HEADのRemote CIとPR本文を同期する。
- 実行タスク:
  - [ ] 1. 開始状態、PR実HEAD、branch、base、直近Run、対象コード、CLIを確認する。
  - [ ] 2. 計画とStrict Run artifactを初期化し、bounded repair scopeを固定する。
  - [ ] 3. 修正前b323e06の回避入力を実測し、結果とbaselineを保存する。
  - [ ] 4. contractへnegative／positive代表例を追加し、修正前failureを確認する。
  - [ ] 5. `assertEvidenceReference()`を共通原因に対して局所修正する。
  - [ ] 6. focused／標準検証とscope監査を完了する。失敗時はrepair-loopの停止条件を適用する。
  - [ ] 7. sourceを1 commitへまとめ、修正後SHAを固定する。
  - [ ] 8. 修正後SHAのTraining Copy prepare／validateを完了する。
  - [ ] 9. branch safetyを再確認してnon-force pushする。
  - [ ] 10. 新HEADのWeb／Mobile／CodeQL CIとrequired jobを確認する。
  - [ ] 11. PR本文を日本語の現在状態へ同期し、本文を再確認する。
  - [ ] 12. Run evaluation／sanitizer、clean worktree、mergeなしを確認して完了報告する。

## 6. 検証方法

- Validation plan:
  - 修正前: 一時fixtureまたは既存validator経路で指定入力を個別に実行し、通過／拒否を記録する。
  - focused: `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`。
  - standard: `pnpm run validate:curriculum`、`pnpm run typecheck:training`、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`。
  - Training Copy: `package.json`のscriptと各`--help`でCLIを確認後、`pnpm run training:copy:prepare`と`pnpm run training:copy:validate`を修正後SHAで実行する。
  - Remote: push後にPR head SHAと一致するWeb CI、Mobile App CI、CodeQLを確認し、MobileのNative Static、Android／iOS build／validation／runtime、Production Bundle Guard、`native-ci / verify`を確認する。
- 成功判定:
  - negativeはすべて`validateWorkbook()`がthrowし、positiveはすべてthrowしない。
  - 指定標準コマンド、Training Copy、修正後HEADのrequired Remote CIがPASS（workflow条件によるskipはfailure扱いしない）。
  - source scope、PR本文、branch、clean worktreeがDoDと一致する。

## 7. リスクと未解決論点

- Risks:
  - valid URL内部の`/`や`:`を危険Pathと誤認すると既存Evidence形式を狭めるため、URL除外順序とpositive contractを固定する。
  - relative Artifact／outputの`/`をUnix absoluteと誤認しないよう、Path開始の形を区別する。
  - Windowsローカルの既知subprocess timeout等が標準検証で出た場合は、今回diff、baseline、環境を切り分け、無目的にsource scopeを拡張しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `scripts/validate-curriculum.ts`
  - `tests/contracts/training-curriculum.test.ts`
- 付随ドキュメント:
  - 今回のStrict Run artifact
  - PR #133本文のcurrent-head同期

## 9. 備考

- source変更前の実測結果、validation、CI結果、PR本文のSHAは推測せず、実行結果を根拠としてRunへ記録する。
