# Report（追記のみ）

- TASK完了、blocker、重要判断、計画変更、Run完了のcheckpointだけ追記する。
- 過去checkpointは削除・置換・並べ替えず、Summary / Progressも新checkpointとして追記する。
- Hook JSONLやrunnerが取得するmachine factをREPORTへ逐次転記しない。
- REPORTにはAIが残す意味情報だけを記録する。

## YYYY-MM-DD HH:MM (JST)

- Summary:
- Changes:
- 判断 / 理由:
- Validation:
- ブロッカー / 残作業:
- Subagent:
  - Delegation:
  - Result:
  - 親Agentの判断:
- Progress: NN% (done/total)

## 2026-09-15 21:47 JST

- Summary:
  - ユーザーの依頼を「講師なし自己学習化」と「明示なしでも適切に複数Agentを使う運用」の2本に分け、既存のPR 4A / PR 5 / Agent orchestration PlanとCurrent `main`を突合して統合Planを作成した。
  - 実装順は、既存SSOTと保護契約の再Baseline → Lesson共通契約 → P1-2〜P1-6縦断パイロット → Training completion checker / Evidence → Part 2自走導線 → 全17 Lesson / ACテスト展開 → Agent実Run検証とした。
  - Agent利用は「常に最大数」ではなく、複数領域・未知点・独立観点がある場合に2〜3名のread-only researcherを並列化し、Plan確定後のworkerと最終quality gateはParentが直列管理する方針とした。
- Changes:
  - `docs/plans/2026-09-15_213247_self-study-agent-orchestration.md`を新規作成した。
  - Run-localの`PLAN.md` / `TASKS.md`を今回の計画へ更新した。
  - 製品コード、テストコード、カリキュラム本文、Agent設定、Git metadataは変更していない。
- 判断 / 理由:
  - 学習設計では、P1-3を学習者作成Case、P1-4を提供導入Case、P1-5をP1-3 Caseの実装と明示する方針を採用した。全Caseを事前配布する必要はないが、前Lesson成果物をInputとして表示する必要がある。
  - Lesson共通契約は既存`00_learning-design.md`を拡張し、別の第三SSOTを作らない方針とした。Caseは既存4 CSV、学習コードは`training/`、実行Evidenceは既存`output/` / `.artifacts/`を基本とする。
  - Trainingは静的資材validatorとlearner completion checkerを分離し、差分、必須Assertion、Case対応、実行Receipt、Evidence実在性、Failure→修正→Rerunをboundedに判定する。DB、AI採点、完全一致答案は追加しない。
  - Part 2はGitHub / Training Copyを自力で準備できる手順と、外部環境がない場合の代替または選択境界を決める。Native / iOSをCommonの暗黙前提にしない。
  - Agent運用では、既存5役で当面足りる。`.codex/config.toml`の`max_threads = 4`、`max_depth = 1`、既存Hook / wrapperは、実効性の実測とL3承認なしに変更しない。
- Validation:
  - PASS: `corepack pnpm exec tsx -e ...validatePlanOutput...`（template必須見出し欠落なし）。最初のPowerShell引用符形式はコマンド構文エラーとなったが、呼び出し形式を修正してPASSを確認した。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: `sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`（residual findings 0）。
  - `code_researcher`と`implementation_researcher`から、Lesson縦断とAgent運用の根拠付き結果を取得した。Test / CIの根拠は直前Runの`test_investigator`結果、現行PR 5 Plan、今回のCurrent `main`確認を再利用した。追加で起動したtest investigatorはbounded wait後に停止し、結果を採用していない。
- ブロッカー / 残作業:
  - Plan作成の残作業はない。実装開始前にPart 2のGitHub必須範囲、非コード成果物の保存先、completion checker導入の3点をOwner判断する。
  - 実装は本Planへの承認後の別Implementation taskとする。L2のworkflow / template変更、L3のAgent permission / sandbox / wrapper変更は承認境界を分ける。
