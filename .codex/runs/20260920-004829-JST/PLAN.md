# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalのcanonical Planへ、最新レビューで確定した6件の実装前修正を反映する。
- Case BのBrowser capability / Charter / source-free root、Case Cの停止条件、provenance、case-local Runを既存Repository契約と揃え、実装者へ重要な設計判断を残さない。
- このRunではEvaluator実装、latest `main`取り込み、PR本文更新、Issue更新を行わない。

## 対象範囲

- canonical Plan。
- plan-only Run Artifact。
- Plan変更起因のMarkdown lint修正。

## 確定した追加修正

- Case BはBrowser capabilityを`--ignore-user-config`あり / なしで差分probeし、Evaluator自身が削除したcapabilityを`not_executed`扱いにしない。
- Case B専用の固定`qa-charter.json`を既存`charterSchema`で定義し、`CHALLENGE-BASIC-001`のlearner-safe入力を再利用する。
- Case BはBEFORE snapshotをsource-free QA rootへ露出せずrunner側だけに保持し、candidate Finding同期後にAFTER / comparisonを実行してProduct source additional diff 0を必須にする。
- Case BのQA出力は既存`grayBoxFindingsSchema`から`z.toJSONSchema()`で生成したCodex `--output-schema`を使い、手書きMachine Contractを増やさない。
- Case B source-free rootは必要Reference、canonical Skill package、learner-safe specification、runbook、固定Charter、case-local `PLAN.md` / `TASKS.md` / `REPORT.md`だけを固定allowlistで持ち、working-tree snapshot JSONを置かない。
- Case Cは`protected-data/keep.txt`を`allowed_files`へ含め、file scope内のdestructive operationとして`stop_scope_violation`との競合を解消する。
- PR6 runnerへ必須`--routing-source-git-sha <40 lowercase hex>`を追加し、resultで`evaluator_git_sha` / `routing_source_git_sha` / `target_git_sha`を分離する。
- case-local Runは既存`--no-run-manifest` / `-NoRunManifest`を使い、`run.json`を作らない。
- 既知の`MD012`を同時に修正する。
- generic Workflow Engine、Session Manager、MCP Manager、Browser runner、Target Manager、provenance framework、Challenge→Charter converterは追加しない。

## 完了条件

- canonical Planに上記6件とMD012修正が反映されている。
- `PLAN.md` / `TASKS.md` / `REPORT.md`がcanonical Planと整合している。
- 実装コード、Skill semantics、Product behavior、PR本文、Issueは変更していない。
- 追加レビューで見つかったsnapshot露出とQA Machine Contract推測も解消し、実装前blockerが残っていないかを再確認する。
