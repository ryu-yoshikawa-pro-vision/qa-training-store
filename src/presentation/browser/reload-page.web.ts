export function reloadBrowserPage(): void {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
