# Plan

## Objective

- PR #127の既存observation contract Planについて、`rg` / `grep` / `Select-String`等の検索系commandの`safe_no_read`境界を、canonical Skill treeとのscope intersectionを基準に最終化する。

## Scope

- In:
  - 指定Planの検索scope判定、decision table、将来テスト計画、自己レビューの修正。
  - 今回のactive Run Artifactの日本語記録。
  - 必要最小限のPR #127本文追記、commit、対象branchへのnon-force push。
- Out:
  - `scripts/evals/**`、`tests/**`、dataset、Skill description、Hook、AGENTS、timeoutの変更。
  - Observation Probe、Environment Qualification再実行、canonical `all`、valid baseline取得、PR merge。

## Assumptions

- 対象Planは`docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`であり、Candidate C、Result schema 2、PR2/PR6境界等の既存確定事項は維持する。
- 検索系commandのpositive reader実装は今回行わず、boundedな単純shape以外は保守的に`unreliable`へ分類する。
- slash差はbounded selector内の最小正規化だけで扱い、general path resolverや各commandの完全parserは作らない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーがscope、canonical対象、分類規則、完了条件を指定済み。
- 仮定してよい細部: 明示された非交差targetとpatternを安全に分離できる単純shapeは`safe_no_read`とする。
- 未回答の重要質問: なし。pattern/targetをboundedに分離できない場合は`unreliable`という安全側の既定値を採用する。

## Hypotheses

- H1: 完全なcanonical file path文字列の有無だけでは、parent directory、repository root、glob、implicit rootによるread可能性を排除できない。
- H2: 検索targetが6つのcanonical `SKILL.md` treeと非交差であることを安全に証明できる単純shapeだけを`safe_no_read`にすれば、false absenceを防ぎつつdirect implementation null sideを維持できる。

## Research Plan

- Round 1 Query: 既存Planの検索系記述、decision table、tests計画、self-review、Run/PR状態を確認する。
- Round 2 Query: 関連evaluator / Hook / contract testsをread-onlyで照合し、今回のPlan-only変更のsafe change surfaceと既存契約を確認する。
- Exit Criteria:
  - H1/H2を支持するPlan上の明示的なscope規則とdecision tableがある。
  - 6 canonical Skill path、Windows slash差、pattern/target分離、保守的fallback、テスト項目、32項目self-reviewが記録されている。
  - 未解決論点は実装scope外として明示されている。

## Approach

- 必須repo docs、feature-plan workflow、既存Plan、関連コード・テストを確認する。
- 既存のCandidate C等を変更せず、検索系の`safe_no_read`定義、decision table、unreliable cases、tests、self-reviewだけを差分修正する。
- Plan-onlyのMarkdown / Prettier / diff / sanitizer / collector検証を行い、source等のscope外差分がないことを確認する。
- PR本文へPlanレビュー反映状況だけを追記し、branch安全確認後に明示refspecでnon-force pushする。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> Plan修正 -> validation -> REPORT -> commit/push -> final verification`

## Definition of Done

- 検索targetのcanonical Skill treeとの非交差を安全に証明できる単純shapeだけが`safe_no_read`となる。
- canonical file、parent directory、`.agents/skills/`、repository root、implicit root、glob / recursive、曖昧なpattern/targetは`unreliable`となる。
- patternだけにcanonical pathが現れ、非交差targetへboundedに分離できる例外を明記し、検索commandをpositive readerへ昇格しない。
- direct implementation null side、positive candidate prefix、Candidate C、Result schema、lifecycle、timeout、Target、comparison、8-side、PR2/PR6の既存契約を変更しない。
- Plan-only validation、sanitizer Write/Check、collector strictがPASSし、source・tests・dataset・Hook等の変更がない。
- commitとnon-force push後、local/remote/PR headが一致し、PR #127がOPEN/base `main`で、FAIL / canonical未実行 / valid baseline未取得 / implementation未着手を維持する。

## Risks / Unknowns

- 検索scopeを保守的に`unreliable`へ倒すとabsence coverageは減るが、false absence回避を優先する。将来のbounded grammar拡張は別設計とする。
- patternとtargetの完全なshell semanticsは解析しない。安全に分離できない入力を`unreliable`へ倒すことで、general parserの追加と誤判定を避ける。
- 現行Environment QualificationはFAILのままであり、今回のPlan修正はその状態を解消しない。

## Thinking Log

- 2026-09-09 JST: 現行Planは「canonical pathがない単純shape」をsafe候補としており、検索対象directory等のscope intersectionを表現していなかった。
- 2026-09-09 JST: 6つのcanonical `SKILL.md`を列挙し、検索targetの非交差を安全に証明できる単純shapeだけをsafeとするbounded guardへ修正した。
- 2026-09-09 JST: canonical pathがpatternだけに現れるケースは、pattern/targetを安全に分離できる場合のみsafeとし、曖昧な場合はunreliableとした。
