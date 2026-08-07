# Plan

## Objective
- PR #9に残る指定2点だけを、根拠を確認したうえで最小修正する。

## Scope
- In:
  - `AGENTS.md`のREPORT.md Append-only安全性例外を`docs/reference/repair-loop.md`と一致させる。
  - `tests/component/native/native-cart-screen.test.tsx`のretry非同期待機を修正する。
  - `tests/setup.native.ts`へact環境設定を追加する必要性を、再現結果に基づき判断する。
  - Productionコードは実バグの再現証拠がある場合だけ対象とする。
  - `.codex/runs/20260807-225845-JST/`の標準Run Artifactを更新する。
- Out:
  - Maestro Flow、Android wrapper、Sanitizer本体、GitHub Actions、Native Persistence、SQLite、依存関係、Markdownlint、テンプレート、Action SHA、cleanup/retention。
  - Git操作、Workflow再実行、固定sleep、timeout延長、skip、弱いAssertion、理由のないProduction変更。

## Assumptions
- （不明点があれば明示）

## Questions / Ambiguity
- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses
- H1: retry後の最終UIAssertionだけでは2回目の`getCart()`とPromise解決の境界が曖昧で、呼び出し回数を先に待つことで非決定性が解消する。
- H2: `act(...)` warningはNative Jest環境設定不足の可能性があるが、再現結果と依存ライブラリの挙動で必要性を確認してから変更する。
- H3: `NativeCartScreen`のProduction実装は、retryで`load()`を再実行する構造を持つため、実バグを再現できない限り変更不要である。

## Research Plan
- Round 1 Query: CI失敗条件、現行テスト、setup、Jest設定、Productionのload/retryを確認し、原因候補を分類する。
- Round 2 Query: focused test、5回連続、Native Component全体で候補を検証し、必要最小限の修正を選ぶ。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- まずAppend-only契約を修正し、Native retryの現状を実行で再現する。次にテスト同期を最小修正し、setup追加の要否を確認する。Focused validationから全品質ゲートへ進み、最後にRun ArtifactをSanitizerでWrite + Checkする。
- 標準フロー: `PLAN -> repo調査/委譲 -> TASKS -> 修正 -> focused validation -> 全品質ゲート -> REPORT`

## Definition of Done
- `AGENTS.md`と`docs/reference/repair-loop.md`のAppend-only例外が一致し、Credential Redaction等を例外に含めない。
- retry test単体、5回連続、Native Component全体、format、contracts、verify、diff checkがPASSする。
- Productionコードを根拠なく変更せず、禁止されたsleep/timeout/skip等を使わない。
- Current RunのSanitizer Write + CheckがPASSし、Git操作をしていない。

## Risks / Unknowns
- リスクと対策

## Thinking Log
- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-08-07 22:58 JST: `docs/reference/repair-loop.md`はPath Token化だけを例外とする正本になっており、`AGENTS.md`だけがCredential Redaction等を広く許可しているため、契約不一致はmust_fixと判断した。
- 2026-08-07 22:58 JST: Native retryはProduction側でretry時に`load()`を呼ぶ構造を確認した。まずテストの呼び出し回数待ちと実行結果で原因を確定し、Production変更は保留した。
- 2026-08-07 23:06 JST: focused testでretry操作後だけact warningが再現し、`await act(async () => fireEvent.press(...))`追加後は同テストでwarningが消えた。Jest presetがact環境フラグを既に設定しているため、`tests/setup.native.ts`は変更しない。
- 2026-08-07 23:07 JST: Native Component全体は10 suites / 27 tests PASS。残るact warningは`native-runtime-provider.test.tsx`の非同期初期化state更新であり、今回のretry差分とは因果関係がないため、ユーザー指定の範囲拡大を避けて変更しない。
- 2026-08-07 23:17 JST: 指定されたfocused validation、Native Component全体、format、contracts、verify、diff checkがすべて終了コード0。verifyの64 lint warningとNative runtime providerのact warningは既存・非対象として記録し、追加修正は行わない。
- 2026-08-07 23:18 JST: Current Run SanitizerのWrite + CheckがPASS（4 files、変更0、残存0）。完了条件を満たしたためstop_successとする。
