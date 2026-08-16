# 実装Run計画

## Objective

- `docs/plans/2026-08-11_194000_official-black-box-scored-e2e.md` のRepository側実装を、Trust Boundaryを弱めずに現在のworktreeへ進める。
- ユーザーの明示指示に従い、編集者／worktree分離を実装停止理由として扱わない。Host由来の証跡はRepository側で捏造せず、Official実行時に接続できるfail-closeなContractとして実装する。

## Scope

- In:
  - 添付指示、Plan、repo契約、Current Specification、Challenge、Tool Profile、Agentic QA scripts/testsの確認。
  - 現在のCodex HostにおけるFresh Session、no-inheritance、Tool Inventory/Isolation、Origin/Resource Boundary、isolated root、constrained output、Bootstrap、reset receipt、duration/action accountingの実測。
  - Machine / Identity / Ownership Contracts、Learner-safe Input、Prepared Runtime、Bootstrap、Output Freeze、Evaluator接続、Documentation、Run artifact、指定Validation、自己レビュー。
- Out:
  - Custom Agent Runner、LLM/API wrapper、Session Manager、MCP Proxy/Router、独自sandbox/budget platform。
  - Product、Visual/Curriculum worktree、元main worktree、Android/ADB/Maestro、Git mutation。

## Assumptions

- Planと添付指示のTrust Boundaryを最優先し、unknown / unproven / unmeasuredをPASSへ補完しない。ユーザーの「このまま進める」はRepository側の実装継続の指示として扱い、Host証跡がない状態でOfficial Scoreを捏造しない。
- 既存のCurrent worktreeは`main`と同一HEADで、今回の既存差分はRun artifact作成による未追跡ディレクトリだけである。
- `PLAYWRIGHT_BASE_URL`が環境から取得できない場合、別worktreeのRuntimeや任意portをOfficial handoffの証跡として代用しない。Prepared RuntimeのURLは明示的な入力として扱い、未設定なら実行時にfail-closeする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーがRepository側実装の継続を明示した。
- 仮定してよい細部: Wave 0の証跡は正式Run artifactの`REPORT.md`へ集約し、raw logは保存しない。
- 未回答の重要質問: Host側のTrusted Receiptをどの実行環境が発行するかは、Repository Contractの外部入力として残す。Repository側の実装はその証跡を受け取って検証できるところまで進める。

## Hypotheses

- H1: Repository側のMachine ContractとArtifact lifecycleを追加すれば、Host証跡を要求するfail-closeな接続面を明確化できる。
- H2: 既存Preparationはdisposable build／sanity／isolated rootまで実装済みだが、Prepared Target identity、Runner Input、Bootstrap、Output Freeze、Resource Probeの持続的artifactが不足している。
- H3: Host証跡がない実行は最終Evaluatorで無効化し、Repository側の実装とOfficial Scoreの有効性を分離できる。

## Research Plan

- Round 1: Plan、repo docs、Challenge/Tool/Runner/Script/Test、git baselineを再確認する。
- Round 2: Host environment、available tools、Runtime configuration、prepared artifact、isolated root/output/bootstrap/accounting evidenceを実測する。
- Round 3: Machine Contract、Canonical Serializer、Artifact/Input、Runtime lifecycle、Bootstrap、Output Import、Evaluatorの不足を実装する。
- Round 4: 最低限の品質ゲートとcontract/runtime preparation testsを実行し、Host未提供の証跡はinvalidとして記録する。
- Exit Criteria:
  - Host Capability Matrixの全行に`proven`または未達理由と証拠がある。
  - Repository側の各WaveのContractとdeterministic supportが実装され、Host未提供時は`valid_for_scoring=false`へfail-closeする。
  - Run artifactがsanitizerを通過し、主要コマンド・結果・未実行項目・次の外部アクションを記録する。

## Approach

- `feature-plan` Skillのrepo mappingとvalidation方針に従う。
- Hostの存在しない証拠をRepository Scriptで補わず、available tool metadataとfilesystem/environmentの観測を別々に記録する。
- Repository側ではWave 1〜8とWave 12のdeterministic部分を実装する。Wave 5/9〜11のHost-native実行は、受け取ったTrusted Receiptがない限りinvalid/not executedとして扱う。
- Git add/commit/push/merge/rebase/branch操作、Android操作、他worktreeのRuntime利用は行わない。

## Definition of Done

- Wave 0のCapability Matrixがtrusted evidenceの有無をfail-closeで明示している。
- Repository側のContract、Preparation、Input、Artifact、Bootstrap、Freeze、Evaluator接続が実装され、Host未提供時のinvalid判定が維持されている。
- 指定Validationを実行できる範囲で実行し、未実行はPASS扱いしない。
- Run artifactのTASKS/REPORT/run.jsonを更新し、Sanitizer Write/Checkとscope auditを完了している。

## Risks / Unknowns

- Codex Hostの内部Session/Tool証跡がRepositoryから参照できない。参照不能は`unproven`として扱い、推測で埋めない。
- `PLAYWRIGHT_BASE_URL`が無い場合、Runtime Integrationを別URLで代替するとworktree境界を破るため実行しない。
- pnpm/依存関係がHostで利用できない場合、Validationは実行不能として記録する。環境差分をPASSへ変換しない。

## Thinking Log

- 2026-08-12: 対象HEADはPR #21 merge commitで、`main`/`origin/main`と同一。作業開始時のworktree差分は新規Run artifactのみ。
- 2026-08-12: `PLAYWRIGHT_BASE_URL`、`training/agentic-qa/skills/scored-v1.md`、Prepared Target artifact、Host-trusted Runner evidenceは現在のRun/Hostから確認できなかった。
- 2026-08-12: 現HostのTool metadataには汎用PowerShell `shell_command`、Web、GitHub等が含まれ、Scored Tool Profileのpositive allowlistと一致するtrusted isolationを証明できない。
- 2026-08-12: 以上はWave 0 Gateの重大な未達候補であり、追加実装で回避せず、Capability Matrixを完成させてから判定する。

## 継続実装での判断（2026-08-13）

- ユーザーの明示指示に従い、編集者のworktree分離は実装停止条件から除外した。Host Capability Receiptの欠落は、Official Scoreを捏造しないための外部証跡条件としてのみ保持する。
- Wave 1〜8とWave 12のRepository側deterministic部分を実装した。Wave 5／9〜11のHost-native Fresh Runner、実探索、Reproducibilityは、trusted Host入力が無いため実行せず、Strict Official Verificationでfail-closeする。
- WindowsのDisposable buildはroot `node_modules` junctionを使わず、Disposable copy内のoffline hoisted dependency installへ変更した。根拠はjunction経由のExpo Router bundleが745 modules／`No routes found`となり、isolated install後は2295 modulesでPreparationが成立したこと。
- Official verificationはHost ReceiptのTool Profile allow／deny、Runner Input Origin、Output Contract上限、Skill／Tool／Host revision、Runtime Variant、Session／Run identityを相互照合する。Repository自身がFresh／Tool／Bootstrap証跡を生成することはしない。
