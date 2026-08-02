import { useState } from "react";
import { Link, useRouter, type Href } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApplicationError } from "@/application/errors";
import { content } from "@/presentation/content/dictionary";
import { FormErrorSummary } from "@/presentation/components/form-error-summary";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import {
  createCartMergeNotice,
  writeOneTimeNotice,
} from "@/presentation/browser/one-time-notice.web";
import {
  defaultLoginDestination,
  resolveCustomerLoginDestination,
} from "@/presentation/browser/return-to.web";

const loginSchema = z.object({
  email: z.email("メールアドレスの形式で入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

const signupSchema = z
  .object({
    email: z.email("メールアドレスの形式で入力してください"),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .max(72, "パスワードは72文字以下で入力してください"),
    confirmation: z.string(),
    displayName: z
      .string()
      .trim()
      .min(1, "表示名を入力してください")
      .max(100, "表示名は100文字以下で入力してください"),
    noticeAccepted: z.boolean().refine((value) => value, "学習用環境の注意事項を確認してください"),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "確認用パスワードが一致しません",
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

function currentReturnTo(): string | string[] | undefined {
  if (typeof window === "undefined") return undefined;
  const values = new URL(window.location.href).searchParams.getAll("returnTo");
  return values.length === 1 ? values[0] : values.length > 1 ? values : undefined;
}

function useAuthError() {
  const [operationError, setOperationError] = useState<string | null>(null);
  return {
    operationError,
    clear: () => setOperationError(null),
    capture: (caught: unknown) => {
      if (caught instanceof ApplicationError) {
        const messages: Partial<Record<ApplicationError["code"], string>> = {
          AUTHENTICATION_FAILED: "メールアドレスまたはパスワードが正しくありません。",
          ACCOUNT_SUSPENDED: "このアカウントは利用停止中です。管理者へ確認してください。",
          ACCOUNT_WITHDRAWN: "このアカウントは退会済みです。",
          EMAIL_ALREADY_EXISTS: "このメールアドレスはすでに登録されています。",
          STORAGE_WRITE_FAILED:
            "ブラウザへログイン状態を保存できませんでした。設定を確認してください。",
          STORAGE_READ_FAILED:
            "ブラウザからログイン状態を読み込めませんでした。設定を確認してください。",
          LOGIN_TRANSACTION_FAILED:
            "ログイン処理を完了できませんでした。カートは変更されていません。",
        };
        setOperationError(messages[caught.code] ?? "処理を完了できませんでした。");
      } else {
        setOperationError("予期しないエラーが発生しました。");
      }
    },
  };
}

export function LoginPage() {
  const { auth, checkout } = useApplicationServices();
  const { refreshIdentity } = useAppRuntime();
  const router = useRouter();
  const authError = useAuthError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const fieldErrors = Object.entries(errors).flatMap(([fieldId, error]) =>
    error.message === undefined ? [] : [{ fieldId, message: error.message }],
  );
  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">アカウント</p>
        <h1>ログイン</h1>
        <p>注文履歴や購入手続きを利用するにはログインしてください。</p>
        <div className="training-notice" role="note">
          <strong>学習用環境です</strong>
          <p>{content.notice.personalData}</p>
        </div>
        {authError.operationError !== null && (
          <div className="operation-error" role="alert">
            {authError.operationError}
          </div>
        )}
        <FormErrorSummary errors={fieldErrors} />
        <form
          onSubmit={handleSubmit(async (value) => {
            authError.clear();
            try {
              const result = await auth.login(value);
              const requestedReturnTo = currentReturnTo();
              let destination:
                | "/"
                | "/admin"
                | "/cart"
                | "/checkout/address"
                | "/checkout/payment"
                | "/checkout/confirm";
              if (result.user.role === "customer") {
                const customerDestination = await resolveCustomerLoginDestination(
                  requestedReturnTo,
                  async (step) => {
                    try {
                      await checkout.getActive(step);
                      return true;
                    } catch (caught) {
                      if (
                        caught instanceof ApplicationError &&
                        (caught.code === "CHECKOUT_STEP_INCOMPLETE" ||
                          caught.code === "CHECKOUT_EXPIRED" ||
                          caught.code === "CART_VERSION_CHANGED")
                      ) {
                        return false;
                      }
                      throw caught;
                    }
                  },
                );
                const notice = createCartMergeNotice(result.cartMerge, customerDestination);
                destination = notice?.targetPath ?? customerDestination;
                if (notice !== null) writeOneTimeNotice(notice);
              } else if (result.user.role === "operator" || result.user.role === "admin") {
                destination = defaultLoginDestination(result.user.role);
              } else {
                destination = "/";
              }
              await refreshIdentity();
              router.replace(destination as Href);
            } catch (caught) {
              authError.capture(caught);
            }
          })}
          noValidate
        >
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            aria-invalid={errors.email !== undefined}
            {...register("email")}
          />
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            {...register("password")}
          />
          <button
            className="button button--primary auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "処理中" : "ログイン"}
          </button>
        </form>
        <p>
          初めて利用する場合は<Link href="/signup">新規登録</Link>
        </p>
        <p>
          固定アカウント、Role、シナリオの説明は<Link href="/guide">学習Guide</Link>
          で確認できます。
        </p>
      </section>
    </div>
  );
}

export function SignupPage() {
  const { auth } = useApplicationServices();
  const { refreshIdentity } = useAppRuntime();
  const router = useRouter();
  const authError = useAuthError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmation: "",
      displayName: "",
      noticeAccepted: false,
    },
  });
  const fieldErrors = Object.entries(errors).flatMap(([fieldId, error]) =>
    error.message === undefined ? [] : [{ fieldId, message: error.message }],
  );
  return (
    <div className="auth-page auth-page--single">
      <section className="auth-card">
        <p className="eyebrow">アカウント</p>
        <h1>新規登録</h1>
        <div className="training-notice" role="note">
          <strong>{content.notice.training}</strong>
          <p>{content.notice.personalData}</p>
        </div>
        {authError.operationError !== null && (
          <div className="operation-error" role="alert">
            {authError.operationError}
          </div>
        )}
        <FormErrorSummary errors={fieldErrors} />
        <form
          onSubmit={handleSubmit(async (value) => {
            authError.clear();
            try {
              await auth.register({
                email: value.email,
                password: value.password,
                displayName: value.displayName,
              });
              await refreshIdentity();
              router.replace("/");
            } catch (caught) {
              authError.capture(caught);
            }
          })}
          noValidate
        >
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email !== undefined}
            {...register("email")}
          />
          <label htmlFor="displayName">表示名</label>
          <input
            id="displayName"
            autoComplete="name"
            aria-invalid={errors.displayName !== undefined}
            {...register("displayName")}
          />
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password !== undefined}
            {...register("password")}
          />
          <label htmlFor="confirmation">パスワード（確認）</label>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirmation !== undefined}
            {...register("confirmation")}
          />
          <label className="checkbox-field" htmlFor="noticeAccepted">
            <input
              id="noticeAccepted"
              type="checkbox"
              aria-invalid={errors.noticeAccepted !== undefined}
              {...register("noticeAccepted")}
            />
            学習用環境の注意事項を確認しました
          </label>
          <button
            className="button button--primary auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "処理中" : "登録する"}
          </button>
        </form>
        <p>
          登録により<Link href="/legal/terms">利用規約</Link>と
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          を確認したものとします。
        </p>
      </section>
    </div>
  );
}
