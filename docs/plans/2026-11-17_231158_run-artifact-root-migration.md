# Codex Run Artifact保存先の移行

## 0. 依頼概要

- 依頼内容: 新規Codex Run Artifactの正規保存先を `.codex/runs/<run_id>/` から `runs/<run_id>/` へ移す。
- 背景: workspace-write sandboxで `.codex` が保護され、Parentが `.codex/runs` に新規Runを保存できない。
- 期待成果: 新規Runをリポジトリ直下のGit管理対象 `runs/` に安全に保存し、既存 `.codex/runs/` の履歴、機密検査、安全性、Bash／PowerShellの契約を保つ。

## 1. ゴール / 完了条件

- ゴール: 新規Runの作成、参照、manifest/evaluation収集、sanitization、QA出力、cleanup、文書およびCIが `runs/<run_id>/` を正規rootとして一貫する。
- 完了条件（DoD）:
  - `runs/.gitkeep` が追跡対象となり、`runs/` がignoreされない。
  - Bash／PowerShellの新規Run生成が同じ `runs/<run_id>/` を使い、ID検証、上書き禁止、旧rootとのID衝突拒否、symlink／reparse point拒否を満たす。
  - wrapper、collector、evaluation、changed_files、QA、cleanupが新rootを使い、旧Runを暗黙に選択・更新しない。
  - staged／committed sanitizerが新旧両rootを検査し、既存の安全検査を維持する。
  - 旧 `.codex/runs/**` と保存済みmanifest・レポート・評価は移動、削除、置換、再生成しない。
  - 契約テスト、`scripts/verify`、PowerShell検証が利用可能な環境で成功する。実行できない項目はBLOCKEDとする。
  - 新しい標準Runを `scripts/new-run.sh` で作成し、`PLAN.md`／`TASKS.md`／`REPORT.md` と必要なmachine-managed `run.json` を記録する。
  - 最終差分を検査し、許可されたPRブランチへcommit／push後、最新HEADのWeb CIとMobile App CIを確認する。

## 2. 現状理解と前提

- 現状理解:
  - PR #226はopen、baseは `main`、head branchは `feat/codex-parent-delegation-20261117`。
  - GitHub PR APIの最新head、ローカルHEAD、`origin/feat/codex-parent-delegation-20261117` は `3aaed9e7b1a8423b654aa97cd9991216cc18a72d` で一致する。
  - 初期作業ツリーはclean。ローカルの `.codex/runs/` には既存履歴があり、Git管理対象である。
  - 作成・wrapper・collector・cleanup等は `.codex/runs` を個別に固定参照しており、`default_run_root` の変更だけでは移行しない。
  - Normal／Gray-box QA、Workflow Eval、検査・除外規則にも固定参照がある。`.artifacts/agentic-qa/` は別の採点artifact契約として維持する。
  - `git fetch origin` は `.git/FETCH_HEAD` がread-onlyのため失敗した。PR APIと既存tracking refは一致しているが、Git mutation前の再確認を別途行う。
- 前提:
  - 明示された移行先 `runs/`、旧Runの完全保持、旧Runは明示参照時も読み取り専用、新旧ID衝突時はfail-closeを採用する。
  - `.codex/templates/`、`.codex/config.toml`のsandbox／approval設定、Hook安全ポリシー、Native v2委任設定は変更しない。
  - `runs/` はworkspace-writeで技術上childも書ける可能性があるため、Parent所有・child編集禁止は運用契約として維持し、実効権限と誤認しない。
  - L3承認は今回明示された保存先移行に限定される。sandbox／approval／permissionの緩和、force push、merge、旧Run削除・移動は含まない。
- 対象外:
  - 旧Run一括移動、旧成果物変換・再生成、過去Run／過去Plan／歴史的ADR・historyの書換え。
  - `.artifacts/agentic-qa/` の変更。
  - Codex sandbox／approval設定、Hookの安全性緩和、childのGit mutation権限追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。移行先、旧Run保持、衝突時の動作、Git/PR lifecycle、sandbox非緩和はユーザー指示で確定済み。
- 仮定してよい細部: 既存ファイルの言語・構造に合わせ、現在のwrapper/collector APIを保ちながらrootを明示的に渡す。安全に同等化できない経路はfail-closeとする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲:
  - Run root設定、作成・初期化、safe/task wrapper、collector、evaluation、cleanup。
  - sanitizerのpathspec、Git/CI/Husky検査、Markdown/text qualityの履歴除外。
  - Normal／Gray-box QAとskill workflow evaluationのRun出力・source差分除外。
  - 現行規約、ガイド、PROJECT_CONTEXT/history、テストとCI契約。
