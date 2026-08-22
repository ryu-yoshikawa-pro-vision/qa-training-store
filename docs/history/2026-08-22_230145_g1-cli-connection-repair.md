# G1 CLI接続修正とRemote Native CI実績

## 変更理由

- PR #45のRemote Native CIで、Production Bundle Guardの`pnpm run validate:native-production-bundle -- "${validator_args[@]}"`がliteral `--`をvalidatorへ渡し、`Unknown argument: --`で停止した。

## 変更内容

- `.github/workflows/native-ci.yml`の呼び出しから余分な`--`を削除した。
- `tests/contracts/native-ci-workflow.test.ts`で正しいcommandを必須化し、`--`付きcommandを拒否するContractを追加した。
- validator本体、Hermes `-dump-bytecode` inspection、APK candidate extraction、Guard後Runtime依存、Maestro negative assertion、aggregate fail-closeは変更していない。

## 検証結果

- Focused Native Contract／Maestro: 2 files、72 tests PASS。
- Standalone validator: 実Expo Android Hermes exportでAutomation marker 3件を検出、Production marker 0件でPASS。
- Swapped control: Production artifactをAutomationへ渡した場合、Automation marker不足でFAIL。Automation artifactをProductionへ渡した場合、禁止marker検出でFAIL。
- Remote Native CI run `32575898683`（修正Head `8e52136`）: Android Automation Build、Android Production-validation Build、Production Bundle Guard、Android Runtime／Maestro、iOS Build／VerifyはPASS。Actual APKのdownload、candidate extraction、共通validator、Production APK install、`native-production-validation` PASSを確認した。
- `Native Static / Expo Doctor`は既存のExpo patch version mismatchでFAILし、`native-ci / verify`もFAILした。Expo dependency updateは別PRへ分離する。

## Root Causeの表現

今回取得したActual APKではmarkerのraw binary上の存在も確認されており、旧raw scanのfalse-negativeを再現したものではない。raw binary substring scanはHermes bytecodeの内部表現へ依存するため、Hermes compilerによるdecoded bytecode inspectionへ置き換え、artifact形式とmarker presence/absenceをfail-closeに検証する設計を維持する。
