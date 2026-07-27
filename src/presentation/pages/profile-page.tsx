import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import type { CurrentUserDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { StatePanel } from "@/presentation/components/states";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";

interface ProfileForm {
  displayName: string;
  phone: string;
}

export function ProfilePage() {
  return (
    <RouteGuard access="customer">
      <ProfileContent />
    </RouteGuard>
  );
}

function ProfileContent() {
  const { account, auth } = useApplicationServices();
  const { refreshIdentity } = useAppRuntime();
  const router = useRouter();
  const [profile, setProfile] = useState<CurrentUserDto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<ProfileForm>();
  useEffect(() => {
    void account
      .getProfile()
      .then((value) => {
        setProfile(value);
        reset({
          displayName: value.displayName,
          phone: value.phone ?? "",
        });
      })
      .catch(() => setLoadError(true));
  }, [account, reset]);
  if (loadError) {
    return <StatePanel kind="error" />;
  }
  if (profile === null) {
    return <StatePanel kind="loading" />;
  }
  return (
    <div className="account-page">
      <header className="account-page__header">
        <div>
          <p className="eyebrow">アカウント</p>
          <h1>Profile</h1>
          <p>{profile.email}</p>
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            void auth.logout().then(async () => {
              await refreshIdentity();
              router.replace("/login");
            });
          }}
        >
          Logout
        </button>
      </header>
      {message !== null && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <form
        className="account-form"
        onSubmit={handleSubmit(async (value) => {
          setMessage(null);
          try {
            const updated = await account.updateProfile({
              displayName: value.displayName,
              phone: value.phone || null,
              actionVersion: profile.actionVersion,
            });
            setProfile(updated);
            reset({
              displayName: updated.displayName,
              phone: updated.phone ?? "",
            });
            await refreshIdentity();
            setMessage("Profileを更新しました。");
          } catch (caught) {
            setMessage(
              caught instanceof ApplicationError && caught.code === "CONFLICT"
                ? "ほかの操作で更新されています。ページを再読み込みしてください。"
                : "Profileを更新できませんでした。",
            );
          }
        })}
      >
        <label htmlFor="displayName">表示名</label>
        <input id="displayName" maxLength={100} {...register("displayName", { required: true })} />
        <label htmlFor="phone">電話番号（任意）</label>
        <input id="phone" inputMode="tel" placeholder="09000000000" {...register("phone")} />
        <p className="field-help">配送連絡に使用するテスト用番号を入力してください。</p>
        <button type="submit" className="button button--primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "処理中" : "保存"}
        </button>
      </form>
    </div>
  );
}
