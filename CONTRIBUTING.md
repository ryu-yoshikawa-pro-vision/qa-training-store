# Contributing

Scenario Shopへ変更を加えるときの最小限の入口をまとめる。

## 最初に確認する文書

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)
3. [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md)
4. 変更領域に関係する[`docs/adr/`](./docs/adr/)
5. Review時は[`CODE_REVIEW.md`](./CODE_REVIEW.md)

`AGENTS.md`は作業手順、`PROJECT_CONTEXT.md`は現在の設計と運用前提、`CODING_STANDARDS.md`はコードの判断基準を扱う。内容が重複する場合は、より具体的な領域の文書を優先する。

## 基本方針

- 新規コードと変更コードへコーディング規約を適用する。
- 規約導入だけを目的とした既存コードの一括変更は行わない。
- 差分を必要な範囲へ限定し、無関係なRefactorを混ぜない。
- 既存のArchitecture ContractとPlatform Dependency Checkを維持する。
- 実行していない検証を成功と記録しない。

## Issue / Pull Request / Security

- Bug report は [Bug report Issue Form](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=bug_report.yml) を使用する。
- Feature request は [Feature request Issue Form](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=feature_request.yml) を使用する。
- Pull Request は [Pull Request Template](./.github/pull_request_template.md) を使用し、検証結果と Scope / Constraints を記載する。
- Security vulnerability は Public Issue / Pull Request に投稿せず、[`SECURITY.md`](./SECURITY.md) の GitHub Private Vulnerability Reporting を使用する。

## Dependency / Workflow Changes

- Dependency version update には、既知脆弱性、EOL / Support 終了、互換性問題、計画済み基盤更新、新機能のいずれかの理由を記載する。新しいという理由だけで更新しない。
- GitHub Actions の remote `uses:` は full-length commit SHA へ pin し、変更時に official source、release tag、Security Advisory を確認する。
- Dependency Version Updates や独自の自動更新運用は、この Repository では有効化しない。
- Pull Request の作成は、Repository の collaborators-only policy に従う。

## 実装前

- 変更対象のEntry Point、依存方向、既存Testを確認する。
- 外部値、Storage、SQLite、Deep Link、環境変数を扱う場合は、検証境界を先に決める。
- WebとNativeのどちらへ影響するかを明確にする。
- 複雑な変更では、`PLANS.md`とrepo-local planning skillに従って計画を保存する。

## 実装時

特に次を確認する。

- 通常の型定義は`type`を使用しているか
- `as`や`!`で型エラーを隠していないか
- 相関する状態をDiscriminated Unionで表現できないか
- 型、選択肢、型ガードの正本が重複していないか
- ApplicationがInfrastructureの具象実装へ依存していないか
- Platform固有依存が共通Moduleへ漏れていないか
- Errorを捕捉する目的が明確か
- Testを通すためだけの固定待機やTimeout延長を追加していないか

詳細は[`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md)を参照する。

## 検証

変更内容に応じて必要な検証を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build:web
```

Markdown文書を変更した場合は、通常の品質検証に加えて`pnpm run lint:markdown`を実行する。`pnpm run verify`にも同じMarkdown品質ゲートが含まれる。

全体検証の標準入口は次とする。

```bash
pnpm run verify
```

Platform固有変更では、対象に応じてWeb E2E、Accessibility、Native Component Test、SQLite Contract、Android／iOS Local Build、Maestroも実行する。

環境上実行できない検証がある場合は、未実行項目、理由、残るRiskを報告する。

## Review

Reviewは[`CODE_REVIEW.md`](./CODE_REVIEW.md)へ従う。

- 差分に起因する問題だけをFindingとして扱う。
- 単なる好みや同等な別表現を必須修正にしない。
- 規約違反であっても、実害がなく変更範囲外の既存問題は別対応として切り分ける。
- 修正案は最小差分を優先する。
