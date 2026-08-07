# Report

## 2026-08-07 10:08 JST

- Summary:
  - `main`から`agent/coding-standards`を作成した。
  - TypeScript、ESLint、Architecture Test、Application Use Case、SQLite Mapper、Native Test Mockを確認した。
  - 一般的な規約を増やすのではなく、実害を防ぐ規約へ絞る方針を確定した。
- Evidence:
  - `tsconfig.json`: `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`useUnknownInCatchVariables`
  - `eslint.config.js`: `no-explicit-any`、業務時刻の`Date.now()`禁止
  - `tests/contracts/architecture.test.ts`: Application／Infrastructure、Web／Native境界
  - `src/application/use-cases/cart-use-cases.ts`: nullableな実装依存と非nullアサーション
  - `src/infrastructure/database/sqlite/mappers.ts`: SQLite境界の型アサーション
  - `tests/component/native/native-cart-screen.test.tsx`: 部分Mockの`as never`
- Decisions:
  - 型定義は通常`type`へ統一する。
  - `interface`は宣言マージが必要な宣言ファイルへ限定する。
  - `as`全面禁止ではなく、検証を省略するアサーションを禁止する。
  - 大量Lint導入と既存コードの一括変換は行わない。
- Progress: 20% (2/10)

## 2026-08-07 10:16 JST

- Summary:
  - `docs/CODING_STANDARDS.md`を追加した。
  - `CONTRIBUTING.md`を追加した。
  - `CODE_REVIEW.md`へコーディング規約のReview観点を追加した。
  - 規約策定のHistoryを追加した。
- Changes:
  - `docs/CODING_STANDARDS.md`
  - `CONTRIBUTING.md`
  - `CODE_REVIEW.md`
  - `docs/history/2026-08-07_100800_coding-standards.md`
- Notes:
  - 規約は10章へ圧縮し、型、境界、状態、Architecture、Error、Testへ集中した。
  - UI Design、Run運用、ADR運用などは既存文書へ委譲した。
  - Lint候補は段階導入として記録し、本変更では有効化していない。
- Remaining:
  - Draft PR作成
  - GitHub Actions品質ゲート確認
  - 必要な修正と再検証
- Progress: 60% (6/10)
