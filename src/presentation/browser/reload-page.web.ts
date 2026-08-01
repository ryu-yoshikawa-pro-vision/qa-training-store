export function reloadBrowserPage(path?: "/" | "/admin"): void {
  if (typeof window !== "undefined") {
    if (path === undefined) {
      window.location.reload();
    } else {
      window.location.assign(path);
    }
  }
}
