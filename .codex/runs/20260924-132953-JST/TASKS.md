# Tasks（タスク）

## Now（現在）

- [x] 1. PR / branch / main / worktree / CI / current Plan / 対象実装の開始状態を確認する。
- [x] 2. 今回の範囲、停止条件、検証計画をPlanへ記録する。
- [x] 3. Case B tracked diff検査をGit exit statusでfail-closeし、実Git回帰testを追加する。
- [x] 4. Workflow preflight isolation、output boundary、blocked provenanceを修正し実Git fixture testを追加する。
- [x] 5. Trigger source status rename検出と回帰testを追加する。
- [x] 6. Workflow final success gateをstage実体とstage ID順へ整合させる。
- [x] 7. canonical Plan commandへrouting source SHAを追加する。
- [x] 8. focused / repository / verify / diff / sanitizer / self-reviewを完了する。
- [x] 9. source修正をcommit / pushし、最新head CIを確認する。
- [x] 10. 最新head由来の既存Target-12を再生成・再detachせずに使用し、Target isolationとHost workspace root条件を確認する。
- [x] 11. detached Targetのrunner preflightとAndroid実機確認後、canonical runを1回だけ実行して結果を確定する。
- [x] 12. resultのschema / provenance / status検証、Run Artifact更新、sanitizer Write / Check、residual 0を確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- `origin/main`はPR baseより1 commit先行しているが、追加分はIssue #132文書 / Run ArtifactでPRはmergeable。今回の対象差分はレビュー時点から変化なし。
- 最終preflight時のremote `origin/main`は`9cef8501c2b19e1764892b0c17ee50318fa90b97`、Evaluator / PR headは`68d2293849a2d9326d42d68515cfb49f5c89d508`。`git rev-list --left-right --count origin/main...HEAD`は`1 65`で、behind条件は未達。
- Target-10のmanual detach後preflight、Workflow runner自身のTarget/output/provenance preflight、Run Artifactだけを許可するsource guard、およびAndroid physical device確認はPASS。canonical runnerは起動していない。
- ユーザーがmainを取り込み、同期後Evaluator SHAは`926bdd2f62e0a1b4ca11bb7cd7050e1841b9d27b`。同期差分は`.codex/runs/**`、Issue #132文書、およびmerge commitに限られ、PR #168の指定重要ファイルは不変。behind 0 / ahead 66。
- 同期後 focused test 67/67、`test:repository` 147/147、`verify` exit 0、`git diff --check origin/main...HEAD` exit 0。新head CIは大半成功、Android Runtime/MaestroとiOS Automation buildが未完了。
- 新headのWeb / Mobile・Native CI、Android Runtime / Maestro、Android・iOS build、CodeQL等すべて終端。必須checks success、条件付きdeploy / Extended E2Eだけskip。
- Run Artifactだけが未commitで、実helper`sourceStatusOutsideRunArtifacts()`の戻り値は`[]`。Target-10は旧Evaluator SHA由来のため、Target-11を新SHAのtracked Git objectから新規生成する。
- Target-11をSHA `926bdd2...`からfresh export。2381 tracked / 1431 excluded / 950 exported、missing / unexpected / forbidden 0、canonical Skill 6/6。root `c925cff...`、parentless、commit 1、clean、remote 0、alternatesなし。physical Android device 1台が`device`状態（serialは`<DEVICE_SERIAL>`で管理）。
- 最新再確認ではPR #168がOPEN、local / remote PR headは`b653c70e396cdd62c82e29d131738c4685e63a67`、`origin/main=ac4e57721b55091ace3689eda289d44188241aee`、behind 0 / ahead 67。`926bdd2...`以降にmain由来のsource / test / config変更を含むため指定Evaluator SHAはstale。Target-11はdetached preflight PASSだが926bdd2由来。requested source SHAとの不一致でWorkflow runner自身のread-only preflightがfail-closeしたためcanonical未実行。
- ユーザーが`b653c70e396cdd62c82e29d131738c4685e63a67`を新canonical Evaluator SHAとして採用。`926bdd2...`のcanonical runnerは未起動（run count 0）だが、以後の対象から除外。Target-11も再利用しない。
- 新Evaluator SHA `b653c70...`でfocused tests 67/67、`test:repository` 147/147、`verify` exit 0（unit 66、integration 111、repository 147、web component 102、Native component 64、contracts 789 passed / 4 skipped、3 typecheck、lint / quality / spec / security / builds pass）、`git diff --check` exit 0。
- 最新PR headのrequired CIは全件success。Android Runtime / MaestroとiOS production / automation buildsを含む全pending checksが終端pass。条件付きExtended E2E / production deployはskip。
- 検証後の再fetchでPR OPEN、local / remote head一致、`origin/main=ac4e57721b55091ace3689eda289d44188241aee`、behind 0 / ahead 67。実helper`sourceStatusOutsideRunArtifacts()`は`[]`。次はTarget-12をb653c70 tracked objectから生成し、fresh root commitとdetach以外preflight完了後に手動detachを依頼する。
- Target-12はEvaluator SHA `b653c70...`のGit objectから作成。tracked 2396 / excluded 1443 / exported 953、missing / unexpected / forbidden 0、canonical Skill 6/6。root `a00e210787b1aa7426217158e264e346b697a861`、parentless / commit 1 / attached `workflow-e2e-target` / clean / remote 0 / alternatesなし。Evaluatorとrealpath / Git common-dir分離。Workflow runner preflightは予期どおりattached HEAD要件で停止。run count 0。
- 最終fetchでもPR OPEN、local / remote head `b653c70...`一致、origin/main `ac4e577...`、behind 0 / ahead 67。現在のHost workspace rootはEvaluator repository単体。次はworkspace rootを`<USER_HOME>\Documents`へ含め、Target-12をmanual detachする。
- ユーザーがworkspace rootをDocumentsとして再開。既存Target-12を再生成・再detachせずHEAD `a00e210...`を維持。Target / EvaluatorのrealpathとGit common-dirが分離し、Targetはdetached / parentless / commit 1 / clean / remote 0 / alternatesなし / canonical Skill 6/6 / forbidden 0。
- 最終fetch後もEvaluator / PR head `b653c70...`、PR OPEN、`origin/main=ac4e577...`、behind 0。Workflow自身の`assertTargetPreflightForWorkflow()`は指定source / routing SHA、model、Run output pathを受理し、`sourceStatusOutsideRunArtifacts()=[]`。`adb devices -l`でphysical device 1台が`device`、unauthorized / offline 0。
- canonical runnerを指定Evaluator SHAで1回だけ実行。result schema v1 valid、`run_status=blocked`、CLI exit 1、`cases=[]`、provenance 3 SHAは指定値。common smokeではprocess / resume / thread / OTel / schemaは両turnで観測されたが、Host Runtimeがwriteとsafe commandを拒否し、actual write / `command_execution`は両turnで未観測。same SHAのretryやHost policy / sandbox / approval / config変更は行わない。
- canonical resultのJSON Schema / provenance / blocked条件を検証。Run Artifactのsanitizer `Write` / `Check`は5 files、0 changes、0 replacements、residual 0。実helper`sourceStatusOutsideRunArtifacts()`は`[]`で、Evaluatorの変更はRun Artifact内のみ。

## Blocked（ブロック中）

- canonical common smokeはHost Runtime blockerで`blocked`。Evaluator SHA `b653c70...`のcanonical run countは1のため、同SHAは結果にかかわらず再実行しない。Case A〜Eは開始されていない。Run Artifact検証・sanitizationは完了。残作業はartifact-only commit / 通常push、PR本文更新、Artifact後の最新head必須CI確認。
