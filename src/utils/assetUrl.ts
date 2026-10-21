// Runtime URLs are not rewritten by Vite. Resolve them beneath the same base
// as the application, including repository subpaths on GitHub Pages.
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
