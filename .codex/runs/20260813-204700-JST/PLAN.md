# Plan

## Objective

- Official Artifact Boundaryの残存3問題（pre-freeze extra file、pre-manifest isolated-root extra file、ancestor symlink）を最小差分でfail-closedにする。

## Scope

- In: `scripts/agentic-qa/**`の関連helper・verifier、Official artifact-chain tests、関連docs、今回のRun Artifact。
- Out: 既修正のOfficial architecture、Product、Static server認可、Host証跡生成、Git mutation。

## Assumptions

- （不明点があれば明示）

## Questions / Ambiguity

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses

- H1: Manifest作成前の余計なファイルは、Manifest一致ではなくcanonical allowlist完全一致をPreparation／Official verificationの両方で検証すれば昇格できない。
- H2: Run Rootからleafまでの全segmentを`lstat`すれば、ancestor directory symlinkをtrusted evidence／required artifact boundaryで拒否できる。

## Research Plan

- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 3つのmutation testと既存positive Official chainがPASSし、focused／contract／preparation／lint／typecheck／spec／security／Chromiumを実測する。format:checkのbaseline failureは正確に分類する。

## Risks / Unknowns

- リスクと対策

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
