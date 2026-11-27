# Git安全性診断と通常操作の復旧計画

## 0. 依頼概要

- 依頼内容: G10の診断を改善し、Codex sandboxとの原因区別、通常のGit CLI復旧手順、迂回防止、OpenCode共通契約、回帰検証を整備する。
- 背景: PR #199 / #229で、G10の実行前拒否と`.git`へのsandbox書込み拒否が続けて発生し、PR #229ではGitHub APIによるcommit/ref更新が代替経路に使われた。
- 期待成果: 現行のGit安全判定を維持しながら、承認された通常Git操作が実際に動作することを隔離fixtureと対象Codex実行経路で確認し、Issue #192を参照する既存PR #230へ結果を反映する。

## 1. ゴール / 完了条件

- ゴール: G10診断・読み取り専用環境診断・復旧文書・契約テストを、CodexとOpenCodeで一貫させる。
- 完了条件:
  - G10 ID、許可/拒否結果、G1-G9/N1-N4、protected branch、force-push、destructive-operationの契約を維持する。
  - G10のroot anchor不足、相対path、別checkout、Git/root/branch context未解決を安全な静的reasonで区別する。既存reasonで十分なpush曖昧性・protected branch・禁止形式はdecision IDと診断をテストで固定する。
  - `diagnose:hooks`はcheckout、Git directory/common directory、Git version、worktreeと設定上のHook状態を読み取り専用で示し、runtime・trust・sandbox/approval状態を推測せず未確認と表示する。
  - Git safety referenceへエラー分類、anchor付き例、checkout移行、復旧、API迂回禁止を反映し、実装と例の整合を取る。
  - OpenCodeは既存の`evaluateCommand()`、guarded tools、built-in shell deny、fail-closedを維持する。
  - 隔離fixtureでHook判定と実際のGit add/commit/fetch/local bare remote pushを確認し、拒否ケースでfixtureのHEAD/index/refが不変であることを確認する。
  - Hook/diagnostics/OpenCodeの契約テスト、品質ゲート、独立セキュリティレビュー、PR必須CIを確認する。
  - Git commit/pushはanchor付きの通常Git CLIだけを使い、GitHub APIによるcommit/ref更新やforce pushを行わない。

## 2. 現状理解と前提

