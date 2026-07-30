import { LegalPage } from "@/presentation/pages/legal-page";

export default function PrivacyRoute() {
  return (
    <LegalPage title="プライバシーポリシー">
      <h2>保存する情報</h2>
      <p>入力内容はテスト用ブラウザのIndexedDBにのみ保存します。外部Serverへ送信しません。</p>
      <h2>入力時の注意</h2>
      <p>
        氏名、住所、電話番号、Emailはすべて架空の値を使用し、実在する個人情報を入力しないでください。
      </p>
      <h2>削除</h2>
      <p>テスト制御のResetにより、保存済みデータを初期状態へ戻せます。</p>
    </LegalPage>
  );
}
