# Tasks

## Now

- [x] 1. 必須repo docs、関連ADR、直近Run、Issue参照、baseline状態を確認し、調査PLANを確定する
- [x] 2. `package.json` / `pnpm-lock.yaml` / `pnpm why` / `pnpm list`で現在のdependency pathを確定する
- [x] 3. repo内の直接uuid利用、Expo prebuild/config、xcode利用箇所、CI/native影響をrepo mappingする
- [x] 4. GitHub advisory / CVE / uuid upstream source・metadataから脆弱性成立条件を確定する
- [x] 5. `xcode@3.0.1` sourceを突き合わせ、vulnerable API到達性をA/B/C分類する
- [x] 6. `uuid@7.0.3`からpatched majorへのmodule/API/engine/runtime互換性を調査する
- [x] 7. parent versions、dependency metadata、pnpm 9.10.0のresolution方式を候補比較する
- [x] 8. 各candidateを同一baselineの隔離一時領域で検証し、dependency/lockfile差分とunexpected changesを記録する
- [x] 9. CI / web / Android / iOS prebuild・buildに必要な実装PR validationとNot Run項目を整理する
- [x] 10. durable report、Run Artifact、sanitization、canonical diff、安全制約を最終確認して完了判定する

## Discovered

- 作業中に発見した追加タスクはここへ追記する。

## Blocked

- なし。
