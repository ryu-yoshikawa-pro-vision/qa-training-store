# PR #16 Agentic QA fail-close 修正履歴

## 概要

PR #16のレビュー指示に基づき、Black-box Scored QAの契約・隔離・Preparation・Evidence・Evaluation・Benchmark Identityを実測値中心のfail-closeへ修正した。Product Behavior、Application Source、Git履歴、PR状態は変更していない。

## 主な判断

- `run-local-e2e.ts`はContract Fixtureとして明示し、Official model-backed Scored Runとは分離した。Official実行基盤がないため、未実行をPASSや正式スコアに昇格させない。
- Forbidden Probeはisolated rootの禁止ファイル／ディレクトリとrunner tool scopeを実測し、Basicでは17 capabilityの利用可能数0を確認した。
- Patched runtimeはPost-patch sanity後に同じserverをScored Initial Stateへresetし、Runner callback直前まで保持する。Machine ArtifactへPIDやOS固有絶対Pathは保存せず、Preparation順序・Probe・Runtime sanityは相対Artifactに記録する。
- Required Evidence、Actual Deviation、Fresh Session、Separate Evaluator、Benchmark／Snapshot再導出、Spec／CLI validationを契約へ接続した。Fixture Evaluationは`valid_for_scoring=false`、`fixture_not_official`／`coverage_integrity_failure`、metrics nullとなる。

## 検証

- Basic／Intermediate／Advanced PreparationでBaseline／Patched ground truth、patch apply、reset、cleanupを確認した。Basicの最終Artifactは`preparation-order.json`、`runtime-sanity.json`、`forbidden-probe.json`を含む。
- Contract test、Agentic contract validator、TypeScript／Spec系検証を実行した。フル品質ゲートと`pnpm run verify`の最終結果はRun `20260810-130321-JST/REPORT.md`へ追記する。
