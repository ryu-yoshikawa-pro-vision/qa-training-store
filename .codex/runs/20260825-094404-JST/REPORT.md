# Report (append-only)

## 2026-08-25 09:50 (JST)

- Summary: Issue #57のuuid脆弱性remediation調査Runを初期化し、調査範囲・禁止事項・完了条件を確定した。
- Completed: 必須repo docs（AGENTS.md、PROJECT_CONTEXT、PLANS.md、関連ADR、直近Run）と`feature-plan`スキルを確認した。Run `20260825-094404-JST`をstrict / investigation / readonlyで初期化した。
- Changes: Run ArtifactのPLAN/TASKS/REPORTを調査用に具体化した。canonical `package.json`、`pnpm-lock.yaml`、source、test、workflowは未変更。
- Commands:
  - `Get-Content -Raw AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `PLANS.md` => Working Agreement、project context、planning rulesを確認。
  - `Get-ChildItem docs/adr ...` => 直近ADR（0019、0018、0017、0016等）を確認。
  - `Get-ChildItem .codex/runs ...` / `Get-Content .codex/runs/20260824-131402-JST/*` => 直近Runと過去のdependency remediation運用を確認。
  - `scripts/new-run.ps1 -TaskType investigation -WorkflowLevel strict -Preset readonly` => `.codex/runs/20260825-094404-JST/`を作成。
  - `git status --short; git diff --stat; git diff -- package.json pnpm-lock.yaml` => 調査開始時点でcanonical dependency変更なし。新Run directoryのみ未追跡。
- Notes/Decisions: Issue本文の禁止事項に従い、global override、parent upgrade、lockfile編集、Alert dismiss、Git mutationを行わない。候補検証が必要な場合も隔離一時領域だけを使う。子subagentは使用しない。
- New tasks: `TASKS.md`へ10個の順序付き調査タスクを登録した。
- Remaining: dependency graph、advisory、xcode source、互換性、candidate差分、validation、推奨案の調査。
- Progress: 10% (1/10)

## 2026-08-25 09:56 (JST)

- Summary: Issue #57の公開内容と対象advisoryを確認した。
- Completed: Issueは「調査のみ、依存変更・global override・major jumpなし」と明記し、対象は`uuid@7.0.3`、pathは`xcode@3.0.1 -> uuid@7.0.3`、patchedは11.1.1 / 12.0.1 / 13.0.1としていることを確認した。GitHub Advisoryはv3/v5/v6のcaller-provided bufferに対するbounds validation不足、v1/v4/v7はinvalid boundsでRangeErrorを投げると説明している。
- Commands / web sources:
  - `https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/57`（2026-08-25確認）=> Issue scope、dependency path、禁止事項、調査項目の根拠。
  - `https://github.com/advisories/GHSA-w5hq-g745-h8pq`（2026-08-25確認）=> affected `<11.1.1`、12.0.0未満12.0.1、13.0.0未満13.0.1、patched 11.1.1/12.0.1/13.0.1、v3/v5/v6のbuffer/offset挙動、修正対象`src/v35.ts`/`src/v6.ts`の根拠。
  - `https://nvd.nist.gov/vuln/detail/CVE-2026-41907`（2026-08-25確認）=> NVD descriptionは14.0.0でfixと記載。GitHub Advisoryのpatched rangesと表現が異なるため、release/sourceで差分を追加確認する。
  - `https://github.com/uuidjs/uuid`（2026-08-25確認）=> upstream source/release確認先。
- Notes/Decisions: NVDの「14.0.0 fixed」とGitHub Advisoryの「11.1.1 / 12.0.1 / 13.0.1 patched」は同一扱いせず、branch/releaseごとの修正コミットを確認して矛盾を解消する。AdvisoryのCVSS/impactは、実際のconsumer pathとは別に評価する。
- New tasks: なし。
- Remaining: current graph、xcode呼び出し、修正source、互換性、候補差分。
- Progress: 10% (1/10)

## 2026-08-25 10:18 (JST)

- Summary: 現在のdependency graphとrepo内の使用境界を実測した。
- Completed: `pnpm install --frozen-lockfile --ignore-scripts`でlockfileからnode_modulesをmaterializeした（manifest/lockfileのresolution変更なし）。指定された`pnpm why/list`は全てexit 0。root directの`expo@57.0.15`から、`@expo/cli@57.0.17`、`@expo/config@57.0.8`、`@expo/config-plugins@57.0.8`、`xcode@3.0.1`、`uuid@7.0.3`へ到達する。`@expo/config`、`@expo/prebuild-config`、`@expo/cli`、`@expo/metro-config`、`@expo/inline-modules`、`@expo/local-build-cache-provider`、`@expo/log-box`等を介した共有経路があり、dev側の`jest-expo@57.0.4`からも同じExpo peer treeへ到達する。lockfile上は`xcode@3.0.1`のdependencyが`uuid: 7.0.3`。
- Commands:
  - `pnpm install --frozen-lockfile --ignore-scripts` => lockfile up to date、1171 packagesを追加、exit 0。node_modulesのみ生成。
  - `pnpm why uuid` => root `expo` peer treeおよび`jest-expo` peer treeを通じた複数の`@expo/* -> xcode@3.0.1 -> uuid@7.0.3`経路を確認。
  - `pnpm why xcode` => 同じ`@expo/config-plugins`共有経路を確認。
  - `pnpm list uuid --depth Infinity` / `pnpm list xcode --depth Infinity` => resolved versionsと共有経路を確認。
  - `rg -n ... pnpm-lock.yaml` => `lockfileVersion: 9.0`、root importer `expo: 57.0.15`、package entry `xcode@3.0.1 -> uuid: 7.0.3`を確認。
  - `Get-Content package.json` => root direct dependenciesに`expo`はあるが`uuid` / `xcode`はなく、既存overridesはexpo-constantsとjs-yaml 2経路のみ。Issue #57用のoverrideは未追加。
- Repo mapping:
  - `rg`（`src scripts tests app.config.ts app.json package.json .github`、生成物/node_modules除外）=> application source、scripts、tests、config、workflowに`uuid`の直接import/require/`uuid.`利用なし。`v3/v5/v6`の検索はuuid API利用を示す該当なし。lockfile/docs内の一般的な`<uuid>`表記は直接利用ではない。
  - `node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/package.json` => CommonJS `main: index.js`、`uuid: ^7.0.3`、Node `>=10.0.0`。
  - `xcode/lib/pbxProject.js:18-28,89-98` => `var uuid = require('uuid')`、`generateUuid()`内で`uuid.v4()`だけを呼び、hyphen除去・先頭24文字化・uppercase化。v3/v5/v6、buffer、offsetの呼び出しなし。
  - `@expo/config-plugins/build/plugins/withIosBaseMods.js:42,230` => `require("xcode")`、iOS `xcodeproj` modで`project.parseSync()`を実行。`ios-plugins.js:165-171`は`withXcodeProject`をplatform `ios` / mod `xcodeproj`へ接続。
  - `.github/workflows/native-ci.yml:179,393` / `native-ios-ci.yml:65,192` => Expo prebuildをAndroid/iOSで実行。iOS workflowはmacOS runnerでXcode buildも行う。Web workflowはxcodeを直接利用しない。
- Notes/Decisions: `xcode`/`uuid`はroot manifest上のruntime dependencyではなくExpo toolingのtransitive dependencyだが、`expo`のpackage dependency tree内にあり、install時にはproduction dependency graphにも存在する。実アプリbundleへのuuid直接importは確認できない。`xcode`のAPI到達性は本時点でB候補（vulnerable API未使用）だが、advisory修正sourceと`uuid` exports互換性を確認後に確定する。
- New tasks: なし。
- Remaining: advisory修正コミット/source、uuid 7→patched major互換性、parent metadata、scoped resolution、candidate差分、validation。
- Progress: 30% (3/10)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-08-25 10:08 (JST)

- Summary: advisoryの成立条件、xcodeの実呼び出し、patched major互換性、parent更新候補、parent-scoped resolutionの候補差分を確定した。
- Advisory / source evidence:
  - `https://github.com/advisories/GHSA-w5hq-g745-h8pq`（2026-08-25確認）=> `v3()`/`v5()`/`v6()` API（package majorではない）がcaller-provided `buf`と`offset`の範囲を検証せず、16 bytesの部分書き込みを許す。affectedは`<11.1.1`、`>=12.0.0 <12.0.1`、`>=13.0.0 <13.0.1`、patchedは11.1.1/12.0.1/13.0.1。
  - `https://github.com/uuidjs/uuid/commit/3d2c5b0342f0fcb52a5ac681c3d47c13e7444b34`（2026-08-25確認）=> `src/v35.ts`と`src/v6.ts`へ`offset < 0 || offset + 16 > buf.length`のRangeError guardを追加。`offset = offset || 0`から`offset ??= 0`への修正も含む。
  - `node_modules/.pnpm/uuid@7.0.3/node_modules/uuid/dist/v35.js:39-57` => 修正前は`buf && offset || 0`後に範囲検証なく`buf[off + idx]`へ書き込む。canonical uuid 7.0.3の`v5('x', namespace, new Uint8Array(8), 4)`はthrowせず部分書き込みとなり、isolated uuid 11.1.1/12.0.1はRangeErrorとなった。
- Reachability classification: `xcode@3.0.1`は`lib/pbxProject.js:22,89-99`で`require('uuid')`し、`generateUuid()`から引数なし`uuid.v4()`だけを呼ぶ。v3/v5/v6、`buf`、`offset`の呼び出しはないため、static analysisの結論は**B. vulnerable APIは使用されていない**。repoのapplication source/scripts/tests/config/workflowにも`uuid` tokenはない。
- Expo / native boundary:
  - `@expo/config-plugins/build/plugins/withIosBaseMods.js:42,228-232`がlazyに`xcode`をrequireし、iOS `xcodeproj` modの`project.parseSync()`で利用する。`ios-plugins.js:165-171`の`withXcodeProject`がiOS modへ接続する。
  - xcode/uuidはExpo prebuild/config toolingのinstall graphにあるが、app sourceからのimportはなく、Metroのproduction application bundleへ直接含まれる経路は静的に確認できない。bundle内容そのものは本Runでは未生成のため、実bundle検査はNot Runとする。Dependabotのruntime scopeとapplication runtime exposureは分離して評価する。
- Compatibility evidence:
  - `node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/package.json` => `main: index.js`、CommonJS、`uuid: ^7.0.3`、Node `>=10.0.0`。
  - uuid 11.1.1 metadata（`https://raw.githubusercontent.com/uuidjs/uuid/v11.1.1/package.json`、2026-08-25確認）=> `type: module`だが`main: ./dist/cjs/index.js`と`exports.node.require`を持つ。xcodeのCJS require、`uuid.v4()`、24桁uppercase hex ID生成はNode v24.12.0のisolated smokeで成功した。`v5`の範囲外bufferはRangeError。
  - uuid 12.0.1 metadata（`https://raw.githubusercontent.com/uuidjs/uuid/v12.0.1/package.json`、2026-08-25確認）とCHANGELOG（`https://raw.githubusercontent.com/uuidjs/uuid/v12.0.1/CHANGELOG.md`）=> ESM-only exportsで、v12.0.0はCommonJS supportを削除。Node v24.12.0の`require(esm)`有効時はxcode smokeが成功したが、`node --no-experimental-require-module`では`ERR_REQUIRE_ESM`。xcodeのNode >=10という宣言に対する安全なdrop-inとは扱わない。13.0.1/14.0.0も同様にESM-only系統で、14は別途Node20+のbreaking changeを含む。
- Parent / pnpm evidence:
  - `pnpm view xcode version`, `pnpm view xcode dist-tags --json`, `pnpm view xcode@3.0.1 dependencies engines --json`（2026-08-25）=> stable latestは3.0.1、nightly 3.0.2はuuid `^7.0.3`のまま。xcode側の自然な安全解消は確認できない。
  - `pnpm view @expo/config-plugins version`, `@expo/config version`, `@expo/prebuild-config version`, `@expo/cli version`, `expo version`および`@57`/current metadata（2026-08-25）=> Expo 57 latestは`expo 57.0.16`、config-plugins 57.0.9、config 57.0.9、prebuild-config 57.0.14、cli 57.0.18。config-plugins 57.0.9も`xcode: ^3.0.1`でuuid解消なし。Expo 57.0.16を同一baselineでlockfile-only解決しても`xcode 3.0.1 -> uuid 7.0.3`が残り、lockfile差分は629 lines、package keysは1277から1292へ増えた。
  - `pnpm help install`（pnpm 9.10.0）=> `--resolution-only`はresolutionを再実行してpeer issuesを表示する一般オプションで、dependency pathを指定するtargeted resolution機構ではない。公式pnpmのparent-scoped override形式と同じ`xcode@3.0.1>uuid` selectorをisolated candidateで検証した。
- Candidate evidence (all copied from the same canonical baseline under ignored `.artifacts/uuid-investigation/`; canonical files were not changed):
  - scoped override candidate manifest: `xcode@3.0.1>uuid: 11.1.1`。`pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile`、続く`pnpm install --frozen-lockfile --ignore-scripts`ともexit 0。lockfile diffは5 additions / 5 deletions、xcode remains 3.0.1、uuid package key is 11.1.1、package/snapshot counts remain 1277/1278。`pnpm why/list`の全経路が`xcode -> uuid 11.1.1`へ変わった。
  - scoped runtime smoke: `uuidVersion=11.1.1`、`uuid.v4` function、generated ID length 24、24-character uppercase hex match=true。xcode CJS module loading succeeds。
  - uuid 12 compatibility candidate: lockfile resolves `xcode 3.0.1 -> uuid 12.0.1` but has the ESM/CJS runtime caveat above; diff is 5 additions / 7 deletions and includes unrelated peer snapshot metadata changes (`bufferutil` / `utf-8-validate`) not present in the 11.1.1 candidate.
- Progress: 80% (8/10)

## 2026-08-25 10:10 (JST)

- Summary: 将来の実装PRに必要なvalidation範囲をworkflowから確定し、canonical baselineのread-only Expo config validationを実行した。
- Validation mapping:
  - `.github/workflows/ci.yml:65,107,110-113,204-207,233-236,287-290` => frozen install、format/lint/typecheck、Vitest、web buildが必要。
  - `.github/workflows/cross-browser-smoke.yml:44-47` => frozen install後の`pnpm run build:web`とFirefox/WebKit smoke。xcode経路の直接検証にはならないが、web regression guardとして必要。
  - `.github/workflows/native-ci.yml:124-138,172-180,385-393` => native static、Android automation/production prebuild、component/native validation。Androidはxcode vulnerable APIを呼ばないが、共有Expo config tooling変更の回帰確認として必要。
  - `.github/workflows/native-ios-ci.yml:54-66,89-92,181-193,216-219` => macOS runner上のfrozen install、Expo config、iOS prebuild、CocoaPods、Xcode simulator build。xcodeを実際に使うため最重要。
- Executed validation: `pnpm exec expo config --json`（canonical baseline、exit 0）。candidateでは各lockfile-only resolution、frozen install、`pnpm why/list`、xcode+uuid CJS/API smokeを実行し、scoped 11.1.1はexit 0。
- Not Run: canonical `pnpm run lint`、`pnpm run typecheck`、`pnpm run test`、`pnpm run build:web`、`pnpm run verify`、Android prebuild/build、iOS prebuild/CocoaPods/Xcode build。理由は今回が依存変更を実装しない調査Runであり、iOS toolchainはWindowsでは実行できないため。実装PRでは上記CI相当を実行する。
- Progress: 90% (9/10)

## 2026-08-25 10:16 (JST)

- Summary: durable report、Run Artifact、sanitization、canonical dependency diff、scope制約を最終確認した。
- Deliverables:
  - `docs/reports/2026-08-25_101029_uuid_vulnerability_remediation_investigation.md`を作成。指定17 section、candidate diff、risk、Recommendation / Alternative / Rejected、follow-up scope、Evidence / Not Runを含む。
  - `.codex/runs/20260825-094404-JST/PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`を日本語で更新。run.jsonはstrict / investigation / readonly、status complete、network true、Git mutationなしとして記録した。
- Sanitization: `powershell.exe -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260825-094404-JST -Write -Check` => files_scanned 4、files_changed 0、replacements_total 0、residual_findings 0。
- Final safety checks:
  - `git diff --exit-code -- package.json pnpm-lock.yaml` => exit 0。canonical dependency manifest / lockfileに恒久差分なし。
  - `git status --short` => 新規Run Artifactとdurable reportのみ。`.artifacts/`と`node_modules/`はignored temporary material。
  - `git add` / `commit` / `push` / `reset` / `clean` / `rm` / `git rm` / file deletionは実行していない。
- Final decision: Recommendedは、次Runでparent-scoped `xcode@3.0.1>uuid: 11.1.1`を、iOSを含む実装PR validationを条件に最小差分で実装すること。parent upgradeがsafe uuidを正式に含むようになった場合はそちらを優先して再評価する。今回Runではremediationを実装していない。
- Progress: 100% (10/10)
