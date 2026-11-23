# Plan（計画）

## Objective（目的）

- 本人が確定したSkill権利・Codex生成画像・外部Provider・1.2配布安全性の判断を既存正本に反映し、同じ確認の繰り返しと判定矛盾を解消する。

## Scope（対象範囲）

- In: 統合受入Plan、継続手順、固定Skill監査履歴、learner第三者通知、AGENTSの参照指示、Issue #228、PR #199本文。
- Out: 新しい権利監査、実Provider接続・認証・課金・保持調査、外部AI評価の開始、製品SUT変更、Public Templateの公開、PR merge/close。

## Assumptions（仮定）

- 本人のこのターンの明示決定を権利・配布意思・実Providerの範囲に関する正本として扱う。
- 1.2のIssue移管後の受入時点は、公開・外部配布前でありPRマージ前ではない。Issue移管自体はPASSとしない。
- 1.4は本人決定と無関係の第三者由来素材に限る。既存記録に具体的に挙がるReact Navigation Elements画像と生成Web JS依存の証拠範囲を記述し、未知の素材があると推測して範囲を拡大しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。必要な判定はPlanへ根拠と再開条件を記録する。
- 仮定してよい細部: 本人決定に反する旧記述は履歴ラベルを付け、現行表が優先と明記する。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 既存Plan・Issue・PR本文に残る古いBLOCKED文言が、本人の現在の決定と矛盾している。
- H2: 現行ルールを統合Planへ集約し、他文書を参照させれば再確認を防ぎつつ未監査物の公開制限を維持できる。

## Research Plan（調査計画）

- Round 1 Query: 作業状態、正本、既存Run、PR #199 HEAD、Issue #228本文を確認する。
- Round 2 Query: 各決定に反する現在文言を見つけ、歴史記録と現行判断を分離する。
- Exit Criteria:
  - 受入状態は統合受入Planに一意に定義され、別文書は参照または履歴となる。
  - Issue #228とPR本文がPlanに整合し、未監査物の公開禁止が残る。

## Approach（進め方）

- 統合受入Planに現行決定を記録し、継続手順・監査履歴・学習者NOTICE・AGENTS・Issue #228・PR本文を整合させる。
- 差分の書式、リンク、sanitizer/securityを確認し、既存PRブランチへ記録を反映する。
- 標準フロー: `PLAN -> 既存証拠確認 -> 更新 -> 検証 -> commit/push -> latest-head CI -> PR本文更新`

## Definition of Done（完了条件）

- Skill 13件の本人作成・既存MIT範囲・配布意思が明確で、旧監査BLOCKEDは当時の履歴として保持される。
- Codex生成画像とExpo Router／React Navigation等の第三者素材が区別される。
- 実Provider受入はPR #199のマージ前条件から外れ、fail-closed拒否テストの維持が明記される。
- 1.2はIssue #228で未受入のまま継続し、公開・外部配布前に受入することと、Issue移管がPASSでないことが記録される。
- PR本文とPlanが同じ受入時点・判定を示し、最新PR HEADのWeb/Mobile CIが確認される。

## Risks / Unknowns（リスク・未知点）

- 具体的な第三者素材として既存通知に記載されたReact Navigation Elements PNG5件は、固定元revisionが不足している。生成Web JSの通知は歴史HEADに紐づき、完全な現行bundle閉包を示さない。一般的な懸念で対象を広げず、Planに記した具体的証拠不足を残す。
- Issue #228の未監査Template payloadは引き続き公開不可。PR #199のmerge許可や公開許可をこの作業で決めない。

## Thinking Log（判断記録）

- PR #199/Issue #228の現在情報を取得。PRはOPEN、head `00670f8ca016845e288f019ae5ad160ca1eca051`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。ローカルHEADとPR HEADは一致。`git fetch origin`は`.git/worktrees/.../FETCH_HEAD` read-onlyのため通常実行失敗。リモート状態はGitHub PR APIで一致を確認した。
- Issue #228はOPENで、旧本文は1.2を「マージ前必須」としていたため、本人決定に合わせ受入時点を公開前へ訂正。Issueは閉じていない。
- 2026-11-23本人決定に基づく解釈は、1.2を公開前条件として保持しつつマージ前条件から除外すること。1.3は固定Skillに限りPASS、1.4は具体的に記載した第三者素材のみ継続。

