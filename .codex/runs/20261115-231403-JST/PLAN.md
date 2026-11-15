# Plan（計画）

## Objective（目的）

- `qa-training-store`のruntime `shell-quote` Critical alert #70を修正版`1.11.0`へ更新する。

## Scope（対象範囲）

- In: `package.json`のpnpm override、`pnpm-lock.yaml`、本Run Artifact。
- Out: workflow、Expo schedule、GitHub security settings、PR #222〜#224の変更、merge/close、Cloudflare Preview / production deployment。

## Assumptions（仮定）

- package managerは`pnpm@10.34.5`。
- root `pnpm.overrides`で推移依存を`1.11.0`へ固定する。
- GitHub alertのfirst patched version `1.11.0`を最小目標にする。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 依存の変更範囲やpatched versionはGitHub alertと現行lockfileで確認済み。
- 仮定してよい細部: pnpm global overrideを使い、アプリコードには触れない。
- 未回答の重要質問: PR作成でCloudflare Pages Previewのdeployとsmoke checkが走るため、外部副作用について明示承認が必要。

## Hypotheses（仮説）

- H1: mainのruntime依存経路に`shell-quote@1.10.0`があり、alert #70に対応する。
- H2: root overrideで`1.11.0`へ更新すれば、pnpm lockfileを再現可能に保ち脆弱版を除去できる。

## Research Plan（調査計画）

- Round 1: alert情報、main HEAD/lockfile、既存PRとCI、repoの作業・branch安全規約、Previewの条件を確認する。
- Round 2: lockfile更新、依存経路、production audit、unit test、diffを確認する。
- Exit Criteria: lockfileに`1.10.0`が残らず、`1.11.0`のfrozen installが通る。PR/CIは承認がある場合だけ行う。

## Approach（進め方）

- feature branchにroot overrideとpnpm lockfileだけを変更する。
- pnpm 10.34.5でlockfile更新とfrozen installを実行し、依存経路・audit・unit testを確認する。
- diffとRun Artifactをsanitizerで検査し、commit/pushする。
- Cloudflare Previewを起動するPR作成は、明示承認まで保留する。

## Definition of Done（完了条件）

- lockfile内のすべての`shell-quote`参照が`1.11.0`へ更新され、frozen installが成功する。
- `pnpm why`でruntime経路の解決を確認し、auditに当該packageのfindingがない。
- unit testと変更ファイルの品質検査が成功する。
- branchにcommit/pushする。
- PRとCIの完了は、Preview副作用の承認とCI待機手段が得られた場合に限る。Hosted CIは最新PR headで`Web CI`と`Mobile App CI`両方success後のみ完了とする。

## Risks / Unknowns（リスク・未知点）

- Global overrideが別の推移依存経路へ影響する可能性がある。lockfileとfrozen install、unit testで確認する。
- GitHub alertはmainへの反映までOpenのまま。PR作成にはCloudflare Previewが伴う。
- repo規約が要求する`wait_for_required_ci` toolが現在の環境にない。直接Actionsをpollしない。

## Thinking Log（判断記録）

- 2026-11-15: main lockfileで`react-native@0.86.3 -> react-devtools-core@6.1.5 -> shell-quote@1.10.0`を確認。Alert #70はCritical/runtime、first patched `1.11.0`。
- 2026-11-15: 既存PR #222〜#224のdiffはこのpackageを変更しない。#222の日次Expo互換更新は承認済み例外として維持する。
- 2026-11-15: 同一repoの人間作成PRは検証成功時にCloudflare Previewへdeployされる。Draftでもこのjobは抑止されないため、PRは承認待ちとする。
