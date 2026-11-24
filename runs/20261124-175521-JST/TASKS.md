# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Planを保存し、main基点の専用branchを確認する。
- [x] 2. G10、sandbox、Codex/OpenCode実行環境、Issue/PR、既存文書・テストを調査する。
- [x] 3. 変更前diagnostics / hook-test結果とdecision matrix結果を記録する（baseline Hook suiteは依存binding不足で起動不能だった事実を記録）。
- [x] 4. 実装・変更する。
- [x] 5. G10 reason、read-only診断、recovery docs、隔離CLI fixtureとOpenCode契約を検証する。
- [x] 6. ローカル品質/securityゲートと独立security reviewを完了する。
- [x] 7. 変更範囲・PR #199/#229非変更・Run Artifactを確認し、sanitizer/security scanを通す。
- [ ] 8. 対象を明示して通常Git CLI commit/pushを行い、PR #192関連PRを作成する。
- [ ] 9. 最新PR HEADの全必須CIを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- 現行Issue #192の本文にある`payload.cwd`の信頼に関する説明は古い。現在のHookと契約テストはこれを信頼しない。
- 通常Git CLIの`.git`書込みはHook G10と独立してsandboxで拒否され得る。現在のmanaged実行経路では`.git`が読み取り専用で、正規Git操作を実環境で完了できる証拠はまだない。
- `pnpm install --frozen-lockfile`の既定storeはworkspace外でEROFS。`<TEMP_ROOT>` storeを明示した一度の再試行は`registry.npmjs.org`の`EAI_AGAIN`で失敗し、追加再試行しない。
- Windows上の`realpathSync.native()`とGitの`rev-parse --show-toplevel`は区切り文字表記が異なる場合がある。比較・診断ではWindows path normalizationを適用し、G10拒否結果は変えない。
- PR #230初回Web CIの失敗は、承認設定の旧固定値とWindows path区切り文字の誤分類。修正後重点契約は170/170 PASS、修正後GitHub CIは未確認。

## Blocked（ブロック中）

- ブロック時のみ記載する。
- ユーザーは`approval_policy = "never"`を`on-request`へ変更することを明示承認した。該当1項目のみ変更し、sandbox、network、`writable_roots`、Hookは維持した。承認要求経路は`.git`書込みを許可する保証ではない。
- 初回レビュー時のcommand-substitution / nested-command parserに対する指摘は、wrapper経由のGit実行を見逃さないため既存Hook parserを閉じる限定修正と判定した。独立レビューで修正後差分に具体的blockerなし、decision matrixと回帰テストを確認済み。
- 通常のworkspace-write経路では`.git`がread-onlyとなる観測がある。承認付き通常Git CLI経路でadd/commit/pushを検証するまで、Git操作復旧を完了扱いにしない。
