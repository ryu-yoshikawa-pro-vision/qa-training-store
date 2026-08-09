# README／Phase 2計画の現行状態更新

## 変更理由

Phase 2後半のNative Customer購入Flow、Android実機検証、iOS Reusable Workflow、Remote CI未実施の境界が実装後も正しく伝わるよう、root `README.md`とPhase 2 Master／詳細計画へ現行状態を追記した。root READMEに残っていた「Native後半はplaceholder」という記述は現行実装と不一致だった。

## 現行判断

- Androidの現行ソース検証はRun Artifactの証跡に基づきPASSとする。
- iOS Simulator、GitHub-hosted Remote CI、最新Headの`native-ci / verify`は未実行のためPASSとしない。
- EAS Cloud Build／Workflow／Submit、Store公開、Native Admin、Guest CheckoutはPhase 2の対象外である。
- Phase 3／後続課題は、決済例外・注文ライフサイクル・Native Admin・Account拡張・Migration Recovery・公開／Visual Regressionに分類し、優先度と開始条件をPhase 2詳細計画へ追記した。

## 参照

- `.codex/runs/20260808-165236-JST/REPORT.md`
- `docs/plans/phase2-native-goal/00_master-roadmap.md`
- `docs/plans/phase2-native-goal/02_phase2-second-half-purchase-automation.md`