- Subagent:
  - Delegation: curriculum、Training / Test、Agent運用の3軸へ並列委譲した。
  - Result: curriculum / Agent運用の2調査結果を統合し、Test / CIは既存の確定Evidenceと子Planへ接続した。全委譲Agentはファイル変更を行っていない。
  - 親Agentの判断: 複数Agentを自動的に使うために必要なのはAgent数の増加ではなく、AGENTSの既定routing、Harnessの詳細matrix、Parent主導のjoin / close / completion契約である。軽微なtaskには起動しない条件も同時に必要である。
- Progress: 100% (7/7)

## 2026-09-15 22:08 JST

- Summary:
  - PlanのMarkdown整形を修正し、最終検証が完了した。
- Changes:
  - Planの順序付きリスト表記をlint契約に合わせた。実装変更はない。
- Validation:
  - PASS: `corepack pnpm run lint:markdown`（0 issues）。
  - PASS: Plan validator（`valid: true`、必須見出し欠落なし）。
- ブロッカー / 残作業:
  - 実装は開始していない。残る論点は、受講者向け修了確認の具体的判定項目とWorkbookのExport / Handoff方法である。
- Progress: 100% (7/7)

## 2026-09-15 22:05 JST

- Summary:
  - Owner確認を反映したPlanの再検証が完了した。実装は開始していない。
- Changes:
  - 追加のSource変更はない。PlanとRun-local Artifactだけを更新した。
- 判断 / 理由:
  - `completion checker`の責務を「受講者向け修了確認」とし、GitHub Actionsをその実行基盤として記載した。
  - 非コード成果物は既存Workbookの4 CSVを正本とし、保存場所の一律固定はせず、形式・ID・Export・Handoffを契約化する方針を維持した。
- Validation:
  - PASS: Plan validator（`valid: true`、必須見出し欠落なし）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: `collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`。
  - PASS: Run Artifact sanitizer（files_scanned 4、residual_findings 0）。
- ブロッカー / 残作業:
  - 実装前に、受講者向け修了確認の具体的判定項目と、Workbookを自由な保存場所から評価可能にするExport / Handoff方法を確定する。
- Subagent:
  - 追加Agentは起動していない。前回の複数Agent調査結果を再利用した。
- Progress: 100% (7/7)

## 2026-09-15 22:03 JST

- Summary:
  - Owner確認を反映し、Common課程はローカルで完了可能、Part 2はGitHub Actionsを学習者自身が準備・実行する必須課程、Native / iOSは選択課程とした。
  - `completion checker`は「受講者向け修了確認」と日本語化し、GitHub Actionsはその確認やテストを実行するCI基盤として定義した。
  - 非コード成果物はTest Case CSVを含む既存Workbookの4 CSVを正本として扱い、物理的な保存先は一律固定せず、形式・ID・Export・Handoffを固定する方針へ更新した。
- Changes:
  - 統合Plan、Run-local PLAN / TASKSを更新した。
  - 製品コード、テストコード、カリキュラム本文、Agent設定、Git metadataは変更していない。
- 判断 / 理由:
  - 修了条件を判定する仕組みと、GitHub上でコマンドを動かす仕組みは責務が異なるため、ローカル実行とGitHub Actions実行を同じ修了確認契約へ接続する。
  - Workbookは既存のCanonical TemplateとTraceabilityを活用し、新しい成果物DBやLessonごとの固定ディレクトリを増やさない。
- Validation:
  - Plan更新後にplan validator、`validate:curriculum`、`typecheck:training`、Run Artifact sanitizerを再実行する。
- ブロッカー / 残作業:
  - 実装は開始していない。実装前に、受講者向け修了確認の具体的判定項目と、Workbookを自由な保存場所から評価可能にするExport / Handoff方法を確定する。
- Subagent:
  - 今回は前回の複数Agent調査結果を再利用し、追加Agentは起動していない。Owner確認の反映と用語・責務の整理のみを行った。
- Progress: 100% (7/7)

## 2026-09-16 00:11 JST