- 確認対象ファイル:
  - 指定された `AGENTS.md`、`PLANS.md`、`QA_AGENT.md`、`codex-project.toml`、run-artifacts／implementation／safety／change-scope／agentic-QA／repository-layout文書。
  - `scripts/new-run.*`、`init-project.*`、`codex-safe.*`、`codex-task.*`、`collect-run-artifacts.*`、`cleanup-runs.*`、artifact sanitizer、QA/eval scripts。
  - `tests/contracts/**`、`tests/repository-contract/**`、PowerShell fixtures、`scripts/verify*`、`.github/workflows/**`、`.husky/**`、Markdown/text quality設定。
  - README、CHANGELOG、MIGRATION、quickstart、consumer-update、naming conventions、docs/PROJECT_CONTEXT.md。

## 5. 変更方針

- 変更方針:
  - まず設定・新規Run作成・初期化を移し、repo内の通常ディレクトリとして `runs/` を作成する。rootがsymlink/junction/reparse pointまたはrepo外解決なら拒否する。
  - new-runは新旧root双方の同一IDを調べ、いずれかに存在すれば失敗する。旧rootへのfallbackや自動移動は追加しない。
  - Run ID指定wrapperは `runs/<run_id>` のみを参照し、collectorへrootを明示する。legacy pathを明示入力された読取経路も更新・書込をしない。
  - changed_filesとscope判定では `runs/**` と `.codex/runs/**` を生成物として除外し、新規観測分だけを除外しつつ既存manifest値は保持する。
  - sanitizerは旧root検査を維持したまま `runs/**` のstage-0 blobおよびcommitted blobも検査する。秘密情報検査やsymlink/gitlink/unmerged拒否を弱めない。
  - cleanupは `runs/<run_id>/` だけを新規対象とする。`.codex/runs/**` は今回の移行で候補化しない。テストは一時fixtureだけを使う。
  - 現行仕様を更新し、履歴資料の旧pathは履歴として残す。必要なPROJECT_CONTEXT/historyの更新は短い履歴記録に留める。
  - wrapper、collector、sanitizer、docs、testsは同じcommit単位の整合した移行とし、保存先変更を理由に委任設定・sandboxを変えない。
- 実行タスク:
  - [ ] 1. PR/branch/worktree、旧Run履歴、書込権限、調査結果をRunとこのPlanへ記録する。
  - [ ] 2. `codex-project.toml`、`runs/.gitkeep`、init/new-run Bash/PowerShellを安全に移行し、root symlink・reparse・旧ID衝突を拒否する。
  - [ ] 3. safe/task wrapper、collector、manifest/evaluation、scope/changed_filesの新旧root整合を取る。
  - [ ] 4. sanitizer、CI/Husky、cleanup、QA/eval固定path、Markdown/text品質の検査範囲を移行する。
  - [ ] 5. AGENTS/PLANS/QA_AGENT、正本reference、現行guide、PROJECT_CONTEXT/historyを更新する。履歴Run・Plan・ADRは触らない。
  - [ ] 6. Run生成、collision/path safety、wrapper、manifest/evaluation、sanitizer、cleanup、compatibilityの回帰fixtureを追加・更新する。
  - [ ] 7. 移行後に標準入口からParent-owned Runを作成し、machine-managed `run.json` を含む実保存を確認する。
  - [ ] 8. Bash/PowerShell、contracts、verify、必要lint/typecheck/build、sanitizerとGit diffを検証する。
  - [ ] 9. branch/PR/remoteを再確認し、許可済みの通常commit/pushとPR本文更新を行う。最新PR HEADでWeb CI/Mobile App CIを待つ。
  - [ ] 10. 最新HEAD、CI、履歴保持、未実施項目、rollback案をRun REPORTと最終報告へ確定する。

## 6. 検証方法

- 検証計画:
  - Bash/Python/Node契約テスト: Run manifest、safe sync、task native command、artifact sanitization、autonomous workspace、QA/eval、text quality、security fallback workflow。
  - Run生成のBash/PowerShell fixture: template、`--no-plan`、`--no-run-manifest`、strict manifest、既存上書き禁止、legacy ID collision、不正ID/traversal、symlink/junction/reparse refusal。
  - Wrapper/collector: Run未存在時起動禁止、no-manifest既存動作、`--no-log`同期、evaluation_path、v1/v2互換、changed_files union、エラー終了コード。
  - Sanitizer: 新旧rootのvalid/invalid、staged partial blob、committed blob、symlink/gitlink/unmerged拒否、index/worktree不変。
  - Cleanup: 隔離fixtureでpreview-only、確認削除対象・非対象、`.codex/runs`保持、repo外/symlink拒否。
  - `scripts/verify`、`scripts/verify.ps1`、formatter/lint/typecheck/build/tests、PR最新HEADのWeb CI/Mobile App CI。
