# ADR-0005: Local Native Buildを主経路とする共有Visual Contract

- Status: Accepted
- Date: 2026-08-02

## Context

Phase 2前半のNative Buildと実環境検証について、Windows Android／macOS iOSのローカル経路を正式な主経路とする方針へ変更した。EAS Cloud Buildは日常のBuild／検証／Submit経路ではなく、ProfileとWorkflowの静的・将来用構成として扱う。

WebとNativeは同じ商品・Cart情報を扱うため、Platform UIを別実装にしても、ブランド、情報階層、商品画像比率、Touch Targetの契約は共有する必要がある。一方で、WebのDOM／CSS／React Aria ComponentをNativeへ持ち込むと、Bundle境界とPlatform UIの責務が壊れる。

## Decision

1. Native Buildの主経路は`expo prebuild`後のローカルAndroid／iOS Toolchainとする。AndroidはDev／Release、署名済みAPK、Emulator／端末Installを確認し、iOSはXcode／Simulator Release Buildを確認する。個人iPhoneはDevelopment Signingの任意確認に限定し、Distribution IPA／Store提出は作らない。
2. `android/`、`ios/`、APK／App、署名鍵、Credentialはローカル一時成果物とし、Repositoryへ追加しない。Release署名は端末側のGradle／Xcode設定で行い、秘密情報は保存しない。
3. `eas.json`と`.eas/workflows/phase2-native-foundation.yml`は、local／automation／productionのProfile・Environment mappingと手動Workflowの静的契約として保持する。EAS Cloud実行、Submit、Cloud Credential設定は本経路に含めない。
4. Native UIは`src/presentation/design/tokens.ts`をVisual Contractの共有源とし、colors、8px spacing、radius、typography、minimum touch target、商品画像比率をNative styles／primitivesへ変換する。WebのDOM／CSS／React Aria Componentは再利用しない。
5. Home／Catalog／Product／Cartについて、WebとNativeの情報順・価格／Sale／在庫／Review表示・画像比率を揃える。390×844を標準比較Viewport、320×700を追加確認Viewportとし、Native実機／Simulatorがない場合は未確認として記録する。
6. 検証結果は、Local Native Build、Local device／Simulator validation、EAS static validation、EAS Cloud executionを別々に報告する。Node SQLite／Web Build成功だけで実Native検証を完了扱いにしない。

## Consequences

- WindowsでもAndroidのコード・設定・Release経路を先に検証でき、macOSでは同じ契約でiOS Simulatorを確認できる。
- EAS認証やCloud費用に依存せず、将来必要になったときだけ静的Workflowを起点にCloud実行へ移行できる。
- Nativeの実機／Simulator検証が未実施の場合、コード実装完了とPhase 2前半全体の完了を分けて報告する必要がある。
- Platform差の受け入れ範囲をHeader／Navigation等に限定し、Visual ReviewでWeb／Android／iOSの未検証画面を明示する。
