import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { blogApi } from '../api/blog'
import type { UpdateProfilePayload, User } from '../types/blog'

const tokenKey = 'blog_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(tokenKey) ?? '')
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(username: string, password: string) {
    const result = await blogApi.login({ username, password })
    setSession(result.token, result.user)
  }

  async function register(username: string, password: string, nickname: string) {
    const result = await blogApi.register({ username, password, nickname })
    setSession(result.token, result.user)
  }

  async function loadMe() {
    if (!token.value) return
    try {
      user.value = await blogApi.getMe()
    } catch {
      logout()
    }
  }

  function setSession(nextToken: string, nextUser: User) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem(tokenKey, nextToken)
  }

  function updateFavorites(favorites: string[]) {
    if (user.value) {
      user.value = { ...user.value, favorites }
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    user.value = await blogApi.updateProfile(payload)
  }

  async function uploadAvatar(file: File) {
    user.value = await blogApi.uploadAvatar(file)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(tokenKey)
  }

  function clearSession() {
    token.value = ''
    user.value = null
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    login,
    register,
    loadMe,
    updateFavorites,
    updateProfile,
    uploadAvatar,
    logout,
    clearSession,
  }
})
