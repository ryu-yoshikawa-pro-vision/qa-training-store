# タスク

## Now
- [x] 1. PR #199のHEAD/base/変更ファイル、作業ツリー、既存実装と全体Plan・決定事項・詳細Planを確認する。
- [x] 2. 固定Skill revisionの契約/fixture testを確認し、既存Docs経路に新課程の最小静的Web/Quiz技術経路を実装・検証する。
- [x] 3. M02/M03/M05/M06の代表教材・22問・公開Level 2基準・Quiz UI/validator/専用Playwright境界を実装し、自動検証する。
- [ ] 4. M02→M03のCart実runtimeとM05→M06実技・開始/終了契約を開発時に受入検証する。自動/契約検証や成果物が未達なら実装未完了として扱う。
- [ ] 5. 代表教材を正式仕様と照合し、コード/教材レビューと自動/静的/契約検証を行って結果を反映する。
- [ ] 6. 代表教材の開発受入後、実地試行を待たずに残り8モジュールを含む全11モジュール、22状態、完全な知識グラフ、同期/ロードを実装する。
- [ ] 7. 新課程テストと旧課程非回帰を確認し、build/lint/typecheck/test/verifyの未解消失敗を原因修復して再検証する。
- [x] 8. 現在のRun成果物をsanitizeし、差分・対象ファイル・ローカル事前commit状態を確定する。
- [x] 9. 全体Plan・関連詳細Plan・決定事項・インデックスを更新し、代表開発ゲート/実装完了/実地検証/運用開始判断を整合して文書検証する。
- [ ] 10. Plan差分をcommitし通常push、PR #199本文を更新する。

## Discovered
- 外部Templateの実名/管理権限、非公開評価保存先/評価者、2コアCodespaces実測、人間による初心者試行は未指定/未実施。これらは全量実装後の実地検証・運用開始判断で扱い、実装工程のBLOCKED理由にしない。無料モデルの利用可否は再検証しない。
- 開始時のローカルgit fetchは.git/FETCH_HEAD書込禁止で失敗した。push前確認時には許可されたgit fetch originが成功し、GitHub PR API、HEAD、origin PR branchが`288c0acb673317aee1b2b5e14f3b3ea8264528c2`、origin/mainが`d16e3bdd277a82576336689c4038b9d9cc423414`で一致した。
- 固定Skill revisionのfixture/helper検証と、代表教材のMarkdown、4クイズ22問、Level 2公開基準、静的Web、クイズvalidator、新課程Playwright境界を実装・検証した。M02→M03統合受入、M05→M06実技入力、graphの教材/評価関係と全22状態は開発工程で未完了。
- `pnpm run verify`はcomponentを並列実行した際に旧テスト5件が既定5秒timeoutで失敗したが、同じ11ファイルをserialで実行すると102/102件通過した。既定timeoutや製品・旧テストは変更していない。
- `pnpm run test:component:native`は旧Nativeテスト1件が15秒timeoutしたが、該当テストの`--runInBand`再実行は通過。全体は63/64件。
- `pnpm run test:contracts`は49ファイル中44成功、777件中742成功・33失敗・2 skip。失敗はWindows `pwsh.exe EACCES`、`.codex/logs`作成不可、MCP `Connection closed`、一時ディレクトリACL、WSL bash未起動時stdout欠落などの実行境界。
- 知識グラフCLIは正本の51件に加えて、学習Map後半の要約表が再掲する4 IDを重複と誤認していた。正本の4列定義行だけを読むようスコープ内修正し、validate 51 objectives / 58 knowledgeでPASS。

## Blocked
- M02→M03のScenario Shop実データによる固定Skill runtime通し受入：ローカルOpenCode CLIがなく、実在するAuthority/Product Risk/Scope Entity参照も確定できない。確認済みSkill revisionのfixtureテストは代替受入ではない。
- 全体`verify`およびcontract/native全suiteの成功は未確認。Windows Harness/Hook/MCP subprocessおよびsandbox `.codex`書込の明確な失敗が残る。

## 実装後の実地検証・運用判断（現時点ではBLOCKEDではない）
- 全11モジュール・関連機能の実装完了後に、初心者の自習導線、実受講者/評価者による実技・採点再現性、実際の2コアCodespacesでのBuild/Serve/Skill/Playwright/ロード/保存、時間・容量・費用を確認する。
- Template名/管理権限、非公開評価資料の保存先/権限、評価担当者、各受講者の費用条件は未指定のまま保持する。運用開始前に必要だが、Plan修正/実装を止める理由ではない。