- GitHub mainと`origin/main`は`b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。PR #199/#229は触らない。
- Issue #192はOPENでG10のcheckout contextを扱う。PR #227は既にmainへmerge済みで、OpenCodeの共通判定adapterを含む。重複Issueを作らずIssue #192を関連Issueとして再利用する。
- 作業branch `fix/issue-192-git-safety-runtime-recovery` は確認済みmainから通常Git CLIで作成済み。既存のPR #229用未追跡Run資料は保全し、stage対象にしない。
- 現行G10は直接Hook checkout rootへのliteral absolute anchorを要求する。既存のroot固定・decision ID・評価順を維持し、具体的に再現したdynamic protected-ref誤許可だけを修正する。root reasonの分類と標準scriptの誤拒否も、既存の安全性境界を維持して整合する。
- project `.codex/config.toml`は`sandbox_mode = "workspace-write"`、`approval_policy = "on-request"`、network access=true。ユーザーは`approval_policy`だけを変更することを明示承認した。Codex 0.172.0 CLIのhelpには`--approve-for-me`と`--ask-for-approval on-request`がある。managed toolの承認付き実行でanchor付きGit操作は成功したが、この設定変更だけで`.git`へのruntime書込みが可能になったとは扱わない。
- 計画開始時はOpenCode live add/commit/pushが未確認だった。後続実測はSection 10に記録する。trustと現在のsession permissionはread-only診断だけでは証明しない。
- `.codex/config.toml`では既に承認・反映済みの`approval_policy = "on-request"`を維持し、`workspace-write`、network access、`writable_roots`、Hook設定は変更しない。今回の文書範囲にはAGENTS.mdとIssue #192を含め、Git迂回禁止・Linux/WSL通常運用を正本と整合させる。

## 3. 非目標

- 製品SUT、QA教材、Expo、PR #199/#229、main、既存PR #227への変更。
- G10などの安全判定緩和、Hook無効化、bypass、`.git`の権限変更。
- GitHub API/GitHub MCP/REST/GraphQL/Git library経由のcommit、tree/blob作成、branch/ref更新。
- PR #199またはPR #229のmerge/close、force push、branch削除。
- Codex/OpenCode全体のHookまたはGit framework再設計。

## 4. 影響範囲

- 安全性レイヤー: `.codex/hooks/pre_tool_use_policy.mjs`、必要に応じ既存のWindows companion/共通Hook契約。
- 診断・契約: `scripts/diagnose-codex-hooks.mjs`、Codex Hook / diagnostics / OpenCode contract tests。
- 運用文書: `docs/reference/git-branch-safety.md`、必要最小限の`codex-safety-harness.md`、`codex-implementation-harness.md`、`opencode-v2-safety.md`。
- CI: 既存Hook diagnostics、Codex Windows Hook、contracts、quality/security workflow。既存gateは削除・skipしない。

## 5. 変更方針

1. 現行main・Issue #192、checkout/Git/worktree、Codex/OpenCode runtime情報、公式設定仕様を照合する。
2. 変更前の`diagnose:hooks`、`test:hooks`とdecision matrix結果を記録する。
3. G10 reasonを分類して静的文言だけを改善する。path、command全文、remote URL、token、環境変数、生payloadをreasonへ含めない。Hook判定は追加のGit変更操作・shell実行をしない。
4. 既存診断CLIへread-only Git/checkout情報を追加し、オフライン診断とruntime検証を明確に分ける。trust・sandbox・approvalはCLIの表示/利用者確認が必要な未確認項目として扱う。
5. Git safety referenceに拒否原因の分類と停止/復旧手順を集約し、他のreferenceは正本への参照と短い境界説明だけを追加する。
6. 既存testsへreasonとno-mutationのassertionsを追加し、隔離temporary repoとlocal bare remoteで実際のGit CLI経路を検証する。
7. OpenCode adapterとWindows/WSL契約の回帰を確認する。当時は、実OpenCodeまたはWindows/WSL hostを利用できない場合に未確認と記録し、CI証拠と混同しない想定だった（初期計画の履歴）。現在の検証対象はSection 11に従い、Linux/WSL2 live OpenCode runtimeの未確認状況、Windows Native runtime検証の対象外、必須のWindows Hook CI contractを区別する。
8. 独立セキュリティレビュー後、対象ファイルを明示してstageし、anchor付き通常Git CLIでcommit/pushし、既存PR #230の最新HEAD CIを確認する。

## 6. 検証方法

- Baseline / focused: `pnpm run diagnose:hooks`、`pnpm run test:hooks`。
- After change: `pnpm run test:hooks`、`pnpm run test:contracts`、追加した隔離Git CLI fixture。
- Quality/security: `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run lint:text`、`pnpm run lint:text:all`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run security:check`、`git diff --check`、`pnpm run verify`。
- CI: PR #230の最新HEADでCodex Hook contract、Windows Hook contract、OpenCode Hook contract、diagnostics、security/quality、Web/Mobileおよび他の必須checkを確認する。
- 成功判定: 正のGit CLI fixtureがadd/commit/local pushを実際に行い、negative fixtureは対象状態を変更しない。decision matrixのallow/deny IDがbaselineと一致し、要求されたCIが最新HEADで成功する。

## 7. リスクと未解決論点

- reason評価順に手を加えると同じ拒否で優先理由が変わり得るため、拒否時点とdecision IDは固定し、理由生成だけに絞る。
- `diagnose:hooks`は設定ファイル検査であり、runtime発火・trust・sandbox実効状態を証明しない。表示と文書の両方で境界を明示する。
- `workspace-write`では`.git`保護が別途作用する。`on-request`の設定値だけで実効runtime設定や`.git`書込み可否を証明しない。通常Git CLIのadd/commit/pushを承認付きで実行し、通った範囲を記録する。
- 計画開始時はOpenCodeのlive add/commit/pushが未確認だった。後続実測はSection 10で更新する。Codex CLIはLinux/WSL2を通常実行環境とし、Windows Nativeの対話runtime検証は通常受入対象にしない。Windows固有Hook/PowerShell経路は既存Windows CI contractで確認する。

