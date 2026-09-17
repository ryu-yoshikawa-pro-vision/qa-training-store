# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. 依頼を自己学習化とAgent協働運用の2つの作業軸へ分解する。
- [x] 2. feature-plan、RepositoryのPlan / Run規約、既存関連Planを確認する。
- [x] 3. curriculum、Training / Test、Agent運用を複数Agentへ並列調査する。
- [x] 4. 調査結果とCurrent `main`の事実を統合する。
- [x] 5. 実装順、対象ファイル、DoD、検証、停止条件をPlanへ落とし込む。
- [x] 6. Planを`docs/plans/`へ保存する。
- [x] 7. Run Artifactを更新・sanitizer確認する。
- [x] 8. 長文Planを既存パスのインデックスと5つの詳細ファイルへ分割し、内容保持とリンクを検証する。
- [x] 9. Agentの待機・timeout・助言・追加派遣・close方針をPlanとactive Run計画へ反映する。
- [x] R16. 最終指示、最新main／PR／branch、許可されたPlan／Run差分を再baselineする。
- [x] R17. GitHub上の事前準備済みTraining Copy、学習者権限、ForkをP2-01〜P2-03へ限定する境界を全Planへ同期する。
- [x] R18. 固定`handoff-root/`を評価正本として維持し、Repository相対コード、materialize対象、Git／ローカルEvidence境界を同期する。
- [x] R19. Execution Receiptのrun／case／Retry、SHA分離、正式なReceipt付き実行入口、Evidence保持を全Planへ同期する。
- [x] R20. `training:copy:validate`の適用段階、C09期待Failure、Completion状態、Completion Receipt出力先を同期する。
- [x] R21. Lesson ID別self-check、CI機械情報と人間可読Evidenceの境界、Reset確認範囲、Gitless診断教材Recoveryを同期する。
- [x] R22. T1／T2の責務、W0の再質問禁止事項、Contract Test正常系／不正系、active Run保護境界を再監査する。
- [x] R23. active RunのPLAN／TASKS／REPORTを最新Planへ同期し、REPORTはappend-onlyの訂正checkpointで記録する。
- [x] R24. 必須validation、collector／sanitizer、差分／branch safety、commit／push前のPR状態を確認し、push可能な状態へ整える。push後のPR head／必須CI確認はfile-changing taskの後続完了条件とし、このcheckboxでは完了扱いにしない。

## 今回のPR #157再監査・修正（2026-09-16）

- [x] R1. 指示書、最新PR base／head、origin/main、対象branch、既存Runを再確認する。
- [x] R2. Plan 6ファイルを横断監査し、P1-6の失敗契約とP1-5の学習範囲を修正する。
- [x] R3. Part 1のZIP／任意`part1_distribution_sha`（既存入力名が`source_sha`の場合を含む）とPart 2 Training Copyの正式な`training_copy_source_sha`契約を分離する。
- [x] R4. 自動確認の構造境界、Receiptの責務、意味理解の自己確認境界を修正する。
- [x] R5. V1とAgent運用（AG1／AG2／AG3、Hook側G1／G2／G3）の依存・名称・停止条件を分離する。
- [x] R6. 最新baseのHook／Harness／文章品質ゲート／verify変更を重複実装しない方針へ反映する。
- [x] R7. Plan分割後のリンク、正本Workbook境界、実装write set、Part 2 materialize経路を再監査する。
- [x] R8. Plan validator、lint、curriculum／Training確認、関連Contract Test、diff、Run collector／sanitizerを実行し、PASS／FAIL／未実行を分類する。
- [x] R9. 検証結果と未確定事項をREPORTへ追記し、今回の変更範囲を最終確認する。
- [x] R10. 最新main／PR headと既存契約を再確認し、残存3点の修正境界を確定する。
- [x] R11. ForkをGit／GitHub基礎学習に限定し、C12／Training CI／Part 2最終修了をTraining Copyへ固定する。
- [x] R12. 固定Handoff root、既存成果物、既存ケース対応を採用し、新しいManifest／対応表を計画から除去する。
- [x] R13. ローカル修了確認の責務を構造・記録確認へ限定し、GitHub外部状態の独立証明を行わない境界を明記する。
- [x] R14. Plan横断監査、必須validation、Run collector／sanitizerを実行し、結果をREPORTへ記録する。
- [x] R15. commit／push前の許可差分、branch safety、既存PR #157の状態を確認し、push対象を確定する。

## 次の実装taskで行うこと

- [x] I1. Owner回答済みの3契約を実装時W0で最新実装へ突合し、Wave 0の再Baselineを行う。確定済み事項を再質問しない。
- [x] I2. Lesson共通契約とP1-2〜P1-6縦断パイロットを実装する。
- [x] I3. 受講者向け修了確認とPart 2自走導線を実装する。
- [x] I4. 全Lesson、ACテスト、Traceability、Agent routingへ展開する。

