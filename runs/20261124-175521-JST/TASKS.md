# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR #230のopen状態、branch/HEAD、作業差分と既存未追跡成果物を確認・保全する。
- [x] 2. ユーザー確定方針を既存Planへ反映し、digest方式の記述を歴史的提案として明示する。
- [x] 3. main・PR remote HEAD・作業ツリーを比較し、前回P1を再現・分類する。protected-ref for-loopは三者でALLOWとなり、明示したexecpolicy rule checkも`matchedRules: []`だったため、具体的なG10修正へ進める。
- [x] 4. Hookを既存G10責務へ整合し、4件の最終レビュー指摘を修正する。branch mutation/read-only共有判定、remote context、worktree dry-run、`--points-at`のoption値分類を修正。digest、PATH固定、汎用parserは導入しない。直接評価と該当focused testで回帰を確認。
- [x] 5. Codex Hook/diagnostics契約を正負両面で確認し、root/branch/ref/force/destructive等の拒否を維持する。最終Hook contract suiteはtest分割後216/216 PASS（skipなし）。正式承認付きOpenCode/diagnostics/Run manifest suiteは50/50 PASS。`--points-at` focused testは1/1 PASS。
- [x] 6. OpenCode guarded_gitの評価Gitと実行Gitの選択を比較し、必要な限定整合と契約を実装する。
- [x] 7. AGENTS.md、ADR、現役Git/Codex/OpenCode文書から撤回方式の現行指示を除き、Windows Native対象外とWindows CI維持を整合する。
- [x] 8. Linux/WSL CodexのHook発火、標準`verify`、隔離Run初期化、strict collector、通常Git CLI経路を確認する。Hook trust後の実発火、`bash scripts/verify`、隔離`new-run`、正常／malformed payload smoke、承認付き通常Git操作を確認し、active Runのstrict collectorもexit 0で完了。
- [x] 9. OpenCode認証状態を確認し、利用可能なら隔離runtimeで実Git操作、不能なら制約と契約fixture結果を記録する。
- [ ] 10. Issue #192を現行root-anchor/G10/sandbox/迂回防止仕様と最終実測へ更新する。
- [x] 11. active Run/evaluation/manifestを実測へ同期し、strict collector、sanitizer、security scanを通す。collector exit 0、sanitizer残存指摘0、security check 236 runtime files/531 credential-scan files PASS。
- [ ] 12. Linux/WSLの最終品質確認を行う。Hook contract 216/216、正式承認付き関連suite 50/50、`format:check`、Markdown lint、security scan、`git diff --check`はPASS。`lint:text`は30秒無出力でexit 130。次のvalidation agentが3分以上応答せず状態不明で停止したため、`lint:text:all`／ESLint／typecheck等の最終結果は未確認。以前の`bash scripts/verify`、`diagnose:hooks`、text-allのPASS記録は最終Run追記後の結果ではない。
- [x] 13. 4件の指摘と限定された関連差分を独立reviewする。独立reviewで`--points-at`修正後のHook差分に追加must-fixなし。分割test構造も読み取り専用確認で問題なし。ZIP内の分割前testと比較し、34件のcommand literalがすべて一致することを確認した。レビュー結果は最終PR受入とは区別する。
- [ ] 14. 変更を明示stageし、通常Git CLIでcommit/push、最終HEAD必須CI、PR本文更新まで完了する。

## CI連動の完了条件（tracked checkboxに含めない）

