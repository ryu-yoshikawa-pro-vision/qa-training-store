import { Link } from "expo-router";
import { ProductCard } from "@/presentation/components/product-card";
import { ProductImage } from "@/presentation/components/product-image";
import { Icon, type IconName } from "@/presentation/components/icon";
import { StatePanel } from "@/presentation/components/states";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import { content } from "@/presentation/content/dictionary";

export function HomePage() {
  return (
    <RouteGuard access="public">
      <HomeContent />
    </RouteGuard>
  );
}

function HomeContent() {
  const { catalog } = useApplicationServices();
  const { value, error, retry } = useAsyncValue(() => catalog.getHome(), [catalog]);
  if (error !== null) {
    return (
      <StatePanel
        kind="error"
        action={
          <button className="button button--primary" onClick={retry}>
            再試行
          </button>
        }
      />
    );
  }
  if (value === null) {
    return <StatePanel kind="loading" />;
  }
  return (
    <div className="home-page">
      <section className="home-hero">
        <div>
          <p className="eyebrow">ECテスト自動化学習アプリ</p>
          <h1>決定的なシナリオで、確かなテストを。</h1>
          <p>商品検索から注文、管理操作までを安全な模擬環境で練習できます。</p>
          <div className="home-hero__actions">
            <Link href="/products" className="button button--primary">
              商品を見る
              <Icon name="arrow" size={18} />
            </Link>
            <Link href="/login" className="button button--secondary">
              会員としてはじめる
            </Link>
          </div>
        </div>
        <div className="home-hero__visual" aria-hidden="true">
          {value.newProducts.slice(0, 3).map((product, index) => (
            <ProductImage
              key={product.productId}
              src={product.primaryImage.path}
              alt=""
              className={`home-hero__product home-hero__product--${index + 1}`}
            />
          ))}
        </div>
      </section>
      <section className="benefit-bar" aria-label="安心して学べる理由">
        {(
          [
            ["truck", "配送フローを再現", "注文から配送完了まで確認"],
            ["shield", "安全な模擬決済", "実際の請求は発生しません"],
            ["refresh", "何度でもリセット", "同じ条件を決定的に再現"],
            ["support", "学習をサポート", "主要なEC操作を一通り練習"],
          ] as [IconName, string, string][]
        ).map(([icon, title, description]) => (
          <div className="benefit-bar__item" key={title}>
            <span className="benefit-bar__icon" aria-hidden="true">
              <Icon name={icon} size={22} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </div>
        ))}
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">カテゴリ</p>
            <h2>カテゴリから探す</h2>
          </div>
          <Link href="/products">すべての商品</Link>
        </div>
        <div className="category-grid">
          {value.categories.slice(0, 6).map((category) => (
            <Link
              href={`/categories/${category.categoryId}`}
              key={category.categoryId}
              className="category-card"
            >
              <span>
                {category.name}
                <Icon name="arrow" size={18} />
              </span>
              <small>{category.visibleProductCount}件</small>
            </Link>
          ))}
        </div>
      </section>
      <ProductSection
        eyebrow="おすすめ"
        title="おすすめ商品"
        products={value.newProducts.slice(0, 4)}
      />
      <ProductSection eyebrow="新着商品" title="新着商品" products={value.newProducts.slice(4)} />
      {value.saleProducts.length > 0 && (
        <ProductSection eyebrow="期間限定" title="セール商品" products={value.saleProducts} sale />
      )}
      <section className="membership-panel">
        <div>
          <p className="eyebrow">会員特典</p>
          <h2>会員ランクでお得に購入</h2>
        </div>
        <ul>
          <li>
            <strong>一般会員</strong> ¥5,000以上で送料無料
          </li>
          <li>
            <strong>ゴールド会員</strong> 商品価格から5%割引
          </li>
          <li>
            <strong>プラチナ会員</strong> 10%割引・いつでも送料無料
          </li>
        </ul>
      </section>
      <section className="home-learning-panel">
        <h2>これは学習用の模擬ストアです</h2>
        <p>{content.notice.training}</p>
        <Link href="/legal/commerce">模擬取引について詳しく見る</Link>
      </section>
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  products,
  sale = false,
}: {
  eyebrow: string;
  title: string;
  products: import("@/application/contracts").ProductListItem[];
  sale?: boolean;
}) {
  return (
    <section className={`home-section ${sale ? "home-section--sale" : ""}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link href={sale ? "/products?onSale=true" : "/products"}>一覧を見る</Link>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </section>
  );
}
