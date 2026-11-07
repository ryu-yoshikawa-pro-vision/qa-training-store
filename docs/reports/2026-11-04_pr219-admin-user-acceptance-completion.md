# PR #219 管理ユーザー受入検証の完了証拠（タスク5・6）

## 実行結果

- **固定テスト/SUT HEAD:** `e5fc6a5abdd792eb3b51a6b5b9c1c1afd646811e`。PR #199 base `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`はこの検証と同一の製品コードで、PR #219は製品実装を変えていない。別PR #210の未マージ変更は含まない。
- **Integration:** [Web CI #41802885428のjob 126483407429](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428/job/126483407429)はsuccess。テスト全体139件、`tests/integration/pr219-admin-user-acceptance.test.ts` **8件**、`tests/integration/pr219-isolated-fixtures.test.ts` **6件**、`tests/integration/pr219-actor-revocation.test.ts` **2件**を実行。VitestのテストsuccessとSUTの業務適合判定は別。
- **Web:** [同RunのChromium E2E (cross-role) job 126483819945](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428/job/126483819945)はsuccess。管理ユーザーの検索・Role・Rank・停止・自己変更不可・退会済み読取専用の専用Web Caseを個別成功と確認。現Runは後続pushでworkflow全体がcancelledになったため、workflow全体のsuccessではない。
- **状態再現:** `default`/ `checkout-resume`の既存Seed、Webの`scenario()` Reset、隔離Dexie DB、`TestClock("2026-07-15T03:00:00.000Z")`、active adminと2人目のactive adminの独立Session。既存Seed/Reset、正式仕様、製品SUTを変更していない。

## タスク5：検索・Role/Rank/Status・拒否・競合・rollback

| 対象Case | 検証内容 | 根拠・結果 |
| --- | --- | --- |
| `SCREEN-ADMIN-USERS-A01-02` | Web keyword＋Role＋Status検索、IntegrationでRankを含むAND検索 | Web `pr219-cross-role-lifecycle.spec.ts`、Integration `pr219-admin-user-acceptance.test.ts`。該当assertion PASS |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | Role変更→旧Session失効、2→1降格、stale Role version拒否 | 同WebとIntegration。該当assertion PASS、User/Session不変も確認 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | Web Rank変更後の再読込、stale Rank拒否、Checkout放棄、障害注入rollback | Web・Integration・`pr219-isolated-fixtures.test.ts`で確認。該当assertion PASS |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | 停止確認、ログイン拒否、対象Session失効、Checkout放棄とCart保持、障害注入rollback | Web・Integrationで確認。該当assertion PASS |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己Role変更・自己停止拒否、User/Session不変。Web変更ボタンdisabled | Web・Integrationで確認。該当assertion PASS |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済みUserのRank/Status更新拒否、User/Checkout不変。Web読取専用UI | Web・Integrationで確認。該当assertion PASS |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 2→1正常系、stale CAS、actor失効競合 | 2→1とCASはIntegration PASS。**actor失効競合では製品不具合を再現**し、業務受入FAIL |

タスク5は**必要な独立Caseの実装・実行と結果分類を完了**したとしてチェックする。A02-03の不具合を製品PASSに変換していない。画面幅やAndroid等の他タスクの未受入条件は引き続き残る。

## タスク6：最後の管理者・並行競合の区別

- `pr219-admin-user-acceptance.test.ts`でactive adminを2名配置し、**2→1 Role降格**と**2→1 停止**を成功として確認。actor本人の降格・停止は`SELF_CHANGE_FORBIDDEN`で拒否され、User/Sessionが不変。
- 2人のactive adminが互いを`Promise.allSettled`で同時停止するCaseは**1件成功・1件拒否・有効管理者が1名残る**ことを確認。`LAST_ADMIN_PROTECTED`を「通常成立しない別actorから最後の1人を拒否」する架空の成功Caseとして扱っていない。
- `pr219-actor-revocation.test.ts`の2件は、`requireAdmin`からtransaction確定までの間にactor Session/Roleを失効させると**別Userの更新が実行できる製品FAIL**を直接assertした再現テスト。これらのテスト実行成功は製品適合PASSではない。製品修正は[PR #210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210)へ引継ぎ、#199のSUTは不変更。
- 本タスク6の**区別・実行・証拠化**は完了。ただし製品不具合の修正・#210修正HEADでの再受入は未完了。他タスクと結び付けて虚偽の完全受入をしない。

## 継続する未受入条件

- Webの全画面幅/a11y・各操作の動画/成功時Trace、全採用CaseのDB保存ファイル、Android SQLiteの実Runは未実施。
- `SCREEN-BOUNDARY-FORBIDDEN-A01-01`の停止staff戻りリンク、管理商品選択残留・SKU検索・inactive SKU価格、Checkout staleの戻り導線は別の既知不具合/未受入。
- PR #219はDraftのまま。#210修正後の製品合格や全208動作の受入を主張しない。
