# PR #217：#199正式AI評価契約との照合（2026-11-06）

## 固定した参照

- #199 `157d88ef78d4e96fd8229a6a852b3f24c540a8e0`
- #217 `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`
- #214 `0486b613a4dc03ab9e97bee78669fd0777164980`
- #215 `3f469d9c6ae42b5396667041e5aeaca22bb7aef5`

## 変更内容

- 公開`M05.json`の`required_runs`を#199の3件と同じにした。#217固有のP05採点観点と他の公開契約は維持する。
- `verifyModuleRunEvidence`のM05専用P05 Run注入を削除し、公開`required_runs`をそのまま検証する。spec/label重複拒否、SHA/Trace/receipt/report、M06 Case ID、M07 before/afterの既存検証を保持する。
- 公開3 Run正常・1件欠落・P05だけ・重複・spec/label違い・旧SHA・report改変の回帰テストを追加する。
- M00 `M00-CR-03`の採点条件は#199と一致するため変更しない。本人の実AI回答確認と架空誤回答独立訂正の区別に対する静的契約テストを追加する。
- M07参考specは別ページ`/products/product-mug`へ移動して`/cart`へ戻り、数量2を再Assertionする。M06/M07 Run定義の変更なし。

## 検証状況

- GitHub上の既存#217 CI: [Web CI #42025835711](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42025835711)（旧HEAD、completed/success）
- GitHub上の#199 CI: [Web CI #42171848698](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42171848698)（#199確認時HEAD、completed/success）
- 上記は今回の変更や統合後HEADを検証したものではない。追加契約テストの実行結果は最新Web CIの`Vitest (contracts)`完了ログで別途確認する。
- 本作業環境ではGitHubへの直接Git通信のDNS解決ができず`pnpm`も未導入のため、ローカル`package.json`コマンドは未実行。GitHub Actionsの実結果は各RunのHEADと個別ジョブで確認する。
- `work/pr199-formal-assessment`へ通常fast-forward反映済み（#217 HEAD `4f6b3e7a9232461f845b6ee46cdce2f7b29564fd`で一度確認）。[Web CI #42184640424](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42184640424)では`build-production`・Code Quality成功、Style Qualityは当レポートのMarkdown裸URL2件によって失敗。この修正後の新HEADでStyle/契約/`validate`等とcheckout SHAを改めて確認する。

## Cloudflare Previewと未完了条件

- 現行`.github/workflows/ci.yml`の`deploy-preview`は同一repoのPRで`verify`と`build-automation`成功時に`wrangler pages deploy dist --project-name=ec-test-automation-store`を実行する。既存の公開CI動作であり、今回の方針確認により許容する。
- #217の旧Web CIにはCloudflare Previewのデプロイ成功ログがあり、プレビューURLも発行されている。Cloudflare PagesのPreview URLは既定で公開。Accessポリシーの設定を確認できず、現HEADの変更をpushすると無断公開の危険がある。
- リポジトリはGitHub上でpublicと確認。ユーザーの今回の方針明確化により、既存Web CIのCloudflare Pages Preview自動デプロイを通常のPR検証経路として許容する。Cloudflare Accessによる匿名アクセス拒否は必須条件としない。個人成績・Secret・正式評価内部資料を配布しないことは従来どおり必要であり、共有workflowは改変しない。
- #217の未完了2件（独立Runの実行出自保証、および本人M04/M07/M10・実モデル校正の最終受入）は#199に移管済みで、チェックしない。
- #217の既存PRブランチへの通常fast-forward更新後、#199統合状態での契約テスト・Style/Code Quality・`validate`・production build・Web CI・checkout SHA照合が必要。
