# Plan

## Objective
- PR #9の再レビューで指定されたRun Artifact／運用契約の整合性問題4点だけを、既存の正常な変更を維持したまま修正する。

## Scope
- In:
  - `.codex/runs/20260807-094024-JST/run.json` のSubagent集計とValidation状態
  - `.codex/runs/20260807-094024-JST/REPORT.md` 末尾へのverify範囲訂正
  - `docs/reference/repair-loop.md` のAppend-only例外の限定
  - 今回Run（`20260807-222748-JST`）の標準Artifact
- Out:
  - アプリケーション、Native実装、Maestro、Android wrapper、Sanitizer本体／Fixture、CI、package設定、lockfile、その他の文書変更
  - Remote CI、branch／commit／push／PR更新、削除・rename

## Assumptions
- `094024`の既存REPORTはappend-onlyとして過去行を変更せず、訂正は末尾追記にする。
- ローカル品質ゲートはコード変更がないため、ユーザー指定どおり実行し、既存警告は事実として記録する。
- 今回の新規Run ArtifactはAGENTS.mdの標準保存要件に基づくため、ユーザーの「不要なファイルを変更しない」条件の対象外として作成・更新する。

## Questions / Ambiguity
- 必ず質問する不透明点: なし
- 仮定してよい細部: 訂正エントリのJST時刻は実行時刻を使う。
- 未回答の重要質問: なし

## Hypotheses
- H1: `094024`のJSON集計とValidation状態の不整合は、指定値への最小修正で解消できる。
- H2: verifyの範囲誤記とAppend-only例外は、既存履歴を変更せず末尾追記／該当契約文の限定で解消できる。

## Research Plan
- Round 1 Query: 対象RunのJSON・REPORT、`package.json`のverify、repair-loop契約、Git差分を確認する。
- Round 2 Query: 修正後のJSON整合性、REPORT訂正、契約範囲、指定ゲート、変更ファイル範囲を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- どう進めるか（高レベル手順）
  1. 指摘の成立を機械的・目視で確認し、4件をmust_fixに分類する。
  2. 許可ファイルを固定し、`apply_patch`で最小修正する。
  3. JSON parse／整合性、format、contracts、verify、diff、対象RunのSanitizer Write+Checkを実行する。
  4. 結果を本Runへ追記し、残差と停止判断を記録する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done
- `094024`のSubagent集計がrecords／agents_usedと一致する。
- `094024`の`validation.status`がevaluationのpartialと一致する。
- verifyの実際の範囲と個別Native検証の帰属が末尾訂正に明記される。
- Append-only例外がローカル絶対Pathの既定Token化だけに限定される。
- 変更ファイルが指定4ファイルと今回Run Artifactだけである。
- `pnpm run format:check`、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`、JSON parse、対象Run Sanitizerが成功する。

## Risks / Unknowns
- REPORTの過去行を変更するとappend-only違反になるため、既存行は編集せず末尾へ訂正を追記する。
- verifyは生成物や環境の影響を受けるため、失敗時は範囲外扱いで即保留せず、差分・Baseline・環境を確認して記録する。

## Thinking Log
- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-08-07 JST: 指摘は4件ともRun Artifact／運用契約のcorrectnessに関するため`must_fix`とした。Remote CIやGit mutationは依頼で禁止されているため対象外とする。
