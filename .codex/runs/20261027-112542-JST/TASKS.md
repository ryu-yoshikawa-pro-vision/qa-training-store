# Tasks

## Now

- [x] 1. 全51目標の教材・演習・評価を棚卸しし、根拠付き対応表を保存する。
- [x] 2. M00〜M10の教材と段階的練習を制作する。
- [x] 3. 演習、M06新規spec、M07 POM・fixture、模範・採点・状態を整合する。
- [x] 4. クイズ・Web・配布・チューター・評価器を整合する。
- [ ] 5. 決定論的な実技・回帰検証と受講者視点の確認を実施する。
- [ ] 6. 実Template・2コアCodespace技術受入を実施する。
- [ ] 7. 最後にOpenCode実モデルの統合・校正・正式評価・再評価を確認する。
- [ ] 8. 変更とRun成果物を確認し、commit・通常push・PR本文更新を行う。

## Discovered
- コース用Template repositoryは所有者の公開Repository 53件に見当たらず、既存の`codex-templates`は無関係。実Templateは最終受入時に専用repositoryとして作成する必要がある。
- 既存製品Chromium回帰34件は全件PASS表示だが、Playwrightが最終summary/exit codeを返さず終了したためPASS確定には使わない。Playwright管理Chromiumは未導入で、既存Google Chromeを指定すると各テストは成功表示になった。新課程Chromium E2E 17/17はexit 0でPASS。

## Deferred（ユーザー指定の実施順）
- Task 6と7はローカル作業・PR更新後の最後の受入として保留する。

## Blocked

- 全体`pnpm run verify`は保護対象の未追跡`workspace/M06/acceptance-probe.spec.ts`の整形エラーで開始時に停止する。ユーザー所有のworkspaceは編集せず、他のgateを個別に実行した。
- 旧製品E2Eの最終process結果が未確定。最新HEAD CIとrunner停止要因の切分けが必要。wait_for_required_ciは現在のツール一覧に存在せず、push後のexact-head CIは手動ポーリングせずBLOCKEDで記録する。