## 8. 成果物

- Issue #192を参照する既存PR #230。
- G10 diagnostics、read-only hook diagnosis、Git recovery/anti-bypass guidance、contract testとRun Artifact。

## 9. 備考

- Harness improvement target: 安全性レイヤー、診断・実行レイヤー、Git safety reference。Strictness: `strict`。
- Evidence: PR #229 Run `runs/20261124-150110-JST/REPORT.md`にあるG10拒否とGitHub API代替経路、現在のproject sandbox設定、Codex CLI 0.172.0、今回のanchor付きbranch作成成功。
- owner decision: ユーザーの本依頼により、この範囲の診断・文書・テスト・Hook変更は実装対象。Codex approval/sandbox設定の永続変更は別途明示承認が必要。

## 10. 2026-11-25 follow-up: 標準shell entrypoint回帰と最終受入（履歴）

> この節は、その時点の調査・提案・検証履歴を保持する。節内のdigest方式による限定許可案は、後続のユーザー決定を受けて撤回済みであり、現在の実装方針ではない。現行方針はSection 11を正本とする。

この節は、同じIssue #192 / PR #230に関する当時の調査・提案・検証の履歴である。現行スコープと受入方針はSection 11を参照する。

- 開始時状態: branch `fix/issue-192-git-safety-runtime-recovery`、local/remote-tracking HEAD `f40ad5ed48c8e590bd6b567001c1ce46da456ab0`、PR #230とIssue #192はOPEN。CI waiterは同じHEADのWeb CI `45518195603`、Mobile App CI `45518196034`をSUCCESSと確認。PRは引き続きmergeしない。
- 実行環境: WSL2/LinuxをCodex・OpenCodeの通常実行環境とする。Windows NativeのCodex/OpenCode/PowerShell runtime検証は対象外で、未実施を`missing_validation`等の残件にしない。Windows launcher、PowerShell script、Windows Hook contract CIおよび互換性は維持する。製品Android/iOS Native検証は別契約として変更しない。
- 再現した回帰: 実Codex PreToolUseで`bash scripts/verify --help`が、script本体の実行前にG10 `shell script execution cannot be inspected safely`で拒否された。実装上、同じ分岐が標準`bash scripts/new-run.sh`と`bash scripts/collect-run-artifacts.sh ...`にも適用される。これはsandboxの`.git` read-only拒否とは別層。
- 当時の提案と承認（履歴）: ユーザーは3つの標準POSIX entrypointに対するcanonical-root・regular non-symlink file・content digest・限定引数の例外案を一時承認した。後続のユーザー決定により、この方式とdigest管理は撤回し、実装を完成させない。Git mutation policy、Hook、sandbox、`approval_policy = "on-request"`は緩和しない。
- 対象範囲の更新: AGENTS.mdのLinux/WSL通常運用とGit迂回禁止、ADR-0016の歴史的決定と現行受入の区別、OpenCode WSL手順、quickstart/MIGRATION、両verifyの文言契約、Issue #192、既存Plan/Run/PR本文を必要範囲で整合する。PR #199/#229、main、製品コードは変更しない。
- 必須検証: G10標準entrypoint正負契約、Codexでの標準verify/new-run/collector、OpenCode実runtimeでの隔離fixture `guarded_git` status/fetch/add/commit/local bare push、Hook/diagnostics/OpenCode/Run manifest契約、Linux品質ゲート、独立レビュー、sanitizer/security scan、最終HEADの必須Web/Mobile CI。Windows Native実機確認は行わず、Windows Hook CIは必須のまま。
- 当時の状態記録（2026-11-25 22:12 JST以降、履歴snapshot）: 当時、ユーザーはdigest-pin例外を明示承認し、AGENTS.md・ADR・active runtime docsをLinux/WSL通常運用とGit迂回禁止へ整合した。後続の決定で撤回されたdigest方式を現行方針として扱わない。
- 当時のCodex検証記録: 実Codex sessionで`bash scripts/verify`はG10を通過し`PASS=3 FAIL=0 SKIP=0`、`bash scripts/new-run.sh --help`と`pnpm run diagnose:hooks`も成功した。
- 当時の追加指摘と未確認: 独立reviewで`for PATH`／`if read PATH`等のcontrol flowとdigest許可script内の外部command PATH shadowingにP1が見つかり、dynamic `read "$target"`もALLOWとなったため修正中だった。OpenCodeとCommon Hookのtrusted Git候補列を合わせる変更は契約追加済みだがVitest未確認。digest確認後のpath TOCTOUも未解決だった。
- 当時の検証結果とruntime状況: `pnpm run typecheck`、`format:check`、`security:check`、diagnostics、Markdown/text qualityはPASS。Hook/OpenCode Vitest workerは結果を返さず中断されPASS扱いしていなかった。実OpenCodeのadd/commit/pushはprovider/auth未構成で未確認。Windows Native runtime検証は通常受入対象外、Windows CI契約は維持。
- Section 10時点の未完了項目（履歴）: Issue/PR本文、Run評価とstrict collector、修正後review/test、normal Git CLI commit/push、同一最終SHAのWeb/Mobile CI。現行の作業方針と完了判断はSection 11を参照する。

