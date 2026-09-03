# Issue #89 FormErrorSummary focus 修正計画

## 0. 依頼概要

- 依頼内容: Invalid submit のたびに `FormErrorSummary` へ focus し、同時に validation error 後の入力値消失報告を調査する。
- 背景: 現在の summary は `errors.length` の変化だけを effect の再実行条件にしているため、同じ件数の error で再 submit した場合に focus が再実行されない。一方、入力中の error 件数変化でも focus を奪う可能性がある。
- 期待成果: Submit signal に基づく最小修正、回帰テスト、品質ゲート、commit / push / `main` 向け PR の完了。

## 1. ゴール / 完了条件

- ゴール: 新しい invalid submit のたびに、error 件数・内容が前回と同じでも summary へ focus する。
- 完了条件（DoD）:
  - 1件、同一1件、同数で内容変更、複数件の invalid submit を component test で保証する。
  - `focusOnMount={false}` と submit と無関係な rerender で focus を発生させない。
  - Signup / Login の実利用箇所が既存の submit signal を渡す。
  - role、tabIndex、message、summary link の既存仕様を維持する。
  - validation error 後の入力値保持を確認し、原因・修正有無を PR に記載する。
  - format、lint、typecheck、関連 component test、可能な全体 verify を実行する。
  - 指定 message で commit、指定 branch へ push、base `main` の PR 作成と確認を完了する。

## 2. 現状理解と前提

### Current understanding

- Entry points は `src/presentation/components/form-error-summary.tsx` と `src/presentation/pages/auth-pages.tsx` の Login / Signup である。
- `FormErrorSummary` は `errors.length` と `focusOnMount` を effect の依存にし、error が存在すれば focus している。
- Login / Signup は React Hook Form + Zod resolver を使い、`fieldErrors` は `formState.errors` から render ごとに組み立てている。
- React Hook Form には submit 回数を表す `formState.submitCount` が既にある。
- validation failure 時は `handleSubmit` の invalid callback が指定されておらず、valid callback は実行されない。Auth service 呼出し、router navigation、`reset()` は validation failure の経路にない。
- auth form の初期値は `defaultValues` で定義され、フォーム要素の `key` や条件付き remount はない。
- 既存 component test は jsdom の `toHaveFocus()` と summary link の確認を使っている。

### Assumptions

- React Hook Form の `submitCount` は form submit attempt ごとに更新され、invalid submit ではその更新と validation errors を同じ render state として観測できる。
- `focusOnMount` は既存の boolean opt-out として維持し、false の場合は初回・submit signal 更新のいずれでも programmatic focus をしない。
- `FormErrorSummary` を動的な error state とともに利用する呼び出し元は、submit signal を `focusTrigger` として渡す契約へ更新する。

### Non-goals

- validation rule、error 文言、Form library、UI library の変更。
- 最初の invalid field への focus など別の accessibility 仕様。
- Auth service、session、navigation、form architecture のリファクタリング。
- 入力値消失を再現できない場合の独立した設計変更。

## 3. repo mapping

### Entry points

- `src/presentation/components/form-error-summary.tsx`: focus と error link の共通 component。
- `src/presentation/pages/auth-pages.tsx`: production caller。Login / Signup が `useForm` と `formState.errors` を所有する。
- `tests/component/presentation-foundation.test.tsx`: summary の accessibility / focus 基盤テスト。
- `tests/component/auth-account-pages.test.tsx`: Login / Signup の submit と入力値保持を確認する component test。

### Main flow

1. User が Login / Signup を submit する。
2. React Hook Form が Zod resolver で validation し、`formState.errors` と `formState.submitCount` を更新する。
3. `fieldErrors` が summary へ渡される。invalid submit では `submitCount` を focus trigger として使う。
4. error があるときだけ summary を表示し、必要な signal 更新時に summary 自体へ focus する。
5. valid submit の場合は Auth service を呼び、成功後だけ identity refresh と route navigation を行う。

### Key abstractions

- React Hook Form の `formState.errors` / `submitCount`。
- Zod resolver による field validation。
- `FormErrorSummary` の `role="alert"`、`tabIndex={-1}`、field anchor link。