- Summary:
  - PlanのRound 1レビューを実施した。Agentレビューでは、実装開始を妨げる契約不足を9件のmust-fix、1件のshould-fixとして検出し、親Agentの再監査でCase ID、checker status、Part 2準備経路、検証コマンド、17 Lesson展開、Wave依存を追加論点として統合した。
  - 3軸のread-only委譲のうち、curriculum / Agent運用レビューは根拠付き結果を取得した。Training / Testレビューと別のcurriculumレビューはbounded waitで完了せず、interrupt / closeして結果を採用していない。
- Changes:
  - PlanへRepository mapping、Baseline SHA、17 Lesson監査表、Workbook列境界、single longitudinal Case（`TC-CART-101`）、Q1〜Q3のOwner gateを追加した。
  - Waveごとのdependency、entry / exit gate、exact write set、stop condition、rollback boundaryを追加した。
  - 受講者向け修了確認のCommand候補、Input、Receipt、Status、local / CIの環境差、positive / negative fixture、Part 2のself-service Copy準備経路を具体化した。
  - AC / Test target matrix、expected-failureの実行Command、Plan validatorの実効Command、Run collector / sanitizerの扱いを明記した。製品コード、テストコード、カリキュラム本文、Agent設定は変更していない。
- 判断 / 理由:
  - `TC-CART-001/002`は既存の提供参照例、`TC-PRODUCT-001`は導入用提供Case、`TC-CART-101`は学習者所有の縦断Caseとして分離した。1件／2件／同一IDの揺れを実装者へ残さないためである。
  - 学習者の編集場所は自由にする一方、評価intakeだけは固定する必要がある。Handoff bundle方式を推奨案とし、OwnerのQ1決定まではchecker実装を開始しない。
  - GitHub ActionsはPart 2の必須環境だが、Workflow YAMLやSecretを学習者へ手書きさせず、Repositoryが提供するtemplate / runbookと`training:copy:prepare`を使う自己準備経路へ整理した。
- Validation:
  - Round 1修正後のPlan validator、markdown lint、curriculum validator、typecheck、collector、sanitizerは次のcheckpointで実行する。
- ブロッカー / 残作業:
  - 実装は開始していない。Q1（Handoff bundleかPath引数か）、Q2（local / CI Receipt schema）、Q3（L2 / L3変更の要否）をOwnerが確定するまでT1とG2の実装Waveは開始しない。
  - Plan自身のRound 2 read-only reviewを行い、残存する矛盾がなければ最終検証へ進む。
- Subagent:
  - Delegation: Plan構造・Repository契約、curriculum / Workbook、Training / Test / CIの3軸へread-only reviewを委譲した。
  - Result: Plan構造レビューの根拠付きfindingを採用。残り2軸は結果未取得のため、親AgentのRepository evidenceで補完し、未取得をPASS扱いしていない。
  - 親Agentの判断: timeoutしたAgentを同じ問いへ再投入せず、次Roundでは変更後Planの狭い残存リスクだけを確認する。
- Progress: 100% (7/7)

## 2026-09-16 00:36 JST

- Summary:
  - Round 2 / Round 3の変更後Planレビューをboundedに実施した。追加委譲5体は時間内に根拠付き結果を返さなかったため、interrupt / closeし、未取得結果をPASSや「指摘なし」とは扱わなかった。
  - 親Agentの最終監査で、17 Lessonと5 Waveの対応、Case / Workbook schema、Handoff intake、checkerのStatus / Receipt、GitHub Copy validationの時点、AC matrix、Agent timeout / Run lifecycleの内部整合性を確認した。新たなmust-fixは見つからなかった。
