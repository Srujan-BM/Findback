import axios from 'axios'

const localApiUrl = typeof window === 'undefined'
  ? 'http://localhost:4000/api'
  : `${window.location.protocol}//${window.location.hostname}:4000/api`

export const apiBaseUrl = import.meta.env.VITE_API_URL || localApiUrl

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

let csrfToken = ''

export function setCsrfToken(token) {
  csrfToken = token || ''
}

api.interceptors.request.use((config) => {
  if (csrfToken && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    config.headers.set('x-csrf-token', csrfToken)
  }
  return config
})

export function imageUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, '')
  return `${apiRoot}${url.startsWith('/') ? '' : '/'}${url}`
}

export function errorMessage(error) {
  return error.response?.data?.message || 'Something went wrong. Please try again.'
}
