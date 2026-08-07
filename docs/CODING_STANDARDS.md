# コーディング規約

## 1. 目的

本規約は、Scenario Shopのコードを次の状態に保つための判断基準である。

- 型定義と実行時の値が一致している
- 不正な状態や依存関係を作りにくい
- Web、Native、Application、Domain、Infrastructureの責務が混在しない
- テストを安定して繰り返せる
- 人間とAIエージェントが同じ基準で実装・レビューできる

細かな書式や個人の好みではなく、正しさ、型安全性、保守性、テスト容易性を優先する。

## 2. 適用方針

- 新規コードと変更コードへ適用する。
- 本規約の導入だけを目的として、既存コードを一括変更しない。
- 変更対象の周辺に違反があっても、今回の変更に必要な範囲だけ修正する。
- 規約へ例外を追加する前に、同じ問題が繰り返し発生しているか確認する。
- 行数、関数数、コメント数などの一律制限は設けない。

## 3. 型定義

### 3.1 `type`へ統一する

通常の型定義には`type`を使用する。

対象には次を含む。

- Domain型
- DTO
- Application Port
- Repository Contract
- Dependency型
- React Props
- Test Fixture型

```ts
export type Clock = {
  now(): IsoDateTime;
};

export type ProductCardProps = {
  product: ProductDto;
  onSelect: (productId: string) => void;
};
```

`interface`は、Module AugmentationやGlobal型拡張など、TypeScriptの仕様上宣言マージが必要な宣言ファイルに限って使用する。

```ts
declare global {
  interface Window {
    scenarioShopTestApi: TestApi;
  }
}
```

既存の`interface`は、変更差分を不必要に広げない範囲で段階的に`type`へ移行する。

### 3.2 型は正本から導出する

Union型、選択肢、型ガードを別々に重複定義しない。

```ts
export const USER_ROLES = ["customer", "operator", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}
```

Role、Status、Scenario、Build Kind、Sort Order、Error Codeなどは、可能な限り一つの定義から導出する。

### 3.3 公開契約には戻り値型を記載する

次の関数には戻り値型を明記する。

- Application PortおよびRepository Contract
- 公開Use Case
- 境界Parser
- 外部公開API
- 型推論が複雑な関数

実装詳細の小さな関数は、型が明確に推論される場合は型注釈を省略してよい。

## 4. `any`、型アサーション、非nullアサーション

### 4.1 `any`を使用しない

型が不明な値は`unknown`として受け取り、利用前に絞り込む。

```ts
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
```

外部Libraryの型定義不備で避けられない場合は、Adapter内部へ影響範囲を限定する。

### 4.2 型アサーションで検証を省略しない

`as`は、TypeScriptが確認できない事実を実装側で保証できる場合だけ使用する。

許可する代表例は次のとおり。

- リテラル型を維持する`as const`
- 実行時検証後にTypeScriptの推論限界を補う局所的なアサーション
- 外部Libraryの不正確な型をAdapter境界で補正するアサーション

型適合の確認には`satisfies`を優先する。

```ts
const config = {
  buildKind: "automation",
  testMode: true,
} satisfies RuntimeConfig;
```

Productionコードでは、次を原則禁止する。

```ts
value as any;
value as never;
value as unknown as User;
JSON.parse(text) as RuntimeConfig;
```

Testコードでも、同じ型に対する強制的なアサーションが繰り返される場合は、必要なCapabilityだけを受け取る型またはTest Factoryへ置き換える。

### 4.3 非nullアサーションを使用しない

`value!`によって型エラーを消さない。

次を優先する。

- Early Return
- 条件分岐による型の絞り込み
- Discriminated Union
- Constructorでの完全な初期化
- nullableな依存関係を持たない状態設計

外部APIのCallbackが必ず実行されるなど、型で表現できない契約がある場合は、実行後のRuntime Checkを伴う局所的なDefinite Assignmentだけを例外として認める。

## 5. データ境界

### 5.1 外部値は境界で一度検証する

次の値は`unknown`または実際の取得型として受け取り、ApplicationやDomainへ渡す前に検証する。

- JSON
- SQLiteおよびIndexedDBの既存データ
- Storage
- Deep Link
- 環境変数
- User入力
- File内容
- 外部API Response

検証済みのApplication DTOやDomain型を、内部の各関数で繰り返し検証しない。

### 5.2 SQLite Rowを強制変換しない

次のような変換だけでDomain型を作らない。

```ts
role: row.role as UserRole;
id: String(row.id);
version: Number(row.version);
```

この実装は、`undefined`を`"undefined"`へ、不正数値を`NaN`へ変換し、不明なEnum値を通過させる。

Query結果には可能な限りRow型を指定し、Enumや制約値だけを小さなParserで検証する。

```ts
type UserRow = {
  id: string;
  role: string;
  version: number;
};

function parseUserRole(value: string): UserRole {
  if (isUserRole(value)) return value;
  throw new Error(`Invalid user role: ${value}`);
}
```

すべての内部データへ大規模なSchema Libraryを適用することは必須としない。小さな型ガードやParserで十分な場合は、単純な実装を選ぶ。

### 5.3 `JSON.parse`の結果を直接信用しない

```ts
const value: unknown = JSON.parse(text);
const config = parseRuntimeConfig(value);
```

小規模な内部検証Scriptでは、Parse直後に使用する全項目を`asserts`関数などで確認する場合に限り、局所的な型アサーションを認める。

## 6. 状態と依存関係

### 6.1 相関する状態はDiscriminated Unionで表現する

複数のPropertyの組み合わせで有効・無効が変わる場合、nullableなPropertyを並べない。

