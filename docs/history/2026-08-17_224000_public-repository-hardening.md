# Public Repository Hardening に伴う Project Context 更新

## 2026-08-17

Public Repository Hardening の SSOT に従い、CI/CD の運用境界を更新した。

- `dependency-review` は既存の `ci.yml` に統合し、PRでは成功、非PRイベントではSkipを `verify` が明示判定する。
- 通常の同一リポジトリPRだけがCloudflare Preview Deploymentの対象であり、Dependabot PRとfork PRはSecretを利用せずPreviewをSkipする。
- `validate` は `always()` で起動し、PRのhead repositoryとauthorに応じてPreviewの成功／Skipを明示判定する。
- `pull_request_target`、untrusted head checkout、Public PRでのself-hosted runnerは追加しない。
- `.github/workflows/**` のremote Actionはfull-length commit SHAで固定した。

Application、Native、教材の機能・内容は変更していない。既存のCI／Production運用を、Public RepositoryでSecretをfork／Dependabotへ渡さない条件に合わせて明文化した。
