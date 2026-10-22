# タスク

## Now
- [x] 1. PR #199のHEAD/base/変更ファイル、作業ツリー、既存実装と全体Plan・決定事項・詳細Planを確認する。
- [x] 2. 固定Skill revisionの契約/fixture testを確認し、既存Docs経路に新課程の最小静的Web/Quiz技術経路を実装・検証する。
- [x] 3. M02/M03/M05/M06の代表教材・22問・公開Level 2基準・Quiz UI/validator/専用Playwright境界を実装し、自動検証する。
- [ ] 4. M02→M03のCart実runtimeとM05→M06実技・開始/終了契約を受入検証する。未実施なら依存する次工程をBLOCKEDにする。
- [ ] 5. 代表教材の人による内容レビュー・初心者自習試行・独立評価者の採点再現性を確認する。
- [ ] 6. 代表受入後、残り8モジュールを含む全11モジュール、22状態、完全な知識グラフ、同期/ロードを実装する。
- [ ] 7. 新課程テストと旧課程非回帰を確認し、build/lint/typecheck/test/verifyの未解消失敗を原因修復して再検証する。
- [x] 8. Run成果物をsanitizeし、差分・対象ファイル・ローカル事前commit状態を確定する。

## Discovered
- 外部Templateの実名/管理権限、非公開評価保存先/評価者、2コアCodespaces実測、人間による初心者試行は未指定・未実施。無料モデルの利用可否は再検証しない。
- 開始時のローカルgit fetchは.git/FETCH_HEAD書込禁止で失敗した。push前確認時には許可されたgit fetch originが成功し、GitHub PR API、HEAD、origin PR branchが`288c0acb673317aee1b2b5e14f3b3ea8264528c2`、origin/mainが`d16e3bdd277a82576336689c4038b9d9cc423414`で一致した。
- 固定Skill revisionのfixture/helper検証と、代表教材のMarkdown、4クイズ22問、Level 2公開基準、静的Web、クイズvalidator、新課程Playwright境界を実装・検証した。人による受入前のため、実runtime受入、graphの教材/評価関係と全22状態は未完了。
- `pnpm run verify`はcomponentを並列実行した際に旧テスト5件が既定5秒timeoutで失敗したが、同じ11ファイルをserialで実行すると102/102件通過した。既定timeoutや製品・旧テストは変更していない。
- `pnpm run test:component:native`は旧Nativeテスト1件が15秒timeoutしたが、該当テストの`--runInBand`再実行は通過。全体は63/64件。
- `pnpm run test:contracts`は49ファイル中44成功、777件中742成功・33失敗・2 skip。失敗はWindows `pwsh.exe EACCES`、`.codex/logs`作成不可、MCP `Connection closed`、一時ディレクトリACL、WSL bash未起動時stdout欠落などの実行境界。
- 知識グラフCLIは正本の51件に加えて、学習Map後半の要約表が再掲する4 IDを重複と誤認していた。正本の4列定義行だけを読むようスコープ内修正し、validate 51 objectives / 58 knowledgeでPASS。

## Blocked
- M02→M03のScenario Shop実データによる固定Skill runtime通し受入：ローカルOpenCode CLIがなく、実在するAuthority/Product Risk/Scope Entity参照も確定できない。確認済みSkill revisionのfixtureテストは代替受入ではない。
- 代表教材の人による内容レビュー、初心者自習試行、独立評価者による採点再現性確認：実施者が未指定。
- 上記代表受入前の残り8モジュール展開、全11モジュール・22状態、完全な知識グラフ関係、実技開始入力。
- 外部Template宛先・管理権限、非公開評価資料の保存先・権限・評価担当者、実際の2コアCodespaces runtime、管理者同期/学習者ロードは未指定または未検証。外部repoは作成していない。
- 全体`verify`およびcontract/native全suiteの成功は未確認。Windows Harness/Hook/MCP subprocessおよびsandbox `.codex`書込の明確な失敗が残る。
