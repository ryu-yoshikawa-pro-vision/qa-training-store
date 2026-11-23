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
