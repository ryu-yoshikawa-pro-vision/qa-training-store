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
  - Result: 今回はOwner確認の反映であり、新規Agentは起動していない。既存のRunで複数Agentレビューと結果未取得の扱いを記録済みである。
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

## 2026-09-16 23:00 JST — PR #157残存指摘対応

- Summary:
  - 今回の残存指摘を、Forkの適用範囲、引き渡し構造／ケース対応、ローカルの受講者向け修了確認が証明できる範囲の3点に限定して修正した。
  - ForkはGit／GitHub基礎学習（P2-01〜P2-03）に限って利用できる。C12を含むTraining CIとPart 2最終修了は、正式なsource SHAをHEADへ固定したTraining Copyのみを正式経路とし、Fork上のRun／Check／Artifactを同等の修了証跡へ読み替えない。
  - 固定`handoff-root/`と既存4 CSV、学習者コード、Evidence、Execution Receipt、self-checkを引き渡しの評価境界とし、新しいJSON Manifest、対応表、sidecar metadata、独自Evidence URI、採点用Manifestは追加しない。
  - ローカルの受講者向け修了確認は、構造、成果物、実行記録、ローカルEvidence、記録したGitHub参照の形式・対応を確認する。GitHub API／Tokenなしでは、Runの実在、最終`success`、Check結論、Artifactの現在の存在、別Runでないことを独立証明したとは扱わない。
- Subagent結果とParent判断:
  - Halleyは、既存Training Copy／`training-copy-source.json`／`training:copy:validate`、C12のTraining Copy要件、既存workflowの最小権限、ローカル確認とGitHub外部状態の境界を読み取り専用で確認した。子Agentによるファイル変更はない。
  - Feynmanは、旧来のFork代替記述、旧JSONコンテナ／対応表参照、外部状態の過大な証明表現を横断監査した。Parentは提案された残存箇所をPlanへ反映し、既存のOwner回答を再質問しないと決定した。
  - 過去のREPORTにある調査途中のOwner選択肢・旧構造名はappend-only履歴として保持し、今回の最新追記を現在の確定契約とする。
- Plan changes:
  - インデックスで、Part 2のC12／Training CI／最終修了はTraining Copyを正式経路とし、Forkを同等経路へ読み替えないことを明記した。
  - 詳細1の17レッスン表で、P2-04〜P2-08のCI／ゲート／総合課題の入力・成果物をTraining Copyへ明示的に接続した。引き渡しは固定`handoff-root/`の既知ディレクトリと既存成果物に整理し、既存のTest Case ID、Workbookの`implementation_path`、Playwrightのtitle／annotation／metadata、Receiptの`case_id`等をケース対応の候補とした。安定対応が成立しない場合は新しい追跡基盤を追加せず停止する。
  - 詳細2〜5で、T1／T2／V1のTraining Copy境界、Part 1の任意`source_sha`とPart 2の正式SHAの分離、Receiptの自動生成とCompletion Receiptの構造確認責務、GitHub外部状態の非証明範囲を統一した。
  - 最新の修正開始時点として、PR #157のbase `main`は`b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`、head branchのcommitは`bbba1de2ebbdc0be990bc241c985e087ebcbc30d`であることをPlanへ記録した。push前後に再取得する。
- Validation:
  - PASS: Plan validator（`valid: true`、`missingHeadings: []`）。
  - PASS: `corepack pnpm run lint:markdown`（441 files、0 issues）。
  - PASS: `corepack pnpm run lint:text`（変更Markdown 11件、exit 0）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium／training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`（exit 0）。
  - PASS: 関連Contract Test（`training-curriculum.test.ts`、`ci-workflow.test.ts`、`native-ci-workflow.test.ts`、3 files／59 tests passed）。
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`（`PASS=3 FAIL=0 SKIP=0`）。
  - PASS: `git diff --check`（exit 0）。
  - PASS: Plan 6ファイルの相対リンク監査（6 files、broken 0）。固定Handoff root、既存ケース対応、Training Copy／Fork境界、GitHub外部状態の証明範囲、旧`handoff.json`／`case_code_map`表記の横断監査も条件を満たした。
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`（exit 0、最終REPORT追記前のmachine-managed更新）。
- Scope / status:
  - 実装、教材本文、Workbook、Trainingテスト／workflow、Hook、Agent設定、Harness、package、script、Product／Specは変更していない。既存の未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`はcommit対象外として保持する。
  - R10〜R14を完了し、R15（commit／push前の許可差分・branch safety・既存PR lifecycle確認）はpush前に完了させる。実装は開始していない。
- Progress: 96% (23/24)
- Next: 最終REPORT追記後にcollector／sanitizerを再実行し、許可されたファイルだけを明示stageしてbranch safetyを確認し、commit／pushする。push後は既存PR #157のheadとWeb CI／Mobile App CIの最新結果を確認する。

## 2026-09-16 23:02 JST — Run Artifact最終化前確認

- 最新REPORT追記後の`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`はexit 0だった。
- 続けて`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`を実行し、`files_scanned: 4`、`files_changed: 0`、`replacements_total: 0`、`residual_findings: 0`だった。
- R10〜R14は完了。R15は、commit／push前のbranch safetyと許可差分確認を残している。
- Progress: 96% (23/24)

## 2026-09-16 23:08 JST — commit／push前のscope確定

- `git fetch origin main feat/self-study-curriculum-test-coverage`はexit 0。現在branchは`feat/self-study-curriculum-test-coverage`で、upstreamは同名origin branchである。
- PR #157はopen、baseは`main`、PR headは`bbba1de2ebbdc0be990bc241c985e087ebcbc30d`、mergeableはtrueである。push前の既存headとして記録した。
- `git diff --name-only`は、Planインデックス／詳細1〜5とactive Runの`PLAN.md`／`TASKS.md`／`REPORT.md`の9 tracked filesだけである。未追跡の`.codex/runs/20260915-191711-JST/`と`coverage/`は対象外である。
- R15（commit／push前の許可差分、branch safety、既存PR状態の確認）を完了した。Plan／Runのtracked taskは24件中24件が完了している。
- Progress: 100% (24/24)
- Next: 上記9ファイルだけを明示stageし、差分をcommitして`origin/feat/self-study-curriculum-test-coverage`へpushする。push後のPR headと必須CI確認はGitHub上のfile-changing lifecycleとして実施する。

## 2026-09-16 20:00 JST — W0反映後の通常verify再確認

- `corepack pnpm install --frozen-lockfile`で本体worktreeの不足していた検証依存（`textlint`を含む）を復元した。tracked fileの追加変更はない。
- PowerShell通常verifyはexit 0、`PASS=3 FAIL=0 SKIP=0`だった。
- Bash通常verifyは`PASS=2 FAIL=0 SKIP=2`を出力したが、終了せず実行制限でexit 124となった。FAILは出ていないが、終了コードをPASSへ変換せず、Bash／Windows実行環境の終了待ち問題として未解決に分類する。PowerShell版と、既に完了しているA／B比較の通常verify結果を正本とする。
- 3体のread-only subagentは全て完了し、Receipt方式、Training Copy SHA、GitHub Actions権限の根拠を返した。結果はW0の既定方針・Owner質問条件・T1／T2停止条件へ反映した。
- Progress: 100% (9/9)

## 2026-09-16 18:43 JST — 最新main統合状態の再検証・Plan最終調整

### 1. 確認した参照と統合状態

- 最新main: b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d。
- feature branchのローカルHEAD: 30649cad318fd6486572de0046f602f7d02fa342。
- PR #157のorigin head: 6f8f004c6409acc8423609ab252eeeab3cf8f506。
- 30649caは、最新mainを取り込んだローカルのmerge commitであり、PR head 6f8f004と同じtreeである。mainはfeature側へ既に取り込まれているため、一時worktreeでも追加のmerge／rebaseは行わず、30649caへ今回の未commit Plan差分を適用してBを作った。
- Aはmain-onlyのb9087bd、Bは30649ca＋今回のPlan 6ファイル差分である。
- A／Bの作成・Plan差分適用でconflictは発生しなかった。feature branch本体へのmerge／rebaseは行っていない。

### 2. 最新mainで確認した正式な入口

- package.jsonのlint:text: node scripts/check-text-quality-changes.mjs --base-ref HEAD --working-tree。
- 通常のverify: corepack pnpm run format:check && pnpm run lint:markdown && pnpm run lint:text && pnpm run validate:skills && pnpm run validate:spec && pnpm run validate:spec-visuals:final && pnpm run validate:curriculum && pnpm run lint && pnpm run typecheck && pnpm run validate:image-manifest && pnpm run security:check && pnpm run test && pnpm run build:web && pnpm run build:spec。
- scripts/verify.ps1の引数: StrictHarness、HookContracts。scripts/verifyの引数: --strict-harness、--hook-contracts。
- Hook Contractの正式入口: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts、または bash scripts/verify --hook-contracts。
- 通常verifyの正式入口: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1、または bash scripts/verify。
- 最新mainの .codex/config.toml、.codex/hooks、AGENTS.md、implementation harness、safety harness、関連Contract Testも確認した。Hook／compact後の指示再注入／文章品質／verify入口はmain既存契約である。

### 3. A/B検証の比較

| 検証 | A: main-only | B: main＋PR相当＋最終Plan | 分類 |
| --- | --- | --- | --- |
| lint:text | exit 0、変更Markdown 0件 | exit 0、変更Markdown 6件 | Bの6件はPlan差分。FAILなし |
| lint:markdown | exit 0、435 files、0 issues | exit 0、441 files、0 issues | FAILなし |
| validate:curriculum | exit 0、22 required documents、4 workbook files、training-chromium / training-mobile-chromium | 同じ | FAILなし |
| typecheck:training | exit 0 | exit 0 | FAILなし |
| 関連Contract Test 3 files | exit 0、59 tests passed | exit 0、59 tests passed | FAILなし |
| git diff --check | exit 0 | exit 0 | FAILなし |
| powershell scripts/verify.ps1 | exit 0、PASS=3 FAIL=0 SKIP=0 | 同じ | FAILなし |
| bash scripts/verify | exit 0、PASS=2 FAIL=0 SKIP=2 | 同じ | FAILなし |

