# ADR-0008: Native永続化Flowの個別実行とhydration証跡

- Status: Accepted
- Date: 2026-08-07
- Approved-by: user

## Context

Android CIではPersistence／Boundaryの複数Maestro Flowを1つのStepへ渡していたため、先頭Flowの失敗時に後続Flowの実行結果や、どのJUnit／Screenshot／HierarchyがどのFlowのものかを切り分けにくかった。また、再起動後Cartの待機が商品名や汎用的な数量文字列に依存し、Repositoryの読み込み完了と画面表示の境界が明示されていなかった。

## Decision

1. 現行の5 Flow（`native-restart-persistence`、`native-reset-dirty-state`、`native-out-of-stock`、`native-low-stock`、`native-purchase-limit`）をCIの個別Stepとして実行する。Stepごとに固有のJUnit名と`maestro-artifacts/<flow-name>/`を使う。
2. 各Stepはflow名、開始・終了時刻、結果、exit code、JUnit、Screenshot、Hierarchy、Maestro Outputのパスをログへ出す。Maestro失敗後もAndroid evidence収集を実行し、失敗証跡を上書きしない。
3. `NativeCartScreen`はCartの読み込み完了後に`native-persisted-state-ready`を表示し、badge countとproduct/variant由来のCart item・quantity testIDを提供する。MaestroはこれらのIDと値を検証する。
4. 再起動Flowの初回だけ`clearState: true`を使い、再起動側ではclearStateを指定せずStorageを保持する。失敗を隠すためのassertion削除、固定Sleep、skip、continue-on-errorは行わない。
5. SQLiteの低層契約では、1つ目のRepositoryで保存したCartを新しいRepositoryインスタンスから読み戻し、product ID、variant ID、quantityを検証する。

## Consequences

- Flow単位で失敗原因を`SETUP_FAILURE`、`PERSIST_WRITE_FAILURE`、`PERSIST_READ_FAILURE`、`HYDRATION_TIMING_FAILURE`、`ROUTE_FAILURE`、`SELECTOR_FAILURE`、`FLOW_ISOLATION_FAILURE`へ分類しやすくなる。
- 最初のFlowが失敗した場合、後続Flowはfail-fastで実行されなくても、完了済みFlowの固有証跡とAndroidの失敗診断は保存される。
- ローカルでもFlow名由来の個別出力を使える。共有用画像は`output/mobile-native/`、実行ごとの機械証跡は`.artifacts/native-local/<timestamp>/`に分ける。
