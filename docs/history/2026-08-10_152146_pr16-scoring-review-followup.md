# PR #16 Scoringレビュー追補（2026-08-10）

## 目的

追加レビューで確認されたBlack-box Scored QAのfail-close境界を、前回修正済みの契約を作り直さずに補強した。

## 修正

- Policyの`allowed_capabilities`と、Runnerへ実際にexposeされたActual Tool Scopeを別型で扱った。Preparation-only／Contract FixtureはActual Scope未計測として保存し、`tool_scope_validated=false`へ落とした。
- CoverageとFindingのEvidence ref/typeを1対1対応にし、重複ref、unsafe path、invalid URL、画像拡張子不一致を拒否する構造を追加した。Official Evaluationではartifact存在とmachine-readable textの内容を読み、descriptionだけのTPを拒否する。
- Non-defect TNから`coverage.notes`を外し、Item-specific artifact-backed observationだけを根拠にした。
- Official model-backed経路では、expected identity、Runner Session、model identifier、Fresh Session、Actual Tool Scope、Forbidden Probe artifact、Separate Evaluator Session、Evidence IntegrityをEvaluator側で再確認する。未確認はinvalid、metrics nullとする。
- Basic専用local fixture、server起動前reset、必須prepareRunner callback、shebang検出、Challenge-specific manifest正本を反映した。

## 非対応／境界

- Product Behavior、`src/`、`app/`、`maestro/`、Git履歴、PR状態は変更していない。
- `actions/upload-artifact@v4`の単独SHA pin、spec-refs cache、loadAnswerKey helper、Docstring Coverageは対応しない。
- Official model-backed Scored Runの実行基盤は存在しないため、Foundation全体のDoDは未完了／Blocked。Contract Fixtureとlocal PreparationのPASSをOfficial Scored PASSへ昇格していない。