## 2026-11-23 継続：B案1.4・push・最新CI・8.4

### Goal（目的）

- 固定されたReact Navigation PNG5件の出典・MIT表示を確定し、1.4の残るWeb Bundle依存閉包を証拠に基づいて判定する。既存commit `24944a73f769d32f38061a26fce5911e2cbb8bc5`を保持し、必要な変更を通常pushして最新HEADの必須CIとマージ前可否を確認する。

### 対象と除外

- In: `scripts/docs/repair-expo-router-web-assets.ts`、`tests/contracts/web-public-build.test.ts`、learner NOTICE、既存統合受入Plan・継続手順・Web distribution audit、active Run。push対象は既存PR branchのみ。最終CI記録はPR本文へ追記する。
- Out: PR #199 merge/close、main変更、force/reset/rebase、外部公開、Provider接続・課金、SUT・正式仕様・Seed/Reset・既存製品テスト、1.2配布物の再監査、固定Skill・Codex生成画像の再確認。

### 確認済み事実と未知点

- PRはOPEN、remote head `00670f8ca016845e288f019ae5ad160ca1eca051`、local candidate `24944a73f769d32f38061a26fce5911e2cbb8bc5`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。GitHub APIでhead/baseを確認。`git fetch`は`.git` read-only、`git ls-remote`はこの環境のGitHub DNS解決失敗。remote updateはAPIで照合を続け、latest SHAが予期せず変わればpushしない。
- React Navigation source tag `@react-navigation/elements@2.9.10`は署名検証済みtag objectで、commit `69573410534dc9a467ace6e749e82d32058b3092`を指す。5 PNG blob SHA-1はExpo Router 57.0.31 source commit `76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6`と一致。両LICENSEと著作権表示はMITで一致する。
- `course/shop/**`は現在のcheckoutに存在せず、ignored `dist/`はcandidate HEAD由来と確認できずsource mapなし。isolated archiveの`pnpm install --offline --frozen-lockfile --ignore-scripts`は`@expo/metro-runtime@57.0.18` tarball欠落で失敗。旧remote HEAD `00670f8c…`のWeb CI run `45071575804` artifact `14773985467`はGitHub download APIから一時file URIを得たが、このcheckoutで読み出す経路がなく、shellからsigned URLを取得する試みはDNS解決失敗。旧SHAのartifactで候補HEADの依存閉包は証明できず、1.4全体はBLOCKED。
- User explicitly authorizes ordinary push to existing PR branch in this turn. Push前にGitHub APIでOPEN/head/base、ancestor、clean scopeを確認する。`git fetch`/`ls-remote`の環境制約を権限変更で回避しない。

### 変更・検証方針

- Buildが誤ったversionのMIT noticeを出力しないよう、generatorにExpo Router 57.0.31/version guardと固定source linksを保持し、contract testで生成NOTICEと不一致version拒否を確認する。
- PNG5件とWeb Bundle依存閉包の判定を統合Plan/NOTICE/既存監査記録へ分けて記録する。独立reviewerはこの限定差分だけを確認する。
- focused contract、format/markdown/text/security、diff、Run sanitizer/strict collectorを実行する。`verify`はlockfile依存が正確にインストール済みの場合のみ実行し、実施・終了コードを記録する。
- scope内変更をcommitした後、現在のPR branchへ通常pushする。push後にhead SHAを3経路で照合し、`wait_for_required_ci`をそのSHAで1回使用する。Web/Mobileのjob・artifact・Windows/Linux関連テスト・skipを同一SHAで確認する。
- 1.2はIssue #228に未受入のまま残す。1.3は固定13 SkillのPASS、Provider実受入は除外、7.1/7.2既存レビューは範囲を維持する。最新差分の独立確認と8.3が揃わない場合8.4は未受入／マージ不可。

### 次の再開条件

- 1.4全体のBLOCKED解消には、最終HEADから生成されたWeb production Bundleとsource mapまたは同等の全依存証拠の取得が必要。これがない間、Web依存closureはPASSにしない。

### 2026-11-23 push後の確認

