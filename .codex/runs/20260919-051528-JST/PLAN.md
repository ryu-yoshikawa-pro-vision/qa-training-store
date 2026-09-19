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
2. fallbackは6 jobを維持し、`validate-exec`が任意コード実行前にprepared package / lockfile / authorizationをimmutable Artifactとして確定する。
3. `finalize`はそのprepared Artifactをhash一致のまま再利用し、lockfileを再生成しない。
4. authorizationへstrategyごとのexpected exact resolved versionとparent-scoped overrideのbaseline全edgeを保持する。
5. installed graphに加えてprepared lockfile全体のtarget package versionを既存`yaml`で確認し、vulnerable version残存をfail-closedにする。
6. 6 jobすべてが`github.run_attempt == 1`をjob-levelで要求し、個別job Re-runをone-shot経路にしない。
7. `.github/workflows/**`全体で`id-token: write`をSecurity fallbackの`publish`だけへ限定し、OpenCode App OIDC exchangeのaudience / endpoint / request / response契約を固定する。
8. `OPENCODE_DISABLE_DEFAULT_PLUGINS=1`を追加し、external / default pluginを両方無効化する。
9. 既存のraw Alert隔離、Free model、permission、Artifact、Advisory再確認、tracked Run Artifact、PR #167一本化、activation後Issue close契約を維持する。

## 完了条件

- 最新Planに上記契約が一意に記載され、旧5 job契約や`artifact-id` download入力が残らない。
- Security fallbackのauthorization、exact resolution、prepared Artifact、credential、任意コード実行、re-run、OIDCの境界がjob単位で説明できる。
- PR #167本文が「同じPRでRepository実装を完了」「merge後activation」「Issueはactivation後にclose」と一致する。
- 実装ファイルへ進まない。
