# `qa-training-store` Critical `shell-quote`修正計画

## 0. 依頼概要

- 依頼内容: Dependabot Critical alert #70のruntime依存`npm/shell-quote`を修正版へ上げ、security-onlyの範囲で検証する。
- 背景: 2026-11-15のGitHub APIでOpen Critical #70が確認された。現行`main`の`pnpm-lock.yaml`は`react-devtools-core@6.1.5`経由で`shell-quote@1.10.0`を固定し、alertのfirst patched versionは`1.11.0`。
- 期待成果: pnpm管理方式を保って`1.11.0`へ更新したPR候補branch、検証結果、未完了のPR/CI承認事項。

## 1. ゴール / 完了条件

- ゴール: `shell-quote`の実行時依存を修正版`1.11.0`以上にする。
- 完了条件（DoD）: lockfileに修正版だけが解決されること、pinned pnpmでfrozen installとread-only auditを検証すること、変更がsecurity修正とRun Artifactに限定されること。commit/push後、PRとCIは外部Preview副作用の承認後にのみ実施する。

## 2. 現状理解と前提

- 現状理解: default branch `main` HEAD `2a8bcf57ff091e84a8b3bf7b123568e967000d88`; `packageManager`は`pnpm@10.34.5`。直接依存`react-native@0.86.3`のlock graphに`react-devtools-core@6.1.5`があり、そこから`shell-quote@1.10.0`を解決する。Open alert #70はCritical/runtime、GHSA-pqg4-j6r4-53mv / CVE-2026-102422、patched `1.11.0`。
- 前提: pnpmのroot overrideで推移依存のみを1.11.0に固定し、Expo SDKの承認済み日次互換更新とは分離する。
- 対象外: 通常Dependabot version updates、Expo workflow、GitHub security settings、workflow変更、merge/close、PR作成によるCloudflare Preview deploy。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象alert、patched version、package managerがGitHub情報とdefault branchから確認済み。
- 仮定してよい細部: pnpm `overrides`で`shell-quote`を全推移経路に固定する。
- 未回答の重要質問: CI用PRを作ると同一repoの人間作成PRでCloudflare Previewをdeployする。CI/Previewの副作用を承認されるまではPRを作らない。

## 4. 影響範囲

- 影響範囲: root `package.json`のpnpm override、`pnpm-lock.yaml`、対応するplan/Run Artifact。
- 確認対象ファイル: `AGENTS.md`、`README.md`、`package.json`、`pnpm-lock.yaml`、`.github/workflows/ci.yml`（triggerとPreview副作用のみ）。

## 5. 変更方針

- 変更方針: `pnpm.overrides.shell-quote = 1.11.0`を追加し、pnpm 10.34.5でlockfileを再生成する。app source、workflow、Expo依存は変更しない。
- 実行タスク:
  - [x] 1. GitHub alert、現HEAD、open PR #222–#224、CI trigger、repo規約を確認する。
  - [x] 2. isolated branchとstandard Runを初期化し、調査/計画を記録する。
  - [ ] 3. root overrideとlockfileを最小変更する。
  - [ ] 4. frozen install、依存経路、security audit、適切なunit validationを確認する。
  - [ ] 5. diff/Run Artifactを検査しcommitしてbranchへpushする。
  - [ ] 6. Cloudflare Previewを伴うPR/CIの明示承認後、PR作成とexact-head CIを完了する。

## 6. 検証方法

- 検証計画: packageManager指定のpnpm 10.34.5で`install --lockfile-only`と`install --frozen-lockfile --ignore-scripts`、`pnpm why shell-quote`、production auditを行う。安全な範囲で`test:unit`を実行。PR CIは承認後のみ。
- 成功判定: lockfileのpackage/snapshotが1.11.0へ揃い、1.10.0の依存経路が残らない。Auditで当該GHSAが再報告されない。frozen install/testが成功する。

## 7. リスクと未解決論点

- リスク: global overrideは全依存経路へ影響する。解決: 現在の唯一のlockfile参照を確認し、frozen install/unit validationで互換性を見る。
- 未解決の質問: PR作成でCloudflare Previewがデプロイされるため、そのCI副作用の許可待ち。GitHub server-side security updatesは別設定であり変更しない。

## 8. 成果物

- 変更ファイル: `package.json`、`pnpm-lock.yaml`、`docs/plans/...`、`.codex/runs/20261115-231403-JST/{PLAN,TASKS,REPORT}.md`。
- 付随ドキュメント: workspace remediation tasklist/progress/active-status/approval records。

## 9. 備考

- 既存のopen PRは#222 (Expo compatibility)、#223 (security fallback pagination)、#224 (Actions-only config)。いずれもshell-quoteを更新しない。#224はDraftのまま維持。
