import type { ReactNode } from "react";

function WebNativeRoute(): ReactNode {
  return null;
}

export const NativeCartScreen = WebNativeRoute;
export const NativeCatalogScreen = WebNativeRoute;
export const NativeGuideScreen = WebNativeRoute;
export const NativeHomeScreen = WebNativeRoute;
export const NativeProductDetailScreen = WebNativeRoute;
export const NativeSearchScreen = WebNativeRoute;

export function NativeLegalScreen(_props: { title: string }): ReactNode {
  return null;
}

export function NativeUnsupportedScreen(_props: { title?: string }): ReactNode {
  return null;
}