## 11. 2026-11-25 follow-up: G10の責務整理と過剰拒否の修正

この節を現在の実装・受入方針とする。Sections 1-9は初期計画の履歴snapshotとして保持し、Section 10は後続調査・提案・検証の履歴として保持する。これらの節にある当時の前提・スコープ・提案はSection 11によりsupersededであり、現行方針と矛盾する場合は採用しない。

- 確定方針: G10は既存契約にある直接検出可能なGit操作対象、checkout root、branch/ref、repository/runtime config override、push先および実行条件を判定する。G1-G10/N1-N4の既存安全性を維持し、root anchorなしのGit mutation、別checkout、対象変更Git option/environment、protected branch/ref、force push、destructive operationを拒否する。
- shell責務境界: Hookは完全なshell interpreter、汎用shell/Git parser、任意script内部や子プロセスの監視を保証しない。shell制御構文、任意の動的変数展開、PATH全体、実行ファイル依存先、TOCTOUをHook単体で網羅しない。既存command scanner/wrapper検査は、具体的なIssue #192契約や回帰テストに必要な範囲だけ維持する。
- 標準経路: `bash scripts/verify`、`bash scripts/new-run.sh`、`bash scripts/collect-run-artifacts.sh`、`pnpm run verify`、`pnpm run test:hooks`、`pnpm run diagnose:hooks`を既存sandbox/approval/execpolicyの範囲内で実行可能にする。script名allowlist、script digest、`scripts/`一律信頼、PATH全体固定、専用launcherは導入しない。拒否されたGit mutationをscript・API・別agentへ移して実行することは禁止する。
- 正規Git mutation: POSIXではcanonical checkout rootへのliteral anchor直後にbare Gitを呼ぶ。commandごとに独立したanchorを使い、`payload.cwd`やtool-level workdirを信頼根拠にしない。`git -C`等の対象変更形式、未許可のcommand chaining、環境によるrepository切替は既存契約どおり拒否する。OpenCode `guarded_git`は共通`evaluateCommand()`と固定Plugin checkout rootを使う。
- 前回P1再判定（2026-11-26更新）: 最初の三者比較では`for PATH ...; do git push origin HEAD:main; done`はmainとPR remote HEAD `f40ad5e`でALLOW、作業ツリーでは既存の部分的な`do`処理によりDENYだった。`git push origin HEAD:$target`はmain・`f40ad5e`・修正前作業ツリーすべてでALLOWだった。独立reviewは修正前作業ツリーで節keyword後のquoted `"git"`、`command git`、`env git`によるprotected pushもALLOWと再現した。protected-ref拒否は既存G10契約であり、これらは実装不一致または具体的誤許可として修正必須とした。既存tokenizerで未引用のshell clause token `do`／`then`／`else`直後の直接Git invocationを既存Git判定へ渡し、直接Git invocationを確認できないdynamic push refspecをG10拒否する範囲に限定した。shell条件、変数値、任意shell状態を追跡する汎用parserやdigest／PATH固定方式は採用しない。separator後に直接現れる`read PATH; git push ...:main`も既存G10判定の拒否対象として維持する。
- 追加の独立reviewで、`case ... in ... ) git push ...:main ;; esac`のdirect Git invocationがALLOWとなるP1と、`origin/HEAD -> main`でも`upstream/HEAD -> trunk`をprotected refへ反映せずpushできるP1を確認した。どちらもmainに存在したことだけで許容せず、case armの直接呼出しを既存tokenizerから既存G10判定へ渡す処理と、対象remoteの`refs/remotes/<remote>/HEAD`を使う保護判定を追加した。対象remoteのdefault branchが解決できない場合はG10 fail-closedとする。回帰testでcase保護push、origin/mainとupstream/trunk、upstream featureの正常push、未解決upstream contextを確認する。限定独立再reviewではcase test追加、remote別default処理、dangling HEADの実在commit確認に追加のコード上must-fixなしと判定した。修正後Vitestはworker起動timeoutで0 testsのため、テスト受入と全体security reviewは未完了。server側default branch変更後のlocal remote-tracking refの鮮度は保証しない。
- digest固有のscript依存選択・TOCTOUはdigest方式を撤回したため現行実装の指摘ではない。任意shell状態の完全解析は保証しない。
- OpenCode実行対象: HookのGit context取得と`guarded_git`の実行に同じPATH-resolved `git`を使い、固定候補一覧やPATH全体固定を追加しない。引数配列、固定Plugin checkout root、共通`evaluateCommand()`、組み込みshell deny、fail-closedを維持する。
- 検証: G10 decision matrixと標準scriptのHook判定をmain/PR/currentで比較し、隔離fixtureで実際のGit add/commit/fetch/local bare pushと拒否時不変を確認する。WSL2/Linux上でCodexの正規セッション経路を確認する。実OpenCodeのLinux/WSL2 live runtimeが未確認の場合は、既存contractとGit fixtureを実行したうえで、そのlive runtimeだけを未確認として記録する。
- 環境方針: Linux/WSL2/Linux/Codespacesを通常のAI agent実行・検証対象とする。Windows NativeのCodex/OpenCode/PowerShell実機検証は対象外であり、未実施をpartial/missing_validationにしない。Windows互換コード、PowerShell script、WSLからWindows filesystem上worktreeを扱う既存契約は維持する。Windows Hook CIを含む必須Windows CIは引き続き受入条件とし、実行・結果確認を省略しない。
- 設定境界: `.codex/config.toml`の`workspace-write`、承認済み`approval_policy = "on-request"`、network/writable_roots、Hook trust、execpolicyを維持する。追加のpermission/sandbox/approval/startup設定は変更しない。
- 完了・引継ぎ: Issue #192、active Run、evaluation、strict collector、sanitizer、PR本文を実証結果へ更新し、通常Git CLIでcommit/push、最終HEAD必須CI、独立reviewを完了する。PR/Issueをmerge/closeせず、ChatGPTの最終レビューに証跡を引き渡す。

