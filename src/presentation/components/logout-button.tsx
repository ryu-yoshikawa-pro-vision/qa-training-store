import { useState } from "react";
import { useRouter } from "expo-router";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";

export function LogoutButton() {
  const { auth } = useApplicationServices();
  const { refreshIdentity } = useAppRuntime();
  const router = useRouter();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    if (isSubmitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await auth.logout();
      await refreshIdentity();
      router.replace("/");
    } catch {
      setError("ログアウトできませんでした。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="logout-control">
      <button
        type="button"
        className="button button--secondary"
        disabled={isSubmitting}
        onClick={() => void logout()}
      >
        {isSubmitting ? "処理中" : "ログアウト"}
      </button>
      {error !== null && (
        <p className="logout-control__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
