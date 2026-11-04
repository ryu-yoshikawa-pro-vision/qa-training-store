# PR #219 停止staffのForbidden復帰とNative拒否画面

## 比較対象

- `SCREEN-BOUNDARY-FORBIDDEN-A01-01`と正式`docs/spec/roles-and-permissions.md`の「権限不足の説明」「アクセス可能な安全な戻り先」。
- Web `src/presentation/guards/route-guard.tsx`はstaff/admin判定に`accountStatus === "active"`を要求するが、`app/forbidden.tsx`のリンク判定はroleだけで、`operator/admin`なら`/admin`へ誘導する。**停止・退会済みstaffの戻りリンク循環が成立する可能性**がある。
- Native `app/forbidden.native.tsx`は`NativeUnsupportedScreen title="この操作はNative前半の対象外です"`を直接レンダーし、`src/presentation/native/native-screens.tsx`は「この画面はNative Customerの対象外です」の説明とHomeボタンを表示する。これは権限不足を示す正式画面契約と文脈が異なる。

## Case・状態と根拠

| Case | 操作・前提 | 判定 |
| --- | --- | --- |
| Web・active operator | `pr219-forbidden-route.test.tsx`：role=operator、status=active | `/admin`戻りリンクが表示される正常代表条件をComponentで確認済み |
| Web・非active operator | 同Componentでstatus=suspended | 実装が`/admin`リンクを表示する**製品FAIL再現**。テスト自体の成功は製品合格ではない |
| Web・停止後の旧Session | `e2e/web/pr219-cross-role-lifecycle.spec.ts`：`default`でactive operatorとしてLogin後、**当該ブラウザの隔離IndexedDB内でのみ**operatorをsuspendedに変更し、旧Sessionを残す競合境界。Forbidden→「管理画面へ」→Forbiddenの循環、全IndexedDB表のSHA-256 digest不変を検証 | **追加Web CI未確認**。通常の管理画面で停止するとSessionは削除されるため、旧Sessionが生き残る並行状態を独立に作った。実運用で常時到達できる画面とは断定しない |
| Native・Forbidden画面 | `tests/component/native/pr219-forbidden-native.test.tsx`：Nativeルートを実際の`NativeStatePanel`でrenderし、Native非対応文言とHome戻りを確認 | **新規Jest Native CI未確認**。これはコンポーネント検証であり、Android実機・エミュレータでのNavigationとは別 |
| Android実機/SQLite | Androidアプリの実機・エミュレータでの拒否メッセージ、戻る、Session、SQL DB前後、動画・スクリーンショット | **BLOCKED / 未実施**。Android SDK・ADB・エミュレータまたは実機・実行権限・Maestro成果物が必要 |

## 再開と権限境界

- SUT、既存Seed/Reset、正式仕様、既存製品テスト、CI定義はPR #219では一切変更しない。新規テストだけで実装側を再現する。
- リンク表示/DB不変は個別CIの固定HEAD・jobを確認後に追記する。Fixture内のDB内容やPassword Hashをログに転記しない。DB前後のdigestだけを比較する。
- Native文言は製品#210と分析#213へ証拠を渡し、正式な文言/導線は彼らの仕様採用判断に従う。変更許可なく#219で修正しない。
- **タスクリスト7番は未チェック**：Component/CIだけではAndroid実機拒否画面・SQLite不変を受入できない。実行できない理由を明示し、端末/ビルド/権限が揃った時に実施する。

## IndexedDB表別digestとKeyboard復帰の追補

- PR #219専用`e2e/web/pr219-cross-role-lifecycle.spec.ts`で、停止staffの旧Session残留Fixtureに対するIndexedDB全表の比較を、単一結合digestから**表名順の表別SHA-256**へ変更した。戻りリンクはFocus→EnterでForbiddenへ再遷移する経路を対象とし、全表の前後hashを`pr219-forbidden-indexeddb-digests`として`testInfo.attach`する。レコード実値・Password Hash・Session IDは添付しない。
- 変更コミット：[`a2f0ea9`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/a2f0ea9dabbbdec6c98135d61603132ade2a9fa9)。**新HEADのWeb E2E CIは未確認**。検証成功・DB不変を実証済みとは記載しない。加えて現行Web CIはcross-role成功時にPlaywright添付をArtifactへ保存しないため、証拠の永続化について[#199に引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6629144117)済み。
- Android実機のNavigation/拒否文言・SQLite実物の前後比較は未実行。タスク7・15はいずれも未チェックとする。