最終push後に、PR #230の同一最新HEADでWeb CIとMobile App CIがともにSUCCESSであることを確認し、PR本文へ最終結果を記録する。このCI確認1件はimplementation harnessに従うProgress加算対象であり、追跡タスクのcheckboxには加えない。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- Current decision (2026-11-26): digest/TOCTOU固有の指摘はdigest方式撤回後の実装で判定し、任意shell parserの不足だけを理由に構文検出を増やさない。正規Git操作の対象不一致、protected ref誤許可、force/destructive誤許可、標準script誤拒否は修正必須。
- Function-level comparison (initial pre-fix): canonical root anchor付き`for PATH ...; do git push ...:main; done`はmainとPR remote HEADでALLOW、当時のworktreeは部分的な`do`処理でG10 DENY。直接の変数refspec`HEAD:$target`はmain・PR remote HEAD・修正前worktreeすべてALLOW。独立reviewは修正前worktreeで節keyword後のquoted `"git"`、`command git`、`env git`もprotected pushをALLOWすると再現した。最新worktreeでは`do`／`then`／`else`節から直接見えるGit invocationを既存判定へ渡し、dynamic push refspecをG10拒否する契約testを追加済み。focused Hook contract結果と独立reviewは後続記録へ更新する。generic shell parser、shell変数状態追跡、PATH全体固定は導入しない。
- GitHub読み取り専用compareではremote branchがmainより7 commit ahead / 0 behind。local HEADは`f40ad5ed48c8e590bd6b567001c1ce46da456ab0`。GitHub CLI接続は失敗したが、connectorではPR #230とIssue #192がOPEN。remote HEADの完全一致はpush直前に再確認する。
- 現行Issue #192の本文にある`payload.cwd`の信頼に関する説明は古い。現在のHookと契約テストはこれを信頼しない。
- 通常Git CLIの`.git`書込みはHook G10と独立してsandboxで拒否され得る。Codex CLI `0.172.0`のworkspace-write sandboxでは`.git`がread-onlyとなることを観測した一方、承認付きsandbox escalationを通じたroot-anchored通常Git CLIのfetch/add/commit/pushは実行確認済み。
- `pnpm install --frozen-lockfile`の既定storeはworkspace外でEROFS。`<TEMP_ROOT>` storeを明示した一度の再試行は`registry.npmjs.org`の`EAI_AGAIN`で失敗し、追加再試行しない。
- Windows上の`realpathSync.native()`とGitの`rev-parse --show-toplevel`はextended path表記が異なる場合がある。比較・診断ではWindows path normalizationを適用し、G10拒否結果は変えない。UNC pathをcomponent-wiseに`lstat`してsymlinkと断定する案は独立reviewで誤分類リスクが判明したため撤去した。
- PR #230初回Web CIの失敗は、承認設定の旧固定値とWindows path区切り文字の誤分類。修正後重点契約は170/170 PASS、修正後GitHub CIは未確認。
- PR #230 Web run `45427530993`（SHA `df637d76d04ffa2e5772eb67c36746efe7cd4d1a`）はWindows Hook contract 179/180。最後の失敗は直接POSIX allow fixtureが`mkdtemp`の未canonical pathを使っていた。canonical root helper経由へ修正し、Hooke独立reviewはClear。
- Windows Nativeの対話runtime検証は通常受入対象外。Codex CLIのWSL2 runtimeとanchor付き通常Git CLI操作は確認済みであり、Windows固有Hook/PowerShell契約はWindows CIで確認する。実OpenCodeではPlugin load、`guarded_git status`、built-in shell経由の危険操作拒否を確認したが、OpenCodeからの実add/commit/pushは未確認で、隔離Git契約テストと区別する。
- Historical review findings (2026-11-25): 当時のdigest許可案に固有のPATH依存選択・TOCTOU指摘と、任意shellのPATH状態を完全解析しない指摘があった。digest案は撤回済みで、PATH全体固定・汎用shell parser・動的read構文の網羅は現行作業では実装しない。OpenCode/common HookのGit lookup一致は既存契約として別途確認する。
- Historical implementation interruption (2026-11-25): writerはHookのdigest/fixed-PATH定義を一部削除したが、残る参照があり、Hook import不能となった。現在のHook import smokeは成功し`TRUSTED_GIT_EXECUTABLE_PATHS`参照もない。過去の停止記録は履歴として保持し、現在の状態と混同しない。
- 2026-11-25 23:37 JST: `.codex`の限定書込に対する`require_escalated`はユーザー中断で終了し、許可/拒否判定なし。中断後のread-only確認でHook import時`ReferenceError: TRUSTED_GIT_EXECUTABLE_PATHS is not defined`を確認。実装・テスト・GitHub更新を停止し、Hook書込可能な正式経路を再開条件とする。
- 2026-11-26 再起動後確認: 過去のユーザー中断は承認拒否ではない。現Hook import、`evaluateCommand`、CLI payloadは成功し、`TRUSTED_GIT_EXECUTABLE_PATHS`参照はsourceから消失。Codex project trustとHook trust entryは存在するが、restricted tool sandboxとapp-server/runtime制約のため今回の実PreToolUse発火は未確認。OpenCodeはログpath EROFSで起動不能。`pnpm run verify`はformat/lint/typecheck/security等の先行段階後、unit fork worker timeoutで失敗し、後続suite未実行。
- 2026-11-26 current comparison: string dynamic refspec `HEAD:$target`はmain/remoteでALLOW、現HookはG10。Canonical-root shell control flowのdirect protected pushはmain/remoteでALLOW、現Hookは`do`/`then`/`else` clauseから見えるGit invocationを評価してG10。Reviewerはdirect PATH override formsをmain/currentともG10と再現。任意shell内部の完全解析は対象外。
- 2026-11-26 formal verification: `bash scripts/verify --hook-contracts`は正式昇格経路でexit 0、4/4 files・191/191 tests、execpolicy baseline/safety PASS。通常sandboxの同suiteはfixture subprocess `spawnSync git EPERM`で165 PASS/26 FAIL。evaluationを`partial`/`missing_validation`へ更新した後、strict collectorの起動はtool `CreateProcess ENOENT`で未実行。`run.json`は手動編集していない。
- 2026-11-26 runtime constraints: Codex CLI 0.172.0、config宣言はworkspace-write/on-request/network true/writable_roots empty/hooks true。doctorはOnRequest/restricted filesystem/network enabled、state DB integrity check fail。Hook trust/firingはruntimeから直接確認できていない。OpenCode isolated live試行はprovider quota HTTP 402でGit操作前に終了。Windows Native runtimeは対象外。
- 2026-11-26 security re-review: 追加の独立reviewで、`case ... in ... ) git push ...:main ;; esac`の直接Git invocationがALLOWとなるP1と、`origin/HEAD -> main`の状態で`upstream/HEAD -> trunk`をprotected ref判定へ反映しないP1を確認した。mainにも存在することだけを理由に許容しない。Hook sourceはcase armから直接識別したGit呼出しを既存判定へ渡し、対象remoteごとのsymbolic HEADをprotected refとして評価するよう修正済み。契約test担当はcase/remote別の拒否・正常push・未解決contextを追加済み。重点testと独立再reviewが未完了のため`safety_compliance`はWARNのまま。
- 2026-11-26 current runtime state: ユーザーが`/hooks`でPreToolUse状態を「レビュー待ち」と確認した。これはHook trustの拒否ではない。sandbox/approval設定はworkspace-write/on-requestのまま、Codex doctor報告の実効状態はrestricted filesystem / network enabled。Hookのhost PreToolUse発火はまだ未確認のため、trust確認をbypassせず、Git metadata変更は保留する。
- 2026-11-26 restart follow-up: dangling origin/upstream remote HEADは`rev-parse --verify --quiet <ref>^{commit}`で実在commitを確認するよう修正。両remoteのdangling fixtureはHook payload上G10 fail-closed。valid origin/main/upstream/trunk fixtureでは実際のGit add/commit/local bare pushを確認し、protected trunk deny後もremote ref不変。case節テスト追加後のVitestは0 testsでworker起動timeout。`pnpm run verify`はPrettier、Markdown/text、validatorsまでpass後、全体ESLintが155秒無出力で中断。typecheck/security/focused ESLintと標準`bash scripts/verify`は別実行でPASS。strict collector、runtime trust、Git mutation、CI、最終reviewは未完了。

