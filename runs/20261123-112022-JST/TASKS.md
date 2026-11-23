# Tasks（タスク）

## Now（現在）

- [x] 1. PLANを確定する。
- [x] 2. 必要な既存証拠を調べ、Issue/PR/Run HEADを確認する。
- [x] 3. 各本人決定と更新先を対応付ける。
- [x] 4. 統合受入Plan、継続手順、監査レポート、learner NOTICE、AGENTS、Issue #228を更新する。
- [x] 5. Markdown差分のformat/lint、文書品質、security scan、diff checkを検証する。
- [x] 6. PR本文へ本人確定事項と現行受入状態を反映し、旧判定を履歴として区別する。
- [x] 7. Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 8. 変更差分・対象ブランチ・commit対象を確認する。
- [x] 9. 現ユーザー指示で許可された通常pushについて、直前にremote/PR状態とfast-forward条件を確認して実行する。元の10ファイルを`24944a73…`基点の書き込み可能な`<REPO_ROOT>`へpatch復元し、hashと全10ファイルの内容を照合した。差分を保持する。
- [ ] 10. 今回のNOTICE・Plan記録を含む新しいPR HEADのWeb/Mobile CIとproduction Artifactを確認し、PR本文へ結果を記録する。直近完了HEAD `e026ac1cf4751f4e6bba01ab494b0ebc7d2a8a74`のWeb `45179550863`はSUCCESS、Mobile `45179551007`はExpo Doctorの`expo-sqlite ~57.0.6 / 57.0.5`不一致でFAIL。今回の新HEADで再確認する。
- [x] 11. React Navigation PNG5件を固定version/source/LICENSEと照合し、個別blob SHA-1を比較する。
- [x] 12. Build生成NOTICEの固定リンク・version guard・Web依存NOTICE出力契約を追加し、contract testとlearner NOTICEを更新する。新contractは7/7 PASS。
- [x] 13. 統合Plan、継続手順、既存distribution auditへ現行1.4判断と残る不足を記録する。
- [x] 14. lockfile固定の隔離install、Web export/source map解析、旧HEAD Web Artifact取得・ZIP検査を実施。依存閉包は61 package/version、2,326 source entries。Artifactはchecksum一致・320 entries・source mapなし。
- [x] 15. focused contract後にformat/markdown/text/security/build/verify、差分確認、Run sanitizer/strict collectorを実行する。focused 10/10、修正後`pnpm run verify`（125 contract files、1,456 pass／7 skip、全Build含む）は**前回candidate SHAの検証履歴**。今回の2026-11-24 NOTICE/Plan差分でのverify結果は新節に記録し、EPERMでexit 1。Run sanitizerは5 filesを走査し5 replacements/0 residual、strict collector exit 0。
- [x] 16. NOTICE generator/test/doc差分を独立レビュアーが確認した。旧P1/P3（OFL表示、empty JS、inventory重複）は解消。新P2 dangling symlink出力指摘もlstat guardと2負例で修正し、reviewerは再確認後P0–P2なしと報告。
- [x] 17. 最終差分・Run Artifactを検証し、既存`24944a73…`を維持した追加ローカルcommitを作成する。元checkoutの`.git`はread-onlyのため変更せず、`<TEMP_ROOT>`の専用cloneで実施した。commit `dc9408b90f8009cb8d87de2e774306e4ca392682`。
- [x] 18. 既存のNOTICE repair/evidence commits `dc9408b9…`と`0324dbd2…`は通常push済み。さらにPR branchは`e026ac1cf4751f4e6bba01ab494b0ebc7d2a8a74`まで進み、PR APIとlocal tracking refのheadが一致することを確認した。
- [ ] 19. local/remote/PRの同一SHAでWeb CI、Mobile CI、必須Artifact/jobを確認する。`dc9408b9…`のWeb run `45172067403`はFAIL、Mobile run `45172067487`は後続API照会でSUCCESS、`0324dbd2…`と`e026ac1c…`もpush済みの旧履歴として扱う。今回のNOTICE/受入記録commitを含む最新HEADに対し、waiterを1回使用してCIと必須Artifactを確認する。
- [ ] 20. PR本文に最終SHA・CI・1.4・8.4結果を追記し、未受入条件を維持する。PR OPEN状態と既存受入履歴を保持する。

## 2026-11-24 `standard-navigation@0.0.5` 最終確認

- [x] 21. 既存の一次資料で旧0.0.5への現行MIT適用を確認する。
- [x] 22. learner NOTICE、統合受入Plan、継続手順、既存distribution auditへ根拠と現在判定を反映する。
- [x] 23. local Web BuildとNOTICE出力、対象契約、直接実行可能な検証を確認する。
- [x] 24. 今回の限定差分を既存の独立reviewerにread-only reviewさせ、指摘を処理する。初回P2（1.4状態の文書差）とP3（Issue #8の説明範囲）を修正。最終read-only再レビューで両指摘の解消を確認し、残ったP3（レビュー依頼状態のRun task記載）も完了状態へ更新した。最新reviewer報告はdiff SHA-256 `b603f1b7086e3dd959461e7b7bf775421b977f7df4fcdf74ce658fed2f88c319`を対象とし、他にP0–P3なし。
- [x] 25. Runを更新し、sanitizer／strict collector／security scanでcommit前確認する。4個のRun file sanitizerは変更0・残存0、strict collector exit 0、`security:check` 236 runtime／549 credential-scan files PASS。Web Buildと公開NOTICE契約10/10、format・Markdown・text検証もPASS。
- [ ] 26. 最新PR HEADとの祖先関係を確認して文書変更をcommit・通常pushする。
- [ ] 27. 新HEADのWeb/Mobile CI、Web production Artifact、PR本文を確定し、8.3/8.4を判定する。