- 成功判定:
  - 各検査が終了コード0かつ期待されたPASSを示す。skip/未実行は根拠を残しPASS扱いしない。
  - `git diff`で旧 `.codex/runs/**` の変更が0件、新旧両pathがsanitizer対象、`runs/.gitkeep`およびRun標準成果物が追跡対象である。
  - Direct Native sessionでParentが新規Runに書けることを、新Run作成後の実ファイル内容と差分で確認する。

## 7. リスクと未解決論点

- リスク:
  - 固定path参照が残ると、新Runと旧Runが混在するかQA/evaluation/collectorが誤ったrootを読む。
  - symlink/reparse、同一IDの曖昧な選択、absolute path、sanitizer pathspecの漏れが保存先の安全境界を破る。
  - `runs/**` をMarkdown/security検査から誤除外すると機密情報や不適切な成果物がcommitされる。
  - Read-only `.git` によりfetch/commit/pushがsandbox上で拒否される可能性がある。権限やsandbox設定は変えず、承認された実行経路が使えない場合はBLOCKEDとして停止する。
- ロールバック計画:
  1. 変更前baselineは `3aaed9e7b1a8423b654aa97cd9991216cc18a72`。変更commit SHAと対象ファイルをRun REPORTへ記録する。
  2. 問題時は変更commitを対象に通常のrevertを行い、force pushしない。wrapper/collector/sanitizerは同じ移行commit単位で戻す。
  3. `runs/` に作られたRun Artifactは保持し、rollbackでも削除・移動しない。`.codex/runs/**` も一切変更しない。
  4. rollback後の旧wrapperはsandbox上 `.codex/runs` に保存できないため、Runを伴う作業を停止し、fallbackしない。安全な保存先がないと明示する。
  5. rollback前後にcollectorとwrapperの版を一致させ、契約テスト・sanitizer・`scripts/verify`・PowerShell検証と最新PR CIを再実行する。
  6. ローカルcommit/pushが権限境界で停止した場合はpermission緩和・旧root fallbackをせず、原因と残差分を報告して承認可能な通常Git経路を使う。
- 未解決の質問: なし。実行環境に起因する未確認事項は検証結果としてBLOCKEDに記録する。

## 8. 成果物

- 変更ファイル: Run pathを現行の正本として参照する設定、スクリプト、テスト、CI/品質検査、規約・ガイドのみ。
- 付随ドキュメント: この実装Plan、新しいRunの `PLAN.md`／`TASKS.md`／`REPORT.md`、必要なPROJECT_CONTEXT/history更新。

## 9. 備考

- 読み取り専用Native調査Role: `code_researcher`、`implementation_researcher`、`test_investigator`。3 Roleからの結果をParentが採否する。
- 実装・検証は既存の `implementation_worker` と `quality_gate_runner` に委任する。childは追加subagentを起動せず、Run Artifactを作らず、Git mutationを行わない。
- 既存 `.codex/runs/` は過去Runの履歴としてのみ保持する。パスが記された旧成果物を遡及修正しない。

## 10. PR #226 の CI 修復と WSL2 検証

- 開始時の PR HEAD と Linux checkout はともに `71e67076695df5deed96487513d4cd852f8bd45c`。既存の独立 Linux checkout と Run を引き継ぐ。Windows 側は読み取り専用で状態を確認し、既存差分と依存を保全する。
- Web は evaluator と関連する両テストスイートの修復に限定する。Git porcelain の状態とパスを分離し、新旧 Run の除外と不正出力の拒否を維持する。追跡済み、未追跡、空白、日本語を含むパスを確認する。
- Mobile は `main` と PR HEAD の manifest・lockfile を比較し、公式 Expo SDK 57 のバージョン検査で確認する。Expo Doctor が求める同一 SDK のパッチ更新のみ、`package.json` と `pnpm-lock.yaml` に反映する。
- 指定された Linux 品質ゲートに加え、対象契約テスト、Expo Doctor、Web ビルド、Native 検査を実行する。PowerShell はコードの静的整合性と GitHub Actions の Windows ジョブを確認し、Windows ローカル実行は保留する。
- 変更と既存 Run 記録をサニタイズして stage し、staged 品質検査と通常の hook を通す。通常 push 後に PR HEAD、Web CI、Mobile App CI を照合し、PR 本文に結果を記録する。
- 調査・実装は GPT-6 Luna を指定した既存の子 Role に委任する。問題時は対象コミットを通常の revert で戻し、Windows 側と Run 履歴を保持する。
