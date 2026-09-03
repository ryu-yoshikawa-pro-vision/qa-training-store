# FormErrorSummary focus修正の履歴

## 2026-09-03

- `FormErrorSummary`が`errors.length`だけをeffectのsubmit signalとしていたため、同じ1件のvalidation errorで再submitしても`1 -> 1`となりfocus処理が再実行されない問題を確認した。
- React Hook Formの既存`formState.submitCount`を新しいinvalid submitのtriggerとして利用し、`focusTrigger`が初回または更新された場合だけsummaryへfocusするよう変更した。`errors`配列参照はdependencyに追加していない。
- Login／Signupの実submitフローと`defaultValues`、reset／remount／key／navigationを調査した。validation failure後の入力値消失は現行実装で再現せず、component testでも入力値保持を確認したため、独立したreset修正は行っていない。