関連Contract Testの正式実行内容は、training-curriculum.test.ts、ci-workflow.test.ts、native-ci-workflow.test.tsを、no-file-parallelism、maxWorkers=1、testTimeout=30000で実行したものとする。

### 4. Hook Contractと文章品質の結果

- Aの powershell scripts/verify.ps1 -HookContracts はexit 1、テンプレート契約はPASS、Codex Hook contract testsはFAIL、execpolicy baselineとPowerShell wrapper preflightはPASSだった。
- Bの同じPowerShell入口もexit 1で、Aと同じ TypeError ERR_PACKAGE_IMPORT_NOT_DEFINED、package import specifier #module-evaluator がvitest起動時に解決できないエラーだった。
- A／Bの bash scripts/verify --hook-contracts も同じHook起動エラーでexit 1となった。Bash環境ではcodex executableがないためexecpolicy checksとbash wrapper preflightはSKIP、PowerShell wrapper preflightはPASSだった。
- A／Bで同じ起動エラーが再現し、Plan差分だけのFAILではない。検証回避のためHook／Contract Test／文章品質ルールは変更していない。
- Bの直接下位テスト（rootのVitest実行ファイルを使用）は、codex-hook-contract.test.tsが153 tests passed。codex-text-quality.test.tsは42 tests中41 passed、1 failedだった。2ファイル同時実行では1 file pass、合計195 tests中194 passed、1 failedだった。
- 文章品質の1件は tests/contracts/codex-text-quality.test.ts の「cleans the current session baseline for configured Stop process failures」で、stateFiles(root)が0件を期待したのに1件だった。これはA側でも同じテスト・同じ失敗を再現済みであり、最新main単体でも発生する今回範囲外の既存baseline／一時実行環境問題として分類する。
- したがって、Hook入口はFAILのまま記録する。直接Hook契約153/153 PASSを理由に正式入口のFAILをPASSへ変換しない。

### 5. G1／G2／G3の再監査

- Agent運用側はAG1／AG2／AG3の名前空間へ分離した。AG1は起動判断、AG2は既存契約との整合確認、AG3は隔離したRuntime／ライフサイクル不正系検証であり、ファイル数だけでAgent利用を決めない。
- 最新mainのAGENTS／implementation harness／safety harness／Hook／config／verifyを突合し、compact後の指示再注入、Hook契約、文章品質、既存の権限・sandbox・wrapperをAG2で再実装しないPlanへ修正した。
- AG3は正常系、禁止された書き込み、対象範囲外、childからの再帰起動、親join timeout、child command timeout、自然終了、close、agent枠不足を分離して、実作業ツリー外で検証する。既存HookのGit安全ポリシーG1／G2／G3をAG3の証拠として流用しない。
- V1はL3／T2のカリキュラム／Training受入判定だけを行い、AG3のFAIL／BLOCKED／NOT_RUNはAgent運用の判定として別に報告する。AG3のPASSをV1の必須依存にしていない。

### 6. 最新mainで既に解決済みだったため重複実装しない事項

- Hook、compact後のSessionStart指示再注入、Hookイベント記録、文章品質ゲート、scripts/verifyとverify.ps1のHook Contract入口は最新mainに存在するため、Planから新規実装対象として扱う記述を削除または整合確認へ変更した。
- 最新mainのmax_threads／max_depth、既存AGENTS／Harness／Safety契約を前提にし、Agentを常に最大数起動する要件や、子Agentからの再帰委譲を許す要件を追加していない。
- 監査時点のmain／PR SHAを将来のTraining Copy source SHAへ固定せず、実装時W0／T2で配布可能な正式SHAを確定する記述へ変更した。
- Common／Part 1でGit metadataやsource_shaを必須にせず、Part 2のTraining Copyだけで40文字の正式SHAとtraining-copy-source.jsonを要求するよう変更した。
- P1-5をTC-CART-101一件へ縮小する記述、P1-6で正しいテストを強制的に壊す記述、Completion Receiptだけで理解を証明する記述を削除した。

### 7. ADR-0023との最終判断

- 継続可能な範囲は、既存のJSON、既存filesystem、既存Training script／validator、既存Runner／Reporter、既存source metadataを組み合わせる範囲である。handoff.jsonは相対パスを持つ一時的な搬送Envelope、case_code_mapはそのEnvelope内の追跡情報、training-copy-source.jsonは既存のsource metadataとして扱う。
- Execution Receiptは既存Runner／Reporterまたは既存Playwrightを呼ぶ薄いadapterが生成する実行事実とし、producer、code digest、attempt、実際のexit code、Artifact参照を記録する。署名のない提出JSONや手書きReceiptを実行証明にしない。
- Completion Receiptはschema_version 1の構造・実行条件の確認結果であり、completion-receipt.json自身をexecution_receipt_pathsへ含めない。required_competencies／checked_competenciesは既存評価基準への追跡情報であり、成績・理解度・能力合否を保存しない。複数caseのFAIL／BLOCKED／NOT_RUNを他caseのPASSや後付けEvidenceで上書きしない。
- 独立Manifest、付随／sidecar Manifest、採点用Manifest、独自Evidence URI、新しい永続化方式、独立Runner基盤、受講者状態DB、署名／信頼基盤、受講者の意味理解自動採点が必要になった場合は、ADR改訂または責任者の明示承認までT1／T2を停止する。
- training:completion:checkは既定ではローカル専用で、validate:curriculumや既存workflow allowlistへ自動追加しない。CIから呼ぶ必要が判明した場合だけ、T2でworkflow、allowlist、validator、Contract Testを同時に更新し、L2の構造判断を通す。既存Guardrails内で説明できなければ停止する。

### 8. 修正したPlan 6ファイル

- インデックス: 17レッスンの入力／実施／出力／自己確認／完了／復旧／引き渡しの要求、P1-5全範囲、P1-6の診断教材経路、V1／AG3の分離、正式な検証command、A/B比較を追加した。
- 詳細1: 各Lessonの9項目共通契約、支援コメントの役割、P1-5の複数ケース／正常・境界・異常／Seed・Reset／Desktop・受講者作成Mobile／Workbook対応、P1-6の3系統、SHA任意性、case_code_mapとManifest境界を追加した。
- 詳細2: Waveの唯一の正本、T1／T2の対象、既存training-copy-source.jsonの再利用、prepare／materialize差分の三分類、case_code_mapをhandoff.json内へ限定、AG1／AG2／AG3とHook G1／G2／G3の分離を明記した。
- 詳細3: Completion／Execution Receiptの生成者・入力・出力・状態の分離、schema／出力先／自己参照禁止、case全体の状態優先順、実行真正性の限界、training:completion:checkのローカル既定とCI接続条件、ADR停止条件を明記した。
- 詳細4: 17レッスン×9項目の構造確認、意味理解を自動採点しない境界、C1 read-only、AG3の隔離不正系、Hook／verify／lint／collectorの検証入口を追加した。
- 詳細5: リスク、停止条件、ADR判断、source SHAの段階分離、13項目の最終報告契約を更新した。case_code_mapの説明から独立Manifestを許容し得る「付随マニフェストの候補」表現も削除した。

### 9. 実行した全検証commandと結果

- Plan validator: exit 0、valid true、missingHeadings []。
- corepack pnpm run lint:markdown: Aは435 files／0 issues、B最終版は441 files／0 issues、いずれもexit 0。
- corepack pnpm run lint:text: Aはchanged Markdown 0件でexit 0、B最終版は6件でexit 0。
- corepack pnpm run validate:curriculum: A／Bともexit 0、22 required documents、4 workbook files、training-chromium／training-mobile-chromium。
- corepack pnpm run typecheck:training: A／Bともexit 0。
- 関連Contract Test: A／Bとも3 files、59 tests passed、exit 0。
- powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1: A／Bともexit 0、PASS=3 FAIL=0 SKIP=0。
- bash scripts/verify: A／Bともexit 0、PASS=2 FAIL=0 SKIP=2。codex command未実行のためexecpolicy／bash wrapperはSKIP。
- powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts: A／Bともexit 1、#module-evaluator起動エラー。
- bash scripts/verify --hook-contracts: A／Bともexit 1、同じ#module-evaluator起動エラー。
- 直接下位テスト: codex-hook-contract.test.tsは153/153 PASS。codex-text-quality.test.tsは41/42 PASS、同じbaseline failureが1件。
- Plan専用横断監査: 22項目相当を読み取り専用で確認し、最終結果PASS。
- Run collector: この追記後に scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict を実行する。
- Run sanitizer: collector後に scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check を実行する。

### 10. 残っているFAIL／未確定事項

- 残存FAILはHook Contract正式入口の起動環境（#module-evaluator）と、A／B双方に再現したcodex-text-qualityの既存baseline 1件である。今回のPlan差分が原因のB-only failureではないため、Hook／Test／text quality ruleは今回変更しない。
- Bash版のcodex executable不在による2項目SKIPはA／B同一であり、今回のPlan回帰ではない。Codex実行環境がある環境で再確認する。
- T1／T2の実装前には、実際のRunner／ReporterからReceiptを生成できるか、Training Copyの正式source SHA、materialize対象、GitHub ActionsのRun／Check／Artifactと権限、CI接続のallowlistをW0で実測する。手書きReceipt、独立Manifest、独自URI、新Runner、意味理解自動採点が必要ならT1／T2を停止する。

### 11. Git状態と変更範囲

