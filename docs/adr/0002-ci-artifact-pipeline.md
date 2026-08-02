# ADR-0002: GitHub Actions の並列検証と Artifact 経由デプロイ

- Status: Accepted
- Date: 2026-08-02

## Context

従来の Phase 1 CI は、静的検証、Vitest、Web Build、Chromium 系 E2E、UI Review、拡張 Browser Test、Production Build を単一の `validate` Job 内で直列実行していた。そのため、最初の失敗以降の結果を一度の Run で確認しにくく、独立した検証も待ち合わせていた。また、Preview／Production のデプロイ Job がそれぞれ Build を再実行しており、検証した成果物とデプロイした成果物が一致する保証が弱かった。

## Decision

1. Quality、5種類の Vitest、Automation／Production Build、Playwright 検証を独立 Job／Matrix に分割する。
2. Automation と Production の `dist/` はそれぞれ一度だけ生成し、`web-dist-automation`／`web-dist-production` Artifact として後続 Job へ渡す。
3. Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき既存 `dist/` を静的サーバーで配信し、後続検証で Web Build を再実行しない。
4. Production Artifact の Local Smoke をデプロイ前に実行し、検証結果は内部集約 Job `verify` で判定する。`verify` は `always()` で上流結果を明示判定し、テストや Build を再実行しない。
5. 既存の Required Status Check との互換性のため、最終 Job ID は `validate` として維持する。PR では `verify` 成功後に Preview をデプロイして公開 URL Smoke Test を実行し、その成功後に `validate` を成功させる。`deploy-preview` は Job-level `always()` と `verify`／`build-automation` の成功条件を併用し、意図的な `extended-e2e=skipped` が条件評価を妨げないようにする。main Push では Preview を Skip として扱い、`validate` 成功後に Production をデプロイする。
6. `deploy-production` も Job-level `always()` と `validate`／`build-production` の成功条件を併用し、main Push での Preview Skip が Production に伝播しないようにする。Production デプロイには `cloudflare-production` の Job concurrency を設定する。
7. Cloudflare Secret 不足はデプロイ対象 Job 内の認証確認 Step で明示的に失敗させ、Secret 不在を理由にデプロイを黙って Skip しない。認証情報は確認 Step と Wrangler Action Input に限定する。
8. Workflow 内の Checkout は `persist-credentials: false` とし、Preview の branch 名は許可文字を別 Step で検証する。UI Review の Upload は既定の `UI_REVIEW_STAGE` をそのまま参照する。
9. fork リポジトリからの Pull Request は Cloudflare Preview 用 Secret を利用できず、必須の Preview デプロイおよび公開 URL Smoke を実行できないため、現在の CI/CD 運用ではサポート対象外とする。fork PR を通すために Preview 必須条件を弱めたり、`pull_request_target` を追加したりしない。

## Rationale

- 独立 Job／Matrix により CI の待ち時間を短縮し、複数の失敗を同時に把握できる。
- Artifact を共有することで、検証済みの Build とデプロイ対象の Build を一致させられる。
- 内部の検証集約を `verify`、Required Check として残す最終ゲートを `validate` と分けることで、責務と互換性を両立できる。
- `verify` と `validate` は `always()` と Job result の明示比較を使うため、上流失敗が `skipped` として隠れず、PR では Preview Smoke 失敗も最終 `validate` の失敗になる。
- `deploy-preview` と `deploy-production` は `always()` と直接の依存 Job の `success` 条件を併用するため、意図的な Skip は伝播させず、上流失敗時はデプロイを開始しない。
- main Push では最終 `validate` の成功後だけ Production デプロイを開始する。
- Production の concurrency により、同時に複数の公開デプロイを開始しない。

## Consequences / Trade-offs

- Runner の総使用時間は増える可能性がある。
- Job ごとに依存関係と Browser の Setup が必要で、セットアップコストが重複する。
- 単一 Job より Workflow の依存関係と Artifact 命名が長くなる。
- Artifact の保存期間と Matrix ごとの一意な名前を維持する運用が必要になる。
- fork PR は Preview Secret と必須 Preview Smoke を利用できないため、現行運用のサポート対象外である。同一リポジトリ内の Secret 不足は Preview Job の明示的な失敗として扱う。

## Non-goals

- 自動 Rollback、Production Candidate 用の追加デプロイ、Cloudflare Access／独自ドメイン設定。
- Composite Action／Workflow 分割／Container 化。
- GitHub Ruleset、Repository Secret、Cloudflare 管理画面の変更。
- アプリケーション機能、E2E テスト本体、依存 Package の変更。
