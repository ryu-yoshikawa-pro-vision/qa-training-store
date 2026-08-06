# Tasks

## Now
- [x] 1. PLAN、allowed scope、Strict Run artifact を確定する
- [x] 2. 再起動後の Junction／Git／toolchain／ADB／MCP 初期状態を確認する
- [x] 3. PowerShell formal entrypoint の引数 bug を最小修正し Doctor／baseline Test を取得する
- [x] 4. 最新 PR head／Native Static／Android CI failure と証跡を確認する
- [x] 5. Local baseline の Screenshot／UIAutomator／Hierarchy／logcat／Activity で failure category を分類する
- [x] 6. Expo patch mismatch と Status／Bridge／Flow の must_fix を根拠に修正する
- [ ] 7. focused Component／Contract／Expo quality validation を PASS にする
- [x] 8. Prepare／Build／Install／Smoke／単体 Flow を正式経路で PASS にする
- [x] 9. 単体 PASS 後に Runtime Suite 5本、Boundary Suite 5本を実機で実行する
- [x] 10. Full regression／Web／Production Bundle／Run report を完了判定する

## Discovered
- [x] D1. 再起動後のMaestro MCP接続（同一Serial／MCP Flow）を確認する。Mobile MCP backendは不稼働として記録する
- [ ] D2. GitHub CLI 未導入のため connector 取得と `gh` 未確認を分離して記録する
- [x] D3. Prepare の production NODE_ENV による devDependency prune を正式経路で修正する
- [x] D4. Maestro Flow の offscreen／Android System UI selector 問題を証跡に基づき修正する
- [x] D7. Nativeの共有用テスト成果物を `output/mobile-native/` に集約し、保存規約を文書化する
- [ ] D5. Maestro／IME 入力と MCP の local／CI parity を確認する
- [x] D6. Native商品検索のformal CLI入力経路（MaestroInputMethodService／LatinIME）を切り分け、実機formal単体をPASSさせる

## Blocked
- B1. Mobile MCP backendは `mobilecli is not available or not working properly` のため未使用。Maestro MCPは復旧済み。
- B2. gh CLI がないため、`gh auth status`／`gh pr checks`／Actions log の正式CLI確認は未実行。