- 最終確認したfeature branchはfeat/self-study-curriculum-test-coverage、HEADは30649ca。
- tracked変更は、Planインデックス、詳細1〜5、active RunのREPORT.md／TASKS.mdだけである。
- 未追跡のcoverage/と別Run 20260915-191711-JST/は既存のため保持した。今回新たに教材本文、Training script、Test、workflow、Hook、AGENTS、Harness、config、package、scripts/verify*を変更していない。
- git diff --checkはexit 0。今回、commit、push、PR更新、merge、rebase、reset、clean、stashは実行していない。
- Progress: 100% (9/9)

## 2026-09-16 14:56 JST

- 最終検証: PASS。Plan validator、Markdown lint、カリキュラム検証、Trainingの型チェック、対象Contract Test（3ファイル・59テスト）、`git diff --check`、意味監査をすべて完了した。
- 意味監査: Planインデックスと詳細1〜5の6ファイルについて、必須ケース／成果物／状態／ゲート識別子、P1-3の複数ケース契約、G3の不正系6ケース、日本語化対象の旧表現除去を確認した。Playwright、GitHub Actions、コマンド、パス、キー、状態値などの技術識別子は契約維持のため原表記を残した。
- Run成果物: `collect-run-artifacts.ps1 -RefreshGitChangedFiles -Strict` は終了コード0、`sanitize-codex-artifacts.ps1 -Write -Check` は終了コード0、残存検出0だった。
- 範囲確認: 変更対象はPlanインデックス、詳細1〜5、active RunのREPORTだけである。教材本文、Trainingコード、テスト実装、Workflow、Agent設定、Product、Spec、GitHub metadata、未追跡の`coverage/`および別Runには変更を加えていない。
- Git操作: commit、push、PR作成／更新、mergeは実行していない。今回の成果物は実装前のPlanレビュー用である。
- Progress: 100% (9/9)

## 2026-09-16 14:41 JST

- Language audit: ユーザー向けの見出し、表の項目名、一般的な説明を日本語へ統一した。`Playwright`、`GitHub Actions`、コマンド、パス、JSON／CSVキー、正式な成果物名、状態値、エージェント設定識別子など、実装上の識別子は原表記を維持し、日本語の補足を添えた。
- Translation scope: インデックス、詳細1〜5の6ファイルを対象に、`Product Test`、`Not run`、`Common mode`、`Desktop`、`Mobile Web`、`runner`、`wrapper`、`Reporter`、`bounded command timeout`などの一般説明を日本語化した。既存の契約内容、ケース数の扱い、Common／第2部／Native・iOSの境界、ワークブックと引き渡しの責務は変更していない。
- Subagent: Lorentzが読み取り専用の言語監査を完了し、英語の一般語と技術識別子の切り分けを報告した。追加のファイル変更やGit操作は行っていない。
- Scope confirmation: 今回の変更対象はPlanインデックス、詳細1〜5、active Run REPORTだけである。教材本文、Trainingコード、テスト実装、ワークフロー、エージェント設定、製品、仕様、GitHubメタデータ、未追跡の`coverage/`および別Runは変更していない。
- Progress: 100% (9/9)

## 2026-09-16 12:31 JST

- Validation final:
  - PASS: Run Artifact collector（exit 0）。
  - PASS: Run Artifact sanitizer（files_scanned 4、files_changed 0、residual_findings 0）。
  - PASS: git diff --check（collector / sanitizer後も問題なし）。
- Scope confirmation: Plan index、詳細1〜5、active Run REPORT以外のtracked sourceは今回変更していない。未追跡のcoverage/と別Runは既存状態のまま保持した。
- Progress: 100% (9/9)

## 2026-09-16 12:30 JST

- Plan final read-throughで、既存training:copy:prepareが生成するprovisioning差分と受講者成果の区別を詳細3へ追加した。これにより、materialize後のgit diffを「受講者成果だけ」と誤認しない契約になった。
- Validation:
  - PASS: Plan validator（valid: true、missingHeadings: []）。
  - PASS: Plan専用read-only semantic audit（6 files、Wave canonical heading 1、formal command 3、legacy fixed-count / English completion-checker 0、required contract tokens present、G3 matrix present）。
  - PASS: corepack pnpm run lint:markdown（432 files、0 issues）。
  - PASS: git diff --check。
  - collector / sanitizerはこのcheckpoint後に最終実行する。
- Progress: 100% (9/9)

## 2026-09-16 12:20 JST

- Correction: 12:16 JSTの「未実行: なし」はcollector / sanitizer実行前の記載であり、時点表現として訂正する。直後に両方を実行し、次の結果を得た。
- Validation:
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`（exit 0）。
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`（files_scanned 4、files_changed 0、residual_findings 0）。
  - active Run manifestの既存coverage/coverage-summary.jsonと、別Run 20260915-191711-JSTは今回の対象外として変更・削除していない。
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

## 2026-09-16 12:16 JST

- Summary:
  - 今回の範囲を、PR #157の既存Planインデックス・詳細5ファイルの修正と検証だけに固定した。カリキュラム本文、Training code、Test、Workflow、Agent設定、Product、Spec、GitHub metadata、commit、push、PR本文更新、mergeは行っていない。
  - 分割後の詳細1〜5は、Lesson / Workbook / Handoff、Wave / write set、Completion / Receipt / CI、Test / walkthrough / G3、Risk / Owner判断の各責務を分離した。
- Subagent:
  - Curriculum観点から、P1-3の複数Case / Layerを保持し、既存sampleとlearner artifactを分離する必要を確認した。P1-5の既存Case参照とP1-8の改善Evidenceが切れないようPlanへ反映した。
  - Completion / CI観点から、現行Repositoryには正式なtraining:completion:check、Completion Receipt、Handoff import実装がないこと、training:web:exerciseがPlaywright直接実行であることを確認した。T1 / T2の実装前Owner判断へ反映した。
  - Agent lifecycle観点から、T1 / T2のOwner・read / write set・entry / exit gate、G3のisolated negative case、W0のbranch / SHA / dirty set記録、C1のread-only境界が不足していたため追記した。過去のC1実装解釈は訂正記録を追加する対象とした。
- Plan changes:
  - P1-3のCase数固定を撤廃し、TC-CART-101をP1-2 → P1-3 → P1-5 → P1-6の代表縦断Caseとして整理した。P1-3の複数Case、複数設計技法、非UI E2E Layerと理由を維持した。
  - Canonical WorkbookへTARGET-CART-101 / RISK-CART-101 / TC-CART-101を事前投入せず、Provided sample、Learner-created artifact、Validation fixtureを分離した。
  - P1-3 → P1-5のhandoff fields、Seed / Reset、meaningful Assertion、initial / repaired Failure、Self-check、case_code_map、Part 1 → Training Copy materializeを定義した。
  - Execution Receipt（runner / wrapper / Reporterの実行事実）とCompletion Receipt（training:completion:checkの判定結果）を分離し、Workflow前・中・完了後の循環しないdata flowを定義した。
  - Wave dependencyを詳細2だけへ集約し、T1 / T2の具体的write set・gate、G1 / G2の非block、C1の独立性、G3 → V1の関係を明記した。G3は実working treeを使わない。
- Validation:
  - PASS: Plan validator（valid: true、missingHeadings: []）。
  - PASS: Plan専用read-only semantic audit（6 files、Wave canonical heading 1、formal command 3、legacy fixed-count / English completion-checker 0、required contract tokens present、G3 matrix present）。
  - PASS: corepack pnpm run lint:markdown（432 files、0 issues）。
  - PASS: corepack pnpm run validate:curriculum（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: corepack pnpm run typecheck:training。
  - PASS: 対象Contract Test（3 files、59 tests）。
  - PASS: git diff --check。
  - 未実行: なし。Run collector / sanitizerはこの追記後に実行する。
- Correction:
  - 09:36 JST以前の、commit・push・PR作成を次工程とする記録は、現在のユーザー指示により無効。今回のRunではGit mutationを行わず、対象branchの未commit Plan差分をそのまま保持する。
- Progress: 100% (9/9)

## 2026-09-16 16:36 JST

- Summary:
  - PR #157の指示書に従い、対象Plan 6ファイルの修正と検証だけを完了した。教材本文、Training code、Test code、Workflow、Product、Spec、Agent設定、GitHub metadataは変更していない。
  - commit、push、PR本文更新、mergeは実行していない。指示書の「今回はPlan修正・検証のみ」を優先した。
- Current refs:
  - GitHub APIと`git ls-remote`で、PR #157はbase `main` / `b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`、head `feat/self-study-curriculum-test-coverage` / `6f8f004c6409acc8423609ab252eeeab3cf8f506`を確認した。
  - 現チェックアウトのHEADは`826656195ef78dabf72f79e3485b666e9b3921e8`で、`origin/main`の先行変更を含まない。最新baseの変更をPlanへ混ぜず、実装時のW0で再取得する契約を維持した。
- Subagent integration:
  - Curriculum観点はP1-5の正常／境界／異常／Seed／Reset／状態変更／Desktop／Mobile／Workbook対応の範囲を維持し、TC-CART-101を代表縦断ケースに限定した。
  - Completion／CI観点はPart 1のZIP利用とPart 2 Training Copyの正式SHA、prepare／materialize差分、Execution Receipt／Completion Receiptの責務分離を確認した。
  - Agent運用観点は、Agent波を`AG1`／`AG2`／`AG3`と呼び、既存HookのGit安全ポリシー`G1`／`G2`／`G3`と分離した。親のjoin timeout、子のcommand timeout、自然終了、助言、追加派遣、close、不正系の隔離を維持した。
