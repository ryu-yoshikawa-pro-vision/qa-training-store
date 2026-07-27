import { LegalPage } from "@/presentation/pages/legal-page";

export default function CommerceRoute() {
  return (
    <LegalPage title="模擬取引表示">
      <dl className="legal-definition-list">
        <div>
          <dt>事業者名</dt>
          <dd>Scenario Shop（架空）</dd>
        </div>
        <div>
          <dt>販売価格</dt>
          <dd>各商品画面にテスト用の日本円表示</dd>
        </div>
        <div>
          <dt>支払方法</dt>
          <dd>Local Mock Paymentのみ。実際の請求は発生しません。</dd>
        </div>
        <div>
          <dt>配送</dt>
          <dd>画面上の模擬状態変更のみ。実際の配送は行いません。</dd>
        </div>
      </dl>
    </LegalPage>
  );
}
