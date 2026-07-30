import { useEffect, useRef } from "react";

export interface FieldErrorItem {
  fieldId: string;
  message: string;
}

interface FormErrorSummaryProps {
  title?: string;
  errors: FieldErrorItem[];
  focusOnMount?: boolean;
}

export function FormErrorSummary({
  title = "入力内容を確認してください",
  errors,
  focusOnMount = true,
}: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount && errors.length > 0) {
      ref.current?.focus();
    }
  }, [errors.length, focusOnMount]);
  if (errors.length === 0) {
    return null;
  }
  return (
    <div ref={ref} className="form-error-summary" role="alert" tabIndex={-1}>
      <h2>{title}</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
