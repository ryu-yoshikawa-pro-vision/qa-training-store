# Plan（計画）

## Objective（目的）

- Issue #153のPlanを正本として、一般日本語ruleとRepository固有の表記ruleを既存の文章品質基盤へ追加する。
- 正式採用ruleの対象Markdownを同一PR内で0 violationにし、既存の差分gate、Hook、fail-close、fingerprint、CI / verify契約を維持する。

## Scope（対象範囲）

- In: `package.json`、`pnpm-lock.yaml`、`.textlintrc.json`、`.codex/text-quality-rules.json`、既存scanner、既存Repository-level checker、文章品質contract、既存CI / verify接続、対象Markdownの必要最小限のmigration、reference 2文書、ADR-0026の最小追記、strict Run Artifact。
- Out: 新しいlint / dictionary framework、別preset / `textlint-rule-prh`探索、AI Judge、Hook state / fingerprint変更、全件scan用の別job / workflow、Husky変更、ADR-0027、Issue本文変更、既存履歴の文章統一、force push、merge。

## Assumptions（仮定）

- 現在の対象branchは`issue-153-japanese-writing-lint`で、`origin/issue-153-japanese-writing-lint`の`f0a45ea`にfast-forward同期済みであり、latest `main` `8772d191`のmerge commitを含む。
- Issue本文とPlanの目的・停止条件は一致している。Planにない設計判断は追加しない。
- 8候補のうち一般日本語ruleとRepository固有ruleをそれぞれ少なくとも1件安全に採用できない場合、Planの目的未達条件に従って実装を完了扱いにせず停止する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。Issue、Plan、現行実装、対象branchを確認済み。
- 仮定してよい細部: Planに明記された既存実装の拡張方法、fixtureの既存リンク方式、既存CI job内への最小step追加。
- 未回答の重要質問: なし。実測でPlan前提が崩れた場合はREPORTへ記録し、停止条件を優先する。

## Hypotheses（仮説）

- H1: `textlint-rule-preset-japanese@10.0.4`の8候補から、対象Markdown範囲で誤検知を抑え、WRITING_STANDARDSに根拠を持つ一般日本語ruleを1件以上選定できる。
- H2: 現行custom scannerへの小さいscope処理追加で、少なくとも1件のRepository固有表記をpath / link destination等と安全に区別できる。
- H3: 既存checkerを再利用した`--all`と既存CI / verifyへの接続で、Hookの差分検査契約を変更せず全件0 violationを保証できる。

## Research Plan（調査計画）

- Round 1 Query: Plan、Issue、latest main取り込み後のbranch、package / lock、textlint config、custom scanner、checker、contract、CI、verify、reference、ADR、WRITING_STANDARDSを確認する。
- Round 2 Query: repository外の一時workspaceでpreset 10.0.4を一時config + textlint APIにより対象範囲だけ実測し、一般ruleの採否を固定する。続けてcustom候補のRepository全体安全性検索、対象範囲のmigration件数、fixtureを確認する。
- Exit Criteria:
  - 採用した一般rule・custom ruleごとに、採用基準、対象件数、誤検知判断、dependency versionの根拠がREPORT.mdへある。
  - 8候補全不採用またはcustom候補全不採用の場合は、目的未達として実装を停止し、別package探索へ広げない。
  - production rule集合、全件scan、contract、verify、CIの各契約を最新headで確認できる。

## Approach（進め方）

- latest main状態と既存実装を確認する。
- `textlint-rule-preset-japanese@10.0.4`をproductionへ組み込まず、一時config + textlint APIで`lint:text:all`対象Markdownを評価する。
- 正式採用ruleと設定値を確定後、個別package方式でproduction dependency、config、scanner、fixtureを更新する。
- custom候補をRepository全体で安全性確認し、対象Markdown範囲の違反だけをmigrationする。
- 既存checkerへ`--all`を追加し、package script、verify、既存Style Qualityへ接続する。
- contract、Hook、標準品質gate、verify、CIを検証し、Run Artifactをsanitizeしてcommit / push / PR CI確認まで行う。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done（完了条件）

- productionにpresetを残さず、既存5 direct ruleと正式採用した個別一般ruleだけを有効化する。
- `.codex/text-quality-rules.json`へ安全に採用できたcustom ruleを追加し、custom rule 0件を正常完了にしない。
- `lint:text`の差分比較、Hook、fail-close、rule集合検証、runtime ID、collision、fingerprint、rename / baseline契約を維持する。
- `lint:text:all`が指定対象範囲を列挙し、履歴prefixと既存`CHANGELOG.md`履歴をmigration対象外にする。
- 対象範囲の正式採用rule違反が0件である。
- 関連contract、format、Markdown lint、text lint、full scan、lint、typecheck、security、verify、Hook contract、CIが成功する。
- Run Artifactをmachine-managed経路で同期し、REPORT.mdをsanitize済みとする。対象branchへ通常commit / pushし、PRはOPENのまま維持する。

## Risks / Unknowns（リスク・未知点）

- preset候補が正常文を誤検知する可能性がある。文章を無理に変更せず、Planの採用基準で非採用または停止する。
- production個別packageのresolve versionがpreset内versionと異なる場合がある。実際のresolve versionで再評価し、未評価versionをblockingへ入れない。
- path / relative linkを安全に除外できないcustom候補がある。大規模parserを追加せず、その候補を非採用にする。
- 全件gateで過去記録が混入する可能性がある。既定のpath prefixとroot `CHANGELOG.md`だけを全件migration対象から除外し、差分gateは維持する。
- 標準検証やPR CIで失敗した場合は、最初の異常を分類して`repair-loop`に切り替える。timeout延長やerror握りつぶしは行わない。

## Thinking Log（判断記録）

- 2026-09-19: Issue #153とPlanを確認し、Issueの目的・停止条件・既存契約を実装範囲として採用した。
- 2026-09-19: ローカルbranchがremote branchより3 commit遅れていたため、`git pull --ff-only`でremoteのlatest main取り込み済みmerge commitへfast-forwardした。merge/rebase/cherry-pickは実施していない。
- 2026-09-19: Issue #153専用のactive Runが存在しなかったため、strict implementation Run `20260919-045144-JST`を標準経路で作成した。
