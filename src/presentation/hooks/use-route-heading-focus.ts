import { useEffect, useRef, type RefObject } from "react";

export function useRouteHeadingFocus(enabled = true): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!enabled || headingRef.current === null) return;
    headingRef.current.focus({ preventScroll: false });
  }, [enabled]);
  return headingRef;
}
