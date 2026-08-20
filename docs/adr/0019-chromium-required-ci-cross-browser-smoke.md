# ADR-0019: Chromium Required CIとCross Browser Smokeの分離

- Status: Accepted
- Date: 2026-08-20

## Context

Phase 1 CIの`extended-e2e`は、mobile Chromium、Firefox、WebKitを同じmatrix job群で実行していた。Chromiumはbrowser binaryだけをinstallする一方、Firefox／WebKitは`playwright install --with-deps`によるOS dependency導入を行っていたため、Ubuntu package mirrorやapt処理の停止がChromiumの検証結果を巻き込み、`verify`／`validate`のrequired gateへ伝播する境界になっていた。

Firefox／WebKitのsmoke test自体はブラウザエンジン差分の確認に必要であり、削除しない。ただし現時点のsmoke規模とPhase 1 CIのChromium側の広い回帰範囲を考慮し、PR／main required gateから切り離して、定期・手動で実行する独立workflowへ移す。

## Decision

1. Phase 1 CIのrequired browser guaranteeをChromium系に限定する。`extended-e2e`のjob idは維持し、`Extended E2E (mobile-chromium)`という単一jobにする。既存の`verify`／`validate`、`build-automation`からのartifact共有、Phase 1 CIのautomation／production build-once pipelineは維持する。
2. Firefox／WebKitのtest、Playwright project、既存script、smoke test bodyは削除せず、`Cross Browser Smoke`というnon-blocking workflowへ分離する。
3. `Cross Browser Smoke`はweekly schedule + manual `workflow_dispatch` onlyとし、push／pull_request triggerを持たせない。browser別matrix、reusable workflow、追加artifact共有workflowは導入しない。
4. official Playwright containerは`Cross Browser Smoke`だけで使用する。imageは`mcr.microsoft.com/playwright:v1.62.0-noble`に固定し、packageの`@playwright/test` versionと一致させる。Firefox／WebKitはcontainerに含まれるbrowserとOS dependenciesを使い、workflow内で`playwright install`や`--with-deps`を実行しない。
5. Node／pnpmは既存Phase 1 CIのtoolchain正本値を再利用する。Nodeは24、pnpmは9.10.0とし、`package.json#packageManager`の`pnpm@9.10.0`とも一致させる。
6. build-time automation envとartifact-consumer envを分離する。Cross Browser Smokeはworkflow内でautomation buildを1回だけ行い、build時の`EXPO_PUBLIC_BUILD_SHA=${{ github.sha }}`をdistへ埋め込む。既存artifactを消費する`extended-e2e`は`PLAYWRIGHT_USE_PREBUILT_DIST=true`を使い、build SHAを再定義しない。
7. Cross Browser SmokeのFirefox／WebKit smokeは、同じautomation build済みdistに対して1回のPlaywright invocationで実行する。
8. 将来Firefox／WebKitを正式なrequired browserとしてPR単位で保証する要件、smoke範囲、実行時間、運用頻度が変わった場合は、required化とCI構成を再評価する。

### ADR-0002との関係

`docs/adr/0002-ci-artifact-pipeline.md`は変更しない。ADR-0002が定めたPhase 1 CIのartifact pipeline、`verify`／`validate`、required check互換性、build済み`dist/`を後続jobへ渡す境界は今回も維持する。

ADR-0002におけるContainer化をnon-goalとした判断は、当時のPhase 1 CI全体に対する歴史的判断として保持する。今回のDecisionはPhase 1 CI全体をcontainer化するものではなく、隔離されたnon-blocking `Cross Browser Smoke`だけにofficial Playwright containerを採用する追加判断である。

## Consequences

- PR／mainのrequired quality gateはFirefox／WebKitのOS dependency導入やcontainer pullに依存せず、Chromium系の検証を中心に判定できる。
- Firefox／WebKitのengine smokeは削除されず、weeklyまたはmanual runで継続的に確認できる。ただしPR単位のrequired保証ではないため、固有不具合の検知はscheduleまで遅れる可能性がある。
- Cross Browser Smokeは独立workflow内でautomation buildを1回だけ行い、Firefox／WebKitで共有する。Phase 1 CI artifactをworkflow横断で取得する複雑な連携、matrix、独自imageを持たない。
- Playwright package／official image version、Node／pnpm toolchain、build-time／artifact-consumer envの境界をCI contractで検出できる。
- container user、registry障害、実GitHub Actions runのbrowser成功はこのADRだけでは保証しない。merge後のmanual runで確認し、問題が出た場合は別途再評価する。