## 実装Run（2026-09-17開始）

- [x] W0. 実装開始時点のbranch／HEAD／PR／main／CI／working treeと、Playwright・Workbook・Training Copy・workflow・Harnessの既存契約を再確認する。
- [x] L1. Lesson共通契約、Workbookのhandoff説明、17 Lessonの正本導線を更新する。
- [x] L2. P1-02〜P1-06とPlaywright教材fixtureへ縦断パイロットを反映する。
- [x] L3. 残りのLesson、Part 2導線、必要なcurriculum Contract Testを反映する。
- [x] T1. `training:completion:check`、Completion Receipt、Completion Contract Testを実装する。
- [x] T2. Receipt付き実行、Training Copy materialize、Training workflow、関連Contract Testを実装する。
- [x] AG1/AG2/AG3/C1. Agent運用と既存main契約を読み取り専用で確認し、実装へ混入させない。
- [x] V1. CommonとPart 2の講師なし一巡を、環境状態を分離して受入確認する。
- [ ] VF. 最終validation、Run collector／sanitizer、差分／branch確認、commit／push／PR #157／最新必須CI確認を完了する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- 現行の`AGENTS.md`にはParent / child責務はあるが、タスク規模別のdelegation条件・join・close閾値はない。
- `.codex/config.toml`は5つのAgent定義に対して`max_threads = 4`であり、上限の実効解釈は実Runで確認する。
- `docs/reference/subagent-observation.md`は存在せず、既存のHook / Run契約へ新しいsubagent manifestを追加しない方針を維持する。
- Plan Round 1で、17 Lesson監査表、exact write set、Wave gate / rollback、受講者向け修了確認の状態／Receipt、Part 2 self-service Copy経路、AC matrixを追加した。
- Plan Round 2の3つのread-only委譲はbounded wait内に結果を返さず、interrupt / closeした。結果未取得をPASS扱いせず、親Agentの静的監査で補完した。
- `corepack pnpm run test:contracts`は300秒でtimeoutしたが、`tests/contracts/training-curriculum.test.ts`の限定実行は19 tests PASS。全体timeoutの原因は未分類の既存環境／テスト実行問題として実装前に再確認する。
- 今回のPlan分割では、code_researcher / implementation_researcher / test_investigatorの3体と、explorer 3体をread-onlyで起動した。いずれもbounded wait内に結果を返さなかったため、結果をPASSや「指摘なし」として採用せずcloseした。
- 分割前のPlan 824行・SHA-256 `5B52C08A3453E44D73C7F14A0EF02B930BFD29AAF59716BECC314B6A8DBFCCF8`を基準に、原文セクションブロックと重要トークンを分割後ファイルへ照合した。
- 今後の標準Agent運用は、親Agentが非ブロッキングに管理し、調査Agentは自然終了まで継続し、テスト・ビルド等のコマンドtimeoutは子Agent自身が管理する。親Agentは助言・追加派遣・結果統合・完了判定を担う。
- lifecycle検証では、親のjoin timeoutと子Agentのcommand timeoutを分離し、自然終了通知、助言・独立scope追加派遣、遅延結果の二重集約防止、closeの一回性、read-only / scope / recursive delegationのnegative caseまで確認する。実装は未着手である。

## Blocked（ブロック中）

- ブロック時のみ記載する。

## 追加確認（ユーザー決定）

- [x] Common課程はローカルで完了可能とし、Part 2のC12／Training CI／最終修了は自己学習開始前に準備されたGitHub上のTraining Copyでbranch／commit／push／PR／Run／Check／Artifact確認まで行う。ForkはP2-01〜P2-03の基礎学習に限る。
- [x] 「受講者向け修了確認」はGitHub Actionsと責務を分離し、GitHub ActionsはTraining Copy上の実行基盤、`training:completion:check`は固定Handoff rootの構造確認とする。
- [x] Test Case CSVなどの非コード成果物は既存Workbookの4 CSVを正本とし、編集場所は自由だが、Part 1からPart 2最終確認まで固定`handoff-root/`へ集約する。新しいManifestや固定の学習者作業場所は追加しない。
- [x] Workbookの評価時は固定`handoff-root/`へ4 CSV、Repository相対コード、Evidence参照、Execution Receipt、Lesson ID別self-checkをまとめる。Training CopyへPart 1のEvidence／Receipt／self-checkを複製しない。
- [x] ローカルとGitHub ActionsのExecution Receiptはrun全体／case／Retryを分けた共通JSON形式とし、`training_copy_source_sha`／`submission_sha`／`ci_sha`／`execution_sha`を分離する。Completion Receiptは`receipts/`外へ出す。
- [x] Agentは学習者向けカリキュラムの必須設定ではなく、既存リポジトリのAgent定義・設定を引き継ぐ。権限・sandbox・wrapper・model・threadは変更しない。
