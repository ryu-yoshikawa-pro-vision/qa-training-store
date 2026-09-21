# Tasks（タスク）

## Now（現在）

- [x] 1. PR #167 / Issue #163 / 最新Plan / 現在のmainを再確認する。
- [x] 2. これまでの全体レビューで残すべき指摘と、過剰な防御強化として外す指摘を再判定する。
- [x] 3. `read-alert`のSemVer意味検証を`opencode-edit`前半へ移す契約をPlanへ反映する。
- [x] 4. parent-scoped overrideの全適用先をbaseline lockfile + exact parent manifestから証明する契約を反映する。
- [x] 5. OIDC effective permission、`permissions: write-all`禁止、runtime tokenのmask / 非永続化契約を反映する。
- [x] 6. P-01 / P-03 / P-12更新とP-05 / P-13継続をPlanへ明記する。
- [x] 7. `BASE_SHA`をworkflow開始時`github.sha`として固定する契約を反映する。
- [x] 8. validator信頼依存`semver` / `yaml`を自動修正対象外にする。
- [x] 9. direct / root parentの`^` / `~`対応を初期fallbackから外し、exact SemVerだけに限定する。
- [x] 10. `pnpm@9.10.0`維持条件を撤回し、Issue #163とPlanを`pnpm@10.34.5`更新前提へ揃える。
- [x] 11. Public Actions Artifactの情報境界と、artifact ID + file set +個別SHA-256を正本にする契約を反映する。
- [x] 12. PR #167 branchが最新mainを含まないことを実装前blockerとして記録する。
- [x] 13. active Run ArtifactとPR本文を新契約へ揃える。

## Blocked（ブロック中）

- Repository実装開始前にPR #167 branchへ最新`main@c0dbf818d9431dcbd1e03cb76361e51913313af0`以降を取り込み、PR #166で変わったpackage / lockfile / CI contractを再確認する必要がある。
- 実装の最初にRepository全体を`pnpm@10.34.5`へ更新し、標準検証とCIを通す必要がある。
- Owner権限で現在のopen Dependabot Alert件数を確認し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を決める必要がある。この未確定値がblockするのは`renovate.json`と`tests/contracts/renovate-config.test.ts`だけとする。
- 外部App activation前に要求権限、Repository scope、Production trustとOpenCode AppのRepository単位OIDC trustをOwnerが確認する。
