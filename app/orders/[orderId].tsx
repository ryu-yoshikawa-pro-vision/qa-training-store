import { useLocalSearchParams } from "expo-router";
import { OrderDetailPage } from "@/presentation/pages/checkout-order-pages";

export default function OrderDetailRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return <OrderDetailPage orderId={orderId} />;
}