- Plan changes:
  - P1-6を意図的失敗教材／決定的な診断教材／受講者ケースの自然なFailureへ分離し、正しいTC-CART-101を意図的に壊す契約を削除した。
  - P1-5を代表ケース1件へ縮小せず、複数ケースを材料に現在の学習範囲を維持する契約を、インデックス、詳細1、詳細2、詳細3、詳細4へ接続した。
  - Common／Part 1の`source_sha`を任意（ZIPでは省略可）とし、Part 2だけ`training:copy:prepare`／`training-copy-source.json`／`training:copy:validate`の正式な40文字SHAを要求するよう分離した。
  - `training:completion:check`はパス、スキーマ、ケース対応、Reset、Assertion存在、既知の禁止パターン、実行事実、Evidence、追跡などの安定した構造だけを確認し、自然言語と任意コードの意味を完全判定しないよう明記した。C07の意味のあるAssertion、自己確認、V1は維持した。
  - Completion ReceiptのPASSを機械確認可能なPASSに限定し、受講者の理解／Common修了／V1と分離した。V1は開発時受入検証、AG3は独立したAgent運用判定とした。
  - `training:copy:validate`について、prepare直後・materialize後の実行、既知のprovisioning差分・学習者差分・予期しないsource差分、commit後の提出SHAを別々に記録する計画へ修正した。
  - 最新baseのCodex Hook、SessionStart再注入、Hookイベント、文章品質ゲート、Hook契約入口を既存解決済み事項としてAG2へ重複実装しない方針へ修正した。
- Validation:
  - PASS: Plan validator（`valid: true`, `missingHeadings: []`）。
  - PASS: `corepack pnpm run lint:markdown`（432 files、0 issues）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: 対象Contract Test（`training-curriculum`／`ci-workflow`／`native-ci-workflow`、3 files、59 tests）。
  - PASS: `git diff --check`。
  - PASS: Plan専用横断再監査（6 files、17 checks、indexからのMarkdown link 7件、forced initial FAIL／単一ケース縮小／旧SHA／意味完全判定の禁止条件、Workbook境界、Part 2差分、V1／AG3分離を確認）。
  - 未実行: `corepack pnpm run lint:text`。現HEADの`package.json`にscriptがなく、最新`origin/main`側に追加されているため、代替実行せずW0再取得後に実行する。
  - 未実行: `scripts/verify.ps1 -HookContracts`。現HEADのPowerShell入口にparameterがなく、最新`origin/main`側で追加されているため、代替実行しない。
  - FAIL（既存baseline／今回のPlan差分起因ではない）: 現HEADの`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`は`template contract files`の`CODE_REVIEW.md missing Repository coding policy`で終了した。最新baseとの差を解消する実装変更は今回の対象外とし、W0で最新正式入口を再実行する未解決ゲートとして記録する。
  - 既知の全体`test:contracts` timeoutは過去Runの記録どおりPASSへ変換せず、今回の対象Contract Testの限定PASSと分離した。
- Unresolved:
  - ADR-0023のGuardrailsと`handoff.json`／Receipt／構造確認の境界は、搬送Envelope・既存Runnerの実行事実・機械的構造確認に限定できるかをOwnerがW0で確定する。独自Manifest／新しいRunner／受講者専用の意味理解自動採点に当たる場合は、ADR改訂または責任者の明示承認までT1／T2を開始しない。
  - Part 2の正式な`training_copy_source_sha`、GitHub ActionsのRun／Check／Artifactを実際に一巡できる環境、Receipt生成方式は実装時W0で実測して決める。Commonの完了はこれらの不足で停止させない。
- Progress: 100% (9/9)

## 2026-09-16 16:40 JST

- Final scope check:
  - 変更対象はPlanインデックス、詳細1〜5、active Runの`TASKS.md`／`REPORT.md`だけである。既存の未追跡`coverage/`と別Run `20260915-191711-JST`は保持した。
  - 今回のPlan修正に残る未確定事項は詳細5と上記Unresolvedへ記録し、ADR-0023の確認なしにT1／T2へ進まない停止条件を維持した。
- Final artifact validation:
  - `collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`を、今回のRun記録追記後に実行する。
  - `sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`を同じ状態で実行し、残存検出0を確認する。
- Progress: 100% (9/9)

## 2026-09-16 16:40 JST

- Final artifact validation result:
  - collector: exit 0。
- sanitizer: exit 0、`files_scanned: 4`、`files_changed: 0`、`residual_findings: 0`。
- Progress: 100% (9/9)

## 2026-09-16 18:44 JST — Run Artifact最終確認

- 上記の最新main統合再検証記録の追記後に、`scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`を実行し、exit 0を確認した。collectorの標準出力はなく、Runの`run.json`を更新した。
- 続けて、`scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`を実行し、exit 0、`files_scanned: 4`、`files_changed: 0`、`replacements_total: 0`、`residual_findings: 0`を確認した。
- 最新main単体Aと最終Planを適用した統合状態Bの比較、Plan 6ファイルの内容、Hook／Harness／文章品質のFAIL分類、ADR-0023の継続／停止境界は、2026-09-16 18:43 JSTの記録を正とする。
- Progress: 100% (9/9)

## 2026-09-16 18:51 JST — 表記修正後の最終再検証

- Plan内に残っていた英語の`checker` 8箇所を「受講者向け修了確認」または「受講者向け修了確認処理」へ置換した。`Execution Receipt`、`Completion Receipt`、`case_code_map`、コマンド、パス等の技術識別子は原表記を維持した。
- 最終統合worktreeは、30649caへ最新のPlan 6ファイル差分を適用した状態である。Plan validatorはexit 0、`valid: true`、`missingHeadings: []`。Markdown lintは441 files／0 issues、lint:textは変更Markdown 6件でexit 0、validate:curriculumは22 required documents・4 workbook filesでexit 0、typecheck:trainingはexit 0だった。
- 関連Contract Testは3 files／59 tests passed、通常のPowerShell verifyはPASS=3 FAIL=0 SKIP=0、Bash verifyはPASS=2 FAIL=0 SKIP=2、git diff --checkはexit 0だった。
- 最終統合状態のHook Contract正式入口は、PowerShell／Bashともexit 1で、Aと同じ`#module-evaluator`の`ERR_PACKAGE_IMPORT_NOT_DEFINED`起動エラーだった。直前の同一コード状態で直接実行した下位テストはHook 153/153 PASS、文章品質41/42 PASSであり、失敗1件はA／B同じ既存baselineである。
- `rg -i checker`によるPlan 6ファイルの表記確認は該当なし。受講者向け文書上の「completion checker」未翻訳表記は解消した。
- Progress: 100% (9/9)

## 2026-09-16 19:40 JST — W0 3論点の調査優先ルール反映

- Summary:
  - 実装開始前W0について、まず既存実装・教材・既存契約・ADRを調査し、既存契約で一意に決まる事項は採用し、複数案が残って影響がある場合だけOwnerへ質問するルールをPlanへ追加した。
  - 対象はExecution Receiptの生成方式、Part 2 Training Copyの正式な`source_sha`、GitHub Actionsの学習者環境・権限・操作範囲の3点である。
  - Plan、Run Artifact以外のソース・テスト・workflow・設定は変更していない。commit、push、PR更新、merge、rebaseも行っていない。
- Subagent:
  - Execution Receipt調査では、現行`training:web:*`が直接Playwrightを実行し、Reporterは`list`／`html`中心で、Training Web用Receipt Writerは未実装であることを確認した。`.last-run.json`も必要な実行事実を全て持つ正本ではないため、Reporter単独か薄いwrapper／adapterか、ケース対応を既存タイトル・注釈／メタデータ・`handoff.json`内の`case_code_map`のどれで結ぶかはW0で確定する。
  - Execution Receiptの`exit_code`、実行時刻、証跡パス、実行command等は自動生成し、学習者に機械事実を手入力させない。一方、`04_execution-improvement.csv`の`evidence`、原因、改善内容、自己確認、必要な`case_code_map`は学習者の成果・説明として許容するが、Receiptや実行証明とは分離する。
  - Training Copy調査では、`training:copy:prepare`／既存の`training-copy-source.json`／`training:copy:validate`が40文字の小文字full SHA、HEAD、`sourceSha`／`resolvedSourceSha`を一意に検証することを確認した。Part 1の`handoff.json.source_sha`省略可否、ZIP元revision、Part 1とPart 2の同一revision保証は現行受入済み契約だけでは決まらない。
  - GitHub Actions調査では、Training workflowの`pull_request`／`workflow_dispatch`、`contents: read`、Secret／OIDC／Deploy／write権限なし、Artifact保存の安全境界と、branch／commit／push／PR／Run／Check／Artifact確認の基本操作は既存契約から採用できることを確認した。Forkか組織管理Training Copyか、具体的Role・Remote provisioning・Fork時のProduction／Deploy workflow分離担当は一意でない。
- Plan changes:
  - 詳細5に「W0の調査優先ルール」「Execution Receipt」「Part 2の正式`source_sha`」「GitHub Actions権限・操作」「その他のW0確認」を追加し、確認ファイル、事実、既定方針、Owner質問条件、回答待ちの停止条件、Run記録項目を明記した。
  - 詳細3のW0記録境界から詳細5を正本として参照し、Receipt／SHA／GitHub環境の決定と、self-check・Native／iOS・CI後処理の記録責務を分離した。
  - 詳細2とインデックスに、3論点をW0で先に調査し、影響するT1／T2はOwner回答まで開始しないことを接続した。
