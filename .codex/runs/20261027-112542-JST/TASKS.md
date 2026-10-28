# Tasks

## Now

- [x] 1. 全51目標の教材・演習・評価を棚卸しし、根拠付き対応表を保存する。
- [x] 2. M00〜M10の教材と段階的練習を制作する。
- [x] 3. 演習、M06新規spec、M07 POM・fixture、模範・採点・状態を整合する。
- [x] 4. クイズ・Web・配布・チューター・評価器を整合する。
- [x] 5. 決定論的な実技・回帰検証と受講者視点の確認を実施する。
- [ ] 6. 実Template・2コアCodespace技術受入を実施する。
- [ ] 7. 最後にOpenCode実モデルの統合・校正・正式評価・再評価を確認する。
- [x] 8. 変更とRun成果物を確認し、commit・通常push・PR本文更新を行う。

## Discovered
- コース用Template repositoryは所有者の公開Repository 53件に見当たらず、既存の`codex-templates`は無関係。実Templateは最終受入時に専用repositoryとして作成する必要がある。
- 既存製品Chromium回帰34件は全件PASS表示だが、Playwrightが最終summary/exit codeを返さず終了したためPASS確定には使わない。Playwright管理Chromiumは未導入で、既存Google Chromeを指定すると各テストは成功表示になった。新課程Chromium E2E 17/17はexit 0でPASS。

## Deferred（ユーザー指定の実施順）
- Task 6と7はローカル作業・PR更新後の最後の受入として保留する。

## Blocked

- 全体`pnpm run verify`は保護対象の未追跡`workspace/M06/acceptance-probe.spec.ts`の整形エラーで開始時に停止する。ユーザー所有のworkspaceは編集せず、他のgateを個別に実行した。
- `pnpm.cmd run test:contracts`の前回値は55 files/840 tests・807 PASS/31 FAIL/2 SKIP。今回WSL probeの収集時例外を防止して全件を再実行すると55 files/859 tests・809 PASS/45 FAIL/5 SKIP、exit 1。旧31はHook 18/native wrapper 9/MCP waiter 3/artifact sanitizer 1で個別再現。前回は収集できなかったRun-manifest suiteから14 FAIL/2 PASS/3 SKIPが新たに可視化された。個別ケース・最初の不一致・不確定原因はREPORT 22:39 JSTのinventoryを参照。カリキュラム固有contract 58/58 PASSとは分ける。Hook/permission/wrapper方針を変更する安全な権限はない。
- `pnpm.cmd run verify`を再実行したが、最初のformat:checkが保護対象 `workspace/M06/acceptance-probe.spec.ts` のformat違反でexit 1。後続gate未実行、保護ファイル未変更。クリーンshell調査では`-UseNewEnvironment` PowerShellが起動時error 8009001d、cmdは`GIT_CONFIG_*`不在でも実行主体`CodexSandboxOffline`とrepository owner不一致でGitがdubious ownership exit 128。Codex PreToolUse Hookも接続されないためcommit環境に使えない。
- 旧製品Chromium回帰34件は今回の直列再実行で5/34開始後にCartケースが80秒超停止し、中断。テスト全体のsummary/exit codeなし。全51件のChromium runはM06の375px axe解析（16/51）でworkerが停止し、Ctrl+C後300秒以内に終了せずPlaywrightがforce-killしたため未完了。管理外server + `PLAYWRIGHT_SKIP_WEB_SERVER=true` + line reporterのadmin logout単体は1/1 PASS・exit 0。
- Git mutation is currently blocked by G10: inherited `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0/1`, and `GIT_CONFIG_VALUE_0/1` exist only in Process scope; both configured keys are `safe.directory`, and values remain undisclosed. The Hook returns G10 when runtime Git config/environment overrides exist. A normal Hook-enabled Codex shell has not been found; the attempted isolated shell does not own this repository and lacks the Hook. Do not unset/override environment variables or weaken G10; resume mutations in a clean Codex environment.
- GitHub connector confirms PR #199 head/local/origin tracking ref `22a7ff5576c89f40a9bb3b4c723d42a3eaa8a6aa`, base `main` at `d16e3bdd277a82576336689c4038b9d9cc423414`, Web CI run `40483365591` and Mobile App CI run `40483365698` completed successfully for the committed SHA only. Local tracked changes remain uncommitted and PR body unchanged.
- 今回追加した51目標の監査表とRun検証記録は未コミットである。上記G10によりcommit・push・PR本文更新は未完了のためTask 8を再開扱いとする。

## 2026-10-28 再開判定

