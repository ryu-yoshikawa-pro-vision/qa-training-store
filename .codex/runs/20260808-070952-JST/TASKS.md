# Tasks

## Now
- [x] 1. PLANを確定する
- [x] 2. 不足知識をrepo docs、既存契約、CLI registry／help、read-only調査で補い、証跡をREPORTへ残す
- [x] 3. package、config、CI、文書、生成元を実装する
- [x] 4. focused／全品質ゲートを実行する
- [x] 5. sanitizer、REPORT、完了判定を確定する

## Discovered
- D1. `scripts/verify`と`scripts/verify.ps1`がRun／Planningの英語見出しを文字列契約として確認するため、Run Artifact見出し日本語化はdeferする。
- D2. default Ruleの実測でMD013等の大量違反が予想されるため、config調整と形式修正を分離して判断する。
- D3. PR #9を取り込んだマージ後のlockfileはpackage.jsonのExpo 57.0.11／57.0.9／57.0.11と不一致だったため、Markdownlint依存追加と同時にpnpm 9.10.0で整合化した。
- D4. Windows上の既存Native contract testは、Nativeファイル未変更のままCRLFとLF固定文字列の不一致で4件失敗した。Native領域は変更せず、Baseline／環境依存として記録する。

## Blocked
- B1. （ブロック時のみ記載）
