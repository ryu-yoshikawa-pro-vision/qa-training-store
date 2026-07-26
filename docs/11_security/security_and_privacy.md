# Security・Privacy設計

## 1. 前提

Authentication、Authorization、Paymentは学習用疑似実装です。Browser DBを利用者が変更できるため、本物のSecurity Boundaryではありません。

## 2. 利用者表示

全画面ではHeaderの「テスト環境」Badgeで環境を明示します。Login、Signup、Cart、Checkoutでは次の注意を本文内へ再掲します。

- 実取引なし
- 実在氏名・住所・電話・Card情報を入力しない
- DataはBrowser内に保存され、ResetやBrowser Data削除で消失する

## 3. Authentication・Authorization

- Passwordを平文保存しない。
- Current Session IDだけをLocal Storageへ保存する。
- Use CaseでRole、Account Status、Ownership、Membership Rankを確認する。
- operator/adminは購入不可。
- 最後のactive adminを保護する。
- UI非表示だけをAuthorizationとしない。

## 3.1 Password Hash

- `PasswordHasher` Portを経由し、Web Crypto APIのPBKDF2-SHA-256を使用する。
- 反復回数210,000、Salt 16byte、派生Key 32byteとする。
- 保存形式は`pbkdf2-sha256$210000$saltBase64$hashBase64`へ固定する。
- Seed Hashも同じFormatでBuild時に生成する。
- Password、Salt生成前の平文、PasswordHashをLog・Artifactへ出力しない。
- Local疑似認証であり、本物のServer認証・Credential保護を再現するものではない。

## 4. 入力・XSS

- `dangerouslySetInnerHTML`を使用しない。
- 商品説明、Review、Policy本文をTextとして表示する。
- Query、Route Parameter、File名をValidationする。
- URLから任意外部ResourceをFetchしない。

## 5. Image・GitHub

- 商品画像BinaryはGitHub Repository内の静的Assetだけを使用し、Cloudflare Pagesから同一Originで配信する。
- PNG/JPEG/WebP、1枚500KB以下、Product関連付け最大3枚。SVGと外部URL画像は対象外。
- Manifest生成時にMIME、拡張子、容量、Hash、Pathを検証し、読込失敗時はPlaceholderを表示する。
- GitHub PAT、OAuth Token、Deploy KeyをFrontend Bundle、Local Storage、IndexedDB、Test Artifactへ含めない。
- 管理UIからGitHub APIへのUpload・上書き・削除を行わない。

## 6. Test API

- Automation Buildだけに含める。
- 書込み可能操作はReset、Scenario Seed、Clock、Payment Delayだけとする。
- 読取り可能操作はMetadataと、Entity IDを1件指定して固定形式DTOを返すOrder、Variant、Review Summary Inspectionだけとする。
- 任意Table、任意Query、任意条件、任意Entity書換え、任意File Path、任意Script、外部URL Fetchを提供しない。
- Inspection DTOにはPassword Hash、Session ID、住所全文、電話番号全文、内部Repository Objectを含めない。
- 全画面へ小さなTEST MODE Badgeを表示し、入力・購入画面では詳細注意を再掲する。

## 7. Log Mask

Password、PasswordHash、Session ID、住所全文、電話番号全文をConsoleやArtifactへ出力しません。Order Number、User ID、Error Codeを使用します。

Phase 1では永続Runtime Ring Bufferと詳細Audit Logを作りません。

## 8. 外部通信

RuntimeでAnalytics、Error SaaS、外部CDN、外部Payment、外部業務API、GitHub APIを使用しません。Cloudflare PagesからAppと商品画像Assetを取得する通信だけが発生します。

## 9. Phase 1 Threat Scenario

- Route直接AccessによるRole/Ownership違反
- Rank不足商品への直接Access
- XSS文字列を含む商品名・Review
- Image Manifest改ざん、MIME/Hash不一致
- GitHub CredentialのFrontend混入
- Test APIの想定外操作
- Local Storage Sessionが存在しないUserを指す状態

Payment Unknown二重試行、Import汚染、Public Bundle混入はPhase 3です。