### Existing tests

- `presentation-foundation.test.tsx` が初回 focus と link を検証する。
- `auth-account-pages.test.tsx` が valid submit、Signup validation、入力制御を検証する。
- package scripts は `pnpm run test:component:web`、`pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run verify` を提供する。

### Safe change surface

- `form-error-summary.tsx`: submit signal を受け、signal 更新時だけ focus する条件を追加する。
- `auth-pages.tsx`: 既存 `formState.submitCount` を2つの caller から渡す。
- 既存の2つの component test: focus 回帰と入力値保持の証拠を追加する。

### Unknowns

- Issue の入力値消失報告は、Signup / Login の component test と実装では再現しなかった。`defaultValues`、reset、remount、key、navigation に原因となる処理はない。
- Browser 相当の component submit event で、同一 error 件数の再 submitに `submitCount` と summary focus が連動することを確認した。

## 4. 質問 / 曖昧性

- 必ず質問する不透明点: なし。既存の React Hook Form signal、対象 caller、base branch、commit / PR 形式が指定されている。
- 仮定してよい細部: `focusTrigger` を numeric な explicit signal とし、既存 prop の opt-out を維持する。テストは既存 Vitest / Testing Library convention に合わせる。
- 未回答の重要質問: なし。

## 5. 変更方針

- `focusTrigger: number` を `FormErrorSummary` の必要な入力として追加し、`errors.length` は「表示対象があるか」の判定だけに使う。
- component 内で最後に処理した trigger を ref に保持する。初回 mount または trigger が変わった場合だけ、`focusOnMount` が有効かつ error が存在するときに focus する。trigger更新とerror表示が別renderになっても取りこぼさないよう、errorが存在するまでtriggerを処理済みとして記録しない。
- error 件数・error 配列の参照・error 内容の変化だけでは focus しない。
- Login / Signup は `formState.submitCount` を `focusTrigger` として渡す。新しい invalid submit で同数 error でも trigger が変わるため再 focus できる。
- 初回 error 表示、同一1件の再 submit、同数内容変更、複数件、focus 無効、unrelated rerender を最小の component test で固定する。
- Signup の既存 validation test に入力値の保持 assertion を追加し、現象を再現できるかを同じ component layer で確認する。

## 6. 検証方法

### Validation plan

- `pnpm exec vitest run tests/component/presentation-foundation.test.tsx tests/component/auth-account-pages.test.tsx`
- `pnpm run test:component:web`
- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run verify`（上記と重複するが repository の正式 quality gate として実行）
- `git diff --check`
- commit 前後の `git branch --show-current`、`git status`、`git branch -vv`、remote branch / PR の read-only 確認。

### 成功判定

- focused component / auth tests が全件 PASS し、6つの focus 条件と入力値保持 assertion が成立する。
- format、lint、typecheck、verify が exit 0。既存 warning / skip は結果を隠さず記録する。
- 指定 branch 以外を変更せず、必要なファイルだけを commit する。
- push 後の PR が base `main`、head `fix/89-form-error-summary-focus`、日本語本文、Issue の `Closes` / `Refs` 判定を満たす。

## 7. リスクと未解決論点

- Risks:
  - `submitCount` は valid submit でも増えるため、focus 条件は必ず `errors.length > 0` と組み合わせる。
  - trigger を渡し忘れる caller があると動的 error の再 focus 契約を満たせないため、required prop で型上検出する。
  - jsdom の focus timing と React Hook Form の async resolver の順序により、テストは `findBy` / `waitFor` を使う。
- Open questions:
  - 現行 source / test からは validation error 時の reset / remount / navigation は確認できない。focused test 実行結果で入力値保持の再現可否を確定する。

## 8. 成果物

- 変更ファイル: `src/presentation/components/form-error-summary.tsx`、`src/presentation/pages/auth-pages.tsx`、関連 component tests、Run Artifact。
- 付随ドキュメント: 本計画書、active Run の PLAN / TASKS / REPORT、必要に応じて PROJECT_CONTEXT の事実更新。

## 9. 備考

- External CodeRabbit review は依頼されていないため起動しない。実装後は repo-local code-review 手順で self-review する。
