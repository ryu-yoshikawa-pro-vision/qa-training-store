# Tasks

## Now

- [x] 1. PR #224のhead、branch、7 workflow、120外部Action参照、11 SHA、3 local workflow参照、Dependabot設定、security contractを再確認する。
- [ ] 2. 公式GitHub CLIで同一release tag対応を確認し、全workflowのactions.lockを生成する。
- [ ] 3. 公式gh-actions-lock --verifyをCIへ追加し、read-onlyで欠落・不整合を検出する。
- [ ] 4. SHA直固定契約をlockfile/tag整合性契約へ更新し、Cloudflare、Preview、credentialなどのsecurity条件を維持する。
- [ ] 5. CONTRIBUTINGとPROJECT_CONTEXTを更新し、旧PROJECT_CONTEXTをhistoryへ保存する。手動CLI同期手順と必要権限を明記する。
- [ ] 6. focused tests、Repository verify、format/lint、CLI verify、diff review、Run sanitizerを実行する。
- [ ] 7. 対象ファイルだけcommitし、既存PR branchへfast-forward pushする。
- [ ] 8. 最新headのWeb CI/Mobile App CIを確認し、結果と残余riskをPR本文へ記録する。

## Discovered

- scripts/new-run.shはCRLFで実行できず、PowerShellも利用不可。source scriptを変更せず、一時LF copyでRunを初期化した。
- ローカルgh-actions-lockは未導入で、shellからGitHubへDNS解決できない。公式CLIはPR runnerで実行する。
- 最初の一時CLI出力はpnpm v4.4.0をv5.0.0へ上げていたため破棄した。新しいbootstrap jobはSHA固定のまま実行し、runnerの使い捨てworktreeだけで121参照を既存version tagへ変換する。
- 3件のjobs.<id>.usesは同一repository内のreusable workflow呼出しで、外部action参照ではない。呼出し自体は変えず、各workflow内の外部Actionをlockする。
- workflow refsは7ファイルすべてYAML parse成功。現在の作業treeでは121 remote uses（既存120＋一時bootstrap checkout 1）、3 local calls。bootstrap変換scriptを一時copy上で実行し、121件をversion tagへ変換後に再parseできた。
- PrettierはworkflowとPlan/Runを通過。Run sanitizerは3ファイル、残存検出0。
- pnpm run lint:markdownは9,381ファイルを走査し、5,357個のnode_modules外へ解決されるpnpm virtual-store symlink先の依存ファイルで148,689件を検出した。Windows virtual-store symlinkがnode_modules ignoreを迂回した環境起因。新Plan単体のmarkdownlintは0 issue。tracked Markdown全体をsymlink storeを除いて再確認する。
- wait_for_required_ciは有効tool一覧にない。Repository harnessにより、最終headのCI pollingへ代替してはならない。

## Blocked

- 現時点で実装を妨げる承認待ちはない。最終CI waiterが最後まで利用不可の場合は、最新head CI確認のみ未達として報告する。
