# Skill package portability（PR1）に伴うPROJECT_CONTEXT更新

2026-09-05 JST、Issue #117 / PR #123のSkill package portability移行に合わせて、`docs/PROJECT_CONTEXT.md`のplan template参照を更新した。

- reusableなplan templateの正本を`.agents/skills/feature-plan/assets/plan-template.md`へ移し、Repositoryの保存先・命名・active Run lifecycleは`PLANS.md`に残した。
- 6 Skillのportable workflowとRepository固有のpolicy、schema、artifact、command、execution ownershipをpackage / root inputへ分離した。
- Skill package validatorを追加し、package identity、frontmatter、local link、package boundaryをCIと`pnpm run verify`へ接続した。
- `.codex/agents/**`、product code、`scripts/agentic-qa/**`、native command helperは変更していない。
