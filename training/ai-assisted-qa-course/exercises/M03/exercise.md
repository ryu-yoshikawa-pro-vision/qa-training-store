# M03 実技：検証責務から条件・Caseへ

## 入力

M02提出物またはこのモジュールの別ID公開サンプル、Cart仕様、固定Skill revision `7cc6cba7772de549841a39d71694cbafbc783324`を使います。

## 手順

1. Authority、Product Risk、Scopeの実在ID・参照先・revisionを確認します。存在しないIDを作って埋めないでください。
2. 固定Skillの入力契約で `condition_structure(direct)` を実行し、未知キー、誤mode、未解決参照の失敗を区別します。
3. 技法runtimeが実際に選んだ技法を適用します。境界条件は仕様から導き、未指定の購入上限は未決に残します。
4. `materialize_coverage(artifact)`でcurrent CIを作り、Caseを生成してTR→TCN→CI→Case→BR/ACの参照を照合します。
5. `verify_runtime_evidence` の `valid=true` と同一artifact群の証拠を確認します。終了コード0やreadyだけでは合格にしません。

## 提出物

`workspace/M03/condition-design.md` と `workspace/M03/cases.md`。runtime証拠と意味上のレビューを分けます。必要Entityがない場合は、具体的欠落と停止点を記録し、fixture成功を統合PASSと報告しません。
