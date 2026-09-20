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

- Case Bはcanonical条件の`--ignore-user-config`ありでBrowser / screenshot / URL capabilityを評価し、失敗時だけuser config有効probeを診断に使う。user config有効時だけ成立する場合は`browser_capability_requires_user_config`で`not_executed`とし、Host user configをcanonical turnへ持ち込まない。
- Case B専用の固定`qa-charter.json`を既存`charterSchema`で定義し、`CHALLENGE-BASIC-001`のlearner-safe入力を再利用する。
- Case BはBEFORE snapshotをsource-free QA rootへ露出せずrunner側だけに保持し、candidate Finding同期後にAFTER / comparisonを実行してProduct source additional diff 0を必須にする。
- Case BのQA出力は既存`grayBoxFindingsSchema`から`z.toJSONSchema()`で生成したCodex `--output-schema`とHost側`--output-last-message`を使う。非URL Evidenceは既存official runner evidence prefix内のregular file実体を要求し、手書きMachine Contractを増やさない。
- Case BのQA Runtimeはdefect sanity後に既存`resetBrowserScenario()`で`suspended-user` / sessionなしへ戻し、`/login`開始を確認する。QA promptではsnapshot / schema validation / Runtime lifecycle / resetをrunner-ownedと明示する。
- Case B source-free rootは非Git directoryとし、必要Reference、canonical Skill package、learner-safe specification、runbook、固定Charter、case-local `PLAN.md` / `TASKS.md` / `REPORT.md`、空のofficial runner evidence directoryだけを持つ。initial turnは`--skip-git-repo-check`で起動し、working-tree snapshot JSONは置かない。
- Case Cは`protected-data/keep.txt`を`allowed_files`へ含め、file scope内のdestructive operationとして`stop_scope_violation`との競合を解消する。
- PR6 runnerへ必須`--routing-source-git-sha <40 lowercase hex>`を追加し、resultで`evaluator_git_sha` / `routing_source_git_sha` / `target_git_sha`を分離する。
- case-local Runは既存`--no-run-manifest` / `-NoRunManifest`を使い、`run.json`を作らない。
- 既知の`MD012`を同時に修正する。
- generic Workflow Engine、Session Manager、MCP Manager、Browser runner、Target Manager、provenance framework、Challenge→Charter converterは追加しない。

## 文書構成

- canonical Planは親Planを入口とし、詳細を`_01_cases-and-handoff.md`、`_02_runtime-and-contracts.md`、`_03_validation-and-risks.md`へ分割する。
- 分割ファイルは独立Planではなく、親Planの一部として扱う。契約を重複記載しない。
- Plan Runの`PLAN.md` / `TASKS.md` / `REPORT.md`は小さいため分割しない。

## 完了条件

- canonical Planに上記6件とMD012修正が反映されている。
- `PLAN.md` / `TASKS.md` / `REPORT.md`がcanonical Planと整合している。
- 実装コード、Skill semantics、Product behavior、PR本文、Issueは変更していない。
- 追加レビューで見つかったsnapshot露出とQA Machine Contract推測も解消し、実装前blockerが残っていないかを再確認する。
