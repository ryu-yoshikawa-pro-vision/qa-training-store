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
- **初回CI結果**：修正後HEAD `9a5f2edca6ea5c0c675b25daae5834f5674d3209`の[Web CI #42165721629](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42165721629)でStyle Qualityが7ファイルのPrettier不一致、Code Qualityが`Buffer`未importで失敗。診断HEAD `8f676fa8d93a2309d3e5436ef9150a74b57dd672`の[CI #42166091628](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42166091628)では契約テスト1,109 PASS・2 FAIL（SHA不一致時の拒否優先順位と抜粋range検証の正規表現）・1 expected fail・15 skip。Prettierの実整形結果を抽出し、原因を補正。**まだ修正後最終HEADの全PASSではない。**
- **残る未実行**：固定OpenCode 2.0.22の許可/拒否実動作、セッション保存・削除、本人認証済みモデル、正式評価の実校正。local checkoutにpnpm/Vitest/固定CLIがない。GitHub CI上の`typecheck`・`validate`・`build:web`・契約/負例テストは最終HEADで再検証する。
- **push後の公開条件**：今回のユーザー指示に基づき、PR #199の既存ブランチへ通常push済み。現行`.github/workflows/ci.yml`はPRのverify成功後、Cloudflare Pagesの`ec-test-automation-store` Previewへデプロイする。前回のCI #42155742062で`deploy-preview`成功。Cloudflare Access等の非公開保証は引き続き未確認。共有workflowの無断変更は行っていない。
- 次の対応：今回の検出不備（formatter、テスト、公開教材の例示PII/`.env`誤拒否）を補正し、#199最新HEADと競合を再照合して通常push。Node24・pnpm10.34.5の最終HEADでStyle/Code Quality、契約/負例、typecheck、`validate`、build、Web CI `verify`を確認する。Cloudflare Previewへのアクセス制限、固定OpenCode 2.0.22の許可・拒否、セッション混入、保存先/権限を本人環境で検証する。失敗や未実行はチェックを付けない。
