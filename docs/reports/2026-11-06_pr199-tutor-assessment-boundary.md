# PR #199 通常OpenCodeチューター・M00/M05採点契約の検証記録

## 対象・変更境界

- 比較基準：PR #199ブランチ`docs/plan-ai-agent-qa-curriculum-redesign`のHEAD `74cacbe8d86f4f27e05d931792220406079d1df6`。
- 参照した別PRのHEAD：#214 `65640a02ac8429a812a9e88d5d952fc9fc94752e`、#215 `3f469d9c6ae42b5396667041e5aeaca22bb7aef5`、#217 `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`、#218 `17c0cf734727ad73e224e61752cf3d50423a5092`。別PRのHEADを#199に統合済みと扱わない。
- #199所有のチューター、共有Validator、採点JSON2件、教材演習2件、共有Run許可spec、関連契約テストのみ変更案として準備。#210製品コード・正式仕様・既存Seed/Reset・#217評価器の独立実装・配布validator・Web Build・共有CIは変更していない。

## 原因と修正案

1. `course:tutor`の`opencode mini`はOpenCode側が入力を直接受け、起動前確認だけでは後から貼られたSecret/PIIを遮断できない。各質問の送信前検査と明示`SEND`確認の後だけ、一回の`opencode run --standalone --pure --model --agent --format json --file`を起動する。モデル入力は当該質問・選択モジュールの固定公開教材3件・本人が指定した公開仕様最大1件・検査した学習者ファイルの指定行最大40行・本人が指定した検証済Runの要約最大1件・メモリ内の直近4問答だけ。workspace全体・生のRun・Trace・正式評価履歴は渡さない。
2. 公開ファイルは配布manifestに登録済みのtarget_pathであることとSHA-256が実ファイルに一致することを確認し、パス走査・Symlink・0 byte・バイナリ・非UTF8・未知ファイルを拒否。モデル送信前に既存`assertNoSecretText`を使用し、メールアドレス/電話番号・`.env`表記・秘密鍵を拒否。1質問8KiB、公開/学習者の入力ファイル1件64KiB、学習者の抜粋8KiB、送信payload全量192KiB、共通`assertModelInputSize`4MiBの上限を重ねる。未知の個人データや偽装されたSecretの完全検知は保証しない。
3. `/excerpt`は選択モジュール内の明示パスと行範囲のみ許し、ファイル全体を先に検査した上で指定行だけを抽出する。送信前に再読込して元ファイルSHA・抜粋が変化していないか比較し、差分があればBLOCKEDにする。`/run UUID`は既存のRun receipt・spec snapshot・report・固定`source_sha`・実行状態・改ざんを`readRunRecord`で照合し、test件数/Pass/Fail/Skip・spec SHAだけを要約する。過去Runが現在のspecと異なる場合はその事実を別フィールドで表す。モデルへ生report・Trace・test titleは送らない。ローカルreceiptは独立した第三者証明ではない。
4. `buildTutorConfig`はV2の`agents`/`permissions`・`update: "disable"`・全許可否認・空`mcp/plugins`・明示モデルとagentへ修正。user/global/project configやpluginの混入を防ぐため、作業ディレクトリとHOME/XDG/APPDATAを孤立した一時ディレクトリへ移し、`OPENCODE_DISABLE_PROJECT_CONFIG=true`、`:memory:` DB、`--standalone --pure`で起動。Windows nativeの挙動は未検証なので拒否してWSL2を案内。固定CLIの権限適用と実認証/更新停止の動作は実Run未確認。
5. 通常会話は実行中メモリに最大4往復だけ保持し、正式評価の状態・Level/Phase結果を書込まない。実際のOpenCode Provider側ログ/保存、OS強制終了時の一時ファイル、削除・復元は実確認していない。外部送信した入力はProvider側保持条件にも従うため完全な未保存宣言はしない。
6. M00 P04は#214教材の架空誤回答を本人が独立訂正し、実AI応答と別の証拠を二つの資料の原文で示すよう、#217の`M00-CR-03`必要証拠/合格/拒否条件を#199に選択反映。架空誤回答を実AI応答と誤記した場合も拒否。
7. M05 P05は`product-link.spec.ts` before/afterの2 Runを保持し、`p05-cart-locator.spec.ts` main・1件以上PASSを公開`M05.json`、`validate-ai-assisted-qa.ts`、`ai-assisted-qa-run-evidence.mjs`のspec許可、学習者向けP05コマンドで一致。Run ID・report・SHA・receipt・test結果の既存guardを弱めない。

## #217未統合の契約

- #217 HEAD `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`の`verifyModuleRunEvidence()`には、M05だけ`requiredRuns`配列を追加注入する処理がある。#199の現在の同関数には注入が存在しない。#217を統合する権限はなく、他ブランチも変更していない。統合時には**公開M05.jsonの3件とValidator一致を確認後、#217側の追加注入だけ削除する**ことが必須。
- #217固有のM06 CASE ID、M07 maintenance後のAssertion/Trace照合と正式判定の実装は#199に取り込んでいない。最終評価・独立Run校正を成功と判断してはいけない。

## 検証状況と再開条件

- GitHubで現在の実コード、PR HEAD/差分、package scripts、workflowの`deploy-preview`条件を確認。新しいチューターcore/CLI/テストのJavaScript構文をV8で簡易パースし、M00/M05 JSONをJSON.parseで検証した。追加契約テストには入力の境界・モデル呼出し未実施の拒否・SHA変更・抜粋/Run要約・V2環境分離・採点契約の負例を含むが、テストランナーでの実行はしていない。
- **未実行**：`pnpm run test:contracts`、`pnpm run validate`、`pnpm run typecheck`、`pnpm run format:check:strict`、`pnpm run build:web`、固定OpenCode 2.0.22の許可/拒否実動作、履歴保存・削除、本人認証済みモデル、正式評価の実校正。実行環境に対象checkoutとpnpm/Vitest/固定CLIがない。構文検査をテストPASSと表現しない。
- **公開条件でpush停止**：現行`.github/workflows/ci.yml`はPRのverify成功後、Cloudflare Pagesの`ec-test-automation-store` Previewへ無条件に近い条件で`dist`をデプロイする。前回のPR #199 CI #42155742062でも`deploy-preview`が成功。Cloudflare Accessなど外部認証/非公開が確認できず、今回の無断公開禁止に抵触する可能性があるためPR branch refは更新しない。
- 再開条件：対象Cloudflare Previewが非公開であることを独立に検証するか、共有workflow所有者と承認済みの安全な実行方法を決定する。その後#199最新HEADとの差分を再照合して通常pushし、Node24・pnpm10.34.5で契約/負例/型/Style/validate/build、最終HEADのWeb CI/`verify`/`validate`を実行する。固定OpenCode 2.0.22の許可・拒否、セッション混入、保存先/権限を本人環境で検証する。失敗や未実行はチェックを付けない。
