# 修復サマリー

## 入力

- レビュー指摘: repair-loop文書の停止条件の説明が不足
- evaluation result: `partial`
- allowed_files: docsとSkillのファイルだけ

## 反復1

- 入力された指摘: repair-loopの文言チェックに検証漏れ
- 修復計画: 不足していた停止条件と`allowed_files`の説明を追加
- 検証: docsの文言チェックが1回失敗したまま
- decision: `continue`

## 反復2

- 入力された指摘: 残っていた検証文言の不足だけ
- 修復計画: reference文書の文言をverify契約に合わせる
- 検証: 必須チェックが成功
- decision: `stop_success`

## 停止判断

- max iterationに達することなく、対象範囲を限定したworkflowを完了

## 残差

- none

## 検証

- `bash template/scripts/verify`
- 対象exampleのschema検証

## Evaluationとの対応

- 反復1は`iteration-1-evaluation.json`に対応
- 反復2は`iteration-2-evaluation.json`に対応
