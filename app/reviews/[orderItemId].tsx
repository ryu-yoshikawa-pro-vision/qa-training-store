import { useLocalSearchParams } from "expo-router";
import { CustomerReviewPage } from "@/presentation/pages/review-user-pages";

export default function CustomerReviewRoute() {
  const { orderItemId } = useLocalSearchParams<{ orderItemId: string }>();
  return <CustomerReviewPage orderItemId={orderItemId} />;
}
