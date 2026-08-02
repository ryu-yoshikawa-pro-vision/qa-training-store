# ADR-0002: GitHub Actions の並列検証と Artifact 経由デプロイ

- Status: Accepted
- Date: 2026-08-02

## Context

従来の Phase 1 CI は、静的検証、Vitest、Web Build、Chromium 系 E2E、UI Review、拡張 Browser Test、Production Build を単一の `validate` Job 内で直列実行していた。そのため、最初の失敗以降の結果を一度の Run で確認しにくく、独立した検証も待ち合わせていた。また、Preview／Production のデプロイ Job がそれぞれ Build を再実行しており、検証した成果物とデプロイした成果物が一致する保証が弱かった。

## Decision

1. Quality、5種類の Vitest、Automation／Production Build、Playwright 検証を独立 Job／Matrix に分割する。
2. Automation と Production の `dist/` はそれぞれ一度だけ生成し、`web-dist-automation`／`web-dist-production` Artifact として後続 Job へ渡す。
3. Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき既存 `dist/` を静的サーバーで配信し、後続検証で Web Build を再実行しない。
4. Production Artifact の Local Smoke をデプロイ前に実行し、Preview／Production デプロイは集約 `validate` 成功後だけ開始する。
5. `validate` Job ID は Required Status Check の移行互換性のため維持する。PR では Preview Deployment URL の Smoke Test 後に `PR Gate` を成功させる。
6. 同一 PR の旧 Workflow Run は Workflow concurrency でキャンセルし、Production デプロイには `cloudflare-production` の Job concurrency を設定する。
7. Cloudflare Secret 不足はデプロイ対象 Job 内で明示的に失敗させ、Secret 不在を理由にデプロイを黙って Skip しない。

## Rationale

- 独立 Job／Matrix により CI の待ち時間を短縮し、複数の失敗を同時に把握できる。
- Artifact を共有することで、検証済みの Build とデプロイ対象の Build を一致させられる。
- `validate` と PR Gate を分けることで、Required Check の集約と Preview Smoke 後の最終判定を明確にできる。
- Production の concurrency により、同時に複数の公開デプロイを開始しない。

## Consequences / Trade-offs

- Runner の総使用時間は増える可能性がある。
- Job ごとに依存関係と Browser の Setup が必要で、セットアップコストが重複する。
- 単一 Job より Workflow の依存関係と Artifact 命名が長くなる。
- Artifact の保存期間と Matrix ごとの一意な名前を維持する運用が必要になる。

## Non-goals

- 自動 Rollback、Production Candidate 用の追加デプロイ、Cloudflare Access／独自ドメイン設定。
- Composite Action／Workflow 分割／Container 化。
- GitHub Ruleset、Repository Secret、Cloudflare 管理画面の変更。
- アプリケーション機能、テスト期待値、依存 Package の変更。