- ユーザー報告後にGitHub PR APIでPR OPEN、remote HEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`、base/main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`を確認。元のローカルcommitがPRへpushされた。
- このRunで作成した追加10ファイル差分は未commit・未push。sandboxは`.git`をread-onlyにしており、`git add`はlock存在時とread-only filesystemの両方で失敗。権限変更、lock削除、API ref更新をせず保持。
- `wait_for_required_ci`を最新remote SHA `24944a73…`で1回実行したが長時間結果が返らず停止。Web/Mobile run ID・conclusion・Artifactは未取得。独自ポーリングへ切り替えない。
- PR本文冒頭にremote HEADの確認、CI未確認、1.4/8.4未受入、ローカル追加差分未反映を追記。既存受入履歴は履歴として残した。
- 受入状態：1.2 Issue #228の公開前未受入、1.3固定Skill 13件PASS、1.4 BLOCKED、8.3未確認、8.4未受入・マージ不可。


## 2026-11-23 21:08 JST 最終local検証checkpoint

- PR #199のremote/PR HEADは作業開始時点で`24944a73f769d32f38061a26fce5911e2cbb8bc5`、OPEN、branch/upstream一致、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。元checkout `.git`はread-only。未commit 10ファイルをsha256 `29f8e8a2f395e28784b7467f388f9c08fb735dc653ad1ab7f00f96865f7db04e`のpatchで`<REPO_ROOT>`へ復元し、元checkoutは未変更。
- lockfile準拠のNode `v24.22.2`／pnpm `10.34.5`依存を使用。`pnpm run verify`修正後最終実行はexit 0。Contracts 125 files、1,456 passed／7 skipped、unit 66、Integration 197、Repository 150／1 skip、Component Web 127／Native 92。typecheck／validation／security／Web Build／Spec Buildを含み、ESLint 93 warnings／0 errors。
- `web-public-build.test.ts` 10/10。新規symlink findingに対し出力dir path componentと生成通知先を`lstat`で確認し、dangling file symlinkおよびdist root symlinkを拒否。独立レビュアーは修正後2経路を確認し、P0–P2指摘なし。固定NOTICE/OFL入力は現在通常file。レビューで残ったTOCTOU注意はdistを同時変更可能な別processを前提とするもので、今回build契約の失敗とは判定されていない。
- 最終local Web BuildのJSは`entry-2eacba5967e32f773219f7b9a8ab134a.js` 3,739,226 bytes、SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`。distのNOTICE SHA-256 `4a0970b8770c771bd759a8cd5a63adf834a8132f2d6a39d4c157e858536d2fc8`はpublic marker部分と完全一致し、package/version inventory 61行／61 unique。OFL本文4,004 bytesは正本とbyte-identical、OFL font 12 filesとReact Navigation PNG 5 filesを確認。
- 1.4は`standard-navigation@0.0.5`の186-byte moduleがBundleに存在するがcopyright noticeを確認できずBLOCKED。MIT metadataとpackage authorだけでは必要なcopyright displayを補わない。権利侵害を断定しない。公開・配布停止を保持する。8.3/8.4はlocalでは判定せず、追加commit/push後の同一PR HEAD CIが必要。
- Scope: 10 files、製品SUT／docs/spec／Seed/Reset／main-owned tests／lockfile変更なし。Run sanitizerは5 files、5 replacements、residual 0でPASS。strict collectorもexit 0。次は明示stage・commit、直前PR API/remote head確認後の通常push、new SHAのWeb/Mobile CI、PR本文先頭更新。

## 2026-11-23 Web CI failure and NOTICE repair

- Local writable clone `<REPO_ROOT>` preserved the original read-only checkout. Original ten-file patch was SHA-256 verified and restored at `24944a73…`; all ten file contents were retained. Added commit `dc9408b90f8009cb8d87de2e774306e4ca392682` was normally pushed and GitHub PR/ref APIs returned the same SHA with PR OPEN.
- Web workflow `45172067403` for `dc9408b9…` failed in `Full learner distribution (#199)` and `M06/M07 actual course:run`. Both failed on the same public-content guard detecting third-party contributor email fields in `THIRD_PARTY_NOTICES.md`; the dependent `verify` job also failed. No assertion ran in the course-run job. The security guard remains unchanged.
- The exact-head production artifact `14817077162` was downloaded and its SHA-256 matched the GitHub artifact digest. Its ZIP had 322 entries, no CRC error, and no source map. Exact JS/NOTICE/OFL hashes are in Run REPORT and the integration acceptance Plan. `standard-navigation@0.0.5` remains an unresolved specific copyright attribution gap; no infringement finding.
- A narrow NOTICE candidate removes only email contact fields, retaining holder, year, package/source attribution. Local `pnpm run build:web` passed; its generated JS is 3,739,226 bytes/SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`; NOTICE 23,898 bytes/SHA-256 `2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`; OFL remains source-identical. Source and generated NOTICE had zero email-pattern hits. `web-public-build.test.ts` passed 10/10.
- `pnpm course:sync` refused the dirty worktree, so the learner distribution check is not yet verified after the correction. The Web CI waiter was called once for `dc9408b9…` and returned Web failure / Mobile `in_progress`; Mobile's latest result for this SHA is not final in the current evidence. Local changes and final repair-head CI remain pending.
- Current acceptance: 1.2 stays open in Issue #228 until external publication; 1.3 fixed user-authored 13 Skills remains PASS; 1.4 remains BLOCKED by `standard-navigation@0.0.5`; 7.1/7.2 existing limited review scope remains PASS; 8.3 not PASS; 8.4 not accepted and merge unavailable. No merge, close, publication or Provider use.


## 2026-11-23 clean distribution gate

- Clean commit `0324dbd260043fd356178262159d917ec0cad606`上でcourse syncを実行。既定sandboxはfixed raw GitHub content fetchで失敗したが、承認されたread-only networkの再実行で完了。sync後`verify-distribution` exit 0（569 files、Shop 322、states 22、assessment refs 17）。
- 配布candidate NOTICE SHA `2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`、JS SHA `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`、Notice email pattern 0。ローカル検証であり外部公開ではない。
- Next: Run checkpointをsanitizer／strict collectorで確定し、追加記録commit・通常push後、最終PR SHAのWeb/Mobile CIとproduction Artifactを確認する。


## 2026-11-24 追加：`standard-navigation@0.0.5` とExpo CI切り分け

### 目的

既存のB案1.4の具体的なライセンス疑問を一次資料で解消し、受入Plan、learner NOTICE、監査履歴を更新する。Expo Doctorの依存不一致は別PR対象として維持し、1.4とその他の可能な作業を止めない。

### 作業開始状態・未commit差分

- GitHub PR APIはPR #199 OPEN、base `main` `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`、head branch `docs/plan-ai-agent-qa-curriculum-redesign`、HEAD `e026ac1cf4751f4e6bba01ab494b0ebc7d2a8a74`。書き込み可能checkoutもcleanで同じSHA。
- 元WSL checkoutはHEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`で10ファイルに未commit差分がある。元checkoutには一切書き込まず、patchを`<TEMP_ROOT>/pr199-e026-uncommitted.patch`へ保全（61,386 bytes、SHA-256 `29f8e8a2f395e28784b7467f388f9c08fb735dc653ad1ab7f00f96865f7db04e`）。statusに未追跡ファイルなし。source/diff commandはWindows-mounted checkoutのI/O遅延で終了が遅れたが、最終的にstatus、10パス、patch、hashを取得した。
- patchのforward/reverse apply-checkはいずれも書き込み可能checkoutへ適用不可。両checkoutのbase差異と同パスの後続commitによりhunkがずれている。GitHub/local e026のcommit範囲には10パスすべてが含まれ、`dc9408b9`／`0324dbd2`／`e026ac1c`の変更としてPRに反映済み。stale patchを重ねず、元checkoutとpatch backupを保全した。

### 公式一次根拠

- `pnpm-lock.yaml`は`standard-navigation@0.0.5`とintegrity `sha512-YAmzwAiiQVocZxO/VGPFiQHcu5pKiz09QIGC0MK6aRMoa3E0QkoTQgcqJr7ZZ3OMiNhu4DkaGElFI5htjOIDbw==`を記録。`pnpm why --recursive standard-navigation`は依存元を`expo-router@57.0.31`と示す。installed packageの`package.json`は0.0.5／MIT、`lib/src/index.js` 186 bytes。
- 旧upstream source [`0016fae7800b9f27bab91326697b740a6d2266dc`](https://github.com/react-navigation/standard-navigation/tree/0016fae7800b9f27bab91326697b740a6d2266dc)にはLICENSEとcopyright lineがない。author metadataから権利者を推定していない。
- 現LICENSEは[`33f3d3c976a24bad9fe32583939318bc143fa41b`](https://github.com/react-navigation/standard-navigation/commit/33f3d3c976a24bad9fe32583939318bc143fa41b)で2026-08-06に追加、noticeは`Copyright (c) 2026 React Navigation Contributors`。旧commitからの5-commit compareでは4 filesが変化（LICENSE addition、package.json、pnpm-lock、src/index.tsx）しversionは0.0.7へ進むため、repository continuityだけで適用を推測しない。
- [Issue #7](https://github.com/react-navigation/standard-navigation/issues/7#issuecomment-6474665803)には、0.0.5へ当該MIT/copyright lineが適用されるかの質問に対してLICENSE追加者が`all previous versions of standard-navigation`へ適用と明示回答。これを旧版への適用に関する一次根拠とし、Noticeにcopyrightと出典を記録した。[Issue #8](https://github.com/react-navigation/standard-navigation/issues/8)はOPEN・コメント0で、upstream repositoryと将来npm packageへLICENSE/noticeを同梱する依頼が残る。#7はdownstreamの0.0.5適用確認には回答しているが、Issue #8の上流同梱依頼は未回答。
- B案1.4のこの具体的な未解決事項は解消。1.2 Issue #228の配布安全性制限とは分離。

### NOTICE / local Build

- `learner-THIRD_PARTY_NOTICES.md`では該当inventory rowと説明のみを更新。既存MIT本文、他のライセンス通知、generator/security guardは変更なし。
- `pnpm run build:web` exit 0。bundle `dist/_expo/static/js/web/entry-2eacba5967e32f773219f7b9a8ab134a.js`は3,739,226 bytes、SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`、minified code内に`standard-navigation`実装あり。生成NOTICE SHA-256 `47995b81f5e20f4157c95c37265a5b02cf2197379d9f8c934b1ded9967e7d6b1`はTemplateのpublic marker部分とbyte-for-byte一致し、Copyright line、Issue/commit/source links、MIT全文を含みemail patternは0。
- `tests/contracts/web-public-build.test.ts` 10/10 PASS。

### Verification

- `pnpm run verify` exit 1。Prettier、Markdown lint（653 files / 0 issues）、changed text（4 Markdown files）、full text（232 files）、Skill/spec/spec visuals/curriculum validations PASS。最初の異常は`validate:ai-assisted-qa`の`tsx` CLI起動時に`listen EPERM <TEMP_ROOT>/tsx-1000/249.pipe`。同じAI validationを`node --import tsx scripts/training/validate-ai-assisted-qa.ts`で直接実行しPASS、supported-behaviorsも188/188 complete PASS。`security:check`は236 runtime files/549 credential-scan filesでPASS。`verify`はこのstartup異常で停止し、その後のrepository lint/typecheck/test/buildは未到達。原因はsandboxのIPC socket制限と分類し、CI exact-head verificationに委ねる。
- No dependency update; no Expo package, lockfile, maintenance workflow, SUT, specs, Seed/Reset, or existing product test changed.

### Existing CI baseline and next work

- e026 Web CI `45179550863`: SUCCESS, 29 successful jobs and one conditional skip. e026 Mobile `45179551007`: FAILURE. `Native Static / Run Expo Doctor` reports `expo-sqlite expected ~57.0.6, found 57.0.5`; `native-ci / verify` fails dependently. Android/iOS Builds and Android Maestro succeeded. The same dependency mismatch is present on main; PR #199 is prohibited from changing dependency/workflow, so classify as separate Expo repair.
- New doc/NOTICE commit and normal push remain. Then use the required exact-head waiter once, inspect Web/Mobile jobs and `web-dist-production` output, compare bundled code and emitted notice, and update PR body. If the same Expo Doctor failure occurs, 8.3 stays FAIL and 8.4 remains not accepted / merge unavailable. No merge, close, external distribution or Provider call.
