# Plan（計画）

## 目的

- Issue #163とPR #167の実装Planへ、これまでの全体レビューで必要と判断した修正を統合する。
- Dependabot Alerts → Renovate → 人間判断 → OpenCode fallbackという目的を維持し、package manager、SemVer、dependency graph、OIDC、credential、Artifactの境界を実装可能な形へ揃える。
- 今回はPlan、Issue #163、active Run Artifact、PR #167本文を更新し、workflowやdependency更新そのものの実装には進まない。

## 対象範囲

- 対象:
  - Issue #163本文
  - `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`
  - `.codex/runs/20260919-051528-JST/PLAN.md`
  - `.codex/runs/20260919-051528-JST/TASKS.md`
  - `.codex/runs/20260919-051528-JST/REPORT.md`
  - PR #167本文
- 対象外:
  - `renovate.json`
  - `.github/workflows/**`
  - `.github/opencode/**`
  - `package.json` / `pnpm-lock.yaml`の実装変更
  - GitHub Settings / Secret / App installation
  - merge / Issue close / activation

## 統合した修正

1. PR #167 branchは最新`main@c0dbf818d9431dcbd1e03cb76361e51913313af0`をまだ含まないため、実装開始前に最新mainを取り込み、PR #166で変わったpackage / lockfile / CI contractを再確認する。
2. Security fallbackのpackage managerをSecurity Support対象外の`pnpm@9.10.0`から`pnpm@10.34.5`へ更新する。Security workflowだけ別versionにせずRepository全体を揃える。
3. `read-alert`はPublic Advisoryのstructured field取得と限定文字列正規化までに留め、SemVer意味検証をcheckout + frozen install後かつSecret投入前の`opencode-edit`前半へ移す。
4. direct / root parentの自動修正はexact SemVer specifierだけに限定し、`^` / `~`等は初期fallbackで`needs_human`へ停止する。
5. parent-scoped overrideはbaseline lockfileから全parent instanceを列挙し、exact parent manifestの`dependencies` / `optionalDependencies` / `devDependencies` / `peerDependencies`を確認して全適用先を証明する。installed graphは補助確認に下げる。
6. validatorの信頼依存である`semver` / `yaml`自体がtargetの場合は自動fallback対象外にし、candidate自身を採用判定コードへloadする循環を避ける。
7. `BASE_SHA`はworkflow開始時の`${{ github.sha }}`としてpreflightで固定し、後続jobで再計算しない。
8. Repository全workflowで`permissions: write-all`を禁止し、workflow-level `id-token: write`も禁止する。job-levelで実効的に`id-token: write`となるのはSecurity fallbackの`publish`だけにする。
9. OIDC ID token / GitHub App installation tokenは取得直後にmaskし、job output / Artifact / remote URL / `.git/config`へ残さない。Git pushとPR作成だけにstep-local credentialとして使い、処理後に破棄する。
10. Public RepositoryのActions Artifactへ格納する情報はPublic Advisory等から再構成できるstructured fieldとhashだけに限定する。Artifactの`artifact-digest`は監査用に留め、Security判定はartifact ID、file set、個別SHA-256を正本にする。
11. Public Repository HardeningのP-01 / P-03 / P-12の更新とP-05 / P-13継続を現Planへ明記し、過去Hardening Plan本体は書き換えない。
12. 既存の6 job分離、prepared Artifact、one-shot、raw Alert隔離、Advisory再確認、tracked Run Artifact、activation後Issue close契約は維持する。

## 完了条件

- Issue #163とPlanのpnpm契約が`pnpm@10.34.5`で一致する。
- 既出レビューの必須修正がPlan、Run Artifact、PR本文へ反映され、相互矛盾がない。
- 過去Hardening Planは変更しない。
- Repository実装開始前に最新mainを取り込む前提が明記される。
- 実装ファイルへ進まない。
