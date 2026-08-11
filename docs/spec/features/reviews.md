# Reviews

## Purpose / Scope

Delivered注文のCustomer Review eligibility、投稿・編集・削除、公開/非公開状態、Product Summaryを定義します。

## Business Rules

### BR-REVIEW-001 — Delivered注文の本人明細だけがReview対象になる

Customer本人のdelivered Order Itemに対して1件だけ作成でき、削除後も同じOrder Itemへ再投稿できません。

### BR-REVIEW-002 — Review状態とProduct Summaryを一貫して更新する

publishedだけを商品表示へ集計し、hiddenは再公開操作まで非表示、deletedは終端とします。編集は状態を自動変更しません。

## UI / Behavior Contract

Customerは本人Reviewの評価、Title、本文、Status、Versionを編集できます。Adminは公開/非公開を管理できます。削除済みを編集・再投稿できるUIを表示しません。

## Acceptance Criteria

### Criteria

#### AC-REVIEW-001 — Review Eligibilityを制限する

Related BR: `BR-REVIEW-001`

未配達、他人、既存Review、削除済みの明細が投稿対象にならず、delivered本人明細だけが一度投稿できます。

#### AC-REVIEW-002 — 公開集計と状態遷移を分ける

Related BR: `BR-REVIEW-002`

published/hidden/deletedの表示、編集、Admin操作、Product Summaryの件数・平均・分布が一致します。

## Executable Canonical Sources

- `src/application/use-cases/review-user-use-cases.ts`
- `src/application/use-cases/customer-review-state.ts`
- `src/domain/policies/state-transitions.ts`
- `app/reviews/`, `app/admin/reviews.tsx`