## 2026-11-26 resumed execution update

- ユーザーがすべてのproject Hookをtrustしたと確認した。実際のPreToolUseはread-only Git確認をGit起動前に停止し、G10のdenyではなくHook評価中の`ReferenceError: Cannot access 'switchArguments' before initialization`を返した。Hook runtime発火が確認できた一方、Gitを通す前にこの実装例外を直し、import/evaluator/payload smokeを再実行する。
- 追加独立reviewの修正対象は5件: `remote set-head`によるremote default HEAD変更、`checkout --track`の暗黙protected branch作成、否定付き`command`/`env` wrapper内のprotected push、file destinationを持つ`GIT_TRACE*` override、`worktree remove --force`。これらは任意shell完全解析やPATH固定を要求する指摘ではなく、既存のremote/ref/environment/destructive-operation契約への具体的適合性を確認して限定修正する。
- GIT_TRACE*は値をfile pathにできるため、context-sensitive mutationでは他のrepository/runtime environment overrideと同様に拒否する方針。Hookと文書・契約の整合を確認する。
- この再開の開始状態はbranch`fix/issue-192-git-safety-runtime-recovery`、local/PR HEAD`f40ad5ed48c8e590bd6b567001c1ce46da456ab0`。修正中のHook例外が解消し契約が再確認されるまで、Git mutationは行わない。PR/IssueはOPENのまま、Windows Native実機検証は引き続き対象外。

