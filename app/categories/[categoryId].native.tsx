import { useLocalSearchParams } from "expo-router";
import { NativeCatalogScreen } from "@/presentation/native-route";
export default function NativeCategoryRoute() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  return <NativeCatalogScreen categoryId={categoryId} />;
}
