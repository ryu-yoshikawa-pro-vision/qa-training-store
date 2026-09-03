import { useEffect, useRef } from "react";

export interface FieldErrorItem {
  fieldId: string;
  message: string;
}

interface FormErrorSummaryProps {
  title?: string;
  errors: FieldErrorItem[];
  focusTrigger: number;
  focusOnMount?: boolean;
}

export function FormErrorSummary({
  title = "入力内容を確認してください",
  errors,
  focusTrigger,
  focusOnMount = true,
}: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocusedTrigger = useRef<number | null>(null);
  useEffect(() => {
    if (errors.length === 0) {
      return;
    }
    const isNewFocusTrigger =
      lastFocusedTrigger.current === null || lastFocusedTrigger.current !== focusTrigger;
    if (focusOnMount && isNewFocusTrigger) {
      ref.current?.focus();
    }
    lastFocusedTrigger.current = focusTrigger;
  }, [errors.length, focusOnMount, focusTrigger]);
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
