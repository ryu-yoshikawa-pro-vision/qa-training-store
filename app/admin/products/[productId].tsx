import { useLocalSearchParams } from "expo-router";
import { AdminProductEditPage } from "@/presentation/pages/admin-product-pages";

export default function AdminProductEditRoute() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  return <AdminProductEditPage productId={productId} />;
}