- Changes:
  - `TC-CART-101`、`TARGET-CART-101`、`RISK-CART-101`を学習者所有の縦断IDとして固定し、提供参照例と分離した。
  - P1-5のlearner codeを`training/playwright/exercises/learner-cart.spec.ts`へ分離するwrite setを追加した。
  - Part 2の主経路を、提供Template / runbook → `training:copy:prepare` → 生成直後の`training:copy:validate` → Branch / PR / Checks / Artifactと明記した。Copy validatorのSource SHA一致が学習者変更後に成立しない境界も記録した。
  - Run-local `PLAN.md` / `TASKS.md`へRound 1〜3、timeout、全contracts timeoutと限定実行結果を反映した。製品コード、テストコード、カリキュラム本文、Agent設定、Git metadataは変更していない。
- 判断 / 理由:
  - Planは実装者が勝手に決めるべきでないQ1（評価intake方式）、Q2（Receipt schema）、Q3（L2 / L3変更）をOwner gateとして残した。これは欠陥を残したのではなく、承認なしに契約を変更しないための明示的な停止条件である。
  - 学習者の編集場所は自由としつつ、評価時のHandoff bundleまたは引数契約は固定する。自由な保存場所をcheckerが推測する設計にはしない。
  - Round 2 / 3の委譲結果がないため、レビュー完了の根拠は親Agentの静的監査とRepository validator / targeted contract testに限定した。
- Validation:
  - PASS: Plan validator（templateと対象Planを読み込み`valid: true`）。
  - PASS: `corepack pnpm run lint:markdown`（427 files、0 issues）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: `corepack pnpm exec vitest run tests/contracts/training-curriculum.test.ts tests/contracts/ci-workflow.test.ts tests/contracts/native-ci-workflow.test.ts --no-file-parallelism --maxWorkers=1`（3 files、59 tests）。
  - TIMEOUT: `corepack pnpm run test:contracts`（300秒）。既存の全contracts実行の環境／テスト実行問題として分類し、限定対象のPASSとは分離した。
  - PASS: `collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`。
  - PASS: Run Artifact sanitizer（files_scanned 4、files_changed 0、residual_findings 0）。
- ブロッカー / 残作業:
  - このRunでは実装を開始していない。Q1〜Q3のOwner決定と、ユーザーからの実装開始指示が得られるまで、Planに列挙したSource変更へ進まない。
  - 実装開始後は、全`test:contracts` timeoutのfirst failure / 実行環境を先に切り分け、未確認の品質ゲートを完了扱いにしない。
- Subagent:
  - Delegation: Round 1はPlan構造、curriculum / Workbook、Training / Test / Agent運用の3軸、Round 2は3軸、Round 3は内部矛盾とvalidationの2軸へread-only委譲した。
  - Result: Round 1のPlan構造レビュー結果を統合。Round 2 / 3はtimeout後にcloseし、結果未取得を採用しなかった。全委譲AgentはSource変更を行っていない。
  - 親Agentの判断: bounded review回数を終了し、親側の最終監査と実行可能なvalidator結果でPlanレビューを完了する。未解決のQ1〜Q3はOwner gateとして実装前に止める。
- Progress: 100% (7/7)

## 2026-09-16 01:00 JST

- Summary:
  - Owner確認をPlanへ反映した。Workbookの評価時はHandoff bundle方式、ローカル／GitHub Actionsの実行記録は共通JSON形式、Agentは学習者向け必須設定ではなく既存リポジトリから継承する方針で確定した。
- Changes:
  - PlanのQ1〜Q3を「未決定事項」から「今回確定した方針」へ変更した。
  - `handoff.json`を含むHandoff bundle、共通Receipt、CI固有情報の分離を確定した。
  - `.codex/agents/*.toml`、`.codex/config.toml`、permission / sandbox / wrapper / model / threadは変更せず、学習者へAgent設定を要求しないことを明記した。
  - Run-local `PLAN.md` / `TASKS.md`へ同じOwner確認を反映した。製品コード、テストコード、カリキュラム本文、Agent設定は変更していない。
- 判断 / 理由:
  - ここでいうAgentは、カリキュラム上で学習者が設定するAgentではなく、このリポジトリを開発・改善するときのCodex側Agentである。既存リポジトリを引き継ぐことで運用できるため、新しい設定や学習者向け要件は追加しない。
  - 学習者の編集場所は自由に保ちつつ、評価時だけHandoff bundleへまとめることで、保存場所の自由と評価可能性を両立する。
