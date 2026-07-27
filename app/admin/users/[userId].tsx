import { useLocalSearchParams } from "expo-router";
import { AdminUserDetailPage } from "@/presentation/pages/review-user-pages";

export default function AdminUserDetailRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <AdminUserDetailPage userId={userId} />;
}
