# Native永続化Flow個別証跡とhydration境界の修正履歴

## 変更理由

Native永続化・境界の失敗時に、複数Flowを一括実行するCIでは失敗Flow、JUnit、Screenshot、Hierarchyの対応関係が分かりにくかった。また、再起動後のCart確認が汎用的な数量文字列に依存していた。

## 変更内容

- 現行の5 Persistence／Boundary FlowをCI上の個別Maestro Stepへ分割した。
- Stepごとに固有のJUnitと`maestro-artifacts`ディレクトリを付け、Flow名、開始・終了、結果、exit code、証跡パスを出力するようにした。
- `NativeCartScreen`へCart hydration完了、合計数量badge、product/variant由来の安定testIDを追加した。
- 再起動Flowで初回のみclearStateを使い、Storageを保持した再起動後にIDと値を再検証するcheckpointを追加した。
- Native SQLite Repositoryの新規インスタンスread-back契約とUI component契約を追加した。
- ローカルの単体Flow実行時もFlow名をMaestro出力名へ使うようにした。

## 対応表

ユーザー指示で参照された永続化・境界の論理範囲は、現行repoの次の実在Flowへ対応させた。存在しない重複Flowファイルは作成していない。

| 現行Flow | 役割 |
| --- | --- |
| `native-restart-persistence.yaml` | stop／再起動後のCart復元 |
| `native-reset-dirty-state.yaml` | dirty Cartのreset分離 |
| `native-out-of-stock.yaml` | 在庫切れ境界 |
| `native-low-stock.yaml` | 在庫上限境界 |
| `native-purchase-limit.yaml` | 購入上限境界 |

## 検証方針

初回失敗で後続Maestro Flowを無理に実行せず、失敗時の証跡収集を`always`で行う。実機／Remote CIの変更後結果は、実行した場合のみRun Artifactへ記録し、未実行をPASSと扱わない。

## 今回のローカル検証メモ

静的ゲート、品質ゲート、DoctorはPASSした。変更後Release APKは2回試行したが、`MergeNativeLibsTask`／`copyReleaseJniLibsProjectOnly`のNative `.so` コピー中にシステムドライブの空き容量不足で停止した。Autolinkingは標準のVirtual Storeを参照し、`.pnpm-local`残留は確認されなかった。容量確保はユーザー確認が必要なため自動cleanupは行わず、Install／Smoke／実機Maestro Suiteは未実行である。

## 追補：容量確保後の再検証（2026-08-07）

- ユーザーの容量確保後、Release Build、Install、Smoke、Maestro Control、Runtime Suite 5/5、Persistence／Boundary個別5/5、標準Boundary Suite 5/5を実行し、すべて成功した。
- 初回の修正APKでは、`native-storefront`／`native-cart`が画面下端の追加成功メッセージを文字列`extendedWaitUntil`で待機して失敗した。UI hierarchyにはメッセージが存在したため、selector未検出やCart永続化失敗ではなく、画面外可視性の問題と分類した。
- 成功メッセージにstable testIDを追加し、Maestroでスクロール後にassert、Cart操作前に上方向へ戻るよう修正した。修正後のRuntime／Persistence／Boundaryは成功した。
- `pnpm run verify`はexit 0。lintは0 errors／64 warnings、Native Jest 27 tests、Contract 121 testsを含む。React `act` console warningと既存lint warningは残存するが、品質ゲートのerrorではない。
- 追加したAPK、Maestro output、JUnit、Hierarchy、logcat等は`.artifacts/native-local/<timestamp>/`に保存し、共有用画像の保存先は`output/mobile-native/`とする。Remote CIは未実行である。