```ts
type RuntimeState =
  | { status: "loading" }
  | { status: "ready"; services: ApplicationServices }
  | { status: "error"; error: Error };
```

次のように不正な組み合わせを作れる形は避ける。

```ts
type RuntimeState = {
  loading: boolean;
  services: ApplicationServices | null;
  error: Error | null;
};
```

Gateway経路とRepository経路など、実装モードによって利用可能な依存が変わる場合も、`null`と`!`ではなくDiscriminated Unionで表現する。

### 6.2 Portは利用側が必要とする最小単位にする

Class全体を渡す必要がない場合は、専用の小さな型または`Pick`を使用する。

```ts
type ProductLoader = Pick<CatalogService, "getProductDetail">;
```

Testで巨大なService型を部分Mockする必要がある場合は、Production側の依存型が広すぎないか先に確認する。

## 7. レイヤーとPlatform

### 7.1 依存方向を維持する

```text
Presentation -> Application -> Domain
Infrastructure -> Application Port / Domain Contract
```

- DomainはApplication、Infrastructure、Presentationへ依存しない。
- ApplicationはInfrastructureの具象実装へ依存しない。
- InfrastructureはApplication PortまたはDomain Contractを実装する。
- PresentationはDatabaseやRepositoryを直接操作しない。
- 具象Adapterの生成と注入はComposition Rootで行う。

既存のArchitecture Contract Testを正本とし、同じ制約を文書だけで重複管理しない。

### 7.2 WebとNativeを混在させない

Native Entry Pointから次を参照しない。

- Dexie、IndexedDB
- `window`、`document`
- `localStorage`、`sessionStorage`
- CSS
- React Aria
- `.web` Module

WebからNative専用Moduleを直接参照しない。

Platform固有実装には`.web.ts(x)`または`.native.ts(x)`を使用し、共通化するのはDomain、Application Contract、Design Token、Validation、純粋関数などPlatform非依存部分に限定する。

## 8. Errorと非同期処理

### 8.1 Errorは目的がある場合だけ捕捉する

`catch`は次のいずれかを行う場合に限る。

- 復旧
- Application Errorへの変換
- 文脈情報の追加
- Cleanup

単に同じErrorを再throwするだけの`catch`や、空の`catch`は書かない。

想定された業務Errorは`ApplicationError`へ変換し、Infrastructure固有のErrorや内部MessageをPresentationへ直接公開しない。

### 8.2 Promiseを放置しない

Promiseは`await`するか、待たない理由と失敗処理を明示する。

```ts
void sendTelemetry().catch(reportTelemetryError);
```

依存関係のない処理だけを`Promise.all`で並列化する。同じStateやTransactionを更新する処理を安易に並列化しない。

### 8.3 固定待機を使用しない

ApplicationおよびTestで、状態確認の代わりに固定時間を待たない。

状態、Event、表示、Network、Signalなど、完了条件を待つ。

## 9. Test

- Domain RuleはUnit Test、Use CaseはIntegration Test、Repository共通契約はRepository Contract Test、User JourneyはPlaywrightまたはMaestroで検証する。
- 同じ振る舞いを全層で重複して検証しない。
- MapperやParserは正常値だけでなく、欠損、不明なEnum、不正数値、`null`、境界値を検証する。
- Mockの呼び出し回数だけで利用者に見える結果の検証を代替しない。
- 同じTest Data生成や部分Mockが繰り返された場合にだけFactoryを追加する。先回りして汎用Factoryを増やさない。
- Testを通すためだけにTimeout延長、固定待機、Assertion削除、Skip、Allow Failure、無制限Retryを追加しない。
- 実行していない検証を成功と記録しない。

## 10. 自動検査と例外

### 10.1 自動検査

現在のTypeScript Strict設定、ESLint、Architecture Contract、Platform Dependency Check、Test、Buildを品質ゲートの正本とする。

規約の導入だけを理由に、大量のLint Ruleを一度に有効化しない。

追加候補は、既存コードへの影響を確認し、必要な修正を同じ変更内で完了できる場合に限り段階的に導入する。

- `@typescript-eslint/consistent-type-definitions`: `type`
- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-non-null-assertion`
- Exhaustiveな分岐の検査
- 未処理Promiseの検査

Complexity、関数行数、File行数、JSDoc、Import順の細かな強制は、具体的な問題が確認されるまで追加しない。

Markdown文書の構造・品質は、リポジトリ直下の`.markdownlint-cli2.jsonc`を正本とし、`pnpm run lint:markdown`で検査する。ルールの細則は本書へ重複記載しない。

### 10.2 例外

Libraryの型定義やPlatform APIの制約により規約を適用できない場合は、次を満たす局所的な例外を認める。

1. 代替手段を検討している
2. 影響範囲がAdapterまたは境界へ限定されている
3. 危険な型がApplicationやDomainへ伝播しない
4. 必要なRuntime ValidationまたはTestがある
5. コードまたはレビューから理由を判断できる

規約を守るためだけに、例外より複雑なWrapperや抽象化を追加しない。

## Review Checklist

レビューでは、変更差分について次を確認する。

- 新規の型定義が`type`で記述されているか
- `as`や`!`で設計・検証不足を隠していないか
- 外部値が検証されずApplicationやDomainへ入っていないか
- 相関する状態がnullableなPropertyの組み合わせになっていないか
- 型、選択肢、型ガードの正本が重複していないか
- ApplicationがInfrastructureへ依存していないか
- WebとNativeの依存が混在していないか
- Errorを捕捉する目的が明確か
- 固定待機、Timeout延長、Assertionの弱体化で問題を隠していないか
- 今回の変更に必要のない抽象化や規約対応を追加していないか

単なる好み、同等な別表現、変更と無関係な既存問題は必須修正として扱わない。
