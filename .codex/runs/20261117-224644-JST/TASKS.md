# Tasks

## Now

- [x] 1. PR #224のhead、branch、7 workflow、120外部Action参照、11 SHA、3 local workflow参照、Dependabot設定、security contractを再確認する。
- [x] 2. 公式GitHub CLIで同一release tag対応を確認し、全workflowのactions.lockを生成する。
- [x] 3. 公式gh-actions-lock --verifyをCIへ追加し、read-onlyで欠落・不整合を検出する。
- [x] 4. SHA直固定契約をlockfile/tag整合性契約へ更新し、Cloudflare、Preview、credentialなどのsecurity条件を維持する。
- [x] 5. CONTRIBUTINGとPROJECT_CONTEXTを更新し、旧PROJECT_CONTEXTをhistoryへ保存する。手動CLI同期手順と必要権限を明記する。
- [x] 6. focused tests、Repository verify、format/lint、CLI verify、diff review、Run sanitizerを実行し、失敗・制約を記録する。
- [ ] 7. 対象ファイルだけcommitし、既存PR branchへfast-forward pushする。
- [ ] 8. 最新headのWeb CI/Mobile App CIを確認し、結果と残余riskをPR本文へ記録する。

## Discovered

- scripts/new-run.shはCRLFで実行できず、PowerShellも利用不可。source scriptを変更せず、一時LF copyでRunを初期化した。
- ローカルgh-actions-lockは未導入で、shellからGitHubへDNS解決できない。公式CLIはPR runnerで実行する。
- 最初の一時CLI出力はpnpm v4.4.0をv5.0.0へ上げていたため破棄した。新しいbootstrap jobはSHA固定のまま実行し、runnerの使い捨てworktreeだけで121参照を既存version tagへ変換する。
- 3件のjobs.<id>.usesは同一repository内のreusable workflow呼出しで、外部action参照ではない。呼出し自体は変えず、各workflow内の外部Actionをlockする。
- workflow refsは7ファイルすべてYAML parse成功。作業treeは121 remote uses（既存120＋Actions lock jobのcheckout 1）、3 local calls。121 remote usesは検証済みversion tagへ移行済み。
- PR runnerの公式`gh-actions-lock` v0.4.1で7 workflow、11 Actionのlockを生成し、同じjobで`gh actions-lock --verify`成功。現行CIにはread-only verify jobを組み込み、`verify`集約へ接続した。
- PrettierはworkflowとPlan/Runを通過。Run sanitizerは3ファイル、残存検出0。
- pnpm run lint:markdownは9,381ファイルを走査し、5,357個のnode_modules外へ解決されるpnpm virtual-store symlink先の依存ファイルで148,689件を検出した。Windows virtual-store symlinkがnode_modules ignoreを迂回した環境起因。新Plan単体のmarkdownlintは0 issue。tracked Markdown全体を明示したmarkdownlint-cli2は476ファイル、0 issue。
- wait_for_required_ciは有効tool一覧にない。Repository harnessにより、最終headのCI pollingへ代替してはならない。

## Blocked

- `bash scripts/verify`は3回目も`FAIL: template contract files`となり、repair-loopの有界停止条件に達した。特定済みの古い文言assertionを2件修正した後の残る不一致はこのRunで追跡・再試行せず、失敗記録を残す。
- `wait_for_required_ci`は有効tool一覧に存在しない。Repository harnessに従いGitHub pollingへ代替せず、最終headのWeb CI/Mobile App CIを未確認として残す。
- Actions lockfileのGitHub Enterprise Cloud対象環境か、Require lockfile policy適用状態、Dependabot Security Updates設定、security-only PRでのlock自動同期は未確認。設定変更や権限追加は行わない。
