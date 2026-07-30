import { useLocalSearchParams } from "expo-router";
import { ProductDetailPage } from "@/presentation/pages/product-detail-page";

export default function ProductDetailRoute() {
  const params = useLocalSearchParams<{ productId: string }>();
  return <ProductDetailPage productId={params.productId} />;
}
