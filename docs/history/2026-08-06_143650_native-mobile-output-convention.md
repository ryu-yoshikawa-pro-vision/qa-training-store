# Native テスト成果物の保存先統一

## 2026-08-06 14:36 (JST)

- 人が確認・共有するモバイルネイティブのスクリーンショット、比較画像、選定した画面証跡の保存先を `output/mobile-native/` に統一した。
- ルート直下にあった `native-storefront-cart-added.png` を `output/mobile-native/native-storefront-cart-added.png` へ移動した。SHA-256 は `77466F7DBEE1C19DE6F7C8D4D412D917E14B081040E56312B19DAA081D47DB6A` で移動前後同一である。
- Maestro／ADB／Gradle のログ、JUnit、Hierarchy、APK 情報など実行ごとの機械証跡は、従来どおり `.artifacts/native-local/<timestamp>/` に保存する。
- 正本の保存規約を `docs/native/README.md`、`docs/native/windows-android-local-validation.md` 7.2節、`docs/PROJECT_CONTEXT.md` へ記載した。
- `output/` は既存の `.gitignore` で管理外であるため、個別の ignore 追加や `.gitkeep` は行わない。
