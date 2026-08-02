import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import type { CurrentUserDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { AccountNavigation } from "@/presentation/components/account-navigation";
import { StatePanel } from "@/presentation/components/states";
import { LogoutButton } from "@/presentation/components/logout-button";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { FREE_SHIPPING_THRESHOLD, membershipDiscountRate } from "@/domain/services/pricing";
import { labels } from "@/presentation/content/dictionary";

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
  const { account } = useApplicationServices();
  const { refreshIdentity } = useAppRuntime();
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
      <AccountNavigation current="profile" />
      <header className="account-page__header">
        <div>
          <p className="eyebrow">アカウント</p>
          <h1>プロフィール</h1>
          <p>{profile.email}</p>
        </div>
        <LogoutButton />
      </header>
      {message !== null && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <section className="account-benefit-summary" aria-labelledby="account-benefit-title">
        <div className="split-heading">
          <h2 id="account-benefit-title">会員ランクと特典</h2>
          <Link href="/guide">学習Guideで詳しく見る</Link>
        </div>
        <dl className="definition-grid">
          <dt>アカウント状態</dt>
          <dd>{labels.account(profile.accountStatus)}</dd>
          <dt>会員ランク</dt>
          <dd>{profile.membershipRank === null ? "—" : labels.rank(profile.membershipRank)}</dd>
          <dt>会員割引</dt>
          <dd>{Math.round(membershipDiscountRate(profile.membershipRank) * 100)}%</dd>
          <dt>送料特典</dt>
          <dd>
            {profile.membershipRank === "platinum"
              ? "いつでも送料無料"
              : `商品小計${FREE_SHIPPING_THRESHOLD.toLocaleString("ja-JP")}円以上で送料無料`}
          </dd>
        </dl>
      </section>
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
            setMessage("プロフィールを更新しました。");
          } catch (caught) {
            setMessage(
              caught instanceof ApplicationError && caught.code === "CONFLICT"
                ? "ほかの操作で更新されています。ページを再読み込みしてください。"
                : "プロフィールを更新できませんでした。",
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
