import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApplicationError } from "@/application/errors";
import { content } from "@/presentation/content/dictionary";
import { FormErrorSummary } from "@/presentation/components/form-error-summary";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";

const loginSchema = z.object({
  email: z.email("Emailの形式で入力してください"),
  password: z.string().min(1, "Passwordを入力してください"),
});

const signupSchema = z
  .object({
    email: z.email("Emailの形式で入力してください"),
    password: z
      .string()
      .min(8, "Passwordは8文字以上で入力してください")
      .max(72, "Passwordは72文字以下で入力してください"),
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
    message: "確認用Passwordが一致しません",
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

function useAuthError() {
  const [operationError, setOperationError] = useState<string | null>(null);
  return {
    operationError,
    clear: () => setOperationError(null),
    capture: (caught: unknown) => {
      if (caught instanceof ApplicationError) {
        const messages: Partial<Record<ApplicationError["code"], string>> = {
          AUTHENTICATION_FAILED: "EmailまたはPasswordが正しくありません。",
          ACCOUNT_SUSPENDED: "このアカウントは利用停止中です。管理者へ確認してください。",
          ACCOUNT_WITHDRAWN: "このアカウントは退会済みです。",
          EMAIL_ALREADY_EXISTS: "このEmailはすでに登録されています。",
          STORAGE_WRITE_FAILED:
            "ブラウザへLogin状態を保存できませんでした。設定を確認してください。",
          LOGIN_TRANSACTION_FAILED: "Login処理を完了できませんでした。カートは変更されていません。",
        };
        setOperationError(messages[caught.code] ?? "処理を完了できませんでした。");
      } else {
        setOperationError("予期しないエラーが発生しました。");
      }
    },
  };
}

export function LoginPage() {
  const { auth } = useApplicationServices();
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
        <h1>Login</h1>
        <p>注文履歴や購入手続きを利用するにはLoginしてください。</p>
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
              await auth.login(value);
              await refreshIdentity();
              router.replace("/");
            } catch (caught) {
              authError.capture(caught);
            }
          })}
          noValidate
        >
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            aria-invalid={errors.email !== undefined}
            {...register("email")}
          />
          <label htmlFor="password">Password</label>
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
            {isSubmitting ? "処理中" : "Login"}
          </button>
        </form>
        <p>
          初めて利用する場合は<Link href="/signup">新規登録</Link>
        </p>
      </section>
      <aside className="fixture-account-panel">
        <h2>固定テストアカウント</h2>
        <p>Passwordはすべて「testpass1」です。</p>
        <dl>
          <div>
            <dt>一般会員</dt>
            <dd>regular@example.com</dd>
          </div>
          <div>
            <dt>ゴールド会員</dt>
            <dd>gold@example.com</dd>
          </div>
          <div>
            <dt>運用担当者</dt>
            <dd>operator@example.com</dd>
          </div>
          <div>
            <dt>管理者</dt>
            <dd>admin@example.com</dd>
          </div>
        </dl>
      </aside>
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
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...register("email")} />
          <label htmlFor="displayName">表示名</label>
          <input id="displayName" {...register("displayName")} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" {...register("password")} />
          <label htmlFor="confirmation">Password（確認）</label>
          <input id="confirmation" type="password" {...register("confirmation")} />
          <label className="checkbox-field" htmlFor="noticeAccepted">
            <input id="noticeAccepted" type="checkbox" {...register("noticeAccepted")} />
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
