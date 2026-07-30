import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { StatePanel } from "@/presentation/components/states";
import { Link } from "expo-router";

export default function ForbiddenRoute() {
  const { currentUser } = useAppRuntime();
  const adminLink =
    currentUser?.role === "operator" || currentUser?.role === "admin" ? (
      <Link href="/admin" className="button button--primary">
        管理画面へ
      </Link>
    ) : undefined;
  return <StatePanel kind="forbidden" action={adminLink} />;
}