- Validation:
  - Plan変更後にPlan validator、Markdown lint、必要なRun collector / sanitizerを再実行する。
- ブロッカー / 残作業:
  - 実装は開始していない。ユーザーから実装開始の指示があるまで、Planに列挙したSource変更へ進まない。
  - 実装開始後は、全`test:contracts` timeoutのfirst failure / 実行環境を先に切り分ける。
- Subagent:
- 今回はOwner確認の反映であり、新規Agentは起動していない。既存のRunで複数Agentレビューと結果未取得の扱いを記録済みである。
- Progress: 100% (7/7)


## 2026-09-16 08:45 JST

- Summary:
  - 長文化していたPlanを、既存パスを維持したインデックスと5つの詳細ファイルへ分割した。詳細ファイルは独立Planではなく、インデックスから参照する分割本文である。
  - 分割前の内容を原文セクションブロック単位で照合し、欠落なしを確認した。製品コード、テストコード、カリキュラム本文、Agent設定、Git metadataは変更していない。
- Changes:
  - `docs/plans/2026-09-15_213247_self-study-agent-orchestration.md`をインデックス化した。
  - `docs/plans/2026-09-15_213247_self-study-agent-orchestration/`配下へ、前提・Lesson契約、影響範囲・Wave、受講者向け修了確認・GitHub Actions、テスト・検証、リスク・成果物の5詳細ファイルを追加した。
  - 詳細3・4の単体Markdownで見出し階層が飛ばないよう「収録範囲」見出しを追加した。これは本文内容を変更しない構造修正である。
  - Run `TASKS.md`へPlan分割タスクを追加し、次の実装task番号を繰り下げた。実装開始はしていない。
- Subagent:
  - code_researcher、implementation_researcher、test_investigatorの3体とexplorer 3体をread-onlyで起動した。
  - いずれもbounded wait内に結果を返さなかったため、結果をPASSや「指摘なし」として採用せずinterrupt / closeした。親Agentの機械照合と既存validatorを独立Evidenceとして採用した。AgentによるSource変更はない。
- Preservation validation:
  - 分割前基準: 824行、SHA-256 `5B52C08A3453E44D73C7F14A0EF02B930BFD29AAF59716BECC314B6A8DBFCCF8`、H2 11、H3 41、H4 21、17 Lesson行、Wave 12。
  - PASS: 原文のprefix、H2 0〜9、影響範囲、Wave 5.0〜5.6 / 5.7〜5.8 / 5.9、検証方法、リスク・成果物・備考の全13ブロックを詳細側へ照合。
  - PASS: `P1-01`〜`P2-08`、`TC-CART-101`、`TARGET-CART-101`、`RISK-CART-101`、AC matrix、全Wave、GitHub Actions、受講者向け修了確認、Handoff、Rollback、停止条件、主要検証コマンドを確認。
  - PASS: インデックス→詳細5件、詳細→インデックス5件の相対リンクを確認（対象6、broken 0）。
- Validation:
  - PASS: Plan validator（`valid: true`、`missingHeadings: []`）。
  - PASS: `corepack pnpm run lint:markdown`（432 files、0 issues）。初回は詳細3・4のMD001を検出したが、収録範囲見出しを追加して再実行した。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: 対象Contract test（3 files、59 tests）。
- ブロッカー / 残作業:
  - このRunでは実装を開始していない。ユーザーから実装開始の指示があるまで、Planに列挙したSource変更へ進まない。
  - 全`test:contracts`の既知のtimeoutは前checkpointの扱いを維持し、今回のPlan分割PASSへ混在させない。
- Progress: 100% (8/8)

## 2026-09-16 09:31 JST