- 現在の実行主体はPC-K16-0126\ryu-yoshikawaでRepository所有者と一致。前回存在した5件の環境config overrideは今回なく、GIT_DIR、GIT_WORK_TREEもありません。Branch/HEAD/local tracking ref/PR #199 headはdocs/plan-ai-agent-qa-curriculum-redesign / 22a7ff5576c89f40a9bb3b4c723d42a3eaa8a6aaで一致し、既存差分は保持されています。
- managed workspace-write shellではHookが実動作し、root anchorなしのremote ref queryをG10で拒否。正規のliteral root anchor (Set-Location -LiteralPath ... -ErrorAction Stop)ではHookを通過しましたが、remote queryはDNS/thread起動エラーでexit 128。Hookの緩和は不要です。
- codex doctorはWindows sandbox accountを検査できず、MXC probeはnative MXC is unavailable on this executor、設定済みsandbox probeはsetup helper exit 1。実効Windows sandboxは未確定です。pnpm.cmdはCorepackのpnpm 10.34.5取得でENOTFOUND registry.npmjs.org。
- Hook contract suiteは通常TEMPでVitest初期化中にEPERM renameとなり、0 tests / exit 1。プロセス限定TEMP/TMPをignored node_modulesへ向けた再試行は90秒間結果を返さずinterrupt / exit 1。残る4 suiteと全contract / verifyは実行していません。実装不具合とは判定していません。
- Task 5は前回の51目標監査・決定論的実技の証拠を該当範囲に限り維持。今回curriculum sourceは変更していませんが、45件の再検証とTask 5完了判定は未完了です。Task 8もcommit/push/PR本文更新/最新HEAD CIが未完了のため未完了維持。最終Template/Codespaces/実モデル受入も未実施のままです。
- 次工程は、/statusと/debug-configを確認できる正常な対話型Codex環境、実効sandboxの正常起動、Tempのrename、pnpm利用可否を確立してから個別再検証を再開します。Progressは44% (4/9)のままです。
- 2026-10-28: PR #199の現HEAD `22a7ff5576c89f40a9bb3b4c723d42a3eaa8a6aa`に対するWeb CIとMobile App CIは正規waiterでsuccessを確認。未コミット差分は対象外のためTask 8は未完了。

## 2026-10-28 最終作業判定

- Task 5完了: ユーザー提供の通常Windows PowerShell contract結果（55 files、855 PASS / 4 SKIP / 0 FAIL、exit 0）をuser-supplied evidenceとして採用。既存のWeb E2E/assessment/目標監査と今回のlocal validators、unit/integration/repository/component tests、build:web/build:spec結果はREPORTの本日checkpointを参照。
- Aggregate `pnpm run verify` は一時cloneでexit 1。contract suiteに4件（Hook launcher 1、MCP waiter 3）の失敗があり、他のverify前段はPASS。これはPASSにせず、user-supplied直接実行と分離して報告する。旧contract testsは修正していない。
- Task 6/7は実Template/2-core CodespaceおよびOpenCode実モデル受入として後段へ保留。
- Task 8の対象は明示した5 tracked filesのみ。Protected workspaceはstage対象外。Run artifactは本commit前に固定し、push後の新head CI結果はPR本文と最終報告に記録する。

## 2026-10-28 追補: 未経験者向け教本/Web体験

- [x] 1. 51目標の既存監査と受講前提を照合し、今回のPlanへ反映。
- [x] 2. M00〜M10の章導入、図、練習/復習導線を更新。全章で空だった「このモジュールで学ぶこと」を章固有の内容で補った。
- [ ] 3. SVG 23件/PNG 3件を追加済み。実GitHub/Codespaces/VS Code/Actions画面は未取得、BLOCKED。
- [x] 4. 既存の演習・提出・quiz・scoring・Phase評価対応を51目標監査とContractで照合。
- [x] 5. 教材/quiz共通shell・nav・resource allowlistを実装し、可視SHA-256とliteral `\n`を除去。
- [x] 6. curriculum/distribution/assessment/tutor/Run-evidence Contract 5 suite、60/60 PASS。TypeScript、lint、Prettier、docs build PASS。
- [ ] 7. 全11章/クイズの拡張a11y/desktop/mobile再レビュー。M00/M05の前回画面16枚はPASS・目視確認済み。M01/M03の詳細画面は未取得。
- [ ] 8. `pnpm run verify` aggregate PASSと拡張後E2E未確認。ffmpeg不足/Chromeのlocal network access deniedで実行環境を切り分け中。
- [ ] 9. audit/Plan更新は実施。Run追記・明示stage・commit/push・PR本文更新・新head exact CIは未完了。

Progress: 55% (5/9)。実画面、aggregate verify、PR同期が残る。実Template/2-core CodespaceとOpenCode実モデル受入（旧Task 6/7）は今回実施せず、未完了のまま維持。
## 2026-10-28 修正ループ追補

- [x] quiz CSSのlight/dark配色競合を解消し、生成CSS Contractを追加。
- [x] lesson可視本文のraw 64桁SHA様文字列の非表示Contractを追加。
- [x] 配布ContractのESM dependency fixtureを既存junction方式に戻し、関連5 suite 60/60 PASS。
- [x] TypeScript、Prettier、Docs build、diff checkを再確認。
- [ ] 拡張画面capture / local Browser E2E（実行環境BLOCKED）。
- [ ] aggregate `pnpm run verify`、commit/push、PR本文同期、新head exact-CI。

## 2026-10-28 Commit Hook修正

- [x] PNG stage blobを読めるように品質Hookの固定出力buffer上限を調整。
- [x] 1MiB超asset Contract 1/1とHook suite 26/26 PASS。
- [x] 実staged差分のquality:staged PASS。Hook policyは維持。
- [ ] commit全Hook、push、PR同期、新head exact-CI。

## 2026-10-28 Exact-head CI repair

- [x] Web CI failureを特定: production-smokeの教材resource link期待値が旧仕様。
- [x] internal `/resources/` URLとHTTP 200を検証するE2Eへ修正。
- [x] Prettier、TypeScript、diff check PASS。
- [ ] repaired commit push、PR本文同期、新HEAD required CI。
