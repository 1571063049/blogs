export function resolveAssetUrl(url?: string) {
  if (!url) return ''

  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, '')
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`
  }

  return url.startsWith('/') ? url : `/${url}`
}
