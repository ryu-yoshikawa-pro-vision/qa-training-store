import { useLocalSearchParams } from "expo-router";
import { CatalogListPage } from "@/presentation/pages/catalog-list-page";

export default function CategoryRoute() {
  const params = useLocalSearchParams<{ categoryId: string }>();
  return <CatalogListPage mode="category" categoryId={params.categoryId} />;
}
