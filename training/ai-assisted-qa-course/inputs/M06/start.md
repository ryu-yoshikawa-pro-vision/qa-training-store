# M06 開始サンプル：独立したCart Case

M06には3つの異なる検証責務があります。通常追加、購入上限超過時に変更前数量を保つこと、low-stock状態の境界です。正式Cart仕様とSeed/Resetの前提を確認し、Case IDをlocator・action・assertionへ対応付けます。

各Playwright testの前にResetを実行し、失敗したテストが次のテスト状態へ漏れないことを再実行で確認します。単に要素が表示されたことと、業務上の期待数量が成立したことを区別します。