## 12. 2026-11-26 最終レビュー指摘4件の限定修正

- ChatGPTの差分レビューで確定した4件だけを修正する。G10の設計を再検討せず、既存root/branch/ref保護とread-only契約を保つ。
- `isReadOnlyGitInvocation`はbranch mutation解析を共有し、`-v/-vv`だけでは作成操作をread-onlyにしない。list表示とmutation、値を取るoption、`--`後のliteral引数を区別し、protected branch作成はG10へ到達させる。
- Git contextはremote一覧取得の成功・失敗、成功した0件、remoteごとのdefault HEAD解決を別々に扱う。remoteなしならfallback main/masterとcurrent branchでローカル変更を判定し、remote情報の取得失敗や設定remoteの不完全なdefault解決は必要な変更でfail-closedとする。pushはfallback branchと対象remote自身のdefaultだけを照合し、別remoteのdefaultを理由に正当な対象remoteへのpushを誤拒否しない。dangling HEADと不明なpush先の拒否は維持する。
- worktree pruneのdry-run判定をread-only分類と共有する。`--expire`の値や`--`後の引数をdry-run optionと誤認せず、実pruneは既存G9拒否を維持する。
- 契約test helperは期待結果からコマンドを書き換えない。mutationケースでroot anchorが必要な場合だけcaseに明示し、read-onlyとdeny入力は記載コマンドそのものを評価する。
- 修正後のHook contractは173/173 PASS。Hook import / evaluator / payload smoke、4件の直接評価、remote-list取得失敗のfail-closed smokeはPASS。独立reviewは対象remoteだけでpush defaultを判定する修正を再確認し、残るmust-fixなしとした。
- 全`pnpm run test:hooks`は正式な承認付き環境で212/213。Hook、OpenCode、diagnosticsの契約は通過し、text-qualityの`distinguishes new fingerprint counts from pre-existing violations`だけが既定30秒timeoutとなった。テストtimeoutは変更せず、同一失敗コマンドは反復しない。制限sandboxで先に発生したfixture `spawnSync git EPERM`は別結果として記録する。後続の個別診断実行もworker結果を返さず約65秒で中断し、exit 130だった。
- `bash scripts/verify`は3/3 PASS。isolated copyで標準`new-run.sh`がPLAN/TASKS/REPORTを作りmanifestを作らないことを確認。format、Markdown/text quality、security checkはPASS。`typecheck`は最初のtuple推論エラーを限定修正した後、app/native-tests/trainingの全段階PASS。全体ESLintは対象ファイルの結果を返さず中断した。strict collector、Run sanitizer、最終PR CIは後続checkpointで記録する。
- 実OpenCodeのadd/commit/pushは以前のprovider quota HTTP 402後に未確認であり、再試行しない。Windows Native実機検証は対象外、既存Windows CI契約は維持する。

## 13. 2026-11-26 最終レビュー指摘4件の実装状況

