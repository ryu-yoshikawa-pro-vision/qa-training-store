# Plan（計画）

## Objective（目的）

- CI待機中のAgent/LLMによる状態確認反復をなくし、exact HEADの `Web CI` / `Mobile App CI` が終端状態になった時だけAgentを再開する。
- 同じbranch / PR #182でPlan修正から実装、検証まで完了する。

## Scope（対象範囲）

- In:
  - 現在のCodex実行経路でmodel-free waitが可能かのruntime gate
  - exact HEADの `Web CI` / `Mobile App CI` だけを監視する待機経路
  - 必要なhelper / test / wrapperの最小実装
  - `docs/reference/codex-implementation-harness.md`
  - `scripts/verify` / `scripts/verify.ps1`
  - PR #182の実装内容への同期
- Out:
  - Product code
  - GitHub Actions workflow変更
  - branch protection変更
  - permission / sandbox緩和
  - 外部常駐service
  - merge

## Assumptions（仮定）

- 削減対象はCI待機中のモデル推論であり、モデル外processのGitHub API pollingは許容する。
- Planの正本は `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md` とする。
- `gh pr checks --watch` を呼ぶだけではmodel-free waitを保証しない。

## Questions / Ambiguity（質問・曖昧性）

- ユーザーへ確認が必要な不透明点: なし。
- 実装gate:
  - installed Codex versionと実際のtask起動経路。
  - completion waitの利用可否。
  - completion waitがない場合のsafe resume可否。
- 未回答の重要質問: 上記は実測して解消し、推測で実装しない。

## Research Plan（調査計画）

- Repository: `AGENTS.md`、implementation harness、codex-safe / codex-task、Bash / PowerShell verify、Web CI / Mobile App CI。
- Runtime: installed Codexのversion / tool surfaceと35〜40秒のnon-mutating command。
- 外部仕様: GitHub CLI `pr checks` / `run list`、OpenAI Codex unified exec source。
- Exit Criteria:
  - model-free waitを実現できるruntime pathが確定する。
  - exact HEADの2 workflowだけを監視する終了条件が確定する。
  - runtimeが対応不能なら、偽の回避策を実装せずblockerとして説明できる。

## Approach（進め方）

- Task 0でruntime capabilityを確定する。
- 判定Aならnative completion waitを使う。
- 判定Bならmodel外supervisorでCI待機し、終了時だけ同一threadをresumeする。
- 判定Cなら実装を停止し、host capability blockerを記録する。
- A/Bの場合だけCI waiterを最小実装し、harness / verifyを同期する。
- 最終push後はPR #182自身で新経路を実地検証する。

## Definition of Done（完了条件）

- 保存PlanのDoDをすべて満たす。
- PR #182がPlan-onlyではなく、実装・検証結果まで含む。
- CI待機中にAgent pollingが発生していないことを実地証跡で確認する。
- latest headの `Web CI` / `Mobile App CI` がsuccess、またはfailure時はrepair-loopへ戻って未解決を残さない。

## Risks / Unknowns（リスク・未知点）

- 最重要: interactive Codexがlong-running commandをyieldする場合、repo-local waiterだけでは目的を達成できない。
- `gh pr checks --fail-fast` はunrelated checkへ反応するため正本にしない。
- supervisor / resumeはinstalled versionでcwd / sandbox / session identityを検証してから採用する。

## Thinking Log（判断記録）

- 初版Planの「1回のshell tool call内で `gh pr checks --watch`」は、Codex runtimeがlive sessionをAgentへ返す場合にモデルpollingを残すため撤回する。
- CI登録完了は「checkが1件以上」ではなく、exact HEADの `Web CI` / `Mobile App CI` 両runの存在で判定する。
- PR #182をPlan-onlyで終わらせず、同じbranchで実装まで進める。
