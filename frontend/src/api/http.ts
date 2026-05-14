import axios from 'axios'
import type { AxiosError } from 'axios'

const tokenKey = 'blog_token'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  timeout: 8000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response.data.data,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const message = getErrorMessage(error)

    if (status === 401) {
      localStorage.removeItem(tokenKey)
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: message }))

      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?redirect=${redirect}`
    }

    return Promise.reject(new Error(message))
  },
)

function getErrorMessage(error: AxiosError<{ message?: string }>) {
  if (error.response?.data?.message) {
    return error.response.data.message
  }

  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }

  if (!error.response) {
    return '无法连接到服务器，请确认后端服务已启动'
  }

  const statusMessages: Record<number, string> = {
    400: '请求参数不正确',
    401: '登录已失效，请重新登录',
    403: '没有权限执行该操作',
    404: '请求的资源不存在',
    500: '服务器内部错误，请稍后重试',
  }

  return statusMessages[error.response.status] ?? error.message
}
