# Subagent Orchestration SSOT更新履歴

## 変更概要

- model／reasoning effortの正本を`.codex/config.toml`へ集約し、validator、dispatch ledger、collector、verify、contract testを現在値の固定比較から切り離した。
- agent TOMLの明示値は残し、validatorでParent configとの一致を検証する契約へ変更した。
- runtime modelはdispatch ledgerのexpected値とobserved値を比較し、reasoning effortはruntime未観測を許容しつつ、観測時だけ期待値と比較するようにした。
- Strict Run `20260812-095333-JST`でread-only 3並列とquality gate 5 actionを実行し、Run-local evidenceへ保存した。

## 判断

- 現在の`gpt-5.6-luna`／`max`は設定とagent TOMLに残る現行値であり、validatorやcollectorの固定比較対象ではない。
- 外部CIの状態はこのRunのローカル検証範囲外であるため、`MERGE_READY=false`を維持する。
