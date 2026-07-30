import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { UserAddress } from "@/domain/contracts";
import { ApplicationError } from "@/application/errors";
import { AccountNavigation } from "@/presentation/components/account-navigation";
import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { StatePanel } from "@/presentation/components/states";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";

interface AddressForm {
  label: string;
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  makeDefault: boolean;
}

const EMPTY_ADDRESS: AddressForm = {
  label: "",
  recipientName: "",
  postalCode: "",
  prefecture: "",
  city: "",
  addressLine1: "",
  addressLine2: "",
  phone: "",
  makeDefault: false,
};

export function AddressesPage() {
  return (
    <RouteGuard access="customer">
      <AddressesContent />
    </RouteGuard>
  );
}

function AddressesContent() {
  const { account } = useApplicationServices();
  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { register, handleSubmit, reset, getValues, setValue, formState } = useForm<AddressForm>({
    defaultValues: EMPTY_ADDRESS,
  });
  const reload = useCallback(async () => {
    setAddresses(await account.listAddresses());
  }, [account]);
  useEffect(() => {
    void reload().catch(() => setLoadError(true));
  }, [reload]);
  if (loadError) {
    return <StatePanel kind="error" />;
  }
  if (addresses === null) {
    return <StatePanel kind="loading" />;
  }
  const selectForEdit = (address: UserAddress) => {
    setEditing(address);
    reset({
      label: address.label,
      recipientName: address.recipientName,
      postalCode: address.postalCode,
      prefecture: address.prefecture,
      city: address.city,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      phone: address.phone,
      makeDefault: address.isDefault,
    });
    document.getElementById("address-form-title")?.focus();
  };
  return (
    <div className="account-page account-page--wide">
      <AccountNavigation current="addresses" />
      <header className="account-page__header">
        <div>
          <p className="eyebrow">アカウント</p>
          <h1>配送先管理</h1>
          <p>配送先は最大5件まで登録できます。</p>
        </div>
      </header>
      {message !== null && (
        <p
          className={message.tone === "success" ? "success-message" : "operation-error"}
          role={message.tone === "success" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}
      <div className="address-layout">
        <section aria-labelledby="address-list-title">
          <h2 id="address-list-title">登録済み配送先（{addresses.length}/5）</h2>
          {addresses.length === 0 ? (
            <StatePanel
              kind="empty"
              title="配送先が登録されていません"
              body="右のフォームから最初の配送先を登録してください。"
              action={null}
            />
          ) : (
            <div className="address-list">
              {addresses.map((address) => (
                <article className="address-card" key={address.id}>
                  <header>
                    <h3>{address.label}</h3>
                    {address.isDefault && (
                      <span className="status-badge status-badge--info">既定</span>
                    )}
                  </header>
                  <p>{address.recipientName}</p>
                  <p>
                    〒{address.postalCode} {address.prefecture}
                    {address.city}
                    {address.addressLine1}
                    {address.addressLine2}
                  </p>
                  <p>{address.phone}</p>
                  <div className="address-card__actions">
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => selectForEdit(address)}
                    >
                      編集
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        className="button button--tertiary"
                        onClick={() => {
                          void (async () => {
                            setMessage(null);
                            try {
                              await account.updateAddress({
                                ...address,
                                addressId: address.id,
                                expectedVersion: address.version,
                                makeDefault: true,
                              });
                              await reload();
                              setMessage({ text: "既定の配送先を変更しました。", tone: "success" });
                            } catch {
                              setMessage({
                                text: "既定の配送先を変更できませんでした。入力内容を確認してください。",
                                tone: "error",
                              });
                            }
                          })();
                        }}
                      >
                        既定にする
                      </button>
                    )}
                    <ConfirmDialog
                      triggerLabel="削除"
                      title={`${address.label}を削除しますか`}
                      confirmLabel="削除する"
                      danger
                      onConfirm={() => {
                        void (async () => {
                          setMessage(null);
                          try {
                            await account.deleteAddress({
                              addressId: address.id,
                              expectedVersion: address.version,
                            });
                            await reload();
                            setMessage({ text: "配送先を削除しました。", tone: "success" });
                          } catch {
                            setMessage({
                              text: "配送先を削除できませんでした。入力内容を確認してください。",
                              tone: "error",
                            });
                          }
                        })();
                      }}
                    >
                      既定の配送先を削除した場合は、残っている最も古い配送先が新しい既定になります。
                    </ConfirmDialog>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="address-form-panel">
          <h2 id="address-form-title" tabIndex={-1}>
            {editing === null ? "配送先を追加" : "配送先を編集"}
          </h2>
          <form
            className="account-form"
            onSubmit={handleSubmit(async (value) => {
              setMessage(null);
              try {
                const request = {
                  ...value,
                  addressLine2: value.addressLine2 || null,
                };
                if (editing === null) {
                  await account.createAddress(request);
                } else {
                  await account.updateAddress({
                    ...request,
                    addressId: editing.id,
                    expectedVersion: editing.version,
                  });
                }
                await reload();
                setEditing(null);
                reset(EMPTY_ADDRESS);
                setMessage({
                  text: editing === null ? "配送先を登録しました。" : "配送先を更新しました。",
                  tone: "success",
                });
              } catch (caught) {
                setMessage({
                  text:
                    caught instanceof ApplicationError && caught.messageKey === "addresses.limit"
                      ? "配送先は5件までです。"
                      : "配送先を保存できませんでした。入力内容を確認してください。",
                  tone: "error",
                });
              }
            })}
          >
            <label htmlFor="label">ラベル</label>
            <input id="label" maxLength={50} required {...register("label")} />
            <label htmlFor="recipientName">宛名</label>
            <input id="recipientName" maxLength={100} required {...register("recipientName")} />
            <label htmlFor="postalCode">郵便番号</label>
            <div className="inline-control">
              <input
                id="postalCode"
                inputMode="numeric"
                maxLength={8}
                required
                {...register("postalCode")}
              />
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  void (async () => {
                    setMessage(null);
                    try {
                      const suggestion = await account.suggestAddress(getValues("postalCode"));
                      if (suggestion !== null) {
                        setValue("prefecture", suggestion.prefecture);
                        setValue("city", suggestion.city);
                        setValue("addressLine1", suggestion.addressLine1);
                        setMessage({
                          text: "住所候補を入力しました。内容を確認して保存してください。",
                          tone: "success",
                        });
                      } else {
                        setMessage({
                          text: "この郵便番号の住所候補はありません。",
                          tone: "error",
                        });
                      }
                    } catch {
                      setMessage({
                        text: "住所候補を取得できませんでした。入力内容を確認してください。",
                        tone: "error",
                      });
                    }
                  })();
                }}
              >
                住所候補を利用
              </button>
            </div>
            <label htmlFor="prefecture">都道府県</label>
            <input id="prefecture" required {...register("prefecture")} />
            <label htmlFor="city">市区町村</label>
            <input id="city" required {...register("city")} />
            <label htmlFor="addressLine1">番地</label>
            <input id="addressLine1" required {...register("addressLine1")} />
            <label htmlFor="addressLine2">建物名・部屋番号（任意）</label>
            <input id="addressLine2" {...register("addressLine2")} />
            <label htmlFor="phone">電話番号</label>
            <input id="phone" inputMode="tel" required {...register("phone")} />
            <p className="field-help">配送連絡に使用します。</p>
            <label className="checkbox-field" htmlFor="makeDefault">
              <input id="makeDefault" type="checkbox" {...register("makeDefault")} />
              既定の配送先にする
            </label>
            <div className="form-actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={formState.isSubmitting || (editing === null && addresses.length >= 5)}
              >
                {formState.isSubmitting ? "処理中" : editing === null ? "登録する" : "更新する"}
              </button>
              {editing !== null && (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setEditing(null);
                    reset(EMPTY_ADDRESS);
                  }}
                >
                  編集をやめる
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
