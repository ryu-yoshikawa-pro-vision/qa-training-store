# コーディング規約策定

## 背景

Scenario Shopでは、TypeScript Strict設定、Architecture Contract、Platform Dependency Check、Clock Portなどの重要な品質基準が既に存在していた。一方、日常的な型定義、型アサーション、非nullアサーション、外部データ検証、Test Mockの判断基準は複数の文書と実装へ分散していた。

一般的な規約を大量に導入するのではなく、実害を防ぎながら判断コストを下げる規約として整理した。

## 決定

- 通常の型定義は`type`へ統一する。
- `interface`はModule AugmentationやGlobal型拡張など、宣言マージが必要な宣言ファイルに限定する。
- `as`の全面禁止ではなく、検証を省略する型アサーションを禁止する。
- Productionコードの`as any`、`as never`、二重アサーションを原則禁止する。
- 非nullアサーションより、Early Return、Discriminated Union、完全な初期化を優先する。
- JSON、SQLite、Storage、Deep Link、環境変数などは境界で一度検証する。
- Union型、選択肢、型ガードは一つの正本から導出する。
- Errorは復旧、変換、情報追加、Cleanupを行う場合だけ捕捉する。
- 固定待機、Timeout延長、Assertion削除でTest失敗を隠さない。
- 規約は新規・変更コードから段階的に適用し、既存コードの一括変更は行わない。

## 文書構成

- `docs/CODING_STANDARDS.md`: コードの判断基準
- `CONTRIBUTING.md`: 開発時の参照順と検証入口
- `CODE_REVIEW.md`: Reviewで確認する規約項目

`AGENTS.md`は作業Workflow、`docs/PROJECT_CONTEXT.md`は現在の設計と運用前提を引き続き担当し、コーディング規約の詳細を重複記載しない。

## 自動検査

規約策定と同時に大量のLint Ruleを有効化しない。

既存コードへの影響を確認し、必要な修正を同じ変更内で完了できるものから、次を段階的に検討する。

- `@typescript-eslint/consistent-type-definitions`
- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-non-null-assertion`
- Exhaustiveな分岐の検査
- 未処理Promiseの検査

Complexity、関数行数、File行数、JSDoc、Import順の細かな強制は、具体的な問題が確認されるまで追加しない。

## 品質ゲートで判明した依存更新

Draft PRのNative CIでは、Format、Lint、Typecheck、Native Component、Repository Contract、Contract Test、Native Route Dependency、EAS Static Configまで成功した後、Expo Doctorだけが失敗した。

原因は、Expo SDK 57が要求するPatch Versionに対して、次の3 Packageが1 Patch古いことだった。

- `expo`: `57.0.10`から`57.0.11`
- `expo-build-properties`: `57.0.8`から`57.0.9`
- `expo-router`: `57.0.10`から`57.0.11`

品質ゲートを無効化したりExpo Doctorの対象外へ追加したりせず、要求Versionへ更新した。`pnpm-lock.yaml`はpnpm 9.10.0で再生成し、RepositoryのPrettier形式へ整形した。

Lockfile生成のために一時Workflowを使用したが、生成完了後に削除し、恒久的な自動コミット処理は残していない。
