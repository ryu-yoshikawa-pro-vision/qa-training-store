# Plan（計画）

## 目的

- Issue #163のRepository実装をPR #167だけで完了するため、これまでのレビュー結果を最新Planへ統合する。
- Dependabot Alerts → Renovate → 人間判断 → OpenCode fallbackという目的を維持し、OpenCode、validation、publishのSecurity境界を実装可能な粒度まで固定する。
- 今回はPlan、active Run Artifact、PR本文だけを更新し、workflowや設定の実装には進まない。

## 対象範囲

- 対象:
  - `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`
  - `.codex/runs/20260919-051528-JST/PLAN.md`
  - `.codex/runs/20260919-051528-JST/TASKS.md`
  - `.codex/runs/20260919-051528-JST/REPORT.md`
  - PR #167本文
- 対象外:
  - `renovate.json`
  - `.github/workflows/**`
  - `.github/opencode/**`
  - `package.json` / `pnpm-lock.yaml`
  - GitHub Settings / Secret / App installation
  - merge / Issue close / activation

## 統合した修正

1. Repository実装はPR #167を唯一の実装PRとし、別PRを作らない。
2. fallbackを6 jobへ分離し、任意コード実行済みrunnerからpublish Artifactを受け取らない。
3. OpenCode実行前に`fix-authorization.json`をworkflow自身が確定し、後続validatorの正本にする。
4. baseline targetが実際にvulnerable range内であることを開始条件とし、version downgradeを拒否する。
5. OpenCode permissionをtop-level denyから組み立て、`formatter: false` / `lsp: false`、main / small modelのFree固定、固定titleを追加する。
6. `validate-exec`は`pnpm run verify`を実行するだけでpublish用Artifactを生成せず、fresh runnerの`finalize`が差分を再構成する。
7. Artifact input名を`artifact-ids`へ修正し、hiddenな`.codex/runs/**`を含むvalidated Artifactでは`include-hidden-files: true`とexact file listを必須にする。
8. publish直前にAlertだけでなくAdvisoryのrange / first patched versionまでauthorizationと再照合する。
9. PR #167の`Closes #163`を外し、merge後のactivation・実地確認完了後にIssue #163をcloseする。

## 完了条件

- 最新Planに上記契約が一意に記載され、旧5 job契約や`artifact-id` download入力が残らない。
- Security fallbackのauthorization、credential、任意コード実行、Artifact、OIDCの境界がjob単位で説明できる。
- PR #167本文が「同じPRでRepository実装を完了」「merge後activation」「Issueはactivation後にclose」と一致する。
- 実装ファイルへ進まない。
