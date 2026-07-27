import { LegalPage } from "@/presentation/pages/legal-page";

export default function TermsRoute() {
  return (
    <LegalPage title="利用規約">
      <h2>第1条（学習目的）</h2>
      <p>
        Scenario Shopは、ECサイトのテスト自動化を学ぶための模擬サービスです。
        実際の商品販売、決済、配送は行いません。
      </p>
      <h2>第2条（禁止事項）</h2>
      <p>
        実在する個人情報や決済情報を入力しないでください。学習環境の妨害につながる操作も禁止します。
      </p>
      <h2>第3条（データ）</h2>
      <p>登録したデータはブラウザ内に保存され、シナリオResetによって削除されます。</p>
    </LegalPage>
  );
}