- Validation:
  - PASS: Plan validator（`valid: true`、`missingHeadings: []`）。
  - PASS: `corepack pnpm run lint:markdown`（441 files、0 issues）。
  - PASS: `corepack pnpm run lint:text`（変更Markdown 11件、exit 0）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium／training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`。
  - PASS: 関連Contract Test（3 files、59 tests passed）。
  - PASS: `git diff --check`。
  - PASS: Plan専用横断監査（W0優先ルール、Receipt調査対象、自動生成と学習者入力の分離、SHA形式／不明扱い、GitHub候補／安全境界、Owner質問条件、停止条件、ADR境界、英語`checker`表記なし）。
- Unresolved:
  - 現行実装ではReceipt方式とケース対応方式が未実装／未固定のため、W0で既存出力だけで必須項目を満たせるかを確認する。満たせない場合に独立Manifest、独自Evidence URI、新しい汎用Runner、手書きReceiptが必要になるなら、ADR-0023の確認または明示承認までT1／T2を停止する。
  - Part 1のSHA省略契約とZIP／Part 2間の同一revision保証は、現行実装から一意に決まらない。保証を完了条件にするか、配布物へrevision情報を追加するかが必要になった場合はOwner判断までT2を開始しない。保証しない場合は、Part 1は実SHAが取れるときだけ記録し、Part 2開始時に別途正式full SHAを確定する。
  - GitHubのFork／組織管理Copyの標準経路、具体的Role、Remote provisioning、Fork時のworkflow分離担当は現行教材・workflowだけでは一意でない。既存の安全権限を越える設定変更、Secrets／OIDC／追加Token、workflow編集を学習者へ要求する場合はT2を停止し、Commonは完了可能なままPart 2をBLOCKED／NOT_RUNとする。
- Progress: 100% (9/9)

## 2026-09-16 21:14 JST — Owner回答反映・W0確定後の最終監査

- Scope / repair-loop:
  - Owner回答を「質問」から「確定契約」へ反映するmust-fixとして扱い、変更対象をPlanインデックス、詳細1〜5、active Runの`TASKS.md`／`REPORT.md`に限定した。教材本文、Workbook CSV、Training実装／テスト、workflow、Hook、Agent設定、Harness、package、script、verify、Product／Spec、GitHubメタデータは変更していない。commit、push、PR更新、merge、rebaseも行っていない。
  - Schrodinger、Rawls、Anscombeのread-only監査を統合した。主な指摘は、Plan内の旧Owner質問、Part 1／Part 2 revision扱いの曖昧さ、Training Copy／Forkの優先順位不足、active Runの古い未解決記録、最終Plan変更後のmachine-managed検証不足、`training:web:exercise`のstarter-only誤判定リスクだった。

- Owner回答の最終反映:
  1. Execution Receiptは、実際のPlaywright実行後に既存Runner／Reporter／実行結果と既存ケース対応情報を結合して自動生成する。`exit_code`、時刻、command、Evidence参照などを手書きにせず、Workbookの原因・Evidence確認・修正理由・改善・解釈とは分離する。独立Runner、状態DB、独立Manifest、独自Evidence URI、未実行Receipt、意味理解の自動採点を追加しない。
  2. Part 1／Commonの`source_sha`は任意で、実在する40文字SHAを取得できる場合だけ記録し、ZIP等で不明でも完了できる。架空値・推測値・固定値・ダミー値は作らない。Part 2は既存の`training:copy:prepare`、`training-copy-source.json`、`training:copy:validate`で正式な40文字の小文字完全SHAを独立して確定する。Part 1／Part 2のrevision不一致はFAIL条件、開始停止条件、移行拒否にしない。
  3. Part 2は準備済みで書き込み可能なTraining Copyを標準経路とし、利用できない場合は学習者自身のForkを代替経路とする。両経路でbranch、commit、push、PR、GitHub ActionsのRun／Check／Artifact確認という同じ学習成果を求める。Organization／repository管理者権限、Secrets、branch protection変更、GitHub App、workflow権限変更、workflow編集は必須にしない。
  - 上記3事項は未解決事項として残っていない。W0は最新実装・教材・既存契約・ADR-0023との具体的な矛盾、既存経路での最小接続可否、影響ウェーブを確認するだけであり、回答済みの選択肢を再質問しない。矛盾がある場合のみ、事実・衝突理由・最小修正範囲・影響ウェーブを添えて再確認する。

- Plan changes:
  - インデックスと詳細1〜5で、Part 1 SHA任意／Part 2正式SHA、revision不一致非FAIL、Training Copy標準／Fork代替、通常権限の境界、ReceiptとWorkbookの責務分離を統一した。旧来の「どちらを選ぶか」「回答待ち」の質問文は削除し、テンプレート互換の質問節には「未回答質問なし」と明記した。
  - materialize後にWorkbook構造、Test Case ID、`case_code_map`、現在のCopy／Forkで解決できるPlaywrightコード、必須command、Receipt／Evidence、型／契約、サンプルと学習者成果の分離を確認する契約を追加した。同一revision保証だけの独立Manifestや自動変換frameworkは追加しない。
  - 現行`training:web:exercise`／`training:web:mobile:exercise`が`training/playwright/exercises`全体を対象とし、開始用コードにはAssertionがない事実を反映した。`case_code_map`に対応する学習者コードの個別実行結果がない場合は、starter／基準実装／suite全体のPASSで修了にしない。不正系フィクスチャとContract Testでこの誤判定を検出する。
  - active RunのTask 10を「Owner回答済みの3契約を実装時W0で最新実装へ突合し、Wave 0の再Baselineを行う」へ修正した。過去の調査時点の未確定記録は履歴として保持し、本追記で終了状態を明示した。

- Validation after the final Plan edits:
  - PASS: Plan validator（`corepack pnpm exec tsx -e ...validatePlanOutput...`、`valid: true`、`missingHeadings: []`）。テンプレート互換の`## 3. 質問 / 曖昧性`は保持し、内容は未回答質問なしとした。
  - PASS: `corepack pnpm run lint:markdown`（441 files、0 issues）。
  - PASS: `corepack pnpm run lint:text`（working-tree、changed Markdown files=11、exit 0）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium／training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`（exit 0）。
  - PASS: 関連Contract Test（`training-curriculum.test.ts`、`ci-workflow.test.ts`、`native-ci-workflow.test.ts`、3 files／59 tests passed）。
  - PASS: `git diff --check`（exit 0）。
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`（`PASS=3 FAIL=0 SKIP=0`、正常終了）。
  - TIMEOUT／PASS扱いしない: `bash scripts/verify`は約240秒で正常終了せずexit 124。途中の`PASS=2 FAIL=0 SKIP=2`だけを最終PASSへ変換しない。
  - Hook formal entry: `powershell ... scripts/verify.ps1 -HookContracts`と`bash scripts/verify --hook-contracts`の今回の再実行は子プロセスが正常終了せず、いずれもツール制限でexit 124となった。先行するA／B同条件の正式入口結果は両方exit 1、`#module-evaluator`の`ERR_PACKAGE_IMPORT_NOT_DEFINED`起動エラーで一致している。直接下位テストはHook 153/153 PASS、文章品質41/42 PASS（1件はA／B共通の既存baseline）であり、今回のPlan差分による回帰とは分類しない。Hook／module resolver／Harnessは変更しない。
  - Plan横断監査: Owner回答済み3事項の未解決質問・英語`completion checker`表記・revision一致要求の残存なしを確認した。意図した「質問しない」「不一致自体はFAILにしない」の文言は除外判定に誤検出されないことも確認した。