- 修正対象はbranch read-only/mutation分類、remoteなしとremote情報取得失敗の区別、worktree prune dry-run、契約test helperの入力改変の4件。`git branch --points-at <ref>`が作成targetとして誤解釈される追加P3も同じoption-value/list分類で修正した。
- 現行実装は既存G10契約の範囲内に限定し、digest許可、PATH全体固定、任意shell parserを再導入していない。branch list、remote context、dry-run判定を共有処理へ合わせ、read-only testcaseの入力はanchorなしの記載どおり評価する。
- 独立reviewは`--points-at`修正後に追加must-fixなしと再確認した。これはChatGPTによる最終レビュー／受入判断を代替しない。
- 44回のHook invocationを1件へ集約していたcontract testは、case数・command・assertionを保ったまま個別testへ分割し、timeout値は変更しなかった。分割前後で34件のcommand literalに追加・削除がないことを確認。更新後のHook contract suiteは216/216 PASS、skipなし（Vitest 4.1.11、149.95秒）。
- 分割testの独立読み取りレビューでfixture順序、cleanup、serial実行、timeout未変更に懸念なし。分割前ソースがHEADになかったため、追加で提供されたreview ZIPと直接比較し全34件のcommand literal一致を確認した。これは最終ChatGPTレビューを代替しない。
- Hook import／`evaluateCommand`／`decidePayload`／正常・malformed payload smoke、今回の4件と`--points-at`の直接・隔離評価は成功。正式承認付きOpenCode/diagnostics/Run manifest suiteは50/50 PASS。通常`bash scripts/verify`、`diagnose:hooks`、隔離new-runもPASS。
- digest方式、script allowlist、PATH全体固定、汎用shell parserは存在せず再導入していない。標準scriptを一律拒否しない。既存G10のroot/branch/ref保護は維持。
- `format:check`、Markdown lint、`security:check`、strict collector、sanitizer、`git diff --check`はPASS。`lint:text`は30秒無出力でexit 130。別validation agentが残りコマンド中に3分以上結果を返さず停止したため、`lint:text:all`、ESLint、typecheck、Report追記後の`bash scripts/verify`は未確認として扱い、同一無出力コマンドは再試行しない。
- OpenCode live mutationはprovider quota HTTP 402で未確認、再試行しない。Windows Native実機検証は対象外。通常Git CLIによるcommit/push、最終HEAD CI、PR/Issue更新が残る。

## 14. 2026-11-27 final HEAD CIの限定修復

- Commit `d1f1fc81006afc62433bdfdc1d24928a5aca389e`のWeb CI `45846927554` attempt 1で、Codex diagnostics testのTypeScript implicit-any 2件、現行Run collector文書契約と不一致のassertion 1件、Windows runnerの8.3 temp path aliasによるOpenCode fixture G10拒否が確認された。Mobile App CI `45846927552`はSUCCESS、Native jobは`native_changed=false`により既存条件でSKIPPED。
- 修正範囲を3つのcontract testファイルに限定する。Hook/Pluginの安全性判定、fixtureの許可・拒否期待値、既定test timeout、Windows互換CIは変更しない。修正後の型検査、Contracts、Windows Hook contractを最終HEAD CIで確認する。
- 独立reviewは提示差分にmust-fixなしとしたが、実行確認はしていない。ローカルtypecheckは60秒無出力で停止、focused Vitestは完了結果を返さず、Prettierは未実行。最終CI結果が出るまではこれらをPASSと扱わない。
- 実OpenCode live mutationはprovider quota HTTP 402で未確認、再試行しない。Windows Native runtimeは受入対象外。PR #230とIssue #192はOPENのまま維持し、修正後CIを確認してから本文を更新する。

## 15. 2026-11-27 最終レビュー後の限定修正

- 最終レビューで残った必須対応はbranch引数分類1件。branch list selector、表示形式、実際のbranch作成を区別し、anchor要件とprotected branch作成拒否を維持する。
- 表示形式だけのread-only操作、`--column`／`--no-column`、inline `--column=<style>`後のoperandを含む非保護branch作成、anchorless作成、protected branch作成を既存contract testで確認する。`-l`は現在のGit helpで`--list`と確認済みのためlist selectorとして維持する。
- 実装対象は既存Hookのbranch引数解析と対応testに限定する。remote名の特殊構成、shell全体の解析、digest/PATH pin、既存sandboxやOpenCode認証の再調査は今回の対象外。
- Linux/WSL上の必要な直接評価・品質検証と独立review後、Run記録、Issue #192、PR #230を実測へ更新し、通常Git CLIによるcommit/pushと最終HEADのWeb/Mobile CI確認を行う。PR/IssueはOPENのままとし、ChatGPTの最終受入判断へ引き渡す。
