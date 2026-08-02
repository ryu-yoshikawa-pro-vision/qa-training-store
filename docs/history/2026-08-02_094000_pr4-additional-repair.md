# 2026-08-02 PR #4追加修正履歴

## 変更概要

- PR #4追加指示に基づき、Cross-role CI、Customer Review状態、未配達Review Snapshot、Admin Preview集計、Dirty Navigation、Guide／Reset NoticeのRoute allowlist、Cart統合文言、Customer注文詳細取得、送料閾値、ConfirmDialogの非同期契約を修正・補強した。
- Review状態は`deriveCustomerReviewState`へ集約し、Customer注文詳細とReview Eligibilityの状態表現を一致させた。
- Test Control UI ResetとTest API Resetの責務を明文化し、Run Artifactのパス表現と`changed_files`のrepo-relative POSIX契約を確認した。

## 検証方針

- Unit／Integration／Component／Contractで、5つのReview状態、未配達のContext保持とDB不変、Preview集計全項目、新規Previewのゼロ値、Dataset Session、CI条件、Route allowlistを検証する。
- PlaywrightのUI確認ではDirty NavigationのModalフォーカス、Escape／戻る／破棄遷移、Guide／Reset Noticeのリンク境界、Cross-role A/B/C、PreviewとReview URLを確認する。

## 参照

- 計画: `docs/plans/2026-08-02_085639_pr4-additional-repair.md`
- Run: `.codex/runs/20260802-085639-JST/`