## Discovered（発見事項）

- 2026-11-26 focused review follow-up: Huygensはcase/remote-default/dangling-HEAD修正に追加code-level must-fixなしとしたが、Vitest 0件のため受入Clearではない。Kantは、直接`if git push`の見落とし、`GIT_AUTHOR_NAME`等の過剰拒否、origin未解決で別remoteの正常contextも拒否するgateを追加修正候補として報告。Hook専用workerへ限定修正を依頼中。absolute-path Git executable拒否はbare Git execpolicy契約に沿って維持する判断。
- 2026-11-26 resumed review: 新たな独立reviewで`remote set-head`によるprotected default context変更、`checkout --track`の暗黙branch作成、negated command/env Git wrapper、GIT_TRACE file output、`worktree remove --force`の5件を修正対象として確認。ユーザーが全Hook trust済みと確認後、実PreToolUseがGit read-only commandをHook内`switchArguments` TDZ exceptionで停止したため、通常Git確認を保留しHook workerへ修正・smokeを追加依頼。次の実測で該当範囲を再評価する。
- 2026-11-26 second independent review: remote/symbolic/update-ref HEAD mutation、trace override、negated wrapper、worktree forced removalの修正を確認。新たに`checkout/switch --track <remote>/<branch> -b/-c <protected>`で明示作成名をsource推定より後に見落とすP1を再現候補として特定し、明示option優先・曖昧時拒否の限定repairを依頼中。3-suite restricted runは診断fixtureのEPERMを分離し、formal escalationで診断11/11 PASS。formal `pnpm run test:hooks`は300秒超無出力でexit 130となり最終suite結果未取得。

## 進捗

- Progress: 78% (11/14)

## Blocked（ブロック中）

- ブロック時のみ記載する。
