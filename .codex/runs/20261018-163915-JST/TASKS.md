# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PRのhead/base/diff/CIと関連コード・既存契約テストのbaselineを確定し記録する。
- [x] 2. Navigation、Feature章、BR/AC、Visual Contract、spec_refs解析と負例を実装する。
- [x] 3. 6契約テストと教材17本の共通表・学習契約を修正する。
- [x] 4. 108 Markdown、QA_AGENT.md、アンカー、文書内容とMarkdown構造をPlanどおり修正する。
- [x] 5. 108文書をbaseとの差分で意味照合し、相対参照・アンカーを確認する。
- [ ] 6. 必須検証10コマンドと個別負例・回帰を実施し、失敗を調査・修正する。
- [ ] 7. Run ArtifactとPR本文を最終結果に同期し、PR branchへcommit・通常pushする。
- [ ] 8. 最終HEADのWeb/Mobile CIと必要Jobを確認し、未実行・skip・残課題を報告する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- Full `test:contracts` は今回の差分に含まれないCodex Hook / CI harness関連6ファイルで失敗する。関連変更6ファイルの契約テスト100件は個別実行で成功し、Hook suiteのbounded retryも実施済み。

## Blocked（ブロック中）

- ブロック時のみ記載する。
- Full `test:contracts` のローカル失敗は、Hookログ未生成・launcher timeout・MCP `connection closed`・一時ディレクトリ teardown `EBUSY` が主因。今回変更と直接関係する失敗は確認できず、関連Hookの追加retry上限にも達したため、安全な範囲内での追加修復は停止。最終HEADのGitHub CIで環境差を確認する。