### 実行結果

`standard-navigation@0.0.5`は`pnpm-lock.yaml`で固定され、`expo-router@57.0.31`配下。旧package metadataはMITを宣言するが、旧tree/packageにLICENSEはない。公式LICENSE追加commitと差分履歴を確認し、旧版への適用は履歴から推測しない。公式Issue #7でLICENSE追加者が全過去版へ適用と回答したため、copyright lineをNOTICEに追加。Issue #8はOPEN・コメントなしで、upstream repositoryと将来npm packageへのLICENSE同梱を依頼している。#7はdownstreamの0.0.5適用確認に回答しているが、上流同梱依頼は未回答。

Local `pnpm run build:web` PASS。実bundle `entry-2eacba5967e32f773219f7b9a8ab134a.js`に対象実装を確認。生成NOTICEはsource public markerとbyte-for-byte一致し、copyright・MIT本文・固定source/answer linksを含む。NOTICE contract 10/10 PASS、direct `node --import tsx scripts/training/validate-ai-assisted-qa.ts` PASS、supported-behaviors validator PASS（complete、188/188）、`security:check` PASS。

`pnpm run verify`はformat、Markdown lint、text checks、skill/spec/curriculum validation後、`validate:ai-assisted-qa`の`tsx` CLIで`listen EPERM <TEMP_ROOT>/tsx-1000/249.pipe`によりexit 1。直接Node importによる同じvalidatorはPASSしたが、verify全体はFAILのまま記録する。Repository lint/typecheck/test/build後半はこの実行では未到達。CI exact-head結果で補足する。

### Git移行の保全

元WSL checkoutのHEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`と10-file未commit差分は変更せず保持。patch SHA-256 `29f8e8a2f395e28784b7467f388f9c08fb735dc653ad1ab7f00f96865f7db04e`を`<TEMP_ROOT>/pr199-e026-uncommitted.patch`へ保全した。書き込み可能checkoutはすでにremote/PR HEAD `e026ac1cf4751f4e6bba01ab494b0ebc7d2a8a74`であり、元差分の適用checkはbase差異で失敗。10パスすべてが`24944a73…..e026ac1c…`のremote commit範囲に含まれ、パッチを重ねない。元checkoutはそのまま残す。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- Issue #228の旧PR関係欄が1.2の受入をマージ前必須としていた。現在は公開前条件に変更し、未受入状態と公開禁止は保持する。
- 固定Skill監査報告の旧BLOCKEDは2026-11-07の記録として残し、2026-11-23の本人決定を現在判定として後続追加する。
- PR本文・GitHub Issue更新は実施権限があるが、merge/close/public releaseは対象外。
- `@react-navigation/elements@2.9.10`の固定source commit、MIT LICENSE、5 PNGの一致を確定。先行した旧Artifact取得経路の失敗は履歴として保持する。後続で旧HEAD `24944a73…`のArtifactを取得・digest検証し、local frozen Web export source mapから61 package/versionの依存閉包を解析した。
- 共有WSL `node_modules`がlockfileと不一致だったため、独立storeへ`pnpm install --frozen-lockfile`を行い成功した。以降は共有依存結果を使用しない。
- `dc9408b9…`のWeb CIはNOTICEに含めたパッケージ著作者の個人メール連絡先を配布guardが検出し、Full learner distributionとM06/M07実行を同一原因で拒否した。guardを緩和せず、holder名・年・出典を保って連絡先だけを除いた修正を作成した。修正後`build:web`とfocused contract 10/10 PASS。独立レビューでメールでない`swmansion.com`をNOTICEへ復元した。再Build/lint/security/focused testはPASS、course distribution検証と新head CIは未実施。

## Blocked（ブロック中）

- `standard-navigation@0.0.5`の適用不確実性は公式Issue #7の一次回答で解消し、NOTICEへ反映済み。現在の1.4 license blockerではない。新HEADのproduction ArtifactでBundle/NOTICEを最終照合する作業は8.3のArtifact確認に残る。
- Remaining work: independent reviewerの最終再確認、Runのstrict commit前確認後に今回の文書差分をPR branchへ通常commit/push、新HEADのWeb/Mobile CIとproduction Artifactを確認しPR本文を更新する。8.3は現baselineのMobile Expo Doctor mismatchがFAIL、修正は別PR対象。元checkoutは変更せず、10-file patch backupを保持する。
