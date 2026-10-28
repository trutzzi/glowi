// Where to go back after an action. Bound action arguments come from the
// browser, so only same-site paths are accepted ("/admin/..."), never
// "https://..." or "//other.site".
export function localPath(path: string, fallback = '/admin') {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback
}
