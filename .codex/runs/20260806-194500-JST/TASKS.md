# タスク

## 今回のタスク

- [x] 1. PLANを確定し、PR #9のallowed filesと対象外を宣言する
- [x] 2. Baseline、全Review thread、最新Actions log、現行コードを確認する
- [x] 3. read-only subagent調査を回収し、findingsをtriageする
- [x] 4. Context（USERPROFILE/HOME、Temp、MAESTRO_HOME）とPath境界付き置換を修正する
- [x] 5. Atomic Write fallbackをBackup経由へ修正し、元ファイル保持契約を追加する
- [x] 6. CLIのinvalid UTF-8継続、Finding content再サニタイズ、Check統計を修正する
- [x] 7. `codex-task.ps1`の二重実行防止、timeout、不足Tool警告、終了コード／例外保持を修正する
- [x] 8. Fixture／Contractへ環境、境界、JSON／JSONL、Encoding、ChangedOnly、Error preservationを追加する
- [x] 9. CIのChangedOnly対象をPR Base差分＋tracked/staged/untrackedへ修正し、Ubuntu pwsh契約を確認する
- [x] 10. PR #9対象RunのSubagent／Validation整合性、日本語、Markdownを修正する
- [x] 11. Native成果物規約をPRから外さず、共有用／機械証跡の保存先と関連文書の整合性を確認する
- [x] 12. PowerShell 5.1／7、Contract、Format、Lint、Typecheck、Verify、diff checkを実行する
- [x] 13. Current Runと変更対象ArtifactへWrite＋Check、2回目冪等性、evaluation更新を実施する
- [x] 14. Repair Loopのiteration、Review comments判定、Remote CI NOT RUN、残余リスクを記録する

## 発見事項

- [x] D1. PR #9の全未解決Review thread 24件をValid／Deferred／Out of scope／Rejectedとして最終表へ整理する
- [x] D2. `gh` CLI未導入のためGitHub connectorでActions logを取得した事実を記録する
- [x] D3. Native成果物規約を維持する訂正を反映し、関連文書・履歴・Run Artifactの内容を実変更と照合する
- [x] D4. 実機のDoctor／Build／Install／Smoke／Maestroを実行し、Runtime Suiteの失敗証跡を保存してBoundary Suiteを停止する
- [x] D5. Android Buildのstale Autolinking／CMake復旧手順をRunbook、Troubleshooting、Context、履歴へ追記する
- [x] D6. `native-product-card-product-basic-shirt`未検出をローカル実機でIME条件別に調査し、LatinIMEで公式Test／Runtime Suiteを再検証する
- [x] D7. Native主要FlowをProduct Deep Linkへ切り替え、検索入力専用FlowとCI実行を追加する
- [x] D8. Native入力経路分離のRunbook／Troubleshooting／Context／ADR／履歴を整合させる
- [x] D9. Flow契約、format、lint、typecheck、実機Runtime／Boundary／検索専用Flowを検証し、既存typecheck失敗を記録する

## ブロック

- Native CIの再実行とPhase 1／Native CI両方のsuccess確認（Push／Workflow手動再実行禁止のため未実行）
- 検索専用Flowは標準日本語IME条件では入力互換性未達のため成功扱いにしない。LatinIME条件では1/1 PASSし、元のIMEと有効IME一覧を復元した。
- 全体typecheckは今回変更外の既存6箇所のimplicit-anyでFAIL。Remote CIの更新後successもPush／Workflow再実行禁止のため未確認。

- Progress: 100% (23/23)
