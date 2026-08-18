# Public Repository Hardening に伴う Project Context 更新

## 2026-08-17

Public Repository Hardening の SSOT に従い、CI/CD の運用境界を更新した。

- `dependency-review` は既存の `ci.yml` に統合し、PRでは成功、非PRイベントではSkipを `verify` が明示判定する。
- 通常の同一リポジトリPRだけがCloudflare Preview Deploymentの対象であり、Dependabot PRとfork PRはSecretを利用せずPreviewをSkipする。
- `validate` は `always()` で起動し、PRのhead repositoryとauthorに応じてPreviewの成功／Skipを明示判定する。
- `pull_request_target`、untrusted head checkout、Public PRでのself-hosted runnerは追加しない。
- `.github/workflows/**` のremote Actionはfull-length commit SHAで固定した。

Application、Native、教材の機能・内容は変更していない。既存のCI／Production運用を、Public RepositoryでSecretをfork／Dependabotへ渡さない条件に合わせて明文化した。

## Pre-merge Dependabot High Triage

2026-08-18 に対象Repositoryの最新 Dependabot Alert API と GitHub Advisory API を再取得し、P-13 の既存 Critical / High triage 証跡を補足した。Current version は `pnpm-lock.yaml`、vulnerable range と first patched version は最新 API を正とする。

| Alert | Advisory | Package | Current | First patched | Effective target | Exposure | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #8 | GHSA-2v37-7h3g-55p8 / CVE-2026-67213 | nanoid | 3.3.16 | 3.3.18 | >= 3.3.18 | transitive。直接 import なし。Expo / PostCSS build tooling 経由で、application code から advisory の zero-size custom API は利用していない | Follow-up Security Update |
| #7 | GHSA-w3rx-r6r6-pgpr / CVE-2025-71330 | image-size | 1.2.1 | なし（API上未提供） | upstream / dependency-chain follow-up | Expo / Metro transitive。直接 import なし。現行 Metro の asset gate は ICNS を対象にしない | Follow-up |
| #6 | GHSA-5p2g-fcmc-qvqq / CVE-2025-71329 | image-size | 1.2.1 | なし（API上未提供） | upstream / dependency-chain follow-up | Expo / Metro transitive。直接 import なし。現行 Metro の asset gate は JXL / HEIF を対象にしない | Follow-up |
| #5 | GHSA-5p4m-2wfm-xmqj | js-yaml | 4.3.0 | 4.3.1 | >= 4.3.1 | @expo/xcpretty tooling transitive。直接 import なし。Podfile.lock parser 経由 | Follow-up Security Update |
| #4 | GHSA-rgw5-rvv9-x895 / CVE-2026-69152 | brace-expansion | 5.0.8 | 5.0.9 | >= 5.0.9 | Expo config / glob transitive。直接 import なし | Follow-up Security Update |
| #3 | GHSA-rgw5-rvv9-x895 / CVE-2026-69152 | brace-expansion | 1.1.16 | 1.1.18 | >= 1.1.18 | Jest / test-exclude transitive。直接 import なし | Follow-up Security Update |
| #2 | GHSA-mh99-v99m-4gvg / CVE-2026-14257 | brace-expansion | 1.1.16 | 1.1.17 | >= 1.1.18 due to #3 | #3 と同じ 1.1.x dependency chain。直接 import なし | Follow-up Security Update |

- #8 の Dependabot vulnerable range は `< 3.3.18`、Dependabot first patched version は `3.3.18`。Advisory に v3.3.17 への reference があっても、patched version / first patched version とは記録しない。
- #2 の advisory 単体の first patched version は `1.1.17` だが、後発 #3 と同じ 1.1.x chain の effective remediation target は `>= 1.1.18` とする。#2 を `1.1.17` で完了扱いにしない。
- #7 / #6 は upstream image-size に現時点で patched version が提示されていない。upstream image-size と Expo / Metro dependency chain の更新を follow-up で追跡し、今回無理に override しない。
- 7件はいずれも PR #31 より前から存在し、今回の Hardening 差分が新規導入した High finding ではない。Alert は dismiss していない。
- 今回は dependency update を行わず、各 finding を個別 Security Update / upstream follow-up として扱う。High finding を無視したのではなく、P-13 の pre-merge triage を完了した。
