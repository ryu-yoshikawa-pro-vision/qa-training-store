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
- [ ] 10. 修正後の最新PR HEADのWeb/Mobile CIと必要Artifactを確認し、結果をPR本文へ記録する。Web run `45172067403`は`dc9408b9…`でNOTICEメールpattern検出によりFAIL、Mobile `45172067487`は後続run API照会でSUCCESS。旧HEAD `24944a73…`のSUCCESSは流用しない。
- [x] 11. React Navigation PNG5件を固定version/source/LICENSEと照合し、個別blob SHA-1を比較する。
- [x] 12. Build生成NOTICEの固定リンク・version guard・Web依存NOTICE出力契約を追加し、contract testとlearner NOTICEを更新する。新contractは7/7 PASS。
- [x] 13. 統合Plan、継続手順、既存distribution auditへ現行1.4判断と残る不足を記録する。
- [x] 14. lockfile固定の隔離install、Web export/source map解析、旧HEAD Web Artifact取得・ZIP検査を実施。依存閉包は61 package/version、2,326 source entries。Artifactはchecksum一致・320 entries・source mapなし。
- [x] 15. focused contract後にformat/markdown/text/security/build/verify、差分確認、Run sanitizer/strict collectorを実行する。focused 10/10、修正後`pnpm run verify`（125 contract files、1,456 pass／7 skip、全Build含む）PASS。Run sanitizerは5 filesを走査し5 replacements/0 residual、strict collector exit 0。
- [x] 16. NOTICE generator/test/doc差分を独立レビュアーが確認した。旧P1/P3（OFL表示、empty JS、inventory重複）は解消。新P2 dangling symlink出力指摘もlstat guardと2負例で修正し、reviewerは再確認後P0–P2なしと報告。
- [x] 17. 最終差分・Run Artifactを検証し、既存`24944a73…`を維持した追加ローカルcommitを作成する。元checkoutの`.git`はread-onlyのため変更せず、`<TEMP_ROOT>`の専用cloneで実施した。commit `dc9408b90f8009cb8d87de2e774306e4ca392682`。
- [ ] 18. 最新PR stateとremote headを再照合後、許可されたPR branchへ通常pushする。commit `dc9408b9…`は通常push済み。NOTICE repair/evidence commit `0324dbd2…`はlocalで、PR APIの直前確認後に同branchへ通常pushする。
- [ ] 19. local/remote/PRの同一SHAでWeb CI、Mobile CI、必須Artifact/jobを確認する。`dc9408b9…`のWeb run `45172067403`はFAIL、Mobile run `45172067487`は後続API照会でSUCCESS。修正commit `0324dbd2…`のpush後、最終headのCIを確認し、waiterは新headに対し1回使用する。
- [ ] 20. PR本文に最終SHA・CI・1.4・8.4結果を追記し、未受入条件を維持する。PR OPEN状態と既存受入履歴を保持する。

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

- Current license blocker: `standard-navigation@0.0.5` MIT metadata is present, but the bundled 186-byte source has no copyright notice and the fixed upstream tree contains no LICENSE. This is a specific attribution gap; no infringement finding is made. Obtain a first-party applicable notice or an approved product change that excludes the module before external distribution.
- Current pending work: push local NOTICE repair/evidence commit `0324dbd2…` after checking PR remote ancestry, verify the new-head Web/Mobile workflows and Web production Artifact, and update the PR body. The original checkout remains unchanged; the writable clone is in `<REPO_ROOT>`.