- Run / scope status:
  - 本追記後にRun collectorを実行し、machine-managedな`run.json`を更新する。その後sanitizerのWrite／Checkを実行し、残存検出0を確認する。
  - `git status --short`で確認するtracked差分はPlan 6ファイルとactive Runの`TASKS.md`／`REPORT.md`だけである。既存の未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`は対象外として保持し、今回のcommit対象へ含めない。
  - 変更は計画とRun記録だけであり、実装開始前の状態を維持する。Owner回答済み3事項を未解決として再掲せず、未実装のReceipt／completion処理、materialize、Fork経路は次の実装taskのW0／T1／T2へ引き継ぐ。
- Progress: 100% (9/9)

## 2026-09-16 21:15 JST — Run Artifact最終確定

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`: exit 0。collectorのmachine-managed経路で`run.json`を更新した。
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`: exit 0、`files_scanned: 4`、`files_changed: 0`、`replacements_total: 0`、`residual_findings: 0`。
- collector後のtracked差分はactive Runの`REPORT.md`／`TASKS.md`とPlan 6ファイルだけで、`.codex/runs/20260915-212821-JST/run.json`は機械管理対象として直接編集していない。`run.json`の`validation.status: not_run`は、このRun manifestへ検証commandを手書きで注入していないことを示すため、REPORTの実測結果とは別に扱う。
- `git status --short --branch`: `feat/self-study-curriculum-test-coverage`上で、上記8 tracked filesの変更と、今回触れていない既存未追跡`.codex/runs/20260915-191711-JST/`／`coverage/`を確認した。`git diff --stat`: 8 files、675 insertions、209 deletions。`git diff --check`: exit 0。
- Progress: 100% (9/9)

## 2026-09-17 02:24 JST — PR #157 実装開始前の最終Plan修正・再監査

- Summary:
  - 今回の変更対象は、Planインデックスと詳細1〜5、およびactive Runの`PLAN.md`／`TASKS.md`／`REPORT.md`だけである。`training/**`、`scripts/training/**`、`tests/**`、`package.json`、workflow、AGENTS／Agent設定、ADR、Harness、製品／仕様は変更していない。`run.json`は直接編集していない。
  - Part 2のGitHub上Training Copyは、自己学習開始前に運営側または既存の教材提供手順が準備する。学習者へURL、通常の書き込み、branch／push／PR／Run／Check／Artifact確認を渡し、repository作成・管理者権限・Secrets・branch protection／workflow権限変更・GitHub App設定を要求しない。ForkはP2-01〜P2-03のGit／GitHub基礎学習だけで利用でき、C12／Training CI／Part 2最終修了の代替にはしない。
  - Part 1からPart 2最終確認まで固定`handoff-root/`を評価用正本とし、Training Copyは実行環境に限定する。materializeはWorkbook、Repository相対パスを保った学習者コード、必要なテキスト成果だけを配置し、Part 1のTrace／Video／Screenshot／HTML Report／Receipt／self-checkを複製しない。Gitへcommitする成果物と、ローカルHandoff／GitHub Artifactへ保持するEvidenceを分離し、`.gitignore`はT2で既存状態を確認して最小手段を選ぶ。
  - Execution Receiptはrun全体（command、process `exit_code`、時刻、環境、`run_context`、該当するSHA）、case（`case_id`、title／track、result／status、`code_digest`、Evidence参照）、Retry（index、Playwright status、duration、error、Evidence参照）に分け、case／Retryへ架空のprocess exit codeを置かない。Part 1の任意`part1_distribution_sha`（既存入力名`source_sha`を含む）、Training Copy作成元の`training_copy_source_sha`、提出`submission_sha`、実評価対象`ci_sha`／`execution_sha`を分離した。
  - 正式なReceipt生成入口は`training:web:exercise:with-receipt`の1つとし、`--suite exercise|diagnostic`、`--project`、`--root`、`--run-context`を受ける薄いadapterとして固定した。Playwright実行、Receipt生成、Evidenceの固定rootへの保存を一度で行い、`training:completion:check`は再実行・Receipt生成を行わない。Training CIの既存exercise stepは、この入口を一度だけ呼ぶ計画とし、直接exerciseを重ねない。
  - `training:copy:validate`はprepare直後と、HEADが`training_copy_source_sha`のままのmaterialize直後だけに限定する。学習者commit後／CI後は`submission_sha`／`ci_sha`／`execution_sha`、変更範囲、Run／Check／Artifactを別に確認する。C09はdiagnostic initialの期待Failureとdiagnostic repairedのPassを別`run_context`／別Evidenceで揃え、expected-failure教材の期待された非0終了を通常の学習者Failureへ変換しない。
  - Completion Receiptは`<handoff-root>/completion-receipt.json`へ出力し、`receipts/`のExecution Receipt入力へ混入させない。状態は、契約違反等をFAIL、成果不足をINCOMPLETE、環境は利用可能だが必要実行がない場合をNOT_RUN、Training Copy／権限／Runner／Browser／Base URL等の環境不足をBLOCKED、機械確認対象の契約充足をPASSとする。self-checkは`self-check/<既存Lesson ID>.md`で固定し、P1-07／P2-06のNativeは必須にしない。
  - GitHub CIの機械情報（`GITHUB_RUN_ID`、`GITHUB_RUN_ATTEMPT`、`GITHUB_SHA`、repository、workflow／job、Artifact名）と、受講者がブラウザーで確認して固定rootへ残す人間可読Evidenceを分離する。ローカルcheckerはAPIなしにRunの実在、最終success、Check結論、Artifactの現存を独立証明したとは扱わない。ResetはW0で確認する既存の安定シグナルまで、意味的妥当性はWorkbook／self-check／V1までに限定する。C09診断はGit操作なしのasset再配置／演習用コピー復元を最小Recovery候補とし、完成回答を正本へ追加しない。

- Subagent:
  - McClintock
    - Delegation: Plan残存契約のread-only監査。root／target境界、SHAキー、状態分類、self-check表現、active Runの進捗、Training Copy／Fork境界を確認した。
    - Result: `--root`／`--target`は境界ロケーターとして絶対物理パスを許容し、提出物参照だけをroot内相対に制限する必要、Part 1任意SHAの正式キー名、環境不足と未実行の状態分離、T1のファイル名固定表現、R24のpush前後混同を指摘した。初回監査にあったForkをC12代替とする提案は、最新Owner回答と矛盾するため採用しなかった。
    - Parent decision: root例外は詳細1へ既に反映済みであることを確認し、`part1_distribution_sha`／`training_copy_source_sha`をPlanとactive Runへ同期、状態をBLOCKED／NOT_RUNへ決定的に分離、T1の「ファイル名・Assertion構文は固定しないが明示契約は守る」表現へ修正、R24をpush可能状態までの完了へ限定した。ForkはP2-01〜P2-03だけに維持した。
  - Linnaeus
    - Delegation: Training実行／CI／Completion契約のread-only監査。Receiptの正式入口、C09、Handoff座標、materialize、validate段階、focused Contract Test境界を確認した。
    - Result: CIの直接exercise二重実行を避ける必要、C09 initial／repairedの別runとEvidence保持、固定Handoff rootと既存`validate:curriculum`の座標分離、materialize直後のvalidate、実装後focused commandを明文化すべきと報告した。
    - Parent decision: `training:web:exercise:with-receipt`、`--suite`／`--run-context`、materialize command、既存validatorとの座標分離、CI step一回化、C09別Evidence、focused Contract TestをPlanへ反映した。新Runner、Manifest、Evidence URIは追加しない。

- Validation:
  - PASS: Plan validator（`valid: true`、`missingHeadings: []`）。
  - PASS: `corepack pnpm run lint:markdown`（441 files、0 issues）。
  - PASS: `corepack pnpm run lint:text`（working-tree、changed Markdown files=11、exit 0）。
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 workbook files、training-chromium／training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`（exit 0）。
  - PASS: 関連Contract Test（3 files、59 tests passed）。
  - PASS: Windows通常verify（`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`、PASS=3／FAIL=0／SKIP=0、exit 0）。
  - TIMEOUT／PASS扱いしない: POSIX通常verify（`bash scripts/verify`）は個別実行でも600秒以内に正常終了せず、exit 124。並列実行時の先行試行もツール上限でexit 124であり、途中出力をPASSへ変換しない。
  - FAIL（既存Harness／環境）: Windows Hook正式入口（`scripts/verify.ps1 -HookContracts`）はexit 1、`codex-text-quality.test.ts`のStop時session baseline掃除1件が失敗（195 tests中194 passed）。POSIX Hook正式入口（`bash scripts/verify --hook-contracts`）もexit 1、5 failures／190 passes。Windows launcherのUTF-8出力、fail-close期待値、text-quality launcher unavailable、session baseline掃除に関する既存問題であり、Plan差分による回帰とは分類せず、Hook／module resolver／Harnessは変更しない。
  - PASS: `git diff --check`（exit 0）。
  - PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260915-212821-JST -RefreshGitChangedFiles -Strict`（exit 0、`run.json`はcollector経由のみ）。sanitizerはこのcheckpoint追記後に実行する。

- Scope / active Run:
  - active Runの`PLAN.md`／`TASKS.md`は最新契約へ同期し、`REPORT.md`は過去記録を削除せず訂正checkpointを末尾へ追記した。過去／非active Run、Hook JSONL、collector管理情報は変更していない。
  - `TASKS.md`のNowは、今回のPlan／Run同期とpush前検証までを18／18完了として扱う。commit／push、最新PR head、Web CI／Mobile App CIは後続のfile-changing完了条件であり、今回のR24 checkboxで先取りしていない。
  - 現在のlocal HEADは`9194bd13bfbf48244f745be437b459ee7d9ecbf9`、branchは`feat/self-study-curriculum-test-coverage`、確認済み`origin/main`は`b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`である。push直前にlocal／remote／PR／baseを再取得する。
- 既存未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`は今回のcommit対象外として保持する。
- Progress: 100% (18/18)

## 2026-09-17 実装開始時W0再Baseline

- 依頼: PR #157で承認済みのPlanを再設計せず、講師なし自己学習カリキュラム、修了確認、Receipt、Training Copy、Training CIをPlanのウェーブ順で実装する。
- Git／PR事実:
  - current branch: `feat/self-study-curriculum-test-coverage`
  - local HEAD: `5881f2ae58abbe51896f9b4a89d5ab67d64c62f0`
  - `origin/feat/self-study-curriculum-test-coverage`: `5881f2ae58abbe51896f9b4a89d5ab67d64c62f0`
  - `origin/main`: `b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`
  - PR #157: OPEN、base `main`、head branch `feat/self-study-curriculum-test-coverage`、PR headはlocal／remote feature HEADと一致。
  - `git status --short --branch`: tracked worktreeはclean。既存未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`だけを確認し、今回のscopeから除外する。
- 最新実装との突合:
  - `package.json`には既存の`training:web:baseline`、直接`training:web:exercise`、mobile／diagnostic／expected-failure、`training:copy:prepare`／`validate`、curriculum／training typecheckが存在する。既存の直接commandは互換性維持のため変更しない。
  - `playwright.training.config.ts`は`training/playwright`をtestDirとし、Desktop／Mobile project、HTML report、test-results、trace／screenshot／video、CI retryを既に提供する。`reset-scenario.ts`の`__TEST_API__` readiness、reset、reload、metadata確認を学習者TestのReset入口として再利用する。
  - Exercise starterはresetと遷移だけでAssertionを持たない。starter／baseline／suite全体のPASSを学習者成果と誤認しない契約が必要である。Diagnosticは決定的な誤期待値を持ち、Expected-failureは専用の期待非0経路である。
  - Workbookの正本4 CSVはsample／templateで、`implementation_path`は現状空欄、`04_execution-improvement.csv`は`Not run`でEvidence空欄。完成答案・学習者回答を正本へ追加しない。
  - `training:copy:prepare`は指定full SHAでdetached copyを作り、`training-copy-source.json`へ`sourceSha`／`resolvedSourceSha`を記録する。`training:copy:validate`はactive workflow allowlist、manifest、HEAD一致、template一致、workflow契約を検証する。Part 1任意SHAとPart 2正式SHAを混同しない。
  - `training-ci.yml`はroot `contents: read`、pinned action、Training Web baseline、直接exercise、expected-failure、Playwright artifact uploadを持つ。`workflow-contract.ts`は現在直接exerciseの一回性を検証するため、T2でReceipt付きformal commandへ最小変更する。Secrets、管理者権限、追加Token、workflow権限変更は不要である。
  - `AGENTS.md`、`.codex/config.toml`、既存Hook／Harness／verify、ADR-0023は既存契約を確認済み。Agent設定、permission、sandbox、wrapper、model、thread、Hook／Harness自体は変更しない。C1／AG1〜AG3は読み取り専用確認として扱う。
- W0判断:
  - Planの既存Runner／Reporter／reset／copy／workflow契約で、Receipt adapter、Completion checker、materialize、教材契約の実装へ進める。新Runner、DB、handoff／case mapping Manifest、独自Evidence URI、GitHub API依存は追加しない。
  - 既存Workbookの`implementation_path`が空欄のため、受講者が作成するRepository相対Pathと既存Test Case ID／title等の対応を教材へ明示する。対応情報が既存経路で解決できない場合はT1／T2を停止し、架空のManifestを追加しない。
  - Part 1のZIP等では`part1_distribution_sha`を取得できる場合だけ記録し、Part 2のTraining Copy作成時に`training_copy_source_sha`を既存prepare／validateで確定する。同一revision保証を追加しない。
  - ForkはP2-01〜P2-03のGit／GitHub基礎だけに限定し、C12／Training CI／Part 2最終修了は事前準備済みで学習者が書き込めるTraining Copyを正式経路とする。
  - Diagnosticのtracked fixtureには既存のGitless復元helperがないことを確認した。L2で既存の誤期待値fixtureを保ったまま、学習者コピーを初期状態へ戻す最小Recoveryを実装要否判定する。完成答案をfixtureへ追加しない。
- Validation / evidence:
  - PASS: `git fetch origin main feat/self-study-curriculum-test-coverage`。
  - PASS: branch／HEAD／remote／PR／working treeの再取得。既存PR headとlocal／remote feature HEADが一致。
  - PASS（Plan-only時点の既存CI、実装前HEAD）: Web CI run `35128313253`、Mobile App CI run `35128313499`はいずれも対象HEAD `5881f2a...`でcompleted／success。実装後HEADのCI結果には流用しない。
  - 実装後にPlan指定の関連Contract Test、curriculum／training typecheck、workflow contract、verify、collector／sanitizerを再実行する。過去に確認したPOSIX verify timeoutとHook Harness既存failureは、新HEADで再発した場合に原因と回帰を分離する。
- Delegation:
  - Darwin、Lagrange、Parfitへcurriculum、Training／Receipt／CI、Agent／Harnessのread-only W0確認を並列依頼済み。各Agentはsource変更・child delegationを行わない契約で管理し、結果は受領後にこのRunへ追記する。ParentはW0判断、scope、実装、検証、完了判定を保持する。
- Result: W0の開始条件と既存契約の再突合を完了。停止条件に該当する実装上の矛盾は現時点で確認されないため、L1へ進む。
- Progress: 21% (4/19 tracked implementation checkpoints; W0完了、残りL1〜VF)。

## 2026-09-17 02:30 JST — Run Artifact sanitizer最終確認

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260915-212821-JST -Write -Check`: exit 0。`files_scanned: 4`、`files_changed: 0`、`replacements_total: 0`、`residual_findings: 0`。
- 上記結果を含め、active Runのmachine-managed `run.json`は直接編集していない。Plan／Runの許可対象以外の未追跡ファイルはcommit対象外のまま保持する。
- Progress: 100% (18/18)

## 2026-09-17 実装差分の修復・commit前再検証

- 実装対象は承認済みPlanのL1／L2／L3／T1／T2と関連Contract Testに限定した。既存の製品コード、正本Workbookの既存行、Agent設定、Hook／Harness、ADRは変更していない。既存未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`もcommit対象外として保持する。
- Repair iteration 1（`must_fix` 5件）を完了した。
  - `04_execution-improvement.csv`を同一Receiptのcontext／result／evidenceへ結び付け、未実行・不一致・架空EvidenceをPASSにしない。
  - Receiptの`case_id`が空でも、既存Workbookの`implementation_path`から一意に解決できる場合だけ対応付ける。曖昧な対応はFAILとする。
  - 正式なReceipt producer、実行command、Playwright result／statusを要求し、手書きReceiptや別commandの結果を受け付けない。
  - materializeの学習者コードを`training/playwright/`配下のTS／JSへ限定し、symlink／既存target／衝突／workflow・製品パスの混入を拒否する。
  - Part 2のCI Receiptについて、同一runの`training_copy_source_sha`、`ci.sha`／`github_sha`、case Evidence内のRun／Check／Artifactを検証する。
- 修復後の関連Contract Testは、`training-completion`／`training-execution-receipt`の23 tests、curriculum／CI／Nativeの60 testsがPASSした。6ファイル一括実行では85 testsがPASSしたが、`training-copy-handoff`の成功ケースでVitestがsource-map解析中にUnhandled Errorを報告した。実際の失敗原因は、テストが`git rev-parse HEAD`でcommit前の古いHEADを取得し、古いworkflow contractをcloneして`training:copy:validate`が失敗することと特定済みである。source-mapの文字化けエラー自体はVitest／環境側の表示問題であり、commit後HEADで成功ケースを再実行する。
- 既にPASSしている検証: `corepack pnpm run typecheck:training`、`corepack pnpm run typecheck:native-tests`、`corepack pnpm run validate:curriculum`、`corepack pnpm run lint:markdown`、変更TSのESLint、変更対象のPrettier、`git diff --check`。`typecheck:app`を含む全体typecheckは既存`src/**`の`/guide` route type error 6件でFAILし、今回の差分起因ではない。POSIX verify timeoutと既存Hook contract failureは、今回の実装変更とは別の既知状態として引き続き分離する。
- 実行済みの受入確認: formal Receipt入口のlocal exercise smokeはexit 0、diagnostic initialは期待どおりexit 1でReceipt／failed caseを生成、Gitless restore helperはexit 0。producer／implementation pathの最終確認とmaterialize成功経路はcommit後に再実行する。
- Decision: `continue`。commit前の残差は既知のHEAD依存テスト1経路であり、実装契約の追加曖昧さではない。次は実装差分を明示的にstageしてcommitし、commit後のmaterialize／focused Contract Testとformal smokeを再実行する。
- Progress: 98% (51/52)。VF（最終validation、Run collector／sanitizer、差分／branch確認、commit／push／PR #157／最新必須CI確認）のみ未完了。

## 2026-09-17 Repair iteration 2 — Mobile App CIのNative Static failureへの最小修正

- Input finding: 実装commit `240981d43a201c53966a6bcd220a000d3f8b59c0` の最新PR headで、`Web CI`はsuccessだった一方、`Mobile App CI`の`Native Static`がExpo Doctorの依存版数検査でfailureになった。ログは`expo-build-properties expected ~57.0.20 found 57.0.19`であり、別のNative source／workflow failureは確認されなかった。
- Classification: `must_fix`。現在のpackage.jsonへ追加したTraining commandによりNative workflowの変更検知対象へ入るため、PRの必須CIをsuccessにするための安全な最小修正として扱う。許可範囲は`package.json`と`pnpm-lock.yaml`だけとし、Native workflow、Native source、Training実装、既存Hook／Harnessは変更しない。
- Repair: `expo-build-properties`を`57.0.19`からExpo Doctorが要求する`57.0.20`へ更新し、lockfileも同じpackageのspecifier／resolution／snapshotだけを同期した。更新時にpnpmが生成した無関係なtransitive dependency差分は除外した。
- Local validation:
  - PASS: `corepack pnpm install --frozen-lockfile --ignore-scripts`（lockfileは最新、対象packageのみ57.0.20へ更新）。
  - PASS: `corepack pnpm dlx expo-doctor@1.17.6`（17/17 checks passed）。
  - PASS: 6 contract files／88 tests、`typecheck:training`、`typecheck:native-tests`、`validate:curriculum`、`lint:markdown`（441 files／0 issues）、`lint:text`、`git diff --check`。
- Scope check: 修復対象のsource差分は`package.json`と`pnpm-lock.yaml`だけで、active Runの`REPORT.md`／collector更新済み`run.json`を記録として含める。既存未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`はcommit対象外のまま保持し、`pnpm-lock.yaml`に対象外の依存更新を残していない。
- Decision: `continue`。修正は安全な依存patch同期として成立したため、明示stage・commit・push後に、最新headだけを対象として`Web CI`／`Mobile App CI`を再確認する。新headのCIが別failureになった場合は、原因を再分類し、同じ修正を無制限に反復しない。
- Progress: 98% (51/52)。VF（最終validation、Run collector／sanitizer、差分／branch確認、commit／push／PR #157／最新必須CI確認）は、修正commitと最新CI確認まで未完了。

## 2026-09-17 20:12 JST — 実装レビュー指摘の統合対応・push前最終検証

- 対応範囲: PR #157の承認済みPlanに定義された自己学習カリキュラム、Workbook／Test Case／Learner Code／Execution Receipt／Evidence／Completion、Training Copy、Training CIの契約だけを更新した。`src/**`、製品仕様、Formal Regression、Native product、Agent／Hook／Harness／権限設定は変更していない。
- 根本原因と修正:
  - 実Playwright統合契約で、親プロセスがfixture HTTP serverのイベントループを塞いでいたため、fixture serverを子プロセス化し、実Runner／Reporter／Receipt／Completionを同一経路で検証できるようにした。
  - 実アプリの実画面見出しは`すべての商品`であり、fixture／Learner specの誤った期待値`商品一覧`を実アプリ契約へ合わせた。
  - C10改善後に過去Receiptのコードdigestだけが古くなるため、履歴Receiptを保持し、同一Case／Contextの最新Receiptで現行digestを確認する方式へ整理した。
  - `--test-root`、`PLAYWRIGHT_TEST_ROOT`、webServer skip、Windows child process型を整え、local／handoff／Training Copyで同じformal実行経路を利用できるようにした。
  - Training Copyのremote値を対象作成前に検証し、prepare後の`origin`設定・確認を追加した。教材文書は講師依存表現を除き、Input／Output／Completionと自己学習の開始条件を明記した。
- PASS:
  - 変更対象Prettier、`git diff --check`。
  - `corepack pnpm run lint:text`（変更Markdown 16 files）、`corepack pnpm run lint`（0 errors、既存warningのみ）、`corepack pnpm run validate:curriculum`。
  - `corepack pnpm run security:check`（runtime 233 files、credential scan 370 files）。
  - `tsc --noEmit --project tsconfig.training.json`、`tsconfig.native-tests.json`。
  - 関連Contract Test 4 files／57 tests。標準Fixtureの実Runtime統合、実アプリを使うRuntime統合もPASS。
  - buildのmanual equivalent（font assets、image manifest、Expo web export、docs build）。
- 非PASSの記録:
  - 全体`test:contracts`は360秒でtimeout（exit 124）のためPASS扱いしない。
  - 全体`format:check`は既存`app/**`と未追跡`coverage/`を含む環境差分でFAIL。変更対象のPrettierはPASS。
  - `typecheck:app`は既存`/guide` route type error 6件のみ。今回の`src/**`差分はない。
  - `serve-web-dist`関連テストはassertion PASS後のWindows temp directory cleanupで`EBUSY`が発生した既知の環境cleanup flake。
- 実行経路の受入確認: Common V1は実アプリ統合テストで、複数Learner Case、Receipt、C09の初回Failure→同一target修正→別run Pass、C10の実issue→改善→別runを含めPASSした。Part 2の実GitHub Training Copy／PR／Actions実行はこの環境では未実行であり、未実行をPASSへ変換しない。
- Git状態: local HEADは`bbf77b2148174df61f05707215e216727c1e4e76`、branchは`feat/self-study-curriculum-test-coverage`。既存未追跡`.codex/runs/20260915-191711-JST/`と`coverage/`はcommit対象外として保持する。次はcollector／sanitizer、意図したファイルだけのstage、commit／push、既存PR #157のheadと新headの必須CI確認を行う。
- Decision: `continue`。実装とpush前検証に残る未完了作業はGit／PR／CIの最終反映だけであり、追加の要件判断は不要。
- Progress: 98% (51/52)。

## 2026-09-17 22:55 JST — PR #157 最新レビュー残存指摘の修復・最終commit前確認

- 対応範囲: レビュー基準head `8d6a6de0ec302c7a99fdd0f210df7286ddd24f68`以降の、C09／C10／Learner Case抽出／Part 2 provenance／Receipt状態分類／Common RuntimeとTraining Copy境界に限定した。`src/**`、製品仕様、Formal Regression、Native実装、Agent／Hook／Harness設定、permission、Manifest／DB／新しい対応表は変更していない。
- Subagent delegation:
  - Kuhn: C09 Workbook行、C10時系列／digest、Learner `Automate + empty implementation_path`のread-only監査。Receiptだけで完了できる残差を確認した。
  - Hooke: Part 2 SHA provenance、run-level BLOCKED、Learner import error、Completion Receipt fieldのread-only監査。selected CI Receiptへの4 SHA束縛と広すぎるimport-error判定の修正対象を確認した。
  - Poincare: Runtime fixture／formal handoff／materialize境界のread-only監査。formal `code/`へ既存Harnessをコピーしないこと、Training Copy側の既存resetを保持すること、Training Copy fixtureの相対import誤りを確認した。
  - Heisenberg: PR／最新main／既存CIのread-only監査。PR #157はOPEN、今回開始時のheadは `8d6a6de`、最新 `origin/main`は `fa6963e`で、push前の既存CIを新headへ流用しないことを確認した。
  - Parent decision: 4 Agentともsource変更・commit・push・child delegationを行っていない。明示された残存指摘だけをmust-fixとして実装し、Poincareが指摘した既存 `restore` の強制上書き／materialize失敗時の原子性は今回の指定範囲を超えるため、別対応へ広げなかった。
- Root Cause / 修正:
  - C09はReceiptのinitial Failure／repaired Passだけを見ており、selected Workbook行の `result`、Failure分析3項目、Evidence対応、Receipt時系列を拘束していなかった。Diagnosticではinitial／repairedの実コードdigest差分も要求し、自然なLearner Failureではdigest変更を要求せず、両経路でrepairedがinitialより後であること、別Evidence、同一Case／Pathを確認するようにした。
  - C10は改善記録とPass Receiptだけで成立し得たため、同一Case／同一代表Pathの改善前通常Receiptを時系列で選択し、改善後 `c10-improved` Receiptが後続、clean Pass、Evidence対応、digest変更であることを確認するようにした。
  - Canonical WorkbookのAutomate sample IDだけは空Pathを許容し、Workbookへ新規追加されたAutomate Caseの空PathはLearner集合へ残してINCOMPLETEにした。Later／Do not automateの空Pathは強制しない。
  - Part 2の `training_copy_source_sha`、`submission_sha`、`ci_sha`、`execution_sha`を、最新selected CI Receiptの同一 `run` からだけ出力するようにした。CommonのSHA取得契約は変更していない。
  - BLOCKEDはcase loopの内側だけでなく、最新Receiptをrun_context単位で選択してrun単位に分類し、zero-caseでもBLOCKEDにした。利用可能runのzero-caseはNOT_RUNとし、古いBLOCKED Receiptが新しい同一Contextのavailable runを汚染しないようにした。blocked markerには非空 `blocked_reason`を要求し、producerも理由なしblocked Receiptを生成しない。
  - `knownEnvironmentFailure`から `Cannot find module`等の広い判定を除去し、browser executable未導入、Base URL到達不能、webServer起動失敗、process起動失敗など安定した環境要因だけをBLOCKEDへ分類するようにした。
  - Runtime integrationではformal handoffの`code/`へ既存 `reset-scenario.ts`を入れず、実行専用fixtureへHarnessを注入した。Learner helperはformal handoffへ置き、`materializeTrainingHandoff`後にLearner spec／helper／Workbookが配置され、既存Training Copy側resetが上書きされないことを確認した。Training Copy handoff fixtureのLearner spec importも `../support/reset-scenario`へ是正した。
  - `checked_outputs.execution_receipts`は全Learner Caseの実行有無を確認し、C07のmachine checked表示もLearner code、Workbook binding、Receipt、Evidenceが揃った場合だけに限定した。意味的なテスト妥当性は自動判定していない。
- 変更ファイル: `scripts/training/check-completion.ts`、`scripts/training/run-playwright-with-receipt.ts`、`tests/contracts/training-completion.test.ts`、`tests/contracts/training-execution-receipt.test.ts`、`tests/contracts/training-copy-handoff.test.ts`、`tests/contracts/training-runtime-integration.test.ts`。既存未追跡 `.codex/runs/20260915-191711-JST/` と `coverage/`はcommit対象外として保持した。
- Contract Test:
  - PASS: 対象6 files／122 tests。C09のFailure分析3項目、Workbook initial／repaired行、Evidence対応、時系列、Diagnostic digest差分、自然Failure経路、C10 before／after／Case／Path／clean rerun、空PathLearner、Canonical／Later空Path、selected CI SHA、zero-case BLOCKED／NOT_RUN、environment failure分類、Training Copy境界を含む。
  - PASS: `RUN_TRAINING_RUNTIME_CONTRACT=1 corepack pnpm run test:contracts:training-runtime`相当のPowerShell実行、1 test。実Playwright／JSON Reporter／Execution Receipt、Diagnostic initial Failure、実ファイル修正、Diagnostic repaired Pass、C10実コード変更とdigest差分、Common Completion、materializeまでPASS。実アプリmodeは `127.0.0.1:8082`が接続拒否で未実行。
  - PASS: `corepack pnpm exec vitest run tests/contracts/training-copy-handoff.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`、5 tests。prepare／validate／materialize、Learner helper、origin、既存reset非上書きを確認した。materializeの2ケースは実測で30秒を超えるため、test単位timeoutを120秒へ設定した。
- Validation:
  - PASS: `corepack pnpm run validate:curriculum`（22 required documents、4 Workbook、training-chromium／training-mobile-chromium）。
  - PASS: `corepack pnpm run typecheck:training`、`corepack pnpm run typecheck:native-tests`。
  - PASS: `corepack pnpm run lint`（0 errors、既存warning 66件のみ）、`corepack pnpm run lint:markdown`（441 files／0 issues）、`corepack pnpm run lint:text`、`corepack pnpm run security:check`、変更対象Prettier、`git diff --check`。
  - FAIL（今回差分外）: `corepack pnpm run typecheck:app`は `src/**`の`/guide` route type error 6件のみ。今回変更したtest／script由来の追加エラーはない。
  - FAIL（今回差分外・branchが最新mainの修正を未包含）: `corepack pnpm run test:contracts`は約511.7秒後に `tests/contracts/codex-text-quality.test.ts`の「configured Stop process failures」1件でexit 1。単独再実行でも同じstate file残存を再現した。38 files passed、1 skipped、645 tests passed、5 skipped、1 failed。現在branchの旧Stop test timeoutは30秒で、最新 `origin/main`側の `34958b6`ではこの領域が90秒へ調整済みだが、今回のscopeにHook／Harness変更やmain取り込みを追加していない。今回の6対象fileは別focusedで122／122 PASSしている。
- Part 2 V1: `BLOCKED`。ローカルのprepare／validate／materializeはPASSしたが、学習者書き込み可能なGitHub Training Copy、権限、branch／push／PR、Training CI Run／Check／Artifact、人間Evidenceを実施できる環境がこのRunへ提供されていない。Source repository自身やlocal disposable copyをPart 2 V1の実GitHub経路へ読み替えない。repository provisioningやGitHub API必須化も今回追加しない。
- Common V1: `PASS`（local fixture Runtime経路）。複数Learner Case、Sample／Later共存、Reset、Assertion、実Receipt、C09 Failure分析と実修正、C10 actual code changeとclean rerun、Common Completion、formal handoffからTraining Copy materialize境界を確認した。実アプリmodeは環境なしとして別記録。
- Decision: `continue`。ローカル実装・対象focused・Runtime・Common V1は完了。次は既存Run collector／sanitizer、最終scope／branch／PR確認、明示pathだけのcommit・通常push、最新headのWeb CI／Mobile App CI確認、既存PR #157本文更新を行う。merge、force push、Part 2 remote provisioningは行わない。
- Progress: 98% (51/52)。
