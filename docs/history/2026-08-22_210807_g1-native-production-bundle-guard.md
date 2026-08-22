# G1 Native Production Bundle Guard

## 変更理由

- Standalone validatorとAndroid Native CIがHermes artifactをUTF-8／raw marker scanしており、bytecode内のmarkerをfalse-negativeにする同一Root Causeがあった。

## 変更内容

- `hermes-compiler`を固定versionのroot devDependencyとして明示し、validatorが実`.hbc`を`hermesc -dump-bytecode`で検査するようにした。
- Native CIはAutomation／ProductionのRelease APK artifactをDownloadし、APK内candidate assetを展開してStandalone validatorへ渡す単一判定経路に変更した。Workflow内のmarker scanは削除した。
- Production-validation Maestroへ`Native contract passed`の不在assertionを追加し、Guard success後の実Production APKだけで実行する契約を追加した。

## 根拠と未実行事項

- 実Expo Production Hermes exportの`.hbc`でAutomation 3 markerのpositive、Production 3 markerのnegative、逆入力2ケースのfailureを確認した。
- Windowsの実Gradle Production APKは`react-native-reanimated`の`build.ninja still dirty after 100 tries`で停止した。修正HeadのRemote Native CI／`native-ci / verify`は未実行であり、未取得のAPK evidenceをPASSへ繰り上げない。