- Summary:
  - ユーザー合意に基づき、親Agentが子Agentを非ブロッキングに管理し、調査・レビューAgentは自然終了まで継続し、テスト・ビルド・lint等のコマンドtimeoutは実行Agent自身が管理する方針をPlanへ反映した。
  - `wait_agent`のtimeoutと子Agent／commandのtimeoutを分離し、Parentの助言・独立scopeの追加派遣・結果統合・最終完了判断、watchdogとcloseの境界を明文化した。実装は開始していない。
- Changes:
  - インデックス、詳細2（Scope / Wave）、詳細4（Test / Validation）、詳細1（用語・技術的unknown）、active Runの`PLAN.md` / `TASKS.md`を更新した。
  - G3へ、自然終了通知、join timeoutとcommand timeoutの分離、子Agentのcommand証跡、助言・追加派遣、遅延結果の二重集約防止、close一回性、read-only / scope / recursive delegationのnegative caseを検証するライフサイクルケースを追加した。
  - 子Agentの観測status `TIMEOUT`等とRun manifestの正式enumを区別し、Runへ保存するときは既存契約へ対応付けることを追加した。英語のcompletion checker表記は現行Planから除き、「受講者向け修了確認」に統一した。
- Subagent:
  - code_researcher、implementation_researcher、test_investigatorのread-only調査結果を統合した。主な指摘（Parentの最終責務、join / command timeoutの分離、watchdog境界、ライフサイクルfixture不足、追加派遣の重複防止）を採用し、子Agentによるファイル変更はない。完了したAgentはclose済みである。
- Validation:
  - PASS: Plan validator（`valid: true`、`missingHeadings: []`）。
  - PASS: インデックス→詳細5件、詳細→インデックス5件、必須用語、英語表記除去のread-only整合性確認（broken 0）。
  - PASS: `corepack pnpm run lint:markdown`（432 files、0 issues）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: 対象Contract test（3 files、59 tests）。
  - TIMEOUT: `corepack pnpm run test:contracts`（300秒）の既知事象は前checkpointの分類を維持し、今回のPlan修正のPASSへ混在させていない。
  - PASS: Run Artifact collector / sanitizerは、このcheckpoint追記後に再実行する。
- ブロッカー / 残作業:
  - 実装は開始していない。ユーザーから実装開始の指示があるまで、Planに列挙したSource変更へ進まない。
  - Wave 0で、commandごとの具体的timeout値・process tree停止方法、watchdogの実装主体・発火条件・証跡保存先、同時実行枠が満杯のときの追加派遣方法を実測して確定する。
- Progress: 100% (9/9)

## 2026-09-16 09:33 JST

- Validation:
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`（exit 0）。
  - PASS: Run Artifact sanitizer（files_scanned 4、files_changed 0、residual_findings 0）。
- Progress: 100% (9/9)

## 2026-09-16 09:36 JST

- Summary:
  - ユーザーの補足により、今回の作業範囲を実装ではなく、Planレビュー用のcommit・push・PR作成へ確定した。実装前調査Agentはこのスコープ変更を受けて明示終了した。
- Parent decision:
  - 今回のPRにはPlanインデックス、5詳細ファイル、当該Planのactive Run Artifactだけを含める。`coverage/`、別Run、製品コード、テストコード、カリキュラム本文、Agent設定は含めない。
  - Planに列挙された実装taskは未完了のまま維持し、PRでは実装開始済みと扱わない。
- Validation:
  - PASS: 現在branchは`feat/self-study-curriculum-test-coverage`で、今回のPR対象commitはまだ作成していない。
  - PASS: 対象PlanのPlan validator、Markdown lint、split link、curriculum validator、Training typecheck、対象Contract test、Run Artifact sanitizerは既存checkpointで確認済み。
- ブロッカー / 残作業:
  - このcheckpoint後に対象ファイルを明示stageし、branch safetyを再確認してcommit・pushする。GitHub CLIは環境に存在しないため、PR作成方法は利用可能なGitHub認証経路を確認して選択する。
- Progress: 100% (9/9)

## 削除候補

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| パス | 理由 | 推奨対応 |
|---|---|---|
|  |  |  |
