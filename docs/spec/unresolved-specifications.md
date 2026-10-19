# 未確定仕様

このファイルでは、プロダクトとしての仕様や意図が未確定の項目のみを記録します。ここに記載されている項目は、期待される動作の判断基準、不具合の判定、および採点基準（Scored Answer Key）として使用してはいけません。

## 未解決の質問

- **Cross-platform visual parity beyond shared behavior**: Webとネイティブで共通化する意味や情報の表示順は確定していますが、プラットフォーム固有のナビゲーションやタイポグラフィにおける完全なピクセル一致（pixel parity）については、仕様上の意図として未確定です。そのため、見た目の差異（ビジュアルの差）のみをもって不具合（Defect）とは判定しません。方針決定（Decision）の確定時に `ui-ux-contract.md` と対応するテストを更新します。

## 解決

プロダクトの意思決定（Product Decision）が確定した項目は、正式な機能仕様書（Normative Feature Spec）へ移行し、必要なBR/AC、自動テスト（Automation）、チャーター（Charter）を更新した上で、この一覧から削除します。
