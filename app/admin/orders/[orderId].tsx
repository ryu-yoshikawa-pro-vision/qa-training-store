import { useLocalSearchParams } from "expo-router";
import { AdminOrderDetailPage } from "@/presentation/pages/admin-operations-pages";

export default function AdminOrderDetailRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return <AdminOrderDetailPage orderId={orderId} />;
}
